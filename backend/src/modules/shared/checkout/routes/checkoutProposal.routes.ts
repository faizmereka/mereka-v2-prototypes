/**
 * Checkout Proposal Routes
 * Used by checkout.mereka.io for proposal submission
 */

import { requireAuth } from '@core/middlewares/auth.middleware';
import {
  checkoutProposalInitSchema,
  submitProposalSchema,
} from '@core/schemas/shared/checkout/checkoutProposal.schema';
import type { FastifyInstance } from 'fastify';
import {
  getProposalSuccess,
  initProposalCheckout,
  submitProposal,
} from '../controllers/checkoutProposal.controller';

const objectIdPattern = '^[0-9a-fA-F]{24}$';

/**
 * Checkout Proposal Routes
 * Prefix: /checkout/proposal
 */
export async function checkoutProposalRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * Initialize proposal checkout
   * GET /checkout/proposal/:jobId
   */
  fastify.get<{ Params: { jobId: string } }>('/:jobId', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Checkout - Proposal'],
      summary: 'Initialize proposal checkout',
      description: 'Get job details and check for existing proposal before submitting',
      params: checkoutProposalInitSchema.params,
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                job: {
                  type: 'object',
                  properties: {
                    _id: { type: 'string' },
                    jobTitle: { type: 'string' },
                    jobDescription: { type: 'string' },
                    jobSummary: { type: 'string' },
                    employmentType: { type: 'string' },
                    serviceCategory: {
                      type: 'object',
                      properties: {
                        category: { type: 'string' },
                        serviceType: { type: 'string' },
                      },
                    },
                    expertLevel: { type: 'string' },
                    jobLocation: { type: 'string' },
                    jobBudget: {
                      type: 'object',
                      properties: {
                        pricingType: { type: 'string', enum: ['fixed', 'hourly'] },
                        fromAmount: { type: 'number' },
                        upToAmount: { type: 'number' },
                      },
                    },
                    jobCurrency: { type: 'string' },
                    jobSkills: { type: 'array', items: { type: 'string' } },
                    client: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        organizationName: { type: 'string' },
                        organizationImage: { type: 'string' },
                      },
                    },
                  },
                },
                expert: {
                  type: 'object',
                  properties: {
                    _id: { type: 'string' },
                    name: { type: 'string' },
                    email: { type: 'string' },
                    profilePhoto: { type: 'string' },
                    professionalTitle: { type: 'string' },
                  },
                },
                hubExperts: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      _id: { type: 'string' },
                      name: { type: 'string' },
                      email: { type: 'string' },
                      profileImage: { type: 'string' },
                    },
                  },
                },
                hubPlan: { type: 'string' },
                hasExistingProposal: { type: 'boolean' },
                existingProposalId: { type: 'string' },
              },
            },
          },
        },
        404: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
        },
      },
    },
    handler: initProposalCheckout,
  });

  /**
   * Submit proposal
   * POST /checkout/proposal
   */
  fastify.post('/', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Checkout - Proposal'],
      summary: 'Submit proposal',
      description: 'Submit a proposal for a job',
      body: submitProposalSchema.body,
      security: [{ bearerAuth: [] }],
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                proposalId: { type: 'string' },
                status: { type: 'string' },
              },
            },
            message: { type: 'string' },
          },
        },
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
        },
        409: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
        },
      },
    },
    handler: submitProposal,
  });

  /**
   * Get proposal success details
   * GET /checkout/proposal/success/:proposalId
   */
  fastify.get<{ Params: { proposalId: string } }>('/success/:proposalId', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Checkout - Proposal'],
      summary: 'Get proposal success details',
      description: 'Get proposal details for success page after submission',
      params: {
        type: 'object',
        required: ['proposalId'],
        properties: {
          proposalId: {
            type: 'string',
            pattern: objectIdPattern,
            description: 'Proposal ID',
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
                proposal: {
                  type: 'object',
                  properties: {
                    _id: { type: 'string' },
                    status: { type: 'string' },
                    proposalDetails: { type: 'string' },
                    priceType: { type: 'string' },
                    proposedPrice: { type: 'number' },
                    hourlyProposedPrice: { type: 'number' },
                    workingHours: { type: 'number' },
                    selectedCurrency: { type: 'string' },
                    createdAt: { type: 'string', format: 'date-time' },
                  },
                },
                job: {
                  type: 'object',
                  nullable: true,
                  properties: {
                    _id: { type: 'string' },
                    jobTitle: { type: 'string' },
                    client: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        organizationName: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        404: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
        },
      },
    },
    handler: getProposalSuccess,
  });
}
