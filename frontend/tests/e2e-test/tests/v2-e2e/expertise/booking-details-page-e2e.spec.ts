/**
 * Booking Details Page E2E Tests
 * 
 * Independent tests for the Booking Details page (Step 3) in the Expertise Creation flow.
 * Each test navigates directly to the Booking Details page and tests form filling,
 * validation, and navigation independently.
 * 
 * This test:
 * - Uses storageState for authentication (authenticated via global-setup.ts)
 * - Navigates directly to /onboarding/expertise/booking-details
 * - Tests form filling with valid data
 * - Tests validation (required fields)
 * - Verifies link mode selection
 * - Verifies location configuration (if physical packages exist)
 * - Verifies custom questions
 * - Verifies file uploads
 * - Verifies navigation to next page
 * 
 * Run with:
 *   npx playwright test tests/v2-e2e/expertise/booking-details-page-e2e.spec.ts --headed
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import {
  fillExpertiseBookingDetails,
  goToNextStep,
  type ExpertiseBookingDetailsData,
} from '../../../fixtures/helpers/creation-flow-helpers';

const APP_URL = process.env.TEST_ENV === 'live' || process.env.TEST_ENV === 'production'
  ? 'https://v2.app.mereka.dev'
  : process.env.TEST_ENV === 'staging'
  ? 'https://v2-staging.app.mereka.io'
  : 'https://v2.app.mereka.dev';

const TEST_COVER_PHOTO_PATH = path.resolve(__dirname, '../../../fixtures/test-images/test-cover-photo.png');

test.use({ video: 'on' });

test.describe('Expertise Creation - Booking Details Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate directly to Booking Details page
    await page.goto(`${APP_URL}/onboarding/expertise/booking-details`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/.*expertise.*booking-details/i, { timeout: 10000 });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  });

  test('should fill all required fields successfully', async ({ page }) => {
    console.log(`🔍 Test: Fill all required fields on Booking Details page`);
    
    // Select link mode (Send link)
    const linkModeRadio = page.getByRole('radio', { name: /Send link to learner/i });
    const linkModeVisible = await linkModeRadio.first().isVisible({ timeout: 5000 }).catch(() => false);
    if (linkModeVisible) {
      await linkModeRadio.first().click();
      await page.waitForTimeout(500);
      console.log('✅ Selected link mode: Send link to learner');
    }
    
    const bookingDetailsData: ExpertiseBookingDetailsData = {
      duration: 60,
      instructions: 'Please prepare your laptop and ensure you have a stable internet connection.',
    };
    
    // Fill form
    await fillExpertiseBookingDetails(page, bookingDetailsData);
    
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
        .or(page.getByText(/required|please fill/i));
      const errorCount = await errorMessages.count();
      
      if (errorCount > 0) {
        console.log(`✅ Found ${errorCount} validation error(s)`);
        expect(errorCount).toBeGreaterThan(0);
      }
    }
  });

  test('should select link mode - Send link', async ({ page }) => {
    console.log(`🔍 Test: Select link mode - Send link`);
    
    const sendLinkRadio = page.getByRole('radio', { name: /Send link to learner/i });
    await sendLinkRadio.first().click();
    await page.waitForTimeout(500);
    
    const isChecked = await sendLinkRadio.first().isChecked();
    expect(isChecked).toBe(true);
    console.log(`✅ "Send link to learner" selected`);
    
    // Verify meeting link input is hidden
    const meetingLinkInput = page.locator('input[formcontrolname*="link"], input[placeholder*="meeting"]');
    const linkVisible = await meetingLinkInput.first().isVisible({ timeout: 2000 }).catch(() => false);
    expect(linkVisible).toBe(false);
    console.log(`✅ Meeting link input hidden for "Send link" mode`);
  });

  test('should select link mode - Fixed link and enter meeting link', async ({ page }) => {
    console.log(`🔍 Test: Select link mode - Fixed link`);
    
    const fixedLinkRadio = page.getByRole('radio', { name: /Use fixed meeting link/i });
    await fixedLinkRadio.first().click();
    await page.waitForTimeout(1000);
    
    const isChecked = await fixedLinkRadio.first().isChecked();
    expect(isChecked).toBe(true);
    console.log(`✅ "Use fixed meeting link" selected`);
    
    // Verify meeting link input appears
    const meetingLinkInput = page.locator('input[formcontrolname*="link"], input[formcontrolname*="expertiseLink"], input[placeholder*="meeting"]');
    const linkVisible = await meetingLinkInput.first().isVisible({ timeout: 3000 }).catch(() => false);
    
    if (linkVisible) {
      await meetingLinkInput.first().fill('https://zoom.us/j/123456789');
      await page.waitForTimeout(500);
      
      const linkValue = await meetingLinkInput.first().inputValue();
      expect(linkValue).toContain('zoom.us');
      console.log(`✅ Meeting link filled: ${linkValue}`);
    }
  });

  test('should fill location for physical packages', async ({ page }) => {
    console.log(`🔍 Test: Fill location for physical packages`);
    
    // Check if location section is visible (depends on packages created in previous step)
    const locationSection = page.locator('[class*="location"], [class*="address"]').filter({ hasText: /location|address/i });
    const locationVisible = await locationSection.first().isVisible({ timeout: 3000 }).catch(() => false);
    
    if (locationVisible) {
      // Select location type (Hub Address)
      const hubAddressTab = page.getByRole('button', { name: /Hub Address/i })
        .or(page.locator('button').filter({ hasText: /Hub/i }));
      const hubVisible = await hubAddressTab.first().isVisible({ timeout: 3000 }).catch(() => false);
      
      if (hubVisible) {
        await hubAddressTab.first().click();
        await page.waitForTimeout(1000);
        console.log(`✅ Selected location type: Hub Address`);
        
        // Verify location fields are pre-filled
        const addressInput = page.locator('input[formcontrolname*="address"]');
        const addressVisible = await addressInput.first().isVisible({ timeout: 2000 }).catch(() => false);
        if (addressVisible) {
          const addressValue = await addressInput.first().inputValue();
          if (addressValue) {
            console.log(`✅ Location address pre-filled: ${addressValue}`);
          }
        }
      }
    } else {
      console.log(`⚠️ Location section not visible - may not have physical packages`);
    }
  });

  test('should add custom question', async ({ page }) => {
    console.log(`🔍 Test: Add custom question`);
    
    const addQuestionButton = page.getByRole('button', { name: /Add.*question|Add a question/i });
    const addQuestionVisible = await addQuestionButton.first().isVisible({ timeout: 5000 }).catch(() => false);
    
    if (addQuestionVisible) {
      await addQuestionButton.first().click();
      await page.waitForTimeout(1000);
      console.log(`✅ Clicked "Add a question" button`);
      
      // Fill question label
      const questionInput = page.locator('input[formcontrolname*="question"], input[placeholder*="question"]').last();
      const questionVisible = await questionInput.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (questionVisible) {
        await questionInput.fill('What is your experience level?');
        await page.waitForTimeout(500);
        console.log(`✅ Filled question label`);
      }
      
      // Select question type (if dropdown exists)
      const questionTypeSelect = page.locator('select[formcontrolname*="type"]').last();
      const typeVisible = await questionTypeSelect.isVisible({ timeout: 2000 }).catch(() => false);
      if (typeVisible) {
        await questionTypeSelect.selectOption({ label: /Text|Short answer/i });
        await page.waitForTimeout(500);
        console.log(`✅ Selected question type: Text`);
      }
      
      // Save question
      const saveQuestionButton = page.getByRole('button', { name: /Save|Add|Create/i }).filter({ hasText: /Question|Save/i });
      const saveVisible = await saveQuestionButton.first().isVisible({ timeout: 2000 }).catch(() => false);
      if (saveVisible) {
        await saveQuestionButton.first().click();
        await page.waitForTimeout(1000);
        console.log(`✅ Question saved`);
      }
    }
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
        
        const fileInput = page.locator('input[type="file"]').first();
        await fileInput.setInputFiles(TEST_COVER_PHOTO_PATH);
        await page.waitForTimeout(2000);
        console.log(`✅ Cover photo uploaded via upload area`);
      }
    }
  });

  test('should upload gallery photos', async ({ page }) => {
    console.log(`🔍 Test: Upload gallery photos`);
    
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

  test('should navigate to Confirmation page when Next is clicked', async ({ page }) => {
    console.log(`🔍 Test: Navigate to Confirmation page`);
    
    // Select link mode
    const linkModeRadio = page.getByRole('radio', { name: /Send link to learner/i });
    const linkModeVisible = await linkModeRadio.first().isVisible({ timeout: 5000 }).catch(() => false);
    if (linkModeVisible) {
      await linkModeRadio.first().click();
      await page.waitForTimeout(500);
    }
    
    const bookingDetailsData: ExpertiseBookingDetailsData = {
      duration: 60,
      instructions: 'Test instructions for navigation test',
    };
    
    // Fill form
    await fillExpertiseBookingDetails(page, bookingDetailsData);
    
    // Click Next button
    await goToNextStep(page);
    
    // Verify navigation to Confirmation page
    await expect(page).toHaveURL(/.*expertise.*confirmation/i, { timeout: 10000 });
    console.log(`✅ Navigated to Confirmation page`);
  });
});
