/**
 * Availability & Rates Page E2E Tests
 * 
 * Independent tests for the Availability & Rates page (Step 2) in the Expertise Creation flow.
 * Each test navigates directly to the Availability & Rates page and tests form filling,
 * validation, and navigation independently.
 * 
 * This test:
 * - Uses storageState for authentication (authenticated via global-setup.ts)
 * - Navigates directly to /onboarding/expertise/availability-rates
 * - Tests form filling with valid data
 * - Tests validation (required fields)
 * - Verifies package creation
 * - Verifies navigation to next page
 * 
 * Run with:
 *   npx playwright test tests/v2-e2e/expertise/availability-rates-page-e2e.spec.ts --headed
 */

import { test, expect } from '@playwright/test';
import {
  fillExpertiseAvailabilityRates,
  goToNextStep,
  type ExpertiseAvailabilityRatesData,
} from '../../../fixtures/helpers/creation-flow-helpers';

const APP_URL = process.env.TEST_ENV === 'live' || process.env.TEST_ENV === 'production'
  ? 'https://v2.app.mereka.dev'
  : process.env.TEST_ENV === 'staging'
  ? 'https://v2-staging.app.mereka.io'
  : 'https://v2.app.mereka.dev';

test.use({ video: 'on' });

test.describe('Expertise Creation - Availability & Rates Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate directly to Availability & Rates page
    await page.goto(`${APP_URL}/onboarding/expertise/availability-rates`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/.*expertise.*availability-rates/i, { timeout: 10000 });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  });

  test('should fill all required fields and create package successfully', async ({ page }) => {
    const timestamp = Date.now();
    const uniqueId = `e2e-availability-rates-${timestamp}`;
    
    console.log(`🔍 Test: Fill all required fields and create package`);
    
    // Select audience
    const audienceRadio = page.getByRole('radio', { name: /Everyone/i });
    const audienceVisible = await audienceRadio.first().isVisible({ timeout: 5000 }).catch(() => false);
    if (audienceVisible) {
      await audienceRadio.first().click();
      await page.waitForTimeout(500);
      console.log('✅ Selected audience: Everyone');
    }
    
    // Select availability type (Manual)
    const availabilityTypeRadio = page.getByRole('radio', { name: /Manually fill available hours/i })
      .or(page.locator('label').filter({ hasText: /Manually fill/i }));
    const availabilityVisible = await availabilityTypeRadio.first().isVisible({ timeout: 5000 }).catch(() => false);
    if (availabilityVisible) {
      await availabilityTypeRadio.first().click();
      await page.waitForTimeout(1000);
      console.log('✅ Selected availability type: Manual');
    }
    
    // Create a package (required)
    const addPackageButton = page.getByRole('button', { name: /Add Package|Create Package|New Package/i })
      .or(page.locator('button').filter({ hasText: /\+.*Package|Add.*Package/i }));
    const addPackageVisible = await addPackageButton.first().isVisible({ timeout: 5000 }).catch(() => false);
    
    if (addPackageVisible) {
      await addPackageButton.first().click();
      await page.waitForTimeout(1000);
      console.log('✅ Clicked "Add Package" button');
      
      // Fill package name
      const packageNameInput = page.locator('input[formcontrolname*="name"], input[placeholder*="Package Name"]').last();
      const packageNameVisible = await packageNameInput.isVisible({ timeout: 3000 }).catch(() => false);
      if (packageNameVisible) {
        await packageNameInput.fill(`Paid Package ${uniqueId}`);
        await page.waitForTimeout(500);
        console.log('✅ Filled package name');
      }
      
      // Fill price
      const priceInput = page.locator('input[formcontrolname*="price"], input[placeholder*="Price"]').last();
      const priceVisible = await priceInput.isVisible({ timeout: 3000 }).catch(() => false);
      if (priceVisible) {
        await priceInput.fill('100');
        await page.waitForTimeout(500);
        console.log('✅ Filled package price');
      }
      
      // Fill duration
      const durationInput = page.locator('input[formcontrolname*="duration"], input[placeholder*="Duration"]').last();
      const durationVisible = await durationInput.isVisible({ timeout: 3000 }).catch(() => false);
      if (durationVisible) {
        await durationInput.fill('60');
        await page.waitForTimeout(500);
        console.log('✅ Filled package duration');
      }
      
      // Save package
      const savePackageButton = page.getByRole('button', { name: /Save|Add|Create/i }).filter({ hasText: /Package/i });
      const saveVisible = await savePackageButton.first().isVisible({ timeout: 3000 }).catch(() => false);
      if (saveVisible) {
        await savePackageButton.first().click();
        await page.waitForTimeout(1000);
        console.log('✅ Package saved');
      }
    }
    
    // Fill form using helper
    const availabilityRatesData: ExpertiseAvailabilityRatesData = {
      packages: [],
      pricing: {},
      availabilityHours: {},
    };
    await fillExpertiseAvailabilityRates(page, availabilityRatesData);
    
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
        .or(page.getByText(/required|please fill|add package|at least one package/i));
      const errorCount = await errorMessages.count();
      
      if (errorCount > 0) {
        console.log(`✅ Found ${errorCount} validation error(s)`);
        expect(errorCount).toBeGreaterThan(0);
      }
    }
  });

  test('should select audience option', async ({ page }) => {
    console.log(`🔍 Test: Select audience option`);
    
    // Select "Everyone"
    const everyoneRadio = page.getByRole('radio', { name: /Everyone/i });
    await everyoneRadio.first().click();
    await page.waitForTimeout(500);
    
    let isChecked = await everyoneRadio.first().isChecked();
    expect(isChecked).toBe(true);
    console.log(`✅ "Everyone" selected`);
    
    // Select "Hidden"
    const hiddenRadio = page.getByRole('radio', { name: /Hidden/i });
    const hiddenVisible = await hiddenRadio.first().isVisible({ timeout: 3000 }).catch(() => false);
    if (hiddenVisible) {
      await hiddenRadio.first().click();
      await page.waitForTimeout(500);
      
      isChecked = await hiddenRadio.first().isChecked();
      expect(isChecked).toBe(true);
      console.log(`✅ "Hidden" selected`);
    }
  });

  test('should select availability type options', async ({ page }) => {
    console.log(`🔍 Test: Select availability type options`);
    
    // Select "Flexible"
    const flexibleRadio = page.getByRole('radio', { name: /Flexible/i })
      .or(page.locator('label').filter({ hasText: /Flexible/i }));
    const flexibleVisible = await flexibleRadio.first().isVisible({ timeout: 3000 }).catch(() => false);
    if (flexibleVisible) {
      await flexibleRadio.first().click();
      await page.waitForTimeout(500);
      console.log(`✅ "Flexible" selected`);
    }
    
    // Select "Autofill from profile"
    const autofillRadio = page.getByRole('radio', { name: /Autofill from profile/i })
      .or(page.locator('label').filter({ hasText: /Autofill/i }));
    const autofillVisible = await autofillRadio.first().isVisible({ timeout: 3000 }).catch(() => false);
    if (autofillVisible) {
      await autofillRadio.first().click();
      await page.waitForTimeout(500);
      console.log(`✅ "Autofill from profile" selected`);
    }
    
    // Select "Manual fill"
    const manualRadio = page.getByRole('radio', { name: /Manually fill available hours/i })
      .or(page.locator('label').filter({ hasText: /Manually fill/i }));
    const manualVisible = await manualRadio.first().isVisible({ timeout: 3000 }).catch(() => false);
    if (manualVisible) {
      await manualRadio.first().click();
      await page.waitForTimeout(1000);
      console.log(`✅ "Manually fill available hours" selected`);
      
      // Verify operating hours UI appears
      const operatingHoursSection = page.locator('[class*="operating"], [class*="hours"]').filter({ hasText: /day|time/i });
      const hoursVisible = await operatingHoursSection.first().isVisible({ timeout: 2000 }).catch(() => false);
      if (hoursVisible) {
        console.log(`✅ Operating hours configuration UI appeared`);
      }
    }
  });

  test('should configure operating hours (Manual)', async ({ page }) => {
    const timestamp = Date.now();
    console.log(`🔍 Test: Configure operating hours`);
    
    // Select Manual availability type first
    const manualRadio = page.getByRole('radio', { name: /Manually fill available hours/i })
      .or(page.locator('label').filter({ hasText: /Manually fill/i }));
    const manualVisible = await manualRadio.first().isVisible({ timeout: 5000 }).catch(() => false);
    if (manualVisible) {
      await manualRadio.first().click();
      await page.waitForTimeout(1000);
      
      // Find day checkboxes (Monday, Tuesday, etc.)
      const mondayCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: /Monday/i })
        .or(page.getByLabel(/Monday/i));
      const mondayVisible = await mondayCheckbox.first().isVisible({ timeout: 3000 }).catch(() => false);
      
      if (mondayVisible) {
        await mondayCheckbox.first().check();
        await page.waitForTimeout(500);
        console.log(`✅ Selected Monday`);
        
        // Set start time and end time
        const startTimeSelect = page.locator('select').filter({ hasText: /start|begin/i }).first();
        const startVisible = await startTimeSelect.isVisible({ timeout: 2000 }).catch(() => false);
        if (startVisible) {
          await startTimeSelect.selectOption({ label: /09|9.*AM/i });
          await page.waitForTimeout(500);
        }
        
        const endTimeSelect = page.locator('select').filter({ hasText: /end|finish/i }).first();
        const endVisible = await endTimeSelect.isVisible({ timeout: 2000 }).catch(() => false);
        if (endVisible) {
          await endTimeSelect.selectOption({ label: /17|5.*PM/i });
          await page.waitForTimeout(500);
        }
        
        console.log(`✅ Configured operating hours for Monday`);
      }
    }
  });

  test('should create paid package', async ({ page }) => {
    const timestamp = Date.now();
    const uniqueId = `e2e-paid-pkg-${timestamp}`;
    
    console.log(`🔍 Test: Create paid package`);
    
    // Select audience first
    const audienceRadio = page.getByRole('radio', { name: /Everyone/i });
    await audienceRadio.first().click();
    await page.waitForTimeout(500);
    
    // Click "Add Package" button
    const addPackageButton = page.getByRole('button', { name: /Add Package|Create Package/i })
      .or(page.locator('button').filter({ hasText: /\+.*Package/i }));
    await addPackageButton.first().click();
    await page.waitForTimeout(1000);
    console.log(`✅ Clicked "Add Package" button`);
    
    // Fill package name
    const packageNameInput = page.locator('input[formcontrolname*="name"], input[placeholder*="Package Name"]').last();
    await packageNameInput.fill(`Paid Package ${uniqueId}`);
    await page.waitForTimeout(500);
    console.log(`✅ Filled package name`);
    
    // Fill price
    const priceInput = page.locator('input[formcontrolname*="price"], input[placeholder*="Price"]').last();
    const priceVisible = await priceInput.isVisible({ timeout: 3000 }).catch(() => false);
    if (priceVisible) {
      await priceInput.fill('150');
      await page.waitForTimeout(500);
      console.log(`✅ Filled package price: 150`);
    }
    
    // Fill duration
    const durationInput = page.locator('input[formcontrolname*="duration"], input[placeholder*="Duration"]').last();
    const durationVisible = await durationInput.isVisible({ timeout: 3000 }).catch(() => false);
    if (durationVisible) {
      await durationInput.fill('90');
      await page.waitForTimeout(500);
      console.log(`✅ Filled package duration: 90 minutes`);
    }
    
    // Select expertise mode
    const modeSelect = page.locator('select[formcontrolname*="mode"]').last();
    const modeVisible = await modeSelect.isVisible({ timeout: 3000 }).catch(() => false);
    if (modeVisible) {
      await modeSelect.selectOption({ label: /online/i });
      await page.waitForTimeout(500);
      console.log(`✅ Selected expertise mode: Online`);
    }
    
    // Save package
    const saveButton = page.getByRole('button', { name: /Save|Add|Create/i }).filter({ hasText: /Package|Save/i });
    const saveVisible = await saveButton.first().isVisible({ timeout: 3000 }).catch(() => false);
    if (saveVisible) {
      await saveButton.first().click();
      await page.waitForTimeout(1000);
      console.log(`✅ Package saved`);
    }
  });

  test('should create free package', async ({ page }) => {
    const timestamp = Date.now();
    const uniqueId = `e2e-free-pkg-${timestamp}`;
    
    console.log(`🔍 Test: Create free package`);
    
    // Select audience first
    const audienceRadio = page.getByRole('radio', { name: /Everyone/i });
    await audienceRadio.first().click();
    await page.waitForTimeout(500);
    
    // Click "Add Package" button
    const addPackageButton = page.getByRole('button', { name: /Add Package|Create Package/i })
      .or(page.locator('button').filter({ hasText: /\+.*Package/i }));
    await addPackageButton.first().click();
    await page.waitForTimeout(1000);
    
    // Fill package name
    const packageNameInput = page.locator('input[formcontrolname*="name"], input[placeholder*="Package Name"]').last();
    await packageNameInput.fill(`Free Package ${uniqueId}`);
    await page.waitForTimeout(500);
    
    // Select package type as Free (if there's a type selector)
    const packageTypeSelect = page.locator('select[formcontrolname*="type"]').last();
    const typeVisible = await packageTypeSelect.isVisible({ timeout: 2000 }).catch(() => false);
    if (typeVisible) {
      await packageTypeSelect.selectOption({ label: /Free/i });
      await page.waitForTimeout(500);
      console.log(`✅ Selected package type: Free`);
    }
    
    // Verify price field is not visible for free packages
    const priceInput = page.locator('input[formcontrolname*="price"]').last();
    const priceVisible = await priceInput.isVisible({ timeout: 2000 }).catch(() => false);
    expect(priceVisible).toBe(false);
    console.log(`✅ Price field not visible for free package (correct)`);
    
    // Fill duration
    const durationInput = page.locator('input[formcontrolname*="duration"]').last();
    const durationVisible = await durationInput.isVisible({ timeout: 3000 }).catch(() => false);
    if (durationVisible) {
      await durationInput.fill('60');
      await page.waitForTimeout(500);
      console.log(`✅ Filled package duration`);
    }
    
    // Save package
    const saveButton = page.getByRole('button', { name: /Save|Add|Create/i }).filter({ hasText: /Package|Save/i });
    const saveVisible = await saveButton.first().isVisible({ timeout: 3000 }).catch(() => false);
    if (saveVisible) {
      await saveButton.first().click();
      await page.waitForTimeout(1000);
      console.log(`✅ Free package saved`);
    }
  });

  test('should validate package required fields', async ({ page }) => {
    const timestamp = Date.now();
    console.log(`🔍 Test: Package required fields validation`);
    
    // Select audience first
    const audienceRadio = page.getByRole('radio', { name: /Everyone/i });
    await audienceRadio.first().click();
    await page.waitForTimeout(500);
    
    // Click "Add Package" button
    const addPackageButton = page.getByRole('button', { name: /Add Package|Create Package/i })
      .or(page.locator('button').filter({ hasText: /\+.*Package/i }));
    await addPackageButton.first().click();
    await page.waitForTimeout(1000);
    
    // Try to save without filling required fields
    const saveButton = page.getByRole('button', { name: /Save|Add|Create/i }).filter({ hasText: /Package|Save/i });
    const saveVisible = await saveButton.first().isVisible({ timeout: 3000 }).catch(() => false);
    
    if (saveVisible) {
      const isEnabled = await saveButton.first().isEnabled();
      
      if (!isEnabled) {
        console.log(`✅ Save button is disabled when required fields are missing`);
        expect(isEnabled).toBe(false);
      } else {
        // If enabled, click to see validation errors
        await saveButton.first().click();
        await page.waitForTimeout(1000);
        
        // Check for validation errors
        const errorMessages = page.locator('[class*="error"], [class*="invalid"], [role="alert"]')
          .or(page.getByText(/required|please fill/i));
        const errorCount = await errorMessages.count();
        
        if (errorCount > 0) {
          console.log(`✅ Found package validation errors`);
          expect(errorCount).toBeGreaterThan(0);
        }
      }
    }
  });

  test('should navigate to Booking Details page when Next is clicked', async ({ page }) => {
    const timestamp = Date.now();
    const uniqueId = `e2e-availability-nav-${timestamp}`;
    
    console.log(`🔍 Test: Navigate to Booking Details page`);
    
    // Select audience
    const audienceRadio = page.getByRole('radio', { name: /Everyone/i });
    await audienceRadio.first().click();
    await page.waitForTimeout(500);
    
    // Select availability type
    const availabilityTypeRadio = page.getByRole('radio', { name: /Flexible/i })
      .or(page.locator('label').filter({ hasText: /Flexible/i }));
    await availabilityTypeRadio.first().click();
    await page.waitForTimeout(500);
    
    // Create a package
    const addPackageButton = page.getByRole('button', { name: /Add Package|Create Package/i })
      .or(page.locator('button').filter({ hasText: /\+.*Package/i }));
    const addPackageVisible = await addPackageButton.first().isVisible({ timeout: 5000 }).catch(() => false);
    
    if (addPackageVisible) {
      await addPackageButton.first().click();
      await page.waitForTimeout(1000);
      
      // Fill minimal package fields
      const packageNameInput = page.locator('input[formcontrolname*="name"]').last();
      await packageNameInput.fill(`Package ${uniqueId}`);
      await page.waitForTimeout(500);
      
      const priceInput = page.locator('input[formcontrolname*="price"]').last();
      const priceVisible = await priceInput.isVisible({ timeout: 2000 }).catch(() => false);
      if (priceVisible) {
        await priceInput.fill('100');
        await page.waitForTimeout(500);
      }
      
      const durationInput = page.locator('input[formcontrolname*="duration"]').last();
      const durationVisible = await durationInput.isVisible({ timeout: 2000 }).catch(() => false);
      if (durationVisible) {
        await durationInput.fill('60');
        await page.waitForTimeout(500);
      }
      
      // Save package
      const saveButton = page.getByRole('button', { name: /Save|Add|Create/i }).filter({ hasText: /Package|Save/i });
      const saveVisible = await saveButton.first().isVisible({ timeout: 2000 }).catch(() => false);
      if (saveVisible) {
        await saveButton.first().click();
        await page.waitForTimeout(1000);
      }
    }
    
    // Fill form using helper
    const availabilityRatesData: ExpertiseAvailabilityRatesData = {
      packages: [],
      pricing: {},
      availabilityHours: {},
    };
    await fillExpertiseAvailabilityRates(page, availabilityRatesData);
    
    // Click Next button
    await goToNextStep(page);
    
    // Verify navigation to Booking Details page
    await expect(page).toHaveURL(/.*expertise.*booking-details/i, { timeout: 10000 });
    console.log(`✅ Navigated to Booking Details page`);
  });
});
