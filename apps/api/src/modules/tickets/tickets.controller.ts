import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { UserRole } from '@prisma/client';

import type { JwtPayload } from '../auth/auth.types';
import { AdminPermission } from '../auth/decorators/admin-permission.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminPermissionsGuard } from '../auth/guards/admin-permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { TicketMessageDto } from './dto/ticket-message.dto';
import { TicketQueryDto } from './dto/ticket-query.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { TicketsService } from './tickets.service';

type AuthenticatedRequest = Request & { user?: JwtPayload };

@Controller('tickets')
@UseGuards(JwtAuthGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) { }

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateTicketDto) {
    const user = this.getUser(req);
    return this.ticketsService.createTicket(user.sub, user.role, dto);
  }

  @Get()
  list(@Req() req: AuthenticatedRequest, @Query() query: TicketQueryDto) {
    const user = this.getUser(req);
    return this.ticketsService.listTickets(user.sub, user.role, query);
  }

  @Get(':id')
  get(@Req() req: AuthenticatedRequest, @Param('id') ticketId: string) {
    const user = this.getUser(req);
    return this.ticketsService.getTicket(ticketId, user.sub, user.role);
  }

  @Post(':id/messages')
  addMessage(
    @Req() req: AuthenticatedRequest,
    @Param('id') ticketId: string,
    @Body() dto: TicketMessageDto,
  ) {
    const user = this.getUser(req);
    return this.ticketsService.addMessage(ticketId, user.sub, user.role, dto);
  }

  @Post(':id/status')
  @UseGuards(RolesGuard, AdminPermissionsGuard)
  @Roles(UserRole.ADMIN, UserRole.AJUDANTE)
  @AdminPermission('admin.disputes')
  updateStatus(
    @Req() req: AuthenticatedRequest,
    @Param('id') ticketId: string,
    @Body() dto: UpdateTicketStatusDto,
  ) {
    const user = this.getUser(req);
    return this.ticketsService.updateStatus(ticketId, user.sub, user.role, dto);
  }

  private getUser(request: AuthenticatedRequest) {
    if (!request.user?.sub) {
      throw new UnauthorizedException('Contexto de usuário ausente.');
    }
    return request.user;
  }
}
