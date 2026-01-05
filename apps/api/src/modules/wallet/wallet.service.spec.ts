import { LedgerEntrySource, LedgerEntryState, LedgerEntryType } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from './wallet.service';

describe('WalletService', () => {
  it('keeps summary consistent with entry totals', async () => {
    const entries = [
      {
        id: 'entry-1',
        type: LedgerEntryType.CREDIT,
        state: LedgerEntryState.HELD,
        source: LedgerEntrySource.ORDER_PAYMENT,
        amountCents: 10000,
        currency: 'BRL',
        description: 'Held funds',
        orderId: 'order-1',
        paymentId: 'payment-1',
        createdAt: new Date('2026-01-01T10:00:00Z'),
      },
      {
        id: 'entry-2',
        type: LedgerEntryType.DEBIT,
        state: LedgerEntryState.HELD,
        source: LedgerEntrySource.ORDER_PAYMENT,
        amountCents: 10000,
        currency: 'BRL',
        description: 'Release held',
        orderId: 'order-1',
        paymentId: 'payment-1',
        createdAt: new Date('2026-01-02T10:00:00Z'),
      },
      {
        id: 'entry-3',
        type: LedgerEntryType.CREDIT,
        state: LedgerEntryState.AVAILABLE,
        source: LedgerEntrySource.ORDER_PAYMENT,
        amountCents: 10000,
        currency: 'BRL',
        description: 'Available funds',
        orderId: 'order-1',
        paymentId: 'payment-1',
        createdAt: new Date('2026-01-02T10:00:00Z'),
      },
      {
        id: 'entry-4',
        type: LedgerEntryType.DEBIT,
        state: LedgerEntryState.AVAILABLE,
        source: LedgerEntrySource.PAYOUT,
        amountCents: 6000,
        currency: 'BRL',
        description: 'Payout',
        orderId: 'order-1',
        paymentId: 'payment-1',
        createdAt: new Date('2026-01-03T10:00:00Z'),
      },
      {
        id: 'entry-5',
        type: LedgerEntryType.CREDIT,
        state: LedgerEntryState.REVERSED,
        source: LedgerEntrySource.REFUND,
        amountCents: 4000,
        currency: 'BRL',
        description: 'Refund reversal',
        orderId: 'order-2',
        paymentId: 'payment-2',
        createdAt: new Date('2026-01-04T10:00:00Z'),
      },
    ];

    const groupedMap = new Map<string, { state: LedgerEntryState; type: LedgerEntryType; currency: string; sum: number }>();
    for (const entry of entries) {
      const key = `${entry.state}-${entry.type}-${entry.currency}`;
      const existing = groupedMap.get(key);
      if (existing) {
        existing.sum += entry.amountCents;
      } else {
        groupedMap.set(key, {
          state: entry.state,
          type: entry.type,
          currency: entry.currency,
          sum: entry.amountCents,
        });
      }
    }

    const groupedRows = Array.from(groupedMap.values()).map((row) => ({
      state: row.state,
      type: row.type,
      currency: row.currency,
      _sum: { amountCents: row.sum },
    }));

    const prismaMock = {
      ledgerEntry: {
        groupBy: jest.fn().mockResolvedValue(groupedRows),
        findMany: jest.fn().mockResolvedValue(entries),
        count: jest.fn().mockResolvedValue(entries.length),
      },
      $transaction: jest
        .fn()
        .mockImplementation(async (calls: Array<Promise<unknown>>) => Promise.all(calls)),
    } as unknown as PrismaService;

    const walletService = new WalletService(prismaMock);

    const summary = await walletService.getSummary('seller-1');
    const result = await walletService.listEntries('seller-1', { take: 50, skip: 0 });

    const totals = result.items.reduce(
      (acc, entry) => {
        const signed = entry.type === LedgerEntryType.DEBIT ? -entry.amountCents : entry.amountCents;
        acc[entry.state] += signed;
        return acc;
      },
      {
        [LedgerEntryState.HELD]: 0,
        [LedgerEntryState.AVAILABLE]: 0,
        [LedgerEntryState.REVERSED]: 0,
      },
    );

    expect(summary.heldCents).toBe(totals[LedgerEntryState.HELD]);
    expect(summary.availableCents).toBe(totals[LedgerEntryState.AVAILABLE]);
    expect(summary.reversedCents).toBe(totals[LedgerEntryState.REVERSED]);
  });
});
