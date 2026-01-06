import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, DisputeStatus, OrderEventType, OrderStatus, TicketStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { SettlementService } from '../settlement/settlement.service';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';

@Injectable()
export class DisputesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settlementService: SettlementService,
  ) {}

  async resolveDispute(disputeId: string, adminId: string, dto: ResolveDisputeDto) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        order: true,
        ticket: true,
      },
    });

    if (!dispute || !dispute.order) {
      throw new NotFoundException('Dispute not found.');
    }

    if (![DisputeStatus.OPEN, DisputeStatus.REVIEW].includes(dispute.status)) {
      throw new BadRequestException('Dispute already resolved.');
    }

    if (dto.action === 'partial') {
      throw new BadRequestException('Partial resolution not supported.');
    }

    if (dto.action === 'release') {
      if ([OrderStatus.CANCELLED, OrderStatus.REFUNDED].includes(dispute.order.status)) {
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

    return { status: 'refunded', disputeId };
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

  private buildResolution(action: 'release' | 'refund', reason?: string) {
    return reason ? `${action}:${reason}` : action;
  }
}
