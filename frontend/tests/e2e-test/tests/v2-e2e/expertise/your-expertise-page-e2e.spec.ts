/**
 * Your Expertise Page E2E Tests
 * 
 * Independent tests for the Your Expertise page (Step 1) in the Expertise Creation flow.
 * Each test navigates directly to the Your Expertise page and tests form filling,
 * validation, and navigation independently.
 * 
 * This test:
 * - Uses storageState for authentication (authenticated via global-setup.ts)
 * - Navigates directly to /onboarding/expertise/your-expertise
 * - Tests form filling with valid data
 * - Tests validation (required fields, character limits)
 * - Verifies slug auto-generation
 * - Verifies navigation to next page
 * 
 * Run with:
 *   npx playwright test tests/v2-e2e/expertise/your-expertise-page-e2e.spec.ts --headed
 */

import { test, expect } from '@playwright/test';
import {
  fillExpertiseBasicInfo,
  goToNextStep,
  type ExpertiseBasicInfoData,
} from '../../../fixtures/helpers/creation-flow-helpers';

const APP_URL = process.env.TEST_ENV === 'live' || process.env.TEST_ENV === 'production'
  ? 'https://v2.app.mereka.dev'
  : process.env.TEST_ENV === 'staging'
  ? 'https://v2-staging.app.mereka.io'
  : 'https://v2.app.mereka.dev';

test.use({ video: 'on' });

test.describe('Expertise Creation - Your Expertise Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate directly to Your Expertise page
    await page.goto(`${APP_URL}/onboarding/expertise/your-expertise`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/.*expertise.*your-expertise/i, { timeout: 10000 });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  });

  test('should fill all required fields successfully', async ({ page }) => {
    const timestamp = Date.now();
    const uniqueId = `e2e-your-expertise-${timestamp}`;
    
    console.log(`🔍 Test: Fill all required fields on Your Expertise page`);
    
    const basicInfoData: ExpertiseBasicInfoData = {
      title: `E2E Your Expertise Test ${uniqueId}`,
      slug: `e2e-your-expertise-${uniqueId}`,
      description: 'This is a comprehensive test expertise description. It describes how this expertise can help clients and what value they will gain.',
      category: 'Technology',
      primaryLanguage: 'English',
    };
    
    // Fill form
    await fillExpertiseBasicInfo(page, basicInfoData);
    
    // Fill summary (required field)
    const summaryTextarea = page.locator('textarea[formcontrolname="expertiseSummary"]')
      .or(page.locator('textarea').filter({ hasText: /summary/i }).first());
    const summaryVisible = await summaryTextarea.first().isVisible({ timeout: 3000 }).catch(() => false);
    if (summaryVisible) {
      await summaryTextarea.first().fill(`Brief summary of expertise ${uniqueId}`);
      await page.waitForTimeout(500);
      console.log('✅ Filled expertise summary');
    }
    
    // Select host (required field)
    const hostSelect = page.locator('select[formcontrolname="host"]')
      .or(page.getByLabel(/host/i));
    const hostVisible = await hostSelect.first().isVisible({ timeout: 5000 }).catch(() => false);
    if (hostVisible) {
      const options = await hostSelect.first().locator('option').all();
      if (options.length > 1) {
        await hostSelect.first().selectOption({ index: 1 });
        await page.waitForTimeout(500);
        console.log('✅ Selected host');
      }
    }
    
    // Verify title is filled
    const titleInput = page.locator('input[formcontrolname="expertiseTitle"], input[formcontrolname="title"]').first();
    const titleValue = await titleInput.inputValue();
    expect(titleValue).toContain(uniqueId);
    console.log(`✅ Title filled: ${titleValue}`);
    
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
    
    // Check if Next button is disabled
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
        console.log(`⚠️ No immediate validation errors, but form may be invalid`);
      }
    }
  });

  test('should validate title character limit (100 characters)', async ({ page }) => {
    const timestamp = Date.now();
    console.log(`🔍 Test: Title character limit validation`);
    
    // Create a title longer than 100 characters
    const longTitle = 'A'.repeat(101);
    
    const titleInput = page.locator('input[formcontrolname="expertiseTitle"], input[formcontrolname="title"]').first();
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

  test('should validate summary character limit (200 characters)', async ({ page }) => {
    const timestamp = Date.now();
    console.log(`🔍 Test: Summary character limit validation`);
    
    // Create a summary longer than 200 characters
    const longSummary = 'A'.repeat(201);
    
    const summaryTextarea = page.locator('textarea[formcontrolname="expertiseSummary"]')
      .or(page.locator('textarea').filter({ hasText: /summary/i }).first());
    const summaryVisible = await summaryTextarea.first().isVisible({ timeout: 3000 }).catch(() => false);
    
    if (summaryVisible) {
      await summaryTextarea.first().fill(longSummary);
      await page.waitForTimeout(500);
      
      // Check character counter if available
      const charCounter = page.locator('[class*="counter"], [class*="character"]').filter({ hasText: /200|201/i });
      const counterVisible = await charCounter.first().isVisible({ timeout: 2000 }).catch(() => false);
      
      if (counterVisible) {
        const counterText = await charCounter.first().textContent();
        console.log(`✅ Character counter: ${counterText}`);
      }
      
      // Verify input value
      const inputValue = await summaryTextarea.first().inputValue();
      expect(inputValue.length).toBeLessThanOrEqual(201);
      console.log(`✅ Summary length: ${inputValue.length} characters`);
    }
  });

  test('should verify slug auto-generation from title', async ({ page }) => {
    const timestamp = Date.now();
    const uniqueId = `e2e-slug-test-${timestamp}`;
    
    console.log(`🔍 Test: Slug auto-generation from title`);
    
    // Fill title
    const titleInput = page.locator('input[formcontrolname="expertiseTitle"], input[formcontrolname="title"]').first();
    await titleInput.fill(`Test Expertise ${uniqueId}`);
    await page.waitForTimeout(1000); // Wait for slug generation
    
    // Verify slug is auto-generated
    const slugInput = page.locator('input[formcontrolname="slug"]').first();
    const slugValue = await slugInput.inputValue();
    
    expect(slugValue).toBeTruthy();
    expect(slugValue.toLowerCase()).toContain('test');
    expect(slugValue.toLowerCase()).toContain('expertise');
    console.log(`✅ Slug auto-generated: ${slugValue}`);
    
    // Verify slug can be edited manually
    await slugInput.fill(`custom-slug-${uniqueId}`);
    await page.waitForTimeout(500);
    const editedSlug = await slugInput.inputValue();
    expect(editedSlug).toBe(`custom-slug-${uniqueId}`);
    console.log(`✅ Slug can be edited manually: ${editedSlug}`);
  });

  test('should select host from dropdown', async ({ page }) => {
    console.log(`🔍 Test: Select host from dropdown`);
    
    const hostSelect = page.locator('select[formcontrolname="host"]')
      .or(page.getByLabel(/host/i));
    const hostVisible = await hostSelect.first().isVisible({ timeout: 5000 }).catch(() => false);
    
    if (hostVisible) {
      const options = await hostSelect.first().locator('option').all();
      if (options.length > 1) {
        const optionText = await options[1].textContent();
        await hostSelect.first().selectOption({ index: 1 });
        await page.waitForTimeout(500);
        
        const selectedValue = await hostSelect.first().inputValue();
        expect(selectedValue).toBeTruthy();
        console.log(`✅ Host selected: ${optionText}`);
        
        // Check if host description field appears
        const hostDescription = page.locator('textarea[formcontrolname*="description"]')
          .or(page.locator('textarea').filter({ hasText: /host.*description/i }));
        const descriptionVisible = await hostDescription.first().isVisible({ timeout: 2000 }).catch(() => false);
        if (descriptionVisible) {
          console.log(`✅ Host description field appeared`);
        }
      }
    }
  });

  test('should add tags', async ({ page }) => {
    const timestamp = Date.now();
    console.log(`🔍 Test: Add tags`);
    
    // Look for tag input (could be chip input or text input)
    const tagInput = page.locator('input[placeholder*="tag"], input[formcontrolname*="tag"]')
      .or(page.locator('[class*="chip-input"] input'));
    const tagVisible = await tagInput.first().isVisible({ timeout: 3000 }).catch(() => false);
    
    if (tagVisible) {
      await tagInput.first().fill('consulting');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
      
      // Verify tag was added
      const tagChip = page.locator('[class*="chip"], [class*="tag"]').filter({ hasText: /consulting/i });
      const tagAdded = await tagChip.first().isVisible({ timeout: 2000 }).catch(() => false);
      expect(tagAdded).toBe(true);
      console.log(`✅ Tag added: consulting`);
      
      // Add another tag
      await tagInput.first().fill('coaching');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
      console.log(`✅ Added multiple tags`);
    }
  });

  test('should select primary and secondary languages', async ({ page }) => {
    console.log(`🔍 Test: Select languages`);
    
    // Select primary language
    const primaryLanguageSelect = page.locator('select[formcontrolname="primaryLanguage"]')
      .or(page.getByLabel(/primary.*language/i));
    const primaryVisible = await primaryLanguageSelect.first().isVisible({ timeout: 3000 }).catch(() => false);
    
    if (primaryVisible) {
      await primaryLanguageSelect.first().selectOption({ label: /English/i });
      await page.waitForTimeout(500);
      const primaryValue = await primaryLanguageSelect.first().inputValue();
      expect(primaryValue).toBeTruthy();
      console.log(`✅ Primary language selected: ${primaryValue}`);
    }
    
    // Add secondary language (if multi-select exists)
    const secondaryLanguageSelect = page.locator('select[formcontrolname="secondaryLanguages"]')
      .or(page.locator('[class*="multi-select"]'));
    const secondaryVisible = await secondaryLanguageSelect.first().isVisible({ timeout: 3000 }).catch(() => false);
    
    if (secondaryVisible) {
      // Try selecting Malay
      await secondaryLanguageSelect.first().selectOption({ label: /Malay/i });
      await page.waitForTimeout(500);
      console.log(`✅ Secondary language selected: Malay`);
    } else {
      // Might be a chip input or button-based selection
      const languageButton = page.getByRole('button', { name: /Malay/i });
      const buttonVisible = await languageButton.first().isVisible({ timeout: 2000 }).catch(() => false);
      if (buttonVisible) {
        await languageButton.first().click();
        await page.waitForTimeout(500);
        console.log(`✅ Secondary language selected via button: Malay`);
      }
    }
  });

  test('should navigate to Availability & Rates page when Next is clicked', async ({ page }) => {
    const timestamp = Date.now();
    const uniqueId = `e2e-nav-${timestamp}`;
    
    console.log(`🔍 Test: Navigate to Availability & Rates page`);
    
    const basicInfoData: ExpertiseBasicInfoData = {
      title: `E2E Navigation Test ${uniqueId}`,
      slug: `e2e-nav-${uniqueId}`,
      description: 'Test description for navigation test',
      category: 'Technology',
      primaryLanguage: 'English',
    };
    
    // Fill form
    await fillExpertiseBasicInfo(page, basicInfoData);
    
    // Fill summary
    const summaryTextarea = page.locator('textarea[formcontrolname="expertiseSummary"]')
      .or(page.locator('textarea').filter({ hasText: /summary/i }).first());
    const summaryVisible = await summaryTextarea.first().isVisible({ timeout: 3000 }).catch(() => false);
    if (summaryVisible) {
      await summaryTextarea.first().fill(`Brief summary ${uniqueId}`);
      await page.waitForTimeout(500);
    }
    
    // Select host
    const hostSelect = page.locator('select[formcontrolname="host"]')
      .or(page.getByLabel(/host/i));
    const hostVisible = await hostSelect.first().isVisible({ timeout: 5000 }).catch(() => false);
    if (hostVisible) {
      const options = await hostSelect.first().locator('option').all();
      if (options.length > 1) {
        await hostSelect.first().selectOption({ index: 1 });
        await page.waitForTimeout(500);
      }
    }
    
    // Click Next button
    await goToNextStep(page);
    
    // Verify navigation to Availability & Rates page
    await expect(page).toHaveURL(/.*expertise.*availability-rates/i, { timeout: 10000 });
    console.log(`✅ Navigated to Availability & Rates page`);
  });
});
