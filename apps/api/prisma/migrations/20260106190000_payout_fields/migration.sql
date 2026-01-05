-- Add payout fields to users for escrow settlement
ALTER TABLE "users"
ADD COLUMN "payoutPixKey" TEXT,
ADD COLUMN "payoutBlockedAt" TIMESTAMP(3),
ADD COLUMN "payoutBlockedReason" TEXT;
