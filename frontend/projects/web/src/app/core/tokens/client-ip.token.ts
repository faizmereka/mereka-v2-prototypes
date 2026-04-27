import { InjectionToken } from '@angular/core';

/**
 * Injection token for client IP address
 * Provided by SSR server from X-Forwarded-For or X-Real-IP headers
 * Empty string on browser (client-side navigation)
 */
export const CLIENT_IP = new InjectionToken<string>('CLIENT_IP', {
  providedIn: 'root',
  factory: () => '', // Default empty for browser
});
