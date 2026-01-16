import { Test, TestingModule } from '@nestjs/testing';
import { PartnersService } from './partners.service';
import { PrismaService } from '../prisma/prisma.service';

describe('PartnersService', () => {
    let service: PartnersService;
    let prisma: any;

    const mockPrisma = {
        partner: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
            findFirst: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },
        coupon: {
            findMany: jest.fn(),
            create: jest.fn(),
            delete: jest.fn(),
        }
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PartnersService,
                { provide: PrismaService, useValue: mockPrisma },
            ],
        }).compile();

        service = module.get<PartnersService>(PartnersService);
        prisma = module.get(PrismaService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('deletePartner', () => {
        it('soft deletes a partner', async () => {
            mockPrisma.partner.findUnique.mockResolvedValue({ id: '1' });
            mockPrisma.partner.update.mockResolvedValue({ id: '1', active: false });

            await service.deletePartner('1');

            expect(mockPrisma.partner.update).toHaveBeenCalledWith({ where: { id: '1' }, data: { active: false } });
        });
    });
});
