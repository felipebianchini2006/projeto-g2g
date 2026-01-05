import {
  Body,
  Controller,
  Delete,
  Param,
  Post,
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
import { InventoryAddDto } from './dto/inventory-add.dto';
import { InventoryImportDto } from './dto/inventory-import.dto';
import { InventoryReserveDto } from './dto/inventory-reserve.dto';
import { InventoryService } from './inventory.service';

type AuthenticatedRequest = Request & { user?: JwtPayload };

@Controller('listings/:listingId/inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('items')
  @Roles(UserRole.SELLER)
  add(
    @Req() req: AuthenticatedRequest,
    @Param('listingId') listingId: string,
    @Body() dto: InventoryAddDto,
  ) {
    const userId = this.getUserId(req);
    return this.inventoryService.addInventoryItems(userId, listingId, dto.codes);
  }

  @Post('import')
  @Roles(UserRole.SELLER)
  import(
    @Req() req: AuthenticatedRequest,
    @Param('listingId') listingId: string,
    @Body() dto: InventoryImportDto,
  ) {
    const userId = this.getUserId(req);
    return this.inventoryService.importInventoryItems(userId, listingId, dto.payload);
  }

  @Delete('items/:itemId')
  @Roles(UserRole.SELLER)
  remove(
    @Req() req: AuthenticatedRequest,
    @Param('listingId') listingId: string,
    @Param('itemId') itemId: string,
  ) {
    const userId = this.getUserId(req);
    return this.inventoryService.removeInventoryItem(userId, listingId, itemId);
  }

  @Post('reserve')
  @Roles(UserRole.ADMIN)
  reserve(
    @Param('listingId') listingId: string,
    @Body() dto: InventoryReserveDto,
  ) {
    return this.inventoryService.reserveInventoryItem(listingId, dto.orderItemId);
  }

  private getUserId(request: AuthenticatedRequest) {
    if (!request.user?.sub) {
      throw new UnauthorizedException('Missing user context.');
    }
    return request.user.sub;
  }
}
