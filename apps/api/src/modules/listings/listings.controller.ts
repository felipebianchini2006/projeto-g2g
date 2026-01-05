import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { UserRole } from '@prisma/client';

import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { JwtPayload } from '../auth/auth.types';
import { CreateListingDto } from './dto/create-listing.dto';
import { ListingQueryDto } from './dto/listing-query.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { ListingsService } from './listings.service';

type AuthenticatedRequest = Request & { user?: JwtPayload };

@Controller('listings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SELLER)
export class ListingsController {
  constructor(private readonly listingsService: ListingsService) {}

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateListingDto) {
    const userId = this.getUserId(req);
    return this.listingsService.createListing(userId, dto);
  }

  @Get()
  list(@Req() req: AuthenticatedRequest, @Query() query: ListingQueryDto) {
    const userId = this.getUserId(req);
    return this.listingsService.listSellerListings(userId, query);
  }

  @Get(':id')
  get(@Req() req: AuthenticatedRequest, @Param('id') listingId: string) {
    const userId = this.getUserId(req);
    return this.listingsService.getSellerListing(userId, listingId);
  }

  @Patch(':id')
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id') listingId: string,
    @Body() dto: UpdateListingDto,
  ) {
    const userId = this.getUserId(req);
    return this.listingsService.updateListing(userId, listingId, dto);
  }

  @Post(':id/submit')
  submit(@Req() req: AuthenticatedRequest, @Param('id') listingId: string) {
    const userId = this.getUserId(req);
    return this.listingsService.submitListing(userId, listingId);
  }

  @Delete(':id')
  remove(@Req() req: AuthenticatedRequest, @Param('id') listingId: string) {
    const userId = this.getUserId(req);
    return this.listingsService.archiveListing(userId, listingId);
  }

  private getUserId(request: AuthenticatedRequest) {
    if (!request.user?.sub) {
      throw new UnauthorizedException('Missing user context.');
    }
    return request.user.sub;
  }
}
