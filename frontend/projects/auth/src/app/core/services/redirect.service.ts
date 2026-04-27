import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

export type UserType = 'learner' | 'hub';

@Injectable({ providedIn: 'root' })
export class RedirectService {
  /**
   * Validate if a redirect URL is allowed
   * Only allows URLs from configured domains
   */
  isValidRedirectUrl(url: string): boolean {
    if (!url) return false;

    try {
      const parsedUrl = new URL(url);
      const host = parsedUrl.host;

      return environment.allowedRedirectDomains.some((domain) => {
        // Exact match or subdomain match
        return host === domain || host.endsWith(`.${domain}`);
      });
    } catch {
      // Invalid URL format
      return false;
    }
  }

  /**
   * Get safe redirect URL - returns default if invalid
   */
  getSafeRedirectUrl(url: string | null | undefined, userType: UserType): string {
    if (url && this.isValidRedirectUrl(url)) {
      return url;
    }
    return this.getDefaultRedirect(userType);
  }

  /**
   * Get default redirect URL based on user type
   */
  getDefaultRedirect(userType: UserType): string {
    return environment.defaultRedirects[userType];
  }

  /**
   * Get onboarding redirect URL based on user type
   */
  getOnboardingRedirect(userType: UserType): string {
    return environment.onboardingRedirects[userType];
  }

  /**
   * Perform redirect to URL
   * Uses window.location.href for cross-domain redirect (preserves cookies)
   */
  redirectTo(url: string): void {
    window.location.href = url;
  }

  /**
   * Redirect after successful authentication (login)
   */
  redirectAfterAuth(redirectUrl: string | null | undefined, userType: UserType): void {
    const safeUrl = this.getSafeRedirectUrl(redirectUrl, userType);
    this.redirectTo(safeUrl);
  }

  /**
   * Redirect after successful signup to onboarding
   */
  redirectAfterSignup(userType: UserType): void {
    const onboardingUrl = this.getOnboardingRedirect(userType);
    this.redirectTo(onboardingUrl);
  }

  /**
   * Get app URL by name
   */
  getAppUrl(app: 'auth' | 'app' | 'web' | 'admin' | 'checkout'): string {
    return environment.appUrls[app];
  }
}
