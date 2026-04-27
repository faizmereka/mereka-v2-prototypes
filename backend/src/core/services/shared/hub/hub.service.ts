import { Hub } from '@core/models/Hub';
import { User } from '@core/models/User';
import { StripeServiceFactory } from '@core/services/shared/payments/stripeFactory.service';

/**
 * Hub owner info for transfer processing
 */
export interface HubOwnerInfo {
  hubId: string;
  ownerId: string;
  subscriptionId?: string;
}

/**
 * Stripe account info for transfers
 */
export interface StripeAccountInfo {
  stripeAccountId: string;
  payoutsEnabled: boolean;
  chargesEnabled: boolean;
  currency: string;
}

/**
 * Hub Service
 * Handles hub-related operations
 */
export class HubService {
  /**
   * Get hub by ID with owner information
   */
  async getHubById(hubId: string): Promise<HubOwnerInfo | null> {
    const hub = await Hub.findById(hubId).select('_id ownerId subscriptionId').lean();

    if (!hub) {
      return null;
    }

    return {
      hubId: hub._id.toString(),
      ownerId: hub.ownerId,
      subscriptionId: hub.subscriptionId,
    };
  }

  /**
   * Get hub owner's Stripe account
   * Used by transferStripeBalance cron job
   */
  async getOwnerStripeAccount(ownerId: string, hubId?: string): Promise<StripeAccountInfo | null> {
    const user = await User.findById(ownerId)
      .select('stripeAccountId stripeRegion location')
      .lean();

    if (!user?.stripeAccountId) {
      return null;
    }

    // Get hub info if provided for regional service determination
    const hub = hubId ? await Hub.findById(hubId).select('stripeRegion location').lean() : null;

    // Use regional Stripe service based on user's/hub's region
    const regionalStripeService = StripeServiceFactory.getServiceForUser(user, hub);

    // Fetch current status from Stripe API
    try {
      const account = await regionalStripeService.retrieveAccount(user.stripeAccountId);
      return {
        stripeAccountId: account.id,
        payoutsEnabled: account.payouts_enabled,
        chargesEnabled: account.charges_enabled,
        currency: account.default_currency?.toUpperCase() || 'MYR',
      };
    } catch {
      return null;
    }
  }

  /**
   * Get hub with owner's stripe account in one call
   * Used by transferStripeBalance cron job
   */
  async getHubWithOwnerStripeAccount(
    hubId: string,
  ): Promise<{ hub: HubOwnerInfo; stripeAccount: StripeAccountInfo } | null> {
    const hub = await this.getHubById(hubId);
    if (!hub) {
      return null;
    }

    const stripeAccount = await this.getOwnerStripeAccount(hub.ownerId);
    if (!stripeAccount) {
      return null;
    }

    return { hub, stripeAccount };
  }
}

export const hubService = new HubService();
