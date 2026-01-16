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

describe('Listing Approval / Confirmar Anuncio (e2e)', () => {
    let app: INestApplication<App>;
    let prisma: PrismaService;
    let jwtService: JwtService;
    let sellerToken: string;
    let adminToken: string;
    let categoryId: string;
    let listingId: string;

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
        sellerToken = await jwtService.signAsync({ sub: seller.id, role: seller.role });

        // Create admin
        const admin = await prisma.user.create({
            data: {
                email: `admin-${randomUUID()}@test.com`,
                passwordHash: 'hash',
                role: 'ADMIN',
            },
        });
        adminToken = await jwtService.signAsync({ sub: admin.id, role: admin.role });

        // Create category
        const category = await prisma.category.create({
            data: {
                name: `Category ${randomUUID()}`,
                slug: `category-${randomUUID()}`,
                description: 'Test category',
            },
        });
        categoryId = category.id;
    });

    afterAll(async () => {
        await app.close();
    });

    describe('Seller creates and submits listing', () => {
        it('POST /listings - creates listing in DRAFT status', async () => {
            const response = await request(app.getHttpServer())
                .post('/listings')
                .set('Authorization', `Bearer ${sellerToken}`)
                .send({
                    categoryId,
                    title: 'Test Listing for Approval',
                    description: 'This is a test listing',
                    priceCents: 5000,
                    currency: 'BRL',
                    deliveryType: 'AUTO',
                    deliverySlaHours: 24,
                    refundPolicy: 'No refunds.',
                })
                .expect(201);

            expect(response.body.id).toBeDefined();
            expect(response.body.status).toBe('DRAFT');
            listingId = response.body.id;
        });

        it('POST /listings/:id/submit - submits listing for approval', async () => {
            const response = await request(app.getHttpServer())
                .post(`/listings/${listingId}/submit`)
                .set('Authorization', `Bearer ${sellerToken}`)
                .expect(201);

            expect(response.body.status).toBe('PENDING');
        });
    });

    describe('Admin reviews pending listings', () => {
        it('GET /admin/listings?status=PENDING - lists pending listings', async () => {
            const response = await request(app.getHttpServer())
                .get('/admin/listings?status=PENDING')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.some((l: { id: string }) => l.id === listingId)).toBe(true);
        });

        it('POST /admin/listings/:id/approve - approves listing', async () => {
            const response = await request(app.getHttpServer())
                .post(`/admin/listings/${listingId}/approve`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(201);

            expect(response.body.status).toBe('PUBLISHED');
        });

        it('GET /listings/:id - listing is now published', async () => {
            const response = await request(app.getHttpServer())
                .get(`/listings/${listingId}`)
                .set('Authorization', `Bearer ${sellerToken}`)
                .expect(200);

            expect(response.body.status).toBe('PUBLISHED');
        });
    });

    describe('Admin rejects listing', () => {
        let rejectListingId: string;

        beforeAll(async () => {
            // Create another listing
            const response = await request(app.getHttpServer())
                .post('/listings')
                .set('Authorization', `Bearer ${sellerToken}`)
                .send({
                    categoryId,
                    title: 'Listing to Reject',
                    description: 'This listing will be rejected',
                    priceCents: 3000,
                    currency: 'BRL',
                    deliveryType: 'AUTO',
                    deliverySlaHours: 24,
                    refundPolicy: 'No refunds.',
                });

            rejectListingId = response.body.id;

            // Submit for approval
            await request(app.getHttpServer())
                .post(`/listings/${rejectListingId}/submit`)
                .set('Authorization', `Bearer ${sellerToken}`);
        });

        it('POST /admin/listings/:id/reject - rejects listing with reason', async () => {
            const response = await request(app.getHttpServer())
                .post(`/admin/listings/${rejectListingId}/reject`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ reason: 'Description too short.' })
                .expect(201);

            expect(response.body.status).toBe('DRAFT');
            expect(response.body.rejectionReason).toBe('Description too short.');
        });

        it('seller can see rejection reason', async () => {
            const response = await request(app.getHttpServer())
                .get(`/listings/${rejectListingId}`)
                .set('Authorization', `Bearer ${sellerToken}`)
                .expect(200);

            expect(response.body.status).toBe('DRAFT');
            expect(response.body.rejectionReason).toBe('Description too short.');
        });
    });

    describe('RBAC - permissions', () => {
        it('seller cannot access admin listings endpoint', async () => {
            await request(app.getHttpServer())
                .get('/admin/listings')
                .set('Authorization', `Bearer ${sellerToken}`)
                .expect(403);
        });

        it('seller cannot approve listings', async () => {
            await request(app.getHttpServer())
                .post(`/admin/listings/${listingId}/approve`)
                .set('Authorization', `Bearer ${sellerToken}`)
                .expect(403);
        });
    });
});
