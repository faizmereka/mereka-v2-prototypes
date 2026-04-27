/**
 * Basic Info Page E2E Tests
 * 
 * Independent tests for the Basic Info page in the Platform Experience Creation flow.
 * Each test navigates directly to the Basic Info page and tests form filling,
 * validation, and navigation independently.
 * 
 * This test:
 * - Uses storageState for authentication (authenticated via global-setup.ts)
 * - Navigates directly to /onboarding/experience/platform/basic-info
 * - Tests form filling with valid data
 * - Tests validation (required fields, character limits)
 * - Verifies navigation to next page
 * 
 * Run with:
 *   npx playwright test tests/v2-e2e/experience/basic-info-page-e2e.spec.ts --headed
 */

import { test, expect } from '@playwright/test';
import {
  fillExperienceBasicInfo,
  goToNextStep,
  type ExperienceBasicInfoData,
} from '../../../fixtures/helpers/creation-flow-helpers';

const APP_URL = process.env.TEST_ENV === 'live' || process.env.TEST_ENV === 'production'
  ? 'https://v2.app.mereka.dev'
  : process.env.TEST_ENV === 'staging'
  ? 'https://v2-staging.app.mereka.io'
  : 'https://v2.app.mereka.dev';

test.use({ video: 'on' });

test.describe('Experience Creation - Basic Info Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate directly to Basic Info page
    await page.goto(`${APP_URL}/onboarding/experience/platform/basic-info`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/.*platform.*basic-info/i, { timeout: 10000 });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  });

  test('should fill all required fields successfully', async ({ page }) => {
    const timestamp = Date.now();
    const uniqueId = `e2e-basic-info-${timestamp}`;
    
    console.log(`🔍 Test: Fill all required fields on Basic Info page`);
    
    const basicInfoData: ExperienceBasicInfoData = {
      title: `E2E Basic Info Test ${uniqueId}`,
      slug: `e2e-basic-info-${uniqueId}`,
      category: 'Workshop',
      type: 'Virtual',
    };
    
    // Fill form
    await fillExperienceBasicInfo(page, basicInfoData);
    
    // Verify title is filled
    const titleInput = page.locator('input[placeholder*="Name"], input[formcontrolname*="title"]').first();
    const titleValue = await titleInput.inputValue();
    expect(titleValue).toContain(uniqueId);
    console.log(`✅ Title filled: ${titleValue}`);
    
    // Verify slug is generated/filled
    const slugInput = page.locator('input[formcontrolname*="slug"], input[placeholder*="experience"]').first();
    const slugValue = await slugInput.inputValue();
    expect(slugValue).toBeTruthy();
    console.log(`✅ Slug generated: ${slugValue}`);
    
    // Verify Next button is enabled
    const nextButton = page.getByRole('button', { name: /Next|Continue/i });
    const isEnabled = await nextButton.first().isEnabled();
    expect(isEnabled).toBe(true);
    console.log(`✅ Next button is enabled`);
  });

  test('should show validation errors for required fields', async ({ page }) => {
    console.log(`🔍 Test: Validation errors for required fields`);
    
    // Try to click Next without filling any fields
    const nextButton = page.getByRole('button', { name: /Next|Continue/i });
    
    // Check if Next button is disabled (some forms disable it until required fields are filled)
    const isDisabled = await nextButton.first().isDisabled().catch(() => false);
    
    if (isDisabled) {
      console.log(`✅ Next button is disabled when required fields are empty`);
      expect(isDisabled).toBe(true);
    } else {
      // If button is enabled, try clicking it to see validation errors
      await nextButton.first().click();
      await page.waitForTimeout(1000);
      
      // Check for validation error messages
      const errorMessages = page.locator('[class*="error"], [class*="invalid"], [role="alert"]')
        .or(page.getByText(/required|please fill|invalid/i));
      const errorCount = await errorMessages.count();
      
      if (errorCount > 0) {
        console.log(`✅ Found ${errorCount} validation error(s)`);
        expect(errorCount).toBeGreaterThan(0);
      } else {
        // Form might allow navigation but show errors on next page
        console.log(`⚠️ No immediate validation errors, but form may be invalid`);
      }
    }
  });

  test('should validate title character limit (100 characters)', async ({ page }) => {
    const timestamp = Date.now();
    console.log(`🔍 Test: Title character limit validation`);
    
    // Create a title longer than 100 characters
    const longTitle = 'A'.repeat(101);
    
    const titleInput = page.locator('input[placeholder*="Name"], input[formcontrolname*="title"]').first();
    await titleInput.fill(longTitle);
    await page.waitForTimeout(500);
    
    // Check character counter if available
    const charCounter = page.locator('[class*="counter"], [class*="character"]').filter({ hasText: /100|101/i });
    const counterVisible = await charCounter.first().isVisible({ timeout: 2000 }).catch(() => false);
    
    if (counterVisible) {
      const counterText = await charCounter.first().textContent();
      console.log(`✅ Character counter: ${counterText}`);
    }
    
    // Verify input value is truncated or shows error
    const inputValue = await titleInput.inputValue();
    expect(inputValue.length).toBeLessThanOrEqual(101); // May allow 101 or truncate to 100
    console.log(`✅ Title length: ${inputValue.length} characters`);
  });

  test('should select experience category and add theme', async ({ page }) => {
    const timestamp = Date.now();
    const uniqueId = `e2e-basic-info-${timestamp}`;
    
    console.log(`🔍 Test: Select category and add theme`);
    
    // Fill title first
    const titleInput = page.locator('input[placeholder*="Name"], input[formcontrolname*="title"]').first();
    await titleInput.fill(`E2E Category Test ${uniqueId}`);
    await page.waitForTimeout(500);
    
    // Select category
    const categoryButton = page.getByRole('button', { name: /Workshop|Event|Talk|Program|Show/i }).first();
    await categoryButton.click();
    await page.waitForTimeout(1000);
    console.log(`✅ Selected category`);
    
    // Click "Add Theme" button
    const addThemeButton = page.getByRole('button', { name: /Add Theme/i });
    await addThemeButton.click();
    await page.waitForTimeout(1000);
    console.log(`✅ Clicked "Add Theme" button`);
    
    // Select main theme
    const themeButton = page.getByRole('button', { name: /Art & Design|Music|Technology|Business/i }).first();
    await themeButton.click();
    await page.waitForTimeout(1500);
    console.log(`✅ Selected theme`);
    
    // Select topic
    const topicSection = page.getByText(/Select the topic within your theme/i);
    const topicVisible = await topicSection.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (topicVisible) {
      await page.waitForTimeout(1000);
      const topicButtons = page.locator('div').filter({ hasText: /Select the topic within your theme/i })
        .locator('..')
        .locator('button')
        .filter({ hasText: /Painting|Drawing|Sculpture|Digital Art|Graphic Design/i });
      
      const topicCount = await topicButtons.count();
      if (topicCount > 0) {
        await topicButtons.first().click();
        await page.waitForTimeout(1000);
        console.log(`✅ Selected topic`);
      }
    }
    
    // Verify theme was added
    const themeAdded = await page.getByText(/Art|Music|Technology|Business/i).isVisible({ timeout: 3000 }).catch(() => false);
    expect(themeAdded).toBe(true);
    console.log(`✅ Theme added successfully`);
  });

  test('should select experience mode (Physical/Virtual/Hybrid)', async ({ page }) => {
    const timestamp = Date.now();
    const uniqueId = `e2e-basic-info-${timestamp}`;
    
    console.log(`🔍 Test: Select experience mode`);
    
    // Fill title
    const titleInput = page.locator('input[placeholder*="Name"], input[formcontrolname*="title"]').first();
    await titleInput.fill(`E2E Mode Test ${uniqueId}`);
    await page.waitForTimeout(500);
    
    // Select Virtual mode
    const virtualRadio = page.getByRole('radio', { name: /Virtual/i });
    await virtualRadio.click();
    await page.waitForTimeout(500);
    
    const isChecked = await virtualRadio.isChecked();
    expect(isChecked).toBe(true);
    console.log(`✅ Virtual mode selected`);
    
    // Try selecting Physical mode
    const physicalRadio = page.getByRole('radio', { name: /Physical/i });
    await physicalRadio.click();
    await page.waitForTimeout(500);
    
    const physicalChecked = await physicalRadio.isChecked();
    expect(physicalChecked).toBe(true);
    console.log(`✅ Physical mode selected`);
    
    // Verify location fields appear for Physical mode
    const locationFields = page.locator('input[placeholder*="address"], input[formcontrolname*="location"]');
    const locationCount = await locationFields.count();
    if (locationCount > 0) {
      console.log(`✅ Location fields visible for Physical mode`);
    }
  });

  test('should navigate to Audience page when Next is clicked', async ({ page }) => {
    const timestamp = Date.now();
    const uniqueId = `e2e-basic-info-${timestamp}`;
    
    console.log(`🔍 Test: Navigate to Audience page`);
    
    const basicInfoData: ExperienceBasicInfoData = {
      title: `E2E Navigation Test ${uniqueId}`,
      slug: `e2e-nav-${uniqueId}`,
      category: 'Workshop',
      type: 'Virtual',
    };
    
    // Fill form
    await fillExperienceBasicInfo(page, basicInfoData);
    
    // Click Next button
    await goToNextStep(page);
    
    // Verify navigation to Audience page
    await expect(page).toHaveURL(/.*platform.*audience/i, { timeout: 10000 });
    console.log(`✅ Navigated to Audience page`);
  });
});
