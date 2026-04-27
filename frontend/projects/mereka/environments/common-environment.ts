/**
 * Common Development Environment Configuration
 * Shared across all projects in the workspace
 */

// API Configuration
export const API_CONFIG = {
  apiUrl: 'http://localhost:4000/api/v1',
  apiBaseUrl: 'http://localhost:4000',
};

// Frontend App URLs
export const APP_URLS = {
  auth: 'http://localhost:4201',
  app: 'http://localhost:4202',
  web: 'http://localhost:4200',
  admin: 'http://localhost:4204',
  checkout: 'http://localhost:4203',
};

// Allowed redirect domains (for security validation)
export const ALLOWED_REDIRECT_DOMAINS = [
  'localhost:4200',
  'localhost:4201',
  'localhost:4202',
  'localhost:4203',
  'localhost:4204',
  'localhost:4000',
];

// Default redirect after login by user type
export const DEFAULT_REDIRECTS = {
  learner: 'http://localhost:4200',
  hub: 'http://localhost:4200',
};

// Onboarding redirect after signup by user type
export const ONBOARDING_REDIRECTS = {
  learner: 'http://localhost:4202/onboarding/learner',
  hub: 'http://localhost:4202/onboarding/hub',
};

// Firebase Configuration (Development - mereka-dev)
export const FIREBASE_CONFIG = {
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
export const GOOGLE_MAPS_CONFIG = {
  apiKey: 'AIzaSyBxyoaBjlphHZ6OvZf5sy43FMzbWxmYYOQ',
  timeZoneApiKey: 'AIzaSyCKlVT3tPGDFoiuhoFXHdW7unSS_6sP8TA',
};

// Algolia Search Configuration
export const ALGOLIA_CONFIG = {
  applicationId: 'P0ITYJAOVO',
  apiKey: '4ae513a5e8753428caf9e399479f5e57',
};

// Google Analytics
export const ANALYTICS_CONFIG = {
  gtmId: 'GTM-5LKKB5G',
  facebookPixelId: '1387015088824379',
};

// Sentry Configuration
export const SENTRY_CONFIG = {
  dsn: 'https://a5e207c08ccf41e0b1443ade265f9927@o1248310.ingest.sentry.io/6428210',
};

/**
 * Combined common environment for development
 */
export const commonEnvironment = {
  production: false,
  ...API_CONFIG,
  appUrls: APP_URLS,
  allowedRedirectDomains: ALLOWED_REDIRECT_DOMAINS,
  defaultRedirects: DEFAULT_REDIRECTS,
  firebase: FIREBASE_CONFIG,
  google: {
    maps: GOOGLE_MAPS_CONFIG,
    analytics: ANALYTICS_CONFIG.gtmId,
  },
  algolia: ALGOLIA_CONFIG,
  sentry: SENTRY_CONFIG,
};
