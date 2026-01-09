import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AuditAction,
  DisputeStatus,
  NotificationType,
  OrderEventType,
  OrderStatus,
  TicketStatus,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { EmailQueueService } from '../email/email.service';
import { DisputeQueryDto } from './dto/dispute-query.dto';
import { SettlementService } from '../settlement/settlement.service';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';

@Injectable()
export class DisputesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settlementService: SettlementService,
    private readonly emailQueue: EmailQueueService,
  ) {}

  async listDisputes(query: DisputeQueryDto) {
    return this.prisma.dispute.findMany({
      where: { status: query.status },
      include: {
        order: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            buyerId: true,
            sellerId: true,
          },
        },
        ticket: { select: { id: true, subject: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDispute(disputeId: string) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        order: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            buyerId: true,
            sellerId: true,
          },
        },
        ticket: { select: { id: true, subject: true, status: true } },
      },
    });

    if (!dispute) {
      throw new NotFoundException('Dispute not found.');
    }

    return dispute;
  }

  async resolveDispute(disputeId: string, adminId: string, dto: ResolveDisputeDto) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        order: { include: { buyer: true, seller: true } },
        ticket: true,
      },
    });

    if (!dispute || !dispute.order) {
      throw new NotFoundException('Dispute not found.');
    }

    const actionableStatuses = new Set<DisputeStatus>([
      DisputeStatus.OPEN,
      DisputeStatus.REVIEW,
    ]);
    if (!actionableStatuses.has(dispute.status)) {
      throw new BadRequestException('Dispute already resolved.');
    }

    if (dto.action === 'partial') {
      if (!dto.amountCents || dto.amountCents <= 0) {
        throw new BadRequestException('Partial resolution requires amountCents.');
      }
      const blockedOrderStatuses = new Set<OrderStatus>([
        OrderStatus.CANCELLED,
        OrderStatus.REFUNDED,
      ]);
      if (blockedOrderStatuses.has(dispute.order.status)) {
        throw new BadRequestException('Order cannot be partially refunded.');
      }

      await this.prisma.$transaction(async (tx) => {
        if (dispute.order.status !== OrderStatus.COMPLETED) {
          await tx.order.update({
            where: { id: dispute.orderId },
            data: { status: OrderStatus.COMPLETED },
          });

          await tx.orderEvent.create({
            data: {
              orderId: dispute.orderId,
              userId: adminId,
              type: OrderEventType.NOTE,
              metadata: {
                from: dispute.order.status,
                to: OrderStatus.COMPLETED,
                action: 'dispute_partial',
                amountCents: dto.amountCents,
                reason: dto.reason,
              },
            },
          });
        }
      });

      await this.settlementService.refundOrderPartial(
        dispute.orderId,
        dto.amountCents,
        adminId,
        dto.reason,
      );

      await this.settlementService.releaseOrder(dispute.orderId, adminId, dto.reason, {
        ignoreDispute: true,
      });

      await this.finalizeDispute(disputeId, {
        status: DisputeStatus.RESOLVED,
        resolution: this.buildResolution('partial', dto.reason, dto.amountCents),
        resolvedAt: new Date(),
      }, adminId);

      await this.notifyDecision(dispute, 'partial', dto.reason, dto.amountCents);
      return { status: 'partial_refund', disputeId };
    }

    if (dto.action === 'release') {
      const blockedOrderStatuses = new Set<OrderStatus>([
        OrderStatus.CANCELLED,
        OrderStatus.REFUNDED,
      ]);
      if (blockedOrderStatuses.has(dispute.order.status)) {
        throw new BadRequestException('Order cannot be released.');
      }
      await this.prisma.$transaction(async (tx) => {
        if (dispute.order.status !== OrderStatus.COMPLETED) {
          await tx.order.update({
            where: { id: dispute.orderId },
            data: { status: OrderStatus.COMPLETED },
          });

          await tx.orderEvent.create({
            data: {
              orderId: dispute.orderId,
              userId: adminId,
              type: OrderEventType.NOTE,
              metadata: {
                from: dispute.order.status,
                to: OrderStatus.COMPLETED,
                action: 'dispute_release',
                reason: dto.reason,
              },
            },
          });
        }
      });

      await this.settlementService.releaseOrder(dispute.orderId, adminId, dto.reason, {
        ignoreDispute: true,
      });

      await this.finalizeDispute(disputeId, {
        status: DisputeStatus.REJECTED,
        resolution: this.buildResolution('release', dto.reason),
        resolvedAt: new Date(),
      }, adminId);

      await this.notifyDecision(dispute, 'release', dto.reason);
      return { status: 'released', disputeId };
    }

    if (dispute.order.status === OrderStatus.REFUNDED) {
      throw new BadRequestException('Order already refunded.');
    }

    await this.settlementService.refundOrder(dispute.orderId, adminId, dto.reason);

    await this.finalizeDispute(disputeId, {
      status: DisputeStatus.RESOLVED,
      resolution: this.buildResolution('refund', dto.reason),
      resolvedAt: new Date(),
    }, adminId);

    await this.notifyDecision(dispute, 'refund', dto.reason);
    return { status: 'refunded', disputeId };
  }

  private async notifyDecision(
    dispute: { order: { id: string; buyerId: string; sellerId: string | null; buyer?: { email: string } | null; seller?: { email: string } | null } },
    action: 'release' | 'refund' | 'partial',
    reason?: string,
    amountCents?: number,
  ) {
    const orderId = dispute.order.id;
    const title =
      action === 'release'
        ? 'Disputa encerrada'
        : action === 'refund'
          ? 'Disputa resolvida'
          : 'Disputa resolvida parcialmente';
    const body =
      action === 'release'
        ? `Pedido ${orderId} liberado apos disputa.`
        : action === 'refund'
          ? `Pedido ${orderId} reembolsado apos disputa.`
          : `Pedido ${orderId} reembolsado parcialmente apos disputa.`;

    const emailOutboxIds: string[] = [];
    const shouldEmailBuyer = action === 'release' || action === 'partial';
    const shouldEmailSeller = action === 'refund' || action === 'partial';
    const amountSuffix =
      action === 'partial' && amountCents ? ` Valor: ${amountCents} centavos.` : '';

    if (dispute.order.buyerId) {
      await this.prisma.notification.create({
        data: {
          userId: dispute.order.buyerId,
          type: NotificationType.ORDER,
          title,
          body: `${body}${amountSuffix}`,
        },
      });
      if (shouldEmailBuyer && dispute.order.buyer?.email) {
        const outbox = await this.prisma.emailOutbox.create({
          data: {
            to: dispute.order.buyer.email,
            subject: title,
            body: reason ? `${body}${amountSuffix} Motivo: ${reason}` : `${body}${amountSuffix}`,
          },
        });
        emailOutboxIds.push(outbox.id);
      }
    }

    if (dispute.order.sellerId) {
      await this.prisma.notification.create({
        data: {
          userId: dispute.order.sellerId,
          type: NotificationType.ORDER,
          title,
          body: `${body}${amountSuffix}`,
        },
      });
      if (shouldEmailSeller && dispute.order.seller?.email) {
        const outbox = await this.prisma.emailOutbox.create({
          data: {
            to: dispute.order.seller.email,
            subject: title,
            body: reason ? `${body}${amountSuffix} Motivo: ${reason}` : `${body}${amountSuffix}`,
          },
        });
        emailOutboxIds.push(outbox.id);
      }
    }

    await Promise.all(emailOutboxIds.map((id) => this.emailQueue.enqueueEmail(id)));
  }

  private async finalizeDispute(
    disputeId: string,
    update: { status: DisputeStatus; resolution: string; resolvedAt: Date },
    adminId: string,
  ) {
    await this.prisma.$transaction(async (tx) => {
      const dispute = await tx.dispute.update({
        where: { id: disputeId },
        data: update,
      });

      if (dispute.ticketId) {
        await tx.ticket.update({
          where: { id: dispute.ticketId },
          data: { status: TicketStatus.RESOLVED },
        });
      }

      await tx.auditLog.create({
        data: {
          adminId,
          action: AuditAction.UPDATE,
          entityType: 'Dispute',
          entityId: disputeId,
          payload: {
            status: update.status,
            resolution: update.resolution,
            orderId: dispute.orderId,
            ticketId: dispute.ticketId,
          },
        },
      });
    });
  }

  private buildResolution(action: 'release' | 'refund' | 'partial', reason?: string, amountCents?: number) {
    const amount = amountCents ? `:${amountCents}` : '';
    const base = `${action}${amount}`;
    return reason ? `${base}:${reason}` : base;
  }
}
