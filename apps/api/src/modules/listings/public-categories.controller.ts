import { Controller, Get } from '@nestjs/common';

import { ListingsService } from './listings.service';

@Controller('public/categories')
export class PublicCategoriesController {
  constructor(private readonly listingsService: ListingsService) {}

  @Get()
  list() {
    return this.listingsService.listPublicCategories();
  }
}
