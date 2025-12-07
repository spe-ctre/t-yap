import { PrismaClient } from "@prisma/client";
import bcrypt from 'bcryptjs'; 

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("Test123456", 10);

  const user = await prisma.user.create({
    data: {
      email: "testuser@tyap.com",
      password: hashedPassword,
      phoneNumber: "1234567890",
      role: "PASSENGER", // include only if this exists in schema
    },
  });

  console.log(user);
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());