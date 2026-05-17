import { PrismaClient } from '@prisma/client';
import * as jwt from 'jsonwebtoken';
import axios from 'axios';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({ where: { email: 'superadmin@tyap.com' } });
  if (!user) return console.error('No user found');
  
  const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET || '2a0d5b54925b5718f241bf9cdc563404694bbaa504674e73d2ebb514d6123894505b4f0f1b623843e9185ee909f0e770ffeaedccde52454a025d53c384d2ea3c');
  
  try {
    const res = await axios.get('http://localhost:3001/api/admin/dashboard-stats?period=monthly', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(JSON.stringify(res.data, null, 2));
  } catch (e: any) {
    console.error('API Error:', e.response?.data || e.message);
  }
}

main().finally(() => prisma.$disconnect());
