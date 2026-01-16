-- CreateEnum
CREATE TYPE "RgStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "rg_verifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rgNumber" TEXT NOT NULL,
    "rgPhotoUrl" TEXT NOT NULL,
    "status" "RgStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedByAdminId" TEXT,
    "adminReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rg_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rg_verifications_userId_idx" ON "rg_verifications"("userId");

-- CreateIndex
CREATE INDEX "rg_verifications_status_idx" ON "rg_verifications"("status");

-- CreateIndex
CREATE INDEX "rg_verifications_submittedAt_idx" ON "rg_verifications"("submittedAt");

-- AddForeignKey
ALTER TABLE "rg_verifications" ADD CONSTRAINT "rg_verifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rg_verifications" ADD CONSTRAINT "rg_verifications_reviewedByAdminId_fkey" FOREIGN KEY ("reviewedByAdminId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
