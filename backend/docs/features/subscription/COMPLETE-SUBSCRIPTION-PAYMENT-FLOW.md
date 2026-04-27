# 🎯 Complete Subscription Payment Flow

**Purpose**: Full flow from pricing page to subscription activation
**Date**: 2025-11-04
**Status**: Planning Phase

---

## 📊 Current Cloud Functions Flow (Reference)

### 1. Pricing Page → Get Plans

```
Frontend calls: Firebase query on 'subscription_products'
Returns: Plans with metadata, pricings, stripePriceId for both regions
```

### 2. User Selects Plan → Create Subscription

**Method 1: Direct Subscription** (with saved card)

```typescript
// Cloud Function: createSubscription
{
  customerId: 'cus_xxx',
  planPriceId: 'price_xxx',
  paymentMethodId: 'pm_xxx',  // Saved card
  promoCodeId: 'promo_xxx',   // Optional
  key: 'myr' | 'other'
}

// Stripe creates subscription immediately
// Returns: subscription object
```

**Method 2: Checkout Session** (new card/payment)

```typescript
// Cloud Function: createPaymentLink
{
  stripeData: {
    mode: 'subscription',
    line_items: [{
      price: 'price_xxx',
      quantity: 1
    }],
    success_url: 'https://app.mereka.dev/hub-dashboard',
    cancel_url: 'https://app.mereka.dev/pricing',
    customer: 'cus_xxx',  // Or customer_email if new
    metadata: {
      userId: 'user123',
      hubId: 'hub456',
      isUpgrade: 'true'
    }
  },
  key: 'myr' | 'other'
}

// Stripe creates checkout session
// Returns: checkout session URL
// Frontend redirects to Stripe hosted page
```

### 3. Stripe Webhook → Update Database

**Webhook Events**:

```
customer.subscription.created     → handleSubscription
customer.subscription.updated     → handleSubscriptionUpdate
invoice.payment_succeeded        → handleInvoiceUpdates
```

**handleSubscription Flow**:

```typescript
// Updates user document
await firestore
  .collection('users')
  .doc(userId)
  .set(
    {
      subscriptionId: 'sub_xxx',
      stripeCustomers: {
        myr: 'cus_xxx', // or 'other'
      },
      planId: 'prod_xxx',
    },
    { merge: true },
  );

// Updates hub document (if upgrade)
if (metadata.isUpgrade) {
  await db.ref().child(`hubs/${hubId}`).update({
    subscriptionId: 'sub_xxx',
    stripeCustomerId: 'cus_xxx',
    planId: 'prod_xxx',
    isSubscriptionCancelled: false,
  });
}
```

---

## 🚀 New Backend V2 Flow (MongoDB + Fastify)

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      PRICING PAGE                                │
│  GET /api/v1/subscription/plans                                 │
│  Returns: All plans (Scale, Soar) with both stripe accounts    │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    USER SELECTS PLAN                             │
│  Frontend determines region (malaysia/other) based on location │
│  Gets correct stripePriceId from plan data                      │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│            CREATE STRIPE CHECKOUT SESSION                        │
│  POST /api/v1/subscription/create-checkout-session             │
│  Body: { planCode, successUrl, cancelUrl }                     │
│  Returns: { checkoutUrl: 'https://checkout.stripe.com/...' }   │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│              USER COMPLETES PAYMENT ON STRIPE                    │
│  - Enters card details                                          │
│  - Stripe processes payment                                     │
│  - Creates subscription in Stripe                               │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                  STRIPE WEBHOOK FIRES                            │
│  POST /api/v1/webhook/stripe (from Stripe servers)             │
│  Event: customer.subscription.created                           │
│  Data: { subscription, customer, plan, metadata }               │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│               UPDATE DATABASE (MongoDB)                          │
│  1. Create Subscription document                                │
│  2. Update Hub document with subscriptionId                     │
│  3. Update User if needed                                       │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                USER REDIRECTED TO SUCCESS PAGE                   │
│  GET /api/v1/subscription/verify-session?session_id=xxx        │
│  Returns: { success: true, subscription: {...} }                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📋 API Endpoints Needed

### 1. GET /api/v1/subscription/plans ✅ (Already Exists)

**Purpose**: Get all available plans

**Response**:

```json
{
  "success": true,
  "data": {
    "plans": [
      {
        "planCode": "scale",
        "name": "Scale",
        "price": 9900,
        "currency": "USD",
        "stripePriceId": {
          "malaysia": "price_xxx_my",
          "atlas": "price_xxx_atlas"
        },
        "stripeProductId": {
          "malaysia": "prod_xxx_my",
          "atlas": "prod_xxx_atlas"
        },
        "features": [...]
      }
    ]
  }
}
```

---

### 2. POST /api/v1/subscription/create-checkout-session 🆕

**Purpose**: Create Stripe Checkout Session for subscription

**Authentication**: Required

**Request**:

```json
{
  "planCode": "scale",
  "successUrl": "https://app.mereka.dev/hub-dashboard?session_id={CHECKOUT_SESSION_ID}",
  "cancelUrl": "https://app.mereka.dev/pricing",
  "hubId": "hub_123", // Optional - for upgrades
  "promoCode": "LAUNCH50" // Optional
}
```

**Process**:

1. Get user from JWT
2. Get plan by planCode
3. Determine region from user's location (or hub location)
4. Get/Create Stripe customer
5. Create checkout session with correct price ID
6. Return checkout URL

**Response** (200):

```json
{
  "success": true,
  "data": {
    "checkoutUrl": "https://checkout.stripe.com/c/pay/cs_test_xxx",
    "sessionId": "cs_test_xxx"
  }
}
```

**Implementation**:

```typescript
export async function createCheckoutSession(
  request: FastifyRequest<{ Body: CreateCheckoutSessionInput }>,
  reply: FastifyReply,
) {
  try {
    const userId = getUserId(request);
    const { planCode, successUrl, cancelUrl, hubId, promoCode } = request.body;

    // Get user and determine region
    const user = await User.findById(userId);
    const region = determineRegion(user); // malaysia or other

    // Get plan and correct price ID
    const plan = await SubscriptionProduct.findOne({ planCode, isActive: true });
    if (!plan) {
      return reply.status(404).send({ error: 'Plan not found' });
    }

    const stripePriceId =
      region === 'malaysia' ? plan.stripePriceId.malaysia : plan.stripePriceId.atlas;

    // Get/Create Stripe customer
    const stripe = getStripeInstance(region);
    let stripeCustomer = await getOrCreateStripeCustomer(user, stripe);

    // Create checkout session
    const sessionData: any = {
      mode: 'subscription',
      customer: stripeCustomer.id,
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: userId,
        planCode: planCode,
        region: region,
      },
    };

    if (hubId) {
      sessionData.metadata.hubId = hubId;
      sessionData.metadata.isUpgrade = 'true';
    }

    if (promoCode) {
      // Validate and apply promo code
      const promotionCodes = await stripe.promotionCodes.list({
        code: promoCode,
        active: true,
      });
      if (promotionCodes.data.length > 0) {
        sessionData.discounts = [
          {
            promotion_code: promotionCodes.data[0].id,
          },
        ];
      }
    }

    const session = await stripe.checkout.sessions.create(sessionData);

    return reply.send({
      success: true,
      data: {
        checkoutUrl: session.url,
        sessionId: session.id,
      },
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to create checkout session');
    return reply.status(500).send({
      success: false,
      error: { message: 'Failed to create checkout session' },
    });
  }
}
```

---

### 3. POST /api/v1/webhook/stripe 🆕

**Purpose**: Handle Stripe webhooks

**Authentication**: Stripe signature verification

**Events to Handle**:

- `customer.subscription.created` - New subscription
- `customer.subscription.updated` - Subscription change/cancellation
- `customer.subscription.deleted` - Subscription ended
- `invoice.payment_succeeded` - Payment successful
- `invoice.payment_failed` - Payment failed

**Implementation**:

```typescript
export async function handleStripeWebhook(request: FastifyRequest, reply: FastifyReply) {
  try {
    const signature = request.headers['stripe-signature'] as string;
    const region = request.query.region as 'malaysia' | 'other';

    // Verify webhook signature
    const stripe = getStripeInstance(region);
    const webhookSecret = getWebhookSecret(region);

    const event = stripe.webhooks.constructEvent(request.body, signature, webhookSecret);

    // Handle different event types
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object, region);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object, region);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
    }

    return reply.send({ received: true });
  } catch (error) {
    request.log.error({ error }, 'Webhook error');
    return reply.status(400).send({ error: 'Webhook error' });
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription, region: string) {
  const metadata = subscription.metadata;

  // Create Subscription in MongoDB
  await Subscription.create({
    userId: metadata.userId,
    hubId: metadata.hubId || undefined,
    planCode: metadata.planCode,
    status: 'active',
    billingCycle: 'monthly',
    price: subscription.items.data[0].price.unit_amount || 0,
    currency: subscription.currency.toUpperCase(),
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    nextBillingDate: new Date(subscription.current_period_end * 1000),
    stripeCustomerId: subscription.customer as string,
    stripeSubscriptionId: subscription.id,
    createdBy: metadata.userId,
    lastUpdatedBy: metadata.userId,
  });

  // Update Hub if upgrade
  if (metadata.hubId && metadata.isUpgrade === 'true') {
    await Hub.findByIdAndUpdate(metadata.hubId, {
      subscriptionId: subscription.id,
      planCode: metadata.planCode,
      lastUpdatedBy: metadata.userId,
    });
  }

  // Send confirmation email
  // await sendSubscriptionConfirmationEmail(metadata.userId);
}
```

---

### 4. GET /api/v1/subscription/verify-session 🆕

**Purpose**: Verify checkout session and get subscription details

**Authentication**: Required

**Query Params**:

- `sessionId`: Checkout session ID from Stripe redirect

**Response**:

```json
{
  "success": true,
  "data": {
    "subscription": {
      "id": "sub_xxx",
      "planCode": "scale",
      "status": "active",
      "currentPeriodEnd": "2025-12-04T...",
      "nextBillingDate": "2025-12-04T..."
    }
  }
}
```

---

### 5. GET /api/v1/subscription/me 🆕

**Purpose**: Get user's current subscription(s)

**Authentication**: Required

**Response**:

```json
{
  "success": true,
  "data": {
    "subscriptions": [
      {
        "id": "sub_xxx",
        "planCode": "scale",
        "planName": "Scale",
        "status": "active",
        "price": 9900,
        "currency": "USD",
        "currentPeriodEnd": "2025-12-04T...",
        "nextBillingDate": "2025-12-04T...",
        "cancelAtPeriodEnd": false,
        "hubId": "hub_123"
      }
    ]
  }
}
```

---

### 6. POST /api/v1/subscription/cancel 🆕

**Purpose**: Cancel subscription (at period end)

**Authentication**: Required

**Request**:

```json
{
  "subscriptionId": "sub_xxx",
  "reason": "Too expensive" // Optional
}
```

**Response**:

```json
{
  "success": true,
  "message": "Subscription will cancel at period end",
  "data": {
    "cancelAt": "2025-12-04T..."
  }
}
```

---

## 🔐 Stripe Configuration

### Environment Variables

```bash
# Stripe API Keys (Test)
STRIPE_MALAYSIA_SECRET_KEY=sk_test_REDACTED...
STRIPE_ATLAS_SECRET_KEY=sk_test_REDACTED...

# Stripe Webhook Secrets
STRIPE_MALAYSIA_WEBHOOK_SECRET=whsec_REDACTED
STRIPE_ATLAS_WEBHOOK_SECRET=whsec_REDACTED

# Frontend URLs
FRONTEND_URL=https://app.mereka.dev
```

### Webhook Setup

**Webhook URLs**:

```
Malaysia:  https://api.mereka.dev/api/v1/webhook/stripe?region=malaysia
Atlas:     https://api.mereka.dev/api/v1/webhook/stripe?region=atlas
```

**Events to Subscribe**:

- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

---

## 🎯 Frontend Integration

### 1. Pricing Page

```typescript
// Load plans
async ngOnInit() {
  const response = await this.http.get('/api/v1/subscription/plans');
  this.plans = response.data.plans;
}

// User selects plan
async selectPlan(plan: any) {
  // Determine region
  const region = this.hubLocation === 'Malaysia' ? 'malaysia' : 'other';

  // Get correct price ID
  const stripePriceId = region === 'malaysia'
    ? plan.stripePriceId.malaysia
    : plan.stripePriceId.atlas;

  // Create checkout session
  const response = await this.http.post('/api/v1/subscription/create-checkout-session', {
    planCode: plan.planCode,
    successUrl: `${window.location.origin}/hub-dashboard?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${window.location.origin}/pricing`,
    hubId: this.hubId,  // If upgrading existing hub
  });

  // Redirect to Stripe
  window.location.href = response.data.checkoutUrl;
}
```

### 2. Success Page (Hub Dashboard)

```typescript
async ngOnInit() {
  const sessionId = this.route.snapshot.queryParams['session_id'];

  if (sessionId) {
    // Verify session and get subscription
    const response = await this.http.get(
      `/api/v1/subscription/verify-session?sessionId=${sessionId}`
    );

    if (response.success) {
      // Show success message
      this.showSuccessToast('Subscription activated!');

      // Reload hub data
      await this.loadHubData();
    }
  }
}
```

---

## 📊 Database Schema

### Subscription Collection

```typescript
{
  _id: ObjectId,
  userId: ObjectId,          // User who owns subscription
  hubId: ObjectId,           // Associated hub (optional)
  planCode: 'scale' | 'soar',

  // Status
  status: 'active' | 'past_due' | 'cancelled' | 'expired' | 'trialing',

  // Billing
  billingCycle: 'monthly' | 'yearly',
  price: 9900,               // In cents
  currency: 'USD',

  // Dates
  currentPeriodStart: Date,
  currentPeriodEnd: Date,
  nextBillingDate: Date,
  trialEndDate: Date,        // Optional
  cancelAt: Date,            // If cancellation scheduled

  // Stripe
  stripeCustomerId: 'cus_xxx',
  stripeSubscriptionId: 'sub_xxx',
  stripePaymentMethodId: 'pm_xxx',

  // Audit
  createdBy: ObjectId,
  lastUpdatedBy: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
```

---

## ✅ Implementation Checklist

### Phase 1: Core Subscription Flow

- [ ] Add Stripe SDK to backend
- [ ] Create Stripe service with dual account support
- [ ] Implement `createCheckoutSession` endpoint
- [ ] Implement `handleStripeWebhook` endpoint
- [ ] Implement `verifySession` endpoint
- [ ] Set up webhook endpoints in Stripe dashboard
- [ ] Test subscription creation flow

### Phase 2: Subscription Management

- [ ] Implement `GET /subscription/me` endpoint
- [ ] Implement `POST /subscription/cancel` endpoint
- [ ] Implement subscription update/upgrade flow
- [ ] Add promo code support

### Phase 3: Frontend Integration

- [ ] Update pricing page to call new API
- [ ] Create success page handler
- [ ] Add subscription status display in dashboard
- [ ] Add cancel subscription UI

### Phase 4: Testing

- [ ] Test Malaysia account flow
- [ ] Test Atlas account flow
- [ ] Test webhook handling
- [ ] Test subscription cancellation
- [ ] Test plan upgrades

---

## 🚀 Estimated Timeline

- **Phase 1**: 6-8 hours
- **Phase 2**: 4-6 hours
- **Phase 3**: 4 hours
- **Phase 4**: 4 hours

**Total**: ~18-22 hours

---

## 📝 Notes

1. **Region Detection**: Determine from user's hub location or user profile country
2. **Customer Creation**: Create Stripe customer on first subscription
3. **Idempotency**: Use Stripe's idempotency keys for checkout sessions
4. **Error Handling**: Handle payment failures, expired sessions, etc.
5. **Email Notifications**: Send confirmation emails on subscription events
6. **Webhook Security**: Always verify Stripe signatures
7. **Testing**: Use Stripe test cards and webhook testing tools

---

**Ready to implement?** 🚀
