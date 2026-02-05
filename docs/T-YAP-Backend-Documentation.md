# T-YAP Backend — Technical Documentation

**Project:** T-YAP Digital Transport Payment Backend  
**Version:** 1.0.0  
**Last updated:** February 2025

---

## Project structure (folder layout)

```
t-yap/                          (repo root; backend lives here)
├── .env.example                 # Template for environment variables; copy to .env
├── .gitignore
├── package.json                 # Dependencies and npm scripts
├── tsconfig.json                # TypeScript compiler options
├── docker-compose.yml           # Local PostgreSQL container (optional)
├── README.md                    # Quick start and feature overview
├── docs/
│   ├── T-YAP-Backend-Documentation.md   # This document
│   └── screenshots/            # Optional assets
├── prisma/
│   ├── schema.prisma            # Database schema (models, enums)
│   ├── seed.ts                  # Optional DB seed script
│   └── migrations/              # One folder per migration (e.g. 20250118120000_add_t_ride_features)
├── scripts/
│   └── createTestUser.ts        # Utility script for test users
└── src/
    ├── server.ts                # Entry point: Express app, middleware, route mounting
    ├── config/                  # App-wide configuration
    │   ├── database.ts          # Prisma client instance
    │   ├── swagger.ts           # Swagger/OpenAPI spec and options
    │   ├── cloudinary.ts        # Cloudinary init (profile uploads)
    │   └── firebase.ts          # Firebase Admin init (push notifications)
    ├── controllers/             # HTTP request handlers; one file per domain
    ├── services/                # Business logic; called by controllers
    ├── routes/                  # Express routers; mount paths and wire controllers
    ├── middleware/              # auth, error handling, validation, upload, etc.
    ├── jobs/
    │   └── cron-jobs.ts         # Scheduled tasks (e.g. balance reconciliation)
    ├── swagger/                 # Optional YAML fragments for Swagger (e.g. agent, driver, park-management)
    ├── types/                   # Shared TypeScript types (e.g. analytics, express.d.ts)
    └── utils/                   # Helpers: validation (Joi schemas), encryption, file, errors, etc.
```

**Notes:**  
- Controllers, services, and routes follow a one-to-one naming pattern (e.g. `wallet.controller.ts` → `wallet.service.ts` → `wallet.routes.ts`). Some features use multiple services (e.g. T-Ride uses `park.service`, `vehicle.service`, `t-ride.service`).  
- All API routes are mounted under `/api/<path>` in `src/server.ts`.  
- Build output is in `dist/` (JavaScript); `src/` is TypeScript.

---

## How to access documentation

| What | Where / how |
|------|-------------|
| **API reference (interactive)** | With the server running: open **`http://localhost:3000/api-docs`** (or your deployed base URL + `/api-docs`). Swagger UI lists all endpoints, request/response shapes, and lets you try requests. |
| **Root URL** | **`GET /`** redirects to **`/api-docs`**. |
| **This technical doc** | **`docs/T-YAP-Backend-Documentation.md`** in the repo. Open in an editor or in Word and “Save As” .docx if needed. |
| **Quick start and features** | **`README.md`** at repo root: setup, main endpoints, database commands, deployment outline. |
| **Database schema overview** | **`DATABASE_SCHEMA.md`** (root): tables and relationships. |
| **Schema quick reference** | **`SCHEMA_QUICK_START.md`** (root): short schema reference. |
| **Swagger spec (programmatic)** | Built in code: **`src/config/swagger.ts`**. Optional YAML pieces in **`src/swagger/*.yaml`** (e.g. agent, driver, park-management) if referenced there. |

**Health check:** **`GET /health`** — returns `{ "status": "OK", "timestamp": "..." }`. Use this to confirm the server is up.

---

## Core functionalities and responsible modules

Each row is a major feature: API base path, controller(s), and service(s) that implement it.

| Functionality | API base path | Controller | Service(s) |
|---------------|----------------|------------|------------|
| Authentication (signup, login, verify, PIN, password reset) | `/api/auth` | `auth.controller.ts` | `auth.service.ts`, `session.service.ts`, `email.service.ts` |
| Wallet balance and top-up | `/api/wallet` | `wallet.controller.ts` | `wallet.service.ts`, `monnify.service.ts` |
| Transactions (history, ledger) | `/api/transactions` | `transaction.controller.ts` | `transaction.service.ts` |
| Payment initiation and callbacks | `/api/payments` | `payment.controller.ts` | `payment.service.ts`, `monnify.service.ts` |
| P2P transfers (instant, scheduled, recurring) | `/api/transfers` | `transfer.controller.ts` | `transfer.service.ts`, `transaction.service.ts` |
| Bank accounts (link, list, remove) | `/api/bank-accounts` | `bank-account.controller.ts` | `bank-account.service.ts` |
| Withdrawals | `/api/withdrawals` | `withdrawal.controller.ts` | `withdrawal.service.ts` |
| Balance reconciliation and history | `/api/balance` | `balance-reconciliation.controller.ts` | `balance-reconciliation.service.ts` |
| Transaction analytics (summary, trends, export) | `/api/analytics` | `transaction-analytics.controller.ts` | `transaction-analytics.service.ts` |
| Electricity (validate meter, purchase) | `/api/electricity` | `electricity.controller.ts` | `electricity.service.ts`, `vtpass-provider.service.ts` |
| Airtime | `/api/airtime` | `airtime.controller.ts` | `airtime.service.ts`, `vtpass-provider.service.ts` |
| Data bundles | `/api/data` | `data.controller.ts` | `data.service.ts`, `vtpass-provider.service.ts` |
| TV subscription | `/api/tv-subscription` | `tv-subscription.controller.ts` | `tv-subscription.service.ts`, `vtpass-provider.service.ts` |
| User profile and settings | `/api/profile`, `/api/settings` | `profile.controller.ts`, `settings.controller.ts` | `profile.service.ts`, `settings.service.ts` |
| Sessions (list, revoke) | `/api/sessions` | `session.controller.ts` | `session.service.ts` |
| Support tickets | `/api/support` | `support.controller.ts` | `support-ticket.service.ts`, `faq.service.ts`, `help-content.service.ts` |
| Notifications | `/api/notifications` | `notification.controller.ts` | `notification.service.ts`, `push-notification.service.ts` |
| Biometric (register, verify, remove) | `/api/biometric` | `biometric.controller.ts` | `biometric.service.ts`; `utils/encryption.util.ts` |
| Device tokens (push) | `/api/device-tokens` | `device-token.controller.ts` | Uses Firebase in `config/firebase.ts` and notification service |
| Security (PIN, security questions) | `/api/security` | `security.controller.ts` | `security.service.ts` |
| T-Ride: nearby parks, park details, vehicles at park | `/api/t-ride` | `t-ride.controller.ts` | `t-ride.service.ts`, `park.service.ts`, `vehicle.service.ts` |
| Trips (create, status, passenger/driver history) | `/api/trips` | `trip.controller.ts` | `trip.service.ts` |
| Driver (profile, KYC, etc.) | `/api/driver` | `driver.controller.ts` | Uses auth/profile and driver-related logic |
| Agent (profile, KYC, etc.) | `/api/agent` | `agent.controller.ts` | Uses auth/profile and agent-related logic |
| Park management (parks, routes, etc.) | `/api/park-management` | `park-management.controller.ts` | Uses park and related services |

**Shared / cross-cutting:**  
- **Middleware:** `auth.middleware.ts` (JWT), `error.middleware.ts`, `pin.middleware.ts`, `verification.middleware.ts`, `upload.middleware.ts`, `device.middleware.ts`, `role.middleware.ts`.  
- **Validation:** `utils/validation.ts` (Joi schemas), `utils/validation-error.util.ts`.  
- **Idempotency:** `idempotency.service.ts` used where duplicate requests must be avoided.  
- **Logging of payment/VAS:** `transaction-log.service.ts` for provider request/response logs.

---

## Other details (scripts, entry point, routes)

- **Entry point:** `src/server.ts`. It loads `.env` and `.env.local`, creates the Express app, applies Helmet/CORS/rate limit/JSON, mounts Swagger at `/api-docs`, mounts all `/api/*` routes, then registers health, 404, and error handler. Cron is started when `NODE_ENV=production` or `ENABLE_CRON=true`.  
- **npm scripts (package.json):**  
  - `npm run dev` — start with hot reload (`ts-node-dev`).  
  - `npm run build` — compile TypeScript to `dist/`.  
  - `npm start` — run `node dist/server.js`.  
  - `npm run migrate` — `npx prisma migrate dev`.  
  - `npm run migrate:deploy` — `npx prisma migrate deploy`.  
  - `npm run generate` — `npx prisma generate`.  
  - `npm test` — run Jest (if configured).  
- **Route mounting:** Every feature route is mounted in `server.ts` with `app.use('/api/<path>', <routes>)`. Auth is enforced inside each route file via `authMiddleware` (or equivalent) where required.  
- **Request body size:** `express.json({ limit: '10mb' })` in `server.ts`.

---

## 1. Environment configuration variables

Set these in `.env` (use `.env.example` as a template). Do not commit `.env` to version control.

| Variable | Required | Description | Example / notes |
|----------|----------|-------------|-----------------|
| **DATABASE_URL** | Yes | PostgreSQL connection string | `postgresql://user:password@localhost:5432/tyap_db` |
| **JWT_SECRET** | Yes | Secret for signing JWTs; min 32 characters | Use a long random string; different per environment |
| **JWT_EXPIRES_IN** | No | Token expiry | `7d` (default) |
| **PORT** | No | HTTP server port | `3000` |
| **NODE_ENV** | No | Environment | `development` or `production` |
| **FRONTEND_URL** | Yes | Frontend base URL (CORS, redirects) | `http://localhost:3001` (dev) or production URL |
| **SMTP_HOST** | Yes for email | SMTP server hostname | `smtp.gmail.com` |
| **SMTP_PORT** | No | SMTP port | `587` |
| **SMTP_USER** | Yes for email | SMTP login / sender address | Your email |
| **SMTP_PASS** | Yes for email | SMTP password (e.g. app password) | Gmail: use App Password |
| **RATE_LIMIT_WINDOW_MS** | No | Rate limit window in ms | `900000` (15 min) |
| **RATE_LIMIT_MAX_REQUESTS** | No | Max requests per window | `100` |
| **MONNIFY_BASE_URL** | Yes for payments | Monnify API base URL | Sandbox: `https://sandbox.monnify.com/api/v1` |
| **MONNIFY_API_KEY** | Yes for payments | Monnify API key | From Monnify dashboard |
| **MONNIFY_SECRET_KEY** | Yes for payments | Monnify secret key | From Monnify dashboard |
| **MONNIFY_CONTRACT_CODE** | Yes for payments | Monnify contract code | From Monnify dashboard |
| **MONNIFY_WALLET_ACCOUNT** | Yes for payments | Monnify wallet account number | From Monnify dashboard |
| **MONNIFY_WEBHOOK_SECRET** | Yes for webhooks | Secret to verify Monnify webhooks | From Monnify dashboard |
| **ENABLE_CRON** | No | Run scheduled jobs (e.g. reconciliation) | `true` or `false` |
| **VTPASS_BASE_URL** | No (VAS) | VTpass API base URL | `https://sandbox.vtpass.com` or production |
| **VTPASS_API_KEY** | No (VAS) | VTpass API key | From VTpass dashboard |
| **VTPASS_PUBLIC_KEY** | No (VAS) | VTpass public key | From VTpass dashboard |
| **VTPASS_SECRET_KEY** | No (VAS) | VTpass secret key | From VTpass dashboard |
| **FIREBASE_PROJECT_ID** | No (push) | Firebase project ID | From Firebase Console |
| **FIREBASE_PRIVATE_KEY_ID** | No (push) | Firebase private key ID | From service account JSON |
| **FIREBASE_PRIVATE_KEY** | No (push) | Firebase private key (escape newlines in .env) | From service account JSON |
| **FIREBASE_CLIENT_EMAIL** | No (push) | Firebase client email | From service account JSON |
| **FIREBASE_CLIENT_ID** | No (push) | Firebase client ID | From service account JSON |
| **FIREBASE_CERT_URL** | No (push) | Firebase x509 cert URL | From service account JSON |
| **CLOUDINARY_CLOUD_NAME** | No (uploads) | Cloudinary cloud name | From Cloudinary dashboard |
| **CLOUDINARY_API_KEY** | No (uploads) | Cloudinary API key | From Cloudinary dashboard |
| **CLOUDINARY_API_SECRET** | No (uploads) | Cloudinary API secret | From Cloudinary dashboard |
| **BIOMETRIC_ENCRYPTION_KEY** | No | AES key for biometric data; 32 bytes hex or any string (SHA-256 derived) | If unset, JWT_SECRET is used |
| **IDEMPOTENCY_KEY_EXPIRY_HOURS** | No | Hours to keep idempotency keys | `24` |
| **MAX_FILE_SIZE** | No | Max upload size in bytes | `5242880` (5MB) |

**Notes:**  
- No inline comments in `.env`; some loaders ignore or misparse them.  
- Restart the server after changing `.env`.  
- Production: use production Monnify/VTpass URLs and keys, strong JWT_SECRET, and correct FRONTEND_URL.

---

## 2. Database schema and migration notes

**Database:** PostgreSQL 14+  
**ORM:** Prisma. Schema: `prisma/schema.prisma`.

### Main areas

- **User & auth:** `User`, `Passenger`, `Driver`, `Agent`, `ParkManager`, `VerificationCode`, `UserSession`, `Device`, `Document`.
- **Wallet & money:** `Transaction`, `Transfer`, `BankAccount`, `Beneficiary`, `BalanceHistory`; wallet balances live on role tables (e.g. `Passenger.walletBalance`).
- **Transport (T-Ride):** `Park`, `Route`, `Vehicle`, `Trip`. Vehicle has `currentParkId`, `isAvailableForBoarding`; Trip has `isLongDistance`.
- **VAS:** `ServiceProvider`, `VASPurchase`.
- **Other:** `Notification`, `UserSettings`, `IdempotencyKey`, `TransactionLog`, `SecurityQuestion`, `DeviceToken`, `SupportTicket`, etc.

### Migrations (in order)

Migrations live under `prisma/migrations/`. Apply with `npx prisma migrate deploy` (production) or `npx prisma migrate dev` (development).

| Migration folder | Purpose (short) |
|------------------|-----------------|
| 20251121174914_init | Initial schema |
| 20251122034405_fix_user_type_enum | UserType enum fix |
| 20251201123513_add_models_for_electricity | Electricity VAS models |
| 20251203071557_load_notigication_models | Notification models |
| 20251204012602_add_transfer_model | Transfer model |
| 20251204015724_add_scheduled_recurring_transfers | Scheduled/recurring transfers |
| 20251204093252_add_balance_history | BalanceHistory |
| 20251207141315_add_park_manager_to_usertype | ParkManager in UserType |
| 20251209013129_add_user_type_to_transactions | UserType on transactions |
| 20251209072253_add_wallet_balance_to_agents | Agent wallet balance |
| 20251209072641_add_missing_tables | Missing tables |
| 20251209073823_add_transfers_table | Transfers table |
| 20251209080000_add_missing_tables | Additional missing tables |
| 20251209083000_add_transfers_table | Transfers table (alternate) |
| 20251217063808_add_missing_models_keep_wallet | Missing models, wallet kept |
| 20260115155710_add_biometric_and_pin_to_all_roles | Biometric/PIN on roles |
| 20260119124114_add_missing_fields_to_agent_driver_passenger_parkmanager | Extra fields on agent/driver/passenger/park manager |
| 20250118120000_add_t_ride_features | Vehicle: currentParkId, isAvailableForBoarding; Trip: isLongDistance; park lat/long index |

**Important:**  
- If the DB was changed outside Prisma or migrations got out of sync, run `npx prisma migrate status` and fix any “drift” (e.g. resolve applied migrations or re-run SQL as needed).  
- After pulling new migrations, run `npx prisma generate` so the client matches the schema.  
- Do not edit migration files that have already been applied in production.

---

## 3. Deployment guide (step-by-step)

### 3.1 Prerequisites

- Node.js 20+ (LTS).
- PostgreSQL 14+ (hosted or self-hosted).
- Git.
- Accounts and credentials for Monnify (and optionally VTpass, Firebase, Cloudinary, SMTP) for production.

### 3.2 Build and run locally (smoke test)

1. Clone repo: `git clone <repo-url>` then `cd t-yap` (or into the backend folder).
2. Install: `npm install`.
3. Copy env: `cp .env.example .env` and fill in at least `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`.
4. Database: create a PostgreSQL database and set `DATABASE_URL` in `.env`.
5. Migrate: `npx prisma migrate deploy` (or `npx prisma migrate dev` for dev).
6. Generate client: `npx prisma generate`.
7. Build: `npm run build`.
8. Start: `npm start`. Server listens on `PORT` (default 3000).  
   Health: `GET /health`. Docs: `GET /api-docs`.

### 3.3 Deploy to Render.com (web service)

1. **Render dashboard:** New → Web Service. Connect the GitHub repo and select the branch.
2. **Build:**
   - Build command: `npm install && npx prisma generate && npm run build`
   - Start command: `npm start`
   - Root directory: repo root (or folder that contains `package.json` and `prisma/`).
3. **Environment:**
   - Add every variable from `.env` that the app needs (see Section 1).  
   - Set `NODE_ENV=production`, production `DATABASE_URL`, production Monnify (and other) credentials, and production `FRONTEND_URL`.
   - Do not commit `.env`; use Render’s “Environment” tab only.
4. **Database:** Use Render PostgreSQL or an external Postgres. Put the connection string in `DATABASE_URL`. For Render Postgres, enable “Internal Database URL” if the app runs on Render.
5. **Migrations:** Run once after first deploy (or in a release command). Either:
   - Set release command to: `npx prisma migrate deploy`, or  
   - Run manually: `npx prisma migrate deploy` in a shell connected to the same environment (e.g. Render Shell).
6. **Deploy:** Save and deploy. Check logs and `GET /health` and `GET /api-docs` on the service URL.
7. **CORS:** In code, production CORS origin is set (e.g. `https://t-yap-d0rj.onrender.com`). If the frontend URL changes, update the `origin` list in `src/server.ts` and redeploy.

### 3.4 Deploy with Docker (database only in Docker)

1. **Postgres:** `docker-compose up -d` (from the repo root that has `docker-compose.yml`). This starts Postgres on port 5432; set `DATABASE_URL` to match (user/password/db from the compose file).
2. **App on host:** Same as 3.2: `npm install`, `.env`, `npx prisma migrate deploy`, `npx prisma generate`, `npm run build`, `npm start`.
3. **App in Docker:** Add a Dockerfile that copies the app, runs `npm install`, `npx prisma generate`, `npm run build`, and runs `node dist/server.js`. In production, run migrations in an init container or release step, then start the app container. Point `DATABASE_URL` to the Postgres service (e.g. `postgres` hostname if in same Docker network).

### 3.5 Post-deploy checks

- `GET /health` returns 200.
- `GET /api-docs` loads Swagger.
- Login/signup and one wallet/trip or payment flow work.
- Cron: if `ENABLE_CRON=true`, check logs for scheduled jobs (e.g. balance reconciliation).
- Webhooks: if using Monnify webhooks, ensure the URL is HTTPS and the webhook secret matches `MONNIFY_WEBHOOK_SECRET`.

---

## 4. Known issues and technical debt

- **Migration history vs database:** Some environments have migrations marked as applied in the DB that don’t exist locally (or the opposite). Use `npx prisma migrate status` and `prisma migrate resolve` to align; for one-off fixes, `npx prisma db execute --file <path>` can run raw SQL when needed.
- **Duplicate/overlapping migrations:** There are multiple migrations for “missing tables” and “transfers table”. Future work: consolidate and clean history for new environments; avoid editing already-applied migrations.
- **CORS origin hardcoded:** Production frontend URL is hardcoded in `src/server.ts`. Prefer reading from `FRONTEND_URL` or a list in env (e.g. `ALLOWED_ORIGINS`) and parsing it.
- **Transfer controller:** Uses `AppError` from `../utils/errors`; other code uses `createError` from middleware. Inconsistent error handling and imports; should standardise on one approach.
- **Monnify/utils duplication:** Both `src/services/monnify.service.ts` and `src/utils/monnify.utils.ts` read Monnify env vars. Risk of divergence; consider a single config module for Monnify.
- **VTpass keys optional at startup:** App starts even if VTpass keys are missing; VAS then fails at runtime. Consider failing fast in production when VAS is required, or documenting that VAS is optional.
- **Biometric encryption key:** Falls back to `JWT_SECRET` if `BIOMETRIC_ENCRYPTION_KEY` is unset. Using a dedicated key is safer; document and prefer explicit key in production.
- **File upload size:** `MAX_FILE_SIZE` is read in `src/utils/file.util.ts`; ensure any Multer or API limits are aligned so behaviour is consistent.
- **Tests:** `npm test` / Jest may not be fully wired or coverage may be low. Add and run tests for critical paths (auth, wallet, transfers, webhooks).
- **Swagger in production:** Confirm whether Swagger is disabled or restricted in production (e.g. via `NODE_ENV` in `src/config/swagger.ts`). If enabled, consider restricting by IP or auth.
- **Logging:** No structured logger (e.g. Pino/Winston); mostly `console`. For production, add structured logging and log levels.
- **No rate limit per user:** Global rate limit only; no per-user or per-IP differentiation. Consider per-identifier limits for sensitive routes.

---

## 5. Troubleshooting

**Database connection fails**  
- Check PostgreSQL is running and reachable.  
- Verify `DATABASE_URL` (user, password, host, port, database name).  
- If using Docker, use host `host.docker.internal` or the service name from the same network.  
- No spaces or quotes inside the URL in `.env`.

**Prisma Client errors (e.g. “unknown column”)**  
- Run `npx prisma generate`.  
- Ensure migrations are applied: `npx prisma migrate deploy` (or `migrate dev` locally).  
- Check that the schema in `prisma/schema.prisma` matches the DB (and that you’re not on an old branch).

**Migrations fail or “shadow database” errors**  
- For “shadow database” issues, use `npx prisma db execute --file <migration.sql>` to apply the SQL manually, then `npx prisma migrate resolve --applied <migration_name>`.  
- If a migration is applied in DB but missing locally, use `prisma migrate resolve --rolled-back <name>` only if you intend to re-apply; otherwise keep DB and code in sync by adding the missing migration folder or resolving as applied.

**Port already in use**  
- Change `PORT` in `.env` or stop the process using the port (e.g. on Windows: `netstat -ano | findstr :3000`; then `taskkill /PID <pid> /F`).

**Monnify auth or webhook failures**  
- Remove comments and extra spaces from `.env`.  
- Confirm sandbox vs production: correct `MONNIFY_BASE_URL` and matching API key/secret/contract.  
- Webhook: URL must be HTTPS; compare signature/secret with `MONNIFY_WEBHOOK_SECRET`.  
- Restart server after changing env.

**Cron jobs not running**  
- Set `ENABLE_CRON=true`.  
- Cron runs only when the main process is up; check that the app is running and that the schedule in `src/jobs/cron-jobs.ts` matches expectations (e.g. timezone).

**Email not sending**  
- Verify `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`.  
- Gmail: use an App Password, not the normal password.  
- Check firewall/network allows outbound SMTP.

**401 on protected routes**  
- Send `Authorization: Bearer <token>` with a valid JWT.  
- Ensure `JWT_SECRET` is the same as when the token was issued.  
- Check token expiry (`JWT_EXPIRES_IN`).

**VTpass / VAS errors**  
- Ensure `VTPASS_*` env vars are set and correct for the environment (sandbox vs live).  
- Check VTpass status/dashboard and request/response logs.

**Firebase / Cloudinary optional features**  
- If push or profile uploads are disabled, check the console for warnings about missing credentials.  
- Configure the corresponding env vars (see Section 1) if you need those features.

---

## 6. Third-party services and credentials

**Monnify (payments)**  
- Used for: wallet top-up, payment initiation, webhooks.  
- Credentials: `MONNIFY_BASE_URL`, `MONNIFY_API_KEY`, `MONNIFY_SECRET_KEY`, `MONNIFY_CONTRACT_CODE`, `MONNIFY_WALLET_ACCOUNT`, `MONNIFY_WEBHOOK_SECRET`.  
- Where to get: Monnify dashboard (sandbox and production).  
- Webhook URL must be your HTTPS base + the path your app uses for Monnify webhooks.

**VTpass (VAS)**  
- Used for: airtime, data, electricity, TV subscriptions (and similar bill payments).  
- Credentials: `VTPASS_BASE_URL`, `VTPASS_API_KEY`, `VTPASS_PUBLIC_KEY`, `VTPASS_SECRET_KEY`.  
- Where to get: VTpass dashboard.  
- Sandbox vs production: switch base URL and keys accordingly.

**Firebase (push notifications)**  
- Used for: sending push notifications to devices.  
- Credentials: from a Firebase service account JSON: `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY_ID`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_CLIENT_ID`, `FIREBASE_CERT_URL`.  
- Where to get: Firebase Console → Project settings → Service accounts → Generate new private key.  
- In `.env`, the private key is usually pasted with `\n` for newlines; the code replaces `\\n` when loading.

**Cloudinary (file uploads)**  
- Used for: profile picture (and similar) uploads.  
- Credentials: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.  
- Where to get: Cloudinary dashboard.  
- Optional: if not set, profile uploads are disabled.

**SMTP (email)**  
- Used for: verification emails, password/PIN reset, notifications.  
- Credentials: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`.  
- Any SMTP provider works (Gmail, SendGrid, etc.). Gmail requires an App Password when 2FA is on.

**Storing credentials**  
- Never commit `.env` or service account JSON to the repo.  
- In production (e.g. Render), use the platform’s environment variable configuration.  
- Rotate keys if they are ever exposed.

---

*End of document. Open this file in Microsoft Word and use “Save As” → “Word Document (.docx)” to obtain a Word document.*
