import { Routes } from '@angular/router';

export const MANAGE_EXPERIENCE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./manage-listing.component').then((m) => m.ManageExperienceListingComponent),
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full' },
      {
        path: 'overview',
        loadComponent: () =>
          import('./pages/overview/overview.component').then((m) => m.ManageExperienceOverviewComponent),
      },
      {
        path: 'sessions',
        loadComponent: () =>
          import('./pages/sessions/sessions.component').then((m) => m.ManageExperienceSessionsComponent),
      },
      {
        path: 'hosts',
        loadComponent: () =>
          import('./pages/hosts/hosts.component').then((m) => m.ManageExperienceHostsComponent),
      },
      {
        path: 'bookings',
        loadComponent: () =>
          import('./pages/bookings/bookings.component').then((m) => m.ManageExperienceBookingsComponent),
      },
      {
        path: 'analytics',
        loadComponent: () =>
          import('./pages/analytics/analytics.component').then((m) => m.ManageExperienceAnalyticsComponent),
      },
    ],
  },
];
