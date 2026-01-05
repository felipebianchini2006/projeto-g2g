import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminListingsController } from './admin-listings.controller';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { ListingMediaController } from './listing-media.controller';
import { ListingMediaService } from './listing-media.service';
import { ListingsController } from './listings.controller';
import { ListingsService } from './listings.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [
    ListingsController,
    ListingMediaController,
    InventoryController,
    AdminListingsController,
  ],
  providers: [ListingsService, ListingMediaService, InventoryService],
  exports: [ListingsService, InventoryService, ListingMediaService],
})
export class ListingsModule {}
