ALTER TABLE "listings"
ADD COLUMN "featuredAt" TIMESTAMP(3),
ADD COLUMN "mustHaveAt" TIMESTAMP(3);

CREATE INDEX "listings_featuredAt_idx" ON "listings"("featuredAt");
CREATE INDEX "listings_mustHaveAt_idx" ON "listings"("mustHaveAt");
