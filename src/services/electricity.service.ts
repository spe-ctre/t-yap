import { TransactionCategory, TransactionStatus, TransactionType, VASCategory, VASPurchaseStatus, UserRole } from '@prisma/client';
import { prisma } from '../config/database';
import { createError } from '../middleware/error.middleware';
import { VTpassProviderService } from './vtpass-provider.service';
import { IdempotencyService } from './idempotency.service';
import { TransactionLogService } from './transaction-log.service';

interface DeviceInfo {
  ipAddress?: string;
  userAgent?: string;
}

export class ElectricityService {
  private vtpass: VTpassProviderService;
  private idempotency: IdempotencyService;
  private logger: TransactionLogService;

  constructor() {
    this.vtpass = new VTpassProviderService();
    this.idempotency = new IdempotencyService();
    this.logger = new TransactionLogService();
  }

  async validateMeter(userId: string, data: {
    serviceID: string;
    meterNumber: string;
    type: 'prepaid' | 'postpaid';
  }, device?: DeviceInfo) {
    const start = Date.now();
    await this.logger.log(
      'REQUEST',
      'INFO',
      'Validate electricity meter',
      { userId, provider: 'VTpass', endpoint: '/api/merchant-verify', ipAddress: device?.ipAddress, userAgent: device?.userAgent },
      data
    );

    const response = await this.vtpass.validateMeter({
      serviceID: data.serviceID,
      billersCode: data.meterNumber,
      type: data.type
    });

    await this.logger.log(
      'RESPONSE',
      'INFO',
      'Meter validation response',
      {
        userId,
        provider: 'VTpass',
        endpoint: '/api/merchant-verify',
        duration: Date.now() - start,
        ipAddress: device?.ipAddress,
        userAgent: device?.userAgent
      },
      data,
      response
    );

    const customer = response?.content?.Customer || response?.content?.customer;

    return {
      isValid: true,
      raw: response,
      customer: {
        name: customer?.Customer_Name || customer?.name,
        address: customer?.Address || customer?.address,
        meterNumber: data.meterNumber,
        type: data.type
      }
    };
  }

  async purchaseElectricity(userId: string, data: {
    serviceID: string;
    meterNumber: string;
    amount: number;
    type: 'prepaid' | 'postpaid';
    phone: string;
    variation_code?: string;
  }, device?: DeviceInfo) {
    // Ensure user exists and has a passenger profile (for wallet)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { passenger: true }
    });

    if (!user || !user.passenger) {
      throw createError('Passenger profile not found', 404);
    }

    const amount = Number(data.amount);
    if (amount <= 0) {
      throw createError('Amount must be greater than zero', 400);
    }

    // Check wallet balance
    const balance = Number(user.passenger.walletBalance);
    if (balance < amount) {
      throw createError('Insufficient wallet balance', 400);
    }

    // Generate idempotency key based on user + payload (without volatile fields)
    const payloadForHash = {
      serviceID: data.serviceID,
      meterNumber: data.meterNumber,
      amount: data.amount,
      type: data.type,
      phone: data.phone,
      variation_code: data.variation_code
    };
    const requestHash = this.idempotency.hashPayload(payloadForHash);
    const key = this.idempotency.generateKey(userId, payloadForHash);

    // Check existing idempotency record
    const existing = await this.idempotency.checkExisting(key);
    if (existing) {
      if (existing.status === 'COMPLETED' && existing.response) {
        return existing.response as any;
      }
      if (existing.status === 'PENDING') {
        throw createError('A similar electricity transaction is already processing', 409);
      }
    }

    // Create pending idempotency record
    await this.idempotency.createPending(userId, key, requestHash);
    
    const start = Date.now();
    try {
      // Check wallet balance BEFORE calling VTpass (but don't debit yet)
    const passenger = await prisma.passenger.findUnique({
      where: { userId }
    });

    if (!passenger) {
      await this.idempotency.markFailed(key).catch(() => undefined);
      throw createError('Passenger profile not found', 404);
    }

    const currentBalance = Number(passenger.walletBalance);
    if (currentBalance < amount) {
      await this.idempotency.markFailed(key).catch(() => undefined);
      throw createError('Insufficient wallet balance', 400);
    }

    // Call VTpass FIRST - only proceed if they accept the request
    const requestId = `ELEC-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
    const vtpassPayload = {
      request_id: requestId,
      serviceID: data.serviceID,
      billersCode: data.meterNumber,
      variation_code: data.variation_code,
      amount: data.amount,
      phone: data.phone
    };

    await this.logger.log(
      'REQUEST',
      'INFO',
      'Electricity purchase request to VTpass',
      {
        userId,
        provider: 'VTpass',
        endpoint: '/api/pay',
        ipAddress: device?.ipAddress,
        userAgent: device?.userAgent
      },
      vtpassPayload
    );

    let vtpassResponse;
    try {
      vtpassResponse = await this.vtpass.purchaseElectricity(vtpassPayload);
    } catch (error) {
      // VTpass rejected - mark idempotency as failed and rethrow
      await this.idempotency.markFailed(key).catch(() => undefined);
      await this.logger.log(
        'ERROR',
        'ERROR',
        'VTpass rejected electricity purchase before DB records created',
        {
          userId,
          provider: 'VTpass',
          endpoint: '/api/pay',
          duration: Date.now() - start,
          ipAddress: device?.ipAddress,
          userAgent: device?.userAgent
        },
        vtpassPayload,
        { error: (error as any)?.message || 'Unknown error' }
      );
      throw error; // Re-throw so no DB records are created
    }

      const code = vtpassResponse?.code;
      const isSuccess = code === '000';

      if (!isSuccess) {
        // VTpass returned non-success code - mark idempotency as failed and throw
        await this.idempotency.markFailed(key).catch(() => undefined);
        await this.logger.log(
          'ERROR',
          'ERROR',
          'VTpass returned non-success code',
          {
            userId,
            provider: 'VTpass',
            endpoint: '/api/pay',
            duration: Date.now() - start,
            ipAddress: device?.ipAddress,
            userAgent: device?.userAgent,
            statusCode: 400
          },
          vtpassPayload,
          vtpassResponse
        );
        throw createError(
          vtpassResponse?.response_description || 'Electricity payment failed',
          400
        );
      }

      // VTpass succeeded - NOW create DB records and debit wallet
      const result = await prisma.$transaction(async (tx) => {
        // Upsert ServiceProvider to ensure it exists
        const provider = await tx.serviceProvider.upsert({
          where: { code: data.serviceID },
          update: { isActive: true },
          create: {
            name: data.serviceID,
            code: data.serviceID,
            category: VASCategory.ELECTRICITY,
            isActive: true
          }
        });
        const serviceProviderId = provider.id;

        // Create VAS purchase record (SUCCESS since VTpass already confirmed)
        const vasPurchase = await tx.vASPurchase.create({
          data: {
            userId,
            serviceProviderId,
            category: VASCategory.ELECTRICITY,
            amount,
            meterNumber: data.meterNumber,
            phoneNumber: data.phone,
            packageName: data.variation_code || null,
            status: VASPurchaseStatus.SUCCESS,
            providerReference: vtpassResponse?.requestId || vtpassResponse?.request_id || requestId,
            metadata: {
              meterNumber: data.meterNumber,
              phone: data.phone,
              serviceID: data.serviceID,
              variation_code: data.variation_code,
              requestId,
              vtpassResponse
            },
            idempotencyKey: key
          }
        });

        // Create transaction record (SUCCESS)
        const transaction = await tx.transaction.create({
          data: {
            userId,
            userType: UserRole.PASSENGER,
            type: TransactionType.DEBIT,
            category: TransactionCategory.ELECTRICITY_PAYMENT,
            amount,
            balanceBefore: currentBalance,
            balanceAfter: currentBalance - amount,
            status: TransactionStatus.SUCCESS,
            description: `Electricity payment to ${data.serviceID} for meter ${data.meterNumber}`,
            reference: requestId,
            metadata: {
              meterNumber: data.meterNumber,
              type: data.type,
              phone: data.phone,
              serviceID: data.serviceID,
              variation_code: data.variation_code,
              vtpassResponse
            },
            vasPurchaseId: vasPurchase.id
          }
        });

        // Debit wallet (safe now since VTpass confirmed)
        await tx.passenger.update({
          where: { userId },
          data: {
            walletBalance: currentBalance - amount
          }
        });

        return { vasPurchase, transaction };
      });

      await this.logger.log(
        'RESPONSE',
        'INFO',
        'Electricity purchase VTpass response - records created',
        {
          userId,
          transactionId: result.transaction.id,
          vasPurchaseId: result.vasPurchase.id,
          provider: 'VTpass',
          endpoint: '/api/pay',
          duration: Date.now() - start,
          ipAddress: device?.ipAddress,
          userAgent: device?.userAgent,
          statusCode: 200
        },
        vtpassPayload,
        vtpassResponse
      );

      const responsePayload = {
        transactionId: result.transaction.id,
        vasPurchaseId: result.vasPurchase.id,
        status: result.vasPurchase.status,
        amount: result.vasPurchase.amount,
        meterNumber: result.vasPurchase.meterNumber,
        provider: data.serviceID,
        token: vtpassResponse?.tokens || vtpassResponse?.token,
        raw: vtpassResponse
      };

      await this.idempotency.markCompleted(key, responsePayload);

      return responsePayload;
    } catch (error) {
      await this.idempotency.markFailed(key).catch(() => undefined);
      await this.logger.log(
        'ERROR',
        'ERROR',
        'Electricity purchase failed',
        { userId, provider: 'VTpass', endpoint: '/api/pay', duration: Date.now() - start, ipAddress: device?.ipAddress, userAgent: device?.userAgent },
        data,
        { error: (error as any)?.message || 'Unknown error' }
      );
      throw error;
    }
  }

  async getHistory(userId: string, params: { page?: number; limit?: number }) {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : 10;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.vASPurchase.findMany({
        where: {
          userId,
          category: VASCategory.ELECTRICITY
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.vASPurchase.count({
        where: {
          userId,
          category: VASCategory.ELECTRICITY
        }
      })
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async requery(userId: string, vasPurchaseId: string) {
    const purchase = await prisma.vASPurchase.findFirst({
      where: {
        id: vasPurchaseId,
        userId,
        category: VASCategory.ELECTRICITY
      }
    });

    if (!purchase) {
      throw createError('Electricity purchase not found', 404);
    }

    const requestId = purchase.providerReference || (purchase.metadata as any)?.requestId;
    if (!requestId) {
      throw createError('No external request ID available for this purchase', 400);
    }

    const start = Date.now();
    await this.logger.log(
      'REQUEST',
      'INFO',
      'Requery VTpass electricity transaction',
      { userId, vasPurchaseId, provider: 'VTpass', endpoint: '/api/requery' },
      { requestId }
    );

    const vtpassResponse = await this.vtpass.requeryTransaction(requestId);

    await this.logger.log(
      'RESPONSE',
      'INFO',
      'Requery VTpass electricity transaction response',
      {
        userId,
        vasPurchaseId,
        provider: 'VTpass',
        endpoint: '/api/requery',
        duration: Date.now() - start
      },
      { requestId },
      vtpassResponse
    );

    // We can optionally update local status based on requery response here

    return {
      purchase,
      vtpass: vtpassResponse
    };
  }

  private async resolveServiceProviderId(tx: any, serviceCode: string) {
    const provider = await tx.serviceProvider.findFirst({
      where: {
        code: serviceCode,
        category: VASCategory.ELECTRICITY,
        isActive: true
      }
    });

    if (!provider) {
      throw createError('Electricity provider not supported', 400);
    }

    return provider.id;
  }
}


