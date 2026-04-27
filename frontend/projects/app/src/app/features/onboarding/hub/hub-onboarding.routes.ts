import { Routes } from '@angular/router';

export const HUB_ONBOARDING_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./hub-onboarding.component').then((m) => m.HubOnboardingComponent),
    children: [
      {
        path: '',
        redirectTo: 'form',
        pathMatch: 'full',
      },
      {
        path: 'form',
        loadComponent: () =>
          import('./hub-form/hub-form.component').then((m) => m.HubFormComponent),
      },
      {
        path: 'pricing',
        loadComponent: () =>
          import('./hub-pricing/hub-pricing.component').then(
            (m) => m.HubPricingComponent
          ),
      },
      {
        path: 'payment-loader',
        loadComponent: () =>
          import('./hub-payment-loader/hub-payment-loader.component').then(
            (m) => m.HubPaymentLoaderComponent
          ),
      },
      {
        path: 'setup',
        loadComponent: () =>
          import('./hub-setup/hub-setup.component').then((m) => m.HubSetupComponent),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./hub-profile/hub-profile.component').then((m) => m.HubProfileComponent),
      },
      {
        path: 'about',
        loadComponent: () =>
          import('./hub-about/hub-about.component').then((m) => m.HubAboutComponent),
      },
      {
        path: 'details',
        loadComponent: () =>
          import('./hub-details/hub-details.component').then((m) => m.HubDetailsComponent),
      },
      {
        path: 'confirm',
        loadComponent: () =>
          import('./hub-confirm/hub-confirm.component').then((m) => m.HubConfirmComponent),
      },
    ],
  },
];
