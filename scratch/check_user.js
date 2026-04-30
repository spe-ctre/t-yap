require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL
    }
  }
});

async function checkUser() {
  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: 'user@example.com' },
          { phoneNumber: '08012345678' },
          { phoneNumber: '+2348012345678' }
        ]
      }
    });
    console.log('USER_FOUND:', JSON.stringify(user, null, 2));
  } catch (error) {
    console.error('ERROR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();
