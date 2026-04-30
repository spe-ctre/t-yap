require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL
    }
  }
});

async function updateTransaction() {
  try {
    const reference = 'TOPUP_1777563643624_cmolm8fs';
    const monnifyReference = 'MNFY|96|20260430164046|000101';
    
    const transaction = await prisma.transaction.findFirst({
      where: { reference }
    });
    
    if (!transaction) {
      console.log('Transaction not found');
      return;
    }
    
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        metadata: {
          ...(transaction.metadata || {}),
          monnifyReference
        }
      }
    });
    
    console.log('TRANSACTION_UPDATED_WITH_MONNIFY_REF');
  } catch (error) {
    console.error('ERROR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateTransaction();
