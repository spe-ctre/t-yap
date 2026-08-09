/// <reference path="../../shared/types/express.d.ts" />
import { Request, Response } from 'express';
import { PMWalletService } from '../services/pm-wallet.service';

const handleError = (res: Response, error: any, fallbackMessage: string) => {
  console.error(fallbackMessage + ':', error);
  const statusCode = error.statusCode || 500;
  return res.status(statusCode).json({ error: error.message || fallbackMessage });
};

export class PMWalletController {
  static async getWallet(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const wallet = await PMWalletService.getWallet(userId);
      return res.json(wallet);
    } catch (error: any) {
      return handleError(res, error, 'Failed to fetch wallet');
    }
  }

  static async fundWalletWithCash(req: Request, res: Response) {
    try {
      const { passengerId, amount } = req.body;
      const result = await PMWalletService.fundWalletWithCash(passengerId, amount);
      return res.json({ success: true, newBalance: result.newBalance });
    } catch (error: any) {
      return handleError(res, error, 'Failed to fund wallet');
    }
  }

  static async getPendingSettlements(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const settlements = await PMWalletService.getPendingSettlements(userId);
      return res.json({ success: true, settlements });
    } catch (error: any) {
      return handleError(res, error, 'Failed to fetch settlements');
    }
  }

  static async calculateSettlementSplit(req: Request, res: Response) {
    try {
      const { settlementId } = req.params;
      const split = await PMWalletService.calculateSettlementSplit(settlementId);
      return res.json(split);
    } catch (error: any) {
      return handleError(res, error, 'Failed to calculate split');
    }
  }

  static async approveSettlement(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const { settlementId, biometricToken } = req.body;
      const result = await PMWalletService.approveSettlement(userId, settlementId, biometricToken);
      return res.json({ success: true, ...result });
    } catch (error: any) {
      return handleError(res, error, 'Failed to approve settlement');
    }
  }

  static async resolveAccount(req: Request, res: Response) {
    try {
      const { accountNumber, bankCode } = req.body;
      const result = await PMWalletService.resolveAccount(accountNumber, bankCode);
      return res.json({ success: true, ...result });
    } catch (error: any) {
      return handleError(res, error, 'Failed to resolve account name');
    }
  }

  static async withdrawFunds(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const { amount, pin } = req.body;
      const result = await PMWalletService.withdrawFunds(userId, amount, pin);
      return res.json({ success: true, ...result });
    } catch (error: any) {
      return handleError(res, error, 'Withdrawal failed');
    }
  }
}