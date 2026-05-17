import { PrismaClient } from '@prisma/client';
import * as jwt from 'jsonwebtoken';
import axios from 'axios';

const prisma = new PrismaClient();

async function main() {
  // Step 1: Find superadmin
  const user = await prisma.user.findFirst({ where: { email: 'superadmin@tyap.com' } });
  if (!user) { console.error('❌ No superadmin found in DB'); return; }
  console.log('✅ Found superadmin:', user.id, user.role);

  // Step 2: Sign token exactly like SessionService does
  const secret = '2a0d5b54925b5718f241bf9cdc563404694bbaa504674e73d2ebb514d6123894505b4f0f1b623843e9185ee909f0e770ffeaedccde52454a025d53c384d2ea3c';
  const token = jwt.sign({ userId: user.id, role: user.role }, secret, { expiresIn: '7d' });
  console.log('✅ Token created');

  // Step 3: Call dashboard-stats
  try {
    const res = await axios.get('http://127.0.0.1:3001/api/admin/dashboard-stats?period=monthly', {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 10000
    });
    console.log('✅ Dashboard API Response:');
    console.log(JSON.stringify(res.data, null, 2));
  } catch (e: any) {
    console.error('❌ Dashboard API Error:', e.response?.status, e.response?.data || e.message);
  }
}

main().finally(() => prisma.$disconnect());
