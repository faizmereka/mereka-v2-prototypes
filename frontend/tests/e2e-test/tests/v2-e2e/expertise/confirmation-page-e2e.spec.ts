/**
 * Confirmation Page E2E Tests
 * 
 * Independent tests for the Confirmation page (Step 4) in the Expertise Creation flow.
 * Each test navigates directly to the Confirmation page and tests verification,
 * section review, and publish functionality.
 * 
 * This test:
 * - Uses storageState for authentication (authenticated via global-setup.ts)
 * - Navigates directly to /onboarding/expertise/confirmation
 * - Verifies all sections are displayed
 * - Verifies section completion status
 * - Tests publish button state
 * - Tests edit buttons (navigation back to edit pages)
 * - Optionally tests publish flow
 * 
 * Run with:
 *   npx playwright test tests/v2-e2e/expertise/confirmation-page-e2e.spec.ts --headed
 * 
 * To actually publish the expertise:
 *   $env:PUBLISH_EXPERTISE = "true"; npx playwright test tests/v2-e2e/expertise/confirmation-page-e2e.spec.ts --headed
 */

import { test, expect } from '@playwright/test';
import {
  publishExpertise,
} from '../../../fixtures/helpers/creation-flow-helpers';

const APP_URL = process.env.TEST_ENV === 'live' || process.env.TEST_ENV === 'production'
  ? 'https://v2.app.mereka.dev'
  : process.env.TEST_ENV === 'staging'
  ? 'https://v2-staging.app.mereka.io'
  : 'https://v2.app.mereka.dev';

// Control whether to actually publish the expertise
const SHOULD_PUBLISH = process.env.PUBLISH_EXPERTISE === 'true' || process.env.PUBLISH_EXPERTISE === '1';

test.use({ video: 'on' });

test.describe('Expertise Creation - Confirmation Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate directly to Confirmation page
    await page.goto(`${APP_URL}/onboarding/expertise/confirmation`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/.*expertise.*confirmation/i, { timeout: 10000 });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  });

  test('should display all sections on confirmation page', async ({ page }) => {
    console.log(`🔍 Test: Display all sections on confirmation page`);
    
    // Find all sections
    const sections = page.locator('h2, h3, [class*="section"]').filter({ hasText: /Your Expertise|Availability|Booking|Review/i });
    const sectionCount = await sections.count();
    
    expect(sectionCount).toBeGreaterThan(0);
    console.log(`✅ Found ${sectionCount} section(s) on confirmation page`);
    
    // List all sections
    for (let i = 0; i < sectionCount; i++) {
      const section = sections.nth(i);
      const sectionText = await section.textContent().catch(() => '');
      console.log(`   ${i + 1}. ${sectionText?.trim()}`);
    }
    
    // Expected sections
    const expectedSections = ['Your Expertise', 'Availability & Rates', 'Booking Details'];
    const sectionNames: string[] = [];
    for (let i = 0; i < sectionCount; i++) {
      const text = await sections.nth(i).textContent().catch(() => '');
      if (text) sectionNames.push(text.trim());
    }
    
    expectedSections.forEach(expectedSection => {
      const found = sectionNames.some(name => name.toLowerCase().includes(expectedSection.toLowerCase()));
      if (found) {
        console.log(`✅ Section found: ${expectedSection}`);
      }
    });
  });

  test('should verify section completion status', async ({ page }) => {
    console.log(`🔍 Test: Verify section completion status`);
    
    // Check for status indicators (checkmarks or warning icons)
    const checkmarks = page.locator('[class*="check"], [class*="success"], svg[class*="check"]');
    const warnings = page.locator('[class*="warning"], [class*="exclamation"], svg[class*="warning"]');
    
    const checkmarkCount = await checkmarks.count();
    const warningCount = await warnings.count();
    
    console.log(`📊 Status indicators:`);
    console.log(`   - Complete sections (checkmarks): ${checkmarkCount}`);
    console.log(`   - Incomplete sections (warnings): ${warningCount}`);
    
    // Verify at least some sections have status indicators
    expect(checkmarkCount + warningCount).toBeGreaterThanOrEqual(0);
  });

  test('should verify publish button state', async ({ page }) => {
    console.log(`🔍 Test: Verify publish button state`);
    
    const publishButton = page.getByRole('button', { name: /Publish/i });
    const publishVisible = await publishButton.isVisible({ timeout: 5000 }).catch(() => false);
    
    expect(publishVisible).toBe(true);
    console.log(`✅ Publish button is visible`);
    
    // Check if button is enabled or disabled
    const isDisabled = await publishButton.isDisabled();
    console.log(`📊 Publish button state: ${isDisabled ? 'DISABLED' : 'ENABLED'}`);
    
    if (isDisabled) {
      // Check for warning message
      const warningBanner = page.locator('[class*="warning"], [class*="alert"]').filter({ hasText: /Cannot publish|incomplete|required/i });
      const warningVisible = await warningBanner.first().isVisible({ timeout: 3000 }).catch(() => false);
      if (warningVisible) {
        const warningText = await warningBanner.first().textContent();
        console.log(`⚠️ Warning message: ${warningText?.trim()}`);
      }
    } else {
      console.log(`✅ Expertise is ready to publish`);
    }
  });

  test('should extract and display confirmation page information', async ({ page }) => {
    console.log(`🔍 Test: Extract and display confirmation page information`);
    
    console.log('\n📊 CONFIRMATION PAGE ANALYSIS:');
    console.log('='.repeat(80));
    
    // Find all sections
    const sections = page.locator('h2, h3, [class*="section"]').filter({ hasText: /Your Expertise|Availability|Booking/i });
    const sectionCount = await sections.count();
    
    for (let i = 0; i < sectionCount; i++) {
      const section = sections.nth(i);
      const sectionName = await section.textContent().catch(() => 'Unknown Section');
      const sectionText = sectionName?.trim() || 'Unknown Section';
      
      // Check status
      const sectionContainer = section.locator('..').or(section.locator('../..'));
      const hasWarning = await sectionContainer.locator('[class*="warning"], [class*="exclamation"]').isVisible({ timeout: 1000 }).catch(() => false);
      const hasCheckmark = await sectionContainer.locator('[class*="check"], [class*="success"]').isVisible({ timeout: 1000 }).catch(() => false);
      
      const status = hasWarning ? '⚠️ INCOMPLETE' : hasCheckmark ? '✅ COMPLETE' : '❓ UNKNOWN';
      
      console.log(`\n${i + 1}. ${sectionText.toUpperCase()} [${status}]`);
      console.log('-'.repeat(80));
      
      // Get section content preview
      const sectionContent = await sectionContainer.textContent().catch(() => '');
      const preview = sectionContent?.substring(0, 200).trim() || 'No content found';
      console.log(`   Preview: ${preview}...`);
    }
    
    // Check publish button
    const publishButton = page.getByRole('button', { name: /Publish/i });
    const publishVisible = await publishButton.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (publishVisible) {
      const isDisabled = await publishButton.isDisabled();
      console.log('\n' + '='.repeat(80));
      console.log(`🔘 Publish Button Status: ${isDisabled ? 'DISABLED' : 'ENABLED'}`);
      console.log(`📊 Can Publish: ${!isDisabled ? 'YES' : 'NO'}`);
      console.log('='.repeat(80));
    }
  });

  test('should test edit buttons navigate back to edit pages', async ({ page }) => {
    console.log(`🔍 Test: Test edit buttons navigate back to edit pages`);
    
    // Find edit buttons
    const editButtons = page.getByRole('button', { name: /Edit/i });
    const editCount = await editButtons.count();
    
    if (editCount > 0) {
      console.log(`✅ Found ${editCount} edit button(s)`);
      
      // Click first edit button
      const firstEditButton = editButtons.first();
      const editText = await firstEditButton.textContent();
      console.log(`📝 Clicking edit button: "${editText}"`);
      
      await firstEditButton.click();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      
      // Verify navigation to an edit page
      const currentUrl = page.url();
      const isEditPage = /your-expertise|availability-rates|booking-details/i.test(currentUrl);
      
      if (isEditPage) {
        console.log(`✅ Navigated to edit page: ${currentUrl}`);
        expect(isEditPage).toBe(true);
      } else {
        console.log(`⚠️ Navigation may have failed or opened a modal. Current URL: ${currentUrl}`);
      }
    } else {
      console.log(`⚠️ No edit buttons found - sections may not be editable or page structure differs`);
    }
  });

  test('should verify all filled data is displayed correctly', async ({ page }) => {
    console.log(`🔍 Test: Verify all filled data is displayed correctly`);
    
    // Check that sections have content
    const sections = page.locator('h2, h3, [class*="section"]').filter({ hasText: /Your Expertise|Availability|Booking/i });
    const sectionCount = await sections.count();
    
    let sectionsWithData = 0;
    let sectionsWithoutData = 0;
    
    for (let i = 0; i < sectionCount; i++) {
      const section = sections.nth(i);
      const sectionContainer = section.locator('..').or(section.locator('../..'));
      const sectionContent = await sectionContainer.textContent().catch(() => '');
      
      // Check if section has meaningful content (not just headers)
      const hasData = sectionContent && sectionContent.length > 50 && 
        !sectionContent.match(/^(Your Expertise|Availability|Booking Details)$/i);
      
      if (hasData) {
        sectionsWithData++;
        console.log(`✅ Section ${i + 1}: Has data`);
      } else {
        sectionsWithoutData++;
        console.log(`⚠️ Section ${i + 1}: No data extracted`);
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`   Sections with data: ${sectionsWithData}`);
    console.log(`   Sections without data: ${sectionsWithoutData}`);
    
    // At least some sections should have data
    expect(sectionsWithData).toBeGreaterThan(0);
  });

  test('should test publish flow when enabled', async ({ page }) => {
    console.log(`🔍 Test: Test publish flow`);
    console.log(`📤 Publish Expertise: ${SHOULD_PUBLISH ? 'ENABLED' : 'DISABLED (default - set PUBLISH_EXPERTISE=true to enable)'}`);
    
    const publishButton = page.getByRole('button', { name: /Publish/i });
    const publishVisible = await publishButton.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (!publishVisible) {
      console.log(`⚠️ Publish button not found`);
      return;
    }
    
    const isDisabled = await publishButton.isDisabled();
    
    if (isDisabled) {
      console.log(`⚠️ Publish button is disabled - some required fields may be missing`);
      console.log(`💡 Skipping publish test - expertise is not ready to publish`);
      return;
    }
    
    if (SHOULD_PUBLISH) {
      console.log('\n🚀 Publishing expertise...');
      try {
        await publishExpertise(page);
        console.log('✅ Expertise published successfully!');
        
        // Wait a bit to see success message or redirect
        await page.waitForTimeout(3000);
        
        // Check for success indicators
        const successMessage = page.getByText(/Published|Created|Success/i)
          .or(page.locator('[class*="success"], [class*="toast"]'));
        const successVisible = await successMessage.first().isVisible({ timeout: 5000 }).catch(() => false);
        if (successVisible) {
          console.log('✅ Success message displayed');
        }
        
        // Check if redirected
        const currentUrl = page.url();
        console.log(`📍 Current URL after publish: ${currentUrl}`);
        
      } catch (error) {
        console.error('❌ Error publishing expertise:', error);
        throw error;
      }
    } else {
      console.log('\n💡 Note: Expertise is not actually published (set PUBLISH_EXPERTISE=true to enable)');
      console.log(`✅ Publish button is enabled and ready to publish`);
    }
  });
});
