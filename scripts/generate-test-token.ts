/**
 * TEMPORARY TEST UTILITY - not part of the app, not imported anywhere.
 * Generates a real, valid session token for an existing DRIVER user,
 * so driver endpoints can be Postman-tested before the full
 * biometric + park-management check-in flow is wired up end to end.
 *
 * Uses the exact same SessionService.createSession() the real biometric
 * check-in endpoint calls - so this produces a genuinely valid token
 * (real JWT + real UserSession DB row), not a shortcut/fake.
 *
 * Usage:
 *   npx ts-node scripts/generate-test-token.ts <phoneNumber>
 *
 * Example:
 *   npx ts-node scripts/generate-test-token.ts +2348099998888
 */
import { prisma } from '../src/shared/config/database';
import { SessionService } from '../src/identity/services/session.service';

async function main() {
  const phoneNumber = process.argv[2];

  if (!phoneNumber) {
    console.error('Usage: npx ts-node scripts/generate-test-token.ts <phoneNumber>');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { phoneNumber } });

  if (!user) {
    console.error(`No user found with phoneNumber: ${phoneNumber}`);
    process.exit(1);
  }

  if (user.role !== 'DRIVER') {
    console.error(`This user's role is ${user.role}, not DRIVER. Wrong number?`);
    process.exit(1);
  }

  const sessionService = new SessionService();
  const { token } = await sessionService.createSession(
    user.id,
    { deviceType: 'TEST_SCRIPT' },
    'DRIVER'
  );

  console.log('\n✅ Real driver session token generated:\n');
  console.log(token);
  console.log('\nUse this as: Authorization: Bearer <token above>\n');

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});