/**
 * Web App - Dev Environment (RKE2 - mereka.dev)
 * Extends common environment configuration
 */
import {
  API_CONFIG_DEV,
  APP_URLS_DEV,
  GOOGLE_MAPS_CONFIG_DEV,
} from '../../../mereka/environments/common-environment.dev';

export const environment = {
  production: false,
  ...API_CONFIG_DEV,
  appUrls: APP_URLS_DEV,
  google: {
    maps: GOOGLE_MAPS_CONFIG_DEV,
  },
};
