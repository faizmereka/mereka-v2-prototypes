# BookingTransaction Model Documentation

## Overview

The `BookingTransaction` model represents all booking/purchase transactions in the Mereka platform. It handles bookings for experiences, expertise consultations, space rentals, and job payment links.

**Collection Name:** `bookingTransactions`

**Location:** `src/models/BookingTransaction.ts`

---

## Model Structure

### Core Information

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `serviceType` | `ServiceType` | ✅ | Type of service (experience/expertise/space/jobPaymentLink) |
| `serviceId` | `ObjectId` | ✅ | Reference to the service (dynamic ref based on serviceType) |
| `hubId` | `ObjectId` | ✅ | Reference to Hub |
| `bookedBy` | `ObjectId` | ✅ | Reference to User who made the booking |
| `eventId` | `ObjectId` | ❌ | Reference to ExperienceEvent (for experiences only) |
| `scheduleId` | `string` | ❌ | Schedule identifier |

### Booking Dates & Times

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `bookingStartDate` | `Date` | ✅ | Booking start date/time |
| `bookingEndDate` | `Date` | ✅ | Booking end date/time |
| `timeZone` | `string` | ✅ | Timezone for the booking (default: Asia/Kuala_Lumpur) |
| `startDateTime` | `Date` | ❌ | Alternative start time (for expertise/jobs) |
| `endDateTime` | `Date` | ❌ | Alternative end time (for expertise/jobs) |

### Participants

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `learnerDetail` | `ILearnerDetail[]` | ✅ | Array of participants (min 1 required) |
| `selectedTickets` | `ISelectedTicket[]` | ✅ | Array of selected tickets (min 1 required) |

### Pricing

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `totalCost` | `number` | ✅ | Total cost of booking |
| `currency` | `string` | ✅ | Currency code (default: MYR) |
| `discountAmount` | `number` | ❌ | Discount applied |
| `refundAmount` | `number` | ❌ | Amount refunded |
| `totalStripeFee` | `number` | ❌ | Stripe processing fees |
| `transferAmount` | `number` | ❌ | Amount transferred to hub |
| `totalHours` | `number` | ❌ | Total hours booked |

### Payment Information

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `cardId` | `string` | ❌ | Card identifier |
| `cardType` | `string` | ❌ | Card type (Visa/Mastercard/etc) |
| `cardLastDigit` | `string` | ❌ | Last 4 digits of card |
| `stripeTransactionId` | `string` | ❌ | Stripe payment intent ID |
| `stripeResponse` | `object` | ❌ | Full Stripe response |
| `refundResponse` | `object` | ❌ | Refund response data |
| `stripeFeePayBy` | `PayBy` | ❌ | Who pays stripe fee (hub/learner) |
| `payBy` | `PayBy` | ❌ | Payment responsibility |

### Statuses

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `status` | `BookingStatus` | ✅ | `pending` | Booking status |
| `stripeStatus` | `StripeStatus` | ✅ | `pending` | Payment status |
| `merekaStatus` | `string` | ✅ | - | Internal Mereka status |
| `disputeStatus` | `DisputeStatus` | ✅ | `none` | Payment dispute status |

### Flags

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `isFree` | `boolean` | `false` | Free booking (no payment) |
| `isMalaysian` | `boolean` | `false` | Malaysian booking flag |
| `isPrivateBooking` | `boolean` | `false` | Private booking |
| `isWalkingBooking` | `boolean` | `false` | Walk-in booking |
| `canBookOngoingEvent` | `boolean` | `false` | Can book ongoing events |

### Promotions & Coupons

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `isCouponUsed` | `boolean` | `false` | Coupon applied |
| `isHubCouponUsed` | `boolean` | `false` | Hub-specific coupon used |
| `promotionCode` | `string` | - | Promotion code applied |
| `isDiscoveryPassBooking` | `boolean` | `false` | Discovery pass booking |

### Financial Tracking

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `isRedeemDone` | `boolean` | `false` | Redeem processed |
| `isMoneyTransferred` | `string` | - | Money transfer status |
| `isRefunded` | `boolean` | `false` | Refund processed |
| `isScholarBooking` | `boolean` | `false` | Scholarship booking |

### Notification Tracking

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `isBookingSuccessNotificationSentToExpert` | `boolean` | `false` | Success email to expert |
| `isBookingSuccessNotificationSentToLearner` | `boolean` | `false` | Success email to learner |
| `isBookingRejectNotificationSentToExpert` | `boolean` | `false` | Rejection email to expert |
| `isBookingRejectNotificationSentToLearner` | `boolean` | `false` | Rejection email to learner |
| `isBookingWithdrawalNotificationSentToLearner` | `boolean` | `false` | Withdrawal email to learner |
| `isBookingWithdrawalNotificationSentToExpert` | `boolean` | `false` | Withdrawal email to expert |

### Cancellation

| Field | Type | Description |
|-------|------|-------------|
| `cancelledBy` | `ObjectId` | User who cancelled |
| `cancelledDate` | `Date` | Cancellation timestamp |
| `cancellationReason` | `string` | Reason for cancellation (max 1000 chars) |

### UTM Tracking

| Field | Type | Description |
|-------|------|-------------|
| `utm_medium` | `string` | Marketing medium |
| `utm_campaign` | `string` | Campaign name |
| `utm_term` | `string` | Campaign term |
| `utm_content` | `string` | Campaign content |
| `utm_id` | `string` | Campaign ID |

### Job-Related (jobPaymentLink type)

| Field | Type | Description |
|-------|------|-------------|
| `jobId` | `ObjectId` | Reference to Job |
| `applicationId` | `ObjectId` | Reference to Application |

### Additional Fields

| Field | Type | Description |
|-------|------|-------------|
| `addedByHub` | `ObjectId` | Hub/User who created the booking |
| `phoneNumber` | `string` | Contact phone number |
| `questionnaireFormData` | `array` | Questionnaire responses |
| `createdDate` | `Date` | Creation timestamp |
| `createdAt` | `Date` | Auto-generated creation timestamp |
| `updatedAt` | `Date` | Auto-generated update timestamp |

---

## Subdocuments

### ILearnerDetail

Represents a participant in the booking.

```typescript
interface ILearnerDetail {
  id: number;                // Learner sequence number
  name: string;              // Full name
  email: string;             // Email address
  phone?: string;            // Phone number
  attendance?: boolean;      // Attended the event
  attendanceDate?: Date;     // Attendance timestamp
  ticketId?: string;         // Ticket ID assigned
  ticketName?: string;       // Ticket name
  ticketType?: string;       // Ticket type
  isBooker?: boolean;        // Is the person who made booking
  isEmailSent?: boolean;     // Confirmation email sent
}
```

### ISelectedTicket

Represents tickets selected for the booking.

```typescript
interface ISelectedTicket {
  id: string;                      // Ticket ID
  numberOfSelectedTickets: number; // Quantity selected
  standardRate: number;            // Price per ticket
  ticketName: string;              // Ticket name
  ticketType?: string;             // Ticket type
  ticketPeriod?: string;           // Validity period
  sessionDuration?: string;        // Session length
  expertiseMode?: string;          // Expertise mode (for expertise bookings)
}
```

---

## Enums

### ServiceType

```typescript
enum ServiceType {
  EXPERIENCE = 'experience',
  EXPERTISE = 'expertise',
  SPACE = 'space',
  JOB_PAYMENT_LINK = 'jobPaymentLink',
}
```

### BookingStatus

```typescript
enum BookingStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  WITHDRAWN = 'withdrawn',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}
```

### StripeStatus

```typescript
enum StripeStatus {
  PENDING = 'pending',
  SUCCEEDED = 'succeeded',
  REQUIRES_PAYMENT_METHOD = 'requires_payment_method',
  REQUIRES_CONFIRMATION = 'requires_confirmation',
  REQUIRES_ACTION = 'requires_action',
  PROCESSING = 'processing',
  REQUIRES_CAPTURE = 'requires_capture',
  CANCELED = 'canceled',
  FAILED = 'failed',
}
```

### DisputeStatus

```typescript
enum DisputeStatus {
  NONE = 'none',
  OPENED = 'opened',
  UNDER_REVIEW = 'under_review',
  WON = 'won',
  LOST = 'lost',
  CLOSED = 'closed',
}
```

### PayBy

```typescript
enum PayBy {
  HUB = 'hub',
  LEARNER = 'learner',
}
```

---

## Indexes

### Single Field Indexes

- `serviceType` - Filter by service type
- `serviceId` - Find bookings for specific service
- `hubId` - Find bookings for specific hub
- `bookedBy` - Find user's bookings
- `eventId` - Find bookings for specific event
- `scheduleId` - Find bookings for specific schedule
- `bookingStartDate` - Sort by start date
- `bookingEndDate` - Sort by end date
- `stripeTransactionId` - Find by payment ID
- `status` - Filter by booking status
- `stripeStatus` - Filter by payment status
- `merekaStatus` - Filter by internal status
- `disputeStatus` - Filter by dispute status
- `createdAt` - Sort by creation date

### Compound Indexes

```typescript
// Hub bookings sorted by date
{ hubId: 1, bookingStartDate: -1 }

// User bookings sorted by date
{ bookedBy: 1, bookingStartDate: -1 }

// Event bookings by status
{ eventId: 1, status: 1 }

// Service bookings by date
{ serviceId: 1, bookingStartDate: 1 }

// Filter by status and type
{ status: 1, serviceType: 1 }

// Payment status queries
{ stripeStatus: 1, status: 1 }

// Completed bookings
{ bookingEndDate: 1, status: 1 }
```

### Text Index

```typescript
{
  'learnerDetail.name': 'text',
  'learnerDetail.email': 'text',
  'promotionCode': 'text'
}
```

---

## Usage Examples

### Create a Booking

```typescript
import { BookingTransaction, ServiceType, BookingStatus, StripeStatus } from '@models/BookingTransaction';

const booking = await BookingTransaction.create({
  serviceType: ServiceType.EXPERIENCE,
  serviceId: experienceId,
  hubId: hubId,
  bookedBy: userId,
  eventId: eventId,
  bookingStartDate: new Date('2025-12-01T10:00:00Z'),
  bookingEndDate: new Date('2025-12-01T12:00:00Z'),
  timeZone: 'Asia/Kuala_Lumpur',
  learnerDetail: [
    {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
      isBooker: true,
    }
  ],
  selectedTickets: [
    {
      id: 'ticket-123',
      numberOfSelectedTickets: 2,
      standardRate: 50.00,
      ticketName: 'Standard Ticket',
    }
  ],
  totalCost: 100.00,
  currency: 'MYR',
  status: BookingStatus.PENDING,
  stripeStatus: StripeStatus.PENDING,
  merekaStatus: 'pending',
});
```

### Find User's Bookings

```typescript
const userBookings = await BookingTransaction.find({
  bookedBy: userId,
  status: BookingStatus.ACTIVE,
})
  .sort({ bookingStartDate: -1 })
  .populate('hubId', 'name logo')
  .lean();
```

### Find Hub's Upcoming Bookings

```typescript
const upcomingBookings = await BookingTransaction.find({
  hubId: hubId,
  bookingStartDate: { $gte: new Date() },
  status: { $in: [BookingStatus.ACTIVE, BookingStatus.PENDING] },
})
  .sort({ bookingStartDate: 1 })
  .lean();
```

### Find Event Bookings

```typescript
const eventBookings = await BookingTransaction.find({
  eventId: eventId,
  status: { $ne: BookingStatus.CANCELLED },
})
  .populate('bookedBy', 'name email')
  .lean();
```

### Update Booking Status

```typescript
await BookingTransaction.findByIdAndUpdate(
  bookingId,
  {
    status: BookingStatus.ACTIVE,
    stripeStatus: StripeStatus.SUCCEEDED,
    stripeTransactionId: paymentIntentId,
    stripeResponse: stripePaymentIntent,
  },
  { new: true }
);
```

### Cancel Booking

```typescript
await BookingTransaction.findByIdAndUpdate(
  bookingId,
  {
    status: BookingStatus.CANCELLED,
    cancelledBy: userId,
    cancelledDate: new Date(),
    cancellationReason: 'User requested cancellation',
  },
  { new: true }
);
```

### Search Bookings by Learner

```typescript
const bookings = await BookingTransaction.find({
  $text: { $search: 'john@example.com' },
})
  .sort({ score: { $meta: 'textScore' } })
  .lean();
```

### Get Bookings with Pending Payments

```typescript
const pendingPayments = await BookingTransaction.find({
  stripeStatus: { $in: [StripeStatus.PENDING, StripeStatus.REQUIRES_PAYMENT_METHOD] },
  createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24 hours
})
  .populate('bookedBy', 'name email')
  .lean();
```

### Aggregation: Revenue by Service Type

```typescript
const revenue = await BookingTransaction.aggregate([
  {
    $match: {
      status: BookingStatus.ACTIVE,
      stripeStatus: StripeStatus.SUCCEEDED,
      bookingStartDate: {
        $gte: new Date('2025-01-01'),
        $lt: new Date('2025-12-31'),
      },
    },
  },
  {
    $group: {
      _id: '$serviceType',
      totalRevenue: { $sum: '$totalCost' },
      count: { $sum: 1 },
    },
  },
  {
    $sort: { totalRevenue: -1 },
  },
]);
```

---

## Validation Rules

### Required Fields

- `serviceType`, `serviceId`, `hubId`, `bookedBy` - Must be provided
- `bookingStartDate`, `bookingEndDate` - Required date range
- `timeZone` - Required timezone string
- `learnerDetail` - At least one learner required
- `selectedTickets` - At least one ticket required
- `totalCost` - Required, minimum 0
- `currency` - Required currency code
- `status`, `stripeStatus`, `merekaStatus` - Required status fields

### Data Validation

- `totalCost`, `discountAmount`, `refundAmount` - Must be >= 0
- `numberOfSelectedTickets` - Must be >= 0
- `standardRate` - Must be >= 0
- `cancellationReason` - Max 1000 characters
- Email fields - Stored in lowercase
- String fields - Automatically trimmed

---

## Migration Notes

### From Firebase to MongoDB

**Firebase Collection:** `bookingTransaction`

**Key Differences:**

1. **Field Name Changes:**
   - Firebase: `$key` → MongoDB: `_id`
   - Firebase: `bookedByUser` (object) → MongoDB: `bookedBy` (ObjectId reference)

2. **Date Handling:**
   - Firebase: ISO strings or Timestamp objects
   - MongoDB: Native Date objects

3. **Reference Fields:**
   - All ID fields converted to `ObjectId` type
   - Dynamic references using `refPath` for `serviceId`

4. **Subdocuments:**
   - `learnerDetail` and `selectedTickets` converted to embedded subdocuments
   - Schema validation applied to subdocuments

5. **Indexes:**
   - Comprehensive indexing strategy for performance
   - Compound indexes for common query patterns
   - Text index for search functionality

---

## Related Models

- `User` - Booking user (bookedBy, cancelledBy)
- `Hub` - Service provider (hubId, addedByHub)
- `Experience` - Experience bookings (serviceId when serviceType = 'experience')
- `ExperienceEvent` - Event reference (eventId)
- `Job` - Job bookings (jobId for jobPaymentLink type)
- `Application` - Job application (applicationId)

---

## Best Practices

1. **Always populate related data** when querying for API responses
2. **Use lean()** for read-only operations to improve performance
3. **Index frequently queried fields** - already configured
4. **Use transactions** when updating booking + related collections
5. **Validate ticket availability** before creating bookings
6. **Track notification flags** to prevent duplicate emails
7. **Store full Stripe responses** for debugging and auditing
8. **Use compound indexes** for complex queries

---

## Security Considerations

1. **Sensitive Data:**
   - `stripeResponse` and `refundResponse` may contain sensitive payment data
   - Ensure proper access controls when exposing via API

2. **PII (Personal Identifiable Information):**
   - `learnerDetail` contains names, emails, phone numbers
   - Apply GDPR compliance when handling this data

3. **Financial Data:**
   - All monetary fields should be validated
   - Use decimal precision for currency calculations

---

## Performance Tips

1. **Use compound indexes** for multi-field queries
2. **Project only needed fields** using `.select()`
3. **Use pagination** for large result sets
4. **Cache frequently accessed data** (e.g., user's upcoming bookings)
5. **Use aggregation pipelines** for complex analytics
6. **Consider read replicas** for reporting queries

---

**Last Updated:** 2025-11-13
**Model Version:** 1.0.0
