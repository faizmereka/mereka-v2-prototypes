import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideLottieOptions } from 'ngx-lottie';

import { API_BASE_URL } from '@mereka/core';
import { environment } from '../environments/environment';
import { routes } from './app.routes';
import { authInterceptor, clientIpInterceptor } from './core/interceptors';

// Base config shared between browser and server
// Note: withFetch() removed - it causes HTTP Transfer Cache to fail with SSR
// See: https://github.com/angular/angular/issues/60270
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    { provide: API_BASE_URL, useValue: environment.apiUrl },
    provideRouter(
      routes,
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled' })
    ),
    provideHttpClient(withInterceptors([clientIpInterceptor, authInterceptor])),
    provideLottieOptions({
      player: () => import('lottie-web'),
    }),
  ],
};
