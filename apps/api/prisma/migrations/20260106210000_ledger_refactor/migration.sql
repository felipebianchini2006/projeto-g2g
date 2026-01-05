-- Ledger entries refactor: type/state/source
ALTER TYPE "LedgerEntryType" RENAME TO "LedgerEntryType_old";
ALTER TYPE "LedgerEntryStatus" RENAME TO "LedgerEntryStatus_old";

CREATE TYPE "LedgerEntryType" AS ENUM ('CREDIT', 'DEBIT');
CREATE TYPE "LedgerEntryState" AS ENUM ('HELD', 'AVAILABLE', 'REVERSED');
CREATE TYPE "LedgerEntrySource" AS ENUM ('ORDER_PAYMENT', 'REFUND', 'FEE', 'PAYOUT');

ALTER TABLE "ledger_entries" ADD COLUMN "state" "LedgerEntryState";
ALTER TABLE "ledger_entries" ADD COLUMN "source" "LedgerEntrySource";

UPDATE "ledger_entries"
SET "state" = CASE
  WHEN "type" = 'HELD'::"LedgerEntryType_old" THEN 'HELD'::"LedgerEntryState"
  WHEN "type" = 'AVAILABLE'::"LedgerEntryType_old" THEN 'AVAILABLE'::"LedgerEntryState"
  WHEN "type" = 'RELEASED'::"LedgerEntryType_old" THEN 'HELD'::"LedgerEntryState"
  WHEN "type" = 'REVERSED'::"LedgerEntryType_old" THEN 'REVERSED'::"LedgerEntryState"
  ELSE 'HELD'::"LedgerEntryState"
END,
"source" = CASE
  WHEN "type" IN ('HELD'::"LedgerEntryType_old", 'AVAILABLE'::"LedgerEntryType_old", 'RELEASED'::"LedgerEntryType_old")
    THEN 'ORDER_PAYMENT'::"LedgerEntrySource"
  WHEN "type" = 'REVERSED'::"LedgerEntryType_old" THEN 'REFUND'::"LedgerEntrySource"
  ELSE 'ORDER_PAYMENT'::"LedgerEntrySource"
END;

ALTER TABLE "ledger_entries"
  ALTER COLUMN "type" TYPE "LedgerEntryType"
  USING (
    CASE
      WHEN "type" IN ('HELD'::"LedgerEntryType_old", 'AVAILABLE'::"LedgerEntryType_old")
        THEN 'CREDIT'
      WHEN "type" = 'RELEASED'::"LedgerEntryType_old" THEN 'DEBIT'
      WHEN "type" = 'REVERSED'::"LedgerEntryType_old" THEN 'CREDIT'
      ELSE 'CREDIT'
    END
  )::"LedgerEntryType";

ALTER TABLE "ledger_entries" ALTER COLUMN "state" SET NOT NULL;
ALTER TABLE "ledger_entries" ALTER COLUMN "source" SET NOT NULL;

DROP INDEX IF EXISTS "ledger_entries_status_idx";

ALTER TABLE "ledger_entries" DROP COLUMN "status";

CREATE INDEX "ledger_entries_state_idx" ON "ledger_entries"("state");
CREATE INDEX "ledger_entries_source_idx" ON "ledger_entries"("source");

DROP TYPE "LedgerEntryType_old";
DROP TYPE "LedgerEntryStatus_old";
