import { Controller, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';

import { PartnersService } from './partners.service';

@Controller('partners')
export class PartnersController {
  constructor(private readonly partnersService: PartnersService) {}

  @Post(':slug/click')
  trackClick(@Req() req: Request, @Param('slug') slug: string) {
    return this.partnersService.trackClick(slug, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }
}
