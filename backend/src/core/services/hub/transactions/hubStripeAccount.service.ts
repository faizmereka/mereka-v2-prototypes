import { DEFAULT_STRIPE_COUNTRY, getStripeCountryConfig } from '@core/constants/stripe-countries';
import { Hub } from '@core/models/Hub';
import { User } from '@core/models/User';
import { StripeServiceFactory } from '@core/services/shared/payments/stripeFactory.service';
import { getStripeRegion } from '@core/utils/stripe-region';
import type Stripe from 'stripe';

/**
 * Stripe verification error
 */
export interface StripeVerificationError {
  code: string;
  reason: string;
  requirement: string;
}

/**
 * Stripe Account Status response
 */
export interface StripeAccountStatus {
  hasAccount: boolean;
  stripeAccountId?: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  connectCompleted: boolean;
  /** Whether to show "My Earnings" tab for the current user */
  showMyEarnings: boolean;
  /** Hub's currency based on country (e.g., 'IDR', 'MYR') */
  hubCurrency?: string;
  /** Stripe Connect account's default currency */
  stripeAccountCurrency?: string;
  /** True if hub currency doesn't match Stripe account currency */
  currencyMismatch?: boolean;
  requirements: {
    currentlyDue: string[];
    eventuallyDue: string[];
    pastDue: string[];
    disabledReason?: string;
    /** Verification errors with human-readable reasons */
    errors: StripeVerificationError[];
  };
}

/**
 * Stripe Account Info (simplified from Stripe API response)
 */
export interface StripeAccountInfo {
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
 * Hub Stripe Account Service
 *
 * Manages Stripe Connect accounts for Hubs (business accounts).
 * Handles account creation, onboarding, and status retrieval.
 *
 * NOTE: No longer uses StripeAccount model - stores stripeAccountId directly in Hub model
 * and fetches status from Stripe API when needed.
 */
export class HubStripeAccountService {
  /**
   * Create Stripe Connect account for Hub
   *
   * Uses Stripe V1 API with recipient service agreement for Connected Accounts:
   * 1. Check if hub already has stripeAccountId - use it
   * 2. Otherwise create a new Connected Account (acct_xxx) on the regional platform
   *
   * This creates a payout account for the hub to receive earnings from bookings/contracts.
   * NOT related to Stripe Accounts v2 (which is for billing).
   *
   * Multi-region support:
   * - Malaysian hubs → Malaysia Stripe account
   * - All other hubs → Atlas/global Stripe account
   */
  async createHubStripeAccount(hubId: string, _userId: string): Promise<StripeAccountInfo> {
    // Get hub details
    const hub = await Hub.findById(hubId);
    if (!hub) {
      throw new Error('Hub not found');
    }

    // Determine region based on hub's location
    const region = getStripeRegion(hub.location?.country);
    const regionalStripeService = StripeServiceFactory.getService(region);

    // Check if hub already has a Stripe account (stored as acct_xxx)
    if (hub.stripeAccountId) {
      // Verify the account exists in Stripe
      try {
        const existingAccount = await regionalStripeService
          .getStripeInstance()
          .accounts.retrieve(hub.stripeAccountId);
        return this.mapStripeAccount(existingAccount);
      } catch (_error) {
        // Account doesn't exist in Stripe, continue to create/find one
        console.log(
          `[HubStripeAccountService] Account ${hub.stripeAccountId} not found in Stripe, will create/find one`,
        );
      }
    }

    // Get owner details for account creation
    const owner = await User.findById(hub.ownerId).lean();
    if (!owner) {
      throw new Error('Hub owner not found');
    }

    // Get country config from hub location
    const countryConfig = getStripeCountryConfig(hub.location?.country);

    // Determine service agreement type:
    // - 'full' for same-country accounts (MY platform → MY account)
    // - 'recipient' for cross-border payouts (Atlas/global platform → any country)
    // The 'recipient' ToS is NOT supported when platform and account are in the same country
    const serviceAgreement = region === 'malaysia' ? 'full' : 'recipient';

    // Use V1 API with appropriate service agreement
    // V2 API doesn't support service_agreement yet, so we use V1 with controller properties
    const accountParams = new URLSearchParams({
      country: countryConfig.isoCode,
      email: owner.email,
      'business_profile[name]': hub.name,
      // Only transfers capability allowed with recipient service agreement
      'capabilities[transfers][requested]': 'true',
      // Service agreement based on region (full for MY, recipient for cross-border)
      'tos_acceptance[service_agreement]': serviceAgreement,
      // Controller properties (replaces type: 'custom')
      'controller[stripe_dashboard][type]': 'none',
      'controller[fees][payer]': 'application',
      'controller[losses][payments]': 'application',
      'controller[requirement_collection]': 'application',
      // Manual payouts - platform controls when to pay out
      'settings[payouts][schedule][interval]': 'manual',
    });

    // Create Stripe Connect account using V1 API on the regional platform
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

    // Update hub with the new account ID AND region (hub owns the account, not user)
    await Hub.findByIdAndUpdate(hubId, {
      stripeAccountId: stripeAccount.id,
      stripeRegion: region,
    });

    console.log(
      `[HubStripeAccountService] Created new account ${stripeAccount.id} for hub ${hubId} on ${region} platform (service_agreement: ${serviceAgreement})`,
    );

    return this.mapStripeAccount(stripeAccount);
  }

  /**
   * Get Hub's Stripe account status
   * Fetches directly from Stripe API using the regional service
   *
   * @param hubId - The hub ID to get status for
   * @param userId - Optional user ID to determine showMyEarnings flag
   */
  async getAccountStatus(hubId: string, _userId?: string): Promise<StripeAccountStatus> {
    const hub = await Hub.findById(hubId)
      .select('stripeAccountId stripeRegion currency location')
      .lean();

    // Always show "My Earnings" tab so users can see/set up their expert payouts
    const showMyEarnings = true;

    // Derive hub currency from stored value or country ISO code
    const hubCurrency =
      hub?.currency ||
      (hub?.location?.country ? getStripeCountryConfig(hub.location.country)?.currency : undefined);

    if (!hub?.stripeAccountId) {
      return {
        hasAccount: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        connectCompleted: false,
        showMyEarnings,
        hubCurrency,
        requirements: {
          currentlyDue: [],
          eventuallyDue: [],
          pastDue: [],
          errors: [],
        },
      };
    }

    // Get regional Stripe service based on hub's stripeRegion or location
    const regionalStripeService = StripeServiceFactory.getServiceForHub(hub);

    // Fetch from Stripe API using regional service
    const account = await regionalStripeService
      .getStripeInstance()
      .accounts.retrieve(hub.stripeAccountId);

    // Determine if onboarding is complete
    const connectCompleted =
      account.charges_enabled &&
      account.payouts_enabled &&
      account.details_submitted &&
      (account.requirements?.currently_due?.length || 0) === 0;

    // Map Stripe errors to our format
    const errors: StripeVerificationError[] = (account.requirements?.errors || []).map(
      (err: { code: string; reason: string; requirement: string }) => ({
        code: err.code,
        reason: err.reason,
        requirement: err.requirement,
      }),
    );

    // Get Stripe account's default currency and check for mismatch
    const stripeAccountCurrency = account.default_currency?.toUpperCase();
    const currencyMismatch = !!(
      stripeAccountCurrency &&
      hubCurrency &&
      stripeAccountCurrency !== hubCurrency
    );

    return {
      hasAccount: true,
      stripeAccountId: account.id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      connectCompleted,
      showMyEarnings,
      hubCurrency,
      stripeAccountCurrency,
      currencyMismatch,
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
   * Returns a URL that redirects the hub owner to Stripe's hosted onboarding flow.
   */
  async createOnboardingLink(
    hubId: string,
    returnUrl: string,
    refreshUrl: string,
  ): Promise<string> {
    const hub = await Hub.findById(hubId).select('stripeAccountId stripeRegion location').lean();

    if (!hub?.stripeAccountId) {
      throw new Error('Hub does not have a Stripe account. Create one first.');
    }

    // Get regional Stripe service
    const regionalStripeService = StripeServiceFactory.getServiceForHub(hub);

    const accountLink = await regionalStripeService.getStripeInstance().accountLinks.create({
      account: hub.stripeAccountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });

    return accountLink.url;
  }

  /**
   * Generate Stripe Express dashboard link
   *
   * Returns a URL for the hub owner to access Stripe's Express dashboard.
   */
  async createDashboardLink(hubId: string): Promise<string> {
    const hub = await Hub.findById(hubId).select('stripeAccountId stripeRegion location').lean();

    if (!hub?.stripeAccountId) {
      throw new Error('Hub does not have a Stripe account');
    }

    // Get regional Stripe service
    const regionalStripeService = StripeServiceFactory.getServiceForHub(hub);

    // Create login link for Express dashboard
    const loginLink = await regionalStripeService
      .getStripeInstance()
      .accounts.createLoginLink(hub.stripeAccountId);

    return loginLink.url;
  }

  /**
   * Get Hub's Stripe account info
   * Fetches directly from Stripe API using regional service
   */
  async getHubStripeAccount(hubId: string): Promise<StripeAccountInfo | null> {
    const hub = await Hub.findById(hubId).select('stripeAccountId stripeRegion location').lean();

    if (!hub?.stripeAccountId) {
      return null;
    }

    try {
      // Get regional Stripe service
      const regionalStripeService = StripeServiceFactory.getServiceForHub(hub);
      const account = await regionalStripeService
        .getStripeInstance()
        .accounts.retrieve(hub.stripeAccountId);
      return this.mapStripeAccount(account);
    } catch (_error) {
      return null;
    }
  }

  /**
   * Get Hub's Stripe account ID (the acct_xxx)
   * Reads directly from Hub model
   */
  async getHubStripeAccountId(hubId: string): Promise<string | null> {
    const hub = await Hub.findById(hubId).select('stripeAccountId').lean();
    return hub?.stripeAccountId || null;
  }

  /**
   * Map Stripe Account to simplified response
   */
  private mapStripeAccount(account: Stripe.Account): StripeAccountInfo {
    return {
      id: account.id,
      email: account.email || '',
      country: account.country || DEFAULT_STRIPE_COUNTRY.isoCode,
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
export const hubStripeAccountService = new HubStripeAccountService();
