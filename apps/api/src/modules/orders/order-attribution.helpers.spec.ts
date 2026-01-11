import { calculateAttributionTotals } from './order-attribution.helpers';

describe('calculateAttributionTotals', () => {
  it('caps discount at platform fee base', () => {
    const result = calculateAttributionTotals({
      originalTotalCents: 10000,
      platformFeeBps: 500,
      discountCents: 2000,
      partnerCommissionBps: 6500,
    });

    expect(result.platformFeeBaseCents).toBe(500);
    expect(result.discountAppliedCents).toBe(500);
    expect(result.platformFeeFinalCents).toBe(0);
    expect(result.finalTotalCents).toBe(9500);
  });

  it('never returns negative platform fee final', () => {
    const result = calculateAttributionTotals({
      originalTotalCents: 15000,
      platformFeeBps: 1000,
      discountCents: 3000,
    });

    expect(result.platformFeeFinalCents).toBeGreaterThanOrEqual(0);
  });

  it('calculates partner commission from fee final', () => {
    const result = calculateAttributionTotals({
      originalTotalCents: 20000,
      platformFeeBps: 1000,
      discountBps: 250,
      partnerCommissionBps: 6500,
    });

    expect(result.platformFeeBaseCents).toBe(2000);
    expect(result.platformFeeFinalCents).toBe(1500);
    expect(result.partnerCommissionCents).toBe(975);
  });
});
