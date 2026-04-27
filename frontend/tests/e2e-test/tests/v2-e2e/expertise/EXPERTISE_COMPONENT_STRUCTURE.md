# Expertise Component Structure - Actual Implementation

This document captures the actual structure of the expertise creation components based on the frontend codebase, to help with test maintenance and updates.

## Step 1: Your Expertise (`basic-info.component.html`)

### Form Controls (from `expertise-onboarding.service.ts`)
- `expertiseTitle` - Required, maxLength: 200
- `slug` - Required
- `expertiseDescription` - Required
- `expertiseSummary` - Required, maxLength: 200
- `host` - Required (ExpertiseHost object)
- `tags` - Optional (string array)
- `primaryLanguage` - Required (default: 'English')
- `secondaryLanguages` - Optional (string array)

### UI Components Used
- `ui-input` for title (formControl: `expertiseTitle`)
- `ui-textarea` for description (formControl: `expertiseDescription`)
- `ui-textarea` for summary (formControl: `expertiseSummary`, maxLength: 200)
- `ui-select` for primary language (formControl: `primaryLanguage`)
- Native `<select>` for host selection (not a formControl, uses `onTeamMemberSelect()`)
- Native `<input>` with `ngModel` for tags (uses `newTag` variable and `addTag()` method)
- Button-based selection for secondary languages (uses `toggleSecondaryLanguage()`)

### Key Selectors
```typescript
// Title
page.locator('ui-input[formcontrolname="expertiseTitle"] input')
  .or(page.locator('input[formcontrolname="expertiseTitle"]'))

// Slug
page.locator('input[formcontrolname="slug"]')

// Description
page.locator('ui-textarea[formcontrolname="expertiseDescription"] textarea')
  .or(page.locator('textarea[formcontrolname="expertiseDescription"]'))

// Summary
page.locator('ui-textarea[formcontrolname="expertiseSummary"] textarea')
  .or(page.locator('textarea[formcontrolname="expertiseSummary"]'))

// Host (native select)
page.locator('select').filter({ hasText: /Choose a team member/i })

// Tags (native input with ngModel)
page.locator('input[placeholder*="Type Tags"]')

// Primary Language (ui-select)
page.locator('ui-select[formcontrolname="primaryLanguage"]')

// Secondary Languages (buttons)
page.getByRole('button', { name: /Malay|Mandarin|Tamil/i })
```

## Step 2: Availability & Rates (`availability-rates.component.html`)

### Form Controls
- `pricingForm.audienceType` - Radio buttons ('Everyone' | 'Hidden')
- `bookingForm.availabilityType` - Radio buttons ('flexible' | 'autofill' | 'manual')
- `bookingForm.operatingHours` - Object (when manual/autofill)
- `pricingForm.feePaidBy` - Radio buttons ('learner' | 'expert')
- `pricingForm.tickets` - Array (managed via `ui-expertise-ticket-form` component)

### UI Components Used
- Radio buttons for audience type (formControl: `pricingForm.audienceType`)
- Radio buttons for availability type (formControl: `bookingForm.availabilityType`)
- Native `<select>` for operating hours (managed via signals, not direct formControl)
- Radio buttons for service fee (formControl: `pricingForm.feePaidBy`)
- `ui-expertise-ticket-form` component for packages (emits `packagesChange` event)

### Key Selectors
```typescript
// Audience Type
page.getByRole('radio', { name: /Everyone/i })
page.getByRole('radio', { name: /Hidden/i })

// Availability Type
page.getByRole('radio', { name: /Flexible/i })
page.getByRole('radio', { name: /Autofill from profile/i })
page.getByRole('radio', { name: /Manually fill available hours/i })

// Service Fee
page.getByRole('radio', { name: /Learner pays service fee/i })
page.getByRole('radio', { name: /I will absorb the service fee/i })

// Packages (via ui-expertise-ticket-form component)
// This component manages its own state and emits changes
// Look for "Add Package" button or package cards
page.locator('ui-expertise-ticket-form')
  .or(page.getByRole('button', { name: /Add Package/i }))
```

### Operating Hours (Manual Mode)
- Managed via signals (`days`, `sameHoursForAll`, `allStartTime`, `allEndTime`)
- Uses native `<select>` elements for time selection
- Checkboxes for day activation and "full day" toggle

```typescript
// Day checkboxes
page.locator('input[type="checkbox"]').filter({ hasText: /Monday/i })

// Time selects
page.locator('select').filter({ hasText: /Start Time|End Time/i })

// Full day toggle
page.locator('input[type="checkbox"]').filter({ hasText: /24hrs/i })
```

## Step 3: Booking Details (`booking-details.component.html`)

### Form Controls
- `bookingForm.linkMode` - Radio buttons ('send' | 'input')
- `bookingForm.expertiseLink` - Input (when linkMode === 'input')
- `bookingForm.location` - Object (when physical/hybrid packages exist, via `ui-location-form`)
- `pageForm.coverPhoto` - String (URL)
- `pageForm.gallery` - String array (URLs)
- `pageForm.expertiseInstructions` - Textarea (optional)
- `pageForm.customQuestions` - Object (via `ui-custom-questions` component)

### UI Components Used
- Radio buttons for link mode (formControl: `bookingForm.linkMode`)
- `ui-input` for meeting link (formControl: `bookingForm.expertiseLink`)
- `ui-location-form` for location (emits `locationChange` event)
- `ui-textarea` for instructions (formControl: `pageForm.expertiseInstructions`)
- `ui-custom-questions` component for custom questions (emits `questionsChange` event)
- Native `<input type="file">` for cover photo and gallery uploads

### Key Selectors
```typescript
// Link Mode
page.getByRole('radio', { name: /Send link to learner/i })
page.getByRole('radio', { name: /Use fixed meeting link/i })

// Meeting Link (when linkMode === 'input')
page.locator('ui-input[formcontrolname="expertiseLink"] input')
  .or(page.locator('input[formcontrolname="expertiseLink"]'))

// Location (via ui-location-form component)
page.locator('ui-location-form')

// Cover Photo
page.locator('input[type="file"]').first() // Cover photo input

// Gallery Photos
page.locator('input[type="file"]').last() // Gallery input

// Instructions
page.locator('ui-textarea[formcontrolname="expertiseInstructions"] textarea')
  .or(page.locator('textarea[formcontrolname="expertiseInstructions"]'))

// Custom Questions (via ui-custom-questions component)
page.locator('ui-custom-questions')
```

### Conditional Sections
- **Online Meeting Link**: Only shown if `hasOnlinePackages()` is true
- **Location**: Only shown if `hasPhysicalPackages()` is true

## Step 4: Confirmation

No component file found - likely uses a different structure or is dynamically generated.

## Notes for Test Updates

1. **Host Selection**: Uses native `<select>` with `(change)` event, not a formControl. The component handles selection via `onTeamMemberSelect()` method.

2. **Tags**: Uses `ngModel` with `newTag` variable. Press Enter to add tag via `addTag()` method.

3. **Secondary Languages**: Uses button clicks, not a select dropdown. Each language is a button that toggles selection.

4. **Packages**: Managed via `ui-expertise-ticket-form` component. This is a complex component that manages its own state. Tests should look for:
   - "Add Package" button
   - Package form fields (name, price, duration, mode)
   - Save/Add button for the package
   - Package cards/list after saving

5. **Operating Hours**: Managed via signals, not direct formControl. The component calls `updateOperatingHours()` method to sync with form.

6. **Location**: Uses `ui-location-form` component which handles its own state and emits changes.

7. **Custom Questions**: Uses `ui-custom-questions` component which manages its own state.

8. **File Uploads**: Uses native `<input type="file">` with `UploadService`. The component handles uploads asynchronously.

## Recommended Test Approach

1. Use flexible selectors with fallbacks (already implemented in tests)
2. Wait for component initialization (especially for complex components like `ui-expertise-ticket-form`)
3. Use role-based selectors where possible (`getByRole`)
4. For custom components, look for their rendered output rather than the component tag itself
5. Handle async operations (file uploads, component initialization) with proper waits
