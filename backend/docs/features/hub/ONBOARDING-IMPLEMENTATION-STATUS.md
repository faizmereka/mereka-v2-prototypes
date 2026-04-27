# Hub Onboarding Implementation Status

## ✅ What We Have

### 1. Complete Data Models

**Hub Model** (`src/models/Hub.ts`):

- ✅ All basic fields: `name`, `slug`, `logo`, `phoneNumber`, `coverImage`
- ✅ Description fields: `description`, `companyType`
- ✅ Media: `introVideo`, `gallery`, `autoPopulateImages`
- ✅ Location: `address`, `city`, `state`, `country`, `postcode`, `lat`, `lng`
- ✅ `operatingHours` - Full week structure with open/close/isClosed
- ✅ `socialLinks` - website, facebook, linkedin, instagram, twitter, email
- ✅ Arrays: `amenities`, `facilities`, `tags`, `focusAreas`, `services`
- ✅ Subscription: `subscriptionId`, `status`, `onboardingStep`
- ✅ Ownership: `ownerId`, `createdBy`, `lastUpdatedBy`

**User Model** (`src/models/User.ts`):

- ✅ Basic profile: `name`, `email`, `phoneNumber`, `bio`, `profilePhoto`, `coverPhoto`
- ✅ Location: `location.city`, `location.country`, `location.lat`, `location.lng`
- ✅ Social: `socialLinks` (website, facebook, instagram, twitter, linkedin)
- ✅ **Expert fields (Scale plan)**:
  - `professionalTitle` - "Senior Product Designer"
  - `introVideo` - Expert intro video URL
  - `skills` - ["UI Design", "UX Research"]
  - `expertise` - { category, subcategories }
  - `languages` - [{ language, proficiency }]
  - `portfolio` - Projects (title, description, images, skills, year)
  - `employment` - Work experiences (title, company, duration, description)
  - `education` - Qualifications (degree, institution, year)
  - `hourlyRate` - For job marketplace
  - `jobPreferences` - ["Full-time", "Part-time"]

### 2. Existing APIs

- ✅ `POST /api/v1/hub-profile` - Create hub profile (initial form)
- ✅ `PATCH /api/v1/hub-profile` - Update hub profile (supports partial updates)
- ✅ `GET /api/v1/hub-profile` - Get user's hub profile

### 3. Subscription Integration

- ✅ Checkout session creation with metadata
- ✅ Webhook handling (`customer.subscription.created`, `customer.subscription.updated`)
- ✅ Subscription service and models

---

## 🚧 What We Need to Add

### 1. **Extend Validation Schemas** (`src/schemas/hub-profile.schema.ts`)

Current schema only has:

- `agencyName`, `slug`, `agencyLogo`, `phoneNumber`, `location` (basic fields)

**Need to add** (all optional for PATCH):

```typescript
// Hub fields
description: z.string().max(1000).optional(),
companyType: z.string().optional(),
coverImage: z.string().url().optional(),

// Media
introVideo: z.string().url().optional(),
gallery: z.array(z.string().url()).optional(),
autoPopulateImages: z.boolean().optional(),

// Operating Hours
operatingHours: z.object({
  monday: z.object({
    open: z.string().regex(/^\d{2}:\d{2}$/),
    close: z.string().regex(/^\d{2}:\d{2}$/),
    isClosed: z.boolean().optional()
  }).optional(),
  // ... repeat for other days
}).optional(),

// Social Links
socialLinks: z.object({
  website: z.string().url().optional(),
  facebook: z.string().url().optional(),
  linkedin: z.string().url().optional(),
  instagram: z.string().url().optional(),
  twitter: z.string().url().optional(),
  email: z.string().email().optional()
}).optional(),

// Arrays
amenities: z.array(z.string()).optional(),
facilities: z.array(z.string()).optional(),
tags: z.array(z.string()).optional(),
focusAreas: z.array(z.string()).optional(),
services: z.array(z.string()).optional(),

// User fields (for PATCH /hub-profile that updates both Hub and User)
professionalTitle: z.string().optional(),  // Scale only
userIntroVideo: z.string().url().optional(),  // Scale only
skills: z.array(z.string()).optional(),
jobPreferences: z.array(z.string()).optional(),  // Scale only

portfolio: z.array(z.object({
  title: z.string(),
  description: z.string().optional(),
  images: z.array(z.string().url()).optional(),
  skills: z.array(z.string()).optional(),
  year: z.string().optional()
})).optional(),

employment: z.array(z.object({  // Scale only
  title: z.string(),
  company: z.string(),
  duration: z.string().optional(),
  description: z.string().optional()
})).optional(),

education: z.array(z.object({  // Scale only
  degree: z.string(),
  institution: z.string(),
  year: z.string()
})).optional(),
```

### 2. **New API Endpoints**

#### A. `POST /api/v1/hub-profile/publish`

**Purpose**: Submit hub for approval after completing all onboarding steps

**Logic**:

1. Get user's active subscription → determine `planCode` (scale/soar)
2. Get user's hub profile
3. **Validate based on plan**:
   - **Common required fields** (both plans):
     - Hub: `name`, `description`, `location.city`, `focusAreas`
     - User: basic profile
   - **Scale-specific required fields**:
     - User: `professionalTitle`, `jobPreferences`, `employment`, `education`
4. If validation passes → Update `hub.status = 'pending_review'`
5. Return success/error with list of missing fields

**Response**:

```json
{
  "success": true,
  "data": {
    "hubId": "...",
    "status": "pending_review",
    "planCode": "scale",
    "message": "Hub submitted for review"
  }
}
```

**Or if incomplete**:

```json
{
  "success": false,
  "error": {
    "message": "Required fields missing",
    "missingFields": ["professionalTitle", "jobPreferences"],
    "planCode": "scale"
  }
}
```

#### B. `GET /api/v1/hub-profile/progress`

**Purpose**: Get onboarding progress and completion status

**Response**:

```json
{
  "success": true,
  "data": {
    "currentStep": 2,
    "totalSteps": 4,
    "completionPercentage": 60,
    "planCode": "scale",
    "status": "draft",
    "missingFields": {
      "step1": [],
      "step2": ["professionalTitle", "introVideo"],
      "step3": ["focusAreas"],
      "step4": []
    },
    "canPublish": false
  }
}
```

### 3. **Update Services**

#### `src/services/hub-profile.service.ts`

**Add methods**:

```typescript
async publishHub(userId: string): Promise<{
  success: boolean;
  hubId?: string;
  status?: string;
  planCode?: string;
  message?: string;
  missingFields?: string[];
}>

async getOnboardingProgress(userId: string): Promise<{
  currentStep: number;
  totalSteps: number;
  completionPercentage: number;
  planCode: string;
  status: string;
  missingFields: Record<string, string[]>;
  canPublish: boolean;
}>

// Helper method
private async validateForPublish(
  hub: IHub,
  user: IUser,
  planCode: 'scale' | 'soar'
): Promise<{
  valid: boolean;
  missingFields: string[];
}>
```

**Plan-Based Validation Logic**:

```typescript
private async validateForPublish(hub, user, planCode) {
  const missingFields: string[] = [];

  // Common required fields (both plans)
  if (!hub.name) missingFields.push('hub.name');
  if (!hub.description) missingFields.push('hub.description');
  if (!hub.location?.city) missingFields.push('hub.location.city');
  if (!hub.focusAreas?.length) missingFields.push('hub.focusAreas');

  // Scale-specific required fields
  if (planCode === 'scale') {
    if (!user.professionalTitle) missingFields.push('user.professionalTitle');
    if (!user.jobPreferences?.length) missingFields.push('user.jobPreferences');
    // Note: employment and education can be optional even for Scale
  }

  return {
    valid: missingFields.length === 0,
    missingFields
  };
}
```

### 4. **Update Routes**

#### `src/routes/hub-profile.routes.ts`

Add routes:

```typescript
// Publish hub for approval
fastify.post(
  '/publish',
  {
    preHandler: [authenticateToken],
  },
  hubProfileController.publishHub,
);

// Get onboarding progress
fastify.get(
  '/progress',
  {
    preHandler: [authenticateToken],
  },
  hubProfileController.getOnboardingProgress,
);
```

### 5. **Update Controllers**

#### `src/controllers/hub-profile.controller.ts`

Add handlers:

```typescript
export async function publishHub(request: FastifyRequest, reply: FastifyReply) {
  // Implementation
}

export async function getOnboardingProgress(request: FastifyRequest, reply: FastifyReply) {
  // Implementation
}
```

### 6. **Update Webhook to Link Subscription to Hub**

**Critical**: When creating checkout session, pass `hubId` in metadata:

```typescript
// In subscription.service.ts → createCheckoutSession
metadata: {
  userId: userId,
  planCode: planCode,
  region: region,
  hubId: hubId  // ← Add this!
}
```

**Then in webhook** (`subscription.service.ts → handleSubscriptionCreated`):

```typescript
const { userId, hubId, planCode } = subscription.metadata;

// Link subscription to hub
if (hubId) {
  await Hub.findByIdAndUpdate(hubId, {
    subscriptionId: newSubscription._id,
  });
}
```

---

## 📋 **Implementation Checklist**

### Step 1: Extend Validation Schemas

- [ ] Update `src/schemas/hub-profile.schema.ts`
  - [ ] Add all Hub fields (socialLinks, operatingHours, introVideo, gallery, etc.)
  - [ ] Add User fields (professionalTitle, portfolio, employment, education, etc.)
  - [ ] Keep all fields optional for PATCH endpoint

### Step 2: Implement New Endpoints

- [ ] Create `publishHub` controller
- [ ] Create `getOnboardingProgress` controller
- [ ] Add routes in `hub-profile.routes.ts`

### Step 3: Extend Service Layer

- [ ] Add `publishHub` method to `hub-profile.service.ts`
- [ ] Add `getOnboardingProgress` method
- [ ] Implement plan-based validation logic

### Step 4: Update Webhook Integration

- [ ] Modify checkout session creation to include `hubId` in metadata
- [ ] Update webhook handler to link `subscriptionId` to `Hub`

### Step 5: Testing

- [ ] Test Step 1: Profile page (socialLinks, operatingHours)
- [ ] Test Step 2: Details page (introVideo, gallery, projects, experiences, qualifications)
- [ ] Test Step 3: About page (focusAreas, companyType, amenities, facilities)
- [ ] Test Step 4: Confirm & Publish
- [ ] Test plan-based validation (Scale vs. Soar)
- [ ] Test progress endpoint

---

## 🎯 **Next Action**

Start with **Step 1**: Update validation schemas in `src/schemas/hub-profile.schema.ts` to include all Hub and User fields used in the onboarding flow.

This is the foundation - once schemas are updated, the existing `PATCH /hub-profile` endpoint will automatically support all new fields due to partial updates.
