# 📊 T-YAP Database Schema Documentation

## Overview

This document explains the complete database schema for the T-YAP digital transport payment system. The schema supports all features shown in the Figma designs including authentication, wallet management, transport services, and value-added services (VAS).

---

## 📁 Schema Structure

The database is organized into the following main sections:

1. **User & Authentication** - User accounts, roles, verification
2. **Transaction & Wallet** - Financial transactions, bank accounts, beneficiaries
3. **Transport (T-Ride)** - Parks, routes, vehicles, trips
4. **Value Added Services (VAS)** - Airtime, Data, Electricity, Cable TV, Education
5. **Notifications & Settings** - User preferences and notifications

---

## 🔐 User & Authentication Models

### **User**
The core user account model that all other user types extend.

**Fields:**
- `id` - Unique identifier
- `email` - User email (unique)
- `phoneNumber` - User phone (unique)
- `password` - Hashed password
- `isEmailVerified` - Email verification status
- `isPhoneVerified` - Phone verification status
- `role` - User role (PASSENGER, DRIVER, AGENT, PARK_MANAGER)

**Relations:**
- One-to-one with Passenger, Driver, Agent, or ParkManager
- One-to-many with Transactions, BankAccounts, Notifications

---

### **Passenger**
Extended user profile for passengers.

**Fields:**
- `firstName`, `lastName` - Personal information
- `biometricData` - Encrypted biometric template (thumbprint)
- `transactionPin` - Hashed PIN for transactions
- `walletBalance` - Current wallet balance (NGN)
- `profilePicture` - Profile image URL

**Key Features:**
- Linked to User via `userId`
- Stores wallet balance
- Stores biometric data for fare payments

---

### **Driver**
Extended user profile for drivers.

**Fields:**
- `licenseNumber` - Driver's license (unique)
- `licenseExpiry` - License expiration date
- `isVerified` - Verification status
- `walletBalance` - Driver's earnings balance
- `profilePicture` - Profile image URL

**Relations:**
- One-to-one with Vehicle
- One-to-many with Trips

---

### **Agent**
Extended user profile for park agents.

**Fields:**
- `agentCode` - Unique agent identifier
- `parkId` - Associated park
- `isActive` - Active status

---

### **ParkManager**
Extended user profile for park managers.

**Fields:**
- `parkId` - Managed park

---

### **VerificationCode**
Stores verification codes for email, phone, and password reset.

**Fields:**
- `code` - 6-digit verification code
- `type` - EMAIL_VERIFICATION, PHONE_VERIFICATION, PASSWORD_RESET
- `expiresAt` - Expiration timestamp
- `isUsed` - Whether code has been used

---

## 💰 Transaction & Wallet Models

### **Transaction**
Records all financial transactions in the system.

**Fields:**
- `type` - CREDIT (money in) or DEBIT (money out)
- `category` - Transaction category (see enum below)
- `amount` - Transaction amount
- `balanceBefore` - Wallet balance before transaction
- `balanceAfter` - Wallet balance after transaction
- `status` - Transaction status (PENDING, SUCCESS, FAILED, etc.)
- `reference` - External payment reference (unique)
- `metadata` - Additional JSON data

**Transaction Categories:**
- `WALLET_TOPUP` - Adding money to wallet
- `FARE_PAYMENT` - Paying for transport
- `AIRTIME_PURCHASE` - Buying airtime
- `DATA_PURCHASE` - Buying data
- `ELECTRICITY_PAYMENT` - Paying electricity bills
- `CABLE_TV_PAYMENT` - Paying cable TV bills
- `EDUCATION_PAYMENT` - Paying education fees (JAMB, WAEC)
- `TRANSFER` - Transferring money
- `REFUND` - Refund transactions
- `COMMISSION` - Driver/agent commissions

**Relations:**
- Belongs to User
- Optional relation to Trip (if fare payment)
- Optional relation to VASPurchase (if VAS purchase)

---

### **BankAccount**
Stores user's bank account details for wallet top-up.

**Fields:**
- `accountName` - Account holder name
- `accountNumber` - Bank account number
- `bankName` - Bank name
- `bankCode` - Bank code (for Nigerian banks)
- `accountType` - SAVINGS or CURRENT
- `isDefault` - Default account for top-up
- `isVerified` - Verification status

---

### **BankCard**
Stores user's debit/credit card details.

**Fields:**
- `cardNumber` - Last 4 digits only (encrypted)
- `cardHolderName` - Name on card
- `expiryMonth`, `expiryYear` - Expiration date
- `cvv` - Encrypted CVV (should not be stored long-term)
- `cardType` - Visa, Mastercard, etc.
- `isDefault` - Default card
- `isActive` - Active status

**Security Note:** Full card numbers and CVV should be encrypted and handled securely.

---

### **Beneficiary**
Stores frequently used transfer recipients.

**Fields:**
- `name` - Beneficiary name
- `phoneNumber` - Recipient phone number
- `accountNumber` - Bank account (optional)
- `bankName` - Bank name (optional)
- `isFavorite` - Favorite beneficiary flag

---

## 🚗 Transport Models (T-Ride)

### **Park**
Motor park/terminal locations.

**Fields:**
- `name` - Park name
- `address` - Full address
- `city`, `state`, `country` - Location details
- `latitude`, `longitude` - GPS coordinates
- `isActive` - Active status

**Relations:**
- One-to-many with Agents
- One-to-many with ParkManagers
- One-to-many with Routes (as origin or destination)

---

### **Route**
Transport routes between locations.

**Fields:**
- `name` - Route name (e.g., "Lagos to Ibadan")
- `origin`, `destination` - Start and end locations
- `originParkId`, `destinationParkId` - Associated parks
- `distance` - Distance in kilometers
- `estimatedTime` - Estimated travel time in minutes
- `baseFare` - Base fare price
- `isActive` - Active status

**Relations:**
- Belongs to origin and destination Parks
- One-to-many with Trips

---

### **Vehicle**
Driver's vehicle information.

**Fields:**
- `plateNumber` - License plate (unique)
- `make`, `model` - Vehicle brand and model
- `year` - Manufacturing year
- `color` - Vehicle color
- `capacity` - Number of seats
- `vehicleType` - BUS, TRICYCLE, TAXI, MINIBUS, SEDAN
- `isVerified` - Verification status
- `isActive` - Active status

**Relations:**
- Belongs to Driver (one-to-one)
- One-to-many with Trips

---

### **Trip**
Individual transport trips/journeys.

**Fields:**
- `routeId` - Route taken
- `driverId` - Driver
- `vehicleId` - Vehicle used
- `passengerId` - Passenger (User)
- `fare` - Fare amount paid
- `status` - PENDING, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED
- `departureTime`, `arrivalTime` - Trip timestamps
- `originLatitude`, `originLongitude` - Pickup location
- `destLatitude`, `destLongitude` - Drop-off location

**Relations:**
- Belongs to Route, Driver, Vehicle, User (passenger)
- Optional relation to Transaction (fare payment)

---

## 📱 Value Added Services (VAS) Models

### **ServiceProvider**
Providers for VAS services.

**Fields:**
- `name` - Provider name (e.g., "MTN", "IKEDC")
- `category` - Service category (AIRTIME, DATA, ELECTRICITY, etc.)
- `code` - Provider code (unique)
- `logo` - Provider logo URL
- `isActive` - Active status

**Categories:**
- `AIRTIME` - Mobile airtime providers (MTN, Airtel, Glo, 9mobile)
- `DATA` - Data bundle providers
- `ELECTRICITY` - Electricity distribution companies (IKEDC, EKEDC, etc.)
- `CABLE_TV` - Cable TV providers (DSTV, GOTV, Startimes, Showmax)
- `EDUCATION` - Education payment providers (JAMB, WAEC)

---

### **VASPurchase**
Records VAS purchases.

**Fields:**
- `serviceProviderId` - Provider used
- `category` - Service category
- `amount` - Purchase amount
- `phoneNumber` - Recipient phone (for airtime/data)
- `meterNumber` - Electricity meter number
- `smartCardNumber` - Cable TV smart card
- `packageName` - Selected package/plan
- `status` - Purchase status
- `providerReference` - Provider's transaction reference
- `metadata` - Additional provider-specific data

**Relations:**
- Belongs to User and ServiceProvider
- Optional relation to Transaction

---

## 🔔 Notification & Settings Models

### **Notification**
User notifications.

**Fields:**
- `type` - Notification type
- `title` - Notification title
- `message` - Notification message
- `isRead` - Read status
- `metadata` - Additional JSON data

**Notification Types:**
- `TRANSACTION` - Transaction notifications
- `WALLET_FUNDED` - Wallet top-up confirmations
- `TRIP_CONFIRMED` - Trip booking confirmations
- `TRIP_COMPLETED` - Trip completion notifications
- `SYSTEM` - System notifications
- `PROMOTIONAL` - Promotional messages

---

### **UserSettings**
User preferences and settings.

**Fields:**
- `language` - Preferred language (en, ha, ig, yo)
- `darkMode` - Dark mode preference
- `biometricLogin` - Enable biometric login
- `smsNotification` - SMS notifications enabled
- `emailNotification` - Email notifications enabled
- `pushNotification` - Push notifications enabled

---

## 🔗 Key Relationships

### **User Hierarchy**
```
User (1) ──┬── (1) Passenger
           ├── (1) Driver ── (1) Vehicle
           ├── (1) Agent
           └── (1) ParkManager
```

### **Transaction Flow**
```
User ── (many) ── Transaction
                  ├── (optional) Trip (fare payment)
                  └── (optional) VASPurchase (VAS purchase)
```

### **Transport Flow**
```
Park ── (many) ── Route ── (many) ── Trip
                                    ├── Driver
                                    ├── Vehicle
                                    └── Passenger (User)
```

### **VAS Flow**
```
ServiceProvider ── (many) ── VASPurchase ── (1) User
                                        └── (optional) Transaction
```

---

## 📊 Database Indexes

The schema includes strategic indexes for performance:

**User & Authentication:**
- `users.email` (unique)
- `users.phoneNumber` (unique)
- `passengers.userId` (indexed)
- `verification_codes.userId, code, type` (composite index)

**Transactions:**
- `transactions.userId` (for user transaction history)
- `transactions.type` (for filtering credits/debits)
- `transactions.status` (for filtering by status)
- `transactions.createdAt` (for date range queries)
- `transactions.reference` (unique, for payment lookups)

**Transport:**
- `routes.origin, destination` (for route searches)
- `trips.passengerId` (for passenger trip history)
- `trips.driverId` (for driver trip history)
- `trips.status` (for filtering active/completed trips)

**VAS:**
- `vas_purchases.userId` (for user purchase history)
- `vas_purchases.category` (for filtering by service type)

---

## 🚀 Next Steps

1. **Run Migration:**
   ```bash
   npx prisma migrate dev --name init_complete_schema
   ```

2. **Generate Prisma Client:**
   ```bash
   npx prisma generate
   ```

3. **Seed Database** (optional):
   - Create seed file to populate ServiceProviders
   - Add sample Routes and Parks
   - Add test data

---

## 📝 Notes

- **Security:** Sensitive data (passwords, PINs, CVV) should be hashed/encrypted
- **Biometric Data:** Should be encrypted before storage
- **Card Data:** Follow PCI-DSS compliance guidelines
- **Decimal Precision:** All monetary values use `Decimal(10, 2)` for accuracy
- **Timestamps:** All models include `createdAt` and `updatedAt` for auditing

---

## 🎯 Schema Coverage

This schema covers all features from the Figma designs:

✅ User authentication & verification  
✅ Wallet balance & transactions  
✅ Bank account & card management  
✅ Transport booking (T-Ride)  
✅ Airtime & Data purchases  
✅ Electricity bill payments  
✅ Cable TV payments  
✅ Education payments (JAMB, WAEC)  
✅ Transaction history  
✅ Notifications  
✅ User settings & preferences  
✅ Beneficiaries for transfers  
✅ Driver & vehicle management  
✅ Park & route management  

---

**Schema Version:** 1.0.0  
**Last Updated:** 2025-01-18

