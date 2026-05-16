import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Create vehicle for driver Ibrahim Speedy
  const vehicle = await prisma.vehicle.create({
    data: {
      driverId: 'cmor2zc5f000d9i5aub1b4psf',
      plateNumber: 'LAG-234-XY',
      make: 'Toyota',
      model: 'HiAce',
      year: 2022,
      color: 'White',
      capacity: 14,
      vehicleType: 'BUS',
      isVerified: true,
      isActive: true,
      currentParkId: 'cmor3p8tm0000ynrh0xovf4mb', // Lagos Central Terminal
      isAvailableForBoarding: true,
    }
  });
  console.log('Vehicle created:', JSON.stringify(vehicle, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
