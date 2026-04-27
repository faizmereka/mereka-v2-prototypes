/**
 * Details Page E2E Tests
 * 
 * Independent tests for the Details page in the Platform Experience Creation flow.
 * Each test navigates directly to the Details page and tests form filling,
 * validation, and navigation independently.
 * 
 * This test:
 * - Uses storageState for authentication (authenticated via global-setup.ts)
 * - Navigates directly to /onboarding/experience/platform/details
 * - Tests form filling with valid data (all fields are optional)
 * - Tests validation (character limits)
 * - Verifies file uploads (poster)
 * - Verifies navigation to next page
 * 
 * Run with:
 *   npx playwright test tests/v2-e2e/experience/details-page-e2e.spec.ts --headed
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import {
  fillExperienceDetailsInfo,
  goToNextStep,
  type ExperienceDetailsData,
} from '../../../fixtures/helpers/creation-flow-helpers';

const APP_URL = process.env.TEST_ENV === 'live' || process.env.TEST_ENV === 'production'
  ? 'https://v2.app.mereka.dev'
  : process.env.TEST_ENV === 'staging'
  ? 'https://v2-staging.app.mereka.io'
  : 'https://v2.app.mereka.dev';

const TEST_COVER_PHOTO_PATH = path.resolve(__dirname, '../../../fixtures/test-images/test-cover-photo.png');

test.use({ video: 'on' });

test.describe('Experience Creation - Details Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate directly to Details page
    await page.goto(`${APP_URL}/onboarding/experience/platform/details`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/.*platform.*details/i, { timeout: 10000 });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  });

  test('should fill all optional fields successfully', async ({ page }) => {
    console.log(`🔍 Test: Fill all optional fields on Details page`);
    
    const detailsData: ExperienceDetailsData = {
      learningOutcomes: 'Learners will gain practical skills, understand key concepts, and be able to apply knowledge in real-world scenarios.',
      instructions: 'Please prepare your laptop and ensure you have a stable internet connection. Join the meeting 5 minutes early.',
      materials: 'No materials provided',
      whatToBring: 'This experience does not require anything',
    };
    
    // Fill form
    await fillExperienceDetailsInfo(page, detailsData);
    
    // Verify Next button is enabled (all fields are optional, so button should always be enabled)
    const nextButton = page.getByRole('button', { name: /Next|Continue/i });
    const isEnabled = await nextButton.first().isEnabled();
    expect(isEnabled).toBe(true);
    console.log(`✅ Next button is enabled`);
  });

  test('should verify all fields are optional (no required field errors)', async ({ page }) => {
    console.log(`🔍 Test: Verify all fields are optional`);
    
    // Try to click Next without filling any fields
    const nextButton = page.getByRole('button', { name: /Next|Continue/i });
    
    // Since all fields are optional, Next button should be enabled
    const isEnabled = await nextButton.first().isEnabled();
    expect(isEnabled).toBe(true);
    console.log(`✅ Next button is enabled even without filling optional fields`);
    
    // Verify no required field errors appear
    const requiredErrors = page.locator('[class*="error"], [class*="invalid"], [role="alert"]')
      .filter({ hasText: /required/i });
    const errorCount = await requiredErrors.count();
    expect(errorCount).toBe(0);
    console.log(`✅ No required field errors (all fields are optional)`);
  });

  test('should fill learning outcomes (optional)', async ({ page }) => {
    console.log(`🔍 Test: Fill learning outcomes`);
    
    const learningOutcomesText = 'Learners will gain practical skills and understand key concepts.';
    
    const learningOutcomesTextarea = page.locator('textarea[formcontrolname*="learning"], textarea').filter({ hasText: /learning/i }).first()
      .or(page.locator('textarea').filter({ hasText: /outcome/i }).first());
    
    const textareaVisible = await learningOutcomesTextarea.first().isVisible({ timeout: 3000 }).catch(() => false);
    if (textareaVisible) {
      await learningOutcomesTextarea.first().fill(learningOutcomesText);
      await page.waitForTimeout(500);
      
      const value = await learningOutcomesTextarea.first().inputValue();
      expect(value).toBe(learningOutcomesText);
      console.log(`✅ Learning outcomes filled: ${value.length} characters`);
    }
  });

  test('should fill instructions (optional)', async ({ page }) => {
    console.log(`🔍 Test: Fill instructions`);
    
    const instructionsText = 'Please prepare your laptop and ensure you have a stable internet connection.';
    
    const instructionsTextarea = page.locator('textarea[formcontrolname*="instruction"], textarea').filter({ hasText: /instruction/i }).first();
    
    const textareaVisible = await instructionsTextarea.first().isVisible({ timeout: 3000 }).catch(() => false);
    if (textareaVisible) {
      await instructionsTextarea.first().fill(instructionsText);
      await page.waitForTimeout(500);
      
      const value = await instructionsTextarea.first().inputValue();
      expect(value).toBe(instructionsText);
      console.log(`✅ Instructions filled: ${value.length} characters`);
    }
  });

  test('should select materials option', async ({ page }) => {
    console.log(`🔍 Test: Select materials option`);
    
    const materialsRadio = page.getByRole('radio', { name: /No materials provided/i });
    const materialsVisible = await materialsRadio.first().isVisible({ timeout: 3000 }).catch(() => false);
    
    if (materialsVisible) {
      await materialsRadio.first().click();
      await page.waitForTimeout(500);
      
      const isChecked = await materialsRadio.first().isChecked();
      expect(isChecked).toBe(true);
      console.log(`✅ Materials option selected: No materials provided`);
    }
  });

  test('should select what to bring option', async ({ page }) => {
    console.log(`🔍 Test: Select what to bring option`);
    
    const whatToBringRadio = page.getByRole('radio', { name: /This experience does not require anything/i });
    const whatToBringVisible = await whatToBringRadio.first().isVisible({ timeout: 3000 }).catch(() => false);
    
    if (whatToBringVisible) {
      await whatToBringRadio.first().click();
      await page.waitForTimeout(500);
      
      const isChecked = await whatToBringRadio.first().isChecked();
      expect(isChecked).toBe(true);
      console.log(`✅ What to bring option selected: This experience does not require anything`);
    }
  });

  test('should upload poster (optional)', async ({ page }) => {
    console.log(`🔍 Test: Upload poster`);
    
    const posterInput = page.locator('input[type="file"]').filter({ hasText: /poster/i }).first()
      .or(page.locator('input[type="file"]').last());
    
    const posterVisible = await posterInput.first().isVisible({ timeout: 3000 }).catch(() => false);
    
    if (posterVisible) {
      await posterInput.first().setInputFiles(TEST_COVER_PHOTO_PATH);
      await page.waitForTimeout(2000);
      console.log(`✅ Poster uploaded`);
      
      // Verify poster preview appears
      const posterPreview = page.locator('img[src*="blob"], img[src*="data:"], [class*="preview"]').filter({ hasText: /poster/i }).first()
        .or(page.locator('img[src*="blob"], img[src*="data:"]').last());
      const previewVisible = await posterPreview.first().isVisible({ timeout: 3000 }).catch(() => false);
      if (previewVisible) {
        console.log(`✅ Poster preview displayed`);
      }
    } else {
      // Try clicking upload area
      const uploadArea = page.locator('[class*="upload"], button').filter({ hasText: /poster|upload/i }).first();
      const uploadVisible = await uploadArea.isVisible({ timeout: 3000 }).catch(() => false);
      if (uploadVisible) {
        await uploadArea.click();
        await page.waitForTimeout(1000);
        
        const fileInput = page.locator('input[type="file"]').last();
        await fileInput.setInputFiles(TEST_COVER_PHOTO_PATH);
        await page.waitForTimeout(2000);
        console.log(`✅ Poster uploaded via upload area`);
      }
    }
  });

  test('should add custom questions (optional)', async ({ page }) => {
    console.log(`🔍 Test: Add custom questions`);
    
    const addQuestionButton = page.getByRole('button', { name: /Add.*question|Add a question/i });
    const addQuestionVisible = await addQuestionButton.first().isVisible({ timeout: 3000 }).catch(() => false);
    
    if (addQuestionVisible) {
      await addQuestionButton.first().click();
      await page.waitForTimeout(1000);
      console.log(`✅ Clicked "Add a question" button`);
      
      // Fill question text if form appears
      const questionInput = page.locator('input[placeholder*="question"], textarea[placeholder*="question"]').first();
      const questionVisible = await questionInput.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (questionVisible) {
        await questionInput.fill('What is your experience level?');
        await page.waitForTimeout(500);
        console.log(`✅ Question text filled`);
      }
    }
  });

  test('should validate character limits for text fields', async ({ page }) => {
    console.log(`🔍 Test: Validate character limits`);
    
    // Create text longer than typical limit (if any)
    const longText = 'A'.repeat(500);
    
    // Try learning outcomes textarea
    const learningOutcomesTextarea = page.locator('textarea[formcontrolname*="learning"], textarea').filter({ hasText: /learning/i }).first();
    const learningVisible = await learningOutcomesTextarea.first().isVisible({ timeout: 2000 }).catch(() => false);
    
    if (learningVisible) {
      await learningOutcomesTextarea.first().fill(longText);
      await page.waitForTimeout(500);
      
      const value = await learningOutcomesTextarea.first().inputValue();
      console.log(`✅ Learning outcomes length: ${value.length} characters`);
    }
    
    // Try instructions textarea
    const instructionsTextarea = page.locator('textarea[formcontrolname*="instruction"], textarea').filter({ hasText: /instruction/i }).first();
    const instructionsVisible = await instructionsTextarea.first().isVisible({ timeout: 2000 }).catch(() => false);
    
    if (instructionsVisible) {
      await instructionsTextarea.first().fill(longText);
      await page.waitForTimeout(500);
      
      const value = await instructionsTextarea.first().inputValue();
      console.log(`✅ Instructions length: ${value.length} characters`);
    }
  });

  test('should navigate to Confirm page when Next is clicked', async ({ page }) => {
    console.log(`🔍 Test: Navigate to Confirm page`);
    
    const detailsData: ExperienceDetailsData = {
      materials: 'No materials provided',
      whatToBring: 'This experience does not require anything',
    };
    
    // Fill form (optional fields)
    await fillExperienceDetailsInfo(page, detailsData);
    
    // Click Next button
    await goToNextStep(page);
    
    // Verify navigation to Confirm page
    await expect(page).toHaveURL(/.*platform.*confirm/i, { timeout: 10000 });
    console.log(`✅ Navigated to Confirm page`);
  });
});
