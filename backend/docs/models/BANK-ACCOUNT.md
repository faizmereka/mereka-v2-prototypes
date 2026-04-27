# BankAccount Model Documentation

## Overview

The `BankAccount` model stores bank account information for experts/freelancers to receive payouts. It integrates with Stripe Connect to manage external accounts for withdrawals.

- **Collection**: `bankAccounts`
- **Location**: `src/models/BankAccount.ts`

## Model Structure

### Field Reference

| Field | Type | Required | Index | Description |
|-------|------|----------|-------|-------------|
| `userId` | String | Yes | Yes | Reference to User |
| `stripeAccountId` | String | Yes | Yes | Stripe Connect account ID |
| `stripeBankId` | String | Yes | Yes (unique) | Stripe bank account ID (ba_xxx) |
| `accountHolderName` | String | Yes | No | Name on the bank account |
| `accountNumber` | String | Yes | No | Full account number (encrypted, hidden by default) |
| `routingNumber` | String | Yes | No | SWIFT code or routing number |
| `last4` | String | Yes | No | Last 4 digits of account number |
| `bankName` | String | Yes | No | Bank name (e.g., "Maybank") |
| `country` | String | Yes | No | ISO country code (2 chars) |
| `currency` | String | Yes | No | ISO currency code (3 chars) |
| `status` | Enum | No | Yes | Verification status |
| `defaultForCurrency` | Boolean | No | Yes | Default bank for this currency |

### Enums

#### BankAccountStatus
```typescript
enum BankAccountStatus {
  NEW = 'new',                           // Just added, not verified
  VERIFIED = 'verified',                 // Verified and ready for use
  VERIFICATION_FAILED = 'verification_failed', // Verification failed
  ERRORED = 'errored',                   // Error state
}
```

## Indexes

### Single Field Indexes
- `userId` - Find user's bank accounts
- `stripeAccountId` - Find by Stripe Connect account
- `stripeBankId` (unique) - Lookup by Stripe ID
- `status` - Filter by verification status
- `defaultForCurrency` - Find default accounts

### Compound Indexes
- `{ userId: 1, createdAt: -1 }` - User's accounts sorted by date
- `{ stripeAccountId: 1, defaultForCurrency: 1 }` - Default account lookup
- `{ currency: 1, defaultForCurrency: 1 }` - Currency-based queries

## Security Features

### Sensitive Data Protection
- `accountNumber` field has `select: false` - not included in queries by default
- `toJSON` and `toObject` transforms remove sensitive fields
- Masked display method available: `getMaskedAccountNumber()`

### Pre-save Hook
Ensures only one default bank account per currency per user:
```typescript
bankAccountSchema.pre('save', async function(next) {
  if (this.isModified('defaultForCurrency') && this.defaultForCurrency) {
    // Unset other defaults for this currency
    await BankAccount.updateMany(
      { userId: this.userId, currency: this.currency, stripeBankId: { $ne: this.stripeBankId } },
      { $set: { defaultForCurrency: false } }
    );
  }
  next();
});
```

## Instance Methods

### isVerified()
```typescript
bankAccount.isVerified(); // returns boolean
```
Returns `true` if status is `VERIFIED`.

### getMaskedAccountNumber()
```typescript
bankAccount.getMaskedAccountNumber(); // returns "******1234"
```
Returns masked account number for display.

## Static Methods

### findByUserId(userId)
```typescript
const accounts = await BankAccount.findByUserId('user-123');
```
Returns user's bank accounts sorted by creation date (newest first).

### findDefaultForCurrency(userId, currency)
```typescript
const defaultAccount = await BankAccount.findDefaultForCurrency('user-123', 'MYR');
```
Returns the default bank account for a specific currency.

### findByStripeBankId(stripeBankId)
```typescript
const account = await BankAccount.findByStripeBankId('ba_xxx');
```
Finds account by Stripe bank ID.

## Usage Examples

### Create Bank Account
```typescript
import { BankAccount, BankAccountStatus } from '@models/BankAccount';

const bankAccount = await BankAccount.create({
  userId: 'user-123',
  stripeAccountId: 'acct_xxx',
  stripeBankId: 'ba_xxx',
  accountHolderName: 'John Doe',
  accountNumber: '1234567890', // Will be excluded from queries
  routingNumber: 'MABORUMYKL',
  last4: '7890',
  bankName: 'Maybank',
  country: 'MY',
  currency: 'MYR',
  status: BankAccountStatus.NEW,
  defaultForCurrency: true,
});
```

### Get User's Bank Accounts
```typescript
const accounts = await BankAccount.findByUserId('user-123');

// Or with manual query
const accounts = await BankAccount.find({ userId: 'user-123' })
  .sort({ createdAt: -1 })
  .lean();
```

### Update Bank Status
```typescript
await BankAccount.updateOne(
  { stripeBankId: 'ba_xxx' },
  { $set: { status: BankAccountStatus.VERIFIED } }
);
```

### Set Default Bank Account
```typescript
// Pre-save hook automatically unsets other defaults
const account = await BankAccount.findById(accountId);
account.defaultForCurrency = true;
await account.save();
```

### Get Verified Banks Only
```typescript
const verifiedBanks = await BankAccount.find({
  userId: 'user-123',
  status: BankAccountStatus.VERIFIED,
}).lean();
```

## Related Models

- **User** - Owner of the bank account
- **Withdrawal** - Payouts sent to bank account
- **BookingTransaction** - Tracks payments that lead to withdrawals

## Integration with Stripe Connect

### Flow
1. User adds bank account via UI
2. Backend creates Stripe external account
3. `stripeBankId` stored in model
4. Stripe verifies bank account (micro-deposits)
5. Status updated to `VERIFIED`
6. Bank can receive payouts

### Stripe Fields
- `stripeAccountId` - Parent Connect account (acct_xxx)
- `stripeBankId` - External bank account (ba_xxx)
- `routingNumber` - SWIFT/Routing for transfers

## Best Practices

1. **Never query accountNumber directly** - Use `last4` for display
2. **Always check verification status** - Only use `VERIFIED` accounts for payouts
3. **Maintain single default per currency** - Pre-save hook handles this
4. **Sync with Stripe webhooks** - Update status on Stripe events
5. **Use static methods** - They handle common queries efficiently

## Security Considerations

- Full account number is encrypted at rest
- Account number excluded from API responses
- Only `last4` should be shown in UI
- Stripe handles actual bank credentials
- Validate user ownership before any operations

## Performance Tips

- Use compound indexes for user + date queries
- Use `lean()` for read-only queries
- Cache default bank lookups if frequently accessed
- Limit fields returned when full model not needed

## Supported Countries/Currencies

Common configurations:
- **Malaysia**: MYR, SWIFT codes starting with `M`
- **Singapore**: SGD, SWIFT codes
- **United States**: USD, ACH routing numbers
- **United Kingdom**: GBP, Sort codes

---

_Last updated: 2025-11-24_
