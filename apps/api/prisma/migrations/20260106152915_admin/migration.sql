-- AlterTable
ALTER TABLE "users" ADD COLUMN     "blockedAt" TIMESTAMP(3),
ADD COLUMN     "blockedReason" TEXT;

-- CreateTable
CREATE TABLE "platform_settings" (
    "id" TEXT NOT NULL,
    "platformFeeBps" INTEGER NOT NULL DEFAULT 0,
    "orderPaymentTtlSeconds" INTEGER NOT NULL DEFAULT 900,
    "settlementReleaseDelayHours" INTEGER NOT NULL DEFAULT 0,
    "splitEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id")
);
