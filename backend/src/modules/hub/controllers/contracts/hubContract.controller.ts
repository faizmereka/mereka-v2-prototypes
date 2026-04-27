import type {
  HubAcceptOfferInput,
  HubAcceptOfferParams,
  HubApplyTermsUpdateParams,
  HubCancelContractInput,
  HubCompleteContractInput,
  HubCompleteContractParams,
  HubCreateContractInput,
  HubDeclineOfferInput,
  HubDeclineOfferParams,
  HubGetContractsQuery,
  HubGetPendingOffersQuery,
  HubListContractsParams,
  HubListContractsQuery,
  HubPauseContractInput,
  HubRequestTermsUpdateInput,
  HubSendOfferInput,
  HubUpdateContractInput,
} from '@schemas/hub';

import { hubContractService } from '@services/hub';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Create a new contract
 */
export async function createContract(
  request: FastifyRequest<{ Body: HubCreateContractInput }>,
  reply: FastifyReply,
) {
  try {
    // @ts-expect-error - user is defined by auth middleware with 'sub' as user ID
    const userId = request.user?.sub || request.user?.id;
    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User ID not found in token' },
      });
    }

    const contract = await hubContractService.createContract(request.body, userId);

    return reply.status(201).send({
      success: true,
      data: contract,
      message: 'Contract created successfully',
    });
  } catch (error) {
    request.log.error({ error, body: request.body }, 'Error creating contract');
    const statusCode =
      error instanceof Error && error.message.includes('already exists') ? 409 : 400;

    return reply.status(statusCode).send({
      success: false,
      error: {
        code: 'CONTRACT_CREATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create contract',
      },
    });
  }
}

/**
 * Get contracts with filters
 */
export async function getContracts(
  request: FastifyRequest<{ Querystring: HubGetContractsQuery }>,
  reply: FastifyReply,
) {
  try {
    const result = await hubContractService.getContracts(request.query);

    return reply.send({
      success: true,
      data: result.items,
      meta: result.pagination,
    });
  } catch (error) {
    request.log.error({ error, query: request.query }, 'Error fetching contracts');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'CONTRACT_LIST_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch contracts',
      },
    });
  }
}

/**
 * List contracts for a hub (hubId from path params)
 * Used in scoped hub routes: /hub/:hubId/contracts
 *
 * Default: Returns contracts where this hub is the CLIENT (employer)
 * With expertHubId query param: Returns contracts where this hub's experts are assigned
 */
export async function listHubContracts(
  request: FastifyRequest<{
    Params: HubListContractsParams;
    Querystring: HubListContractsQuery & { expertHubId?: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const { hubId } = request.params;
    const { expertHubId, ...restQuery } = request.query;

    // If expertHubId is passed, filter by expert's hub
    // Otherwise, default to clientHubId (employer perspective)
    const query = expertHubId
      ? { ...restQuery, expertHubId }
      : { ...restQuery, clientHubId: hubId };

    const result = await hubContractService.getContracts(query);

    return reply.send({
      success: true,
      data: result.items,
      meta: result.pagination,
    });
  } catch (error) {
    request.log.error(
      { error, params: request.params, query: request.query },
      'Error fetching hub contracts',
    );
    return reply.status(400).send({
      success: false,
      error: {
        code: 'CONTRACT_LIST_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch contracts',
      },
    });
  }
}

/**
 * Get contract by ID
 */
export async function getContract(
  request: FastifyRequest<{ Params: { contractId: string } }>,
  reply: FastifyReply,
) {
  try {
    const contract = await hubContractService.getContractById(request.params.contractId);

    return reply.send({
      success: true,
      data: contract,
    });
  } catch (error) {
    request.log.error({ error, params: request.params }, 'Error fetching contract');
    const statusCode = error instanceof Error && error.message === 'Contract not found' ? 404 : 400;

    return reply.status(statusCode).send({
      success: false,
      error: {
        code: 'CONTRACT_GET_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch contract',
      },
    });
  }
}

/**
 * Update contract
 */
export async function updateContract(
  request: FastifyRequest<{ Params: { contractId: string }; Body: HubUpdateContractInput }>,
  reply: FastifyReply,
) {
  try {
    // @ts-expect-error - user is defined by auth middleware with 'sub' as user ID
    const userId = request.user?.sub || request.user?.id;
    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User ID not found in token' },
      });
    }

    const contract = await hubContractService.updateContract(
      request.params.contractId,
      request.body,
      userId,
    );

    return reply.send({
      success: true,
      data: contract,
      message: 'Contract updated successfully',
    });
  } catch (error) {
    request.log.error(
      { error, params: request.params, body: request.body },
      'Error updating contract',
    );
    const statusCode = error instanceof Error && error.message === 'Contract not found' ? 404 : 403;

    return reply.status(statusCode).send({
      success: false,
      error: {
        code: 'CONTRACT_UPDATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update contract',
      },
    });
  }
}

/**
 * Cancel contract
 */
export async function cancelContract(
  request: FastifyRequest<{ Params: { contractId: string }; Body: HubCancelContractInput }>,
  reply: FastifyReply,
) {
  try {
    // @ts-expect-error - user is defined by auth middleware with 'sub' as user ID
    const userId = request.user?.sub || request.user?.id;
    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User ID not found in token' },
      });
    }

    const contract = await hubContractService.cancelContract(
      request.params.contractId,
      userId,
      request.body,
    );

    return reply.send({
      success: true,
      data: contract,
      message: 'Contract cancelled successfully',
    });
  } catch (error) {
    request.log.error({ error, params: request.params }, 'Error cancelling contract');
    const statusCode = error instanceof Error && error.message === 'Contract not found' ? 404 : 403;

    return reply.status(statusCode).send({
      success: false,
      error: {
        code: 'CONTRACT_CANCEL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to cancel contract',
      },
    });
  }
}

/**
 * Pause contract
 */
export async function pauseContract(
  request: FastifyRequest<{ Params: { contractId: string }; Body: HubPauseContractInput }>,
  reply: FastifyReply,
) {
  try {
    // @ts-expect-error - user is defined by auth middleware with 'sub' as user ID
    const userId = request.user?.sub || request.user?.id;
    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User ID not found in token' },
      });
    }

    const contract = await hubContractService.pauseContract(
      request.params.contractId,
      userId,
      request.body,
    );

    return reply.send({
      success: true,
      data: contract,
      message: 'Contract paused successfully',
    });
  } catch (error) {
    request.log.error({ error, params: request.params }, 'Error pausing contract');
    const statusCode = error instanceof Error && error.message === 'Contract not found' ? 404 : 403;

    return reply.status(statusCode).send({
      success: false,
      error: {
        code: 'CONTRACT_PAUSE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to pause contract',
      },
    });
  }
}

/**
 * Resume paused contract
 */
export async function resumeContract(
  request: FastifyRequest<{ Params: { contractId: string } }>,
  reply: FastifyReply,
) {
  try {
    // @ts-expect-error - user is defined by auth middleware with 'sub' as user ID
    const userId = request.user?.sub || request.user?.id;
    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User ID not found in token' },
      });
    }

    const contract = await hubContractService.resumeContract(request.params.contractId, userId);

    return reply.send({
      success: true,
      data: contract,
      message: 'Contract resumed successfully',
    });
  } catch (error) {
    request.log.error({ error, params: request.params }, 'Error resuming contract');
    const statusCode = error instanceof Error && error.message === 'Contract not found' ? 404 : 403;

    return reply.status(statusCode).send({
      success: false,
      error: {
        code: 'CONTRACT_RESUME_ERROR',
        message: error instanceof Error ? error.message : 'Failed to resume contract',
      },
    });
  }
}

/**
 * Complete contract (only client can complete)
 */
export async function completeContract(
  request: FastifyRequest<{ Params: HubCompleteContractParams; Body: HubCompleteContractInput }>,
  reply: FastifyReply,
) {
  try {
    // @ts-expect-error - user is defined by auth middleware with 'sub' as user ID
    const userId = request.user?.sub || request.user?.id;
    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User ID not found in token' },
      });
    }

    const contract = await hubContractService.completeContract(
      request.params.contractId,
      userId,
      request.body,
    );

    return reply.send({
      success: true,
      data: contract,
      message: 'Contract completed successfully',
    });
  } catch (error) {
    request.log.error(
      { error, params: request.params, body: request.body },
      'Error completing contract',
    );

    let statusCode = 400;
    if (error instanceof Error) {
      if (error.message === 'Contract not found') statusCode = 404;
      if (error.message.includes('Only the client')) statusCode = 403;
      if (error.message.includes('Only active or paused')) statusCode = 409;
    }

    return reply.status(statusCode).send({
      success: false,
      error: {
        code: 'CONTRACT_COMPLETE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to complete contract',
      },
    });
  }
}

/**
 * Request terms update (hourly contracts)
 */
export async function requestTermsUpdate(
  request: FastifyRequest<{ Params: { contractId: string }; Body: HubRequestTermsUpdateInput }>,
  reply: FastifyReply,
) {
  try {
    // @ts-expect-error - user is defined by auth middleware with 'sub' as user ID
    const userId = request.user?.sub || request.user?.id;
    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User ID not found in token' },
      });
    }

    const contract = await hubContractService.requestTermsUpdate(
      request.params.contractId,
      request.body,
      userId,
    );

    return reply.send({
      success: true,
      data: contract,
      message: 'Terms update requested successfully',
    });
  } catch (error) {
    request.log.error(
      { error, params: request.params, body: request.body },
      'Error requesting terms update',
    );
    const statusCode = error instanceof Error && error.message === 'Contract not found' ? 404 : 403;

    return reply.status(statusCode).send({
      success: false,
      error: {
        code: 'CONTRACT_TERMS_UPDATE_REQUEST_ERROR',
        message: error instanceof Error ? error.message : 'Failed to request terms update',
      },
    });
  }
}

/**
 * Apply pending terms update
 */
export async function applyTermsUpdate(
  request: FastifyRequest<{ Params: HubApplyTermsUpdateParams }>,
  reply: FastifyReply,
) {
  try {
    // @ts-expect-error - user is defined by auth middleware with 'sub' as user ID
    const userId = request.user?.sub || request.user?.id;
    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User ID not found in token' },
      });
    }

    const contract = await hubContractService.applyTermsUpdate(request.params, userId);

    return reply.send({
      success: true,
      data: contract,
      message: 'Terms update applied successfully',
    });
  } catch (error) {
    request.log.error({ error, params: request.params }, 'Error applying terms update');
    const statusCode = error instanceof Error && error.message === 'Contract not found' ? 404 : 403;

    return reply.status(statusCode).send({
      success: false,
      error: {
        code: 'CONTRACT_TERMS_UPDATE_APPLY_ERROR',
        message: error instanceof Error ? error.message : 'Failed to apply terms update',
      },
    });
  }
}

// ============================================================
// Offer Controllers - Contract Offer Flow
// ============================================================

/**
 * Send Offer - Client creates a contract offer for an expert
 * Creates contract in PENDING status with optional milestones
 * POST /api/hub/contracts/offers
 */
export async function sendOffer(
  request: FastifyRequest<{ Body: HubSendOfferInput }>,
  reply: FastifyReply,
) {
  try {
    // @ts-expect-error - user is defined by auth middleware with 'sub' as user ID
    const userId = request.user?.sub || request.user?.id;
    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User ID not found in token' },
      });
    }

    const result = await hubContractService.sendOffer(request.body, userId);

    return reply.status(201).send({
      success: true,
      data: result,
      message: 'Offer sent successfully',
    });
  } catch (error) {
    request.log.error({ error, body: request.body }, 'Error sending offer');

    // Determine appropriate status code based on error
    let statusCode = 400;
    if (error instanceof Error) {
      if (error.message.includes('already exists')) statusCode = 409;
      if (error.message.includes('not found')) statusCode = 404;
    }

    return reply.status(statusCode).send({
      success: false,
      error: {
        code: 'OFFER_SEND_ERROR',
        message: error instanceof Error ? error.message : 'Failed to send offer',
      },
    });
  }
}

/**
 * Accept Offer - Expert accepts the contract offer
 * Validates payout setup and transitions contract to ACTIVE
 * POST /api/hub/contracts/:contractId/accept
 */
export async function acceptOffer(
  request: FastifyRequest<{ Params: HubAcceptOfferParams; Body: HubAcceptOfferInput }>,
  reply: FastifyReply,
) {
  try {
    // @ts-expect-error - user is defined by auth middleware with 'sub' as user ID
    const userId = request.user?.sub;
    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    const contract = await hubContractService.acceptOffer(
      request.params.contractId,
      userId,
      request.body,
    );

    return reply.send({
      success: true,
      data: contract,
      message: 'Offer accepted successfully',
    });
  } catch (error) {
    request.log.error(
      { error, params: request.params, body: request.body },
      'Error accepting offer',
    );

    // Determine appropriate status code based on error
    let statusCode = 400;
    if (error instanceof Error) {
      if (error.message.includes('not found')) statusCode = 404;
      if (error.message.includes('Only the assigned expert')) statusCode = 403;
      if (error.message.includes('not a pending offer')) statusCode = 409;
      if (error.message.includes('payout account') || error.message.includes('Stripe account')) {
        statusCode = 422; // Unprocessable Entity - expert needs to set up payout
      }
    }

    return reply.status(statusCode).send({
      success: false,
      error: {
        code: 'OFFER_ACCEPT_ERROR',
        message: error instanceof Error ? error.message : 'Failed to accept offer',
      },
    });
  }
}

/**
 * Decline Offer - Expert declines the contract offer
 * Refunds any funded milestones and transitions contract to CANCELLED
 * POST /api/hub/contracts/:contractId/decline
 */
export async function declineOffer(
  request: FastifyRequest<{ Params: HubDeclineOfferParams; Body: HubDeclineOfferInput }>,
  reply: FastifyReply,
) {
  try {
    // @ts-expect-error - user is defined by auth middleware with 'sub' as user ID
    const userId = request.user?.sub;
    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    const contract = await hubContractService.declineOffer(
      request.params.contractId,
      userId,
      request.body,
    );

    return reply.send({
      success: true,
      data: contract,
      message: 'Offer declined successfully',
    });
  } catch (error) {
    request.log.error(
      { error, params: request.params, body: request.body },
      'Error declining offer',
    );

    // Determine appropriate status code based on error
    let statusCode = 400;
    if (error instanceof Error) {
      if (error.message.includes('not found')) statusCode = 404;
      if (error.message.includes('Only the assigned expert')) statusCode = 403;
      if (error.message.includes('not a pending offer')) statusCode = 409;
    }

    return reply.status(statusCode).send({
      success: false,
      error: {
        code: 'OFFER_DECLINE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to decline offer',
      },
    });
  }
}

/**
 * Get Pending Offers - Returns pending offers for the current expert
 * GET /api/hub/contracts/offers/pending
 */
export async function getPendingOffers(
  request: FastifyRequest<{ Querystring: HubGetPendingOffersQuery }>,
  reply: FastifyReply,
) {
  try {
    // @ts-expect-error - user is defined by auth middleware with 'sub' as user ID
    const userId = request.user?.sub || request.user?.id;
    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User ID not found in token' },
      });
    }

    const result = await hubContractService.getPendingOffers(userId, request.query);

    return reply.send({
      success: true,
      data: result.items,
      meta: result.pagination,
    });
  } catch (error) {
    request.log.error({ error, query: request.query }, 'Error fetching pending offers');

    return reply.status(400).send({
      success: false,
      error: {
        code: 'PENDING_OFFERS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch pending offers',
      },
    });
  }
}
