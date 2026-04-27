import {
  APP_INITIALIZER,
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideLottieOptions } from 'ngx-lottie';

import { routes } from './app.routes';
import { AuthStateService } from './core/services/auth-state.service';
import { authInterceptor } from './core/interceptors/auth.interceptor';

/**
 * Initialize authentication on app startup
 * This checks if user is already logged in via httpOnly cookie
 */
function initializeAuth(authStateService: AuthStateService) {
  return () => authStateService.initialize();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideLottieOptions({
      player: () => import('lottie-web'),
    }),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeAuth,
      deps: [AuthStateService],
      multi: true,
    },
  ],
};
