/// <reference path="../../types/express.d.ts" />
import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import * as bcrypt from 'bcryptjs';

export class PMWalletController {
  static async getWallet(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const parkManager = await prisma.parkManager.findUnique({
        where: { userId },
        include: { park: true },
      });

      if (!parkManager || !parkManager.parkId) return res.status(404).json({ error: 'Park Manager or assigned park not found' });

      // Step 1: Get all trips originating from this park
      const parkTrips = await prisma.trip.findMany({
        where: { route: { originParkId: parkManager.parkId } },
        select: { id: true }
      });
      const tripIds = parkTrips.map((t: any) => t.id);

      // Step 2: Aggregate transactions for these trips
      const parkRevenue = await prisma.transaction.aggregate({
        where: { 
          category: 'FARE_PAYMENT', 
          status: 'SUCCESS',
          tripId: { in: tripIds }
        },
        _sum: { amount: true },
      });

      const commissionRate = Number(parkManager.commissionRate || 5);
      const parkCommission = (Number(parkRevenue._sum.amount || 0) * commissionRate) / 100;

      return res.json({ 
        balance: parkCommission, 
        commissionRate, 
        parkName: parkManager.park?.name,
        totalParkRevenue: Number(parkRevenue._sum.amount || 0)
      });
    } catch (error) {
      console.error('Get wallet error:', error);
      return res.status(500).json({ error: 'Failed to fetch wallet' });
    }
  }

  static async fundWalletWithCash(req: Request, res: Response) {
    try {
      const { passengerId, amount } = req.body;
      if (!passengerId || !amount || amount <= 0) return res.status(400).json({ error: 'Valid passenger ID and amount required' });

      const result = await prisma.$transaction(async (tx: any) => {
        const passenger = await tx.passenger.findUnique({ where: { id: passengerId } });
        if (!passenger) throw new Error('Passenger not found');

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

      return res.json({ success: true, newBalance: Number(result.updatedPassenger.walletBalance) });
    } catch (error: any) {
      console.error('Fund wallet error:', error);
      return res.status(500).json({ error: error.message || 'Failed to fund wallet' });
    }
  }

  static async getPendingSettlements(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const parkManager = await prisma.parkManager.findUnique({ where: { userId } });
      if (!parkManager) return res.status(404).json({ error: 'Park Manager not found' });

      // Find settlements that are still pending for this park manager
      const settlements = await prisma.settlement.findMany({
        where: {
          approvedBy: parkManager.id,
          status: 'PENDING',
        },
        include: {
          trip: {
            include: {
              driver: { select: { firstName: true, lastName: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
      });

      return res.json({ 
        success: true, 
        settlements: settlements.map((s: any) => ({
          id: s.id,
          driverName: `${s.trip.driver?.firstName} ${s.trip.driver?.lastName}`,
          amount: Number(s.totalAmount),
          status: s.status,
          date: s.createdAt
        }))
      });
    } catch (error) {
      console.error('Get pending settlements error:', error);
      return res.status(500).json({ error: 'Failed to fetch settlements' });
    }
  }

  static async calculateSettlementSplit(req: Request, res: Response) {
    try {
      const { settlementId } = req.params;
      const settlement = await prisma.settlement.findUnique({ where: { id: settlementId } });
      if (!settlement) return res.status(404).json({ error: 'Settlement not found' });

      const totalFares = Number(settlement.totalAmount);
      const systemCommission = totalFares * 0.1; // Example 10% system fee
      const parkCommission = totalFares * 0.05; // Example 5% park fee
      const driverPayout = totalFares - systemCommission - parkCommission;

      return res.json({
        totalFares,
        splits: {
          driverPayout,
          parkCommission,
          systemFee: systemCommission
        }
      });
    } catch (error) {
      console.error('Calculate split error:', error);
      return res.status(500).json({ error: 'Failed to calculate split' });
    }
  }

  static async approveSettlement(req: Request, res: Response) {
    try {
      const { settlementId, biometricToken } = req.body;
      const userId = req.user!.id;

      if (!settlementId || !biometricToken) {
        return res.status(400).json({ error: 'Settlement ID and biometric approval required' });
      }

      // 1. Verify biometricToken with BiometricService (Java Bridge)
      const biometricService = new (require('../../services/biometric.service').BiometricService)();
      const isVerified = await biometricService.verifyBiometric(userId, biometricToken);

      if (!isVerified) {
        return res.status(401).json({ error: 'Biometric verification failed' });
      }
      
      // 2. Fetch settlement and driver details
      const settlement = await prisma.settlement.findUnique({
        where: { id: settlementId },
        include: { trip: { include: { driver: { include: { user: { include: { bankAccounts: true } } } } } } }
      });

      if (!settlement) return res.status(404).json({ error: 'Settlement not found' });
      if (settlement.status === 'COMPLETED') return res.status(400).json({ error: 'Settlement already processed' });

      const driver = settlement.trip.driver;
      const bankAccount = driver.user.bankAccounts.find((b: any) => b.isDefault) || driver.user.bankAccounts[0];

      if (!bankAccount) {
        return res.status(400).json({ error: 'Driver has no bank account registered' });
      }

      // 3. Trigger Monnify Disbursement
      const monnifyService = new (require('../../services/monnify.service').MonnifyService)();
      const transferResult = await monnifyService.initiateTransfer({
        amount: Number(settlement.driverPayout),
        reference: `SETTLE-${settlement.id}-${Date.now()}`,
        narration: `Trip Settlement: ${settlement.tripId}`,
        destinationAccountNumber: bankAccount.accountNumber,
        destinationBankCode: bankAccount.bankCode || '',
        destinationAccountName: bankAccount.accountName,
      });

      // 4. Mark as completed
      const updatedSettlement = await prisma.settlement.update({
        where: { id: settlementId },
        data: { 
          status: 'COMPLETED',
          approvedAt: new Date(),
          approvedBy: userId
        },
      });

      return res.json({ 
        success: true, 
        message: 'Settlement Approved & Payout Triggered',
        transferReference: transferResult.reference,
        settlement: updatedSettlement 
      });
    } catch (error: any) {
      console.error('Approve settlement error:', error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Failed to approve settlement' });
    }
  }

  static async resolveAccount(req: Request, res: Response) {
    try {
      const { accountNumber, bankCode } = req.body;
      if (!accountNumber || !bankCode) {
        return res.status(400).json({ error: 'Account number and bank code required' });
      }

      const monnifyService = new (require('../../services/monnify.service').MonnifyService)();
      const result = await monnifyService.verifyBankAccount(accountNumber, bankCode);

      return res.json({ 
        success: true, 
        accountName: result.accountName,
        accountNumber: result.accountNumber,
        bankCode: result.bankCode 
      });
    } catch (error: any) {
      console.error('Resolve account error:', error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Failed to resolve account name' });
    }
  }

  static async withdrawFunds(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const { amount, pin, bankAccountId } = req.body;

      if (!amount || !pin) return res.status(400).json({ error: 'Amount and PIN are required' });

      const parkManager = await prisma.parkManager.findUnique({ 
        where: { userId },
        include: { user: true } 
      });
      if (!parkManager) return res.status(404).json({ error: 'Park Manager not found' });

      const isPinValid = await bcrypt.compare(pin, parkManager.transactionPin || '');
      if (!isPinValid) return res.status(401).json({ error: 'Invalid PIN' });

      // Logic to actually transfer funds would go here (Monnify/Paystack)

      return res.json({ 
        success: true, 
        message: 'Withdrawal Successful', 
        amountWithdrawn: amount,
        reference: `WD-${Date.now()}` 
      });
    } catch (error) {
      console.error('Withdrawal error:', error);
      return res.status(500).json({ error: 'Withdrawal failed' });
    }
  }
}
