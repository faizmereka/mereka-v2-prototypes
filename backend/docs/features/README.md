# 🎯 Features Documentation

This folder contains documentation for all backend features.

---

## 📁 Current Features

### [Authentication](./auth/)

- Email/Password authentication
- Social login (Google, Facebook)
- Multi-domain cookies
- JWT access + refresh tokens

**Documentation:**

- [API Documentation](./auth/API-DOCUMENTATION.md)
- [Register Endpoint](./auth/REGISTER-API.md)
- [Feature README](./auth/README.md)

---

### [Subscription](./subscription/)

- Stripe payment integration
- Dual account support (Malaysia + Atlas)
- Checkout session management
- Webhook handling

**Documentation:**

- [API Documentation](./subscription/API-DOCUMENTATION.md)
- [Implementation Summary](./subscription/IMPLEMENTATION-SUMMARY.md)
- [Stripe Webhooks](./subscription/STRIPE-WEBHOOKS.md)
- [Feature README](./subscription/README.md)

---

### [Hub Profile](./hub/)

- Hub onboarding flow
- Multi-step form support
- Plan-based field handling (Scale vs Soar)
- Reference data integration

**Documentation:**

- [Hub Profile API](./hub/HUB-PROFILE-API.md)
- [Onboarding Flow Plan](./hub/HUB-ONBOARDING-FLOW-PLAN.md)
- [Complete Hub Flow](./hub/COMPLETE-HUB-FLOW.md)
- [Implementation Status](./hub/ONBOARDING-IMPLEMENTATION-STATUS.md)

---

### [Reference Data](./reference-data/)

- 9 reference data collections
- Full CRUD APIs
- Database seeding
- Integration with Hub and User models

**Documentation:**

- [API Documentation](./reference-data/API-IMPLEMENTATION.md)
- [Seeding Summary](./reference-data/SEEDING-SUMMARY.md)
- [Feature README](./reference-data/README.md)

---

### [Learner Profile](./learner-profile/)

- User profile management
- Slug system
- Profile updates

**Documentation:**

- [API Documentation](./learner-profile/API-DOCUMENTATION.md)
- [Feature README](./learner-profile/README.md)

---

## 🚀 Adding New Features

When adding a new feature (e.g., payments, bookings, notifications):

### 1. Create Feature Folder

```bash
mkdir -p docs/features/<feature-name>
```

### 2. Create Documentation Files

```bash
# Required
touch docs/features/<feature-name>/README.md
touch docs/features/<feature-name>/API-DOCUMENTATION.md

# Optional (as needed)
touch docs/features/<feature-name>/EXAMPLES.md
touch docs/features/<feature-name>/INTEGRATION.md
```

### 3. Document Structure

**README.md** - Feature overview

- What the feature does
- Key capabilities
- Quick examples
- Links to detailed docs

**API-DOCUMENTATION.md** - Complete API reference

- All endpoints
- Request/response examples
- Error codes
- Testing examples

**EXAMPLES.md** (optional) - Code examples

- Integration examples
- Frontend code
- Common use cases

---

## 📋 Future Features (Planned)

Add folders here as needed:

```
docs/features/
├── auth/           ← Current (complete)
├── users/          ← User management
├── payments/       ← Payment processing
├── bookings/       ← Booking system
├── notifications/  ← Email/push notifications
└── analytics/      ← Analytics & reporting
```

---

## 🎯 Documentation Standards

Each feature should have:

- ✅ README.md (overview)
- ✅ API-DOCUMENTATION.md (complete API reference)
- ✅ Examples (if complex)
- ✅ Clear structure
- ✅ Up-to-date information

---

**Keep documentation organized as the project grows!** 📚
