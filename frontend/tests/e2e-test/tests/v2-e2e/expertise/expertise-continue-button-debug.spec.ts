/**
 * Debug Test: Expertise Continue Button
 * 
 * Minimal test case to debug why the Continue button is not working
 * in expertise onboarding. This test navigates to the page without
 * filling any fields and attempts to click Continue.
 * 
 * Run with:
 *   npx playwright test tests/v2-e2e/expertise/expertise-continue-button-debug.spec.ts --headed
 */

import { test, expect } from '@playwright/test';

const APP_URL = process.env.TEST_ENV === 'live' || process.env.TEST_ENV === 'production'
  ? 'https://v2.app.mereka.dev'
  : process.env.TEST_ENV === 'staging'
  ? 'https://v2-staging.app.mereka.io'
  : 'https://v2.app.mereka.dev';

test.use({ video: 'on' });

test.describe('Expertise Continue Button Debug', () => {
  test('should be able to click Continue button without filling fields', async ({ page }) => {
    test.setTimeout(60000);
    
    console.log('🔍 Debug Test: Expertise Continue Button');
    console.log(`🌐 Testing against: ${APP_URL}`);
    
    // Navigate to expertise your-expertise page
    console.log('\n📋 Step 1: Navigate to Your Expertise page');
    await page.goto(`${APP_URL}/onboarding/expertise/your-expertise`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Wait for Angular to initialize
    
    // Take initial screenshot
    await page.screenshot({ path: `artifacts/expertise-continue-debug-initial.png`, fullPage: true });
    console.log('✅ Page loaded, screenshot saved');
    
    // Scroll to bottom to ensure footer is visible
    console.log('\n📋 Step 2: Scroll to footer');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    
    // Find all footer buttons
    console.log('\n📋 Step 3: Find footer buttons');
    const footerButtons = page.locator('footer div button');
    const buttonCount = await footerButtons.count();
    console.log(`📊 Found ${buttonCount} buttons in footer`);
    
    // Log all buttons
    for (let i = 0; i < buttonCount; i++) {
      const button = footerButtons.nth(i);
      const text = await button.textContent();
      const isVisible = await button.isVisible();
      const isEnabled = await button.isEnabled();
      const disabledAttr = await button.getAttribute('disabled');
      const classes = await button.getAttribute('class');
      console.log(`   Button ${i + 1}: "${text?.trim()}" | Visible: ${isVisible} | Enabled: ${isEnabled} | Disabled: ${disabledAttr} | Classes: ${classes}`);
    }
    
    // Try multiple selectors for Continue button
    console.log('\n📋 Step 4: Try to find Continue button');
    
    // Selector 1: 3rd button in footer (index 2)
    let continueButton = footerButtons.nth(2);
    let buttonFound = false;
    let buttonText = '';
    
    const text1 = await continueButton.textContent().catch(() => '');
    if (text1?.trim().toLowerCase().includes('continue')) {
      buttonFound = true;
      buttonText = text1.trim();
      console.log(`✅ Found Continue button using selector: footerButtons.nth(2) - "${buttonText}"`);
    } else {
      console.log(`❌ Selector footerButtons.nth(2) found: "${text1?.trim()}"`);
    }
    
    // Selector 2: By role and text
    if (!buttonFound) {
      continueButton = page.getByRole('button', { name: /Continue/i }).first();
      const visible = await continueButton.isVisible({ timeout: 3000 }).catch(() => false);
      if (visible) {
        buttonText = await continueButton.textContent() || '';
        if (buttonText.trim().toLowerCase().includes('continue')) {
          buttonFound = true;
          console.log(`✅ Found Continue button using selector: getByRole('button', { name: /Continue/i }) - "${buttonText.trim()}"`);
        }
      }
    }
    
    // Selector 3: By text content in footer
    if (!buttonFound) {
      continueButton = page.locator('footer button').filter({ hasText: /^Continue$/i }).last();
      const visible = await continueButton.isVisible({ timeout: 3000 }).catch(() => false);
      if (visible) {
        buttonText = await continueButton.textContent() || '';
        buttonFound = true;
        console.log(`✅ Found Continue button using selector: footer button with text "Continue" - "${buttonText.trim()}"`);
      }
    }
    
    // Selector 4: By class bg-neutral-900
    if (!buttonFound) {
      continueButton = page.locator('footer button.bg-neutral-900').last();
      const visible = await continueButton.isVisible({ timeout: 3000 }).catch(() => false);
      if (visible) {
        buttonText = await continueButton.textContent() || '';
        if (buttonText.trim().toLowerCase().includes('continue')) {
          buttonFound = true;
          console.log(`✅ Found Continue button using selector: footer button.bg-neutral-900 - "${buttonText.trim()}"`);
        }
      }
    }
    
    if (!buttonFound) {
      await page.screenshot({ path: `artifacts/expertise-continue-debug-button-not-found.png`, fullPage: true });
      throw new Error('Continue button not found using any selector');
    }
    
    // Check button state
    console.log('\n📋 Step 5: Check button state');
    await continueButton.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    
    const isVisible = await continueButton.isVisible();
    const isEnabled = await continueButton.isEnabled();
    const disabledAttr = await continueButton.getAttribute('disabled');
    const classes = await continueButton.getAttribute('class');
    const computedStyles = await continueButton.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        opacity: styles.opacity,
        cursor: styles.cursor,
        pointerEvents: styles.pointerEvents,
      };
    });
    
    console.log(`   Visible: ${isVisible}`);
    console.log(`   Enabled: ${isEnabled}`);
    console.log(`   Disabled attribute: ${disabledAttr}`);
    console.log(`   Classes: ${classes}`);
    console.log(`   Computed styles:`, computedStyles);
    
    // Check if isSaving might be true
    console.log('\n📋 Step 6: Check for saving state');
    const savingButtons = page.locator('footer button').filter({ hasText: /Saving|Publishing/i });
    const savingCount = await savingButtons.count();
    console.log(`   Buttons with "Saving" or "Publishing" text: ${savingCount}`);
    
    // Check console for errors
    console.log('\n📋 Step 7: Check console errors');
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Take screenshot before clicking
    await page.screenshot({ path: `artifacts/expertise-continue-debug-before-click.png`, fullPage: true });
    
    // Try to click the button
    console.log('\n📋 Step 8: Attempt to click Continue button');
    
    if (!isEnabled) {
      console.log('⚠️ Button is disabled, but attempting click anyway...');
      console.log('   This might indicate isSaving() is true or isPublishDisabled() is true');
    }
    
    try {
      // Method 1: Regular click
      console.log('   Trying regular click...');
      await continueButton.click({ timeout: 5000 });
      console.log('✅ Regular click succeeded');
    } catch (error) {
      console.log(`   Regular click failed: ${error}`);
      
      try {
        // Method 2: Force click
        console.log('   Trying force click...');
        await continueButton.click({ force: true, timeout: 5000 });
        console.log('✅ Force click succeeded');
      } catch (error2) {
        console.log(`   Force click failed: ${error2}`);
        
        try {
          // Method 3: JavaScript click
          console.log('   Trying JavaScript click...');
          await continueButton.evaluate((el: HTMLButtonElement) => {
            if (!el.disabled) {
              el.click();
            } else {
              // Force click even if disabled
              const event = new MouseEvent('click', { bubbles: true, cancelable: true });
              el.dispatchEvent(event);
            }
          });
          console.log('✅ JavaScript click succeeded');
        } catch (error3) {
          console.log(`   JavaScript click failed: ${error3}`);
          throw new Error('All click methods failed');
        }
      }
    }
    
    // Wait for navigation
    console.log('\n📋 Step 9: Wait for navigation');
    await page.waitForTimeout(2000);
    
    // Check if URL changed
    const currentUrl = page.url();
    console.log(`   Current URL: ${currentUrl}`);
    
    const urlChanged = currentUrl.includes('availability-rates');
    if (urlChanged) {
      console.log('✅ Navigation successful! URL changed to availability-rates');
      await page.screenshot({ path: `artifacts/expertise-continue-debug-success.png`, fullPage: true });
    } else {
      console.log('❌ Navigation failed. Still on same page.');
      await page.screenshot({ path: `artifacts/expertise-continue-debug-failed.png`, fullPage: true });
      
      // Log console errors if any
      if (consoleErrors.length > 0) {
        console.log('\n⚠️ Console errors found:');
        consoleErrors.forEach((error, i) => {
          console.log(`   ${i + 1}. ${error}`);
        });
      }
      
      throw new Error(`Navigation failed. Expected URL to contain 'availability-rates', but got: ${currentUrl}`);
    }
    
    // Verify we're on the next step
    await expect(page).toHaveURL(/.*expertise.*availability-rates/i, { timeout: 5000 });
    console.log('✅ Test passed: Successfully navigated to next step');
  });
});
