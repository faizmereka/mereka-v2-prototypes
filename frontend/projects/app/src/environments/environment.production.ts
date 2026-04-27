/**
 * App - Production Environment
 * Uses common production environment configuration
 */
import {
  API_CONFIG_PROD,
  APP_URLS_PROD,
  FIREBASE_CONFIG_PROD,
  GOOGLE_MAPS_CONFIG_PROD,
} from '../../../mereka/environments/common-environment.prod';

export const environment = {
  production: true,
  ...API_CONFIG_PROD,
  authUrl: APP_URLS_PROD.auth,
  appUrl: APP_URLS_PROD.app,
  webUrl: APP_URLS_PROD.web,
  checkoutUrl: APP_URLS_PROD.checkout,
  firebase: FIREBASE_CONFIG_PROD,
  google: {
    maps: GOOGLE_MAPS_CONFIG_PROD,
  },
};
