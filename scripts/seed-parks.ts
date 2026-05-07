import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  await prisma.park.createMany({
    data: [
      { name: 'Lagos Central Terminal', address: '123 Ikeja Way', city: 'Ikeja', state: 'Lagos', country: 'Nigeria' },
      { name: 'Abuja Main Park', address: '456 Wuse Road', city: 'Wuse', state: 'FCT', country: 'Nigeria' }
    ]
  });
  console.log('Parks seeded successfully!');
}
main().catch(console.error).finally(() => prisma.$disconnect());
