-- CreateTable
CREATE TABLE "seller_reviews" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "orderId" TEXT,
    "orderItemId" TEXT,
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "verifiedPurchase" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seller_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "seller_reviews_orderId_key" ON "seller_reviews"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "seller_reviews_orderItemId_key" ON "seller_reviews"("orderItemId");

-- CreateIndex
CREATE INDEX "seller_reviews_sellerId_idx" ON "seller_reviews"("sellerId");

-- CreateIndex
CREATE INDEX "seller_reviews_buyerId_idx" ON "seller_reviews"("buyerId");

-- CreateIndex
CREATE INDEX "seller_reviews_orderId_idx" ON "seller_reviews"("orderId");

-- AddForeignKey
ALTER TABLE "seller_reviews" ADD CONSTRAINT "seller_reviews_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_reviews" ADD CONSTRAINT "seller_reviews_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_reviews" ADD CONSTRAINT "seller_reviews_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_reviews" ADD CONSTRAINT "seller_reviews_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "order_item_snapshots"("id") ON DELETE SET NULL ON UPDATE CASCADE;
