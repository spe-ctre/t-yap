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

export class DataService {
  private vtpass: VTpassProviderService;
  private idempotency: IdempotencyService;
  private logger: TransactionLogService;

  constructor() {
    this.vtpass = new VTpassProviderService();
    this.idempotency = new IdempotencyService();
    this.logger = new TransactionLogService();
  }

  async getVariations(serviceID: string) {
    const start = Date.now();
    await this.logger.log(
      'REQUEST',
      'INFO',
      'Get data variation codes from VTpass',
      { provider: 'VTpass', endpoint: '/api/service-variations', userId: 'system' },
      { serviceID }
    );

    const response = await this.vtpass.getVariationCodes(serviceID);

    await this.logger.log(
      'RESPONSE',
      'INFO',
      'Data variation codes response',
      {
        provider: 'VTpass',
        endpoint: '/api/service-variations',
        duration: Date.now() - start,
        userId: 'system'
      },
      { serviceID },
      response
    );

    // Format variations for easier consumption
    const variations = response?.content?.variations || [];
    
    return {
      serviceID: response?.content?.serviceID || serviceID,
      serviceName: response?.content?.ServiceName || 'Data',
      variations: variations.map((v: any) => ({
        variation_code: v.variation_code,
        name: v.name,
        amount: parseFloat(v.variation_amount || v.amount || '0'),
        fixedPrice: v.fixedPrice === 'Yes'
      })),
      raw: response
    };
  }

  async purchaseData(userId: string, data: {
    serviceID: string;
    variation_code: string;
    phone: string;
  }, device?: DeviceInfo) {
    // Ensure user exists and has a passenger profile (for wallet)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { passenger: true }
    });

    if (!user || !user.passenger) {
      throw createError('Passenger profile not found', 404);
    }

    // Normalize phone number early for idempotency and VTpass
    const normalizedPhone = this.normalizePhoneNumber(data.phone);

    // Fetch variations to get the amount for this variation_code
    const variationsResponse = await this.vtpass.getVariationCodes(data.serviceID);
    const variations = variationsResponse?.content?.variations || [];
    const selectedVariation = variations.find(
      (v: any) => v.variation_code === data.variation_code
    );

    if (!selectedVariation) {
      throw createError(`Invalid variation_code: ${data.variation_code}`, 400);
    }

    const amount = parseFloat(selectedVariation.variation_amount || selectedVariation.amount || '0');
    
    if (amount <= 0) {
      throw createError('Invalid variation code or amount', 400);
    }

    // Check wallet balance
    const balance = Number(user.passenger.walletBalance);
    if (balance < amount) {
      throw createError('Insufficient wallet balance', 400);
    }

    // Generate idempotency key based on user + payload
    const payloadForHash = {
      serviceID: data.serviceID,
      variation_code: data.variation_code,
      phone: normalizedPhone
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
        throw createError('A similar data transaction is already processing', 409);
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
      const requestId = `DATA-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
      const vtpassPayload = {
        request_id: requestId,
        serviceID: data.serviceID,
        billersCode: normalizedPhone, // Use phone for billersCode (recipient)
        variation_code: data.variation_code,
        phone: normalizedPhone // Use same phone for receipt
      };

      await this.logger.log(
        'REQUEST',
        'INFO',
        'Data purchase request to VTpass',
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
        vtpassResponse = await this.vtpass.purchaseData(vtpassPayload);
      } catch (error: any) {
        // VTpass rejected - mark idempotency as failed and rethrow
        await this.idempotency.markFailed(key).catch(() => undefined);
        
        // Log full error details
        const errorDetails = {
          message: error?.message || 'Unknown error',
          code: error?.code,
          status: error?.response?.status,
          statusText: error?.response?.statusText,
          responseData: error?.response?.data,
          vtpassResponse: error?.vtpassResponse,
          vtpassCode: error?.vtpassCode,
          isVTpassError: error?.isVTpassError,
          stack: error?.stack
        };
        
        await this.logger.log(
          'ERROR',
          'ERROR',
          error?.isVTpassError 
            ? `VTpass transaction failed: ${error?.vtpassCode || 'unknown'} - ${error?.message}`
            : 'VTpass rejected data purchase before DB records created',
          {
            userId,
            provider: 'VTpass',
            endpoint: '/api/pay',
            duration: Date.now() - start,
            ipAddress: device?.ipAddress,
            userAgent: device?.userAgent
          },
          vtpassPayload,
          errorDetails
        );
        
        // Log to console for immediate visibility
        console.error('VTpass data purchase error details:', {
          requestPayload: vtpassPayload,
          error: errorDetails
        });
        
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
          vtpassResponse?.response_description || 'Data purchase failed',
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
            name: this.getProviderName(data.serviceID),
            code: data.serviceID,
            category: VASCategory.DATA,
            isActive: true
          }
        });
        const serviceProviderId = provider.id;

        // Get actual amount from VTpass response (may differ from request)
        const actualAmount = parseFloat(
          vtpassResponse?.amount || 
          vtpassResponse?.content?.transactions?.amount || 
          amount.toString()
        );

        // Create VAS purchase record (SUCCESS since VTpass already confirmed)
        const vasPurchase = await tx.vASPurchase.create({
          data: {
            userId,
            serviceProviderId,
            category: VASCategory.DATA,
            amount: actualAmount,
            phoneNumber: normalizedPhone,
            packageName: data.variation_code,
            status: VASPurchaseStatus.SUCCESS,
            providerReference: vtpassResponse?.requestId || vtpassResponse?.request_id || requestId,
            metadata: {
              phone: normalizedPhone,
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
            category: TransactionCategory.DATA_PURCHASE,
            amount: actualAmount,
            balanceBefore: currentBalance,
            balanceAfter: currentBalance - actualAmount,
            status: TransactionStatus.SUCCESS,
            description: `Data purchase to ${this.getProviderName(data.serviceID)} for ${normalizedPhone} - ${data.variation_code}`,
            reference: requestId,
            metadata: {
              phone: normalizedPhone,
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
            walletBalance: currentBalance - actualAmount
          }
        });

        return { vasPurchase, transaction };
      });

      await this.logger.log(
        'RESPONSE',
        'INFO',
        'Data purchase VTpass response - records created',
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
        phoneNumber: result.vasPurchase.phoneNumber,
        packageName: result.vasPurchase.packageName,
        provider: data.serviceID,
        providerName: this.getProviderName(data.serviceID),
        raw: vtpassResponse
      };

      await this.idempotency.markCompleted(key, responsePayload);

      return responsePayload;
    } catch (error) {
      await this.idempotency.markFailed(key).catch(() => undefined);
      await this.logger.log(
        'ERROR',
        'ERROR',
        'Data purchase failed',
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
          category: VASCategory.DATA
        },
        include: {
          serviceProvider: {
            select: {
              name: true,
              code: true,
              logo: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.vASPurchase.count({
        where: {
          userId,
          category: VASCategory.DATA
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
        category: VASCategory.DATA
      }
    });

    if (!purchase) {
      throw createError('Data purchase not found', 404);
    }

    const requestId = purchase.providerReference || (purchase.metadata as any)?.requestId;
    if (!requestId) {
      throw createError('No external request ID available for this purchase', 400);
    }

    const start = Date.now();
    await this.logger.log(
      'REQUEST',
      'INFO',
      'Requery VTpass data transaction',
      { userId, vasPurchaseId, provider: 'VTpass', endpoint: '/api/requery' },
      { requestId }
    );

    const vtpassResponse = await this.vtpass.requeryTransaction(requestId);

    await this.logger.log(
      'RESPONSE',
      'INFO',
      'Requery VTpass data transaction response',
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

    // Update purchase status based on requery response
    const code = vtpassResponse?.code;
    const isSuccess = code === '000';
    const status = vtpassResponse?.content?.transactions?.status;

    let newStatus = purchase.status;
    if (isSuccess && status === 'delivered') {
      newStatus = VASPurchaseStatus.SUCCESS;
    } else if (status === 'pending') {
      newStatus = VASPurchaseStatus.PENDING;
    } else if (!isSuccess || status === 'failed') {
      newStatus = VASPurchaseStatus.FAILED;
    }

    // Update purchase record with latest status
    const updatedPurchase = await prisma.vASPurchase.update({
      where: { id: vasPurchaseId },
      data: {
        status: newStatus,
        metadata: vtpassResponse,
        lastRequeryAt: new Date()
      }
    });

    return {
      purchase: updatedPurchase,
      vtpass: vtpassResponse
    };
  }

  /**
   * Normalize phone number to local Nigerian format (08011111111)
   * Converts +2348011111111 to 08011111111
   */
  private normalizePhoneNumber(phone: string): string {
    // Remove any spaces or dashes
    let cleaned = phone.replace(/[\s-]/g, '');
    
    // If it starts with +234, convert to 0 format
    if (cleaned.startsWith('+234')) {
      cleaned = '0' + cleaned.substring(4);
    }
    // If it starts with 234 (without +), convert to 0 format
    else if (cleaned.startsWith('234') && cleaned.length === 13) {
      cleaned = '0' + cleaned.substring(3);
    }
    
    // Ensure it's in the correct format (11 digits starting with 0)
    if (!cleaned.match(/^0\d{10}$/)) {
      throw createError('Invalid phone number format. Expected format: 08011111111', 400);
    }
    
    return cleaned;
  }

  private getProviderName(serviceID: string): string {
    const names: Record<string, string> = {
      'mtn-data': 'MTN Data',
      'glo-data': 'Glo Data',
      'airtel-data': 'Airtel Data',
      '9mobile-data': '9mobile Data'
    };
    return names[serviceID.toLowerCase()] || serviceID.toUpperCase();
  }
}

