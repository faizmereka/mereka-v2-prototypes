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

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<boolean | null>(null);

/**
 * Auth Interceptor for Checkout App
 * Handles authentication and redirects to login when session expires
 */
export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  const authService = inject(AuthService);
  const platformId = inject(PLATFORM_ID);

  const authReq = req.clone({
    withCredentials: true,
  });

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401) {
        return throwError(() => error);
      }

      if (isAuthEndpoint(req.url)) {
        return throwError(() => error);
      }

      // Allow guest checkout - don't redirect for checkout endpoints
      if (isGuestAllowedEndpoint(req.url)) {
        return throwError(() => error);
      }

      if (!isPlatformBrowser(platformId)) {
        return throwError(() => error);
      }

      if (!isRefreshing) {
        isRefreshing = true;
        refreshTokenSubject.next(null);

        return from(authService.refreshToken()).pipe(
          switchMap((success) => {
            isRefreshing = false;

            if (success) {
              refreshTokenSubject.next(true);
              return next(authReq);
            }

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

function isAuthEndpoint(url: string): boolean {
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/refresh') ||
    url.includes('/auth/logout')
  );
}

/**
 * Check if URL is a checkout endpoint that allows guest access
 * For checkout, we allow 401 errors without redirecting to login
 */
function isGuestAllowedEndpoint(url: string): boolean {
  return (
    url.includes('/auth/me') ||  // User check - don't redirect if not logged in
    url.includes('/checkout/') ||
    url.includes('/experiences/') ||
    url.includes('/expertise/') ||
    url.includes('/coupons/')
  );
}

/**
 * For checkout, redirect to auth app when session expires
 */
function handleSessionExpired(authService: AuthService, platformId: object): void {
  if (!isPlatformBrowser(platformId)) {
    return;
  }

  authService.clearAuthState();
  authService.redirectToLogin(window.location.href);
}
