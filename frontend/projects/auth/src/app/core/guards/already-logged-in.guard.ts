import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { RedirectService } from '../services/redirect.service';

/**
 * Guard that redirects already logged-in users away from auth pages.
 * Calls /me API to check if user is authenticated.
 */
export const alreadyLoggedInGuard: CanActivateFn = async (route) => {
  const authService = inject(AuthService);
  const redirectService = inject(RedirectService);

  console.log('[AlreadyLoggedInGuard] Running guard...');
  console.log('[AlreadyLoggedInGuard] Route query params:', route.queryParams);

  // Get query params
  const redirectUrl = route.queryParams['redirect'] || route.queryParams['redirectUrl'] || '';
  const asUser = route.queryParams['as-user'] || route.queryParams['asUser'] || 'learner';

  console.log('[AlreadyLoggedInGuard] redirectUrl:', redirectUrl);
  console.log('[AlreadyLoggedInGuard] asUser:', asUser);

  try {
    // Call /me API to check if user is authenticated
    console.log('[AlreadyLoggedInGuard] Calling /me API...');
    const user = await authService.getMe();

    console.log('[AlreadyLoggedInGuard] /me API response:', user);

    if (user) {
      // User is authenticated, redirect them
      console.log('[AlreadyLoggedInGuard] User is logged in, redirecting...', user.email);
      redirectService.redirectAfterAuth(redirectUrl, asUser as 'learner' | 'hub');
      return false;
    }

    console.log('[AlreadyLoggedInGuard] User is NOT logged in, allowing access to auth page');
    return true;
  } catch (error) {
    console.log('[AlreadyLoggedInGuard] Error calling /me API:', error);
    // If API call fails, allow access to auth page
    return true;
  }
};
