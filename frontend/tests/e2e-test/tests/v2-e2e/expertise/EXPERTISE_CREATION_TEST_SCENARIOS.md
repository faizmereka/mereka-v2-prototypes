# Expertise Creation Flow - Test Scenarios and Test Cases

## Overview
This document captures comprehensive test scenarios and test cases for the Expertise Creation flow. The expertise creation flow has 4 steps: Your Expertise, Availability & Rates, Booking Details, and Confirmation.

## Entry Flow
1. User logs in (handled by storageState via global-setup.ts)
2. Navigate directly to `/onboarding/expertise/your-expertise`
3. Start filling the expertise creation form

## Step 1: Your Expertise (`/onboarding/expertise/your-expertise`)

### Section: Title

#### Test Case 1.1: Fill Title Field
- **Field**: Title input
- **Form Control**: `expertiseTitle`
- **Character Limit**: 100 characters (shown as "X/100")
- **Required**: Yes
- **Action**: Fill with expertise title
- **Expected**: Title is filled, character counter updates

#### Test Case 1.2: Validate Title Character Limit
- **Test**: Enter title longer than 100 characters
- **Expected**: Character counter shows limit, input may truncate or show validation error

#### Test Case 1.3: Slug Auto-Generation
- **Field**: Expertise Link (Slug)
- **Form Control**: `slug`
- **Required**: Yes
- **Auto-generated**: Yes (from title)
- **Action**: Fill title, verify slug is auto-generated
- **Expected**: Slug is generated from title, can be edited manually
- **Format**: `mereka.io/expertise/your-expertise-slug`

### Section: Description

#### Test Case 1.4: Fill Description
- **Field**: Full Description textarea
- **Form Control**: `expertiseDescription`
- **Required**: Yes
- **Action**: Fill with comprehensive description
- **Expected**: Description is filled

#### Test Case 1.5: Fill Summary
- **Field**: Summary textarea
- **Form Control**: `expertiseSummary`
- **Character Limit**: 200 characters (shown as "X/200")
- **Required**: Yes
- **Action**: Fill with brief summary
- **Expected**: Summary is filled, character counter updates

#### Test Case 1.6: Validate Summary Character Limit
- **Test**: Enter summary longer than 200 characters
- **Expected**: Character counter shows limit, input may truncate or show validation error

### Section: Host

#### Test Case 1.7: Select Host
- **Field**: Host dropdown
- **Form Control**: `host`
- **Required**: Yes
- **Options**: Team members from hub
- **Action**: Select host from dropdown
- **Expected**: Host is selected, host description field appears (if applicable)

#### Test Case 1.8: Host Description (Optional)
- **Field**: Host description textarea
- **Action**: Fill host description
- **Expected**: Description is saved with host

### Section: Tags

#### Test Case 1.9: Add Tags
- **Field**: Tags input
- **Form Control**: `tags`
- **Required**: No
- **Action**: Add tags (e.g., "consulting", "coaching", "mentoring")
- **Expected**: Tags are added and displayed

#### Test Case 1.10: Remove Tags
- **Action**: Remove a tag
- **Expected**: Tag is removed from the list

### Section: Languages

#### Test Case 1.11: Select Primary Language
- **Field**: Primary Language dropdown
- **Form Control**: `primaryLanguage`
- **Required**: Yes
- **Default**: English
- **Options**: English, Malay, Mandarin, Tamil, Hindi, Spanish, French, Japanese, Korean, Arabic
- **Action**: Select primary language
- **Expected**: Primary language is selected

#### Test Case 1.12: Add Secondary Languages
- **Field**: Secondary Languages multi-select
- **Form Control**: `secondaryLanguages`
- **Required**: No
- **Action**: Add secondary languages
- **Expected**: Secondary languages are added

### Navigation

#### Test Case 1.13: Navigate to Next Step
- **Button**: "Continue" or "Next" button
- **Action**: Fill all required fields and click Next
- **Expected**: Navigate to Availability & Rates page (`/onboarding/expertise/availability-rates`)

#### Test Case 1.14: Validation - Required Fields
- **Test**: Try to proceed without filling required fields
- **Expected**: Error messages appear, Next button is disabled

## Step 2: Availability & Rates (`/onboarding/expertise/availability-rates`)

### Section: Expertise Access

#### Test Case 2.1: Select Audience - Everyone
- **Field**: Audience radio buttons
- **Form Control**: `audienceType` (in pricingForm)
- **Required**: Yes
- **Options**: 
  - "Everyone" (default)
  - "Hidden" (with tooltip: "This means that your Expertise can only be found using a direct URL. It will not be visible upon search.")
- **Action**: Select "Everyone"
- **Expected**: "Everyone" is selected

#### Test Case 2.2: Select Audience - Hidden
- **Action**: Select "Hidden"
- **Expected**: "Hidden" is selected, tooltip is visible

### Section: Availability

#### Test Case 2.3: Select Availability Type - Flexible
- **Field**: Availability Type radio buttons
- **Form Control**: `availabilityType` (in bookingForm)
- **Required**: Yes
- **Options**:
  - "Flexible" - "This Expertise does not require a meeting schedule or it will be discussed upon booking"
  - "Autofill from profile operating hours" - "Use your hub's operating hours as availability"
  - "Manually fill available hours" - "Define specific days and times when you are available"
- **Action**: Select "Flexible"
- **Expected**: "Flexible" is selected, operating hours UI is hidden

#### Test Case 2.4: Select Availability Type - Autofill
- **Action**: Select "Autofill from profile operating hours"
- **Expected**: "Autofill" is selected, operating hours are auto-filled from hub profile

#### Test Case 2.5: Select Availability Type - Manual
- **Action**: Select "Manually fill available hours"
- **Expected**: "Manual" is selected, operating hours configuration UI appears

#### Test Case 2.6: Configure Operating Hours (Manual)
- **Fields**: Day checkboxes, Start Time, End Time, Full Day toggle
- **Form Control**: `operatingHours` (in bookingForm)
- **Action**: 
  - Select days (Monday, Tuesday, etc.)
  - Set start time and end time for each day
  - Toggle "Full Day" for specific days
- **Expected**: Operating hours are configured and saved

### Section: Packages/Tickets

#### Test Case 2.7: Create Paid Package
- **Button**: "Add Package" or similar
- **Fields**:
  - Package Name (required)
  - Price (required for paid)
  - Duration (required)
  - Duration Unit (minutes/hours)
  - Expertise Mode (online/physical/hybrid)
  - Quantity (required)
  - Description (optional)
- **Action**: Create a paid package with all required fields
- **Expected**: Package is created and displayed in the list

#### Test Case 2.8: Create Free Package
- **Action**: Create a free package (no price field)
- **Expected**: Free package is created

#### Test Case 2.9: Edit Package
- **Action**: Edit an existing package
- **Expected**: Package form opens with pre-filled data, changes are saved

#### Test Case 2.10: Delete Package
- **Action**: Delete a package
- **Expected**: Package is removed from the list

#### Test Case 2.11: Package Validation - Required Fields
- **Test**: Try to save package without required fields
- **Expected**: Validation errors appear, package cannot be saved

#### Test Case 2.12: Multiple Packages
- **Action**: Create multiple packages (paid and free)
- **Expected**: All packages are displayed in the list

### Navigation

#### Test Case 2.13: Navigate to Next Step
- **Button**: "Continue" or "Next" button
- **Action**: Fill all required fields and click Next
- **Expected**: Navigate to Booking Details page (`/onboarding/expertise/booking-details`)

#### Test Case 2.14: Validation - Required Fields
- **Test**: Try to proceed without required fields (audience, availability type, at least one package)
- **Expected**: Error messages appear, Next button is disabled

## Step 3: Booking Details (`/onboarding/expertise/booking-details`)

### Section: Meeting Link

#### Test Case 3.1: Select Link Mode - Send Link
- **Field**: Link Mode radio buttons
- **Form Control**: `linkMode` (in bookingForm)
- **Options**:
  - "Send link to learner" - "You will send the meeting link after booking"
  - "Use fixed meeting link" - "Use the same meeting link for all sessions"
- **Action**: Select "Send link to learner"
- **Expected**: "Send link" mode is selected, meeting link input is hidden

#### Test Case 3.2: Select Link Mode - Fixed Link
- **Action**: Select "Use fixed meeting link"
- **Expected**: "Fixed link" mode is selected, meeting link input appears

#### Test Case 3.3: Enter Meeting Link (Fixed Mode)
- **Field**: Meeting Link input
- **Form Control**: `expertiseLink` (in bookingForm)
- **Required**: Yes (if Fixed link mode selected)
- **Action**: Enter meeting link (e.g., Zoom, Google Meet URL)
- **Expected**: Meeting link is saved

### Section: Location (Conditional)

#### Test Case 3.4: Location Required for Physical Packages
- **Condition**: At least one package has physical or hybrid mode
- **Field**: Location form
- **Form Control**: `location` (in bookingForm)
- **Required**: Yes (if physical/hybrid packages exist)
- **Location Types**: Hub Address, New Address, Other Hub Venue
- **Action**: Fill location details
- **Expected**: Location is saved

#### Test Case 3.5: Select Location Type - Hub Address
- **Action**: Select "Hub Address" tab
- **Expected**: Location fields are pre-filled from hub profile

#### Test Case 3.6: Select Location Type - New Address
- **Action**: Select "New Address" tab
- **Expected**: Empty location form appears for manual entry

#### Test Case 3.7: Fill New Address
- **Fields**: Venue Name, Street Address, Country, State, City
- **Action**: Fill all address fields
- **Expected**: Address is saved, map shows location pin

### Section: Custom Questions (Optional)

#### Test Case 3.8: Add Custom Question - Text
- **Button**: "Add a question" or similar
- **Question Type**: Text (short answer)
- **Fields**: Question Label, Required toggle
- **Action**: Add a text question
- **Expected**: Question is added to the list

#### Test Case 3.9: Add Custom Question - Dropdown
- **Question Type**: Dropdown
- **Fields**: Question Label, Options, Required toggle
- **Action**: Add a dropdown question with options
- **Expected**: Question is added with options

#### Test Case 3.10: Add Custom Question - Checkbox
- **Question Type**: Checkbox
- **Fields**: Question Label, Options, Required toggle
- **Action**: Add a checkbox question
- **Expected**: Question is added

#### Test Case 3.11: Add Custom Question - Multiple Choice
- **Question Type**: Multiple Choice
- **Fields**: Question Label, Options, Required toggle
- **Action**: Add a multiple choice question
- **Expected**: Question is added

#### Test Case 3.12: Edit Custom Question
- **Action**: Edit an existing question
- **Expected**: Question form opens with pre-filled data

#### Test Case 3.13: Delete Custom Question
- **Action**: Delete a question
- **Expected**: Question is removed

### Section: Cover Photo (Optional)

#### Test Case 3.14: Upload Cover Photo
- **Field**: Cover Photo upload
- **Form Control**: Cover photo in pageForm
- **Required**: No
- **File Types**: PNG, JPG
- **Max Size**: 10MB
- **Action**: Upload cover photo
- **Expected**: Cover photo is uploaded and preview is displayed

#### Test Case 3.15: Remove Cover Photo
- **Action**: Remove uploaded cover photo
- **Expected**: Cover photo is removed

### Section: Gallery Photos (Optional)

#### Test Case 3.16: Upload Gallery Photos
- **Field**: Gallery Photos upload
- **Form Control**: Gallery photos in pageForm
- **Required**: No
- **Max Photos**: Up to 10 photos
- **Action**: Upload gallery photos
- **Expected**: Photos are uploaded and displayed in gallery

#### Test Case 3.17: Remove Gallery Photo
- **Action**: Remove a gallery photo
- **Expected**: Photo is removed from gallery

### Navigation

#### Test Case 3.18: Navigate to Next Step
- **Button**: "Continue" or "Next" button
- **Action**: Fill all required fields and click Next
- **Expected**: Navigate to Confirmation page (`/onboarding/expertise/confirmation`)

#### Test Case 3.19: Validation - Required Fields
- **Test**: Try to proceed without required fields (link mode if online packages exist, location if physical packages exist)
- **Expected**: Error messages appear, Next button is disabled

## Step 4: Confirmation (`/onboarding/expertise/confirmation`)

### Section: Review

#### Test Case 4.1: Display All Sections
- **Expected Sections**:
  1. Your Expertise (Title, Description, Summary, Host, Tags, Languages)
  2. Availability & Rates (Audience, Availability Type, Operating Hours, Packages)
  3. Booking Details (Link Mode, Meeting Link, Location, Custom Questions, Photos)
- **Action**: Verify all sections are displayed
- **Expected**: All 3 sections are visible with their data

#### Test Case 4.2: Verify Section Completion Status
- **Indicators**: 
  - Green checkmark (complete)
  - Yellow exclamation mark (incomplete)
- **Action**: Check status indicators for each section
- **Expected**: Status indicators correctly reflect completion state

#### Test Case 4.3: Verify Data Display
- **Action**: Verify all entered data is displayed correctly
- **Expected**: All data matches what was entered in previous steps

### Section: Edit Functionality

#### Test Case 4.4: Edit Your Expertise Section
- **Button**: "Edit" button for Your Expertise section
- **Action**: Click Edit button
- **Expected**: Navigate back to Your Expertise page (`/onboarding/expertise/your-expertise`), data is pre-filled

#### Test Case 4.5: Edit Availability & Rates Section
- **Button**: "Edit" button for Availability & Rates section
- **Action**: Click Edit button
- **Expected**: Navigate back to Availability & Rates page, data is pre-filled

#### Test Case 4.6: Edit Booking Details Section
- **Button**: "Edit" button for Booking Details section
- **Action**: Click Edit button
- **Expected**: Navigate back to Booking Details page, data is pre-filled

### Section: Publish

#### Test Case 4.7: Publish Button State - Enabled
- **Condition**: All required fields are filled
- **Expected**: Publish button is enabled and clickable

#### Test Case 4.8: Publish Button State - Disabled
- **Condition**: Some required fields are missing
- **Expected**: Publish button is disabled, warning message appears

#### Test Case 4.9: Publish Expertise
- **Button**: "Publish" button
- **Action**: Click Publish button (when enabled)
- **Expected**: 
  - Expertise is published successfully
  - Success message is displayed
  - Redirect to expertise management page or success page

#### Test Case 4.10: Publish Flow with PUBLISH_EXPERTISE=true
- **Environment Variable**: `PUBLISH_EXPERTISE=true`
- **Action**: Run test with publish enabled
- **Expected**: Expertise is actually published (not just verified)

## Test Data Requirements

### Required Test Data

#### Step 1: Your Expertise
- **Title**: Unique test title (e.g., `E2E Test Expertise ${timestamp}`)
- **Slug**: Auto-generated or manual (e.g., `e2e-test-expertise-${timestamp}`)
- **Description**: Comprehensive description text
- **Summary**: Brief summary (max 200 chars)
- **Host**: Select from hub team members
- **Primary Language**: English (default) or other
- **Secondary Languages**: Optional array

#### Step 2: Availability & Rates
- **Audience**: "Everyone" or "Hidden"
- **Availability Type**: "Flexible", "Autofill", or "Manual"
- **Operating Hours**: If Manual, configure days and times
- **Packages**: At least one package (paid or free)
  - Package Name
  - Price (for paid)
  - Duration (e.g., 60 minutes)
  - Mode (online/physical/hybrid)
  - Quantity

#### Step 3: Booking Details
- **Link Mode**: "Send link" or "Fixed link"
- **Meeting Link**: If Fixed link mode (e.g., Zoom URL)
- **Location**: If physical/hybrid packages exist
- **Custom Questions**: Optional array
- **Cover Photo**: Optional (test image path)
- **Gallery Photos**: Optional array (test images)

### Test Scenarios Summary

#### Happy Path Scenarios
1. **Complete Flow with All Fields**: Fill all required and optional fields, publish successfully
2. **Minimal Required Fields**: Fill only required fields, verify can publish
3. **With Physical Packages**: Create expertise with physical packages, fill location
4. **With Online Packages**: Create expertise with online packages only, fill meeting link
5. **With Hybrid Packages**: Create expertise with hybrid packages, fill both location and meeting link

#### Validation Scenarios
1. **Required Field Validation**: Test each step without required fields
2. **Character Limit Validation**: Test title (100) and summary (200) limits
3. **Package Validation**: Test package creation without required fields
4. **Location Validation**: Test location requirement for physical packages
5. **Meeting Link Validation**: Test meeting link requirement for fixed link mode

#### Edge Cases
1. **Multiple Packages**: Create multiple paid and free packages
2. **Multiple Custom Questions**: Add multiple questions of different types
3. **Multiple Secondary Languages**: Add multiple secondary languages
4. **Edit and Update**: Edit sections and verify data persistence
5. **Save Draft**: Save expertise as draft and resume later

#### Error Scenarios
1. **Invalid Data**: Test with invalid data formats
2. **Missing Required Fields**: Test navigation without required fields
3. **File Upload Errors**: Test with invalid file types or sizes
4. **Network Errors**: Test behavior on network failures

## Test Execution

### Run Complete Flow Test
```bash
npx playwright test tests/v2-e2e/expertise/expertise-creation-complete-flow-e2e.spec.ts --headed
```

### Run Individual Page Tests
```bash
# Your Expertise page
npx playwright test tests/v2-e2e/expertise/your-expertise-page-e2e.spec.ts --headed

# Availability & Rates page
npx playwright test tests/v2-e2e/expertise/availability-rates-page-e2e.spec.ts --headed

# Booking Details page
npx playwright test tests/v2-e2e/expertise/booking-details-page-e2e.spec.ts --headed

# Confirmation page
npx playwright test tests/v2-e2e/expertise/confirmation-page-e2e.spec.ts --headed
```

### Run All Expertise Tests
```bash
npx playwright test tests/v2-e2e/expertise/*-page-e2e.spec.ts tests/v2-e2e/expertise/expertise-creation-complete-flow-e2e.spec.ts --headed
```

### With Environment Variables
```bash
# Production environment
$env:TEST_ENV = "production"; npx playwright test tests/v2-e2e/expertise/expertise-creation-complete-flow-e2e.spec.ts --headed

# Publish expertise
$env:PUBLISH_EXPERTISE = "true"; npx playwright test tests/v2-e2e/expertise/expertise-creation-complete-flow-e2e.spec.ts --headed
```

## Notes

- All tests use `storageState` for authentication (via `global-setup.ts`)
- Tests navigate directly to step URLs (no UI navigation needed)
- Tests are independent and can run in parallel
- Video recording is enabled for all tests
- Test data uses unique timestamps to avoid conflicts
