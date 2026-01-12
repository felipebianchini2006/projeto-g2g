import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Request } from 'express';

import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { JwtPayload } from '../auth/auth.types';
import { AdminCreateListingDto } from './dto/admin-create-listing.dto';
import { AdminDecisionDto } from './dto/admin-decision.dto';
import { AdminHomeFlagsDto } from './dto/admin-home-flags.dto';
import { ListingQueryDto } from './dto/listing-query.dto';
import { ListingsService } from './listings.service';

type AuthenticatedRequest = Request & { user?: JwtPayload };

@Controller('admin/listings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminListingsController {
  constructor(private readonly listingsService: ListingsService) {}

  @Get()
  list(@Query() query: ListingQueryDto) {
    return this.listingsService.listAdminListings(query);
  }

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: AdminCreateListingDto) {
    const adminId = this.getUserId(req);
    const meta = this.getRequestMeta(req);
    return this.listingsService.createListingAsAdmin(adminId, dto, meta);
  }

  @Post(':id/approve')
  approve(@Req() req: AuthenticatedRequest, @Param('id') listingId: string) {
    const adminId = this.getUserId(req);
    const meta = this.getRequestMeta(req);
    return this.listingsService.approveListing(listingId, adminId, meta);
  }

  @Post(':id/reject')
  reject(
    @Req() req: AuthenticatedRequest,
    @Param('id') listingId: string,
    @Body() dto: AdminDecisionDto,
  ) {
    const adminId = this.getUserId(req);
    const meta = this.getRequestMeta(req);
    return this.listingsService.rejectListing(listingId, adminId, dto.reason, meta);
  }

  @Post(':id/suspend')
  suspend(
    @Req() req: AuthenticatedRequest,
    @Param('id') listingId: string,
    @Body() dto: AdminDecisionDto,
  ) {
    const adminId = this.getUserId(req);
    const meta = this.getRequestMeta(req);
    return this.listingsService.suspendListing(listingId, adminId, dto.reason, meta);
  }

  @Patch(':id/home')
  updateHomeFlags(
    @Req() req: AuthenticatedRequest,
    @Param('id') listingId: string,
    @Body() dto: AdminHomeFlagsDto,
  ) {
    const adminId = this.getUserId(req);
    const meta = this.getRequestMeta(req);
    return this.listingsService.updateListingHomeFlags(listingId, adminId, dto, meta);
  }

  private getUserId(request: AuthenticatedRequest) {
    if (!request.user?.sub) {
      throw new UnauthorizedException('Missing user context.');
    }
    return request.user.sub;
  }

  private getRequestMeta(request: Request) {
    return {
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    };
  }
}
