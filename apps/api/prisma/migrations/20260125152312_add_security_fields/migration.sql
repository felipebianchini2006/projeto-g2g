-- Add manual adjustment source
ALTER TYPE "LedgerEntrySource" ADD VALUE IF NOT EXISTS 'MANUAL_ADJUSTMENT';

-- Add request metadata to payouts
ALTER TABLE "payouts" ADD COLUMN IF NOT EXISTS "requestIp" TEXT;
ALTER TABLE "payouts" ADD COLUMN IF NOT EXISTS "requestUserAgent" TEXT;

-- Add temporary block until to users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "blockedUntil" TIMESTAMP(3);
