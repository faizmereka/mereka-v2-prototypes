import type {
  UserCreateOnboardingLinkBody,
  UserCreateWithdrawalBody,
  UserExportEarningsQuery,
  UserGetEarningsQuery,
  UserGetWithdrawalsQuery,
} from '@core/schemas/hub/transactions';
import {
  userBankAccountService,
  userStripeAccountService,
  userTransactionService,
  userWithdrawalService,
} from '@core/services/user/transactions';
import type { FastifyReply, FastifyRequest } from 'fastify';

// =============================================================================
// STRIPE ACCOUNT CONTROLLERS
// =============================================================================

/**
 * Get user's Stripe account status
 */
export async function getUserStripeStatus(request: FastifyRequest, reply: FastifyReply) {
  try {
    // @ts-expect-error - user is set by auth middleware
    const userId = request.user?.sub as string;
    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      });
    }

    const status = await userStripeAccountService.getAccountStatus(userId);
    return reply.send({ success: true, data: status });
  } catch (error) {
    request.log.error({ error }, 'Error getting user Stripe status');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'GET_STRIPE_STATUS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get Stripe status',
      },
    });
  }
}

/**
 * Create Stripe Connect account for user
 */
export async function createUserStripeAccount(request: FastifyRequest, reply: FastifyReply) {
  try {
    // @ts-expect-error - user is set by auth middleware
    const userId = request.user?.sub as string;
    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      });
    }

    const account = await userStripeAccountService.createUserStripeAccount(userId);
    return reply.status(201).send({
      success: true,
      data: { stripeAccountId: account.id },
    });
  } catch (error) {
    request.log.error({ error }, 'Error creating user Stripe account');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'CREATE_STRIPE_ACCOUNT_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create Stripe account',
      },
    });
  }
}

/**
 * Create onboarding link for user KYC
 */
export async function getUserOnboardingLink(
  request: FastifyRequest<{ Body: UserCreateOnboardingLinkBody }>,
  reply: FastifyReply,
) {
  try {
    // @ts-expect-error - user is set by auth middleware
    const userId = request.user?.sub as string;
    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      });
    }

    const { returnUrl, refreshUrl } = request.body;
    const url = await userStripeAccountService.createOnboardingLink(userId, returnUrl, refreshUrl);
    return reply.send({ success: true, data: { url } });
  } catch (error) {
    request.log.error({ error }, 'Error creating user onboarding link');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'CREATE_ONBOARDING_LINK_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create onboarding link',
      },
    });
  }
}

/**
 * Create Stripe dashboard link for user
 */
export async function getUserDashboardLink(request: FastifyRequest, reply: FastifyReply) {
  try {
    // @ts-expect-error - user is set by auth middleware
    const userId = request.user?.sub as string;
    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      });
    }

    const url = await userStripeAccountService.createDashboardLink(userId);
    return reply.send({ success: true, data: { url } });
  } catch (error) {
    request.log.error({ error }, 'Error creating user dashboard link');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'CREATE_DASHBOARD_LINK_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create dashboard link',
      },
    });
  }
}

// =============================================================================
// BALANCE & EARNINGS CONTROLLERS
// =============================================================================

/**
 * Get user balance
 */
export async function getUserBalance(request: FastifyRequest, reply: FastifyReply) {
  try {
    // @ts-expect-error - user is set by auth middleware
    const userId = request.user?.sub as string;
    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      });
    }

    const balance = await userTransactionService.getBalance(userId);
    return reply.send({ success: true, data: balance });
  } catch (error) {
    request.log.error({ error }, 'Error getting user balance');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'GET_BALANCE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get balance',
      },
    });
  }
}

/**
 * Get user earnings
 */
export async function getUserEarnings(
  request: FastifyRequest<{ Querystring: UserGetEarningsQuery }>,
  reply: FastifyReply,
) {
  try {
    // @ts-expect-error - user is set by auth middleware
    const userId = request.user?.sub as string;
    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      });
    }

    const { type, status, page, limit } = request.query;
    const result = await userTransactionService.getEarnings(userId, { type, status, page, limit });
    return reply.send({ success: true, data: result });
  } catch (error) {
    request.log.error({ error }, 'Error getting user earnings');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'GET_EARNINGS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get earnings',
      },
    });
  }
}

/**
 * Export user earnings as CSV
 */
export async function exportUserEarnings(
  request: FastifyRequest<{ Querystring: UserExportEarningsQuery }>,
  reply: FastifyReply,
) {
  try {
    // @ts-expect-error - user is set by auth middleware
    const userId = request.user?.sub as string;
    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      });
    }

    const { type, status, startDate, endDate } = request.query;
    const csv = await userTransactionService.exportEarnings(userId, {
      type,
      status,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    return reply
      .header('Content-Type', 'text/csv')
      .header('Content-Disposition', `attachment; filename="earnings-${userId}.csv"`)
      .send(csv);
  } catch (error) {
    request.log.error({ error }, 'Error exporting user earnings');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'EXPORT_EARNINGS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to export earnings',
      },
    });
  }
}

// =============================================================================
// WITHDRAWAL CONTROLLERS
// =============================================================================

/**
 * Get user withdrawals
 */
export async function getUserWithdrawals(
  request: FastifyRequest<{ Querystring: UserGetWithdrawalsQuery }>,
  reply: FastifyReply,
) {
  try {
    // @ts-expect-error - user is set by auth middleware
    const userId = request.user?.sub as string;
    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      });
    }

    const { status, limit, startingAfter } = request.query;
    const result = await userWithdrawalService.getWithdrawals(userId, {
      status,
      limit,
      startingAfter,
    });
    return reply.send({ success: true, data: result });
  } catch (error) {
    request.log.error({ error }, 'Error getting user withdrawals');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'GET_WITHDRAWALS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get withdrawals',
      },
    });
  }
}

/**
 * Create user withdrawal
 */
export async function createUserWithdrawal(
  request: FastifyRequest<{ Body: UserCreateWithdrawalBody }>,
  reply: FastifyReply,
) {
  try {
    // @ts-expect-error - user is set by auth middleware
    const userId = request.user?.sub as string;
    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      });
    }

    const { amount, currency, bankAccountId, description } = request.body;
    const withdrawal = await userWithdrawalService.createWithdrawal(userId, {
      amount,
      currency,
      bankAccountId,
      description,
    });
    return reply.status(201).send({ success: true, data: withdrawal });
  } catch (error) {
    request.log.error({ error }, 'Error creating user withdrawal');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'CREATE_WITHDRAWAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create withdrawal',
      },
    });
  }
}

// =============================================================================
// BANK ACCOUNT CONTROLLERS
// =============================================================================

/**
 * Get user bank accounts
 */
export async function getUserBankAccounts(request: FastifyRequest, reply: FastifyReply) {
  try {
    // @ts-expect-error - user is set by auth middleware
    const userId = request.user?.sub as string;
    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      });
    }

    const result = await userBankAccountService.getBankAccounts(userId);
    return reply.send({ success: true, data: result });
  } catch (error) {
    request.log.error({ error }, 'Error getting user bank accounts');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'GET_BANK_ACCOUNTS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get bank accounts',
      },
    });
  }
}

/**
 * Get supported banks list
 */
export async function getUserSupportedBanks(
  request: FastifyRequest<{ Querystring: { country?: string } }>,
  reply: FastifyReply,
) {
  try {
    const countryCode = request.query.country || 'MY';
    const banks = await userBankAccountService.getSupportedBanks(countryCode);
    return reply.send({ success: true, data: { banks } });
  } catch (error) {
    request.log.error({ error }, 'Error getting supported banks');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'GET_SUPPORTED_BANKS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get supported banks',
      },
    });
  }
}

/**
 * Add bank account
 */
export async function addUserBankAccount(
  request: FastifyRequest<{
    Body: {
      accountNumber: string;
      routingNumber: string;
      accountHolderName: string;
      accountHolderType: 'individual' | 'company';
      currency?: string;
      country?: string;
      setAsDefault?: boolean;
    };
  }>,
  reply: FastifyReply,
) {
  try {
    // @ts-expect-error - user is set by auth middleware
    const userId = request.user?.sub as string;
    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      });
    }

    const bankAccount = await userBankAccountService.addBankAccount(userId, request.body);
    return reply.status(201).send({ success: true, data: bankAccount });
  } catch (error) {
    request.log.error({ error }, 'Error adding user bank account');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'ADD_BANK_ACCOUNT_ERROR',
        message: error instanceof Error ? error.message : 'Failed to add bank account',
      },
    });
  }
}

/**
 * Set default bank account
 */
export async function setUserDefaultBankAccount(
  request: FastifyRequest<{ Params: { bankAccountId: string } }>,
  reply: FastifyReply,
) {
  try {
    // @ts-expect-error - user is set by auth middleware
    const userId = request.user?.sub as string;
    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      });
    }

    const { bankAccountId } = request.params;
    const bankAccount = await userBankAccountService.setDefaultBankAccount(userId, bankAccountId);
    return reply.send({
      success: true,
      data: { id: bankAccount.id, isDefault: bankAccount.isDefault },
    });
  } catch (error) {
    request.log.error({ error }, 'Error setting default bank account');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'SET_DEFAULT_BANK_ERROR',
        message: error instanceof Error ? error.message : 'Failed to set default bank account',
      },
    });
  }
}

/**
 * Delete bank account
 */
export async function deleteUserBankAccount(
  request: FastifyRequest<{ Params: { bankAccountId: string } }>,
  reply: FastifyReply,
) {
  try {
    // @ts-expect-error - user is set by auth middleware
    const userId = request.user?.sub as string;
    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      });
    }

    const { bankAccountId } = request.params;
    await userBankAccountService.deleteBankAccount(userId, bankAccountId);
    return reply.send({ success: true, message: 'Bank account deleted successfully' });
  } catch (error) {
    request.log.error({ error }, 'Error deleting bank account');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'DELETE_BANK_ACCOUNT_ERROR',
        message: error instanceof Error ? error.message : 'Failed to delete bank account',
      },
    });
  }
}
