/**
 * Several onboarding flows create a User row with a placeholder email
 * before a real one is ever collected (or in cases where one may never
 * be collected at all, e.g. agents onboarded purely by phone/OTP):
 *
 *   - src/agent/services/agent.service.ts        -> `${phoneNumber}@tyap.agent`
 *   - src/agent/services/agent.service.ts         -> `${phoneNumber}@tyap.temp`     (passenger onboarded by an agent)
 *   - src/agent/services/agent.service.ts         -> `${phoneNumber}@tyap.driver`  (driver onboarded by an agent)
 *   - src/park-management/controllers/pm-auth.controller.ts -> `${phoneNumber}@tyap.parkmanager`
 *
 * None of these domains can ever receive real mail. Any endpoint that
 * looks a user up by email and then emails them a code (forgot-password,
 * resend-verification) should treat a synthetic-email account the same
 * as "no such account" - otherwise a caller who knows the deterministic
 * pattern (public repo, same phoneNumber-based format) can still trigger
 * code generation against that row, and in non-production environments
 * those endpoints echo the raw code back in the API response.
 *
 * Add any new synthetic domain here as onboarding flows evolve.
 */
const SYNTHETIC_EMAIL_DOMAINS = [
  '@tyap.agent',
  '@tyap.temp',
  '@tyap.driver',
  '@tyap.parkmanager',
];

export function isSyntheticEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const lower = email.toLowerCase();
  return SYNTHETIC_EMAIL_DOMAINS.some((domain) => lower.endsWith(domain));
}