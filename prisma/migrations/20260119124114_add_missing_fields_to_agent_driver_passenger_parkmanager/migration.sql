/*
  Warnings:

  - A unique constraint covering the columns `[terminalId]` on the table `agents` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "KYCStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "agents" ADD COLUMN     "businessName" TEXT,
ADD COLUMN     "bvn" TEXT,
ADD COLUMN     "commissionRate" DECIMAL(5,2),
ADD COLUMN     "idDocumentUrl" TEXT,
ADD COLUMN     "kycStatus" "KYCStatus" DEFAULT 'PENDING',
ADD COLUMN     "lga" TEXT,
ADD COLUMN     "nin" TEXT,
ADD COLUMN     "residentialAddress" TEXT,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "terminalId" TEXT;

-- AlterTable
ALTER TABLE "drivers" ADD COLUMN     "assignedRouteId" TEXT,
ADD COLUMN     "isAvailableToday" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastCheckInDate" TIMESTAMP(3),
ADD COLUMN     "tier" TEXT DEFAULT 'TIER_1';

-- AlterTable
ALTER TABLE "park_managers" ADD COLUMN     "commissionRate" DECIMAL(5,2);

-- AlterTable
ALTER TABLE "passengers" ADD COLUMN     "nextOfKinName" TEXT,
ADD COLUMN     "nextOfKinPhone" TEXT,
ADD COLUMN     "nextOfKinRelationship" TEXT,
ADD COLUMN     "tier" TEXT DEFAULT 'TIER_1';

-- CreateIndex
CREATE UNIQUE INDEX "agents_terminalId_key" ON "agents"("terminalId");

-- CreateIndex
CREATE INDEX "agents_terminalId_idx" ON "agents"("terminalId");

-- CreateIndex
CREATE INDEX "agents_kycStatus_idx" ON "agents"("kycStatus");

-- CreateIndex
CREATE INDEX "drivers_assignedRouteId_idx" ON "drivers"("assignedRouteId");

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_assignedRouteId_fkey" FOREIGN KEY ("assignedRouteId") REFERENCES "routes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
