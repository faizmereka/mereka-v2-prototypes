import { Hub } from '@core/models/Hub';
import { HubMember } from '@core/models/HubMember';
import { Plan, PlanStatus } from '@core/models/Plan';
import { Subscription, SubscriptionStatus } from '@core/models/Subscription';
import { User } from '@core/models/User';
import type { HubChangePlanInput } from '@core/schemas/hub/settings';
import { stripeService } from '@core/services/shared/payments/stripe.service';
import { communicationTriggerService } from '@services/communications';
import type Stripe from 'stripe';

// ============================================================================
// Types
// ============================================================================

export interface PlanInfo {
  planCode: string;
  name: string;
  tagline: string;
  price: number;
  currency: string;
  features: string[];
  isCurrent: boolean;
}

export interface SubscriptionInfo {
  id: string;
  status: SubscriptionStatus;
  currentPlan: PlanInfo;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  nextBillingDate: Date;
  cancelAtPeriodEnd: boolean;
}

export interface PaymentMethodInfo {
  id: string;
  type: 'card' | 'bank';
  brand: string;
  last4: string;
  expMonth?: number;
  expYear?: number;
  isDefault: boolean;
}

export interface InvoiceInfo {
  id: string;
  number: string | null;
  description: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'overdue' | 'draft' | 'void';
  date: string;
  dueDate: string | null;
  pdfUrl: string | null;
  hostedInvoiceUrl: string | null;
}

export interface UpcomingPaymentInfo {
  amount: number;
  currency: string;
  dueDate: string;
  description: string;
}

export interface TrialInfo {
  isTrialing: boolean;
  trialStart: string | null;
  trialEnd: string | null;
  daysRemaining: number;
}

export interface SubscriptionSettingsData {
  subscription: SubscriptionInfo | null;
  availablePlans: PlanInfo[];
}

export interface PlanChangePreview {
  currentPlan: {
    code: string;
    name: string;
    price: number;
  };
  newPlan: {
    code: string;
    name: string;
    price: number;
  };
  proration: {
    amount: number;
    description: string;
  };
  nextBillingAmount: number;
  effectiveDate: Date;
}

export interface PlanChangeResult {
  success: boolean;
  subscription: SubscriptionInfo;
  message: string;
}

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Verify user has access to hub
 */
async function verifyHubAccess(userId: string, hubId: string): Promise<void> {
  // Check if user is hub owner
  const hub = await Hub.findOne({ _id: hubId, ownerId: userId }).lean();
  if (hub) return;

  // Check if user is a member with appropriate permissions
  const membership = await HubMember.findOne({
    hubId,
    userId,
    status: 'active',
  }).lean();

  if (!membership) {
    throw new Error('Hub not found or access denied');
  }
}

/**
 * Get hub subscription settings data
 */
export async function getHubSubscriptionSettings(
  userId: string,
  hubId: string,
): Promise<SubscriptionSettingsData> {
  await verifyHubAccess(userId, hubId);

  // Get all active plans
  const plans = await Plan.find({ status: PlanStatus.ACTIVE }).sort({ sortOrder: 1 }).lean();

  // Get hub's subscription
  const subscription = await Subscription.findOne({
    hubId,
    status: {
      $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING, SubscriptionStatus.PAST_DUE],
    },
  }).lean();

  // Map plans to PlanInfo
  const availablePlans: PlanInfo[] = plans.map((plan) => ({
    planCode: plan.planCode,
    name: plan.name,
    tagline: plan.tagline,
    price: plan.price,
    currency: plan.currency,
    features: plan.features,
    isCurrent: subscription?.planCode === plan.planCode,
  }));

  // Build subscription info if exists
  let subscriptionInfo: SubscriptionInfo | null = null;
  if (subscription) {
    const currentPlan = plans.find((p) => p.planCode === subscription.planCode);

    // Get Stripe subscription to check cancel_at_period_end
    let cancelAtPeriodEnd = false;
    try {
      const stripeSubscription = await stripeService.retrieveSubscription(
        subscription.stripeSubscriptionId,
      );
      cancelAtPeriodEnd = stripeSubscription.cancel_at_period_end;
    } catch {
      // If Stripe call fails, continue with default
    }

    subscriptionInfo = {
      id: subscription._id.toString(),
      status: subscription.status,
      currentPlan: {
        planCode: currentPlan?.planCode || subscription.planCode,
        name: currentPlan?.name || subscription.planCode,
        tagline: currentPlan?.tagline || '',
        price: currentPlan?.price || subscription.price,
        currency: currentPlan?.currency || subscription.currency,
        features: currentPlan?.features || [],
        isCurrent: true,
      },
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      nextBillingDate: subscription.nextBillingDate,
      cancelAtPeriodEnd,
    };
  }

  return {
    subscription: subscriptionInfo,
    availablePlans,
  };
}

/**
 * Preview plan change (get proration details)
 */
export async function previewPlanChange(
  userId: string,
  hubId: string,
  newPlanCode: string,
): Promise<PlanChangePreview> {
  await verifyHubAccess(userId, hubId);

  // Get current subscription
  const subscription = await Subscription.findOne({
    hubId,
    status: { $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] },
  }).lean();

  if (!subscription) {
    throw new Error('No active subscription found');
  }

  if (subscription.planCode === newPlanCode) {
    throw new Error('Already on this plan');
  }

  // Get plan details
  const [currentPlan, newPlan] = await Promise.all([
    Plan.findOne({ planCode: subscription.planCode }).lean(),
    Plan.findOne({ planCode: newPlanCode, status: PlanStatus.ACTIVE }).lean(),
  ]);

  if (!newPlan) {
    throw new Error('Plan not found');
  }

  // Get proration preview from Stripe
  const preview = await stripeService.previewPlanChange({
    subscriptionId: subscription.stripeSubscriptionId,
    newPriceId: newPlan.stripePriceId,
  });

  // Calculate proration amount (filter by checking if line is a proration)
  const prorationAmount = preview.lines.data
    .filter((line) => (line as { proration?: boolean }).proration === true)
    .reduce((sum, line) => sum + line.amount, 0);

  return {
    currentPlan: {
      code: subscription.planCode,
      name: currentPlan?.name || subscription.planCode,
      price: currentPlan?.price || subscription.price,
    },
    newPlan: {
      code: newPlan.planCode,
      name: newPlan.name,
      price: newPlan.price,
    },
    proration: {
      amount: prorationAmount,
      description:
        prorationAmount > 0
          ? 'Amount to pay now (prorated)'
          : prorationAmount < 0
            ? 'Credit applied to next bill'
            : 'No proration',
    },
    nextBillingAmount: preview.total,
    effectiveDate: new Date(),
  };
}

/**
 * Change subscription plan
 */
export async function changePlan(
  userId: string,
  hubId: string,
  input: HubChangePlanInput,
): Promise<PlanChangeResult> {
  await verifyHubAccess(userId, hubId);

  const { newPlanCode } = input;

  // Get current subscription
  const subscription = await Subscription.findOne({
    hubId,
    status: { $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] },
  });

  if (!subscription) {
    throw new Error('No active subscription found');
  }

  if (subscription.planCode === newPlanCode) {
    throw new Error('Already on this plan');
  }

  // Get new plan details
  const newPlan = await Plan.findOne({
    planCode: newPlanCode,
    status: PlanStatus.ACTIVE,
  }).lean();

  if (!newPlan) {
    throw new Error('Plan not found');
  }

  // Change plan in Stripe
  const updatedStripeSubscription = await stripeService.changeSubscriptionPlan({
    subscriptionId: subscription.stripeSubscriptionId,
    newPriceId: newPlan.stripePriceId,
    prorationBehavior: 'create_prorations',
  });

  // Update local subscription
  subscription.planCode = newPlanCode;
  subscription.price = newPlan.price;
  subscription.lastUpdatedBy = userId;

  // Update billing dates from Stripe (Stripe types don't expose these directly)
  const stripeSub = updatedStripeSubscription as unknown as {
    current_period_start: number;
    current_period_end: number;
    cancel_at_period_end: boolean;
  };
  subscription.currentPeriodStart = new Date(stripeSub.current_period_start * 1000);
  subscription.currentPeriodEnd = new Date(stripeSub.current_period_end * 1000);
  subscription.nextBillingDate = new Date(stripeSub.current_period_end * 1000);

  await subscription.save();

  // Build response
  const subscriptionInfo: SubscriptionInfo = {
    id: (subscription._id as { toString(): string }).toString(),
    status: subscription.status,
    currentPlan: {
      planCode: newPlan.planCode,
      name: newPlan.name,
      tagline: newPlan.tagline,
      price: newPlan.price,
      currency: newPlan.currency,
      features: newPlan.features,
      isCurrent: true,
    },
    currentPeriodStart: subscription.currentPeriodStart,
    currentPeriodEnd: subscription.currentPeriodEnd,
    nextBillingDate: subscription.nextBillingDate,
    cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
  };

  const isUpgrade = newPlan.price > subscription.price;

  return {
    success: true,
    subscription: subscriptionInfo,
    message: isUpgrade
      ? `Successfully upgraded to ${newPlan.name}!`
      : `Successfully switched to ${newPlan.name}. Changes take effect at the end of your billing period.`,
  };
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(
  userId: string,
  hubId: string,
): Promise<{ success: boolean; message: string; cancelAt: Date }> {
  await verifyHubAccess(userId, hubId);

  // Get current subscription
  const subscription = await Subscription.findOne({
    hubId,
    status: { $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] },
  });

  if (!subscription) {
    throw new Error('No active subscription found');
  }

  // Cancel in Stripe (at period end)
  const cancelledSubscription = await stripeService.cancelSubscription(
    subscription.stripeSubscriptionId,
  );

  const cancelledSub = cancelledSubscription as unknown as { current_period_end: number };
  const cancelAt = new Date(cancelledSub.current_period_end * 1000);

  // Send subscription cancelled notification (non-blocking)
  void sendSubscriptionNotification(userId, hubId, 'SUBSCRIPTION_CANCELLED', {
    cancelAt: cancelAt.toISOString(),
  });

  return {
    success: true,
    message: 'Subscription will be cancelled at the end of the billing period',
    cancelAt,
  };
}

/**
 * Send subscription notification to hub owner
 */
async function sendSubscriptionNotification(
  userId: string,
  hubId: string,
  templateId: string,
  additionalData?: Record<string, unknown>,
): Promise<void> {
  try {
    const [user, hub, subscription] = await Promise.all([
      User.findById(userId).select('name email phoneNumber').lean(),
      Hub.findById(hubId).select('name').lean(),
      Subscription.findOne({
        hubId,
        status: {
          $in: [
            SubscriptionStatus.ACTIVE,
            SubscriptionStatus.TRIALING,
            SubscriptionStatus.PAST_DUE,
          ],
        },
      }).lean(),
    ]);

    if (!user) return;

    const hubName = hub?.name || 'Your Hub';
    let planName = 'your plan';

    if (subscription?.planCode) {
      const subscriptionPlan = await Plan.findOne({ code: subscription.planCode })
        .select('name')
        .lean();
      planName = subscriptionPlan?.name || subscription.planCode || 'your plan';
    }

    await communicationTriggerService.triggerCommunicationWithUser({
      templateId,
      user: {
        _id: userId,
        name: user.name,
        email: user.email,
        phone: user.phoneNumber,
      },
      hubId,
      data: {
        userName: user.name,
        hubName,
        planName,
        subscriptionId: subscription?._id?.toString(),
        ...additionalData,
      },
    });
  } catch (error) {
    console.error(`Failed to send ${templateId} notification:`, error);
  }
}

/**
 * Reactivate cancelled subscription
 */
export async function reactivateSubscription(
  userId: string,
  hubId: string,
): Promise<{ success: boolean; message: string }> {
  await verifyHubAccess(userId, hubId);

  // Get current subscription
  const subscription = await Subscription.findOne({
    hubId,
    status: { $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] },
  });

  if (!subscription) {
    throw new Error('No active subscription found');
  }

  // Reactivate in Stripe
  await stripeService.reactivateSubscription(subscription.stripeSubscriptionId);

  return {
    success: true,
    message: 'Subscription has been reactivated',
  };
}

// ============================================================================
// Payment Methods
// ============================================================================

/**
 * Get Stripe customer ID for hub subscription
 */
async function getStripeCustomerId(userId: string, hubId: string): Promise<string> {
  const subscription = await Subscription.findOne({
    hubId,
    status: {
      $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING, SubscriptionStatus.PAST_DUE],
    },
  }).sort({ createdAt: -1 });

  if (subscription?.stripeCustomerId) {
    return subscription.stripeCustomerId;
  }

  // Fallback: create/get customer from user
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const customer = await stripeService.getOrCreateCustomer({
    _id: userId,
    email: user.email,
    name: user.name,
    phoneNumber: user.phoneNumber,
  });

  return customer.id;
}

/**
 * Get payment methods for hub
 */
export async function getPaymentMethods(
  userId: string,
  hubId: string,
): Promise<{ paymentMethods: PaymentMethodInfo[]; stripeCustomerId: string }> {
  await verifyHubAccess(userId, hubId);

  const customerId = await getStripeCustomerId(userId, hubId);

  // Get customer to find default payment method
  const customer = await stripeService.retrieveCustomer(customerId);
  const defaultPaymentMethodId =
    !('deleted' in customer) && customer.invoice_settings?.default_payment_method
      ? typeof customer.invoice_settings.default_payment_method === 'string'
        ? customer.invoice_settings.default_payment_method
        : customer.invoice_settings.default_payment_method.id
      : null;

  // Get all payment methods
  const paymentMethods = await stripeService.listPaymentMethods(customerId, 'card');

  return {
    paymentMethods: paymentMethods.data.map((pm) => ({
      id: pm.id,
      type: 'card' as const,
      brand: pm.card?.brand || 'unknown',
      last4: pm.card?.last4 || '****',
      expMonth: pm.card?.exp_month,
      expYear: pm.card?.exp_year,
      isDefault: pm.id === defaultPaymentMethodId,
    })),
    stripeCustomerId: customerId,
  };
}

/**
 * Create setup intent for adding new payment method
 */
export async function createPaymentMethodSetupIntent(
  userId: string,
  hubId: string,
): Promise<{ clientSecret: string }> {
  await verifyHubAccess(userId, hubId);

  const customerId = await getStripeCustomerId(userId, hubId);
  const setupIntent = await stripeService.createSetupIntent(customerId);

  if (!setupIntent.client_secret) {
    throw new Error('Failed to create setup intent');
  }

  return { clientSecret: setupIntent.client_secret };
}

/**
 * Set default payment method
 */
export async function setDefaultPaymentMethod(
  userId: string,
  hubId: string,
  paymentMethodId: string,
): Promise<{ success: boolean }> {
  await verifyHubAccess(userId, hubId);

  const customerId = await getStripeCustomerId(userId, hubId);

  // Verify payment method belongs to customer
  const paymentMethods = await stripeService.listPaymentMethods(customerId, 'card');
  const paymentMethod = paymentMethods.data.find((pm) => pm.id === paymentMethodId);

  if (!paymentMethod) {
    throw new Error('Payment method not found');
  }

  await stripeService.setDefaultPaymentMethod(customerId, paymentMethodId);

  return { success: true };
}

/**
 * Delete payment method
 */
export async function deletePaymentMethod(
  userId: string,
  hubId: string,
  paymentMethodId: string,
): Promise<{ success: boolean }> {
  await verifyHubAccess(userId, hubId);

  const customerId = await getStripeCustomerId(userId, hubId);

  // Verify payment method belongs to customer
  const paymentMethods = await stripeService.listPaymentMethods(customerId, 'card');
  const paymentMethod = paymentMethods.data.find((pm) => pm.id === paymentMethodId);

  if (!paymentMethod) {
    throw new Error('Payment method not found');
  }

  // Check if it's the only payment method
  if (paymentMethods.data.length === 1) {
    throw new Error('Cannot delete the only payment method');
  }

  await stripeService.detachPaymentMethod(paymentMethodId);

  return { success: true };
}

// ============================================================================
// Invoices
// ============================================================================

/**
 * Format Stripe invoice for frontend
 */
function formatInvoice(invoice: Stripe.Invoice): InvoiceInfo {
  return {
    id: invoice.id,
    number: invoice.number,
    description: formatInvoiceDescription(invoice),
    amount: invoice.amount_due || 0,
    currency: (invoice.currency || 'usd').toUpperCase(),
    status: mapInvoiceStatus(invoice.status),
    date: invoice.created
      ? new Date(invoice.created * 1000).toISOString()
      : new Date().toISOString(),
    dueDate: invoice.due_date ? new Date(invoice.due_date * 1000).toISOString() : null,
    pdfUrl: invoice.invoice_pdf || null,
    hostedInvoiceUrl: invoice.hosted_invoice_url || null,
  };
}

/**
 * Format invoice description
 */
function formatInvoiceDescription(invoice: Stripe.Invoice): string {
  if (invoice.description) {
    return invoice.description;
  }

  const lineItem = invoice.lines?.data?.[0];
  if (lineItem?.description) {
    return lineItem.description;
  }

  const periodStart = invoice.period_start ? new Date(invoice.period_start * 1000) : new Date();

  const monthYear = periodStart.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return `Platform subscription - ${monthYear}`;
}

/**
 * Map Stripe invoice status
 */
function mapInvoiceStatus(
  status: Stripe.Invoice.Status | null,
): 'paid' | 'pending' | 'overdue' | 'draft' | 'void' {
  switch (status) {
    case 'paid':
      return 'paid';
    case 'open':
      return 'pending';
    case 'draft':
      return 'draft';
    case 'void':
      return 'void';
    case 'uncollectible':
      return 'overdue';
    default:
      return 'pending';
  }
}

/**
 * Get invoices for hub
 */
export async function getInvoices(
  userId: string,
  hubId: string,
  params?: { limit?: number; startingAfter?: string },
): Promise<{ invoices: InvoiceInfo[]; hasMore: boolean }> {
  await verifyHubAccess(userId, hubId);

  const customerId = await getStripeCustomerId(userId, hubId);

  const invoices = await stripeService.listInvoices(customerId, {
    limit: params?.limit || 10,
    starting_after: params?.startingAfter,
  });

  return {
    invoices: invoices.data.map((inv) => formatInvoice(inv)),
    hasMore: invoices.has_more,
  };
}

/**
 * Get invoice download URL
 */
export async function getInvoiceDownloadUrl(
  userId: string,
  hubId: string,
  invoiceId: string,
): Promise<{ url: string }> {
  await verifyHubAccess(userId, hubId);

  const customerId = await getStripeCustomerId(userId, hubId);

  // Verify invoice belongs to customer
  const invoice = await stripeService.retrieveInvoice(invoiceId);
  if (invoice.customer !== customerId) {
    throw new Error('Invoice not found');
  }

  const pdfUrl = invoice.invoice_pdf;
  if (!pdfUrl) {
    throw new Error('Invoice PDF not available');
  }

  return { url: pdfUrl };
}

// ============================================================================
// Upcoming Payment & Trial Info
// ============================================================================

/**
 * Get upcoming payment info
 */
export async function getUpcomingPayment(
  userId: string,
  hubId: string,
): Promise<UpcomingPaymentInfo | null> {
  await verifyHubAccess(userId, hubId);

  try {
    const subscription = await Subscription.findOne({
      hubId,
      status: { $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] },
    }).sort({ createdAt: -1 });

    if (!subscription?.stripeCustomerId || !subscription?.stripeSubscriptionId) {
      return null;
    }

    const upcomingInvoice = await stripeService.getUpcomingInvoice(
      subscription.stripeCustomerId,
      subscription.stripeSubscriptionId,
    );

    return {
      amount: upcomingInvoice.amount_due || 0,
      currency: (upcomingInvoice.currency || 'usd').toUpperCase(),
      dueDate: upcomingInvoice.next_payment_attempt
        ? new Date(upcomingInvoice.next_payment_attempt * 1000).toISOString()
        : new Date(subscription.nextBillingDate).toISOString(),
      description: formatInvoiceDescription(upcomingInvoice),
    };
  } catch (error) {
    console.log('[HubSubscriptionSettings] No upcoming invoice:', error);
    return null;
  }
}

/**
 * Get trial info for hub subscription
 */
export async function getTrialInfo(userId: string, hubId: string): Promise<TrialInfo> {
  await verifyHubAccess(userId, hubId);

  const subscription = await Subscription.findOne({
    hubId,
    status: { $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] },
  }).sort({ createdAt: -1 });

  if (!subscription?.stripeSubscriptionId) {
    return {
      isTrialing: false,
      trialStart: null,
      trialEnd: null,
      daysRemaining: 0,
    };
  }

  try {
    const stripeSubscription = await stripeService.retrieveSubscriptionExpanded(
      subscription.stripeSubscriptionId,
    );

    // biome-ignore lint/suspicious/noExplicitAny: Stripe types don't include snake_case properties
    const sub = stripeSubscription as any;
    const trialStart = sub.trial_start;
    const trialEnd = sub.trial_end;

    if (!trialEnd) {
      return {
        isTrialing: false,
        trialStart: null,
        trialEnd: null,
        daysRemaining: 0,
      };
    }

    const now = Date.now();
    const trialEndDate = new Date(trialEnd * 1000);
    const daysRemaining = Math.max(
      0,
      Math.ceil((trialEndDate.getTime() - now) / (1000 * 60 * 60 * 24)),
    );

    return {
      isTrialing: stripeSubscription.status === 'trialing',
      trialStart: trialStart ? new Date(trialStart * 1000).toISOString() : null,
      trialEnd: trialEndDate.toISOString(),
      daysRemaining,
    };
  } catch (error) {
    console.error('[HubSubscriptionSettings] Error getting trial info:', error);
    return {
      isTrialing: false,
      trialStart: null,
      trialEnd: null,
      daysRemaining: 0,
    };
  }
}
