# BookingTransaction Model - Analysis & Implementation Summary

## Analysis Overview

**Date:** 2025-11-13
**Status:** ✅ Model Created and Validated

---

## 📋 Frontend & Cloud Functions Analysis

### Sources Analyzed

1. **Frontend Checkout Code:**
   - Location: `/Users/hiramaniupadhyay/Documents/projects/Mereka/mereka-web/projects/checkout`
   - Models: `checkoutbooking.model.ts`, `checkoutstate.model.ts`, `experienceTicket.model.ts`
   - Services: `stripe.service.ts`

2. **Cloud Functions Code:**
   - Location: `/Users/hiramaniupadhyay/Documents/projects/Mereka/mereka-cloudfunctions/functions/src`
   - Models: `booking.model.ts`, `learnerDetail.model.ts`
   - Services: `bookingTransaction.service.ts`, `stripe.service.ts`
   - Controllers: `onCreateBookingTransaction.ts`, `onUpdateBookingTransaction.ts`, `onCancelBookingTransaction.ts`

### Key Findings

#### Service Types Supported

1. **Experience** - Regular experience bookings with events
2. **Expertise** - Expert consultation bookings
3. **Space** - Space/venue rental bookings
4. **Job Payment Link** - Job marketplace payment processing

#### Data Flow

```
Frontend Checkout → Firebase Function → Create BookingTransaction
                                     ↓
                    Stripe Payment Processing
                                     ↓
                    Send Confirmation Emails
                                     ↓
                    Update Related Collections
                                     ↓
                    Trigger Webhooks & Notifications
```

#### Critical Fields Identified

**Core Booking Data:**
- Service identification (serviceType, serviceId, eventId)
- Booking timeframe (bookingStartDate, bookingEndDate, timeZone)
- Participant information (learnerDetail array)
- Ticket selection (selectedTickets array)

**Payment Processing:**
- Stripe integration (stripeTransactionId, stripeResponse, stripeStatus)
- Card information (cardId, cardType, cardLastDigit)
- Fee handling (stripeFeePayBy, totalStripeFee)
- Pricing (totalCost, currency, discountAmount, refundAmount)

**Status Tracking:**
- Booking status (pending → active → completed/cancelled)
- Payment status (Stripe payment intent lifecycle)
- Mereka internal status
- Dispute status

**Notification System:**
- 6 different notification flags for expert/learner
- Tracks success, rejection, and withdrawal notifications
- Prevents duplicate email sends

**Business Logic:**
- Coupon/promotion support (isCouponUsed, promotionCode)
- Free booking handling (isFree)
- Malaysian user tracking (isMalaysian)
- Private vs public bookings (isPrivateBooking)
- Walk-in booking support (isWalkingBooking)
- Discovery pass integration (isDiscoveryPassBooking)
- Scholar booking support (isScholarBooking)

**Marketing Analytics:**
- Full UTM parameter tracking (utm_medium, utm_campaign, utm_term, utm_content, utm_id)

---

## 🏗️ MongoDB Model Implementation

### Model Location
`src/models/BookingTransaction.ts`

### Key Design Decisions

#### 1. **Dynamic References**
```typescript
serviceId: {
  type: Schema.Types.ObjectId,
  refPath: 'serviceType', // Dynamic based on serviceType
}
```
- Allows serviceId to reference Experience, Expertise, or Space dynamically
- Maintains referential integrity across different service types

#### 2. **Embedded Subdocuments**
- `learnerDetail[]` - Embedded participant information
- `selectedTickets[]` - Embedded ticket selection
- Both validated to require at least one entry

#### 3. **Comprehensive Enums**
```typescript
enum ServiceType { EXPERIENCE, EXPERTISE, SPACE, JOB_PAYMENT_LINK }
enum BookingStatus { PENDING, ACTIVE, CANCELLED, COMPLETED, WITHDRAWN, REJECTED, EXPIRED }
enum StripeStatus { PENDING, SUCCEEDED, REQUIRES_PAYMENT_METHOD, ... }
enum DisputeStatus { NONE, OPENED, UNDER_REVIEW, WON, LOST, CLOSED }
enum PayBy { HUB, LEARNER }
```

#### 4. **Index Strategy**

**Single Field Indexes:**
- All reference fields (serviceType, serviceId, hubId, bookedBy, eventId)
- All date fields (bookingStartDate, bookingEndDate, createdAt)
- All status fields (status, stripeStatus, merekaStatus, disputeStatus)
- Payment tracking (stripeTransactionId)

**Compound Indexes (Optimized for Common Queries):**
```typescript
{ hubId: 1, bookingStartDate: -1 }        // Hub's bookings by date
{ bookedBy: 1, bookingStartDate: -1 }     // User's bookings by date
{ eventId: 1, status: 1 }                 // Event bookings by status
{ serviceId: 1, bookingStartDate: 1 }     // Service bookings by date
{ status: 1, serviceType: 1 }             // Filter by status and type
{ stripeStatus: 1, status: 1 }            // Payment status queries
{ bookingEndDate: 1, status: 1 }          // Completed bookings
```

**Text Search Index:**
```typescript
{
  'learnerDetail.name': 'text',
  'learnerDetail.email': 'text',
  'promotionCode': 'text'
}
```

#### 5. **Field Validations**

- **Required Fields:** Enforced at schema level
- **Minimum Values:** All currency/numeric fields >= 0
- **String Constraints:**
  - Emails: lowercase, trimmed
  - Currency: uppercase (MYR, IDR, etc.)
  - Max lengths on text fields
- **Array Validations:** learnerDetail and selectedTickets require at least 1 entry
- **Enum Validations:** All enum fields restricted to valid values

#### 6. **Timestamps**

```typescript
{
  timestamps: true,     // Auto-generates createdAt and updatedAt
  createdDate: Date,    // Additional field for backward compatibility
}
```

---

## 📊 Field Mapping: Firebase → MongoDB

### Direct Mappings (Same Name)
- All date fields
- All status fields
- All payment fields
- All flag fields (is*, can*)
- All notification flags
- All UTM parameters

### Field Name Changes
| Firebase | MongoDB | Notes |
|----------|---------|-------|
| `$key` | `_id` | Firestore document ID → MongoDB ObjectId |
| `bookedByUser` (object) | `bookedBy` (ObjectId) | Reference to User model |

### Type Conversions
| Firebase | MongoDB | Conversion |
|----------|---------|------------|
| String dates | Date objects | ISO string → Date |
| Firestore Timestamp | Date objects | Timestamp.toDate() → Date |
| Any ID string | ObjectId | Convert to ObjectId |
| Nested objects | Subdocuments | Structured schemas |

### New Validations (Not in Firebase)
- Required field enforcement
- Enum validations
- Min/max constraints
- Email format validation
- Currency format validation
- Array length validation

---

## 🔍 Query Patterns Identified

### From `bookingTransaction.service.ts`:

1. **Get Recent Bookings**
```typescript
// Firebase
.where('bookingEndDate', '<', now)
.where('bookingEndDate', '>', past30Days)

// MongoDB
BookingTransaction.find({
  bookingEndDate: { $gte: past30Days, $lt: now }
})
```

2. **Get Space Bookings in Date Range**
```typescript
// Firebase
.where('serviceId', '==', spaceId)
.filter(bookingStartDate >= start && bookingEndDate < end)

// MongoDB
BookingTransaction.find({
  serviceId: spaceId,
  bookingStartDate: { $gte: start },
  bookingEndDate: { $lt: end }
})
```

3. **Get Bookings for Multiple Events**
```typescript
// Firebase (batch queries with 'in' operator, max 10)
.where('eventId', 'in', [...batch])

// MongoDB (no 10 limit)
BookingTransaction.find({
  eventId: { $in: eventIds }
})
```

4. **Get Bookings by Schedule**
```typescript
// Firebase
.where('scheduleId', '==', scheduleId)

// MongoDB
BookingTransaction.find({ scheduleId })
```

5. **Get Upcoming Bookings for Service**
```typescript
// Firebase
.where('serviceId', '==', serviceId)
.where('bookingStartDate', '>=', now)

// MongoDB
BookingTransaction.find({
  serviceId,
  bookingStartDate: { $gte: new Date() }
})
```

6. **Get Pending Expertise Bookings**
```typescript
// Firebase
.where('status', '==', 'pending')
.where('serviceType', '==', 'expertise')

// MongoDB
BookingTransaction.find({
  status: BookingStatus.PENDING,
  serviceType: ServiceType.EXPERTISE
})
```

---

## 🎯 Next Steps

### Immediate Next Steps (Recommended Order):

1. **✅ DONE - Model Created**
   - BookingTransaction model with full schema
   - All enums defined
   - Comprehensive documentation

2. **📝 Create Zod Schemas** (`src/schemas/bookingTransaction.schema.ts`)
   - CreateBookingTransactionSchema
   - UpdateBookingTransactionSchema
   - QueryBookingTransactionSchema
   - CancelBookingTransactionSchema

3. **⚙️ Create Service** (`src/services/bookingTransaction.service.ts`)
   - CRUD operations
   - Status transitions
   - Payment processing integration
   - Notification triggers
   - Business logic methods:
     - `createBooking()`
     - `updateBookingStatus()`
     - `cancelBooking()`
     - `refundBooking()`
     - `getUpcomingBookings()`
     - `getBookingsByEvent()`
     - `getBookingsByHub()`
     - `getBookingsByUser()`

4. **🎮 Create Controller** (`src/controllers/bookingTransaction.controller.ts`)
   - HTTP request handlers
   - Error handling
   - Response formatting
   - Logging

5. **🛣️ Create Routes** (`src/routes/bookingTransaction.routes.ts`)
   - Define API endpoints
   - Apply validation schemas
   - Add Swagger documentation
   - Routes needed:
     - `POST /api/v1/bookings` - Create booking
     - `GET /api/v1/bookings/:id` - Get booking details
     - `GET /api/v1/bookings` - List bookings (with filters)
     - `PATCH /api/v1/bookings/:id` - Update booking
     - `DELETE /api/v1/bookings/:id` - Cancel booking
     - `POST /api/v1/bookings/:id/refund` - Process refund
     - `GET /api/v1/bookings/user/:userId` - User's bookings
     - `GET /api/v1/bookings/hub/:hubId` - Hub's bookings
     - `GET /api/v1/bookings/event/:eventId` - Event's bookings

6. **🔧 Register Routes** (`src/app.ts`)
   ```typescript
   await fastify.register(bookingTransactionRoutes, {
     prefix: `${env.API_PREFIX}/bookings`
   });
   ```

7. **🧪 Write Tests**
   - `tests/unit/bookingTransaction.service.test.ts`
   - `tests/integration/bookingTransaction.routes.test.ts`
   - Target: 80%+ coverage

8. **🔗 Integration Points**
   - Connect with Stripe service for payment processing
   - Connect with Email service for notifications
   - Connect with Experience/ExperienceEvent for availability
   - Connect with User service for user validation
   - Connect with Hub service for hub validation

---

## 🚨 Important Considerations

### Business Logic to Implement

1. **Ticket Availability Validation**
   - Check available seats before booking
   - Handle concurrent booking requests
   - Update event seat count

2. **Payment Processing**
   - Stripe payment intent creation
   - Webhook handling for payment status updates
   - Refund processing
   - Fee calculation (hub vs learner)

3. **Status Transitions**
   ```
   pending → active (payment succeeded)
   pending → failed (payment failed)
   active → cancelled (user cancellation)
   active → completed (booking ended)
   active → withdrawn (expert withdrawal)
   pending → rejected (expert rejection for expertise)
   pending → expired (cutoff time passed)
   ```

4. **Notification Triggers**
   - Booking confirmation emails
   - Reminder emails (24h before, 1h before)
   - Cancellation emails
   - Rejection/withdrawal emails
   - Refund confirmation emails

5. **Date/Time Handling**
   - Always store in UTC
   - Convert to booking timezone for display
   - Validate booking times (no past bookings)
   - Handle timezone conversions

6. **Cancellation & Refund Policy**
   - Define cancellation cutoff times
   - Calculate refund amounts based on policy
   - Handle partial refunds
   - Update related records (event seats, etc.)

### Security Considerations

1. **Access Control**
   - Users can only view their own bookings
   - Hubs can only view bookings for their services
   - Admins can view all bookings

2. **Payment Data**
   - Never expose full card numbers
   - Secure Stripe response storage
   - PCI compliance

3. **Data Privacy (GDPR)**
   - Personal information in learnerDetail
   - Right to be forgotten
   - Data export capabilities

### Performance Optimization

1. **Database Queries**
   - Use indexes for all queries (already defined)
   - Use .lean() for read-only operations
   - Implement pagination for list endpoints
   - Consider caching for frequently accessed data

2. **Populate Strategy**
   - Only populate needed fields
   - Use select() to limit returned data
   - Consider separate API calls for detailed data

---

## 📝 Code Quality Checklist

- ✅ Model follows TypeScript strict mode
- ✅ All enums properly defined
- ✅ Comprehensive field documentation
- ✅ Proper indexing strategy
- ✅ Validation rules applied
- ✅ Transform functions for JSON output
- ✅ Follows project naming conventions
- ✅ Passes Biome lint checks
- ✅ Passes TypeScript type checks
- ✅ Comprehensive documentation created

---

## 📚 Documentation Created

1. **Model File:** `src/models/BookingTransaction.ts`
   - 600+ lines of well-documented code
   - 5 enums defined
   - 2 subdocument interfaces
   - Main model interface
   - Full Mongoose schema
   - Comprehensive indexing

2. **Documentation File:** `docs/models/BOOKING-TRANSACTION.md`
   - Complete field reference
   - Enum definitions
   - Index strategy
   - Usage examples
   - Migration notes
   - Best practices
   - Security considerations
   - Performance tips

3. **Analysis File:** `BOOKING-TRANSACTION-ANALYSIS.md` (this file)
   - Frontend/backend analysis summary
   - Design decisions
   - Field mappings
   - Query patterns
   - Next steps guide

---

## 🎉 Summary

**Status:** ✅ BookingTransaction Model Successfully Created

**What Was Analyzed:**
- Frontend checkout code (Angular)
- Cloud functions code (Firebase)
- Existing Firebase data model
- Business logic and workflows
- Payment processing flow
- Notification system

**What Was Created:**
- Complete Mongoose model with TypeScript
- All necessary enums
- Subdocument schemas
- Comprehensive indexing
- Validation rules
- Full documentation

**Validation Status:**
- ✅ Biome lint: Passed
- ✅ Format check: Passed
- ✅ TypeScript type check: Passed
- ✅ Follows project standards
- ✅ Ready for service layer implementation

**Lines of Code:**
- Model: ~600 lines
- Documentation: ~800 lines
- Analysis: ~500 lines
- **Total: ~1900 lines of production-ready code and documentation**

---

**Ready for next phase:** Schema → Service → Controller → Routes → Tests

---

_Generated: 2025-11-13_
_Author: Claude Code_
_Project: Mereka Backend v2 Migration_
