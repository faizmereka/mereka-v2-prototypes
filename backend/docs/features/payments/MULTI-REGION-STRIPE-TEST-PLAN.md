# Multi-Region Stripe Test Plan

This document provides curl commands and test scenarios for testing the multi-region Stripe implementation.

---

## Prerequisites

### 1. Environment Setup

```bash
# Set your base URL
export BASE_URL="http://localhost:3000/api/v1"

# Get auth token (login as test user)
export AUTH_TOKEN="your-firebase-auth-token"

# Test hub IDs (replace with actual IDs)
export MY_HUB_ID="malaysian-hub-id"        # Hub in Malaysia
export ATLAS_HUB_ID="singapore-hub-id"     # Hub outside Malaysia

# Test user IDs
export MY_USER_ID="malaysian-user-id"
export ATLAS_USER_ID="singapore-user-id"
```

### 2. Verify Environment Variables

```bash
# Check that Stripe keys are configured
curl -X GET "$BASE_URL/health" \
  -H "Content-Type: application/json"
```

---

## Test Suite 1: Hub Stripe Account (Regional)

### 1.1 Create Malaysian Hub Stripe Account

```bash
# Create Stripe account for Malaysian hub
# Should use MY Stripe platform
curl -X POST "$BASE_URL/hub/$MY_HUB_ID/stripe/account" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" | jq '.'

# Expected: stripeRegion: "malaysia"
```

### 1.2 Create Atlas Hub Stripe Account

```bash
# Create Stripe account for non-Malaysian hub
# Should use Atlas Stripe platform
curl -X POST "$BASE_URL/hub/$ATLAS_HUB_ID/stripe/account" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" | jq '.'

# Expected: stripeRegion: "atlas"
```

### 1.3 Get Hub Stripe Account Status

```bash
# Get MY hub account status
curl -X GET "$BASE_URL/hub/$MY_HUB_ID/stripe/account" \
  -H "Authorization: Bearer $AUTH_TOKEN" | jq '.'

# Get Atlas hub account status
curl -X GET "$BASE_URL/hub/$ATLAS_HUB_ID/stripe/account" \
  -H "Authorization: Bearer $AUTH_TOKEN" | jq '.'
```

### 1.4 Create Hub Onboarding Link

```bash
# Create onboarding link for MY hub
curl -X POST "$BASE_URL/hub/$MY_HUB_ID/stripe/onboarding-link" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "returnUrl": "http://localhost:4200/hub/settings/payments",
    "refreshUrl": "http://localhost:4200/hub/settings/payments"
  }' | jq '.'
```

---

## Test Suite 2: User Stripe Account (Regional)

### 2.1 Create User Stripe Account (Hub Owner)

```bash
# Create Stripe account for user who owns MY hub
# Should use Malaysia platform
curl -X POST "$BASE_URL/user/stripe/account" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" | jq '.'

# Expected for MY hub owner: stripeRegion: "malaysia"
```

### 2.2 Get User Stripe Account

```bash
curl -X GET "$BASE_URL/user/stripe/account" \
  -H "Authorization: Bearer $AUTH_TOKEN" | jq '.'
```

---

## Test Suite 3: Hub Transactions (Regional)

### 3.1 Get Hub Balance

```bash
# Get MY hub balance (should use MY Stripe)
curl -X GET "$BASE_URL/hub/$MY_HUB_ID/transactions/balance" \
  -H "Authorization: Bearer $AUTH_TOKEN" | jq '.'

# Get Atlas hub balance (should use Atlas Stripe)
curl -X GET "$BASE_URL/hub/$ATLAS_HUB_ID/transactions/balance" \
  -H "Authorization: Bearer $AUTH_TOKEN" | jq '.'
```

### 3.2 Get Hub Earnings

```bash
curl -X GET "$BASE_URL/hub/$MY_HUB_ID/transactions/earnings" \
  -H "Authorization: Bearer $AUTH_TOKEN" | jq '.'
```

---

## Test Suite 4: User Transactions (Regional)

### 4.1 Get User Balance

```bash
curl -X GET "$BASE_URL/user/transactions/balance" \
  -H "Authorization: Bearer $AUTH_TOKEN" | jq '.'
```

### 4.2 Get User Earnings

```bash
curl -X GET "$BASE_URL/user/transactions/earnings" \
  -H "Authorization: Bearer $AUTH_TOKEN" | jq '.'
```

---

## Test Suite 5: Hub Withdrawals (Regional)

### 5.1 Get Hub Withdrawals

```bash
curl -X GET "$BASE_URL/hub/$MY_HUB_ID/withdrawals" \
  -H "Authorization: Bearer $AUTH_TOKEN" | jq '.'
```

### 5.2 Create Hub Withdrawal

```bash
curl -X POST "$BASE_URL/hub/$MY_HUB_ID/withdrawals" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 10000,
    "currency": "MYR",
    "description": "Test withdrawal"
  }' | jq '.'
```

---

## Test Suite 6: Hub Bank Accounts (Regional)

### 6.1 Get Hub Bank Accounts

```bash
curl -X GET "$BASE_URL/hub/$MY_HUB_ID/bank-accounts" \
  -H "Authorization: Bearer $AUTH_TOKEN" | jq '.'
```

### 6.2 Add Hub Bank Account

```bash
curl -X POST "$BASE_URL/hub/$MY_HUB_ID/bank-accounts" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "accountNumber": "1234567890",
    "routingNumber": "MABORUMYKL",
    "accountHolderName": "Test Account",
    "accountHolderType": "company",
    "currency": "MYR",
    "country": "MY"
  }' | jq '.'
```

---

## Test Suite 7: Experience Checkout (Hub's Region)

### 7.1 Initialize Experience Checkout (MY Hub)

```bash
# Get experience and event IDs first
export EXPERIENCE_SLUG="test-experience"
export EVENT_ID="event-id-here"

# Initialize checkout - should return MY publishable key
curl -X POST "$BASE_URL/checkout/experience/init" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "experienceSlug": "'$EXPERIENCE_SLUG'",
    "eventId": "'$EVENT_ID'",
    "tickets": [
      { "ticketId": "ticket-id", "quantity": 1 }
    ]
  }' | jq '.'

# Expected for MY hub experience:
# - stripeRegion: "malaysia"
# - stripePublishableKey: "pk_test_REDACTED..."
```

### 7.2 Initialize Experience Checkout (Atlas Hub)

```bash
# Same but for Atlas hub experience
# Should return Atlas publishable key
# Expected:
# - stripeRegion: "atlas"
# - stripePublishableKey: "pk_test_REDACTED..."
```

---

## Test Suite 8: Expertise Checkout (Hub's Region)

### 8.1 Initialize Expertise Checkout

```bash
export EXPERTISE_SLUG="test-expertise"
export TICKET_ID="ticket-id-here"

curl -X POST "$BASE_URL/checkout/expertise/init" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "expertiseSlug": "'$EXPERTISE_SLUG'",
    "ticketId": "'$TICKET_ID'",
    "date": "2025-03-15",
    "time": "10:00"
  }' | jq '.'

# Expected: stripeRegion and stripePublishableKey based on hub's region
```

---

## Test Suite 9: Webhooks (Multi-Region)

### 9.1 Test Malaysia Webhook

```bash
# Simulate webhook from MY Stripe account
curl -X POST "$BASE_URL/webhook?region=malaysia" \
  -H "Content-Type: application/json" \
  -H "stripe-signature: test-signature" \
  -d '{
    "type": "payment_intent.succeeded",
    "data": { "object": { "id": "pi_test" } }
  }' | jq '.'

# Should verify with MY webhook secret
```

### 9.2 Test Atlas Webhook

```bash
# Simulate webhook from Atlas Stripe account
curl -X POST "$BASE_URL/webhook?region=atlas" \
  -H "Content-Type: application/json" \
  -H "stripe-signature: test-signature" \
  -d '{
    "type": "payment_intent.succeeded",
    "data": { "object": { "id": "pi_test" } }
  }' | jq '.'

# Should verify with Atlas webhook secret
```

### 9.3 Test Default Webhook (No Region)

```bash
# Webhook without region param - should default to Atlas
curl -X POST "$BASE_URL/webhook" \
  -H "Content-Type: application/json" \
  -H "stripe-signature: test-signature" \
  -d '{
    "type": "payment_intent.succeeded",
    "data": { "object": { "id": "pi_test" } }
  }' | jq '.'
```

---

## Test Suite 10: Contract Payments (Expert's Region)

### 10.1 Verify Payment Region in Database

```bash
# After creating a milestone payment, verify the stripeRegion field
# Use MongoDB shell or Compass to check:

# For MY expert: stripeRegion should be "malaysia"
# For Atlas expert: stripeRegion should be "atlas"
```

---

## Test Suite 11: Migration Script

### 11.1 Run Migration Dry Run

```bash
cd /Users/hiramaniupadhyay/Documents/projects/Mereka/v2/mereka-backend-v2

# Dry run - analyze without changes
npx tsx scripts/migrations/migrate-stripe-regions.ts --dry-run
```

### 11.2 Run Migration

```bash
# Apply migration
npx tsx scripts/migrations/migrate-stripe-regions.ts --migrate
```

---

## Cross-Region Test Scenarios

### Scenario 1: MY Hub Hires SG Expert

1. Hub in Malaysia (`stripeRegion: "malaysia"`)
2. Expert in Singapore (`stripeRegion: "atlas"`)
3. Create contract and milestone
4. Fund milestone:
   - Payment should go to **Atlas** platform (expert's region)
   - `ContractPayment.stripeRegion` should be `"atlas"`
5. Release milestone and transfer:
   - Transfer uses same region as payment (`"atlas"`)

### Scenario 2: SG Hub Hires MY Expert

1. Hub in Singapore (`stripeRegion: "atlas"`)
2. Expert in Malaysia (`stripeRegion: "malaysia"`)
3. Create contract and milestone
4. Fund milestone:
   - Payment should go to **Malaysia** platform (expert's region)
   - `ContractPayment.stripeRegion` should be `"malaysia"`
5. Release milestone and transfer:
   - Transfer uses same region as payment (`"malaysia"`)

### Scenario 3: MY Hub Experience Checkout

1. Hub in Malaysia (`stripeRegion: "malaysia"`)
2. User books experience
3. Checkout should:
   - Return `stripePublishableKey` for Malaysia
   - Create PaymentIntent on MY Stripe

### Scenario 4: SG Hub Experience Checkout

1. Hub in Singapore (`stripeRegion: "atlas"`)
2. User books experience
3. Checkout should:
   - Return `stripePublishableKey` for Atlas
   - Create PaymentIntent on Atlas Stripe

---

## Validation Checklist

### API Response Checks

- [ ] Hub Stripe account creation returns correct `stripeRegion`
- [ ] User Stripe account creation returns correct `stripeRegion`
- [ ] Experience checkout returns `stripePublishableKey` and `stripeRegion`
- [ ] Expertise checkout returns `stripePublishableKey` and `stripeRegion`
- [ ] Balance/earnings use correct regional Stripe

### Database Checks

- [ ] Hub documents have `stripeRegion` field set correctly
- [ ] User documents have `stripeRegion` field set correctly
- [ ] ContractPayment documents have `stripeRegion` field set correctly

### Stripe Dashboard Checks

- [ ] MY account shows connected accounts for Malaysian hubs
- [ ] Atlas account shows connected accounts for non-Malaysian hubs
- [ ] Webhooks configured with correct endpoint URLs

---

## Troubleshooting

### Common Issues

1. **"Stripe API error: Invalid API Key"**
   - Check that `STRIPE_MY_SECRET_KEY` and `STRIPE_ATLAS_SECRET_KEY` are set

2. **"Webhook signature verification failed"**
   - Ensure `?region=` parameter matches the Stripe account
   - Check webhook secrets in environment variables

3. **"Transfer failed: destination account not on same platform"**
   - Payment and transfer must use same regional Stripe
   - Verify `ContractPayment.stripeRegion` is set correctly

4. **"Customer not found"**
   - Customers are regional - MY customer doesn't exist on Atlas
   - `getOrCreateCustomer` should be called on same regional service

---

_Last updated: 2025-03-11_
