import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Admin123!', 10);
  
  const adminsToCreate = [
    { email: 'finance@tyap.com', phone: '+2348000000001', role: 'FINANCE_ADMIN' },
    { email: 'compliance@tyap.com', phone: '+2348000000002', role: 'COMPLIANCE_OFFICER' },
    { email: 'system@tyap.com', phone: '+2348000000003', role: 'SYSTEM_ENGINEER' },
    { email: 'operations@tyap.com', phone: '+2348000000004', role: 'OPERATIONS_ADMIN' },
    { email: 'support@tyap.com', phone: '+2348000000005', role: 'SUPPORT_ADMIN' },
  ];

  console.log('Seeding test admins...');

  for (const adminData of adminsToCreate) {
    const exists = await prisma.user.findUnique({ where: { email: adminData.email } });
    if (!exists) {
      await prisma.user.create({
        data: {
          email: adminData.email,
          phoneNumber: adminData.phone,
          password: passwordHash,
          isEmailVerified: true,
          isPhoneVerified: true,
          // @ts-ignore - bypassing strict type check for role if needed, though schema has it
          role: adminData.role, 
        }
      });
      console.log(`Created ${adminData.role} with email ${adminData.email} and password Admin123!`);
    } else {
      console.log(`User ${adminData.email} already exists.`);
    }
  }

  console.log('Admin seeding complete.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
