import { BadRequestException } from '@nestjs/common';
import { CouponsService } from './coupons.service';

describe('CouponsService', () => {
  it('throws when max uses is reached during consume', async () => {
    const prismaMock = {
      coupon: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    const service = new CouponsService(prismaMock as any);

    await expect(service.consumeCouponUsage({ id: 'coupon-1', maxUses: 1 })).rejects.toThrow(
      BadRequestException,
    );
    expect(prismaMock.coupon.updateMany).toHaveBeenCalled();
  });

  it('soft deletes a coupon', async () => {
    const prismaMock = {
      coupon: {
        findUnique: jest.fn().mockResolvedValue({ id: 'c1' }),
        update: jest.fn().mockResolvedValue({ id: 'c1', active: false }),
      }
    };
    const service = new CouponsService(prismaMock as any);

    await service.deleteCoupon('c1');

    expect(prismaMock.coupon.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: { active: false },
    });
  });
});
