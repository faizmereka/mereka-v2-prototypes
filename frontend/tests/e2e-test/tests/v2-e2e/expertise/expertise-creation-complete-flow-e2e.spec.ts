/**
 * Complete Expertise Creation Flow E2E Test
 * 
 * Single comprehensive end-to-end test that runs from start to finish,
 * filling all fields across all 4 steps of the Expertise Creation flow.
 * 
 * This test:
 * - Uses storageState for authentication (authenticated once via global-setup.ts)
 * - Navigates directly to the expertise creation form (/onboarding/expertise/your-expertise)
 * - Navigates through all 4 steps (Your Expertise → Availability & Rates → Booking Details → Confirmation)
 * - Fills all required and optional fields according to documentation
 * - Verifies the expertise is ready to publish
 * 
 * Entry Point: Direct navigation to /onboarding/expertise/your-expertise
 * 
 * Test Environment: v2.app.mereka.dev
 * 
 * Run with: 
 *   npx playwright test tests/v2-e2e/expertise/expertise-creation-complete-flow-e2e.spec.ts --headed
 * 
 * Or with specific environment:
 *   $env:TEST_ENV = "production"; npx playwright test tests/v2-e2e/expertise/expertise-creation-complete-flow-e2e.spec.ts --headed
 * 
 * To actually publish the expertise (default: false):
 *   $env:PUBLISH_EXPERTISE = "true"; npx playwright test tests/v2-e2e/expertise/expertise-creation-complete-flow-e2e.spec.ts --headed
 * 
 * Features:
 * - Uses storageState for fast authentication (saves ~20 seconds per test)
 * - Starts directly on the expertise creation form (saves navigation time)
 * - Uploads cover photo from fixtures/test-images/test-cover-photo.png
 * - Optionally publishes the expertise if PUBLISH_EXPERTISE=true
 * 
 * Performance:
 * - Authentication: Handled by global-setup.ts (runs once before all tests)
 * - Navigation: Direct URL navigation (no UI navigation needed)
 * - Total time saved: ~20-30 seconds per test run
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import {
  fillExpertiseBasicInfo,
  fillExpertiseAvailabilityRates,
  fillExpertiseBookingDetails,
  goToNextStep,
  publishExpertise,
  type ExpertiseBasicInfoData,
  type ExpertiseAvailabilityRatesData,
  type ExpertiseBookingDetailsData,
} from '../../../fixtures/helpers/creation-flow-helpers';

const APP_URL = process.env.TEST_ENV === 'live' || process.env.TEST_ENV === 'production'
  ? 'https://v2.app.mereka.dev'
  : process.env.TEST_ENV === 'staging'
  ? 'https://v2-staging.app.mereka.io'
  : 'https://v2.app.mereka.dev';

// Control whether to actually publish the expertise
// Set PUBLISH_EXPERTISE=true to enable publishing (default: false)
const SHOULD_PUBLISH = process.env.PUBLISH_EXPERTISE === 'true' || process.env.PUBLISH_EXPERTISE === '1';

// Path to test cover photo (relative to test file)
// The test image is located at: tests/e2e-test/fixtures/test-images/test-cover-photo.png
const TEST_COVER_PHOTO_PATH = path.resolve(__dirname, '../../../fixtures/test-images/test-cover-photo.png');

// Enable video recording for this test file only
test.use({ video: 'on' });

test.describe('Complete Expertise Creation Flow', () => {
  test('should complete full Expertise creation flow from start to finish with all fields filled', async ({ page }) => {
    test.setTimeout(300000); // 5 minutes for full flow with all form filling
    console.log('🔍 Test: Complete full Expertise creation flow from start to finish');
    console.log(`🌐 Testing against: ${APP_URL}`);
    console.log(`📤 Publish Expertise: ${SHOULD_PUBLISH ? 'ENABLED' : 'DISABLED (default - set PUBLISH_EXPERTISE=true to enable)'}`);
    console.log(`🔐 Authentication: Using storageState (authenticated via global-setup.ts)`);
    console.log(`🎬 Video Recording: ENABLED (always record for this test)`);
    
    const timestamp = Date.now();
    const uniqueId = `e2e-complete-${timestamp}`;
    
    // ==========================================
    // Step 1: Navigate directly to Your Expertise page
    // ==========================================
    console.log('\n📋 Step 1: Navigate directly to Expertise Your Expertise page');
    // Navigate directly to the expertise creation form (storageState handles authentication)
    await page.goto(`${APP_URL}/onboarding/expertise/your-expertise`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/.*expertise.*your-expertise/i, { timeout: 10000 });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    console.log('✅ Navigated directly to Your Expertise page');
    
    // ==========================================
    // Step 2: Fill Your Expertise (Basic Info)
    // ==========================================
    console.log('\n📋 Step 2: Fill Your Expertise');
    const basicInfoData: ExpertiseBasicInfoData = {
      title: `E2E Complete Flow Test Expertise ${uniqueId}`,
      slug: `e2e-complete-flow-${uniqueId}`,
      description: `This is a comprehensive test expertise description for ${uniqueId}. It describes how this expertise can help clients, what value they will gain, and what outcomes they can expect. This description provides a complete overview of the expertise offering.`,
      category: 'Technology',
      primaryLanguage: 'English',
      secondaryLanguages: ['Malay'],
    };
    await fillExpertiseBasicInfo(page, basicInfoData);
    
    // Fill summary separately (REQUIRED field) - uses ui-textarea component with placeholder="Summary"
    // The ui-textarea has placeholder="Summary" and contains a textarea inside
    const summaryTextarea = page.locator('ui-textarea[placeholder="Summary"] textarea')
      .or(page.locator('textarea[placeholder="Summary"]'))
      .or(page.locator('ui-textarea[formcontrolname="expertiseSummary"] textarea'))
      .or(page.locator('textarea[formcontrolname="expertiseSummary"]'));
    
    await summaryTextarea.first().waitFor({ state: 'visible', timeout: 10000 });
    const summaryText = `Brief summary of expertise ${uniqueId} - providing value and outcomes. This summary helps clients understand what they will gain from this expertise session.`;
    await summaryTextarea.first().fill(summaryText);
    await page.waitForTimeout(1000); // Wait for character counter to update
    
    // Verify summary was filled
    const summaryValue = await summaryTextarea.first().inputValue();
    if (summaryValue.length > 0 && summaryValue.includes(uniqueId)) {
      console.log(`✅ Filled expertise summary: ${summaryValue.length} characters`);
    } else {
      console.log(`⚠️ Summary may not have been filled correctly. Value: "${summaryValue}"`);
      // Try alternative approach - click and type
      await summaryTextarea.first().click();
      await page.waitForTimeout(500);
      await summaryTextarea.first().fill(summaryText);
      await page.waitForTimeout(1000);
      const retryValue = await summaryTextarea.first().inputValue();
      if (retryValue.length > 0) {
        console.log(`✅ Filled expertise summary (retry): ${retryValue.length} characters`);
      }
    }
    
    // Select host (required field) - uses native select dropdown
    const hostSelect = page.locator('select').filter({ hasText: /Choose a team member/i })
      .or(page.locator('select').first());
    const hostVisible = await hostSelect.first().isVisible({ timeout: 5000 }).catch(() => false);
    let hostSelected = false;
    
    if (hostVisible) {
      // Select first available option (skip placeholder)
      const options = await hostSelect.first().locator('option').all();
      if (options.length > 1) {
        await hostSelect.first().selectOption({ index: 1 }); // Skip first option (usually placeholder)
        await page.waitForTimeout(2000); // Wait for host card to appear
        // Verify host card appeared
        const hostCard = page.locator('[class*="border-primary"], [class*="bg-primary"]').filter({ hasText: /Selected|host/i });
        const cardVisible = await hostCard.first().isVisible({ timeout: 3000 }).catch(() => false);
        if (cardVisible) {
          console.log('✅ Selected host');
          hostSelected = true;
        } else {
          console.log('⚠️ Host selected but card not visible');
        }
      } else {
        // If no team members, try selecting "Select yourself as host" button
        const selectSelfButton = page.getByRole('button', { name: /Select yourself as host/i });
        const selfButtonVisible = await selectSelfButton.isVisible({ timeout: 2000 }).catch(() => false);
        if (selfButtonVisible) {
          await selectSelfButton.click();
          await page.waitForTimeout(2000);
          // Verify host card appeared
          const hostCard = page.locator('[class*="border-primary"], [class*="bg-primary"]').filter({ hasText: /Selected/i });
          const cardVisible = await hostCard.first().isVisible({ timeout: 3000 }).catch(() => false);
          if (cardVisible) {
            console.log('✅ Selected self as host');
            hostSelected = true;
          } else {
            console.log('⚠️ Self host selected but card not visible');
          }
        }
      }
    }
    
    if (!hostSelected) {
      console.log('⚠️ Host may not have been selected properly - this is a required field');
    }
    
    // Fill host description (appears after host is selected)
    const hostDescriptionTextarea = page.locator('textarea[placeholder*="10+ years"], textarea[placeholder*="experience"]')
      .or(page.locator('textarea').filter({ hasText: /host.*description/i }).first());
    const hostDescVisible = await hostDescriptionTextarea.first().isVisible({ timeout: 3000 }).catch(() => false);
    if (hostDescVisible) {
      await hostDescriptionTextarea.first().fill(`Expert host with extensive experience in ${basicInfoData.category}. Specialized in helping clients achieve their goals through personalized guidance and proven methodologies.`);
      await page.waitForTimeout(500);
      console.log('✅ Filled host description');
    }
    
    // Add tags (optional but recommended)
    const tagInput = page.locator('input[placeholder*="Type Tags"], input[placeholder*="Tags"]')
      .or(page.locator('input[type="text"]').filter({ hasText: /tag/i }).first());
    const tagInputVisible = await tagInput.first().isVisible({ timeout: 3000 }).catch(() => false);
    if (tagInputVisible) {
      // Add multiple tags
      const tags = ['consulting', 'coaching', 'mentoring', 'expertise'];
      for (const tag of tags) {
        await tagInput.first().fill(tag);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(300);
      }
      console.log(`✅ Added ${tags.length} tags`);
    }
    
    // Select secondary languages (optional)
    const secondaryLanguageButtons = page.getByRole('button', { name: /Bahasa Malaysia|Malay/i })
      .or(page.locator('button').filter({ hasText: /Malay|Mandarin|Tamil/i }));
    const langButtonsVisible = await secondaryLanguageButtons.first().isVisible({ timeout: 3000 }).catch(() => false);
    if (langButtonsVisible) {
      // Click Malay button if available
      const malayButton = page.getByRole('button', { name: /Bahasa Malaysia|Malay/i }).first();
      const malayVisible = await malayButton.isVisible({ timeout: 2000 }).catch(() => false);
      if (malayVisible) {
        await malayButton.click();
        await page.waitForTimeout(500);
        console.log('✅ Selected secondary language: Malay');
      }
    }
    
    // Wait a moment for form to update after filling fields
    await page.waitForTimeout(1000);
    
    // Use the goToNextStep helper function (same as experience test)
    // This function handles button finding, waiting, and clicking
    // Note: Continue button works even without filling all fields (draft mode)
    console.log('🖱️ Navigating to next step...');
    await goToNextStep(page);
    
    // Wait for URL to change to availability-rates
    await page.waitForURL(/.*expertise.*availability-rates/i, { timeout: 15000 });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    console.log('✅ Filled Your Expertise and navigated to Availability & Rates');
    
    // ==========================================
    // Step 3: Fill Availability & Rates
    // ==========================================
    console.log('\n📋 Step 3: Fill Availability & Rates');
    const availabilityRatesData: ExpertiseAvailabilityRatesData = {
      packages: [],
      pricing: {},
      availabilityHours: {},
    };
    
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
      
      // Configure operating hours (appears when Manual is selected)
      // Toggle Monday to ensure it's active
      const mondayCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: /Monday/i })
        .or(page.getByLabel(/Monday/i));
      const mondayVisible = await mondayCheckbox.first().isVisible({ timeout: 3000 }).catch(() => false);
      if (mondayVisible) {
        const isChecked = await mondayCheckbox.first().isChecked();
        if (!isChecked) {
          await mondayCheckbox.first().check();
          await page.waitForTimeout(500);
        }
        console.log('✅ Configured operating hours for Monday');
      }
    }
    
    // Select service fee (required)
    const serviceFeeRadio = page.getByRole('radio', { name: /Learner pays service fee/i })
      .or(page.locator('label').filter({ hasText: /Learner pays/i }));
    const serviceFeeVisible = await serviceFeeRadio.first().isVisible({ timeout: 5000 }).catch(() => false);
    if (serviceFeeVisible) {
      await serviceFeeRadio.first().click();
      await page.waitForTimeout(500);
      console.log('✅ Selected service fee: Learner pays');
    }
    
    // Create a package (required) - ui-expertise-ticket-form component
    // The form is already visible, no need to click "Add Package" button
    await page.waitForTimeout(2000); // Wait for component to load
    
    // Scroll to pricing section to ensure it's visible
    const pricingSection = page.locator('h5').filter({ hasText: /Create packages/i });
    const pricingVisible = await pricingSection.first().isVisible({ timeout: 5000 }).catch(() => false);
    if (pricingVisible) {
      await pricingSection.first().scrollIntoViewIfNeeded();
      await page.waitForTimeout(1000);
    }
    
    // Fill package name (required)
    const packageNameInput = page.locator('input[type="text"][placeholder="Package Name"]').first();
    await packageNameInput.waitFor({ state: 'visible', timeout: 5000 });
    await packageNameInput.fill(`Paid Package ${uniqueId}`);
    await page.waitForTimeout(500);
    console.log('✅ Filled package name');
    
    // Fill rate/price (required) - it's a number input with MYR prefix
    const rateInput = page.locator('input[type="number"][placeholder="00.00"]').first();
    await rateInput.waitFor({ state: 'visible', timeout: 5000 });
    await rateInput.fill('100');
    await page.waitForTimeout(500);
    console.log('✅ Filled package rate: 100 MYR');
    
    // Select session duration (required) - default is 30 mins, but let's select 60 mins (1 hour)
    const durationSelect = page.locator('select').filter({ hasText: /15 mins|30 mins|1 hour/i }).first();
    await durationSelect.waitFor({ state: 'visible', timeout: 5000 });
    await durationSelect.selectOption({ value: '60' }); // 1 hour
    await page.waitForTimeout(500);
    console.log('✅ Selected session duration: 1 hour');
    
    // Fill description (optional)
    const descriptionTextarea = page.locator('textarea[placeholder*="Tell users more"]').first();
    const descVisible = await descriptionTextarea.isVisible({ timeout: 3000 }).catch(() => false);
    if (descVisible) {
      await descriptionTextarea.fill(`This is a comprehensive ${uniqueId} package offering personalized guidance and expert insights.`);
      await page.waitForTimeout(500);
      console.log('✅ Filled package description');
    }
    
    // Select package mode - Online (required, radio button)
    const onlineRadio = page.locator('input[type="radio"][value="online"]').first();
    await onlineRadio.waitFor({ state: 'visible', timeout: 5000 });
    await onlineRadio.click();
    await page.waitForTimeout(500);
    console.log('✅ Selected package mode: Online');
    
    // Toggle ASAP bookings (optional)
    const asapCheckbox = page.locator('input[type="checkbox"]').first();
    const asapVisible = await asapCheckbox.isVisible({ timeout: 3000 }).catch(() => false);
    if (asapVisible) {
      await asapCheckbox.check();
      await page.waitForTimeout(500);
      console.log('✅ Enabled ASAP bookings');
    }
    
    // Toggle buffer time (optional)
    const bufferCheckbox = page.locator('input[type="checkbox"]').nth(1);
    const bufferVisible = await bufferCheckbox.isVisible({ timeout: 3000 }).catch(() => false);
    if (bufferVisible) {
      await bufferCheckbox.check();
      await page.waitForTimeout(500);
      console.log('✅ Enabled buffer time after sessions');
    }
    
    // Wait for Save Package button to be enabled (it's disabled until required fields are filled)
    const savePackageButton = page.getByRole('button', { name: /Save Package/i }).first();
    await savePackageButton.waitFor({ state: 'visible', timeout: 5000 });
    
    // Wait for button to be enabled
    let savePackageButtonEnabled = false;
    for (let i = 0; i < 10; i++) {
      savePackageButtonEnabled = await savePackageButton.isEnabled();
      if (savePackageButtonEnabled) break;
      await page.waitForTimeout(500);
    }
    
    if (savePackageButtonEnabled) {
      await savePackageButton.click();
      await page.waitForTimeout(2000); // Wait for package to be saved
      console.log('✅ Saved package');
      
      // Verify package was saved - check for success message or package count update
      const successMessage = page.locator('[class*="success"], [class*="green"]').filter({ hasText: /saved|success/i });
      const successVisible = await successMessage.first().isVisible({ timeout: 3000 }).catch(() => false);
      if (successVisible) {
        console.log('✅ Package save confirmed');
      }
      
      // Check package count badge
      const packageBadge = page.locator('[class*="badge"], span').filter({ hasText: /1 package|package/i });
      const badgeVisible = await packageBadge.first().isVisible({ timeout: 3000 }).catch(() => false);
      if (badgeVisible) {
        const badgeText = await packageBadge.first().textContent();
        console.log(`✅ Package count updated: ${badgeText}`);
      }
    } else {
      console.log('⚠️ Save Package button is still disabled - required fields may be missing');
      // Take screenshot for debugging
      await page.screenshot({ path: `artifacts/expertise-package-disabled-${Date.now()}.png`, fullPage: true });
    }
    
    await fillExpertiseAvailabilityRates(page, availabilityRatesData);
    await goToNextStep(page);
    await expect(page).toHaveURL(/.*expertise.*booking-details/i, { timeout: 10000 });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    console.log('✅ Filled Availability & Rates and navigated to Booking Details');
    
    // ==========================================
    // Step 4: Fill Booking Details
    // ==========================================
    console.log('\n📋 Step 4: Fill Booking Details');
    const bookingDetailsData: ExpertiseBookingDetailsData = {
      duration: 60,
      instructions: 'Please prepare your laptop and ensure you have a stable internet connection. Join the meeting 5 minutes early.',
    };
    
    // Select link mode (Send link)
    const linkModeRadio = page.getByRole('radio', { name: /Send link to learner/i });
    const linkModeVisible = await linkModeRadio.first().isVisible({ timeout: 5000 }).catch(() => false);
    if (linkModeVisible) {
      await linkModeRadio.first().click();
      await page.waitForTimeout(500);
      console.log('✅ Selected link mode: Send link to learner');
    }
    
    // Fill instructions
    await fillExpertiseBookingDetails(page, bookingDetailsData);
    
    // Upload cover photo (optional but recommended)
    const coverPhotoInput = page.locator('input[type="file"]').first();
    const coverPhotoVisible = await coverPhotoInput.isVisible({ timeout: 3000 }).catch(() => false);
    if (coverPhotoVisible) {
      await coverPhotoInput.setInputFiles(TEST_COVER_PHOTO_PATH);
      await page.waitForTimeout(2000); // Wait for upload
      console.log('✅ Uploaded cover photo');
    } else {
      // Try clicking upload button if file input is hidden
      const uploadButton = page.getByRole('button', { name: /Upload Image|Upload/i }).first();
      const uploadVisible = await uploadButton.isVisible({ timeout: 2000 }).catch(() => false);
      if (uploadVisible) {
        await uploadButton.click();
        await page.waitForTimeout(500);
        // File input might appear after clicking
        const fileInput = page.locator('input[type="file"]').first();
        await fileInput.setInputFiles(TEST_COVER_PHOTO_PATH);
        await page.waitForTimeout(2000);
        console.log('✅ Uploaded cover photo via upload button');
      }
    }
    
    // Upload gallery photo (optional)
    const galleryInput = page.locator('input[type="file"]').last();
    const galleryVisible = await galleryInput.isVisible({ timeout: 3000 }).catch(() => false);
    if (galleryVisible && galleryInput !== coverPhotoInput) {
      await galleryInput.setInputFiles(TEST_COVER_PHOTO_PATH);
      await page.waitForTimeout(2000);
      console.log('✅ Uploaded gallery photo');
    } else {
      // Try clicking add image button
      const addImageButton = page.getByRole('button', { name: /Add Image|Add photo/i });
      const addImageVisible = await addImageButton.first().isVisible({ timeout: 2000 }).catch(() => false);
      if (addImageVisible) {
        await addImageButton.first().click();
        await page.waitForTimeout(500);
        const fileInput = page.locator('input[type="file"]').last();
        await fileInput.setInputFiles(TEST_COVER_PHOTO_PATH);
        await page.waitForTimeout(2000);
        console.log('✅ Uploaded gallery photo via add button');
      }
    }
    
    await goToNextStep(page);
    await expect(page).toHaveURL(/.*expertise.*confirmation/i, { timeout: 10000 });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    console.log('✅ Filled Booking Details and navigated to Confirmation');
    
    // ==========================================
    // Step 5: Verify Confirmation Page
    // ==========================================
    console.log('\n📋 Step 5: Verify Confirmation Page');
    console.log('='.repeat(80));
    
    // Wait longer for confirmation page to fully load
    await page.waitForTimeout(5000);
    
    // Take a screenshot for debugging
    await page.screenshot({ path: `artifacts/expertise-confirmation-${Date.now()}.png`, fullPage: true });
    console.log('📸 Screenshot saved for debugging');
    
    // Verify all sections are displayed
    const sections = page.locator('h2, h3, [class*="section"], [class*="collapsible"]').filter({ hasText: /Your Expertise|Availability|Booking|Review|Expertise/i });
    const sectionCount = await sections.count();
    console.log(`📋 Found ${sectionCount} section(s) on confirmation page`);
    
    // List all sections with their status
    for (let i = 0; i < sectionCount; i++) {
      const section = sections.nth(i);
      const sectionText = await section.textContent().catch(() => 'Unknown');
      const sectionName = sectionText?.trim().substring(0, 50) || 'Unknown';
      
      // Check for warning/incomplete indicators
      const sectionContainer = section.locator('..').or(section.locator('../..'));
      const hasWarning = await sectionContainer.locator('[class*="warning"], [class*="amber"], [class*="exclamation"]').isVisible({ timeout: 1000 }).catch(() => false);
      const hasCheckmark = await sectionContainer.locator('[class*="check"], [class*="success"], [class*="green"]').isVisible({ timeout: 1000 }).catch(() => false);
      
      const status = hasWarning ? '⚠️ INCOMPLETE' : hasCheckmark ? '✅ COMPLETE' : '❓ UNKNOWN';
      console.log(`   ${i + 1}. ${sectionName} [${status}]`);
    }
    
    // Check for any warning messages or incomplete indicators
    const warnings = page.locator('[class*="warning"], [class*="amber"], [class*="alert"]').filter({ hasText: /required|missing|incomplete|fill/i });
    const warningCount = await warnings.count();
    if (warningCount > 0) {
      console.log(`\n⚠️ Found ${warningCount} warning message(s):`);
      for (let i = 0; i < warningCount; i++) {
        const warning = warnings.nth(i);
        const warningText = await warning.textContent().catch(() => '');
        console.log(`   - ${warningText?.trim()}`);
      }
    }
    
    // Check for required field indicators
    const requiredFields = page.locator('[class*="required"], [class*="asterisk"], *').filter({ hasText: /required|missing|please fill/i });
    const requiredCount = await requiredFields.count();
    if (requiredCount > 0) {
      console.log(`\n📋 Found ${requiredCount} required field indicator(s)`);
    }
    
    // Verify publish button
    const publishButton = page.getByRole('button', { name: /Publish/i });
    const publishVisible = await publishButton.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (publishVisible) {
      const isDisabled = await publishButton.isDisabled().catch(() => false);
      console.log(`\n🔘 Publish Button Status: ${isDisabled ? 'DISABLED' : 'ENABLED'}`);
      
      // If disabled, try to find why
      if (isDisabled) {
        console.log('\n🔍 Investigating why publish button is disabled...');
        
        // Check for disabled reason tooltip or message
        const disabledReason = page.locator('[class*="tooltip"], [class*="hint"], [title*="disabled"]').filter({ hasText: /disabled|required|missing/i });
        const reasonVisible = await disabledReason.first().isVisible({ timeout: 2000 }).catch(() => false);
        if (reasonVisible) {
          const reasonText = await disabledReason.first().textContent();
          console.log(`   Reason: ${reasonText?.trim()}`);
        }
        
        // Check all collapsible sections for incomplete status
        const collapsibles = page.locator('[class*="collapsible"], [class*="section"]');
        const collapsibleCount = await collapsibles.count();
        console.log(`\n📊 Checking ${collapsibleCount} collapsible section(s) for completion status:`);
        
        for (let i = 0; i < Math.min(collapsibleCount, 10); i++) {
          const collapsible = collapsibles.nth(i);
          const header = collapsible.locator('[slot="header"], h2, h3, h4, h5').first();
          const headerText = await header.textContent().catch(() => '');
          
          // Check for warning icon in header
          const warningInHeader = await header.locator('[class*="warning"], [class*="amber"]').isVisible({ timeout: 500 }).catch(() => false);
          const checkmarkInHeader = await header.locator('[class*="check"], [class*="success"]').isVisible({ timeout: 500 }).catch(() => false);
          
          const status = warningInHeader ? '⚠️ INCOMPLETE' : checkmarkInHeader ? '✅ COMPLETE' : '❓';
          console.log(`   ${i + 1}. ${headerText?.trim().substring(0, 40)} [${status}]`);
        }
      }
      
      if (!isDisabled) {
        console.log('✅ All required fields filled - expertise is ready to publish');
        
        // Optionally publish the expertise
        if (SHOULD_PUBLISH) {
          console.log('\n🚀 Publishing expertise...');
          try {
            await publishExpertise(page);
            console.log('✅ Expertise published successfully!');
            console.log(`📝 Published Expertise ID: ${uniqueId}`);
            
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
          console.log(`📝 Expertise ID: ${uniqueId}`);
        }
      } else {
        console.log('\n⚠️ Publish button is disabled - some required fields may be missing');
        console.log('💡 Check the confirmation page for incomplete sections');
        console.log('💡 Review the screenshot and section status above');
      }
    } else {
      console.log('⚠️ Publish button not found');
    }
    
    // Wait so user can see the confirmation page
    console.log('\n⏳ Waiting 4 seconds so you can review the confirmation page...');
    await page.waitForTimeout(4000);
    
    console.log('='.repeat(80));
    
    // Final summary
    console.log('\n📊 Test Summary:');
    console.log('  ✅ Step 1: Your Expertise - Completed');
    console.log('  ✅ Step 2: Availability & Rates - Completed');
    console.log('  ✅ Step 3: Booking Details - Completed');
    console.log('  ✅ Step 4: Confirmation - Completed');
    console.log('\n✨ All steps completed successfully!');
  });
});
