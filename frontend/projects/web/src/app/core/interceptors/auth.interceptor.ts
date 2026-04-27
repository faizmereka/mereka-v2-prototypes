import { inject, PLATFORM_ID } from '@angular/core';
import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpErrorResponse,
} from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import {
  BehaviorSubject,
  catchError,
  filter,
  from,
  switchMap,
  take,
  throwError,
} from 'rxjs';
import { AuthService } from '../services/auth.service';

// Shared state for token refresh (singleton across all interceptor calls)
let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<boolean | null>(null);

/**
 * Auth Interceptor - Handles authentication for all HTTP requests
 *
 * Features:
 * 1. Adds withCredentials: true to send/receive httpOnly cookies
 * 2. On 401 error, attempts to refresh token (with queue to prevent multiple refreshes)
 * 3. On refresh failure, clears auth and redirects to auth app
 */
export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  const authService = inject(AuthService);
  const platformId = inject(PLATFORM_ID);

  // Clone request with credentials for cookie-based auth
  const authReq = req.clone({
    withCredentials: true,
  });

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Only handle 401 errors (unauthorized)
      if (error.status !== 401) {
        return throwError(() => error);
      }

      // Don't try to refresh for auth endpoints
      if (isAuthEndpoint(req.url)) {
        return throwError(() => error);
      }

      // Skip refresh during SSR
      if (!isPlatformBrowser(platformId)) {
        return throwError(() => error);
      }

      // Handle token refresh with queue
      if (!isRefreshing) {
        isRefreshing = true;
        refreshTokenSubject.next(null);

        return from(authService.refreshToken()).pipe(
          switchMap((success) => {
            isRefreshing = false;

            if (success) {
              refreshTokenSubject.next(true);
              // Retry the original request
              return next(authReq);
            }

            // Refresh failed - both tokens expired
            refreshTokenSubject.next(false);
            handleSessionExpired(authService, platformId);
            return throwError(() => error);
          }),
          catchError((refreshError) => {
            isRefreshing = false;
            refreshTokenSubject.next(false);
            handleSessionExpired(authService, platformId);
            return throwError(() => refreshError);
          })
        );
      }

      // If already refreshing, wait for the refresh to complete
      return refreshTokenSubject.pipe(
        filter((result) => result !== null),
        take(1),
        switchMap((success) => {
          if (success) {
            return next(authReq);
          }
          return throwError(() => error);
        })
      );
    })
  );
};

/**
 * Check if the URL is an auth endpoint (shouldn't trigger refresh)
 * Note: /auth/me is NOT included because we want to refresh token on 401
 */
function isAuthEndpoint(url: string): boolean {
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/refresh') ||
    url.includes('/auth/logout')
  );
}

/**
 * Handle session expiration - clear auth state only (no redirect for public web)
 * The web project is public - users can browse without being logged in.
 * Individual components handle showing login prompts when needed.
 */
function handleSessionExpired(authService: AuthService, platformId: object): void {
  if (!isPlatformBrowser(platformId)) {
    return;
  }

  // Clear auth state silently - no redirect for public web
  authService.clearAuthState();
}
