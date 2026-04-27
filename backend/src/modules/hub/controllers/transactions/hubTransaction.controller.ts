import type {
  HubAddBankAccountBody,
  HubCreateOnboardingLinkBody,
  HubCreateWithdrawalBody,
  HubExportTransactionsQuery,
  HubListTransactionsQuery,
  HubListWithdrawalsQuery,
  HubUpdateBankAccountBody,
} from '@core/schemas/hub/transactions';
import {
  hubBankAccountService,
  hubStripeAccountService,
  hubTransactionService,
  hubWithdrawalService,
  type TransactionStatus,
  type TransactionType,
  type WithdrawalStatus,
} from '@core/services/hub/transactions';
import type { FastifyReply, FastifyRequest } from 'fastify';

// =============================================================================
// STRIPE ACCOUNT CONTROLLERS
// =============================================================================

/**
 * Get Stripe account status
 */
export async function getStripeStatus(
  request: FastifyRequest<{
    Params: { hubId: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const { hubId } = request.params;
    // @ts-expect-error - user is set by auth middleware
    const userId = request.user?.sub as string | undefined;
    const status = await hubStripeAccountService.getAccountStatus(hubId, userId);

    return reply.send({
      success: true,
      data: status,
    });
  } catch (error) {
    request.log.error({ error }, 'Error getting Stripe status');
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
 * Create Stripe Connect account
 */
export async function createStripeAccount(
  request: FastifyRequest<{
    Params: { hubId: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const { hubId } = request.params;
    // @ts-expect-error - user is set by auth middleware
    const userId = request.user?.sub as string | undefined;

    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        },
      });
    }

    const account = await hubStripeAccountService.createHubStripeAccount(hubId, userId);

    return reply.status(201).send({
      success: true,
      data: {
        stripeAccountId: account.id,
        accountType: 'hub',
        chargesEnabled: account.chargesEnabled,
        payoutsEnabled: account.payoutsEnabled,
        detailsSubmitted: account.detailsSubmitted,
      },
    });
  } catch (error) {
    request.log.error({ error }, 'Error creating Stripe account');
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
 * Create onboarding link for KYC
 */
export async function createOnboardingLink(
  request: FastifyRequest<{
    Params: { hubId: string };
    Body: HubCreateOnboardingLinkBody;
  }>,
  reply: FastifyReply,
) {
  try {
    const { hubId } = request.params;
    const { returnUrl, refreshUrl } = request.body;

    const url = await hubStripeAccountService.createOnboardingLink(hubId, returnUrl, refreshUrl);

    return reply.send({
      success: true,
      data: { url },
    });
  } catch (error) {
    request.log.error({ error }, 'Error creating onboarding link');
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
 * Create Stripe dashboard link
 */
export async function createDashboardLink(
  request: FastifyRequest<{
    Params: { hubId: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const { hubId } = request.params;
    const url = await hubStripeAccountService.createDashboardLink(hubId);

    return reply.send({
      success: true,
      data: { url },
    });
  } catch (error) {
    request.log.error({ error }, 'Error creating dashboard link');
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
// BALANCE & TRANSACTION CONTROLLERS
// =============================================================================

/**
 * Get hub balance
 */
export async function getBalance(
  request: FastifyRequest<{
    Params: { hubId: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const { hubId } = request.params;
    const balance = await hubTransactionService.getBalance(hubId);

    return reply.send({
      success: true,
      data: balance,
    });
  } catch (error) {
    request.log.error({ error }, 'Error getting balance');
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
 * List transactions
 */
export async function listTransactions(
  request: FastifyRequest<{
    Params: { hubId: string };
    Querystring: HubListTransactionsQuery;
  }>,
  reply: FastifyReply,
) {
  try {
    const { hubId } = request.params;
    const { type, status, startDate, endDate, limit, page } = request.query;

    const result = await hubTransactionService.getTransactions(hubId, {
      type: type && type !== 'all' ? (type as TransactionType) : undefined,
      status: status && status !== 'all' ? (status as TransactionStatus) : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit,
      page,
    });

    return reply.send({
      success: true,
      data: result,
    });
  } catch (error) {
    request.log.error({ error }, 'Error listing transactions');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'LIST_TRANSACTIONS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to list transactions',
      },
    });
  }
}

/**
 * Get single transaction
 */
export async function getTransaction(
  request: FastifyRequest<{
    Params: { hubId: string; transactionId: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const { hubId, transactionId } = request.params;
    const transaction = await hubTransactionService.getTransaction(hubId, transactionId);

    if (!transaction) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'TRANSACTION_NOT_FOUND',
          message: 'Transaction not found',
        },
      });
    }

    return reply.send({
      success: true,
      data: transaction,
    });
  } catch (error) {
    request.log.error({ error }, 'Error getting transaction');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'GET_TRANSACTION_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get transaction',
      },
    });
  }
}

/**
 * Export transactions as CSV
 */
export async function exportTransactions(
  request: FastifyRequest<{
    Params: { hubId: string };
    Querystring: HubExportTransactionsQuery;
  }>,
  reply: FastifyReply,
) {
  try {
    const { hubId } = request.params;
    const { type, status, startDate, endDate } = request.query;

    const csv = await hubTransactionService.exportTransactions(hubId, {
      type: type && type !== 'all' ? (type as TransactionType) : undefined,
      status: status && status !== 'all' ? (status as TransactionStatus) : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    return reply
      .header('Content-Type', 'text/csv')
      .header('Content-Disposition', `attachment; filename="transactions-${hubId}.csv"`)
      .send(csv);
  } catch (error) {
    request.log.error({ error }, 'Error exporting transactions');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'EXPORT_TRANSACTIONS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to export transactions',
      },
    });
  }
}

// =============================================================================
// WITHDRAWAL CONTROLLERS
// =============================================================================

/**
 * Create withdrawal
 */
export async function createWithdrawal(
  request: FastifyRequest<{
    Params: { hubId: string };
    Body: HubCreateWithdrawalBody;
  }>,
  reply: FastifyReply,
) {
  try {
    const { hubId } = request.params;
    const { amount, currency, bankAccountId, description } = request.body;

    const withdrawal = await hubWithdrawalService.createWithdrawal(hubId, {
      amount,
      currency,
      bankAccountId,
      description,
    });

    return reply.status(201).send({
      success: true,
      data: withdrawal,
    });
  } catch (error) {
    request.log.error({ error }, 'Error creating withdrawal');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'CREATE_WITHDRAWAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create withdrawal',
      },
    });
  }
}

/**
 * List withdrawals
 */
export async function listWithdrawals(
  request: FastifyRequest<{
    Params: { hubId: string };
    Querystring: HubListWithdrawalsQuery;
  }>,
  reply: FastifyReply,
) {
  try {
    const { hubId } = request.params;
    const { status, limit, startingAfter } = request.query;

    const result = await hubWithdrawalService.getWithdrawals(hubId, {
      status: status && status !== 'all' ? (status as WithdrawalStatus) : undefined,
      limit,
      startingAfter,
    });

    return reply.send({
      success: true,
      data: result,
    });
  } catch (error) {
    request.log.error({ error }, 'Error listing withdrawals');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'LIST_WITHDRAWALS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to list withdrawals',
      },
    });
  }
}

/**
 * Get withdrawal details
 */
export async function getWithdrawal(
  request: FastifyRequest<{
    Params: { hubId: string; withdrawalId: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const { hubId, withdrawalId } = request.params;
    const withdrawal = await hubWithdrawalService.getWithdrawal(hubId, withdrawalId);

    if (!withdrawal) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'WITHDRAWAL_NOT_FOUND',
          message: 'Withdrawal not found',
        },
      });
    }

    return reply.send({
      success: true,
      data: withdrawal,
    });
  } catch (error) {
    request.log.error({ error }, 'Error getting withdrawal');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'GET_WITHDRAWAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get withdrawal',
      },
    });
  }
}

/**
 * Cancel withdrawal
 */
export async function cancelWithdrawal(
  request: FastifyRequest<{
    Params: { hubId: string; withdrawalId: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const { hubId, withdrawalId } = request.params;
    const withdrawal = await hubWithdrawalService.cancelWithdrawal(hubId, withdrawalId);

    return reply.send({
      success: true,
      data: {
        id: withdrawal.id,
        status: withdrawal.status,
      },
    });
  } catch (error) {
    request.log.error({ error }, 'Error cancelling withdrawal');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'CANCEL_WITHDRAWAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to cancel withdrawal',
      },
    });
  }
}

// =============================================================================
// BANK ACCOUNT CONTROLLERS
// =============================================================================

/**
 * List bank accounts
 */
export async function listBankAccounts(
  request: FastifyRequest<{
    Params: { hubId: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const { hubId } = request.params;
    const result = await hubBankAccountService.getBankAccounts(hubId);

    return reply.send({
      success: true,
      data: result,
    });
  } catch (error) {
    request.log.error({ error }, 'Error listing bank accounts');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'LIST_BANK_ACCOUNTS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to list bank accounts',
      },
    });
  }
}

/**
 * Add bank account
 */
export async function addBankAccount(
  request: FastifyRequest<{
    Params: { hubId: string };
    Body: HubAddBankAccountBody;
  }>,
  reply: FastifyReply,
) {
  try {
    const { hubId } = request.params;
    const bankAccount = await hubBankAccountService.addBankAccount(hubId, request.body);

    return reply.status(201).send({
      success: true,
      data: bankAccount,
    });
  } catch (error) {
    request.log.error({ error }, 'Error adding bank account');
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
 * Get bank account details
 */
export async function getBankAccount(
  request: FastifyRequest<{
    Params: { hubId: string; bankAccountId: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const { hubId, bankAccountId } = request.params;
    const bankAccount = await hubBankAccountService.getBankAccount(hubId, bankAccountId);

    if (!bankAccount) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'BANK_ACCOUNT_NOT_FOUND',
          message: 'Bank account not found',
        },
      });
    }

    return reply.send({
      success: true,
      data: bankAccount,
    });
  } catch (error) {
    request.log.error({ error }, 'Error getting bank account');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'GET_BANK_ACCOUNT_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get bank account',
      },
    });
  }
}

/**
 * Update bank account
 */
export async function updateBankAccount(
  request: FastifyRequest<{
    Params: { hubId: string; bankAccountId: string };
    Body: HubUpdateBankAccountBody;
  }>,
  reply: FastifyReply,
) {
  try {
    const { hubId, bankAccountId } = request.params;
    const bankAccount = await hubBankAccountService.updateBankAccount(
      hubId,
      bankAccountId,
      request.body,
    );

    return reply.send({
      success: true,
      data: bankAccount,
    });
  } catch (error) {
    request.log.error({ error }, 'Error updating bank account');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'UPDATE_BANK_ACCOUNT_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update bank account',
      },
    });
  }
}

/**
 * Delete bank account
 */
export async function deleteBankAccount(
  request: FastifyRequest<{
    Params: { hubId: string; bankAccountId: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const { hubId, bankAccountId } = request.params;
    await hubBankAccountService.deleteBankAccount(hubId, bankAccountId);

    return reply.send({
      success: true,
      message: 'Bank account deleted successfully',
    });
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

/**
 * Set default bank account
 */
export async function setDefaultBankAccount(
  request: FastifyRequest<{
    Params: { hubId: string; bankAccountId: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const { hubId, bankAccountId } = request.params;
    const bankAccount = await hubBankAccountService.setDefaultBankAccount(hubId, bankAccountId);

    return reply.send({
      success: true,
      data: {
        id: bankAccount.id,
        isDefault: bankAccount.isDefault,
      },
    });
  } catch (error) {
    request.log.error({ error }, 'Error setting default bank account');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'SET_DEFAULT_BANK_ACCOUNT_ERROR',
        message: error instanceof Error ? error.message : 'Failed to set default bank account',
      },
    });
  }
}

/**
 * Get supported banks
 */
export async function getSupportedBanks(
  request: FastifyRequest<{
    Params: { hubId: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const banks = await hubBankAccountService.getSupportedBanks();

    return reply.send({
      success: true,
      data: { banks },
    });
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
