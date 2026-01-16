import { Test, TestingModule } from '@nestjs/testing';
import { ListingMediaService } from './listing-media.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ListingMediaService', () => {
    let service: ListingMediaService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ListingMediaService,
                { provide: PrismaService, useValue: {} },
            ]
        }).compile();

        service = module.get<ListingMediaService>(ListingMediaService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
