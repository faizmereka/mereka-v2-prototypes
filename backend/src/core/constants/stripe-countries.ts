/**
 * Stripe supported countries with ISO codes and currencies
 * Used for Stripe Connect account creation
 *
 * Reference: https://stripe.com/global
 * Last updated: 2025-01
 */

export interface StripeCountryConfig {
  isoCode: string; // ISO 3166-1 alpha-2
  currency: string; // ISO 4217 currency code
  name: string;
  /**
   * Supported Stripe Connect capabilities for this country
   * - 'full': Supports card_payments + transfers (most countries)
   * - 'transfers_only': Only supports transfers (cross-border payouts countries like ID, PH, etc.)
   *
   * See: https://stripe.com/docs/connect/cross-border-payouts
   */
  capabilities: 'full' | 'transfers_only';
}

/**
 * Country name to Stripe configuration mapping
 * Comprehensive list of Stripe Connect supported countries
 *
 * capabilities:
 * - 'full': card_payments + transfers (can accept payments directly)
 * - 'transfers_only': only transfers/payouts (cross-border payouts countries)
 *
 * Reference: https://stripe.com/docs/connect/cross-border-payouts
 */
export const STRIPE_COUNTRY_CONFIG: Record<string, StripeCountryConfig> = {
  // ============================================
  // ASIA PACIFIC
  // ============================================

  // Southeast Asia
  Malaysia: { isoCode: 'MY', currency: 'MYR', name: 'Malaysia', capabilities: 'full' },
  Singapore: { isoCode: 'SG', currency: 'SGD', name: 'Singapore', capabilities: 'full' },
  Thailand: { isoCode: 'TH', currency: 'THB', name: 'Thailand', capabilities: 'full' },
  Indonesia: { isoCode: 'ID', currency: 'IDR', name: 'Indonesia', capabilities: 'transfers_only' },
  Philippines: {
    isoCode: 'PH',
    currency: 'PHP',
    name: 'Philippines',
    capabilities: 'transfers_only',
  },
  Vietnam: { isoCode: 'VN', currency: 'VND', name: 'Vietnam', capabilities: 'transfers_only' },
  Brunei: { isoCode: 'BN', currency: 'BND', name: 'Brunei', capabilities: 'transfers_only' },
  Cambodia: { isoCode: 'KH', currency: 'USD', name: 'Cambodia', capabilities: 'transfers_only' },

  // East Asia
  Japan: { isoCode: 'JP', currency: 'JPY', name: 'Japan', capabilities: 'full' },
  'Hong Kong': { isoCode: 'HK', currency: 'HKD', name: 'Hong Kong', capabilities: 'full' },
  'South Korea': {
    isoCode: 'KR',
    currency: 'KRW',
    name: 'South Korea',
    capabilities: 'transfers_only',
  },
  Taiwan: { isoCode: 'TW', currency: 'TWD', name: 'Taiwan', capabilities: 'transfers_only' },
  China: { isoCode: 'CN', currency: 'CNY', name: 'China', capabilities: 'transfers_only' },
  Macau: { isoCode: 'MO', currency: 'MOP', name: 'Macau', capabilities: 'transfers_only' },

  // South Asia
  India: { isoCode: 'IN', currency: 'INR', name: 'India', capabilities: 'full' },
  Bangladesh: {
    isoCode: 'BD',
    currency: 'BDT',
    name: 'Bangladesh',
    capabilities: 'transfers_only',
  },
  Pakistan: { isoCode: 'PK', currency: 'PKR', name: 'Pakistan', capabilities: 'transfers_only' },
  'Sri Lanka': {
    isoCode: 'LK',
    currency: 'LKR',
    name: 'Sri Lanka',
    capabilities: 'transfers_only',
  },
  Nepal: { isoCode: 'NP', currency: 'NPR', name: 'Nepal', capabilities: 'transfers_only' },

  // Oceania
  Australia: { isoCode: 'AU', currency: 'AUD', name: 'Australia', capabilities: 'full' },
  'New Zealand': { isoCode: 'NZ', currency: 'NZD', name: 'New Zealand', capabilities: 'full' },
  Fiji: { isoCode: 'FJ', currency: 'FJD', name: 'Fiji', capabilities: 'transfers_only' },

  // ============================================
  // EUROPE
  // ============================================

  // Western Europe
  'United Kingdom': {
    isoCode: 'GB',
    currency: 'GBP',
    name: 'United Kingdom',
    capabilities: 'full',
  },
  Ireland: { isoCode: 'IE', currency: 'EUR', name: 'Ireland', capabilities: 'full' },
  France: { isoCode: 'FR', currency: 'EUR', name: 'France', capabilities: 'full' },
  Germany: { isoCode: 'DE', currency: 'EUR', name: 'Germany', capabilities: 'full' },
  Netherlands: { isoCode: 'NL', currency: 'EUR', name: 'Netherlands', capabilities: 'full' },
  Belgium: { isoCode: 'BE', currency: 'EUR', name: 'Belgium', capabilities: 'full' },
  Luxembourg: { isoCode: 'LU', currency: 'EUR', name: 'Luxembourg', capabilities: 'full' },
  Monaco: { isoCode: 'MC', currency: 'EUR', name: 'Monaco', capabilities: 'transfers_only' },

  // Northern Europe
  Sweden: { isoCode: 'SE', currency: 'SEK', name: 'Sweden', capabilities: 'full' },
  Norway: { isoCode: 'NO', currency: 'NOK', name: 'Norway', capabilities: 'full' },
  Denmark: { isoCode: 'DK', currency: 'DKK', name: 'Denmark', capabilities: 'full' },
  Finland: { isoCode: 'FI', currency: 'EUR', name: 'Finland', capabilities: 'full' },
  Iceland: { isoCode: 'IS', currency: 'ISK', name: 'Iceland', capabilities: 'transfers_only' },
  Estonia: { isoCode: 'EE', currency: 'EUR', name: 'Estonia', capabilities: 'full' },
  Latvia: { isoCode: 'LV', currency: 'EUR', name: 'Latvia', capabilities: 'full' },
  Lithuania: { isoCode: 'LT', currency: 'EUR', name: 'Lithuania', capabilities: 'full' },

  // Southern Europe
  Spain: { isoCode: 'ES', currency: 'EUR', name: 'Spain', capabilities: 'full' },
  Portugal: { isoCode: 'PT', currency: 'EUR', name: 'Portugal', capabilities: 'full' },
  Italy: { isoCode: 'IT', currency: 'EUR', name: 'Italy', capabilities: 'full' },
  Greece: { isoCode: 'GR', currency: 'EUR', name: 'Greece', capabilities: 'full' },
  Malta: { isoCode: 'MT', currency: 'EUR', name: 'Malta', capabilities: 'full' },
  Cyprus: { isoCode: 'CY', currency: 'EUR', name: 'Cyprus', capabilities: 'full' },
  Gibraltar: { isoCode: 'GI', currency: 'GIP', name: 'Gibraltar', capabilities: 'full' },

  // Central Europe
  Austria: { isoCode: 'AT', currency: 'EUR', name: 'Austria', capabilities: 'full' },
  Switzerland: { isoCode: 'CH', currency: 'CHF', name: 'Switzerland', capabilities: 'full' },
  Liechtenstein: { isoCode: 'LI', currency: 'CHF', name: 'Liechtenstein', capabilities: 'full' },
  Poland: { isoCode: 'PL', currency: 'PLN', name: 'Poland', capabilities: 'full' },
  'Czech Republic': {
    isoCode: 'CZ',
    currency: 'CZK',
    name: 'Czech Republic',
    capabilities: 'full',
  },
  Czechia: { isoCode: 'CZ', currency: 'CZK', name: 'Czechia', capabilities: 'full' }, // Alias
  Slovakia: { isoCode: 'SK', currency: 'EUR', name: 'Slovakia', capabilities: 'full' },
  Hungary: { isoCode: 'HU', currency: 'HUF', name: 'Hungary', capabilities: 'full' },
  Slovenia: { isoCode: 'SI', currency: 'EUR', name: 'Slovenia', capabilities: 'full' },
  Croatia: { isoCode: 'HR', currency: 'EUR', name: 'Croatia', capabilities: 'full' },

  // Eastern Europe
  Romania: { isoCode: 'RO', currency: 'RON', name: 'Romania', capabilities: 'full' },
  Bulgaria: { isoCode: 'BG', currency: 'BGN', name: 'Bulgaria', capabilities: 'full' },
  Serbia: { isoCode: 'RS', currency: 'RSD', name: 'Serbia', capabilities: 'transfers_only' },
  'Bosnia and Herzegovina': {
    isoCode: 'BA',
    currency: 'BAM',
    name: 'Bosnia and Herzegovina',
    capabilities: 'transfers_only',
  },
  Montenegro: {
    isoCode: 'ME',
    currency: 'EUR',
    name: 'Montenegro',
    capabilities: 'transfers_only',
  },
  'North Macedonia': {
    isoCode: 'MK',
    currency: 'MKD',
    name: 'North Macedonia',
    capabilities: 'transfers_only',
  },
  Albania: { isoCode: 'AL', currency: 'ALL', name: 'Albania', capabilities: 'transfers_only' },
  Kosovo: { isoCode: 'XK', currency: 'EUR', name: 'Kosovo', capabilities: 'transfers_only' },
  Moldova: { isoCode: 'MD', currency: 'MDL', name: 'Moldova', capabilities: 'transfers_only' },
  Ukraine: { isoCode: 'UA', currency: 'UAH', name: 'Ukraine', capabilities: 'transfers_only' },

  // ============================================
  // AMERICAS
  // ============================================

  // North America
  'United States': { isoCode: 'US', currency: 'USD', name: 'United States', capabilities: 'full' },
  USA: { isoCode: 'US', currency: 'USD', name: 'United States', capabilities: 'full' }, // Alias
  Canada: { isoCode: 'CA', currency: 'CAD', name: 'Canada', capabilities: 'full' },
  Mexico: { isoCode: 'MX', currency: 'MXN', name: 'Mexico', capabilities: 'full' },

  // Central America
  'Costa Rica': {
    isoCode: 'CR',
    currency: 'CRC',
    name: 'Costa Rica',
    capabilities: 'transfers_only',
  },
  Panama: { isoCode: 'PA', currency: 'USD', name: 'Panama', capabilities: 'transfers_only' },
  Guatemala: { isoCode: 'GT', currency: 'GTQ', name: 'Guatemala', capabilities: 'transfers_only' },
  'El Salvador': {
    isoCode: 'SV',
    currency: 'USD',
    name: 'El Salvador',
    capabilities: 'transfers_only',
  },
  Honduras: { isoCode: 'HN', currency: 'HNL', name: 'Honduras', capabilities: 'transfers_only' },
  Nicaragua: { isoCode: 'NI', currency: 'NIO', name: 'Nicaragua', capabilities: 'transfers_only' },
  Belize: { isoCode: 'BZ', currency: 'BZD', name: 'Belize', capabilities: 'transfers_only' },

  // Caribbean
  'Puerto Rico': { isoCode: 'PR', currency: 'USD', name: 'Puerto Rico', capabilities: 'full' },
  Jamaica: { isoCode: 'JM', currency: 'JMD', name: 'Jamaica', capabilities: 'transfers_only' },
  'Trinidad and Tobago': {
    isoCode: 'TT',
    currency: 'TTD',
    name: 'Trinidad and Tobago',
    capabilities: 'transfers_only',
  },
  Bahamas: { isoCode: 'BS', currency: 'BSD', name: 'Bahamas', capabilities: 'transfers_only' },
  Barbados: { isoCode: 'BB', currency: 'BBD', name: 'Barbados', capabilities: 'transfers_only' },
  'Dominican Republic': {
    isoCode: 'DO',
    currency: 'DOP',
    name: 'Dominican Republic',
    capabilities: 'transfers_only',
  },
  'Saint Lucia': {
    isoCode: 'LC',
    currency: 'XCD',
    name: 'Saint Lucia',
    capabilities: 'transfers_only',
  },
  'Saint Vincent and the Grenadines': {
    isoCode: 'VC',
    currency: 'XCD',
    name: 'Saint Vincent and the Grenadines',
    capabilities: 'transfers_only',
  },
  'Antigua and Barbuda': {
    isoCode: 'AG',
    currency: 'XCD',
    name: 'Antigua and Barbuda',
    capabilities: 'transfers_only',
  },
  Grenada: { isoCode: 'GD', currency: 'XCD', name: 'Grenada', capabilities: 'transfers_only' },
  'Saint Kitts and Nevis': {
    isoCode: 'KN',
    currency: 'XCD',
    name: 'Saint Kitts and Nevis',
    capabilities: 'transfers_only',
  },
  Dominica: { isoCode: 'DM', currency: 'XCD', name: 'Dominica', capabilities: 'transfers_only' },
  Curacao: { isoCode: 'CW', currency: 'ANG', name: 'Curacao', capabilities: 'transfers_only' },
  Aruba: { isoCode: 'AW', currency: 'AWG', name: 'Aruba', capabilities: 'transfers_only' },
  'Cayman Islands': {
    isoCode: 'KY',
    currency: 'KYD',
    name: 'Cayman Islands',
    capabilities: 'transfers_only',
  },
  'British Virgin Islands': {
    isoCode: 'VG',
    currency: 'USD',
    name: 'British Virgin Islands',
    capabilities: 'transfers_only',
  },
  Bermuda: { isoCode: 'BM', currency: 'BMD', name: 'Bermuda', capabilities: 'transfers_only' },

  // South America
  Brazil: { isoCode: 'BR', currency: 'BRL', name: 'Brazil', capabilities: 'full' },
  Argentina: { isoCode: 'AR', currency: 'ARS', name: 'Argentina', capabilities: 'transfers_only' },
  Chile: { isoCode: 'CL', currency: 'CLP', name: 'Chile', capabilities: 'transfers_only' },
  Colombia: { isoCode: 'CO', currency: 'COP', name: 'Colombia', capabilities: 'transfers_only' },
  Peru: { isoCode: 'PE', currency: 'PEN', name: 'Peru', capabilities: 'transfers_only' },
  Ecuador: { isoCode: 'EC', currency: 'USD', name: 'Ecuador', capabilities: 'transfers_only' },
  Uruguay: { isoCode: 'UY', currency: 'UYU', name: 'Uruguay', capabilities: 'transfers_only' },
  Paraguay: { isoCode: 'PY', currency: 'PYG', name: 'Paraguay', capabilities: 'transfers_only' },
  Bolivia: { isoCode: 'BO', currency: 'BOB', name: 'Bolivia', capabilities: 'transfers_only' },
  Venezuela: { isoCode: 'VE', currency: 'VES', name: 'Venezuela', capabilities: 'transfers_only' },
  Guyana: { isoCode: 'GY', currency: 'GYD', name: 'Guyana', capabilities: 'transfers_only' },
  Suriname: { isoCode: 'SR', currency: 'SRD', name: 'Suriname', capabilities: 'transfers_only' },

  // ============================================
  // MIDDLE EAST
  // ============================================
  'United Arab Emirates': {
    isoCode: 'AE',
    currency: 'AED',
    name: 'United Arab Emirates',
    capabilities: 'full',
  },
  UAE: { isoCode: 'AE', currency: 'AED', name: 'United Arab Emirates', capabilities: 'full' }, // Alias
  'Saudi Arabia': {
    isoCode: 'SA',
    currency: 'SAR',
    name: 'Saudi Arabia',
    capabilities: 'transfers_only',
  },
  Israel: { isoCode: 'IL', currency: 'ILS', name: 'Israel', capabilities: 'transfers_only' },
  Qatar: { isoCode: 'QA', currency: 'QAR', name: 'Qatar', capabilities: 'transfers_only' },
  Kuwait: { isoCode: 'KW', currency: 'KWD', name: 'Kuwait', capabilities: 'transfers_only' },
  Bahrain: { isoCode: 'BH', currency: 'BHD', name: 'Bahrain', capabilities: 'transfers_only' },
  Oman: { isoCode: 'OM', currency: 'OMR', name: 'Oman', capabilities: 'transfers_only' },
  Jordan: { isoCode: 'JO', currency: 'JOD', name: 'Jordan', capabilities: 'transfers_only' },
  Lebanon: { isoCode: 'LB', currency: 'LBP', name: 'Lebanon', capabilities: 'transfers_only' },
  Turkey: { isoCode: 'TR', currency: 'TRY', name: 'Turkey', capabilities: 'transfers_only' },

  // ============================================
  // AFRICA
  // ============================================

  // North Africa
  Egypt: { isoCode: 'EG', currency: 'EGP', name: 'Egypt', capabilities: 'transfers_only' },
  Morocco: { isoCode: 'MA', currency: 'MAD', name: 'Morocco', capabilities: 'transfers_only' },
  Tunisia: { isoCode: 'TN', currency: 'TND', name: 'Tunisia', capabilities: 'transfers_only' },
  Algeria: { isoCode: 'DZ', currency: 'DZD', name: 'Algeria', capabilities: 'transfers_only' },

  // West Africa
  Nigeria: { isoCode: 'NG', currency: 'NGN', name: 'Nigeria', capabilities: 'transfers_only' },
  Ghana: { isoCode: 'GH', currency: 'GHS', name: 'Ghana', capabilities: 'transfers_only' },
  Senegal: { isoCode: 'SN', currency: 'XOF', name: 'Senegal', capabilities: 'transfers_only' },
  'Ivory Coast': {
    isoCode: 'CI',
    currency: 'XOF',
    name: 'Ivory Coast',
    capabilities: 'transfers_only',
  },
  "Côte d'Ivoire": {
    isoCode: 'CI',
    currency: 'XOF',
    name: "Côte d'Ivoire",
    capabilities: 'transfers_only',
  }, // Alias
  Benin: { isoCode: 'BJ', currency: 'XOF', name: 'Benin', capabilities: 'transfers_only' },
  Togo: { isoCode: 'TG', currency: 'XOF', name: 'Togo', capabilities: 'transfers_only' },
  'Burkina Faso': {
    isoCode: 'BF',
    currency: 'XOF',
    name: 'Burkina Faso',
    capabilities: 'transfers_only',
  },
  Mali: { isoCode: 'ML', currency: 'XOF', name: 'Mali', capabilities: 'transfers_only' },
  Niger: { isoCode: 'NE', currency: 'XOF', name: 'Niger', capabilities: 'transfers_only' },
  'Guinea-Bissau': {
    isoCode: 'GW',
    currency: 'XOF',
    name: 'Guinea-Bissau',
    capabilities: 'transfers_only',
  },
  Guinea: { isoCode: 'GN', currency: 'GNF', name: 'Guinea', capabilities: 'transfers_only' },
  'Sierra Leone': {
    isoCode: 'SL',
    currency: 'SLE',
    name: 'Sierra Leone',
    capabilities: 'transfers_only',
  },
  Liberia: { isoCode: 'LR', currency: 'LRD', name: 'Liberia', capabilities: 'transfers_only' },
  Gambia: { isoCode: 'GM', currency: 'GMD', name: 'Gambia', capabilities: 'transfers_only' },
  'Cabo Verde': {
    isoCode: 'CV',
    currency: 'CVE',
    name: 'Cabo Verde',
    capabilities: 'transfers_only',
  },
  'Cape Verde': {
    isoCode: 'CV',
    currency: 'CVE',
    name: 'Cape Verde',
    capabilities: 'transfers_only',
  }, // Alias

  // Central Africa
  Cameroon: { isoCode: 'CM', currency: 'XAF', name: 'Cameroon', capabilities: 'transfers_only' },
  Gabon: { isoCode: 'GA', currency: 'XAF', name: 'Gabon', capabilities: 'transfers_only' },
  'Republic of the Congo': {
    isoCode: 'CG',
    currency: 'XAF',
    name: 'Republic of the Congo',
    capabilities: 'transfers_only',
  },
  Congo: { isoCode: 'CG', currency: 'XAF', name: 'Congo', capabilities: 'transfers_only' }, // Alias
  'Democratic Republic of the Congo': {
    isoCode: 'CD',
    currency: 'CDF',
    name: 'Democratic Republic of the Congo',
    capabilities: 'transfers_only',
  },
  'Central African Republic': {
    isoCode: 'CF',
    currency: 'XAF',
    name: 'Central African Republic',
    capabilities: 'transfers_only',
  },
  Chad: { isoCode: 'TD', currency: 'XAF', name: 'Chad', capabilities: 'transfers_only' },
  'Equatorial Guinea': {
    isoCode: 'GQ',
    currency: 'XAF',
    name: 'Equatorial Guinea',
    capabilities: 'transfers_only',
  },
  'São Tomé and Príncipe': {
    isoCode: 'ST',
    currency: 'STN',
    name: 'São Tomé and Príncipe',
    capabilities: 'transfers_only',
  },

  // East Africa
  Kenya: { isoCode: 'KE', currency: 'KES', name: 'Kenya', capabilities: 'transfers_only' },
  Tanzania: { isoCode: 'TZ', currency: 'TZS', name: 'Tanzania', capabilities: 'transfers_only' },
  Uganda: { isoCode: 'UG', currency: 'UGX', name: 'Uganda', capabilities: 'transfers_only' },
  Rwanda: { isoCode: 'RW', currency: 'RWF', name: 'Rwanda', capabilities: 'transfers_only' },
  Ethiopia: { isoCode: 'ET', currency: 'ETB', name: 'Ethiopia', capabilities: 'transfers_only' },
  Mauritius: { isoCode: 'MU', currency: 'MUR', name: 'Mauritius', capabilities: 'transfers_only' },
  Madagascar: {
    isoCode: 'MG',
    currency: 'MGA',
    name: 'Madagascar',
    capabilities: 'transfers_only',
  },
  Seychelles: {
    isoCode: 'SC',
    currency: 'SCR',
    name: 'Seychelles',
    capabilities: 'transfers_only',
  },
  Djibouti: { isoCode: 'DJ', currency: 'DJF', name: 'Djibouti', capabilities: 'transfers_only' },
  Comoros: { isoCode: 'KM', currency: 'KMF', name: 'Comoros', capabilities: 'transfers_only' },
  Burundi: { isoCode: 'BI', currency: 'BIF', name: 'Burundi', capabilities: 'transfers_only' },
  Malawi: { isoCode: 'MW', currency: 'MWK', name: 'Malawi', capabilities: 'transfers_only' },
  Mozambique: {
    isoCode: 'MZ',
    currency: 'MZN',
    name: 'Mozambique',
    capabilities: 'transfers_only',
  },
  Zambia: { isoCode: 'ZM', currency: 'ZMW', name: 'Zambia', capabilities: 'transfers_only' },
  Zimbabwe: { isoCode: 'ZW', currency: 'ZWL', name: 'Zimbabwe', capabilities: 'transfers_only' },

  // Southern Africa
  'South Africa': {
    isoCode: 'ZA',
    currency: 'ZAR',
    name: 'South Africa',
    capabilities: 'transfers_only',
  },
  Namibia: { isoCode: 'NA', currency: 'NAD', name: 'Namibia', capabilities: 'transfers_only' },
  Botswana: { isoCode: 'BW', currency: 'BWP', name: 'Botswana', capabilities: 'transfers_only' },
  Lesotho: { isoCode: 'LS', currency: 'LSL', name: 'Lesotho', capabilities: 'transfers_only' },
  Eswatini: { isoCode: 'SZ', currency: 'SZL', name: 'Eswatini', capabilities: 'transfers_only' },
  Swaziland: { isoCode: 'SZ', currency: 'SZL', name: 'Swaziland', capabilities: 'transfers_only' }, // Alias
  Angola: { isoCode: 'AO', currency: 'AOA', name: 'Angola', capabilities: 'transfers_only' },
};

/**
 * Default configuration (fallback)
 */
export const DEFAULT_STRIPE_COUNTRY: StripeCountryConfig = {
  isoCode: 'MY',
  currency: 'MYR',
  name: 'Malaysia',
  capabilities: 'full',
};

/**
 * Get Stripe country config by country name
 * Returns default (Malaysia) if country not found
 */
export function getStripeCountryConfig(countryName?: string): StripeCountryConfig {
  if (!countryName) {
    return DEFAULT_STRIPE_COUNTRY;
  }

  // Try exact match first
  const config = STRIPE_COUNTRY_CONFIG[countryName];
  if (config) {
    return config;
  }

  // Try case-insensitive match
  const normalizedName = countryName.trim();
  for (const [name, cfg] of Object.entries(STRIPE_COUNTRY_CONFIG)) {
    if (name.toLowerCase() === normalizedName.toLowerCase()) {
      return cfg;
    }
  }

  // Return default if not found
  return DEFAULT_STRIPE_COUNTRY;
}

/**
 * Get Stripe country config by ISO code
 * Returns default (Malaysia) if country not found
 */
export function getStripeCountryConfigByIsoCode(isoCode?: string): StripeCountryConfig {
  if (!isoCode) {
    return DEFAULT_STRIPE_COUNTRY;
  }

  const upperCode = isoCode.toUpperCase().trim();
  for (const cfg of Object.values(STRIPE_COUNTRY_CONFIG)) {
    if (cfg.isoCode === upperCode) {
      return cfg;
    }
  }

  return DEFAULT_STRIPE_COUNTRY;
}

/**
 * Get ISO country code from country name
 */
export function getCountryIsoCode(countryName?: string): string {
  return getStripeCountryConfig(countryName).isoCode;
}

/**
 * Get currency from country name
 */
export function getCountryCurrency(countryName?: string): string {
  return getStripeCountryConfig(countryName).currency;
}

/**
 * Check if a country is supported by Stripe Connect
 */
export function isStripeCountrySupported(countryName?: string): boolean {
  if (!countryName) {
    return false;
  }

  // Try exact match
  if (STRIPE_COUNTRY_CONFIG[countryName]) {
    return true;
  }

  // Try case-insensitive match
  const normalizedName = countryName.trim().toLowerCase();
  return Object.keys(STRIPE_COUNTRY_CONFIG).some((name) => name.toLowerCase() === normalizedName);
}

/**
 * Get all supported country names
 */
export function getAllSupportedCountries(): string[] {
  // Filter out aliases by checking for unique ISO codes
  const seen = new Set<string>();
  return Object.entries(STRIPE_COUNTRY_CONFIG)
    .filter(([_name, cfg]) => {
      if (seen.has(cfg.isoCode)) {
        return false;
      }
      seen.add(cfg.isoCode);
      return true;
    })
    .map(([name]) => name)
    .sort();
}

/**
 * Get all supported ISO codes
 */
export function getAllSupportedIsoCodes(): string[] {
  const codes = new Set<string>();
  for (const cfg of Object.values(STRIPE_COUNTRY_CONFIG)) {
    codes.add(cfg.isoCode);
  }
  return Array.from(codes).sort();
}

/**
 * Check if country supports full capabilities (card_payments + transfers)
 */
export function hasFullCapabilities(countryName?: string): boolean {
  return getStripeCountryConfig(countryName).capabilities === 'full';
}

/**
 * Get Stripe Connect capabilities object for account creation
 * Returns appropriate capabilities based on country support
 *
 * For 'full' countries: card_payments + transfers
 * For 'transfers_only' countries: only transfers (cross-border payouts)
 */
export function getStripeCapabilities(countryName?: string): {
  card_payments?: { requested: true };
  transfers: { requested: true };
} {
  const config = getStripeCountryConfig(countryName);

  if (config.capabilities === 'full') {
    return {
      card_payments: { requested: true },
      transfers: { requested: true },
    };
  }

  // transfers_only - cross-border payouts countries
  return {
    transfers: { requested: true },
  };
}
