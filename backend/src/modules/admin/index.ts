import type { FastifyInstance } from 'fastify';

/**
 * Admin Auth Module - Admin authentication routes (admin.mereka.io)
 * Handles: login, logout, refresh, me
 * Note: This is registered separately with /auth prefix
 */
export async function adminAuthModule(fastify: FastifyInstance) {
  const { adminAuthRoutes } = await import('@routes/admin');
  await fastify.register(adminAuthRoutes, { prefix: '/auth' });
}

/**
 * Admin Module - Admin dashboard routes (admin.mereka.io)
 * Handles: templates, monitoring, bank management, subscription products, reference data
 */
export async function adminModule(fastify: FastifyInstance) {
  // Import all routes from barrel
  const routes = await import('@routes/admin');

  // Dashboard routes (stats for admin dashboard)
  await fastify.register(routes.adminDashboardRoutes, { prefix: '/dashboard' });

  // Admin users management routes (super admin only)
  await fastify.register(routes.adminUsersRoutes, { prefix: '/admins' });

  // Platform users management routes (learners, experts, hub owners)
  await fastify.register(routes.adminPlatformUsersRoutes, { prefix: '/users' });

  // Hub management routes
  await fastify.register(routes.adminHubRoutes, { prefix: '/hubs' });

  // Job management routes
  await fastify.register(routes.adminJobRoutes, { prefix: '/jobs' });

  // Proposal management routes
  await fastify.register(routes.adminProposalRoutes, { prefix: '/proposals' });

  // Contract management routes
  await fastify.register(routes.adminContractRoutes, { prefix: '/contracts' });

  // Contract payments management routes
  await fastify.register(routes.adminContractPaymentRoutes, { prefix: '/contract-payments' });

  // Pending payments management routes (failed payment retry queue)
  await fastify.register(routes.adminPendingPaymentRoutes, { prefix: '/pending-payments' });

  // Booking management routes
  await fastify.register(routes.adminBookingRoutes, { prefix: '/bookings' });

  // Experience management routes
  await fastify.register(routes.adminExperienceRoutes, { prefix: '/experiences' });

  // Expertise management routes
  await fastify.register(routes.adminExpertiseRoutes, { prefix: '/expertises' });

  // Combined services stats routes (for tab counts)
  await fastify.register(routes.adminServicesRoutes, { prefix: '/services' });

  // Reference data routes (full CRUD for admin)
  await fastify.register(routes.adminAmenityRoutes, { prefix: '/amenities' });
  await fastify.register(routes.adminFacilityRoutes, { prefix: '/facilities' });
  await fastify.register(routes.adminFocusAreaRoutes, { prefix: '/focus-areas' });
  await fastify.register(routes.adminSkillRoutes, { prefix: '/skills' });
  await fastify.register(routes.adminSpaceTypeRoutes, { prefix: '/space-types' });
  await fastify.register(routes.adminExperienceTypeRoutes, { prefix: '/experience-types' });
  await fastify.register(routes.adminExperienceTopicRoutes, { prefix: '/experience-topics' });
  await fastify.register(routes.adminExperienceThemeRoutes, { prefix: '/experience-themes' });
  await fastify.register(routes.adminLanguageRoutes, { prefix: '/languages' });
  await fastify.register(routes.adminCompanyTypeRoutes, { prefix: '/company-types' });
  await fastify.register(routes.adminTargetAudienceRoutes, { prefix: '/target-audiences' });
  await fastify.register(routes.adminJobPreferenceRoutes, { prefix: '/job-preferences' });

  // Settings stats routes (aggregated stats for all reference data)
  await fastify.register(routes.adminSettingsStatsRoutes, { prefix: '/settings' });

  // Bank management routes
  await fastify.register(routes.adminBankRoutes, { prefix: '/banks' });

  // Email template routes
  await fastify.register(routes.adminEmailTemplateRoutes, { prefix: '/email-templates' });

  // Notification template routes
  await fastify.register(routes.adminNotificationTemplateRoutes, {
    prefix: '/notification-templates',
  });

  // Notification logs routes (all notification logs for admin)
  await fastify.register(routes.adminNotificationRoutes, { prefix: '/notifications' });

  // Email logs routes (all email logs for admin)
  await fastify.register(routes.adminEmailRoutes, { prefix: '/emails' });

  // WhatsApp template routes
  await fastify.register(routes.adminWhatsAppTemplateRoutes, { prefix: '/whatsapp-templates' });

  // WhatsApp logs routes (all WhatsApp logs for admin)
  await fastify.register(routes.adminWhatsAppRoutes, { prefix: '/whatsapp-logs' });

  // Plan routes
  await fastify.register(routes.adminPlanRoutes, { prefix: '/plans' });

  // Subscription routes
  await fastify.register(routes.adminSubscriptionRoutes, { prefix: '/subscriptions' });

  // Transaction management routes (finance)
  await fastify.register(routes.adminTransactionRoutes, { prefix: '/transactions' });

  // Withdrawal management routes (finance)
  await fastify.register(routes.adminWithdrawalRoutes, { prefix: '/withdrawals' });

  // Cron job monitoring routes
  await fastify.register(routes.adminCronJobRoutes, { prefix: '/cron-jobs' });

  // API monitoring routes
  await fastify.register(routes.adminApiMonitoringRoutes, { prefix: '/monitoring' });

  // Role management routes
  await fastify.register(routes.adminRoleRoutes, { prefix: '/roles' });

  // Permission management routes
  await fastify.register(routes.adminPermissionRoutes, { prefix: '/permissions' });

  // Review management routes
  await fastify.register(routes.adminReviewRoutes, { prefix: '/reviews' });

  // Favorites analytics routes
  await fastify.register(routes.adminFavoriteRoutes, { prefix: '/analytics/favorites' });
}
