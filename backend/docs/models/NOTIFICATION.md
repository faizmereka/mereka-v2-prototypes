# Notification Model Documentation

## Overview

The **Notification** model stores all types of notifications sent to users across multiple channels (email, SMS, push, in-app).

- **Collection Name**: `notifications`
- **Location**: `src/models/Notification.ts`
- **Purpose**: Multi-channel notification management with delivery tracking, read status, and action buttons

---

## Model Structure

### Core Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | ObjectId | Yes | User receiving the notification |
| `notificationType` | Enum | Yes | Type of notification (from NotificationTemplate) |
| `channels` | Array | Yes | Delivery channels (EMAIL, SMS, PUSH, IN_APP) |
| `priority` | Enum | Yes | Priority level (default: NORMAL) |
| `title` | String | Yes | Notification title/heading |
| `message` | String | Yes | Main notification message |
| `richContent` | String | No | Rich HTML/Markdown content |
| `templateId` | String | No | Reference to NotificationTemplate |
| `templateData` | Object | No | Data for template variables |
| `icon` | String | No | Icon URL or icon name |
| `imageUrl` | String | No | Image URL for notification |
| `actionButtons` | Array | No | Clickable action buttons |
| `deepLink` | String | No | Deep link to app screen |
| `webUrl` | String | No | Web URL on click |
| `status` | Enum | Yes | Overall status (default: PENDING) |
| `deliveryStatus` | Array | No | Per-channel delivery status |
| `isRead` | Boolean | Yes | Read status (default: false) |
| `readAt` | Date | No | When notification was read |
| `expiresAt` | Date | No | Expiration date/time |
| `groupId` | String | No | Group ID for related notifications |
| `category` | String | No | Category for grouping |
| `relatedEntityType` | Enum | No | Type of related entity |
| `relatedEntityId` | ObjectId | No | ID of related entity |
| `metadata` | Object | No | Additional metadata |
| `tags` | Array | No | Tags for categorization |
| `scheduledFor` | Date | No | Scheduled send time |
| `sentAt` | Date | No | When notification was sent |
| `createdBy` | ObjectId | No | User who triggered notification |
| `isSilent` | Boolean | Yes | Suppress sound/vibration (default: false) |
| `isBadgeUpdate` | Boolean | Yes | Update badge count (default: true) |

### Timestamps

- `createdAt`: Automatically set on creation
- `updatedAt`: Automatically updated on modification

---

## Enums

### NotificationStatus

```typescript
enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}
```

### NotificationChannel

```typescript
enum NotificationChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH',
  IN_APP = 'IN_APP',
  WEBHOOK = 'WEBHOOK',
}
```

### NotificationPriority

```typescript
enum NotificationPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}
```

### NotificationType

Imported from NotificationTemplate model (70+ types covering all use cases)

### RelatedEntityType

```typescript
type RelatedEntityType =
  | 'Booking'
  | 'Experience'
  | 'Hub'
  | 'Job'
  | 'JobProposal'
  | 'JobOffer'
  | 'Milestone'
  | 'Payment'
  | 'Review'
  | 'Space'
  | 'User'
  | 'ChatRoom'
  | 'Contract';
```

---

## Subdocuments

### Action Button

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `label` | String | Yes | Button text |
| `action` | String | Yes | Action type (navigate, api_call, etc.) |
| `url` | String | No | URL to navigate to |
| `style` | Enum | No | Button style (primary, secondary, etc.) |
| `metadata` | Mixed | No | Additional action data |

**Button Styles:**
- `primary` - Primary action button
- `secondary` - Secondary action
- `success` - Success/confirm action
- `danger` - Destructive action
- `warning` - Warning action
- `info` - Informational action

### Delivery Status

Tracks delivery per channel:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `channel` | Enum | Yes | Delivery channel |
| `status` | Enum | Yes | Status for this channel |
| `sentAt` | Date | No | When sent on this channel |
| `deliveredAt` | Date | No | When delivered |
| `readAt` | Date | No | When read (in-app/email) |
| `failedAt` | Date | No | When failed |
| `error` | String | No | Error message if failed |
| `attempts` | Number | Yes | Delivery attempts (default: 0) |
| `providerMessageId` | String | No | Provider's message ID |

---

## Indexes

### Single Field Indexes
- `userId`
- `notificationType`
- `status`
- `priority`
- `isRead`
- `scheduledFor`
- `expiresAt`
- `groupId`
- `category`
- `relatedEntityType`
- `relatedEntityId`
- `tags`
- `createdAt` (descending)

### Compound Indexes
- `{ userId: 1, createdAt: -1 }`
- `{ userId: 1, isRead: 1, createdAt: -1 }`
- `{ userId: 1, status: 1 }`
- `{ notificationType: 1, status: 1 }`
- `{ scheduledFor: 1, status: 1 }`
- `{ category: 1, userId: 1 }`
- `{ relatedEntityType: 1, relatedEntityId: 1 }`
- `{ userId: 1, isRead: 1, priority: -1, createdAt: -1 }`

---

## Usage Examples

### Create Multi-Channel Notification

```typescript
import {
  Notification,
  NotificationChannel,
  NotificationPriority,
  NotificationStatus,
} from '@models/Notification';
import { NotificationType } from '@models/NotificationTemplate';

const notification = await Notification.create({
  userId: new ObjectId(userId),
  notificationType: NotificationType.BOOKING_SEND_HOST,
  channels: [
    NotificationChannel.EMAIL,
    NotificationChannel.PUSH,
    NotificationChannel.IN_APP,
  ],
  priority: NotificationPriority.HIGH,
  title: 'New Booking Received!',
  message: 'You have a new booking for "Yoga Class" on Dec 1, 2025 at 10:00 AM',
  richContent: '<p>You have a <strong>new booking</strong>...</p>',
  templateId: 'BOOKING_HOST_NOTIFICATION',
  templateData: {
    experienceName: 'Yoga Class',
    bookingDate: '2025-12-01',
    bookingTime: '10:00 AM',
    learnerName: 'John Doe',
  },
  icon: 'booking-icon',
  imageUrl: 'https://cdn.mereka.io/images/yoga-class.jpg',
  actionButtons: [
    {
      label: 'View Booking',
      action: 'navigate',
      url: '/bookings/123',
      style: 'primary',
    },
    {
      label: 'Contact Learner',
      action: 'navigate',
      url: '/chat/456',
      style: 'secondary',
    },
  ],
  deepLink: 'mereka://bookings/123',
  webUrl: 'https://app.mereka.io/bookings/123',
  category: 'booking',
  relatedEntityType: 'Booking',
  relatedEntityId: new ObjectId(bookingId),
  tags: ['booking', 'host', 'new'],
});
```

### Create In-App Only Notification

```typescript
const inAppNotification = await Notification.create({
  userId: new ObjectId(userId),
  notificationType: NotificationType.NEW_CHAT_MESSAGE,
  channels: [NotificationChannel.IN_APP],
  priority: NotificationPriority.NORMAL,
  title: 'New Message',
  message: 'You have a new message from Jane Smith',
  icon: 'chat-icon',
  deepLink: 'mereka://chat/789',
  category: 'message',
  relatedEntityType: 'ChatRoom',
  relatedEntityId: new ObjectId(chatRoomId),
  isSilent: false,
  isBadgeUpdate: true,
});
```

### Schedule Future Notification

```typescript
const scheduledNotification = await Notification.create({
  userId: new ObjectId(userId),
  notificationType: NotificationType.EXPERIENCE_OPEN_FOR_INQUIRY,
  channels: [NotificationChannel.EMAIL, NotificationChannel.PUSH],
  priority: NotificationPriority.NORMAL,
  title: 'Reminder: Your experience starts in 1 hour!',
  message: 'Get ready for "Yoga Class" starting at 10:00 AM',
  scheduledFor: new Date('2025-12-01T09:00:00Z'),
  status: NotificationStatus.PENDING,
});
```

### Mark as Read

```typescript
await Notification.findByIdAndUpdate(notificationId, {
  $set: {
    isRead: true,
    readAt: new Date(),
    status: NotificationStatus.READ,
  },
});
```

### Update Delivery Status

```typescript
await Notification.findByIdAndUpdate(notificationId, {
  $push: {
    deliveryStatus: {
      channel: NotificationChannel.EMAIL,
      status: NotificationStatus.DELIVERED,
      sentAt: new Date(),
      deliveredAt: new Date(),
      providerMessageId: 'sg_msg_123',
      attempts: 1,
    },
  },
});
```

### Group Related Notifications

```typescript
// Create multiple notifications with same groupId
const groupId = `booking-reminder-${bookingId}`;

await Notification.create([
  {
    userId: hostUserId,
    groupId,
    title: 'Booking Reminder',
    message: 'Your experience starts tomorrow!',
    // ... other fields
  },
  {
    userId: learnerUserId,
    groupId,
    title: 'Booking Reminder',
    message: "Don't forget your booking tomorrow!",
    // ... other fields
  },
]);
```

---

## Query Examples

### Get User's Unread Notifications

```typescript
const unreadNotifications = await Notification.find({
  userId: new ObjectId(userId),
  isRead: false,
})
  .sort({ priority: -1, createdAt: -1 })
  .limit(50)
  .lean();
```

### Get Notifications by Category

```typescript
const bookingNotifications = await Notification.find({
  userId: new ObjectId(userId),
  category: 'booking',
})
  .sort({ createdAt: -1 })
  .lean();
```

### Get Pending Scheduled Notifications

```typescript
const now = new Date();
const pendingNotifications = await Notification.find({
  status: NotificationStatus.PENDING,
  scheduledFor: { $lte: now },
}).lean();
```

### Mark All as Read

```typescript
await Notification.updateMany(
  { userId: new ObjectId(userId), isRead: false },
  {
    $set: {
      isRead: true,
      readAt: new Date(),
    },
  }
);
```

### Get Notifications for Related Entity

```typescript
const bookingNotifications = await Notification.find({
  relatedEntityType: 'Booking',
  relatedEntityId: new ObjectId(bookingId),
})
  .sort({ createdAt: -1 })
  .lean();
```

### Delete Expired Notifications

```typescript
const now = new Date();
await Notification.deleteMany({
  expiresAt: { $lt: now },
});
```

---

## Analytics Queries

### Notification Stats by Type

```typescript
const stats = await Notification.aggregate([
  {
    $match: {
      userId: new ObjectId(userId),
      createdAt: { $gte: startDate, $lte: endDate },
    },
  },
  {
    $group: {
      _id: '$notificationType',
      total: { $sum: 1 },
      read: {
        $sum: { $cond: [{ $eq: ['$isRead', true] }, 1, 0] },
      },
    },
  },
]);
```

### Read Rate by Channel

```typescript
const readRates = await Notification.aggregate([
  { $unwind: '$deliveryStatus' },
  {
    $group: {
      _id: '$deliveryStatus.channel',
      total: { $sum: 1 },
      delivered: {
        $sum: {
          $cond: [
            { $eq: ['$deliveryStatus.status', NotificationStatus.DELIVERED] },
            1,
            0,
          ],
        },
      },
      read: {
        $sum: { $cond: [{ $eq: ['$isRead', true] }, 1, 0] },
      },
    },
  },
]);
```

---

## Validation Rules

1. **userId** is required
2. **channels** array must not be empty
3. **notificationType** must be valid enum value
4. **title** and **message** are required
5. **status** defaults to PENDING
6. **priority** defaults to NORMAL
7. **scheduledFor** should be in the future if set
8. **expiresAt** should be after creation date

---

## Best Practices

### Multi-Channel Strategy

```typescript
// ✅ Good - Different content per channel
const notification = {
  title: 'New Booking',
  message: 'Short message for push/SMS',
  richContent: '<html>Detailed HTML for email</html>',
  channels: [
    NotificationChannel.EMAIL,    // Detailed version
    NotificationChannel.PUSH,     // Short version
    NotificationChannel.IN_APP,   // Interactive version
  ],
};

// ❌ Bad - Same long content for all channels
const notification = {
  message: 'Very long message with lots of details that works for email but not push...',
  channels: [NotificationChannel.EMAIL, NotificationChannel.PUSH],
};
```

### Action Buttons

```typescript
// ✅ Good - Clear, actionable buttons
actionButtons: [
  {
    label: 'View Details',
    action: 'navigate',
    url: '/bookings/123',
    style: 'primary',
  },
  {
    label: 'Cancel',
    action: 'api_call',
    url: '/api/bookings/123/cancel',
    style: 'danger',
    metadata: { confirmRequired: true },
  },
]

// ❌ Bad - Vague buttons
actionButtons: [
  { label: 'Click Here', action: 'navigate', url: '/page' },
]
```

### Notification Grouping

```typescript
// ✅ Good - Group related notifications
const groupId = `experience-${experienceId}-updates`;

// Create multiple related notifications with same groupId
// User can see them grouped together and perform bulk actions

// ❌ Bad - No grouping for related items
// User gets spammed with many individual notifications
```

### Expiration

```typescript
// ✅ Good - Set expiration for time-sensitive notifications
{
  title: 'Flash Sale Ending Soon!',
  message: '2 hours left on our special offer',
  expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
}

// ✅ Good - No expiration for important notifications
{
  title: 'Payment Received',
  message: 'You received $100 for your service',
  // No expiresAt - keep forever
}
```

---

## Security Considerations

1. **User Isolation**: Always filter by userId to prevent cross-user access
2. **Sensitive Data**: Don't store sensitive info in notification content
3. **URL Validation**: Validate URLs in actionButtons and deepLinks
4. **Rate Limiting**: Prevent notification spam
5. **Permissions**: Check user permissions before sending notifications

```typescript
// ✅ Good - User-specific query
const notifications = await Notification.find({
  userId: currentUserId,
  isRead: false,
});

// ❌ Bad - No user filtering (security risk!)
const notifications = await Notification.find({ isRead: false });
```

---

## Performance Tips

1. **Index Usage**: Always include userId in queries
2. **Pagination**: Limit results with proper pagination
3. **Lean Queries**: Use `.lean()` for read-only data
4. **Archive Old**: Archive read notifications older than 90 days
5. **Compound Indexes**: Use compound indexes for common queries

```typescript
// ✅ Good - Efficient query
const notifications = await Notification.find({
  userId: new ObjectId(userId),
  isRead: false,
})
  .sort({ priority: -1, createdAt: -1 })
  .limit(20)
  .select('title message icon createdAt')
  .lean();

// ❌ Bad - Inefficient
const notifications = await Notification.find({ isRead: false }); // Missing userId
```

---

## Migration Notes

### Creating from Different Sources

```typescript
// From email-only notification
{
  userId: emailNotification.userId,
  channels: [NotificationChannel.EMAIL],
  title: emailNotification.subject,
  message: emailNotification.textContent,
  // Map other fields...
}

// From push notification
{
  userId: pushNotification.userId,
  channels: [NotificationChannel.PUSH],
  title: pushNotification.title,
  message: pushNotification.body,
  // Map other fields...
}
```

---

## Related Models

- **NotificationTemplate**: Referenced via templateId
- **Email**: Parallel model for email-specific tracking
- **User**: Referenced via userId and createdBy
- **Booking, Experience, Hub, etc.**: Referenced via relatedEntityId

---

## Common Patterns

### Real-Time Notification

```typescript
// Create and emit via WebSocket
const notification = await Notification.create({ /* ... */ });

// Emit to user's WebSocket connection
io.to(`user-${userId}`).emit('notification', notification);
```

### Batch Notifications

```typescript
// Send to multiple users
const userIds = ['user1', 'user2', 'user3'];

const notifications = userIds.map(userId => ({
  userId: new ObjectId(userId),
  notificationType: NotificationType.BOOKING_SEND_HOST,
  channels: [NotificationChannel.PUSH],
  title: 'New Feature Available!',
  message: 'Check out our new booking system',
}));

await Notification.insertMany(notifications);
```

### Notification Preferences

```typescript
// Check user preferences before sending
const user = await User.findById(userId).select('notificationPreferences');

const channels = [];
if (user.notificationPreferences.email) channels.push(NotificationChannel.EMAIL);
if (user.notificationPreferences.push) channels.push(NotificationChannel.PUSH);

await Notification.create({
  userId,
  channels, // Only enabled channels
  // ... other fields
});
```

---

## Future Enhancements

1. **Smart Batching**: Combine similar notifications
2. **Digest Mode**: Daily/weekly notification digests
3. **ML Preferences**: Learn user preferences over time
4. **Rich Media**: Support for videos, carousels
5. **Localization**: Multi-language support
6. **Snooze**: Allow users to snooze notifications
