import { MonnifyService } from '../services/monnify.service';
import { AppError } from './errors';

const monnifyService = new MonnifyService();

/**
 * Get list of banks from Monnify
 */
export async function getBanks(): Promise<Array<{ name: string; code: string }>> {
  try {
    return await monnifyService.getBankList();
  } catch (error: any) {
    console.error('Monnify get banks error:', error.message);
    throw new AppError('Failed to fetch bank list', 500);
  }
}

/**
 * Verify bank account with Monnify
 */
export async function verifyBankAccount(accountNumber: string, bankCode: string): Promise<{
  accountNumber: string;
  accountName: string;
  bankCode: string;
}> {
  try {
    const verifiedAccount = await monnifyService.verifyBankAccount(accountNumber, bankCode);
    return {
      accountNumber: verifiedAccount.accountNumber,
      accountName: verifiedAccount.accountName,
      bankCode: verifiedAccount.bankCode
    };
  } catch (error: any) {
    console.error('Monnify bank verification error:', error.message);
    throw new AppError('Failed to verify bank account. Please check the details.', 400);
  }
}

/**
 * Initiate bank transfer/withdrawal via Monnify
 */
export async function initiateBankTransfer(data: {
  amount: number;
  destinationAccountNumber: string;
  destinationBankCode: string;
  destinationAccountName: string;
  narration: string;
  reference: string;
}): Promise<{
  reference: string;
  status: string;
  message: string;
}> {
  try {
    return await monnifyService.initiateTransfer({
      amount: data.amount,
      reference: data.reference,
      narration: data.narration,
      destinationBankCode: data.destinationBankCode,
      destinationAccountNumber: data.destinationAccountNumber,
      destinationAccountName: data.destinationAccountName
    });
  } catch (error: any) {
    console.error('Monnify transfer error:', error.message);
    throw new AppError('Failed to initiate bank transfer', 500);
  }
}

/**
 * Legacy stub for wallet top-up verification (if still needed)
 */
export async function verifyWalletTopup(reference: string): Promise<any> {
  try {
    return await monnifyService.verifyPayment(reference);
  } catch (error: any) {
    console.error('Monnify verification error:', error.message);
    throw new Error('Monnify verification failed');
  }
}