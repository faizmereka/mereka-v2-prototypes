/**
 * App - Development Environment
 * Extends common environment configuration
 */
import {
  API_CONFIG,
  APP_URLS,
  FIREBASE_CONFIG,
  GOOGLE_MAPS_CONFIG,
} from '../../../mereka/environments/common-environment';

export const environment = {
  production: false,
  ...API_CONFIG,
  authUrl: APP_URLS.auth,
  appUrl: APP_URLS.app,
  webUrl: APP_URLS.web,
  checkoutUrl: APP_URLS.checkout,
  firebase: FIREBASE_CONFIG,
  google: {
    maps: GOOGLE_MAPS_CONFIG,
  },
};
