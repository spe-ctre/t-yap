require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteUser() {
  try {
    const email = 'user@example.com';
    const phone = '+2348012345678';
    
    // Delete verification codes first
    await prisma.verificationCode.deleteMany({
      where: { user: { OR: [{ email }, { phoneNumber: phone }] } }
    });
    
    // Delete role profiles
    await prisma.passenger.deleteMany({
      where: { user: { OR: [{ email }, { phoneNumber: phone }] } }
    });
    
    // Delete the user
    const result = await prisma.user.deleteMany({
      where: { OR: [{ email }, { phoneNumber: phone }] }
    });
    
    console.log('DELETED_USERS_COUNT:', result.count);
  } catch (error) {
    console.error('ERROR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteUser();
