import {
  acceptOffer,
  applyTermsUpdate,
  cancelContract,
  completeContract,
  createContract,
  createContractPaymentSetup,
  declineOffer,
  getContract,
  getContractPaymentMethods,
  getContractPaymentRegion,
  getContracts,
  getPendingOffers,
  listHubContracts,
  pauseContract,
  requestTermsUpdate,
  resumeContract,
  sendOffer,
  updateContract,
} from '@controllers/hub';
import { requireAuth } from '@core/middlewares/auth.middleware';
import { loadHubContext, requireHubAccess } from '@core/middlewares/hubPermission.middleware';
import {
  hubAcceptOfferSchema,
  hubApplyTermsUpdateSchema,
  hubCancelContractSchema,
  hubCompleteContractSchema,
  hubCreateContractSchema,
  hubDeclineOfferSchema,
  hubGetContractSchema,
  hubGetContractsSchema,
  hubGetPendingOffersSchema,
  hubListContractsSchema,
  hubPauseContractSchema,
  hubRequestTermsUpdateSchema,
  hubResumeContractSchema,
  hubSendOfferSchema,
  hubUpdateContractSchema,
} from '@schemas/hub';
import type { FastifyInstance } from 'fastify';

export async function hubContractRoutes(fastify: FastifyInstance) {
  // Create Contract
  fastify.post('/', {
    schema: {
      tags: ['Contracts'],
      summary: 'Create a new contract',
      description: 'Create a contract from an accepted proposal',
      body: hubCreateContractSchema.body,
    },
    preHandler: [requireAuth],
    handler: createContract,
  });

  // List Contracts
  fastify.get('/', {
    schema: {
      tags: ['Contracts'],
      summary: 'List contracts',
      description:
        'Get contracts with filters (hubId, expertId, clientId, jobId, status, priceType)',
      querystring: hubGetContractsSchema.querystring,
    },
    handler: getContracts,
  });

  // Get Contract by ID
  fastify.get('/:contractId', {
    schema: {
      tags: ['Contracts'],
      summary: 'Get contract details',
      params: hubGetContractSchema.params,
    },
    handler: getContract,
  });

  // Update Contract
  fastify.patch('/:contractId', {
    schema: {
      tags: ['Contracts'],
      summary: 'Update contract',
      description: 'Update contract details',
      params: hubUpdateContractSchema.params,
      body: hubUpdateContractSchema.body,
    },
    preHandler: [requireAuth],
    handler: updateContract,
  });

  // Cancel Contract
  fastify.post('/:contractId/cancel', {
    schema: {
      tags: ['Contracts'],
      summary: 'Cancel contract',
      description: 'Cancel an active or paused contract',
      params: hubCancelContractSchema.params,
      body: hubCancelContractSchema.body,
    },
    preHandler: [requireAuth],
    handler: cancelContract,
  });

  // Pause Contract
  fastify.post('/:contractId/pause', {
    schema: {
      tags: ['Contracts'],
      summary: 'Pause contract',
      description: 'Temporarily pause an active contract',
      params: hubPauseContractSchema.params,
      body: hubPauseContractSchema.body,
    },
    preHandler: [requireAuth],
    handler: pauseContract,
  });

  // Resume Contract
  fastify.post('/:contractId/resume', {
    schema: {
      tags: ['Contracts'],
      summary: 'Resume contract',
      description: 'Resume a paused contract',
      params: hubResumeContractSchema.params,
    },
    preHandler: [requireAuth],
    handler: resumeContract,
  });

  // Complete Contract (only client can complete)
  fastify.post('/:contractId/complete', {
    schema: {
      tags: ['Contracts'],
      summary: 'Complete contract',
      description:
        'Mark the contract as completed. Only the client can complete a contract. The contract must be active or paused.',
      params: hubCompleteContractSchema.params,
      body: hubCompleteContractSchema.body,
    },
    preHandler: [requireAuth],
    handler: completeContract,
  });

  // Request Terms Update (for hourly contracts)
  fastify.post('/:contractId/terms-update/request', {
    schema: {
      tags: ['Contracts'],
      summary: 'Request terms update',
      description: 'Request to change hourly rate or weekly limit for hourly contracts',
      params: hubRequestTermsUpdateSchema.params,
      body: hubRequestTermsUpdateSchema.body,
    },
    preHandler: [requireAuth],
    handler: requestTermsUpdate,
  });

  // Apply Terms Update
  fastify.post('/:contractId/terms-update/apply', {
    schema: {
      tags: ['Contracts'],
      summary: 'Apply terms update',
      description: 'Approve and apply pending terms update',
      params: hubApplyTermsUpdateSchema.params,
    },
    preHandler: [requireAuth],
    handler: applyTermsUpdate,
  });

  // ============================================================
  // Offer Routes - Contract Offer Flow
  // ============================================================

  // Send Offer (Client creates contract offer for expert)
  fastify.post('/offers', {
    schema: {
      tags: ['Offers'],
      summary: 'Send contract offer',
      description:
        'Client sends a contract offer to an expert. Creates contract in PENDING status with optional milestones.',
      body: hubSendOfferSchema.body,
    },
    preHandler: [requireAuth],
    handler: sendOffer,
  });

  // Get Pending Offers (for expert)
  fastify.get('/offers/pending', {
    schema: {
      tags: ['Offers'],
      summary: 'Get pending offers',
      description: 'Returns pending contract offers for the current expert',
      querystring: hubGetPendingOffersSchema.querystring,
    },
    preHandler: [requireAuth],
    handler: getPendingOffers,
  });

  // Accept Offer (Expert accepts the offer)
  fastify.post('/:contractId/accept', {
    schema: {
      tags: ['Offers'],
      summary: 'Accept contract offer',
      description:
        'Expert accepts the contract offer. Validates payout setup and transitions contract to ACTIVE.',
      params: hubAcceptOfferSchema.params,
      body: hubAcceptOfferSchema.body,
    },
    preHandler: [requireAuth],
    handler: acceptOffer,
  });

  // Decline Offer (Expert declines the offer)
  fastify.post('/:contractId/decline', {
    schema: {
      tags: ['Offers'],
      summary: 'Decline contract offer',
      description:
        'Expert declines the contract offer. Refunds any funded milestones and transitions contract to CANCELLED.',
      params: hubDeclineOfferSchema.params,
      body: hubDeclineOfferSchema.body,
    },
    preHandler: [requireAuth],
    handler: declineOffer,
  });

  // =========================================================================
  // Contract Payment Setup (Multi-Region Stripe)
  // =========================================================================

  // Get contract payment region and publishable key
  fastify.get('/:contractId/payment-region', {
    schema: {
      tags: ['Contract Payments'],
      summary: 'Get contract payment region',
      description:
        "Get the Stripe region and publishable key for a contract (based on expert's region)",
      params: {
        type: 'object',
        required: ['contractId'],
        properties: {
          contractId: { type: 'string', description: 'Contract ID' },
        },
      },
    },
    preHandler: [requireAuth],
    handler: getContractPaymentRegion,
  });

  // Get payment methods for contract
  fastify.get('/:contractId/payment-methods', {
    schema: {
      tags: ['Contract Payments'],
      summary: 'Get payment methods for contract',
      description: "Get available payment methods on the contract's regional Stripe platform",
      params: {
        type: 'object',
        required: ['contractId'],
        properties: {
          contractId: { type: 'string', description: 'Contract ID' },
        },
      },
      querystring: {
        type: 'object',
        required: ['hubId'],
        properties: {
          hubId: { type: 'string', description: 'Client hub ID' },
        },
      },
    },
    preHandler: [requireAuth],
    handler: getContractPaymentMethods,
  });

  // Create setup intent for adding payment method
  fastify.post('/:contractId/payment-setup', {
    schema: {
      tags: ['Contract Payments'],
      summary: 'Create payment setup for contract',
      description:
        "Create a SetupIntent on the contract's regional Stripe platform for adding a payment method",
      params: {
        type: 'object',
        required: ['contractId'],
        properties: {
          contractId: { type: 'string', description: 'Contract ID' },
        },
      },
      body: {
        type: 'object',
        required: ['hubId'],
        properties: {
          hubId: { type: 'string', description: 'Client hub ID' },
        },
      },
    },
    preHandler: [requireAuth],
    handler: createContractPaymentSetup,
  });
}

/**
 * Hub Scoped Contract Routes
 * Prefix: /api/v1/hub/:hubId/contracts
 */
export async function hubScopedContractRoutes(fastify: FastifyInstance) {
  // Common preHandlers for hub-scoped routes
  const contractPreHandlers = [requireAuth, loadHubContext, requireHubAccess];

  // List all contracts for this hub
  fastify.get('/', {
    schema: {
      tags: ['Hub Contracts'],
      summary: 'List contracts for hub',
      description: 'Get all contracts for this hub',
      params: hubListContractsSchema.params,
      querystring: hubListContractsSchema.querystring,
    },
    preHandler: contractPreHandlers,
    handler: listHubContracts,
  });

  // Get single contract
  fastify.get('/:contractId', {
    schema: {
      tags: ['Hub Contracts'],
      summary: 'Get contract details',
      params: hubGetContractSchema.params,
    },
    preHandler: contractPreHandlers,
    handler: getContract,
  });
}
