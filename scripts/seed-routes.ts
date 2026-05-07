import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  await prisma.route.createMany({
    data: [
      { name: 'Lagos to Abuja (Express)', origin: 'Ikeja', destination: 'Wuse', originParkId: 'cmor3p8tm0000ynrh0xovf4mb', destinationParkId: 'cmor3p8tm0001ynrh8c6n630s', baseFare: 15000, distance: 750 },
      { name: 'Abuja to Lagos (Express)', origin: 'Wuse', destination: 'Ikeja', originParkId: 'cmor3p8tm0001ynrh8c6n630s', destinationParkId: 'cmor3p8tm0000ynrh0xovf4mb', baseFare: 15000, distance: 750 }
    ]
  });
  console.log('Routes seeded successfully!');
}
main().catch(console.error).finally(() => prisma.$disconnect());
