import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import bcrypt from 'bcryptjs';

export class PMWalletController {
  static async getWallet(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const parkManager = await prisma.parkManager.findUnique({
        where: { userId },
        include: { park: true },
      });

      if (!parkManager) return res.status(404).json({ error: 'Park Manager not found' });

      const parkRevenue = await prisma.transaction.aggregate({
        where: { category: 'FARE_PAYMENT', status: 'SUCCESS' },
        _sum: { amount: true },
      });

      const commissionRate = parkManager.commissionRate || 5;
      const parkCommission = (Number(parkRevenue._sum.amount || 0) * Number(commissionRate)) / 100;

      return res.json({ balance: parkCommission, commissionRate, parkName: parkManager.park?.name });
    } catch (error) {
      console.error('Get wallet error:', error);
      return res.status(500).json({ error: 'Failed to fetch wallet' });
    }
  }

  static async fundWalletWithCash(req: Request, res: Response) {
    try {
      const { passengerId, amount } = req.body;
      if (!passengerId || !amount || amount <= 0) return res.status(400).json({ error: 'Valid passenger ID and amount required' });

      const result = await prisma.$transaction(async (tx) => {
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
            user: { connect: { id: passengerId } },
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
      const userId = (req as any).user?.id;
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
        settlements: settlements.map(s => ({
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
      const userId = (req as any).user?.id;

      if (!settlementId || !biometricToken) {
        return res.status(400).json({ error: 'Settlement ID and biometric approval required' });
      }

      // Verify biometricToken with BiometricService (Java Bridge)
      const biometricService = new (require('../../services/biometric.service').BiometricService)();
      const isVerified = await biometricService.verifyBiometric(userId, biometricToken);

      if (!isVerified) {
        return res.status(401).json({ error: 'Biometric verification failed' });
      }
      
      const settlement = await prisma.settlement.update({
        where: { id: settlementId },
        data: { 
          status: 'COMPLETED',
          approvedAt: new Date()
        },
      });

      // Logic to trigger bank transfer to driver and park account would go here

      return res.json({ 
        success: true, 
        message: 'Settlement Approved & Payout Triggered',
        settlement 
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

      // Mocking name resolution for UI testing
      const mockNames: Record<string, string> = {
        '9858099898': 'OLALEYE DAMILOLA OLALKUNLE',
        '0123456789': 'MUHAMMAD SEKONI',
      };

      const accountName = mockNames[accountNumber] || 'UNKNOWN ACCOUNT';

      return res.json({ 
        success: true, 
        accountName,
        accountNumber,
        bankCode 
      });
    } catch (error) {
      console.error('Resolve account error:', error);
      return res.status(500).json({ error: 'Failed to resolve account name' });
    }
  }

  static async withdrawFunds(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
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
