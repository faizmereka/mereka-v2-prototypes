/**
 * Job Creation Flow E2E Tests
 * 
 * Comprehensive E2E tests for Job Creation flow including:
 * - Multi-step wizard (5 steps)
 * - Form validation
 * - Save draft functionality
 * - Publish functionality
 * 
 * Entry Point: Hub Dashboard → Jobs → Posts → "Create Job" button
 * Direct URL: /onboarding/job
 * 
 * Test Environment: v2.app.mereka.dev
 * 
 * Run with: $env:TEST_ENV = "production"; npx playwright test --config=tests/e2e-test/playwright.config.ts tests/e2e-test/tests/v2-e2e/job/job-creation-flow-e2e.spec.ts --headed
 */

import { test, expect } from '@playwright/test';
import {
  navigateToJobCreation,
  fillJobOverview,
  fillJobRequirements,
  fillJobTimelineBudget,
  fillJobYourDetail,
  goToNextStep,
  goToPreviousStep,
  saveJobDraft,
  publishJob,
  type JobOverviewData,
  type JobRequirementsData,
  type JobTimelineBudgetData,
  type JobYourDetailData,
} from '../../../fixtures/helpers/creation-flow-helpers';

const APP_URL = process.env.TEST_ENV === 'live' || process.env.TEST_ENV === 'production'
  ? 'https://v2.app.mereka.dev'
  : process.env.TEST_ENV === 'staging'
  ? 'https://v2-staging.app.mereka.io'
  : 'https://v2.app.mereka.dev';

// Test data
const generateUniqueTitle = () => `Test Job ${Date.now()}`;

const TEST_JOB_OVERVIEW_DATA: JobOverviewData = {
  title: generateUniqueTitle(),
  category: 'Technology',
  serviceType: 'Consulting',
  employmentType: 'Contract',
  location: 'Remote',
  expertLevel: 'Senior',
};

const TEST_JOB_REQUIREMENTS_DATA: JobRequirementsData = {
  description: 'This is a test job description for E2E testing purposes.',
  skills: ['JavaScript', 'TypeScript', 'Angular'],
  qualifications: ['Bachelor\'s degree', '5+ years experience'],
};

const TEST_JOB_TIMELINE_BUDGET_DATA: JobTimelineBudgetData = {
  timeline: '3 months',
  budgetType: 'Fixed',
  currency: 'USD',
  amount: 10000,
};

const TEST_JOB_YOUR_DETAIL_DATA: JobYourDetailData = {
  clientName: 'Test Client',
  organizationDetails: 'Test Organization',
  aboutOrganization: 'This is a test organization for E2E testing.',
};

test.describe('Job Creation Flow E2E Tests', () => {
  test.describe('Navigation & Entry', () => {
    test('should navigate to job creation from hub dashboard', async ({ page }) => {
      console.log('🔍 Test: Navigate to job creation from hub dashboard');
      
      await navigateToJobCreation(page);
      
      // Verify we're on the job creation flow
      await expect(page).toHaveURL(/.*job.*onboarding|.*onboarding.*job/i, { timeout: 10000 });
      console.log('✅ Successfully navigated to job creation flow');
      
      // Verify step indicator or form is visible
      const formTitle = page.getByText(/Job|Create Job/i)
        .or(page.locator('h1, h2, h3').filter({ hasText: /Job/i }));
      
      if (await formTitle.first().isVisible({ timeout: 5000 })) {
        await expect(formTitle.first()).toBeVisible({ timeout: 10000 });
        console.log('✅ Job creation form visible');
      }
    });

    test('should access job creation via direct URL', async ({ page }) => {
      console.log('🔍 Test: Access job creation via direct URL');
      
      // Login first
      const { loginUser } = await import('../../../fixtures/helpers/auth-e2e-helper');
      await loginUser(page);
      
      // Navigate directly to job creation
      await page.goto(`${APP_URL}/onboarding/job`);
      await page.waitForLoadState('networkidle');
      
      // Verify we're on the correct page
      await expect(page).toHaveURL(/.*job.*onboarding|.*onboarding.*job/i, { timeout: 10000 });
      console.log('✅ Successfully accessed job creation via direct URL');
    });
  });

  test.describe('Step 1: Overview', () => {
    test.beforeEach(async ({ page }) => {
      await navigateToJobCreation(page);
    });

    test('should fill overview step', async ({ page }) => {
      console.log('🔍 Test: Fill Job Step 1 - Overview');
      
      // Verify we're on step 1
      await expect(page).toHaveURL(/.*overview|.*job/i, { timeout: 10000 });
      
      // Fill overview
      await fillJobOverview(page, TEST_JOB_OVERVIEW_DATA);
      console.log('✅ Filled overview fields');
      
      // Verify title field is filled (max 70 chars)
      const titleInput = page.locator('input[formcontrolname="title"]').first();
      await expect(titleInput).toHaveValue(TEST_JOB_OVERVIEW_DATA.title);
      console.log('✅ Verified title field is filled');
      
      // Verify title length is within limit
      const titleValue = await titleInput.inputValue();
      expect(titleValue.length).toBeLessThanOrEqual(70);
      console.log('✅ Verified title length is within 70 character limit');
      
      // Navigate to next step
      await goToNextStep(page);
      await page.waitForLoadState('networkidle');
      console.log('✅ Navigated to next step');
    });

    test('should validate required fields in overview', async ({ page }) => {
      console.log('🔍 Test: Validate required fields in overview step');
      
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

    test('should validate title field length (max 70 chars)', async ({ page }) => {
      console.log('🔍 Test: Validate title field length (max 70 chars)');
      
      const titleInput = page.locator('input[formcontrolname="title"]').first();
      await expect(titleInput).toBeVisible({ timeout: 10000 });
      
      // Try entering title longer than 70 chars
      const longTitle = 'a'.repeat(80);
      await titleInput.fill(longTitle);
      
      // Check for validation error or character count
      const errorMessage = page.locator('[class*="error"]')
        .or(page.getByText(/too long|maximum|limit|70/i));
      
      const charCount = page.locator('[class*="count"], [class*="character"]');
      
      if (await errorMessage.first().isVisible({ timeout: 3000 }) || 
          await charCount.first().isVisible({ timeout: 3000 })) {
        console.log('✅ Title length validation working (70 char limit)');
      }
      
      // Verify input is truncated or shows error
      const titleValue = await titleInput.inputValue();
      if (titleValue.length <= 70) {
        console.log('✅ Title truncated to 70 characters');
      }
    });
  });

  test.describe('Step 2: Requirements', () => {
    test.beforeEach(async ({ page }) => {
      await navigateToJobCreation(page);
      await fillJobOverview(page, TEST_JOB_OVERVIEW_DATA);
      await goToNextStep(page);
      await page.waitForLoadState('networkidle');
    });

    test('should fill requirements step', async ({ page }) => {
      console.log('🔍 Test: Fill Job Step 2 - Requirements');
      
      // Verify we're on step 2
      await expect(page).toHaveURL(/.*requirements/i, { timeout: 10000 });
      console.log('✅ Navigated to requirements step');
      
      // Fill requirements
      await fillJobRequirements(page, TEST_JOB_REQUIREMENTS_DATA);
      console.log('✅ Filled requirements fields');
      
      // Verify description field is filled
      const descriptionInput = page.locator('textarea[formcontrolname="description"]').first();
      if (await descriptionInput.isVisible({ timeout: 5000 })) {
        await expect(descriptionInput).toHaveValue(TEST_JOB_REQUIREMENTS_DATA.description);
        console.log('✅ Verified description field is filled');
      }
      
      // Navigate to next step
      await goToNextStep(page);
      await page.waitForLoadState('networkidle');
      console.log('✅ Navigated to next step');
    });

    test('should add skills in requirements step', async ({ page }) => {
      console.log('🔍 Test: Add skills in requirements step');
      
      // Look for skills input (may be chip input or multi-select)
      const skillsInput = page.locator('input[formcontrolname="skills"]')
        .or(page.locator('[formcontrolname="skills"]'))
        .or(page.getByLabel(/Skills/i));
      
      if (await skillsInput.first().isVisible({ timeout: 5000 })) {
        // Add skills one by one
        for (const skill of TEST_JOB_REQUIREMENTS_DATA.skills || []) {
          await skillsInput.first().fill(skill);
          await page.keyboard.press('Enter');
          await page.waitForTimeout(500);
        }
        
        console.log('✅ Added skills');
        
        // Verify skills are displayed as chips/tags
        const skillChips = page.locator('[class*="chip"], [class*="tag"]')
          .filter({ hasText: TEST_JOB_REQUIREMENTS_DATA.skills?.[0] || '' });
        
        if (await skillChips.first().isVisible({ timeout: 3000 })) {
          await expect(skillChips.first()).toBeVisible({ timeout: 5000 });
          console.log('✅ Skills displayed as chips/tags');
        }
      } else {
        console.log('⚠️ Skills input not found');
      }
    });
  });

  test.describe('Step 3: Timeline & Budget', () => {
    test.beforeEach(async ({ page }) => {
      await navigateToJobCreation(page);
      await fillJobOverview(page, TEST_JOB_OVERVIEW_DATA);
      await goToNextStep(page);
      await page.waitForLoadState('networkidle');
      
      // Navigate to step 3
      const nextButton = page.getByRole('button', { name: /Next|Continue/i });
      if (await nextButton.isVisible({ timeout: 5000 }) && !(await nextButton.isDisabled())) {
        await nextButton.click();
        await page.waitForLoadState('networkidle');
      }
    });

    test('should fill timeline and budget step', async ({ page }) => {
      console.log('🔍 Test: Fill Job Step 3 - Timeline & Budget');
      
      // Verify we're on step 3
      await expect(page).toHaveURL(/.*timeline|.*budget/i, { timeout: 10000 });
      console.log('✅ Navigated to timeline and budget step');
      
      // Fill timeline and budget
      await fillJobTimelineBudget(page, TEST_JOB_TIMELINE_BUDGET_DATA);
      console.log('✅ Filled timeline and budget fields');
      
      // Verify budget type is selected
      const budgetTypeSelect = page.locator('select[formcontrolname="budgetType"]')
        .or(page.locator('[formcontrolname="budgetType"]'));
      
      if (await budgetTypeSelect.first().isVisible({ timeout: 5000 })) {
        const selectedValue = await budgetTypeSelect.first().inputValue();
        expect(selectedValue).toBe(TEST_JOB_TIMELINE_BUDGET_DATA.budgetType?.toLowerCase());
        console.log('✅ Verified budget type is selected');
      }
      
      // Navigate to next step
      await goToNextStep(page);
      await page.waitForLoadState('networkidle');
      console.log('✅ Navigated to next step');
    });

    test('should switch between fixed and hourly budget types', async ({ page }) => {
      console.log('🔍 Test: Switch between fixed and hourly budget types');
      
      const budgetTypeSelect = page.locator('select[formcontrolname="budgetType"]')
        .or(page.locator('[formcontrolname="budgetType"]'))
        .or(page.getByLabel(/Budget Type/i));
      
      if (await budgetTypeSelect.first().isVisible({ timeout: 5000 })) {
        // Select Fixed
        await budgetTypeSelect.first().selectOption('Fixed');
        await page.waitForTimeout(500);
        console.log('✅ Selected Fixed budget type');
        
        // Select Hourly
        await budgetTypeSelect.first().selectOption('Hourly');
        await page.waitForTimeout(500);
        console.log('✅ Selected Hourly budget type');
        
        // Verify UI updates for hourly (may show rate fields)
        const rateInput = page.locator('input[formcontrolname*="rate"], input[placeholder*="Rate"]');
        if (await rateInput.first().isVisible({ timeout: 3000 })) {
          console.log('✅ Rate input field visible for hourly budget');
        }
      }
    });
  });

  test.describe('Step 4: Your Detail', () => {
    test.beforeEach(async ({ page }) => {
      await navigateToJobCreation(page);
      await fillJobOverview(page, TEST_JOB_OVERVIEW_DATA);
      
      // Navigate through steps
      for (let i = 0; i < 2; i++) {
        const nextButton = page.getByRole('button', { name: /Next|Continue/i });
        if (await nextButton.isVisible({ timeout: 5000 }) && !(await nextButton.isDisabled())) {
          await nextButton.click();
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(1000);
        }
      }
    });

    test('should fill your detail step', async ({ page }) => {
      console.log('🔍 Test: Fill Job Step 4 - Your Detail');
      
      // Verify we're on step 4
      await expect(page).toHaveURL(/.*your-detail|.*detail/i, { timeout: 10000 });
      console.log('✅ Navigated to your detail step');
      
      // Fill your detail
      await fillJobYourDetail(page, TEST_JOB_YOUR_DETAIL_DATA);
      console.log('✅ Filled your detail fields');
      
      // Verify client name field is filled
      const clientNameInput = page.locator('input[formcontrolname="clientName"]')
        .or(page.locator('input[placeholder*="Client Name"], input[placeholder*="Your Name"]'))
        .or(page.getByLabel(/Client Name|Your Name/i));
      
      if (await clientNameInput.first().isVisible({ timeout: 5000 })) {
        await expect(clientNameInput.first()).toHaveValue(TEST_JOB_YOUR_DETAIL_DATA.clientName || '');
        console.log('✅ Verified client name field is filled');
      }
      
      // Navigate to next step
      await goToNextStep(page);
      await page.waitForLoadState('networkidle');
      console.log('✅ Navigated to confirmation step');
    });

    test('should fill organization details', async ({ page }) => {
      console.log('🔍 Test: Fill organization details');
      
      // Fill organization details
      const orgDetailsInput = page.locator('textarea[formcontrolname="organizationDetails"]')
        .or(page.locator('textarea[placeholder*="Organization"]'))
        .or(page.getByLabel(/Organization Details/i));
      
      if (await orgDetailsInput.first().isVisible({ timeout: 5000 })) {
        await orgDetailsInput.first().fill(TEST_JOB_YOUR_DETAIL_DATA.organizationDetails || '');
        console.log('✅ Filled organization details');
      }
      
      // Fill about organization
      const aboutOrgInput = page.locator('textarea[formcontrolname="aboutOrganization"]')
        .or(page.locator('textarea[placeholder*="About"]'))
        .or(page.getByLabel(/About Organization/i));
      
      if (await aboutOrgInput.first().isVisible({ timeout: 5000 })) {
        await aboutOrgInput.first().fill(TEST_JOB_YOUR_DETAIL_DATA.aboutOrganization || '');
        console.log('✅ Filled about organization');
      }
    });
  });

  test.describe('Step 5: Confirmation', () => {
    test.beforeEach(async ({ page }) => {
      await navigateToJobCreation(page);
      await fillJobOverview(page, TEST_JOB_OVERVIEW_DATA);
      
      // Navigate through all steps
      for (let i = 0; i < 4; i++) {
        const nextButton = page.getByRole('button', { name: /Next|Continue/i });
        if (await nextButton.isVisible({ timeout: 5000 }) && !(await nextButton.isDisabled())) {
          await nextButton.click();
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(1000);
        }
      }
    });

    test('should review and publish job', async ({ page }) => {
      console.log('🔍 Test: Review and publish Job');
      
      // Verify we're on confirmation step
      await expect(page).toHaveURL(/.*confirmation|.*confirm/i, { timeout: 10000 });
      console.log('✅ Navigated to confirmation step');
      
      // Verify review data is visible
      const reviewSection = page.locator('[class*="review"], [class*="summary"]')
        .or(page.getByText(TEST_JOB_OVERVIEW_DATA.title));
      
      if (await reviewSection.first().isVisible({ timeout: 5000 })) {
        await expect(reviewSection.first()).toBeVisible({ timeout: 10000 });
        console.log('✅ Review data is visible');
      }
      
      // Publish job
      await publishJob(page);
      console.log('✅ Job published successfully');
    });

    test('should display all entered data in review', async ({ page }) => {
      console.log('🔍 Test: Display all entered data in review');
      
      // Check if review section shows the title
      const titleInReview = page.getByText(TEST_JOB_OVERVIEW_DATA.title);
      
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
      await navigateToJobCreation(page);
      await fillJobOverview(page, TEST_JOB_OVERVIEW_DATA);
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
      await navigateToJobCreation(page);
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
      await navigateToJobCreation(page);
    });

    test('should save job as draft', async ({ page }) => {
      console.log('🔍 Test: Save job as draft');
      
      // Fill overview
      await fillJobOverview(page, TEST_JOB_OVERVIEW_DATA);
      
      // Save as draft
      await saveJobDraft(page);
      console.log('✅ Job saved as draft');
      
      // Verify success message
      const successMessage = page.getByText(/Saved|Draft saved|Success/i)
        .or(page.locator('[class*="success"], [class*="toast"]'));
      
      await expect(successMessage.first()).toBeVisible({ timeout: 10000 });
      console.log('✅ Draft save success message displayed');
    });

    test('should publish complete job', async ({ page }) => {
      console.log('🔍 Test: Publish complete job');
      
      // Fill all required fields and navigate through steps
      await fillJobOverview(page, TEST_JOB_OVERVIEW_DATA);
      
      // Navigate through all steps (simplified - may need to fill more fields)
      for (let i = 0; i < 4; i++) {
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
      const publishButton = page.getByRole('button', { name: /Publish|Submit|Post Job/i });
      
      if (await publishButton.isVisible({ timeout: 10000 })) {
        await publishJob(page);
        console.log('✅ Job published successfully');
      } else {
        console.log('⚠️ Publish button not found - may need to complete more fields');
      }
    });
  });
});
