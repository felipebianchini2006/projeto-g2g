import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TicketStatus, UserRole } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { TicketsService } from './tickets.service';

describe('TicketsService', () => {
  let service: TicketsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const prismaMock = {
      order: {
        findUnique: jest.fn(),
      },
      ticket: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      ticketMessage: {
        create: jest.fn(),
      },
    } as unknown as PrismaService;

    const moduleRef = await Test.createTestingModule({
      providers: [TicketsService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();

    service = moduleRef.get(TicketsService);
    prisma = moduleRef.get(PrismaService);
  });

  it('creates ticket for an order when user is allowed', async () => {
    (prisma.order.findUnique as jest.Mock).mockResolvedValue({
      id: 'order-1',
      buyerId: 'user-1',
      sellerId: 'seller-1',
    });
    (prisma.ticket.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.ticket.create as jest.Mock).mockResolvedValue({
      id: 'ticket-1',
      status: TicketStatus.OPEN,
    });

    await service.createTicket('user-1', UserRole.USER, {
      orderId: 'order-1',
      subject: '  Need help  ',
      message: '  Something went wrong  ',
    });

    expect(prisma.ticket.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          orderId: 'order-1',
          openedById: 'user-1',
          status: TicketStatus.OPEN,
          subject: 'Need help',
          messages: {
            create: [
              {
                senderId: 'user-1',
                message: 'Something went wrong',
              },
            ],
          },
        }),
      }),
    );
  });

  it('rejects duplicate ticket for the same order', async () => {
    (prisma.order.findUnique as jest.Mock).mockResolvedValue({
      id: 'order-1',
      buyerId: 'user-1',
      sellerId: 'seller-1',
    });
    (prisma.ticket.findUnique as jest.Mock).mockResolvedValue({
      id: 'ticket-existing',
      orderId: 'order-1',
    });

    await expect(
      service.createTicket('user-1', UserRole.USER, {
        orderId: 'order-1',
        subject: 'Need help',
        message: 'Something went wrong',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects user that is not part of the order', async () => {
    (prisma.order.findUnique as jest.Mock).mockResolvedValue({
      id: 'order-1',
      buyerId: 'buyer-2',
      sellerId: 'seller-2',
    });
    (prisma.ticket.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      service.createTicket('user-1', UserRole.USER, {
        orderId: 'order-1',
        subject: 'Need help',
        message: 'Something went wrong',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('adds a message to the ticket', async () => {
    (prisma.ticket.findUnique as jest.Mock).mockResolvedValue({
      id: 'ticket-1',
      openedById: 'user-1',
      order: { buyerId: 'user-1', sellerId: 'seller-1' },
    });
    (prisma.ticketMessage.create as jest.Mock).mockResolvedValue({ id: 'message-1' });

    await service.addMessage('ticket-1', 'user-1', UserRole.USER, { message: '  Ola  ' });

    expect(prisma.ticketMessage.create).toHaveBeenCalledWith({
      data: {
        ticketId: 'ticket-1',
        senderId: 'user-1',
        message: 'Ola',
      },
    });
  });
});
