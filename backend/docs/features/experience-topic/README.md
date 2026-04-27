# ExperienceTopic Feature

## Overview

The ExperienceTopic feature represents sub-categories or topics within ExperienceThemes. Topics provide granular classification for experiences within a broader theme category (e.g., under "Art & Design" theme: "Photography", "Painting", "Graphic Design" topics).

## Business Context

ExperienceTopics provide:
- **Granular Classification** - More specific categorization than themes
- **Hierarchical Taxonomy** - Theme → Topics two-level structure
- **Refined Discovery** - Help learners find very specific experiences
- **Filtering** - Power advanced search and filtering
- **Organization** - Keep related experiences grouped logically

The hierarchy is: **ExperienceTheme → ExperienceTopic → Experience**

Example:
- Theme: "Technology & Innovation"
  - Topic: "Web Development"
  - Topic: "Mobile Apps"
  - Topic: "Data Science"
  - Topic: "Cybersecurity"

## Model Structure

**Location:** `src/models/ExperienceTopic.ts`

### Core Fields

#### Basic Information
- `name` (required, indexed) - Topic name (e.g., "Photography")
- `parentCategory` (required, indexed) - Reference to ExperienceTheme (ObjectId or string)

#### Status
- `isActive` (boolean, indexed, default: true) - Whether topic is visible and usable

#### Metadata
- `priority` (number, default: 0) - Sort order within parent theme (lower = higher priority)

#### Audit Fields
- `createdAt` - Auto-generated timestamp
- `updatedAt` - Auto-generated timestamp

## Indexes

### Single Field Indexes
- `name` (standard) - Quick name lookups
- `parentCategory` (standard) - Find topics by theme
- `isActive` (standard) - Filter active topics

### Compound Indexes
- `{ parentCategory: 1, isActive: 1 }` - Get active topics for a theme
- `{ parentCategory: 1, priority: 1 }` - Get topics for theme sorted by priority
- `{ name: 1, parentCategory: 1 }` (unique) - Prevent duplicate topic names within same theme

## Relationships

### Parent
- **ExperienceTheme** - Topic belongs to one theme via `parentCategory`
  - Topic belongs to one theme
  - Theme has many topics

### Referenced By
- **Experience** - Experiences reference topics via `experienceTopics` array
  - Experience can have multiple topics
  - Topic can be used by many experiences
  - Stored as: `{ theme: string, topic: string }` in Experience model

## API Endpoints

**Base Path:** `/api/v1/experience-topics`

### POST /
**Create Experience Topic**
- **Auth:** Required
- **Body:**
  ```json
  {
    "name": "Web Development",
    "parentCategory": "64f5a8b9c12d3e4f5678abcd",
    "priority": 10
  }
  ```
- **Returns:** Created topic object

### GET /:id
**Get Topic by ID**
- **Auth:** None
- **Params:** `id` - Topic ObjectId
- **Returns:** Single topic object with details

### GET /
**List Experience Topics**
- **Auth:** None
- **Query:**
  - `themeId` (optional) - Filter topics by parent theme
  - `includeInactive` (optional) - Include inactive topics
- **Returns:** Array of topics
- **Examples:**
  - `GET /experience-topics` - All topics
  - `GET /experience-topics?themeId=64f5a8b9c12d3e4f5678abcd` - Topics for specific theme

### PATCH /:id
**Update Topic**
- **Auth:** Required
- **Params:** `id` - Topic ObjectId
- **Body:** Partial topic object
  ```json
  {
    "priority": 20,
    "isActive": false
  }
  ```
- **Returns:** Updated topic object

### DELETE /:id
**Delete Topic (Soft Delete)**
- **Auth:** Required
- **Params:** `id` - Topic ObjectId
- **Action:** Sets `isActive: false`
- **Returns:** Success message
- **Note:** Does not actually delete document (soft delete)

## Business Logic

### Topic Naming
- Names should be unique within a theme (enforced by compound unique index)
- Same name CAN exist in different themes
  - Example: "Basics" can be a topic under both "Photography" and "Cooking"
- Recommended format: Title Case

### Hierarchical Structure
- Topics MUST belong to a theme (`parentCategory` required)
- Cannot create "orphan" topics
- Deleting a theme doesn't delete topics (data integrity)
  - Topics remain but become unreachable in UI
  - Consider bulk soft-deleting topics when theme is deleted

### Priority System
- Priority is scoped per theme
- Topic with priority 1 in Theme A is independent from priority 1 in Theme B
- Used for ordering topics when displaying theme details

### Soft Delete
- Topics are never hard-deleted
- `isActive: false` hides topic from public views
- Preserves data integrity for existing experiences
- Can be re-activated

### Multi-Topic Selection
- Experiences can have multiple topics via `experienceTopics` array
- Each entry stores: `{ theme: themeId, topic: topicId }`
- Allows cross-theme tagging (e.g., experience can be under "Art" → "Photography" AND "Technology" → "Digital Media")

## Query Patterns

### Get Topics for Theme
```typescript
const topics = await ExperienceTopic.find({
  parentCategory: themeId,
  isActive: true,
})
  .sort({ priority: 1, name: 1 })
  .lean();
```

### Get Topic with Theme Info
```typescript
const topic = await ExperienceTopic.findById(topicId).populate(
  'parentCategory',
  'name icon'
);
```

### Get All Topics Grouped by Theme
```typescript
const topicsByTheme = await ExperienceTopic.aggregate([
  { $match: { isActive: true } },
  {
    $lookup: {
      from: 'experiencethemes',
      localField: 'parentCategory',
      foreignField: '_id',
      as: 'theme',
    },
  },
  { $unwind: '$theme' },
  {
    $group: {
      _id: '$theme._id',
      themeName: { $first: '$theme.name' },
      topics: {
        $push: {
          id: '$_id',
          name: '$name',
          priority: '$priority',
        },
      },
    },
  },
  { $sort: { 'theme.priority': 1 } },
]);
```

### Check Duplicate Name in Theme
```typescript
const existingTopic = await ExperienceTopic.findOne({
  name: topicName,
  parentCategory: themeId,
});

if (existingTopic) {
  throw new Error('Topic with this name already exists in this theme');
}
```

### Get Experience Count per Topic
```typescript
const topics = await ExperienceTopic.aggregate([
  { $match: { parentCategory: themeId, isActive: true } },
  {
    $lookup: {
      from: 'experiences',
      let: { topicId: { $toString: '$_id' } },
      pipeline: [
        {
          $match: {
            $expr: {
              $in: ['$$topicId', '$experienceTopics.topic'],
            },
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
      priority: 1,
      experienceCount: { $size: '$experiences' },
    },
  },
  { $sort: { priority: 1 } },
]);
```

## File References

- **Model:** `src/models/ExperienceTopic.ts`
- **Schema:** `src/schemas/experience-topic.schema.ts`
- **Controller:** `src/controllers/experience-topic.controller.ts`
- **Service:** `src/services/experience-topic.service.ts`
- **Routes:** `src/routes/experience-topic.routes.ts`

## Related Documentation

- [ExperienceTheme](../experience-theme/README.md) - Parent theme
- [Experience](../experience/README.md) - Feature that uses topics
- [Reference Data](../../api/REFERENCE-DATA.md) - Similar pattern

## Migration Notes

### From Firebase
- Firebase collection: `experienceTopics` or `topics`
- Firestore may use different field names:
  - `category` → `parentCategory`
  - `themeId` → `parentCategory`
- Check reference format (string IDs vs ObjectIds)

### Data Validation
- Ensure all `parentCategory` references exist in ExperienceTheme
- Check for duplicate names within same theme
- Validate topic references in Experience collection

## Usage Examples

### Create Topic
```typescript
const topic = await ExperienceTopic.create({
  name: "Web Development",
  parentCategory: new Types.ObjectId(themeId),
  isActive: true,
  priority: 5,
});
```

### Get Topics for Theme (Dropdown)
```typescript
const topics = await ExperienceTopic.find({
  parentCategory: themeId,
  isActive: true,
})
  .sort({ priority: 1, name: 1 })
  .select('name')
  .lean();
```

### Update Topic Priority
```typescript
await ExperienceTopic.findByIdAndUpdate(topicId, {
  priority: 15,
});
```

### Soft Delete Topic
```typescript
await ExperienceTopic.findByIdAndUpdate(topicId, {
  isActive: false,
});
```

### Move Topic to Different Theme
```typescript
await ExperienceTopic.findByIdAndUpdate(topicId, {
  parentCategory: newThemeId,
});

// Note: This may create naming conflicts if topic with same name exists in new theme
```

## Validation Rules

### Name
- Required
- Trimmed
- Must be unique within parent theme
- Recommended length: 2-50 characters

### ParentCategory
- Required
- Must be valid ObjectId
- Must reference existing ExperienceTheme
- Cannot be null or empty

### Priority
- Default: 0
- Can be any integer
- Negative values allowed (appear first)

## Performance Considerations

1. **Index Usage** - Compound index on `(parentCategory, priority)` for efficient queries
2. **Caching** - Cache topics by theme (changes infrequently)
3. **Populate Carefully** - Only populate theme info when needed
4. **Lean Queries** - Use `.lean()` for read-only operations

## Common Operations

### Bulk Create Topics for Theme
```typescript
const topicNames = ["Beginner", "Intermediate", "Advanced"];
const topicsToCreate = topicNames.map((name, index) => ({
  name,
  parentCategory: themeId,
  priority: index + 1,
  isActive: true,
}));

await ExperienceTopic.insertMany(topicsToCreate);
```

### Reorder Topics within Theme
```typescript
const updates = [
  { id: 'topic1', priority: 1 },
  { id: 'topic2', priority: 2 },
  { id: 'topic3', priority: 3 },
];

for (const update of updates) {
  await ExperienceTopic.findByIdAndUpdate(update.id, {
    priority: update.priority,
  });
}
```

### Get Topics with Theme Names (For Display)
```typescript
const topicsWithThemes = await ExperienceTopic.find({ isActive: true })
  .populate('parentCategory', 'name')
  .sort({ 'parentCategory.priority': 1, priority: 1 })
  .lean();
```

### Soft Delete All Topics for Theme
```typescript
await ExperienceTopic.updateMany(
  { parentCategory: themeId },
  { isActive: false }
);
```

## Error Handling

### Duplicate Name in Theme
```typescript
try {
  await ExperienceTopic.create({
    name: "Photography",
    parentCategory: themeId,
  });
} catch (error) {
  if (error.code === 11000) {
    return "Topic with this name already exists in this theme";
  }
}
```

### Invalid Parent Theme
```typescript
const themeExists = await ExperienceTheme.findById(themeId);
if (!themeExists) {
  throw new Error("Parent theme not found");
}

// Then create topic
```

### Topic Not Found
```typescript
const topic = await ExperienceTopic.findById(topicId);
if (!topic) {
  throw new Error("Topic not found");
}
```

## Security Considerations

1. **Authorization** - Only admins can create/update/delete topics
2. **Input Sanitization** - Sanitize name input
3. **Reference Validation** - Validate parentCategory exists before creation
4. **Orphan Prevention** - Prevent creating topics for deleted themes

## Testing

- **Unit Tests:** `tests/unit/experience-topic.service.test.ts`
- **Integration Tests:** `tests/integration/experience-topic.routes.test.ts`
- **Test Fixtures:** `tests/fixtures/experience-topic.fixture.ts`

## Admin UI Considerations

### List View
- Group topics by theme
- Show name, theme, priority, status
- Allow sorting within theme
- Quick toggle for isActive
- Drag-and-drop reordering

### Edit Form
- Name (required)
- Parent theme dropdown (required)
- Priority input
- Active toggle
- Show experience count (read-only)

### Creation Flow
1. Select theme first
2. Enter topic name (check for duplicates)
3. Set priority (suggest next available)
4. Save

## Future Enhancements

1. Multi-language support for topic names
2. Topic descriptions
3. Topic icons/images
4. Topic aliases/synonyms for search
5. Auto-suggest topics based on experience content
6. Topic popularity tracking
7. Trending topics widget
8. Topic merge functionality
9. Hierarchical topics (topics can have sub-topics)
10. Topic recommendations based on learner interests
