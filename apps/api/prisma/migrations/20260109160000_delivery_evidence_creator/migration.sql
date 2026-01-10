-- Add createdByUserId to delivery_evidence for audit trails
ALTER TABLE "delivery_evidence" ADD COLUMN "createdByUserId" TEXT;

CREATE INDEX "delivery_evidence_createdByUserId_idx" ON "delivery_evidence"("createdByUserId");

ALTER TABLE "delivery_evidence"
ADD CONSTRAINT "delivery_evidence_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
