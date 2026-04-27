/**
 * Common Production Environment Configuration (Deployed to GKE)
 * Domain: *.mereka.io
 * Shared across all projects in the workspace
 */

// API Configuration
export const API_CONFIG_PROD = {
  apiUrl: 'https://api.mereka.io/api/v1',
  apiBaseUrl: 'https://api.mereka.io',
};

// Frontend App URLs
export const APP_URLS_PROD = {
  auth: 'https://v2.auth.mereka.io',
  app: 'https://v2.app.mereka.io',
  web: 'https://v2.mereka.io',
  admin: 'https://v2.admin.mereka.io',
  checkout: 'https://v2.checkout.mereka.io',
};

// Allowed redirect domains (for security validation)
export const ALLOWED_REDIRECT_DOMAINS_PROD = [
  'mereka.io',
  'v2.mereka.io',
  'v2.app.mereka.io',
  'v2.auth.mereka.io',
  'v2.admin.mereka.io',
  'v2.checkout.mereka.io',
  'api.mereka.io',
  // Legacy domains for backward compatibility
  'app.mereka.io',
  'auth.mereka.io',
  'checkout.mereka.io',
  'admin.mereka.io',
];

// Default redirect after login by user type
export const DEFAULT_REDIRECTS_PROD = {
  learner: 'https://v2.mereka.io',
  hub: 'https://v2.mereka.io',
};

// Onboarding redirect after signup by user type
export const ONBOARDING_REDIRECTS_PROD = {
  learner: 'https://v2.app.mereka.io/onboarding/learner',
  hub: 'https://v2.app.mereka.io/onboarding/hub',
};

// Firebase Configuration (Production - using mereka-dev for both environments)
export const FIREBASE_CONFIG_PROD = {
  apiKey: 'AIzaSyCf_h31R2MVvIkl9B6a09g-Ph18vasHf0U',
  authDomain: 'mereka-dev.firebaseapp.com',
  databaseURL: 'https://mereka-dev-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'mereka-dev',
  storageBucket: 'mereka-dev.appspot.com',
  messagingSenderId: '743941526599',
  appId: '1:743941526599:web:7d774cb554167b6ca20d62',
  measurementId: 'G-3KEHNXC6XG',
};

// Google Maps Configuration
export const GOOGLE_MAPS_CONFIG_PROD = {
  apiKey: 'AIzaSyBxyoaBjlphHZ6OvZf5sy43FMzbWxmYYOQ',
  timeZoneApiKey: 'AIzaSyCKlVT3tPGDFoiuhoFXHdW7unSS_6sP8TA',
};

// Algolia Search Configuration
export const ALGOLIA_CONFIG_PROD = {
  applicationId: 'P0ITYJAOVO',
  apiKey: '4ae513a5e8753428caf9e399479f5e57',
};

// Google Analytics
export const ANALYTICS_CONFIG_PROD = {
  gtmId: 'GTM-5LKKB5G',
  facebookPixelId: '1387015088824379',
};

// Sentry Configuration
export const SENTRY_CONFIG_PROD = {
  dsn: 'https://a5e207c08ccf41e0b1443ade265f9927@o1248310.ingest.sentry.io/6428210',
};

/**
 * Combined common environment for production deployment
 */
export const commonEnvironmentProd = {
  production: true,
  ...API_CONFIG_PROD,
  appUrls: APP_URLS_PROD,
  allowedRedirectDomains: ALLOWED_REDIRECT_DOMAINS_PROD,
  defaultRedirects: DEFAULT_REDIRECTS_PROD,
  firebase: FIREBASE_CONFIG_PROD,
  google: {
    maps: GOOGLE_MAPS_CONFIG_PROD,
    analytics: ANALYTICS_CONFIG_PROD.gtmId,
  },
  algolia: ALGOLIA_CONFIG_PROD,
  sentry: SENTRY_CONFIG_PROD,
};
