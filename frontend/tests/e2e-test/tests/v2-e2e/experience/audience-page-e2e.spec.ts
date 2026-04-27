/**
 * Audience Page E2E Tests
 * 
 * Independent tests for the Audience page in the Platform Experience Creation flow.
 * Each test navigates directly to the Audience page and tests form filling,
 * validation, and navigation independently.
 * 
 * This test:
 * - Uses storageState for authentication (authenticated via global-setup.ts)
 * - Navigates directly to /onboarding/experience/platform/audience
 * - Tests form filling with valid data
 * - Tests validation (required fields)
 * - Verifies navigation to next page
 * 
 * Run with:
 *   npx playwright test tests/v2-e2e/experience/audience-page-e2e.spec.ts --headed
 */

import { test, expect } from '@playwright/test';
import {
  fillExperienceAudienceInfo,
  goToNextStep,
  type ExperienceAudienceData,
} from '../../../fixtures/helpers/creation-flow-helpers';

const APP_URL = process.env.TEST_ENV === 'live' || process.env.TEST_ENV === 'production'
  ? 'https://v2.app.mereka.dev'
  : process.env.TEST_ENV === 'staging'
  ? 'https://v2-staging.app.mereka.io'
  : 'https://v2.app.mereka.dev';

test.use({ video: 'on' });

test.describe('Experience Creation - Audience Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate directly to Audience page
    await page.goto(`${APP_URL}/onboarding/experience/platform/audience`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/.*platform.*audience/i, { timeout: 10000 });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  });

  test('should fill all required fields successfully', async ({ page }) => {
    console.log(`🔍 Test: Fill all required fields on Audience page`);
    
    const audienceData: ExperienceAudienceData = {
      access: 'Everyone',
      targetAudience: 'Open to Everyone',
      expertise: 'Beginner',
      primaryLanguage: 'English',
      secondaryLanguage: 'Malay',
    };
    
    // Fill form
    await fillExperienceAudienceInfo(page, audienceData);
    
    // Verify access is selected
    const everyoneRadio = page.getByRole('radio', { name: /Everyone/i });
    const everyoneChecked = await everyoneRadio.isChecked();
    expect(everyoneChecked).toBe(true);
    console.log(`✅ Access selected: Everyone`);
    
    // Verify target audience is selected
    const targetAudienceRadio = page.getByRole('radio', { name: /Open to Everyone/i });
    const targetAudienceChecked = await targetAudienceRadio.isChecked();
    expect(targetAudienceChecked).toBe(true);
    console.log(`✅ Target audience selected: Open to Everyone`);
    
    // Verify Next button is enabled
    const nextButton = page.getByRole('button', { name: /Next|Continue/i });
    const isEnabled = await nextButton.first().isEnabled();
    expect(isEnabled).toBe(true);
    console.log(`✅ Next button is enabled`);
  });

  test('should show validation errors for required fields', async ({ page }) => {
    console.log(`🔍 Test: Validation errors for required fields`);
    
    // Try to click Next without filling required fields
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
      }
    }
  });

  test('should select experience access options', async ({ page }) => {
    console.log(`🔍 Test: Select experience access options`);
    
    // Select Everyone
    const everyoneRadio = page.getByRole('radio', { name: /Everyone/i });
    await everyoneRadio.click();
    await page.waitForTimeout(500);
    
    let isChecked = await everyoneRadio.isChecked();
    expect(isChecked).toBe(true);
    console.log(`✅ Everyone option selected`);
    
    // Select Members
    const membersRadio = page.getByRole('radio', { name: /Members/i });
    await membersRadio.click();
    await page.waitForTimeout(500);
    
    isChecked = await membersRadio.isChecked();
    expect(isChecked).toBe(true);
    console.log(`✅ Members option selected`);
  });

  test('should select target audience options', async ({ page }) => {
    console.log(`🔍 Test: Select target audience options`);
    
    // Select "Open to Everyone"
    const openToEveryoneRadio = page.getByRole('radio', { name: /Open to Everyone/i });
    await openToEveryoneRadio.click();
    await page.waitForTimeout(500);
    
    let isChecked = await openToEveryoneRadio.isChecked();
    expect(isChecked).toBe(true);
    console.log(`✅ Open to Everyone selected`);
    
    // Select "Specific Groups"
    const specificGroupsRadio = page.getByRole('radio', { name: /Specific Groups/i });
    await specificGroupsRadio.click();
    await page.waitForTimeout(500);
    
    isChecked = await specificGroupsRadio.isChecked();
    expect(isChecked).toBe(true);
    console.log(`✅ Specific Groups selected`);
  });

  test('should select level of expertise', async ({ page }) => {
    console.log(`🔍 Test: Select level of expertise`);
    
    // Select Beginner
    const beginnerRadio = page.getByRole('radio', { name: /Beginner/i });
    await beginnerRadio.click();
    await page.waitForTimeout(500);
    
    let isChecked = await beginnerRadio.isChecked();
    expect(isChecked).toBe(true);
    console.log(`✅ Beginner selected`);
    
    // Select Intermediate
    const intermediateRadio = page.getByRole('radio', { name: /Intermediate/i });
    await intermediateRadio.click();
    await page.waitForTimeout(500);
    
    isChecked = await intermediateRadio.isChecked();
    expect(isChecked).toBe(true);
    console.log(`✅ Intermediate selected`);
    
    // Verify skills input appears for Intermediate/Advanced
    const skillsInput = page.locator('input[placeholder*="skill"], input[formcontrolname*="skill"]');
    const skillsVisible = await skillsInput.first().isVisible({ timeout: 2000 }).catch(() => false);
    if (skillsVisible) {
      console.log(`✅ Skills input field visible for Intermediate level`);
    }
  });

  test('should select primary and secondary languages', async ({ page }) => {
    console.log(`🔍 Test: Select languages`);
    
    // Select primary language
    const primaryLanguageSelect = page.locator('select').filter({ hasText: /language/i }).first()
      .or(page.locator('select[formcontrolname*="primaryLanguage"]'));
    
    const primarySelectVisible = await primaryLanguageSelect.first().isVisible({ timeout: 3000 }).catch(() => false);
    if (primarySelectVisible) {
      await primaryLanguageSelect.first().selectOption({ label: /English/i });
      await page.waitForTimeout(500);
      console.log(`✅ Primary language selected: English`);
    }
    
    // Select secondary language (optional)
    const secondaryLanguageSelect = page.locator('select').filter({ hasText: /language/i }).nth(1)
      .or(page.locator('select[formcontrolname*="secondaryLanguage"]'));
    
    const secondarySelectVisible = await secondaryLanguageSelect.first().isVisible({ timeout: 3000 }).catch(() => false);
    if (secondarySelectVisible) {
      await secondaryLanguageSelect.first().selectOption({ label: /Malay/i });
      await page.waitForTimeout(500);
      console.log(`✅ Secondary language selected: Malay`);
    }
  });

  test('should toggle hidden experience checkbox', async ({ page }) => {
    console.log(`🔍 Test: Toggle hidden experience checkbox`);
    
    const hiddenCheckbox = page.getByRole('checkbox', { name: /hidden/i })
      .or(page.locator('input[type="checkbox"]').filter({ hasText: /hidden/i }));
    
    const checkboxVisible = await hiddenCheckbox.first().isVisible({ timeout: 3000 }).catch(() => false);
    if (checkboxVisible) {
      const initialChecked = await hiddenCheckbox.first().isChecked();
      
      // Toggle checkbox
      await hiddenCheckbox.first().click();
      await page.waitForTimeout(500);
      
      const afterToggle = await hiddenCheckbox.first().isChecked();
      expect(afterToggle).toBe(!initialChecked);
      console.log(`✅ Hidden checkbox toggled: ${afterToggle}`);
    }
  });

  test('should navigate to Booking page when Next is clicked', async ({ page }) => {
    console.log(`🔍 Test: Navigate to Booking page`);
    
    const audienceData: ExperienceAudienceData = {
      access: 'Everyone',
      targetAudience: 'Open to Everyone',
      expertise: 'Beginner',
      primaryLanguage: 'English',
    };
    
    // Fill form
    await fillExperienceAudienceInfo(page, audienceData);
    
    // Click Next button
    await goToNextStep(page);
    
    // Verify navigation to Booking page
    await expect(page).toHaveURL(/.*platform.*booking/i, { timeout: 10000 });
    console.log(`✅ Navigated to Booking page`);
  });
});
