/**
 * Main App - Dev Environment (RKE2 - mereka.dev)
 * Extends common environment configuration
 */
import {
  API_CONFIG_DEV,
  APP_URLS_DEV,
  FIREBASE_CONFIG_DEV,
  GOOGLE_MAPS_CONFIG_DEV,
} from '../../../mereka/environments/common-environment.dev';

export const environment = {
  production: false,
  ...API_CONFIG_DEV,
  authUrl: APP_URLS_DEV.auth,
  appUrl: APP_URLS_DEV.app,
  webUrl: APP_URLS_DEV.web,
  checkoutUrl: APP_URLS_DEV.checkout,
  firebase: FIREBASE_CONFIG_DEV,
  google: {
    maps: GOOGLE_MAPS_CONFIG_DEV,
  },
};
