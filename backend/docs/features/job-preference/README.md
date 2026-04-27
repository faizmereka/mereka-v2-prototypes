# JobPreference Feature

## Overview

The JobPreference feature defines types of work that experts prefer to do on the Mereka platform. Job preferences help match experts with opportunities that align with their professional interests and service offerings.

## Business Context

Job Preferences are crucial for:
- **Expert Profiling** - Indicate what types of work experts want to do
- **Opportunity Matching** - Connect experts with relevant gigs/projects
- **Service Discovery** - Help hubs find experts for specific roles
- **Work-Life Balance** - Experts can specify preferred work types
- **Career Goals** - Align opportunities with expert aspirations
- **Platform Analytics** - Track demand for different work types

Examples: Trainer, Coach, Consultant, Facilitator, Speaker, Mentor, Workshop Leader, Course Creator, Advisor

## Model Structure

**Location:** `src/models/JobPreference.ts`

### Core Fields

#### Basic Information
- `name` (required, unique, indexed) - Job preference name (e.g., "Trainer", "Coach")
- `description` (optional) - Detailed explanation of this work type

#### Status
- `isActive` (boolean, indexed, default: true) - Whether job preference is visible and selectable

#### Metadata
- `priority` (number, default: 0) - Sort order for display (lower = higher priority)

#### Audit Fields
- `createdAt` - Auto-generated timestamp
- `updatedAt` - Auto-generated timestamp

## Indexes

### Single Field Indexes
- `name` (unique) - Ensure unique job preference names
- `isActive` (standard) - Filter active job preferences

### Compound Indexes
- `{ isActive: 1, priority: 1 }` - Get active job preferences sorted by priority

## Relationships

### Referenced By
- **User/Expert** - Users reference job preferences via `jobPreferences` array
  - Expert can have multiple job preferences
  - Stored as: `jobPreferences: [ObjectId]` (array of JobPreference IDs)
  - Populated to show full details

## API Endpoints

**Base Path:** `/api/v1/job-preferences`

### GET /
**Get All Job Preferences**
- **Auth:** None
- **Query:** `includeInactive` (optional) - Include inactive preferences
- **Returns:** Array of job preferences sorted by priority

### GET /:id
**Get Job Preference by ID**
- **Auth:** None
- **Params:** `id` - JobPreference ObjectId
- **Returns:** Single job preference object

### POST /
**Create Job Preference**
- **Auth:** Required
- **Body:**
  ```json
  {
    "name": "Trainer",
    "description": "Deliver structured training programs and workshops",
    "priority": 1
  }
  ```
- **Returns:** Created job preference object

### PATCH /:id
**Update Job Preference**
- **Auth:** Required
- **Params:** `id` - JobPreference ObjectId
- **Body:** Partial job preference object
- **Returns:** Updated job preference object

### DELETE /:id
**Delete Job Preference (Soft Delete)**
- **Auth:** Required
- **Params:** `id` - JobPreference ObjectId
- **Action:** Sets `isActive: false`
- **Returns:** Success message

## Business Logic

### Naming Convention
- Clear, professional titles
- Use singular form (e.g., "Trainer" not "Training")
- Title Case
- 1-2 words preferred

### Description Guidelines
- 1-2 sentences explaining the work type
- Clarify key responsibilities
- Distinguish from similar roles
- Examples:
  - **Trainer:** Deliver structured training programs and workshops
  - **Coach:** Provide one-on-one guidance for personal/professional development
  - **Consultant:** Offer expert advice and strategic recommendations
  - **Mentor:** Guide and support long-term career/skill development

### Priority System
- Lower numbers = higher priority
- Order by platform demand:
  - Trainer: 1
  - Coach: 2
  - Consultant: 3
- Default: 0

## Query Patterns

### Get Active Job Preferences for Selection
```typescript
const jobPrefs = await JobPreference.find({ isActive: true })
  .sort({ priority: 1, name: 1 })
  .select('name description')
  .lean();
```

### Get Expert Job Preferences (Populated)
```typescript
const expert = await User.findById(userId)
  .populate('jobPreferences', 'name description')
  .lean();
```

### Get Popular Job Preferences
```typescript
const popularJobPrefs = await JobPreference.aggregate([
  { $match: { isActive: true } },
  {
    $lookup: {
      from: 'users',
      localField: '_id',
      foreignField: 'jobPreferences',
      as: 'experts',
    },
  },
  {
    $project: {
      name: 1,
      expertCount: { $size: '$experts' },
    },
  },
  { $sort: { expertCount: -1 } },
]);
```

## File References

- **Model:** `src/models/JobPreference.ts`
- **Schema:** `src/schemas/reference-data.schema.ts`
- **Controller:** `src/controllers/job-preference.controller.ts`
- **Service:** `src/services/job-preference.service.ts`
- **Routes:** `src/routes/job-preference.routes.ts`

## Related Documentation

- [User](../user/README.md) - Experts have job preferences

## Usage Examples

### Create Job Preference
```typescript
const jobPref = await JobPreference.create({
  name: "Facilitator",
  description: "Guide group discussions and collaborative sessions",
  isActive: true,
  priority: 4,
});
```

### Add Job Preference to Expert Profile
```typescript
await User.findByIdAndUpdate(userId, {
  $addToSet: { jobPreferences: jobPrefId },
});
```

## Validation Rules

### Name
- Required, unique, trimmed
- Length: 2-50 characters

### Description
- Optional, trimmed
- Length: 10-200 characters

### Priority
- Default: 0
- Any integer

## Typical Job Preferences

### Teaching & Training
- **Trainer** - Structured training delivery
- **Workshop Leader** - Hands-on workshop facilitation
- **Course Creator** - Design and develop courses
- **Instructor** - Classroom/online teaching

### Coaching & Mentoring
- **Coach** - One-on-one coaching sessions
- **Mentor** - Long-term mentorship relationships
- **Career Coach** - Career development guidance
- **Life Coach** - Personal development coaching

### Consulting & Advisory
- **Consultant** - Expert advice and recommendations
- **Advisor** - Strategic advisory services
- **Subject Matter Expert** - Domain-specific expertise
- **Technical Consultant** - Technical problem-solving

### Facilitation & Speaking
- **Facilitator** - Group session facilitation
- **Speaker** - Keynote and conference speaking
- **Moderator** - Panel and discussion moderation
- **MC/Host** - Event hosting

### Creative & Content
- **Content Creator** - Educational content development
- **Curriculum Designer** - Learning program design
- **Researcher** - Research and analysis

## Distinction Between Roles

### Trainer vs Coach
- **Trainer:** Structured group training, skill transfer
- **Coach:** Personalized guidance, performance improvement

### Consultant vs Advisor
- **Consultant:** Project-based, problem-solving, deliverables
- **Advisor:** Ongoing relationship, strategic guidance

### Mentor vs Coach
- **Mentor:** Long-term, holistic career/life guidance
- **Coach:** Focused, goal-oriented, shorter-term

## Future Enhancements

1. Job preference categories (Teaching, Consulting, etc.)
2. Availability indicators (Full-time, Part-time, Project-based)
3. Rate ranges per job preference
4. Job preference skill requirements
5. Certification requirements per role
6. Job preference portfolios/examples
7. Booking preferences (remote, in-person, hybrid)
8. Job preference demand analytics
