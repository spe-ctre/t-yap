import { prisma } from './src/config/database';

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
    
    if (user) {
      const otp = await prisma.verificationCode.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' }
      });
      console.log('LATEST_OTP:', JSON.stringify(otp, null, 2));
    }
  } catch (error) {
    console.error('ERROR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();
