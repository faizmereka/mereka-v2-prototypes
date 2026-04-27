import { Routes } from '@angular/router';

export const USER_DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./user-dashboard.component').then((m) => m.UserDashboardComponent),
    children: [
      {
        path: '',
        redirectTo: 'overview',
        pathMatch: 'full',
      },
      {
        path: 'overview',
        loadComponent: () =>
          import('./pages/overview/overview.component').then(
            (m) => m.UserOverviewComponent
          ),
      },
      {
        path: 'chats',
        loadComponent: () =>
          import('./pages/chats/chats.component').then(
            (m) => m.LearnerChatsComponent
          ),
      },
      {
        path: 'transactions',
        loadComponent: () =>
          import('./pages/transactions/transactions.component').then(
            (m) => m.UserTransactionsComponent
          ),
      },
      {
        path: 'bookings',
        loadComponent: () =>
          import('./pages/bookings/bookings.component').then(
            (m) => m.UserBookingsComponent
          ),
      },
      {
        path: 'favorites',
        loadComponent: () =>
          import('./pages/favorites/favorites.component').then(
            (m) => m.UserFavoritesComponent
          ),
      },
      {
        path: 'bookings/:bookingId',
        data: { mode: 'learner' },
        loadComponent: () =>
          import('../shared/pages/booking-detail/booking-detail.page').then(
            (m) => m.BookingDetailPage
          ),
      },
      {
        path: 'reviews',
        loadComponent: () =>
          import('./pages/reviews/reviews.component').then(
            (m) => m.UserReviewsComponent
          ),
      },
      {
        path: 'courses',
        loadComponent: () =>
          import('./pages/courses/courses.component').then(
            (m) => m.UserCoursesComponent
          ),
      },
      {
        path: 'billing',
        loadComponent: () =>
          import('./pages/billing/billing.component').then(
            (m) => m.UserBillingComponent
          ),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./pages/settings/settings.component').then(
            (m) => m.UserSettingsComponent
          ),
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import('./pages/notifications/notifications.component').then(
            (m) => m.UserNotificationsComponent
          ),
      },
      {
        path: 'notification-settings',
        loadComponent: () =>
          import('./pages/notification-settings/notification-settings.component').then(
            (m) => m.UserNotificationSettingsComponent
          ),
      },
      // Account Details / Scholarhub
      {
        path: 'account',
        loadComponent: () =>
          import('./pages/account/account.component').then(
            (m) => m.UserAccountComponent
          ),
      },
      // My Interests
      {
        path: 'interests',
        loadComponent: () =>
          import('./pages/interests/interests.component').then(
            (m) => m.UserInterestsComponent
          ),
      },
      // Security Settings
      {
        path: 'security',
        loadComponent: () =>
          import('./pages/security/security.component').then(
            (m) => m.UserSecurityComponent
          ),
      },
      // Communication Logs (Email & WhatsApp history)
      {
        path: 'communication-logs',
        loadComponent: () =>
          import('./pages/communication-logs/communication-logs.component').then(
            (m) => m.UserCommunicationLogsComponent
          ),
      },
    ],
  },
];
