# Payment APIs - Complete Reference

## Overview

All payment APIs are **user-centric**. Each expert/user manages their own:
- Stripe Connect account
- Bank accounts
- Balance
- Withdrawals
- Transaction history

**Base URL**: `/api/v1`

**Authorization**: All endpoints require JWT authentication. Users can only access their own payment data.

---

## Quick Reference

### Stripe Account Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/users/:userId/stripe/account` | Create Stripe Connect account |
| GET | `/users/:userId/stripe/account` | Get user's Stripe account |
| GET | `/users/:userId/stripe/account/status` | Check verification status |
| POST | `/users/:userId/stripe/account/links` | Generate onboarding link |

### Bank Account Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/users/:userId/banks` | Add bank account |
| GET | `/users/:userId/banks` | List bank accounts |
| PATCH | `/users/:userId/banks/:bankId/default` | Set default bank |
| DELETE | `/users/:userId/banks/:bankId` | Remove bank account |

### Balance & Transactions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users/:userId/balance` | Get user's balance summary |
| GET | `/users/:userId/balance/stripe` | Fetch live Stripe balance |
| GET | `/users/:userId/transactions` | List all transactions |
| GET | `/users/:userId/transactions/:id` | Get transaction details |
| POST | `/users/:userId/transactions/export` | Export CSV report |

### Withdrawals

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/users/:userId/withdrawals` | Create withdrawal request |
| GET | `/users/:userId/withdrawals` | List withdrawal history |
| GET | `/users/:userId/withdrawals/:id` | Get withdrawal status |

### Platform & Configuration

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/platform/fee-rate` | Get platform fee percentage |
| GET | `/banks/active` | List supported banks |

---

## Detailed Endpoints

## 1. Create Stripe Connect Account

**POST** `/api/v1/users/:userId/stripe/account`

Creates a Stripe Connect account for the user.

### Request

**Path Parameters**:
- `userId` - User's unique ID

**Body**:
```json
{
  "email": "expert@example.com",
  "country": "MY",
  "tosAcceptance": {
    "date": 1234567890,
    "ip": "192.168.1.1",
    "serviceAgreement": "full"
  },
  "key": "myr"
}
```

### Response

**Success (201)**:
```json
{
  "success": true,
  "data": {
    "stripeAccountId": "acct_xxxxxxxxxxxxx",
    "country": "MY",
    "currency": "MYR",
    "chargesEnabled": false,
    "payoutsEnabled": false,
    "detailsSubmitted": false
  }
}
```

---

## 2. Generate Onboarding Link

**POST** `/api/v1/users/:userId/stripe/account/links`

Generates Stripe hosted onboarding URL for KYC verification.

### Request

**Body**:
```json
{
  "refreshUrl": "https://app.mereka.io/profile/payments",
  "returnUrl": "https://app.mereka.io/profile/payments?success=true",
  "type": "account_onboarding",
  "key": "myr"
}
```

### Response

```json
{
  "success": true,
  "data": {
    "url": "https://connect.stripe.com/setup/...",
    "expiresAt": 1234567890
  }
}
```

**Frontend Action**: Redirect user to `url` for Stripe onboarding.

---

## 3. Check Account Status

**GET** `/api/v1/users/:userId/stripe/account/status`

Checks if Stripe account is fully verified and can accept payments.

### Query Parameters
- `key` - "myr" or "other"

### Response

```json
{
  "success": true,
  "data": {
    "accountStatus": true,
    "chargesEnabled": true,
    "payoutsEnabled": true,
    "detailsSubmitted": true,
    "requirementsCurrently": [],
    "requirementsEventually": [],
    "disabledReason": null
  }
}
```

---

## 4. Add Bank Account

**POST** `/api/v1/users/:userId/banks`

Adds a bank account for withdrawals.

### Request

```json
{
  "accountHolderName": "Jane Doe",
  "accountNumber": "000123456789",
  "routingNumber": "MBBEMYKL",
  "country": "MY",
  "currency": "MYR",
  "key": "myr"
}
```

### Response

```json
{
  "success": true,
  "data": {
    "id": "ba_xxxxxxxxxxxxx",
    "bankName": "Maybank",
    "last4": "6789",
    "routingNumber": "MBBEMYKL",
    "currency": "MYR",
    "defaultForCurrency": true,
    "status": "verified"
  }
}
```

---

## 5. List Bank Accounts

**GET** `/api/v1/users/:userId/banks`

Lists all bank accounts for the user.

### Query Parameters
- `key` - "myr" or "other"

### Response

```json
{
  "success": true,
  "data": [
    {
      "id": "ba_xxxxxxxxxxxxx",
      "bankName": "Maybank",
      "last4": "6789",
      "routingNumber": "MBBEMYKL",
      "currency": "MYR",
      "defaultForCurrency": true
    }
  ]
}
```

---

## 6. Get User Balance

**GET** `/api/v1/users/:userId/balance`

Returns comprehensive balance information.

### Response

```json
{
  "success": true,
  "data": {
    "totalEarnings": 15000.00,
    "availableBalance": 5000.00,
    "pendingBalance": 2000.00,
    "escrowAmount": 3000.00,
    "totalWithdrawals": 5000.00,
    "currency": "MYR",
    "sourceTypes": {
      "card": 3000.00,
      "fpx": 2000.00
    },
    "lastUpdated": "2025-01-15T10:30:00Z"
  }
}
```

**Field Descriptions**:
- `totalEarnings` - All-time earnings from transfers
- `availableBalance` - Withdrawable now (from Stripe)
- `pendingBalance` - In transit from Stripe
- `escrowAmount` - Bookings within 3-day guarantee
- `totalWithdrawals` - All-time withdrawals
- `sourceTypes` - Balance breakdown by payment method

---

## 7. List Transactions

**GET** `/api/v1/users/:userId/transactions`

Lists all booking transactions for the user.

### Query Parameters
- `status` - Filter by status (active, cancelled, etc.)
- `escrow` - Boolean - only escrow transactions
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)
- `startDate` - Filter from date (ISO 8601)
- `endDate` - Filter to date (ISO 8601)

### Response

```json
{
  "success": true,
  "data": [
    {
      "id": "bt_xxxxxxxxxxxxx",
      "serviceType": "experience",
      "serviceName": "Pottery Workshop",
      "hubId": "hub_123",
      "bookedBy": {
        "name": "Jane Smith",
        "email": "jane@example.com"
      },
      "totalCost": 150.00,
      "currency": "MYR",
      "stripeFee": 7.50,
      "platformFee": 5.25,
      "transferAmount": 137.25,
      "isMoneyTransferred": false,
      "status": "active",
      "createdDate": "2025-01-15T10:00:00Z",
      "bookingStartDate": "2025-01-20T14:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 85,
    "totalPages": 5
  }
}
```

---

## 8. Create Withdrawal

**POST** `/api/v1/users/:userId/withdrawals`

Creates a withdrawal request to user's bank account.

### Request

```json
{
  "amount": 5000.00,
  "currency": "MYR",
  "bankId": "ba_xxxxxxxxxxxxx",
  "sourceType": "card",
  "description": "Monthly withdrawal",
  "key": "myr"
}
```

**Validation**:
- User must be re-authenticated
- Amount must be > 0
- Amount must be <= available balance for source type
- Bank account must exist and be verified

### Response

```json
{
  "success": true,
  "data": {
    "id": "withdrawal_123",
    "amount": 5000.00,
    "currency": "MYR",
    "status": "pending",
    "bankName": "Maybank",
    "last4": "6789",
    "stripePayoutId": "po_xxxxxxxxxxxxx",
    "arrivalDate": "2025-01-20T00:00:00Z",
    "createdDate": "2025-01-15T10:00:00Z"
  }
}
```

---

## 9. List Withdrawals

**GET** `/api/v1/users/:userId/withdrawals`

Lists all withdrawal history for the user.

### Query Parameters
- `status` - Filter by status (pending, paid, failed)
- `page` - Page number
- `limit` - Items per page

### Response

```json
{
  "success": true,
  "data": [
    {
      "id": "withdrawal_123",
      "amount": 5000.00,
      "currency": "MYR",
      "status": "paid",
      "bankName": "Maybank",
      "last4": "6789",
      "arrivalDate": "2025-01-20T00:00:00Z",
      "createdDate": "2025-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 35,
    "totalPages": 2
  }
}
```

---

## Authorization

All endpoints require:

1. **JWT Token** in Authorization header
2. **User Ownership** - Can only access own data

### Example Request

```bash
curl -X GET \
  https://api.mereka.io/api/v1/users/user_123/balance \
  -H 'Authorization: Bearer eyJhbGc...' \
  -H 'Content-Type: application/json'
```

### Authorization Middleware

```typescript
// Verify user can access their own payment data
function authorizeUserPaymentAccess(req, res, next) {
  const authenticatedUser = req.user.uid;
  const resourceUser = req.params.userId;

  if (authenticatedUser !== resourceUser) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'You can only access your own payment data'
      }
    });
  }

  next();
}
```

---

## Error Responses

### Standard Error Format

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
  }
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid JWT token |
| `FORBIDDEN` | 403 | User cannot access resource |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `STRIPE_ERROR` | 400 | Stripe API error |
| `INSUFFICIENT_BALANCE` | 400 | Not enough balance for withdrawal |
| `ACCOUNT_NOT_VERIFIED` | 400 | Stripe account not verified |
| `BANK_NOT_VERIFIED` | 400 | Bank account not verified |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Rate Limits

| Endpoint Type | Limit |
|---------------|-------|
| Balance checks | 100 per hour |
| Account status | 20 per hour |
| Withdrawal requests | 5 per hour |
| Transaction lists | 100 per hour |
| Report generation | 10 per day |

---

## Webhooks

Platform listens to Stripe webhooks for:

**Endpoint**: `POST /api/v1/webhooks/stripe`

**Events**:
- `payout.paid` - Withdrawal successful
- `payout.failed` - Withdrawal failed
- `account.updated` - Stripe account status changed
- `transfer.created` - Platform → Expert transfer
- `charge.refunded` - Booking refunded

---

## Testing

### Test Mode

Use Stripe test mode credentials:
- Test publishable key: `pk_test_REDACTED...`
- Test secret key: `sk_test_REDACTED...`

### Test Cards

| Card Number | Scenario |
|-------------|----------|
| 4242 4242 4242 4242 | Successful payment |
| 4000 0000 0000 9995 | Insufficient funds |
| 4000 0000 0000 0002 | Card declined |

### Test Bank Accounts

For Malaysian banks (MYR):
- Routing: `MBBEMYKL` (Maybank)
- Account: Any 10-12 digits

---

## Implementation Checklist

### Backend

- [ ] Create StripeAccount model
- [ ] Create BankAccount model
- [ ] Create Withdrawal model
- [ ] Implement Stripe API service
- [ ] Build all API endpoints
- [ ] Add authorization middleware
- [ ] Implement webhooks
- [ ] Write tests (unit + integration)
- [ ] Add rate limiting
- [ ] Setup monitoring

### Frontend

- [ ] Update API calls to user-based endpoints
- [ ] Remove hub-based payment UI
- [ ] Add user payment dashboard
- [ ] Implement withdrawal flow
- [ ] Add bank account management
- [ ] Update transaction history
- [ ] Test onboarding flow
- [ ] Add error handling

---

## References

- [Payment Architecture](../../architecture/PAYMENT-ARCHITECTURE.md)
- [Feature Overview](../../features/payments/OVERVIEW.md)
- [Stripe Account Model](../../models/STRIPE-ACCOUNT.md)
- [Stripe Connect Docs](https://stripe.com/docs/connect)
- [Stripe API Reference](https://stripe.com/docs/api)

---

**Document Version**: 1.0
**Last Updated**: 2025-01-15
**Status**: Ready for Implementation
