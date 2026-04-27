/**
 * Admin App - Production Environment (GKE - mereka.io)
 * Extends common environment configuration
 */
import {
  API_CONFIG_PROD,
  APP_URLS_PROD,
  FIREBASE_CONFIG_PROD,
} from '../../../mereka/environments/common-environment.prod';

export const environment = {
  production: true,
  ...API_CONFIG_PROD,
  appUrls: APP_URLS_PROD,
  firebase: FIREBASE_CONFIG_PROD,
};

