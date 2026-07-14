# 🗺️ TYAP Backend — Development Roadmap
> Last Updated: **14 July 2026 — 09:00 WAT**
> This file tracks what has been built, what is currently pending, and what comes next.

---

## ✅ PHASE 0 — Foundation (COMPLETE)

| Item | Status |
|---|---|
| Project setup — TypeScript, Express, Prisma | ✅ Done |
| Database schema — all models defined | ✅ Done |
| Authentication — signup, login, verify, PIN | ✅ Done |
| Middleware — auth, error handling, rate limiting, validation | ✅ Done |
| Server entry point — clustering, workers, routes mounted | ✅ Done |

---

## ✅ PHASE 1 — Core Transaction Engine (COMPLETE)

| Item | File | Status |
|---|---|---|
| Wallet service — balance check | `src/services/wallet.service.ts` | ✅ Done |
| Transaction service — create, update, history | `src/services/transaction.service.ts` | ✅ Done |
| Balance reconciliation | `src/services/balance-reconciliation.service.ts` | ✅ Done |
| Transaction analytics | `src/services/transaction-analytics.service.ts` | ✅ Done |
| Transaction log | `src/services/transaction-log.service.ts` | ✅ Done |
| Idempotency service — prevent duplicate transactions | `src/services/idempotency.service.ts` | ✅ Done |

---

## ✅ PHASE 2 — Top-Up / Wallet Funding (COMPLETE)

| Item | File | Status |
|---|---|---|
| Monnify payment gateway — virtual accounts | `src/services/monnify.service.ts` | ✅ Done |
| Payment service — top-up orchestration | `src/services/payment.service.ts` | ✅ Done |
| Withdrawal service — bank withdrawal | `src/services/withdrawal.service.ts` | ✅ Done |
| Transport wallet service | `src/services/transport-wallet.service.ts` | ✅ Done |

---

## ✅ PHASE 3 — Bank Account Management (COMPLETE)

| Item | File | Status |
|---|---|---|
| Bank account service — add/remove/verify/primary | `src/services/bank-account.service.ts` | ✅ Done |

---

## ✅ PHASE 4 — Peer-to-Peer Transfers (COMPLETE)

| Item | File | Status |
|---|---|---|
| Transfer service — P2P wallet transfers with PIN | `src/services/transfer.service.ts` | ✅ Done |

---

## ✅ PHASE 5 — VAS (Value Added Services) (COMPLETE)

| Item | File | Status |
|---|---|---|
| Airtime purchase (MTN, Glo, Airtel, 9mobile) | `src/services/airtime.service.ts` | ✅ Done |
| Data bundle purchase | `src/services/data.service.ts` | ✅ Done |
| Electricity bill payment | `src/services/electricity.service.ts` | ✅ Done |
| Cable TV subscription (DStv, GOtv, Startimes) | `src/services/tv-subscription.service.ts` | ✅ Done |
| VTPass provider adapter | `src/services/vtpass-provider.service.ts` | ✅ Done |

---

## ✅ PHASE 6 — Transport (T-Ride) (COMPLETE — Data Pending)

| Item | File | Status |
|---|---|---|
| Park service — motor park management | `src/services/park.service.ts` | ✅ Done |
| Nearby service — find parks by GPS (Haversine, 50km radius) | `src/services/nearby.service.ts` | ✅ Done |
| Trip service — ride booking and management | `src/services/trip.service.ts` | ✅ Done |
| Vehicle service — vehicle registration | `src/services/vehicle.service.ts` | ✅ Done |
| T-Ride service — T-Ride business logic | `src/services/t-ride.service.ts` | ✅ Done |
| **SEED DATA — 15 parks in DB** | `prisma/seed.ts` | ⚠️ **PENDING: Run `npx prisma db seed`** |

---

## ✅ PHASE 7 — User Profile & KYC (COMPLETE)

| Item | File | Status |
|---|---|---|
| Profile service — view/update/photo upload | `src/services/profile.service.ts` | ✅ Done |
| KYC service — identity verification | `src/services/kyc.service.ts` | ✅ Done |
| Settings service — user preferences | `src/services/settings.service.ts` | ✅ Done |
| Session service — multi-device session management | `src/services/session.service.ts` | ✅ Done |
| Security service — PIN, security questions | `src/services/security.service.ts` | ✅ Done |

---

## ✅ PHASE 8 — Notifications & Communication (COMPLETE)

| Item | File | Status |
|---|---|---|
| Email service — SendGrid (from `noreply@tyap.com`) | `src/services/email.service.ts` | ✅ Done |
| SMS service — Termii | `src/services/sms.service.ts` | ✅ Done |
| Push notification — FCM | `src/services/push-notification.service.ts` | ✅ Done |
| Notification orchestration | `src/services/notification.service.ts` | ✅ Done |
| Queue service — BullMQ + Redis + fallback | `src/services/queue.service.ts` | ✅ Done |
| **SPF/DKIM DNS records for tyap.com** | Domain Registrar | ⚠️ **PENDING: Manual DNS setup** |

---

## ✅ PHASE 9 — Support, FAQ & Chatbot (COMPLETE — Data Pending)

| Item | File | Status |
|---|---|---|
| FAQ service — search, categories, popular | `src/services/faq.service.ts` | ✅ Done |
| Help content service — guides and articles | `src/services/help-content.service.ts` | ✅ Done |
| Support ticket service — create, track, manage | `src/services/support-ticket.service.ts` | ✅ Done |
| Chatbot (Nick) — greeting + keyword intent detection | `src/services/chatbot.service.ts` | ✅ Done |
| Contact info — phone + email + WhatsApp | `src/controllers/support.controller.ts` | ✅ Done |
| **SEED DATA — 12 FAQs + 6 help articles in DB** | `prisma/seed.ts` | ⚠️ **PENDING: Run `npx prisma db seed`** |

---

## ✅ PHASE 10 — Admin & Analytics (COMPLETE)

| Item | File | Status |
|---|---|---|
| Admin finance service | `src/services/admin-finance.service.ts` | ✅ Done |
| Analytics service — spending, categorization, exports | `src/services/transaction-analytics.service.ts` | ✅ Done |
| Live data service | `src/services/live-data.service.ts` | ✅ Done |
| Receipt service — transaction receipts | `src/services/receipt.service.ts` | ✅ Done |
| Referral service — referral code + tracking | `src/services/referral.service.ts` | ✅ Done |

---

## ✅ PHASE 11 — UAT Bug Fixes (COMPLETE — 2 actions pending)

> All bugs from the T-Yap UAT Bug Report (15–16 June 2026) addressed.

| Bug ID | Issue | Status |
|---|---|---|
| B1 · P1 | OTP delay — sandbox mock disabled, direct email fallback added | ✅ Fixed |
| B2 · P2 | OTP in spam — sender changed to `noreply@tyap.com` | ✅ Code fixed, ⚠️ DNS pending |
| B3 · P2 | OTP expiry 10min → 3min (all 4 locations in auth.service.ts) | ✅ Fixed |
| B4 · P2 | Change PIN fails — `confirmPin` made optional in validation | ✅ Fixed |
| B5 · P2 | Chatbot generic replies — keyword intent detection added (9 intents) | ✅ Fixed |
| B6 · P2 | FAQ empty — seed.ts updated with 12 real FAQs | ✅ Code ready, ⚠️ Seed pending |
| B7 · P1 | 0 parks — seed.ts updated with 15 Nigerian motor parks + 50km radius | ✅ Code ready, ⚠️ Seed pending |
| B8 · P3 | Refer & Earn "My Code" — API was always fine, RN frontend issue | N/A (RN dev) |
| B9 · P2 | Contact support missing email/WhatsApp — added to response | ✅ Fixed |
| Email templates | "expires in 10 minutes" text corrected to "3 minutes" | ✅ Fixed |

---

## 🔴 WHAT TO DO NEXT — In Priority Order

### 🥇 STEP 1: Run Database Seed (URGENT)
**When:** As soon as Supabase is healthy (check https://status.supabase.com)
**Command:**
```bash
cd /Users/Apple/t-yap
npx prisma db seed
```
**What it does:**
- Clears old/corrupt park and FAQ data
- Inserts 15 Nigerian motor parks with GPS coordinates
- Inserts 12 FAQs across 5 categories
- Inserts 6 help articles
- Fixes B6 (FAQ) and B7 (Parks/Nearby Terminals) for real

---

### 🥈 STEP 2: Configure SPF/DKIM DNS
**When:** Log into your domain registrar for `tyap.com`
**What to do:**
1. Add SendGrid SPF record (TXT): `v=spf1 include:sendgrid.net ~all`
2. Add DKIM records from SendGrid → Settings → Sender Authentication → Domain Authentication
3. This prevents OTP emails from landing in spam (fixes B2 fully)

---

### 🥉 STEP 3: React Native Bug Fixes (F1–F12)
**Owner:** React Native developer (separate codebase)
**Prompt already prepared** — see the conversation or ask the AI to regenerate it.
**Covers:** App icon, OTP auto-advance, login error message, remember me, onboarding, utility icon crashes, notification icon, save changes button, profile photo sync, referral code display, link bank account CTA, biometric prompt.

---

### STEP 4: Push Code to GitHub (Optional)
```bash
cd /Users/Apple/t-yap
git push origin main
```

---

## 🚀 RESUME INSTRUCTIONS (If Chat History is Lost)

If you open a new chat session and your history is gone, paste this to the AI:

> "Read `/Users/Apple/t-yap/COMPLETION_CHECKLIST.md` and `/Users/Apple/t-yap/DEVELOPMENT_ROADMAP.md` in full before doing anything.
> Then:
> 1. Check if Supabase is healthy at https://status.supabase.com
> 2. If healthy, run `npx prisma db seed` in `/Users/Apple/t-yap` to complete B6 and B7
> 3. If not healthy, proceed to set up SPF/DKIM DNS for `tyap.com` (explain what to do)
> The last git commit is `56e2c9b` — message: `fix(backend): resolve UAT backend issues (B1-B7, B9)`"
