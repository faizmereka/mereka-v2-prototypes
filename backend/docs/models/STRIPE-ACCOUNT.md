# Stripe Account Model

## Overview

Represents a user's Stripe Connect account for receiving payments.

**Collection**: `stripeAccounts`
**Relationship**: One-to-One with User

---

## Schema

```typescript
interface StripeAccount {
  id: string;                     // MongoDB _id
  userId: string;                 // Foreign key to User (REQUIRED)
  stripeAccountId: string;        // Stripe Connect account ID (UNIQUE)

  // Account details
  country: string;                // ISO country code (MY, US, etc.)
  currency: string;               // Default currency (MYR, USD, etc.)
  email: string;                  // Account email

  // Verification status
  chargesEnabled: boolean;        // Can accept payments
  payoutsEnabled: boolean;        // Can receive payouts
  detailsSubmitted: boolean;      // KYC completed
  connectCompleted: boolean;      // Onboarding finished

  // Requirements
  requirements: {
    currentlyDue: string[];       // Fields needed now
    eventuallyDue: string[];      // Fields needed eventually
    pastDue: string[];            // Overdue fields
    disabledReason?: string;      // Why account disabled
  };

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Mongoose Implementation

```typescript
import mongoose, { Schema, Document } from 'mongoose';

export interface IStripeAccount extends Document {
  userId: string;
  stripeAccountId: string;
  country: string;
  currency: string;
  email: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  connectCompleted: boolean;
  requirements: {
    currentlyDue: string[];
    eventuallyDue: string[];
    pastDue: string[];
    disabledReason?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const stripeAccountSchema = new Schema<IStripeAccount>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
      unique: true, // One Stripe account per user
    },
    stripeAccountId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    country: {
      type: String,
      required: true,
      uppercase: true,
      length: 2, // ISO code
    },
    currency: {
      type: String,
      required: true,
      uppercase: true,
      length: 3, // ISO code
    },
    email: {
      type: String,
      required: true,
    },
    chargesEnabled: {
      type: Boolean,
      default: false,
    },
    payoutsEnabled: {
      type: Boolean,
      default: false,
    },
    detailsSubmitted: {
      type: Boolean,
      default: false,
    },
    connectCompleted: {
      type: Boolean,
      default: false,
    },
    requirements: {
      currentlyDue: {
        type: [String],
        default: [],
      },
      eventuallyDue: {
        type: [String],
        default: [],
      },
      pastDue: {
        type: [String],
        default: [],
      },
      disabledReason: {
        type: String,
        required: false,
      },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes
stripeAccountSchema.index({ userId: 1 }, { unique: true });
stripeAccountSchema.index({ stripeAccountId: 1 }, { unique: true });
stripeAccountSchema.index({ connectCompleted: 1, chargesEnabled: 1 });

export const StripeAccount = mongoose.model<IStripeAccount>('StripeAccount', stripeAccountSchema);
```

---

## Validation Rules

### Required Fields
- `userId` - Must reference existing user
- `stripeAccountId` - Must be valid Stripe account ID
- `country` - Must be valid ISO country code
- `currency` - Must be valid ISO currency code
- `email` - Must be valid email format

### Constraints
- One Stripe account per user (unique userId)
- Stripe account ID must be unique across platform
- Country and currency must be compatible

---

## Usage Examples

### Create Stripe Account

```typescript
import { StripeAccount } from '@models/StripeAccount';

async function createStripeAccount(userId: string, stripeData: any) {
  const account = await StripeAccount.create({
    userId: userId,
    stripeAccountId: stripeData.id,
    country: stripeData.country,
    currency: stripeData.default_currency,
    email: stripeData.email,
    chargesEnabled: stripeData.charges_enabled,
    payoutsEnabled: stripeData.payouts_enabled,
    detailsSubmitted: stripeData.details_submitted,
    connectCompleted: stripeData.details_submitted && stripeData.payouts_enabled,
    requirements: {
      currentlyDue: stripeData.requirements.currently_due,
      eventuallyDue: stripeData.requirements.eventually_due,
      pastDue: stripeData.requirements.past_due,
      disabledReason: stripeData.requirements.disabled_reason,
    },
  });

  return account;
}
```

### Get User's Stripe Account

```typescript
async function getUserStripeAccount(userId: string) {
  return await StripeAccount.findOne({ userId }).lean();
}
```

### Update Account Status

```typescript
async function updateAccountStatus(userId: string, stripeData: any) {
  return await StripeAccount.findOneAndUpdate(
    { userId },
    {
      $set: {
        chargesEnabled: stripeData.charges_enabled,
        payoutsEnabled: stripeData.payouts_enabled,
        detailsSubmitted: stripeData.details_submitted,
        connectCompleted: stripeData.details_submitted && stripeData.payouts_enabled,
        'requirements.currentlyDue': stripeData.requirements.currently_due,
        'requirements.eventuallyDue': stripeData.requirements.eventually_due,
        'requirements.pastDue': stripeData.requirements.past_due,
        'requirements.disabledReason': stripeData.requirements.disabled_reason,
      },
    },
    { new: true }
  );
}
```

### Check if User Can Accept Payments

```typescript
async function canAcceptPayments(userId: string): Promise<boolean> {
  const account = await StripeAccount.findOne({ userId }).lean();

  return !!(
    account &&
    account.chargesEnabled &&
    account.payoutsEnabled &&
    account.detailsSubmitted
  );
}
```

---

## Related Models

- **User**: Parent model (one-to-one)
- **BankAccount**: Child model (one-to-many)
- **Withdrawal**: Child model (one-to-many)
- **BookingTransaction**: Uses stripeAccountId for transfers

---

## Migration Notes

### From Firebase/Hub Model

**Before** (Hub-based):
```javascript
// In Hub/Agency document
{
  stripeAccountId: "acct_xxx",
  stripeVerification: true,
  connectCompleted: true
}
```

**After** (User-based):
```typescript
// Separate StripeAccount document
{
  userId: "user_123",
  stripeAccountId: "acct_xxx",
  chargesEnabled: true,
  payoutsEnabled: true,
  connectCompleted: true
}

// Also update User document
{
  uid: "user_123",
  stripeAccountId: "acct_xxx", // Denormalized for quick access
  stripeVerification: true
}
```

**Migration Script**:
```typescript
async function migrateStripeAccounts() {
  const hubs = await Hub.find({ stripeAccountId: { $exists: true } });

  for (const hub of hubs) {
    // Get hub owner
    const owner = hub.experts.find(e => e.role === 'owner');

    // Create StripeAccount
    await StripeAccount.create({
      userId: owner.userId,
      stripeAccountId: hub.stripeAccountId,
      country: hub.stripeCountry || 'MY',
      currency: hub.stripeCurrency || 'MYR',
      email: owner.email,
      chargesEnabled: hub.stripeVerification || false,
      payoutsEnabled: hub.stripeVerification || false,
      detailsSubmitted: hub.connectCompleted || false,
      connectCompleted: hub.connectCompleted || false,
      requirements: {
        currentlyDue: [],
        eventuallyDue: [],
        pastDue: [],
      },
    });

    // Update User
    await User.updateOne(
      { uid: owner.userId },
      {
        $set: {
          stripeAccountId: hub.stripeAccountId,
          stripeVerification: hub.stripeVerification,
        },
      }
    );
  }
}
```

---

## API Endpoints

See [Stripe Account APIs](../api/payments/stripe-accounts.md)

---

**Document Version**: 1.0
**Last Updated**: 2025-01-15
**Location**: `src/models/StripeAccount.ts`
