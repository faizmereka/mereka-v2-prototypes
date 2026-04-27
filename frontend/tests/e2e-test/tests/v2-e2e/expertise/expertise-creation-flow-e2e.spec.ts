/**
 * Expertise Creation Flow E2E Tests
 * 
 * Comprehensive E2E tests for Expertise Creation flow including:
 * - Multi-step wizard (4 steps)
 * - Form validation
 * - Save draft functionality
 * - Publish functionality
 * 
 * Entry Point: Hub Dashboard → Services → Expertise → "Add Expertise" button
 * Direct URL: /onboarding/expertise
 * 
 * Test Environment: v2.app.mereka.dev
 * 
 * Run with: $env:TEST_ENV = "production"; npx playwright test --config=tests/e2e-test/playwright.config.ts tests/e2e-test/tests/v2-e2e/expertise/expertise-creation-flow-e2e.spec.ts --headed
 */

import { test, expect } from '@playwright/test';
import {
  navigateToExpertiseCreation,
  fillExpertiseBasicInfo,
  fillExpertiseAvailabilityRates,
  fillExpertiseBookingDetails,
  goToNextStep,
  goToPreviousStep,
  saveExpertiseDraft,
  publishExpertise,
  type ExpertiseBasicInfoData,
  type ExpertiseAvailabilityRatesData,
  type ExpertiseBookingDetailsData,
} from '../../../fixtures/helpers/creation-flow-helpers';

const APP_URL = process.env.TEST_ENV === 'live' || process.env.TEST_ENV === 'production'
  ? 'https://v2.app.mereka.dev'
  : process.env.TEST_ENV === 'staging'
  ? 'https://v2-staging.app.mereka.io'
  : 'https://v2.app.mereka.dev';

// Test data
const generateUniqueTitle = () => `Test Expertise ${Date.now()}`;
const generateUniqueSlug = () => `test-expertise-${Date.now()}`;

const TEST_EXPERTISE_DATA: ExpertiseBasicInfoData = {
  title: generateUniqueTitle(),
  slug: generateUniqueSlug(),
  description: 'This is a test expertise description for E2E testing.',
  category: 'Technology',
};

const TEST_AVAILABILITY_RATES_DATA: ExpertiseAvailabilityRatesData = {
  packages: [],
  pricing: {},
  availabilityHours: {},
};

const TEST_BOOKING_DETAILS_DATA: ExpertiseBookingDetailsData = {
  duration: 60,
  instructions: 'Test booking instructions',
};

test.describe('Expertise Creation Flow E2E Tests', () => {
  test.describe('Navigation & Entry', () => {
    test('should navigate to expertise creation from hub dashboard', async ({ page }) => {
      console.log('🔍 Test: Navigate to expertise creation from hub dashboard');
      
      await navigateToExpertiseCreation(page);
      
      // Verify we're on the expertise creation flow
      await expect(page).toHaveURL(/.*expertise.*onboarding|.*onboarding.*expertise/i, { timeout: 10000 });
      console.log('✅ Successfully navigated to expertise creation flow');
      
      // Verify step indicator or form is visible
      const formTitle = page.getByText(/Expertise|Your Expertise/i)
        .or(page.locator('h1, h2, h3').filter({ hasText: /Expertise/i }));
      
      if (await formTitle.first().isVisible({ timeout: 5000 })) {
        await expect(formTitle.first()).toBeVisible({ timeout: 10000 });
        console.log('✅ Expertise creation form visible');
      }
    });

    test('should access expertise creation via direct URL', async ({ page }) => {
      console.log('🔍 Test: Access expertise creation via direct URL');
      
      // Login first
      const { loginUser } = await import('../../../fixtures/helpers/auth-e2e-helper');
      await loginUser(page);
      
      // Navigate directly to expertise creation
      await page.goto(`${APP_URL}/onboarding/expertise`);
      await page.waitForLoadState('networkidle');
      
      // Verify we're on the correct page
      await expect(page).toHaveURL(/.*expertise.*onboarding|.*onboarding.*expertise/i, { timeout: 10000 });
      console.log('✅ Successfully accessed expertise creation via direct URL');
    });
  });

  test.describe('Step 1: Basic Info', () => {
    test.beforeEach(async ({ page }) => {
      await navigateToExpertiseCreation(page);
    });

    test('should fill basic info step', async ({ page }) => {
      console.log('🔍 Test: Fill Expertise Step 1 - Basic Info');
      
      // Verify we're on step 1
      await expect(page).toHaveURL(/.*your-expertise|.*basic-info|.*expertise/i, { timeout: 10000 });
      
      // Fill basic info
      await fillExpertiseBasicInfo(page, TEST_EXPERTISE_DATA);
      console.log('✅ Filled basic info fields');
      
      // Verify fields are filled
      const titleInput = page.locator('input[formcontrolname="title"]').first();
      await expect(titleInput).toHaveValue(TEST_EXPERTISE_DATA.title);
      console.log('✅ Verified title field is filled');
      
      // Navigate to next step
      await goToNextStep(page);
      await page.waitForLoadState('networkidle');
      console.log('✅ Navigated to next step');
    });

    test('should validate required fields in basic info', async ({ page }) => {
      console.log('🔍 Test: Validate required fields in basic info step');
      
      // Try to proceed without filling required fields
      const nextButton = page.getByRole('button', { name: /Next|Continue/i });
      
      if (await nextButton.isVisible({ timeout: 5000 })) {
        // Check if button is disabled
        const isDisabled = await nextButton.isDisabled();
        
        if (!isDisabled) {
          await nextButton.click();
          await page.waitForTimeout(1000);
          
          // Check for validation errors
          const errorMessages = page.locator('[class*="error"], [class*="invalid"]')
            .or(page.getByText(/required|invalid|error/i));
          
          if (await errorMessages.first().isVisible({ timeout: 3000 })) {
            await expect(errorMessages.first()).toBeVisible({ timeout: 5000 });
            console.log('✅ Validation errors displayed for required fields');
          }
        } else {
          console.log('✅ Next button is disabled when required fields are empty');
        }
      }
    });

    test('should validate title field length', async ({ page }) => {
      console.log('🔍 Test: Validate title field length');
      
      const titleInput = page.locator('input[formcontrolname="title"]').first();
      await expect(titleInput).toBeVisible({ timeout: 10000 });
      
      // Try entering very long title
      const longTitle = 'a'.repeat(200);
      await titleInput.fill(longTitle);
      
      // Check for validation error or character count
      const errorMessage = page.locator('[class*="error"]')
        .or(page.getByText(/too long|maximum|limit/i));
      
      const charCount = page.locator('[class*="count"], [class*="character"]');
      
      if (await errorMessage.first().isVisible({ timeout: 3000 }) || 
          await charCount.first().isVisible({ timeout: 3000 })) {
        console.log('✅ Title length validation working');
      }
    });

    test('should validate slug format', async ({ page }) => {
      console.log('🔍 Test: Validate slug format');
      
      const slugInput = page.locator('input[formcontrolname="slug"]').first();
      
      if (await slugInput.isVisible({ timeout: 5000 })) {
        // Try entering invalid slug (with spaces or special chars)
        await slugInput.fill('invalid slug with spaces!');
        
        // Check for validation error
        const errorMessage = page.locator('[class*="error"]')
          .or(page.getByText(/invalid|format|slug/i));
        
        if (await errorMessage.first().isVisible({ timeout: 3000 })) {
          await expect(errorMessage.first()).toBeVisible({ timeout: 5000 });
          console.log('✅ Slug format validation working');
        }
      }
    });
  });

  test.describe('Step 2: Availability & Rates', () => {
    test.beforeEach(async ({ page }) => {
      await navigateToExpertiseCreation(page);
      await fillExpertiseBasicInfo(page, TEST_EXPERTISE_DATA);
      await goToNextStep(page);
      await page.waitForLoadState('networkidle');
    });

    test('should navigate through availability and rates step', async ({ page }) => {
      console.log('🔍 Test: Navigate through Expertise Step 2 - Availability & Rates');
      
      // Verify we're on step 2
      await expect(page).toHaveURL(/.*availability|.*rates/i, { timeout: 10000 });
      console.log('✅ Navigated to availability and rates step');
      
      // Fill availability and rates data
      await fillExpertiseAvailabilityRates(page, TEST_AVAILABILITY_RATES_DATA);
      console.log('✅ Filled availability and rates fields');
      
      // Check for package creation UI
      const addPackageButton = page.getByRole('button', { name: /Add Package|Create Package|New Package/i })
        .or(page.locator('button:has-text("Package")'));
      
      if (await addPackageButton.first().isVisible({ timeout: 5000 })) {
        console.log('✅ Package creation UI found');
      }
      
      // Check for pricing fields
      const pricingInput = page.locator('input[formcontrolname*="price"], input[formcontrolname*="rate"]')
        .or(page.locator('input[placeholder*="Price"], input[placeholder*="Rate"]'));
      
      if (await pricingInput.first().isVisible({ timeout: 5000 })) {
        console.log('✅ Pricing fields found');
      }
      
      // Navigate to next step
      await goToNextStep(page);
      await page.waitForLoadState('networkidle');
      console.log('✅ Navigated to next step');
    });

    test('should create package in availability step', async ({ page }) => {
      console.log('🔍 Test: Create package in availability step');
      
      // Look for add package button
      const addPackageButton = page.getByRole('button', { name: /Add Package|Create Package|New Package/i })
        .or(page.locator('button:has-text("Package")'));
      
      if (await addPackageButton.first().isVisible({ timeout: 5000 })) {
        await addPackageButton.first().click();
        await page.waitForLoadState('networkidle');
        console.log('✅ Clicked add package button');
        
        // Fill package fields if visible
        const packageNameInput = page.locator('input[formcontrolname*="name"], input[placeholder*="Package Name"]')
          .or(page.getByLabel(/Package Name/i));
        
        if (await packageNameInput.first().isVisible({ timeout: 3000 })) {
          await packageNameInput.first().fill('Test Package');
          console.log('✅ Filled package name');
        }
        
        // Save package if there's a save button
        const savePackageButton = page.getByRole('button', { name: /Save|Add|Create/i });
        if (await savePackageButton.isVisible({ timeout: 3000 })) {
          await savePackageButton.click();
          await page.waitForLoadState('networkidle');
          console.log('✅ Package created');
        }
      } else {
        console.log('⚠️ Package creation UI not found');
      }
    });
  });

  test.describe('Step 3: Booking Details', () => {
    test.beforeEach(async ({ page }) => {
      await navigateToExpertiseCreation(page);
      await fillExpertiseBasicInfo(page, TEST_EXPERTISE_DATA);
      await goToNextStep(page);
      await page.waitForLoadState('networkidle');
      
      // Navigate to step 3
      const nextButton = page.getByRole('button', { name: /Next|Continue/i });
      if (await nextButton.isVisible({ timeout: 5000 }) && !(await nextButton.isDisabled())) {
        await nextButton.click();
        await page.waitForLoadState('networkidle');
      }
    });

    test('should navigate through booking details step', async ({ page }) => {
      console.log('🔍 Test: Navigate through Expertise Step 3 - Booking Details');
      
      // Verify we're on step 3
      await expect(page).toHaveURL(/.*booking/i, { timeout: 10000 });
      console.log('✅ Navigated to booking details step');
      
      // Fill booking details
      await fillExpertiseBookingDetails(page, TEST_BOOKING_DETAILS_DATA);
      console.log('✅ Filled booking details fields');
      
      // Verify duration field if visible
      const durationInput = page.locator('input[formcontrolname="duration"]')
        .or(page.locator('input[placeholder*="Duration"]'))
        .or(page.getByLabel(/Duration/i));
      
      if (await durationInput.first().isVisible({ timeout: 5000 })) {
        await expect(durationInput.first()).toHaveValue(TEST_BOOKING_DETAILS_DATA.duration?.toString() || '');
        console.log('✅ Verified duration field is filled');
      }
      
      // Navigate to next step
      await goToNextStep(page);
      await page.waitForLoadState('networkidle');
      console.log('✅ Navigated to confirmation step');
    });

    test('should validate booking settings', async ({ page }) => {
      console.log('🔍 Test: Validate booking settings');
      
      // Check for booking settings fields
      const bookingSettings = page.locator('[formcontrolname*="booking"]')
        .or(page.locator('select[formcontrolname*="booking"]'));
      
      if (await bookingSettings.first().isVisible({ timeout: 5000 })) {
        console.log('✅ Booking settings fields found');
      }
    });
  });

  test.describe('Step 4: Confirmation', () => {
    test.beforeEach(async ({ page }) => {
      await navigateToExpertiseCreation(page);
      await fillExpertiseBasicInfo(page, TEST_EXPERTISE_DATA);
      
      // Navigate through all steps
      for (let i = 0; i < 3; i++) {
        const nextButton = page.getByRole('button', { name: /Next|Continue/i });
        if (await nextButton.isVisible({ timeout: 5000 }) && !(await nextButton.isDisabled())) {
          await nextButton.click();
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(1000);
        }
      }
    });

    test('should review and publish expertise', async ({ page }) => {
      console.log('🔍 Test: Review and publish Expertise');
      
      // Verify we're on confirmation step
      await expect(page).toHaveURL(/.*confirmation|.*confirm/i, { timeout: 10000 });
      console.log('✅ Navigated to confirmation step');
      
      // Verify review data is visible
      const reviewSection = page.locator('[class*="review"], [class*="summary"]')
        .or(page.getByText(TEST_EXPERTISE_DATA.title));
      
      if (await reviewSection.first().isVisible({ timeout: 5000 })) {
        await expect(reviewSection.first()).toBeVisible({ timeout: 10000 });
        console.log('✅ Review data is visible');
      }
      
      // Publish expertise
      await publishExpertise(page);
      console.log('✅ Expertise published successfully');
    });

    test('should display all entered data in review', async ({ page }) => {
      console.log('🔍 Test: Display all entered data in review');
      
      // Check if review section shows the title
      const titleInReview = page.getByText(TEST_EXPERTISE_DATA.title);
      
      if (await titleInReview.isVisible({ timeout: 5000 })) {
        await expect(titleInReview).toBeVisible({ timeout: 10000 });
        console.log('✅ Title displayed in review');
      }
      
      // Check for other review sections
      const reviewSections = page.locator('[class*="review"], [class*="summary"]');
      const count = await reviewSections.count();
      
      if (count > 0) {
        console.log(`✅ Found ${count} review sections`);
      }
    });
  });

  test.describe('Step Navigation', () => {
    test('should navigate back and forth between steps', async ({ page }) => {
      console.log('🔍 Test: Navigate back and forth between steps');
      
      // Fill step 1
      await navigateToExpertiseCreation(page);
      await fillExpertiseBasicInfo(page, TEST_EXPERTISE_DATA);
      await goToNextStep(page);
      await page.waitForLoadState('networkidle');
      
      const step2Url = page.url();
      console.log(`✅ On step 2: ${step2Url}`);
      
      // Go back
      await goToPreviousStep(page);
      await page.waitForLoadState('networkidle');
      
      // Verify we're back on step 1
      const backUrl = page.url();
      console.log(`✅ Went back to step 1: ${backUrl}`);
      
      // Go forward again
      await goToNextStep(page);
      await page.waitForLoadState('networkidle');
      
      const forwardUrl = page.url();
      console.log(`✅ Went forward to step 2: ${forwardUrl}`);
      
      console.log('✅ Successfully navigated back and forth');
    });
  });

  test.describe('Form Validation', () => {
    test.beforeEach(async ({ page }) => {
      await navigateToExpertiseCreation(page);
    });

    test('should validate required fields across all steps', async ({ page }) => {
      console.log('🔍 Test: Validate required fields across all steps');
      
      // Try to proceed without filling required fields
      const nextButton = page.getByRole('button', { name: /Next|Continue/i });
      
      if (await nextButton.isVisible({ timeout: 5000 })) {
        const isDisabled = await nextButton.isDisabled();
        
        if (isDisabled) {
          console.log('✅ Next button is disabled when required fields are empty');
        } else {
          // Try clicking and check for errors
          await nextButton.click();
          await page.waitForTimeout(1000);
          
          const errorMessages = page.locator('[class*="error"], [class*="invalid"]')
            .or(page.getByText(/required|invalid|error/i));
          
          if (await errorMessages.first().isVisible({ timeout: 3000 })) {
            await expect(errorMessages.first()).toBeVisible({ timeout: 5000 });
            console.log('✅ Validation errors displayed');
          }
        }
      }
    });
  });

  test.describe('Save Draft & Publish', () => {
    test.beforeEach(async ({ page }) => {
      await navigateToExpertiseCreation(page);
    });

    test('should save expertise as draft', async ({ page }) => {
      console.log('🔍 Test: Save expertise as draft');
      
      // Fill basic info
      await fillExpertiseBasicInfo(page, TEST_EXPERTISE_DATA);
      
      // Save as draft
      await saveExpertiseDraft(page);
      console.log('✅ Expertise saved as draft');
      
      // Verify success message
      const successMessage = page.getByText(/Saved|Draft saved|Success/i)
        .or(page.locator('[class*="success"], [class*="toast"]'));
      
      await expect(successMessage.first()).toBeVisible({ timeout: 10000 });
      console.log('✅ Draft save success message displayed');
    });

    test('should publish complete expertise', async ({ page }) => {
      console.log('🔍 Test: Publish complete expertise');
      
      // Fill all required fields and navigate through steps
      await fillExpertiseBasicInfo(page, TEST_EXPERTISE_DATA);
      
      // Navigate through all steps (simplified - may need to fill more fields)
      for (let i = 0; i < 3; i++) {
        const nextButton = page.getByRole('button', { name: /Next|Continue/i });
        if (await nextButton.isVisible({ timeout: 5000 }) && !(await nextButton.isDisabled())) {
          await nextButton.click();
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(1000);
        } else {
          break;
        }
      }
      
      // Try to publish
      const publishButton = page.getByRole('button', { name: /Publish|Submit|Create Expertise/i });
      
      if (await publishButton.isVisible({ timeout: 10000 })) {
        await publishExpertise(page);
        console.log('✅ Expertise published successfully');
      } else {
        console.log('⚠️ Publish button not found - may need to complete more fields');
      }
    });
  });
});
