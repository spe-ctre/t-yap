-- CreateEnum
CREATE TYPE "RecurringFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- AlterEnum
ALTER TYPE "TransferStatus" ADD VALUE 'SCHEDULED';

-- AlterTable
ALTER TABLE "transfers" ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "executionCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isRecurring" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isScheduled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastExecutionDate" TIMESTAMP(3),
ADD COLUMN     "maxExecutions" INTEGER,
ADD COLUMN     "nextExecutionDate" TIMESTAMP(3),
ADD COLUMN     "parentTransferId" TEXT,
ADD COLUMN     "recurringEndDate" TIMESTAMP(3),
ADD COLUMN     "recurringFrequency" "RecurringFrequency",
ADD COLUMN     "recurringPinHash" TEXT,
ADD COLUMN     "scheduledFor" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "transfers_isScheduled_scheduledFor_idx" ON "transfers"("isScheduled", "scheduledFor");

-- CreateIndex
CREATE INDEX "transfers_isRecurring_nextExecutionDate_idx" ON "transfers"("isRecurring", "nextExecutionDate");
