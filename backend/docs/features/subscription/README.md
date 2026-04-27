# 💳 Subscription Product Feature

**Version**: 1.0
**Status**: Production Ready
**Endpoints**: 5

---

## Overview

Manage subscription plans (Scale and Soar) with pricing configuration and dual Stripe account support for regional billing.

---

## Features

- ✅ CRUD APIs for subscription plans
- ✅ Dual Stripe account support (Malaysia + Atlas)
- ✅ Monthly pricing only
- ✅ Feature list management
- ✅ Public pricing API
- ✅ Admin management APIs

---

## API Endpoints

| Endpoint                    | Method | Auth | Purpose                      |
| --------------------------- | ------ | ---- | ---------------------------- |
| `/subscription/plans`       | GET    | No   | Get all plans (pricing page) |
| `/subscription/plans/:code` | GET    | No   | Get specific plan            |
| `/subscription/plans`       | POST   | Yes  | Create plan (admin)          |
| `/subscription/plans/:code` | PATCH  | Yes  | Update plan (admin)          |
| `/subscription/plans/:code` | DELETE | Yes  | Delete plan (admin)          |

---

## Quick Start

```bash
# Get plans for pricing page
GET /api/v1/subscription/plans

# Returns Scale and Soar with pricing
```

---

## Documentation

- **[API-DOCUMENTATION.md](./API-DOCUMENTATION.md)** - Complete API reference
- **[STRIPE-WEBHOOKS.md](./STRIPE-WEBHOOKS.md)** - Webhook integration guide
- **[COMPLETE-SUBSCRIPTION-PAYMENT-FLOW.md](./COMPLETE-SUBSCRIPTION-PAYMENT-FLOW.md)** - End-to-end payment flow
- **[IMPLEMENTATION-SUMMARY.md](./IMPLEMENTATION-SUMMARY.md)** - Implementation details
- **[../../guides/STRIPE-SETUP.md](../../guides/STRIPE-SETUP.md)** - Environment setup

---

## Implementation Files

```
src/
├── models/
│   └── SubscriptionProduct.ts
├── services/
│   └── subscription-product.service.ts
├── controllers/
│   └── subscription-product.controller.ts
├── schemas/
│   └── subscription-product.schema.ts
└── routes/
    └── subscription-product.routes.ts
```

---

## Dual Stripe Accounts

**Why two accounts?**

- Malaysia: For Malaysian customers (local regulations)
- Atlas: For international customers

**How it works:**

- Plans store both Stripe price IDs
- Backend selects based on user's country
- Frontend doesn't need to know which account

---

**Production ready!** 🚀
