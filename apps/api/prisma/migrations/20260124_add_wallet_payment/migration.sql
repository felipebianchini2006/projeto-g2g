-- Add wallet payment enums
ALTER TYPE "PaymentProvider" ADD VALUE IF NOT EXISTS 'WALLET';
ALTER TYPE "LedgerEntrySource" ADD VALUE IF NOT EXISTS 'WALLET_PAYMENT';
