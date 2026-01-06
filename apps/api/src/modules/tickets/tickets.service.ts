import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TicketStatus, UserRole } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { TicketMessageDto } from './dto/ticket-message.dto';
import { TicketQueryDto } from './dto/ticket-query.dto';

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

  async listTickets(userId: string, role: UserRole, query: TicketQueryDto) {
    const where =
      role === 'ADMIN'
        ? { status: query.status }
        : {
            status: query.status,
            OR: [
              { openedById: userId },
              { order: { buyerId: userId } },
              { order: { sellerId: userId } },
            ],
          };

    return this.prisma.ticket.findMany({
      where,
      include: {
        order: { select: { id: true, buyerId: true, sellerId: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTicket(ticketId: string, userId: string, role: UserRole) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        order: { select: { id: true, buyerId: true, sellerId: true } },
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found.');
    }

    this.assertAccess(ticket, userId, role);
    return ticket;
  }

  async createTicket(userId: string, role: UserRole, dto: CreateTicketDto) {
    let orderId = dto.orderId?.trim();
    if (orderId === '') {
      orderId = undefined;
    }
    if (orderId) {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        select: { id: true, buyerId: true, sellerId: true },
      });
      if (!order) {
        throw new NotFoundException('Order not found.');
      }
      if (role !== 'ADMIN' && order.buyerId !== userId && order.sellerId !== userId) {
        throw new ForbiddenException('Ticket access denied.');
      }

      const existing = await this.prisma.ticket.findUnique({ where: { orderId } });
      if (existing) {
        throw new BadRequestException('Ticket already exists for this order.');
      }
    }

    return this.prisma.ticket.create({
      data: {
        orderId,
        openedById: userId,
        status: TicketStatus.OPEN,
        subject: dto.subject.trim(),
        messages: {
          create: [
            {
              senderId: userId,
              message: dto.message.trim(),
            },
          ],
        },
      },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        order: { select: { id: true, buyerId: true, sellerId: true } },
      },
    });
  }

  async addMessage(ticketId: string, userId: string, role: UserRole, dto: TicketMessageDto) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { order: { select: { id: true, buyerId: true, sellerId: true } } },
    });
    if (!ticket) {
      throw new NotFoundException('Ticket not found.');
    }

    this.assertAccess(ticket, userId, role);

    return this.prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        senderId: userId,
        message: dto.message.trim(),
      },
    });
  }

  private assertAccess(
    ticket: { openedById: string; order?: { buyerId: string; sellerId: string | null } | null },
    userId: string,
    role: UserRole,
  ) {
    if (role === 'ADMIN') {
      return;
    }
    if (ticket.openedById === userId) {
      return;
    }
    if (ticket.order?.buyerId === userId || ticket.order?.sellerId === userId) {
      return;
    }
    throw new ForbiddenException('Ticket access denied.');
  }
}
