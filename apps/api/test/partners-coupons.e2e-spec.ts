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

describe('Partners and Coupons Delete (e2e)', () => {
    let app: INestApplication<App>;
    let prisma: PrismaService;
    let jwtService: JwtService;
    let adminToken: string;
    let userToken: string;
    let partnerId: string;
    let couponId: string;

    beforeAll(async () => {
        applyTestEnv();

        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = await createTestApp(moduleFixture);
        prisma = moduleFixture.get(PrismaService);
        jwtService = moduleFixture.get(JwtService);

        await resetDatabase(prisma);

        // Create admin
        const admin = await prisma.user.create({
            data: {
                email: `admin-${randomUUID()}@test.com`,
                passwordHash: 'hash',
                role: 'ADMIN',
            },
        });
        adminToken = await jwtService.signAsync({ sub: admin.id, role: admin.role });

        // Create user
        const user = await prisma.user.create({
            data: {
                email: `user-${randomUUID()}@test.com`,
                passwordHash: 'hash',
                role: 'USER',
            },
        });
        userToken = await jwtService.signAsync({ sub: user.id, role: user.role });
    });

    afterAll(async () => {
        await app.close();
    });

    describe('Partners CRUD', () => {
        it('POST /admin/partners - creates a partner', async () => {
            const response = await request(app.getHttpServer())
                .post('/admin/partners')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    name: 'Test Partner',
                    slug: `test-partner-${randomUUID()}`,
                    commissionBps: 500,
                })
                .expect(201);

            expect(response.body.id).toBeDefined();
            expect(response.body.name).toBe('Test Partner');
            partnerId = response.body.id;
        });

        it('GET /admin/partners - lists partners', async () => {
            const response = await request(app.getHttpServer())
                .get('/admin/partners')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.some((p: { id: string }) => p.id === partnerId)).toBe(true);
        });

        it('DELETE /admin/partners/:id - deletes partner', async () => {
            await request(app.getHttpServer())
                .delete(`/admin/partners/${partnerId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);
        });

        it('GET /admin/partners - partner is removed from list', async () => {
            const response = await request(app.getHttpServer())
                .get('/admin/partners')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body.some((p: { id: string }) => p.id === partnerId)).toBe(false);
        });

        it('DELETE - user cannot delete partners', async () => {
            // Create another partner first
            const createRes = await request(app.getHttpServer())
                .post('/admin/partners')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    name: 'Another Partner',
                    slug: `another-partner-${randomUUID()}`,
                    commissionBps: 300,
                });

            await request(app.getHttpServer())
                .delete(`/admin/partners/${createRes.body.id}`)
                .set('Authorization', `Bearer ${userToken}`)
                .expect(403);
        });
    });

    describe('Coupons CRUD', () => {
        it('POST /admin/coupons - creates a coupon', async () => {
            const response = await request(app.getHttpServer())
                .post('/admin/coupons')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    code: `TESTCOUPON${randomUUID().slice(0, 6).toUpperCase()}`,
                    discountBps: 1000,
                    expiresAt: new Date(Date.now() + 86400000).toISOString(),
                })
                .expect(201);

            expect(response.body.id).toBeDefined();
            couponId = response.body.id;
        });

        it('GET /admin/coupons - lists coupons', async () => {
            const response = await request(app.getHttpServer())
                .get('/admin/coupons')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.some((c: { id: string }) => c.id === couponId)).toBe(true);
        });

        it('DELETE /admin/coupons/:id - deletes coupon', async () => {
            await request(app.getHttpServer())
                .delete(`/admin/coupons/${couponId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);
        });

        it('GET /admin/coupons - coupon is removed from list', async () => {
            const response = await request(app.getHttpServer())
                .get('/admin/coupons')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body.some((c: { id: string }) => c.id === couponId)).toBe(false);
        });

        it('DELETE - user cannot delete coupons', async () => {
            // Create another coupon first
            const createRes = await request(app.getHttpServer())
                .post('/admin/coupons')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    code: `USERTEST${randomUUID().slice(0, 6).toUpperCase()}`,
                    discountBps: 500,
                    expiresAt: new Date(Date.now() + 86400000).toISOString(),
                });

            await request(app.getHttpServer())
                .delete(`/admin/coupons/${createRes.body.id}`)
                .set('Authorization', `Bearer ${userToken}`)
                .expect(403);
        });
    });
});
