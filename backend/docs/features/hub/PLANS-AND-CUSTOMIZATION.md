# 🎨 Hub Plans & Form Customization

**Based on**: mereka-web hub-onboard analysis

---

## 📋 Hub Plans

### Plan Codes Found:

1. **starter** - Full onboarding flow
2. **scale** - (Plan with customizations)
3. **soar** / **hub** - Simplified flow

---

## 🔄 How Plans Affect Onboarding

### Starter Plan (Full Flow)

**All steps required:**

- Profile (name, logo, slug, phone, social)
- Title
- Description
- Focus areas
- Tags
- Job preferences
- Location
- Operating hours
- Intro video
- Gallery
- Projects
- Experiences ← Starter only
- Qualifications ← Starter only
- Confirm

### Soar/Hub Plan (Simplified)

**Fewer steps:**

- Profile
- Description
- Focus areas
- Tags
- Location
- Operating hours
- Intro video
- Gallery
- Projects
- Confirm

**Skips:**

- ❌ Title
- ❌ Job preferences
- ❌ Experiences
- ❌ Qualifications

---

## 📊 Backend Design Implications

### Hub Model Should Include:

```typescript
{
  // ... hub data
  planCode: string,  // 'starter', 'scale', 'soar'
  planFeatures: {
    hasExperiences: boolean,
    hasQualifications: boolean,
    hasJobPreferences: boolean,
    // etc
  }
}
```

### API Validation Based on Plan

```typescript
// Example: Some fields required only for certain plans
if (hub.planCode === 'starter') {
  // Require experiences, qualifications
} else if (hub.planCode === 'soar') {
  // These are optional
}
```

---

## 🎯 Recommendation

**For Backend:**

1. Store `planCode` in Hub model
2. Make experiences/qualifications optional
3. Validate based on plan requirements
4. Frontend handles which fields to show

**Keep Backend Flexible:**

- All fields optional in schema
- Frontend enforces required based on plan
- Backend just validates format, not presence

---
