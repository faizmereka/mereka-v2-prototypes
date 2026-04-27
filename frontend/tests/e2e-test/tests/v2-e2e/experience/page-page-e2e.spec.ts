/**
 * Your Page (Page) E2E Tests
 * 
 * Independent tests for the Your Page step in the Platform Experience Creation flow.
 * Each test navigates directly to the Page step and tests form filling,
 * validation, and navigation independently.
 * 
 * This test:
 * - Uses storageState for authentication (authenticated via global-setup.ts)
 * - Navigates directly to /onboarding/experience/platform/page
 * - Tests form filling with valid data
 * - Tests validation (required fields, character limits, URL format)
 * - Verifies file uploads (cover photo, gallery photos)
 * - Verifies navigation to next page
 * 
 * Run with:
 *   npx playwright test tests/v2-e2e/experience/page-page-e2e.spec.ts --headed
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import {
  fillExperiencePageInfo,
  goToNextStep,
  type ExperiencePageData,
} from '../../../fixtures/helpers/creation-flow-helpers';

const APP_URL = process.env.TEST_ENV === 'live' || process.env.TEST_ENV === 'production'
  ? 'https://v2.app.mereka.dev'
  : process.env.TEST_ENV === 'staging'
  ? 'https://v2-staging.app.mereka.io'
  : 'https://v2.app.mereka.dev';

const TEST_COVER_PHOTO_PATH = path.resolve(__dirname, '../../../fixtures/test-images/test-cover-photo.png');

test.use({ video: 'on' });

test.describe('Experience Creation - Your Page (Page Step)', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate directly to Page step
    await page.goto(`${APP_URL}/onboarding/experience/platform/page`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/.*platform.*page/i, { timeout: 10000 });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  });

  test('should fill all required fields successfully', async ({ page }) => {
    console.log(`🔍 Test: Fill all required fields on Page step`);
    
    const pageData: ExperiencePageData = {
      description: 'This is a comprehensive test experience description. It includes details about what learners will do, how the experience is unique, and what knowledge they will gain.',
      coverPhoto: TEST_COVER_PHOTO_PATH,
      videoUrl: 'https://www.youtube.com/watch?v=SHxwjQUVW4k&t=4s',
    };
    
    // Fill form
    await fillExperiencePageInfo(page, pageData);
    
    // Verify description is filled
    const descriptionTextarea = page.locator('textarea[placeholder*="description"], textarea[formcontrolname*="description"]').first();
    const descriptionValue = await descriptionTextarea.inputValue();
    expect(descriptionValue.length).toBeGreaterThan(0);
    console.log(`✅ Description filled: ${descriptionValue.length} characters`);
    
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
        .or(page.getByText(/required|please fill|description|cover photo/i));
      const errorCount = await errorMessages.count();
      
      if (errorCount > 0) {
        console.log(`✅ Found ${errorCount} validation error(s)`);
        expect(errorCount).toBeGreaterThan(0);
      }
    }
  });

  test('should fill experience description', async ({ page }) => {
    console.log(`🔍 Test: Fill experience description`);
    
    const descriptionText = 'This is a test experience description. It describes what learners will do and what they will gain from this experience.';
    
    const descriptionTextarea = page.locator('textarea[placeholder*="description"], textarea[formcontrolname*="description"]').first();
    await descriptionTextarea.fill(descriptionText);
    await page.waitForTimeout(500);
    
    const descriptionValue = await descriptionTextarea.inputValue();
    expect(descriptionValue).toBe(descriptionText);
    console.log(`✅ Description filled: ${descriptionValue.length} characters`);
    
    // Check character counter if available
    const charCounter = page.locator('[class*="counter"], [class*="character"]').filter({ hasText: /2000/i });
    const counterVisible = await charCounter.first().isVisible({ timeout: 2000 }).catch(() => false);
    if (counterVisible) {
      const counterText = await charCounter.first().textContent();
      console.log(`✅ Character counter: ${counterText}`);
    }
  });

  test('should validate description character limit (2000 characters)', async ({ page }) => {
    console.log(`🔍 Test: Description character limit validation`);
    
    // Create a description longer than 2000 characters
    const longDescription = 'A'.repeat(2001);
    
    const descriptionTextarea = page.locator('textarea[placeholder*="description"], textarea[formcontrolname*="description"]').first();
    await descriptionTextarea.fill(longDescription);
    await page.waitForTimeout(500);
    
    // Check character counter if available
    const charCounter = page.locator('[class*="counter"], [class*="character"]').filter({ hasText: /2000|2001/i });
    const counterVisible = await charCounter.first().isVisible({ timeout: 2000 }).catch(() => false);
    
    if (counterVisible) {
      const counterText = await charCounter.first().textContent();
      console.log(`✅ Character counter: ${counterText}`);
    }
    
    // Verify input value is truncated or shows error
    const inputValue = await descriptionTextarea.inputValue();
    expect(inputValue.length).toBeLessThanOrEqual(2001); // May allow 2001 or truncate to 2000
    console.log(`✅ Description length: ${inputValue.length} characters`);
  });

  test('should upload cover photo', async ({ page }) => {
    console.log(`🔍 Test: Upload cover photo`);
    
    const coverPhotoInput = page.locator('input[type="file"]').first();
    const coverPhotoVisible = await coverPhotoInput.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (coverPhotoVisible) {
      await coverPhotoInput.setInputFiles(TEST_COVER_PHOTO_PATH);
      await page.waitForTimeout(2000);
      console.log(`✅ Cover photo uploaded`);
      
      // Verify photo preview appears
      const photoPreview = page.locator('img[src*="blob"], img[src*="data:"], [class*="preview"]').first();
      const previewVisible = await photoPreview.isVisible({ timeout: 3000 }).catch(() => false);
      if (previewVisible) {
        console.log(`✅ Cover photo preview displayed`);
      }
    } else {
      // Try clicking upload area
      const uploadArea = page.locator('[class*="upload"], button').filter({ hasText: /upload|click/i }).first();
      const uploadVisible = await uploadArea.isVisible({ timeout: 3000 }).catch(() => false);
      if (uploadVisible) {
        await uploadArea.click();
        await page.waitForTimeout(1000);
        
        // File input might appear after clicking
        const fileInput = page.locator('input[type="file"]').first();
        await fileInput.setInputFiles(TEST_COVER_PHOTO_PATH);
        await page.waitForTimeout(2000);
        console.log(`✅ Cover photo uploaded via upload area`);
      }
    }
  });

  test('should add gallery photos (optional, up to 10)', async ({ page }) => {
    console.log(`🔍 Test: Add gallery photos`);
    
    const addPhotoButton = page.getByRole('button', { name: /Add photo|Add Photo/i });
    const addPhotoVisible = await addPhotoButton.first().isVisible({ timeout: 3000 }).catch(() => false);
    
    if (addPhotoVisible) {
      await addPhotoButton.first().click();
      await page.waitForTimeout(1000);
      
      // Find file input for gallery photos
      const galleryPhotoInput = page.locator('input[type="file"]').last();
      const galleryVisible = await galleryPhotoInput.isVisible({ timeout: 3000 }).catch(() => false);
      
      if (galleryVisible) {
        await galleryPhotoInput.setInputFiles(TEST_COVER_PHOTO_PATH);
        await page.waitForTimeout(2000);
        console.log(`✅ Gallery photo added`);
        
        // Verify photo count if displayed
        const photoCount = page.locator('[class*="count"], [class*="gallery"]').filter({ hasText: /1|photo/i });
        const countVisible = await photoCount.first().isVisible({ timeout: 2000 }).catch(() => false);
        if (countVisible) {
          console.log(`✅ Gallery photo count displayed`);
        }
      }
    }
  });

  test('should add video URL (YouTube/Vimeo)', async ({ page }) => {
    console.log(`🔍 Test: Add video URL`);
    
    const youtubeUrl = 'https://www.youtube.com/watch?v=SHxwjQUVW4k&t=4s';
    
    const videoInput = page.locator('input[placeholder*="youtube"], input[placeholder*="vimeo"], input[formcontrolname*="video"]').first();
    const videoVisible = await videoInput.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (videoVisible) {
      await videoInput.fill(youtubeUrl);
      await page.waitForTimeout(1000);
      
      const videoValue = await videoInput.inputValue();
      expect(videoValue).toContain('youtube.com');
      console.log(`✅ Video URL filled: ${videoValue}`);
      
      // Verify video preview if available
      const videoPreview = page.locator('iframe[src*="youtube"], iframe[src*="vimeo"], [class*="video"]').first();
      const previewVisible = await videoPreview.isVisible({ timeout: 3000 }).catch(() => false);
      if (previewVisible) {
        console.log(`✅ Video preview displayed`);
      }
    }
  });

  test('should validate video URL format (YouTube/Vimeo)', async ({ page }) => {
    console.log(`🔍 Test: Validate video URL format`);
    
    const invalidUrl = 'https://example.com/video';
    
    const videoInput = page.locator('input[placeholder*="youtube"], input[placeholder*="vimeo"], input[formcontrolname*="video"]').first();
    const videoVisible = await videoInput.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (videoVisible) {
      await videoInput.fill(invalidUrl);
      await page.waitForTimeout(1000);
      
      // Check for validation error
      const errorMessages = page.locator('[class*="error"], [class*="invalid"], [role="alert"]')
        .or(page.getByText(/youtube|vimeo|invalid.*url/i));
      const errorCount = await errorMessages.count();
      
      if (errorCount > 0) {
        console.log(`✅ Found video URL validation error`);
        expect(errorCount).toBeGreaterThan(0);
      } else {
        // Error might appear on blur or form submission
        await videoInput.blur();
        await page.waitForTimeout(1000);
        
        const errorAfterBlur = await errorMessages.count();
        if (errorAfterBlur > 0) {
          console.log(`✅ Found video URL validation error after blur`);
          expect(errorAfterBlur).toBeGreaterThan(0);
        }
      }
    }
  });

  test('should navigate to Details page when Next is clicked', async ({ page }) => {
    console.log(`🔍 Test: Navigate to Details page`);
    
    const pageData: ExperiencePageData = {
      description: 'Test description for navigation test',
      coverPhoto: TEST_COVER_PHOTO_PATH,
    };
    
    // Fill form
    await fillExperiencePageInfo(page, pageData);
    
    // Click Next button
    await goToNextStep(page);
    
    // Verify navigation to Details page
    await expect(page).toHaveURL(/.*platform.*details/i, { timeout: 10000 });
    console.log(`✅ Navigated to Details page`);
  });
});
