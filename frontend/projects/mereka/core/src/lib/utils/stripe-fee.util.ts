/**
 * Centralized Stripe Fee Utility (Stripe Atlas Account)
 *
 * Provides consistent fee calculations across all Mereka frontend applications.
 * All Stripe fee calculations should use these functions.
 *
 * Stripe Atlas Fee Structure (US-based processing):
 * - Standard: 2.9% + $0.30 per transaction
 *
 * Note: Since Mereka uses Stripe Atlas (US Delaware company),
 * all transactions use the unified US pricing regardless of currency.
 * The fixed fee is converted to local currency equivalent.
 */

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Stripe fee rate (percentage) - Standard rate for Stripe Atlas
 */
export const STRIPE_FEE_RATE = 0.029; // 2.9%

/**
 * Stripe fixed fee in USD (Stripe Atlas uses USD-based pricing)
 */
export const STRIPE_FIXED_FEE_USD = 0.3; // $0.30

/**
 * Default platform fee rate (Mereka's take)
 */
export const DEFAULT_PLATFORM_FEE_RATE = 0.15; // 15%

/**
 * Currency exchange rates to USD (approximate, for fee calculation)
 * These are used to convert the $0.30 fixed fee to local currency
 */
export const CURRENCY_TO_USD_RATE: Record<string, number> = {
  USD: 1,
  MYR: 4.5, // Approx: 1 USD = 4.50 MYR, so $0.30 ≈ RM 1.35
  SGD: 1.35, // Approx: 1 USD = 1.35 SGD, so $0.30 ≈ SGD 0.40
  EUR: 0.92,
  GBP: 0.79,
};

/**
 * Currency symbols for display
 */
export const CURRENCY_SYMBOLS: Record<string, string> = {
  MYR: 'RM',
  USD: '$',
  SGD: 'SGD',
  EUR: '€',
  GBP: '£',
};

// =============================================================================
// TYPES
// =============================================================================

export type FeePaidBy = 'learner' | 'hub';
export type SupportedCurrency = 'MYR' | 'USD' | 'SGD' | 'EUR' | 'GBP';

/**
 * Stripe fee calculation result
 */
export interface StripeFeeResult {
  stripeFee: number;
  stripeFeeRate: number;
  fixedFee: number;
  fixedFeeUSD: number;
}

/**
 * Complete pricing breakdown for checkout
 */
export interface PricingBreakdown {
  subtotal: number;
  platformFee: number;
  platformFeeRate: number;
  stripeFee: number;
  transferAmount: number; // What the expert/hub receives
  totalCharge: number; // What the learner pays
}

/**
 * Full fee breakdown including discount
 */
export interface FeeBreakdown extends PricingBreakdown {
  discount: number;
  originalSubtotal: number;
}

// =============================================================================
// FEE CALCULATION FUNCTIONS
// =============================================================================

/**
 * Get the fixed fee converted to local currency
 *
 * The Stripe Atlas fixed fee is $0.30 USD. This converts it to local currency.
 *
 * @param currency - ISO currency code
 * @returns Fixed fee in local currency
 */
export function getFixedFee(currency: string): number {
  const upperCurrency = currency.toUpperCase();
  const rate = CURRENCY_TO_USD_RATE[upperCurrency] ?? 1;
  return round(STRIPE_FIXED_FEE_USD * rate);
}

/**
 * Calculate Stripe processing fee
 *
 * Formula: (amount × 2.9%) + $0.30 USD equivalent
 *
 * @param amount - Transaction amount (in currency units, not cents)
 * @param currency - ISO currency code (default: 'MYR')
 * @returns StripeFeeResult with fee breakdown
 *
 * @example
 * calculateStripeFee(100, 'MYR') // { stripeFee: 4.25, ... } (2.9% + RM1.35)
 * calculateStripeFee(100, 'USD') // { stripeFee: 3.20, ... } (2.9% + $0.30)
 */
export function calculateStripeFee(amount: number, currency = 'MYR'): StripeFeeResult {
  const fixedFee = getFixedFee(currency);
  const percentageFee = amount * STRIPE_FEE_RATE;
  const stripeFee = round(percentageFee + fixedFee);

  return {
    stripeFee,
    stripeFeeRate: STRIPE_FEE_RATE,
    fixedFee,
    fixedFeeUSD: STRIPE_FIXED_FEE_USD,
  };
}

/**
 * Calculate total amount including Stripe fee
 * Used when learner pays the fee
 *
 * @param amount - Transaction amount (in currency units, not cents)
 * @param currency - ISO currency code (default: 'MYR')
 * @returns Total amount including Stripe fee
 *
 * @example
 * calculateTotalWithFee(100, 'MYR') // 104.25
 */
export function calculateTotalWithFee(amount: number, currency = 'MYR'): number {
  const { stripeFee } = calculateStripeFee(amount, currency);
  return round(amount + stripeFee);
}

/**
 * Calculate transfer amount after platform and Stripe fees
 *
 * This is the main function for checkout pricing calculations.
 *
 * Formula breakdown:
 * - Stripe Fee = (subtotal × 2.9%) + $0.30 equivalent
 * - Platform Fee = subtotal × platform rate (default 15%)
 * - Transfer = subtotal - platformFee - stripeFee
 * - Total Charge = subtotal + stripeFee (if learner pays) OR subtotal (if hub pays)
 *
 * @param amount - Subtotal amount (in currency units, not cents)
 * @param currency - ISO currency code (default: 'MYR')
 * @param platformFeeRate - Platform fee rate (default: 0.15 = 15%)
 * @param hubPaysFee - Whether hub absorbs the Stripe fee (default: false = learner pays)
 * @returns PricingBreakdown with complete fee breakdown
 *
 * @example
 * // Learner pays fee (default)
 * calculatePricing(100, 'MYR', 0.15, false)
 * // { subtotal: 100, platformFee: 15, stripeFee: 4.25, transferAmount: 80.75, totalCharge: 104.25 }
 *
 * // Hub pays fee
 * calculatePricing(100, 'MYR', 0.15, true)
 * // { subtotal: 100, platformFee: 15, stripeFee: 4.25, transferAmount: 80.75, totalCharge: 100 }
 */
export function calculatePricing(
  amount: number,
  currency = 'MYR',
  platformFeeRate = DEFAULT_PLATFORM_FEE_RATE,
  hubPaysFee = false
): PricingBreakdown {
  if (amount <= 0) {
    return {
      subtotal: 0,
      platformFee: 0,
      platformFeeRate,
      stripeFee: 0,
      transferAmount: 0,
      totalCharge: 0,
    };
  }

  const platformFee = round(amount * platformFeeRate);
  const { stripeFee } = calculateStripeFee(amount, currency);

  // If hub pays fee, learner pays subtotal only
  // If learner pays fee, add stripeFee to total
  const totalCharge = hubPaysFee ? amount : round(amount + stripeFee);

  // Expert always receives: amount - platformFee - stripeFee
  const transferAmount = round(amount - platformFee - stripeFee);

  return {
    subtotal: amount,
    platformFee,
    platformFeeRate,
    stripeFee,
    transferAmount,
    totalCharge,
  };
}

/**
 * Calculate checkout pricing with optional discount
 *
 * @param subtotal - Original subtotal before discount
 * @param currency - ISO currency code
 * @param platformFeeRate - Platform fee rate
 * @param hubPaysFee - Whether hub absorbs the Stripe fee
 * @param discountAmount - Discount amount to apply (optional)
 * @returns FeeBreakdown including discount
 */
export function calculateCheckoutPricing(
  subtotal: number,
  currency = 'MYR',
  platformFeeRate = DEFAULT_PLATFORM_FEE_RATE,
  hubPaysFee = false,
  discountAmount = 0
): FeeBreakdown {
  const originalSubtotal = subtotal;
  const discountedSubtotal = Math.max(0, subtotal - discountAmount);

  const result = calculatePricing(discountedSubtotal, currency, platformFeeRate, hubPaysFee);

  return {
    ...result,
    discount: discountAmount,
    originalSubtotal,
  };
}

// =============================================================================
// FORMATTING HELPERS
// =============================================================================

/**
 * Round to 2 decimal places
 */
function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Format currency amount for display
 *
 * @param amount - Amount to format
 * @param currency - ISO currency code
 * @returns Formatted string (e.g., "RM 100.00")
 */
export function formatCurrency(amount: number, currency = 'MYR'): string {
  const symbol = CURRENCY_SYMBOLS[currency.toUpperCase()] || currency;
  return `${symbol} ${amount.toFixed(2)}`;
}

/**
 * Get currency symbol for a currency code
 *
 * @param currency - ISO currency code
 * @returns Currency symbol
 */
export function getCurrencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency.toUpperCase()] || currency;
}

/**
 * Get currency for country (for default selection)
 *
 * @param country - Country name
 * @returns Currency code
 */
export function getCurrencyForCountry(country: string): SupportedCurrency {
  const map: Record<string, SupportedCurrency> = {
    Malaysia: 'MYR',
    Singapore: 'SGD',
    'United States': 'USD',
    USA: 'USD',
    UK: 'GBP',
    'United Kingdom': 'GBP',
  };
  return map[country] || 'MYR';
}
