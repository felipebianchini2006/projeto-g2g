import { Controller, Get, Param } from '@nestjs/common';
import { CouponsService } from './coupons.service';

@Controller('public/coupons')
export class PublicCouponsController {
    constructor(private readonly couponsService: CouponsService) { }

    @Get(':code')
    async validate(@Param('code') code: string) {
        const coupon = await this.couponsService.getValidCoupon(code);
        return {
            code: coupon.code,
            discountBps: coupon.discountBps,
            discountCents: coupon.discountCents,
        };
    }
}
