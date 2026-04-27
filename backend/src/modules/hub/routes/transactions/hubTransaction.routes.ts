import {
  addBankAccount,
  cancelWithdrawal,
  createDashboardLink,
  createOnboardingLink,
  createStripeAccount,
  createWithdrawal,
  deleteBankAccount,
  exportTransactions,
  getBalance,
  getBankAccount,
  getStripeStatus,
  getSupportedBanks,
  getTransaction,
  getWithdrawal,
  listBankAccounts,
  listTransactions,
  listWithdrawals,
  setDefaultBankAccount,
  updateBankAccount,
} from '@controllers/hub';
import { PERMISSIONS } from '@core/constants';
import { requireAuth } from '@core/middlewares/auth.middleware';
import {
  loadHubContext,
  requireHubAccess,
  requireHubPermission,
} from '@core/middlewares/hubPermission.middleware';
import {
  hubAddBankAccountSchema,
  hubCancelWithdrawalSchema,
  hubCreateDashboardLinkSchema,
  hubCreateOnboardingLinkSchema,
  hubCreateStripeAccountSchema,
  hubCreateWithdrawalSchema,
  hubDeleteBankAccountSchema,
  hubExportTransactionsSchema,
  hubGetBalanceSchema,
  hubGetBankAccountSchema,
  hubGetStripeStatusSchema,
  hubGetSupportedBanksSchema,
  hubGetTransactionSchema,
  hubGetWithdrawalSchema,
  hubListBankAccountsSchema,
  hubListTransactionsSchema,
  hubListWithdrawalsSchema,
  hubSetDefaultBankAccountSchema,
  hubUpdateBankAccountSchema,
} from '@core/schemas/hub/transactions';
import type { FastifyInstance } from 'fastify';

/**
 * Hub Transaction Routes (scoped to hub)
 * Prefix: /api/v1/hub/:hubId/transactions
 */
export async function hubTransactionRoutes(fastify: FastifyInstance): Promise<void> {
  // Common preHandlers
  const basePreHandlers = [requireAuth, loadHubContext, requireHubAccess];

  // ==========================================================================
  // STRIPE ACCOUNT ROUTES
  // ==========================================================================

  // Get Stripe account status
  fastify.get('/stripe/status', {
    schema: hubGetStripeStatusSchema,
    preHandler: [...basePreHandlers, requireHubPermission(PERMISSIONS.FINANCIAL_VIEW_DASHBOARD)],
    handler: getStripeStatus,
  });

  // Create Stripe Connect account
  fastify.post('/stripe/account', {
    schema: hubCreateStripeAccountSchema,
    preHandler: [...basePreHandlers, requireHubPermission(PERMISSIONS.FINANCIAL_SETUP_STRIPE)],
    handler: createStripeAccount,
  });

  // Create onboarding link for KYC
  fastify.post('/stripe/onboarding-link', {
    schema: hubCreateOnboardingLinkSchema,
    preHandler: [...basePreHandlers, requireHubPermission(PERMISSIONS.FINANCIAL_SETUP_STRIPE)],
    handler: createOnboardingLink,
  });

  // Create Stripe dashboard link
  fastify.get('/stripe/dashboard-link', {
    schema: hubCreateDashboardLinkSchema,
    preHandler: [...basePreHandlers, requireHubPermission(PERMISSIONS.FINANCIAL_VIEW_DASHBOARD)],
    handler: createDashboardLink,
  });

  // ==========================================================================
  // BALANCE & TRANSACTION ROUTES
  // ==========================================================================

  // Get hub balance
  fastify.get('/balance', {
    schema: hubGetBalanceSchema,
    preHandler: [...basePreHandlers, requireHubPermission(PERMISSIONS.FINANCIAL_VIEW_DASHBOARD)],
    handler: getBalance,
  });

  // List transactions
  fastify.get('/', {
    schema: hubListTransactionsSchema,
    preHandler: [...basePreHandlers, requireHubPermission(PERMISSIONS.FINANCIAL_VIEW_TRANSACTIONS)],
    handler: listTransactions,
  });

  // Export transactions as CSV
  fastify.get('/export', {
    schema: hubExportTransactionsSchema,
    preHandler: [
      ...basePreHandlers,
      requireHubPermission(PERMISSIONS.FINANCIAL_DOWNLOAD_STATEMENTS),
    ],
    handler: exportTransactions,
  });

  // Get single transaction
  fastify.get('/:transactionId', {
    schema: hubGetTransactionSchema,
    preHandler: [...basePreHandlers, requireHubPermission(PERMISSIONS.FINANCIAL_VIEW_TRANSACTIONS)],
    handler: getTransaction,
  });

  // ==========================================================================
  // WITHDRAWAL ROUTES
  // ==========================================================================

  // List withdrawals
  fastify.get('/withdrawals', {
    schema: hubListWithdrawalsSchema,
    preHandler: [...basePreHandlers, requireHubPermission(PERMISSIONS.FINANCIAL_VIEW_TRANSACTIONS)],
    handler: listWithdrawals,
  });

  // Create withdrawal
  fastify.post('/withdrawals', {
    schema: hubCreateWithdrawalSchema,
    preHandler: [
      ...basePreHandlers,
      requireHubPermission(PERMISSIONS.FINANCIAL_REQUEST_WITHDRAWAL),
    ],
    handler: createWithdrawal,
  });

  // Get withdrawal details
  fastify.get('/withdrawals/:withdrawalId', {
    schema: hubGetWithdrawalSchema,
    preHandler: [...basePreHandlers, requireHubPermission(PERMISSIONS.FINANCIAL_VIEW_TRANSACTIONS)],
    handler: getWithdrawal,
  });

  // Cancel withdrawal
  fastify.delete('/withdrawals/:withdrawalId', {
    schema: hubCancelWithdrawalSchema,
    preHandler: [...basePreHandlers, requireHubPermission(PERMISSIONS.FINANCIAL_MANAGE_PAYOUTS)],
    handler: cancelWithdrawal,
  });

  // ==========================================================================
  // BANK ACCOUNT ROUTES
  // ==========================================================================

  // Get supported banks
  fastify.get('/bank-accounts/supported-banks', {
    schema: hubGetSupportedBanksSchema,
    preHandler: [...basePreHandlers, requireHubPermission(PERMISSIONS.FINANCIAL_VIEW_DASHBOARD)],
    handler: getSupportedBanks,
  });

  // List bank accounts
  fastify.get('/bank-accounts', {
    schema: hubListBankAccountsSchema,
    preHandler: [...basePreHandlers, requireHubPermission(PERMISSIONS.FINANCIAL_VIEW_DASHBOARD)],
    handler: listBankAccounts,
  });

  // Add bank account
  fastify.post('/bank-accounts', {
    schema: hubAddBankAccountSchema,
    preHandler: [
      ...basePreHandlers,
      requireHubPermission(PERMISSIONS.FINANCIAL_MANAGE_BANK_ACCOUNTS),
    ],
    handler: addBankAccount,
  });

  // Get bank account details
  fastify.get('/bank-accounts/:bankAccountId', {
    schema: hubGetBankAccountSchema,
    preHandler: [...basePreHandlers, requireHubPermission(PERMISSIONS.FINANCIAL_VIEW_DASHBOARD)],
    handler: getBankAccount,
  });

  // Update bank account
  fastify.patch('/bank-accounts/:bankAccountId', {
    schema: hubUpdateBankAccountSchema,
    preHandler: [
      ...basePreHandlers,
      requireHubPermission(PERMISSIONS.FINANCIAL_MANAGE_BANK_ACCOUNTS),
    ],
    handler: updateBankAccount,
  });

  // Delete bank account
  fastify.delete('/bank-accounts/:bankAccountId', {
    schema: hubDeleteBankAccountSchema,
    preHandler: [
      ...basePreHandlers,
      requireHubPermission(PERMISSIONS.FINANCIAL_MANAGE_BANK_ACCOUNTS),
    ],
    handler: deleteBankAccount,
  });

  // Set default bank account
  fastify.post('/bank-accounts/:bankAccountId/default', {
    schema: hubSetDefaultBankAccountSchema,
    preHandler: [
      ...basePreHandlers,
      requireHubPermission(PERMISSIONS.FINANCIAL_MANAGE_BANK_ACCOUNTS),
    ],
    handler: setDefaultBankAccount,
  });
}
