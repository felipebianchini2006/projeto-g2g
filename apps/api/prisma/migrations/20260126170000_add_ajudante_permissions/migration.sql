-- Add AJUDANTE role to user roles
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'AJUDANTE';

-- Add admin permissions array
ALTER TABLE "users" ADD COLUMN "adminPermissions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
