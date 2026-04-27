/**
 * Fee Calculator Utility
 *
 * All fee calculations are now centralized in @mereka/core.
 * This file re-exports from the centralized location.
 */

// Re-export all fee utilities from @mereka/core
export {
  // Constants
  STRIPE_FEE_RATE,
  STRIPE_FIXED_FEE_USD,
  DEFAULT_PLATFORM_FEE_RATE,
  CURRENCY_TO_USD_RATE,
  CURRENCY_SYMBOLS,

  // Functions
  calculateStripeFee,
  calculateTotalWithFee,
  calculatePricing,
  calculateCheckoutPricing,
  formatCurrency,
  getCurrencySymbol,
  getCurrencyForCountry,
  getFixedFee,

  // Types
  type FeePaidBy,
  type SupportedCurrency,
  type StripeFeeResult,
  type PricingBreakdown,
  type FeeBreakdown,
} from '@mereka/core';

// =============================================================================
// FEE CONFIG (Legacy format for backward compatibility)
// =============================================================================

/**
 * Fee configuration by currency
 * Used by UI components for display
 */
export const FEE_CONFIG = {
  MYR: {
    serviceFeePercent: 0.029, // 2.9%
    serviceFeeFixed: 1.35, // RM 1.35 ($0.30 USD equivalent)
    currencySymbol: 'RM',
    merekaFeePercent: 0.15, // 15%
  },
  USD: {
    serviceFeePercent: 0.029,
    serviceFeeFixed: 0.3, // $0.30
    currencySymbol: '$',
    merekaFeePercent: 0.15,
  },
  SGD: {
    serviceFeePercent: 0.029,
    serviceFeeFixed: 0.4, // SGD 0.40 ($0.30 USD equivalent)
    currencySymbol: 'SGD',
    merekaFeePercent: 0.15,
  },
  EUR: {
    serviceFeePercent: 0.029,
    serviceFeeFixed: 0.28, // €0.28 ($0.30 USD equivalent)
    currencySymbol: '€',
    merekaFeePercent: 0.15,
  },
  GBP: {
    serviceFeePercent: 0.029,
    serviceFeeFixed: 0.24, // £0.24 ($0.30 USD equivalent)
    currencySymbol: '£',
    merekaFeePercent: 0.15,
  },
} as const;

// =============================================================================
// TIME CONVERSIONS (not related to fees, kept here)
// =============================================================================

export type CutoffTimeUnit = 'Hour(s)' | 'Day(s)' | 'Week(s)';

export function cutoffToMs(value: number, unit: CutoffTimeUnit): number {
  if (!value || value <= 0) return 0;
  switch (unit) {
    case 'Hour(s)':
      return value * 60 * 60 * 1000;
    case 'Day(s)':
      return value * 24 * 60 * 60 * 1000;
    case 'Week(s)':
      return value * 7 * 24 * 60 * 60 * 1000;
    default:
      return 0;
  }
}

export function msToCutoff(ms: number): { value: number; unit: CutoffTimeUnit } {
  if (!ms || ms <= 0) return { value: 0, unit: 'Hour(s)' };
  const weeks = ms / (7 * 24 * 60 * 60 * 1000);
  const days = ms / (24 * 60 * 60 * 1000);
  const hours = ms / (60 * 60 * 1000);
  if (weeks >= 1 && weeks === Math.floor(weeks)) return { value: weeks, unit: 'Week(s)' };
  if (days >= 1 && days === Math.floor(days)) return { value: days, unit: 'Day(s)' };
  return { value: hours, unit: 'Hour(s)' };
}

export function msToDuration(ms: number): { hours: number; minutes: number } {
  if (!ms || ms <= 0) return { hours: 0, minutes: 0 };
  const totalMinutes = Math.floor(ms / (60 * 1000));
  return { hours: Math.floor(totalMinutes / 60), minutes: totalMinutes % 60 };
}

export function durationToMs(hours: number, minutes: number): number {
  return (hours * 60 + minutes) * 60 * 1000;
}
