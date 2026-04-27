import { Routes } from '@angular/router';

export const EXPERT_ONBOARDING_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./expert-onboarding.component').then((m) => m.ExpertOnboardingComponent),
    children: [
      {
        path: '',
        redirectTo: 'your-profile',
        pathMatch: 'full',
      },
      {
        path: 'your-profile',
        loadComponent: () =>
          import('./steps/profile/profile.component').then((m) => m.ExpertProfileComponent),
      },
      {
        path: 'your-skills',
        loadComponent: () =>
          import('./steps/skills/skills.component').then((m) => m.ExpertSkillsComponent),
      },
      {
        path: 'your-background',
        loadComponent: () =>
          import('./steps/background/background.component').then((m) => m.ExpertBackgroundComponent),
      },
      {
        path: 'confirmation',
        loadComponent: () =>
          import('./steps/confirmation/confirmation.component').then((m) => m.ExpertConfirmationComponent),
      },
    ],
  },
];

