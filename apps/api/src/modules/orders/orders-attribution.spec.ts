/* eslint-disable @typescript-eslint/unbound-method */
import { OrdersService } from './orders.service';
import { DeliveryType, ListingStatus, OrderAttributionSource, OrderStatus } from '@prisma/client';

describe('OrdersService (attribution)', () => {
  it('uses coupon attribution over referral slug', async () => {
    const prismaMock = {
      listing: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'listing-1',
          sellerId: 'seller-1',
          status: ListingStatus.PUBLISHED,
          priceCents: 10000,
          currency: 'BRL',
          deliveryType: DeliveryType.MANUAL,
          title: 'Item',
        }),
      },
      inventoryItem: {
        count: jest.fn(),
      },
      order: {
        create: jest.fn().mockResolvedValue({
          id: 'order-1',
          items: [
            {
              id: 'item-1',
              listingId: 'listing-1',
              deliveryType: DeliveryType.MANUAL,
            },
          ],
          attribution: {
            source: OrderAttributionSource.COUPON,
          },
        }),
        update: jest.fn().mockResolvedValue({
          id: 'order-1',
          status: OrderStatus.AWAITING_PAYMENT,
        }),
      },
      orderEvent: {
        create: jest.fn(),
      },
      $transaction: jest.fn(async (callback: (client: typeof prismaMock) => Promise<unknown>) =>
        callback(prismaMock),
      ),
    };

    const couponsService = {
      getValidCoupon: jest.fn().mockResolvedValue({
        id: 'coupon-1',
        discountBps: 500,
        discountCents: null,
        maxUses: 10,
        partnerId: 'partner-1',
        partner: { id: 'partner-1', commissionBps: 6500, active: true },
      }),
      consumeCouponUsage: jest.fn(),
    };

    const partnersService = {
      findActiveBySlug: jest.fn(),
    };

    const service = new OrdersService(
      prismaMock as any,
      { reserveInventoryItem: jest.fn() } as any,
      { scheduleOrderExpiration: jest.fn(), scheduleAutoComplete: jest.fn() } as any,
      { get: jest.fn() } as any,
      { scheduleRelease: jest.fn(), cancelRelease: jest.fn() } as any,
      { error: jest.fn(), log: jest.fn(), warn: jest.fn() } as any,
      { enqueueEmail: jest.fn() } as any,
      { getSettings: jest.fn().mockResolvedValue({ orderPaymentTtlSeconds: 900, platformFeeBps: 1000 }) } as any,
      couponsService as any,
      partnersService as any,
    );

    await service.createOrder(
      'buyer-1',
      { listingId: 'listing-1', quantity: 1, couponCode: 'SAVE', referralSlug: 'partner-x' },
      { ip: '127.0.0.1' },
    );

    expect(couponsService.getValidCoupon).toHaveBeenCalledWith('SAVE', expect.anything());
    expect(partnersService.findActiveBySlug).not.toHaveBeenCalled();

    const createCall = prismaMock.order.create.mock.calls[0][0];
    expect(createCall.data.attribution.create.source).toBe(OrderAttributionSource.COUPON);
    expect(createCall.data.attribution.create.partnerId).toBe('partner-1');
    expect(createCall.data.attribution.create.couponId).toBe('coupon-1');
  });
});
