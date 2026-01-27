-- AlterTable
ALTER TABLE "mfa_challenges" ADD COLUMN     "channel" TEXT NOT NULL DEFAULT 'EMAIL',
ADD COLUMN     "phone" TEXT;
