# Mereka Backend v2

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Fastify](https://img.shields.io/badge/Fastify-5.2-green.svg)](https://fastify.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB-8.0-green.svg)](https://www.mongodb.com/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![Stripe](https://img.shields.io/badge/Stripe-Payments-purple.svg)](https://stripe.com/)

**Complete backend API** for Mereka platform - a comprehensive marketplace for learning experiences, expert hiring, and business management.

## 🎯 Features

### Core Platform
- ✅ **Authentication** - Email/password + social login (Google, Facebook)
- ✅ **User Management** - Learner & Expert profiles with slug system
- ✅ **Hub Management** - Business/organization profiles with plan-based features
- ✅ **Subscription System** - Scale & Soar plans with dual Stripe support (MY/International)

### Jobs & Contracts
- ✅ **Job Posting** - Create and manage job listings with categories and requirements
- ✅ **Job Applications** - Expert applications with proposals and pricing
- ✅ **Contracts** - Hourly and fixed-price contract management
- ✅ **Milestones** - Fixed-price contract milestone tracking with Stripe escrow payments

### Time & Payments
- ✅ **Time Tracking** - Work logs for hourly contracts with approval workflow
- ✅ **Weekly Payouts** - Automated weekly payment processing for approved work
- ✅ **Milestone Payments** - Fund, release, and refund milestone escrow payments
- ✅ **Pending Payment Retry** - Failed payment retry with exponential backoff

### Bookings & Experiences
- ✅ **Experience Management** - Events, workshops, and learning experiences
- ✅ **Booking System** - Full booking workflow with payment integration
- ✅ **Recurring Events** - Support for recurring experience schedules

### Operations
- ✅ **Cron Job System** - Scheduled background job processing with monitoring
- ✅ **Bank Accounts** - Expert payout bank account management via Stripe Connect
- ✅ **Withdrawals** - Expert withdrawal requests and payout tracking
- ✅ **Notifications** - Email templates and notification system

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run dev
```

**Server**: http://localhost:3000
**Swagger**: http://localhost:3000/docs

### Required Environment Variables

```bash
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_secret_32_chars_minimum
COOKIE_DOMAIN=.mereka.io
# Stripe Multi-Region Configuration
STRIPE_ATLAS_SECRET_KEY=sk_xxx          # Atlas/Global account
STRIPE_ATLAS_WEBHOOK_SECRET=whsec_REDACTED
STRIPE_ATLAS_PUBLISHABLE_KEY=pk_xxx
STRIPE_MY_SECRET_KEY=sk_xxx             # Malaysia account
STRIPE_MY_WEBHOOK_SECRET=whsec_REDACTED
STRIPE_MY_PUBLISHABLE_KEY=pk_xxx
```

---

## 📋 API Endpoints (120+ Total)

### Authentication (9 endpoints)
- `GET /auth/user-status` - Check user & get recommended flow
- `POST /auth/register` - Register with email/password
- `POST /auth/login` - Login with email/password
- `POST /auth/login/social` - Login with Google/Facebook
- `POST /auth/refresh` - Refresh access token
- `GET /auth/me` - Get current user
- `POST /auth/change-password` - Change password
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password` - Reset with token

### User & Profile (6 endpoints)
- `GET /learner/profile/me` - Get own profile
- `PATCH /learner/profile/me` - Update profile + slug
- `POST /learner/slug/check` - Check slug availability
- `GET /api/v1/hub-profile` - Get user's hub profile
- `POST /api/v1/hub-profile` - Create hub profile
- `PATCH /api/v1/hub-profile` - Update hub profile

### Jobs (12 endpoints)
- `GET /api/v1/jobs` - List jobs with filters
- `GET /api/v1/jobs/:id` - Get job details
- `POST /api/v1/jobs` - Create job listing
- `PATCH /api/v1/jobs/:id` - Update job
- `DELETE /api/v1/jobs/:id` - Delete job
- `GET /api/v1/jobs/hub/:hubId` - Get hub's jobs
- `GET /api/v1/jobs/:id/applications` - Get job applications
- `POST /api/v1/jobs/:id/apply` - Apply to job
- `PATCH /api/v1/jobs/applications/:id` - Update application status
- `GET /api/v1/jobs/applications/me` - Get my applications
- `GET /api/v1/jobs/my-jobs` - Get jobs I created
- `GET /api/v1/jobs/assigned` - Get assigned jobs

### Contracts (10 endpoints)
- `GET /api/v1/contracts` - List contracts
- `GET /api/v1/contracts/:id` - Get contract details
- `POST /api/v1/contracts` - Create contract
- `PATCH /api/v1/contracts/:id` - Update contract
- `POST /api/v1/contracts/:id/accept` - Accept contract
- `POST /api/v1/contracts/:id/reject` - Reject contract
- `POST /api/v1/contracts/:id/complete` - Complete contract
- `POST /api/v1/contracts/:id/cancel` - Cancel contract
- `GET /api/v1/contracts/expert/:expertId` - Expert's contracts
- `GET /api/v1/contracts/hub/:hubId` - Hub's contracts

### Milestones (8 endpoints)
- `GET /api/v1/milestones/contract/:contractId` - Get contract milestones
- `POST /api/v1/milestones` - Create milestone
- `PATCH /api/v1/milestones/:id` - Update milestone
- `DELETE /api/v1/milestones/:id` - Delete milestone
- `POST /api/v1/milestones/:id/fund` - Fund milestone (escrow)
- `POST /api/v1/milestones/:id/release` - Release milestone payment
- `POST /api/v1/milestones/:id/refund` - Refund milestone
- `POST /api/v1/milestones/batch` - Batch operations

### Timelogs (8 endpoints)
- `GET /api/v1/timelogs` - List timelogs
- `GET /api/v1/timelogs/:id` - Get timelog details
- `POST /api/v1/timelogs` - Create timelog
- `PATCH /api/v1/timelogs/:id` - Update timelog
- `DELETE /api/v1/timelogs/:id` - Delete timelog
- `POST /api/v1/timelogs/:id/approve` - Approve timelog
- `POST /api/v1/timelogs/:id/reject` - Reject timelog
- `GET /api/v1/timelogs/contract/:contractId` - Contract timelogs

### Bookings (10 endpoints)
- `GET /api/v1/bookings` - List bookings
- `GET /api/v1/bookings/:id` - Get booking details
- `POST /api/v1/bookings` - Create booking
- `PATCH /api/v1/bookings/:id` - Update booking
- `POST /api/v1/bookings/:id/confirm` - Confirm booking
- `POST /api/v1/bookings/:id/cancel` - Cancel booking
- `POST /api/v1/bookings/:id/complete` - Complete booking
- `GET /api/v1/bookings/user/:userId` - User's bookings
- `GET /api/v1/bookings/hub/:hubId` - Hub's bookings
- `GET /api/v1/bookings/experience/:experienceId` - Experience bookings

### Stripe Payments (12 endpoints)
- `POST /api/v1/stripe/setup-intent` - Create setup intent
- `POST /api/v1/stripe/payment-intent` - Create payment intent
- `GET /api/v1/stripe/payment-methods` - List payment methods
- `DELETE /api/v1/stripe/payment-methods/:id` - Delete payment method
- `POST /api/v1/stripe/connect/create` - Create Connect account
- `GET /api/v1/stripe/connect/status` - Get Connect status
- `POST /api/v1/stripe/connect/dashboard-link` - Get dashboard link
- `POST /api/v1/stripe/webhooks` - Stripe webhook handler
- `GET /api/v1/stripe/balance` - Get Stripe balance
- `POST /api/v1/stripe/payout` - Create payout
- `GET /api/v1/stripe/payouts` - List payouts
- `GET /api/v1/stripe/transactions` - List transactions

### Cron Jobs (7 endpoints)
- `GET /api/v1/cron-jobs/runs` - List job runs with filters
- `GET /api/v1/cron-jobs/statistics` - Get job statistics
- `GET /api/v1/cron-jobs/recent` - Get recent job runs
- `GET /api/v1/cron-jobs/stuck` - Find stuck jobs
- `GET /api/v1/cron-jobs/registered` - List registered jobs
- `POST /api/v1/cron-jobs/trigger` - Manually trigger job
- `GET /api/v1/cron-jobs/run/:id` - Get specific job run

### Reference Data (45+ endpoints)
9 Collections with full CRUD:
- **Focus Areas** - Expertise categories
- **Amenities** - Hub amenities
- **Facilities** - Hub facilities
- **Skills** - Expert skills
- **Job Preferences** - Work type preferences
- **Languages** - Supported languages
- **Space Types** - Physical space categories
- **Experience Types** - Event/workshop types
- **Company Types** - Organization types

---

## 🗄️ Data Models (39 Total)

### Core Models (8)
| Model | Description | Collection |
|-------|-------------|------------|
| User | Auth, learner & expert profiles | users |
| Hub | Business/organization data | hubs |
| Subscription | Payment tracking | subscriptions |
| SubscriptionProduct | Plan configurations | subscriptionProducts |
| Slug | URL management | slugs |
| Role | User roles | roles |
| Permission | Access permissions | permissions |
| HubMember | Hub membership | hubMembers |

### Jobs & Contracts (6)
| Model | Description | Collection |
|-------|-------------|------------|
| Job | Job listings | jobs |
| JobProposal | Job applications | jobProposals |
| Contract | Work contracts | contracts |
| Milestone | Fixed-price milestones | milestones |
| MilestonePayment | Milestone escrow payments | milestonePayments |
| Timelog | Work time tracking | timelogs |

### Payments (5)
| Model | Description | Collection |
|-------|-------------|------------|
| BookingTransaction | Payment transactions | bookingTransactions |
| PendingPayment | Failed payment retry queue | pendingPayments |
| BankAccount | Expert bank accounts | bankAccounts |
| Withdrawal | Payout requests | withdrawals |
| Invoice | Invoice records | invoices |

### Experiences & Bookings (5)
| Model | Description | Collection |
|-------|-------------|------------|
| Experience | Learning experiences | experiences |
| ExperienceEvent | Event instances | experienceEvents |
| Booking | Booking records | bookings |
| Expertise | Expert expertise areas | expertise |
| InvitationLink | Invitation links | invitationLinks |

### Operations (4)
| Model | Description | Collection |
|-------|-------------|------------|
| CronJobRun | Job execution logs | cronJobRuns |
| EmailTemplate | Email templates | emailTemplates |
| NotificationTemplate | Notification templates | notificationTemplates |
| Notification | User notifications | notifications |

### Reference Data (9)
| Model | Description | Collection |
|-------|-------------|------------|
| FocusArea | Expertise categories | focusAreas |
| Amenity | Hub amenities | amenities |
| Facility | Hub facilities | facilities |
| Skill | Expert skills | skills |
| JobPreference | Work preferences | jobPreferences |
| Language | Supported languages | languages |
| SpaceType | Space categories | spaceTypes |
| ExperienceType | Event types | experienceTypes |
| CompanyType | Organization types | companyTypes |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       Mereka Platform                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Users                    Hubs                               │
│  ├── Learners            ├── Hub Profiles                   │
│  ├── Experts             ├── Job Postings                   │
│  └── Hub Owners          └── Experiences                    │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Jobs & Contracts        Payments                            │
│  ├── Job Listings        ├── Stripe Integration             │
│  ├── Applications        ├── Weekly Payouts                 │
│  ├── Contracts           ├── Milestone Escrow               │
│  ├── Timelogs            ├── Pending Retry Queue            │
│  └── Milestones          └── Expert Withdrawals             │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Background Jobs         Bookings                            │
│  ├── Weekly Payout       ├── Experience Bookings            │
│  ├── Milestone Release   ├── Payment Processing             │
│  └── Pending Retry       └── Recurring Events               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Contract Types

**Hourly Contracts:**
- Expert logs time via Timelogs
- Client approves/rejects timelogs
- Weekly cron job processes approved timelogs
- Payment via Stripe PaymentIntent

**Fixed-Price Contracts:**
- Work divided into Milestones
- Client funds milestone (escrow via PaymentIntent)
- Expert completes work
- Client releases payment or auto-release after approval window

---

## ⚙️ Cron Jobs

| Job Name | Schedule | Description |
|----------|----------|-------------|
| `weekly-payout-processor` | Sun 00:00 | Process weekly payments for hourly contracts |
| `auto-release-milestones` | Daily 00:00 | Auto-release approved milestones after window |
| `pending-payment-retry` | Every 6h | Retry failed payments with exponential backoff |

### Monitoring
- Job runs tracked in `CronJobRun` collection
- Statistics and stuck job detection
- Manual trigger capability via API

---

## 🔐 Security

- ✅ bcrypt password hashing (12 rounds)
- ✅ JWT tokens (access + refresh)
- ✅ httpOnly cookies (XSS protection)
- ✅ Multi-domain cookie support
- ✅ Token rotation
- ✅ Input validation with Zod
- ✅ Stripe webhook signature verification
- ✅ Role-based access control

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# Coverage report (80%+ target)
npm run test:coverage

# Watch mode
npm run test:watch
```

### Test Structure
```
tests/
├── unit/           # Service tests (mocked DB)
├── integration/    # API tests (real DB)
├── e2e/            # End-to-end flows
└── fixtures/       # Test data
```

---

## 📖 Documentation

Organized in `docs/` folder:

- **[BUILDING.md](./docs/BUILDING.md)** - Build system guide
- **[VALIDATION_SYSTEMS.md](./docs/VALIDATION_SYSTEMS.md)** - Quality gates
- **[docs/api/](./docs/api/)** - API documentation
- **[docs/models/](./docs/models/)** - Model documentation
- **[docs/features/](./docs/features/)** - Feature guides
- **[docs/architecture/](./docs/architecture/)** - System design

---

## 📦 Project Structure

```
src/
├── models/         # Mongoose models (39 models)
├── schemas/        # Zod validation schemas
├── services/       # Business logic (36 services)
├── controllers/    # HTTP request handlers
├── routes/         # API route definitions
├── jobs/           # Cron job handlers
├── middlewares/    # Custom middleware
├── plugins/        # Fastify plugins
├── config/         # Configuration
├── utils/          # Helper functions
├── types/          # TypeScript types
├── app.ts          # Fastify app initialization
└── server.ts       # Server entry point

tests/
├── unit/           # Unit tests
├── integration/    # Integration tests
├── e2e/            # End-to-end tests
├── fixtures/       # Test data
└── setup.ts        # Test configuration

docs/
├── api/            # API documentation
├── models/         # Model documentation
├── features/       # Feature guides
├── architecture/   # System design docs
└── dev/            # Developer guides
```

---

## 🌍 Regional Support

**Dual Stripe Accounts:**
- Malaysia: For Malaysian customers (MYR)
- Atlas: For international customers (USD, etc.)
- SubscriptionProduct stores both price IDs
- Backend selects based on user region

---

## 🚀 Deployment

### Environment Configuration
See `.env.example` for all required variables.

### Health Check
- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed system status

### Kubernetes
Deployment configurations available for GKE with:
- MongoDB port-forwarding support
- Horizontal pod autoscaling
- Secrets management

---

## 📊 Quality Gates

```bash
# Full validation (run before committing)
npm run check

# Quick check
npm run check:fast

# Individual checks
npm run lint          # Biome lint
npm run format:check  # Format check
npm run type-check    # TypeScript
```

---

**Production-ready platform!** 🚀

For detailed documentation, see `docs/` folder.
