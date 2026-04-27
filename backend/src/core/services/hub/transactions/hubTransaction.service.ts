import { getStripeCountryConfig } from '@core/constants/stripe-countries';
import { Hub } from '@core/models/Hub';
import { Transaction } from '@core/models/Transaction';
import { StripeServiceFactory } from '@core/services/shared/payments/stripeFactory.service';
import mongoose from 'mongoose';
import type Stripe from 'stripe';

/**
 * Transaction type enum (for API response)
 */
export enum TransactionType {
  BOOKING_PAYMENT = 'booking_payment',
  MILESTONE_FUND = 'milestone_fund',
  MILESTONE_RELEASE = 'milestone_release',
  TIMELOG_PAYMENT = 'timelog_payment',
  EXPERT_TRANSFER = 'expert_transfer',
  WITHDRAWAL = 'withdrawal',
  REFUND = 'refund',
  PLATFORM_FEE = 'platform_fee',
}

/**
 * Transaction status enum
 */
export enum TransactionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled',
}

/**
 * Balance response interface
 */
export interface HubBalance {
  available: {
    amount: number;
    currency: string;
  }[];
  pending: {
    amount: number;
    currency: string;
  }[];
  totalAvailable: number; // In account's default currency (from Stripe or hub location)
  totalPending: number;
  currency: string; // Account's default currency (e.g., MYR, IDR, SGD)
}

/**
 * Transaction item interface
 */
export interface TransactionItem {
  id: string;
  referenceId?: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  currency: string;
  fee: number;
  platformFee: number;
  stripeFee: number;
  net: number;
  description: string;
  direction: string;
  serviceType?: string;
  metadata: {
    bookingId?: string;
    serviceId?: string;
    contractId?: string;
    milestoneId?: string;
    fromUserId?: string;
    toUserId?: string;
    stripePaymentIntentId?: string;
    stripePayoutId?: string;
  };
  createdAt: Date;
  source: 'mongodb' | 'stripe'; // Track data source
}

/**
 * Transaction list response
 */
export interface TransactionListResponse {
  transactions: TransactionItem[];
  pagination: {
    hasMore: boolean;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  summary: {
    totalEarnings: number;
    totalTransfers: number;
    totalWithdrawals: number;
    totalRefunds: number;
    netEarnings: number;
  };
}

/**
 * Transaction filter options
 */
export interface TransactionFilter {
  type?: TransactionType;
  status?: TransactionStatus;
  direction?: 'inbound' | 'outbound' | 'internal';
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  page?: number;
}

/**
 * Hub Transaction Service
 *
 * Manages transaction history and balance for Hubs.
 * Hybrid approach:
 * - Payments/Refunds from MongoDB Transaction model
 * - Withdrawals from Stripe payouts API
 * - Balance from Stripe real-time
 */
export class HubTransactionService {
  /**
   * Get Hub's Stripe account ID (acct_xxx), region, and location - reads from Hub directly
   */
  private async getHubStripeInfo(hubId: string): Promise<{
    stripeAccountId: string | null;
    stripeRegion: 'malaysia' | 'atlas' | null;
    country: string | null;
    hub: {
      stripeAccountId?: string;
      stripeRegion?: string;
      location?: { country?: string };
    } | null;
  }> {
    const hub = await Hub.findById(hubId).select('stripeAccountId stripeRegion location').lean();
    return {
      stripeAccountId: hub?.stripeAccountId || null,
      stripeRegion: (hub?.stripeRegion as 'malaysia' | 'atlas') || null,
      country: hub?.location?.country || null,
      hub: hub as {
        stripeAccountId?: string;
        stripeRegion?: string;
        location?: { country?: string };
      } | null,
    };
  }

  /**
   * Get Hub's current balance (from Stripe - real-time)
   * Uses regional Stripe service based on hub's stripeRegion
   */
  async getBalance(hubId: string): Promise<HubBalance> {
    const { stripeAccountId, country, hub } = await this.getHubStripeInfo(hubId);

    // Get default currency from hub location
    const countryConfig = getStripeCountryConfig(country || undefined);
    const defaultCurrency = countryConfig.currency;

    if (!stripeAccountId || !hub) {
      return {
        available: [],
        pending: [],
        totalAvailable: 0,
        totalPending: 0,
        currency: defaultCurrency,
      };
    }

    // Get regional Stripe service
    const regionalStripeService = StripeServiceFactory.getServiceForHub(hub);

    // Get balance from Stripe using regional service
    const balance = await regionalStripeService.getStripeInstance().balance.retrieve({
      stripeAccount: stripeAccountId,
    });

    // Determine the primary currency from the Stripe account's balance
    const primaryCurrency =
      balance.available[0]?.currency?.toUpperCase() ||
      balance.pending[0]?.currency?.toUpperCase() ||
      defaultCurrency;

    // Calculate totals
    const totalAvailable = balance.available.reduce((sum, b) => sum + b.amount, 0);
    const totalPending = balance.pending.reduce((sum, b) => sum + b.amount, 0);

    return {
      available: balance.available.map((b) => ({
        amount: b.amount / 100, // Convert from cents
        currency: b.currency.toUpperCase(),
      })),
      pending: balance.pending.map((b) => ({
        amount: b.amount / 100, // Convert from cents
        currency: b.currency.toUpperCase(),
      })),
      totalAvailable: totalAvailable / 100, // Convert from cents
      totalPending: totalPending / 100,
      currency: primaryCurrency,
    };
  }

  /**
   * Get transaction history for Hub (from MongoDB)
   */
  async getTransactions(
    hubId: string,
    filter: TransactionFilter = {},
  ): Promise<TransactionListResponse> {
    const { limit = 25, page = 1, type, status, direction, startDate, endDate } = filter;

    // Fetch all transactions from MongoDB (including withdrawals)
    const mongoResult = await this.getMongoDBTransactions(hubId, {
      type,
      status,
      direction,
      startDate,
      endDate,
      page,
      limit,
    });

    // Calculate summary from all transactions
    const summary = this.calculateSummary(mongoResult.transactions);

    return {
      transactions: mongoResult.transactions,
      pagination: {
        hasMore: mongoResult.total > page * limit,
        total: mongoResult.total,
        page,
        limit,
        totalPages: Math.ceil(mongoResult.total / limit),
      },
      summary,
    };
  }

  /**
   * Fetch transactions from MongoDB
   */
  private async getMongoDBTransactions(
    hubId: string,
    filter: {
      type?: TransactionType;
      status?: TransactionStatus;
      direction?: string;
      startDate?: Date;
      endDate?: Date;
      page?: number;
      limit?: number;
    },
  ): Promise<{ transactions: TransactionItem[]; total: number }> {
    const matchFilter: Record<string, unknown> = {
      hubId: new mongoose.Types.ObjectId(hubId),
    };

    // Filter by type if specified (including withdrawals from MongoDB)
    if (filter.type) {
      matchFilter.type = filter.type;
    }

    if (filter.status) {
      matchFilter.status = filter.status;
    }

    if (filter.direction) {
      matchFilter.direction = filter.direction;
    }

    if (filter.startDate || filter.endDate) {
      matchFilter.createdAt = {};
      if (filter.startDate) {
        (matchFilter.createdAt as Record<string, unknown>).$gte = filter.startDate;
      }
      if (filter.endDate) {
        const end = new Date(filter.endDate);
        end.setHours(23, 59, 59, 999);
        (matchFilter.createdAt as Record<string, unknown>).$lte = end;
      }
    }

    const page = filter.page || 1;
    const limit = filter.limit || 25;
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      Transaction.find(matchFilter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('fromUserId', 'name email')
        .populate('toUserId', 'name email')
        .lean(),
      Transaction.countDocuments(matchFilter),
    ]);

    return {
      transactions: transactions.map((t) => this.mapMongoTransaction(t)),
      total,
    };
  }

  /**
   * Map MongoDB Transaction to TransactionItem
   */
  private mapMongoTransaction(t: Record<string, unknown>): TransactionItem {
    const txn = t as {
      _id: mongoose.Types.ObjectId;
      type: string;
      status: string;
      direction: string;
      amount: number;
      currency: string;
      platformFee?: number;
      stripeFee?: number;
      transferAmount?: number;
      description?: string;
      serviceType?: string;
      sourceModel?: string;
      sourceId?: mongoose.Types.ObjectId;
      referenceId?: string;
      serviceId?: mongoose.Types.ObjectId;
      fromUserId?: { _id: mongoose.Types.ObjectId; name?: string; email?: string };
      toUserId?: { _id: mongoose.Types.ObjectId; name?: string; email?: string };
      stripePaymentIntentId?: string;
      createdAt: Date;
    };

    const platformFee = txn.platformFee || 0;
    const stripeFee = txn.stripeFee || 0;
    const totalFee = platformFee + stripeFee;
    const net = txn.amount - totalFee;

    // Map sourceId to appropriate metadata field based on sourceModel
    const metadata: TransactionItem['metadata'] = {
      serviceId: txn.serviceId?.toString(),
      fromUserId: txn.fromUserId?._id?.toString(),
      toUserId: txn.toUserId?._id?.toString(),
      stripePaymentIntentId: txn.stripePaymentIntentId,
    };

    // Set bookingId or contractId based on sourceModel
    if (txn.sourceId) {
      if (txn.sourceModel === 'booking') {
        metadata.bookingId = txn.sourceId.toString();
      } else if (txn.sourceModel === 'contract_payment') {
        metadata.contractId = txn.sourceId.toString();
      }
    }

    return {
      id: txn._id.toString(),
      referenceId: txn.referenceId,
      type: txn.type as TransactionType,
      status: txn.status as TransactionStatus,
      amount: txn.amount,
      currency: txn.currency,
      fee: totalFee,
      platformFee,
      stripeFee,
      net,
      description: txn.description || this.generateDescription(txn.type, txn.serviceType),
      direction: txn.direction,
      serviceType: txn.serviceType,
      metadata,
      createdAt: new Date(txn.createdAt),
      source: 'mongodb',
    };
  }

  /**
   * Map Stripe Payout to TransactionItem
   */
  private mapStripePayout(payout: Stripe.Payout): TransactionItem {
    return {
      id: payout.id,
      type: TransactionType.WITHDRAWAL,
      status: this.mapPayoutStatus(payout.status),
      amount: payout.amount / 100, // Convert from cents
      currency: payout.currency.toUpperCase(),
      fee: 0,
      platformFee: 0,
      stripeFee: 0,
      net: payout.amount / 100,
      description: payout.description || 'Withdrawal to bank account',
      direction: 'outbound',
      metadata: {
        stripePayoutId: payout.id,
      },
      createdAt: new Date(payout.created * 1000),
      source: 'stripe',
    };
  }

  /**
   * Map Stripe payout status to our TransactionStatus
   */
  private mapPayoutStatus(stripeStatus: Stripe.Payout['status']): TransactionStatus {
    switch (stripeStatus) {
      case 'paid':
        return TransactionStatus.SUCCEEDED;
      case 'pending':
      case 'in_transit':
        return TransactionStatus.PENDING;
      case 'canceled':
        return TransactionStatus.CANCELLED;
      case 'failed':
        return TransactionStatus.FAILED;
      default:
        return TransactionStatus.PENDING;
    }
  }

  /**
   * Generate description based on transaction type
   */
  private generateDescription(type: string, serviceType?: string): string {
    switch (type) {
      case 'booking_payment':
        return serviceType ? `${serviceType} booking payment` : 'Booking payment';
      case 'milestone_fund':
        return 'Milestone escrow funded';
      case 'milestone_release':
        return 'Milestone payment released';
      case 'timelog_payment':
        return 'Hourly work payment';
      case 'expert_transfer':
        return 'Transfer to expert';
      case 'refund':
        return 'Refund issued';
      case 'platform_fee':
        return 'Platform fee';
      default:
        return type.replace(/_/g, ' ');
    }
  }

  /**
   * Get single transaction details
   */
  async getTransaction(hubId: string, transactionId: string): Promise<TransactionItem | null> {
    // Try MongoDB first
    const mongoTxn = await Transaction.findOne({
      _id: transactionId,
      hubId: new mongoose.Types.ObjectId(hubId),
    })
      .populate('fromUserId', 'name email')
      .populate('toUserId', 'name email')
      .lean();

    if (mongoTxn) {
      return this.mapMongoTransaction(mongoTxn as Record<string, unknown>);
    }

    // If not found in MongoDB and starts with 'po_', try Stripe (withdrawal)
    if (transactionId.startsWith('po_')) {
      const { stripeAccountId, hub } = await this.getHubStripeInfo(hubId);
      if (stripeAccountId && hub) {
        try {
          // Get regional Stripe service
          const regionalStripeService = StripeServiceFactory.getServiceForHub(hub);
          const payout = await regionalStripeService
            .getStripeInstance()
            .payouts.retrieve(transactionId, { stripeAccount: stripeAccountId });
          return this.mapStripePayout(payout);
        } catch {
          return null;
        }
      }
    }

    return null;
  }

  /**
   * Export transactions to CSV format
   */
  async exportTransactions(hubId: string, filter: TransactionFilter = {}): Promise<string> {
    // Get all transactions with higher limit
    const result = await this.getTransactions(hubId, {
      ...filter,
      limit: 1000,
      page: 1,
    });

    // Build CSV
    const headers = [
      'ID',
      'Date',
      'Type',
      'Status',
      'Direction',
      'Description',
      'Amount',
      'Platform Fee',
      'Stripe Fee',
      'Net',
      'Currency',
      'Source',
    ];

    const rows = result.transactions.map((t) => [
      t.id,
      t.createdAt.toISOString(),
      t.type,
      t.status,
      t.direction,
      `"${t.description.replace(/"/g, '""')}"`,
      t.amount.toFixed(2),
      t.platformFee.toFixed(2),
      t.stripeFee.toFixed(2),
      t.net.toFixed(2),
      t.currency,
      t.source,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummary(transactions: TransactionItem[]): {
    totalEarnings: number;
    totalTransfers: number;
    totalWithdrawals: number;
    totalRefunds: number;
    netEarnings: number;
  } {
    let totalEarnings = 0;
    let totalTransfers = 0;
    let totalWithdrawals = 0;
    let totalRefunds = 0;

    for (const t of transactions) {
      if (
        t.type === TransactionType.BOOKING_PAYMENT ||
        t.type === TransactionType.MILESTONE_FUND ||
        t.type === TransactionType.TIMELOG_PAYMENT
      ) {
        totalEarnings += t.net;
      } else if (t.type === TransactionType.EXPERT_TRANSFER) {
        // Expert transfers are money paid out to experts
        totalTransfers += Math.abs(t.amount);
      } else if (t.type === TransactionType.WITHDRAWAL) {
        totalWithdrawals += Math.abs(t.amount);
      } else if (t.type === TransactionType.REFUND) {
        totalRefunds += Math.abs(t.amount);
      }
    }

    // Round to 2 decimal places to avoid floating point precision issues
    const round2 = (n: number) => Math.round(n * 100) / 100;

    return {
      totalEarnings: round2(totalEarnings),
      totalTransfers: round2(totalTransfers),
      totalWithdrawals: round2(totalWithdrawals),
      totalRefunds: round2(totalRefunds),
      netEarnings: round2(totalEarnings - totalTransfers - totalRefunds),
    };
  }
}

// Export singleton instance
export const hubTransactionService = new HubTransactionService();
