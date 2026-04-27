/**
 * Extract Confirmation Page Information
 * 
 * This test navigates directly to the confirmation page and extracts
 * all information to identify empty/incomplete fields.
 * 
 * Run with:
 *   npx playwright test tests/v2-e2e/experience/extract-confirm-page-info.spec.ts --headed
 */

import { test, expect } from '@playwright/test';
import {
  navigateToExperienceCreation,
  selectExperienceType,
  navigateToPlatformStep,
  extractConfirmPageInfo,
} from '../../../fixtures/helpers/creation-flow-helpers';

test.describe('Extract Confirm Page Information', () => {
  test('should extract all information from confirmation page', async ({ page }) => {
    test.setTimeout(120000);
    console.log('🔍 Test: Extract all information from confirmation page');
    
    // Navigate to confirm page (assuming we're already logged in and have a draft)
    // Option 1: Navigate through the flow
    await navigateToExperienceCreation(page);
    await selectExperienceType(page, 'platform');
    await navigateToPlatformStep(page, 'confirm');
    
    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    
    // Verify we're on the confirm page
    await expect(page).toHaveURL(/.*platform.*confirm/i, { timeout: 10000 });
    
    console.log('\n✅ Navigated to confirmation page');
    console.log(`📍 Current URL: ${page.url()}`);
    
    // Extract all information
    const confirmPageInfo = await extractConfirmPageInfo(page);
    
    // Display comprehensive report
    console.log('\n' + '='.repeat(80));
    console.log('📊 COMPREHENSIVE CONFIRMATION PAGE ANALYSIS');
    console.log('='.repeat(80));
    
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
    
    // Summary
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
    console.log(`🔘 Publish Button: ${confirmPageInfo.publishButtonDisabled ? 'DISABLED ❌' : 'ENABLED ✅'}`);
    console.log(`📊 Can Publish: ${confirmPageInfo.canPublish ? 'YES ✅' : 'NO ❌'}`);
    
    if (confirmPageInfo.incompleteSections.length > 0) {
      console.log(`\n⚠️ Incomplete Sections (${confirmPageInfo.incompleteSections.length}):`);
      confirmPageInfo.incompleteSections.forEach((section, index) => {
        console.log(`  ${index + 1}. ${section}`);
      });
    }
    
    console.log('='.repeat(80));
    
    // Take a screenshot for reference
    await page.screenshot({ path: 'test-results/confirm-page-analysis.png', fullPage: true });
    console.log('\n📸 Screenshot saved: test-results/confirm-page-analysis.png');
  });
});
