import { prisma } from '../config/database';
import { TransactionStatus, TransactionCategory, TransactionType } from '@prisma/client';
import { AppError } from '../utils/errors';
import { initiateBankTransfer } from '../utils/monnify.utils';

export class AdminFinanceService {
  /**
   * Fetch all pending withdrawal/settlement requests
   */
  static async getPendingSettlements() {
    // In T-Yap, withdrawals are stored as Debit Transactions with category TRANSFER
    const pendingTransactions = await prisma.transaction.findMany({
      where: {
        type: TransactionType.DEBIT,
        category: TransactionCategory.TRANSFER,
        status: {
          in: [TransactionStatus.PENDING, TransactionStatus.PROCESSING]
        },
        metadata: {
          path: ['withdrawalType'],
          equals: 'BANK_TRANSFER'
        }
      },
      include: {
        user: {
          select: {
            id: true,
            role: true,
            passenger: { select: { firstName: true, lastName: true } },
            driver: { select: { firstName: true, lastName: true } },
            agent: { select: { firstName: true, lastName: true } },
            parkManager: { select: { firstName: true, lastName: true } }
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    // Map DB schema to UI expected format
    return pendingTransactions.map(tx => {
      const user = tx.user;
      let name = 'Unknown User';
      
      if (user.role === 'DRIVER' && user.driver) name = `${user.driver.firstName} ${user.driver.lastName}`;
      else if (user.role === 'AGENT' && user.agent) name = `${user.agent.firstName} ${user.agent.lastName}`;
      else if (user.role === 'PARK_MANAGER' && user.parkManager) name = `${user.parkManager.firstName} ${user.parkManager.lastName}`;
      else if (user.passenger) name = `${user.passenger.firstName} ${user.passenger.lastName}`;

      const meta = tx.metadata as any || {};

      return {
        id: tx.id,
        userId: tx.userId,
        name,
        role: user.role,
        amount: Math.abs(tx.amount.toNumber()),
        bankName: meta.bankName || 'Unknown Bank',
        accountNumber: meta.accountNumber || 'Unknown Account',
        status: tx.status === 'PROCESSING' ? 'Pending' : tx.status,
        requestDate: tx.createdAt.toLocaleString()
      };
    });
  }

  /**
   * Bulk approve settlements and trigger bank transfers
   */
  static async bulkApproveSettlements(transactionIds: string[], adminId: string) {
    let successCount = 0;
    let failCount = 0;

    for (const txId of transactionIds) {
      try {
        const transaction = await prisma.transaction.findUnique({
          where: { id: txId }
        });

        if (!transaction || transaction.status === TransactionStatus.SUCCESS) {
          failCount++;
          continue;
        }

        const meta = transaction.metadata as any;

        // Ensure we don't transfer money twice
        if (meta.monnifyResponse) {
          failCount++;
          continue;
        }

        // Trigger real money transfer
        const transferResult = await initiateBankTransfer({
          amount: Math.abs(transaction.amount.toNumber()),
          destinationAccountNumber: meta.accountNumber,
          destinationBankCode: meta.bankCode,
          destinationAccountName: meta.accountName,
          narration: 'T-Yap Settlement Payout',
          reference: transaction.reference,
        });

        // Update DB
        await prisma.transaction.update({
          where: { id: txId },
          data: {
            status: TransactionStatus.SUCCESS,
            metadata: {
              ...meta,
              monnifyResponse: transferResult,
              approvedBy: adminId,
              completedAt: new Date().toISOString(),
            }
          }
        });

        successCount++;
      } catch (error) {
        console.error(`Failed to approve settlement ${txId}:`, error);
        failCount++;
      }
    }

    return { successCount, failCount };
  }
}
