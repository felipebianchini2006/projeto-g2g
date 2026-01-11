import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';
import { PartnersService } from './partners.service';

@Controller('admin/partners')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminPartnersController {
  constructor(private readonly partnersService: PartnersService) {}

  @Post()
  create(@Body() dto: CreatePartnerDto) {
    return this.partnersService.createPartner(dto);
  }

  @Get()
  list() {
    return this.partnersService.listPartners();
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePartnerDto) {
    return this.partnersService.updatePartner(id, dto);
  }

  @Get(':id/stats')
  stats(@Param('id') id: string) {
    return this.partnersService.getPartnerStats(id);
  }
}
