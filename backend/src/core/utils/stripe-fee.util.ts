/**
 * Centralized Stripe Fee Utility (Stripe Atlas Account)
 *
 * Provides consistent fee calculations across the application.
 * All Stripe fee calculations should use these functions.
 *
 * Stripe Atlas Fee Structure (US-based processing):
 * - Standard: 2.9% + $0.30 per transaction
 * - International cards: +1% additional (handled separately if needed)
 *
 * Note: Since Mereka uses Stripe Atlas (US Delaware company),
 * all transactions use the unified US pricing regardless of currency.
 * The fixed fee is converted to local currency equivalent.
 */

/**
 * Stripe fee rate (percentage) - Standard rate for Stripe Atlas
 */
export const STRIPE_FEE_RATE = 0.029; // 2.9%

/**
 * Stripe fixed fee in USD (Stripe Atlas uses USD-based pricing)
 */
export const STRIPE_FIXED_FEE_USD = 0.3; // $0.30

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
 * Default platform fee rate (Mereka's take)
 */
export const DEFAULT_PLATFORM_FEE_RATE = 0.15; // 15%

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
 * Transfer amount calculation result
 */
export interface TransferAmountResult {
  subtotal: number;
  platformFee: number;
  platformFeeRate: number;
  stripeFee: number;
  transferAmount: number; // What the expert/hub receives
  totalCharge: number; // What the learner pays
}

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
  // Convert $0.30 to local currency
  return Number((STRIPE_FIXED_FEE_USD * rate).toFixed(2));
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
  const stripeFee = Number((percentageFee + fixedFee).toFixed(2));

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
  return Number((amount + stripeFee).toFixed(2));
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
 * @returns TransferAmountResult with complete fee breakdown
 *
 * @example
 * // Learner pays fee (default)
 * calculateTransferAmount(100, 'MYR', 0.15, false)
 * // { subtotal: 100, platformFee: 15, stripeFee: 4.25, transferAmount: 80.75, totalCharge: 104.25 }
 *
 * // Hub pays fee
 * calculateTransferAmount(100, 'MYR', 0.15, true)
 * // { subtotal: 100, platformFee: 15, stripeFee: 4.25, transferAmount: 80.75, totalCharge: 100 }
 */
export function calculateTransferAmount(
  amount: number,
  currency = 'MYR',
  platformFeeRate = DEFAULT_PLATFORM_FEE_RATE,
  hubPaysFee = false,
): TransferAmountResult {
  const platformFee = Number((amount * platformFeeRate).toFixed(2));
  const { stripeFee } = calculateStripeFee(amount, currency);

  // If hub pays fee, learner pays subtotal only
  // If learner pays fee, add stripeFee to total
  const totalCharge = hubPaysFee ? amount : Number((amount + stripeFee).toFixed(2));

  // Expert always receives: amount - platformFee - stripeFee
  const transferAmount = Number((amount - platformFee - stripeFee).toFixed(2));

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
 * @returns Pricing breakdown including discount
 */
export function calculateCheckoutPricing(
  subtotal: number,
  currency = 'MYR',
  platformFeeRate = DEFAULT_PLATFORM_FEE_RATE,
  hubPaysFee = false,
  discountAmount = 0,
): TransferAmountResult & { discount: number; originalSubtotal: number } {
  const originalSubtotal = subtotal;
  const discountedSubtotal = Math.max(0, subtotal - discountAmount);

  const result = calculateTransferAmount(discountedSubtotal, currency, platformFeeRate, hubPaysFee);

  return {
    ...result,
    discount: discountAmount,
    originalSubtotal,
  };
}

/**
 * Calculate pricing (alias for calculateTransferAmount)
 *
 * This is a convenience alias for use in checkout services.
 *
 * @param amount - Subtotal amount
 * @param currency - ISO currency code
 * @param platformFeeRate - Platform fee rate
 * @param hubPaysFee - Whether hub absorbs the Stripe fee
 * @returns TransferAmountResult
 */
export function calculatePricing(
  amount: number,
  currency = 'MYR',
  platformFeeRate = DEFAULT_PLATFORM_FEE_RATE,
  hubPaysFee = false,
): TransferAmountResult {
  return calculateTransferAmount(amount, currency, platformFeeRate, hubPaysFee);
}

/**
 * Format currency amount for display
 *
 * @param amount - Amount to format
 * @param currency - ISO currency code
 * @returns Formatted string (e.g., "RM 100.00")
 */
export function formatCurrency(amount: number, currency = 'MYR'): string {
  const currencySymbols: Record<string, string> = {
    MYR: 'RM',
    USD: '$',
    SGD: 'SGD',
    EUR: '€',
    GBP: '£',
  };

  const symbol = currencySymbols[currency.toUpperCase()] || currency;
  return `${symbol} ${amount.toFixed(2)}`;
}
