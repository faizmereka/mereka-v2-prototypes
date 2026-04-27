/**
 * Auth App - Development Environment
 * Extends common environment configuration
 */
import {
  API_CONFIG,
  APP_URLS,
  ALLOWED_REDIRECT_DOMAINS,
  DEFAULT_REDIRECTS,
  ONBOARDING_REDIRECTS,
  FIREBASE_CONFIG,
} from '../../../mereka/environments/common-environment';

export const environment = {
  production: false,
  ...API_CONFIG,
  appUrls: APP_URLS,
  allowedRedirectDomains: ALLOWED_REDIRECT_DOMAINS,
  defaultRedirects: DEFAULT_REDIRECTS,
  onboardingRedirects: ONBOARDING_REDIRECTS,
  firebase: FIREBASE_CONFIG,
};
