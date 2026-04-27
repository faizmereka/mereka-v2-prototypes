# Email Model Documentation

## Overview

The **Email** model tracks all emails sent through the system, including delivery status, SendGrid webhook events, and retry logic.

- **Collection Name**: `emails`
- **Location**: `src/models/Email.ts`
- **Purpose**: Comprehensive email tracking, delivery monitoring, and analytics

---

## Model Structure

### Core Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `toEmail` | String | Yes | Recipient email address (lowercase) |
| `toName` | String | No | Recipient name |
| `fromEmail` | String | No | Sender email address |
| `fromName` | String | No | Sender name |
| `ccEmails` | Array | No | CC email addresses |
| `bccEmails` | Array | No | BCC email addresses |
| `subject` | String | Yes | Email subject line |
| `emailType` | Enum | Yes | Email category/purpose |
| `templateId` | String | No | Reference to NotificationTemplate |
| `data` | Object | No | Template variable data |
| `htmlContent` | String | No | HTML email content |
| `textContent` | String | No | Plain text content |
| `status` | Enum | Yes | Email status (default: PENDING) |
| `priority` | Enum | Yes | Priority level (default: NORMAL) |
| `isInstant` | Boolean | Yes | Send immediately or queue (default: true) |
| `scheduleDate` | Date | No | Scheduled send time |
| `sentAt` | Date | No | When email was sent |
| `deliveredAt` | Date | No | When email was delivered |
| `openedAt` | Date | No | When email was first opened |
| `clickedAt` | Date | No | When link was first clicked |
| `isSkipped` | Boolean | No | Whether email was skipped (default: false) |
| `skipReason` | String | No | Reason for skipping |
| `attempts` | Number | Yes | Send attempt count (default: 0) |
| `maxAttempts` | Number | Yes | Max retry attempts (default: 3) |
| `lastError` | String | No | Last error message |
| `provider` | Enum | Yes | Email provider (default: SENDGRID) |
| `providerMessageId` | String | No | Provider's message ID |
| `sendGridEvents` | Array | No | SendGrid webhook events |
| `metadata` | Object | No | Additional metadata |
| `tags` | Array | No | Tags for categorization |
| `userId` | ObjectId | No | Associated user ID |
| `createdBy` | ObjectId | No | User who triggered email |

### Timestamps

- `createdAt`: Automatically set on creation
- `updatedAt`: Automatically updated on modification

---

## Enums

### EmailStatus

```typescript
enum EmailStatus {
  PENDING = 'PENDING',       // Waiting to be sent
  SCHEDULED = 'SCHEDULED',   // Scheduled for future send
  QUEUED = 'QUEUED',        // In send queue
  SENT = 'SENT',            // Successfully sent
  DELIVERED = 'DELIVERED',   // Delivered to inbox
  OPENED = 'OPENED',        // Email opened by recipient
  CLICKED = 'CLICKED',      // Link clicked
  BOUNCED = 'BOUNCED',      // Email bounced
  FAILED = 'FAILED',        // Send failed
  SKIPPED = 'SKIPPED',      // Intentionally skipped
  UNSUBSCRIBED = 'UNSUBSCRIBED', // User unsubscribed
}
```

### EmailPriority

```typescript
enum EmailPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}
```

### EmailType

Extensive enum covering all email purposes (80+ types):

**Team Management:**
- `ADD_TEAM_MEMBER`
- `ADD_COLLABORATOR_TO_EXPERIENCE`
- `INVITE_COLLABORATOR_TO_EXPERIENCE`
- `REMOVE_HOST_FROM_EXPERIENCE`
- `REMOVE_COLLABORATOR_FROM_EXPERIENCE`

**Subscriptions:**
- `SUBSCRIBE_NEWSLETTER`
- `SUBSCRIPTION_RENEW`
- `SUBSCRIPTION_PAYMENT_FAILED`
- `SUBSCRIPTION_PAYMENT_RECEIPT`

**Bookings:**
- `BOOKING_CONFIRMATION_RECEIPT`
- `BOOKING_CONFIRMATION_FOR_HUB`
- `BOOKING_CANCEL_CONFIRMATION_TO_LEARNER`
- `BOOKING_CANCELLED_HUB_TO_LEARNER`

**Experience:**
- `EXPERIENCE_REMAINDER_USER`
- `EXPERIENCE_REMAINDER_HUB_ONLINE`
- `EXPERIENCE_REMAINDER_HUB_PHYSICAL`
- `EXPERIENCE_ONE_HOUR_REMAINDER`

**Jobs:**
- `JOB_LIVE_EMAIL`
- `JOB_MATCH_EMAIL_TO_EXPERT`
- `JOB_OFFER_EMAIL_TO_EXPERT`

**Payments:**
- `PAYMENT_SUCCESS_EMAIL_TO_USER`
- `PAYMENT_FAILURE_EMAIL_TO_JOBPOSTER`
- `PAYMENT_RECEIVED_EMAIL_TO_EXPERT`

*(See full list in src/models/Email.ts)*

---

## Subdocuments

### SendGrid Event

Tracks SendGrid webhook events:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `event` | String | Yes | Event type (processed, delivered, bounce, etc.) |
| `timestamp` | Date | Yes | Event timestamp |
| `sg_event_id` | String | No | SendGrid event ID |
| `sg_message_id` | String | No | SendGrid message ID |
| `reason` | String | No | Reason for bounce/failure |
| `status` | String | No | HTTP status code |
| `response` | String | No | Server response |
| `url` | String | No | Clicked URL |
| `ip` | String | No | Recipient IP address |
| `useragent` | String | No | Recipient user agent |

**Event Types:**
- `processed` - Email processed by SendGrid
- `dropped` - Email dropped (invalid, bounced, etc.)
- `delivered` - Delivered to recipient server
- `deferred` - Temporarily deferred
- `bounce` - Hard/soft bounce
- `open` - Email opened
- `click` - Link clicked
- `spamreport` - Marked as spam
- `unsubscribe` - User unsubscribed
- `group_unsubscribe` / `group_resubscribe` - Group preferences

---

## Indexes

### Single Field Indexes
- `toEmail`
- `emailType`
- `status`
- `priority`
- `userId`
- `providerMessageId` (unique)
- `isInstant`
- `scheduleDate`
- `sentAt`
- `createdAt` (descending)
- `tags`

### Compound Indexes
- `{ toEmail: 1, createdAt: -1 }`
- `{ emailType: 1, status: 1 }`
- `{ status: 1, scheduleDate: 1 }`
- `{ userId: 1, createdAt: -1 }`
- `{ isInstant: 1, status: 1 }`

---

## Usage Examples

### Create and Send Email

```typescript
import { Email, EmailType, EmailStatus, EmailPriority } from '@models/Email';

// Create instant email
const email = await Email.create({
  toEmail: 'user@example.com',
  toName: 'John Doe',
  fromEmail: 'noreply@mereka.io',
  fromName: 'Mereka',
  subject: 'Your booking is confirmed!',
  emailType: EmailType.BOOKING_CONFIRMATION_RECEIPT,
  templateId: 'SENDGRID_BOOKING_CONFIRMATION',
  data: {
    userName: 'John Doe',
    experienceName: 'Yoga Class',
    bookingDate: '2025-12-01',
    bookingTime: '10:00 AM',
  },
  htmlContent: '<html>...</html>',
  textContent: 'Plain text version...',
  priority: EmailPriority.HIGH,
  isInstant: true,
  userId: userId,
  tags: ['booking', 'confirmation'],
});
```

### Schedule Email

```typescript
// Schedule email for future send
const scheduledEmail = await Email.create({
  toEmail: 'user@example.com',
  subject: 'Reminder: Your experience is tomorrow!',
  emailType: EmailType.EXPERIENCE_REMAINDER_USER,
  templateId: 'EXPERIENCE_REMINDER',
  data: { experienceName: 'Yoga Class' },
  isInstant: false,
  scheduleDate: new Date('2025-12-01T08:00:00Z'),
  status: EmailStatus.SCHEDULED,
});
```

### Update Email Status

```typescript
// Mark email as sent
await Email.findByIdAndUpdate(emailId, {
  $set: {
    status: EmailStatus.SENT,
    sentAt: new Date(),
    providerMessageId: 'sg_message_id_123',
    attempts: 1,
  },
});

// Mark email as opened
await Email.findByIdAndUpdate(emailId, {
  $set: {
    status: EmailStatus.OPENED,
    openedAt: new Date(),
  },
});
```

### Track SendGrid Events

```typescript
// Add SendGrid webhook event
await Email.findOneAndUpdate(
  { providerMessageId: 'sg_message_id_123' },
  {
    $push: {
      sendGridEvents: {
        event: 'delivered',
        timestamp: new Date(),
        sg_event_id: 'evt_123',
        sg_message_id: 'sg_message_id_123',
      },
    },
    $set: {
      status: EmailStatus.DELIVERED,
      deliveredAt: new Date(),
    },
  }
);
```

### Handle Email Failures

```typescript
// Record failed send attempt
await Email.findByIdAndUpdate(emailId, {
  $inc: { attempts: 1 },
  $set: {
    lastError: 'SMTP connection timeout',
    status: EmailStatus.FAILED,
  },
});

// Retry logic
const email = await Email.findById(emailId);
if (email && email.attempts < email.maxAttempts) {
  // Retry sending
  await sendEmail(email);
} else {
  // Max retries exceeded, mark as failed
  await Email.findByIdAndUpdate(emailId, {
    $set: { status: EmailStatus.FAILED },
  });
}
```

---

## Query Examples

### Get User's Emails

```typescript
const userEmails = await Email.find({ userId })
  .sort({ createdAt: -1 })
  .limit(50)
  .lean();
```

### Get Pending Emails

```typescript
const pendingEmails = await Email.find({
  status: EmailStatus.PENDING,
  isInstant: true,
})
  .sort({ priority: -1, createdAt: 1 })
  .lean();
```

### Get Scheduled Emails

```typescript
const now = new Date();
const scheduledEmails = await Email.find({
  status: EmailStatus.SCHEDULED,
  scheduleDate: { $lte: now },
}).lean();
```

### Get Failed Emails for Retry

```typescript
const failedEmails = await Email.find({
  status: EmailStatus.FAILED,
  attempts: { $lt: 3 },
  createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24h
}).lean();
```

### Analytics Queries

```typescript
// Email delivery rate
const stats = await Email.aggregate([
  {
    $match: {
      createdAt: { $gte: startDate, $lte: endDate },
    },
  },
  {
    $group: {
      _id: '$status',
      count: { $sum: 1 },
    },
  },
]);

// Open rate by email type
const openRates = await Email.aggregate([
  {
    $match: {
      status: { $in: [EmailStatus.OPENED, EmailStatus.CLICKED] },
    },
  },
  {
    $group: {
      _id: '$emailType',
      totalSent: { $sum: 1 },
      opened: {
        $sum: { $cond: [{ $eq: ['$status', EmailStatus.OPENED] }, 1, 0] },
      },
    },
  },
]);
```

---

## Validation Rules

1. **toEmail** must be a valid email address
2. **emailType** must be a valid EmailType enum value
3. **status** defaults to PENDING
4. **priority** defaults to NORMAL
5. **attempts** cannot exceed maxAttempts
6. **scheduleDate** required if status is SCHEDULED
7. **isInstant** cannot be true if scheduleDate is set

---

## Best Practices

### Email Creation

```typescript
// ✅ Good - Complete email data
await Email.create({
  toEmail: 'user@example.com',
  toName: 'John Doe',
  subject: 'Clear subject line',
  emailType: EmailType.BOOKING_CONFIRMATION_RECEIPT,
  templateId: 'TEMPLATE_ID',
  data: { /* template data */ },
  htmlContent: '<html>...</html>',
  textContent: 'Plain text fallback',
  userId: userId,
  tags: ['booking'],
});

// ❌ Bad - Missing important fields
await Email.create({
  toEmail: 'user@example.com',
  subject: 'Email',
  emailType: EmailType.BOOKING_CONFIRMATION_RECEIPT,
});
```

### Error Handling

```typescript
// ✅ Good - Track errors and retry
try {
  await sendViaProvider(email);
  await Email.findByIdAndUpdate(email._id, {
    $set: { status: EmailStatus.SENT, sentAt: new Date() },
  });
} catch (error) {
  await Email.findByIdAndUpdate(email._id, {
    $inc: { attempts: 1 },
    $set: {
      lastError: error.message,
      status: email.attempts + 1 >= email.maxAttempts
        ? EmailStatus.FAILED
        : EmailStatus.PENDING,
    },
  });
}
```

### SendGrid Integration

```typescript
// Process SendGrid webhook
async function handleSendGridWebhook(events: SendGridEvent[]) {
  for (const event of events) {
    await Email.findOneAndUpdate(
      { providerMessageId: event.sg_message_id },
      {
        $push: { sendGridEvents: event },
        $set: {
          status: mapSendGridEventToStatus(event.event),
          ...(event.event === 'delivered' && { deliveredAt: new Date(event.timestamp * 1000) }),
          ...(event.event === 'open' && { openedAt: new Date(event.timestamp * 1000) }),
          ...(event.event === 'click' && { clickedAt: new Date(event.timestamp * 1000) }),
        },
      }
    );
  }
}

function mapSendGridEventToStatus(event: string): EmailStatus {
  const mapping = {
    processed: EmailStatus.QUEUED,
    delivered: EmailStatus.DELIVERED,
    open: EmailStatus.OPENED,
    click: EmailStatus.CLICKED,
    bounce: EmailStatus.BOUNCED,
    dropped: EmailStatus.FAILED,
    deferred: EmailStatus.QUEUED,
  };
  return mapping[event] || EmailStatus.SENT;
}
```

---

## Security Considerations

1. **Email Validation**: Validate email addresses before sending
2. **Rate Limiting**: Implement rate limits to prevent spam
3. **Sanitize Content**: Sanitize HTML content to prevent XSS
4. **Unsubscribe Links**: Include unsubscribe links in marketing emails
5. **Data Privacy**: Don't log sensitive information in metadata
6. **Access Control**: Restrict access to email content

---

## Performance Tips

1. **Index Usage**: Always filter by indexed fields
2. **Lean Queries**: Use `.lean()` for read-only operations
3. **Batch Processing**: Process scheduled emails in batches
4. **Archive Old Emails**: Archive emails older than 6-12 months
5. **Projection**: Select only needed fields

```typescript
// ✅ Good - Efficient query
const emails = await Email.find({ userId, status: EmailStatus.SENT })
  .select('toEmail subject sentAt')
  .sort({ sentAt: -1 })
  .limit(20)
  .lean();

// ❌ Bad - Inefficient
const emails = await Email.find({ 'metadata.customField': 'value' }); // No index
```

---

## Migration Notes

### From Firebase Email Model

```typescript
// Old Firebase structure
interface Email {
  toEmail: string;
  createdDate: any;
  createdBy: string;
  data: any;
  isInstant?: boolean;
  scheduleDate?: any;
  emailType: string;
  isSkipped?: boolean;
}

// Migration to MongoDB
{
  toEmail: firebaseEmail.toEmail,
  emailType: firebaseEmail.emailType,
  data: firebaseEmail.data,
  isInstant: firebaseEmail.isInstant ?? true,
  scheduleDate: firebaseEmail.scheduleDate ? new Date(firebaseEmail.scheduleDate) : undefined,
  isSkipped: firebaseEmail.isSkipped ?? false,
  createdBy: firebaseEmail.createdBy ? new ObjectId(firebaseEmail.createdBy) : undefined,
  createdAt: new Date(firebaseEmail.createdDate),
  // New fields
  status: EmailStatus.SENT, // Assume old emails were sent
  priority: EmailPriority.NORMAL,
  provider: 'SENDGRID',
}
```

---

## Related Models

- **NotificationTemplate**: Referenced via templateId
- **User**: Referenced via userId and createdBy
- **Notification**: Parallel model for other notification channels

---

## Common Issues

### Issue: Emails Stuck in PENDING

**Solution**: Check email queue processor is running

```typescript
async function processPendingEmails() {
  const emails = await Email.find({
    status: EmailStatus.PENDING,
    isInstant: true,
    attempts: { $lt: 3 },
  }).limit(100);

  for (const email of emails) {
    await sendEmail(email);
  }
}
```

### Issue: Duplicate Sends

**Solution**: Use idempotency keys

```typescript
await Email.create({
  // ... email data
  metadata: {
    idempotencyKey: `booking-${bookingId}-confirmation`,
  },
});

// Check before creating
const existing = await Email.findOne({
  'metadata.idempotencyKey': `booking-${bookingId}-confirmation`,
});
if (existing) {
  return existing; // Don't create duplicate
}
```

---

## Future Enhancements

1. **Attachments**: Support email attachments
2. **Templates Gallery**: Built-in template previews
3. **A/B Testing**: Test different email variants
4. **Advanced Analytics**: Click heatmaps, engagement scores
5. **Auto-Retry**: Intelligent retry with backoff
