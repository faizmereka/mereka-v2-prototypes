import { Hub } from '@core/models/Hub';
import { User } from '@core/models/User';
import { StripeServiceFactory } from '@core/services/shared/payments/stripeFactory.service';
import type Stripe from 'stripe';
import { userTransactionService } from './userTransaction.service';

/**
 * Withdrawal status enum
 */
export enum UserWithdrawalStatus {
  PENDING = 'pending',
  IN_TRANSIT = 'in_transit',
  PAID = 'paid',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * Withdrawal item interface
 */
export interface UserWithdrawalItem {
  id: string;
  amount: number;
  currency: string;
  status: UserWithdrawalStatus;
  arrivalDate: Date;
  bankAccountLast4: string;
  bankName?: string;
  description?: string;
  failureMessage?: string;
  createdAt: Date;
}

/**
 * Withdrawal list response
 */
export interface UserWithdrawalListResponse {
  withdrawals: UserWithdrawalItem[];
  pagination: {
    hasMore: boolean;
    startingAfter?: string;
  };
  summary: {
    totalWithdrawn: number;
    pendingWithdrawals: number;
    lastWithdrawalDate?: Date;
  };
}

/**
 * Create withdrawal request
 */
export interface CreateUserWithdrawalRequest {
  amount: number; // In cents
  currency?: string; // Default: MYR
  bankAccountId?: string; // Specific bank account, or default
  description?: string;
}

/**
 * User Withdrawal Service
 *
 * Manages payouts/withdrawals from User Stripe accounts to bank accounts.
 */
export class UserWithdrawalService {
  /**
   * Get User's Stripe info - reads from User directly
   */
  private async getUserStripeInfo(userId: string): Promise<{
    stripeAccountId: string | null;
    user: {
      stripeAccountId?: string;
      stripeRegion?: string;
      location?: { country?: string };
    } | null;
    hub: {
      stripeAccountId?: string;
      stripeRegion?: string;
      location?: { country?: string };
    } | null;
  }> {
    const user = await User.findById(userId).select('stripeAccountId stripeRegion location').lean();

    const hub = await Hub.findOne({ ownerId: userId })
      .select('stripeAccountId stripeRegion location')
      .lean();

    return {
      stripeAccountId: user?.stripeAccountId || null,
      user: user as {
        stripeAccountId?: string;
        stripeRegion?: string;
        location?: { country?: string };
      } | null,
      hub: hub as {
        stripeAccountId?: string;
        stripeRegion?: string;
        location?: { country?: string };
      } | null,
    };
  }

  /**
   * Create a withdrawal (payout) for User
   * Uses regional Stripe service based on user's stripeRegion
   */
  async createWithdrawal(
    userId: string,
    request: CreateUserWithdrawalRequest,
  ): Promise<UserWithdrawalItem> {
    const { stripeAccountId, user, hub } = await this.getUserStripeInfo(userId);

    if (!stripeAccountId || !user) {
      throw new Error('User does not have a Stripe account');
    }

    // Get regional Stripe service
    const regionalStripeService = StripeServiceFactory.getServiceForUser(user, hub);

    // Fetch account status from Stripe to check payouts enabled
    const account = await regionalStripeService
      .getStripeInstance()
      .accounts.retrieve(stripeAccountId);

    if (!account.payouts_enabled) {
      throw new Error('Payouts are not enabled for this account. Complete KYC first.');
    }

    // Check available balance
    const balance = await userTransactionService.getBalance(userId);
    const requestedAmount = request.amount / 100; // Convert to currency units

    if (balance.totalAvailable < requestedAmount) {
      throw new Error(
        `Insufficient balance. Available: ${balance.totalAvailable} ${balance.currency}, Requested: ${requestedAmount}`,
      );
    }

    // Create payout in Stripe using regional service
    const payoutParams: Stripe.PayoutCreateParams = {
      amount: request.amount,
      currency: (request.currency || 'MYR').toLowerCase(),
      description: request.description || 'User withdrawal',
      metadata: {
        userId,
        source: 'expert_dashboard',
      },
    };

    // If specific bank account requested
    if (request.bankAccountId) {
      payoutParams.destination = request.bankAccountId;
    }

    const payout = await regionalStripeService.getStripeInstance().payouts.create(payoutParams, {
      stripeAccount: stripeAccountId,
    });

    return this.mapStripePayout(payout);
  }

  /**
   * Get list of withdrawals for User
   * Uses regional Stripe service based on user's stripeRegion
   */
  async getWithdrawals(
    userId: string,
    options: {
      limit?: number;
      startingAfter?: string;
      status?: string;
    } = {},
  ): Promise<UserWithdrawalListResponse> {
    const { stripeAccountId, user, hub } = await this.getUserStripeInfo(userId);

    if (!stripeAccountId || !user) {
      return {
        withdrawals: [],
        pagination: { hasMore: false },
        summary: {
          totalWithdrawn: 0,
          pendingWithdrawals: 0,
        },
      };
    }

    // Get regional Stripe service
    const regionalStripeService = StripeServiceFactory.getServiceForUser(user, hub);

    // Build query params
    const params: Record<string, unknown> = {
      limit: options.limit || 25,
    };

    if (options.startingAfter) {
      params.starting_after = options.startingAfter;
    }

    // Map status filter
    if (options.status) {
      params.status = this.mapStatusToStripe(options.status as UserWithdrawalStatus);
    }

    // Fetch payouts from Stripe using regional service
    const payouts = await regionalStripeService.getStripeInstance().payouts.list(params, {
      stripeAccount: stripeAccountId,
    });

    const withdrawals = payouts.data.map((p) => this.mapStripePayout(p));

    // Calculate summary
    const summary = this.calculateSummary(withdrawals);

    // Get last withdrawal ID for pagination
    const lastWithdrawal = withdrawals.at(-1);

    return {
      withdrawals,
      pagination: {
        hasMore: payouts.has_more,
        startingAfter: lastWithdrawal?.id,
      },
      summary,
    };
  }

  /**
   * Get single withdrawal details
   * Uses regional Stripe service based on user's stripeRegion
   */
  async getWithdrawal(userId: string, payoutId: string): Promise<UserWithdrawalItem | null> {
    const { stripeAccountId, user, hub } = await this.getUserStripeInfo(userId);

    if (!stripeAccountId || !user) {
      return null;
    }

    // Get regional Stripe service
    const regionalStripeService = StripeServiceFactory.getServiceForUser(user, hub);

    try {
      const payout = await regionalStripeService.getStripeInstance().payouts.retrieve(payoutId, {
        stripeAccount: stripeAccountId,
      });

      return this.mapStripePayout(payout);
    } catch (_error) {
      return null;
    }
  }

  /**
   * Cancel a pending withdrawal
   * Uses regional Stripe service based on user's stripeRegion
   */
  async cancelWithdrawal(userId: string, payoutId: string): Promise<UserWithdrawalItem> {
    const { stripeAccountId, user, hub } = await this.getUserStripeInfo(userId);

    if (!stripeAccountId || !user) {
      throw new Error('User does not have a Stripe account');
    }

    // Get regional Stripe service
    const regionalStripeService = StripeServiceFactory.getServiceForUser(user, hub);

    const payout = await regionalStripeService.getStripeInstance().payouts.cancel(payoutId, {
      stripeAccount: stripeAccountId,
    });

    return this.mapStripePayout(payout);
  }

  /**
   * Map Stripe payout to our format
   */
  private mapStripePayout(payout: Stripe.Payout): UserWithdrawalItem {
    const destination = payout.destination as Stripe.BankAccount | null;
    return {
      id: payout.id,
      amount: payout.amount,
      currency: payout.currency.toUpperCase(),
      status: this.mapPayoutStatus(payout.status),
      arrivalDate: new Date(payout.arrival_date * 1000),
      bankAccountLast4: destination?.last4 || 'XXXX',
      bankName: destination?.bank_name || undefined,
      description: payout.description || undefined,
      failureMessage: payout.failure_message || undefined,
      createdAt: new Date(payout.created * 1000),
    };
  }

  /**
   * Map Stripe payout status to our enum
   */
  private mapPayoutStatus(stripeStatus: string): UserWithdrawalStatus {
    switch (stripeStatus) {
      case 'pending':
        return UserWithdrawalStatus.PENDING;
      case 'in_transit':
        return UserWithdrawalStatus.IN_TRANSIT;
      case 'paid':
        return UserWithdrawalStatus.PAID;
      case 'failed':
        return UserWithdrawalStatus.FAILED;
      case 'canceled':
        return UserWithdrawalStatus.CANCELLED;
      default:
        return UserWithdrawalStatus.PENDING;
    }
  }

  /**
   * Map our status to Stripe status for filtering
   */
  private mapStatusToStripe(status: UserWithdrawalStatus): string {
    switch (status) {
      case UserWithdrawalStatus.PENDING:
        return 'pending';
      case UserWithdrawalStatus.IN_TRANSIT:
        return 'in_transit';
      case UserWithdrawalStatus.PAID:
        return 'paid';
      case UserWithdrawalStatus.FAILED:
        return 'failed';
      case UserWithdrawalStatus.CANCELLED:
        return 'canceled';
      default:
        return 'pending';
    }
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummary(withdrawals: UserWithdrawalItem[]): {
    totalWithdrawn: number;
    pendingWithdrawals: number;
    lastWithdrawalDate?: Date;
  } {
    let totalWithdrawn = 0;
    let pendingWithdrawals = 0;
    let lastWithdrawalDate: Date | undefined;

    for (const w of withdrawals) {
      if (w.status === UserWithdrawalStatus.PAID) {
        totalWithdrawn += w.amount;
        if (!lastWithdrawalDate || w.createdAt > lastWithdrawalDate) {
          lastWithdrawalDate = w.createdAt;
        }
      } else if (
        w.status === UserWithdrawalStatus.PENDING ||
        w.status === UserWithdrawalStatus.IN_TRANSIT
      ) {
        pendingWithdrawals += w.amount;
      }
    }

    return {
      totalWithdrawn: totalWithdrawn / 100,
      pendingWithdrawals: pendingWithdrawals / 100,
      lastWithdrawalDate,
    };
  }
}

// Export singleton instance
export const userWithdrawalService = new UserWithdrawalService();
