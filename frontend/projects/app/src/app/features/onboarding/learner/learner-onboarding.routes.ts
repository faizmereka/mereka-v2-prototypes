import { Routes } from '@angular/router';

export const LEARNER_ONBOARDING_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./learner-onboarding.component').then((m) => m.LearnerOnboardingComponent),
    children: [
      {
        path: '',
        redirectTo: 'personal-details',
        pathMatch: 'full',
      },
      {
        path: 'personal-details',
        loadComponent: () =>
          import('./steps/personal-details/personal-details.component').then((m) => m.LearnerPersonalDetailsComponent),
      },
    ],
  },
];

