/**
 * Admin App - Dev Environment (RKE2 - mereka.dev)
 * Extends common environment configuration
 */
import {
  API_CONFIG_DEV,
  APP_URLS_DEV,
  FIREBASE_CONFIG_DEV,
} from '../../../mereka/environments/common-environment.dev';

export const environment = {
  production: false,
  ...API_CONFIG_DEV,
  appUrls: APP_URLS_DEV,
  firebase: FIREBASE_CONFIG_DEV,
};
