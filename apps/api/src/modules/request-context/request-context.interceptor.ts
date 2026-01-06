import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import type { Request } from 'express';
import { Observable } from 'rxjs';

import type { JwtPayload } from '../auth/auth.types';
import { RequestContextService } from './request-context.service';

type AuthenticatedRequest = Request & { user?: JwtPayload };

@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  constructor(private readonly requestContext: RequestContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() === 'http') {
      const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
      if (request?.user?.sub) {
        this.requestContext.set({ userId: request.user.sub });
      }
    }
    return next.handle();
  }
}
