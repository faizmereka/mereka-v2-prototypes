/**
 * Stripe Service Factory
 *
 * Factory for creating and managing regional Stripe service instances.
 * Implements singleton pattern per region to optimize resource usage.
 *
 * Multi-region Stripe account support:
 * - Malaysian hubs/users → Malaysia Stripe account
 * - All other hubs/users → Atlas/global Stripe account
 * - Subscriptions → Always on Atlas account
 */

import { env } from '@core/config/env';
import {
  getEntityRegion,
  getStripeRegion,
  isValidStripeRegion,
  type StripeRegion,
} from '@core/utils/stripe-region';
import Stripe from 'stripe';

/**
 * Stripe configuration for a specific region
 */
export interface StripeRegionConfig {
  secretKey: string;
  webhookSecret: string;
  publishableKey: string;
}

/**
 * Regional Stripe instance wrapper
 * Provides Stripe SDK instance with region-specific configuration
 */
export class RegionalStripeService {
  private stripe: Stripe;
  private config: StripeRegionConfig;
  readonly region: StripeRegion;

  constructor(region: StripeRegion, config: StripeRegionConfig) {
    this.region = region;
    this.config = config;
    this.stripe = new Stripe(config.secretKey, {
      apiVersion: '2025-12-15.clover',
      typescript: true,
    });
  }

  /**
   * Get the underlying Stripe SDK instance
   */
  getStripeInstance(): Stripe {
    return this.stripe;
  }

  /**
   * Get the webhook secret for this region
   */
  getWebhookSecret(): string {
    return this.config.webhookSecret;
  }

  /**
   * Get the publishable key for this region
   */
  getPublishableKey(): string {
    return this.config.publishableKey;
  }

  /**
   * Verify webhook signature for this region
   */
  verifyWebhookSignature(payload: string | Buffer, signature: string): Stripe.Event {
    return this.stripe.webhooks.constructEvent(payload, signature, this.config.webhookSecret);
  }

  /**
   * Get or create Stripe customer
   * Searches by email first, creates if not found
   */
  async getOrCreateCustomer(user: {
    _id: string;
    email: string;
    name: string;
    phoneNumber?: string;
  }): Promise<Stripe.Customer> {
    // Try to find existing customer by email
    const existingCustomers = await this.stripe.customers.list({
      email: user.email,
      limit: 1,
    });

    const existingCustomer = existingCustomers.data[0];
    if (existingCustomer) {
      return existingCustomer;
    }

    // Create new customer
    const customer = await this.stripe.customers.create({
      email: user.email,
      name: user.name,
      phone: user.phoneNumber,
      metadata: {
        userId: user._id.toString(),
        stripeRegion: this.region,
      },
    });

    return customer;
  }

  // ============================================
  // Payment Intent Methods (for milestone payments)
  // ============================================

  /**
   * Create PaymentIntent for immediate capture
   */
  async createPaymentIntent(params: {
    amount: number;
    currency: string;
    customerId: string;
    paymentMethodId: string;
    description: string;
    metadata: Record<string, string>;
  }): Promise<Stripe.PaymentIntent> {
    return this.stripe.paymentIntents.create({
      amount: params.amount,
      currency: params.currency.toLowerCase(),
      customer: params.customerId,
      payment_method: params.paymentMethodId,
      description: params.description,
      confirm: true,
      off_session: true,
      metadata: params.metadata,
    });
  }

  /**
   * Create escrow PaymentIntent with manual capture
   * Used for milestone-based contracts - funds are held until milestone approval
   */
  async createEscrowPaymentIntent(params: {
    amount: number; // Amount in cents
    currency: string;
    customerId: string;
    paymentMethodId: string;
    description: string;
    metadata: {
      contractId: string;
      milestoneId?: string;
      jobId?: string;
      expertId?: string;
      type?: string;
      stripeRegion?: string;
    };
    confirm?: boolean;
  }): Promise<Stripe.PaymentIntent> {
    return this.stripe.paymentIntents.create({
      amount: params.amount,
      currency: params.currency.toLowerCase(),
      customer: params.customerId,
      payment_method: params.paymentMethodId,
      description: params.description,
      capture_method: 'manual', // Hold funds until explicit capture
      confirm: params.confirm ?? true, // Auto-confirm by default
      off_session: true, // Allow charging without customer present
      metadata: params.metadata,
    });
  }

  /**
   * Retrieve PaymentIntent
   */
  async retrievePaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    return this.stripe.paymentIntents.retrieve(paymentIntentId);
  }

  /**
   * Capture PaymentIntent (release escrow funds)
   */
  async capturePaymentIntent(
    paymentIntentId: string,
    amount?: number,
  ): Promise<Stripe.PaymentIntent> {
    const captureParams: Stripe.PaymentIntentCaptureParams = {};
    if (amount) {
      captureParams.amount_to_capture = amount;
    }
    return this.stripe.paymentIntents.capture(paymentIntentId, captureParams);
  }

  /**
   * Refund a PaymentIntent
   */
  async refundPaymentIntent(paymentIntentId: string, amount?: number): Promise<Stripe.Refund> {
    const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
    const chargeId =
      typeof paymentIntent.latest_charge === 'string'
        ? paymentIntent.latest_charge
        : paymentIntent.latest_charge?.id;

    if (!chargeId) {
      throw new Error('No charge found for this payment intent');
    }

    const refundParams: Stripe.RefundCreateParams = {
      charge: chargeId,
    };
    if (amount) {
      refundParams.amount = amount;
    }
    return this.stripe.refunds.create(refundParams);
  }

  // ============================================
  // Stripe Connect Methods (for expert transfers)
  // ============================================

  /**
   * Retrieve Stripe Connect account status
   */
  async retrieveAccount(accountId: string): Promise<Stripe.Account> {
    return this.stripe.accounts.retrieve(accountId);
  }

  /**
   * Retrieve a charge by ID
   */
  async retrieveCharge(chargeId: string): Promise<Stripe.Charge> {
    return this.stripe.charges.retrieve(chargeId);
  }

  /**
   * Retrieve a balance transaction by ID
   */
  async retrieveBalanceTransaction(
    balanceTransactionId: string,
  ): Promise<Stripe.BalanceTransaction> {
    return this.stripe.balanceTransactions.retrieve(balanceTransactionId);
  }

  /**
   * Create transfer from platform to Connect account
   */
  async createTransfer(params: {
    amount: number;
    currency: string;
    destination: string;
    transferGroup?: string;
    sourceTransaction?: string;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Transfer> {
    const transferParams: Stripe.TransferCreateParams = {
      amount: params.amount,
      currency: params.currency.toLowerCase(),
      destination: params.destination,
    };

    if (params.transferGroup) {
      transferParams.transfer_group = params.transferGroup;
    }
    if (params.sourceTransaction) {
      transferParams.source_transaction = params.sourceTransaction;
    }
    if (params.metadata) {
      transferParams.metadata = params.metadata;
    }

    return this.stripe.transfers.create(transferParams);
  }
}

/**
 * Stripe Service Factory
 *
 * Manages regional Stripe instances with singleton pattern.
 * Use this factory to get the correct Stripe instance for a given entity.
 */
export class StripeServiceFactory {
  private static instances: Map<StripeRegion, RegionalStripeService> = new Map();

  /**
   * Get region configuration from environment
   */
  private static getRegionConfig(region: StripeRegion): StripeRegionConfig {
    if (region === 'malaysia') {
      return {
        secretKey: env.STRIPE_MY_SECRET_KEY,
        webhookSecret: env.STRIPE_MY_WEBHOOK_SECRET,
        publishableKey: env.STRIPE_MY_PUBLISHABLE_KEY,
      };
    }

    // Atlas/default region
    return {
      secretKey: env.STRIPE_ATLAS_SECRET_KEY,
      webhookSecret: env.STRIPE_ATLAS_WEBHOOK_SECRET,
      publishableKey: env.STRIPE_ATLAS_PUBLISHABLE_KEY,
    };
  }

  /**
   * Get Stripe service for a specific region
   * Returns cached instance or creates new one
   *
   * @param region - The Stripe region
   * @returns Regional Stripe service instance
   */
  static getService(region: StripeRegion): RegionalStripeService {
    if (!StripeServiceFactory.instances.has(region)) {
      const config = StripeServiceFactory.getRegionConfig(region);
      StripeServiceFactory.instances.set(region, new RegionalStripeService(region, config));
    }
    return StripeServiceFactory.instances.get(region)!;
  }

  /**
   * Get Stripe service for a hub
   * Uses hub's stripeRegion or determines from location
   *
   * @param hub - Hub entity with optional stripeRegion and location
   * @returns Regional Stripe service instance
   */
  static getServiceForHub(hub: {
    stripeRegion?: string | null;
    location?: { country?: string | null } | null;
  }): RegionalStripeService {
    const region = getEntityRegion(hub);
    return StripeServiceFactory.getService(region);
  }

  /**
   * Get Stripe service for a user
   * Uses user's stripeRegion, their hub's region, or determines from location
   *
   * @param user - User entity with optional stripeRegion and location
   * @param hub - Optional hub entity (for hub members)
   * @returns Regional Stripe service instance
   */
  static getServiceForUser(
    user: {
      stripeRegion?: string | null;
      location?: { country?: string | null } | null;
    },
    hub?: {
      stripeRegion?: string | null;
      location?: { country?: string | null } | null;
    } | null,
  ): RegionalStripeService {
    // Priority: User's stored region > Hub's region > User's location
    if (user.stripeRegion && isValidStripeRegion(user.stripeRegion)) {
      return StripeServiceFactory.getService(user.stripeRegion);
    }

    if (hub) {
      const hubRegion = getEntityRegion(hub);
      return StripeServiceFactory.getService(hubRegion);
    }

    const region = getStripeRegion(user.location?.country);
    return StripeServiceFactory.getService(region);
  }

  /**
   * Get Stripe service for expert payments
   * Uses expert's hub region or their own region if independent
   *
   * @param expert - Expert user entity
   * @param expertHub - Expert's hub entity (optional if independent)
   * @returns Regional Stripe service instance
   */
  static getServiceForExpert(
    expert: {
      stripeRegion?: string | null;
      location?: { country?: string | null } | null;
    },
    expertHub?: {
      stripeRegion?: string | null;
      location?: { country?: string | null } | null;
    } | null,
  ): RegionalStripeService {
    // Expert payments go to their hub's platform, or their own if independent
    if (expertHub) {
      return StripeServiceFactory.getServiceForHub(expertHub);
    }

    return StripeServiceFactory.getServiceForUser(expert);
  }

  /**
   * Get publishable key for a region
   * For frontend to initialize Stripe.js with correct key
   *
   * @param region - The Stripe region
   * @returns Publishable key string
   */
  static getPublishableKey(region: StripeRegion): string {
    return StripeServiceFactory.getRegionConfig(region).publishableKey;
  }

  /**
   * Get secret key for a region
   * For direct API calls that don't use the service
   *
   * @param region - The Stripe region
   * @returns Secret key string
   */
  static getSecretKey(region: StripeRegion): string {
    return StripeServiceFactory.getRegionConfig(region).secretKey;
  }

  /**
   * Get webhook secret for a region
   * For webhook verification
   *
   * @param region - The Stripe region
   * @returns Webhook secret string
   */
  static getWebhookSecret(region: StripeRegion): string {
    return StripeServiceFactory.getRegionConfig(region).webhookSecret;
  }

  /**
   * Get Stripe service for subscriptions
   * Subscriptions always use Atlas account
   *
   * @returns Atlas region Stripe service
   */
  static getSubscriptionService(): RegionalStripeService {
    return StripeServiceFactory.getService('atlas');
  }

  /**
   * Get region for an entity
   * Utility method to determine which region an entity should use
   *
   * @param entity - Entity with optional stripeRegion and location
   * @returns Stripe region
   */
  static getRegion(entity: {
    stripeRegion?: string | null;
    location?: { country?: string | null } | null;
  }): StripeRegion {
    return getEntityRegion(entity);
  }

  /**
   * Get region from country string
   *
   * @param country - Country name or ISO code
   * @returns Stripe region
   */
  static getRegionFromCountry(country?: string | null): StripeRegion {
    return getStripeRegion(country);
  }

  /**
   * Clear cached instances (for testing)
   */
  static clearInstances(): void {
    StripeServiceFactory.instances.clear();
  }
}

// Re-export types for convenience
export type { StripeRegion };
