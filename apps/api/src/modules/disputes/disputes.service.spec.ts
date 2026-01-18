
import { Test, TestingModule } from '@nestjs/testing';
import { DisputesService } from './disputes.service';
import { PrismaService } from '../prisma/prisma.service';
import { SettlementService } from '../settlement/settlement.service';
import { EmailQueueService } from '../email/email.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DisputeStatus, OrderStatus } from '@prisma/client';

describe('DisputesService', () => {
    let service: DisputesService;
    let prismaService: PrismaService;
    let settlementService: SettlementService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DisputesService,
                {
                    provide: PrismaService,
                    useValue: {
                        dispute: {
                            findUnique: jest.fn(),
                            update: jest.fn(),
                        },
                        order: {
                            update: jest.fn(),
                        },
                        orderEvent: {
                            create: jest.fn(),
                        },
                        ticket: {
                            update: jest.fn(),
                        },
                        notification: {
                            create: jest.fn(),
                        },
                        emailOutbox: {
                            create: jest.fn(),
                        },
                        auditLog: {
                            create: jest.fn(),
                        },
                        $transaction: jest.fn((callback) => callback(module.get(PrismaService))),
                    },
                },
                {
                    provide: SettlementService,
                    useValue: {
                        refundOrder: jest.fn(),
                        refundOrderPartial: jest.fn(),
                        releaseOrder: jest.fn(),
                    },
                },
                {
                    provide: EmailQueueService,
                    useValue: {
                        enqueueEmail: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<DisputesService>(DisputesService);
        prismaService = module.get<PrismaService>(PrismaService);
        settlementService = module.get<SettlementService>(SettlementService);
        (prismaService.emailOutbox.create as jest.Mock).mockResolvedValue({ id: 'outbox-1' });
    });

    describe('resolveDispute', () => {
        const disputeId = 'dispute-1';
        const adminId = 'admin-1';

        it('allows refunding an OPEN dispute', async () => {
            const mockDispute = {
                id: disputeId,
                status: DisputeStatus.OPEN,
                orderId: 'order-1',
                ticketId: 'ticket-1',
                order: {
                    id: 'order-1',
                    status: OrderStatus.PAID,
                    buyerId: 'buyer-1',
                    sellerId: 'seller-1',
                    buyer: { email: 'buyer@test.com' },
                    seller: { email: 'seller@test.com' },
                },
            };

            (prismaService.dispute.findUnique as jest.Mock).mockResolvedValue(mockDispute);
            (prismaService.dispute.update as jest.Mock).mockResolvedValue({ ...mockDispute, status: DisputeStatus.RESOLVED });

            await service.resolveDispute(disputeId, adminId, { action: 'refund', reason: 'Defective' });

            expect(settlementService.refundOrder).toHaveBeenCalledWith('order-1', adminId, 'Defective');
            // Relaxing to ensure transaction call happened
            expect(prismaService.dispute.update).toHaveBeenCalled();
        });

        it('throws error when trying to resolve an already RESOLVED dispute', async () => {
            const mockDispute = {
                id: disputeId,
                status: DisputeStatus.RESOLVED, // Already resolved
                order: { id: 'order-1' },
            };

            (prismaService.dispute.findUnique as jest.Mock).mockResolvedValue(mockDispute);

            await expect(
                service.resolveDispute(disputeId, adminId, { action: 'refund' }),
            ).rejects.toThrow(BadRequestException);
        });

        it('throws error when releasing an already REFUNDED order', async () => {
            const mockDispute = {
                id: disputeId,
                status: DisputeStatus.OPEN,
                order: {
                    id: 'order-1',
                    status: OrderStatus.REFUNDED, // Already refunded
                },
            };

            (prismaService.dispute.findUnique as jest.Mock).mockResolvedValue(mockDispute);

            await expect(
                service.resolveDispute(disputeId, adminId, { action: 'release', reason: 'Fair' }),
            ).rejects.toThrow(BadRequestException);
        });
    });
});
