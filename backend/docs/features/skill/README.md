# Skill Feature

## Overview

The Skill feature defines specific competencies and expertise within Focus Areas on the Mereka platform. Skills are the granular capabilities that experts possess and learners seek to develop. Each skill belongs to a parent Focus Area, creating a hierarchical taxonomy: FocusArea → Skills.

## Business Context

Skills are essential for:
- **Expert Profiling** - Detail what specific skills experts have
- **Learner Matching** - Connect learners with experts who have needed skills
- **Experience Tagging** - Tag experiences with relevant skills
- **Portfolio Building** - Showcase project skills
- **Search & Discovery** - Find experts and content by specific skills
- **Gap Analysis** - Identify skill gaps and learning opportunities
- **Skill-Based Filtering** - Filter content by required skills

Examples:
- **FocusArea: Tech & AI**
  - Skills: Python, Machine Learning, Web Development, Cloud Computing, Data Analysis
- **FocusArea: Design & Branding**
  - Skills: UI/UX Design, Graphic Design, Brand Strategy, Figma, Adobe Creative Suite
- **FocusArea: Career & Business**
  - Skills: Project Management, Business Strategy, Public Speaking, Negotiation

## Model Structure

**Location:** `src/models/Skill.ts`

### Core Fields

#### Basic Information
- `name` (required, indexed) - Skill name (e.g., "Python Programming")
- `focusAreaId` (required, indexed) - Reference to parent FocusArea (ObjectId)

#### Classification
- `type` (required, enum, indexed, default: "primary") - Skill type
  - `primary` - Core skill within the focus area
  - `additional` - Supporting or related skill

#### Status
- `isActive` (boolean, indexed, default: true) - Whether skill is visible and selectable

#### Metadata
- `priority` (number, default: 0) - Sort order within focus area (lower = higher priority)

#### Audit Fields
- `createdAt` - Auto-generated timestamp
- `updatedAt` - Auto-generated timestamp

## Enums

### SkillType
```typescript
enum SkillType {
  PRIMARY = 'primary',      // Core skill
  ADDITIONAL = 'additional'  // Supporting skill
}
```

## Indexes

### Single Field Indexes
- `name` (standard) - Quick name lookups
- `focusAreaId` (standard) - Find skills by focus area
- `type` (standard) - Filter by skill type
- `isActive` (standard) - Filter active skills

### Compound Indexes
- `{ focusAreaId: 1, isActive: 1, priority: 1 }` - Get active skills for focus area sorted by priority
- `{ name: 1, focusAreaId: 1 }` (unique) - Prevent duplicate skill names within same focus area

**Important:** Same skill name CAN exist in different focus areas (e.g., "Leadership" in both "Career & Business" and "Health & Wellness"), but NOT within the same focus area.

## Relationships

### Parent
- **FocusArea** - Skill belongs to one focus area via `focusAreaId`
  - Skill belongs to one focus area (required)
  - Focus area has many skills

### Referenced By
- **User/Expert** - Users reference skills via `skills` array
  - User can have multiple skills
  - Stored as: `skills: [ObjectId]`

- **Portfolio** - User portfolios reference skills
  - Project can showcase multiple skills
  - Stored as: `portfolio[].skills: [ObjectId]`

## API Endpoints

**Base Path:** `/api/v1/skills`

### GET /
**Get All Skills**
- **Auth:** None
- **Query:**
  - `includeInactive` (optional) - Include inactive skills (true/false)
- **Returns:** Array of all skills sorted by focus area and priority
- **Default:** Returns only active skills

### GET /:id
**Get Skill by ID**
- **Auth:** None
- **Params:** `id` - Skill ObjectId (must be valid 24-char hex)
- **Returns:** Single skill object

### GET /by-focus-area/:focusAreaId
**Get Skills by Focus Area** (Special Endpoint)
- **Auth:** None
- **Params:** `focusAreaId` - FocusArea ObjectId
- **Returns:** Array of skills for the specified focus area
- **Sorted By:** Priority, then name
- **Use Case:** Populate skill dropdown when user selects focus area

### POST /
**Create Skill**
- **Auth:** Required (Bearer token)
- **Body:**
  ```json
  {
    "name": "Python Programming",
    "focusAreaId": "64f5a8b9c12d3e4f5678abcd",
    "type": "primary",
    "priority": 10
  }
  ```
- **Validation:** Uses `createSkillSchema`
- **Returns:** Created skill object

### PATCH /:id
**Update Skill**
- **Auth:** Required (Bearer token)
- **Params:** `id` - Skill ObjectId
- **Body:** Partial skill object
  ```json
  {
    "priority": 5,
    "type": "additional"
  }
  ```
- **Validation:** Uses `updateSkillSchema`
- **Returns:** Updated skill object

### DELETE /:id
**Delete Skill (Soft Delete)**
- **Auth:** Required (Bearer token)
- **Params:** `id` - Skill ObjectId
- **Action:** Sets `isActive: false`
- **Returns:** Success message
- **Note:** Soft delete only, document preserved

## Business Logic

### Naming Convention
- Specific, clear skill names
- Title Case recommended
- 1-4 words typical
- Avoid abbreviations unless widely known (e.g., "UI/UX" is fine)
- Be specific: "Python Programming" not just "Python"

### Hierarchical Structure
- Skills MUST belong to a focus area (`focusAreaId` required)
- Cannot create "orphan" skills
- Consider moving skill if focus area deleted

### Uniqueness Rules
- Skill name must be unique WITHIN its focus area
- Same name CAN exist in different focus areas
- Example:
  - "Leadership" in "Career & Business" ✅
  - "Leadership" in "Health & Wellness" ✅
  - "Leadership" (duplicate) in "Career & Business" ❌

### Skill Types

#### Primary Skills
- Core competencies within the focus area
- Direct expertise
- Main skills users would search for
- Example: "Web Development" in Tech & AI

#### Additional Skills
- Supporting or related skills
- Cross-functional skills
- Emerging or niche skills
- Example: "Technical Writing" in Tech & AI

### Priority System
- Priority is scoped per focus area
- Lower numbers = displayed first
- Common skills get lower priority
- Niche skills get higher priority
- Default: 0

### Soft Delete
- Skills never hard-deleted
- `isActive: false` hides from selection
- Preserves data integrity:
  - User skills remain referenced
  - Portfolio skills remain
  - Historical data intact
- Can be re-activated

## Query Patterns

### Get Skills for Focus Area (Dropdown)
```typescript
const skills = await Skill.find({
  focusAreaId: focusAreaId,
  isActive: true,
})
  .sort({ priority: 1, name: 1 })
  .select('name type')
  .lean();
```

### Get User Skills (Populated)
```typescript
const user = await User.findById(userId)
  .populate({
    path: 'skills',
    select: 'name focusAreaId type',
    populate: {
      path: 'focusAreaId',
      select: 'name icon',
    },
  })
  .lean();
```

### Get Skills Grouped by Focus Area
```typescript
const skillsByFocusArea = await Skill.aggregate([
  { $match: { isActive: true } },
  {
    $lookup: {
      from: 'focusareas',
      localField: 'focusAreaId',
      foreignField: '_id',
      as: 'focusArea',
    },
  },
  { $unwind: '$focusArea' },
  {
    $group: {
      _id: '$focusArea._id',
      focusAreaName: { $first: '$focusArea.name' },
      skills: {
        $push: {
          id: '$_id',
          name: '$name',
          type: '$type',
          priority: '$priority',
        },
      },
    },
  },
  { $sort: { 'focusArea.priority': 1 } },
]);
```

### Check Duplicate in Focus Area
```typescript
const existingSkill = await Skill.findOne({
  name: skillName,
  focusAreaId: focusAreaId,
  _id: { $ne: currentSkillId }, // Exclude current when updating
});

if (existingSkill) {
  throw new Error('Skill with this name already exists in this focus area');
}
```

### Get Popular Skills
```typescript
const popularSkills = await Skill.aggregate([
  { $match: { isActive: true } },
  {
    $lookup: {
      from: 'users',
      localField: '_id',
      foreignField: 'skills',
      as: 'experts',
    },
  },
  {
    $project: {
      name: 1,
      focusAreaId: 1,
      expertCount: { $size: '$experts' },
    },
  },
  { $sort: { expertCount: -1 } },
  { $limit: 20 },
]);
```

## File References

- **Model:** `src/models/Skill.ts`
- **Schema:** `src/schemas/reference-data.schema.ts` (uses `createSkillSchema`)
- **Controller:** `src/controllers/skill.controller.ts`
- **Service:** `src/services/skill.service.ts`
- **Routes:** `src/routes/skill.routes.ts`

## Related Documentation

- [FocusArea](../focus-area/README.md) - Parent focus area
- [User](../user/README.md) - Users have skills
- [Reference Data](../reference-data/README.md) - Overview

## Migration Notes

### From Firebase
- Firebase collection: `skills` or nested under focus areas
- Check `focusAreaId` references are valid
- Standardize skill names (capitalization, pluralization)
- Set initial priorities
- Default all skills to `type: 'primary'` if no type exists

### Data Validation After Migration
- Ensure all skills have valid focusAreaId
- Check for orphaned skills (focusAreaId doesn't exist)
- Verify no duplicate names within same focus area
- Recalculate skill usage statistics

## Usage Examples

### Create Skill
```typescript
const skill = await Skill.create({
  name: "Machine Learning",
  focusAreaId: new Types.ObjectId(techFocusAreaId),
  type: SkillType.PRIMARY,
  isActive: true,
  priority: 5,
});
```

### Get Skills by Focus Area
```typescript
const skills = await Skill.find({
  focusAreaId: focusAreaId,
  isActive: true,
})
  .sort({ priority: 1, name: 1 })
  .lean();
```

### Add Skills to User Profile
```typescript
await User.findByIdAndUpdate(userId, {
  $addToSet: {
    skills: { $each: [skillId1, skillId2, skillId3] },
  },
});
```

### Move Skill to Different Focus Area
```typescript
await Skill.findByIdAndUpdate(skillId, {
  focusAreaId: newFocusAreaId,
});

// Note: Check for naming conflicts in new focus area first!
```

## Validation Rules

### Name
- Required
- Trimmed
- Must be unique within focus area
- Length: 2-100 characters

### FocusAreaId
- Required
- Must be valid ObjectId
- Must reference existing FocusArea

### Type
- Required
- Must be "primary" or "additional"
- Default: "primary"

### Priority
- Default: 0
- Any integer
- Scoped per focus area

### IsActive
- Boolean
- Default: true

## Performance Considerations

1. **Index on focusAreaId** - Fast queries by focus area
2. **Compound Index** - Efficient sorting within focus area
3. **Caching** - Cache skills by focus area (changes infrequently)
4. **Lean Queries** - Always use `.lean()` for reads
5. **Batch Queries** - Fetch all needed skills in one query

## Common Operations

### Bulk Create Skills for Focus Area
```typescript
const techSkills = [
  { name: "Python", focusAreaId: techId, priority: 1 },
  { name: "JavaScript", focusAreaId: techId, priority: 2 },
  { name: "React", focusAreaId: techId, priority: 3 },
];

await Skill.insertMany(techSkills);
```

### Reorder Skills within Focus Area
```typescript
const updates = [
  { id: 'skill1', priority: 1 },
  { id: 'skill2', priority: 2 },
];

for (const update of updates) {
  await Skill.findByIdAndUpdate(update.id, { priority: update.priority });
}
```

### Bulk Deactivate Skills for Focus Area
```typescript
await Skill.updateMany(
  { focusAreaId: focusAreaId },
  { isActive: false }
);
```

## Error Handling

### Duplicate Name in Focus Area
```typescript
try {
  await Skill.create({
    name: "Python",
    focusAreaId: techId,
  });
} catch (error) {
  if (error.code === 11000) {
    return "Skill already exists in this focus area";
  }
}
```

### Invalid Focus Area
```typescript
const focusAreaExists = await FocusArea.findById(focusAreaId);
if (!focusAreaExists) {
  throw new Error("Focus area not found");
}

// Then create skill
```

## Security Considerations

1. **Authorization** - POST/PATCH/DELETE require auth
2. **Reference Validation** - Validate focusAreaId exists
3. **Input Sanitization** - Sanitize name input
4. **Orphan Prevention** - Prevent skills without valid focus area

## Testing

- **Unit Tests:** `tests/unit/skill.service.test.ts`
- **Integration Tests:** `tests/integration/skills.routes.test.ts`
- **Test Fixtures:** `tests/fixtures/skill.fixture.ts`

### Test Cases
- Create skill with valid focus area
- Reject skill without focus area
- Prevent duplicate name in same focus area
- Allow same name in different focus areas
- Get skills by focus area
- Update skill type
- Soft delete skill

## Typical Skills by Focus Area

### Tech & AI
- Python, JavaScript, React, Node.js
- Machine Learning, Data Science, AI
- Cloud Computing, AWS, Azure
- Web Development, Mobile Development
- DevOps, Docker, Kubernetes

### Design & Branding
- UI/UX Design, User Research
- Figma, Adobe XD, Sketch
- Graphic Design, Illustration
- Brand Strategy, Brand Identity
- Typography, Color Theory

### Career & Business
- Project Management, Agile, Scrum
- Business Strategy, Business Development
- Public Speaking, Presentation Skills
- Leadership, Team Management
- Negotiation, Sales

## Admin UI Considerations

### List View
- Group by focus area
- Show skill name, type (badge), priority, status
- Filter by focus area
- Search across all skills
- Bulk actions (activate/deactivate, change type)

### Edit Form
- Name (required, check duplicates in focus area)
- Focus area dropdown (required)
- Type selector (Primary/Additional)
- Priority input
- Active toggle
- Show expert count using this skill (read-only)

### Creation Flow
1. Select focus area first
2. Enter skill name (check for duplicates in that focus area)
3. Select type (primary/additional)
4. Set priority
5. Save

## Future Enhancements

1. Skill descriptions
2. Skill prerequisites (skill chains)
3. Skill proficiency levels (beginner/intermediate/expert)
4. Skill certifications/badges
5. Skill learning paths
6. Skill demand analytics
7. Skill recommendations based on user interests
8. Cross-focus-area skills (skill belongs to multiple focus areas)
9. Skill synonyms/aliases for search
10. Trending skills
11. Skill endorsements
12. Skill assessments/tests
