import { Routes } from '@angular/router';
import { authGuard, hasHubGuard } from './core/guards';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  // Create Job shortcut route (redirects to onboarding/job)
  {
    path: 'create-job',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/onboarding/job/create-job.routes').then(
        (m) => m.CREATE_JOB_ROUTES
      ),
  },
  {
    path: 'unauthorized',
    loadComponent: () =>
      import('./features/shared/pages/unauthorized/unauthorized.component').then(
        (m) => m.UnauthorizedComponent
      ),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/user-dashboard/user-dashboard.routes').then(
        (m) => m.USER_DASHBOARD_ROUTES
      ),
  },
  {
    path: 'hub',
    canActivate: [authGuard, hasHubGuard],
    loadChildren: () =>
      import('./features/hub-dashboard/hub-dashboard.routes').then(
        (m) => m.HUB_DASHBOARD_ROUTES
      ),
  },
  // Onboarding Routes
  {
    path: 'onboarding',
    canActivate: [authGuard],
    children: [
      {
        path: 'hub',
        loadChildren: () =>
          import('./features/onboarding/hub/hub-onboarding.routes').then(
            (m) => m.HUB_ONBOARDING_ROUTES
          ),
      },
      {
        path: 'expert',
        loadChildren: () =>
          import('./features/onboarding/expert/expert-onboarding.routes').then(
            (m) => m.EXPERT_ONBOARDING_ROUTES
          ),
      },
      {
        path: 'learner',
        loadChildren: () =>
          import('./features/onboarding/learner/learner-onboarding.routes').then(
            (m) => m.LEARNER_ONBOARDING_ROUTES
          ),
      },
      {
        path: 'experience',
        loadChildren: () =>
          import('./features/onboarding/experience/experience-onboarding.routes').then(
            (m) => m.EXPERIENCE_ONBOARDING_ROUTES
          ),
      },
      {
        path: 'expertise',
        loadChildren: () =>
          import('./features/onboarding/expertise/expertise-onboarding.routes').then(
            (m) => m.EXPERTISE_ONBOARDING_ROUTES
          ),
      },
      {
        path: 'job',
        loadChildren: () =>
          import('./features/onboarding/job/create-job.routes').then(
            (m) => m.CREATE_JOB_ROUTES
          ),
      },
    ],
  },
  // Welcome Routes (shared welcome page for all user types)
  {
    path: 'welcome',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'learner',
        pathMatch: 'full',
      },
      {
        path: 'hub',
        loadComponent: () =>
          import('./features/onboarding/components/welcome/welcome.component').then(
            (m) => m.WelcomeComponent
          ),
        data: { type: 'hub', redirectPath: '/onboarding/hub' },
      },
      {
        path: 'expert',
        loadComponent: () =>
          import('./features/onboarding/components/welcome/welcome.component').then(
            (m) => m.WelcomeComponent
          ),
        data: { type: 'expert', redirectPath: '/onboarding/expert' },
      },
      {
        path: 'learner',
        loadComponent: () =>
          import('./features/onboarding/components/welcome/welcome.component').then(
            (m) => m.WelcomeComponent
          ),
        data: { type: 'learner', redirectPath: '/onboarding/learner' },
      },
    ],
  },
];
