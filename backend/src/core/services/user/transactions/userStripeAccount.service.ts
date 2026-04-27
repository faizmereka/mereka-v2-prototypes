import { Hub } from '@core/models/Hub';
import { User } from '@core/models/User';
import {
  type StripeRegion,
  StripeServiceFactory,
} from '@core/services/shared/payments/stripeFactory.service';
import { getStripeCountryCode, getStripeRegion } from '@core/utils/stripe-region';
import type Stripe from 'stripe';

/**
 * Stripe verification error
 */
export interface UserStripeVerificationError {
  code: string;
  reason: string;
  requirement: string;
}

/**
 * Stripe Account Status response
 */
export interface UserStripeAccountStatus {
  hasAccount: boolean;
  stripeAccountId?: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  connectCompleted: boolean;
  /**
   * Whether to show "My Earnings" section in the UI.
   * False if user owns a hub with the same stripeAccountId (unified account).
   */
  showMyEarnings: boolean;
  requirements: {
    currentlyDue: string[];
    eventuallyDue: string[];
    pastDue: string[];
    disabledReason?: string;
    /** Verification errors with human-readable reasons */
    errors: UserStripeVerificationError[];
  };
}

/**
 * Stripe Account Info (simplified from Stripe API response)
 */
export interface UserStripeAccountInfo {
  id: string;
  email: string;
  country: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  requirements: {
    currentlyDue: string[];
    eventuallyDue: string[];
    pastDue: string[];
    disabledReason?: string;
  };
}

/**
 * User Stripe Account Service
 *
 * Manages Stripe Connect accounts for Users (expert/individual accounts).
 * Handles account creation, onboarding, and status retrieval.
 *
 * NOTE: No longer uses StripeAccount model - stores stripeAccountId directly in User model
 * and fetches status from Stripe API when needed.
 */
export class UserStripeAccountService {
  /**
   * Determine Stripe region for a user
   *
   * Priority:
   * 1. User's stored stripeRegion
   * 2. User's hub's region (if user belongs to a hub)
   * 3. User's own location
   * 4. Default to atlas
   */
  private async determineUserRegion(
    user: {
      stripeRegion?: string | null;
      location?: { country?: string | null } | null;
    },
    userHubId?: string | null,
  ): Promise<StripeRegion> {
    // Use stored region if valid
    if (user.stripeRegion === 'malaysia' || user.stripeRegion === 'atlas') {
      return user.stripeRegion;
    }

    // Check if user belongs to a hub
    if (userHubId) {
      const hub = await Hub.findById(userHubId).select('stripeRegion location').lean();
      if (hub) {
        if (hub.stripeRegion === 'malaysia' || hub.stripeRegion === 'atlas') {
          return hub.stripeRegion;
        }
        return getStripeRegion(hub.location?.country);
      }
    }

    // Fall back to user's own location
    return getStripeRegion(user.location?.country);
  }

  /**
   * Create Stripe Connect account for User (Expert)
   *
   * Creates a Custom Connect account for the user's expert payouts.
   * The account is owned by the user for receiving job/milestone payments.
   * User.stripeAccountId stores the actual Stripe account ID (acct_xxx) directly.
   *
   * Multi-region support:
   * - If user belongs to a Malaysian hub → Malaysia Stripe account
   * - If independent user from Malaysia → Malaysia Stripe account
   * - All others → Atlas/global Stripe account
   */
  async createUserStripeAccount(userId: string): Promise<UserStripeAccountInfo> {
    // Get user details
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Find if user belongs to any hub (via membership)
    const userHub = await Hub.findOne({ ownerId: userId }).select('stripeRegion location').lean();

    // Determine region based on hub membership or user's location
    const region = await this.determineUserRegion(user, userHub?._id?.toString());
    const regionalStripeService = StripeServiceFactory.getService(region);

    // Check if user already has a Stripe account (stored as acct_xxx)
    if (user.stripeAccountId) {
      // Verify the account exists in Stripe
      try {
        const existingAccount = await regionalStripeService
          .getStripeInstance()
          .accounts.retrieve(user.stripeAccountId);
        return this.mapStripeAccount(existingAccount);
      } catch (_error) {
        // Account doesn't exist in Stripe, create new one
        console.log(
          `[UserStripeAccountService] Account ${user.stripeAccountId} not found in Stripe, creating new one`,
        );
      }
    }

    // Determine country code for account creation
    const countryCode =
      getStripeCountryCode(user.location?.country) || (region === 'malaysia' ? 'MY' : 'SG');

    // Create Stripe Connect account with recipient service agreement
    // Using V1 API with URLSearchParams for service_agreement support (V2 doesn't support it yet)
    // This enables transfers to work globally (MY, ID, TH, etc.)
    const accountParams = new URLSearchParams({
      country: countryCode,
      email: user.email || '',
      business_type: 'individual',
      // Only transfers capability allowed with recipient service agreement
      'capabilities[transfers][requested]': 'true',
      // CRITICAL: recipient service agreement for global transfers (MY, ID, TH, etc.)
      'tos_acceptance[service_agreement]': 'recipient',
      // Controller properties (replaces type: 'custom')
      'controller[stripe_dashboard][type]': 'none',
      'controller[fees][payer]': 'application',
      'controller[losses][payments]': 'application',
      'controller[requirement_collection]': 'application',
      // Metadata
      'metadata[userId]': userId,
      'metadata[accountType]': 'user',
      'metadata[stripeRegion]': region,
      // Payout settings
      'settings[payouts][schedule][interval]': 'manual',
    });

    // Create account on regional platform
    const secretKey = StripeServiceFactory.getSecretKey(region);
    const response = await fetch('https://api.stripe.com/v1/accounts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: accountParams.toString(),
    });

    if (!response.ok) {
      const errorData = (await response.json()) as { error?: { message?: string } };
      throw new Error(errorData.error?.message || 'Failed to create Stripe account');
    }

    const stripeAccount = (await response.json()) as Stripe.Account;

    console.log(
      `[UserStripeAccountService] Created new account ${stripeAccount.id} for user ${userId} on ${region} platform (service_agreement: recipient)`,
    );

    // Update user with Stripe account ID AND region
    await User.findByIdAndUpdate(userId, {
      stripeAccountId: stripeAccount.id,
      stripeRegion: region,
    });

    return this.mapStripeAccount(stripeAccount);
  }

  /**
   * Get User's Stripe account status
   * Fetches directly from Stripe API using regional service
   */
  async getAccountStatus(userId: string): Promise<UserStripeAccountStatus> {
    const user = await User.findById(userId).select('stripeAccountId stripeRegion location').lean();

    // Check if user owns a hub (for determining showMyEarnings)
    const ownedHub = await Hub.findOne({ ownerId: userId })
      .select('stripeAccountId stripeRegion location')
      .lean();

    if (!user?.stripeAccountId) {
      return {
        hasAccount: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        connectCompleted: false,
        showMyEarnings: !ownedHub, // Hide if user owns a hub (they should use Hub Earnings)
        requirements: {
          currentlyDue: [],
          eventuallyDue: [],
          pastDue: [],
          errors: [],
        },
      };
    }

    // Get regional Stripe service based on user's stripeRegion or location
    const regionalStripeService = StripeServiceFactory.getServiceForUser(user, ownedHub);

    // Fetch from Stripe API using regional service
    const account = await regionalStripeService
      .getStripeInstance()
      .accounts.retrieve(user.stripeAccountId);

    // Determine if onboarding is complete
    const connectCompleted =
      account.charges_enabled &&
      account.payouts_enabled &&
      account.details_submitted &&
      (account.requirements?.currently_due?.length || 0) === 0;

    // Hide "My Earnings" if user owns a hub with the same stripeAccountId (unified account)
    // User should use Hub Earnings instead
    const showMyEarnings = !ownedHub || ownedHub.stripeAccountId !== user.stripeAccountId;

    // Map Stripe errors to our format
    const errors: UserStripeVerificationError[] = (account.requirements?.errors || []).map(
      (err: { code: string; reason: string; requirement: string }) => ({
        code: err.code,
        reason: err.reason,
        requirement: err.requirement,
      }),
    );

    return {
      hasAccount: true,
      stripeAccountId: account.id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      connectCompleted,
      showMyEarnings,
      requirements: {
        currentlyDue: account.requirements?.currently_due || [],
        eventuallyDue: account.requirements?.eventually_due || [],
        pastDue: account.requirements?.past_due || [],
        disabledReason: account.requirements?.disabled_reason || undefined,
        errors,
      },
    };
  }

  /**
   * Generate onboarding link for Stripe Connect
   *
   * Returns a URL that redirects the user to Stripe's hosted onboarding flow.
   */
  async createOnboardingLink(
    userId: string,
    returnUrl: string,
    refreshUrl: string,
  ): Promise<string> {
    const user = await User.findById(userId).select('stripeAccountId stripeRegion location').lean();

    if (!user?.stripeAccountId) {
      throw new Error('User does not have a Stripe account. Create one first.');
    }

    // Get regional Stripe service
    const ownedHub = await Hub.findOne({ ownerId: userId }).select('stripeRegion location').lean();
    const regionalStripeService = StripeServiceFactory.getServiceForUser(user, ownedHub);

    const accountLink = await regionalStripeService.getStripeInstance().accountLinks.create({
      account: user.stripeAccountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });

    return accountLink.url;
  }

  /**
   * Generate Stripe Express dashboard link
   *
   * Returns a URL for the user to access Stripe's Express dashboard.
   */
  async createDashboardLink(userId: string): Promise<string> {
    const user = await User.findById(userId).select('stripeAccountId stripeRegion location').lean();

    if (!user?.stripeAccountId) {
      throw new Error('User does not have a Stripe account');
    }

    // Get regional Stripe service
    const ownedHub = await Hub.findOne({ ownerId: userId }).select('stripeRegion location').lean();
    const regionalStripeService = StripeServiceFactory.getServiceForUser(user, ownedHub);

    // Create login link for Express dashboard
    const loginLink = await regionalStripeService
      .getStripeInstance()
      .accounts.createLoginLink(user.stripeAccountId);

    return loginLink.url;
  }

  /**
   * Get User's Stripe account info
   * Fetches directly from Stripe API using regional service
   */
  async getUserStripeAccount(userId: string): Promise<UserStripeAccountInfo | null> {
    const user = await User.findById(userId).select('stripeAccountId stripeRegion location').lean();

    if (!user?.stripeAccountId) {
      return null;
    }

    try {
      // Get regional Stripe service
      const ownedHub = await Hub.findOne({ ownerId: userId })
        .select('stripeRegion location')
        .lean();
      const regionalStripeService = StripeServiceFactory.getServiceForUser(user, ownedHub);

      const account = await regionalStripeService
        .getStripeInstance()
        .accounts.retrieve(user.stripeAccountId);
      return this.mapStripeAccount(account);
    } catch (_error) {
      return null;
    }
  }

  /**
   * Get User's Stripe account ID (the acct_xxx)
   * Reads directly from User model
   */
  async getUserStripeAccountId(userId: string): Promise<string | null> {
    const user = await User.findById(userId).select('stripeAccountId').lean();
    return user?.stripeAccountId || null;
  }

  /**
   * Map Stripe Account to simplified response
   */
  private mapStripeAccount(account: Stripe.Account): UserStripeAccountInfo {
    return {
      id: account.id,
      email: account.email || '',
      country: account.country || 'MY',
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      requirements: {
        currentlyDue: account.requirements?.currently_due || [],
        eventuallyDue: account.requirements?.eventually_due || [],
        pastDue: account.requirements?.past_due || [],
        disabledReason: account.requirements?.disabled_reason || undefined,
      },
    };
  }
}

// Export singleton instance
export const userStripeAccountService = new UserStripeAccountService();
