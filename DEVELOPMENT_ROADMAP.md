# 🗺️ Development Roadmap - Transaction & Financial Services

## 📊 Current Status

### ✅ **Already Built:**
- ✅ Authentication system (signup, login, verify, PIN)
- ✅ Database schema (all models ready)
- ✅ Wallet balance check endpoint
- ✅ Basic wallet service structure

### 🚧 **What You Need to Build:**
Based on your assigned scope, you need to build the **Core Transaction Engine** and related financial services.

---

## 🎯 Implementation Priority (Start Here!)

### **PHASE 1: Core Transaction Engine** ⭐ (START HERE - Foundation for everything)

**Why First?** Everything else depends on this. It's the heart of the payment system.

#### **1.1 Transaction Service** (`src/services/transaction.service.ts`)

**What to Build:**
- ✅ Create transaction records
- ✅ Update transaction status
- ✅ Handle transaction state machine (pending → processing → success/failed)
- ✅ Real-time balance updates
- ✅ Transaction locking for concurrency
- ✅ Transaction validation

**Key Methods to Implement:**
```typescript
class TransactionService {
  // Core transaction creation
  async createTransaction(data: CreateTransactionDto)
  
  // State management
  async updateTransactionStatus(transactionId: string, status: TransactionStatus)
  
  // Balance operations
  async updateBalance(userId: string, amount: number, type: 'CREDIT' | 'DEBIT')
  
  // Locking mechanism
  async lockBalance(userId: string, amount: number)
  async unlockBalance(userId: string, amount: number)
  
  // History & querying
  async getTransactionHistory(userId: string, filters: TransactionFilters)
  async getTransactionById(transactionId: string)
}
```

**Files to Create:**
- `src/services/transaction.service.ts`
- `src/controllers/transaction.controller.ts`
- `src/routes/transaction.routes.ts`
- `src/utils/transaction-lock.ts` (for concurrency)

---

#### **1.2 Balance Management Service** (`src/services/balance.service.ts`)

**What to Build:**
- ✅ Real-time balance calculation
- ✅ Balance locking for pending transactions
- ✅ Balance history tracking
- ✅ Reconciliation processes

**Key Methods:**
```typescript
class BalanceService {
  async getCurrentBalance(userId: string)
  async calculateBalance(userId: string) // From transaction ledger
  async lockBalance(userId: string, amount: number)
  async unlockBalance(userId: string, amount: number)
  async updateBalance(userId: string, amount: number, type: 'CREDIT' | 'DEBIT')
  async getBalanceHistory(userId: string, dateRange: DateRange)
}
```

**Files to Create:**
- `src/services/balance.service.ts`

---

#### **1.3 Transaction History & Filtering**

**What to Build:**
- ✅ Query transactions with filters (date, type, category, status)
- ✅ Pagination support
- ✅ Sorting options
- ✅ Export functionality (CSV/PDF)

**Key Methods:**
```typescript
async getTransactionHistory(userId: string, options: {
  limit?: number
  offset?: number
  startDate?: Date
  endDate?: Date
  type?: TransactionType
  category?: TransactionCategory
  status?: TransactionStatus
  sortBy?: 'date' | 'amount'
  sortOrder?: 'asc' | 'desc'
})
```

**Update Existing:**
- `src/services/wallet.service.ts` - Complete the `getTransactionHistory` method

---

### **PHASE 2: Top-Up Service** (Depends on Phase 1)

#### **2.1 Top-Up Service** (`src/services/topup.service.ts`)

**What to Build:**
- ✅ Account number validation
- ✅ Payment gateway integration (Flutterwave, Paystack, etc.)
- ✅ Top-up limits and validation
- ✅ Transaction confirmation workflow
- ✅ Webhook handling

**Key Methods:**
```typescript
class TopUpService {
  async initiateTopUp(userId: string, data: TopUpRequest)
  async validateAccountNumber(accountNumber: string, bankCode: string)
  async processTopUp(transactionId: string, paymentReference: string)
  async handleWebhook(payload: WebhookPayload)
  async checkTopUpLimits(userId: string, amount: number)
}
```

**Files to Create:**
- `src/services/topup.service.ts`
- `src/controllers/topup.controller.ts`
- `src/routes/topup.routes.ts`
- `src/services/payment-gateway.service.ts` (Flutterwave/Paystack wrapper)
- `src/utils/account-validation.ts`
- `src/middleware/webhook.middleware.ts`

**Payment Gateway Integration:**
- Create adapter pattern for multiple providers
- Support Flutterwave, Paystack, or both

---

### **PHASE 3: Bank Account Management** (Can be built in parallel with Phase 2)

#### **3.1 Bank Account Service** (`src/services/bank-account.service.ts`)

**What to Build:**
- ✅ Add/remove bank account endpoints
- ✅ Bank verification service (BVN, NUBAN validation)
- ✅ Account linking workflow
- ✅ Primary account designation
- ✅ Security checks

**Key Methods:**
```typescript
class BankAccountService {
  async addBankAccount(userId: string, data: AddBankAccountDto)
  async removeBankAccount(userId: string, accountId: string)
  async verifyBankAccount(accountNumber: string, bankCode: string)
  async setPrimaryAccount(userId: string, accountId: string)
  async getBankAccounts(userId: string)
  async validateAccountOwnership(userId: string, accountId: string)
}
```

**Files to Create:**
- `src/services/bank-account.service.ts`
- `src/controllers/bank-account.controller.ts`
- `src/routes/bank-account.routes.ts`
- `src/services/bank-verification.service.ts` (Paystack/Flutterwave BVN API)

---

### **PHASE 4: Peer-to-Peer Transfers** (Depends on Phase 1 & 3)

#### **4.1 Transfer Service** (`src/services/transfer.service.ts`)

**What to Build:**
- ✅ P2P transfer logic
- ✅ Transfer validation
- ✅ PIN verification
- ✅ Transaction processing

**Key Methods:**
```typescript
class TransferService {
  async initiateTransfer(userId: string, data: TransferRequest)
  async validateTransfer(userId: string, amount: number, recipientId: string)
  async verifyPin(userId: string, pin: string)
  async processTransfer(transferId: string)
  async getTransferHistory(userId: string)
}
```

**Files to Create:**
- `src/services/transfer.service.ts`
- `src/controllers/transfer.controller.ts`
- `src/routes/transfer.routes.ts`

---

### **PHASE 5: Transaction Analytics** (Depends on Phase 1)

#### **5.1 Analytics Service** (`src/services/analytics.service.ts`)

**What to Build:**
- ✅ Spending pattern analysis
- ✅ Transaction categorization
- ✅ Monthly/weekly summaries
- ✅ Export functionality (CSV/PDF)

**Key Methods:**
```typescript
class AnalyticsService {
  async getSpendingPatterns(userId: string, period: 'week' | 'month' | 'year')
  async categorizeTransactions(userId: string)
  async generateSummary(userId: string, period: DateRange)
  async exportTransactions(userId: string, format: 'csv' | 'pdf', filters: Filters)
}
```

**Files to Create:**
- `src/services/analytics.service.ts`
- `src/controllers/analytics.controller.ts`
- `src/routes/analytics.routes.ts`
- `src/utils/export-utils.ts` (CSV/PDF generation)

---

## 🚀 Step-by-Step: Where to Start

### **Step 1: Build Transaction Service (Foundation)**

**File:** `src/services/transaction.service.ts`

**Start with these methods:**
1. `createTransaction()` - Create transaction record
2. `updateTransactionStatus()` - Update status
3. `updateBalance()` - Update wallet balance atomically

**Example Structure:**
```typescript
import { prisma } from '../config/database';
import { createError } from '../middleware/error.middleware';
import { Decimal } from '@prisma/client/runtime/library';

export class TransactionService {
  async createTransaction(data: {
    userId: string;
    type: 'CREDIT' | 'DEBIT';
    category: TransactionCategory;
    amount: number;
    description?: string;
    reference: string;
    metadata?: any;
  }) {
    // 1. Get current balance
    // 2. Calculate new balance
    // 3. Create transaction record
    // 4. Update passenger wallet balance
    // 5. Return transaction
  }

  async updateTransactionStatus(
    transactionId: string,
    status: TransactionStatus
  ) {
    // Update transaction status
    // Handle balance rollback if failed
  }
}
```

---

### **Step 2: Add Transaction Locking**

**File:** `src/utils/transaction-lock.ts`

**Purpose:** Prevent concurrent transactions from causing balance issues

**Implementation:**
- Use database transactions (Prisma transactions)
- Use row-level locking
- Implement retry logic

---

### **Step 3: Complete Transaction History**

**Update:** `src/services/wallet.service.ts`

**Replace the placeholder with real implementation:**
```typescript
async getTransactionHistory(userId: string, limit: number = 10, offset: number = 0) {
  const transactions = await prisma.transaction.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
    include: {
      trip: true,
      vasPurchase: true
    }
  });

  const total = await prisma.transaction.count({
    where: { userId }
  });

  return {
    transactions,
    total,
    limit,
    offset
  };
}
```

---

### **Step 4: Build Top-Up Service**

**File:** `src/services/topup.service.ts`

**Integration Points:**
- Use TransactionService to create transaction
- Use BalanceService to update balance
- Integrate with payment gateway (Flutterwave/Paystack)

---

## 📁 File Structure You'll Create

```
src/
├── services/
│   ├── transaction.service.ts      ⭐ START HERE
│   ├── balance.service.ts
│   ├── topup.service.ts
│   ├── bank-account.service.ts
│   ├── transfer.service.ts
│   ├── analytics.service.ts
│   └── payment-gateway.service.ts
├── controllers/
│   ├── transaction.controller.ts
│   ├── topup.controller.ts
│   ├── bank-account.controller.ts
│   ├── transfer.controller.ts
│   └── analytics.controller.ts
├── routes/
│   ├── transaction.routes.ts
│   ├── topup.routes.ts
│   ├── bank-account.routes.ts
│   ├── transfer.routes.ts
│   └── analytics.routes.ts
├── utils/
│   ├── transaction-lock.ts
│   ├── account-validation.ts
│   └── export-utils.ts
└── middleware/
    └── webhook.middleware.ts
```

---

## 🔗 Dependencies & Order

```
Phase 1: Transaction Engine
  └─> Foundation for everything

Phase 2: Top-Up Service
  └─> Depends on: Transaction Engine

Phase 3: Bank Account Management
  └─> Independent (can build in parallel)

Phase 4: P2P Transfers
  └─> Depends on: Transaction Engine + Bank Accounts

Phase 5: Analytics
  └─> Depends on: Transaction Engine
```

---

## 🎯 Your First Task (Start Here!)

### **Task 1: Create Transaction Service**

1. **Create file:** `src/services/transaction.service.ts`
2. **Implement:**
   - `createTransaction()` method
   - `updateTransactionStatus()` method
   - `updateBalance()` method (atomic operation)

3. **Test it:**
   - Create a test transaction
   - Verify balance updates correctly
   - Test status updates

**Time Estimate:** 2-3 hours

---

## 💡 Key Implementation Tips

### **1. Use Database Transactions**
```typescript
await prisma.$transaction(async (tx) => {
  // Create transaction record
  // Update balance
  // All or nothing!
});
```

### **2. Handle Concurrency**
- Use Prisma's `update` with `where` conditions
- Implement optimistic locking
- Use database-level locks

### **3. Balance Updates**
- Always calculate: `balanceAfter = balanceBefore + amount`
- Store both `balanceBefore` and `balanceAfter` in transaction
- Update passenger balance atomically

### **4. Error Handling**
- Rollback on failures
- Log all errors
- Return user-friendly messages

---

## 📚 Resources You'll Need

### **Payment Gateway Docs:**
- Flutterwave: https://developer.flutterwave.com/
- Paystack: https://paystack.com/docs/

### **Bank Verification:**
- Paystack Bank Verification: https://paystack.com/docs/api/#bank
- Flutterwave BVN: https://developer.flutterwave.com/reference#bvn

### **Prisma Transactions:**
- https://www.prisma.io/docs/concepts/components/prisma-client/transactions

---

## ✅ Success Criteria

**Phase 1 Complete When:**
- ✅ Can create transactions
- ✅ Balance updates correctly
- ✅ Transaction history works
- ✅ Concurrent transactions handled safely

**Phase 2 Complete When:**
- ✅ Can top-up wallet
- ✅ Payment gateway integrated
- ✅ Webhooks working
- ✅ Top-up limits enforced

**Phase 3 Complete When:**
- ✅ Can add/remove bank accounts
- ✅ Bank verification works
- ✅ Primary account can be set

---

## 🚦 Ready to Start?

**Your first file to create:** `src/services/transaction.service.ts`

**Your first method to implement:** `createTransaction()`

**Need help?** Follow the pattern from `wallet.service.ts` and `auth.service.ts`!

---

**Let's build this! 🚀**

