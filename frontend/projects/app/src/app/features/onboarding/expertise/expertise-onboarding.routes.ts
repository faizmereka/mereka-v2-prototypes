import { Routes } from '@angular/router';

export const EXPERTISE_ONBOARDING_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./expertise-onboarding.component').then((m) => m.ExpertiseOnboardingComponent),
    children: [
      {
        path: '',
        redirectTo: 'your-expertise',
        pathMatch: 'full',
      },
      {
        path: 'your-expertise',
        loadComponent: () =>
          import('./steps/basic-info/basic-info.component').then((m) => m.ExpertiseBasicInfoComponent),
      },
      {
        path: 'availability-rates',
        loadComponent: () =>
          import('./steps/availability-rates/availability-rates.component').then(
            (m) => m.ExpertiseAvailabilityRatesComponent
          ),
      },
      {
        path: 'booking-details',
        loadComponent: () =>
          import('./steps/booking-details/booking-details.component').then(
            (m) => m.ExpertiseBookingDetailsComponent
          ),
      },
      {
        path: 'confirmation',
        loadComponent: () =>
          import('./steps/confirm/confirm.component').then((m) => m.ExpertiseConfirmComponent),
      },
    ],
  },
  // Edit mode with expertise ID
  {
    path: ':id',
    loadComponent: () =>
      import('./expertise-onboarding.component').then((m) => m.ExpertiseOnboardingComponent),
    children: [
      {
        path: '',
        redirectTo: 'your-expertise',
        pathMatch: 'full',
      },
      {
        path: 'your-expertise',
        loadComponent: () =>
          import('./steps/basic-info/basic-info.component').then((m) => m.ExpertiseBasicInfoComponent),
      },
      {
        path: 'availability-rates',
        loadComponent: () =>
          import('./steps/availability-rates/availability-rates.component').then(
            (m) => m.ExpertiseAvailabilityRatesComponent
          ),
      },
      {
        path: 'booking-details',
        loadComponent: () =>
          import('./steps/booking-details/booking-details.component').then(
            (m) => m.ExpertiseBookingDetailsComponent
          ),
      },
      {
        path: 'confirmation',
        loadComponent: () =>
          import('./steps/confirm/confirm.component').then((m) => m.ExpertiseConfirmComponent),
      },
    ],
  },
];
