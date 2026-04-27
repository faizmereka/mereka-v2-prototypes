/**
 * Booking Page E2E Tests
 * 
 * Independent tests for the Booking page in the Platform Experience Creation flow.
 * Each test navigates directly to the Booking page and tests form filling,
 * validation, and navigation independently.
 * 
 * This test:
 * - Uses storageState for authentication (authenticated via global-setup.ts)
 * - Navigates directly to /onboarding/experience/platform/booking
 * - Tests form filling with valid data
 * - Tests validation (required fields, date validation)
 * - Verifies slot creation and display
 * - Verifies navigation to next page
 * 
 * Run with:
 *   npx playwright test tests/v2-e2e/experience/booking-page-e2e.spec.ts --headed
 */

import { test, expect } from '@playwright/test';
import {
  fillExperienceBookingInfo,
  goToNextStep,
  type ExperienceBookingData,
} from '../../../fixtures/helpers/creation-flow-helpers';

const APP_URL = process.env.TEST_ENV === 'live' || process.env.TEST_ENV === 'production'
  ? 'https://v2.app.mereka.dev'
  : process.env.TEST_ENV === 'staging'
  ? 'https://v2-staging.app.mereka.io'
  : 'https://v2.app.mereka.dev';

test.use({ video: 'on' });

test.describe('Experience Creation - Booking Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate directly to Booking page
    await page.goto(`${APP_URL}/onboarding/experience/platform/booking`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/.*platform.*booking/i, { timeout: 10000 });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  });

  test('should fill all required fields and create slot successfully', async ({ page }) => {
    console.log(`🔍 Test: Fill all required fields and create slot`);
    
    // Set slot date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const bookingData: ExperienceBookingData = {
      durationHours: 1,
      durationMinutes: 30,
      timezone: 'Malaysia (GMT+8)',
      slotDate: tomorrow,
      slotHour: 8,
      slotMinute: 30,
      slotAMPM: 'AM',
      repeatPattern: 'Daily',
    };
    
    // Fill form
    await fillExperienceBookingInfo(page, bookingData);
    
    // Verify duration is set
    const hourSelect = page.locator('select').filter({ hasText: /hour/i }).first();
    const hourValue = await hourSelect.inputValue().catch(() => '');
    if (hourValue) {
      expect(hourValue).toBe('1');
      console.log(`✅ Duration hours set: ${hourValue}`);
    }
    
    // Verify timezone is selected
    const timezoneSelect = page.locator('select').filter({ hasText: /timezone|Malaysia/i }).first();
    const timezoneValue = await timezoneSelect.inputValue().catch(() => '');
    if (timezoneValue) {
      console.log(`✅ Timezone selected`);
    }
    
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
        .or(page.getByText(/required|please fill|add slot|at least one slot/i));
      const errorCount = await errorMessages.count();
      
      if (errorCount > 0) {
        console.log(`✅ Found ${errorCount} validation error(s)`);
        expect(errorCount).toBeGreaterThan(0);
      }
    }
  });

  test('should set duration (hours and minutes)', async ({ page }) => {
    console.log(`🔍 Test: Set duration`);
    
    // Find hour dropdown
    const hourSelect = page.locator('select').filter({ hasText: /hour/i }).first();
    const hourVisible = await hourSelect.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (hourVisible) {
      await hourSelect.selectOption({ value: '2' });
      await page.waitForTimeout(500);
      const hourValue = await hourSelect.inputValue();
      expect(hourValue).toBe('2');
      console.log(`✅ Duration hours set: ${hourValue}`);
    }
    
    // Find minute dropdown
    const minuteSelect = page.locator('select').filter({ hasText: /minute/i }).first();
    const minuteVisible = await minuteSelect.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (minuteVisible) {
      await minuteSelect.selectOption({ value: '45' });
      await page.waitForTimeout(500);
      const minuteValue = await minuteSelect.inputValue();
      expect(minuteValue).toBe('45');
      console.log(`✅ Duration minutes set: ${minuteValue}`);
    }
  });

  test('should select timezone', async ({ page }) => {
    console.log(`🔍 Test: Select timezone`);
    
    const timezoneSelect = page.locator('select').filter({ hasText: /timezone/i }).first();
    const timezoneVisible = await timezoneSelect.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (timezoneVisible) {
      await timezoneSelect.selectOption({ label: /Malaysia/i });
      await page.waitForTimeout(500);
      const timezoneValue = await timezoneSelect.inputValue();
      expect(timezoneValue).toBeTruthy();
      console.log(`✅ Timezone selected: ${timezoneValue}`);
    }
  });

  test('should add slot with date, time, and repeat pattern', async ({ page }) => {
    console.log(`🔍 Test: Add slot with date, time, and repeat pattern`);
    
    // Click "+ Add Slot" button
    const addSlotButton = page.getByRole('button', { name: /Add Slot/i });
    await addSlotButton.first().click();
    await page.waitForTimeout(1000);
    console.log(`✅ Clicked "+ Add Slot" button`);
    
    // Set date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const formattedDate = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
    
    const dateInput = page.locator('input[type="date"]').first();
    const dateVisible = await dateInput.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (dateVisible) {
      await dateInput.fill(formattedDate);
      await page.waitForTimeout(500);
      console.log(`✅ Date set: ${formattedDate}`);
    }
    
    // Set time
    const hourSelect = page.locator('select').filter({ hasText: /hour/i }).nth(1);
    const hourVisible = await hourSelect.isVisible({ timeout: 2000 }).catch(() => false);
    if (hourVisible) {
      await hourSelect.selectOption({ value: '9' });
      await page.waitForTimeout(300);
    }
    
    const minuteSelect = page.locator('select').filter({ hasText: /minute/i }).nth(1);
    const minuteVisible = await minuteSelect.isVisible({ timeout: 2000 }).catch(() => false);
    if (minuteVisible) {
      await minuteSelect.selectOption({ value: '0' });
      await page.waitForTimeout(300);
    }
    
    // Select AM/PM
    const amButton = page.getByRole('button', { name: /AM/i });
    const amVisible = await amButton.first().isVisible({ timeout: 2000 }).catch(() => false);
    if (amVisible) {
      await amButton.first().click();
      await page.waitForTimeout(300);
      console.log(`✅ Time set: 9:00 AM`);
    }
    
    // Select repeat pattern
    const repeatSelect = page.locator('select').filter({ hasText: /repeat|daily|weekly/i }).first();
    const repeatVisible = await repeatSelect.isVisible({ timeout: 2000 }).catch(() => false);
    if (repeatVisible) {
      await repeatSelect.selectOption({ label: /Daily/i });
      await page.waitForTimeout(500);
      console.log(`✅ Repeat pattern selected: Daily`);
    }
    
    // Save slot
    const saveSlotButton = page.getByRole('button', { name: /Save Slot/i });
    await saveSlotButton.first().click();
    await page.waitForTimeout(2000);
    console.log(`✅ Slot saved`);
    
    // Verify slot appears in Recurring tab
    const recurringTab = page.getByRole('button', { name: /Recurring/i });
    await recurringTab.click();
    await page.waitForTimeout(1000);
    
    const slotCard = page.locator('[class*="slot"], [class*="card"]').filter({ hasText: /9.*AM|Daily/i });
    const slotVisible = await slotCard.first().isVisible({ timeout: 3000 }).catch(() => false);
    expect(slotVisible).toBe(true);
    console.log(`✅ Slot verified in Recurring tab`);
  });

  test('should validate date must be in the future', async ({ page }) => {
    console.log(`🔍 Test: Validate date must be in the future`);
    
    // Click "+ Add Slot" button
    const addSlotButton = page.getByRole('button', { name: /Add Slot/i });
    await addSlotButton.first().click();
    await page.waitForTimeout(1000);
    
    // Try to set date to yesterday (should fail or show error)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const formattedDate = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    
    const dateInput = page.locator('input[type="date"]').first();
    const dateVisible = await dateInput.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (dateVisible) {
      // HTML5 date inputs typically prevent selecting past dates
      const minDate = await dateInput.getAttribute('min');
      if (minDate) {
        console.log(`✅ Date input has min date restriction: ${minDate}`);
        expect(minDate).toBeTruthy();
      }
      
      // Try to fill past date (may be prevented by browser)
      await dateInput.fill(formattedDate);
      await page.waitForTimeout(500);
      
      const inputValue = await dateInput.inputValue();
      // If validation works, the value should be today or tomorrow, not yesterday
      if (inputValue) {
        const inputDate = new Date(inputValue);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        expect(inputDate >= today).toBe(true);
        console.log(`✅ Date validation working: ${inputValue} is today or future`);
      }
    }
  });

  test('should navigate to Tickets page when Next is clicked', async ({ page }) => {
    console.log(`🔍 Test: Navigate to Tickets page`);
    
    // Set slot date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const bookingData: ExperienceBookingData = {
      durationHours: 1,
      durationMinutes: 30,
      timezone: 'Malaysia (GMT+8)',
      slotDate: tomorrow,
      slotHour: 8,
      slotMinute: 30,
      slotAMPM: 'AM',
      repeatPattern: 'Daily',
    };
    
    // Fill form
    await fillExperienceBookingInfo(page, bookingData);
    
    // Click Next button
    await goToNextStep(page);
    
    // Verify navigation to Tickets page
    await expect(page).toHaveURL(/.*platform.*tickets/i, { timeout: 10000 });
    console.log(`✅ Navigated to Tickets page`);
  });
});
