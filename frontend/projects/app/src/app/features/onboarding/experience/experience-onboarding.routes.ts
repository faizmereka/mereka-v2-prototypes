import { Routes } from '@angular/router';

// Child routes for the platform flow steps
const PLATFORM_STEP_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'basic-info',
    pathMatch: 'full',
  },
  {
    path: 'basic-info',
    loadComponent: () =>
      import('./steps/basic-info/basic-info.component').then((m) => m.ExperienceBasicInfoComponent),
  },
  {
    path: 'audience',
    loadComponent: () =>
      import('./steps/audience/audience.component').then((m) => m.ExperienceAudienceComponent),
  },
  {
    path: 'booking',
    loadComponent: () =>
      import('./steps/booking/booking.component').then((m) => m.ExperienceBookingComponent),
  },
  {
    path: 'tickets',
    loadComponent: () =>
      import('./steps/tickets/tickets.component').then((m) => m.ExperienceTicketsComponent),
  },
  {
    path: 'page',
    loadComponent: () =>
      import('./steps/page/page.component').then((m) => m.ExperiencePageComponent),
  },
  {
    path: 'details',
    loadComponent: () =>
      import('./steps/details/details.component').then((m) => m.ExperienceDetailsComponent),
  },
  {
    path: 'confirm',
    loadComponent: () =>
      import('./steps/confirm/confirm.component').then((m) => m.ExperienceConfirmComponent),
  },
];

export const EXPERIENCE_ONBOARDING_ROUTES: Routes = [
  // Standalone routes (no header/footer wrapper)
  {
    path: '',
    redirectTo: 'select-type',
    pathMatch: 'full',
  },
  {
    path: 'select-type',
    loadComponent: () =>
      import('./steps/select-type/select-type.component').then((m) => m.ExperienceSelectTypeComponent),
  },
  {
    path: 'express',
    loadComponent: () =>
      import('./steps/express/express.component').then((m) => m.ExperienceExpressComponent),
  },
  // Edit mode for express listing
  {
    path: 'express/:id',
    loadComponent: () =>
      import('./steps/express/express.component').then((m) => m.ExperienceExpressComponent),
  },
  // Platform listing routes - Create mode (no ID)
  {
    path: 'platform',
    loadComponent: () =>
      import('./experience-onboarding.component').then((m) => m.ExperienceOnboardingComponent),
    children: PLATFORM_STEP_ROUTES,
  },
  // Platform listing routes - Edit mode (with ID)
  {
    path: 'platform/:id',
    loadComponent: () =>
      import('./experience-onboarding.component').then((m) => m.ExperienceOnboardingComponent),
    children: PLATFORM_STEP_ROUTES,
  },
];
