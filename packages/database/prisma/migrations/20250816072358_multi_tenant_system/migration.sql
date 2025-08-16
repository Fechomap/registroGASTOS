-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedBy" TEXT,
ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "requestedBy" TEXT,
ADD COLUMN     "status" "CompanyStatus" NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "system_admins" (
    "id" TEXT NOT NULL,
    "telegramId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "username" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_admins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "system_admins_telegramId_key" ON "system_admins"("telegramId");

-- CreateIndex
CREATE UNIQUE INDEX "system_admins_chatId_key" ON "system_admins"("chatId");

-- CreateIndex
CREATE INDEX "companies_status_idx" ON "companies"("status");
