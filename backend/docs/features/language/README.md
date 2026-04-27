# Language Feature

## Overview

The Language feature defines spoken languages that experts can communicate in on the Mereka platform. Languages help learners find experts who can teach or communicate in their preferred language, ensuring effective learning experiences.

## Business Context

Languages are essential for:
- **Expert Profiling** - Indicate which languages experts can teach/speak in
- **Learner Matching** - Connect learners with experts speaking their language
- **Experience Filtering** - Filter experiences by instruction language
- **Accessibility** - Make platform inclusive for non-English speakers
- **International Expansion** - Support for global user base
- **Communication** - Ensure effective teaching and learning

Examples: English, Mandarin Chinese, Malay, Hindi, Tamil, Spanish, French, Arabic, Japanese, Korean

## Model Structure

**Location:** `src/models/Language.ts`

### Core Fields

#### Basic Information
- `name` (required, unique, indexed) - Language name (e.g., "English", "Mandarin Chinese")
- `code` (optional) - ISO 639-1 language code (e.g., "EN", "ZH", "MS")
  - Stored in UPPERCASE
  - 2-character standard codes
  - Used for programmatic language handling

#### Status
- `isActive` (boolean, indexed, default: true) - Whether language is visible and selectable

#### Metadata
- `priority` (number, default: 0) - Sort order (lower = higher priority)

#### Audit Fields
- `createdAt` - Auto-generated timestamp
- `updatedAt` - Auto-generated timestamp

## Indexes

### Single Field Indexes
- `name` (unique) - Ensure unique language names
- `isActive` (standard) - Filter active languages

### Compound Indexes
- `{ isActive: 1, priority: 1 }` - Get active languages sorted by priority

## Relationships

### Referenced By
- **User/Expert** - Users reference languages via `languages` array
  - User can speak multiple languages
  - Stored as: `languages: [{ languageId: ObjectId, proficiency: string }]`

- **Experience** - Experiences have primary and secondary languages
  - `primaryLanguage` - Main instruction language (string, not ID)
  - `secondaryLanguage` - Additional languages (array of strings)

## API Endpoints

**Base Path:** `/api/v1/languages`

### GET /
**Get All Languages**
- **Auth:** None
- **Query:** `includeInactive` (optional) - Include inactive languages
- **Returns:** Array of languages sorted by priority

### GET /:id
**Get Language by ID**
- **Auth:** None
- **Params:** `id` - Language ObjectId
- **Returns:** Single language object

### POST /
**Create Language**
- **Auth:** Required
- **Body:**
  ```json
  {
    "name": "Mandarin Chinese",
    "code": "ZH",
    "priority": 2
  }
  ```
- **Returns:** Created language object

### PATCH /:id
**Update Language**
- **Auth:** Required
- **Params:** `id` - Language ObjectId
- **Body:** Partial language object
- **Returns:** Updated language object

### DELETE /:id
**Delete Language (Soft Delete)**
- **Auth:** Required
- **Params:** `id` - Language ObjectId
- **Action:** Sets `isActive: false`
- **Returns:** Success message

## Business Logic

### Naming Convention
- Official language name in English
- Use common English names (e.g., "Mandarin Chinese" not "普通话")
- Include dialect if relevant (e.g., "Mandarin Chinese" vs "Cantonese")

### ISO Language Codes
- Use ISO 639-1 (2-letter codes) when possible
- Stored in UPPERCASE automatically
- Reference: https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes
- Examples:
  - EN - English
  - ZH - Chinese
  - MS - Malay
  - HI - Hindi
  - TA - Tamil
  - ES - Spanish
  - FR - French
  - AR - Arabic
  - JA - Japanese
  - KO - Korean

### Priority System
- Lower numbers = higher priority
- Order by platform user base:
  - English: 1
  - Mandarin: 2
  - Malay: 3
  - etc.

## Query Patterns

### Get Active Languages for Dropdown
```typescript
const languages = await Language.find({ isActive: true })
  .sort({ priority: 1, name: 1 })
  .select('name code')
  .lean();
```

### Get User Languages (Populated)
```typescript
const user = await User.findById(userId)
  .populate('languages.languageId', 'name code')
  .lean();
```

### Find Language by Code
```typescript
const language = await Language.findOne({
  code: 'EN',
  isActive: true,
}).lean();
```

## File References

- **Model:** `src/models/Language.ts`
- **Schema:** `src/schemas/reference-data.schema.ts`
- **Controller:** `src/controllers/language.controller.ts`
- **Service:** `src/services/language.service.ts`
- **Routes:** `src/routes/language.routes.ts`

## Related Documentation

- [User](../user/README.md) - Users have language proficiencies
- [Experience](../experience/README.md) - Experiences have instruction languages

## Usage Examples

### Create Language
```typescript
const language = await Language.create({
  name: "Mandarin Chinese",
  code: "ZH",
  isActive: true,
  priority: 2,
});
```

### Add Language to User Profile
```typescript
await User.findByIdAndUpdate(userId, {
  $push: {
    languages: {
      languageId: languageId,
      proficiency: "Native",
    },
  },
});
```

## Validation Rules

### Name
- Required, unique, trimmed
- Length: 2-50 characters

### Code
- Optional, trimmed, uppercase
- Length: 2 characters (ISO 639-1)
- Examples: EN, ZH, MS, HI

### Priority
- Default: 0
- Any integer

## Common Languages

### Asia-Pacific
- English (EN)
- Mandarin Chinese (ZH)
- Malay (MS)
- Hindi (HI)
- Tamil (TA)
- Indonesian (ID)
- Thai (TH)
- Vietnamese (VI)
- Japanese (JA)
- Korean (KO)
- Filipino (TL)

### Europe
- Spanish (ES)
- French (FR)
- German (DE)
- Italian (IT)
- Portuguese (PT)

### Middle East
- Arabic (AR)
- Hebrew (HE)
- Persian (FA)

## Proficiency Levels (In User Model)

When users specify language proficiency:
- **Native** - First language
- **Fluent** - Professional fluency
- **Conversational** - Basic communication
- **Basic** - Elementary knowledge

## Future Enhancements

1. Language proficiency testing
2. Language-specific content
3. Auto-translate features
4. Language learning paths
5. Multi-language UI support
6. Language pair matchmaking (teacher-student)
7. Regional dialect support
8. Sign language support
