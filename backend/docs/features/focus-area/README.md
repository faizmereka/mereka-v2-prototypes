# FocusArea Feature

## Overview

The FocusArea feature defines primary expertise categories for Hubs and Experts on the Mereka platform. Focus Areas represent broad domains of knowledge and practice that organize skills, experiences, and expertise (e.g., "Tech & AI", "Design & Branding", "Career & Business").

## Business Context

FocusAreas are crucial for:
- **Expertise Categorization** - Organize hubs and experts by domain
- **Skill Hierarchies** - Parent category for skills
- **Discovery** - Help learners find expertise in specific domains
- **Filtering** - Search and filter by focus area
- **Navigation** - Browse content by domain
- **Analytics** - Track popular domains and expertise gaps
- **Matchmaking** - Connect learners with relevant experts

Examples:
- **Tech & AI** - Technology, software, AI, data science
- **Design & Branding** - UX, graphic design, branding
- **Career & Business** - Professional development, entrepreneurship
- **ESG** - Environmental, social, governance
- **Arts & Culture** - Creative arts, cultural activities
- **Health & Wellness** - Fitness, mental health, wellbeing

## Model Structure

**Location:** `src/models/FocusArea.ts`

### Core Fields

#### Basic Information
- `name` (required, unique, indexed) - Focus area name (e.g., "Tech & AI")
- `description` (optional) - Detailed explanation of this focus area
- `icon` (optional) - Icon URL or identifier for UI display

#### Status
- `isActive` (boolean, indexed, default: true) - Whether focus area is visible and usable

#### Metadata
- `priority` (number, default: 0) - Sort order for display (lower = higher priority)

#### Audit Fields
- `createdAt` - Auto-generated timestamp
- `updatedAt` - Auto-generated timestamp

## Indexes

### Single Field Indexes
- `name` (unique) - Ensure unique focus area names
- `isActive` (standard) - Filter active focus areas

### Compound Indexes
- `{ isActive: 1, priority: 1 }` - Get active focus areas sorted by priority

## Relationships

### Children
- **Skill** - Skills belong to a focus area via `focusAreaId`
  - One focus area has many skills
  - Skill belongs to one focus area
  - Hierarchical: FocusArea → Skills

### Referenced By
- **Hub** - Hubs reference focus areas via `focusAreas` array
  - Hub can have multiple focus areas
  - Stored as: `focusAreas: [ObjectId]`

- **User/Expert** - Users reference focus area via `focusAreaId`
  - User has one primary focus area
  - Stored as: `focusAreaId: ObjectId`

## API Endpoints

**Base Path:** `/api/v1/focus-areas`

### GET /
**Get All Focus Areas**
- **Auth:** None
- **Query:**
  - `includeInactive` (optional) - Include inactive focus areas (true/false)
- **Returns:** Array of focus areas sorted by priority
- **Default:** Returns only active focus areas

### GET /:id
**Get Focus Area by ID**
- **Auth:** None
- **Params:** `id` - FocusArea ObjectId (must be valid 24-char hex)
- **Returns:** Single focus area object with details

### POST /
**Create Focus Area**
- **Auth:** Required (Bearer token)
- **Body:**
  ```json
  {
    "name": "Tech & AI",
    "description": "Technology, software development, artificial intelligence, and data science",
    "icon": "tech-icon-url",
    "priority": 1
  }
  ```
- **Validation:** Uses `createReferenceDataSchema`
- **Returns:** Created focus area object

### PATCH /:id
**Update Focus Area**
- **Auth:** Required (Bearer token)
- **Params:** `id` - FocusArea ObjectId
- **Body:** Partial focus area object
  ```json
  {
    "description": "Updated description",
    "priority": 5
  }
  ```
- **Validation:** Uses `updateReferenceDataSchema`
- **Returns:** Updated focus area object

### DELETE /:id
**Delete Focus Area (Soft Delete)**
- **Auth:** Required (Bearer token)
- **Params:** `id` - FocusArea ObjectId
- **Action:** Sets `isActive: false`
- **Returns:** Success message
- **Note:** Soft delete only, document preserved

## Business Logic

### Naming Convention
- Clear, broad category names
- Title Case with & symbol if applicable
- 2-4 words typical
- Cover broad domain, not specific skills

### Priority System
- Lower numbers = higher priority (displayed first)
- Order by platform strategy/popularity:
  - Tech & AI: 1
  - Design & Branding: 2
  - Career & Business: 3
- Default: 0

### Icon Management
- Icons represent the focus area visually
- Can be:
  - URL to image file
  - Icon identifier (e.g., "fa-laptop" for Font Awesome)
  - Emoji
  - SVG path

### Description Guidelines
- 1-2 sentences
- Explain scope and what's included
- Mention key sub-domains
- Help users understand if their expertise fits

### Soft Delete Handling
- Focus areas never hard-deleted
- `isActive: false` hides from selection
- Existing references preserved:
  - Skills remain linked
  - Hubs keep reference
  - Users keep reference
- Can be re-activated

## Query Patterns

### Get Active Focus Areas for Dropdown
```typescript
const focusAreas = await FocusArea.find({ isActive: true })
  .sort({ priority: 1, name: 1 })
  .select('name icon description')
  .lean();
```

### Get Focus Area with Skills
```typescript
const focusArea = await FocusArea.findById(focusAreaId).lean();

const skills = await Skill.find({
  focusAreaId: focusAreaId,
  isActive: true,
})
  .sort({ priority: 1 })
  .lean();

const focusAreaWithSkills = {
  ...focusArea,
  skills,
};
```

### Get Focus Areas with Skill Counts
```typescript
const focusAreasWithCounts = await FocusArea.aggregate([
  { $match: { isActive: true } },
  {
    $lookup: {
      from: 'skills',
      localField: '_id',
      foreignField: 'focusAreaId',
      as: 'skills',
    },
  },
  {
    $project: {
      name: 1,
      icon: 1,
      description: 1,
      skillCount: { $size: '$skills' },
    },
  },
  { $sort: { priority: 1 } },
]);
```

### Get Popular Focus Areas
```typescript
const popularFocusAreas = await FocusArea.aggregate([
  { $match: { isActive: true } },
  {
    $lookup: {
      from: 'hubs',
      localField: '_id',
      foreignField: 'focusAreas',
      as: 'hubs',
    },
  },
  {
    $project: {
      name: 1,
      icon: 1,
      hubCount: { $size: '$hubs' },
    },
  },
  { $sort: { hubCount: -1 } },
  { $limit: 5 },
]);
```

## File References

- **Model:** `src/models/FocusArea.ts`
- **Schema:** `src/schemas/reference-data.schema.ts` (shared)
- **Controller:** `src/controllers/focus-area.controller.ts`
- **Service:** `src/services/focus-area.service.ts`
- **Routes:** `src/routes/focus-area.routes.ts`

## Related Documentation

- [Skill](../skill/README.md) - Child skills within focus areas
- [Hub](../hub/README.md) - Hubs have multiple focus areas
- [User](../user/README.md) - Experts have primary focus area

## Migration Notes

### From Firebase
- Firebase collection: `focusAreas` or config array
- Check for duplicate names
- Migrate icons (may need URL conversion)
- Set priorities based on business strategy
- Ensure all skills have valid focusAreaId

## Usage Examples

### Create Focus Area
```typescript
const focusArea = await FocusArea.create({
  name: "Tech & AI",
  description: "Technology, software development, artificial intelligence, and data science expertise",
  icon: "fa-laptop-code",
  isActive: true,
  priority: 1,
});
```

### Get Active Focus Areas with Icons
```typescript
const focusAreas = await FocusArea.find({ isActive: true })
  .sort({ priority: 1 })
  .select('name icon description')
  .lean();
```

### Add Focus Area to Hub
```typescript
await Hub.findByIdAndUpdate(hubId, {
  $addToSet: { focusAreas: focusAreaId },
});
```

### Set User's Primary Focus Area
```typescript
await User.findByIdAndUpdate(userId, {
  focusAreaId: focusAreaId,
});
```

## Validation Rules

### Name
- Required
- Unique
- Trimmed
- Length: 3-50 characters

### Description
- Optional
- Trimmed
- Recommended length: 20-200 characters

### Icon
- Optional
- Trimmed
- No format validation (frontend responsibility)

### Priority
- Default: 0
- Any integer
- Negative values allowed

### IsActive
- Boolean
- Default: true

## Performance Considerations

1. **Caching** - Cache focus areas list (changes very infrequently)
2. **Index Usage** - Queries use compound index
3. **Lean Queries** - Always use `.lean()` for reads
4. **Small Dataset** - Typically 5-15 focus areas total
5. **Aggregate Efficiently** - Use indexes when aggregating with skills/hubs

## Common Operations

### Reorder Focus Areas
```typescript
const updates = [
  { id: 'focusArea1', priority: 1 },
  { id: 'focusArea2', priority: 2 },
];

for (const update of updates) {
  await FocusArea.findByIdAndUpdate(update.id, { priority: update.priority });
}
```

### Bulk Create Focus Areas
```typescript
const focusAreasToCreate = [
  { name: "Tech & AI", icon: "fa-laptop", priority: 1 },
  { name: "Design & Branding", icon: "fa-palette", priority: 2 },
  { name: "Career & Business", icon: "fa-briefcase", priority: 3 },
];

await FocusArea.insertMany(focusAreasToCreate);
```

### Get Complete Hierarchy (Focus Area → Skills)
```typescript
const hierarchy = await FocusArea.aggregate([
  { $match: { isActive: true } },
  {
    $lookup: {
      from: 'skills',
      localField: '_id',
      foreignField: 'focusAreaId',
      as: 'skills',
      pipeline: [
        { $match: { isActive: true } },
        { $sort: { priority: 1, name: 1 } },
      ],
    },
  },
  { $sort: { priority: 1 } },
]);
```

## Error Handling

### Duplicate Name
```typescript
try {
  await FocusArea.create({ name: "Tech & AI" });
} catch (error) {
  if (error.code === 11000) {
    return "Focus area with this name already exists";
  }
}
```

### Delete with Skills
```typescript
const skillCount = await Skill.countDocuments({
  focusAreaId: focusAreaId,
});

if (skillCount > 0) {
  // Soft delete only
  await FocusArea.findByIdAndUpdate(focusAreaId, { isActive: false });
  await Skill.updateMany({ focusAreaId: focusAreaId }, { isActive: false });
  return `Focus area deactivated. ${skillCount} skills also deactivated.`;
}
```

## Security Considerations

1. **Authorization** - POST/PATCH/DELETE require auth
2. **Input Sanitization** - Sanitize name, description, icon
3. **XSS Prevention** - Escape HTML in description
4. **Cascade Effects** - Consider impact on skills when deleting

## Testing

- **Unit Tests:** `tests/unit/focus-area.service.test.ts`
- **Integration Tests:** `tests/integration/focus-areas.routes.test.ts`
- **Test Fixtures:** `tests/fixtures/focus-area.fixture.ts`

## Standard Focus Areas

### Technology Domain
- **Tech & AI** - Software, AI, data science, cloud computing
- **Cybersecurity** - Security, privacy, ethical hacking

### Creative Domain
- **Design & Branding** - UX/UI, graphic design, brand strategy
- **Arts & Culture** - Fine arts, performing arts, cultural studies
- **Media & Content** - Video, photography, writing, content creation

### Business Domain
- **Career & Business** - Professional development, entrepreneurship, business strategy
- **Finance & Investment** - Personal finance, investing, financial planning
- **Marketing & Sales** - Digital marketing, sales strategies, growth

### Sustainability
- **ESG** - Environmental, social, governance, sustainability

### Personal Development
- **Health & Wellness** - Fitness, nutrition, mental health, mindfulness
- **Leadership & Management** - Leadership skills, team management, coaching

### Education
- **Teaching & Training** - Pedagogy, instructional design, facilitation

## Admin UI Considerations

### List View
- Show name, icon (visual), description (truncated), skill count, priority
- Icon preview
- Sortable columns
- Quick toggle for isActive
- Drag-and-drop reordering

### Edit Form
- Name (required, unique validation)
- Description (textarea with character count)
- Icon picker or URL input with preview
- Priority slider
- Active toggle
- Show skill count (read-only with link to skills)
- Warning if deleting focus area with skills

### Icon Selection
- Upload custom icon
- Choose from icon library
- Enter icon identifier
- Preview before saving

## Future Enhancements

1. Focus area images/banners
2. Multi-language support for names/descriptions
3. Focus area color schemes/themes
4. Parent-child focus area hierarchies
5. Focus area trends/analytics
6. Recommended focus areas for users
7. Focus area certifications/credentials
8. Cross-focus area skills (skills in multiple areas)
9. Focus area learning paths
10. Focus area expert directories
