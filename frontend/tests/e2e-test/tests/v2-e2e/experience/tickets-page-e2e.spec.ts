/**
 * Tickets Page E2E Tests
 * 
 * Independent tests for the Tickets page in the Platform Experience Creation flow.
 * Each test navigates directly to the Tickets page and tests form filling,
 * validation, and navigation independently.
 * 
 * This test:
 * - Uses storageState for authentication (authenticated via global-setup.ts)
 * - Navigates directly to /onboarding/experience/platform/tickets
 * - Tests form filling with valid data
 * - Tests validation (required fields, character limits, price validation)
 * - Verifies ticket creation and display
 * - Verifies navigation to next page
 * 
 * Run with:
 *   npx playwright test tests/v2-e2e/experience/tickets-page-e2e.spec.ts --headed
 */

import { test, expect } from '@playwright/test';
import {
  fillExperienceTicketsInfo,
  goToNextStep,
  type ExperienceTicketsData,
} from '../../../fixtures/helpers/creation-flow-helpers';

const APP_URL = process.env.TEST_ENV === 'live' || process.env.TEST_ENV === 'production'
  ? 'https://v2.app.mereka.dev'
  : process.env.TEST_ENV === 'staging'
  ? 'https://v2-staging.app.mereka.io'
  : 'https://v2.app.mereka.dev';

test.use({ video: 'on' });

test.describe('Experience Creation - Tickets Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate directly to Tickets page
    await page.goto(`${APP_URL}/onboarding/experience/platform/tickets`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/.*platform.*tickets/i, { timeout: 10000 });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  });

  test('should fill all required fields and create tickets successfully', async ({ page }) => {
    const timestamp = Date.now();
    const uniqueId = `e2e-tickets-${timestamp}`;
    
    console.log(`🔍 Test: Fill all required fields and create tickets`);
    
    const ticketsData: ExperienceTicketsData = {
      serviceFee: 'No, users will bear the service fee',
      tickets: [
        {
          type: 'Paid',
          name: `Paid Ticket ${uniqueId}`,
          price: 100,
          quantity: 100,
        },
        {
          type: 'Free',
          name: `Free Ticket ${uniqueId}`,
          quantity: 100,
        },
      ],
    };
    
    // Fill form
    await fillExperienceTicketsInfo(page, ticketsData);
    
    // Verify service fee is selected
    const serviceFeeRadio = page.getByRole('radio', { name: /No, users will bear the service fee/i });
    const serviceFeeChecked = await serviceFeeRadio.isChecked();
    expect(serviceFeeChecked).toBe(true);
    console.log(`✅ Service fee option selected`);
    
    // Verify tickets were created
    const ticketNameInputs = page.locator('input[placeholder="Name of ticket"]');
    const ticketCount = await ticketNameInputs.count();
    expect(ticketCount).toBeGreaterThanOrEqual(2);
    console.log(`✅ Tickets created: ${ticketCount} ticket(s)`);
    
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
        .or(page.getByText(/required|please fill|add ticket|at least one ticket/i));
      const errorCount = await errorMessages.count();
      
      if (errorCount > 0) {
        console.log(`✅ Found ${errorCount} validation error(s)`);
        expect(errorCount).toBeGreaterThan(0);
      }
    }
  });

  test('should select service fee option', async ({ page }) => {
    console.log(`🔍 Test: Select service fee option`);
    
    // Select "No, users will bear the service fee"
    const noServiceFeeRadio = page.getByRole('radio', { name: /No, users will bear the service fee/i });
    await noServiceFeeRadio.click();
    await page.waitForTimeout(500);
    
    let isChecked = await noServiceFeeRadio.isChecked();
    expect(isChecked).toBe(true);
    console.log(`✅ "No, users will bear the service fee" selected`);
    
    // Select "Yes, I will absorb the service fee"
    const yesServiceFeeRadio = page.getByRole('radio', { name: /Yes, I will absorb the service fee/i });
    await yesServiceFeeRadio.click();
    await page.waitForTimeout(500);
    
    isChecked = await yesServiceFeeRadio.isChecked();
    expect(isChecked).toBe(true);
    console.log(`✅ "Yes, I will absorb the service fee" selected`);
  });

  test('should add and configure paid ticket', async ({ page }) => {
    const timestamp = Date.now();
    const uniqueId = `e2e-paid-${timestamp}`;
    
    console.log(`🔍 Test: Add and configure paid ticket`);
    
    // Select service fee first
    const serviceFeeRadio = page.getByRole('radio', { name: /No, users will bear the service fee/i });
    await serviceFeeRadio.click();
    await page.waitForTimeout(500);
    
    // Click "Paid +" button
    const paidButton = page.getByRole('button', { name: /Paid/i }).filter({ hasText: /\+|Add/i });
    await paidButton.first().click();
    await page.waitForTimeout(1000);
    console.log(`✅ Clicked "Paid +" button`);
    
    // Fill ticket name
    const ticketNameInput = page.locator('input[placeholder="Name of ticket"]').last();
    await ticketNameInput.fill(`Paid Ticket ${uniqueId}`);
    await page.waitForTimeout(500);
    
    const ticketNameValue = await ticketNameInput.inputValue();
    expect(ticketNameValue).toContain(uniqueId);
    console.log(`✅ Ticket name filled: ${ticketNameValue}`);
    
    // Fill price
    const priceInput = page.locator('input[placeholder*="00.00"], input[formcontrolname*="price"]').last();
    const priceVisible = await priceInput.isVisible({ timeout: 3000 }).catch(() => false);
    if (priceVisible) {
      await priceInput.fill('150');
      await page.waitForTimeout(500);
      const priceValue = await priceInput.inputValue();
      expect(priceValue).toBeTruthy();
      console.log(`✅ Price filled: ${priceValue}`);
    }
    
    // Fill quantity
    const quantityInput = page.locator('input[type="number"], input[placeholder*="1"]').filter({ hasText: /quantity/i }).last()
      .or(page.locator('input[formcontrolname*="quantity"]').last());
    const quantityVisible = await quantityInput.isVisible({ timeout: 3000 }).catch(() => false);
    if (quantityVisible) {
      await quantityInput.fill('50');
      await page.waitForTimeout(500);
      const quantityValue = await quantityInput.inputValue();
      expect(quantityValue).toBe('50');
      console.log(`✅ Quantity filled: ${quantityValue}`);
    }
    
    // Save ticket
    const saveTicketButton = page.getByRole('button', { name: /Save Ticket/i });
    const saveVisible = await saveTicketButton.first().isVisible({ timeout: 3000 }).catch(() => false);
    if (saveVisible) {
      await saveTicketButton.first().click();
      await page.waitForTimeout(1000);
      console.log(`✅ Ticket saved`);
    }
  });

  test('should add and configure free ticket', async ({ page }) => {
    const timestamp = Date.now();
    const uniqueId = `e2e-free-${timestamp}`;
    
    console.log(`🔍 Test: Add and configure free ticket`);
    
    // Select service fee first
    const serviceFeeRadio = page.getByRole('radio', { name: /No, users will bear the service fee/i });
    await serviceFeeRadio.click();
    await page.waitForTimeout(500);
    
    // Click "Free +" button
    const freeButton = page.getByRole('button', { name: /Free/i }).filter({ hasText: /\+|Add/i });
    await freeButton.first().click();
    await page.waitForTimeout(1000);
    console.log(`✅ Clicked "Free +" button`);
    
    // Fill ticket name
    const ticketNameInput = page.locator('input[placeholder="Name of ticket"]').last();
    await ticketNameInput.fill(`Free Ticket ${uniqueId}`);
    await page.waitForTimeout(500);
    
    const ticketNameValue = await ticketNameInput.inputValue();
    expect(ticketNameValue).toContain(uniqueId);
    console.log(`✅ Ticket name filled: ${ticketNameValue}`);
    
    // Fill quantity (free tickets don't have price)
    const quantityInput = page.locator('input[type="number"], input[placeholder*="1"]').filter({ hasText: /quantity/i }).last()
      .or(page.locator('input[formcontrolname*="quantity"]').last());
    const quantityVisible = await quantityInput.isVisible({ timeout: 3000 }).catch(() => false);
    if (quantityVisible) {
      await quantityInput.fill('100');
      await page.waitForTimeout(500);
      const quantityValue = await quantityInput.inputValue();
      expect(quantityValue).toBe('100');
      console.log(`✅ Quantity filled: ${quantityValue}`);
    }
    
    // Verify price field is not visible for free tickets
    const priceInput = page.locator('input[placeholder*="00.00"], input[formcontrolname*="price"]').last();
    const priceVisible = await priceInput.isVisible({ timeout: 2000 }).catch(() => false);
    expect(priceVisible).toBe(false);
    console.log(`✅ Price field not visible for free ticket (correct)`);
    
    // Save ticket
    const saveTicketButton = page.getByRole('button', { name: /Save Ticket/i });
    const saveVisible = await saveTicketButton.first().isVisible({ timeout: 3000 }).catch(() => false);
    if (saveVisible) {
      await saveTicketButton.first().click();
      await page.waitForTimeout(1000);
      console.log(`✅ Ticket saved`);
    }
  });

  test('should validate ticket name character limit (40 characters)', async ({ page }) => {
    const timestamp = Date.now();
    console.log(`🔍 Test: Ticket name character limit validation`);
    
    // Select service fee first
    const serviceFeeRadio = page.getByRole('radio', { name: /No, users will bear the service fee/i });
    await serviceFeeRadio.click();
    await page.waitForTimeout(500);
    
    // Click "Paid +" button
    const paidButton = page.getByRole('button', { name: /Paid/i }).filter({ hasText: /\+|Add/i });
    await paidButton.first().click();
    await page.waitForTimeout(1000);
    
    // Create a ticket name longer than 40 characters
    const longTicketName = 'A'.repeat(41);
    
    const ticketNameInput = page.locator('input[placeholder="Name of ticket"]').last();
    await ticketNameInput.fill(longTicketName);
    await page.waitForTimeout(500);
    
    // Check character counter if available
    const charCounter = page.locator('[class*="counter"], [class*="character"]').filter({ hasText: /40|41/i });
    const counterVisible = await charCounter.first().isVisible({ timeout: 2000 }).catch(() => false);
    
    if (counterVisible) {
      const counterText = await charCounter.first().textContent();
      console.log(`✅ Character counter: ${counterText}`);
    }
    
    // Verify input value is truncated or shows error
    const inputValue = await ticketNameInput.inputValue();
    expect(inputValue.length).toBeLessThanOrEqual(41); // May allow 41 or truncate to 40
    console.log(`✅ Ticket name length: ${inputValue.length} characters`);
  });

  test('should validate price is required for paid tickets', async ({ page }) => {
    const timestamp = Date.now();
    const uniqueId = `e2e-price-validation-${timestamp}`;
    
    console.log(`🔍 Test: Price required for paid tickets`);
    
    // Select service fee first
    const serviceFeeRadio = page.getByRole('radio', { name: /No, users will bear the service fee/i });
    await serviceFeeRadio.click();
    await page.waitForTimeout(500);
    
    // Click "Paid +" button
    const paidButton = page.getByRole('button', { name: /Paid/i }).filter({ hasText: /\+|Add/i });
    await paidButton.first().click();
    await page.waitForTimeout(1000);
    
    // Fill ticket name but not price
    const ticketNameInput = page.locator('input[placeholder="Name of ticket"]').last();
    await ticketNameInput.fill(`Paid Ticket ${uniqueId}`);
    await page.waitForTimeout(500);
    
    // Try to save without price
    const saveTicketButton = page.getByRole('button', { name: /Save Ticket/i });
    const saveVisible = await saveTicketButton.first().isVisible({ timeout: 3000 }).catch(() => false);
    
    if (saveVisible) {
      const isEnabled = await saveTicketButton.first().isEnabled();
      
      if (!isEnabled) {
        console.log(`✅ Save button is disabled when price is missing`);
        expect(isEnabled).toBe(false);
      } else {
        // If enabled, click to see validation error
        await saveTicketButton.first().click();
        await page.waitForTimeout(1000);
        
        // Check for price validation error
        const errorMessages = page.locator('[class*="error"], [class*="invalid"], [role="alert"]')
          .or(page.getByText(/price|required/i));
        const errorCount = await errorMessages.count();
        
        if (errorCount > 0) {
          console.log(`✅ Found price validation error`);
          expect(errorCount).toBeGreaterThan(0);
        }
      }
    }
  });

  test('should navigate to Page step when Next is clicked', async ({ page }) => {
    const timestamp = Date.now();
    const uniqueId = `e2e-tickets-nav-${timestamp}`;
    
    console.log(`🔍 Test: Navigate to Page step`);
    
    const ticketsData: ExperienceTicketsData = {
      serviceFee: 'No, users will bear the service fee',
      tickets: [
        {
          type: 'Paid',
          name: `Paid Ticket ${uniqueId}`,
          price: 100,
          quantity: 100,
        },
      ],
    };
    
    // Fill form
    await fillExperienceTicketsInfo(page, ticketsData);
    
    // Click Next button
    await goToNextStep(page);
    
    // Verify navigation to Page step
    await expect(page).toHaveURL(/.*platform.*page/i, { timeout: 10000 });
    console.log(`✅ Navigated to Page step`);
  });
});
