# 🔄 Complete Hub Creation Flow

**Based on**: app.mereka.dev actual flow

---

## 📊 Actual Flow (Payment First!)

```
1. User clicks "Create Hub"
   ↓
2. Navigate to: /hub-onboard/form (PRICING PAGE)
   Shows: Scale vs Soar plan comparison
   ↓
3. User selects plan (Scale or Soar)
   ↓
4. Payment happens (Stripe checkout)
   • Creates subscription
   • Stores in Firestore
   ↓
5. ✅ Payment successful
   ↓
6. Redirect to: /hub-onboard/profile (or dashboard)
   ↓
7. Complete hub onboarding
   • Fill hub details
   • Upload images
   • Set location, hours
   • (For Scale: Also fill expert profile)
   ↓
8. Hub created and active!
```

---

## 🎯 Key Insight

**Payment happens BEFORE onboarding!**

This means:

- User pays first
- Gets subscription
- THEN completes hub setup
- Subscription is already active

---

## 📋 APIs Needed (Correct Order)

### Step 1: Plan Selection & Payment

#### GET /api/v1/plans

**Purpose**: Show available plans on pricing page

**Response**:

```json
{
  "success": true,
  "data": {
    "plans": [
      {
        "code": "scale",
        "name": "Scale",
        "tagline": "For solo experts and consultants",
        "price": {
          "monthly": 99,
          "yearly": 990,
          "currency": "USD"
        },
        "features": [
          "Expert profile",
          "Business hub",
          "Portfolio showcase",
          "Job marketplace access",
          "Up to 5 team members"
        ],
        "stripePriceId": "price_xxx_monthly"
      },
      {
        "code": "soar",
        "name": "Soar",
        "tagline": "For organizations and spaces",
        "price": {
          "monthly": 199,
          "yearly": 1990,
          "currency": "USD"
        },
        "features": [
          "Business hub",
          "Unlimited team members",
          "Advanced analytics",
          "Priority support",
          "White-label options"
        ],
        "stripePriceId": "price_yyy_monthly"
      }
    ]
  }
}
```

---

#### POST /api/v1/subscription/create-checkout

**Purpose**: Create Stripe checkout session for payment

**Request**:

```json
{
  "planCode": "scale",
  "billingCycle": "monthly",
  "successUrl": "https://app.mereka.io/hub-onboard/profile",
  "cancelUrl": "https://app.mereka.io/hub-onboard/form"
}
```

**Response**:

```json
{
  "success": true,
  "data": {
    "checkoutUrl": "https://checkout.stripe.com/...",
    "sessionId": "cs_xxx"
  }
}
```

**Flow:**

1. Backend creates Stripe checkout session
2. Returns checkout URL
3. Frontend redirects to Stripe
4. User completes payment
5. Stripe redirects back to successUrl

---

#### POST /api/v1/webhooks/stripe (Webhook)

**Purpose**: Stripe calls this after successful payment

**What happens:**

```
Stripe payment successful
  ↓
Stripe webhook: POST /webhooks/stripe
  ↓
Backend:
  1. Verify webhook signature
  2. Create Subscription record
  3. Update User with subscriptionId
  4. Create draft Hub (if doesn't exist)
  5. Set user.planCode = 'scale' or 'soar'
```

---

### Step 2: Hub Onboarding (After Payment)

#### POST /api/v1/hub

**Purpose**: Create/update hub during onboarding

**Request (Scale plan - includes expert data)**:

```json
{
  "planCode": "scale",

  // Hub data
  "hub": {
    "name": "Design Studio",
    "slug": "design-studio",
    "logo": "https://...",
    "phoneNumber": "+60123456789",
    "location": {...},
    "description": "...",
    "amenities": [...],
    "gallery": [...]
  },

  // Expert data (Scale only)
  "expert": {
    "title": "Senior Designer",
    "skills": ["UI", "UX"],
    "portfolio": [...],
    "hourlyRate": 50
  }
}
```

**Request (Soar plan - hub only)**:

```json
{
  "planCode": "soar",

  "hub": {
    "name": "Maker Space",
    "slug": "maker-space"
    // ... hub data only
  }
}
```

---

#### GET /api/v1/hub/me

**Purpose**: Get user's hubs (for dashboard)

**Response**:

```json
{
  "success": true,
  "data": {
    "hubs": [
      {
        "id": "...",
        "name": "Design Studio",
        "slug": "design-studio",
        "planCode": "scale",
        "status": "DRAFT",
        "onboardingComplete": false,
        "subscription": {
          "status": "active",
          "planCode": "scale",
          "nextBilling": "2025-12-03"
        }
      }
    ]
  }
}
```

---

## 🗄️ Database Collections Needed

### 1. Subscription Collection

```typescript
{
  _id: ObjectId,
  userId: ObjectId,
  planCode: 'scale' | 'soar',
  status: 'active' | 'cancelled' | 'past_due',
  billingCycle: 'monthly' | 'yearly',
  price: number,
  currency: string,

  // Stripe
  stripeCustomerId: string,
  stripeSubscriptionId: string,
  stripePaymentMethodId: string,

  // Billing dates
  currentPeriodStart: Date,
  currentPeriodEnd: Date,
  nextBillingDate: Date,

  // Associated resources
  hubId: ObjectId,  // Hub created with this subscription

  createdAt: Date,
  updatedAt: Date
}
```

### 2. Hub Collection

```typescript
{
  _id: ObjectId,
  ownerId: ObjectId,
  subscriptionId: ObjectId,  // Link to subscription

  // ... all hub fields
  planCode: 'scale' | 'soar',
  status: 'DRAFT' | 'ACTIVE',
  onboardingComplete: boolean
}
```

### 3. User Collection (Extended)

```typescript
{
  // ... existing fields

  // Subscription
  activeSubscriptionId: ObjectId,  // Current active subscription

  // Expert Profile (Scale plan only)
  expertProfile: {
    title, skills, portfolio, hourlyRate, etc.
  }
}
```

---

## 🎯 Complete API List for Hub Flow

### Pricing & Payment

1. **GET /api/v1/plans** - List plans with pricing
2. **POST /api/v1/subscription/create-checkout** - Create Stripe checkout
3. **POST /api/v1/webhooks/stripe** - Handle payment webhook
4. **GET /api/v1/subscription/me** - Get my subscription

### Hub Onboarding (After Payment)

5. **POST /api/v1/hub** - Create/update hub
6. **GET /api/v1/hub/me** - Get my hubs
7. **GET /api/v1/hub/:hubId** - Get specific hub
8. **PATCH /api/v1/hub/:hubId** - Update hub
9. **POST /api/v1/hub/:hubId/complete** - Mark onboarding complete

### Expert Profile (Scale plan only)

10. **POST /api/v1/expert/profile** - Create/update expert profile
11. **GET /api/v1/expert/profile/me** - Get my expert profile

### Slug (Reuse existing)

12. **POST /api/v1/slug/check** - Check slug availability (already built!)

---

## 🚀 Implementation Priority

### Phase 1: Basic Hub (Skip Payment for Now)

- POST /hub - Create hub
- GET /hub/me - Get my hubs
- PATCH /hub/:id - Update hub
- Hardcode planCode for testing

### Phase 2: Expert Profile (Scale plan)

- POST /expert/profile
- GET /expert/profile/me

### Phase 3: Payment & Subscription (Later)

- Stripe integration
- Webhook handling
- Subscription management

---

**Recommendation**: Start with Phase 1 (basic hub APIs without payment). Add Stripe later.

**Sound good?** 🚀
