/**
 * Auth App - Production Environment
 * Extends common environment configuration
 */
import {
  API_CONFIG_PROD,
  APP_URLS_PROD,
  ALLOWED_REDIRECT_DOMAINS_PROD,
  DEFAULT_REDIRECTS_PROD,
  ONBOARDING_REDIRECTS_PROD,
  FIREBASE_CONFIG_PROD,
} from '../../../mereka/environments/common-environment.prod';

export const environment = {
  production: true,
  ...API_CONFIG_PROD,
  appUrls: APP_URLS_PROD,
  allowedRedirectDomains: ALLOWED_REDIRECT_DOMAINS_PROD,
  defaultRedirects: DEFAULT_REDIRECTS_PROD,
  onboardingRedirects: ONBOARDING_REDIRECTS_PROD,
  firebase: FIREBASE_CONFIG_PROD,
};
