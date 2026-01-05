ALTER TABLE "orders" ADD COLUMN "expiresAt" TIMESTAMP(3);
ALTER TABLE "orders" ADD COLUMN "deliveredAt" TIMESTAMP(3);
ALTER TABLE "orders" ADD COLUMN "completedAt" TIMESTAMP(3);

ALTER TABLE "order_events" ADD COLUMN "userId" TEXT;
ALTER TABLE "order_events" ADD COLUMN "metadata" JSONB;

ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";
CREATE TYPE "OrderStatus" AS ENUM ('CREATED', 'AWAITING_PAYMENT', 'PAID', 'IN_DELIVERY', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'DISPUTED', 'REFUNDED');

ALTER TABLE "orders" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "orders" ALTER COLUMN "status" TYPE "OrderStatus" USING
  CASE
    WHEN "status" = 'PENDING' THEN 'CREATED'::"OrderStatus"
    WHEN "status" = 'DELIVERING' THEN 'IN_DELIVERY'::"OrderStatus"
    WHEN "status" = 'CANCELED' THEN 'CANCELLED'::"OrderStatus"
    ELSE "status"::text::"OrderStatus"
  END;
ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'CREATED';

DROP TYPE "OrderStatus_old";

ALTER TYPE "OrderEventType" RENAME TO "OrderEventType_old";
CREATE TYPE "OrderEventType" AS ENUM ('CREATED', 'AWAITING_PAYMENT', 'PAID', 'IN_DELIVERY', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'REFUNDED', 'DISPUTED', 'NOTE');

ALTER TABLE "order_events" ALTER COLUMN "type" TYPE "OrderEventType" USING
  CASE
    WHEN "type" = 'PAYMENT_PENDING' THEN 'AWAITING_PAYMENT'::"OrderEventType"
    WHEN "type" = 'DELIVERY_STARTED' THEN 'IN_DELIVERY'::"OrderEventType"
    WHEN "type" = 'CANCELED' THEN 'CANCELLED'::"OrderEventType"
    ELSE "type"::text::"OrderEventType"
  END;

DROP TYPE "OrderEventType_old";

CREATE INDEX "orders_expiresAt_idx" ON "orders"("expiresAt");
CREATE INDEX "orders_deliveredAt_idx" ON "orders"("deliveredAt");
CREATE INDEX "order_events_userId_idx" ON "order_events"("userId");

ALTER TABLE "order_events" ADD CONSTRAINT "order_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
