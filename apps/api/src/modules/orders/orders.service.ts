import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeliveryEvidenceType,
  DeliveryType,
  ListingStatus,
  OrderEventType,
  OrderStatus,
  NotificationType,
  Prisma,
  UserRole,
} from '@prisma/client';

import type { AuthRequestMeta } from '../auth/auth.types';
import { InventoryService } from '../listings/inventory.service';
import { AppLogger } from '../logger/logger.service';
import { EmailQueueService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { SettlementService } from '../settlement/settlement.service';
import { SettingsService } from '../settings/settings.service';
import { OrdersQueueService } from './orders.queue.service';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { ConfirmReceiptDto } from './dto/confirm-receipt.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { OpenDisputeDto } from './dto/open-dispute.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import {
  CreateDeliveryEvidenceDto,
  DeliveryEvidenceInputType,
} from './dto/create-delivery-evidence.dto';
import { MarkDeliveredDto } from './dto/mark-delivered.dto';

type OrderMeta = AuthRequestMeta & {
  source?: 'user' | 'system';
  reason?: string;
};

type PaymentConfirmationResult = {
  order: {
    id: string;
    status: OrderStatus;
    items: { id: string; listingId: string | null; deliveryType: DeliveryType }[];
  };
  applied: boolean;
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
    private readonly ordersQueue: OrdersQueueService,
    private readonly configService: ConfigService,
    private readonly settlementService: SettlementService,
    private readonly logger: AppLogger,
    private readonly emailQueue: EmailQueueService,
    private readonly settingsService: SettingsService,
  ) {}

  async createOrder(buyerId: string, dto: CreateOrderDto, meta: AuthRequestMeta) {
    const quantity = dto.quantity ?? 1;
    const settings = await this.settingsService.getSettings();
    const ttlSeconds = settings.orderPaymentTtlSeconds;
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    const result = await this.prisma.$transaction(async (tx) => {
      const listing = await tx.listing.findUnique({
        where: { id: dto.listingId },
      });

      if (!listing || listing.status !== ListingStatus.PUBLISHED) {
        throw new BadRequestException('Listing unavailable.');
      }

      if (listing.deliveryType === DeliveryType.AUTO) {
        const available = await tx.inventoryItem.count({
          where: {
            listingId: listing.id,
            status: 'AVAILABLE',
            orderItemId: null,
          },
        });
        if (available < quantity) {
          throw new BadRequestException('Insufficient inventory.');
        }
      }

      const order = await tx.order.create({
        data: {
          buyerId,
          sellerId: listing.sellerId,
          status: OrderStatus.CREATED,
          totalAmountCents: listing.priceCents * quantity,
          currency: listing.currency,
          expiresAt,
          items: {
            create: [
              {
                listingId: listing.id,
                sellerId: listing.sellerId,
                title: listing.title,
                unitPriceCents: listing.priceCents,
                quantity,
                deliveryType: listing.deliveryType,
                currency: listing.currency,
              },
            ],
          },
        },
        include: { items: true },
      });

      await this.createEvent(
        tx,
        order.id,
        buyerId,
        OrderEventType.CREATED,
        this.buildMetadata(meta, null, OrderStatus.CREATED),
      );

      const updated = await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.AWAITING_PAYMENT },
      });

      await this.createEvent(
        tx,
        order.id,
        buyerId,
        OrderEventType.AWAITING_PAYMENT,
        this.buildMetadata(meta, OrderStatus.CREATED, OrderStatus.AWAITING_PAYMENT),
      );

      return {
        ...updated,
        items: order.items,
      };
    });

    await this.ordersQueue.scheduleOrderExpiration(result.id, expiresAt);
    return result;
  }

  async listOrders(userId: string, role: string, query: OrderQueryDto) {
    const scope = query.scope === 'seller' ? 'seller' : 'buyer';
    const where =
      scope === 'seller'
        ? { sellerId: userId, status: query.status }
        : { buyerId: userId, status: query.status };

    if (scope === 'seller' && role !== 'SELLER' && role !== 'ADMIN') {
      throw new ForbiddenException('Seller scope not allowed.');
    }

    return this.prisma.order.findMany({
      where,
      include: {
        buyer: { select: { id: true, email: true } },
        seller: { select: { id: true, email: true } },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: query.skip,
      take: query.take ?? 20,
    });
  }

  async getOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        buyer: { select: { id: true, email: true } },
        seller: { select: { id: true, email: true } },
        items: {
          include: {
            inventoryItems: true,
            deliveryEvidence: true,
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        events: { orderBy: { createdAt: 'asc' } },
        dispute: true,
        ticket: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    return order;
  }

  async cancelOrder(orderId: string, buyerId: string, dto: CancelOrderDto, meta: AuthRequestMeta) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) {
        throw new NotFoundException('Order not found.');
      }
      if (order.buyerId !== buyerId) {
        throw new ForbiddenException('Only the buyer can cancel.');
      }
      if (
        !this.isAllowedStatus(order.status, [OrderStatus.CREATED, OrderStatus.AWAITING_PAYMENT])
      ) {
        throw new BadRequestException('Order cannot be cancelled in the current state.');
      }

      const updated = await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.CANCELLED },
      });

      await this.createEvent(
        tx,
        order.id,
        buyerId,
        OrderEventType.CANCELLED,
        this.buildMetadata({ ...meta, reason: dto.reason }, order.status, OrderStatus.CANCELLED),
      );

      return updated;
    });
  }

  async confirmReceipt(
    orderId: string,
    buyerId: string,
    dto: ConfirmReceiptDto,
    meta: AuthRequestMeta,
  ) {
    const updated = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) {
        throw new NotFoundException('Order not found.');
      }
      if (order.buyerId !== buyerId) {
        throw new ForbiddenException('Only the buyer can confirm receipt.');
      }
      if (order.status !== OrderStatus.DELIVERED) {
        throw new BadRequestException('Order is not delivered yet.');
      }

      const updated = await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.COMPLETED, completedAt: new Date() },
      });

      await this.createEvent(
        tx,
        order.id,
        buyerId,
        OrderEventType.COMPLETED,
        this.buildMetadata({ ...meta, reason: dto.note }, order.status, OrderStatus.COMPLETED),
      );

      return updated;
    });

    await this.scheduleSettlementRelease(updated.id);
    return updated;
  }

  async openDispute(orderId: string, buyerId: string, dto: OpenDisputeDto, meta: AuthRequestMeta) {
    const result = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { dispute: true },
      });
      if (!order) {
        throw new NotFoundException('Order not found.');
      }
      if (order.buyerId !== buyerId) {
        throw new ForbiddenException('Only the buyer can open disputes.');
      }
      if (!this.isAllowedStatus(order.status, [OrderStatus.DELIVERED, OrderStatus.COMPLETED])) {
        throw new BadRequestException('Order cannot be disputed in the current state.');
      }
      if (order.dispute) {
        throw new BadRequestException('Dispute already exists for this order.');
      }

      const existingTicket = await tx.ticket.findUnique({
        where: { orderId: order.id },
      });

      const ticket =
        existingTicket ??
        (await tx.ticket.create({
          data: {
            orderId: order.id,
            openedById: buyerId,
            status: 'OPEN',
            subject: `Disputa do pedido ${order.id}`,
            messages: {
              create: [
                {
                  senderId: buyerId,
                  message: dto.reason,
                },
              ],
            },
          },
        }));

      if (existingTicket) {
        await tx.ticket.update({
          where: { id: ticket.id },
          data: { status: 'OPEN' },
        });

        await tx.ticketMessage.create({
          data: {
            ticketId: ticket.id,
            senderId: buyerId,
            message: dto.reason,
          },
        });
      }

      await tx.dispute.create({
        data: {
          ticketId: ticket.id,
          orderId: order.id,
          status: 'OPEN',
          reason: dto.reason,
        },
      });

      const updated = await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.DISPUTED },
      });

      await this.createEvent(
        tx,
        order.id,
        buyerId,
        OrderEventType.DISPUTED,
        this.buildMetadata({ ...meta, reason: dto.reason }, order.status, OrderStatus.DISPUTED),
      );

      return updated;
    });

    await this.settlementService.cancelRelease(orderId);

    const orderInfo = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { buyer: true, seller: true },
    });

    if (orderInfo?.buyerId) {
      await this.prisma.notification.create({
        data: {
          userId: orderInfo.buyerId,
          type: NotificationType.ORDER,
          title: 'Disputa aberta',
          body: `Disputa aberta no pedido ${orderInfo.id}.`,
        },
      });
    }

    if (orderInfo?.sellerId) {
      await this.prisma.notification.create({
        data: {
          userId: orderInfo.sellerId,
          type: NotificationType.ORDER,
          title: 'Disputa aberta',
          body: `Disputa aberta no pedido ${orderInfo.id}.`,
        },
      });
    }

    const emailOutboxIds: string[] = [];
    if (orderInfo?.buyer?.email) {
      const outbox = await this.prisma.emailOutbox.create({
        data: {
          to: orderInfo.buyer.email,
          subject: 'Disputa aberta',
          body: `Sua disputa para o pedido ${orderInfo.id} foi registrada.`,
        },
      });
      emailOutboxIds.push(outbox.id);
    }
    if (orderInfo?.seller?.email) {
      const outbox = await this.prisma.emailOutbox.create({
        data: {
          to: orderInfo.seller.email,
          subject: 'Disputa aberta',
          body: `Uma disputa foi aberta para o pedido ${orderInfo.id}.`,
        },
      });
      emailOutboxIds.push(outbox.id);
    }

    await Promise.all(emailOutboxIds.map((id) => this.emailQueue.enqueueEmail(id)));
    return result;
  }

  async addDeliveryEvidence(
    orderId: string,
    actorId: string,
    role: UserRole,
    dto: CreateDeliveryEvidenceDto,
    meta: AuthRequestMeta,
  ) {
    const evidenceType = this.mapEvidenceType(dto.type);

    const evidence = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });
      if (!order) {
        throw new NotFoundException('Order not found.');
      }
      if (!this.isAllowedStatus(order.status, [OrderStatus.IN_DELIVERY, OrderStatus.DELIVERED])) {
        throw new BadRequestException('Order cannot accept evidence in the current state.');
      }

      const manualItems = order.items.filter(
        (item) => item.deliveryType === DeliveryType.MANUAL,
      );
      if (manualItems.length === 0) {
        throw new BadRequestException('Order has no manual items.');
      }

      const allowedItems =
        role === UserRole.ADMIN
          ? manualItems
          : manualItems.filter((item) => item.sellerId === actorId);

      if (allowedItems.length === 0) {
        throw new ForbiddenException('Only the listing seller can add evidence.');
      }

      const records = [];
      for (const item of allowedItems) {
        records.push(
          await tx.deliveryEvidence.create({
            data: {
              orderItemId: item.id,
              type: evidenceType,
              content: dto.content,
              createdByUserId: actorId,
            },
          }),
        );
      }

      await this.createEvent(
        tx,
        order.id,
        actorId,
        OrderEventType.NOTE,
        this.buildNoteMetadata(meta, {
          action: 'delivery_evidence',
          evidenceType,
          orderItemIds: allowedItems.map((item) => item.id),
        }),
      );

      return records;
    });

    return { orderId, evidence };
  }

  async markOrderDelivered(
    orderId: string,
    actorId: string,
    role: UserRole,
    dto: MarkDeliveredDto,
    meta: AuthRequestMeta,
  ) {
    const emailOutboxIds: string[] = [];
    const eventMeta: OrderMeta = { ...meta, reason: dto.note };

    const updated = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true, buyer: true, seller: true },
      });
      if (!order) {
        throw new NotFoundException('Order not found.');
      }
      if (order.status !== OrderStatus.IN_DELIVERY) {
        throw new BadRequestException('Order is not in delivery.');
      }

      const manualItems = order.items.filter(
        (item) => item.deliveryType === DeliveryType.MANUAL,
      );
      if (manualItems.length === 0) {
        throw new BadRequestException('Order has no manual items.');
      }

      if (role !== UserRole.ADMIN) {
        const hasOwnership = manualItems.some((item) => item.sellerId === actorId);
        if (!hasOwnership) {
          throw new ForbiddenException('Only the listing seller can mark delivered.');
        }
      }

      const updated = await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.DELIVERED, deliveredAt: new Date() },
      });

      await this.createEvent(
        tx,
        updated.id,
        actorId,
        OrderEventType.DELIVERED,
        this.buildMetadata(eventMeta, OrderStatus.IN_DELIVERY, OrderStatus.DELIVERED),
      );

      if (order.buyerId) {
        await tx.notification.create({
          data: {
            userId: order.buyerId,
            type: NotificationType.ORDER,
            title: 'Pedido entregue',
            body: `Pedido ${order.id} entregue.`,
          },
        });
      }

      if (order.sellerId) {
        await tx.notification.create({
          data: {
            userId: order.sellerId,
            type: NotificationType.ORDER,
            title: 'Entrega concluida',
            body: `Pedido ${order.id} entregue ao comprador.`,
          },
        });
      }

      if (order.buyer?.email) {
        const outbox = await tx.emailOutbox.create({
          data: {
            to: order.buyer.email,
            subject: 'Pedido entregue',
            body: `Seu pedido ${order.id} foi entregue.`,
          },
        });
        emailOutboxIds.push(outbox.id);
      }

      return updated;
    });

    await Promise.all(emailOutboxIds.map((id) => this.emailQueue.enqueueEmail(id)));
    await this.ordersQueue.scheduleAutoComplete(updated.id, this.getAutoCompleteDelayMs());
    return updated;
  }

  async markPaid(orderId: string, actorId?: string, meta?: OrderMeta) {
    const result = await this.applyPaymentConfirmation(orderId, actorId, meta);
    if (result.applied) {
      await this.handlePaymentSideEffects(result.order, actorId, meta);
    }
    return result.order;
  }

  async applyPaymentConfirmation(
    orderId: string,
    actorId?: string | null,
    meta?: OrderMeta,
    tx?: Prisma.TransactionClient,
  ): Promise<PaymentConfirmationResult> {
    if (!tx) {
      return this.prisma.$transaction((innerTx) =>
        this.applyPaymentConfirmation(orderId, actorId, meta, innerTx),
      );
    }

    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    if (order.status === OrderStatus.PAID || order.status === OrderStatus.IN_DELIVERY) {
      return { order, applied: false };
    }

    if (!this.isAllowedStatus(order.status, [OrderStatus.CREATED, OrderStatus.AWAITING_PAYMENT])) {
      throw new BadRequestException('Order cannot be marked as paid.');
    }

    await tx.order.update({
      where: { id: order.id },
      data: { status: OrderStatus.PAID },
    });

    await this.createEvent(
      tx,
      order.id,
      actorId ?? undefined,
      OrderEventType.PAID,
      this.buildMetadata(meta, order.status, OrderStatus.PAID),
    );

    const inDelivery = await tx.order.update({
      where: { id: order.id },
      data: { status: OrderStatus.IN_DELIVERY },
    });

    await this.createEvent(
      tx,
      order.id,
      actorId ?? undefined,
      OrderEventType.IN_DELIVERY,
      this.buildMetadata(meta, OrderStatus.PAID, OrderStatus.IN_DELIVERY),
    );

    return {
      order: { ...inDelivery, items: order.items },
      applied: true,
    };
  }

  async handlePaymentSideEffects(
    order: {
      id: string;
      items: { id: string; listingId: string | null; deliveryType: DeliveryType }[];
    },
    actorId?: string | null,
    meta?: OrderMeta,
  ) {
    await this.reserveInventoryForOrder(order);
    await this.handleAutoDelivery(order, actorId ?? undefined, meta);
  }

  async handleOrderExpiration(orderId: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) {
        return null;
      }
      if (!order.expiresAt) {
        return order;
      }
      if (
        !this.isAllowedStatus(order.status, [OrderStatus.CREATED, OrderStatus.AWAITING_PAYMENT])
      ) {
        return order;
      }
      if (order.expiresAt && order.expiresAt.getTime() > Date.now()) {
        return order;
      }

      const updated = await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.CANCELLED },
      });

      await this.createEvent(
        tx,
        order.id,
        null,
        OrderEventType.CANCELLED,
        this.buildMetadata(
          { source: 'system', reason: 'expired' },
          order.status,
          OrderStatus.CANCELLED,
        ),
      );

      return updated;
    });
  }

  async handleAutoComplete(orderId: string) {
    const updated = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { dispute: true },
      });
      if (!order) {
        return null;
      }
      if (order.status !== OrderStatus.DELIVERED || order.dispute) {
        return order;
      }

      const updated = await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.COMPLETED, completedAt: new Date() },
      });

      await this.createEvent(
        tx,
        order.id,
        null,
        OrderEventType.COMPLETED,
        this.buildMetadata(
          { source: 'system', reason: 'auto-complete' },
          order.status,
          OrderStatus.COMPLETED,
        ),
      );

      return updated;
    });

    if (updated?.status === OrderStatus.COMPLETED) {
      await this.scheduleSettlementRelease(updated.id);
    }
    return updated;
  }

  private async reserveInventoryForOrder(order: {
    id: string;
    items: { id: string; listingId: string | null; deliveryType: DeliveryType }[];
  }) {
    const autoItems = order.items.filter(
      (item) => item.deliveryType === DeliveryType.AUTO && item.listingId,
    );

    for (const item of autoItems) {
      await this.inventoryService.reserveInventoryItem(item.listingId!, item.id);
    }
  }

  private async handleAutoDelivery(
    order: { id: string; items: { deliveryType: DeliveryType }[] },
    actorId?: string,
    meta?: OrderMeta,
  ) {
    const allAuto = order.items.every((item) => item.deliveryType === DeliveryType.AUTO);
    if (!allAuto) {
      return;
    }

    const delayMs = this.getAutoCompleteDelayMs();

    const emailOutboxIds: string[] = [];
    await this.prisma.$transaction(async (tx) => {
      const current = await tx.order.findUnique({
        where: { id: order.id },
        include: { buyer: true, seller: true },
      });
      if (!current || current.status !== OrderStatus.IN_DELIVERY) {
        return;
      }

      const updated = await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.DELIVERED, deliveredAt: new Date() },
      });

      await this.createEvent(
        tx,
        updated.id,
        actorId,
        OrderEventType.DELIVERED,
        this.buildMetadata(meta, OrderStatus.IN_DELIVERY, OrderStatus.DELIVERED),
      );

      if (current.buyerId) {
        await tx.notification.create({
          data: {
            userId: current.buyerId,
            type: NotificationType.ORDER,
            title: 'Pedido entregue',
            body: `Pedido ${current.id} entregue.`,
          },
        });
      }

      if (current.sellerId) {
        await tx.notification.create({
          data: {
            userId: current.sellerId,
            type: NotificationType.ORDER,
            title: 'Entrega concluida',
            body: `Pedido ${current.id} entregue ao comprador.`,
          },
        });
      }

      if (current.buyer?.email) {
        const outbox = await tx.emailOutbox.create({
          data: {
            to: current.buyer.email,
            subject: 'Pedido entregue',
            body: `Seu pedido ${current.id} foi entregue.`,
          },
        });
        emailOutboxIds.push(outbox.id);
      }
    });

    await Promise.all(emailOutboxIds.map((id) => this.emailQueue.enqueueEmail(id)));

    await this.ordersQueue.scheduleAutoComplete(order.id, delayMs);
  }

  private buildMetadata(
    meta: OrderMeta | AuthRequestMeta | null | undefined,
    from: OrderStatus | null,
    to: OrderStatus,
  ): Prisma.InputJsonValue {
    const metadata: Record<string, Prisma.InputJsonValue> = { to };
    if (!meta) {
      return metadata;
    }
    if (from) {
      metadata['from'] = from;
    }
    if ('reason' in meta && meta.reason) {
      metadata['reason'] = meta.reason;
    }
    metadata['source'] = 'source' in meta && meta.source ? meta.source : 'user';
    if (meta.ip) {
      metadata['ip'] = meta.ip;
    }
    if (meta.userAgent) {
      metadata['userAgent'] = meta.userAgent;
    }
    return metadata;
  }

  private buildNoteMetadata(
    meta: OrderMeta | AuthRequestMeta | null | undefined,
    payload: Record<string, Prisma.InputJsonValue>,
  ): Prisma.InputJsonValue {
    const metadata: Record<string, Prisma.InputJsonValue> = { ...payload };
    if (!meta) {
      return metadata;
    }
    if ('reason' in meta && meta.reason) {
      metadata['reason'] = meta.reason;
    }
    metadata['source'] = 'source' in meta && meta.source ? meta.source : 'user';
    if (meta.ip) {
      metadata['ip'] = meta.ip;
    }
    if (meta.userAgent) {
      metadata['userAgent'] = meta.userAgent;
    }
    return metadata;
  }

  private async createEvent(
    tx: Prisma.TransactionClient,
    orderId: string,
    userId: string | undefined | null,
    type: OrderEventType,
    metadata: Prisma.InputJsonValue,
  ) {
    await tx.orderEvent.create({
      data: {
        orderId,
        userId: userId ?? null,
        type,
        metadata,
      },
    });
  }

  private isAllowedStatus(status: OrderStatus, allowed: OrderStatus[]) {
    return allowed.includes(status);
  }

  private async scheduleSettlementRelease(orderId: string) {
    try {
      await this.settlementService.scheduleRelease(orderId);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to schedule settlement release';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(message, stack, `OrdersService:Settlement:${orderId}`);
    }
  }

  private getAutoCompleteDelayMs() {
    const autoCompleteHours = this.configService.get<number>('ORDER_AUTO_COMPLETE_HOURS') ?? 72;
    return autoCompleteHours * 60 * 60 * 1000;
  }

  private mapEvidenceType(type: DeliveryEvidenceInputType): DeliveryEvidenceType {
    if (type === DeliveryEvidenceInputType.URL) {
      return DeliveryEvidenceType.LINK;
    }
    return DeliveryEvidenceType.TEXT;
  }
}
