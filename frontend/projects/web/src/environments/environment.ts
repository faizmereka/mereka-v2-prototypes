/**
 * Web App - Development Environment
 * Extends common environment configuration
 */
import {
  API_CONFIG,
  APP_URLS,
  GOOGLE_MAPS_CONFIG,
} from '../../../mereka/environments/common-environment';

export const environment = {
  production: false,
  ...API_CONFIG,
  appUrls: APP_URLS,
  google: {
    maps: GOOGLE_MAPS_CONFIG,
  },
};
