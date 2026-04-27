# Expertise Detail Page Comparison: v1 vs v2

## Overview

This document compares the old v1 expertise detail page (`app.mereka.io/expertise/*`) with the new v2 expertise detail page (`v2.mereka.dev/expertises/*`).

**Old Expertise Page:** https://app.mereka.io/expertise/6jpeySulx8WdQBXFtCTs  
**New Expertise Page:** https://v2.mereka.dev/expertises/expertise-1

---

## Current v2 Expertise Detail Page Structure

### Page Layout
- **Header Section** (Dark background with white text)
- **Two-Column Layout** (Desktop):
  - Left: Content sections
  - Right: Sticky booking widget
- **Full-Width Sections** (Below main content)
- **Mobile Booking Bar** (Fixed bottom)

### Components Present in v2

#### 1. **expertise-header** ✅
**Location:** Header section (dark background)  
**Features:**
- Expertise title (h1) - includes expert name
- Mode badge (Online/Physical/Hybrid)
- Location (if Physical)
- Rating & review count (if available)
- Save button
- Share button
- Gallery/cover image
- "View All Photos" button (if multiple images)

**Component File:** `projects/web/src/app/features/expertise/components/expertise-header/`

---

#### 2. **expertise-about-expert** ✅
**Location:** Main content area (white background)  
**Features:**
- "Meet the Expert" section
- Expert name
- Expert profile image
- Expert location
- Expert bio/description
- "View Profile" link
- Expert title/credentials

**Component File:** `projects/web/src/app/features/expertise/components/expertise-about-expert/`

---

#### 3. **expertise-about** ✅
**Location:** Main content area (white background)  
**Features:**
- "About the Expertise" section
- Duration display
- Language options
- Description/content

**Component File:** `projects/web/src/app/features/expertise/components/expertise-about/`

---

#### 4. **expertise-instructions** ✅
**Location:** Main content area (white background)  
**Features:**
- Instructions & FAQ section
- What to prepare
- Guidelines
- FAQ items (if any)

**Component File:** `projects/web/src/app/features/expertise/components/expertise-instructions/`

---

#### 5. **expertise-booking-widget** ✅
**Location:** 
- Right sidebar (desktop, sticky)
- Fixed bottom bar (mobile)

**Features:**
- Price display ("From RM X" or "Free")
- Package/ticket selection (if multiple)
- Duration display
- Date & Time selection (for flexible/autofill)
- Request Booking button (for manual)
- Booking info text
- Availability type indicator

**Component File:** `projects/web/src/app/features/expertise/components/expertise-booking-widget/`

**Sub-components:**
- `expertise-booking-dialog` - Date/time picker dialog
- `expertise-date-picker` - Date selection
- `expertise-time-slots` - Time slot selection

---

#### 6. **expertise-location** ✅
**Location:** Full-width section  
**Features:**
- Location display (if Physical/Hybrid)
- Full address
- Embedded map (Google Maps iframe)
- Hybrid notice (if applicable)

**Component File:** `projects/web/src/app/features/expertise/components/expertise-location/`

---

#### 7. **expertise-featured** ✅
**Location:** Full-width section (bg-neutral-50)  
**Features:**
- "Featured Expertise" heading
- "View All" button
- Grid of featured expertise cards
- Expertise card includes:
  - Cover image
  - Title
  - Host name
  - Rating (if available)
  - Price

**Component File:** `projects/web/src/app/features/expertise/components/expertise-featured/`

---

## Potential Missing Components (Based on Common Patterns)

### ⚠️ Components to Verify Against Old v1 Page

#### 1. **Breadcrumb Navigation** ❓
**Status:** Not visible in v2 template  
**Old v1:** May have breadcrumb navigation  
**Recommendation:** Check if breadcrumbs are needed for SEO/UX

---

#### 2. **Expert Reviews Section** ❓
**Status:** Not present (only rating in header)  
**Old v1:** May have dedicated reviews section  
**Recommendation:** Check if expertise needs reviews section (similar to experience reviews)

---

#### 3. **Expert Credentials/Certifications** ❓
**Status:** Not visible  
**Old v1:** May display expert certifications, education, credentials  
**Recommendation:** Verify if credentials should be displayed in "About Expert" section

---

#### 4. **Expert Portfolio/Work Samples** ❓
**Status:** Not visible  
**Old v1:** May have portfolio section showing expert's work  
**Recommendation:** Consider adding portfolio section

---

#### 5. **Expert Availability Calendar** ❓
**Status:** Not visible (only date picker in booking widget)  
**Old v1:** May show full calendar view of expert availability  
**Recommendation:** Check if calendar view is needed

---

#### 6. **Session Duration Options** ❓
**Status:** Duration shown in booking widget  
**Old v1:** May show multiple duration options  
**Recommendation:** Verify if multiple duration options are supported

---

#### 7. **Package Comparison Table** ❓
**Status:** Packages shown as buttons  
**Old v1:** May have comparison table for packages  
**Recommendation:** Consider if comparison table improves UX

---

#### 8. **FAQ Section** ❓
**Status:** Instructions component may include FAQ  
**Old v1:** May have dedicated FAQ section  
**Recommendation:** Verify if FAQ is separate from instructions

---

#### 9. **Cancellation Policy** ❓
**Status:** Not visible  
**Old v1:** May display cancellation policy  
**Recommendation:** Check if cancellation policy should be displayed

---

#### 10. **What's Included in Session** ❓
**Status:** Not visible  
**Old v1:** May have "What's Included" section  
**Recommendation:** Check if this information is needed

---

#### 11. **Expert Response Time** ❓
**Status:** Not visible  
**Old v1:** May show "Average response time"  
**Recommendation:** Consider adding response time indicator

---

#### 12. **Expert Verification Badge** ❓
**Status:** Not visible  
**Old v1:** May show verification badge/checkmark  
**Recommendation:** Verify if expert verification status should be displayed

---

#### 13. **Related Expertise** ❓
**Status:** Not present (only "Featured Expertise")  
**Old v1:** May have "Related Expertise" or "You May Also Like"  
**Recommendation:** Consider adding related expertise based on:
- Same expert
- Same category
- Similar topics

---

#### 14. **Expert's Other Services** ❓
**Status:** Not visible  
**Old v1:** May show other expertise/services by same expert  
**Recommendation:** Consider adding "Other Services by [Expert Name]"

---

#### 15. **Booking History/Recent Bookings** ❓
**Status:** Not visible  
**Old v1:** May show "Recently booked by X users"  
**Recommendation:** Consider social proof element

---

#### 16. **Video Introduction** ❓
**Status:** Only image gallery visible  
**Old v1:** May have expert introduction video  
**Recommendation:** Check if video content is supported

---

#### 17. **Testimonials Section** ❓
**Status:** Not present  
**Old v1:** May have separate testimonials section  
**Recommendation:** Verify if testimonials are different from reviews

---

#### 18. **Expert's Social Media Links** ❓
**Status:** Not visible  
**Old v1:** May display expert's social media profiles  
**Recommendation:** Consider adding social media links in expert section

---

#### 19. **Language Options Display** ❓
**Status:** Shown in "About the Expertise"  
**Old v1:** May have more prominent language display  
**Recommendation:** Verify if language options are clearly visible

---

#### 20. **Instant Booking Indicator** ❓
**Status:** Shown in booking widget info text  
**Old v1:** May have prominent "Instant Booking" badge  
**Recommendation:** Verify if instant booking status is clear

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
| **About Expert** | ✅ | ✅ | Present |
| **About Expertise** | ✅ | ✅ | Present |
| **Instructions/FAQ** | ✅ | ✅ | Present |
| **Booking Widget** | ✅ | ✅ | Present |
| **Package Selection** | ✅ | ✅ | Present |
| **Date/Time Picker** | ✅ | ✅ | Present |
| **Location** | ✅ | ✅ | Present |
| **Featured Expertise** | ✅ | ✅ | Present |
| **Breadcrumb** | ❓ | ❌ | Missing? |
| **Expert Reviews** | ❓ | ❌ | Missing? |
| **Expert Credentials** | ❓ | ❌ | Missing? |
| **Portfolio/Work Samples** | ❓ | ❌ | Missing? |
| **Availability Calendar** | ❓ | ❌ | Missing? |
| **Package Comparison** | ❓ | ❌ | Missing? |
| **Cancellation Policy** | ❓ | ❌ | Missing? |
| **What's Included** | ❓ | ❌ | Missing? |
| **Response Time** | ❓ | ❌ | Missing? |
| **Verification Badge** | ❓ | ❌ | Missing? |
| **Related Expertise** | ❓ | ❌ | Missing? |
| **Other Services by Expert** | ❓ | ❌ | Missing? |
| **Video Introduction** | ❓ | ❌ | Missing? |
| **Social Media Links** | ❓ | ❌ | Missing? |

---

## Key Differences: Experience vs Expertise

### Experience-Specific Features
- ✅ Reviews section (dedicated component)
- ✅ About Host section (can be Hub or Expert)
- ✅ Themes & Topics section

### Expertise-Specific Features
- ✅ About Expert section (dedicated)
- ✅ Package selection (multiple packages/tickets)
- ✅ Date/Time picker dialog (for flexible/autofill availability)
- ✅ Manual vs Flexible/Autofill availability types

### Shared Features
- ✅ Header with gallery
- ✅ Save/Share buttons
- ✅ Rating display
- ✅ Location section
- ✅ Featured items section
- ✅ Booking widget
- ✅ Instructions section

---

## Recommendations

### High Priority (Verify Against Old Page)
1. **Expert Reviews Section** - Important for trust and decision-making
2. **Expert Credentials** - Builds credibility
3. **Breadcrumb Navigation** - Important for SEO and UX
4. **FAQ Section** - Common user need
5. **Cancellation Policy** - Important for user trust

### Medium Priority
6. **Portfolio/Work Samples** - Shows expert's work quality
7. **Related Expertise** - Increases engagement
8. **Other Services by Expert** - Cross-selling opportunity
9. **Expert's Social Media** - Builds connection
10. **Package Comparison Table** - Helps decision-making

### Low Priority
11. **Video Introduction** - Nice to have if content exists
12. **Availability Calendar View** - Current date picker may suffice
13. **Response Time Indicator** - Nice to have
14. **Verification Badge** - If verification system exists

---

## Next Steps

1. **Manual Comparison:** Visit old v1 page and compare side-by-side with v2
2. **Component Audit:** Check each component's functionality matches old page
3. **Content Review:** Verify all content sections are present
4. **UX Review:** Compare user flow and interactions
5. **Mobile Comparison:** Verify mobile experience matches
6. **Booking Flow Comparison:** Compare booking widget functionality

---

## File References

- **v2 Template:** `projects/web/src/app/features/expertise/pages/expertise-detail/expertise-detail.page.html`
- **v2 Component:** `projects/web/src/app/features/expertise/pages/expertise-detail/expertise-detail.page.ts`
- **Components Directory:** `projects/web/src/app/features/expertise/components/`

---

_Last Updated: 2026-01-29_
