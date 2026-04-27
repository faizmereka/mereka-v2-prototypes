# Experience Feature

## Overview

The Experience feature is the core content module of the Mereka platform, representing events, workshops, courses, and other learning experiences that hubs can offer to learners. This is the largest and most complex module in the system.

## Business Context

Experiences are the primary offering on the Mereka platform. They can be:
- **Physical** - In-person events at a location
- **Virtual** - Online events via Zoom/meeting links
- **Hybrid** - Combination of both

Experiences come in two variants:
- **Platform** - Full-featured experiences with comprehensive details
- **Express** - Quick-create experiences with minimal required fields

## Model Structure

**Location:** `src/models/Experience.ts`

### Core Fields

#### Basic Information
- `experienceTitle` (required) - Title of the experience
- `slug` (required, unique) - URL-friendly identifier
- `experienceDescription` (optional for express) - Detailed description
- `experienceType` (required) - Physical | Virtual | Hybrid
- `hubId` (required, indexed) - Reference to the Hub offering this
- `listingType` - platform | express (default: platform)

#### Category & Topics
- `experienceCategory` (optional for express) - Reference to ExperienceTheme
- `experienceTopics` - Array of `{ theme: string, topic: string }` references

#### Location (Physical/Hybrid)
```typescript
location: {
  addressAdditionalNote?: string;
  autofill?: boolean;
  streetAddress: string;
  country: string;
  state: string;
  city: string;
  postcode: string;
  location?: string;
  lat?: number;
  lng?: number;
  url?: string;
}
```

#### Virtual Meeting (Virtual/Hybrid)
- `meetingLink` - Zoom/Google Meet URL
- `meetingLocation` - Text description
- `zoomMeetingData` - Additional Zoom metadata
- `meetingLinkEditedDate` - When link was last modified
- `timeZone` - Timezone for virtual events

#### Host Information
```typescript
hostDetails: [{
  hubId?: string;
  hubName?: string;
  expertId?: string;
  expertName?: string;
  fullName?: string;
  email?: string;
  access?: string;
  description?: string;
  profileUrl?: string;
  type?: string; // "HOST" or "COLLABORATOR"
}]
```
- `noHost` (boolean) - If true, no host is assigned
- `hostType` - Type of host

#### Audience Settings
- `audienceType` (required) - Everyone | Members Only | Hidden
- `maximumCapacity` - Max number of participants
- `canBookAsPrivate` (boolean) - Allow private bookings
- `targetAudience` - Array of audience type names (references TargetAudience)
- `expertiseLevel` - Required expertise level
- `expertiseFields` - Array of expertise areas

#### Languages
- `primaryLanguage` (optional for express, default: English)
- `secondaryLanguage` - Array of additional languages

#### Pricing
- `feePaidBy` - learner | hub (who pays Mereka fees)
- `currency` (required, default: MYR)
- `currencyType` - Currency display type

#### Ticketing
```typescript
ticket: [{
  id?: string;
  ticketType: string; // "Paid" or "Free"
  ticketName: string;
  ticketPrice: number;
  ticketQty: number;
  cutoffNumber?: number;
  cutoffTime?: string;
  cutoffBeforeAfter?: string;
  description?: string;
  hasCutoffTime?: boolean;
}]
```

#### Booking Settings
- `cutOffTime` - Cutoff time in milliseconds
- `cutOffTimeUnit` - hours | days | weeks
- `canBookOngoingEvent` (boolean)
- `experienceDuration` - Duration in milliseconds
- `maximunHourGuestCanBook` - Booking time limit

#### Schedules
```typescript
schedules: [{
  uid: string;
  recurringRule: string[]; // Days, dates, RRULE components
  startDate: Date;
  endDate?: Date;
  recurringType: string; // "daily", "weekly", "monthly", "once", "no_repeat"
}]
```
- `isMultiDay` (boolean)

#### Content/Media
- `coverPhoto` - Main image URL
- `gallery` - Array of image URLs
- `video` - Video URL
- `poster` - Poster image URL
- `sopPoster` - SOP poster image
- `showAutoImage` (boolean)

#### Additional Information
- `learnerOutcome` - What learners will gain
- `instruction` - Instructions for participants
- `materialProvided` - Materials provided by hub (string)
- `materialNeedToBring` - Materials participants need (string)
- `sopInformation` - Standard Operating Procedure info

#### Custom Questions
```typescript
customQuestions: {
  isQuestionMandatory?: boolean;
  questionArray?: [{
    questionLabel: string;
    questionType: string; // "text", "dropdown", "checkbox", "multiple_choice"
    saveStatus?: boolean;
    dropDown?: string[];
    checkBox?: string[];
    multipleChoices?: string[];
  }];
}
```
- `customFormJSON` - Additional form data

#### Metadata
- `status` - ACTIVE | DRAFTED | DELETED | EXPIRED (indexed)
- `type` - platform or other (default: platform)
- `priority` - Sort priority (default: 1000, indexed)
- `isFeatured` (boolean, indexed)
- `isShowCaseOnProfile` (boolean)
- `views` - View count (default: 0)
- `rating` - Average rating

#### Audit Fields
- `createdBy` - User who created
- `createdAt` - Auto-generated timestamp
- `updatedAt` - Auto-generated timestamp

## Indexes

### Single Field Indexes
- `experienceTitle` (standard)
- `slug` (unique)
- `experienceType` (standard)
- `hubId` (standard)
- `experienceCategory` (standard)
- `audienceType` (standard)
- `status` (standard)
- `listingType` (standard)
- `priority` (standard)
- `isFeatured` (standard)

### Compound Indexes
- `{ hubId: 1, status: 1 }` - Hub's experiences by status
- `{ status: 1, audienceType: 1 }` - Filter by status and audience
- `{ isFeatured: 1, status: 1 }` - Featured active experiences
- `{ priority: 1, status: 1 }` - Sorted by priority
- `{ experienceType: 1, status: 1 }` - Filter by type
- `{ experienceCategory: 1, status: 1 }` - Filter by category
- `{ createdAt: -1 }` - Sort by newest

### Text Index
- `{ experienceTitle: 'text', experienceDescription: 'text' }` - Full-text search

## Relationships

### Direct References
- **Hub** - `hubId` references Hub collection
- **ExperienceTheme** - `experienceCategory` references ExperienceTheme
- **User** - `createdBy` references User (creator)
- **Slug** - `slug` field has corresponding Slug document

### Indirect References
- **ExperienceEvent** - Events reference Experience via `experienceId`
- **ExperienceTopic** - Topics referenced in `experienceTopics` array
- **TargetAudience** - Names stored in `targetAudience` array

## API Endpoints

**Base Path:** `/api/v1/experiences`

### POST /
**Create Experience**
- **Auth:** Required
- **Body:** See `createExperienceSchema`
- **Returns:** Created experience object

### PATCH /:id
**Update Experience**
- **Auth:** Required
- **Params:** `id` - Experience ID
- **Body:** See `updateExperienceSchema`
- **Returns:** Updated experience object

### GET /check/slug
**Check Slug Availability**
- **Auth:** Optional
- **Query:**
  - `slug` (required) - Slug to check
  - `excludeId` (optional) - Exclude this experience from check
- **Returns:** `{ available: boolean }`

### GET /:id
**Get Experience by ID or Slug**
- **Auth:** Optional
- **Params:** `id` - MongoDB ObjectId OR slug (auto-detected)
- **Returns:** Experience object with:
  - All experience fields
  - `experienceEvents` - Array of upcoming events
  - Statistics (views, bookings, etc.)

## Business Logic

### Slug Management
- Slugs are auto-generated from `experienceTitle` during creation
- Slugs must be unique across all experiences
- Slug history is tracked in Slug collection
- Old slugs redirect to new ones

### Experience Types
1. **Physical**
   - Requires `location` object
   - `timeZone` optional

2. **Virtual**
   - Requires `meetingLink` or `meetingLocation`
   - `timeZone` required

3. **Hybrid**
   - Requires both `location` and meeting info
   - `timeZone` required

### Listing Types
1. **Platform** (Full-featured)
   - All fields available
   - `experienceDescription` required
   - `experienceCategory` required
   - `primaryLanguage` required

2. **Express** (Quick-create)
   - Minimal required fields
   - `experienceDescription` optional (defaults to empty string)
   - `experienceCategory` optional
   - `primaryLanguage` optional (defaults to "English")
   - `experienceTopics` defaults to empty array

### Status Lifecycle
1. **DRAFTED** - Initial state, not visible to public
2. **ACTIVE** - Published and visible
3. **EXPIRED** - Past event or manually expired
4. **DELETED** - Soft deleted (not shown anywhere)

### Schedules & Events
- Experiences have `schedules` (recurring rules)
- ExperienceEvents are generated from schedules
- Events can be:
  - One-time (`recurringType: "once"` or `"no_repeat"`)
  - Daily, Weekly, Monthly
  - Multi-day events (`isMultiDay: true`)

### Ticketing
- Multiple ticket types per experience
- Free or Paid tickets
- Per-ticket quantity limits
- Per-ticket cutoff times

### Booking Cutoff
- Global cutoff time per experience
- Per-ticket cutoff overrides
- Prevents bookings too close to start time

### Host Management
- Multiple hosts/collaborators
- Host can be Hub staff or external experts
- `noHost` flag for self-guided experiences

### Custom Questions
- Dynamic form fields for bookings
- Multiple question types
- Optional or mandatory
- Responses stored with bookings

## File References

- **Model:** `src/models/Experience.ts`
- **Schema:** `src/schemas/experience.schema.ts`
- **Controller:** `src/controllers/experience.controller.ts`
- **Service:** `src/services/experience.service.ts`
- **Routes:** `src/routes/experience.routes.ts`

## Related Documentation

- [ExperienceEvent](../experience-event/README.md) - Event instances
- [ExperienceTheme](../experience-theme/README.md) - Categories
- [ExperienceTopic](../experience-topic/README.md) - Sub-categories
- [Slug](../slug/README.md) - Slug management
- [Hub](../hub/README.md) - Hub relationship

## Migration Notes

### From Firebase
- Firebase collection: `experiences`
- Location sub-document flattened in Firebase
- Timestamps: Firebase `created_at` → MongoDB `createdAt`
- Schedule structure may need transformation
- Ticket IDs auto-generated in Firebase

### Breaking Changes
- `materialProvided` changed from array to string (frontend sends string)
- `materialNeedToBring` changed from array to string (frontend sends string)
- `experienceTopics` structure changed to `{ theme, topic }` objects

## Usage Examples

### Creating a Simple Experience
```typescript
const experience = await Experience.create({
  experienceTitle: "Introduction to Photography",
  slug: "intro-photography",
  experienceType: "Physical",
  hubId: "hub123",
  listingType: "express",
  audienceType: "Everyone",
  currency: "MYR",
  status: "ACTIVE",
  hostDetails: [],
  noHost: false,
  canBookAsPrivate: false,
  priority: 1000,
  isFeatured: false,
  views: 0,
});
```

### Querying Experiences
```typescript
// Get active experiences by hub
const experiences = await Experience.find({
  hubId: "hub123",
  status: "ACTIVE",
}).lean();

// Get featured experiences
const featured = await Experience.find({
  isFeatured: true,
  status: "ACTIVE",
}).sort({ priority: 1 }).lean();

// Search experiences
const results = await Experience.find(
  { $text: { $search: "photography workshop" } },
  { score: { $meta: "textScore" } }
).sort({ score: { $meta: "textScore" } }).lean();
```

## Performance Considerations

1. **Indexes** - All common query patterns are indexed
2. **Text Search** - Use MongoDB text index for search
3. **Lean Queries** - Use `.lean()` for read-only operations
4. **Pagination** - Always paginate large result sets
5. **Projection** - Select only needed fields for list views

## Security Considerations

1. **Slug Validation** - Prevent slug conflicts and reserved words
2. **Hub Authorization** - Verify user can create/edit for hub
3. **Status Transitions** - Validate allowed status changes
4. **Meeting Links** - Sanitize and validate URLs
5. **Custom Questions** - Sanitize user-provided content

## Testing

- **Unit Tests:** `tests/unit/experience.service.test.ts`
- **Integration Tests:** `tests/integration/experience.routes.test.ts`
- **Test Fixtures:** `tests/fixtures/experience.fixture.ts`

## Future Enhancements

1. Experience templates
2. Bulk import/export
3. Experience cloning
4. Advanced recurrence rules
5. Waitlist management
6. Capacity forecasting
7. Dynamic pricing
