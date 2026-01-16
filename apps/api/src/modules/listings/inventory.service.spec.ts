import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from './inventory.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

describe('InventoryService', () => {
    let service: InventoryService;

    const mockPrisma = {
        listingItem: {
            createMany: jest.fn(),
            count: jest.fn(),
            delete: jest.fn(),
            findUnique: jest.fn(),
        },
        listing: {
            update: jest.fn(),
            findUnique: jest.fn()
        }
    };

    const mockRedis = {
        del: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                InventoryService,
                { provide: PrismaService, useValue: mockPrisma },
                { provide: RedisService, useValue: mockRedis },
            ]
        }).compile();

        service = module.get<InventoryService>(InventoryService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
