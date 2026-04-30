require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL
    }
  }
});

async function simulatePayment() {
  try {
    const reference = 'TOPUP_1777563643624_cmolm8fs';
    
    const transaction = await prisma.transaction.findFirst({
      where: { reference, status: 'PENDING' }
    });
    
    if (!transaction) {
      console.log('Transaction not found or already processed');
      return;
    }
    
    const amount = Number(transaction.amount);
    
    await prisma.$transaction(async (tx) => {
      // 1. Update transaction status
      await tx.transaction.update({
        where: { id: transaction.id },
        data: {
          status: 'SUCCESS',
          balanceAfter: { increment: amount }
        }
      });
      
      // 2. Update passenger balance
      await tx.passenger.update({
        where: { userId: transaction.userId },
        data: {
          walletBalance: { increment: amount }
        }
      });
    });
    
    console.log('PAYMENT_SIMULATED_SUCCESSFULLY');
    console.log('Amount:', amount);
    console.log('User ID:', transaction.userId);
  } catch (error) {
    console.error('ERROR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

simulatePayment();
