import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { Observable, mergeMap } from 'rxjs';
import { Request } from 'express';

import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../auth/auth.types';

type AuthenticatedRequest = Request & {
  user?: JwtPayload;
};

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const SENSITIVE_KEYS = new Set(['password', 'token', 'code', 'refreshToken']);

const sanitizePayload = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizePayload(item));
  }
  if (value && typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        continue;
      }
      output[key] = sanitizePayload(entry);
    }
    return output;
  }
  return value;
};

const mapAction = (method?: string) => {
  switch ((method ?? '').toUpperCase()) {
    case 'POST':
      return AuditAction.CREATE;
    case 'DELETE':
      return AuditAction.DELETE;
    case 'PUT':
    case 'PATCH':
      return AuditAction.UPDATE;
    default:
      return null;
  }
};

@Injectable()
export class AdminAuditInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const method = request?.method?.toUpperCase() ?? '';
    const action = mapAction(method);

    if (!request || !action || !MUTATING_METHODS.has(method)) {
      return next.handle();
    }

    const rawPath = request.originalUrl ?? request.url ?? '';
    const path = rawPath.split('?')[0] ?? '';
    if (!path.startsWith('/admin')) {
      return next.handle();
    }

    const adminId = request.user?.sub;
    if (!adminId) {
      return next.handle();
    }

    const pathParts = path.split('/').filter(Boolean);
    const adminIndex = pathParts.indexOf('admin');
    const entityType = pathParts[adminIndex + 1] ?? 'admin';
    const entityId = request.params?.id;

    const payloadRaw = request.body;
    const payload =
      payloadRaw && typeof payloadRaw === 'object'
        ? sanitizePayload(payloadRaw)
        : payloadRaw;

    return next.handle().pipe(
      mergeMap(async (value) => {
        await this.prisma.auditLog.create({
          data: {
            adminId,
            action,
            entityType,
            entityId,
            ip: request.ip,
            userAgent: request.headers['user-agent'],
            payload,
          },
        });
        return value;
      }),
    );
  }
}
