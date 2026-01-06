import { Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import pino, { Logger as PinoLogger } from 'pino';

import { RequestContextService } from '../request-context/request-context.service';

@Injectable()
export class AppLogger implements LoggerService {
  private readonly logger: PinoLogger;

  constructor(
    private readonly configService: ConfigService,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = pino({
      level: this.configService.get<string>('LOG_LEVEL') ?? 'info',
    });
  }

  log(message: string, context?: string) {
    this.logger.info(this.buildBindings(context), message);
  }

  error(message: string, trace?: string, context?: string) {
    this.logger.error({ ...this.buildBindings(context), trace }, message);
  }

  warn(message: string, context?: string) {
    this.logger.warn(this.buildBindings(context), message);
  }

  debug(message: string, context?: string) {
    this.logger.debug(this.buildBindings(context), message);
  }

  verbose(message: string, context?: string) {
    this.logger.trace(this.buildBindings(context), message);
  }

  private buildBindings(context?: string) {
    const requestContext = this.requestContext.get();
    return {
      context,
      requestId: requestContext?.requestId,
      correlationId: requestContext?.correlationId,
      userId: requestContext?.userId,
    };
  }
}
