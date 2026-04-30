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

  static async withdrawFunds(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { amount, pin } = req.body;

      if (!amount || !pin) return res.status(400).json({ error: 'Amount and PIN are required' });

      const parkManager = await prisma.parkManager.findUnique({ where: { userId } });
      if (!parkManager) return res.status(404).json({ error: 'Park Manager not found' });

      const isPinValid = await bcrypt.compare(pin, parkManager.transactionPin || '');
      if (!isPinValid) return res.status(401).json({ error: 'Invalid PIN' });

      return res.json({ message: 'Withdrawal successful', reference: `WD-${Date.now()}` });
    } catch (error) {
      console.error('Withdrawal error:', error);
      return res.status(500).json({ error: 'Withdrawal failed' });
    }
  }
}
