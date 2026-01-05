import { LedgerEntryState, LedgerEntryType } from '@prisma/client';

export type WalletSummary = {
  currency: string;
  heldCents: number;
  availableCents: number;
  reversedCents: number;
};

export type WalletSummaryRow = {
  state: LedgerEntryState;
  type: LedgerEntryType;
  currency: string;
  _sum: { amountCents: number | null };
};

const applySignedAmount = (amount: number, type: LedgerEntryType) =>
  type === LedgerEntryType.DEBIT ? -amount : amount;

export const buildWalletSummary = (rows: WalletSummaryRow[]): WalletSummary => {
  const currency = rows[0]?.currency ?? 'BRL';
  const totals = {
    [LedgerEntryState.HELD]: 0,
    [LedgerEntryState.AVAILABLE]: 0,
    [LedgerEntryState.REVERSED]: 0,
  };

  for (const row of rows) {
    if (row.currency !== currency) {
      continue;
    }
    const rawAmount = row._sum.amountCents ?? 0;
    totals[row.state] += applySignedAmount(rawAmount, row.type);
  }

  return {
    currency,
    heldCents: totals[LedgerEntryState.HELD],
    availableCents: totals[LedgerEntryState.AVAILABLE],
    reversedCents: totals[LedgerEntryState.REVERSED],
  };
};
