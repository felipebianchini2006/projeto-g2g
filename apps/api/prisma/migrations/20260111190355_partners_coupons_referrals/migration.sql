-- CreateEnum
CREATE TYPE "OrderAttributionSource" AS ENUM ('LINK', 'COUPON', 'NONE');

-- CreateEnum
CREATE TYPE "PartnerCommissionEventType" AS ENUM ('EARNED', 'REVERSED');

-- CreateTable
CREATE TABLE "partners" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "commissionBps" INTEGER NOT NULL DEFAULT 6500,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupons" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "partnerId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "discountBps" INTEGER,
    "discountCents" INTEGER,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "maxUses" INTEGER,
    "usesCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_attributions" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "partnerId" TEXT,
    "couponId" TEXT,
    "source" "OrderAttributionSource" NOT NULL DEFAULT 'NONE',
    "originalTotalCents" INTEGER NOT NULL,
    "discountAppliedCents" INTEGER NOT NULL,
    "platformFeeBaseCents" INTEGER NOT NULL,
    "platformFeeFinalCents" INTEGER NOT NULL,
    "partnerCommissionCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_attributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_clicks" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_clicks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_commission_events" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "type" "PartnerCommissionEventType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_commission_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "partners_slug_key" ON "partners"("slug");

-- CreateIndex
CREATE INDEX "partners_active_idx" ON "partners"("active");

-- CreateIndex
CREATE UNIQUE INDEX "coupons_code_key" ON "coupons"("code");

-- CreateIndex
CREATE INDEX "coupons_partnerId_idx" ON "coupons"("partnerId");

-- CreateIndex
CREATE INDEX "coupons_active_idx" ON "coupons"("active");

-- CreateIndex
CREATE UNIQUE INDEX "order_attributions_orderId_key" ON "order_attributions"("orderId");

-- CreateIndex
CREATE INDEX "order_attributions_partnerId_idx" ON "order_attributions"("partnerId");

-- CreateIndex
CREATE INDEX "order_attributions_couponId_idx" ON "order_attributions"("couponId");

-- CreateIndex
CREATE INDEX "order_attributions_source_idx" ON "order_attributions"("source");

-- CreateIndex
CREATE INDEX "partner_clicks_partnerId_idx" ON "partner_clicks"("partnerId");

-- CreateIndex
CREATE INDEX "partner_clicks_createdAt_idx" ON "partner_clicks"("createdAt");

-- CreateIndex
CREATE INDEX "partner_commission_events_partnerId_idx" ON "partner_commission_events"("partnerId");

-- CreateIndex
CREATE INDEX "partner_commission_events_orderId_idx" ON "partner_commission_events"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "partner_commission_events_partnerId_orderId_type_key" ON "partner_commission_events"("partnerId", "orderId", "type");

-- AddForeignKey
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_attributions" ADD CONSTRAINT "order_attributions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_attributions" ADD CONSTRAINT "order_attributions_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_attributions" ADD CONSTRAINT "order_attributions_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "coupons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_clicks" ADD CONSTRAINT "partner_clicks_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_commission_events" ADD CONSTRAINT "partner_commission_events_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_commission_events" ADD CONSTRAINT "partner_commission_events_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
