import Stripe from 'stripe';

/**
 * Stripe Service - Manages Stripe API interactions
 */
export class StripeService {
  private stripe!: Stripe;

  constructor() {
    // Initialize Stripe instance
    this.initializeStripe();
  }

  /**
   * Initialize Stripe instance
   * Uses Atlas Stripe account by default (subscriptions, default operations)
   */
  private initializeStripe(): void {
    const secretKey = process.env.STRIPE_ATLAS_SECRET_KEY;

    if (!secretKey) {
      throw new Error('STRIPE_ATLAS_SECRET_KEY not found in environment variables');
    }

    this.stripe = new Stripe(secretKey, {
      apiVersion: '2025-12-15.clover',
      typescript: true,
    });
  }

  /**
   * Get Stripe instance
   */
  getStripeInstance(): Stripe {
    return this.stripe;
  }

  /**
   * Get or create Stripe customer
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
      },
    });

    return customer;
  }

  /**
   * Create Checkout Session for subscription
   */
  async createCheckoutSession(params: {
    customerId: string;
    priceId: string;
    successUrl: string;
    cancelUrl: string;
    metadata: Record<string, string>;
    promotionCode?: string;
  }): Promise<Stripe.Checkout.Session> {
    const sessionData: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      customer: params.customerId,
      line_items: [
        {
          price: params.priceId,
          quantity: 1,
        },
      ],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: params.metadata,
      subscription_data: {
        metadata: params.metadata, // Pass metadata to the subscription object
      },
      billing_address_collection: 'auto',
      payment_method_types: ['card'],
      allow_promotion_codes: true,
    };

    // Add promotion code if provided
    if (params.promotionCode) {
      const promotionCodes = await this.stripe.promotionCodes.list({
        code: params.promotionCode,
        active: true,
        limit: 1,
      });

      const promoCode = promotionCodes.data[0];
      if (promoCode) {
        sessionData.discounts = [
          {
            promotion_code: promoCode.id,
          },
        ];
      }
    }

    return this.stripe.checkout.sessions.create(sessionData);
  }

  /**
   * Retrieve checkout session
   */
  async retrieveCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
    return this.stripe.checkout.sessions.retrieve(sessionId);
  }

  /**
   * Retrieve subscription
   */
  async retrieveSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return this.stripe.subscriptions.retrieve(subscriptionId);
  }

  /**
   * Cancel subscription (at period end)
   */
  async cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return this.stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  }

  /**
   * Change subscription plan (upgrade/downgrade)
   * Stripe handles proration automatically
   */
  async changeSubscriptionPlan(params: {
    subscriptionId: string;
    newPriceId: string;
    prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice';
  }): Promise<Stripe.Subscription> {
    // Get current subscription to find the item ID
    const subscription = await this.stripe.subscriptions.retrieve(params.subscriptionId);
    const subscriptionItemId = subscription.items.data[0]?.id;

    if (!subscriptionItemId) {
      throw new Error('No subscription item found');
    }

    return this.stripe.subscriptions.update(params.subscriptionId, {
      items: [
        {
          id: subscriptionItemId,
          price: params.newPriceId,
        },
      ],
      proration_behavior: params.prorationBehavior || 'create_prorations',
    });
  }

  /**
   * Preview subscription plan change (get proration preview)
   */
  async previewPlanChange(params: {
    subscriptionId: string;
    newPriceId: string;
  }): Promise<Stripe.Invoice> {
    const subscription = await this.stripe.subscriptions.retrieve(params.subscriptionId);
    const subscriptionItemId = subscription.items.data[0]?.id;

    if (!subscriptionItemId) {
      throw new Error('No subscription item found');
    }

    return this.stripe.invoices.createPreview({
      subscription: params.subscriptionId,
      subscription_details: {
        items: [
          {
            id: subscriptionItemId,
            price: params.newPriceId,
          },
        ],
        proration_behavior: 'create_prorations',
      },
    });
  }

  /**
   * Reactivate cancelled subscription (if still in grace period)
   */
  async reactivateSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return this.stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });
  }

  /**
   * Create Checkout Session for one-time payment (bookings)
   */
  async createBookingCheckoutSession(params: {
    lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];
    successUrl: string;
    cancelUrl: string;
    metadata: Record<string, string>;
    customerEmail?: string;
    paymentMethodTypes?: Stripe.Checkout.SessionCreateParams.PaymentMethodType[];
  }): Promise<Stripe.Checkout.Session> {
    const sessionData: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment', // One-time payment
      line_items: params.lineItems,
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: params.metadata,
      payment_method_types: params.paymentMethodTypes || ['card', 'fpx'],
      billing_address_collection: 'auto',
    };

    // Add customer email if provided
    if (params.customerEmail) {
      sessionData.customer_email = params.customerEmail;
    }

    return this.stripe.checkout.sessions.create(sessionData);
  }

  /**
   * Retrieve payment intent
   */
  async retrievePaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    return this.stripe.paymentIntents.retrieve(paymentIntentId);
  }

  /**
   * Refund payment
   */
  async refundPayment(params: {
    paymentIntentId: string;
    amount?: number; // Amount in cents (optional - defaults to full refund)
    reason?: Stripe.RefundCreateParams.Reason;
  }): Promise<Stripe.Refund> {
    const refundData: Stripe.RefundCreateParams = {
      payment_intent: params.paymentIntentId,
    };

    if (params.amount) {
      refundData.amount = params.amount;
    }

    if (params.reason) {
      refundData.reason = params.reason;
    }

    return this.stripe.refunds.create(refundData);
  }

  /**
   * Verify webhook signature
   * Uses Atlas webhook secret by default
   */
  verifyWebhookSignature(payload: string | Buffer, signature: string): Stripe.Event {
    const webhookSecret = process.env.STRIPE_ATLAS_WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new Error('STRIPE_ATLAS_WEBHOOK_SECRET not found in environment variables');
    }

    return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  }

  // ============================================
  // PAYMENT METHODS - Client Card Management
  // ============================================

  /**
   * Attach payment method to customer
   */
  async attachPaymentMethod(
    customerId: string,
    paymentMethodId: string,
  ): Promise<Stripe.PaymentMethod> {
    return this.stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });
  }

  /**
   * List payment methods for customer
   */
  async listPaymentMethods(
    customerId: string,
    type: Stripe.PaymentMethodListParams.Type = 'card',
  ): Promise<Stripe.ApiList<Stripe.PaymentMethod>> {
    return this.stripe.paymentMethods.list({
      customer: customerId,
      type,
    });
  }

  /**
   * Detach payment method from customer
   */
  async detachPaymentMethod(paymentMethodId: string): Promise<Stripe.PaymentMethod> {
    return this.stripe.paymentMethods.detach(paymentMethodId);
  }

  /**
   * Set default payment method for customer
   */
  async setDefaultPaymentMethod(
    customerId: string,
    paymentMethodId: string,
  ): Promise<Stripe.Customer> {
    const customer = await this.stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    return customer;
  }

  /**
   * Create SetupIntent for adding new payment method
   * Returns client_secret for frontend to complete card setup
   */
  async createSetupIntent(customerId: string): Promise<Stripe.SetupIntent> {
    return this.stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      usage: 'off_session', // Allow using this payment method for future charges
    });
  }

  /**
   * Retrieve customer with default payment method info
   */
  async retrieveCustomer(customerId: string): Promise<Stripe.Customer | Stripe.DeletedCustomer> {
    return this.stripe.customers.retrieve(customerId, {
      expand: ['invoice_settings.default_payment_method'],
    });
  }

  // ============================================
  // INVOICES - Billing History
  // ============================================

  /**
   * List invoices for customer
   */
  async listInvoices(
    customerId: string,
    params?: { limit?: number; starting_after?: string },
  ): Promise<Stripe.ApiList<Stripe.Invoice>> {
    return this.stripe.invoices.list({
      customer: customerId,
      limit: params?.limit || 10,
      starting_after: params?.starting_after,
      expand: ['data.subscription'],
    });
  }

  /**
   * Retrieve a single invoice
   */
  async retrieveInvoice(invoiceId: string): Promise<Stripe.Invoice> {
    return this.stripe.invoices.retrieve(invoiceId);
  }

  /**
   * Get invoice PDF URL
   */
  async getInvoicePdfUrl(invoiceId: string): Promise<string | null> {
    const invoice = await this.stripe.invoices.retrieve(invoiceId);
    return invoice.invoice_pdf || null;
  }

  /**
   * Get upcoming invoice (next payment details)
   */
  async getUpcomingInvoice(customerId: string, subscriptionId?: string): Promise<Stripe.Invoice> {
    const params: Stripe.InvoiceCreatePreviewParams = {
      customer: customerId,
    };

    if (subscriptionId) {
      params.subscription = subscriptionId;
    }

    return this.stripe.invoices.createPreview(params);
  }

  /**
   * Retrieve subscription with expanded data (trial info, etc.)
   */
  async retrieveSubscriptionExpanded(subscriptionId: string): Promise<Stripe.Subscription> {
    return this.stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['default_payment_method', 'latest_invoice'],
    });
  }

  // ============================================
  // ESCROW PAYMENT INTENTS - Contract Funding
  // ============================================

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
   * Capture PaymentIntent (release escrow funds)
   * Called when milestone is approved by client
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
   * Cancel PaymentIntent (release funds back to customer)
   * Called when contract is cancelled or milestone is rejected
   */
  async cancelPaymentIntent(
    paymentIntentId: string,
    cancellationReason?: Stripe.PaymentIntentCancelParams.CancellationReason,
  ): Promise<Stripe.PaymentIntent> {
    return this.stripe.paymentIntents.cancel(paymentIntentId, {
      cancellation_reason: cancellationReason,
    });
  }

  /**
   * Create PaymentIntent for immediate capture
   * Used for contract weekly payouts and retry payments
   */
  async createPaymentIntent(params: {
    amount: number; // Amount in cents
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
   * Create PaymentIntent for checkout (Payment Element flow)
   * Does NOT confirm immediately - frontend uses Payment Element to confirm
   * Returns client_secret for frontend to use with Stripe Payment Element
   */
  async createCheckoutPaymentIntent(params: {
    amount: number; // Amount in cents
    currency: string;
    customerId?: string;
    description: string;
    metadata: Record<string, string>;
  }): Promise<Stripe.PaymentIntent> {
    return this.stripe.paymentIntents.create({
      amount: params.amount,
      currency: params.currency.toLowerCase(),
      customer: params.customerId,
      description: params.description,
      metadata: params.metadata,
      // Use explicit payment method types instead of automatic_payment_methods
      // to avoid Stripe Link prompts
      payment_method_types: ['card'],
    });
  }

  /**
   * Confirm a PaymentIntent with a payment method
   * Used after Payment Element collects payment details
   */
  async confirmPaymentIntent(
    paymentIntentId: string,
    paymentMethodId: string,
  ): Promise<Stripe.PaymentIntent> {
    return this.stripe.paymentIntents.confirm(paymentIntentId, {
      payment_method: paymentMethodId,
    });
  }

  /**
   * Update a PaymentIntent (e.g., to add customer after guest checkout)
   */
  async updatePaymentIntent(
    paymentIntentId: string,
    params: { customer?: string; metadata?: Record<string, string> },
  ): Promise<Stripe.PaymentIntent> {
    return this.stripe.paymentIntents.update(paymentIntentId, params);
  }

  // ============================================
  // STRIPE CONNECT - Expert Payment Management
  // ============================================

  /**
   * Create Stripe Connect Custom account for expert
   * Custom accounts provide full control over onboarding and compliance
   */
  async createConnectAccount(params: { email: string; country: string }): Promise<Stripe.Account> {
    return this.stripe.accounts.create({
      type: 'custom',
      email: params.email,
      country: params.country,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'individual',
      settings: {
        payouts: {
          schedule: {
            interval: 'manual', // Experts manually request withdrawals
          },
        },
      },
    });
  }

  /**
   * Generate Stripe Connect onboarding link
   */
  async createAccountLink(params: {
    accountId: string;
    refreshUrl: string;
    returnUrl: string;
    type?: Stripe.AccountLinkCreateParams.Type;
  }): Promise<Stripe.AccountLink> {
    return this.stripe.accountLinks.create({
      account: params.accountId,
      refresh_url: params.refreshUrl,
      return_url: params.returnUrl,
      type: params.type || 'account_onboarding',
    });
  }

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
   * Add external bank account to Connect account
   */
  async createExternalAccount(params: {
    accountId: string;
    accountHolderName: string;
    accountNumber: string;
    routingNumber: string;
    country: string;
    currency: string;
  }): Promise<Stripe.BankAccount> {
    const account = await this.stripe.accounts.createExternalAccount(params.accountId, {
      external_account: {
        object: 'bank_account',
        account_holder_name: params.accountHolderName,
        account_number: params.accountNumber,
        routing_number: params.routingNumber,
        country: params.country,
        currency: params.currency,
      },
      default_for_currency: true, // Set as default for this currency
    });

    return account as Stripe.BankAccount;
  }

  /**
   * List external accounts for Connect account
   */
  async listExternalAccounts(
    accountId: string,
    params?: { limit?: number },
  ): Promise<Stripe.ApiList<Stripe.BankAccount | Stripe.Card>> {
    return this.stripe.accounts.listExternalAccounts(accountId, {
      object: 'bank_account',
      limit: params?.limit || 100,
    });
  }

  /**
   * Delete external account
   */
  async deleteExternalAccount(
    accountId: string,
    bankAccountId: string,
  ): Promise<Stripe.DeletedBankAccount | Stripe.DeletedCard> {
    return this.stripe.accounts.deleteExternalAccount(accountId, bankAccountId);
  }

  /**
   * Set default external account for currency
   */
  async setDefaultExternalAccount(
    accountId: string,
    bankAccountId: string,
    currency: string,
  ): Promise<Stripe.BankAccount> {
    const account = await this.stripe.accounts.updateExternalAccount(accountId, bankAccountId, {
      default_for_currency: true,
      metadata: {
        currency,
        updated_at: new Date().toISOString(),
      },
    });

    return account as Stripe.BankAccount;
  }

  /**
   * Get balance for Connect account
   */
  async getBalance(accountId: string): Promise<Stripe.Balance> {
    return this.stripe.balance.retrieve({
      stripeAccount: accountId,
    });
  }

  /**
   * Create payout (withdrawal) for Connect account
   */
  async createPayout(params: {
    accountId: string;
    amount: number; // Amount in cents
    currency: string;
    destination?: string; // Bank account ID (optional - uses default if not provided)
    sourceType?: string; // 'card', 'fpx', or 'bank_transfer'
    metadata?: Record<string, string>;
  }): Promise<Stripe.Payout> {
    const payoutParams: Stripe.PayoutCreateParams = {
      amount: params.amount,
      currency: params.currency.toLowerCase(),
      metadata: {
        source_type: params.sourceType || 'bank_transfer',
        ...params.metadata,
      },
    };

    // Add destination if specified
    if (params.destination) {
      payoutParams.destination = params.destination;
    }

    return this.stripe.payouts.create(payoutParams, {
      stripeAccount: params.accountId,
    });
  }

  /**
   * Retrieve payout details
   */
  async retrievePayout(accountId: string, payoutId: string): Promise<Stripe.Payout> {
    return this.stripe.payouts.retrieve(payoutId, {
      stripeAccount: accountId,
    });
  }

  /**
   * List payouts for Connect account
   */
  async listPayouts(
    accountId: string,
    params?: { limit?: number; status?: string },
  ): Promise<Stripe.ApiList<Stripe.Payout>> {
    const listParams: Stripe.PayoutListParams = {
      limit: params?.limit || 10,
    };

    if (params?.status) {
      listParams.status = params.status as
        | 'pending'
        | 'paid'
        | 'failed'
        | 'canceled'
        | 'in_transit';
    }

    return this.stripe.payouts.list(listParams, {
      stripeAccount: accountId,
    });
  }

  /**
   * Create transfer from platform to Connect account
   * Used when expert earns money from a booking
   */
  async createTransfer(params: {
    amount: number; // Amount in cents
    currency: string;
    destination: string; // Connect account ID
    transferGroup?: string; // Group ID for related transfers
    sourceTransaction?: string; // Original charge ID to link transfer
    metadata?: Record<string, string>;
  }): Promise<Stripe.Transfer> {
    const transferParams: Stripe.TransferCreateParams = {
      amount: params.amount,
      currency: params.currency.toLowerCase(),
      destination: params.destination,
      metadata: params.metadata,
    };

    if (params.transferGroup) {
      transferParams.transfer_group = params.transferGroup;
    }

    // Link to original charge if provided (allows automatic refund handling)
    if (params.sourceTransaction) {
      transferParams.source_transaction = params.sourceTransaction;
    }

    return this.stripe.transfers.create(transferParams);
  }

  /**
   * Reverse transfer (for refunds/cancellations)
   */
  async reverseTransfer(
    transferId: string,
    params?: { amount?: number },
  ): Promise<Stripe.TransferReversal> {
    return this.stripe.transfers.createReversal(transferId, {
      amount: params?.amount,
    });
  }

  // ============================================
  // STRIPE CONNECT ACCOUNT UTILITIES
  // ============================================

  /**
   * Check if connected account has required capabilities for merchant operations
   * Used for payout accounts (stripeAccountId on Hub/User)
   */
  async checkConnectedAccountCapabilities(connectedAccountId: string): Promise<{
    canAcceptPayments: boolean;
    canReceivePayouts: boolean;
    requiresOnboarding: boolean;
    disabledReason?: string;
  }> {
    const account = await this.stripe.accounts.retrieve(connectedAccountId);

    const cardPayments = account.capabilities?.card_payments;
    const transfers = account.capabilities?.transfers;

    return {
      canAcceptPayments: cardPayments === 'active',
      canReceivePayouts: transfers === 'active',
      requiresOnboarding:
        cardPayments === 'inactive' ||
        transfers === 'inactive' ||
        !account.details_submitted ||
        (account.requirements?.currently_due?.length ?? 0) > 0,
      disabledReason: account.requirements?.disabled_reason || undefined,
    };
  }

  /**
   * Refund a PaymentIntent
   * Used when milestone is cancelled or offer is declined
   */
  async refundPaymentIntent(paymentIntentId: string, amount?: number): Promise<Stripe.Refund> {
    // First retrieve the payment intent to get charge info
    const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

    // Find the charge to refund
    const chargeId =
      typeof paymentIntent.latest_charge === 'string'
        ? paymentIntent.latest_charge
        : paymentIntent.latest_charge?.id;

    if (!chargeId) {
      throw new Error('No charge found for this payment intent');
    }

    // Calculate refundable amount
    const charge = await this.stripe.charges.retrieve(chargeId);
    const alreadyRefunded = charge.amount_refunded || 0;
    const maxRefundable = (charge.amount || 0) - alreadyRefunded;

    const refundAmount = amount ? Math.min(amount, maxRefundable) : maxRefundable;

    if (refundAmount <= 0) {
      throw new Error('No refundable amount available');
    }

    return this.stripe.refunds.create({
      charge: chargeId,
      amount: refundAmount,
    });
  }
}

// Export singleton instance
export const stripeService = new StripeService();
