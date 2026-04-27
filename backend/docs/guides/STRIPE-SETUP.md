# Stripe Environment Variables Setup

## Quick Start

Copy the example variables and add your actual keys:

```bash
# Copy from .env.example
cp .env.example .env

# Then replace with your actual Stripe keys
```

## Required Environment Variables

⚠️ **All variables below are required. Webhook signature verification is mandatory.**

Add these to your `.env` file:

```bash
# Stripe API Keys
# Test keys - use live keys in production
STRIPE_MALAYSIA_SECRET_KEY=sk_test_REDACTED
STRIPE_ATLAS_SECRET_KEY=sk_test_REDACTED

# Stripe Webhook Secrets (MANDATORY - get these from Stripe Dashboard or Stripe CLI)
STRIPE_MALAYSIA_WEBHOOK_SECRET=whsec_REDACTED
STRIPE_ATLAS_WEBHOOK_SECRET=whsec_REDACTED
```

## For Production

Replace with live keys:

```bash
# Production keys (commented from cloud functions)
# STRIPE_MALAYSIA_SECRET_KEY=sk_live_REDACTED
# STRIPE_ATLAS_SECRET_KEY=sk_live_REDACTED
```

## Setting up Webhooks in Stripe

### 1. Malaysia Account Webhook

1. Go to https://dashboard.stripe.com/test/webhooks
2. Click "Add endpoint"
3. URL: `https://your-domain.com/api/v1/webhook/stripe?region=malaysia`
4. Events to listen for:
   - `customer.subscription.created`
   - `customer.subscription.updated`
5. Copy the webhook secret and add to `.env` as `STRIPE_MALAYSIA_WEBHOOK_SECRET`

### 2. Atlas Account Webhook

1. Switch to Atlas account in Stripe dashboard
2. Follow same steps as above
3. URL: `https://your-domain.com/api/v1/webhook/stripe?region=atlas`
4. Events to listen for:
   - `customer.subscription.created`
   - `customer.subscription.updated`
5. Copy webhook secret and add to `.env` as `STRIPE_ATLAS_WEBHOOK_SECRET`

## Testing Webhooks Locally

Use Stripe CLI to forward webhooks to your local server:

```bash
# Install Stripe CLI
# https://stripe.com/docs/stripe-cli

# Forward Malaysia webhooks
stripe listen --forward-to localhost:3000/api/v1/webhook/stripe?region=malaysia

# Forward Atlas webhooks
stripe listen --forward-to localhost:3000/api/v1/webhook/stripe?region=atlas
```

## Verify Setup

1. Start your server: `npm run dev`
2. Check logs for: "Stripe instances initialized for both regions"
3. Test webhook endpoint:
   ```bash
   curl -X POST http://localhost:3000/api/v1/webhook/stripe?region=malaysia \
     -H "stripe-signature: test"
   ```

## Important Notes

- ⚠️ **Webhook signature verification is mandatory** - requests without valid signatures will be rejected
- Never commit `.env` file to git
- Use different keys for development/staging/production
- Rotate keys regularly
- Monitor webhook delivery in Stripe Dashboard

## Additional Documentation

For comprehensive webhook integration details, see [STRIPE-WEBHOOKS.md](../features/subscription/STRIPE-WEBHOOKS.md)
