# 🚀 Database Schema Quick Start Guide

## ✅ What Was Created

I've created a **complete database schema** that covers ALL features from your Figma designs:

### **Models Created (20+ models):**

1. **User & Auth (5 models)**
   - User, Passenger, Driver, Agent, ParkManager, VerificationCode

2. **Wallet & Transactions (4 models)**
   - Transaction, BankAccount, BankCard, Beneficiary

3. **Transport/T-Ride (4 models)**
   - Park, Route, Vehicle, Trip

4. **VAS Services (2 models)**
   - ServiceProvider, VASPurchase

5. **Settings & Notifications (2 models)**
   - Notification, UserSettings

---

## 🎯 Features Covered

✅ **Authentication** - Signup, login, email/phone verification  
✅ **Wallet** - Balance, top-up, transactions  
✅ **Bank Accounts** - Add bank accounts and cards  
✅ **T-Ride** - Transport booking, routes, trips  
✅ **Airtime & Data** - Mobile top-up services  
✅ **Electricity** - Bill payments (IKEDC, EKEDC, etc.)  
✅ **Cable TV** - DSTV, GOTV, Startimes payments  
✅ **Education** - JAMB, WAEC payments  
✅ **Notifications** - SMS, Email, Push notifications  
✅ **Settings** - Language, dark mode, preferences  
✅ **Transaction History** - Complete transaction records  
✅ **Beneficiaries** - Saved transfer recipients  

---

## 📋 How to Use

### **Step 1: Review the Schema**
```bash
# Open the schema file
code prisma/schema.prisma
```

### **Step 2: Create Migration**
```bash
# This will create the database tables
npx prisma migrate dev --name init_complete_schema
```

**What this does:**
- Creates all tables in your PostgreSQL database
- Generates migration files
- Updates your database structure

### **Step 3: Generate Prisma Client**
```bash
# This generates TypeScript types for your models
npx prisma generate
```

**What this does:**
- Creates TypeScript types for all models
- Allows you to use `prisma.user`, `prisma.transaction`, etc. in your code

### **Step 4: Verify Everything Works**
```bash
# Start your server
npm run dev
```

---

## 🔍 Understanding the Schema

### **Example: Creating a Transaction**

```typescript
// In your service file
import { prisma } from '../config/database';

// Top-up wallet
const transaction = await prisma.transaction.create({
  data: {
    userId: user.id,
    type: 'CREDIT',
    category: 'WALLET_TOPUP',
    amount: 5000.00,
    balanceBefore: 0.00,
    balanceAfter: 5000.00,
    status: 'SUCCESS',
    reference: 'TXN-' + Date.now(),
    description: 'Wallet top-up via bank transfer'
  }
});

// Update passenger wallet balance
await prisma.passenger.update({
  where: { userId: user.id },
  data: { walletBalance: 5000.00 }
});
```

### **Example: Creating a Trip**

```typescript
// Book a trip
const trip = await prisma.trip.create({
  data: {
    routeId: route.id,
    driverId: driver.id,
    vehicleId: vehicle.id,
    passengerId: user.id,
    fare: 1500.00,
    status: 'CONFIRMED',
    departureTime: new Date()
  }
});

// Create transaction for fare payment
await prisma.transaction.create({
  data: {
    userId: user.id,
    type: 'DEBIT',
    category: 'FARE_PAYMENT',
    amount: 1500.00,
    balanceBefore: 5000.00,
    balanceAfter: 3500.00,
    status: 'SUCCESS',
    reference: 'TRIP-' + trip.id,
    tripId: trip.id,
    description: `Trip from ${route.origin} to ${route.destination}`
  }
});
```

### **Example: VAS Purchase (Airtime)**

```typescript
// Buy airtime
const vasPurchase = await prisma.vASPurchase.create({
  data: {
    userId: user.id,
    serviceProviderId: provider.id, // MTN, Airtel, etc.
    category: 'AIRTIME',
    amount: 1000.00,
    phoneNumber: '+2348123456789',
    status: 'SUCCESS',
    providerReference: 'MTN-' + Date.now()
  }
});
```

---

## 📊 Key Relationships

### **User → Passenger → Transactions**
```
User (1) ── (1) Passenger ── (many) Transactions
```

### **User → Driver → Vehicle → Trips**
```
User (1) ── (1) Driver ── (1) Vehicle ── (many) Trips
```

### **Transaction → Trip (for fare payments)**
```
Transaction (optional) ── (1) Trip
```

### **Transaction → VASPurchase (for VAS)**
```
Transaction (optional) ── (1) VASPurchase
```

---

## 🎨 Model Organization

The schema is organized into sections:

```prisma
// 1. User & Authentication
model User { ... }
model Passenger { ... }
model Driver { ... }

// 2. Transaction & Wallet
model Transaction { ... }
model BankAccount { ... }

// 3. Transport
model Park { ... }
model Route { ... }
model Trip { ... }

// 4. VAS
model ServiceProvider { ... }
model VASPurchase { ... }

// 5. Settings
model Notification { ... }
model UserSettings { ... }
```

---

## ⚠️ Important Notes

### **1. Sensitive Data**
- Passwords, PINs, CVV should be **hashed** before storing
- Biometric data should be **encrypted**
- Card numbers should store only **last 4 digits**

### **2. Decimal Precision**
All money fields use `Decimal(10, 2)`:
- Prevents floating-point errors
- Stores up to 99,999,999.99 NGN

### **3. Indexes**
The schema includes indexes for:
- Fast user lookups
- Quick transaction history queries
- Efficient route searches
- Performance optimization

### **4. Cascading Deletes**
- Deleting a User deletes related Passenger, Transactions, etc.
- Prevents orphaned records

---

## 🔧 Common Operations

### **Get User's Transaction History**
```typescript
const transactions = await prisma.transaction.findMany({
  where: { userId: user.id },
  orderBy: { createdAt: 'desc' },
  take: 10 // Last 10 transactions
});
```

### **Get User's Trips**
```typescript
const trips = await prisma.trip.findMany({
  where: { passengerId: user.id },
  include: {
    route: true,
    driver: { include: { user: true } },
    vehicle: true
  },
  orderBy: { createdAt: 'desc' }
});
```

### **Get Wallet Balance**
```typescript
const passenger = await prisma.passenger.findUnique({
  where: { userId: user.id },
  select: { walletBalance: true }
});

const balance = passenger?.walletBalance || 0;
```

---

## 📚 Documentation

For detailed documentation, see:
- `DATABASE_SCHEMA.md` - Complete schema documentation
- `prisma/schema.prisma` - The actual schema file

---

## ✅ Next Steps

1. ✅ Review the schema
2. ✅ Run migration: `npx prisma migrate dev`
3. ✅ Generate client: `npx prisma generate`
4. ✅ Start building your services!

---

**Ready to build?** Start with the wallet top-up feature using the Transaction model! 🚀

