# NotificationTemplate Model Documentation

## Overview

The **NotificationTemplate** model stores reusable notification templates with dynamic variables for emails, SMS, push notifications, and in-app notifications.

- **Collection Name**: `notificationTemplates`
- **Location**: `src/models/NotificationTemplate.ts`
- **Purpose**: Manage notification templates with variables, versioning, and multi-provider support

---

## Model Structure

### Core Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `templateId` | String | Yes | Unique identifier (e.g., `SENDGRID_BOOKING_CONFIRMATION`) |
| `name` | String | Yes | Human-readable template name |
| `description` | String | No | Description of template purpose |
| `templateType` | Enum | Yes | Type of template (EMAIL, SMS, PUSH, IN_APP) |
| `notificationType` | Enum | Yes | Notification category/purpose |
| `subject` | String | No | Subject line for emails or title for push |
| `content` | String | Yes | Template content with variable placeholders |
| `htmlContent` | String | No | HTML version (for emails) |
| `variables` | Array | No | List of template variables |
| `isActive` | Boolean | Yes | Whether template is active (default: true) |
| `version` | Number | Yes | Template version (default: 1) |
| `provider` | Enum | No | Provider (SENDGRID, TWILIO, FIREBASE, CUSTOM) |
| `providerTemplateId` | String | No | Template ID in provider system |
| `metadata` | Object | No | Additional metadata |
| `tags` | Array | No | Tags for categorization |
| `createdBy` | ObjectId | No | User who created template |
| `updatedBy` | ObjectId | No | User who last updated template |

### Timestamps

- `createdAt`: Automatically set on creation
- `updatedAt`: Automatically updated on modification

---

## Enums

### TemplateType

```typescript
enum TemplateType {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH',
  IN_APP = 'IN_APP',
}
```

### NotificationType

Extensive enum covering all notification purposes:

**Learner Notifications:**
- `LEARNER_SEND_RECEIPT`
- `LEARNER_VERIFY`
- `LEARNER_SEND_CONFIRMATION`
- `LEARNER_SEND_CONFIRMATION_NON_BOOKER_PHYSICAL`
- `LEARNER_SEND_CONFIRMATION_NON_BOOKER_ONLINE`
- `LEARNER_SEND_CONFIRMATION_NON_BOOKER_SPACE`
- `LEARNER_WELCOME`
- `LEARNER_JOINED_INVITATION`

**User Account:**
- `CHANGE_PASSWORD`
- `CHANGE_PASSWORD_SUCCESS`
- `CHANGE_EMAIL`
- `CHANGE_EMAIL_SUCCESS`

**Hub Notifications:**
- `HUB_INVITATION_SEND`
- `HUB_INVITATION_JOINED`

**Booking Notifications:**
- `BOOKING_SEND_EMAIL_ADMIN`
- `BOOKING_SEND_HOST`
- `BOOKING_CANCELLED_LEARNER_TO_LEARNER`
- `BOOKING_CANCELLED_LEARNER_TO_HUB`
- `BOOKING_CANCELLED_HUB_TO_HUB`
- `BOOKING_CANCELLED_HUB_TO_LEARNER`

**Chat:**
- `NEW_CHAT_MESSAGE`

**Experience:**
- `EXPERIENCE_OPEN_FOR_INQUIRY`

**Profile:**
- `COMPLETE_USER_PROFILE`
- `CREATE_USER_PROFILE`
- `COMPLETE_HUB_PROFILE`

**Expertise Booking:**
- `EXPERTISE_BOOKING_REQUEST_HUB_TO_LEARNER`
- `EXPERTISE_BOOKING_REQUEST_LEARNER_TO_HUB`
- `EXPERTISE_BOOKING_HUB_EXPIRED`
- `EXPERTISE_BOOKING_LEARNER_EXPIRED`

**Job Notifications:**
- `JOB_BOOKING_EXPERT`
- `JOB_PROPOSAL_NOTIFICATION_TO_ADMIN`
- `JOB_OFFER_SENT_TO_USER`
- `JOB_OFFER_CANCELLED_BY_USER`
- `JOB_OFFER_DECLINED_BY_USER`
- `JOB_OFFER_ACCEPT_BY_USER`

**Payment:**
- `PAYMENT_LINK_NOTIFICATION_TO_ADMIN`
- `PAYMENT_SUCCESS_NOTIFICATION_TO_USER`

---

## Subdocuments

### Template Variable

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | String | Yes | Variable name (e.g., `userName`, `bookingDate`) |
| `description` | String | Yes | Variable description |
| `type` | Enum | Yes | Data type (string, number, date, boolean, object, array) |
| `required` | Boolean | No | Whether variable is required (default: false) |
| `defaultValue` | Mixed | No | Default value if not provided |

---

## Indexes

### Single Field Indexes
- `templateId` (unique)
- `name`
- `templateType`
- `notificationType`
- `isActive`
- `tags`
- `createdAt` (descending)

### Compound Indexes
- `{ templateType: 1, notificationType: 1 }`
- `{ isActive: 1, templateType: 1 }`

---

## Usage Examples

### Create a New Template

```typescript
import { NotificationTemplate, TemplateType, NotificationType } from '@models/NotificationTemplate';

const template = await NotificationTemplate.create({
  templateId: 'SENDGRID_BOOKING_CONFIRMATION',
  name: 'Booking Confirmation Email',
  description: 'Email sent to learners when booking is confirmed',
  templateType: TemplateType.EMAIL,
  notificationType: NotificationType.LEARNER_SEND_CONFIRMATION,
  subject: 'Your booking for {{experienceName}} is confirmed!',
  content: `
    Hi {{userName}},

    Your booking for {{experienceName}} on {{bookingDate}} has been confirmed!

    Booking Details:
    - Experience: {{experienceName}}
    - Date: {{bookingDate}}
    - Time: {{bookingTime}}
    - Location: {{location}}

    We look forward to seeing you!
  `,
  htmlContent: '<html>...</html>',
  variables: [
    {
      name: 'userName',
      description: 'Name of the user',
      type: 'string',
      required: true,
    },
    {
      name: 'experienceName',
      description: 'Name of the experience',
      type: 'string',
      required: true,
    },
    {
      name: 'bookingDate',
      description: 'Booking date',
      type: 'date',
      required: true,
    },
    {
      name: 'bookingTime',
      description: 'Booking time',
      type: 'string',
      required: true,
    },
    {
      name: 'location',
      description: 'Experience location',
      type: 'string',
      required: false,
      defaultValue: 'Online',
    },
  ],
  isActive: true,
  provider: 'SENDGRID',
  providerTemplateId: 'd-1234567890abcdef',
  tags: ['booking', 'confirmation', 'learner'],
});
```

### Find Templates by Type

```typescript
// Find all active email templates
const emailTemplates = await NotificationTemplate.find({
  templateType: TemplateType.EMAIL,
  isActive: true,
}).lean();

// Find specific notification type
const confirmationTemplate = await NotificationTemplate.findOne({
  notificationType: NotificationType.LEARNER_SEND_CONFIRMATION,
  templateType: TemplateType.EMAIL,
  isActive: true,
}).lean();
```

### Update Template

```typescript
const updated = await NotificationTemplate.findOneAndUpdate(
  { templateId: 'SENDGRID_BOOKING_CONFIRMATION' },
  {
    $set: {
      content: 'Updated template content with {{variables}}',
      version: 2,
      updatedBy: userId,
    },
  },
  { new: true }
);
```

### Search by Tags

```typescript
const bookingTemplates = await NotificationTemplate.find({
  tags: 'booking',
  isActive: true,
}).lean();
```

---

## Validation Rules

1. **templateId** must be unique and uppercase
2. **templateType** must be one of: EMAIL, SMS, PUSH, IN_APP
3. **notificationType** must be a valid enum value
4. **content** is required for all templates
5. **subject** is recommended for email and push templates
6. **variables** should define all placeholders used in content
7. **provider** must match templateType capabilities

---

## Best Practices

### Template Design

1. **Use Clear Variable Names**: Use descriptive names like `userName` instead of `n`
2. **Document Variables**: Provide clear descriptions for each variable
3. **Set Defaults**: Provide default values for optional variables
4. **Version Control**: Increment version number when making breaking changes
5. **Test Templates**: Test with sample data before activation

### Variable Naming

```typescript
// ✅ Good
{{userName}}
{{bookingDate}}
{{experienceTitle}}

// ❌ Bad
{{n}}
{{d}}
{{t}}
```

### Content Structure

```typescript
// ✅ Good - Clear and structured
content: `
  Hi {{userName}},

  Your {{itemType}} is ready.

  Details:
  - Item: {{itemName}}
  - Date: {{itemDate}}

  Thank you!
`

// ❌ Bad - Unclear and cramped
content: 'Hi {{n}} your {{t}} {{i}} is ready on {{d}}'
```

### Provider Integration

```typescript
// For SendGrid dynamic templates
{
  provider: 'SENDGRID',
  providerTemplateId: 'd-1234567890abcdef',
  // Map variables to SendGrid's dynamic template data
}

// For Firebase Cloud Messaging
{
  provider: 'FIREBASE',
  templateType: TemplateType.PUSH,
  // Use content for notification body
}
```

---

## Security Considerations

1. **Sanitize User Input**: Always sanitize user-provided data before inserting into templates
2. **Escape HTML**: Use proper HTML escaping for htmlContent
3. **Validate Variables**: Validate all variable data before rendering
4. **Access Control**: Restrict template creation/editing to admin users
5. **Audit Trail**: Track who created/modified templates via createdBy/updatedBy

---

## Performance Tips

1. **Cache Active Templates**: Cache frequently used templates in memory
2. **Index Queries**: Use indexed fields for filtering (templateType, isActive)
3. **Lean Queries**: Use `.lean()` for read-only operations
4. **Limit Variables**: Keep variable count reasonable (< 20 per template)
5. **Archive Old Versions**: Soft delete or archive inactive templates

---

## Migration Notes

### From Firebase EmailTemplate

The old Firebase model had static template fields. The new model:
- Uses dynamic variables instead of static fields
- Supports multiple template types (not just email)
- Includes versioning for template evolution
- Supports multiple providers
- Adds metadata and tagging

### Migration Strategy

```typescript
// Old Firebase structure (static fields)
interface EmailTemplate {
  welcomeEmailTemplate: string;
  bookingConfirmationReceipt: string;
  // ... 80+ static fields
}

// New structure (dynamic templates)
// Create one NotificationTemplate per old field
await NotificationTemplate.create({
  templateId: 'WELCOME_EMAIL',
  name: 'Welcome Email',
  templateType: TemplateType.EMAIL,
  notificationType: NotificationType.LEARNER_WELCOME,
  content: oldTemplate.welcomeEmailTemplate,
  // ... other fields
});
```

---

## Related Models

- **Email**: Uses templateId to reference NotificationTemplate
- **Notification**: Uses templateId to reference NotificationTemplate
- **User**: Referenced in createdBy and updatedBy fields

---

## API Integration Example

```typescript
// Service to render template with data
async function renderTemplate(templateId: string, data: Record<string, unknown>) {
  const template = await NotificationTemplate.findOne({
    templateId,
    isActive: true,
  }).lean();

  if (!template) {
    throw new Error('Template not found');
  }

  // Validate required variables
  for (const variable of template.variables) {
    if (variable.required && !(variable.name in data)) {
      throw new Error(`Missing required variable: ${variable.name}`);
    }
  }

  // Replace variables in content
  let rendered = template.content;
  for (const [key, value] of Object.entries(data)) {
    rendered = rendered.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
  }

  return {
    subject: template.subject,
    content: rendered,
    htmlContent: template.htmlContent,
  };
}
```

---

## Common Queries

```typescript
// Get all active email templates
const emailTemplates = await NotificationTemplate.find({
  templateType: TemplateType.EMAIL,
  isActive: true,
}).select('templateId name notificationType').lean();

// Get template for specific notification
const template = await NotificationTemplate.findOne({
  notificationType: NotificationType.BOOKING_SEND_HOST,
  isActive: true,
}).lean();

// Get templates by provider
const sendGridTemplates = await NotificationTemplate.find({
  provider: 'SENDGRID',
  isActive: true,
}).lean();

// Search templates by tag
const paymentTemplates = await NotificationTemplate.find({
  tags: 'payment',
}).sort({ createdAt: -1 }).lean();
```

---

## Future Enhancements

1. **A/B Testing**: Support for template variants
2. **Localization**: Multi-language template support
3. **Analytics**: Track template performance metrics
4. **Preview**: Template preview with sample data
5. **Scheduling**: Schedule template activations/deactivations
