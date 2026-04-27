# ExperienceType Feature

## Overview

The ExperienceType feature represents the format or delivery type of experiences offered by hubs. This is distinct from ExperienceTheme (content category) and refers to HOW the experience is delivered (e.g., "Workshop", "Course", "Masterclass", "Webinar", "Conference").

## Business Context

ExperienceTypes help learners understand:
- **Format** - What type of learning format to expect
- **Duration** - Implied duration characteristics (workshops are shorter, courses are longer)
- **Structure** - Level of structure and commitment required
- **Delivery Style** - Teaching methodology and interaction style

Examples:
- **Workshop** - Hands-on, practical, short-duration
- **Course** - Structured, multi-session, comprehensive
- **Masterclass** - Expert-led, focused skill development
- **Webinar** - Presentation-style, informational
- **Conference** - Multi-track, networking, large-scale
- **Bootcamp** - Intensive, immersive, skill-focused
- **Seminar** - Academic, discussion-based
- **Retreat** - Multi-day, immersive, holistic

## Model Structure

**Location:** `src/models/ExperienceType.ts`

### Core Fields

#### Basic Information
- `name` (required, unique, indexed) - Type name (e.g., "Workshop")
- `description` (optional) - Detailed explanation of this type

#### Status
- `isActive` (boolean, indexed, default: true) - Whether type is visible and usable

#### Metadata
- `priority` (number, default: 0) - Sort order for display (lower = higher priority)

#### Audit Fields
- `createdAt` - Auto-generated timestamp
- `updatedAt` - Auto-generated timestamp

## Indexes

### Single Field Indexes
- `name` (unique) - Ensure unique type names
- `isActive` (standard) - Filter active types

### Compound Indexes
- `{ isActive: 1, priority: 1 }` - Get active types sorted by priority

## Relationships

### Referenced By
- **Experience** - Experiences may reference type (if implemented)
  - Currently NOT directly referenced in Experience model
  - Could be added in future as `experienceTypeId` or similar field

### Classification Type
- ExperienceType is a **Reference Data** type
- Follows standard reference data pattern
- Used primarily for UI categorization and filtering

## API Endpoints

**Base Path:** `/api/v1/experience-types`

### GET /
**Get All Experience Types**
- **Auth:** None
- **Query:**
  - `includeInactive` (optional) - Include inactive types (true/false)
- **Returns:** Array of experience types sorted by priority
- **Default:** Returns only active types

### GET /:id
**Get Experience Type by ID**
- **Auth:** None
- **Params:** `id` - ExperienceType ObjectId (must be valid 24-char hex)
- **Returns:** Single experience type object

### POST /
**Create Experience Type**
- **Auth:** Required (Bearer token)
- **Body:**
  ```json
  {
    "name": "Masterclass",
    "description": "Expert-led intensive session focusing on specific skills",
    "priority": 10
  }
  ```
- **Validation:** Uses `createReferenceDataSchema`
- **Returns:** Created experience type object

### PATCH /:id
**Update Experience Type**
- **Auth:** Required (Bearer token)
- **Params:** `id` - ExperienceType ObjectId
- **Body:** Partial experience type object
  ```json
  {
    "description": "Updated description",
    "priority": 5
  }
  ```
- **Validation:** Uses `updateReferenceDataSchema`
- **Returns:** Updated experience type object

### DELETE /:id
**Delete Experience Type (Soft Delete)**
- **Auth:** Required (Bearer token)
- **Params:** `id` - ExperienceType ObjectId
- **Action:** Sets `isActive: false`
- **Returns:** Success message
- **Note:** Soft delete only, document preserved

## Business Logic

### Naming Convention
- Names should be clear and recognizable
- Use singular form (e.g., "Workshop" not "Workshops")
- Title Case recommended
- Keep concise (1-2 words preferred)

### Priority System
- Lower numbers = higher priority (displayed first)
- Typical range: 0-100
- Default: 0
- Common types should have lower priority:
  - Workshop: 1
  - Course: 2
  - Webinar: 3
  - etc.

### Soft Delete
- Types are never hard-deleted
- `isActive: false` hides from public views
- Preserves historical data
- Can be re-activated if needed

### Authorization
- All mutations (POST, PATCH, DELETE) require authentication
- Reads (GET) are public
- Uses `requireAuth` middleware

## Query Patterns

### Get Active Types for Dropdown
```typescript
const types = await ExperienceType.find({ isActive: true })
  .sort({ priority: 1, name: 1 })
  .select('name description')
  .lean();
```

### Get All Types (Admin)
```typescript
const allTypes = await ExperienceType.find({})
  .sort({ priority: 1 })
  .lean();
```

### Check Duplicate Name
```typescript
const existingType = await ExperienceType.findOne({
  name: typeName,
  _id: { $ne: currentTypeId }, // Exclude current when updating
});

if (existingType) {
  throw new Error('Experience type with this name already exists');
}
```

## File References

- **Model:** `src/models/ExperienceType.ts`
- **Schema:** `src/schemas/reference-data.schema.ts` (shared schema)
- **Controller:** `src/controllers/experience-type.controller.ts`
- **Service:** `src/services/experience-type.service.ts`
- **Routes:** `src/routes/experience-type.routes.ts`

## Related Documentation

- [Reference Data](../../api/REFERENCE-DATA.md) - Standard pattern
- [Experience](../experience/README.md) - Feature that may use types
- [ExperienceTheme](../experience-theme/README.md) - Similar reference data pattern

## Migration Notes

### From Firebase
- Firebase collection: `experienceTypes` or similar
- May be stored as array in config
- Check for duplicate names
- Validate priority values

### Current Status
- **Model exists** but not actively used in Experience model
- **Future integration** planned
- **Currently** more of a UI/metadata feature

## Usage Examples

### Create Experience Type
```typescript
const type = await ExperienceType.create({
  name: "Bootcamp",
  description: "Intensive multi-week program for rapid skill development",
  isActive: true,
  priority: 5,
});
```

### Get Active Types
```typescript
const activeTypes = await ExperienceType.find({
  isActive: true,
})
  .sort({ priority: 1 })
  .lean();
```

### Update Type Priority
```typescript
await ExperienceType.findByIdAndUpdate(typeId, {
  priority: 10,
});
```

### Soft Delete Type
```typescript
await ExperienceType.findByIdAndUpdate(typeId, {
  isActive: false,
});
```

## Validation Rules

### Name
- Required
- Unique
- Trimmed
- Recommended length: 2-50 characters

### Description
- Optional
- Trimmed
- Recommended length: 10-200 characters

### Priority
- Default: 0
- Any integer allowed
- Negative values allowed

### IsActive
- Boolean
- Default: true

## Performance Considerations

1. **Caching** - Types change rarely, cache aggressively
2. **Index Usage** - Queries use compound index for efficiency
3. **Lean Queries** - Always use `.lean()` for read operations
4. **Small Dataset** - Typically < 50 types total

## Common Operations

### Reorder Types
```typescript
const updates = [
  { id: 'type1', priority: 1 },
  { id: 'type2', priority: 2 },
  { id: 'type3', priority: 3 },
];

for (const update of updates) {
  await ExperienceType.findByIdAndUpdate(update.id, {
    priority: update.priority,
  });
}
```

### Bulk Create Types
```typescript
const typesToCreate = [
  { name: "Workshop", priority: 1 },
  { name: "Course", priority: 2 },
  { name: "Webinar", priority: 3 },
  { name: "Masterclass", priority: 4 },
];

await ExperienceType.insertMany(typesToCreate);
```

### Get Popular Types
```typescript
// If usage tracking implemented
const popular = await ExperienceType.aggregate([
  { $match: { isActive: true } },
  {
    $lookup: {
      from: 'experiences',
      localField: '_id',
      foreignField: 'experienceTypeId', // If implemented
      as: 'experiences',
    },
  },
  {
    $project: {
      name: 1,
      usageCount: { $size: '$experiences' },
    },
  },
  { $sort: { usageCount: -1 } },
  { $limit: 5 },
]);
```

## Error Handling

### Duplicate Name
```typescript
try {
  await ExperienceType.create({ name: "Workshop" });
} catch (error) {
  if (error.code === 11000) {
    return "Experience type with this name already exists";
  }
}
```

### Invalid ObjectId
```typescript
if (!mongoose.Types.ObjectId.isValid(typeId)) {
  throw new Error("Invalid experience type ID format");
}

const type = await ExperienceType.findById(typeId);
if (!type) {
  throw new Error("Experience type not found");
}
```

## Security Considerations

1. **Authorization** - POST/PATCH/DELETE require auth via `requireAuth` middleware
2. **Input Sanitization** - Sanitize name and description
3. **XSS Prevention** - Escape HTML in description
4. **Rate Limiting** - Apply rate limits to prevent abuse

## Testing

- **Unit Tests:** `tests/unit/experience-type.service.test.ts`
- **Integration Tests:** `tests/integration/experience-type.routes.test.ts`
- **Test Fixtures:** `tests/fixtures/experience-type.fixture.ts`

## Admin UI Considerations

### List View
- Show name, description (truncated), priority, status
- Sort by priority by default
- Quick toggle for isActive
- Drag-and-drop reordering
- Search by name

### Edit Form
- Name (required, unique validation)
- Description (textarea, optional)
- Priority (number input)
- Active toggle
- Show usage count if implemented (read-only)

### Creation Flow
1. Enter unique name
2. Add description
3. Set priority (suggest next available)
4. Save

## Future Enhancements

### Integration with Experience
```typescript
// Add to Experience model:
experienceTypeId: {
  type: Schema.Types.ObjectId,
  ref: 'ExperienceType',
  index: true,
}
```

### Additional Features
1. Type-specific icons
2. Type characteristics (expected duration range, group size)
3. Type-specific templates for experience creation
4. Type popularity metrics
5. Type recommendations based on content
6. Multi-language support for names/descriptions
7. Type aliases (e.g., "Class" → "Course")
8. Type categories (group similar types)
9. SEO metadata per type
10. Type-specific search filters

## Typical Experience Types

### Standard Types
- **Workshop** - Short, hands-on, practical
- **Course** - Structured, multi-session, comprehensive
- **Webinar** - Online presentation, informational
- **Masterclass** - Expert-led, skill-focused
- **Seminar** - Academic, discussion-based

### Specialized Types
- **Bootcamp** - Intensive, immersive
- **Conference** - Multi-day, multi-track, networking
- **Retreat** - Immersive, holistic, transformational
- **Certification** - Assessment-based, credential-issuing
- **Mentorship** - One-on-one, ongoing relationship

### Event Types
- **Networking Event** - Social, connection-focused
- **Talk** - Presentation, inspirational
- **Panel Discussion** - Multiple speakers, Q&A
- **Hackathon** - Competitive, project-based

## Relationship to Experience.experienceType

**Note:** Do not confuse with `Experience.experienceType` field!

- **Experience.experienceType** - Physical | Virtual | Hybrid (delivery method)
- **ExperienceType model** - Workshop | Course | Webinar (format)

These are DIFFERENT concepts:
- Delivery method = WHERE (physical location, virtual, or both)
- Format = WHAT (type of learning experience)

An experience could be:
- "Virtual Workshop" (Virtual + Workshop)
- "Physical Course" (Physical + Course)
- "Hybrid Bootcamp" (Hybrid + Bootcamp)
