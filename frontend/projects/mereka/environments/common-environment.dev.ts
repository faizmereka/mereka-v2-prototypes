/**
 * Common Development Environment Configuration (Deployed to RKE2)
 * Domain: *.mereka.dev
 * Shared across all projects in the workspace
 */

// API Configuration
export const API_CONFIG_DEV = {
  apiUrl: 'https://api.mereka.dev/api/v1',
  apiBaseUrl: 'https://api.mereka.dev',
};

// Frontend App URLs
export const APP_URLS_DEV = {
  auth: 'https://v2.auth.mereka.dev',
  app: 'https://v2.app.mereka.dev',
  web: 'https://v2.mereka.dev',
  admin: 'https://v2.admin.mereka.dev',
  checkout: 'https://v2.checkout.mereka.dev',
};

// Allowed redirect domains (for security validation)
export const ALLOWED_REDIRECT_DOMAINS_DEV = [
  'mereka.dev',
  'v2.mereka.dev',
  'v2.app.mereka.dev',
  'v2.auth.mereka.dev',
  'v2.admin.mereka.dev',
  'v2.checkout.mereka.dev',
  'api.mereka.dev',
];

// Default redirect after login by user type
export const DEFAULT_REDIRECTS_DEV = {
  learner: 'https://v2.mereka.dev',
  hub: 'https://v2.mereka.dev',
};

// Onboarding redirect after signup by user type
export const ONBOARDING_REDIRECTS_DEV = {
  learner: 'https://v2.app.mereka.dev/onboarding/learner',
  hub: 'https://v2.app.mereka.dev/onboarding/hub',
};

// Firebase Configuration (Development - mereka-dev)
export const FIREBASE_CONFIG_DEV = {
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
export const GOOGLE_MAPS_CONFIG_DEV = {
  apiKey: 'AIzaSyBxyoaBjlphHZ6OvZf5sy43FMzbWxmYYOQ',
  timeZoneApiKey: 'AIzaSyCKlVT3tPGDFoiuhoFXHdW7unSS_6sP8TA',
};

// Algolia Search Configuration
export const ALGOLIA_CONFIG_DEV = {
  applicationId: 'P0ITYJAOVO',
  apiKey: '4ae513a5e8753428caf9e399479f5e57',
};

// Google Analytics
export const ANALYTICS_CONFIG_DEV = {
  gtmId: 'GTM-5LKKB5G',
  facebookPixelId: '1387015088824379',
};

// Sentry Configuration
export const SENTRY_CONFIG_DEV = {
  dsn: 'https://a5e207c08ccf41e0b1443ade265f9927@o1248310.ingest.sentry.io/6428210',
};

/**
 * Combined common environment for dev deployment
 */
export const commonEnvironmentDev = {
  production: false,
  ...API_CONFIG_DEV,
  appUrls: APP_URLS_DEV,
  allowedRedirectDomains: ALLOWED_REDIRECT_DOMAINS_DEV,
  defaultRedirects: DEFAULT_REDIRECTS_DEV,
  firebase: FIREBASE_CONFIG_DEV,
  google: {
    maps: GOOGLE_MAPS_CONFIG_DEV,
    analytics: ANALYTICS_CONFIG_DEV.gtmId,
  },
  algolia: ALGOLIA_CONFIG_DEV,
  sentry: SENTRY_CONFIG_DEV,
};
