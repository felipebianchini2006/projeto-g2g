import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/modules/prisma/prisma.service';
import { resetDatabase } from './utils/reset-db';
import { createTestApp } from './utils/create-test-app';

const { applyTestEnv } = require('./test-env.cjs');

describe('Reports / Denuncias (e2e)', () => {
    let app: INestApplication<App>;
    let prisma: PrismaService;
    let jwtService: JwtService;
    let userToken: string;
    let adminToken: string;
    let listingId: string;
    let userId: string;

    beforeAll(async () => {
        applyTestEnv();

        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = await createTestApp(moduleFixture);
        prisma = moduleFixture.get(PrismaService);
        jwtService = moduleFixture.get(JwtService);

        await resetDatabase(prisma);

        // Create seller
        const seller = await prisma.user.create({
            data: {
                email: `seller-${randomUUID()}@test.com`,
                passwordHash: 'hash',
                role: 'SELLER',
            },
        });

        // Create category + listing
        const category = await prisma.category.create({
            data: {
                name: `Category ${randomUUID()}`,
                slug: `category-${randomUUID()}`,
                description: 'Test category',
            },
        });

        const listing = await prisma.listing.create({
            data: {
                sellerId: seller.id,
                categoryId: category.id,
                title: 'Test Listing for Report',
                priceCents: 1000,
                currency: 'BRL',
                deliveryType: 'AUTO',
                status: 'PUBLISHED',
            },
        });
        listingId = listing.id;

        // Create user (reporter)
        const user = await prisma.user.create({
            data: {
                email: `user-${randomUUID()}@test.com`,
                passwordHash: 'hash',
                role: 'USER',
            },
        });
        userId = user.id;
        userToken = await jwtService.signAsync({ sub: user.id, role: user.role });

        // Create admin
        const admin = await prisma.user.create({
            data: {
                email: `admin-${randomUUID()}@test.com`,
                passwordHash: 'hash',
                role: 'ADMIN',
            },
        });
        adminToken = await jwtService.signAsync({ sub: admin.id, role: admin.role });
    });

    afterAll(async () => {
        await app.close();
    });

    describe('User reports listing', () => {
        let reportId: string;

        it('POST /listings/:listingId/report - creates a report', async () => {
            const response = await request(app.getHttpServer())
                .post(`/listings/${listingId}/report`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    reason: 'SCAM',
                    message: 'This listing seems fraudulent.',
                })
                .expect(201);

            expect(response.body.id).toBeDefined();
            expect(response.body.listingId).toBe(listingId);
            expect(response.body.reporterId).toBe(userId);
            expect(response.body.reason).toBe('SCAM');
            expect(response.body.status).toBe('OPEN');

            reportId = response.body.id;
        });

        it('POST /listings/:listingId/report - prevents duplicate pending report', async () => {
            await request(app.getHttpServer())
                .post(`/listings/${listingId}/report`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    reason: 'OTHER',
                    message: 'Duplicate report.',
                })
                .expect(400);
        });

        it('GET /admin/reports/listings - admin lists reports', async () => {
            const response = await request(app.getHttpServer())
                .get('/admin/reports/listings')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.some((r: { id: string }) => r.id === reportId)).toBe(true);
        });

        it('GET /admin/reports/listings/:id - admin gets report details', async () => {
            const response = await request(app.getHttpServer())
                .get(`/admin/reports/listings/${reportId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body.id).toBe(reportId);
            expect(response.body.listing.title).toBe('Test Listing for Report');
        });

        it('PATCH /admin/reports/listings/:id - admin updates report status', async () => {
            const response = await request(app.getHttpServer())
                .patch(`/admin/reports/listings/${reportId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    status: 'RESOLVED',
                    adminNote: 'Issue verified and addressed.',
                })
                .expect(200);

            expect(response.body.status).toBe('RESOLVED');
            expect(response.body.adminNote).toBe('Issue verified and addressed.');
            expect(response.body.resolvedAt).toBeDefined();
        });

        it('GET /admin/reports/listings - user cannot access admin endpoint', async () => {
            await request(app.getHttpServer())
                .get('/admin/reports/listings')
                .set('Authorization', `Bearer ${userToken}`)
                .expect(403);
        });
    });
});
