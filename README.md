# T-YAP Backend API
**Digital Transport Payment Solution** - Express.js TypeScript Backend

[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-blue.svg)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 🚀 Features

### ✅ Core Features (100% Complete)
- **Authentication & Authorization** - JWT-based with role-based access (Passenger, Driver, Agent, Park Manager)
- **Wallet Management** - Digital wallet with real-time balance tracking
- **Top-Up Service** - Monnify payment gateway integration (sandbox & production)
- **P2P Transfers** - Instant, scheduled, and recurring transfers
- **Transaction Engine** - Complete transaction processing with ledger
- **Balance Reconciliation** - Automated daily reconciliation with cron jobs
- **Transaction Analytics** - Spending insights, trends, and patterns
- **Bank Account Management** - Link and manage multiple bank accounts
- **Withdrawal Service** - Withdraw to bank accounts
- **Value-Added Services** - Airtime, data, bills payment

### 🔐 Security & Performance
- Helmet security headers
- CORS protection
- Rate limiting (100 req/15min)
- Bcrypt password hashing
- JWT authentication
- Input validation (Joi)
- SQL injection protection (Prisma)

---

## 📦 Tech Stack

| Category | Technology |
|----------|------------|
| **Runtime** | Node.js 20+ |
| **Language** | TypeScript 5+ |
| **Framework** | Express.js |
| **Database** | PostgreSQL 14+ |
| **ORM** | Prisma |
| **Authentication** | JWT + bcryptjs |
| **Payment** | Monnify API |
| **Email** | Nodemailer |
| **Scheduling** | node-cron |
| **Documentation** | Swagger/OpenAPI |
| **Validation** | Joi |

---

## 🛠️ Quick Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Git

### Installation Steps

1. **Clone repository**
   ```bash
   git clone https://github.com/spe-ctre/t-yap.git
   cd t-yap-backend
   npm install
   ```

2. **Database setup**
   ```bash
   # Create PostgreSQL database
   createdb tyap_db
   
   # Copy environment template
   cp .env.example .env
   ```

3. **Configure environment variables**
   
   Edit `.env` file with your credentials:
   ```env
   # Database
   DATABASE_URL=postgresql://username:password@localhost:5432/tyap_db
   
   # JWT
   JWT_SECRET=your_super_secret_jwt_key_min_32_chars
   JWT_EXPIRES_IN=7d
   
   # Server
   PORT=3000
   NODE_ENV=development
   FRONTEND_URL=http://localhost:3001
   
   # Email
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   
   # Monnify Payment Gateway
   MONNIFY_BASE_URL=https://sandbox.monnify.com/api/v1
   MONNIFY_API_KEY=MK_TEST_your_key
   MONNIFY_SECRET_KEY=your_secret
   MONNIFY_CONTRACT_CODE=your_contract_code
   MONNIFY_WALLET_ACCOUNT=your_account_number
   MONNIFY_WEBHOOK_SECRET=your_webhook_secret
   
   # Cron Jobs
   ENABLE_CRON=true
   ```

4. **Run database migrations**
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```
   
   Server starts at: `http://localhost:3000`

6. **View API documentation**
   
   Open: `http://localhost:3000/api-docs`

---

## 📚 API Documentation

### Interactive Docs
**Swagger UI:** `http://localhost:3000/api-docs`

### Main Endpoints

#### 🔐 Authentication (`/api/auth`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/signup` | Register new user | No |
| POST | `/login` | Login user | No |
| POST | `/verify` | Verify email/phone | Yes |
| POST | `/create-pin` | Create transaction PIN | Yes |

#### 💰 Wallet (`/api/wallet`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/balance` | Get wallet balance | Yes |
| GET | `/transactions` | Transaction history | Yes |
| POST | `/topup/initialize` | Initialize wallet top-up | Yes |
| POST | `/topup/verify` | Verify payment | Yes |
| GET | `/topup/status/:ref` | Check payment status | Yes |

#### 🔄 Transfers (`/api/transfers`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/` | Create instant transfer | Yes |
| GET | `/` | Get transfer history | Yes |
| POST | `/schedule` | Schedule future transfer | Yes |
| POST | `/recurring` | Setup recurring transfer | Yes |

#### 📊 Analytics (`/api/analytics`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/summary` | Transaction summary | Yes |
| GET | `/categories` | Category breakdown | Yes |
| GET | `/trends` | Transaction trends | Yes |
| GET | `/spending-patterns` | Spending by day | Yes |
| GET | `/top-recipients` | Top recipients | Yes |
| GET | `/export` | Export analytics | Yes |

#### ⚖️ Balance Reconciliation (`/api/balance`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/reconcile/user` | Reconcile user balance | Yes |
| GET | `/history` | Balance history | Yes |
| GET | `/trends` | Balance trends | Yes |
| POST | `/reconcile/all` | Reconcile all users | Admin |
| GET | `/discrepancies` | Get discrepancies | Admin |

#### 🏦 Bank Accounts (`/api/bank-accounts`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/` | Add bank account | Yes |
| GET | `/` | List bank accounts | Yes |
| DELETE | `/:id` | Remove bank account | Yes |

#### 🏥 Health Check
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/health` | Server status | No |

---

## 🗄️ Database Schema

### Core Tables
- **users** - User accounts and authentication
- **passengers, drivers, agents, park_managers** - User profiles with wallet balances
- **transactions** - All financial transactions (credits/debits)
- **transfers** - P2P transfer records (instant, scheduled, recurring)
- **balance_history** - Daily balance snapshots for reconciliation
- **bank_accounts** - Linked bank accounts
- **beneficiaries** - Saved recipients
- **trips** - Transport trip records
- **routes** - Transport routes
- **parks** - Transport parks
- **vas_purchases** - Value-added service purchases

### Database Commands
```bash
# Create new migration
npx prisma migrate dev --name migration_name

# View database
npx prisma studio

# Deploy to production
npx prisma migrate deploy

# Reset database (⚠️ Deletes all data)
npx prisma migrate reset
```

---

## ⏰ Scheduled Jobs (Cron)

Automated tasks (enabled with `ENABLE_CRON=true`):

| Schedule | Task | Description |
|----------|------|-------------|
| Daily 2:00 AM WAT | Balance Reconciliation | Verify all user balances |
| Sunday 11:59 PM WAT | Weekly Snapshot | Create balance snapshots |

Timezone: **Africa/Lagos (WAT)**

---

## 🧪 Testing

### Run Tests
```bash
npm test
```

### Test with Postman
1. Import Postman collection
2. Set environment variables
3. Test endpoints

### Monnify Test Cards (Sandbox)

**Successful Payment:**
```
Card Number: 5061020000000000094
CVV: 123
Expiry: 12/30
PIN: 1234
OTP: 123456
```

**Failed Payment:**
```
Card Number: 5061020000000000086
```

---

## 📁 Project Structure

```
t-yap-backend/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── migrations/            # Database migrations
├── src/
│   ├── config/                # Configuration files
│   │   ├── database.ts
│   │   └── swagger.ts
│   ├── controllers/           # Request handlers
│   │   ├── auth.controller.ts
│   │   ├── wallet.controller.ts
│   │   ├── transfer.controller.ts
│   │   ├── transaction-analytics.controller.ts
│   │   └── balance-reconciliation.controller.ts
│   ├── services/              # Business logic
│   │   ├── auth.service.ts
│   │   ├── wallet.service.ts
│   │   ├── monnify.service.ts
│   │   ├── transaction-analytics.service.ts
│   │   └── balance-reconciliation.service.ts
│   ├── routes/                # API routes
│   │   ├── auth.routes.ts
│   │   ├── wallet.routes.ts
│   │   ├── transfer.routes.ts
│   │   ├── transaction-analytics.routes.ts
│   │   └── balance-reconciliation.routes.ts
│   ├── middleware/            # Express middleware
│   │   ├── auth.middleware.ts
│   │   ├── role.middleware.ts
│   │   └── error.middleware.ts
│   ├── jobs/                  # Scheduled jobs
│   │   └── cron-jobs.ts
│   ├── types/                 # TypeScript types
│   │   └── analytics.types.ts
│   ├── utils/                 # Utility functions
│   └── server.ts              # Main entry point
├── scripts/                   # Utility scripts
├── .env.example               # Environment template
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🔧 Scripts

```bash
# Development
npm run dev          # Start development server with hot reload
npm run build        # Compile TypeScript to JavaScript
npm start            # Start production server

# Database
npm run migrate      # Run database migrations
npm run generate     # Generate Prisma client

# Testing
npm test             # Run test suite
```

---

## 🚀 Deployment

### Production Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Use production database URL
- [ ] Generate strong JWT_SECRET (32+ characters)
- [ ] Use Monnify production credentials
- [ ] Update `MONNIFY_BASE_URL` to production
- [ ] Configure production CORS origins
- [ ] Enable HTTPS/SSL
- [ ] Set `ENABLE_CRON=true`
- [ ] Setup error monitoring (Sentry)
- [ ] Configure email service
- [ ] Setup database backups
- [ ] Test all endpoints

### Deploy to Render.com

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Production ready"
   git push origin main
   ```

2. **Create Web Service on Render**
   - Connect your GitHub repository
   - Set build command: `npm install && npx prisma generate`
   - Set start command: `npm start`

3. **Add Environment Variables**
   - Copy all variables from `.env`
   - Set `NODE_ENV=production`
   - Use production database URL
   - Use Monnify production credentials

4. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment to complete

---

## 🐛 Troubleshooting

### Database Connection Failed
```bash
# Check PostgreSQL is running
sudo service postgresql status

# Verify DATABASE_URL in .env
echo $DATABASE_URL
```

### Prisma Client Not Generated
```bash
npx prisma generate
```

### Port Already in Use
```bash
# Change PORT in .env
PORT=3001

# Or kill process using port
lsof -ti:3000 | xargs kill -9
```

### Monnify Authentication Failed
- Remove inline comments from `.env` file
- Verify no extra spaces in credentials
- Check using correct environment (sandbox vs production)
- Restart server after .env changes

### Cron Jobs Not Running
- Set `ENABLE_CRON=true` in `.env`
- Check server timezone matches expected
- View cron logs in console

---

## 🔒 Security Best Practices

- ✅ All passwords hashed with bcrypt (10 rounds)
- ✅ JWT tokens expire after 7 days
- ✅ Rate limiting: 100 requests per 15 minutes
- ✅ Helmet security headers enabled
- ✅ CORS restricted to known origins
- ✅ Input validation on all endpoints
- ✅ SQL injection protection via Prisma
- ✅ Sensitive data not logged
- ✅ Environment variables for secrets

---

## 📊 System Status

**Current Version:** v1.0.0  
**Status:** Production Ready ✅  
**Last Updated:** December 2024

### Feature Completion
- Authentication: 100% ✅
- Wallet Management: 100% ✅
- Top-Up Service: 100% ✅
- P2P Transfers: 100% ✅
- Transaction Analytics: 100% ✅
- Balance Reconciliation: 100% ✅
- Bank Account Management: 100% ✅

---

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details

---

## 👥 Team

- **Backend Developer** - Initial work and implementation
spectre
codekage
webstr

---

## 📞 Support

For issues and questions:
- 📧 Email: support@t-yap.com
- 🐛 Issues: Create a GitHub issue
- 📖 Docs: `/api-docs` endpoint

---

## 🙏 Acknowledgments

- Monnify for payment gateway
- Prisma for excellent ORM
- Express.js community

---

**Built with ❤️ for T-YAP Digital Transport Payment Platform**

🚀 Ready for Production Deployment