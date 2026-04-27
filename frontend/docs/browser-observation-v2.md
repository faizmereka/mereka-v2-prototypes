# Browser Observation Document - v2.mereka.dev

## Overview

This document captures UI elements, selectors, and user flows observed from v2.mereka.dev for creating E2E tests based on API test scenarios.

**Observation Date**: January 27, 2026  
**Base URL**: https://v2.mereka.dev/

---

## Homepage Structure

### Navigation Elements
- **Login Link**: `page.getByRole('link', { name: 'Log In' })` or `page.getByRole('link', { name: 'Login' })`
- **Sign Up Link**: Similar pattern to login
- **Navigation Menu**: Header navigation with links to different sections

### Hero Section
- **Heading**: `page.locator('h1').filter({ hasText: /Book Leading Experts & Services/i })`
- **Lottie Animation**: `page.locator('ng-lottie > div > svg')`
- **CTA Buttons**: Various call-to-action buttons

### Featured Sections

#### Featured Experts Section
- **Heading**: `page.locator('h2').filter({ hasText: /Browse Featured Experts/i })`
- **Expert Cards**: `page.locator('div[ui-card-expert]')`
- **Expert Description**: `.ui-card-desc` within expert card
- **View All Experts Button**: `page.getByRole('link', { name: 'View all Experts' })`

#### Expertise Collection Section
- **Heading**: `page.locator('h2.section-heading').filter({ hasText: /book their.*Expertise/i })`
- **Expertise Cards**: `page.locator('[ui-card-expertise]')`
- **Expertise Title**: `.ui-card-title a` within expertise card
- **Expertise Price**: `.ui-card-price` with `.ui-card-price__amount`
- **View All Expertise Button**: `page.getByRole('link', { name: 'View all Expertise' })`

#### Experiences Section
- **Heading**: `page.locator('h2').filter({ hasText: /Discover Experiences/i })`
- **Experience Cards**: `page.locator('div[ui-card-experience]')`
- **Experience Location**: `span.ui-card-location`
- **Experience Title**: `h3.ui-card-title a`
- **Experience Date**: `span.ui-card-date`
- **Experience Price**: `div.ui-card-price` with `span.ui-card-price__amount`
- **View All Experiences Button**: `page.getByRole('link', { name: 'View all Experiences' })`

#### Job Opportunities Section
- **Heading**: `page.locator('h2').filter({ hasText: /Explore Job Opportunities/i })`
- **Job Cards**: `page.locator('div[ui-card-job]')`
- **Job Client Info**: Text containing "Client:"
- **Job Posted Date**: Text containing "Posted"
- **Job Tag**: `span.job-tag`
- **Job Title**: `h3.ui-card-title a`
- **Job Description**: `p.ui-card-desc`
- **Learn More Button**: `page.getByRole('link', { name: 'Learn More & Apply' })`
- **View All Jobs Button**: `page.getByRole('link', { name: 'View all Jobs' })`

---

## Authentication Flows

### Login Flow

#### Step 1: Navigate to Login
- Click login link from homepage
- URL pattern: `/login` or `/auth/login`

#### Step 2: Select Login Method
- **Email Button**: `page.getByRole('button', { name: 'Continue with Email' })` or `page.getByRole('button', { name: 'Email' })`
- Wait for form to load: `await page.waitForLoadState('networkidle')`

#### Step 3: Enter Email
- **Email Input**: `page.locator('input[formcontrolname="email"][type="email"]')`
- **Continue Button**: `page.getByRole('button', { name: 'Continue' })`
- Fill email and click continue

#### Step 4: Enter Password
- **Password Input**: `page.locator('input[formcontrolname="password"][type="password"]')`
- **Sign In Button**: `page.getByRole('button', { name: 'Sign In' })`
- Fill password and click sign in

#### Step 5: Verify Login Success
- Check for profile menu: `page.locator('[class*="profile"], [class*="user"], [class*="menu"], [class*="avatar"]')`
- Or check for welcome text: `page.getByText('Welcome')` or `page.getByText('Dashboard')`
- URL should change to dashboard or authenticated area

### Registration Flow

#### Step 1: Navigate to Registration
- Click sign up link from homepage
- URL pattern: `/register` or `/sign-up`

#### Step 2: Fill Registration Form
- **Name Input**: `input[formcontrolname="name"]`
- **Email Input**: `input[formcontrolname="email"][type="email"]`
- **Password Input**: `input[formcontrolname="password"][type="password"]`
- **Confirm Password Input**: `input[formcontrolname="confirmPassword"][type="password"]`
- **Birth Date Input**: `input[formcontrolname="birthDate"]` (format: dd/mm/yyyy)
- **Submit Button**: `page.getByRole('button', { name: 'Sign Up' })` or similar

#### Step 3: Verify Registration Success
- Check for success message or redirect to dashboard
- Verify user is logged in

### Password Reset Flow

#### Step 1: Navigate to Login
- Follow login flow steps 1-3

#### Step 2: Click Forgot Password
- **Forgot Password Button**: `page.locator('button.forgot-button')`
- Click button

#### Step 3: Enter Email for Reset
- **Reset Email Input**: `page.locator('input[formcontrolname="email"][type="email"]#email')`
- **Send Reset Link Button**: `page.locator('button[ui-button-fill-large][type="submit"]')`
- Fill email and submit

#### Step 4: Verify Success Message
- **Success Message**: `page.getByText('The Link is sent successfully')`
- Message should be visible

---

## User Profile Page

### Profile View
- **Profile Header**: Contains user name and avatar
- **Profile Sections**: Bio, contact info, etc.
- **Edit Button**: Button to edit profile

### Profile Edit Form
- **Name Input**: `input[formcontrolname="name"]`
- **Bio Input**: `textarea[formcontrolname="bio"]` or similar
- **Save Button**: `page.getByRole('button', { name: 'Save' })` or similar
- **Cancel Button**: `page.getByRole('button', { name: 'Cancel' })`

### Username Availability Check
- **Username Input**: `input[formcontrolname="username"]`
- Real-time validation or check button
- **Availability Indicator**: Shows if username is available

---

## Experience Pages

### Experience Listing Page
- **Page URL**: `/experiences`
- **Experience Cards**: Similar to homepage cards
- **Pagination**: Page navigation controls
- **Filters**: Filter by type, category, etc.

### Experience Detail Page
- **Page URL**: `/experiences/{slug}`
- **Experience Title**: Main heading
- **Experience Description**: Full description
- **Price Display**: Ticket prices
- **Booking Button**: Button to book experience
- **Schedule Display**: Event schedule/calendar
- **Host Information**: Host details

### Experience Creation Form
- **Form URL**: `/hub/{hubId}/experiences/create` or similar
- **Title Input**: `input[formcontrolname="experienceTitle"]`
- **Description Input**: `textarea[formcontrolname="experienceDescription"]`
- **Type Select**: Dropdown for Virtual/Physical/Hybrid
- **Category Select**: Dropdown for experience category
- **Schedule Section**: Add recurring schedules
- **Ticket Section**: Add tickets
- **Save Button**: Save as draft or publish
- **Cancel Button**: Cancel creation

### Experience Edit Form
- Similar to creation form but pre-filled with existing data
- **Update Button**: Save changes
- **Delete Button**: Delete experience

---

## Search Functionality

### Search Input
- **Search Box**: `input[type="search"]` or `input[placeholder*="Search"]`
- **Search Button**: `button[type="submit"]` or search icon button

### Search Results Page
- **Page URL**: `/search?q={query}`
- **Results List**: List of search results
- **Result Cards**: Cards for experiences, experts, expertise
- **Filter Options**: Filter by type (experience, expert, expertise)
- **Empty State**: Message when no results found

---

## Error Handling Patterns

### Form Validation Errors
- **Error Message**: `span.error` or `span.error.error--warning`
- **Error Input Class**: `.form-wrapper__input.form-wrapper__input--error`
- **Invalid Input Class**: `.ng-invalid`
- **Error Text**: Specific error messages like "Email is invalid", "Wrong password. Try again"

### API Error Messages
- Displayed in toast notifications or inline error messages
- Error structure matches API error response

---

## Success Indicators

### Success Messages
- Toast notifications for successful actions
- Inline success messages
- Redirect to success page

### Loading States
- Loading spinners
- Disabled buttons during submission
- Skeleton loaders for content

---

## Navigation Patterns

### URL Patterns
- Homepage: `/`
- Login: `/login` or `/auth/login`
- Register: `/register` or `/sign-up`
- Profile: `/profile` or `/users/me`
- Experiences: `/experiences`
- Experience Detail: `/experiences/{slug}`
- Experts: `/experts`
- Expert Detail: `/experts/{slug}`
- Expertise: `/expertise`
- Search: `/search?q={query}`

### Navigation Elements
- Header navigation menu
- Footer links
- Breadcrumbs (if present)
- Back buttons

---

## Selector Strategy

### Preferred Selectors (in order)
1. **Role-based**: `page.getByRole('button', { name: 'Sign In' })`
2. **Text-based**: `page.getByText('Welcome')`
3. **Data attributes**: `page.locator('[ui-card-expert]')`
4. **CSS classes**: `page.locator('.ui-card-title')`
5. **Form controls**: `page.locator('input[formcontrolname="email"]')`

### Wait Strategies
- `page.waitForLoadState('networkidle')` - Wait for network to be idle
- `element.waitFor({ state: 'visible', timeout: 10000 })` - Wait for element visibility
- `expect(element).toBeVisible({ timeout: 10000 })` - Assert with timeout

---

## Test Data Requirements

### User Credentials
- Test email: `testingmereka01@gmail.com`
- Test password: `merekamereka`
- Unique emails: Use `generateUniqueEmail()` helper

### Test Content
- Experience titles: Use unique titles with timestamps
- Slugs: Generate unique slugs
- Hub IDs: Created dynamically

---

## Notes

- All selectors are based on existing E2E test patterns
- Some selectors may need adjustment based on actual UI
- Use flexible selectors with `.or()` for variations
- Always add appropriate timeouts for waits
- Document any observed differences from expected behavior

---

**Generated**: January 27, 2026  
**Based on**: Existing E2E tests and API test analysis
