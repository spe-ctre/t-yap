-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "walletBalance" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "transfers" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "description" TEXT,
    "reference" TEXT NOT NULL,
    "status" "TransferStatus" NOT NULL DEFAULT 'PENDING',
    "debitTransactionId" TEXT,
    "creditTransactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "transfers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "transfers_reference_key" ON "transfers"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "transfers_debitTransactionId_key" ON "transfers"("debitTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "transfers_creditTransactionId_key" ON "transfers"("creditTransactionId");

-- CreateIndex
CREATE INDEX "transfers_senderId_idx" ON "transfers"("senderId");

-- CreateIndex
CREATE INDEX "transfers_recipientId_idx" ON "transfers"("recipientId");

-- CreateIndex
CREATE INDEX "transfers_status_idx" ON "transfers"("status");

-- CreateIndex
CREATE INDEX "transfers_createdAt_idx" ON "transfers"("createdAt");

-- CreateIndex
CREATE INDEX "transfers_reference_idx" ON "transfers"("reference");

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
