import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditAction, PlatformSetting } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

export type SettingsAuditMeta = {
  ip?: string;
  userAgent?: string;
};

const SETTINGS_ID = 'default';

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async getSettings(): Promise<PlatformSetting> {
    return this.prisma.platformSetting.upsert({
      where: { id: SETTINGS_ID },
      update: {},
      create: {
        id: SETTINGS_ID,
        ...this.getDefaultValues(),
      },
    });
  }

  async updateSettings(
    adminId: string,
    dto: UpdateSettingsDto,
    meta: SettingsAuditMeta,
  ): Promise<PlatformSetting> {
    const current = await this.getSettings();
    const data = this.buildUpdateData(dto);

    if (Object.keys(data).length === 0) {
      return current;
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.platformSetting.update({
        where: { id: SETTINGS_ID },
        data,
      });

      await tx.auditLog.create({
        data: {
          adminId,
          action: AuditAction.UPDATE,
          entityType: 'settings',
          entityId: SETTINGS_ID,
          ip: meta.ip,
          userAgent: meta.userAgent,
          payload: {
            before: this.pickAuditFields(current),
            after: this.pickAuditFields(updated),
          },
        },
      });

      return updated;
    });
  }

  private getDefaultValues() {
    const settlementMode =
      this.configService.get<string>('SETTLEMENT_MODE') ?? 'cashout';

    return {
      platformFeeBps: 0,
      orderPaymentTtlSeconds:
        this.configService.get<number>('ORDER_PAYMENT_TTL_SECONDS') ?? 900,
      settlementReleaseDelayHours:
        this.configService.get<number>('SETTLEMENT_RELEASE_DELAY_HOURS') ?? 0,
      splitEnabled: settlementMode === 'split',
    };
  }

  private buildUpdateData(dto: UpdateSettingsDto) {
    const data: Partial<PlatformSetting> = {};

    if (dto.platformFeeBps !== undefined) {
      data.platformFeeBps = dto.platformFeeBps;
    }
    if (dto.orderPaymentTtlSeconds !== undefined) {
      data.orderPaymentTtlSeconds = dto.orderPaymentTtlSeconds;
    }
    if (dto.settlementReleaseDelayHours !== undefined) {
      data.settlementReleaseDelayHours = dto.settlementReleaseDelayHours;
    }
    if (dto.splitEnabled !== undefined) {
      data.splitEnabled = dto.splitEnabled;
    }

    return data;
  }

  private pickAuditFields(settings: PlatformSetting) {
    return {
      platformFeeBps: settings.platformFeeBps,
      orderPaymentTtlSeconds: settings.orderPaymentTtlSeconds,
      settlementReleaseDelayHours: settings.settlementReleaseDelayHours,
      splitEnabled: settings.splitEnabled,
    };
  }
}
