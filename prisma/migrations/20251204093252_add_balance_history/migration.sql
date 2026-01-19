-- CreateTable
CREATE TABLE "balance_history" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userType" "UserType" NOT NULL,
    "balance" DECIMAL(10,2) NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reconciled" BOOLEAN NOT NULL DEFAULT false,
    "discrepancy" DECIMAL(10,2),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "balance_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "balance_history_userId_idx" ON "balance_history"("userId");

-- CreateIndex
CREATE INDEX "balance_history_snapshotDate_idx" ON "balance_history"("snapshotDate");

-- CreateIndex
CREATE INDEX "balance_history_reconciled_idx" ON "balance_history"("reconciled");

-- AddForeignKey
ALTER TABLE "balance_history" ADD CONSTRAINT "balance_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
