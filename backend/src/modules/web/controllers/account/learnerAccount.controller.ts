import type { UpdateLearnerAccountInput } from '@schemas/web';
import { learnerAccountService } from '@services/web';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Get learner account details
 * GET /me/account
 *
 * Returns account details for the authenticated learner
 */
export async function getLearnerAccount(request: FastifyRequest, reply: FastifyReply) {
  const userId = (request.user as { sub: string }).sub;

  try {
    const account = await learnerAccountService.getAccount(userId);

    return reply.send({
      success: true,
      data: account,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    request.log.error({ error, userId }, 'Error fetching learner account');

    if (errorMessage === 'User not found') {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    return reply.status(500).send({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Failed to fetch account details',
      },
    });
  }
}

/**
 * Update learner account details
 * PUT /me/account
 *
 * Updates account details for the authenticated learner
 */
export async function updateLearnerAccount(
  request: FastifyRequest<{ Body: UpdateLearnerAccountInput }>,
  reply: FastifyReply,
) {
  const userId = (request.user as { sub: string }).sub;

  try {
    const account = await learnerAccountService.updateAccount(userId, request.body);

    return reply.send({
      success: true,
      data: account,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    request.log.error({ error, userId }, 'Error updating learner account');

    if (errorMessage === 'User not found') {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    if (errorMessage === 'Username is already taken') {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'USERNAME_TAKEN',
          message: 'Username is already taken',
        },
      });
    }

    return reply.status(500).send({
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: 'Failed to update account details',
      },
    });
  }
}
