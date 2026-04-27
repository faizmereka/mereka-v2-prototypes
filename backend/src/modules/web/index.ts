import type { FastifyInstance } from 'fastify';
import {
  communicationLogRoutes,
  learnerAccountRoutes,
  notificationPreferenceRoutes,
  userHubNotificationPreferenceRoutes,
  userNotificationRoutes,
} from './routes/account';
import { userBookingRoutes } from './routes/bookings';
import { userChatRoutes } from './routes/chat';
import { webCheckoutRoutes } from './routes/checkout';
import { learnerDashboardRoutes } from './routes/dashboard';
import { webExperienceRoutes } from './routes/experiences';
import { webExpertiseRoutes } from './routes/expertises';
import { webExpertRoutes } from './routes/experts';
import { webFavoriteRoutes } from './routes/favorites';
import { webHomeRoutes } from './routes/home';
import { webHubRoutes } from './routes/hubs';
import { webJobRoutes } from './routes/jobs';
import {
  experienceReviewsRoutes,
  expertiseReviewsRoutes,
  hubPublicReviewsRoutes,
  userBookingReviewRoutes,
  userReviewRoutes,
} from './routes/reviews';
import { searchRoutes } from './routes/search';

/**
 * Web Module - Public marketplace routes (mereka.io)
 * Routes for public-facing web pages (no authentication required)
 */
export async function webModule(fastify: FastifyInstance) {
  // Register home routes
  await fastify.register(webHomeRoutes, { prefix: '/home' });

  // Register experience routes
  await fastify.register(webExperienceRoutes, { prefix: '/experiences' });

  // Register expertise routes
  await fastify.register(webExpertiseRoutes, { prefix: '/expertises' });

  // Register expert routes
  await fastify.register(webExpertRoutes, { prefix: '/experts' });

  // Register hub routes
  await fastify.register(webHubRoutes, { prefix: '/hubs' });

  // Register job routes
  await fastify.register(webJobRoutes, { prefix: '/jobs' });

  // Register search routes (unified search across all entities)
  await fastify.register(searchRoutes, { prefix: '/search' });

  // Register checkout routes (authentication required)
  await fastify.register(webCheckoutRoutes, { prefix: '/checkout' });

  // Register favorites routes (authentication required)
  await fastify.register(webFavoriteRoutes, { prefix: '/favorites' });

  // Register user booking routes (my bookings - authentication required)
  await fastify.register(userBookingRoutes, { prefix: '/me/bookings' });

  // Register learner dashboard routes (overview - authentication required)
  await fastify.register(learnerDashboardRoutes, { prefix: '/me/overview' });

  // Register learner account routes (account details - authentication required)
  await fastify.register(learnerAccountRoutes, { prefix: '/me/account' });

  // Register notification preference routes (authentication required)
  await fastify.register(notificationPreferenceRoutes, { prefix: '/me/notification-preferences' });

  // Register hub-specific notification preference routes (authentication required)
  await fastify.register(userHubNotificationPreferenceRoutes, {
    prefix: '/me/notification-preferences',
  });

  // Register communication log routes (authentication required)
  await fastify.register(communicationLogRoutes, { prefix: '/me/communication-logs' });

  // Register user notification routes (authentication required)
  await fastify.register(userNotificationRoutes, { prefix: '/me/notifications' });

  // Register user chat routes (learner inbox - authentication required)
  await fastify.register(userChatRoutes, { prefix: '/learner/chat' });

  // Register learner review routes (authentication required)
  await fastify.register(userReviewRoutes, { prefix: '/learner/reviews' });

  // Register learner booking review routes (get review by booking - authentication required)
  await fastify.register(userBookingReviewRoutes, { prefix: '/learner/bookings' });

  // Register public review routes (no authentication required)
  await fastify.register(experienceReviewsRoutes, { prefix: '/experiences' });
  await fastify.register(expertiseReviewsRoutes, { prefix: '/expertises' });
  await fastify.register(hubPublicReviewsRoutes, { prefix: '/hubs' });
}

/**
 * Webhook routes - separate registration (no API prefix, no auth)
 */
export async function webhookModule(fastify: FastifyInstance) {
  const { hubWebhookRoutes } = await import('@routes/hub');
  await fastify.register(hubWebhookRoutes, { prefix: '/webhook' });
}
