import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Auth Guard - Protects routes that require authentication
 *
 * Usage: Add to route config:
 * { path: 'dashboard', canActivate: [authGuard], ... }
 */
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Wait for initialization if not yet done
  if (!authService.isInitialized()) {
    // Redirect to login - initialization will handle redirect back
    router.navigate(['/login']);
    return false;
  }

  if (authService.isAuthenticated()) {
    return true;
  }

  // Not authenticated, redirect to login
  router.navigate(['/login']);
  return false;
};

/**
 * Guest Guard - Protects routes that should only be accessible when NOT authenticated
 * (e.g., login page - redirect to dashboard if already logged in)
 *
 * Usage: Add to route config:
 * { path: 'login', canActivate: [guestGuard], ... }
 */
export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // If not initialized yet, allow access to login page
  if (!authService.isInitialized()) {
    return true;
  }

  if (authService.isAuthenticated()) {
    // Already authenticated, redirect to dashboard
    router.navigate(['/dashboard']);
    return false;
  }

  return true;
};
