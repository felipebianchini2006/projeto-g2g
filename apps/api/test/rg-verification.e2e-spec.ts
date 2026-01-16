import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import request from 'supertest';
import type { App } from 'supertest/types';
import * as path from 'path';
import * as fs from 'fs';

import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/modules/prisma/prisma.service';
import { resetDatabase } from './utils/reset-db';
import { createTestApp } from './utils/create-test-app';

const { applyTestEnv } = require('./test-env.cjs');

describe('RG Verification (e2e)', () => {
    let app: INestApplication<App>;
    let prisma: PrismaService;
    let jwtService: JwtService;
    let userToken: string;
    let adminToken: string;
    let userId: string;
    let verificationId: string;

    const testImagePath = path.join(__dirname, 'fixtures', 'test-rg.png');

    beforeAll(async () => {
        applyTestEnv();

        // Create test image fixture if it doesn't exist
        const fixturesDir = path.join(__dirname, 'fixtures');
        if (!fs.existsSync(fixturesDir)) {
            fs.mkdirSync(fixturesDir, { recursive: true });
        }
        if (!fs.existsSync(testImagePath)) {
            // Create a minimal PNG file (1x1 transparent pixel)
            const pngBuffer = Buffer.from([
                0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
                0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
                0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
                0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
                0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
                0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82
            ]);
            fs.writeFileSync(testImagePath, pngBuffer);
        }

        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = await createTestApp(moduleFixture);
        prisma = moduleFixture.get(PrismaService);
        jwtService = moduleFixture.get(JwtService);

        await resetDatabase(prisma);

        // Create user
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

    describe('User RG submission', () => {
        it('GET /users/me/rg - returns NOT_SUBMITTED when no RG exists', async () => {
            const response = await request(app.getHttpServer())
                .get('/users/me/rg')
                .set('Authorization', `Bearer ${userToken}`)
                .expect(200);

            expect(response.body.status).toBe('NOT_SUBMITTED');
        });

        it('POST /users/me/rg - submits RG with photo', async () => {
            const response = await request(app.getHttpServer())
                .post('/users/me/rg')
                .set('Authorization', `Bearer ${userToken}`)
                .field('rgNumber', '12.345.678-9')
                .attach('file', testImagePath)
                .expect(201);

            expect(response.body.id).toBeDefined();
            expect(response.body.userId).toBe(userId);
            expect(response.body.rgNumber).toBe('12.345.678-9');
            expect(response.body.status).toBe('PENDING');
            expect(response.body.rgPhotoUrl).toContain('/uploads/rg/');

            verificationId = response.body.id;
        });

        it('GET /users/me/rg - returns PENDING status after submission', async () => {
            const response = await request(app.getHttpServer())
                .get('/users/me/rg')
                .set('Authorization', `Bearer ${userToken}`)
                .expect(200);

            expect(response.body.status).toBe('PENDING');
            expect(response.body.rgNumber).toBe('12.345.678-9');
        });

        it('POST /users/me/rg - prevents duplicate pending submission', async () => {
            await request(app.getHttpServer())
                .post('/users/me/rg')
                .set('Authorization', `Bearer ${userToken}`)
                .field('rgNumber', '98.765.432-1')
                .attach('file', testImagePath)
                .expect(400);
        });
    });

    describe('Admin RG management', () => {
        it('GET /admin/rg - lists all verifications', async () => {
            const response = await request(app.getHttpServer())
                .get('/admin/rg')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.some((v: { id: string }) => v.id === verificationId)).toBe(true);
        });

        it('GET /admin/rg?status=PENDING - filters by status', async () => {
            const response = await request(app.getHttpServer())
                .get('/admin/rg?status=PENDING')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body.every((v: { status: string }) => v.status === 'PENDING')).toBe(true);
        });

        it('GET /admin/rg/:id - gets verification details', async () => {
            const response = await request(app.getHttpServer())
                .get(`/admin/rg/${verificationId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body.id).toBe(verificationId);
            expect(response.body.user).toBeDefined();
            expect(response.body.user.id).toBe(userId);
        });

        it('POST /admin/rg/:id/approve - approves verification', async () => {
            const response = await request(app.getHttpServer())
                .post(`/admin/rg/${verificationId}/approve`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(201);

            expect(response.body.status).toBe('APPROVED');
            expect(response.body.reviewedAt).toBeDefined();
        });

        it('GET /users/me/rg - user sees approved status', async () => {
            const response = await request(app.getHttpServer())
                .get('/users/me/rg')
                .set('Authorization', `Bearer ${userToken}`)
                .expect(200);

            expect(response.body.status).toBe('APPROVED');
        });

        it('GET /admin/rg - user cannot access admin endpoint', async () => {
            await request(app.getHttpServer())
                .get('/admin/rg')
                .set('Authorization', `Bearer ${userToken}`)
                .expect(403);
        });
    });

    describe('Admin RG rejection', () => {
        let newUserId: string;
        let newUserToken: string;
        let newVerificationId: string;

        beforeAll(async () => {
            const newUser = await prisma.user.create({
                data: {
                    email: `user2-${randomUUID()}@test.com`,
                    passwordHash: 'hash',
                    role: 'USER',
                },
            });
            newUserId = newUser.id;
            newUserToken = await jwtService.signAsync({ sub: newUser.id, role: newUser.role });

            // Submit RG
            const response = await request(app.getHttpServer())
                .post('/users/me/rg')
                .set('Authorization', `Bearer ${newUserToken}`)
                .field('rgNumber', '11.111.111-1')
                .attach('file', testImagePath);

            newVerificationId = response.body.id;
        });

        it('POST /admin/rg/:id/reject - rejects verification with reason', async () => {
            const response = await request(app.getHttpServer())
                .post(`/admin/rg/${newVerificationId}/reject`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ reason: 'Document illegible.' })
                .expect(201);

            expect(response.body.status).toBe('REJECTED');
            expect(response.body.adminReason).toBe('Document illegible.');
        });

        it('user can resubmit after rejection', async () => {
            const response = await request(app.getHttpServer())
                .post('/users/me/rg')
                .set('Authorization', `Bearer ${newUserToken}`)
                .field('rgNumber', '22.222.222-2')
                .attach('file', testImagePath)
                .expect(201);

            expect(response.body.status).toBe('PENDING');
        });
    });
});
