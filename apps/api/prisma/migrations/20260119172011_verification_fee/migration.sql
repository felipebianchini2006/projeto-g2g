ALTER TABLE "users" ADD COLUMN "verificationFeeOrderId" TEXT;
ALTER TABLE "users" ADD COLUMN "verificationFeePaidAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "users_verificationFeeOrderId_key" ON "users"("verificationFeeOrderId");