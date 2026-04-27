import { Routes } from '@angular/router';
import { permissionGuard, subscriptionGuard } from '../../core/guards';
import { PERMISSIONS } from '../../core/services/permission-definitions.service';

export const HUB_DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    canActivate: [subscriptionGuard],
    loadComponent: () =>
      import('./hub-dashboard.component').then((m) => m.HubDashboardComponent),
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
            (m) => m.HubOverviewComponent
          ),
      },
      {
        path: 'collaborator-dashboard',
        canActivate: [permissionGuard(PERMISSIONS.COLLABORATOR_VIEW_DASHBOARD)],
        loadComponent: () =>
          import('./pages/collaborator-dashboard/collaborator-dashboard.component').then(
            (m) => m.CollaboratorDashboardComponent
          ),
      },
      {
        path: 'calendar',
        canActivate: [permissionGuard(PERMISSIONS.BOOKING_VIEW)],
        loadComponent: () =>
          import('./pages/calendar/calendar.component').then(
            (m) => m.HubCalendarComponent
          ),
      },
      {
        path: 'bookings',
        canActivate: [permissionGuard(PERMISSIONS.BOOKING_VIEW)],
        loadComponent: () =>
          import('./pages/bookings/bookings.component').then(
            (m) => m.HubBookingsComponent
          ),
      },
      {
        path: 'bookings/:bookingId',
        canActivate: [permissionGuard(PERMISSIONS.BOOKING_VIEW)],
        data: { mode: 'hub' },
        loadComponent: () =>
          import('../shared/pages/booking-detail/booking-detail.page').then(
            (m) => m.BookingDetailPage
          ),
      },
      {
        path: 'chats',
        canActivate: [permissionGuard(PERMISSIONS.COMMUNICATION_VIEW_CHATS)],
        loadComponent: () =>
          import('./pages/chats/chats.component').then(
            (m) => m.HubChatsComponent
          ),
      },
      {
        path: 'analytics',
        canActivate: [permissionGuard(PERMISSIONS.ANALYTICS_VIEW)],
        loadComponent: () =>
          import('./pages/analytics/analytics.component').then(
            (m) => m.HubAnalyticsComponent
          ),
      },
      // Notifications
      {
        path: 'notifications',
        loadComponent: () =>
          import('./pages/notifications/notifications.component').then(
            (m) => m.HubNotificationsComponent
          ),
      },
      // Mobile Menu Page
      {
        path: 'menu',
        loadComponent: () =>
          import('./pages/menu/menu.component').then((m) => m.HubMenuComponent),
      },
      // Services Management Routes
      {
        path: 'services',
        redirectTo: 'services/experiences',
        pathMatch: 'full',
      },
      {
        path: 'services/experiences',
        canActivate: [permissionGuard(PERMISSIONS.EXPERIENCE_VIEW)],
        loadComponent: () =>
          import('./pages/services/experiences/experiences.component').then(
            (m) => m.HubExperiencesComponent
          ),
      },
      {
        path: 'services/experiences/create',
        redirectTo: '/onboarding/experience/select-type',
        pathMatch: 'full',
      },
      {
        path: 'services/experiences/:experienceId/manage',
        canActivate: [permissionGuard(PERMISSIONS.EXPERIENCE_VIEW)],
        loadChildren: () =>
          import('./pages/services/experiences/manage-listing/manage-listing.routes').then(
            (m) => m.MANAGE_EXPERIENCE_ROUTES
          ),
      },
      {
        path: 'services/expertise',
        canActivate: [permissionGuard(PERMISSIONS.EXPERTISE_VIEW)],
        loadComponent: () =>
          import('./pages/services/expertise/expertise.component').then(
            (m) => m.HubExpertiseComponent
          ),
      },
      // =====================================================
      // JOBS MODULE - Organized by Hub / Expert / Shared
      // =====================================================

      // Jobs redirect
      {
        path: 'jobs',
        redirectTo: 'jobs/posts',
        pathMatch: 'full',
      },

      // ----- HUB (Client) Routes -----
      // Job Posts - Hub manages their job listings
      {
        path: 'jobs/posts',
        canActivate: [permissionGuard(PERMISSIONS.JOB_VIEW_POSTS)],
        loadComponent: () =>
          import('./pages/jobs/hub/posts/posts.component').then(
            (m) => m.HubJobPostsComponent
          ),
      },
      // Job Proposals List - Hub views proposals for a specific job
      {
        path: 'jobs/:jobId/proposals',
        canActivate: [permissionGuard(PERMISSIONS.JOB_VIEW_POSTS)],
        loadComponent: () =>
          import('./pages/jobs/hub/job-proposals/job-proposals.component').then(
            (m) => m.HubJobProposalsComponent
          ),
      },
      // Send Offer - Hub sends offer to expert
      {
        path: 'jobs/offers/send/:proposalId',
        canActivate: [permissionGuard(PERMISSIONS.JOB_MANAGE_OFFERS)],
        loadComponent: () =>
          import('./pages/jobs/hub/send-offer/send-offer.component').then(
            (m) => m.HubJobSendOfferComponent
          ),
      },
      {
        path: 'jobs/offers/edit/:proposalId/:contractId',
        canActivate: [permissionGuard(PERMISSIONS.JOB_MANAGE_OFFERS)],
        loadComponent: () =>
          import('./pages/jobs/hub/send-offer/send-offer.component').then(
            (m) => m.HubJobSendOfferComponent
          ),
      },

      // ----- EXPERT Routes -----
      // Applications - Expert views their contracts & proposals
      {
        path: 'jobs/applications',
        canActivate: [permissionGuard(PERMISSIONS.JOB_VIEW_APPLICATIONS)],
        loadComponent: () =>
          import('./pages/jobs/expert/applications/applications.component').then(
            (m) => m.HubJobApplicationsComponent
          ),
      },

      // ----- SHARED Routes (context-aware) -----
      // Proposal Detail - Hub route (with jobId)
      {
        path: 'jobs/:jobId/proposals/:proposalId',
        canActivate: [permissionGuard(PERMISSIONS.JOB_VIEW_POSTS)],
        loadComponent: () =>
          import('./pages/jobs/shared/proposal-detail/proposal-detail.component').then(
            (m) => m.ProposalDetailComponent
          ),
      },
      // Proposal Detail - Expert route (without jobId)
      {
        path: 'proposals/:proposalId',
        canActivate: [permissionGuard(PERMISSIONS.JOB_VIEW_APPLICATIONS)],
        loadComponent: () =>
          import('./pages/jobs/shared/proposal-detail/proposal-detail.component').then(
            (m) => m.ProposalDetailComponent
          ),
      },
      // Offer Detail - View offer (both hub & expert)
      {
        path: 'jobs/offers/view/:contractId',
        canActivate: [permissionGuard(PERMISSIONS.JOB_VIEW_CONTRACTS)],
        loadComponent: () =>
          import('./pages/jobs/shared/offer-detail/view-offer.component').then(
            (m) => m.HubJobViewOfferComponent
          ),
      },
      // Contract Detail - View contract details (both hub & expert)
      {
        path: 'jobs/contracts/:contractId',
        canActivate: [permissionGuard(PERMISSIONS.JOB_VIEW_CONTRACTS)],
        loadComponent: () =>
          import('./pages/jobs/shared/contract-detail/contract-details.component').then(
            (m) => m.HubJobContractDetailsComponent
          ),
      },
      // Manage Milestones (both hub & expert)
      {
        path: 'jobs/contracts/:id/manage-milestones',
        canActivate: [permissionGuard(PERMISSIONS.JOB_MANAGE_MILESTONES)],
        loadComponent: () =>
          import('./pages/jobs/shared/manage-milestones/manage-milestones.component').then(
            (m) => m.HubJobManageMilestonesComponent
          ),
      },
      // Settings Routes (with sidebar layout)
      {
        path: 'settings',
        canActivate: [permissionGuard(PERMISSIONS.SETTINGS_VIEW)],
        loadComponent: () =>
          import('./pages/settings/settings.component').then(
            (m) => m.HubSettingsComponent
          ),
        children: [
          {
            path: '',
            redirectTo: 'account',
            pathMatch: 'full',
          },
          {
            path: 'account',
            loadComponent: () =>
              import('./pages/settings/account/account.component').then(
                (m) => m.HubSettingsAccountComponent
              ),
          },
          {
            path: 'members',
            canActivate: [permissionGuard(PERMISSIONS.TEAM_VIEW)],
            loadComponent: () =>
              import('./pages/settings/team-members/team-members.component').then(
                (m) => m.HubSettingsTeamMembersComponent
              ),
          },
          {
            path: 'transactions',
            canActivate: [permissionGuard(PERMISSIONS.FINANCIAL_VIEW_TRANSACTIONS)],
            loadComponent: () =>
              import('./pages/settings/transactions/transactions.component').then(
                (m) => m.HubSettingsTransactionsComponent
              ),
          },
          {
            path: 'subscription',
            canActivate: [permissionGuard(PERMISSIONS.FINANCIAL_MANAGE_SUBSCRIPTION)],
            loadComponent: () =>
              import('./pages/settings/subscription/subscription.component').then(
                (m) => m.HubSettingsSubscriptionComponent
              ),
          },
          {
            path: 'notifications',
            loadComponent: () =>
              import('./pages/settings/notifications/notifications.component').then(
                (m) => m.HubNotificationSettingsComponent
              ),
          },
          {
            path: 'communication-logs',
            loadComponent: () =>
              import('./pages/settings/communication-logs/communication-logs.component').then(
                (m) => m.HubCommunicationLogsComponent
              ),
          },
          {
            path: 'reviews',
            canActivate: [permissionGuard(PERMISSIONS.COMMUNICATION_VIEW_REVIEWS)],
            loadComponent: () =>
              import('./pages/reviews/reviews.component').then(
                (m) => m.HubReviewsComponent
              ),
          },
          {
            path: 'engagement',
            canActivate: [permissionGuard(PERMISSIONS.ANALYTICS_VIEW)],
            loadComponent: () =>
              import('./pages/engagement/engagement.component').then(
                (m) => m.HubEngagementComponent
              ),
          },
        ],
      },
    ],
  },
];
