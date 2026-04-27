import { Hub } from '@core/models/Hub';
import {
  SourceModel,
  Transaction,
  TransactionDirection,
  TransactionStatus,
  TransactionType,
} from '@core/models/Transaction';
import { User } from '@core/models/User';
import { StripeServiceFactory } from '@core/services/shared/payments/stripeFactory.service';
import { communicationTriggerService } from '@services/communications';
import mongoose from 'mongoose';
import type Stripe from 'stripe';
import { hubTransactionService } from './hubTransaction.service';

/**
 * Withdrawal status enum
 */
export enum WithdrawalStatus {
  PENDING = 'pending',
  IN_TRANSIT = 'in_transit',
  PAID = 'paid',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * Withdrawal item interface
 */
export interface WithdrawalItem {
  id: string;
  amount: number;
  currency: string;
  status: WithdrawalStatus;
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
export interface WithdrawalListResponse {
  withdrawals: WithdrawalItem[];
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
export interface CreateWithdrawalRequest {
  amount: number; // In cents
  currency?: string; // Default: MYR
  bankAccountId?: string; // Specific bank account, or default
  description?: string;
}

/**
 * Hub Withdrawal Service
 *
 * Manages payouts/withdrawals from Hub Stripe accounts to bank accounts.
 */
export class HubWithdrawalService {
  /**
   * Get Hub's Stripe info - reads from Hub directly
   */
  private async getHubStripeInfo(hubId: string): Promise<{
    stripeAccountId: string | null;
    hub: {
      stripeAccountId?: string;
      stripeRegion?: string;
      location?: { country?: string };
    } | null;
  }> {
    const hub = await Hub.findById(hubId).select('stripeAccountId stripeRegion location').lean();
    return {
      stripeAccountId: hub?.stripeAccountId || null,
      hub: hub as {
        stripeAccountId?: string;
        stripeRegion?: string;
        location?: { country?: string };
      } | null,
    };
  }

  /**
   * Create a withdrawal (payout) for Hub
   * Uses regional Stripe service based on hub's stripeRegion
   */
  async createWithdrawal(hubId: string, request: CreateWithdrawalRequest): Promise<WithdrawalItem> {
    const { stripeAccountId, hub } = await this.getHubStripeInfo(hubId);

    if (!stripeAccountId || !hub) {
      throw new Error('Hub does not have a Stripe account');
    }

    // Get regional Stripe service
    const regionalStripeService = StripeServiceFactory.getServiceForHub(hub);

    // Fetch account status from Stripe to check payouts enabled
    const account = await regionalStripeService
      .getStripeInstance()
      .accounts.retrieve(stripeAccountId);

    if (!account.payouts_enabled) {
      throw new Error('Payouts are not enabled for this account. Complete KYC first.');
    }

    // Check available balance
    const balance = await hubTransactionService.getBalance(hubId);
    const requestedAmount = request.amount / 100; // Convert to currency units

    if (balance.totalAvailable < requestedAmount) {
      throw new Error(
        `Insufficient balance. Available: ${balance.totalAvailable} ${balance.currency}, Requested: ${requestedAmount}`,
      );
    }

    // Create payout in Stripe
    const payoutParams: Stripe.PayoutCreateParams = {
      amount: request.amount,
      currency: (request.currency || 'MYR').toLowerCase(),
      description: request.description || 'Hub withdrawal',
      metadata: {
        hubId,
        source: 'hub_dashboard',
      },
    };

    // If specific bank account requested
    if (request.bankAccountId) {
      payoutParams.destination = request.bankAccountId;
    }

    const payout = await regionalStripeService.getStripeInstance().payouts.create(payoutParams, {
      stripeAccount: stripeAccountId,
    });

    // Save withdrawal to MongoDB for admin panel tracking
    try {
      await Transaction.create({
        type: TransactionType.WITHDRAWAL,
        direction: TransactionDirection.OUTBOUND,
        sourceModel: SourceModel.WITHDRAWAL,
        sourceId: new mongoose.Types.ObjectId(), // Self-referencing
        amount: request.amount / 100, // Store in currency units
        currency: (request.currency || 'MYR').toUpperCase(),
        hubId: new mongoose.Types.ObjectId(hubId),
        stripePayoutId: payout.id,
        stripeAccountId: stripeAccountId,
        status: TransactionStatus.PENDING,
        description: request.description || 'Hub withdrawal',
        transferMethod: 'stripe_connect',
        metadata: {
          bankAccountId: request.bankAccountId,
          arrivalDate: new Date(payout.arrival_date * 1000).toISOString(),
        },
      });
    } catch (error) {
      // Log error but don't fail the withdrawal - Stripe payout was successful
      console.error('Failed to save withdrawal to MongoDB:', error);
    }

    // Send notification about withdrawal initiation
    void this.sendWithdrawalNotification(hubId, payout, 'WITHDRAWAL_INITIATED');

    return this.mapStripePayout(payout);
  }

  /**
   * Send withdrawal-related notification
   */
  private async sendWithdrawalNotification(
    hubId: string,
    payout: Stripe.Payout,
    templateId:
      | 'WITHDRAWAL_INITIATED'
      | 'WITHDRAWAL_CANCELLED'
      | 'WITHDRAWAL_COMPLETED'
      | 'WITHDRAWAL_FAILED',
  ): Promise<void> {
    try {
      const hub = await Hub.findById(hubId).select('name ownerId').lean();
      if (!hub?.ownerId) return;

      const owner = await User.findById(hub.ownerId).select('name email phone').lean();
      if (!owner) return;

      const destination = payout.destination as Stripe.BankAccount | null;
      const amountFormatted = (payout.amount / 100).toFixed(2);

      await communicationTriggerService.triggerCommunicationWithUser({
        templateId,
        user: {
          _id: owner._id.toString(),
          name: owner.name,
          email: owner.email,
          phone: owner.phoneNumber,
        },
        hubId,
        data: {
          userName: owner.name,
          hubName: hub.name,
          amount: amountFormatted,
          currency: payout.currency.toUpperCase(),
          bankAccountLast4: destination?.last4 || 'XXXX',
          bankName: destination?.bank_name || 'Bank',
          arrivalDate: new Date(payout.arrival_date * 1000).toLocaleDateString(),
          failureMessage: payout.failure_message || '',
          payoutId: payout.id,
        },
        channels:
          templateId === 'WITHDRAWAL_INITIATED' || templateId === 'WITHDRAWAL_CANCELLED'
            ? ['email', 'inApp']
            : ['email', 'inApp', 'whatsApp'], // Include WhatsApp for completed/failed
      });
    } catch (error) {
      console.error(`Failed to send ${templateId} notification:`, error);
    }
  }

  /**
   * Get list of withdrawals for Hub
   * Uses regional Stripe service based on hub's stripeRegion
   */
  async getWithdrawals(
    hubId: string,
    options: {
      limit?: number;
      startingAfter?: string;
      status?: WithdrawalStatus;
    } = {},
  ): Promise<WithdrawalListResponse> {
    const { stripeAccountId, hub } = await this.getHubStripeInfo(hubId);

    if (!stripeAccountId || !hub) {
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
    const regionalStripeService = StripeServiceFactory.getServiceForHub(hub);

    // Build query params
    const params: Record<string, unknown> = {
      limit: options.limit || 25,
    };

    if (options.startingAfter) {
      params.starting_after = options.startingAfter;
    }

    // Map status filter
    if (options.status) {
      params.status = this.mapStatusToStripe(options.status);
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
   * Uses regional Stripe service based on hub's stripeRegion
   */
  async getWithdrawal(hubId: string, payoutId: string): Promise<WithdrawalItem | null> {
    const { stripeAccountId, hub } = await this.getHubStripeInfo(hubId);

    if (!stripeAccountId || !hub) {
      return null;
    }

    // Get regional Stripe service
    const regionalStripeService = StripeServiceFactory.getServiceForHub(hub);

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
   * Uses regional Stripe service based on hub's stripeRegion
   */
  async cancelWithdrawal(hubId: string, payoutId: string): Promise<WithdrawalItem> {
    const { stripeAccountId, hub } = await this.getHubStripeInfo(hubId);

    if (!stripeAccountId || !hub) {
      throw new Error('Hub does not have a Stripe account');
    }

    // Get regional Stripe service
    const regionalStripeService = StripeServiceFactory.getServiceForHub(hub);

    const payout = await regionalStripeService.getStripeInstance().payouts.cancel(payoutId, {
      stripeAccount: stripeAccountId,
    });

    // Send notification about withdrawal cancellation
    void this.sendWithdrawalNotification(hubId, payout, 'WITHDRAWAL_CANCELLED');

    return this.mapStripePayout(payout);
  }

  /**
   * Get estimated arrival date for withdrawal
   */
  async getEstimatedArrival(hubId: string): Promise<Date | null> {
    const { stripeAccountId } = await this.getHubStripeInfo(hubId);

    if (!stripeAccountId) {
      return null;
    }

    // Stripe typically takes 2-3 business days for Malaysia
    // This is an estimate; actual timing depends on bank and Stripe processing
    const now = new Date();
    const estimatedDays = 3; // Business days

    let daysAdded = 0;
    const arrivalDate = new Date(now);

    while (daysAdded < estimatedDays) {
      arrivalDate.setDate(arrivalDate.getDate() + 1);
      const dayOfWeek = arrivalDate.getDay();
      // Skip weekends (0 = Sunday, 6 = Saturday)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        daysAdded++;
      }
    }

    return arrivalDate;
  }

  /**
   * Map Stripe payout to our format
   */
  private mapStripePayout(payout: Stripe.Payout): WithdrawalItem {
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
  private mapPayoutStatus(stripeStatus: string): WithdrawalStatus {
    switch (stripeStatus) {
      case 'pending':
        return WithdrawalStatus.PENDING;
      case 'in_transit':
        return WithdrawalStatus.IN_TRANSIT;
      case 'paid':
        return WithdrawalStatus.PAID;
      case 'failed':
        return WithdrawalStatus.FAILED;
      case 'canceled':
        return WithdrawalStatus.CANCELLED;
      default:
        return WithdrawalStatus.PENDING;
    }
  }

  /**
   * Map our status to Stripe status for filtering
   */
  private mapStatusToStripe(status: WithdrawalStatus): string {
    switch (status) {
      case WithdrawalStatus.PENDING:
        return 'pending';
      case WithdrawalStatus.IN_TRANSIT:
        return 'in_transit';
      case WithdrawalStatus.PAID:
        return 'paid';
      case WithdrawalStatus.FAILED:
        return 'failed';
      case WithdrawalStatus.CANCELLED:
        return 'canceled';
      default:
        return 'pending';
    }
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummary(withdrawals: WithdrawalItem[]): {
    totalWithdrawn: number;
    pendingWithdrawals: number;
    lastWithdrawalDate?: Date;
  } {
    let totalWithdrawn = 0;
    let pendingWithdrawals = 0;
    let lastWithdrawalDate: Date | undefined;

    for (const w of withdrawals) {
      if (w.status === WithdrawalStatus.PAID) {
        totalWithdrawn += w.amount;
        if (!lastWithdrawalDate || w.createdAt > lastWithdrawalDate) {
          lastWithdrawalDate = w.createdAt;
        }
      } else if (
        w.status === WithdrawalStatus.PENDING ||
        w.status === WithdrawalStatus.IN_TRANSIT
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
export const hubWithdrawalService = new HubWithdrawalService();
