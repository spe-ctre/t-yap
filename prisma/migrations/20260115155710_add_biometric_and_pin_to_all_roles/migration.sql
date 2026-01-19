-- Step 1: Add biometric and transaction PIN fields to all role models
ALTER TABLE "agents" ADD COLUMN "biometricData" TEXT;
ALTER TABLE "agents" ADD COLUMN "transactionPin" TEXT;

ALTER TABLE "drivers" ADD COLUMN "biometricData" TEXT;
ALTER TABLE "drivers" ADD COLUMN "transactionPin" TEXT;

ALTER TABLE "park_managers" ADD COLUMN "biometricData" TEXT;
ALTER TABLE "park_managers" ADD COLUMN "transactionPin" TEXT;

-- Step 2: Update existing data to use UserRole enum
-- Update balance_history table
ALTER TABLE "balance_history" 
  ALTER COLUMN "userType" TYPE "UserRole" 
  USING "userType"::text::"UserRole";

-- Update transactions table
ALTER TABLE "transactions" 
  ALTER COLUMN "userType" TYPE "UserRole" 
  USING "userType"::text::"UserRole";

-- Step 3: Drop the old UserType enum
DROP TYPE "UserType";
