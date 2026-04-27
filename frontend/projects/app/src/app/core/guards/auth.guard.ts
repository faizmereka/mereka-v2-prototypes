import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthStateService } from '../services/auth-state.service';
import { environment } from '../../../environments/environment';

/**
 * Guard that ensures user is authenticated
 * Redirects to auth app if not authenticated
 */
export const authGuard: CanActivateFn = async () => {
  const authState = inject(AuthStateService);

  // Wait for initialization if not done
  if (!authState.initialized()) {
    await authState.initialize();
  }

  if (!authState.isAuthenticated()) {
    // Redirect to auth app with return URL
    const redirect = encodeURIComponent(window.location.href);
    window.location.href = `${environment.authUrl}/login?redirect=${redirect}`;
    return false;
  }

  return true;
};

/**
 * Guard that ensures user has a hub selected
 * Redirects to hub selection if no hub is selected
 */
export const hubSelectedGuard: CanActivateFn = async () => {
  const authState = inject(AuthStateService);
  const router = inject(Router);

  // Wait for initialization if not done
  if (!authState.initialized()) {
    await authState.initialize();
  }

  if (!authState.isAuthenticated()) {
    const redirect = encodeURIComponent(window.location.href);
    window.location.href = `${environment.authUrl}/login?redirect=${redirect}`;
    return false;
  }

  if (!authState.isHubSelected()) {
    // Redirect to hub selection page
    return router.createUrlTree(['/select-hub']);
  }

  return true;
};

/**
 * Guard that ensures user has at least one hub
 * Redirects to hub onboarding if no hubs exist
 */
export const hasHubGuard: CanActivateFn = async () => {
  const authState = inject(AuthStateService);
  const router = inject(Router);

  // Wait for initialization if not done
  if (!authState.initialized()) {
    await authState.initialize();
  }

  if (!authState.isAuthenticated()) {
    const redirect = encodeURIComponent(window.location.href);
    window.location.href = `${environment.authUrl}/login?redirect=${redirect}`;
    return false;
  }

  // Check if user has at least one hub
  const hubs = authState.hubs();
  if (!hubs || hubs.length === 0) {
    // Redirect to hub onboarding
    return router.createUrlTree(['/welcome/hub']);
  }

  return true;
};

/**
 * Guard factory that checks for specific permission(s)
 * Usage: canActivate: [permissionGuard('experience.create')]
 * Usage: canActivate: [permissionGuard(['experience.create', 'experience.edit'], 'any')]
 */
export function permissionGuard(
  permissions: string | string[],
  mode: 'any' | 'all' = 'any'
): CanActivateFn {
  return async () => {
    const authState = inject(AuthStateService);
    const router = inject(Router);

    // Wait for initialization if not done
    if (!authState.initialized()) {
      await authState.initialize();
    }

    if (!authState.isAuthenticated()) {
      const redirect = encodeURIComponent(window.location.href);
      window.location.href = `${environment.authUrl}/login?redirect=${redirect}`;
      return false;
    }

    const hasPermission =
      typeof permissions === 'string'
        ? authState.hasPermission(permissions)
        : mode === 'all'
          ? authState.hasAllPermissions(permissions)
          : authState.hasAnyPermission(permissions);

    if (!hasPermission) {
      // Redirect to unauthorized page with required permission info
      const requiredPermissions = typeof permissions === 'string' ? permissions : permissions.join(', ');
      return router.createUrlTree(['/unauthorized'], {
        queryParams: { required: requiredPermissions, mode },
      });
    }

    return true;
  };
}

/**
 * Guard factory that checks for specific role(s)
 * Usage: canActivate: [roleGuard('owner')]
 * Usage: canActivate: [roleGuard(['owner', 'admin'])]
 */
export function roleGuard(roles: string | string[]): CanActivateFn {
  return async () => {
    const authState = inject(AuthStateService);
    const router = inject(Router);

    // Wait for initialization if not done
    if (!authState.initialized()) {
      await authState.initialize();
    }

    if (!authState.isAuthenticated()) {
      const redirect = encodeURIComponent(window.location.href);
      window.location.href = `${environment.authUrl}/login?redirect=${redirect}`;
      return false;
    }

    const hasRole =
      typeof roles === 'string' ? authState.hasRole(roles) : authState.hasAnyRole(roles);

    if (!hasRole) {
      // Redirect to unauthorized page with required role info
      const requiredRoles = typeof roles === 'string' ? roles : roles.join(', ');
      return router.createUrlTree(['/unauthorized'], {
        queryParams: { requiredRole: requiredRoles },
      });
    }

    return true;
  };
}

/**
 * Guard that ensures the selected hub has an active subscription
 * Redirects to hub pricing page if no subscription exists
 */
export const subscriptionGuard: CanActivateFn = async () => {
  const authState = inject(AuthStateService);
  const router = inject(Router);

  // Wait for initialization if not done
  if (!authState.initialized()) {
    await authState.initialize();
  }

  if (!authState.isAuthenticated()) {
    const redirect = encodeURIComponent(window.location.href);
    window.location.href = `${environment.authUrl}/login?redirect=${redirect}`;
    return false;
  }

  // Check if hub requires plan selection
  if (authState.requiresPlanSelection()) {
    // Redirect to hub pricing page
    return router.createUrlTree(['/onboarding/hub/pricing']);
  }

  return true;
};
