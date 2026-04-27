/**
 * Page Helper Functions for E2E Tests
 * 
 * Common page interaction helpers used across E2E tests
 */

import { Page, expect } from '@playwright/test';

/**
 * Wait for element to be visible with timeout
 */
export async function waitForElement(
  page: Page,
  selector: string,
  timeout: number = 10000
): Promise<void> {
  await page.locator(selector).waitFor({ state: 'visible', timeout });
}

/**
 * Scroll element into view if needed
 */
export async function scrollIntoViewIfNeeded(page: Page, selector: string): Promise<void> {
  const element = page.locator(selector).first();
  await element.scrollIntoViewIfNeeded();
}

/**
 * Fill form field safely (clear first, then fill)
 */
export async function fillFormField(
  page: Page,
  selector: string,
  value: string
): Promise<void> {
  const field = page.locator(selector);
  await field.waitFor({ state: 'visible', timeout: 10000 });
  await field.clear();
  await field.fill(value);
}

/**
 * Click button with retry
 */
export async function clickWithRetry(
  page: Page,
  selector: string,
  maxRetries: number = 3
): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const element = page.locator(selector).first();
      await element.waitFor({ state: 'visible', timeout: 10000 });
      await element.click();
      await page.waitForTimeout(1000); // Wait for action to complete
      return;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await page.waitForTimeout(1000);
    }
  }
}

/**
 * Verify element text contains expected text
 */
export async function verifyTextContains(
  page: Page,
  selector: string,
  expectedText: string | RegExp
): Promise<void> {
  const element = page.locator(selector).first();
  await expect(element).toBeVisible({ timeout: 10000 });
  await expect(element).toContainText(expectedText);
}

/**
 * Get text content from element
 */
export async function getTextContent(
  page: Page,
  selector: string
): Promise<string | null> {
  const element = page.locator(selector).first();
  await element.waitFor({ state: 'visible', timeout: 10000 });
  return await element.textContent();
}

/**
 * Check if element is visible
 */
export async function isElementVisible(
  page: Page,
  selector: string,
  timeout: number = 5000
): Promise<boolean> {
  try {
    await page.locator(selector).first().waitFor({ state: 'visible', timeout });
    return true;
  } catch {
    return false;
  }
}

/**
 * Wait for navigation to complete
 */
export async function waitForNavigation(
  page: Page,
  urlPattern: string | RegExp
): Promise<void> {
  await page.waitForURL(urlPattern, { timeout: 10000 });
  await page.waitForLoadState('networkidle');
}

/**
 * Take screenshot with descriptive name
 */
export async function takeScreenshot(
  page: Page,
  name: string
): Promise<void> {
  await page.screenshot({ path: `artifacts/screenshots/${name}-${Date.now()}.png` });
}

/**
 * Wait for API call to complete (by monitoring network)
 */
export async function waitForApiCall(
  page: Page,
  urlPattern: string | RegExp,
  timeout: number = 10000
): Promise<void> {
  await page.waitForResponse(
    (response) => {
      const url = response.url();
      return typeof urlPattern === 'string' 
        ? url.includes(urlPattern)
        : urlPattern.test(url);
    },
    { timeout }
  );
}

/**
 * Verify form validation error
 */
export async function verifyFormError(
  page: Page,
  fieldSelector: string,
  errorMessage?: string | RegExp
): Promise<void> {
  const field = page.locator(fieldSelector).first();
  await expect(field).toHaveClass(/error|invalid/, { timeout: 5000 });
  
  if (errorMessage) {
    const errorElement = page.locator('span.error').filter({ hasText: errorMessage });
    await expect(errorElement).toBeVisible({ timeout: 5000 });
  }
}

/**
 * Select dropdown option
 */
export async function selectDropdownOption(
  page: Page,
  selectSelector: string,
  optionValue: string
): Promise<void> {
  const select = page.locator(selectSelector).first();
  await select.waitFor({ state: 'visible', timeout: 10000 });
  await select.selectOption(optionValue);
}

/**
 * Check checkbox or radio button
 */
export async function checkInput(
  page: Page,
  selector: string,
  checked: boolean = true
): Promise<void> {
  const input = page.locator(selector).first();
  await input.waitFor({ state: 'visible', timeout: 10000 });
  
  if (checked) {
    await input.check();
  } else {
    await input.uncheck();
  }
}
