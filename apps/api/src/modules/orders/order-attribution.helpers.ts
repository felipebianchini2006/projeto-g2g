export type AttributionTotalsInput = {
  originalTotalCents: number;
  platformFeeBps: number;
  discountBps?: number | null;
  discountCents?: number | null;
  partnerCommissionBps?: number | null;
};

export type AttributionTotals = {
  desiredDiscountCents: number;
  discountAppliedCents: number;
  platformFeeBaseCents: number;
  platformFeeFinalCents: number;
  partnerCommissionCents: number;
  finalTotalCents: number;
};

export const calculateAttributionTotals = ({
  originalTotalCents,
  platformFeeBps,
  discountBps,
  discountCents,
  partnerCommissionBps,
}: AttributionTotalsInput): AttributionTotals => {
  const platformFeeBaseCents = Math.round((originalTotalCents * platformFeeBps) / 10000);
  const desiredDiscountCents = discountCents
    ? discountCents
    : discountBps
      ? Math.round((originalTotalCents * discountBps) / 10000)
      : 0;
  const discountAppliedCents = Math.min(desiredDiscountCents, platformFeeBaseCents);
  const platformFeeFinalCents = Math.max(platformFeeBaseCents - discountAppliedCents, 0);
  const partnerCommissionCents = partnerCommissionBps
    ? Math.round((platformFeeFinalCents * partnerCommissionBps) / 10000)
    : 0;
  const finalTotalCents = Math.max(originalTotalCents - discountAppliedCents, 0);

  return {
    desiredDiscountCents,
    discountAppliedCents,
    platformFeeBaseCents,
    platformFeeFinalCents,
    partnerCommissionCents,
    finalTotalCents,
  };
};
