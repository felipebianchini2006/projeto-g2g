import { Controller, Get, Query } from '@nestjs/common';

import { CatalogService } from './catalog.service';

@Controller('public/catalog')
export class PublicCatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('groups')
  listGroups(@Query('categoryId') categoryId?: string) {
    return this.catalogService.listGroups(categoryId);
  }

  @Get('sections')
  listSections(@Query('groupId') groupId?: string) {
    return this.catalogService.listSections(groupId);
  }

  @Get('sales-models')
  listSalesModels() {
    return this.catalogService.listSalesModels();
  }

  @Get('origins')
  listOrigins() {
    return this.catalogService.listOrigins();
  }

  @Get('recovery-options')
  listRecoveryOptions() {
    return this.catalogService.listRecoveryOptions();
  }
}
