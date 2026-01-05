ALTER TABLE "listings" ADD COLUMN "deliverySlaHours" INTEGER NOT NULL DEFAULT 24;
ALTER TABLE "listings" ADD COLUMN "refundPolicy" TEXT NOT NULL DEFAULT 'Refund policy pending.';

ALTER TYPE "ListingStatus" RENAME TO "ListingStatus_old";
CREATE TYPE "ListingStatus" AS ENUM ('DRAFT', 'PENDING', 'PUBLISHED', 'SUSPENDED');

ALTER TABLE "listings" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "listings" ALTER COLUMN "status" TYPE "ListingStatus" USING
  CASE
    WHEN "status" = 'ACTIVE' THEN 'PUBLISHED'::"ListingStatus"
    WHEN "status" = 'PAUSED' THEN 'SUSPENDED'::"ListingStatus"
    WHEN "status" = 'SOLD_OUT' THEN 'SUSPENDED'::"ListingStatus"
    WHEN "status" = 'ARCHIVED' THEN 'SUSPENDED'::"ListingStatus"
    ELSE "status"::text::"ListingStatus"
  END;
ALTER TABLE "listings" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

DROP TYPE "ListingStatus_old";
