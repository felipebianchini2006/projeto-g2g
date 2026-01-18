-- CreateEnum
CREATE TYPE "PayoutScope" AS ENUM ('USER', 'PLATFORM');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "PixKeyType" AS ENUM ('CPF', 'CNPJ', 'EMAIL', 'PHONE', 'EVP');

-- CreateEnum
CREATE TYPE "BeneficiaryType" AS ENUM ('PF', 'PJ');

-- CreateEnum
CREATE TYPE "PayoutSpeed" AS ENUM ('NORMAL', 'INSTANT');

-- CreateTable
CREATE TABLE "payouts" (
    "id" TEXT NOT NULL,
    "scope" "PayoutScope" NOT NULL,
    "status" "PayoutStatus" NOT NULL,
    "userId" TEXT,
    "requestedById" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "pixKey" TEXT NOT NULL,
    "pixKeyType" "PixKeyType",
    "beneficiaryName" TEXT NOT NULL,
    "beneficiaryType" "BeneficiaryType",
    "payoutSpeed" "PayoutSpeed",
    "provider" TEXT NOT NULL DEFAULT 'EFI',
    "providerStatus" TEXT,
    "providerRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payouts_userId_idx" ON "payouts"("userId");

-- CreateIndex
CREATE INDEX "payouts_requestedById_idx" ON "payouts"("requestedById");

-- CreateIndex
CREATE INDEX "payouts_scope_idx" ON "payouts"("scope");

-- CreateIndex
CREATE INDEX "payouts_status_idx" ON "payouts"("status");

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
