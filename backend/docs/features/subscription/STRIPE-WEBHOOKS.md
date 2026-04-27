# Stripe Webhook Integration

This document explains how Stripe webhooks are configured and used in the Mereka backend.

## Overview

The Mereka backend handles Stripe webhooks to process subscription lifecycle events. Webhook signature verification is **mandatory** for security.

## Configuration

### Environment Variables

Add these to your `.env` file:

```bash
# Stripe API Keys
STRIPE_MALAYSIA_SECRET_KEY=sk_test_REDACTED
STRIPE_ATLAS_SECRET_KEY=sk_test_REDACTED

# Stripe Webhook Secrets (mandatory)
STRIPE_MALAYSIA_WEBHOOK_SECRET=whsec_REDACTED
STRIPE_ATLAS_WEBHOOK_SECRET=whsec_REDACTED
```

### Webhook Endpoints

- **Malaysian Stripe Account**: `https://api.mereka.dev/api/v1/webhook/stripe?region=malaysia`
- **Atlas Stripe Account**: `https://api.mereka.dev/api/v1/webhook/stripe?region=atlas`

## Supported Events

The webhook handler processes these Stripe events:

- `customer.subscription.created` - When a new subscription is created
- `customer.subscription.updated` - When a subscription is updated

## Security

### Signature Verification

All webhook requests **must** include a valid Stripe signature header. The signature is verified using the webhook secret configured for the region.

**Requests without valid signatures will be rejected with a 401 Unauthorized response.**

### Raw Body Requirement

Stripe signature verification requires the raw request body. The backend is configured to preserve the raw body for all JSON requests while still parsing JSON for normal use.

## Local Development

### Using Stripe CLI

For local testing, use the Stripe CLI to forward webhooks:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to your Stripe account
stripe login

# Forward webhooks to local backend
stripe listen --forward-to "http://localhost:4000/api/v1/webhook/stripe?region=malaysia"
```

The CLI will provide a webhook signing secret (e.g., `whsec_REDACTED`). Add this to your `.env` file:

```bash
STRIPE_MALAYSIA_WEBHOOK_SECRET=whsec_REDACTED
```

### Testing Webhooks

Trigger test events using the Stripe CLI:

```bash
# Test subscription created event
stripe trigger customer.subscription.created \
  --add subscription:metadata.userId="USER_ID" \
  --add subscription:metadata.planCode="soar" \
  --add subscription:metadata.region="malaysia"

# Test subscription updated event
stripe trigger customer.subscription.updated \
  --add subscription:metadata.userId="USER_ID" \
  --add subscription:metadata.planCode="soar" \
  --add subscription:metadata.region="malaysia"
```

## Production Setup

### Configure Stripe Dashboard

1. Go to [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. **For Malaysian account:**
   - URL: `https://api.mereka.dev/api/v1/webhook/stripe?region=malaysia`
   - Events: `customer.subscription.created`, `customer.subscription.updated`
4. **For Atlas account:**
   - URL: `https://api.mereka.dev/api/v1/webhook/stripe?region=atlas`
   - Events: `customer.subscription.created`, `customer.subscription.updated`
5. Copy the webhook signing secret
6. Add to production `.env` file

### Required Metadata

Checkout sessions must include the following metadata for webhooks to work correctly:

```typescript
{
  userId: string;    // MongoDB user ID
  planCode: string;  // Plan code (e.g., "scale", "soar")
  region: string;    // Region ("malaysia" or "atlas")
  hubId?: string;    // Optional: Hub ID if subscribing for a specific hub
}
```

This metadata is automatically passed from the checkout session to the subscription object.

## Implementation Details

### Webhook Handler Flow

1. Receive webhook request
2. Validate `stripe-signature` header (mandatory)
3. Validate `region` query parameter
4. Extract raw request body
5. Verify signature using Stripe SDK
6. Parse webhook event
7. Route to appropriate handler based on event type
8. Process subscription in MongoDB
9. Return success response

### Code Location

- **Controller**: `src/controllers/subscription.controller.ts` - `handleStripeWebhook()`
- **Routes**: `src/routes/subscription.routes.ts` - `webhookRoutes()`
- **Service**: `src/services/subscription.service.ts` - Event handlers
- **Stripe Service**: `src/services/stripe.service.ts` - Signature verification

### Raw Body Configuration

The raw body parser is configured in `src/app.ts`:

```typescript
fastify.addContentTypeParser(
  'application/json',
  { parseAs: 'buffer' },
  async (req: FastifyRequest, body: Buffer) => {
    // Store raw body for Stripe signature verification
    (req as any).rawBody = body;
    // Parse JSON for normal use
    return JSON.parse(body.toString('utf8'));
  },
);
```

## Monitoring

### Backend Logs

Successful webhook processing logs:

```
[INFO] Webhook received { region: 'malaysia', url: '/api/v1/webhook/stripe?region=malaysia' }
[INFO] Verifying webhook signature...
[INFO] ✅ Webhook signature verified
[INFO] Processing webhook event { eventType: 'customer.subscription.created' }
[INFO] Subscription created { subscriptionId: 'sub_xxxxx' }
```

### Stripe Dashboard

Monitor webhook events in:

- Stripe Dashboard > Developers > Webhooks
- View event history and delivery status
- Retry failed webhook deliveries

## Troubleshooting

### Signature Verification Failed

**Cause**: Incorrect webhook secret or corrupted request body

**Solution**:

1. Verify webhook secret matches Stripe Dashboard
2. Ensure raw body is preserved (check `app.ts` configuration)
3. Check Stripe CLI is using correct region endpoint

### Missing Stripe-Signature Header

**Cause**: Request not coming from Stripe

**Solution**: Ensure webhooks are configured in Stripe Dashboard or using Stripe CLI

### Subscription Not Created in Database

**Cause**: Missing or invalid metadata in subscription

**Solution**:

1. Check checkout session includes required metadata
2. Verify `subscription_data.metadata` is set when creating checkout session
3. Check backend logs for specific error messages

## Additional Resources

- [Stripe Webhooks Documentation](https://stripe.com/docs/webhooks)
- [Stripe CLI Documentation](https://stripe.com/docs/cli)
- [Webhook Best Practices](https://stripe.com/docs/webhooks/best-practices)
