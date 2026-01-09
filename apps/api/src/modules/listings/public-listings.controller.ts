import { Controller, Get, Param } from '@nestjs/common';

import { ListingsService } from './listings.service';

@Controller('public/listings')
export class PublicListingsController {
  constructor(private readonly listingsService: ListingsService) {}

  @Get()
  list() {
    return this.listingsService.listPublicListings();
  }

  @Get(':id')
  get(@Param('id') listingId: string) {
    return this.listingsService.getPublicListing(listingId);
  }
}
