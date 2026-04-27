# 🎯 Scale vs Soar Plans - Data Separation

**Key Understanding**: Expert onboarding + Scale hub onboarding are MERGED

---

## 📊 The Two Plans

### Scale Plan (Expert + Hub)

**Who**: Solo expert or small consultancy creating their hub
**What they create**:

1. **Expert Profile** (personal) → Stored in **User collection**
2. **Hub/Business** (organization) → Stored in **Hub collection**

**Onboarding collects BOTH:**

- Expert data (skills, portfolio, rates, experience)
- Hub data (business name, location, services)

### Soar Plan (Hub Only)

**Who**: Organization, makerspace, coworking space
**What they create**:

1. **Hub/Business** only → Stored in **Hub collection**

**Onboarding collects:**

- Hub data only (no expert profile)

---

## 🗂️ Data Separation Logic

### User Collection (Expert Profile Data)

**When**: Scale plan only
**Fields:**

```typescript
{
  // ... existing user fields

  // Expert Profile (Scale plan users)
  expertProfile: {
    title: string,  // "Senior Product Designer"
    skills: string[],  // ["UI Design", "UX Research"]
    portfolio: [{
      title, description, images, skills
    }],
    education: [],
    employment: [],
    hourlyRate: number,
    overview: string,
    video: string,  // Intro video
    status: string  // Expert approval status
  }
}
```

### Hub Collection (Business/Organization Data)

**When**: Both Scale AND Soar plans
**Fields:**

```typescript
{
  // Hub data (shared by both plans)
  name, slug, logo,
  location, operatingHours,
  description, amenities, facilities,
  gallery, introVideo,

  // Plan info
  planCode: 'scale' | 'soar',

  // Ownership
  ownerId: ObjectId  // User who created/owns this hub
}
```

---

## 🔄 Complete Flow

### Scale Plan User (Expert + Hub):

```
1. User signs up
   ↓
2. Selects "Scale" plan
   ↓
3. Onboarding collects:
   • Expert data → User.expertProfile
   • Hub data → Hub collection
   ↓
4. User is both:
   - An expert (has expertProfile in User)
   - Hub owner (owns a Hub)
   ↓
5. URLs:
   - Expert profile: mereka.io/@expert-slug
   - Hub profile: mereka.io/hub/hub-slug
```

### Soar Plan User (Hub Only):

```
1. User signs up
   ↓
2. Selects "Soar" plan
   ↓
3. Onboarding collects:
   • Hub data only → Hub collection
   ↓
4. User is:
   - Hub owner/admin only
   - NO expert profile
   ↓
5. URL:
   - Hub profile: mereka.io/hub/hub-slug
```

---

## 📋 Field Classification

### Hub Fields (Both Plans)

**Store in Hub collection:**

- name, slug, logo, phone
- location, operatingHours
- description, companyType
- introVideo, gallery
- amenities, facilities, tags
- focusAreas, services
- projects (portfolio)

### Expert Fields (Scale Only)

**Store in User.expertProfile:**

- title (e.g., "Senior Designer")
- skills array
- portfolio (personal work)
- education, employment
- hourlyRate (for jobs)
- overview (bio)
- video (personal intro)
- expertise categories

### Shared/Ambiguous Fields

**Need to decide:**

- **Projects** - Hub projects or expert portfolio?
  - Hub: Company portfolio
  - Expert: Personal work
  - **Decision**: Hub has projects, Expert has portfolio

- **Gallery** - Hub or expert photos?
  - Hub: Space/facility photos
  - Expert: Work samples in portfolio
  - **Decision**: Hub only

---

## 🎯 Recommended API Design

### Scale Plan Onboarding (Merged Flow)

```
POST /api/v1/onboarding/scale
Body: {
  // Expert data
  expertProfile: {
    title, skills, portfolio, hourlyRate, overview
  },

  // Hub data
  hub: {
    name, slug, logo, location, description, amenities
  }
}

Creates:
1. Updates User with expertProfile
2. Creates Hub with ownerId = userId
```

### Soar Plan Onboarding (Hub Only)

```
POST /api/v1/onboarding/soar
Body: {
  // Hub data only
  name, slug, logo, location, description, amenities
}

Creates:
1. Hub with ownerId = userId
2. NO expertProfile in User
```

---

## ✅ Clean Separation

| Data Type          | Scale Plan | Soar Plan |
| ------------------ | ---------- | --------- |
| User.expertProfile | ✅ Yes     | ❌ No     |
| Hub collection     | ✅ Yes     | ✅ Yes    |
| User is expert     | ✅ Yes     | ❌ No     |
| User owns hub      | ✅ Yes     | ✅ Yes    |

---

**This clarifies the merged onboarding confusion!**

Want me to design the clean API structure for Scale + Soar plans? 🚀
