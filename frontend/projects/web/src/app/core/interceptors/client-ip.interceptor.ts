import { inject, PLATFORM_ID } from '@angular/core';
import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { isPlatformServer } from '@angular/common';
import { CLIENT_IP } from '../tokens/client-ip.token';

/**
 * Client IP Interceptor - Forwards real client IP to backend during SSR
 *
 * In SSR, all requests to backend come from the SSR server's IP.
 * This interceptor adds X-Forwarded-For header with the real client IP
 * so backend can track/rate-limit by actual user IP.
 *
 * Only active during SSR - on browser, the request goes directly to backend
 * which can see the real client IP.
 */
export const clientIpInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  const platformId = inject(PLATFORM_ID);
  const clientIp = inject(CLIENT_IP, { optional: true }) || '';

  // Only add header during SSR and if we have a client IP
  if (isPlatformServer(platformId) && clientIp) {
    const modifiedReq = req.clone({
      setHeaders: {
        'X-Forwarded-For': clientIp,
        'X-Real-IP': clientIp,
      },
    });
    return next(modifiedReq);
  }

  return next(req);
};
