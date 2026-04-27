# 📋 Hub Pricing & Form Selection

**Page**: app.mereka.dev/hub-onboard/form
**Purpose**: Plan selection before hub onboarding

---

## 🎯 Flow Overview

```
User clicks "Create Hub"
    ↓
Navigate to: /hub-onboard/form (Pricing page)
    ↓
Shows: Scale vs Soar plan options
    ↓
User selects plan
    ↓
Stores: planCode in session/state
    ↓
Navigate to: /hub-onboard/profile
    ↓
Onboarding form customized based on plan
```

---

## 📊 Plans Available

### Scale Plan

**For**: Solo experts, small consultancies
**Price**: (Check Stripe for current pricing)
**Features**:

- Create hub profile
- Expert profile included
- Full onboarding (all fields)
- Can add experiences
- Can add qualifications
- Job preferences
- Team collaboration

**Onboarding includes:**

- Expert data (title, skills, portfolio, rates)
- Hub data (name, location, services)

### Soar Plan

**For**: Organizations, makerspaces, coworking
**Price**: (Check Stripe for current pricing)
**Features**:

- Create hub profile only
- Simplified onboarding
- No expert profile needed
- Focus on space/facilities
- Team management

**Onboarding includes:**

- Hub data only (name, location, amenities)

---

## 🔄 Frontend Flow

### 1. Pricing Page (/hub-onboard/form)

**User sees:**

- Plan comparison (Scale vs Soar)
- Features list
- Pricing
- "Select Plan" buttons

**User action:**

- Clicks "Select Scale" or "Select Soar"

**Frontend:**

```typescript
// Save selected plan
hubOnboardFormService.hubPlanCode = 'scale'; // or 'soar'
hubOnboardFormService.hubPlan = selectedPlanData;

// Navigate to onboarding
router.navigate(['/hub-onboard/profile']);
```

### 2. Onboarding Form (Customized by Plan)

**If Scale:**

- Shows all expert fields
- Shows all hub fields
- Full 4-step process

**If Soar:**

- Shows hub fields only
- Simplified 3-step process
- Skips expert-specific fields

---

## 📋 APIs Needed

### 1. GET /api/v1/plans

**Purpose**: Get available subscription plans with pricing

**Response**:

```json
{
  "success": true,
  "data": {
    "plans": [
      {
        "code": "scale",
        "name": "Scale",
        "description": "For solo experts and consultants",
        "price": {
          "monthly": 99,
          "yearly": 999,
          "currency": "USD"
        },
        "features": [
          "Expert profile",
          "Hub profile",
          "Full onboarding",
          "Add experiences",
          "Job preferences",
          "Team collaboration"
        ],
        "limits": {
          "teamMembers": 5,
          "experiences": 10
        }
      },
      {
        "code": "soar",
        "name": "Soar",
        "description": "For organizations and spaces",
        "price": {
          "monthly": 199,
          "yearly": 1999,
          "currency": "USD"
        },
        "features": [
          "Hub profile",
          "Simplified onboarding",
          "Team management",
          "Unlimited experiences",
          "Analytics"
        ],
        "limits": {
          "teamMembers": 20,
          "experiences": -1
        }
      }
    ]
  }
}
```

---

### 2. POST /api/v1/hub/init

**Purpose**: Initialize hub creation with selected plan

**Request**:

```json
{
  "planCode": "scale"
}
```

**Response**:

```json
{
  "success": true,
  "data": {
    "hubId": "temp-id-12345", // Temporary ID before completion
    "planCode": "scale",
    "requiredFields": ["name", "slug", "logo", "expertProfile.title", "expertProfile.skills"],
    "optionalFields": ["description", "amenities", "gallery"],
    "onboardingSteps": ["profile", "details", "about", "confirm"]
  },
  "message": "Hub initialization successful"
}
```

**Purpose:**

- Creates draft hub
- Returns what fields are required/optional based on plan
- Frontend uses this to show/hide fields

---

### 3. POST /api/v1/subscription

**Purpose**: Create subscription when user selects plan

**Request**:

```json
{
  "planCode": "scale",
  "billingCycle": "monthly", // or "yearly"
  "paymentMethodId": "pm_xxx" // Stripe payment method
}
```

**Response**:

```json
{
  "success": true,
  "data": {
    "subscriptionId": "sub_xxx",
    "planCode": "scale",
    "status": "active",
    "currentPeriodEnd": "2025-12-03T...",
    "nextBillingDate": "2025-12-03T..."
  }
}
```

**Note**: This might integrate with Stripe

---

## 🗄️ Database Design for Plans

### Plan Collection (Configuration)

```typescript
{
  _id: ObjectId,
  code: 'scale' | 'soar',
  name: string,
  description: string,
  price: {
    monthly: number,
    yearly: number,
    currency: string
  },
  features: string[],
  limits: {
    teamMembers: number,
    experiences: number
  },
  requiredFields: {
    hub: string[],
    expert: string[]
  },
  isActive: boolean,
  createdAt: Date
}
```

### Subscription Collection

```typescript
{
  _id: ObjectId,
  userId: ObjectId,
  hubId: ObjectId,  // Associated hub (if any)
  planCode: string,
  status: 'active' | 'cancelled' | 'expired',
  billingCycle: 'monthly' | 'yearly',
  price: number,
  currency: string,
  currentPeriodStart: Date,
  currentPeriodEnd: Date,
  stripeSubscriptionId: string,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🎯 APIs Summary

### For Pricing Page:

1. **GET /api/v1/plans** - List available plans with pricing
2. **POST /api/v1/hub/init** - Initialize hub with plan (optional)

### For Subscription:

3. **POST /api/v1/subscription** - Create subscription
4. **GET /api/v1/subscription/me** - Get my subscriptions
5. **PATCH /api/v1/subscription/:id** - Update/cancel subscription

---

## 💡 Simplified Approach (For Now)

**Phase 1: Skip subscription/payment**

- Hardcode plan selection
- Store planCode in Hub
- No payment integration yet
- Focus on onboarding APIs

**Phase 2: Add subscription later**

- Integrate Stripe
- Subscription management
- Plan limits enforcement

**Recommendation**: Start with just storing `planCode` in Hub, add subscription APIs later.

---

**Want me to create the basic Hub onboarding APIs first (without payment)?** 🚀
