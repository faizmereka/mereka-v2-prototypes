import { config } from 'dotenv';

// Load environment variables
config();

// Validation helper functions
function validateRequired(name: string, value: string | undefined): string {
  if (!value || value.trim() === '') {
    throw new Error(`Environment variable ${name} is required`);
  }
  return value;
}

function validateMinLength(name: string, value: string, minLength: number): string {
  if (value.length < minLength) {
    throw new Error(`${name} must be at least ${minLength} characters`);
  }
  return value;
}

function validateEnum<T extends string>(
  name: string,
  value: string | undefined,
  allowedValues: readonly T[],
  defaultValue: T,
): T {
  if (!value) return defaultValue;
  if (!allowedValues.includes(value as T)) {
    throw new Error(`${name} must be one of: ${allowedValues.join(', ')}`);
  }
  return value as T;
}

function validateUrl(name: string, value: string): string {
  try {
    new URL(value);
    return value;
  } catch {
    throw new Error(`${name} must be a valid URL`);
  }
}

// Environment configuration interface
interface EnvConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  HOST: string;
  MONGODB_URI: string;
  MONGODB_TEST_URI?: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_ACCESS_TOKEN_EXPIRES?: string;
  JWT_REFRESH_TOKEN_EXPIRES?: string;
  JWT_REFRESH_SECRET?: string;
  LOG_LEVEL: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';
  LOG_FILE: string;
  API_PREFIX: string;
  DEFAULT_PAGE_SIZE: number;
  MAX_PAGE_SIZE: number;
  // Firebase (optional - auth won't work without these)
  FIREBASE_PROJECT_ID?: string;
  FIREBASE_CLIENT_EMAIL?: string;
  FIREBASE_PRIVATE_KEY?: string;
  AUTH_DOMAIN?: string;
  APP_DOMAIN?: string;
  // Frontend URLs (for invitation links, redirects, etc.)
  AUTH_URL: string;
  APP_URL: string;
  WEB_URL: string;
  // Stripe Multi-Region Configuration
  // Malaysia Stripe Account
  STRIPE_MY_SECRET_KEY: string;
  STRIPE_MY_WEBHOOK_SECRET: string;
  STRIPE_MY_PUBLISHABLE_KEY: string;
  // Atlas/Global Stripe Account (default + subscriptions)
  STRIPE_ATLAS_SECRET_KEY: string;
  STRIPE_ATLAS_WEBHOOK_SECRET: string;
  STRIPE_ATLAS_PUBLISHABLE_KEY: string;
  // Computed properties
  isDevelopment: boolean;
  isProduction: boolean;
  isTest: boolean;
}

// Validation errors collector
const errors: string[] = [];

function safeValidate<T>(fn: () => T, fallback?: T): T | undefined {
  try {
    return fn();
  } catch (error) {
    if (error instanceof Error) {
      errors.push(error.message);
    }
    return fallback;
  }
}

// Validate all environment variables
const NODE_ENV_VALUES = ['development', 'production', 'test'] as const;
const LOG_LEVEL_VALUES = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'] as const;

const nodeEnv = safeValidate(
  () => validateEnum('NODE_ENV', process.env.NODE_ENV, NODE_ENV_VALUES, 'development'),
  'development',
);

const mongodbUri = safeValidate(() => {
  const uri = validateRequired('MONGODB_URI', process.env.MONGODB_URI);
  return validateUrl('MONGODB_URI', uri);
});

const mongodbTestUri = process.env.MONGODB_TEST_URI
  ? safeValidate(() => validateUrl('MONGODB_TEST_URI', process.env.MONGODB_TEST_URI || ''))
  : undefined;

const jwtSecret = safeValidate(() => {
  const secret = validateRequired('JWT_SECRET', process.env.JWT_SECRET);
  return validateMinLength('JWT_SECRET', secret, 32);
});

const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET
  ? safeValidate(() =>
      validateMinLength('JWT_REFRESH_SECRET', process.env.JWT_REFRESH_SECRET || '', 32),
    )
  : undefined;

const logLevel = safeValidate(
  () => validateEnum('LOG_LEVEL', process.env.LOG_LEVEL, LOG_LEVEL_VALUES, 'info'),
  'info',
);

// Multi-region Stripe validation
const stripeMySecretKey = safeValidate(() => {
  const key = process.env.STRIPE_MY_SECRET_KEY;
  return key ? validateMinLength('STRIPE_MY_SECRET_KEY', key, 1) : '';
}, '');

const stripeMyWebhookSecret = safeValidate(() => {
  const secret = process.env.STRIPE_MY_WEBHOOK_SECRET;
  return secret ? validateMinLength('STRIPE_MY_WEBHOOK_SECRET', secret, 1) : '';
}, '');

const stripeMyPublishableKey = safeValidate(() => {
  const key = process.env.STRIPE_MY_PUBLISHABLE_KEY;
  return key ? validateMinLength('STRIPE_MY_PUBLISHABLE_KEY', key, 1) : '';
}, '');

const stripeAtlasSecretKey = safeValidate(() => {
  const key = process.env.STRIPE_ATLAS_SECRET_KEY;
  return key ? validateMinLength('STRIPE_ATLAS_SECRET_KEY', key, 1) : '';
}, '');

const stripeAtlasWebhookSecret = safeValidate(() => {
  const secret = process.env.STRIPE_ATLAS_WEBHOOK_SECRET;
  return secret ? validateMinLength('STRIPE_ATLAS_WEBHOOK_SECRET', secret, 1) : '';
}, '');

const stripeAtlasPublishableKey = safeValidate(() => {
  const key = process.env.STRIPE_ATLAS_PUBLISHABLE_KEY;
  return key ? validateMinLength('STRIPE_ATLAS_PUBLISHABLE_KEY', key, 1) : '';
}, '');

// If any validation errors occurred, throw them all
if (errors.length > 0) {
  console.error('❌ Invalid environment variables:');
  for (const error of errors) {
    console.error(`  - ${error}`);
  }
  throw new Error('Invalid environment variables');
}

// Parse numeric values
const portStr = process.env.PORT || '3000';
const defaultPageSizeStr = process.env.DEFAULT_PAGE_SIZE || '20';
const maxPageSizeStr = process.env.MAX_PAGE_SIZE || '100';

// Export typed environment
export const env: EnvConfig = {
  NODE_ENV: nodeEnv as EnvConfig['NODE_ENV'],
  PORT: Number.parseInt(portStr, 10),
  HOST: process.env.HOST || '0.0.0.0',
  MONGODB_URI: mongodbUri as string,
  MONGODB_TEST_URI: mongodbTestUri,
  JWT_SECRET: jwtSecret as string,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '30d',
  JWT_ACCESS_TOKEN_EXPIRES: process.env.JWT_ACCESS_TOKEN_EXPIRES || '30d',
  JWT_REFRESH_TOKEN_EXPIRES: process.env.JWT_REFRESH_TOKEN_EXPIRES || '90d',
  JWT_REFRESH_SECRET: jwtRefreshSecret,
  LOG_LEVEL: logLevel as EnvConfig['LOG_LEVEL'],
  LOG_FILE: process.env.LOG_FILE || './logs/app.log',
  API_PREFIX: process.env.API_PREFIX || '/api/v1',
  DEFAULT_PAGE_SIZE: Number.parseInt(defaultPageSizeStr, 10),
  MAX_PAGE_SIZE: Number.parseInt(maxPageSizeStr, 10),
  // Firebase (optional)
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
  AUTH_DOMAIN: process.env.AUTH_DOMAIN || 'auth.mereka.io',
  APP_DOMAIN: process.env.APP_DOMAIN || 'app.mereka.io',
  // Frontend URLs
  AUTH_URL: process.env.AUTH_URL || 'http://localhost:4201',
  APP_URL: process.env.APP_URL || 'http://localhost:4202',
  WEB_URL: process.env.WEB_URL || 'http://localhost:4200',
  // Stripe Multi-Region Configuration
  // Malaysia Stripe Account
  STRIPE_MY_SECRET_KEY: stripeMySecretKey as string,
  STRIPE_MY_WEBHOOK_SECRET: stripeMyWebhookSecret as string,
  STRIPE_MY_PUBLISHABLE_KEY: stripeMyPublishableKey as string,
  // Atlas/Global Stripe Account (default + subscriptions)
  STRIPE_ATLAS_SECRET_KEY: stripeAtlasSecretKey as string,
  STRIPE_ATLAS_WEBHOOK_SECRET: stripeAtlasWebhookSecret as string,
  STRIPE_ATLAS_PUBLISHABLE_KEY: stripeAtlasPublishableKey as string,
  // Computed properties
  isDevelopment: nodeEnv === 'development',
  isProduction: nodeEnv === 'production',
  isTest: nodeEnv === 'test',
};

export type Env = typeof env;
