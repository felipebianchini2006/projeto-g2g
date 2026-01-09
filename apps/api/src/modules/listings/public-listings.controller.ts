import { Controller, Get, Param, Query } from '@nestjs/common';

import { ListingsService } from './listings.service';
import { PublicListingQueryDto } from './dto/public-listing-query.dto';

@Controller('public/listings')
export class PublicListingsController {
  constructor(private readonly listingsService: ListingsService) {}

  @Get()
  list(@Query() query: PublicListingQueryDto) {
    return this.listingsService.listPublicListings(query);
  }

  @Get(':id')
  get(@Param('id') listingId: string) {
    return this.listingsService.getPublicListing(listingId);
  }
}
