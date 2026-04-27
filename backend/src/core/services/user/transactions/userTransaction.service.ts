import { getStripeCountryConfig } from '@core/constants/stripe-countries';
import { Hub } from '@core/models/Hub';
import { User } from '@core/models/User';
import { StripeServiceFactory } from '@core/services/shared/payments/stripeFactory.service';
import type Stripe from 'stripe';

/**
 * Earning type enum
 */
export enum EarningType {
  JOB_PAYMENT = 'job_payment',
  MILESTONE_PAYMENT = 'milestone_payment',
  WITHDRAWAL = 'withdrawal',
  REFUND = 'refund',
  ADJUSTMENT = 'adjustment',
}

/**
 * Earning status enum
 */
export enum EarningStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * User Balance response interface
 */
export interface UserBalance {
  available: {
    amount: number;
    currency: string;
  }[];
  pending: {
    amount: number;
    currency: string;
  }[];
  totalAvailable: number; // In account's default currency (from Stripe or user location)
  totalPending: number;
  currency: string; // Account's default currency (e.g., MYR, IDR, SGD)
}

/**
 * Earning item interface
 */
export interface EarningItem {
  _id: string;
  type: EarningType;
  status: EarningStatus;
  referenceId?: string;
  amount: number;
  currency: string;
  platformFee: number;
  transferAmount: number;
  hubId?: string;
  description: string;
  metadata: {
    hubId?: string;
    hubName?: string;
    contractId?: string;
    milestoneId?: string;
  };
  createdAt: Date;
}

/**
 * Earnings list response
 */
export interface EarningsListResponse {
  earnings: EarningItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: {
    totalEarnings: number;
    totalWithdrawals: number;
    pendingAmount: number;
    netEarnings: number;
  };
}

/**
 * Earnings filter options
 */
export interface EarningsFilter {
  type?: string;
  status?: string;
  page?: number;
  limit?: number;
}

/**
 * Export filter options
 */
export interface ExportEarningsFilter {
  type?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
}

/**
 * User Transaction Service
 *
 * Manages transaction history and balance for Users (experts).
 * Retrieves data from Stripe Connect accounts.
 */
export class UserTransactionService {
  /**
   * Get User's Stripe info - reads from User directly
   */
  private async getUserStripeInfo(userId: string): Promise<{
    stripeAccountId: string | null;
    country: string | null;
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

    // Get user's owned hub if any for regional service selection
    const hub = await Hub.findOne({ ownerId: userId })
      .select('stripeAccountId stripeRegion location')
      .lean();

    return {
      stripeAccountId: user?.stripeAccountId || null,
      country: user?.location?.country || null,
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
   * Get User's current balance
   * Currency is determined from Stripe account or user location
   * Uses regional Stripe service based on user's stripeRegion
   */
  async getBalance(userId: string): Promise<UserBalance> {
    const { stripeAccountId, country, user, hub } = await this.getUserStripeInfo(userId);

    // Get default currency from user location
    const countryConfig = getStripeCountryConfig(country || undefined);
    const defaultCurrency = countryConfig.currency;

    if (!stripeAccountId || !user) {
      return {
        available: [],
        pending: [],
        totalAvailable: 0,
        totalPending: 0,
        currency: defaultCurrency,
      };
    }

    // Get regional Stripe service
    const regionalStripeService = StripeServiceFactory.getServiceForUser(user, hub);

    // Get balance from Stripe using regional service
    const balance = await regionalStripeService.getStripeInstance().balance.retrieve({
      stripeAccount: stripeAccountId,
    });

    // Determine the primary currency from the Stripe account's balance
    // Use the first available balance currency, or fall back to user location currency
    const primaryCurrency =
      balance.available[0]?.currency?.toUpperCase() ||
      balance.pending[0]?.currency?.toUpperCase() ||
      defaultCurrency;

    // Calculate totals using the primary currency
    const totalAvailable = balance.available.reduce((sum, b) => {
      return sum + b.amount;
    }, 0);

    const totalPending = balance.pending.reduce((sum, b) => {
      return sum + b.amount;
    }, 0);

    return {
      available: balance.available.map((b) => ({
        amount: b.amount,
        currency: b.currency.toUpperCase(),
      })),
      pending: balance.pending.map((b) => ({
        amount: b.amount,
        currency: b.currency.toUpperCase(),
      })),
      totalAvailable: totalAvailable / 100, // Convert from cents
      totalPending: totalPending / 100,
      currency: primaryCurrency,
    };
  }

  /**
   * Get earnings history for User
   * Uses regional Stripe service based on user's stripeRegion
   */
  async getEarnings(userId: string, filter: EarningsFilter = {}): Promise<EarningsListResponse> {
    const { stripeAccountId, user, hub } = await this.getUserStripeInfo(userId);

    if (!stripeAccountId || !user) {
      return {
        earnings: [],
        pagination: { page: 1, limit: 50, total: 0, totalPages: 0 },
        summary: {
          totalEarnings: 0,
          totalWithdrawals: 0,
          pendingAmount: 0,
          netEarnings: 0,
        },
      };
    }

    const page = filter.page || 1;
    const limit = filter.limit || 50;

    // Get regional Stripe service
    const regionalStripeService = StripeServiceFactory.getServiceForUser(user, hub);

    // Build Stripe query params
    const params: Stripe.BalanceTransactionListParams = {
      limit: 100, // Get more to allow filtering
    };

    // Fetch balance transactions from Stripe using regional service
    const balanceTransactions = await regionalStripeService
      .getStripeInstance()
      .balanceTransactions.list(params, {
        stripeAccount: stripeAccountId,
      });

    // Map Stripe transactions to our format
    let earnings = balanceTransactions.data.map((bt) => this.mapStripeTransaction(bt));

    // Filter by type if specified
    if (filter.type) {
      earnings = earnings.filter((t) => t.type === filter.type);
    }

    // Filter by status if specified
    if (filter.status) {
      earnings = earnings.filter((t) => t.status === filter.status);
    }

    // Calculate total and paginate
    const total = earnings.length;
    const totalPages = Math.ceil(total / limit);
    const paginatedEarnings = earnings.slice((page - 1) * limit, page * limit);

    // Calculate summary
    const summary = this.calculateSummary(earnings);

    return {
      earnings: paginatedEarnings,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      summary,
    };
  }

  /**
   * Export earnings to CSV format
   * Uses regional Stripe service based on user's stripeRegion
   */
  async exportEarnings(userId: string, filter: ExportEarningsFilter = {}): Promise<string> {
    const { stripeAccountId, user, hub } = await this.getUserStripeInfo(userId);

    if (!stripeAccountId || !user) {
      return 'No earnings data available';
    }

    // Get regional Stripe service
    const regionalStripeService = StripeServiceFactory.getServiceForUser(user, hub);

    // Build Stripe query params
    const params: Stripe.BalanceTransactionListParams = {
      limit: 100, // Max per request
    };

    if (filter.startDate) {
      params.created = { gte: Math.floor(filter.startDate.getTime() / 1000) };
    }
    if (filter.endDate) {
      params.created = {
        ...((params.created as Record<string, number>) || {}),
        lte: Math.floor(filter.endDate.getTime() / 1000),
      };
    }

    // Fetch balance transactions from Stripe using regional service
    const balanceTransactions = await regionalStripeService
      .getStripeInstance()
      .balanceTransactions.list(params, {
        stripeAccount: stripeAccountId,
      });

    // Map and filter
    let earnings = balanceTransactions.data.map((bt) => this.mapStripeTransaction(bt));

    if (filter.type) {
      earnings = earnings.filter((t) => t.type === filter.type);
    }
    if (filter.status) {
      earnings = earnings.filter((t) => t.status === filter.status);
    }

    // Build CSV
    const headers = [
      'ID',
      'Date',
      'Type',
      'Status',
      'Description',
      'Amount',
      'Platform Fee',
      'Transfer Amount',
      'Currency',
    ];

    const rows = earnings.map((t) => [
      t._id,
      t.createdAt.toISOString(),
      t.type,
      t.status,
      `"${t.description.replace(/"/g, '""')}"`,
      (t.amount / 100).toFixed(2),
      (t.platformFee / 100).toFixed(2),
      (t.transferAmount / 100).toFixed(2),
      t.currency,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  /**
   * Map Stripe balance transaction to our format
   */
  private mapStripeTransaction(bt: Stripe.BalanceTransaction): EarningItem {
    return {
      _id: bt.id,
      type: this.mapTransactionType(bt.type),
      status: this.mapTransactionStatus(bt.status),
      referenceId: bt.source as string | undefined,
      amount: bt.amount,
      currency: bt.currency.toUpperCase(),
      platformFee: bt.fee,
      transferAmount: bt.net,
      description: bt.description || this.generateDescription(bt),
      metadata: {
        // Extract metadata from source if available
        hubId: (bt.source as Stripe.Charge)?.metadata?.hubId,
        hubName: (bt.source as Stripe.Charge)?.metadata?.hubName,
        contractId: (bt.source as Stripe.Charge)?.metadata?.contractId,
        milestoneId: (bt.source as Stripe.Charge)?.metadata?.milestoneId,
      },
      createdAt: new Date(bt.created * 1000),
    };
  }

  /**
   * Map Stripe transaction type to our enum
   */
  private mapTransactionType(stripeType: string): EarningType {
    switch (stripeType) {
      case 'charge':
      case 'payment':
      case 'transfer':
        return EarningType.JOB_PAYMENT;
      case 'payout':
        return EarningType.WITHDRAWAL;
      case 'refund':
      case 'payment_refund':
        return EarningType.REFUND;
      case 'adjustment':
        return EarningType.ADJUSTMENT;
      default:
        return EarningType.ADJUSTMENT;
    }
  }

  /**
   * Map Stripe status to our enum
   */
  private mapTransactionStatus(stripeStatus: string): EarningStatus {
    switch (stripeStatus) {
      case 'available':
        return EarningStatus.COMPLETED;
      case 'pending':
        return EarningStatus.PENDING;
      default:
        return EarningStatus.COMPLETED;
    }
  }

  /**
   * Generate description for transaction
   */
  private generateDescription(bt: Stripe.BalanceTransaction): string {
    switch (bt.type) {
      case 'charge':
      case 'payment':
      case 'transfer':
        return 'Job/Milestone payment received';
      case 'payout':
        return 'Withdrawal to bank account';
      case 'refund':
      case 'payment_refund':
        return 'Refund issued';
      case 'adjustment':
        return 'Balance adjustment';
      default:
        return bt.type;
    }
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummary(earnings: EarningItem[]): {
    totalEarnings: number;
    totalWithdrawals: number;
    pendingAmount: number;
    netEarnings: number;
  } {
    let totalEarnings = 0;
    let totalWithdrawals = 0;
    let pendingAmount = 0;

    for (const t of earnings) {
      if (t.type === EarningType.JOB_PAYMENT || t.type === EarningType.MILESTONE_PAYMENT) {
        if (t.status === EarningStatus.COMPLETED) {
          totalEarnings += t.transferAmount;
        } else if (t.status === EarningStatus.PENDING) {
          pendingAmount += t.transferAmount;
        }
      } else if (t.type === EarningType.WITHDRAWAL) {
        totalWithdrawals += Math.abs(t.amount);
      }
    }

    return {
      totalEarnings: totalEarnings / 100,
      totalWithdrawals: totalWithdrawals / 100,
      pendingAmount: pendingAmount / 100,
      netEarnings: (totalEarnings - totalWithdrawals) / 100,
    };
  }
}

// Export singleton instance
export const userTransactionService = new UserTransactionService();
