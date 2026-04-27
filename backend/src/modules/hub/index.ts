import type { FastifyInstance } from 'fastify';

/**
 * Hub Module - Hub management routes (app.mereka.io)
 * Handles: hub profiles, invitations, jobs, contracts, milestones, timelogs, user profiles, subscriptions, dashboard, experiences, expertises
 */
export async function hubModule(fastify: FastifyInstance) {
  // Import all routes from barrel
  const routes = await import('@routes/hub');

  // User profile routes (learner/expert onboarding)
  await fastify.register(routes.userProfileRoutes, { prefix: '/users' });

  // Hub profile routes
  await fastify.register(routes.hubProfileRoutes, { prefix: '/hub-profile' });

  // Hub settings profile routes - with hubId in path
  await fastify.register(routes.hubSettingsProfileRoutes, {
    prefix: '/hub/:hubId/settings/profile',
  });

  // Hub settings subscription routes - with hubId in path
  await fastify.register(routes.hubSettingsSubscriptionRoutes, {
    prefix: '/hub/:hubId/settings/subscription',
  });

  // Hub notification preference routes - with hubId in path
  await fastify.register(routes.hubNotificationPreferenceRoutes, {
    prefix: '/hub/:hubId/settings/notification-preferences',
  });

  // Hub communication log routes - with hubId in path
  await fastify.register(routes.hubCommunicationLogRoutes, {
    prefix: '/hub/:hubId/settings/communication-logs',
  });

  // Hub notification routes - with hubId in path (for in-app notifications)
  await fastify.register(routes.hubNotificationRoutes, {
    prefix: '/hub/:hubId/notifications',
  });

  // Hub subscription routes
  await fastify.register(routes.hubSubscriptionRoutes, { prefix: '/subscription' });

  // Hub dashboard routes - with hubId in path for permission middleware
  await fastify.register(routes.hubDashboardRoutes, { prefix: '/hub/:hubId/dashboard' });

  // Hub favorites routes - with hubId in path for engagement analytics
  await fastify.register(routes.hubFavoriteRoutes, { prefix: '/hub/:hubId/dashboard/favorites' });

  // Hub stats routes - with hubId in path
  await fastify.register(routes.hubStatsRoutes, { prefix: '/hub/:hubId/stats' });

  // Hub invitation routes (members, invitations)
  await fastify.register(routes.hubInvitationRoutes, { prefix: '/hub' });

  // Hub job routes
  await fastify.register(routes.hubJobRoutes, { prefix: '/hub/jobs' });

  // Hub proposal routes (global - for creating/managing proposals)
  await fastify.register(routes.hubProposalRoutes, { prefix: '/proposals' });

  // Hub proposal routes - with hubId in path for permission middleware
  await fastify.register(routes.hubScopedProposalRoutes, { prefix: '/hub/:hubId/proposals' });

  // Hub contract routes (global)
  await fastify.register(routes.hubContractRoutes, { prefix: '/contracts' });

  // Hub contract routes - with hubId in path for permission middleware
  await fastify.register(routes.hubScopedContractRoutes, { prefix: '/hub/:hubId/contracts' });

  // Hub milestone routes
  await fastify.register(routes.hubMilestoneRoutes, { prefix: '/milestones' });

  // Hub timelog routes
  await fastify.register(routes.hubTimelogRoutes, { prefix: '/timelogs' });

  // Hub experience routes - with permission middleware
  await fastify.register(routes.hubScopedExperienceRoutes, { prefix: '/hub/:hubId/experiences' });

  // Hub roles routes - list roles for hub
  await fastify.register(routes.hubRoleRoutes, { prefix: '/hub' });

  // Hub expertise routes - with hubId in path
  await fastify.register(routes.hubExpertiseRoutes, { prefix: '/hub/:hubId/expertises' });

  // Hub booking routes - with hubId in path
  await fastify.register(routes.hubScopedBookingRoutes, { prefix: '/hub/:hubId/bookings' });

  // Hub calendar routes - with hubId in path
  await fastify.register(routes.hubCalendarRoutes, { prefix: '/hub/:hubId/calendar' });

  // Hub transaction routes - with hubId in path
  await fastify.register(routes.hubTransactionRoutes, { prefix: '/hub/:hubId/transactions' });

  // User transaction routes - for expert earnings (personal)
  await fastify.register(routes.userTransactionRoutes, {
    prefix: '/users/me/transactions',
  });

  // Expert profile routes (for expert onboarding)
  await fastify.register(routes.hubExpertProfileRoutes, { prefix: '/expert/profile' });

  // Reference data routes (GET only - for onboarding forms)
  await fastify.register(routes.hubReferenceDataRoutes, { prefix: '/reference-data' });

  // Also register reference data at root level for backwards compatibility
  // Frontend expects /job-categories, /skills etc. at root level
  await fastify.register(routes.hubReferenceDataRoutes, { prefix: '' });

  // Hub chat routes - with hubId in path
  // Frontend expects /hub/:hubId/chat/rooms, /hub/:hubId/chat/rooms/:roomId, etc.
  await fastify.register(routes.hubChatRoutes, { prefix: '/hub/:hubId/chat' });

  // Hub review routes - with hubId in path
  await fastify.register(routes.hubReviewRoutes, { prefix: '/hub/:hubId/reviews' });

  // Hub contract reviews list - with hubId in path (for reviews dashboard)
  await fastify.register(routes.hubContractReviewsRoutes, {
    prefix: '/hub/:hubId/contract-reviews',
  });

  // Contract review routes - with hubId and contractId in path
  await fastify.register(routes.contractReviewRoutes, {
    prefix: '/hub/:hubId/contracts/:contractId/reviews',
  });
}
