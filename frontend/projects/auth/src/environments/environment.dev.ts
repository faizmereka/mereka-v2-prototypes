/**
 * Auth App - Dev Environment (RKE2 - mereka.dev)
 * Extends common environment configuration
 */
import {
  API_CONFIG_DEV,
  APP_URLS_DEV,
  FIREBASE_CONFIG_DEV,
  ALLOWED_REDIRECT_DOMAINS_DEV,
  DEFAULT_REDIRECTS_DEV,
  ONBOARDING_REDIRECTS_DEV,
  SENTRY_CONFIG_DEV,
} from '../../../mereka/environments/common-environment.dev';

export const environment = {
  production: false,
  ...API_CONFIG_DEV,
  appUrls: APP_URLS_DEV,
  firebase: FIREBASE_CONFIG_DEV,
  allowedRedirectDomains: ALLOWED_REDIRECT_DOMAINS_DEV,
  defaultRedirects: DEFAULT_REDIRECTS_DEV,
  onboardingRedirects: ONBOARDING_REDIRECTS_DEV,
  sentry: SENTRY_CONFIG_DEV,
};
