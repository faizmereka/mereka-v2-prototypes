# Payment System Documentation

## 🎯 Start Here

This folder contains all documentation for the **User-Centric Payment System**.

**Key Principle**: Stripe accounts, bank accounts, and withdrawals belong to **individual users (experts)**, NOT hubs.

---

## 📚 Documentation Structure

```
docs/
├── architecture/
│   └── PAYMENT-ARCHITECTURE.md          ← Start here - System overview
│
├── features/payments/
│   ├── OVERVIEW.md                      ← Feature summary
│   ├── README.md                        ← This file
│   ├── STRIPE-ONBOARDING.md            ← (To be created)
│   ├── BALANCE-TRACKING.md             ← (To be created)
│   ├── WITHDRAWALS.md                  ← (To be created)
│   └── TRANSACTIONS.md                 ← (To be created)
│
├── models/
│   └── STRIPE-ACCOUNT.md                ← Database models
│
└── api/payments/
    └── API-SUMMARY.md                   ← Complete API reference
```

---

## 🚀 Quick Navigation

### For Backend Developers

1. **Start**: Read [Payment Architecture](../../architecture/PAYMENT-ARCHITECTURE.md)
2. **Understand**: Review [Payment Overview](./OVERVIEW.md)
3. **Build**: Check [API Summary](../../api/payments/API-SUMMARY.md)
4. **Model**: See [Stripe Account Model](../../models/STRIPE-ACCOUNT.md)

### For Frontend Developers

1. **Migration Guide**: [Architecture Doc - Migration Section](../../architecture/PAYMENT-ARCHITECTURE.md#migration-from-hub-based-to-user-based)
2. **API Endpoints**: [API Summary](../../api/payments/API-SUMMARY.md)
3. **User Journey**: [Overview - User Journey](./OVERVIEW.md#user-journey)

### For Product/Business

1. **Business Context**: [Overview](./OVERVIEW.md)
2. **User Scenarios**: [Architecture - Multi-Expert Scenarios](../../architecture/PAYMENT-ARCHITECTURE.md#multi-expert-hub-scenarios)
3. **FAQs**: [Architecture - FAQs](../../architecture/PAYMENT-ARCHITECTURE.md#faqs)

---

## 🎓 Learning Path

### Day 1: Understand the Architecture
- [ ] Read [Payment Architecture](../../architecture/PAYMENT-ARCHITECTURE.md)
- [ ] Understand user-centric model
- [ ] Review database schema
- [ ] Check API structure

### Day 2: Explore Features
- [ ] Read [Feature Overview](./OVERVIEW.md)
- [ ] Understand Stripe Connect flow
- [ ] Learn balance calculation
- [ ] Review withdrawal process

### Day 3: Implementation Planning
- [ ] Review [Stripe Account Model](../../models/STRIPE-ACCOUNT.md)
- [ ] Check [API Summary](../../api/payments/API-SUMMARY.md)
- [ ] Plan implementation phases
- [ ] Set up development environment

### Day 4-5: Start Building
- [ ] Create models
- [ ] Build Stripe service
- [ ] Implement APIs
- [ ] Write tests

---

## 💡 Key Concepts

### User-Based Payments

```
✅ CORRECT:
User → Stripe Account → Bank Account → Withdrawals

❌ WRONG:
Hub → Stripe Account → Bank Account → Withdrawals
```

### Multi-Expert Hub

```
Hub: "Creative Arts"
├── Expert A (Pottery) → Own Stripe Account
├── Expert B (Painting) → Own Stripe Account
└── Expert C (Photo) → Own Stripe Account

Each expert:
- Manages their own finances
- Withdraws independently
- Tracks their own earnings
```

### Payment Flow

```
Learner → Books Service → Platform Charges
    ↓
Escrow (3 days)
    ↓
Transfer to Expert's Stripe Account
    ↓
Expert Requests Withdrawal
    ↓
Expert's Bank Account
```

---

## 📋 Implementation Checklist

### Phase 1: Models & Core Services (Week 1-2)
- [ ] Create StripeAccount model
- [ ] Create BankAccount model
- [ ] Create Withdrawal model
- [ ] Extend User model with Stripe fields
- [ ] Build Stripe API service wrapper

### Phase 2: Account Management APIs (Week 3-4)
- [ ] POST /users/:userId/stripe/account
- [ ] GET /users/:userId/stripe/account/status
- [ ] POST /users/:userId/stripe/account/links
- [ ] POST /users/:userId/banks
- [ ] GET /users/:userId/banks
- [ ] PATCH /users/:userId/banks/:bankId/default
- [ ] DELETE /users/:userId/banks/:bankId

### Phase 3: Balance & Transactions (Week 5-6)
- [ ] GET /users/:userId/balance
- [ ] GET /users/:userId/balance/stripe
- [ ] GET /users/:userId/transactions
- [ ] GET /users/:userId/transactions/:id
- [ ] POST /users/:userId/transactions/export

### Phase 4: Withdrawals (Week 7-8)
- [ ] POST /users/:userId/withdrawals
- [ ] GET /users/:userId/withdrawals
- [ ] GET /users/:userId/withdrawals/:id
- [ ] Implement Stripe payout logic
- [ ] Add withdrawal webhooks
- [ ] Email notifications

### Phase 5: Testing & Migration (Week 9-10)
- [ ] Unit tests (80%+ coverage)
- [ ] Integration tests
- [ ] End-to-end tests
- [ ] Data migration scripts
- [ ] Frontend migration
- [ ] Production deployment

---

## 🔗 External Resources

- [Stripe Connect Docs](https://stripe.com/docs/connect)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Stripe Connect Best Practices](https://stripe.com/docs/connect/best-practices)
- [Payment Intents](https://stripe.com/docs/payments/payment-intents)
- [Payouts](https://stripe.com/docs/payouts)

---

## 🤔 Common Questions

**Q: Why user-based instead of hub-based?**

A: Each expert should control their own money. In multi-expert hubs, different experts host different services. User-based payments ensure:
- Financial independence
- Clear revenue attribution
- Simplified accounting
- Better scalability

**Q: What if a user belongs to multiple hubs?**

A: Perfect! One Stripe account receives payments from all hubs. User gets unified balance and withdrawal.

**Q: Can hub admins access expert finances?**

A: No. Hub admins can only see aggregated analytics (total hub earnings, booking counts). Cannot see individual balances or bank details.

**Q: How are co-hosted services handled?**

A: Revenue split by percentage. Each co-host receives their share in their own Stripe account. See [Architecture - Payment Splitting](../../architecture/PAYMENT-ARCHITECTURE.md#payment-splitting-for-co-hosted-services).

---

## 📞 Need Help?

1. Check documentation in this folder
2. Read [Payment Architecture](../../architecture/PAYMENT-ARCHITECTURE.md)
3. Review [API Summary](../../api/payments/API-SUMMARY.md)
4. Ask the team in #payments channel

---

## 🔄 Document Updates

To update documentation:

1. Never scatter docs - use proper folders
2. Update architecture doc for system-wide changes
3. Update specific feature docs for details
4. Keep API docs in sync with implementation
5. Version all major changes

---

**Last Updated**: 2025-01-15
**Status**: Documentation Complete - Ready for Implementation
**Next Step**: Begin Phase 1 - Models & Core Services
