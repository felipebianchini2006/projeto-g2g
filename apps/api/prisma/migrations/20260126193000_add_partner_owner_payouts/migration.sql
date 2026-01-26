-- Add partner ownership fields
ALTER TABLE "partners" ADD COLUMN "ownerUserId" TEXT;
ALTER TABLE "partners" ADD COLUMN "ownerEmail" TEXT;

ALTER TABLE "partners" ADD CONSTRAINT "partners_ownerUserId_fkey"
  FOREIGN KEY ("ownerUserId") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "partners_ownerUserId_idx" ON "partners"("ownerUserId");

-- Partner payouts
CREATE TYPE "PartnerPayoutStatus" AS ENUM ('PENDING', 'PAID', 'FAILED');

CREATE TABLE "partner_payouts" (
  "id" TEXT NOT NULL,
  "partnerId" TEXT NOT NULL,
  "requestedByUserId" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "status" "PartnerPayoutStatus" NOT NULL DEFAULT 'PENDING',
  "pixKey" TEXT NOT NULL,
  "pixKeyType" "PixKeyType",
  "requestIp" TEXT,
  "requestUserAgent" TEXT,
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "partner_payouts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "partner_payouts_partnerId_idx" ON "partner_payouts"("partnerId");
CREATE INDEX "partner_payouts_requestedByUserId_idx" ON "partner_payouts"("requestedByUserId");
CREATE INDEX "partner_payouts_status_idx" ON "partner_payouts"("status");

ALTER TABLE "partner_payouts" ADD CONSTRAINT "partner_payouts_partnerId_fkey"
  FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "partner_payouts" ADD CONSTRAINT "partner_payouts_requestedByUserId_fkey"
  FOREIGN KEY ("requestedByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
