import type { ContractStatus } from '@core/models/Contract';
import { type AdminListContractsQuery, adminContractService } from '@core/services/admin';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * List contracts with filtering and pagination
 */
export async function listContracts(
  request: FastifyRequest<{
    Querystring: AdminListContractsQuery;
  }>,
  reply: FastifyReply,
) {
  try {
    const result = await adminContractService.listContracts(request.query);

    return reply.status(200).send({
      success: true,
      data: result.items,
      meta: result.pagination,
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to list contracts');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'LIST_CONTRACTS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to list contracts',
      },
    });
  }
}

/**
 * Get contract by ID
 */
export async function getContractById(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    const contract = await adminContractService.getContractById(request.params.id);

    return reply.status(200).send({
      success: true,
      data: contract,
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to get contract');

    if (error instanceof Error && error.message === 'Contract not found') {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'CONTRACT_NOT_FOUND',
          message: 'Contract not found',
        },
      });
    }

    return reply.status(500).send({
      success: false,
      error: {
        code: 'GET_CONTRACT_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get contract',
      },
    });
  }
}

/**
 * Update contract status
 */
export async function updateContractStatus(
  request: FastifyRequest<{
    Params: { id: string };
    Body: { status: ContractStatus; reason?: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const { status } = request.body;
    const contract = await adminContractService.updateContractStatus(request.params.id, status);

    return reply.status(200).send({
      success: true,
      data: contract,
      message: `Contract status updated to ${status}`,
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to update contract status');

    if (error instanceof Error && error.message === 'Contract not found') {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'CONTRACT_NOT_FOUND',
          message: 'Contract not found',
        },
      });
    }

    return reply.status(400).send({
      success: false,
      error: {
        code: 'UPDATE_CONTRACT_STATUS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update contract status',
      },
    });
  }
}

/**
 * Get contract milestones (for fixed price contracts only)
 */
export async function getContractMilestones(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    const result = await adminContractService.getContractMilestones(request.params.id);

    return reply.status(200).send({
      success: true,
      data: result.items,
      stats: result.stats,
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to get contract milestones');

    if (error instanceof Error && error.message === 'Contract not found') {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'CONTRACT_NOT_FOUND',
          message: 'Contract not found',
        },
      });
    }

    if (
      error instanceof Error &&
      error.message === 'Milestones are only available for fixed price contracts'
    ) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_CONTRACT_TYPE',
          message: error.message,
        },
      });
    }

    return reply.status(500).send({
      success: false,
      error: {
        code: 'GET_MILESTONES_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get contract milestones',
      },
    });
  }
}

/**
 * Get contract timelogs (for hourly contracts only)
 */
export async function getContractTimelogs(
  request: FastifyRequest<{
    Params: { id: string };
    Querystring: { page?: number; limit?: number };
  }>,
  reply: FastifyReply,
) {
  try {
    const result = await adminContractService.getContractTimelogs(request.params.id, request.query);

    return reply.status(200).send({
      success: true,
      data: result.items,
      stats: result.stats,
      meta: result.pagination,
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to get contract timelogs');

    if (error instanceof Error && error.message === 'Contract not found') {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'CONTRACT_NOT_FOUND',
          message: 'Contract not found',
        },
      });
    }

    if (
      error instanceof Error &&
      error.message === 'Timelogs are only available for hourly contracts'
    ) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_CONTRACT_TYPE',
          message: error.message,
        },
      });
    }

    return reply.status(500).send({
      success: false,
      error: {
        code: 'GET_TIMELOGS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get contract timelogs',
      },
    });
  }
}

/**
 * Get contract transactions/financial history
 */
export async function getContractTransactions(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    const result = await adminContractService.getContractTransactions(request.params.id);

    return reply.status(200).send({
      success: true,
      data: result.items,
      summary: result.summary,
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to get contract transactions');

    if (error instanceof Error && error.message === 'Contract not found') {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'CONTRACT_NOT_FOUND',
          message: 'Contract not found',
        },
      });
    }

    return reply.status(500).send({
      success: false,
      error: {
        code: 'GET_TRANSACTIONS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get contract transactions',
      },
    });
  }
}
