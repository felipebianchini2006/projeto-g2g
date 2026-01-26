-- Add phone fields to users
ALTER TABLE "users" ADD COLUMN "phoneE164" TEXT;
ALTER TABLE "users" ADD COLUMN "phoneVerifiedAt" TIMESTAMP(3);

-- Add payout draft status enum
CREATE TYPE "PayoutDraftStatus" AS ENUM ('PENDING', 'CONFIRMED', 'EXPIRED');

-- Create payout drafts table
CREATE TABLE "payout_drafts" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" "PayoutDraftStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "payout_drafts_pkey" PRIMARY KEY ("id")
);

-- Add indexes
CREATE INDEX "payout_drafts_userId_idx" ON "payout_drafts"("userId");
CREATE INDEX "payout_drafts_status_idx" ON "payout_drafts"("status");
CREATE INDEX "payout_drafts_expiresAt_idx" ON "payout_drafts"("expiresAt");

-- Add foreign key
ALTER TABLE "payout_drafts" ADD CONSTRAINT "payout_drafts_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
