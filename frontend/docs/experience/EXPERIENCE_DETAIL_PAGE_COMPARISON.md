# Experience Detail Page Comparison: v1 vs v2

## Overview

This document compares the old v1 experience detail page (`mereka.io/experience/*`) with the new v2 experience detail page (`v2.mereka.dev/experience/*`).

**Old Experience Page:** https://mereka.io/experience/bike-sizing-and-bike-fitting  
**New Experience Page:** https://v2.mereka.dev/experience/*

---

## Current v2 Experience Detail Page Structure

### Page Layout
- **Header Section** (Dark background with white text)
- **Two-Column Layout** (Desktop):
  - Left: Content sections
  - Right: Sticky booking widget
- **Full-Width Sections** (Below main content)
- **Mobile Booking Bar** (Fixed bottom)

### Components Present in v2

#### 1. **experience-header** ✅
**Location:** Header section (dark background)  
**Features:**
- Experience title (h1)
- Type badge (Physical/Virtual/Hybrid)
- Category display
- Location (if Physical)
- Rating & review count (if available)
- Save button
- Share button
- Gallery/cover image
- "View All Photos" button (if multiple images)

**Component File:** `projects/web/src/app/features/experience/components/experience-header/`

---

#### 2. **experience-themes-topics** ✅
**Location:** Main content area (white background)  
**Features:**
- Themes display
- Topics display
- Tag-based UI

**Component File:** `projects/web/src/app/features/experience/components/experience-themes-topics/`

---

#### 3. **experience-about** ✅
**Location:** Main content area (white background)  
**Features:**
- About the experience description
- Rich text content

**Component File:** `projects/web/src/app/features/experience/components/experience-about/`

---

#### 4. **experience-instructions** ✅
**Location:** Main content area (white background)  
**Features:**
- Instructions for participants
- What to bring/prepare
- Guidelines

**Component File:** `projects/web/src/app/features/experience/components/experience-instructions/`

---

#### 5. **experience-booking-widget** ✅
**Location:** 
- Right sidebar (desktop, sticky)
- Fixed bottom bar (mobile)

**Features:**
- Price display ("From RM X")
- Slot selection (date/time)
- Ticket type selection
- Ticket quantity selection
- Book/Continue button
- Price calculation
- Availability status

**Component File:** `projects/web/src/app/features/experience/components/experience-booking-widget/`

---

#### 6. **experience-about-host** ✅
**Location:** Full-width section (below main content)  
**Features:**
- Host/Hub information
- Host profile image
- Host name and title
- Host description
- Host location
- Contact button
- View Profile link
- Multiple hosts selector (if applicable)

**Component File:** `projects/web/src/app/features/experience/components/experience-about-host/`

---

#### 7. **experience-location** ✅
**Location:** Full-width section  
**Features:**
- Street address
- Full address display
- Embedded map (Google Maps)
- "Get Directions" button
- Map coordinates

**Component File:** `projects/web/src/app/features/experience/components/experience-location/`

---

#### 8. **experience-reviews** ✅
**Location:** Full-width section (bg-neutral-50)  
**Features:**
- Reviews summary (average rating, total count)
- Rating filter buttons (All, 5, 4, 3, 2, 1 stars)
- Reviews grid (3 columns desktop)
- Individual review cards:
  - User profile image/initials
  - User name
  - Star rating
  - Review text
  - Review photos (if any)
- Empty state handling

**Component File:** `projects/web/src/app/features/experience/components/experience-reviews/`

---

#### 9. **experience-featured** ✅
**Location:** Full-width section  
**Features:**
- "Featured Experiences" heading
- "View All" link
- Grid of featured experience cards
- Experience card includes:
  - Cover image
  - Rating badge
  - Location
  - Title
  - Dates
  - Host name
  - Price

**Component File:** `projects/web/src/app/features/experience/components/experience-featured/`

---

## Potential Missing Components (Based on Common Patterns)

### ⚠️ Components to Verify Against Old v1 Page

#### 1. **Breadcrumb Navigation** ❓
**Status:** Not visible in v2 template  
**Old v1:** May have breadcrumb navigation  
**Recommendation:** Check if breadcrumbs are needed for SEO/UX

---

#### 2. **Related Experiences Section** ❓
**Status:** Not present (only "Featured Experiences")  
**Old v1:** May have "Related Experiences" or "You May Also Like"  
**Recommendation:** Consider adding related experiences based on:
- Same category
- Same host
- Similar themes/topics

---

#### 3. **FAQ Section** ❓
**Status:** Not present  
**Old v1:** May have FAQ section  
**Recommendation:** Check if FAQ is needed (might be in instructions component)

---

#### 4. **Cancellation Policy** ❓
**Status:** Not visible  
**Old v1:** May display cancellation policy  
**Recommendation:** Verify if cancellation policy should be displayed

---

#### 5. **What's Included / What's Not Included** ❓
**Status:** Not visible  
**Old v1:** May have "What's Included" section  
**Recommendation:** Check if this information is needed

---

#### 6. **Duration Display** ❓
**Status:** May be in header or booking widget  
**Old v1:** May have prominent duration display  
**Recommendation:** Verify duration is clearly visible

---

#### 7. **Language Options** ❓
**Status:** Not visible  
**Old v1:** May display available languages  
**Recommendation:** Check if language options should be displayed

---

#### 8. **Group Size Information** ❓
**Status:** Not visible  
**Old v1:** May show min/max group size  
**Recommendation:** Verify if group size info is needed

---

#### 9. **Age Restrictions** ❓
**Status:** Not visible  
**Old v1:** May display age requirements  
**Recommendation:** Check if age restrictions should be shown

---

#### 10. **Social Media Links** ❓
**Status:** Not visible  
**Old v1:** May have social media sharing buttons  
**Recommendation:** Share button exists, but check if individual platform buttons are needed

---

#### 11. **Print/Download Option** ❓
**Status:** Not visible  
**Old v1:** May have print/download experience details  
**Recommendation:** Consider if needed

---

#### 12. **Calendar Integration** ❓
**Status:** Not visible  
**Old v1:** May have "Add to Calendar" button  
**Recommendation:** Consider adding calendar integration (Google Calendar, iCal)

---

#### 13. **Video/Media Gallery** ❓
**Status:** Only image gallery visible  
**Old v1:** May have video gallery or embedded videos  
**Recommendation:** Check if video content is supported

---

#### 14. **Testimonials Section** ❓
**Status:** Reviews section exists, but may be different from testimonials  
**Old v1:** May have separate testimonials section  
**Recommendation:** Verify if testimonials are different from reviews

---

#### 15. **Booking History/Recent Bookings** ❓
**Status:** Not visible  
**Old v1:** May show "Recently booked by X users"  
**Recommendation:** Consider social proof element

---

## Component Comparison Matrix

| Component/Feature | v1 (Old) | v2 (New) | Status |
|-------------------|----------|----------|--------|
| **Header** | ✅ | ✅ | Present |
| **Title** | ✅ | ✅ | Present |
| **Gallery/Images** | ✅ | ✅ | Present |
| **Save Button** | ❓ | ✅ | Present |
| **Share Button** | ❓ | ✅ | Present |
| **Rating Display** | ✅ | ✅ | Present |
| **Location** | ✅ | ✅ | Present |
| **About Section** | ✅ | ✅ | Present |
| **Instructions** | ✅ | ✅ | Present |
| **Booking Widget** | ✅ | ✅ | Present |
| **Host Information** | ✅ | ✅ | Present |
| **Reviews** | ✅ | ✅ | Present |
| **Featured Experiences** | ✅ | ✅ | Present |
| **Breadcrumb** | ❓ | ❌ | Missing? |
| **FAQ** | ❓ | ❌ | Missing? |
| **Cancellation Policy** | ❓ | ❌ | Missing? |
| **What's Included** | ❓ | ❌ | Missing? |
| **Related Experiences** | ❓ | ❌ | Missing? |
| **Calendar Integration** | ❓ | ❌ | Missing? |
| **Video Gallery** | ❓ | ❌ | Missing? |
| **Social Media Links** | ❓ | Partial | Share only |
| **Group Size Info** | ❓ | ❌ | Missing? |
| **Age Restrictions** | ❓ | ❌ | Missing? |

---

## Recommendations

### High Priority (Verify Against Old Page)
1. **Breadcrumb Navigation** - Important for SEO and UX
2. **FAQ Section** - Common user need
3. **Cancellation Policy** - Important for user trust
4. **What's Included** - Helps users understand value

### Medium Priority
5. **Related Experiences** - Increases engagement
6. **Calendar Integration** - Convenience feature
7. **Group Size Information** - Important for booking decisions

### Low Priority
8. **Video Gallery** - Nice to have if content exists
9. **Age Restrictions** - If applicable
10. **Social Media Platform Buttons** - Current share button may suffice

---

## Next Steps

1. **Manual Comparison:** Visit old v1 page and compare side-by-side with v2
2. **Component Audit:** Check each component's functionality matches old page
3. **Content Review:** Verify all content sections are present
4. **UX Review:** Compare user flow and interactions
5. **Mobile Comparison:** Verify mobile experience matches

---

## File References

- **v2 Template:** `projects/web/src/app/features/experience/pages/experience-detail/experience-detail.page.html`
- **v2 Component:** `projects/web/src/app/features/experience/pages/experience-detail/experience-detail.page.ts`
- **Components Directory:** `projects/web/src/app/features/experience/components/`

---

_Last Updated: 2026-01-29_
