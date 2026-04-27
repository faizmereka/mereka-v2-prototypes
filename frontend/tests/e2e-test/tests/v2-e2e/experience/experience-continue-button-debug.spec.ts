/**
 * Debug Test: Experience Continue Button (for comparison)
 * 
 * Compare Continue button behavior with expertise onboarding
 */

import { test, expect } from '@playwright/test';

const APP_URL = process.env.TEST_ENV === 'live' || process.env.TEST_ENV === 'production'
  ? 'https://v2.app.mereka.dev'
  : process.env.TEST_ENV === 'staging'
  ? 'https://v2-staging.app.mereka.io'
  : 'https://v2.app.mereka.dev';

test.use({ video: 'on' });

test.describe('Experience Continue Button Debug (Comparison)', () => {
  test('should be able to click Continue button without filling fields', async ({ page }) => {
    test.setTimeout(60000);
    
    console.log('🔍 Debug Test: Experience Continue Button (for comparison)');
    console.log(`🌐 Testing against: ${APP_URL}`);
    
    // Navigate to experience basic-info page
    console.log('\n📋 Step 1: Navigate to Basic Info page');
    await page.goto(`${APP_URL}/onboarding/experience/platform/basic-info`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Scroll to bottom
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
      console.log(`   Button ${i + 1}: "${text?.trim()}" | Visible: ${isVisible} | Enabled: ${isEnabled} | Disabled: ${disabledAttr}`);
    }
    
    // Find Continue button (should be 3rd button, index 2)
    const continueButton = footerButtons.nth(2);
    const buttonText = await continueButton.textContent();
    console.log(`\n📋 Step 4: Continue button found: "${buttonText?.trim()}"`);
    
    // Check button state
    const isVisible = await continueButton.isVisible();
    const isEnabled = await continueButton.isEnabled();
    const disabledAttr = await continueButton.getAttribute('disabled');
    
    console.log(`   Visible: ${isVisible}`);
    console.log(`   Enabled: ${isEnabled}`);
    console.log(`   Disabled attribute: ${disabledAttr}`);
    
    // Click the button
    console.log('\n📋 Step 5: Click Continue button');
    await continueButton.click();
    await page.waitForTimeout(2000);
    
    // Check if URL changed
    const currentUrl = page.url();
    console.log(`   Current URL: ${currentUrl}`);
    
    const urlChanged = currentUrl.includes('audience');
    if (urlChanged) {
      console.log('✅ Navigation successful! URL changed to audience');
    } else {
      throw new Error(`Navigation failed. Expected URL to contain 'audience', but got: ${currentUrl}`);
    }
    
    await expect(page).toHaveURL(/.*platform.*audience/i, { timeout: 5000 });
    console.log('✅ Test passed: Successfully navigated to next step');
  });
});
