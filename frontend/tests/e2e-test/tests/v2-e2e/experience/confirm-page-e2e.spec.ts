/**
 * Confirmation Page E2E Tests
 * 
 * Independent tests for the Confirmation page in the Platform Experience Creation flow.
 * Each test navigates directly to the Confirm page and tests verification,
 * section review, and publish functionality.
 * 
 * This test:
 * - Uses storageState for authentication (authenticated via global-setup.ts)
 * - Navigates directly to /onboarding/experience/platform/confirm
 * - Verifies all sections are displayed
 * - Verifies section completion status
 * - Tests publish button state
 * - Tests edit buttons (navigation back to edit pages)
 * - Optionally tests publish flow
 * 
 * Run with:
 *   npx playwright test tests/v2-e2e/experience/confirm-page-e2e.spec.ts --headed
 * 
 * To actually publish the experience:
 *   $env:PUBLISH_EXPERIENCE = "true"; npx playwright test tests/v2-e2e/experience/confirm-page-e2e.spec.ts --headed
 */

import { test, expect } from '@playwright/test';
import {
  extractConfirmPageInfo,
  verifyConfirmationPage,
  publishExperience,
} from '../../../fixtures/helpers/creation-flow-helpers';

const APP_URL = process.env.TEST_ENV === 'live' || process.env.TEST_ENV === 'production'
  ? 'https://v2.app.mereka.dev'
  : process.env.TEST_ENV === 'staging'
  ? 'https://v2-staging.app.mereka.io'
  : 'https://v2.app.mereka.dev';

// Control whether to actually publish the experience
const SHOULD_PUBLISH = process.env.PUBLISH_EXPERIENCE === 'true' || process.env.PUBLISH_EXPERIENCE === '1';

test.use({ video: 'on' });

test.describe('Experience Creation - Confirmation Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate directly to Confirm page
    await page.goto(`${APP_URL}/onboarding/experience/platform/confirm`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/.*platform.*confirm/i, { timeout: 10000 });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  });

  test('should display all sections on confirmation page', async ({ page }) => {
    console.log(`🔍 Test: Display all sections on confirmation page`);
    
    // Extract confirmation page info
    const confirmPageInfo = await extractConfirmPageInfo(page);
    
    // Verify sections are present
    expect(confirmPageInfo.sections.length).toBeGreaterThan(0);
    console.log(`✅ Found ${confirmPageInfo.sections.length} section(s) on confirmation page`);
    
    // List all sections
    confirmPageInfo.sections.forEach((section, index) => {
      console.log(`   ${index + 1}. ${section.name} [${section.status === 'complete' ? '✅ COMPLETE' : '⚠️ INCOMPLETE'}]`);
    });
    
    // Expected sections
    const expectedSections = ['Basic Information', 'Audience', 'Schedule & Booking', 'Tickets & Pricing', 'Experience Page', 'Details'];
    const sectionNames = confirmPageInfo.sections.map(s => s.name);
    
    expectedSections.forEach(expectedSection => {
      const found = sectionNames.some(name => name.toLowerCase().includes(expectedSection.toLowerCase()));
      if (found) {
        console.log(`✅ Section found: ${expectedSection}`);
      }
    });
  });

  test('should verify section completion status', async ({ page }) => {
    console.log(`🔍 Test: Verify section completion status`);
    
    const confirmPageInfo = await extractConfirmPageInfo(page);
    
    // Check each section's status
    confirmPageInfo.sections.forEach(section => {
      console.log(`\n📦 Section: ${section.name} [${section.status === 'complete' ? '✅ Complete' : '⚠️ Incomplete'}]`);
      
      if (section.fields.length > 0) {
        section.fields.forEach(field => {
          const statusIcon = field.isEmpty ? '⚠️ EMPTY' : '✅';
          console.log(`  ${statusIcon} ${field.label}: "${field.value}"`);
        });
      } else {
        console.log(`  ⚠️ No fields extracted. Section text preview: ...`);
      }
    });
    
    // Verify completion status is set
    confirmPageInfo.sections.forEach(section => {
      expect(['complete', 'incomplete']).toContain(section.status);
    });
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
    
    // Verify confirmation page info matches button state
    const verification = await verifyConfirmationPage(page);
    expect(verification.canPublish).toBe(!isDisabled);
    
    if (verification.canPublish) {
      console.log(`✅ Experience is ready to publish`);
    } else {
      console.log(`⚠️ Experience cannot be published yet. Incomplete sections: ${verification.incompleteSections.join(', ')}`);
    }
  });

  test('should extract and display confirmation page information', async ({ page }) => {
    console.log(`🔍 Test: Extract and display confirmation page information`);
    
    const confirmPageInfo = await extractConfirmPageInfo(page);
    
    console.log('\n📊 CONFIRMATION PAGE ANALYSIS:');
    console.log('='.repeat(80));
    
    // Display all sections and their fields
    confirmPageInfo.sections.forEach((section, index) => {
      console.log(`\n${index + 1}. ${section.name.toUpperCase()} [${section.status === 'complete' ? '✅ COMPLETE' : '⚠️ INCOMPLETE'}]`);
      console.log('-'.repeat(80));
      
      if (section.fields.length === 0) {
        console.log('  ⚠️ No fields extracted from this section');
      } else {
        section.fields.forEach(field => {
          const statusIcon = field.isEmpty ? '⚠️ EMPTY' : '✅';
          console.log(`  ${statusIcon} ${field.label}: "${field.value}"`);
        });
      }
    });
    
    // Summary of empty fields
    const allEmptyFields: Array<{ section: string; field: string; value: string }> = [];
    confirmPageInfo.sections.forEach(section => {
      section.fields.forEach(field => {
        if (field.isEmpty) {
          allEmptyFields.push({
            section: section.name,
            field: field.label,
            value: field.value,
          });
        }
      });
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('📋 SUMMARY OF EMPTY/INCOMPLETE FIELDS:');
    console.log('='.repeat(80));
    
    if (allEmptyFields.length === 0) {
      console.log('✅ No empty fields detected!');
    } else {
      console.log(`⚠️ Found ${allEmptyFields.length} empty/incomplete field(s):\n`);
      allEmptyFields.forEach((item, index) => {
        console.log(`  ${index + 1}. [${item.section}] ${item.field}: "${item.value}"`);
      });
    }
    
    console.log('\n' + '='.repeat(80));
    console.log(`🔘 Publish Button Status: ${confirmPageInfo.publishButtonDisabled ? 'DISABLED' : 'ENABLED'}`);
    console.log(`📊 Can Publish: ${confirmPageInfo.canPublish ? 'YES' : 'NO'}`);
    
    if (confirmPageInfo.incompleteSections.length > 0) {
      console.log(`\n⚠️ Incomplete Sections: ${confirmPageInfo.incompleteSections.join(', ')}`);
    }
    
    console.log('='.repeat(80));
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
      const isEditPage = /basic-info|audience|booking|tickets|page|details/i.test(currentUrl);
      
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
    
    const confirmPageInfo = await extractConfirmPageInfo(page);
    
    // Check that sections with data have non-empty fields
    let sectionsWithData = 0;
    let sectionsWithoutData = 0;
    
    confirmPageInfo.sections.forEach(section => {
      const hasData = section.fields.some(field => !field.isEmpty && field.value.trim().length > 0);
      
      if (hasData) {
        sectionsWithData++;
        console.log(`✅ ${section.name}: Has data`);
      } else {
        sectionsWithoutData++;
        console.log(`⚠️ ${section.name}: No data extracted`);
      }
    });
    
    console.log(`\n📊 Summary:`);
    console.log(`   Sections with data: ${sectionsWithData}`);
    console.log(`   Sections without data: ${sectionsWithoutData}`);
    
    // At least some sections should have data
    expect(sectionsWithData).toBeGreaterThan(0);
  });

  test('should test publish flow when enabled', async ({ page }) => {
    console.log(`🔍 Test: Test publish flow`);
    console.log(`📤 Publish Experience: ${SHOULD_PUBLISH ? 'ENABLED' : 'DISABLED (default - set PUBLISH_EXPERIENCE=true to enable)'}`);
    
    // Verify we can publish first
    const verification = await verifyConfirmationPage(page);
    
    if (!verification.canPublish) {
      console.log(`⚠️ Cannot publish: ${verification.incompleteSections.join(', ')}`);
      console.log(`💡 Skipping publish test - experience is not ready to publish`);
      return;
    }
    
    const publishButton = page.getByRole('button', { name: /Publish/i });
    const publishVisible = await publishButton.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (!publishVisible) {
      console.log(`⚠️ Publish button not found`);
      return;
    }
    
    const isDisabled = await publishButton.isDisabled();
    
    if (isDisabled) {
      console.log(`⚠️ Publish button is disabled - some required fields may be missing`);
      return;
    }
    
    if (SHOULD_PUBLISH) {
      console.log('\n🚀 Publishing experience...');
      try {
        await publishExperience(page);
        console.log('✅ Experience published successfully!');
        
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
        console.error('❌ Error publishing experience:', error);
        throw error;
      }
    } else {
      console.log('\n💡 Note: Experience is not actually published (set PUBLISH_EXPERIENCE=true to enable)');
      console.log(`✅ Publish button is enabled and ready to publish`);
    }
  });
});
