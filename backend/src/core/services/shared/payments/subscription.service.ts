import { Hub } from '@core/models/Hub';
import { type IPlan, Plan, PlanStatus } from '@core/models/Plan';
import { type ISubscription, Subscription, SubscriptionStatus } from '@core/models/Subscription';
import { User } from '@core/models/User';
import type Stripe from 'stripe';
import { type PlanService, planService } from './plan.service';
import { StripeService } from './stripe.service';

/**
 * Subscription Service - Handles subscription business logic
 * Uses standard Stripe Customers for billing (not Accounts v2)
 * Connected accounts (stripeAccountId) are only used for payouts in transaction service
 */
export class SubscriptionService {
  private stripeService: StripeService;
  private planService: PlanService;

  constructor() {
    this.stripeService = new StripeService();
    this.planService = planService;
  }

  /**
   * Create checkout session for subscription
   * Uses standard Stripe Customer for billing
   */
  async createCheckoutSession(
    userId: string,
    planCode: string,
    successUrl: string,
    cancelUrl: string,
    hubId?: string,
    promoCode?: string,
  ): Promise<{ checkoutUrl: string; sessionId: string }> {
    console.log(
      `[SubscriptionService] Starting createCheckoutSession for userId: ${userId}, planCode: ${planCode}, hubId: ${hubId}`,
    );

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      console.log(`[SubscriptionService] ❌ User not found: ${userId}`);
      throw new Error('User not found');
    }
    console.log(`[SubscriptionService] ✅ User found: ${user.email}`);

    // Get plan
    const plan = await Plan.findOne({ planCode, status: PlanStatus.ACTIVE });
    if (!plan) {
      console.log(`[SubscriptionService] ❌ Plan not found: ${planCode}`);
      throw new Error('Plan not found');
    }
    console.log(
      `[SubscriptionService] ✅ Plan found: ${plan.name}, stripePriceId: ${plan.stripePriceId}`,
    );

    // Get Stripe price ID
    const stripePriceId = this.planService.getStripePriceId(plan);
    console.log(`[SubscriptionService] Using stripePriceId: ${stripePriceId}`);

    // Get or create Stripe customer for billing
    console.log(`[SubscriptionService] Getting or creating Stripe customer...`);
    const customer = await this.stripeService.getOrCreateCustomer({
      _id: userId,
      email: user.email,
      name: user.name,
      phoneNumber: user.phoneNumber,
    });
    console.log(`[SubscriptionService] ✅ Stripe customer: ${customer.id}`);

    // Create checkout session using standard customer
    console.log(`[SubscriptionService] Creating checkout session with customer: ${customer.id}`);
    const session = await this.stripeService.createCheckoutSession({
      customerId: customer.id,
      priceId: stripePriceId,
      successUrl,
      cancelUrl,
      metadata: {
        userId,
        planCode,
        stripeCustomerId: customer.id,
        ...(hubId ? { hubId } : {}),
      },
      promotionCode: promoCode,
    });

    if (!session.url) {
      console.log(`[SubscriptionService] ❌ Failed to create checkout session - no URL returned`);
      throw new Error('Failed to create checkout session');
    }

    console.log(`[SubscriptionService] ✅ Checkout session created: ${session.id}`);
    console.log(`[SubscriptionService] Checkout URL: ${session.url}`);

    return {
      checkoutUrl: session.url,
      sessionId: session.id,
    };
  }

  /**
   * Verify checkout session and get subscription details
   * If subscription doesn't exist in DB (webhook didn't fire), create it from Stripe data
   * @param forceCreate - Skip polling and directly create subscription from Stripe if not found
   */
  async verifyCheckoutSession(
    sessionId: string,
    userId: string,
    forceCreate = false,
  ): Promise<ISubscription | null> {
    console.log(
      `[VerifyCheckout] Starting verification for session: ${sessionId}, user: ${userId}, forceCreate: ${forceCreate}`,
    );

    // Retrieve checkout session from Stripe
    const session = await this.stripeService.retrieveCheckoutSession(sessionId);
    console.log(`[VerifyCheckout] Stripe session status: ${session?.payment_status}`);

    if (!session || session.payment_status !== 'paid') {
      console.log(`[VerifyCheckout] Payment not completed`);
      throw new Error('Payment not completed');
    }

    const stripeSubscriptionId = session.subscription as string;
    console.log(`[VerifyCheckout] Stripe subscription ID: ${stripeSubscriptionId}`);

    // First, always check if subscription exists in DB
    const existingSubscription = await Subscription.findOne({
      stripeSubscriptionId,
      userId,
    });

    if (existingSubscription) {
      console.log(`[VerifyCheckout] ✅ Subscription found in DB: ${existingSubscription._id}`);
      return existingSubscription;
    }

    // If forceCreate is true, skip polling and create directly
    if (forceCreate) {
      console.log(`[VerifyCheckout] forceCreate=true, creating subscription from Stripe data...`);
    } else {
      // Poll for subscription (in case webhook is processing)
      const maxWaitTime = 6000; // 6 seconds (frontend will retry)
      const pollInterval = 2000; // 2 seconds
      const startTime = Date.now();
      let attempt = 0;

      while (Date.now() - startTime < maxWaitTime) {
        attempt++;
        console.log(`[VerifyCheckout] Checking DB for subscription (attempt ${attempt})...`);

        const subscription = await Subscription.findOne({
          stripeSubscriptionId,
          userId,
        });

        if (subscription) {
          console.log(
            `[VerifyCheckout] ✅ Subscription found in DB: ${subscription._id} (attempt ${attempt})`,
          );
          return subscription;
        }

        // Wait before next poll (unless we've exceeded max time)
        if (Date.now() - startTime + pollInterval < maxWaitTime) {
          console.log(
            `[VerifyCheckout] Not found, waiting ${pollInterval / 1000}s before retry...`,
          );
          await this.delay(pollInterval);
        }
      }

      console.log(`[VerifyCheckout] Subscription not found after polling, returning null`);
      return null; // Let frontend retry or force create
    }

    // Fallback: Create or update subscription from Stripe data
    if (!stripeSubscriptionId) {
      console.log(`[VerifyCheckout] No stripe subscription ID found`);
      return null;
    }

    const stripeSubscription = await this.stripeService.retrieveSubscription(stripeSubscriptionId);

    if (!stripeSubscription) {
      console.log(`[VerifyCheckout] Could not retrieve Stripe subscription`);
      return null;
    }

    // Get metadata from subscription or session
    const metadata = stripeSubscription.metadata || session.metadata || {};
    const planCode = metadata.planCode || 'scale';
    const hubId = metadata.hubId;

    // Check if subscription already exists for this hub (avoid duplicates)
    if (hubId) {
      const existingForHub = await Subscription.findOne({
        hubId,
        status: { $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] },
      });

      if (existingForHub) {
        console.log(
          `[VerifyCheckout] Active subscription already exists for hub: ${hubId}, updating instead of creating`,
        );
        // Update existing subscription with new Stripe data
        existingForHub.stripeSubscriptionId = stripeSubscription.id;
        existingForHub.stripeCustomerId = stripeSubscription.customer as string;
        existingForHub.planCode = planCode;
        existingForHub.status = SubscriptionStatus.ACTIVE;
        existingForHub.lastUpdatedBy = userId;
        await existingForHub.save();

        // Update hub with subscription ID
        await Hub.findByIdAndUpdate(hubId, {
          subscriptionId: stripeSubscription.id,
          lastUpdatedBy: userId,
        });

        return existingForHub;
      }
    }

    console.log(`[VerifyCheckout] Creating subscription with planCode: ${planCode}`);

    // Get price from first line item
    const firstItem = stripeSubscription.items.data[0];
    const price = firstItem?.price?.unit_amount || 0;

    // Get period dates - try multiple ways to access them
    // biome-ignore lint/suspicious/noExplicitAny: Stripe types don't include all properties
    const subAny = stripeSubscription as any;
    const currentPeriodStart =
      subAny.current_period_start ||
      subAny.currentPeriodStart ||
      firstItem?.current_period_start ||
      Math.floor(Date.now() / 1000);
    const currentPeriodEnd =
      subAny.current_period_end ||
      subAny.currentPeriodEnd ||
      firstItem?.current_period_end ||
      Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // Default 30 days

    console.log(
      `[VerifyCheckout] Period dates - start: ${currentPeriodStart}, end: ${currentPeriodEnd}`,
    );

    // Create subscription in database
    const subscription = await Subscription.create({
      userId,
      hubId: hubId || undefined,
      planCode,
      status: SubscriptionStatus.ACTIVE,
      billingCycle: 'monthly',
      price,
      currency: stripeSubscription.currency.toUpperCase(),
      currentPeriodStart: new Date((currentPeriodStart as number) * 1000),
      currentPeriodEnd: new Date((currentPeriodEnd as number) * 1000),
      nextBillingDate: new Date((currentPeriodEnd as number) * 1000),
      stripeCustomerId: stripeSubscription.customer as string,
      stripeSubscriptionId: stripeSubscription.id,
      createdBy: userId,
      lastUpdatedBy: userId,
    });

    console.log(`[VerifyCheckout] ✅ Subscription created: ${subscription._id}`);

    // Link hub to subscription if hubId provided
    if (hubId) {
      await Hub.findByIdAndUpdate(hubId, {
        subscriptionId: stripeSubscription.id,
        lastUpdatedBy: userId,
      });
      console.log(`[VerifyCheckout] Linked hub ${hubId} to subscription`);
    }

    return subscription;
  }

  /**
   * Helper to delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get user's subscriptions
   */
  async getUserSubscriptions(
    userId: string,
  ): Promise<Array<{ subscription: ISubscription; plan: IPlan | null }>> {
    const subscriptions = await Subscription.find({ userId }).sort({ createdAt: -1 });

    // Populate plan details
    const subscriptionsWithPlan = await Promise.all(
      subscriptions.map(async (sub) => {
        const plan = await Plan.findOne({ planCode: sub.planCode });
        return {
          subscription: sub,
          plan,
        };
      }),
    );

    return subscriptionsWithPlan;
  }

  /**
   * Handle subscription created webhook
   */
  async handleSubscriptionCreated(stripeSubscription: Stripe.Subscription): Promise<void> {
    console.log(`[handleSubscriptionCreated] Starting for subscription: ${stripeSubscription.id}`);
    console.log(
      `[handleSubscriptionCreated] Full metadata:`,
      JSON.stringify(stripeSubscription.metadata, null, 2),
    );

    const metadata = stripeSubscription.metadata;
    const userId = metadata.userId;
    const hubId = metadata.hubId;

    console.log(`[handleSubscriptionCreated] Extracted - userId: ${userId}, hubId: ${hubId}`);

    if (!userId) {
      console.log(`[handleSubscriptionCreated] ❌ User ID not found in metadata`);
      throw new Error('User ID not found in subscription metadata');
    }

    // Check if subscription already exists by stripeSubscriptionId
    const existingByStripeId = await Subscription.findOne({
      stripeSubscriptionId: stripeSubscription.id,
    });

    if (existingByStripeId) {
      console.log(
        `[handleSubscriptionCreated] Subscription already exists for stripeSubscriptionId: ${stripeSubscription.id}, skipping create`,
      );
      return;
    }

    // Check if subscription already exists for this hub (avoid duplicates)
    if (hubId) {
      const existingForHub = await Subscription.findOne({
        hubId,
        status: { $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] },
      });

      if (existingForHub) {
        console.log(
          `[handleSubscriptionCreated] Active subscription already exists for hub: ${hubId}, updating instead of creating`,
        );
        // Update existing subscription with new Stripe data
        existingForHub.stripeSubscriptionId = stripeSubscription.id;
        existingForHub.stripeCustomerId = stripeSubscription.customer as string;
        existingForHub.planCode = metadata.planCode || existingForHub.planCode;
        existingForHub.status = SubscriptionStatus.ACTIVE;
        existingForHub.lastUpdatedBy = userId;
        await existingForHub.save();
        console.log(
          `[handleSubscriptionCreated] ✅ Updated existing subscription: ${existingForHub._id}`,
        );

        // Update hub with subscription ID
        await Hub.findByIdAndUpdate(hubId, {
          subscriptionId: stripeSubscription.id,
          lastUpdatedBy: userId,
        });
        console.log(`[handleSubscriptionCreated] ✅ Updated hub with subscription ID`);
        return;
      }
    }

    // Get price from first line item
    const firstItem = stripeSubscription.items.data[0];
    if (!firstItem) {
      console.log(`[handleSubscriptionCreated] ❌ No line items found`);
      throw new Error('No line items found in subscription');
    }
    console.log(
      `[handleSubscriptionCreated] First item price: ${firstItem.price.unit_amount}, currency: ${stripeSubscription.currency}`,
    );

    // Get period dates from subscription items (Stripe API 2025-12-15.clover has dates in items, not root)
    // biome-ignore lint/suspicious/noExplicitAny: Stripe types don't include all properties on items
    const itemAny = firstItem as any;
    const currentPeriodStart = itemAny.current_period_start || Math.floor(Date.now() / 1000);
    const currentPeriodEnd =
      itemAny.current_period_end || Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
    console.log(`[handleSubscriptionCreated] Period: ${currentPeriodStart} - ${currentPeriodEnd}`);

    // Create subscription in database
    console.log(`[handleSubscriptionCreated] Creating subscription in DB...`);
    const newSub = await Subscription.create({
      userId,
      hubId: hubId || undefined,
      planCode: metadata.planCode,
      status: SubscriptionStatus.ACTIVE,
      billingCycle: 'monthly',
      price: firstItem.price.unit_amount || 0,
      currency: stripeSubscription.currency.toUpperCase(),
      currentPeriodStart: new Date(currentPeriodStart * 1000),
      currentPeriodEnd: new Date(currentPeriodEnd * 1000),
      nextBillingDate: new Date(currentPeriodEnd * 1000),
      stripeCustomerId: stripeSubscription.customer as string,
      stripeSubscriptionId: stripeSubscription.id,
      createdBy: userId,
      lastUpdatedBy: userId,
    });

    console.log(`[handleSubscriptionCreated] ✅ Subscription created in DB: ${newSub._id}`);

    // Link hub to subscription if hubId provided
    if (hubId) {
      await Hub.findByIdAndUpdate(hubId, {
        subscriptionId: stripeSubscription.id,
        lastUpdatedBy: userId,
      });
      console.log(`[handleSubscriptionCreated] ✅ Linked hub ${hubId} to subscription`);
    }
  }

  /**
   * Handle subscription updated webhook
   */
  async handleSubscriptionUpdated(stripeSubscription: Stripe.Subscription): Promise<void> {
    // Find subscription by Stripe ID
    const subscription = await Subscription.findOne({
      stripeSubscriptionId: stripeSubscription.id,
    });

    if (!subscription) {
      console.error('Subscription not found for update:', stripeSubscription.id);
      return;
    }

    // Get period dates from subscription items (Stripe API 2025-12-15.clover has dates in items, not root)
    const firstItem = stripeSubscription.items.data[0];
    // biome-ignore lint/suspicious/noExplicitAny: Stripe types don't include all properties on items
    const itemAny = firstItem as any;
    const currentPeriodStart = itemAny?.current_period_start || Math.floor(Date.now() / 1000);
    const currentPeriodEnd =
      itemAny?.current_period_end || Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

    // Update subscription
    subscription.status = this.mapStripeStatus(stripeSubscription.status);
    subscription.currentPeriodStart = new Date(currentPeriodStart * 1000);
    subscription.currentPeriodEnd = new Date(currentPeriodEnd * 1000);
    subscription.nextBillingDate = new Date(currentPeriodEnd * 1000);
    subscription.lastUpdatedBy = subscription.userId;

    await subscription.save();
  }

  /**
   * Handle checkout session completed webhook
   * This is the primary handler for creating subscriptions when using Account v2 with customer_account
   * (customer.subscription.created is NOT sent when using customer_account)
   */
  async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    console.log(`[handleCheckoutCompleted] Starting for session: ${session.id}`);
    console.log(
      `[handleCheckoutCompleted] Session metadata:`,
      JSON.stringify(session.metadata, null, 2),
    );
    console.log(`[handleCheckoutCompleted] Payment status: ${session.payment_status}`);
    console.log(`[handleCheckoutCompleted] Subscription ID: ${session.subscription}`);

    // Only process completed payments
    if (session.payment_status !== 'paid') {
      console.log(`[handleCheckoutCompleted] Payment not completed, skipping`);
      return;
    }

    const metadata = session.metadata || {};
    const userId = metadata.userId;
    const hubId = metadata.hubId;
    const planCode = metadata.planCode;
    const stripeSubscriptionId = session.subscription as string;

    console.log(
      `[handleCheckoutCompleted] Extracted - userId: ${userId}, hubId: ${hubId}, planCode: ${planCode}`,
    );

    if (!userId) {
      console.log(`[handleCheckoutCompleted] ❌ User ID not found in metadata`);
      throw new Error('User ID not found in checkout session metadata');
    }

    if (!stripeSubscriptionId) {
      console.log(`[handleCheckoutCompleted] ❌ Subscription ID not found in session`);
      throw new Error('Subscription ID not found in checkout session');
    }

    // Check if subscription already exists by stripeSubscriptionId (avoid duplicates)
    const existingByStripeId = await Subscription.findOne({
      stripeSubscriptionId,
    });

    if (existingByStripeId) {
      console.log(
        `[handleCheckoutCompleted] Subscription already exists for stripeSubscriptionId: ${stripeSubscriptionId}, skipping create`,
      );
      return;
    }

    // Retrieve full subscription details from Stripe
    console.log(
      `[handleCheckoutCompleted] Retrieving subscription from Stripe: ${stripeSubscriptionId}`,
    );
    const stripeSubscription = await this.stripeService.retrieveSubscription(stripeSubscriptionId);

    if (!stripeSubscription) {
      console.log(`[handleCheckoutCompleted] ❌ Could not retrieve subscription from Stripe`);
      throw new Error('Could not retrieve subscription from Stripe');
    }

    console.log(
      `[handleCheckoutCompleted] Stripe subscription status: ${stripeSubscription.status}`,
    );

    // Check if subscription already exists for this hub (avoid duplicates)
    if (hubId) {
      const existingForHub = await Subscription.findOne({
        hubId,
        status: { $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] },
      });

      if (existingForHub) {
        console.log(
          `[handleCheckoutCompleted] Active subscription already exists for hub: ${hubId}, updating instead of creating`,
        );
        // Update existing subscription with new Stripe data
        existingForHub.stripeSubscriptionId = stripeSubscriptionId;
        existingForHub.stripeCustomerId = stripeSubscription.customer as string;
        existingForHub.planCode = planCode || existingForHub.planCode;
        existingForHub.status = SubscriptionStatus.ACTIVE;
        existingForHub.lastUpdatedBy = userId;
        await existingForHub.save();
        console.log(
          `[handleCheckoutCompleted] ✅ Updated existing subscription: ${existingForHub._id}`,
        );

        // Update hub with subscription ID
        await Hub.findByIdAndUpdate(hubId, {
          subscriptionId: stripeSubscriptionId,
          lastUpdatedBy: userId,
        });
        console.log(`[handleCheckoutCompleted] ✅ Updated hub with subscription ID`);
        return;
      }
    }

    // Get price from first line item
    const firstItem = stripeSubscription.items.data[0];
    if (!firstItem) {
      console.log(`[handleCheckoutCompleted] ❌ No line items found`);
      throw new Error('No line items found in subscription');
    }
    console.log(
      `[handleCheckoutCompleted] First item price: ${firstItem.price.unit_amount}, currency: ${stripeSubscription.currency}`,
    );

    // Get period dates from subscription items (Stripe API 2025-12-15.clover has dates in items, not root)
    // biome-ignore lint/suspicious/noExplicitAny: Stripe types don't include all properties on items
    const itemAny = firstItem as any;
    const currentPeriodStart = itemAny.current_period_start || Math.floor(Date.now() / 1000);
    const currentPeriodEnd =
      itemAny.current_period_end || Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
    console.log(`[handleCheckoutCompleted] Period: ${currentPeriodStart} - ${currentPeriodEnd}`);

    // Create subscription in database
    console.log(`[handleCheckoutCompleted] Creating subscription in DB...`);
    const newSub = await Subscription.create({
      userId,
      hubId: hubId || undefined,
      planCode: planCode || 'scale',
      status: SubscriptionStatus.ACTIVE,
      billingCycle: 'monthly',
      price: firstItem.price.unit_amount || 0,
      currency: stripeSubscription.currency.toUpperCase(),
      currentPeriodStart: new Date(currentPeriodStart * 1000),
      currentPeriodEnd: new Date(currentPeriodEnd * 1000),
      nextBillingDate: new Date(currentPeriodEnd * 1000),
      stripeCustomerId: stripeSubscription.customer as string,
      stripeSubscriptionId: stripeSubscriptionId,
      createdBy: userId,
      lastUpdatedBy: userId,
    });

    console.log(`[handleCheckoutCompleted] ✅ Subscription created in DB: ${newSub._id}`);

    // Link hub to subscription if hubId provided
    if (hubId) {
      await Hub.findByIdAndUpdate(hubId, {
        subscriptionId: stripeSubscriptionId,
        lastUpdatedBy: userId,
      });
      console.log(`[handleCheckoutCompleted] ✅ Linked hub ${hubId} to subscription`);
    }
  }

  /**
   * Map Stripe subscription status to our status
   */
  private mapStripeStatus(stripeStatus: Stripe.Subscription.Status): SubscriptionStatus {
    switch (stripeStatus) {
      case 'active':
        return SubscriptionStatus.ACTIVE;
      case 'past_due':
        return SubscriptionStatus.PAST_DUE;
      case 'canceled':
      case 'unpaid':
        return SubscriptionStatus.CANCELLED;
      case 'incomplete_expired':
        return SubscriptionStatus.EXPIRED;
      case 'trialing':
        return SubscriptionStatus.TRIALING;
      default:
        return SubscriptionStatus.ACTIVE;
    }
  }
}
