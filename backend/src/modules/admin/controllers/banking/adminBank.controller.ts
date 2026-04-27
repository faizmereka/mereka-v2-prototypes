import type { AdminCreateBankInput, AdminUpdateBankInput } from '@schemas/admin';
import {
  adminBankService as bankService,
  type AdminListBanksQuery as ListBanksQuery,
} from '@services/admin';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Bank Controllers
 */
export async function createBank(
  request: FastifyRequest<{ Body: AdminCreateBankInput }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const bank = await bankService.createBank(request.body);
    return reply.status(201).send({
      success: true,
      data: bank,
    });
  } catch (error) {
    request.log.error({ error }, 'Error creating bank');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'BANK_CREATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create bank',
      },
    });
  }
}

export async function listBanks(
  request: FastifyRequest<{ Querystring: ListBanksQuery }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const result = await bankService.listBanks(request.query);
    return reply.send({
      success: true,
      data: result.banks,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    request.log.error({ error }, 'Error listing banks');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'BANK_LIST_ERROR',
        message: 'Failed to list banks',
      },
    });
  }
}

export async function listActiveBanks(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const banks = await bankService.listActiveBanks();
    return reply.send({
      success: true,
      data: banks,
    });
  } catch (error) {
    request.log.error({ error }, 'Error listing active banks');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'BANK_LIST_ERROR',
        message: 'Failed to list active banks',
      },
    });
  }
}

export async function listBanksByCountry(
  request: FastifyRequest<{ Params: { countryCode: string } }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const banks = await bankService.listActiveBanksByCountry(request.params.countryCode);
    return reply.send({
      success: true,
      data: banks,
    });
  } catch (error) {
    request.log.error({ error }, 'Error listing banks by country');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'BANK_LIST_ERROR',
        message: 'Failed to list banks by country',
      },
    });
  }
}

export async function getBankById(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const bank = await bankService.getBankById(request.params.id);

    if (!bank) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'BANK_NOT_FOUND',
          message: 'Bank not found',
        },
      });
    }

    return reply.send({
      success: true,
      data: bank,
    });
  } catch (error) {
    request.log.error({ error }, 'Error getting bank');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'BANK_GET_ERROR',
        message: 'Failed to get bank',
      },
    });
  }
}

export async function updateBank(
  request: FastifyRequest<{
    Params: { id: string };
    Body: AdminUpdateBankInput;
  }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const bank = await bankService.updateBank(request.params.id, request.body);
    return reply.send({
      success: true,
      data: bank,
    });
  } catch (error) {
    request.log.error({ error }, 'Error updating bank');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'BANK_UPDATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update bank',
      },
    });
  }
}

export async function deleteBank(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    await bankService.deleteBank(request.params.id);
    return reply.send({
      success: true,
      message: 'Bank deactivated successfully',
    });
  } catch (error) {
    request.log.error({ error }, 'Error deleting bank');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'BANK_DELETE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to delete bank',
      },
    });
  }
}

/**
 * List pending banks for admin approval
 * GET /api/v1/banks/pending
 */
export async function listPendingBanks(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    const banks = await bankService.listPendingBanks();
    return reply.send({
      success: true,
      data: banks,
    });
  } catch (error) {
    request.log.error({ error }, 'Error listing pending banks');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'BANK_LIST_ERROR',
        message: 'Failed to list pending banks',
      },
    });
  }
}

/**
 * Approve a bank
 * POST /api/v1/banks/:id/approve
 */
export async function approveBank(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const adminUserId = (request.user as { id?: string })?.id || 'admin';
    const bank = await bankService.approveBank(request.params.id, adminUserId);
    return reply.send({
      success: true,
      data: bank,
      message: 'Bank approved successfully',
    });
  } catch (error) {
    request.log.error({ error }, 'Error approving bank');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'BANK_APPROVE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to approve bank',
      },
    });
  }
}

/**
 * Reject a bank
 * POST /api/v1/banks/:id/reject
 */
export async function rejectBank(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    await bankService.rejectBank(request.params.id);
    return reply.send({
      success: true,
      message: 'Bank rejected successfully',
    });
  } catch (error) {
    request.log.error({ error }, 'Error rejecting bank');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'BANK_REJECT_ERROR',
        message: error instanceof Error ? error.message : 'Failed to reject bank',
      },
    });
  }
}
