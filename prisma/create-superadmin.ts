import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('SuperAdmin123!', 12);
  
  const existing = await prisma.user.findFirst({
    where: { email: 'superadmin@tyap.com' }
  });

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        password: hashedPassword,
        isEmailVerified: true,
        role: 'SUPER_ADMIN' as any,
      }
    });
    console.log('✅ Superadmin updated successfully!');
  } else {
    await prisma.user.create({
      data: {
        email: 'superadmin@tyap.com',
        phoneNumber: '+2348000000000',
        password: hashedPassword,
        isEmailVerified: true,
        role: 'SUPER_ADMIN' as any,
      }
    });
    console.log('✅ Superadmin created successfully!');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
