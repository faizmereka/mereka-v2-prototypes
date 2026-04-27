# 🎯 Pricing Page API Plan

**Page**: `app.mereka.dev/hub-onboard/form` (choose-plan-v2)  
**Status**: Planning Phase  
**Date**: 2025-11-04

---

## 📊 Current State Analysis

### ✅ What We Have (Backend)

**Endpoints**:

1. `GET /api/v1/subscription/plans` - Get all active plans ✅
2. `GET /api/v1/subscription/plans/:planCode` - Get specific plan ✅
3. `POST /api/v1/subscription/plans` - Create plan (admin) ✅
4. `PATCH /api/v1/subscription/plans/:planCode` - Update plan (admin) ✅
5. `DELETE /api/v1/subscription/plans/:planCode` - Delete plan (admin) ✅

**Model**: `SubscriptionProduct`

```typescript
{
  planCode: 'scale' | 'soar',
  name: string,
  tagline: string,
  description: string,
  price: number,              // In cents (e.g., 9900 = $99)
  currency: string,           // 'USD'
  stripePriceId: {
    malaysia: string,
    atlas: string
  },
  stripeProductId: {
    malaysia: string,
    atlas: string
  },
  features: string[],
  isActive: boolean,
  sortOrder: number
}
```

**Response Format**:

```json
{
  "success": true,
  "data": {
    "plans": [
      {
        "_id": "...",
        "planCode": "scale",
        "name": "Scale",
        "tagline": "For solo experts and consultants",
        "description": "Perfect for freelancers...",
        "price": 9900,
        "currency": "USD",
        "stripePriceId": { "malaysia": "...", "atlas": "..." },
        "features": ["Expert profile", "Business hub", ...],
        "isActive": true,
        "sortOrder": 1
      }
    ]
  }
}
```

---

## 🔴 What Frontend Currently Uses (Old Firebase)

**Service**: `SubscriptionService.fetchPlan(code, key, subscriptionType)`

**Expected Data Structure**:

```typescript
{
  name: 'Scale',
  metadata: {
    code: 'scale' | 'soar'
  },
  pricings: [
    {
      unit_amount: 9900,      // In cents
      currency: 'usd',
      recurring: {
        interval: 'month'     // 'month' or 'year'
      }
    },
    {
      unit_amount: 99000,     // Yearly price
      currency: 'usd',
      recurring: {
        interval: 'year'
      }
    }
  ],
  settings: {
    inclusions: string[],     // Feature list
    order: number            // Display order
  }
}
```

**Frontend Logic**:

```typescript
// Line 61: Fetch plans
this.plans = await this._subscriptionService.fetchPlan('', this.key);

// key = 'myr' for Malaysia, 'other' for rest of world

// Line 84-90: Transform pricings into Monthly/Yearly
for (const pricing of plan.pricings) {
  if (pricing.recurring?.interval === 'year') {
    plan.Yearly = pricing;
  } else {
    plan.Monthly = pricing;
  }
}

// Line 131-136: Get plan price
getPlanPrice(plan): number {
  if (this.planType === 'Monthly') {
    return plan[this.planType].unit_amount / 100;
  }
  return Math.round((plan[this.planType].unit_amount / 100) / 12);
}
```

---

## ⚠️ Gap Analysis

### Structural Differences

| Feature         | Current Backend      | Frontend Expects                     |
| --------------- | -------------------- | ------------------------------------ |
| Plan identifier | `planCode`           | `metadata.code`                      |
| Features        | `features: string[]` | `settings.inclusions: string[]`      |
| Pricing         | Single `price` field | `pricings` array with monthly/yearly |
| Currency        | `currency: 'USD'`    | `currency: 'usd'` (lowercase)        |
| Sort order      | `sortOrder: number`  | `settings.order: number`             |
| Region pricing  | Separate Stripe IDs  | Filtered by `key` param              |

### Key Issues

1. ❌ **No monthly/yearly distinction** - Backend stores single price, frontend expects both
2. ❌ **Structure mismatch** - Different field names and nesting
3. ❌ **No region filtering** - Frontend passes 'myr' or 'other', backend doesn't filter
4. ❌ **Currency format** - Backend uses uppercase, frontend lowercase

---

## 🎯 Recommended Solution

### Option 1: Update Backend Response (Recommended) ✅

**Pros**:

- Minimal frontend changes
- Backend remains flexible for future features
- Easy to add yearly pricing later

**Changes Needed**:

1. **Add `billingCycle` field to SubscriptionProduct model**:

```typescript
{
  // ... existing fields
  billingCycle: 'monthly' | 'yearly',  // NEW
  // OR store both prices:
  pricing: {
    monthly: number,    // 9900
    yearly: number      // 99000 (or 0 if not offered)
  }
}
```

2. **Create adapter endpoint**: `GET /api/v1/subscription/plans/for-region/:region`

```typescript
// Returns frontend-compatible format
{
  "success": true,
  "data": {
    "plans": [
      {
        "name": "Scale",
        "metadata": {
          "code": "scale"
        },
        "pricings": [
          {
            "unit_amount": 9900,
            "currency": "usd",
            "recurring": { "interval": "month" }
          }
        ],
        "settings": {
          "inclusions": ["Expert profile", "Business hub"],
          "order": 1
        }
      }
    ]
  }
}
```

3. **Update service to map data**:

```typescript
async getPlansForRegion(region: 'malaysia' | 'other') {
  const plans = await SubscriptionProduct.find({ isActive: true })
    .sort({ sortOrder: 1 });

  return plans.map(plan => ({
    name: plan.name,
    metadata: {
      code: plan.planCode
    },
    pricings: [
      {
        unit_amount: plan.price,
        currency: plan.currency.toLowerCase(),
        recurring: { interval: 'month' }
      }
    ],
    settings: {
      inclusions: plan.features,
      order: plan.sortOrder
    },
    // Include correct Stripe ID based on region
    stripePriceId: region === 'malaysia'
      ? plan.stripePriceId.malaysia
      : plan.stripePriceId.atlas
  }));
}
```

### Option 2: Update Frontend (Later Phase)

Update frontend to use new backend format directly.

---

## 📋 Implementation Plan

### Phase 1: Immediate (For Pricing Page) ✅

**Goal**: Get pricing page working with minimal changes

1. **Create new endpoint**: `GET /api/v1/subscription/plans/region/:region`
   - `:region` = 'malaysia' | 'other'
   - Returns frontend-compatible format
   - Maps our model to expected structure

2. **Seed database with plans**:

   ```bash
   # Create Scale plan
   POST /api/v1/subscription/plans
   {
     "planCode": "scale",
     "name": "Scale",
     "tagline": "For solo experts and consultants",
     "description": "For individuals looking to grow their services...",
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
     "features": [
       "Expert profile",
       "Business hub",
       "Up to 5 team members",
       "Portfolio showcase",
       "Job board access"
     ],
     "sortOrder": 1
   }

   # Create Soar plan (similar)
   ```

3. **Update frontend service** (1 line change):

   ```typescript
   // OLD: Firebase
   fetchPlan(code, key, subscriptionType)

   // NEW: Backend API
   fetchPlan(code, region) {
     return this.http.get(
       `/api/v1/subscription/plans/region/${region}`
     );
   }
   ```

### Phase 2: Add Yearly Pricing (Later)

1. Update `SubscriptionProduct` model:

   ```typescript
   pricing: {
     monthly: { amount: number, stripePriceId: {...} },
     yearly: { amount: number, stripePriceId: {...} }
   }
   ```

2. Return both in pricings array

### Phase 3: Full Migration (Later)

1. Standardize frontend to use new format
2. Remove adapter endpoint
3. Add proper plan comparison features

---

## 🚀 Quick Start Implementation

### Step 1: Create Region Endpoint

**File**: `src/controllers/subscription-product.controller.ts`

```typescript
export async function getPlansForRegion(
  request: FastifyRequest<{ Params: { region: string } }>,
  reply: FastifyReply,
) {
  try {
    const { region } = request.params;

    if (region !== 'malaysia' && region !== 'other') {
      return reply.status(400).send({
        success: false,
        error: { message: 'Invalid region' },
      });
    }

    const plans = await subscriptionProductService.getPlansForRegion(
      region as 'malaysia' | 'other',
    );

    return reply.send({
      success: true,
      data: { plans },
    });
  } catch (error) {
    // Error handling
  }
}
```

**File**: `src/services/subscription-product.service.ts`

```typescript
async getPlansForRegion(region: 'malaysia' | 'other') {
  const plans = await SubscriptionProduct.find({ isActive: true })
    .sort({ sortOrder: 1 });

  return plans.map(plan => this.transformToFrontendFormat(plan, region));
}

private transformToFrontendFormat(
  plan: ISubscriptionProduct,
  region: 'malaysia' | 'other'
) {
  return {
    name: plan.name,
    metadata: {
      code: plan.planCode
    },
    pricings: [
      {
        unit_amount: plan.price,
        currency: plan.currency.toLowerCase(),
        recurring: { interval: 'month' }
      }
    ],
    settings: {
      inclusions: plan.features,
      order: plan.sortOrder
    },
    // For frontend Stripe integration
    stripePriceId: region === 'malaysia'
      ? plan.stripePriceId.malaysia
      : plan.stripePriceId.atlas,
    stripeProductId: region === 'malaysia'
      ? plan.stripeProductId.malaysia
      : plan.stripeProductId.atlas
  };
}
```

**File**: `src/routes/subscription-product.routes.ts`

```typescript
// Add new route
fastify.get('/plans/region/:region', {
  schema: createRouteSchema({
    tags: ['Subscription'],
    summary: 'Get plans for region',
    description: 'Get plans formatted for frontend with region-specific Stripe IDs',
  }),
  handler: getPlansForRegion,
});
```

### Step 2: Seed Plans (Once)

Use admin token to create plans via API or create a seed script.

### Step 3: Update Frontend (Minimal)

**File**: `mereka-web/src/app/_services/subscription.service.ts`

```typescript
async fetchPlan(code?: string, key?: string, subscriptionType: string = 'hub'): Promise<any | any[]> {
  // NEW: Use backend API instead of Firebase
  const region = key === 'myr' ? 'malaysia' : 'other';
  const response = await this.http.get(
    `${API_URL}/api/v1/subscription/plans/region/${region}`
  ).toPromise();

  return response.data.plans;
}
```

---

## ✅ Summary

### APIs We Have ✅

- GET /api/v1/subscription/plans - Works but wrong format
- Full CRUD for subscription products

### APIs We Need 🔧

1. **GET /api/v1/subscription/plans/region/:region** - Frontend-compatible format
2. **Seed script** - Create Scale and Soar plans in database

### Estimated Time

- Backend changes: **2-3 hours**
- Testing: **1 hour**
- Frontend update: **30 mins**

**Total: ~4 hours** 🚀

---

**Ready to implement?** Let me know and I'll start with the region endpoint!
