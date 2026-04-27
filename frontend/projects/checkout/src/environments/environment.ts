/**
 * Checkout App - Development Environment
 */
import {
  API_CONFIG,
  APP_URLS,
} from '../../../mereka/environments/common-environment';

export const environment = {
  production: false,
  ...API_CONFIG,
  appUrls: APP_URLS,
};
