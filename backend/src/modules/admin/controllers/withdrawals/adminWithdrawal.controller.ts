import type {
  ApproveWithdrawalBody,
  ListWithdrawalsQuery,
  RejectWithdrawalBody,
  WithdrawalIdParam,
} from '@core/schemas/admin/withdrawals';
import { adminWithdrawalService } from '@core/services/admin/withdrawals';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * List withdrawals with filtering and pagination
 */
export async function listWithdrawals(
  request: FastifyRequest<{ Querystring: ListWithdrawalsQuery }>,
  reply: FastifyReply,
) {
  try {
    const result = await adminWithdrawalService.list(request.query);
    return reply.send({
      success: true,
      data: result,
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to list withdrawals');
    return reply.status(500).send({
      success: false,
      error: { code: 'WITHDRAWAL_LIST_ERROR', message: 'Failed to list withdrawals' },
    });
  }
}

/**
 * Get withdrawal statistics
 */
export async function getWithdrawalStats(request: FastifyRequest, reply: FastifyReply) {
  try {
    const stats = await adminWithdrawalService.getStats();
    return reply.send({
      success: true,
      data: stats,
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to get withdrawal stats');
    return reply.status(500).send({
      success: false,
      error: { code: 'WITHDRAWAL_STATS_ERROR', message: 'Failed to get withdrawal statistics' },
    });
  }
}

/**
 * Get withdrawal by ID
 */
export async function getWithdrawalById(
  request: FastifyRequest<{ Params: WithdrawalIdParam }>,
  reply: FastifyReply,
) {
  try {
    const withdrawal = await adminWithdrawalService.getById(request.params.id);
    return reply.send({
      success: true,
      data: withdrawal,
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to get withdrawal');
    const message = (error as Error).message;
    const statusCode = message === 'Withdrawal not found' ? 404 : 500;
    return reply.status(statusCode).send({
      success: false,
      error: { code: 'WITHDRAWAL_NOT_FOUND', message },
    });
  }
}

/**
 * Approve withdrawal
 */
export async function approveWithdrawal(
  request: FastifyRequest<{ Params: WithdrawalIdParam; Body: ApproveWithdrawalBody }>,
  reply: FastifyReply,
) {
  try {
    const adminId = (request.user as { id?: string })?.id || '';
    const withdrawal = await adminWithdrawalService.approve(
      request.params.id,
      adminId,
      request.body.note,
    );
    return reply.send({
      success: true,
      data: withdrawal,
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to approve withdrawal');
    const message = (error as Error).message;
    const statusCode = message.includes('not found') ? 404 : 400;
    return reply.status(statusCode).send({
      success: false,
      error: { code: 'WITHDRAWAL_APPROVE_ERROR', message },
    });
  }
}

/**
 * Reject withdrawal
 */
export async function rejectWithdrawal(
  request: FastifyRequest<{ Params: WithdrawalIdParam; Body: RejectWithdrawalBody }>,
  reply: FastifyReply,
) {
  try {
    const adminId = (request.user as { id?: string })?.id || '';
    const withdrawal = await adminWithdrawalService.reject(
      request.params.id,
      adminId,
      request.body.reason,
    );
    return reply.send({
      success: true,
      data: withdrawal,
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to reject withdrawal');
    const message = (error as Error).message;
    const statusCode = message.includes('not found') ? 404 : 400;
    return reply.status(statusCode).send({
      success: false,
      error: { code: 'WITHDRAWAL_REJECT_ERROR', message },
    });
  }
}
