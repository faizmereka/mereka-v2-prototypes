/**
 * Stripe Fee Calculation Utility
 *
 * Stripe Atlas (US-incorporated company) pricing:
 * - Card payments: 2.9% + $0.30 USD
 *
 * All currencies use the same rate structure.
 */

const STRIPE_FEE_RATE = 0.029; // 2.9%
const STRIPE_FIXED_FEE_USD = 0.30; // $0.30 USD

/**
 * Convert USD fixed fee to target currency (approximate)
 * Using rough exchange rates for common currencies
 */
const FIXED_FEE_BY_CURRENCY: Record<string, number> = {
  USD: 0.30,
  MYR: 1.30,  // ~4.3 MYR/USD
  SGD: 0.40,  // ~1.35 SGD/USD
  EUR: 0.28,
  GBP: 0.24,
};

/**
 * Get fixed fee for currency
 */
function getFixedFee(currency: string): number {
  return FIXED_FEE_BY_CURRENCY[currency.toUpperCase()] ?? STRIPE_FIXED_FEE_USD;
}

/**
 * Calculate Stripe processing fee
 */
export function calculateStripeFee(amount: number, currency: string = 'MYR'): number {
  if (amount <= 0) return 0;

  const fixedFee = getFixedFee(currency);
  const percentageFee = amount * STRIPE_FEE_RATE;
  const totalFee = percentageFee + fixedFee;

  return Math.round(totalFee * 100) / 100;
}

/**
 * Calculate total with Stripe fee
 */
export function calculateTotalWithFee(amount: number, currency: string = 'MYR'): number {
  const fee = calculateStripeFee(amount, currency);
  return Math.round((amount + fee) * 100) / 100;
}

/**
 * Calculate discount amount
 */
export function calculateDiscount(
  subtotal: number,
  discountType: 'percentage' | 'fixed',
  discountValue: number,
  maxDiscount?: number
): number {
  let discount = 0;

  if (discountType === 'percentage') {
    discount = (subtotal * discountValue) / 100;
    if (maxDiscount && discount > maxDiscount) {
      discount = maxDiscount;
    }
  } else {
    discount = Math.min(discountValue, subtotal);
  }

  return Math.round(discount * 100) / 100;
}

/**
 * Format currency amount for display
 */
export function formatCurrency(amount: number, currency: string = 'MYR'): string {
  const formatter = new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return formatter.format(amount);
}

/**
 * Calculate full pricing breakdown
 */
export interface PricingBreakdown {
  subtotal: number;
  serviceFee: number;
  discount: number;
  total: number;
  isFree: boolean;
}

export function calculatePricing(
  subtotal: number,
  currency: string = 'MYR',
  isHubPayingFee: boolean = false,
  discountAmount: number = 0
): PricingBreakdown {
  const discountedSubtotal = Math.max(0, subtotal - discountAmount);
  const serviceFee = isHubPayingFee ? 0 : calculateStripeFee(discountedSubtotal, currency);
  const total = Math.round((discountedSubtotal + serviceFee) * 100) / 100;

  return {
    subtotal,
    serviceFee,
    discount: discountAmount,
    total,
    isFree: total === 0,
  };
}
