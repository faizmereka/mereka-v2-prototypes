# Multi-Region Stripe Account Implementation

## Overview

Multi-region Stripe account support for Mereka platform:
- **Malaysian hubs/users** → Use Malaysia Stripe account
- **All other hubs/users** → Use Atlas/global Stripe account
- **Hub**: ONE Connect account on their regional platform
- **User/Expert**: ONE Connect account on their regional platform
- **Job payments**: Use **Expert's region** (expert's hub region or independent expert's region)
- **Checkout (Experience/Expertise)**: Use **Hub's region**
- **Subscriptions** → Always on Atlas account

---

## Account Regional Logic

### Hub Connect Account
- Region determined by `hub.location.country`
- Malaysia → MY platform
- All others → Atlas platform
- Stored in: `hub.stripeAccountId` + `hub.stripeRegion`

### User Connect Account
- If user owns/belongs to a hub: Use hub's region
- If independent expert: Use user's `location.country`
- Malaysia → MY platform
- All others → Atlas platform
- Stored in: `user.stripeAccountId` + `user.stripeRegion`

### Job/Contract Payments
- Region determined by **Expert's hub** (or expert's own region if independent)
- Payment & Transfer on same platform
- Client pays to expert's regional platform

### Checkout Payments (Experience/Expertise)
- Region determined by **Hub's region**
- Hub receives payment on their platform

---

## Database Schema Changes

### Hub Model (`src/core/models/Hub.ts`)

```typescript
stripeRegion: {
  type: String,
  enum: ['malaysia', 'atlas'],
  index: true,
}
```

### User Model (`src/core/models/User.ts`)

```typescript
stripeRegion: {
  type: String,
  enum: ['malaysia', 'atlas'],
  index: true,
}
```

### ContractPayment Model (`src/core/models/ContractPayment.ts`)

```typescript
stripeRegion: {
  type: String,
  enum: ['malaysia', 'atlas'],
  index: true,
}
```

---

## Environment Variables

### Backend (`src/core/config/env.ts`)

```typescript
// Malaysia Stripe Account
STRIPE_MY_SECRET_KEY: string;
STRIPE_MY_WEBHOOK_SECRET: string;
STRIPE_MY_PUBLISHABLE_KEY: string;

// Atlas/Global Stripe Account (default + subscriptions)
STRIPE_ATLAS_SECRET_KEY: string;
STRIPE_ATLAS_WEBHOOK_SECRET: string;
STRIPE_ATLAS_PUBLISHABLE_KEY: string;
```

---

## Implementation Files

### Phase 1: Core Infrastructure

| # | File | Description |
|---|------|-------------|
| 1 | `src/core/config/env.ts` | Add 6 new Stripe env vars |
| 2 | `src/core/utils/stripe-region.ts` | **NEW** - Region helper functions |
| 3 | `src/core/services/shared/payments/stripeFactory.service.ts` | **NEW** - Factory for regional Stripe instances |
| 4 | `src/core/models/Hub.ts` | Add `stripeRegion` field |
| 5 | `src/core/models/User.ts` | Add `stripeRegion` field |
| 6 | `src/core/models/ContractPayment.ts` | Add `stripeRegion` field |

### Phase 2: Connect Account Services

| # | File | Description |
|---|------|-------------|
| 7 | `src/core/services/hub/transactions/hubStripeAccount.service.ts` | Use regional service, set `stripeRegion` |
| 8 | `src/core/services/user/transactions/userStripeAccount.service.ts` | Use regional service, set `stripeRegion` |

### Phase 3: Transaction Services

| # | File | Description |
|---|------|-------------|
| 9 | `src/core/services/hub/transactions/hubTransaction.service.ts` | Use regional service based on `hub.stripeRegion` |
| 10 | `src/core/services/user/transactions/userTransaction.service.ts` | Use regional service based on `user.stripeRegion` |

### Phase 4: Withdrawal Services

| # | File | Description |
|---|------|-------------|
| 11 | `src/core/services/hub/transactions/hubWithdrawal.service.ts` | Use regional service |
| 12 | `src/core/services/user/transactions/userWithdrawal.service.ts` | Use regional service |

### Phase 5: Bank Account Services

| # | File | Description |
|---|------|-------------|
| 13 | `src/core/services/hub/transactions/hubBankAccount.service.ts` | Use regional service |
| 14 | `src/core/services/user/transactions/userBankAccount.service.ts` | Use regional service |

### Phase 6: Checkout (Experience/Expertise)

| # | File | Description |
|---|------|-------------|
| 15 | `src/core/services/web/checkout/webCheckout.service.ts` | Use Hub's regional service |

### Phase 7: Contract/Job Payments

| # | File | Description |
|---|------|-------------|
| 16 | `src/core/services/shared/payments/contractPayment.service.ts` | Use Expert's regional service |

### Phase 8: Webhooks

| # | File | Description |
|---|------|-------------|
| 17 | `src/modules/hub/controllers/subscription/hubSubscription.controller.ts` | Multi-region webhook verification |
| 18 | `src/modules/hub/routes/subscription/hubSubscription.routes.ts` | Add `?region` query param |

### Phase 9: Migration

| # | File | Description |
|---|------|-------------|
| 19 | `scripts/migrations/migrate-stripe-regions.ts` | **NEW** - Set `stripeRegion` for existing hubs/users |

---

## Key Implementation Details

### 1. StripeServiceFactory

```typescript
// src/core/services/shared/payments/stripeFactory.service.ts
export type StripeRegion = 'malaysia' | 'atlas';

export class StripeServiceFactory {
  private static instances: Map<StripeRegion, RegionalStripeService> = new Map();

  static getService(region: StripeRegion): RegionalStripeService {
    if (!this.instances.has(region)) {
      const config = this.getRegionConfig(region);
      this.instances.set(region, new RegionalStripeService(region, config));
    }
    return this.instances.get(region)!;
  }

  static getServiceForHub(hub: { stripeRegion?: string; location?: { country?: string } }): RegionalStripeService
  static getServiceForUser(user: {...}, hub?: {...}): RegionalStripeService
  static getServiceForExpert(expert: {...}, expertHub?: {...}): RegionalStripeService
  static getPublishableKey(region: StripeRegion): string
  static getSecretKey(region: StripeRegion): string
}
```

### 2. Region Helper

```typescript
// src/core/utils/stripe-region.ts
export type StripeRegion = 'malaysia' | 'atlas';

export function getStripeRegion(country?: string): StripeRegion {
  if (!country) return 'atlas';
  const normalized = country.toLowerCase().trim();
  return (normalized === 'malaysia' || normalized === 'my') ? 'malaysia' : 'atlas';
}
```

### 3. Hub Stripe Account Creation

```typescript
// Determine region from hub location
const region = getStripeRegion(hub.location?.country);
const secretKey = StripeServiceFactory.getSecretKey(region);

// Create account on regional platform
// Update hub with account ID AND region
await Hub.findByIdAndUpdate(hubId, {
  stripeAccountId: stripeAccount.id,
  stripeRegion: region,
});
```

### 4. Contract Payment (Expert's Region)

```typescript
// Get expert and determine their region
const region = await this.getExpertRegion(input.expertId);
const regionalStripeService = StripeServiceFactory.getService(region);

// Create payment on expert's regional platform
const paymentIntent = await regionalStripeService.getStripeInstance().paymentIntents.create({...});

// Store region in payment record
const payment = new ContractPayment({
  // ...existing fields...
  stripeRegion: region,  // Track which platform
});
```

### 5. Checkout (Hub's Region)

```typescript
// Get hub's regional Stripe service
const region = (hub.stripeRegion as StripeRegion) || getStripeRegion(hub.location?.country);
const regionalStripeService = StripeServiceFactory.getService(region);

// Create PaymentIntent on hub's regional platform
const paymentIntent = await regionalStripeService.getStripeInstance().paymentIntents.create({...});

// Return publishable key for frontend
return {
  stripePublishableKey: StripeServiceFactory.getPublishableKey(region),
  stripeRegion: region,
  // ...other fields
};
```

---

## Payment Flow Summary

| Flow | Region Source | Platform |
|------|---------------|----------|
| Experience Checkout | Hub's `stripeRegion` | Hub's platform |
| Expertise Checkout | Hub's `stripeRegion` | Hub's platform |
| Milestone Fund | Expert's hub `stripeRegion` | Expert's platform |
| Milestone Release | `ContractPayment.stripeRegion` | Same as fund |
| Expert Transfer | `ContractPayment.stripeRegion` | Same as payment |
| Timelog Payment | Expert's hub `stripeRegion` | Expert's platform |
| Hub Withdrawal | Hub's `stripeRegion` | Hub's platform |
| User Withdrawal | User's `stripeRegion` | User's platform |
| Subscription | Always Atlas | Atlas platform |

---

## Webhook Configuration

### Single Endpoint with Region Query Param

```
POST /api/v1/webhook?region=malaysia  → MY webhook secret
POST /api/v1/webhook?region=atlas     → Atlas webhook secret
POST /api/v1/webhook                  → Default to Atlas (backward compatible)
```

**Stripe Dashboard Setup:**
1. Create webhook for MY account → `https://api.mereka.io/api/v1/webhook?region=malaysia`
2. Create webhook for Atlas account → `https://api.mereka.io/api/v1/webhook?region=atlas`

---

## Migration Script

```bash
# Dry run (analyze without migrating)
npx tsx scripts/migrations/migrate-stripe-regions.ts --dry-run

# Migrate to MongoDB
npx tsx scripts/migrations/migrate-stripe-regions.ts --migrate
```

The migration script:
1. Sets `stripeRegion` for existing hubs based on their location
2. Sets `stripeRegion` for existing users based on their hub's region or their own location
3. Backfills `ContractPayment.stripeRegion` based on expert's region

---

## Verification Checklist

### Backend
- [ ] `npm run check` passes
- [ ] StripeServiceFactory returns correct instance per region
- [ ] Hub account creation sets `stripeRegion`
- [ ] User account creation sets `stripeRegion`
- [ ] Experience checkout uses hub's region
- [ ] Expertise checkout uses hub's region
- [ ] Milestone payment uses expert's region
- [ ] Expert transfer uses payment's region
- [ ] Webhooks verify with correct regional secret

### Cross-Region Job Test
- [ ] MY hub hires SG expert → payment on Atlas, transfer on Atlas
- [ ] SG hub hires MY expert → payment on MY, transfer on MY

### Frontend
- [ ] Checkout receives correct publishable key
- [ ] Stripe.js initializes with provided key

---

## Files Summary

**Total: 19 files**
- 3 new files (factory, region util, migration)
- 16 files modified

**Core changes:**
- `stripeFactory.service.ts` - Regional Stripe instances
- `stripe-region.ts` - Region detection helper
- Hub/User/ContractPayment models - `stripeRegion` field
- All Stripe services - Use factory instead of singleton

---

_Last updated: 2025-03-11_
