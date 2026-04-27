/**
 * Stripe Region Utilities
 *
 * Multi-region Stripe account support:
 * - Malaysian hubs/users → Malaysia Stripe account
 * - All other hubs/users → Atlas/global Stripe account
 */

/**
 * Supported Stripe regions
 */
export type StripeRegion = 'malaysia' | 'atlas';

/**
 * Malaysia country codes (ISO 3166-1 alpha-2 and common names)
 */
const MALAYSIA_CODES = new Set([
  'my',
  'malaysia',
  'mys', // ISO 3166-1 alpha-3
]);

/**
 * Determine Stripe region based on country
 *
 * @param country - Country name or ISO code
 * @returns 'malaysia' for Malaysian entities, 'atlas' for all others
 */
export function getStripeRegion(country?: string | null): StripeRegion {
  if (!country) return 'atlas';

  const normalized = country.toLowerCase().trim();
  return MALAYSIA_CODES.has(normalized) ? 'malaysia' : 'atlas';
}

/**
 * Get Stripe country code for Connect account creation
 * Maps region to appropriate country code for Stripe
 *
 * @param country - Original country from location
 * @param region - Stripe region
 * @returns ISO 2-letter country code
 */
export function getStripeCountryCode(country?: string | null): string {
  if (!country) return 'SG'; // Default to Singapore for Atlas

  const normalized = country.toLowerCase().trim();

  // Common country mappings
  const countryMappings: Record<string, string> = {
    malaysia: 'MY',
    my: 'MY',
    mys: 'MY',
    singapore: 'SG',
    sg: 'SG',
    sgp: 'SG',
    indonesia: 'ID',
    id: 'ID',
    idn: 'ID',
    thailand: 'TH',
    th: 'TH',
    tha: 'TH',
    vietnam: 'VN',
    vn: 'VN',
    vnm: 'VN',
    philippines: 'PH',
    ph: 'PH',
    phl: 'PH',
    'hong kong': 'HK',
    hk: 'HK',
    hkg: 'HK',
    japan: 'JP',
    jp: 'JP',
    jpn: 'JP',
    'south korea': 'KR',
    korea: 'KR',
    kr: 'KR',
    kor: 'KR',
    australia: 'AU',
    au: 'AU',
    aus: 'AU',
    'new zealand': 'NZ',
    nz: 'NZ',
    nzl: 'NZ',
    india: 'IN',
    in: 'IN',
    ind: 'IN',
    'united states': 'US',
    usa: 'US',
    us: 'US',
    'united kingdom': 'GB',
    uk: 'GB',
    gb: 'GB',
    gbr: 'GB',
  };

  return countryMappings[normalized] || 'SG'; // Default to Singapore for unrecognized
}

/**
 * Check if a country uses Malaysia Stripe region
 *
 * @param country - Country name or ISO code
 * @returns true if country should use Malaysia Stripe account
 */
export function isMalaysiaRegion(country?: string | null): boolean {
  return getStripeRegion(country) === 'malaysia';
}

/**
 * Get region-specific currency
 * Returns the default currency for a Stripe region
 *
 * @param region - Stripe region
 * @returns Default currency code
 */
export function getRegionCurrency(region: StripeRegion): string {
  return region === 'malaysia' ? 'MYR' : 'USD';
}

/**
 * Validate that a Stripe region value is valid
 *
 * @param region - Value to validate
 * @returns true if valid StripeRegion
 */
export function isValidStripeRegion(region: unknown): region is StripeRegion {
  return region === 'malaysia' || region === 'atlas';
}

/**
 * Get region from entity with stripeRegion and location
 * Prioritizes stored stripeRegion, falls back to location-based detection
 *
 * @param entity - Entity with optional stripeRegion and location
 * @returns Stripe region
 */
export function getEntityRegion(entity: {
  stripeRegion?: string | null;
  location?: { country?: string | null } | null;
}): StripeRegion {
  // Use stored region if valid
  if (entity.stripeRegion && isValidStripeRegion(entity.stripeRegion)) {
    return entity.stripeRegion;
  }

  // Fall back to location-based detection
  return getStripeRegion(entity.location?.country);
}
