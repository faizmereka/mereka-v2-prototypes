# TargetAudience Feature

## Overview

The TargetAudience feature defines audience types or demographic categories that experiences can target. This helps learners find experiences suitable for their profile and helps hubs market their offerings to the right audience segments.

## Business Context

TargetAudiences help with:
- **Audience Segmentation** - Define who experiences are designed for
- **Discovery** - Learners find relevant experiences for their profile
- **Filtering** - Search and filter experiences by audience type
- **Marketing** - Target communications to specific segments
- **Analytics** - Track which audiences are most engaged
- **Planning** - Understand demand across different segments

Examples:
- **Students** - K-12, university students
- **Professionals** - Working adults, career-focused
- **Seniors** - Retirees, older adults
- **Families** - Parent + children experiences
- **Children** - Kid-specific programming
- **Youth** - Teenagers, young adults
- **Beginners** - First-time learners
- **Entrepreneurs** - Startup founders, business owners
- **Hobbyists** - Casual learners, enthusiasts

## Model Structure

**Location:** `src/models/TargetAudience.ts`

### Core Fields

#### Basic Information
- `name` (required, unique, indexed) - Audience type name (e.g., "Students")
- `description` (optional) - Detailed explanation of this audience segment

#### Status
- `isActive` (boolean, indexed, default: true) - Whether audience type is visible and usable

#### Metadata
- `priority` (number, default: 0) - Sort order for display (lower = higher priority)

#### Audit Fields
- `createdAt` - Auto-generated timestamp
- `updatedAt` - Auto-generated timestamp

## Indexes

### Single Field Indexes
- `name` (unique) - Ensure unique audience names
- `isActive` (standard) - Filter active audiences

### Compound Indexes
- `{ isActive: 1, priority: 1 }` - Get active audiences sorted by priority
- `{ name: 1 }` - Quick name lookups

## Relationships

### Referenced By
- **Experience** - Experiences reference audiences via `targetAudience` field
  - Experience can target multiple audiences (array of strings)
  - Stored as: `targetAudience: ["Students", "Professionals"]`
  - Uses audience NAME not ID (for flexibility)

### Cross-Domain Usage
- **Shared Resource** - Can be used by multiple features:
  - Experiences
  - Hubs (future) - Hub's primary audience
  - Courses (future)
  - Services (future)

## API Endpoints

**Base Path:** `/api/v1/target-audiences`

### POST /
**Create Target Audience**
- **Auth:** Required (implied from routes)
- **Body:**
  ```json
  {
    "name": "Professionals",
    "description": "Working adults seeking career development and professional growth",
    "priority": 10
  }
  ```
- **Returns:** Created target audience object

### GET /active
**List Active Target Audiences**
- **Auth:** None
- **Query:** None
- **Returns:** Array of active audiences sorted by priority
- **Use Case:** Populate dropdown/selection menus

### GET /
**List All Target Audiences**
- **Auth:** None
- **Query:** None
- **Returns:** Array of all audiences (including inactive) sorted by priority
- **Use Case:** Admin interface showing all audiences

## Business Logic

### Naming Convention
- Names should be clear and self-explanatory
- Use plural when referring to groups (e.g., "Students", "Professionals")
- Use singular for age groups (e.g., "Adult", "Senior")
- Title Case recommended
- Keep concise (1-2 words preferred)

### Priority System
- Lower numbers = higher priority (displayed first)
- Typical range: 0-100
- Default: 0
- Common audiences should have lower priority:
  - Students: 1
  - Professionals: 2
  - Families: 3
  - etc.

### Soft Delete
- Audiences are never hard-deleted
- `isActive: false` hides from public views
- Preserves historical data in experiences
- Can be re-activated if needed

### Reference by Name
- Experiences store audience NAMES not IDs
- Pros:
  - Flexible (can create ad-hoc audiences)
  - Survives audience deletion
  - Simple to query
- Cons:
  - Name changes break references
  - No referential integrity
- Alternative approach: Store IDs and populate names

### Multi-Selection
- Experiences can target multiple audiences
- Order doesn't matter
- Duplicates should be prevented at application level

## Query Patterns

### Get Active Audiences for Dropdown
```typescript
const audiences = await TargetAudience.find({ isActive: true })
  .sort({ priority: 1, name: 1 })
  .select('name description')
  .lean();
```

### Get All Audiences (Admin)
```typescript
const allAudiences = await TargetAudience.find({})
  .sort({ priority: 1 })
  .lean();
```

### Check Duplicate Name
```typescript
const existingAudience = await TargetAudience.findOne({
  name: audienceName,
  _id: { $ne: currentAudienceId }, // Exclude current when updating
});

if (existingAudience) {
  throw new Error('Target audience with this name already exists');
}
```

### Get Experiences by Audience
```typescript
const experiences = await Experience.find({
  targetAudience: { $in: ['Students', 'Youth'] },
  status: 'ACTIVE',
})
  .sort({ priority: 1 })
  .lean();
```

### Get Usage Statistics
```typescript
const stats = await TargetAudience.aggregate([
  { $match: { isActive: true } },
  {
    $lookup: {
      from: 'experiences',
      let: { audienceName: '$name' },
      pipeline: [
        {
          $match: {
            $expr: { $in: ['$$audienceName', '$targetAudience'] },
            status: 'ACTIVE',
          },
        },
      ],
      as: 'experiences',
    },
  },
  {
    $project: {
      name: 1,
      description: 1,
      usageCount: { $size: '$experiences' },
    },
  },
  { $sort: { usageCount: -1 } },
]);
```

## File References

- **Model:** `src/models/TargetAudience.ts`
- **Schema:** `src/schemas/target-audience.schema.ts` (if exists)
- **Controller:** `src/controllers/target-audience.controller.ts`
- **Service:** `src/services/target-audience.service.ts`
- **Routes:** `src/routes/target-audience.routes.ts`

## Related Documentation

- [Experience](../experience/README.md) - Primary user of target audiences
- [Reference Data](../../api/REFERENCE-DATA.md) - Similar pattern
- [ExperienceTheme](../experience-theme/README.md) - Similar reference data

## Migration Notes

### From Firebase
- Firebase collection: `targetAudiences` or `audiences`
- May be stored as array in config
- Check for experiences using these audience names
- Ensure names match exactly (case-sensitive)

### Data Validation
- List all unique values from `Experience.targetAudience` arrays
- Create TargetAudience documents for each
- Standardize naming (fix capitalization, pluralization)
- Remove duplicates

## Usage Examples

### Create Target Audience
```typescript
const audience = await TargetAudience.create({
  name: "Entrepreneurs",
  description: "Startup founders and business owners seeking to grow their ventures",
  isActive: true,
  priority: 8,
});
```

### Get Active Audiences
```typescript
const activeAudiences = await TargetAudience.find({
  isActive: true,
})
  .sort({ priority: 1 })
  .lean();
```

### Update Audience Priority
```typescript
await TargetAudience.findByIdAndUpdate(audienceId, {
  priority: 5,
});
```

### Soft Delete Audience
```typescript
await TargetAudience.findByIdAndUpdate(audienceId, {
  isActive: false,
});
```

### Set Experience Target Audiences
```typescript
await Experience.findByIdAndUpdate(experienceId, {
  targetAudience: ["Students", "Youth", "Beginners"],
});
```

## Validation Rules

### Name
- Required
- Unique
- Trimmed
- Recommended length: 2-50 characters
- No special characters (alphanumeric + spaces)

### Description
- Optional
- Trimmed
- Recommended length: 10-200 characters

### Priority
- Default: 0
- Any integer allowed
- Negative values allowed (appear first)

### IsActive
- Boolean
- Default: true

## Performance Considerations

1. **Caching** - Audiences change rarely, cache aggressively
2. **Index Usage** - Queries use compound index for efficiency
3. **Lean Queries** - Always use `.lean()` for read operations
4. **Small Dataset** - Typically < 30 audiences total

## Common Operations

### Reorder Audiences
```typescript
const updates = [
  { id: 'audience1', priority: 1 },
  { id: 'audience2', priority: 2 },
  { id: 'audience3', priority: 3 },
];

for (const update of updates) {
  await TargetAudience.findByIdAndUpdate(update.id, {
    priority: update.priority,
  });
}
```

### Bulk Create Audiences
```typescript
const audiencesToCreate = [
  { name: "Students", priority: 1 },
  { name: "Professionals", priority: 2 },
  { name: "Seniors", priority: 3 },
  { name: "Families", priority: 4 },
  { name: "Youth", priority: 5 },
];

await TargetAudience.insertMany(audiencesToCreate);
```

### Get Popular Audiences
```typescript
const audiences = await TargetAudience.find({ isActive: true }).lean();

const withCounts = await Promise.all(
  audiences.map(async (audience) => {
    const count = await Experience.countDocuments({
      targetAudience: audience.name,
      status: 'ACTIVE',
    });
    return { ...audience, experienceCount: count };
  })
);

const popular = withCounts
  .sort((a, b) => b.experienceCount - a.experienceCount)
  .slice(0, 5);
```

### Rename Audience (Update References)
```typescript
const oldName = "Students";
const newName = "University Students";

// Update TargetAudience document
await TargetAudience.findOneAndUpdate({ name: oldName }, { name: newName });

// Update all experience references
await Experience.updateMany(
  { targetAudience: oldName },
  {
    $set: {
      'targetAudience.$[elem]': newName,
    },
  },
  {
    arrayFilters: [{ elem: oldName }],
  }
);
```

## Error Handling

### Duplicate Name
```typescript
try {
  await TargetAudience.create({ name: "Students" });
} catch (error) {
  if (error.code === 11000) {
    return "Target audience with this name already exists";
  }
}
```

### Audience Not Found
```typescript
const audience = await TargetAudience.findById(audienceId);
if (!audience) {
  throw new Error("Target audience not found");
}
```

### Delete Audience with Experiences
```typescript
const experienceCount = await Experience.countDocuments({
  targetAudience: audienceName,
});

if (experienceCount > 0) {
  // Soft delete only
  await TargetAudience.findByIdAndUpdate(audienceId, {
    isActive: false,
  });
  return `Audience deactivated. ${experienceCount} experiences still reference it.`;
}

// Can hard delete if no experiences
await TargetAudience.findByIdAndDelete(audienceId);
```

## Security Considerations

1. **Authorization** - Only admins can create/update/delete audiences
2. **Input Sanitization** - Sanitize name and description
3. **XSS Prevention** - Escape HTML in description for display
4. **Referential Integrity** - Handle audience deletion gracefully

## Testing

- **Unit Tests:** `tests/unit/target-audience.service.test.ts`
- **Integration Tests:** `tests/integration/target-audience.routes.test.ts`
- **Test Fixtures:** `tests/fixtures/target-audience.fixture.ts`

## Admin UI Considerations

### List View
- Show name, description (truncated), priority, status
- Show usage count (experiences using this audience)
- Sort by priority by default
- Quick toggle for isActive
- Drag-and-drop reordering
- Search by name

### Edit Form
- Name (required, unique validation)
- Description (textarea, optional)
- Priority (number input)
- Active toggle
- Show usage count (read-only)
- Warning if trying to delete audience in use

### Creation Flow
1. Enter unique name
2. Add description
3. Set priority (suggest next available)
4. Save

## Use Cases

### Experience Creation
1. Hub creates experience
2. Selects target audiences from dropdown (multi-select)
3. Saved as array in `targetAudience` field

### Experience Discovery
1. Learner browses experiences
2. Filters by "Students"
3. System shows experiences where `targetAudience` contains "Students"

### Hub Analytics
1. Hub views analytics
2. See breakdown of experiences by target audience
3. Identify underserved audience segments

### Marketing Campaigns
1. Marketing team creates campaign
2. Targets "Professionals" and "Entrepreneurs"
3. Query experiences with those audiences
4. Send targeted emails/notifications

## Future Enhancements

1. **Age Ranges** - Define specific age ranges per audience
2. **Demographics** - Additional fields (income, education level, etc.)
3. **Nested Audiences** - Parent-child relationships (e.g., "Students" → "University Students", "High School Students")
4. **Custom Audiences** - Hubs define custom audience segments
5. **Audience Matching** - Match learners to experiences based on profile
6. **Audience Analytics** - Track engagement per audience
7. **Multi-language Support** - Localized audience names
8. **Audience Icons** - Visual representation for each audience
9. **Audience Personas** - Detailed profiles with characteristics
10. **Smart Recommendations** - Suggest audiences based on experience content

## Typical Target Audiences

### By Age
- Children (5-12)
- Youth (13-17)
- Young Adults (18-25)
- Adults (26-64)
- Seniors (65+)

### By Role
- Students
- Professionals
- Entrepreneurs
- Educators
- Parents

### By Skill Level
- Beginners
- Intermediate
- Advanced
- Experts

### By Interest
- Hobbyists
- Career Changers
- Lifelong Learners

### By Group Type
- Families
- Corporate Teams
- Community Groups
- Couples

## Relationship to Experience Fields

TargetAudience is distinct from:
- **experienceType** (Physical/Virtual/Hybrid) - HOW it's delivered
- **ExperienceTheme** (Art, Music, Technology) - WHAT content category
- **ExperienceTopic** (Photography, Web Dev) - Specific subject
- **expertiseLevel** (Beginner, Advanced) - Required skill level

TargetAudience answers: **WHO is this for?**

An experience might be:
- Theme: Technology
- Topic: Web Development
- Type: Workshop
- Expertise Level: Beginner
- Target Audience: Students, Youth

All of these dimensions help learners find the right experience.
