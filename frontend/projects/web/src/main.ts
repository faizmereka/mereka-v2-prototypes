import { bootstrapApplication } from '@angular/platform-browser';
import {
  provideClientHydration,
  withEventReplay,
  withHttpTransferCacheOptions,
} from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Browser-specific config with hydration
const browserConfig = {
  ...appConfig,
  providers: [
    ...appConfig.providers,
    provideClientHydration(
      withEventReplay(),
      // Transfer HTTP responses from server to client (prevents double fetch)
      withHttpTransferCacheOptions({
        includePostRequests: false, // Only cache GET requests
      }),
    ),
  ],
};

bootstrapApplication(App, browserConfig).catch((err) => console.error(err));
// trigger build Tue Mar 25 12:09:15 +0545 2026
