import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/main-layout.component').then((m) => m.MainLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/dashboard/dashboard-home.component').then(
            (m) => m.DashboardHomeComponent
          ),
      },
      // Hubs (merged stats + listing view)
      {
        path: 'hubs',
        loadComponent: () =>
          import('./pages/hubs/hubs.component').then((m) => m.HubsComponent),
      },
      {
        path: 'hubs/:id',
        loadComponent: () =>
          import('./pages/hubs/hub-detail.component').then((m) => m.HubDetailComponent),
      },
      // Bookings
      {
        path: 'bookings',
        loadComponent: () =>
          import('./pages/bookings/bookings-list.component').then((m) => m.BookingsListComponent),
      },
      {
        path: 'bookings/list',
        redirectTo: 'bookings',
        pathMatch: 'full',
      },
      {
        path: 'bookings/calendar',
        loadComponent: () =>
          import('./pages/bookings/bookings-calendar.component').then((m) => m.BookingsCalendarComponent),
      },
      {
        path: 'bookings/:id',
        loadComponent: () =>
          import('./pages/bookings/booking-detail.component').then((m) => m.BookingDetailComponent),
      },
      // Services (Experiences & Expertise - merged view with tabs)
      {
        path: 'services',
        loadComponent: () =>
          import('./pages/services/services.component').then((m) => m.ServicesComponent),
        data: { tab: 'experiences' },
      },
      {
        path: 'services/experiences',
        loadComponent: () =>
          import('./pages/services/services.component').then((m) => m.ServicesComponent),
        data: { tab: 'experiences' },
      },
      {
        path: 'services/expertise',
        loadComponent: () =>
          import('./pages/services/services.component').then((m) => m.ServicesComponent),
        data: { tab: 'expertise' },
      },
      {
        path: 'services/experiences/:id',
        loadComponent: () =>
          import('./pages/services/experience-detail.component').then((m) => m.ExperienceDetailComponent),
      },
      {
        path: 'services/expertise/:id',
        loadComponent: () =>
          import('./pages/services/expertise-detail.component').then((m) => m.ExpertiseDetailComponent),
      },
      // Jobs
      {
        path: 'jobs',
        loadComponent: () =>
          import('./pages/jobs/jobs.component').then((m) => m.JobsComponent),
        data: { tab: 'jobs' },
      },
      {
        path: 'jobs/proposals',
        loadComponent: () =>
          import('./pages/jobs/jobs.component').then((m) => m.JobsComponent),
        data: { tab: 'proposals' },
      },
      {
        path: 'jobs/contracts',
        loadComponent: () =>
          import('./pages/jobs/jobs.component').then((m) => m.JobsComponent),
        data: { tab: 'contracts' },
      },
      {
        path: 'jobs/payments',
        loadComponent: () =>
          import('./pages/jobs/jobs.component').then((m) => m.JobsComponent),
        data: { tab: 'payments' },
      },
      {
        path: 'jobs/pending',
        loadComponent: () =>
          import('./pages/jobs/jobs.component').then((m) => m.JobsComponent),
        data: { tab: 'pending' },
      },
      // Job Detail
      {
        path: 'jobs/detail/:id',
        loadComponent: () =>
          import('./pages/jobs/job-detail/job-detail.component').then(
            (m) => m.JobDetailComponent
          ),
      },
      // Proposal Detail
      {
        path: 'jobs/proposals/:id',
        loadComponent: () =>
          import('./pages/jobs/proposal-detail/proposal-detail.component').then(
            (m) => m.ProposalDetailComponent
          ),
      },
      // Contract Detail
      {
        path: 'jobs/contracts/:id',
        loadComponent: () =>
          import('./pages/jobs/contract-detail/contract-detail.component').then(
            (m) => m.ContractDetailComponent
          ),
      },
      // Users (Platform Users - learners, experts, hub owners)
      {
        path: 'users',
        loadComponent: () =>
          import('./pages/users/users-list.component').then((m) => m.UsersListComponent),
      },
      {
        path: 'users/list',
        redirectTo: 'users',
        pathMatch: 'full',
      },
      {
        path: 'users/:id',
        loadComponent: () =>
          import('./pages/users/user-detail.component').then((m) => m.UserDetailComponent),
      },
      // Plans (Subscription Products)
      {
        path: 'plans',
        loadComponent: () =>
          import('./pages/plans/plans.component').then((m) => m.PlansComponent),
      },
      // Subscriptions
      {
        path: 'subscriptions',
        loadComponent: () =>
          import('./pages/subscriptions/subscriptions.component').then((m) => m.SubscriptionsComponent),
      },
      {
        path: 'subscriptions/plans',
        loadComponent: () =>
          import('./pages/plans/plans.component').then((m) => m.PlansComponent),
      },
      {
        path: 'subscriptions/:id',
        loadComponent: () =>
          import('./pages/subscriptions/subscription-detail.component').then((m) => m.SubscriptionDetailComponent),
      },
      // Banks
      {
        path: 'banks',
        loadComponent: () =>
          import('./pages/banks/banks.component').then((m) => m.BanksComponent),
      },
      // Email
      {
        path: 'email',
        loadComponent: () =>
          import('./pages/email/email.component').then((m) => m.EmailComponent),
      },
      {
        path: 'email/templates',
        loadComponent: () =>
          import('./pages/email/email.component').then((m) => m.EmailComponent),
        data: { tab: 'templates' },
      },
      {
        path: 'email/logs',
        loadComponent: () =>
          import('./pages/email/email.component').then((m) => m.EmailComponent),
        data: { tab: 'logs' },
      },
      // Notifications
      {
        path: 'notifications',
        loadComponent: () =>
          import('./pages/notifications/notifications.component').then((m) => m.NotificationsComponent),
      },
      {
        path: 'notifications/templates',
        loadComponent: () =>
          import('./pages/notifications/notifications.component').then((m) => m.NotificationsComponent),
        data: { tab: 'templates' },
      },
      {
        path: 'notifications/logs',
        loadComponent: () =>
          import('./pages/notifications/notifications.component').then((m) => m.NotificationsComponent),
        data: { tab: 'logs' },
      },
      // WhatsApp
      {
        path: 'whatsapp',
        loadComponent: () =>
          import('./pages/whatsapp/whatsapp.component').then((m) => m.WhatsAppComponent),
      },
      {
        path: 'whatsapp/templates',
        loadComponent: () =>
          import('./pages/whatsapp/whatsapp.component').then((m) => m.WhatsAppComponent),
        data: { tab: 'templates' },
      },
      {
        path: 'whatsapp/logs',
        loadComponent: () =>
          import('./pages/whatsapp/whatsapp.component').then((m) => m.WhatsAppComponent),
        data: { tab: 'logs' },
      },
      // API Monitoring
      {
        path: 'monitoring',
        loadComponent: () =>
          import('./pages/monitoring/monitoring.component').then((m) => m.MonitoringComponent),
      },
      {
        path: 'monitoring/logs',
        loadComponent: () =>
          import('./pages/monitoring/monitoring.component').then((m) => m.MonitoringComponent),
        data: { tab: 'logs' },
      },
      {
        path: 'monitoring/alerts',
        loadComponent: () =>
          import('./pages/monitoring/monitoring.component').then((m) => m.MonitoringComponent),
        data: { tab: 'alerts' },
      },
      {
        path: 'monitoring/stats',
        loadComponent: () =>
          import('./pages/monitoring/monitoring.component').then((m) => m.MonitoringComponent),
        data: { tab: 'stats' },
      },
      {
        path: 'monitoring/config',
        loadComponent: () =>
          import('./pages/monitoring/monitoring.component').then((m) => m.MonitoringComponent),
        data: { tab: 'config' },
      },
      {
        path: 'monitoring/cron-jobs',
        loadComponent: () =>
          import('./pages/monitoring/monitoring.component').then((m) => m.MonitoringComponent),
        data: { tab: 'cron-jobs' },
      },
      // Settings & Reference Data
      {
        path: 'settings',
        loadComponent: () =>
          import('./pages/settings/settings.component').then((m) => m.SettingsComponent),
      },
      {
        path: 'settings/roles',
        loadComponent: () =>
          import('./pages/settings/roles-permissions.component').then((m) => m.RolesPermissionsComponent),
      },
      // Admin Management (Super Admin Only)
      {
        path: 'admins',
        loadComponent: () =>
          import('./pages/super-admin/super-admin.component').then((m) => m.SuperAdminComponent),
      },
      // Favorites Analytics
      {
        path: 'favorites',
        loadComponent: () =>
          import('./pages/favorites/favorites.component').then((m) => m.FavoritesComponent),
      },
      // Reviews
      {
        path: 'reviews',
        loadComponent: () =>
          import('./pages/reviews/reviews.component').then((m) => m.ReviewsComponent),
      },
      {
        path: 'reviews/bookings',
        loadComponent: () =>
          import('./pages/reviews/reviews.component').then((m) => m.ReviewsComponent),
        data: { tab: 'booking' },
      },
      {
        path: 'reviews/contracts',
        loadComponent: () =>
          import('./pages/reviews/reviews.component').then((m) => m.ReviewsComponent),
        data: { tab: 'contract' },
      },
      // Finance & Payments
      {
        path: 'finance',
        loadComponent: () =>
          import('./pages/finance/finance.component').then((m) => m.FinanceComponent),
      },
      {
        path: 'finance/withdrawals',
        loadComponent: () =>
          import('./pages/finance/finance.component').then((m) => m.FinanceComponent),
        data: { tab: 'withdrawals' },
      },
      {
        path: 'finance/pending',
        loadComponent: () =>
          import('./pages/finance/finance.component').then((m) => m.FinanceComponent),
        data: { tab: 'pending' },
      },
      {
        path: 'finance/transactions',
        loadComponent: () =>
          import('./pages/finance/finance.component').then((m) => m.FinanceComponent),
        data: { tab: 'transactions' },
      },
      {
        path: 'finance/transactions/:id',
        loadComponent: () =>
          import('./pages/finance/transaction-detail.component').then((m) => m.TransactionDetailComponent),
      },
      {
        path: 'finance/withdrawals/:id',
        loadComponent: () =>
          import('./pages/finance/withdrawal-detail.component').then((m) => m.WithdrawalDetailComponent),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
