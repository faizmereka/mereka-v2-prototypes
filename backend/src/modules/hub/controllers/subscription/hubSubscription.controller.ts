import { Hub } from '@core/models/Hub';
import { Subscription } from '@core/models/Subscription';
import { TransactionStatus } from '@core/models/Transaction';
import { User } from '@core/models/User';
import type {
  HubCreateCheckoutSessionInput,
  HubVerifySessionQuery,
} from '@core/schemas/hub/settings';
import { StripeServiceFactory } from '@core/services/shared/payments/stripeFactory.service';
import { getUserId } from '@core/utils/auth-helpers';
import { isValidStripeRegion, type StripeRegion } from '@core/utils/stripe-region';
import { communicationTriggerService } from '@services/communications';
import { planService, SubscriptionService, transactionService } from '@services/payments';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type Stripe from 'stripe';

const subscriptionService = new SubscriptionService();

/**
 * Get available subscription plans
 */
export async function getPlans(request: FastifyRequest, reply: FastifyReply) {
  try {
    const plans = await planService.getAllPlans();

    return reply.send({
      success: true,
      data: { plans },
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to get plans');

    return reply.status(500).send({
      success: false,
      error: {
        code: 'GET_PLANS_FAILED',
        message: 'Failed to get plans',
      },
    });
  }
}

/**
 * Create checkout session for subscription
 */
export async function createCheckoutSession(
  request: FastifyRequest<{ Body: HubCreateCheckoutSessionInput }>,
  reply: FastifyReply,
) {
  try {
    const userId = getUserId(request);
    const { planCode, successUrl, cancelUrl, hubId, promoCode } = request.body;

    request.log.info(
      { userId, planCode, hubId, successUrl, cancelUrl, promoCode },
      '[CreateCheckoutSession] Starting checkout session creation',
    );

    const result = await subscriptionService.createCheckoutSession(
      userId,
      planCode,
      successUrl,
      cancelUrl,
      hubId,
      promoCode,
    );

    request.log.info(
      { userId, hubId, checkoutUrl: result.checkoutUrl, sessionId: result.sessionId },
      '[CreateCheckoutSession] ✅ Checkout session created successfully',
    );

    return reply.send({
      success: true,
      data: result,
      message: 'Checkout session created successfully',
    });
  } catch (error) {
    request.log.error(
      {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
      },
      '[CreateCheckoutSession] ❌ Failed to create checkout session',
    );

    const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
    return reply.status(statusCode).send({
      success: false,
      error: {
        code: 'CREATE_CHECKOUT_SESSION_FAILED',
        message: error instanceof Error ? error.message : 'Failed to create checkout session',
      },
    });
  }
}

/**
 * Verify checkout session
 */
export async function verifyCheckoutSession(
  request: FastifyRequest<{ Querystring: HubVerifySessionQuery }>,
  reply: FastifyReply,
) {
  try {
    const userId = getUserId(request);
    const { sessionId, forceCreate } = request.query;

    const subscription = await subscriptionService.verifyCheckoutSession(
      sessionId,
      userId,
      forceCreate === 'true',
    );

    if (!subscription) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'SUBSCRIPTION_NOT_FOUND',
          message: 'Subscription not found or payment not completed',
        },
      });
    }

    return reply.send({
      success: true,
      data: { subscription },
      message: 'Checkout session verified successfully',
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to verify checkout session');

    return reply.status(500).send({
      success: false,
      error: {
        code: 'VERIFY_SESSION_FAILED',
        message: error instanceof Error ? error.message : 'Failed to verify checkout session',
      },
    });
  }
}

/**
 * Get user's subscriptions
 */
export async function getMySubscriptions(request: FastifyRequest, reply: FastifyReply) {
  try {
    const userId = getUserId(request);

    const subscriptions = await subscriptionService.getUserSubscriptions(userId);

    return reply.send({
      success: true,
      data: { subscriptions },
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to get subscriptions');

    return reply.status(500).send({
      success: false,
      error: {
        code: 'GET_SUBSCRIPTIONS_FAILED',
        message: 'Failed to get subscriptions',
      },
    });
  }
}

/**
 * Handle Stripe webhook
 * Supports multi-region webhooks via `?region=` query parameter
 *
 * Stripe Dashboard Setup:
 * - Malaysia webhook: https://api.mereka.io/api/v1/webhook?region=malaysia
 * - Atlas webhook: https://api.mereka.io/api/v1/webhook?region=atlas
 */
export async function handleStripeWebhook(
  request: FastifyRequest<{ Querystring: { region?: string } }>,
  reply: FastifyReply,
) {
  try {
    const signature = request.headers['stripe-signature'] as string;
    const queryRegion = request.query.region;

    // Determine which regional Stripe service to use for verification
    // Default to 'atlas' if no region specified (backward compatibility)
    let region: StripeRegion = 'atlas';
    if (queryRegion && isValidStripeRegion(queryRegion)) {
      region = queryRegion;
    }

    console.log(`[Webhook] 📥 Received webhook request (region: ${region})`);
    request.log.info({ url: request.url, region }, 'Webhook received');

    // Validate signature header
    if (!signature) {
      console.log(`[Webhook] ❌ Missing stripe-signature header`);
      request.log.error('Missing stripe-signature header');
      return reply.status(401).send({
        success: false,
        error: { message: 'Missing stripe-signature header' },
      });
    }

    // Get raw body for signature verification
    const rawBody = request.rawBody;

    if (!rawBody) {
      console.log(`[Webhook] ❌ Raw body not available`);
      request.log.error('Raw body not available for signature verification');
      return reply.status(400).send({
        success: false,
        error: { message: 'Invalid request body' },
      });
    }

    // Verify webhook signature using regional service
    console.log(`[Webhook] Verifying signature with ${region} Stripe service...`);
    request.log.info({ region }, 'Verifying webhook signature...');
    const regionalStripeService = StripeServiceFactory.getService(region);
    const event = regionalStripeService.verifyWebhookSignature(rawBody, signature);
    console.log(`[Webhook] ✅ Signature verified, event type: ${event.type} (region: ${region})`);
    request.log.info({ region }, '✅ Webhook signature verified');

    request.log.info({ eventType: event.type }, 'Processing webhook event');

    // Log full event data for debugging
    const subscription = event.data.object as Stripe.Subscription;
    console.log(
      `[Webhook] Event data:`,
      JSON.stringify(
        {
          eventType: event.type,
          subscriptionId: subscription.id,
          customerId: subscription.customer,
          status: subscription.status,
          metadata: subscription.metadata,
        },
        null,
        2,
      ),
    );

    // Handle different event types
    switch (event.type) {
      case 'customer.subscription.created':
        console.log(`[Webhook] Processing subscription.created...`);
        await subscriptionService.handleSubscriptionCreated(
          event.data.object as Stripe.Subscription,
        );
        console.log(`[Webhook] ✅ Subscription created handler completed`);
        request.log.info(
          {
            subscriptionId: (event.data.object as Stripe.Subscription).id,
          },
          'Subscription created',
        );
        break;

      case 'customer.subscription.updated':
        console.log(`[Webhook] Processing subscription.updated...`);
        await subscriptionService.handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription,
        );
        console.log(`[Webhook] ✅ Subscription updated handler completed`);
        request.log.info(
          {
            subscriptionId: (event.data.object as Stripe.Subscription).id,
          },
          'Subscription updated',
        );
        break;

      case 'checkout.session.completed':
        console.log(`[Webhook] Processing checkout.session.completed...`);
        // Handle checkout completion - create subscription from session data
        await subscriptionService.handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session,
        );
        console.log(`[Webhook] ✅ Checkout session completed handler finished`);
        request.log.info(
          {
            sessionId: (event.data.object as Stripe.Checkout.Session).id,
          },
          'Checkout session completed',
        );
        break;

      // ==================== Payment Events ====================
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`[Webhook] Processing payment_intent.succeeded: ${paymentIntent.id}`);

        const transaction = await transactionService.updateFromWebhook(paymentIntent.id, {
          status: TransactionStatus.SUCCEEDED,
          stripeStatus: 'succeeded',
          stripeChargeId:
            typeof paymentIntent.latest_charge === 'string'
              ? paymentIntent.latest_charge
              : paymentIntent.latest_charge?.id,
          stripeWebhookEventId: event.id,
        });

        if (transaction) {
          console.log(`[Webhook] ✅ Transaction ${transaction.referenceId} marked as succeeded`);
          request.log.info(
            { transactionId: transaction._id, referenceId: transaction.referenceId },
            'Payment succeeded - transaction updated',
          );
        } else {
          console.log(`[Webhook] ⚠️ No transaction found for payment intent: ${paymentIntent.id}`);
          request.log.warn(
            { paymentIntentId: paymentIntent.id },
            'Payment succeeded but no matching transaction found',
          );
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const failedPaymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(
          `[Webhook] Processing payment_intent.payment_failed: ${failedPaymentIntent.id}`,
        );

        const failedTransaction = await transactionService.updateFromWebhook(
          failedPaymentIntent.id,
          {
            status: TransactionStatus.FAILED,
            stripeStatus: 'failed',
            errorCode: failedPaymentIntent.last_payment_error?.code ?? undefined,
            errorMessage: failedPaymentIntent.last_payment_error?.message ?? undefined,
            stripeWebhookEventId: event.id,
          },
        );

        if (failedTransaction) {
          console.log(`[Webhook] ✅ Transaction ${failedTransaction.referenceId} marked as failed`);
          request.log.info(
            {
              transactionId: failedTransaction._id,
              referenceId: failedTransaction.referenceId,
              errorCode: failedPaymentIntent.last_payment_error?.code,
            },
            'Payment failed - transaction updated',
          );
        } else {
          console.log(
            `[Webhook] ⚠️ No transaction found for payment intent: ${failedPaymentIntent.id}`,
          );
          request.log.warn(
            { paymentIntentId: failedPaymentIntent.id },
            'Payment failed but no matching transaction found',
          );
        }
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        console.log(`[Webhook] Processing charge.refunded: ${charge.id}`);

        // Find transaction by payment intent (charge has payment_intent field)
        if (charge.payment_intent) {
          const paymentIntentId =
            typeof charge.payment_intent === 'string'
              ? charge.payment_intent
              : charge.payment_intent.id;

          const refundedTransaction = await transactionService.updateFromWebhook(paymentIntentId, {
            status:
              charge.amount_refunded === charge.amount
                ? TransactionStatus.REFUNDED
                : TransactionStatus.PARTIALLY_REFUNDED,
            stripeStatus: 'refunded',
            stripeWebhookEventId: event.id,
          });

          if (refundedTransaction) {
            console.log(
              `[Webhook] ✅ Transaction ${refundedTransaction.referenceId} marked as refunded`,
            );
            request.log.info(
              {
                transactionId: refundedTransaction._id,
                referenceId: refundedTransaction.referenceId,
                amountRefunded: charge.amount_refunded,
              },
              'Charge refunded - transaction updated',
            );
          }
        }
        break;
      }

      case 'transfer.created': {
        const transfer = event.data.object as Stripe.Transfer;
        console.log(`[Webhook] Processing transfer.created: ${transfer.id}`);
        request.log.info(
          {
            transferId: transfer.id,
            amount: transfer.amount,
            destination: transfer.destination,
          },
          'Transfer created',
        );
        break;
      }

      case 'transfer.reversed': {
        const reversedTransfer = event.data.object as Stripe.Transfer;
        console.log(`[Webhook] Processing transfer.reversed: ${reversedTransfer.id}`);

        // Find transaction by transfer ID and update status
        const transferTransaction = await transactionService.findByStripeTransferId(
          reversedTransfer.id,
        );
        if (transferTransaction) {
          const transactionId = String(transferTransaction._id);
          await transactionService.updateStatus(transactionId, TransactionStatus.FAILED, {
            errorMessage: 'Transfer to connected account was reversed',
            stripeWebhookEventId: event.id,
          });
          console.log(
            `[Webhook] ✅ Transaction ${transferTransaction.referenceId} marked as failed (transfer reversed)`,
          );
          request.log.info(
            { transactionId, transferId: reversedTransfer.id },
            'Transfer reversed - transaction updated',
          );
        }
        break;
      }

      case 'payout.paid': {
        const paidPayout = event.data.object as Stripe.Payout;
        console.log(`[Webhook] Processing payout.paid: ${paidPayout.id}`);
        request.log.info(
          {
            payoutId: paidPayout.id,
            amount: paidPayout.amount,
            arrivalDate: paidPayout.arrival_date,
          },
          'Payout paid - funds transferred to bank',
        );

        // Send PAYOUT_AVAILABLE notification
        try {
          await sendPayoutAvailableNotification(paidPayout, request.log);
        } catch (error) {
          request.log.error(
            { error, payoutId: paidPayout.id },
            'Failed to send payout notification',
          );
        }
        break;
      }

      // ==================== Invoice Events (Subscription Renewals) ====================
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log(`[Webhook] Processing invoice.paid: ${invoice.id}`);

        // Get subscription ID from parent.subscription_details (Stripe API 2023+)
        const subscriptionId = invoice.parent?.subscription_details?.subscription;

        // Only process subscription invoices (not one-time payments)
        if (subscriptionId) {
          request.log.info(
            {
              invoiceId: invoice.id,
              subscriptionId,
              amount: invoice.amount_paid,
            },
            'Subscription invoice paid',
          );

          // Send SUBSCRIPTION_RENEWED notification
          try {
            await sendSubscriptionRenewedNotification(invoice, subscriptionId, request.log);
          } catch (error) {
            request.log.error(
              { error, invoiceId: invoice.id },
              'Failed to send renewal notification',
            );
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const failedInvoice = event.data.object as Stripe.Invoice;
        console.log(`[Webhook] Processing invoice.payment_failed: ${failedInvoice.id}`);

        // Get subscription ID from parent.subscription_details (Stripe API 2023+)
        const failedSubscriptionId = failedInvoice.parent?.subscription_details?.subscription;

        // Only process subscription invoices
        if (failedSubscriptionId) {
          request.log.error(
            {
              invoiceId: failedInvoice.id,
              subscriptionId: failedSubscriptionId,
              attemptCount: failedInvoice.attempt_count,
            },
            'Subscription payment failed',
          );

          // Send SUBSCRIPTION_PAYMENT_FAILED notification
          try {
            await sendSubscriptionPaymentFailedNotification(
              failedInvoice,
              failedSubscriptionId,
              request.log,
            );
          } catch (error) {
            request.log.error(
              { error, invoiceId: failedInvoice.id },
              'Failed to send payment failed notification',
            );
          }
        }
        break;
      }

      // ==================== Connect Account Events ====================
      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        console.log(`[Webhook] Processing account.updated: ${account.id}`);

        // Check if account needs verification
        if (account.requirements?.currently_due?.length || account.requirements?.past_due?.length) {
          request.log.warn(
            {
              accountId: account.id,
              currentlyDue: account.requirements?.currently_due,
              pastDue: account.requirements?.past_due,
            },
            'Connect account needs verification',
          );

          // Send STRIPE_VERIFICATION_REQUIRED notification
          try {
            await sendVerificationRequiredNotification(account, request.log);
          } catch (error) {
            request.log.error(
              { error, accountId: account.id },
              'Failed to send verification notification',
            );
          }
        }
        break;
      }

      case 'payout.failed': {
        const failedPayout = event.data.object as Stripe.Payout;
        console.log(`[Webhook] Processing payout.failed: ${failedPayout.id}`);
        request.log.error(
          {
            payoutId: failedPayout.id,
            failureCode: failedPayout.failure_code,
            failureMessage: failedPayout.failure_message,
          },
          'Payout failed - bank transfer rejected',
        );
        // Note: Withdrawals are fetched directly from Stripe, so no MongoDB update needed
        break;
      }

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
        request.log.info({ eventType: event.type }, 'Unhandled webhook event');
    }

    return reply.send({ received: true });
  } catch (error) {
    console.log(`[Webhook] ❌ Error:`, error instanceof Error ? error.message : error);
    request.log.error({ error }, 'Webhook error');
    return reply.status(400).send({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Webhook error',
      },
    });
  }
}

// ==================== Notification Helper Functions ====================

/**
 * Send SUBSCRIPTION_RENEWED notification when invoice is paid
 */
async function sendSubscriptionRenewedNotification(
  invoice: Stripe.Invoice,
  subscriptionRef: string | Stripe.Subscription,
  log: { info: (obj: unknown, msg: string) => void; error: (obj: unknown, msg: string) => void },
): Promise<void> {
  const subscriptionId =
    typeof subscriptionRef === 'string' ? subscriptionRef : subscriptionRef?.id;

  if (!subscriptionId) return;

  // Find subscription in our database
  const subscription = await Subscription.findOne({ stripeSubscriptionId: subscriptionId }).lean();
  if (!subscription) {
    log.info({ subscriptionId }, 'Subscription not found in database');
    return;
  }

  // Get user and hub
  const [user, hub] = await Promise.all([
    User.findById(subscription.userId).select('name email phoneNumber').lean(),
    subscription.hubId ? Hub.findById(subscription.hubId).select('name').lean() : null,
  ]);

  if (!user) return;

  const planName = subscription.planCode === 'soar' ? 'Soar' : 'Scale';
  const hubName = hub?.name || 'your hub';
  const amount = `${subscription.currency} ${(invoice.amount_paid / 100).toFixed(2)}`;
  const nextBillingDate = subscription.nextBillingDate?.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  await communicationTriggerService.triggerCommunicationWithUser({
    templateId: 'SUBSCRIPTION_RENEWED',
    user: {
      _id: subscription.userId,
      name: user.name,
      email: user.email,
      phone: user.phoneNumber,
    },
    hubId: subscription.hubId,
    data: {
      userName: user.name,
      hubName,
      planName,
      amount,
      nextBillingDate,
      invoiceId: invoice.id,
      invoiceUrl: invoice.hosted_invoice_url || '',
    },
  });

  log.info(
    { userId: subscription.userId, invoiceId: invoice.id },
    'Sent SUBSCRIPTION_RENEWED notification',
  );
}

/**
 * Send SUBSCRIPTION_PAYMENT_FAILED notification when invoice payment fails
 */
async function sendSubscriptionPaymentFailedNotification(
  invoice: Stripe.Invoice,
  subscriptionRef: string | Stripe.Subscription,
  log: { info: (obj: unknown, msg: string) => void; error: (obj: unknown, msg: string) => void },
): Promise<void> {
  const subscriptionId =
    typeof subscriptionRef === 'string' ? subscriptionRef : subscriptionRef?.id;

  if (!subscriptionId) return;

  // Find subscription in our database
  const subscription = await Subscription.findOne({ stripeSubscriptionId: subscriptionId }).lean();
  if (!subscription) {
    log.info({ subscriptionId }, 'Subscription not found in database');
    return;
  }

  // Get user and hub
  const [user, hub] = await Promise.all([
    User.findById(subscription.userId).select('name email phoneNumber').lean(),
    subscription.hubId ? Hub.findById(subscription.hubId).select('name').lean() : null,
  ]);

  if (!user) return;

  const planName = subscription.planCode === 'soar' ? 'Soar' : 'Scale';
  const hubName = hub?.name || 'your hub';
  const amount = `${subscription.currency} ${(invoice.amount_due / 100).toFixed(2)}`;

  await communicationTriggerService.triggerCommunicationWithUser({
    templateId: 'SUBSCRIPTION_PAYMENT_FAILED',
    user: {
      _id: subscription.userId,
      name: user.name,
      email: user.email,
      phone: user.phoneNumber,
    },
    hubId: subscription.hubId,
    data: {
      userName: user.name,
      hubName,
      planName,
      amount,
      attemptCount: invoice.attempt_count,
      nextRetryDate: invoice.next_payment_attempt
        ? new Date(invoice.next_payment_attempt * 1000).toLocaleDateString()
        : 'N/A',
      updatePaymentUrl: '/hub/settings/subscription',
      invoiceUrl: invoice.hosted_invoice_url || '',
    },
  });

  log.info(
    { userId: subscription.userId, invoiceId: invoice.id },
    'Sent SUBSCRIPTION_PAYMENT_FAILED notification',
  );
}

/**
 * Send STRIPE_VERIFICATION_REQUIRED notification when Connect account needs action
 */
async function sendVerificationRequiredNotification(
  account: Stripe.Account,
  log: { info: (obj: unknown, msg: string) => void; error: (obj: unknown, msg: string) => void },
): Promise<void> {
  // Find hub by stripeAccountId
  const hub = await Hub.findOne({ stripeAccountId: account.id }).lean();
  if (!hub) {
    log.info({ accountId: account.id }, 'Hub not found for Stripe account');
    return;
  }

  // Find hub owner
  const { HubMember, HubMemberStatus } = await import('@core/models/HubMember');
  const { Role, RoleScope, SystemRoleKey } = await import('@core/models/Role');

  // Find the owner role first
  const ownerRole = await Role.findOne({
    key: SystemRoleKey.OWNER,
    scope: RoleScope.SYSTEM,
  }).lean();

  if (!ownerRole) {
    log.error({}, 'Owner role not found in database');
    return;
  }

  const hubOwner = await HubMember.findOne({
    hubId: hub._id,
    roleIds: ownerRole._id,
    status: HubMemberStatus.ACTIVE,
  })
    .populate<{ userId: { _id: unknown; name: string; email: string; phoneNumber?: string } }>(
      'userId',
      'name email phoneNumber',
    )
    .lean();

  if (!hubOwner?.userId || typeof hubOwner.userId !== 'object') return;

  const owner = hubOwner.userId;
  const requirements = [
    ...(account.requirements?.currently_due || []),
    ...(account.requirements?.past_due || []),
  ];

  // Create verification details message from requirements
  const verificationDetails =
    requirements.length > 0
      ? `Required: ${requirements.join(', ')}. Please complete verification by ${
          account.requirements?.current_deadline
            ? new Date(account.requirements.current_deadline * 1000).toLocaleDateString()
            : 'as soon as possible'
        }.`
      : 'Additional information is needed to verify your account.';

  await communicationTriggerService.triggerCommunicationWithUser({
    templateId: 'STRIPE_VERIFICATION_REQUIRED',
    user: {
      _id: owner._id.toString(),
      name: owner.name,
      email: owner.email,
      phone: owner.phoneNumber,
    },
    hubId: hub._id.toString(),
    data: {
      userName: owner.name,
      hubName: hub.name,
      requirements: requirements.join(', '),
      requirementCount: requirements.length,
      verificationDetails,
      deadline: account.requirements?.current_deadline
        ? new Date(account.requirements.current_deadline * 1000).toLocaleDateString()
        : 'As soon as possible',
      verificationUrl: '/hub/settings/payments',
    },
  });

  log.info(
    { hubId: hub._id, accountId: account.id },
    'Sent STRIPE_VERIFICATION_REQUIRED notification',
  );
}

/**
 * Send PAYOUT_AVAILABLE notification when payout is completed
 */
async function sendPayoutAvailableNotification(
  payout: Stripe.Payout,
  log: { info: (obj: unknown, msg: string) => void; error: (obj: unknown, msg: string) => void },
): Promise<void> {
  // Payout doesn't have direct hub reference, need to find by destination
  // This is complex because payouts go to bank accounts, not connected accounts
  // For now, log this and skip notification (would need Connect account context)
  log.info(
    { payoutId: payout.id, amount: payout.amount },
    'Payout notification skipped - needs Connect account context',
  );

  // TODO: If we have the connected account ID from the event context,
  // we could look up the hub and send the notification
}
