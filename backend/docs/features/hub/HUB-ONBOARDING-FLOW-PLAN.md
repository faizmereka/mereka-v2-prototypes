# 🏢 Hub Onboarding Flow - Complete Plan

## 📍 Current Situation

**After Payment** → User redirected to: `https://app.mereka.dev/hub-onboard/profile`

**What We Have**:

- ✅ Payment/Subscription flow complete
- ✅ Basic hub profile API (form page only - `/hub-onboard/form`)
- ✅ Slug management system
- ❌ Missing: Complete onboarding flow APIs

---

## 🔄 Complete Onboarding Flow

```
User lands on: /hub-onboard/form
       ↓
┌─────────────────────────────────────┐
│  STEP 0: Initial Form (/form)      │
│  • Agency name, logo, slug          │
│  • Phone number                      │
│  • Location (city, country)          │
│  API: POST /hub-profile             │
└─────────────────────────────────────┘
       ↓
User selects pricing plan
       ↓
User completes payment (Stripe)
       ↓
Stripe webhook creates subscription
       ↓
Frontend redirects to: /hub-onboard/profile
       ↓
┌─────────────────────────────────────┐
│  STEP 1: Profile (/profile)        │
│  • Agency name, logo, slug          │
│  • Phone number                      │
│  • Social links                      │
│  • Location (city, state, country)   │
└─────────────────────────────────────┘
       ↓
┌─────────────────────────────────────┐
│  STEP 2: Details (/details)        │
│  • Full address                      │
│  • Operating hours                   │
│  • Intro video                       │
│  • Gallery (3 images)                │
│  • Projects                          │
│  • Experiences                       │
│  • Qualifications                    │
└─────────────────────────────────────┘
       ↓
┌─────────────────────────────────────┐
│  STEP 3: About (/about)            │
│  • Title                             │
│  • Description (max 500 chars)       │
│  • Amenities                         │
│  • Facilities                        │
│  • Focus areas                       │
│  • Tags                              │
│  • Company type                      │
│  • Job preferences                   │
└─────────────────────────────────────┘
       ↓
┌─────────────────────────────────────┐
│  STEP 4: Confirm (/confirm)        │
│  • Review all data                   │
│  • Submit for approval               │
└─────────────────────────────────────┘
       ↓
Hub status changes: DRAFT → PENDING_REVIEW
       ↓
Redirect to: /hub/{expertUid}/dashboard
```

---

## 📊 Complete Flow Breakdown

### Step 0: Initial Hub Form (`/hub-onboard/form`)

**Purpose**: Capture basic info BEFORE payment

- User fills: Name, Logo, Slug, Phone, Location
- **APIs Used**:
  - `POST /hub-profile` - Create initial hub (status: draft)
  - `GET /slug/check/:slug` - Check slug availability
  - `PATCH /hub-profile` - Update if needed

### Step 1-4: Post-Payment Onboarding (`/hub-onboard/profile → /details → /about → /confirm`)

**Purpose**: Complete profile AFTER payment

- Multi-step detailed onboarding
- **APIs Needed**: Same PATCH endpoint + new publish/progress endpoints

---

## 📊 Current vs. Needed APIs

### ✅ **What We Already Have**

| Endpoint                | Purpose             | Used In             | Status  |
| ----------------------- | ------------------- | ------------------- | ------- |
| `POST /hub-profile`     | Create initial hub  | `/hub-onboard/form` | ✅ Done |
| `PATCH /hub-profile`    | Update hub (upsert) | `/hub-onboard/form` | ✅ Done |
| `GET /hub-profile/me`   | Get my hub          | Both flows          | ✅ Done |
| `GET /slug/check/:slug` | Check slug          | `/hub-onboard/form` | ✅ Done |

**These APIs work for BOTH flows!** ✅

---

## 🎯 **APIs We Need to Create**

### Option A: Reuse Existing APIs (Recommended ✅)

**Use the same PATCH endpoint** for ALL steps:

```typescript
PATCH / api / v1 / hub - profile;
```

**Why this works:**

- Already has upsert capability
- Can accept partial updates
- Frontend can send only changed fields for each step

**Example Usage:**

```typescript
// Step 1: Profile
PATCH /api/v1/hub-profile
{
  "agencyName": "Makers Lab",
  "slug": "makers-lab",
  "agencyLogo": "https://...",
  "phoneNumber": "+60123456789",
  "webUrl": "https://makerslab.com",
  "linkedinUrl": "https://...",
  "location": { city, state, country, lat, lng }
}

// Step 2: Details
PATCH /api/v1/hub-profile
{
  "location": {
    "streetAddress": "123 Main St",
    "postcode": "50000"
  },
  "operatingHours": { monday: {...}, tuesday: {...} },
  "introVideo": "https://youtube.com/...",
  "gallery": ["img1", "img2", "img3"],
  "projects": [...],
  "experiences": [...],
  "qualifications": [...]
}

// Step 3: About
PATCH /api/v1/hub-profile
{
  "title": "Creative Workspace",
  "agencyDescription": "We help makers...",
  "amenities": ["WiFi", "3D Printer"],
  "facilities": ["Meeting Room", "Cafe"],
  "tags": ["Coworking", "Workshop"],
  "focusAreas": "Technology, Design",
  "companyType": "Coworking Space",
  "jobPreference": ["Full-time", "Part-time"]
}

// Step 4: Confirm
POST /api/v1/hub-profile/publish
```

---

## 🔗 **Linking Subscription to Hub**

**CRITICAL**: After payment, we need to link the subscription to the hub!

### Option 1: Via Webhook Metadata (Recommended ✅)

When creating checkout session in Step 0, pass `hubId` in metadata:

```typescript
// In create-checkout-session
{
  metadata: {
    userId: "...",
    planCode: "scale",
    region: "malaysia",
    hubId: "..." // ← Add this!
  }
}
```

**Webhook updates Hub**:

```typescript
// In handleSubscriptionCreated
const { userId, hubId } = subscription.metadata;

if (hubId) {
  await Hub.findByIdAndUpdate(hubId, {
    subscriptionId: subscription._id,
  });
}
```

### Option 2: After Payment Redirect

Frontend calls API after payment redirect:

```typescript
// After redirecting to /hub-onboard/profile
PATCH / hub - profile;
{
  subscriptionId: '...'; // From URL params or state
}
```

**Recommendation**: Use **Option 1** (webhook metadata) - automatic and reliable!

---

## 🆕 **New APIs to Add**

### 1. POST /api/v1/hub-profile/publish

**Purpose**: Submit hub for approval after completing all steps

**Request**: No body (just marks hub as complete)

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

**Backend Logic**:

1. Get user's active subscription
2. **Validate based on plan** (Scale vs Soar)
3. Check all required fields are filled
4. Change status: `draft` → `pending_review`
5. Set `isCompleted: true`
6. Set `onboardingStep: 4`

---

### 2. GET /api/v1/hub-profile/progress

**Purpose**: Get onboarding progress (which steps are complete)

**Response**:

```json
{
  "success": true,
  "data": {
    "currentStep": 2,
    "stepsCompleted": {
      "profile": true,
      "details": true,
      "about": false,
      "confirm": false
    },
    "completionPercentage": 50,
    "missingFields": ["title", "agencyDescription", "focusAreas"]
  }
}
```

**Backend Logic**:

- Check which fields are filled
- Calculate completion percentage
- Return list of missing required fields

---

## 📝 **Hub & User Models** ✅ **COMPLETE!**

### Models Already Have All Required Fields!

**Hub Model** (`src/models/Hub.ts`) has:

- ✅ `subscriptionId` - Link to active subscription
- ✅ `socialLinks` - website, facebook, linkedin, instagram, twitter, email
- ✅ `operatingHours` - Full week structure
- ✅ `introVideo`, `gallery` - Media fields
- ✅ `companyType`, `focusAreas` - About fields
- ✅ `onboardingStep` - Progress tracking (1-4)
- ✅ `status` - HubStatus enum (draft, pending_review, active, etc.)

**User Model** (`src/models/User.ts`) has:

- ✅ `professionalTitle` - Expert profile (Scale only)
- ✅ `introVideo` - Expert intro video
- ✅ `portfolio` - Projects array (Scale only)
- ✅ `employment` - Work experiences array (Scale only)
- ✅ `education` - Qualifications array (Scale only)
- ✅ `jobPreferences` - Job preferences array (Scale only)
- ✅ `skills`, `expertise`, `languages` - Additional expert fields

**No model changes needed!** 🎉

### Plan Feature Matrix

| Field               | Scale ($99) | Soar ($199) |
| ------------------- | ----------- | ----------- |
| Basic Profile       | ✅          | ✅          |
| Social Links        | ✅          | ✅          |
| Location            | ✅          | ✅          |
| Operating Hours     | ✅          | ✅          |
| Intro Video         | ✅          | ✅          |
| Gallery             | ✅          | ✅          |
| Projects            | ✅          | ✅          |
| **Title**           | ✅          | ❌          |
| **Job Preferences** | ✅          | ❌          |
| **Experiences**     | ✅          | ❌          |
| **Qualifications**  | ✅          | ❌          |

**From docs**: Soar plan skips Title, Job Preferences, Experiences, and Qualifications

---

## 🔄 **Recommended Implementation Approach**

### Phase 1: Update Validation & Services ✅

1. ~~**Update Hub Model**~~ - ✅ Already complete!
2. **Update Schema Validation** - Verify all fields are in validation schemas
3. **Implement Plan-Based Logic** - Check user's plan before validation
4. ~~**Extend PATCH endpoint**~~ - Already supports all fields via partial updates
5. **Add Publish endpoint** - `POST /hub-profile/publish` with plan-based validation
6. **Add Progress endpoint** - `GET /hub-profile/progress` (plan-aware)

### Plan-Based Validation Logic

```typescript
// In hub-profile.service.ts
async validateForPublish(hubId: string, userId: string) {
  // 1. Get hub
  const hub = await Hub.findById(hubId);

  // 2. Get user's active subscription
  const subscription = await Subscription.findOne({
    userId,
    status: 'active'
  }).populate('subscriptionId');

  const planCode = subscription.planCode; // 'scale' or 'soar'

  // 3. Validate based on plan
  const missingFields = [];

  // Common required fields (both plans)
  if (!hub.name) missingFields.push('name');
  if (!hub.description) missingFields.push('description');
  if (!hub.location?.city) missingFields.push('location.city');
  if (!hub.focusAreas) missingFields.push('focusAreas');

  // Scale-specific required fields
  if (planCode === 'scale') {
    if (!hub.title) missingFields.push('title');
    if (!hub.jobPreference?.length) missingFields.push('jobPreference');
    // experiences and qualifications can be optional even for Scale
  }

  // Soar plan: Skip title, jobPreference, experiences, qualifications

  return {
    valid: missingFields.length === 0,
    missingFields,
    planCode
  };
}
```

### Progress Endpoint (Plan-Aware)

```typescript
// GET /hub-profile/progress
async getProgress(userId: string) {
  const hub = await Hub.findOne({ ownerId: userId });
  const subscription = await Subscription.findOne({
    userId,
    status: 'active'
  });

  const planCode = subscription?.planCode || 'soar';

  // Calculate based on plan
  const stepsCompleted = {
    profile: !!(hub.name && hub.logo && hub.slug),
    details: !!(hub.operatingHours && hub.introVideo),
    about: planCode === 'scale'
      ? !!(hub.title && hub.description && hub.focusAreas && hub.jobPreference)
      : !!(hub.description && hub.focusAreas),
    confirm: false
  };

  return {
    currentStep: hub.onboardingStep || 1,
    stepsCompleted,
    planCode,
    planName: subscription?.planCode === 'scale' ? 'Scale' : 'Soar',
    completionPercentage: calculatePercentage(stepsCompleted)
  };
}
```

### Phase 2: Frontend Integration

**Use existing service pattern:**

```typescript
// In HubOnboardFormService
async saveStep(stepData: Partial<iAgency>) {
  // Call PATCH /api/v1/hub-profile
  await this.http.patch('/api/v1/hub-profile', stepData);
}

async publishHub() {
  // Call POST /api/v1/hub-profile/publish
  await this.http.post('/api/v1/hub-profile/publish');
}

async getProgress() {
  // Call GET /api/v1/hub-profile/progress
  return await this.http.get('/api/v1/hub-profile/progress');
}
```

---

## 🎯 **Data Flow Example**

```
Frontend: User on Step 1 (/hub-onboard/profile)
↓
Frontend: User fills profile form
↓
Frontend: Clicks "Next"
↓
Frontend: PATCH /api/v1/hub-profile { agencyName, slug, logo, ... }
↓
Backend: Updates Hub document (upsert if needed)
Backend: Sets onboardingStep = 1
↓
Frontend: Navigates to Step 2 (/hub-onboard/details)
↓
Frontend: User fills details form
↓
Frontend: Clicks "Next"
↓
Frontend: PATCH /api/v1/hub-profile { location, operatingHours, ... }
↓
Backend: Updates Hub document
Backend: Sets onboardingStep = 2
↓
... continues for Steps 3 & 4 ...
↓
Frontend: Step 4 - User reviews & clicks "Submit"
↓
Frontend: POST /api/v1/hub-profile/publish
↓
Backend: Validates all required fields
Backend: Changes status to "pending_review"
Backend: Sets isCompleted = true
↓
Frontend: Redirects to /hub/{expertUid}/dashboard
```

---

## 🚀 **Next Steps**

1. ✅ **Review current Hub model** - Check what fields exist
2. ✅ **Add missing fields** to Hub model
3. ✅ **Update validation schemas** for new fields
4. ✅ **Create publish endpoint** - `POST /hub-profile/publish`
5. ✅ **Create progress endpoint** - `GET /hub-profile/progress`
6. ✅ **Test with frontend** - Use existing forms
7. ✅ **Update documentation**

---

## 💡 **Key Design Decisions**

### 1. **Why reuse PATCH endpoint?**

- Already handles upsert
- Supports partial updates
- Reduces code duplication
- Frontend can save progress at each step

### 2. **Nested Resources (Projects, Experiences, Qualifications)**

**Option A**: Embed in Hub document (Simpler)

```typescript
hub.projects = [{ title, description, images }];
```

**Option B**: Separate collections (Scalable)

```typescript
HubProject { hubId, title, description, images }
```

**Recommendation**: Start with **Option A** (embedded), move to Option B if needed later.

### 3. **Validation Strategy**

- **Draft state**: Minimal validation (allow partial data)
- **Publish**: Strict validation (require all fields)
- **Progress tracking**: Check field completeness

---

## 📖 **Summary**

**Complete User Journey**:

1. ✅ **Hub Form** (`/hub-onboard/form`) - Basic info → Create hub draft
2. ✅ **Pricing** - Select plan (Scale/Soar)
3. ✅ **Payment** - Stripe checkout → Subscription created
4. ❌ **Multi-step Onboarding** - Complete profile (NEEDS APIs)
   - Step 1: Profile (social links, location details)
   - Step 2: Details (hours, video, gallery, projects)
   - Step 3: About (description, amenities, tags)
   - Step 4: Confirm (submit for review)

**Current State**:

- ✅ Payment flow complete
- ✅ Basic hub profile API exists (for Step 0)
- ✅ Existing PATCH endpoint can handle Steps 1-3
- ❌ Missing: Publish & Progress endpoints (for Step 4)

**What We'll Build**:

1. Extend Hub model with new fields (social links, hours, gallery, etc.)
2. Add `POST /hub-profile/publish` endpoint (Step 4 submit)
3. Add `GET /hub-profile/progress` endpoint (track completion)
4. Update validation schemas for new fields
5. Existing PATCH `/hub-profile` already works for Steps 1-3! ✅

**Effort**: ~2-3 hours (mostly model updates and validation)

**Complexity**: Low (reusing existing patterns)

---

**Key Insight**: The existing APIs already support most of what we need! We just need to:

- Add missing fields to Hub model
- Create 2 new endpoints (publish & progress)
- Update schemas

**Ready to start implementation?** 🚀
