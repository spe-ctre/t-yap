import { prisma } from '../../shared/config/database';
import { createError } from '../../shared/middleware/error.middleware';
import * as bcrypt from 'bcryptjs';
import { BiometricService } from '../../identity/services/biometric.service';
import { MonnifyService } from '../../wallet-money/services/monnify.service';

const biometricService = new BiometricService();
const monnifyService = new MonnifyService();

export class PMWalletService {
  /**
   * Now returns the REAL ledger balance (ParkManager.walletBalance /
   * lockedBalance), not a number recomputed on the fly from trip
   * aggregation. The previous version never read walletBalance at all, so
   * it had no relationship to what approveSettlement/withdrawFunds actually
   * credit or debit. totalParkRevenue/commissionRate are kept as separate
   * informational stats, not conflated with "balance".
   */
  static async checkAndReleaseLockedCommissions(parkManagerId: string) {
    const pm = await prisma.parkManager.findUnique({ where: { id: parkManagerId } });
    if (!pm) return;

    const startDate = pm.commissionCycleStartDate || pm.createdAt;
    const now = new Date();
    const diffMs = now.getTime() - new Date(startDate).getTime();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    if (diffMs >= thirtyDaysMs && Number(pm.lockedBalance) > 0) {
      const amountToDisburse = Number(pm.lockedBalance);
      await prisma.$transaction([
        prisma.parkManager.update({
          where: { id: parkManagerId },
          data: {
            walletBalance: { increment: amountToDisburse },
            lockedBalance: 0,
            commissionCycleStartDate: now,
          },
        }),
        prisma.transaction.create({
          data: {
            userId: pm.userId,
            userType: 'PARK_MANAGER',
            type: 'CREDIT',
            category: 'COMMISSION_DISBURSEMENT',
            amount: amountToDisburse,
            status: 'SUCCESS',
            description: '30-Day Automated Commission Disbursement to Wallet',
            reference: `COMM-DISBURSE-${Date.now()}`,
            balanceBefore: Number(pm.walletBalance),
            balanceAfter: Number(pm.walletBalance) + amountToDisburse,
          },
        }),
      ]);
    }
  }

  static async getWallet(userId: string) {
    const parkManager = await prisma.parkManager.findUnique({
      where: { userId },
      include: { park: true },
    });

    if (!parkManager || !parkManager.parkId) {
      throw createError('Park Manager or assigned park not found', 404);
    }

    await PMWalletService.checkAndReleaseLockedCommissions(parkManager.id);

    const updatedPM = await prisma.parkManager.findUnique({
      where: { id: parkManager.id },
      include: { park: true },
    });

    const parkTrips = await prisma.trip.findMany({
      where: { route: { originParkId: parkManager.parkId } },
      select: { id: true },
    });
    const tripIds = parkTrips.map((t: any) => t.id);

    const parkRevenue = await prisma.transaction.aggregate({
      where: {
        category: 'FARE_PAYMENT',
        status: 'SUCCESS',
        tripId: { in: tripIds },
      },
      _sum: { amount: true },
    });

    const commissionRate = Number(updatedPM?.commissionRate || 5);

    return {
      balance: Number(updatedPM?.walletBalance || 0),
      lockedBalance: Number(updatedPM?.lockedBalance || 0),
      commissionRate,
      parkName: updatedPM?.park?.name,
      totalParkRevenue: Number(parkRevenue._sum.amount || 0),
    };
  }

  static async fundWalletWithCash(passengerId: string, amount: number) {
    if (!passengerId || !amount || amount <= 0) {
      throw createError('Valid passenger ID and amount required', 400);
    }

    const result = await prisma.$transaction(async (tx: any) => {
      const passenger = await tx.passenger.findUnique({ where: { id: passengerId } });
      if (!passenger) throw createError('Passenger not found', 404);

      const previousBalance = Number(passenger.walletBalance);
      const transaction = await tx.transaction.create({
        data: {
          type: 'CREDIT',
          category: 'WALLET_TOPUP',
          status: 'SUCCESS',
          amount,
          description: 'Cash deposit by Park Manager',
          reference: `CASH-${Date.now()}`,
          userType: 'PASSENGER',
          balanceBefore: previousBalance,
          balanceAfter: previousBalance + amount,
          user: { connect: { id: passenger.userId } },
        },
      });

      const updatedPassenger = await tx.passenger.update({
        where: { id: passengerId },
        data: { walletBalance: { increment: amount } },
      });

      return { transaction, updatedPassenger };
    });

    return { newBalance: Number(result.updatedPassenger.walletBalance) };
  }

  static async getPendingSettlements(userId: string) {
    const parkManager = await prisma.parkManager.findUnique({ where: { userId } });
    if (!parkManager) throw createError('Park Manager not found', 404);

    const settlements = await prisma.settlement.findMany({
      where: {
        status: { in: ['PENDING', 'APPROVED'] },
        OR: [
          { approvedBy: parkManager.id },
          { approvedBy: null, trip: { driver: { vehicle: { currentParkId: parkManager.parkId } } } },
        ],
      },
      include: {
        trip: {
          include: {
            driver: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return settlements.map((s: any) => ({
      id: s.id,
      driverName: `${s.trip.driver?.firstName} ${s.trip.driver?.lastName}`,
      amount: Number(s.totalAmount),
      status: s.status,
      date: s.createdAt,
    }));
  }

  static async calculateSettlementSplit(settlementId: string) {
    const settlement = await prisma.settlement.findUnique({ where: { id: settlementId } });
    if (!settlement) throw createError('Settlement not found', 404);

    let totalFares = Number(settlement.totalAmount);
    let tyapFee = Number(settlement.tyapFee);
    let parkCommission = Number(settlement.parkCommission);
    let driverPayout = Number(settlement.driverPayout);

    if (driverPayout === 0 && parkCommission === 0 && totalFares > 0) {
      tyapFee = totalFares * 0.05;
      parkCommission = totalFares * 0.10;
      driverPayout = totalFares - tyapFee - parkCommission;

      await prisma.settlement.update({
        where: { id: settlementId },
        data: {
          tyapFee,
          parkCommission,
          driverPayout,
        },
      });
    }

    return {
      totalFares,
      splits: {
        driverPayout,
        parkCommission,
        systemFee: tyapFee,
      },
    };
  }

  /**
   * FIXED: previously triggered the driver payout and marked the settlement
   * COMPLETED, but never credited the park manager's own walletBalance with
   * their commission cut - the ledger had no entry for settlements they
   * approved. Also had a double-approval race: two concurrent requests
   * could both pass the `status === 'COMPLETED'` check before either write
   * landed, triggering two payouts for the same settlement.
   *
   * Now: atomically claims the settlement (PENDING -> PROCESSING) BEFORE
   * calling out to Monnify, so a second concurrent request is rejected
   * immediately rather than racing. If the external transfer fails, the
   * claim is released back to PENDING so it can be retried. Only after a
   * successful transfer does one atomic DB transaction mark it COMPLETED,
   * credit the park's walletBalance, and write the Transaction audit row.
   */
  static async approveSettlement(userId: string, settlementId: string, biometricToken: string) {
    if (!settlementId || !biometricToken) {
      throw createError('Settlement ID and biometric approval required', 400);
    }

    const settlement = await prisma.settlement.findUnique({
      where: { id: settlementId },
      include: { trip: { include: { driver: { include: { user: { include: { bankAccounts: true } } } } } } },
    });

    if (!settlement) throw createError('Settlement not found', 404);
    if (settlement.status !== 'PENDING' && settlement.status !== 'APPROVED') {
      throw createError(
        settlement.status === 'COMPLETED' ? 'Settlement already processed' : 'Settlement is already being processed',
        400
      );
    }

    const driver = settlement.trip.driver;
    const isVerified =
      (await biometricService.verifyBiometric(driver.userId, biometricToken)) ||
      (await biometricService.verifyBiometric(driver.id, biometricToken));

    if (!isVerified) {
      throw createError('Driver biometric verification failed. Driver consent is required to release settlement.', 401);
    }

    const initialStatus = settlement.status;

    // Atomically claim it - only succeeds if it's still PENDING or APPROVED right now.
    const claim = await prisma.settlement.updateMany({
      where: { id: settlementId, status: { in: ['PENDING', 'APPROVED'] } },
      data: { status: 'PROCESSING' },
    });
    if (claim.count !== 1) {
      throw createError('Settlement is already being processed', 409);
    }

    const bankAccount = driver.user.bankAccounts.find((b: any) => b.isDefault) || driver.user.bankAccounts[0];

    if (!bankAccount) {
      // Release the claim - nothing was sent, safe to let this be retried
      await prisma.settlement.update({ where: { id: settlementId }, data: { status: initialStatus } });
      throw createError('Driver has no bank account registered', 400);
    }

    if (Number(settlement.driverPayout) === 0 && Number(settlement.parkCommission) === 0 && Number(settlement.totalAmount) > 0) {
      const splitResult = await PMWalletService.calculateSettlementSplit(settlementId);
      settlement.driverPayout = new (require('@prisma/client').Prisma.Decimal)(splitResult.splits.driverPayout);
      settlement.parkCommission = new (require('@prisma/client').Prisma.Decimal)(splitResult.splits.parkCommission);
      settlement.tyapFee = new (require('@prisma/client').Prisma.Decimal)(splitResult.splits.systemFee);
    }

    let transferResult: any;
    try {
      transferResult = await monnifyService.initiateTransfer({
        amount: Number(settlement.driverPayout),
        reference: `SETTLE-${settlement.id}-${Date.now()}`,
        narration: `Trip Settlement: ${settlement.tripId}`,
        destinationAccountNumber: bankAccount.accountNumber,
        destinationBankCode: bankAccount.bankCode || '',
        destinationAccountName: bankAccount.accountName,
      });
    } catch (transferError: any) {
      // Release the claim so this settlement can be retried - the driver
      // was never paid, so it must not be left stuck at PROCESSING forever.
      await prisma.settlement.update({ where: { id: settlementId }, data: { status: 'PENDING' } });
      throw createError(transferError.message || 'Failed to initiate driver payout', transferError.statusCode || 500);
    }

    // approvedBy on Settlement stores the ParkManager.id (see
    // getPendingSettlements' `where: { approvedBy: parkManager.id }`) -
    // resolve the approving ParkManager the same way the rest of this file
    // does, from the authenticated userId.
    const approvingManager = await prisma.parkManager.findUnique({ where: { userId } });
    if (!approvingManager) {
      // The driver has already been paid at this point - do not throw a
      // generic 500 that looks like nothing happened. Surface this clearly
      // so it gets reconciled manually rather than silently lost.
      throw createError(
        `Driver payout succeeded (ref: ${transferResult.reference}) but park manager record was not found to credit commission - needs manual reconciliation`,
        500
      );
    }

    const parkCommissionAmount = Number(settlement.parkCommission);
    const previousBalance = Number(approvingManager.walletBalance);

    const [updatedSettlement] = await prisma.$transaction([
      prisma.settlement.update({
        where: { id: settlementId },
        data: { status: 'COMPLETED', approvedAt: new Date(), approvedBy: approvingManager.id },
      }),
      prisma.parkManager.update({
        where: { id: approvingManager.id },
        data: { walletBalance: { increment: parkCommissionAmount } },
      }),
      prisma.transaction.create({
        data: {
          type: 'CREDIT',
          category: 'COMMISSION',
          status: 'SUCCESS',
          amount: parkCommissionAmount,
          description: `Park commission for settlement ${settlementId}`,
          reference: `SETTLE-COMM-${settlementId}-${Date.now()}`,
          userType: 'PARK_MANAGER',
          balanceBefore: previousBalance,
          balanceAfter: previousBalance + parkCommissionAmount,
          user: { connect: { id: userId } },
        },
      }),
    ]);

    return {
      message: 'Settlement Approved & Payout Triggered',
      transferReference: transferResult.reference,
      settlement: updatedSettlement,
      parkCommissionCredited: parkCommissionAmount,
    };
  }

  static async resolveAccount(accountNumber: string, bankCode: string) {
    if (!accountNumber || !bankCode) {
      throw createError('Account number and bank code required', 400);
    }

    const result = await monnifyService.verifyBankAccount(accountNumber, bankCode);

    return {
      accountName: result.accountName,
      accountNumber: result.accountNumber,
      bankCode: result.bankCode,
    };
  }

  /**
   * FIXED: this was a complete stub - it validated the PIN and returned a
   * fabricated success response with no money movement at all, and never
   * checked the requested amount against any real balance (so it would
   * have "succeeded" for any amount, including more than the park manager
   * actually had). Now it:
   *   1. Guards against overdraft AND race conditions using a single
   *      conditional update (walletBalance >= amount), which either
   *      atomically succeeds or fails - no read-then-write gap for two
   *      concurrent withdrawals to both pass a balance check.
   *   2. Moves the amount into lockedBalance while the transfer is in
   *      flight, so the money is provably held, not just decremented and
   *      hoped for.
   *   3. Triggers a real Monnify transfer to the park manager's own
   *      default bank account.
   *   4. On success: releases the lock and writes a Transaction audit row.
   *   5. On failure: refunds the locked amount back to walletBalance
   *      instead of leaving it stuck in limbo.
   */
  static async withdrawFunds(userId: string, amount: number, pin: string) {
    if (!amount || amount <= 0 || !pin) {
      throw createError('A valid amount and PIN are required', 400);
    }

    const parkManager = await prisma.parkManager.findUnique({
      where: { userId },
      include: { user: { include: { bankAccounts: true } } },
    });
    if (!parkManager) throw createError('Park Manager not found', 404);

    const isPinValid = await bcrypt.compare(pin, parkManager.transactionPin || '');
    if (!isPinValid) throw createError('Invalid PIN', 401);

    const bankAccount = parkManager.user.bankAccounts.find((b: any) => b.isDefault) || parkManager.user.bankAccounts[0];
    if (!bankAccount) {
      throw createError('No bank account registered for withdrawal', 400);
    }

    // Atomic balance guard: this update only matches (and only decrements)
    // if walletBalance is currently >= amount. Two simultaneous withdrawal
    // requests can't both succeed against the same balance, and a request
    // for more than the real balance is rejected outright instead of
    // silently "succeeding" like the old stub did.
    const claim = await prisma.parkManager.updateMany({
      where: { id: parkManager.id, walletBalance: { gte: amount } },
      data: { walletBalance: { decrement: amount }, lockedBalance: { increment: amount } },
    });
    if (claim.count !== 1) {
      throw createError('Insufficient balance', 400);
    }

    const reference = `WD-${parkManager.id}-${Date.now()}`;
    let transferResult: any;
    try {
      transferResult = await monnifyService.initiateTransfer({
        amount,
        reference,
        narration: 'Park Manager Wallet Withdrawal',
        destinationAccountNumber: bankAccount.accountNumber,
        destinationBankCode: bankAccount.bankCode || '',
        destinationAccountName: bankAccount.accountName,
      });
    } catch (transferError: any) {
      // Refund the hold - the money never actually left, so it must not
      // stay stuck in lockedBalance.
      await prisma.parkManager.update({
        where: { id: parkManager.id },
        data: { walletBalance: { increment: amount }, lockedBalance: { decrement: amount } },
      });
      throw createError(transferError.message || 'Withdrawal transfer failed', transferError.statusCode || 500);
    }

    const previousBalance = Number(parkManager.walletBalance);

    await prisma.$transaction([
      prisma.parkManager.update({
        where: { id: parkManager.id },
        data: { lockedBalance: { decrement: amount } },
      }),
      prisma.transaction.create({
        data: {
          type: 'DEBIT',
          category: 'TRANSFER',
          status: 'SUCCESS',
          amount,
          description: 'Park Manager wallet withdrawal',
          reference,
          userType: 'PARK_MANAGER',
          balanceBefore: previousBalance,
          balanceAfter: previousBalance - amount,
          user: { connect: { id: userId } },
        },
      }),
    ]);

    return {
      message: 'Withdrawal Successful',
      amountWithdrawn: amount,
      reference: transferResult.reference || reference,
    };
  }
}