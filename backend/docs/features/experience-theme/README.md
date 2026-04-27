# ExperienceTheme Feature

## Overview

The ExperienceTheme feature represents high-level categories for experiences on the Mereka platform. Themes are the top-level taxonomy used to organize and classify experiences (e.g., Art, Music, Technology, Sports, Business).

## Business Context

ExperienceThemes provide:
- **Categorization** - Group similar experiences together
- **Discovery** - Help learners find relevant experiences
- **Navigation** - Power category browsing and filtering
- **Analytics** - Track popular categories
- **Marketing** - Feature experiences by theme

Each theme can have multiple ExperienceTopics as sub-categories, creating a two-level taxonomy: Theme → Topics.

## Model Structure

**Location:** `src/models/ExperienceTheme.ts`

### Core Fields

#### Basic Information
- `name` (required, unique, indexed) - Theme name (e.g., "Art & Design")
- `description` (optional) - Detailed description of the theme
- `icon` (optional) - Icon URL or identifier for UI display

#### Status
- `isActive` (boolean, indexed, default: true) - Whether theme is visible and usable

#### Metadata
- `count` (number, default: 0) - Number of experiences in this theme (denormalized)
- `priority` (number, default: 0) - Sort order for display (lower = higher priority)

#### Audit Fields
- `createdAt` - Auto-generated timestamp
- `updatedAt` - Auto-generated timestamp

## Indexes

### Single Field Indexes
- `name` (unique) - Ensure unique theme names
- `isActive` (standard) - Filter active themes

### Compound Indexes
- `{ isActive: 1, priority: 1 }` - Get active themes sorted by priority
- `{ name: 1 }` - Quick name lookups

## Relationships

### Children
- **ExperienceTopic** - Topics belong to a theme via `parentCategory` field
  - One theme has many topics
  - Topic belongs to one theme

### Referenced By
- **Experience** - Experiences reference theme via `experienceCategory` field
  - Experience belongs to one theme (optional)
  - Theme has many experiences

## API Endpoints

**Base Path:** `/api/v1/experience-themes`

### POST /
**Create Experience Theme**
- **Auth:** Required
- **Body:**
  ```json
  {
    "name": "Art & Design",
    "description": "Creative experiences in art, design, and visual culture",
    "icon": "palette-icon",
    "priority": 10
  }
  ```
- **Returns:** Created theme object

### GET /active
**List Active Themes**
- **Auth:** None
- **Query:** None
- **Returns:** Array of active themes sorted by priority
- **Use Case:** Populate dropdown/selection menus

### GET /:id
**Get Theme by ID**
- **Auth:** None
- **Params:** `id` - Theme ObjectId
- **Returns:** Single theme object with details

### GET /
**List All Themes**
- **Auth:** None
- **Query:** None
- **Returns:** Array of all themes (including inactive) sorted by priority
- **Use Case:** Admin interface showing all themes

### PATCH /:id
**Update Theme**
- **Auth:** Required
- **Params:** `id` - Theme ObjectId
- **Body:** Partial theme object
  ```json
  {
    "description": "Updated description",
    "priority": 20
  }
  ```
- **Returns:** Updated theme object

### DELETE /:id
**Delete Theme (Soft Delete)**
- **Auth:** Required
- **Params:** `id` - Theme ObjectId
- **Action:** Sets `isActive: false`
- **Returns:** Success message
- **Note:** Does not actually delete document (soft delete)

## Business Logic

### Theme Naming
- Names must be unique (case-sensitive in MongoDB)
- Recommended format: Title Case (e.g., "Art & Design")
- Should be clear and intuitive for learners

### Priority System
- Lower numbers = higher priority (displayed first)
- Typical range: 0-100
- Default: 0
- Used for:
  - Homepage category ordering
  - Dropdown menu ordering
  - Browse page ordering

### Count Field (Denormalized)
- Stores number of active experiences in this theme
- Updated when:
  - Experience created with this theme
  - Experience status changes (ACTIVE ↔ other)
  - Experience theme changed
- Improves query performance (avoid counting on every page load)

### Soft Delete
- Themes are never hard-deleted
- `isActive: false` hides theme from public views
- Preserves data integrity:
  - Existing experiences keep reference
  - Historical data remains intact
- Can be re-activated by setting `isActive: true`

### Icon Management
- Icons can be:
  - URL to image file
  - Icon identifier (e.g., "fa-palette" for Font Awesome)
  - Emoji
- Frontend determines how to render

## Query Patterns

### Get Active Themes for Dropdown
```typescript
const themes = await ExperienceTheme.find({ isActive: true })
  .sort({ priority: 1, name: 1 })
  .select('name icon')
  .lean();
```

### Get Theme with Topic Count
```typescript
const theme = await ExperienceTheme.findById(themeId);
const topicCount = await ExperienceTopic.countDocuments({
  parentCategory: themeId,
  isActive: true,
});
```

### Get Themes with Experience Counts
```typescript
const themes = await ExperienceTheme.aggregate([
  { $match: { isActive: true } },
  {
    $lookup: {
      from: 'experiences',
      localField: '_id',
      foreignField: 'experienceCategory',
      as: 'experiences',
    },
  },
  {
    $project: {
      name: 1,
      icon: 1,
      priority: 1,
      experienceCount: { $size: '$experiences' },
    },
  },
  { $sort: { priority: 1 } },
]);
```

### Update Theme Count
```typescript
const count = await Experience.countDocuments({
  experienceCategory: themeId,
  status: 'ACTIVE',
});

await ExperienceTheme.findByIdAndUpdate(themeId, { count });
```

## File References

- **Model:** `src/models/ExperienceTheme.ts`
- **Schema:** `src/schemas/experience-theme.schema.ts`
- **Controller:** `src/controllers/experience-theme.controller.ts`
- **Service:** `src/services/experience-theme.service.ts`
- **Routes:** `src/routes/experience-theme.routes.ts`

## Related Documentation

- [Experience](../experience/README.md) - Parent feature that uses themes
- [ExperienceTopic](../experience-topic/README.md) - Child subcategories
- [Reference Data](../../api/REFERENCE-DATA.md) - Similar pattern

## Migration Notes

### From Firebase
- Firebase collection: `experienceThemes` or `themes`
- Firestore may use auto-generated IDs
- Check if `count` field exists (may need to calculate)
- Priority field might be named differently (order, sort, rank)

### Data Validation
- Ensure no duplicate names
- Validate all referenced themes exist in Experience collection
- Recalculate counts after migration

## Usage Examples

### Create Theme
```typescript
const theme = await ExperienceTheme.create({
  name: "Technology & Innovation",
  description: "Learn cutting-edge tech skills from industry experts",
  icon: "tech-icon",
  isActive: true,
  priority: 5,
  count: 0,
});
```

### Get Active Themes
```typescript
const activeThemes = await ExperienceTheme.find({
  isActive: true,
})
  .sort({ priority: 1, name: 1 })
  .lean();
```

### Soft Delete Theme
```typescript
await ExperienceTheme.findByIdAndUpdate(themeId, {
  isActive: false,
});
```

### Update Theme Priority
```typescript
await ExperienceTheme.findByIdAndUpdate(themeId, {
  priority: 10,
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
- Recommended length: 10-500 characters

### Icon
- Optional
- Trimmed
- No validation on format (frontend responsibility)

### Priority
- Default: 0
- Recommended range: 0-100
- Can be negative (appears first)

## Performance Considerations

1. **Cache Active Themes** - Cache the active themes list (changes infrequently)
2. **Count Denormalization** - Pre-calculated counts avoid expensive aggregations
3. **Index Usage** - Queries use compound indexes for efficiency
4. **Lean Queries** - Use `.lean()` for read-only operations

## Common Operations

### Reorder Themes
```typescript
// Set new priorities
const updates = [
  { id: 'theme1', priority: 1 },
  { id: 'theme2', priority: 2 },
  { id: 'theme3', priority: 3 },
];

for (const update of updates) {
  await ExperienceTheme.findByIdAndUpdate(update.id, {
    priority: update.priority,
  });
}
```

### Recalculate All Counts
```typescript
const themes = await ExperienceTheme.find({});

for (const theme of themes) {
  const count = await Experience.countDocuments({
    experienceCategory: theme._id,
    status: 'ACTIVE',
  });

  theme.count = count;
  await theme.save();
}
```

### Get Popular Themes
```typescript
const popularThemes = await ExperienceTheme.find({
  isActive: true,
})
  .sort({ count: -1 })
  .limit(5)
  .lean();
```

## Error Handling

### Duplicate Name
```typescript
try {
  await ExperienceTheme.create({ name: "Existing Theme" });
} catch (error) {
  if (error.code === 11000) {
    // Duplicate key error
    return "Theme with this name already exists";
  }
}
```

### Theme Not Found
```typescript
const theme = await ExperienceTheme.findById(themeId);
if (!theme) {
  throw new Error("Theme not found");
}
```

### Delete Theme with Experiences
```typescript
const experienceCount = await Experience.countDocuments({
  experienceCategory: themeId,
});

if (experienceCount > 0) {
  // Soft delete only
  await ExperienceTheme.findByIdAndUpdate(themeId, {
    isActive: false,
  });
} else {
  // Can hard delete if no experiences
  await ExperienceTheme.findByIdAndDelete(themeId);
}
```

## Security Considerations

1. **Authorization** - Only admins can create/update/delete themes
2. **Input Sanitization** - Sanitize name, description, icon inputs
3. **XSS Prevention** - Escape HTML in description for display
4. **SQL Injection** - Mongoose handles (MongoDB doesn't have SQL injection)

## Testing

- **Unit Tests:** `tests/unit/experience-theme.service.test.ts`
- **Integration Tests:** `tests/integration/experience-theme.routes.test.ts`
- **Test Fixtures:** `tests/fixtures/experience-theme.fixture.ts`

## Admin UI Considerations

### List View
- Show name, icon, count, priority, status
- Allow sorting by any column
- Quick toggle for isActive
- Bulk priority update

### Edit Form
- Name (required)
- Description (WYSIWYG editor)
- Icon picker or URL input
- Priority slider
- Active toggle
- Show experience count (read-only)

### Validation
- Real-time name uniqueness check
- Character count for description
- Preview icon

## Future Enhancements

1. Multi-language support for theme names/descriptions
2. Theme images/banners
3. Custom color schemes per theme
4. Theme-specific featured experiences
5. SEO metadata per theme (title, meta description, keywords)
6. Theme analytics dashboard
7. Theme-specific search filters
8. Parent-child theme hierarchies (sub-themes)
