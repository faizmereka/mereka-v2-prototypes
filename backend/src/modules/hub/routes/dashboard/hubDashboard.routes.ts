import {
  getCollaboratorDashboard,
  getHubDashboardOrders,
  getHubDashboardStats,
  getHubOnboardingStatus,
} from '@controllers/hub';
import { PERMISSIONS } from '@core/constants';
import { requireAuth } from '@core/middlewares/auth.middleware';
import {
  loadHubContext,
  requireHubAccess,
  requireHubPermission,
} from '@core/middlewares/hubPermission.middleware';
import type { FastifyInstance } from 'fastify';

/**
 * Hub Dashboard routes - Dashboard data for hub owners/members
 * Base path: /hub/:hubId/dashboard
 */
export async function hubDashboardRoutes(fastify: FastifyInstance): Promise<void> {
  // Common preHandlers for all dashboard routes
  const dashboardPreHandlers = [requireAuth, loadHubContext, requireHubAccess];

  /**
   * Get hub dashboard statistics
   */
  fastify.get('/stats', {
    preHandler: [...dashboardPreHandlers, requireHubPermission(PERMISSIONS.ANALYTICS_VIEW)],
    schema: {
      tags: ['Hub Dashboard'],
      summary: 'Get hub dashboard statistics',
      description:
        'Get hub dashboard stats including earnings, listing counts, and active orders summary',
      params: {
        type: 'object',
        required: ['hubId'],
        properties: {
          hubId: {
            type: 'string',
            description: 'Hub ID to get stats for',
          },
        },
      },
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                earnings: {
                  type: 'object',
                  properties: {
                    total: { type: 'number' },
                    thisMonth: { type: 'number' },
                    currency: { type: 'string' },
                  },
                },
                listings: {
                  type: 'object',
                  properties: {
                    services: { type: 'number' },
                    experiences: { type: 'number' },
                    gigs: { type: 'number' },
                    spaces: { type: 'number' },
                  },
                },
                orders: {
                  type: 'object',
                  properties: {
                    active: { type: 'number' },
                    totalValue: { type: 'number' },
                  },
                },
              },
            },
          },
        },
      },
    },
    handler: getHubDashboardStats,
  });

  /**
   * Get hub active orders
   */
  fastify.get('/orders', {
    preHandler: [...dashboardPreHandlers, requireHubPermission(PERMISSIONS.BOOKING_VIEW)],
    schema: {
      tags: ['Hub Dashboard'],
      summary: 'Get hub active orders',
      description: 'Get service requests and experience bookings for the hub dashboard',
      params: {
        type: 'object',
        required: ['hubId'],
        properties: {
          hubId: {
            type: 'string',
            description: 'Hub ID to get orders for',
          },
        },
      },
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                serviceRequests: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      contactName: { type: 'string' },
                      contactEmail: { type: 'string' },
                      contactAvatar: { type: 'string' },
                      expertise: { type: 'string' },
                      dateTime: { type: 'string' },
                      mode: { type: 'string' },
                      paidAmount: { type: 'string' },
                    },
                  },
                },
                experienceBookings: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      title: { type: 'string' },
                      image: { type: 'string' },
                      status: { type: 'string' },
                      lastBooked: { type: 'string' },
                      tickets: { type: 'number' },
                      profit: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    handler: getHubDashboardOrders,
  });

  /**
   * Get hub onboarding status
   */
  fastify.get('/onboarding', {
    preHandler: dashboardPreHandlers,
    schema: {
      tags: ['Hub Dashboard'],
      summary: 'Get hub onboarding status',
      description: 'Get profile completion status and setup prompts data',
      params: {
        type: 'object',
        required: ['hubId'],
        properties: {
          hubId: {
            type: 'string',
            description: 'Hub ID to get onboarding status for',
          },
        },
      },
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                profileComplete: { type: 'boolean' },
                profileCompletionPercentage: { type: 'number' },
                stripeVerified: { type: 'boolean' },
                hasWorkExperience: { type: 'boolean' },
                missingFields: {
                  type: 'array',
                  items: { type: 'string' },
                },
                subscription: {
                  type: 'object',
                  properties: {
                    planCode: { type: ['string', 'null'] },
                    planName: { type: 'string' },
                    status: { type: ['string', 'null'] },
                  },
                },
              },
            },
          },
        },
      },
    },
    handler: getHubOnboardingStatus,
  });

  /**
   * Get collaborator dashboard data
   */
  fastify.get('/collaborator', {
    preHandler: [
      ...dashboardPreHandlers,
      requireHubPermission(PERMISSIONS.COLLABORATOR_VIEW_DASHBOARD),
    ],
    schema: {
      tags: ['Hub Dashboard'],
      summary: 'Get collaborator dashboard',
      description: 'Get collaborator dashboard data including hub info and accessible experiences',
      params: {
        type: 'object',
        required: ['hubId'],
        properties: {
          hubId: {
            type: 'string',
            description: 'Hub ID to get collaborator dashboard for',
          },
        },
      },
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                hub: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    logo: { type: 'string' },
                    companyType: { type: 'string' },
                    location: {
                      type: 'object',
                      properties: {
                        city: { type: 'string' },
                        country: { type: 'string' },
                      },
                    },
                  },
                },
                experienceCount: { type: 'number' },
                bookingCount: { type: 'number' },
                experiences: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      _id: { type: 'string' },
                      title: { type: 'string' },
                      slug: { type: 'string' },
                      status: { type: 'string' },
                      coverPhoto: { type: 'string' },
                      hostDetails: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            name: { type: 'string' },
                            email: { type: 'string' },
                          },
                        },
                      },
                    },
                  },
                },
                bookings: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      _id: { type: 'string' },
                      experienceId: { type: 'string' },
                      experienceTitle: { type: 'string' },
                      experienceSlug: { type: 'string' },
                      customerName: { type: 'string' },
                      customerEmail: { type: 'string' },
                      bookingDate: { type: 'string' },
                      status: { type: 'string' },
                      totalCost: { type: 'number' },
                      currency: { type: 'string' },
                      ticketCount: { type: 'number' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    handler: getCollaboratorDashboard,
  });
}
