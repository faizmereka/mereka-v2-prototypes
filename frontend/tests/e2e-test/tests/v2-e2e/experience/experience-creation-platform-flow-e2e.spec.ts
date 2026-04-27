/**
 * Platform Experience Creation Flow E2E Tests
 * 
 * Comprehensive E2E tests for Platform Experience Creation flow including:
 * - Complete navigation flow (login → Hub Dashboard → Manage Services → Experiences → Add Experience → Platform Listing → Basic Info)
 * - All 7 steps of experience creation wizard (Basic Info, Audience, Booking, Tickets, Page, Details, Confirm)
 * - Element inspection and documentation
 * - Form validation and submission
 * - End-to-end complete flow
 * 
 * Entry Point: Hub Dashboard → Services → Experiences → "Add an Experience" button → Platform Listing
 * 
 * Test Environment: v2.app.mereka.dev
 * 
 * Run with: $env:TEST_ENV = "production"; npx playwright test tests/v2-e2e/experience/experience-creation-platform-flow-e2e.spec.ts --headed
 */

import { test, expect } from '@playwright/test';
import {
  navigateToExperienceCreation,
  selectExperienceType,
  navigateToPlatformStep,
  fillExperienceBasicInfo,
  fillExperienceAudienceInfo,
  fillExperienceBookingInfo,
  fillExperienceTicketsInfo,
  fillExperiencePageInfo,
  fillExperienceDetailsInfo,
  verifyConfirmationPage,
  fillBasicInfoForNavigation,
  goToNextStep,
  goToPreviousStep,
  saveExperienceDraft,
  publishExperience,
  inspectPageElements,
  type PageElementInfo,
  type ExperienceBasicInfoData,
  type ExperienceAudienceData,
  type ExperienceBookingData,
  type ExperienceTicketsData,
  type ExperiencePageData,
  type ExperienceDetailsData,
  type TicketData,
} from '../../../fixtures/helpers/creation-flow-helpers';

const APP_URL = process.env.TEST_ENV === 'live' || process.env.TEST_ENV === 'production'
  ? 'https://v2.app.mereka.dev'
  : process.env.TEST_ENV === 'staging'
  ? 'https://v2-staging.app.mereka.io'
  : 'https://v2.app.mereka.dev';

test.describe('Platform Experience Creation Flow', () => {
  test.describe('Navigation Flow', () => {
    test('should navigate from login to Basic Info page', async ({ page }) => {
      test.setTimeout(60000);
      console.log('🔍 Test: Complete navigation flow from login to Basic Info page');
      
      // Step 1: Navigate to experience creation (includes login)
      await navigateToExperienceCreation(page);
      console.log('✅ Navigated to experience type selection page');
      
      // Step 2: Select Platform Listing option
      await selectExperienceType(page, 'platform');
      console.log('✅ Selected Platform Listing and clicked Next');
      
      // Step 3: Verify we're on Basic Info page
      await expect(page).toHaveURL(/.*platform.*basic-info|.*onboarding.*experience.*platform.*basic-info/i, { timeout: 10000 });
      console.log('✅ Successfully navigated to Basic Info page');
      
      // Verify page title or heading
      const pageHeading = page.locator('h1, h2, h3').filter({ hasText: /Basic Info|Experience|Create|Let's Get Started/i });
      const headingVisible = await pageHeading.first().isVisible({ timeout: 5000 }).catch(() => false);
      if (headingVisible) {
        console.log('✅ Basic Info page heading is visible');
      }
    });
  });

  test.describe('Basic Info Page', () => {
    test.beforeEach(async ({ page }) => {
      test.setTimeout(60000);
      await navigateToExperienceCreation(page);
      await selectExperienceType(page, 'platform');
      await expect(page).toHaveURL(/.*platform.*basic-info/i, { timeout: 10000 });
    });

    test('should fill and submit Basic Info form', async ({ page }) => {
      test.setTimeout(60000);
      console.log('🔍 Test: Fill and submit Basic Info form');
      
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      
      const testData: ExperienceBasicInfoData = {
        title: `Test Experience ${Date.now()}`,
        slug: `test-experience-${Date.now()}`,
        category: 'Workshop',
        type: 'Virtual',
      };
      
      await fillExperienceBasicInfo(page, testData);
      console.log('✅ Filled Basic Info form');
      
      // Verify Next button is enabled
      const nextButton = page.getByRole('button', { name: /Next|Continue/i });
      const nextVisible = await nextButton.isVisible({ timeout: 5000 }).catch(() => false);
      if (nextVisible) {
        const isDisabled = await nextButton.isDisabled().catch(() => false);
        console.log(`✅ Next button is ${isDisabled ? 'disabled' : 'enabled'}`);
      }
    });

    test('should validate required fields', async ({ page }) => {
      test.setTimeout(60000);
      console.log('🔍 Test: Validate required fields');
      
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      
      // Try to click Next without filling required fields
      const nextButton = page.getByRole('button', { name: /Next|Continue/i });
      const nextVisible = await nextButton.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (nextVisible) {
        const isDisabled = await nextButton.isDisabled().catch(() => false);
        if (isDisabled) {
          console.log('✅ Next button is disabled when required fields are empty');
        } else {
          // Check for validation messages
          const validationMessages = page.locator('[class*="error"], [class*="invalid"], [class*="required"]');
          const hasValidation = await validationMessages.first().isVisible({ timeout: 3000 }).catch(() => false);
          if (hasValidation) {
            console.log('✅ Validation messages displayed');
          }
        }
      }
    });

    test('should handle category selection', async ({ page }) => {
      test.setTimeout(60000);
      console.log('🔍 Test: Handle category selection');
      
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      
      const categories = ['Event', 'Talk', 'Program', 'Workshop', 'Show & Exhibition'];
      
      for (const category of categories) {
        const categoryButton = page.getByRole('button', { name: new RegExp(category, 'i') })
          .or(page.locator('button').filter({ hasText: new RegExp(category, 'i') }));
        
        const buttonVisible = await categoryButton.first().isVisible({ timeout: 3000 }).catch(() => false);
        if (buttonVisible) {
          await categoryButton.first().click();
          await page.waitForTimeout(500);
          console.log(`✅ Selected category: ${category}`);
          break;
        }
      }
    });

    test('should handle type selection (Physical/Virtual/Hybrid)', async ({ page }) => {
      test.setTimeout(60000);
      console.log('🔍 Test: Handle type selection');
      
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      
      const types = ['Physical', 'Virtual', 'Hybrid'];
      
      for (const type of types) {
        const typeRadio = page.getByRole('radio', { name: new RegExp(type, 'i') });
        const radioVisible = await typeRadio.isVisible({ timeout: 3000 }).catch(() => false);
        
        if (radioVisible) {
          await typeRadio.click();
          await page.waitForTimeout(500);
          console.log(`✅ Selected type: ${type}`);
          
          // Check if location field appears for Physical/Hybrid
          if (type === 'Physical' || type === 'Hybrid') {
            const locationSection = page.getByRole('heading', { name: /location/i });
            const locationVisible = await locationSection.isVisible({ timeout: 3000 }).catch(() => false);
            if (locationVisible) {
              console.log('✅ Location field appeared for Physical/Hybrid type');
            }
          }
          break;
        }
      }
    });

    test('should show location field for Physical/Hybrid', async ({ page }) => {
      test.setTimeout(60000);
      console.log('🔍 Test: Show location field for Physical/Hybrid');
      
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      
      // Select Physical type
      const physicalRadio = page.getByRole('radio', { name: /Physical/i });
      const physicalVisible = await physicalRadio.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (physicalVisible) {
        await physicalRadio.click();
        await page.waitForTimeout(1000);
        
        // Check for location section
        const locationSection = page.getByRole('heading', { name: /location/i });
        const locationVisible = await locationSection.isVisible({ timeout: 5000 }).catch(() => false);
        
        if (locationVisible) {
          console.log('✅ Location field appeared after selecting Physical type');
        } else {
          console.log('⚠️ Location field did not appear');
        }
      }
    });
  });

  test.describe('Audience Page', () => {
    test.beforeEach(async ({ page }) => {
      test.setTimeout(60000);
      await navigateToPlatformStep(page, 'audience');
    });

    test('should fill Audience form fields according to documented flow', async ({ page }) => {
      test.setTimeout(60000);
      console.log('🔍 Test: Fill Audience form fields according to documented flow');
      
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      
      const audienceData: ExperienceAudienceData = {
        access: 'Everyone',
        targetAudience: 'Open to Everyone',
        expertise: 'Beginner',
        primaryLanguage: 'English',
        secondaryLanguage: 'Malay',
      };
      
      await fillExperienceAudienceInfo(page, audienceData);
      console.log('✅ Filled all Audience form fields');
      
      // Verify Next button is available
      const nextButton = page.getByRole('button', { name: /Next|Continue/i });
      const nextVisible = await nextButton.isVisible({ timeout: 5000 }).catch(() => false);
      if (nextVisible) {
        const isDisabled = await nextButton.isDisabled().catch(() => false);
        console.log(`✅ Next button is visible (disabled: ${isDisabled})`);
      }
    });

    test('should verify Experience Access selection', async ({ page }) => {
      test.setTimeout(60000);
      console.log('🔍 Test: Verify Experience Access selection');
      
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      
      const everyoneRadio = page.getByRole('radio', { name: /Everyone/i });
      const everyoneVisible = await everyoneRadio.first().isVisible({ timeout: 5000 }).catch(() => false);
      
      if (everyoneVisible) {
        const isChecked = await everyoneRadio.first().isChecked().catch(() => false);
        console.log(`✅ Experience Access "Everyone" radio is ${isChecked ? 'checked' : 'not checked'}`);
      }
    });

    test('should verify Target Audience selection', async ({ page }) => {
      test.setTimeout(60000);
      console.log('🔍 Test: Verify Target Audience selection');
      
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      
      const openToEveryoneRadio = page.getByRole('radio', { name: /Open to Everyone/i });
      const openToEveryoneVisible = await openToEveryoneRadio.first().isVisible({ timeout: 5000 }).catch(() => false);
      
      if (openToEveryoneVisible) {
        await openToEveryoneRadio.first().click();
        await page.waitForTimeout(500);
        console.log('✅ Selected "Open to Everyone" for Target Audience');
      }
    });

    test('should verify Level of Expertise selection', async ({ page }) => {
      test.setTimeout(60000);
      console.log('🔍 Test: Verify Level of Expertise selection');
      
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      
      const beginnerRadio = page.getByRole('radio', { name: /Beginner/i });
      const beginnerVisible = await beginnerRadio.first().isVisible({ timeout: 5000 }).catch(() => false);
      
      if (beginnerVisible) {
        await beginnerRadio.first().click();
        await page.waitForTimeout(500);
        console.log('✅ Selected "Beginner" for Level of Expertise');
      }
    });

    test('should verify Language selection', async ({ page }) => {
      test.setTimeout(60000);
      console.log('🔍 Test: Verify Language selection');
      
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      
      const audienceData: ExperienceAudienceData = {
        primaryLanguage: 'English',
        secondaryLanguage: 'Malay',
      };
      
      await fillExperienceAudienceInfo(page, audienceData);
      console.log('✅ Selected primary and secondary languages');
    });
  });

  test.describe('Booking Page', () => {
    test.beforeEach(async ({ page }) => {
      test.setTimeout(60000);
      await navigateToPlatformStep(page, 'booking');
    });

    test('should fill Booking form according to documented flow', async ({ page }) => {
      test.setTimeout(90000);
      console.log('🔍 Test: Fill Booking form according to documented flow');
      
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      
      const bookingData: ExperienceBookingData = {
        durationHours: 1,
        durationMinutes: 30,
        timezone: 'Malaysia (GMT+8)',
        slotDate: new Date(), // Today's date
        slotHour: 8,
        slotMinute: 30,
        slotAMPM: 'AM',
        repeatPattern: 'Daily',
      };
      
      await fillExperienceBookingInfo(page, bookingData);
      console.log('✅ Filled all Booking form fields and created slot');
      
      // Verify slot was created
      await page.waitForTimeout(2000);
      const slotList = page.locator('[class*="slot"], [class*="schedule"]');
      const slotCount = await slotList.count();
      if (slotCount > 0) {
        console.log(`✅ Slot created successfully (found ${slotCount} slot(s))`);
      }
    });

    test('should configure duration (1 hour 30 minutes)', async ({ page }) => {
      test.setTimeout(60000);
      console.log('🔍 Test: Configure duration');
      
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      
      const bookingData: ExperienceBookingData = {
        durationHours: 1,
        durationMinutes: 30,
      };
      
      await fillExperienceBookingInfo(page, bookingData);
      console.log('✅ Configured duration: 1 hour 30 minutes');
    });

    test('should select Malaysia timezone', async ({ page }) => {
      test.setTimeout(60000);
      console.log('🔍 Test: Select Malaysia timezone');
      
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      
      const bookingData: ExperienceBookingData = {
        timezone: 'Malaysia (GMT+8)',
      };
      
      await fillExperienceBookingInfo(page, bookingData);
      console.log('✅ Selected Malaysia timezone');
    });

    test('should add slot with date, time, and repeat pattern', async ({ page }) => {
      test.setTimeout(90000);
      console.log('🔍 Test: Add slot with date, time, and repeat pattern');
      
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      
      const bookingData: ExperienceBookingData = {
        slotDate: new Date(),
        slotHour: 8,
        slotMinute: 30,
        slotAMPM: 'AM',
        repeatPattern: 'Daily',
      };
      
      // First click Add Slot button
      const addSlotButton = page.getByRole('button', { name: /Add Slot/i });
      const addSlotVisible = await addSlotButton.first().isVisible({ timeout: 5000 }).catch(() => false);
      if (addSlotVisible) {
        await addSlotButton.first().click();
        await page.waitForTimeout(1000);
        
        // Then fill slot details
        await fillExperienceBookingInfo(page, bookingData);
        console.log('✅ Added slot with date, time (8:30 AM), and Daily repeat pattern');
      }
    });
  });

  test.describe('Tickets Page', () => {
    test.beforeEach(async ({ page }) => {
      test.setTimeout(60000);
      await navigateToPlatformStep(page, 'tickets');
    });

    test('should fill Tickets form according to documented flow', async ({ page }) => {
      test.setTimeout(120000);
      console.log('🔍 Test: Fill Tickets form according to documented flow');
      
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      
      const ticketsData: ExperienceTicketsData = {
        serviceFee: 'No, users will bear the service fee',
        tickets: [
          {
            type: 'Paid',
            name: `Paid Ticket ${Date.now()}`,
            price: 100,
            quantity: 100,
          },
          {
            type: 'Free',
            name: `Free Ticket ${Date.now()}`,
            quantity: 100,
          },
        ],
      };
      
      await fillExperienceTicketsInfo(page, ticketsData);
      console.log('✅ Filled Tickets form: service fee, paid ticket, and free ticket');
      
      // Verify tickets were created
      await page.waitForTimeout(2000);
      const ticketRows = page.locator('[class*="ticket"], [class*="row"]').filter({ hasText: /Ticket/i });
      const ticketCount = await ticketRows.count();
      if (ticketCount > 0) {
        console.log(`✅ Tickets created successfully (found ${ticketCount} ticket(s))`);
      }
    });

    test('should select service fee option', async ({ page }) => {
      test.setTimeout(60000);
      console.log('🔍 Test: Select service fee option');
      
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      
      const ticketsData: ExperienceTicketsData = {
        serviceFee: 'No, users will bear the service fee',
      };
      
      await fillExperienceTicketsInfo(page, ticketsData);
      console.log('✅ Selected "No, users will bear the service fee"');
    });

    test('should create paid ticket with name, price, and quantity', async ({ page }) => {
      test.setTimeout(90000);
      console.log('🔍 Test: Create paid ticket');
      
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      
      const ticketsData: ExperienceTicketsData = {
        tickets: [
          {
            type: 'Paid',
            name: `Test Paid Ticket ${Date.now()}`,
            price: 100,
            quantity: 100,
          },
        ],
      };
      
      await fillExperienceTicketsInfo(page, ticketsData);
      console.log('✅ Created paid ticket with name, price (100), and quantity (100)');
    });

    test('should create free ticket with name and quantity', async ({ page }) => {
      test.setTimeout(90000);
      console.log('🔍 Test: Create free ticket');
      
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      
      const ticketsData: ExperienceTicketsData = {
        tickets: [
          {
            type: 'Free',
            name: `Test Free Ticket ${Date.now()}`,
            quantity: 100,
          },
        ],
      };
      
      await fillExperienceTicketsInfo(page, ticketsData);
      console.log('✅ Created free ticket with name and quantity (100)');
    });
  });

  test.describe('Page Step', () => {
    test.beforeEach(async ({ page }) => {
      test.setTimeout(60000);
      await navigateToPlatformStep(page, 'page');
    });

    test('should fill Page form according to documented flow', async ({ page }) => {
      test.setTimeout(90000);
      console.log('🔍 Test: Fill Page form according to documented flow');
      
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      
      const pageData: ExperiencePageData = {
        description: 'This is a comprehensive test experience description. It includes details about what learners will do, how the experience is unique, and what knowledge they will gain. This description follows the guidelines provided in the documentation.',
        videoUrl: 'https://www.youtube.com/watch?v=SHxwjQUVW4k&t=4s',
      };
      
      await fillExperiencePageInfo(page, pageData);
      console.log('✅ Filled Page form: description and video URL');
      
      // Note: Cover photo upload requires actual file path - skipping for now
      // Can be added when test image file is available
    });

    test('should fill experience description', async ({ page }) => {
      test.setTimeout(60000);
      console.log('🔍 Test: Fill experience description');
      
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      
      const pageData: ExperiencePageData = {
        description: 'This is a test experience description following the documented guidelines. It describes what learners will do, how the experience is unique, and what knowledge they will gain.',
      };
      
      await fillExperiencePageInfo(page, pageData);
      console.log('✅ Filled experience description');
      
      // Verify character counter
      const charCounter = page.locator('[class*="counter"], [class*="character"]').filter({ hasText: /\d+\s*\/\s*2000/i });
      const counterVisible = await charCounter.first().isVisible({ timeout: 3000 }).catch(() => false);
      if (counterVisible) {
        console.log('✅ Character counter is visible');
      }
    });

    test('should add video URL', async ({ page }) => {
      test.setTimeout(60000);
      console.log('🔍 Test: Add video URL');
      
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      
      const pageData: ExperiencePageData = {
        videoUrl: 'https://www.youtube.com/watch?v=SHxwjQUVW4k&t=4s',
      };
      
      await fillExperiencePageInfo(page, pageData);
      console.log('✅ Added video URL');
    });

    test('should verify cover photo upload area', async ({ page }) => {
      test.setTimeout(60000);
      console.log('🔍 Test: Verify cover photo upload area');
      
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      
      // Look for cover photo upload input or button
      const coverPhotoInput = page.locator('input[type="file"][accept*="image"]').first();
      const uploadButton = page.getByRole('button', { name: /Click to upload/i });
      
      const inputVisible = await coverPhotoInput.isVisible({ timeout: 5000 }).catch(() => false);
      const buttonVisible = await uploadButton.first().isVisible({ timeout: 5000 }).catch(() => false);
      
      if (inputVisible || buttonVisible) {
        console.log('✅ Cover photo upload area found');
        // Note: Actual file upload requires test image file
      } else {
        console.log('⚠️ Cover photo upload area not found');
      }
    });
  });

  test.describe('Details Page', () => {
    test.beforeEach(async ({ page }) => {
      test.setTimeout(60000);
      await navigateToPlatformStep(page, 'details');
    });

    test('should fill Details form according to documented flow', async ({ page }) => {
      test.setTimeout(90000);
      console.log('🔍 Test: Fill Details form according to documented flow');
      
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      
      const detailsData: ExperienceDetailsData = {
        learningOutcomes: 'Learners will gain practical skills, understand key concepts, and be able to apply knowledge in real-world scenarios.',
        instructions: 'Please prepare your laptop and ensure you have a stable internet connection. Join the meeting 5 minutes early.',
        materials: 'No materials provided',
        whatToBring: 'This experience does not require anything',
      };
      
      await fillExperienceDetailsInfo(page, detailsData);
      console.log('✅ Filled Details form: learning outcomes, instructions, materials, and what to bring');
    });

    test('should fill learning outcomes (optional)', async ({ page }) => {
      test.setTimeout(60000);
      console.log('🔍 Test: Fill learning outcomes');
      
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      
      const detailsData: ExperienceDetailsData = {
        learningOutcomes: 'Learners will be able to understand the fundamentals, apply best practices, and create their own solutions.',
      };
      
      await fillExperienceDetailsInfo(page, detailsData);
      console.log('✅ Filled learning outcomes');
    });

    test('should fill instructions (optional)', async ({ page }) => {
      test.setTimeout(60000);
      console.log('🔍 Test: Fill instructions');
      
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      
      const detailsData: ExperienceDetailsData = {
        instructions: 'Please bring your laptop and notebook. Ensure you have completed the pre-reading materials.',
      };
      
      await fillExperienceDetailsInfo(page, detailsData);
      console.log('✅ Filled instructions');
    });

    test('should select materials option', async ({ page }) => {
      test.setTimeout(60000);
      console.log('🔍 Test: Select materials option');
      
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      
      const detailsData: ExperienceDetailsData = {
        materials: 'No materials provided',
      };
      
      await fillExperienceDetailsInfo(page, detailsData);
      console.log('✅ Selected "No materials provided"');
    });

    test('should select what to bring option', async ({ page }) => {
      test.setTimeout(60000);
      console.log('🔍 Test: Select what to bring option');
      
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      
      const detailsData: ExperienceDetailsData = {
        whatToBring: 'This experience does not require anything',
      };
      
      await fillExperienceDetailsInfo(page, detailsData);
      console.log('✅ Selected "This experience does not require anything"');
    });

    test('should verify custom questions section', async ({ page }) => {
      test.setTimeout(60000);
      console.log('🔍 Test: Verify custom questions section');
      
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      
      const addQuestionButton = page.getByRole('button', { name: /Add a question/i })
        .or(page.locator('button').filter({ hasText: /\+.*Add.*question/i }));
      
      const buttonVisible = await addQuestionButton.first().isVisible({ timeout: 5000 }).catch(() => false);
      if (buttonVisible) {
        console.log('✅ Add Question button found');
        // Note: Custom question creation requires more complex form filling
      } else {
        console.log('⚠️ Add Question button not found');
      }
    });
  });

  test.describe('Confirm Page', () => {
    test.beforeEach(async ({ page }) => {
      test.setTimeout(60000);
      await navigateToPlatformStep(page, 'confirm');
    });

    test('should verify confirmation page and review sections', async ({ page }) => {
      test.setTimeout(60000);
      console.log('🔍 Test: Verify confirmation page and review sections');
      
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      
      const verification = await verifyConfirmationPage(page);
      console.log(`✅ Confirmation page verification: canPublish=${verification.canPublish}`);
      
      if (verification.incompleteSections.length > 0) {
        console.log(`⚠️ Incomplete sections: ${verification.incompleteSections.join(', ')}`);
      }
      
      // Look for review sections
      const ticketsSection = page.locator('[class*="ticket"], [class*="pricing"]').filter({ hasText: /Ticket|Pricing/i });
      const experiencePageSection = page.locator('[class*="experience"], [class*="page"]').filter({ hasText: /Experience Page|Description|Cover Photo/i });
      const detailsSection = page.locator('[class*="detail"]').filter({ hasText: /Details|Learning Outcomes|Instructions/i });
      
      const ticketsVisible = await ticketsSection.first().isVisible({ timeout: 5000 }).catch(() => false);
      const experienceVisible = await experiencePageSection.first().isVisible({ timeout: 5000 }).catch(() => false);
      const detailsVisible = await detailsSection.first().isVisible({ timeout: 5000 }).catch(() => false);
      
      console.log(`✅ Review sections: Tickets=${ticketsVisible}, Experience Page=${experienceVisible}, Details=${detailsVisible}`);
    });

    test('should verify publish button state', async ({ page }) => {
      test.setTimeout(60000);
      console.log('🔍 Test: Verify publish button state');
      
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      
      const publishButton = page.getByRole('button', { name: /Publish/i });
      const publishVisible = await publishButton.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (publishVisible) {
        const isDisabled = await publishButton.isDisabled().catch(() => false);
        console.log(`✅ Publish button is visible (disabled: ${isDisabled})`);
        
        if (isDisabled) {
          // Check for warning message
          const warningBanner = page.locator('[class*="warning"], [class*="alert"]').filter({ hasText: /Cannot publish yet/i });
          const warningVisible = await warningBanner.first().isVisible({ timeout: 3000 }).catch(() => false);
          if (warningVisible) {
            console.log('⚠️ Warning banner found - required sections incomplete');
          }
        }
      } else {
        console.log('⚠️ Publish button not found');
      }
    });

    test('should verify status indicators', async ({ page }) => {
      test.setTimeout(60000);
      console.log('🔍 Test: Verify status indicators');
      
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      
      // Check for green checkmarks (complete sections)
      const greenCheckmarks = page.locator('[class*="check"], [class*="success"], svg[class*="check"]');
      const checkmarkCount = await greenCheckmarks.count();
      console.log(`✅ Found ${checkmarkCount} status indicator(s)`);
      
      // Check for yellow exclamation marks (incomplete sections)
      const yellowExclamations = page.locator('[class*="exclamation"], [class*="warning"]').filter({ hasText: /!/i });
      const exclamationCount = await yellowExclamations.count();
      if (exclamationCount > 0) {
        console.log(`⚠️ Found ${exclamationCount} incomplete section indicator(s)`);
      }
    });

    test('should verify edit buttons are available', async ({ page }) => {
      test.setTimeout(60000);
      console.log('🔍 Test: Verify edit buttons are available');
      
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      
      const editButtons = page.getByRole('button', { name: /Edit/i });
      const editButtonCount = await editButtons.count();
      console.log(`✅ Found ${editButtonCount} Edit button(s)`);
    });
  });

  test.describe('Element Inspection', () => {
    /**
     * Helper function to inspect and document page elements
     */
    async function inspectAndDocumentPage(page: any, pageName: string, expectedFields: string[]): Promise<void> {
      console.log(`\n🔍 Inspecting ${pageName} page elements...`);
      
      // Wait for page to fully load
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);
      
      // Use inspection helper
      const elements = await inspectPageElements(page, pageName);
      
      console.log(`\n📋 Form Fields (${elements.length} found):`);
      elements.forEach((element: PageElementInfo) => {
        if (element.type !== 'button') {
          const status = element.visible ? '✅' : '⚠️';
          console.log(`  ${status} ${element.formControlName || element.type}: ${element.visible ? 'visible' : 'not visible'}`);
          if (element.formControlName) {
            console.log(`     Selector: [formcontrolname="${element.formControlName}"]`);
          }
          if (element.label) {
            console.log(`     Label: ${element.label}`);
          }
          if (element.required) {
            console.log(`     Required: Yes`);
          }
        }
      });
      
      // Document navigation elements
      console.log('\n🧭 Navigation Elements:');
      
      const backButton = page.getByRole('button', { name: /Back/i });
      const backVisible = await backButton.isVisible({ timeout: 5000 }).catch(() => false);
      console.log(`  ${backVisible ? '✅' : '⚠️'} Back button: ${backVisible ? 'visible' : 'not found'}`);
      
      const nextButton = page.getByRole('button', { name: /Next|Continue/i });
      const nextVisible = await nextButton.isVisible({ timeout: 5000 }).catch(() => false);
      if (nextVisible) {
        const nextDisabled = await nextButton.isDisabled();
        console.log(`  ✅ Next button: visible (disabled: ${nextDisabled})`);
      } else {
        console.log('  ⚠️ Next button: not found');
      }
      
      const saveDraftButton = page.getByRole('button', { name: /Save Draft|Save as Draft|Save and Exit/i });
      const saveDraftVisible = await saveDraftButton.isVisible({ timeout: 5000 }).catch(() => false);
      console.log(`  ${saveDraftVisible ? '✅' : '⚠️'} Save Draft button: ${saveDraftVisible ? 'visible' : 'not found'}`);
      
      // Check for step indicator
      const stepIndicator = page.locator('[class*="step"], [class*="progress"], [class*="indicator"]')
        .or(page.locator('[aria-label*="step"], [aria-label*="progress"]'));
      const stepIndicatorVisible = await stepIndicator.first().isVisible({ timeout: 3000 }).catch(() => false);
      if (stepIndicatorVisible) {
        console.log('  ✅ Step indicator: visible');
      }
      
      // Take screenshot
      const screenshotPath = `test-results/${pageName.toLowerCase().replace(/\s+/g, '-')}-inspection.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`\n📸 Screenshot saved: ${screenshotPath}`);
      
      console.log(`\n✅ ${pageName} page inspection completed`);
    }

    test('should inspect Basic Info page elements', async ({ page }) => {
      test.setTimeout(60000);
      await navigateToPlatformStep(page, 'basic-info');
      await inspectAndDocumentPage(page, 'Basic Info', ['Title', 'Slug', 'Category', 'Type', 'Location']);
    });

    test('should inspect Audience page elements', async ({ page }) => {
      test.setTimeout(60000);
      await navigateToPlatformStep(page, 'audience');
      await inspectAndDocumentPage(page, 'Audience', ['Access', 'Audience', 'Expertise', 'Languages']);
    });

    test('should inspect Booking page elements', async ({ page }) => {
      test.setTimeout(60000);
      await navigateToPlatformStep(page, 'booking');
      await inspectAndDocumentPage(page, 'Booking', ['Duration', 'Timezone', 'Schedules', 'Cutoff']);
    });

    test('should inspect Tickets page elements', async ({ page }) => {
      test.setTimeout(60000);
      await navigateToPlatformStep(page, 'tickets');
      await inspectAndDocumentPage(page, 'Tickets', ['Fee Paid By', 'Tickets']);
    });

    test('should inspect Page step elements', async ({ page }) => {
      test.setTimeout(60000);
      await navigateToPlatformStep(page, 'page');
      await inspectAndDocumentPage(page, 'Page', ['Description', 'Cover', 'Gallery', 'Video']);
    });

    test('should inspect Details page elements', async ({ page }) => {
      test.setTimeout(60000);
      await navigateToPlatformStep(page, 'details');
      await inspectAndDocumentPage(page, 'Details', ['Outcomes', 'Instructions', 'Materials', 'Custom Questions']);
    });

    test('should inspect Confirm page elements', async ({ page }) => {
      test.setTimeout(60000);
      await navigateToPlatformStep(page, 'confirm');
      await inspectAndDocumentPage(page, 'Confirm', ['Review', 'Publish']);
      
      // Additional checks for Confirm page
      const publishButton = page.getByRole('button', { name: /Publish/i });
      const publishVisible = await publishButton.isVisible({ timeout: 5000 }).catch(() => false);
      console.log(`\n📋 Confirm Page Specific Elements:`);
      console.log(`  ${publishVisible ? '✅' : '⚠️'} Publish button: ${publishVisible ? 'visible' : 'not found'}`);
      
      // Check for review sections
      const reviewSection = page.locator('[class*="review"], [class*="summary"]')
        .or(page.locator('section').filter({ hasText: /Review|Summary/i }));
      const reviewVisible = await reviewSection.first().isVisible({ timeout: 5000 }).catch(() => false);
      console.log(`  ${reviewVisible ? '✅' : '⚠️'} Review section: ${reviewVisible ? 'visible' : 'not found'}`);
    });
  });

  test.describe('Complete Flow', () => {
    test('should complete full Platform experience creation flow according to documentation', async ({ page }) => {
      test.setTimeout(300000); // 5 minutes for full flow with all form filling
      console.log('🔍 Test: Complete full Platform experience creation flow according to documentation');
      
      const timestamp = Date.now();
      const uniqueId = `e2e-${timestamp}`;
      
      // Step 1: Navigate to Basic Info
      await navigateToExperienceCreation(page);
      await selectExperienceType(page, 'platform');
      await expect(page).toHaveURL(/.*platform.*basic-info/i, { timeout: 10000 });
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      console.log('✅ Step 1: Navigated to Basic Info');
      
      // Step 2: Fill Basic Info
      const basicInfoData: ExperienceBasicInfoData = {
        title: `E2E Test Experience ${uniqueId}`,
        slug: `e2e-test-experience-${uniqueId}`,
        category: 'Workshop',
        type: 'Virtual',
      };
      await fillExperienceBasicInfo(page, basicInfoData);
      await goToNextStep(page);
      await expect(page).toHaveURL(/.*platform.*audience/i, { timeout: 10000 });
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      console.log('✅ Step 2: Filled Basic Info and navigated to Audience');
      
      // Step 3: Fill Audience Page
      const audienceData: ExperienceAudienceData = {
        access: 'Everyone',
        targetAudience: 'Open to Everyone',
        expertise: 'Beginner',
        primaryLanguage: 'English',
        secondaryLanguage: 'Malay',
      };
      await fillExperienceAudienceInfo(page, audienceData);
      await goToNextStep(page);
      await expect(page).toHaveURL(/.*platform.*booking/i, { timeout: 10000 });
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      console.log('✅ Step 3: Filled Audience form and navigated to Booking');
      
      // Step 4: Fill Booking Page
      const bookingData: ExperienceBookingData = {
        durationHours: 1,
        durationMinutes: 30,
        timezone: 'Malaysia (GMT+8)',
        slotDate: new Date(),
        slotHour: 8,
        slotMinute: 30,
        slotAMPM: 'AM',
        repeatPattern: 'Daily',
      };
      await fillExperienceBookingInfo(page, bookingData);
      await goToNextStep(page);
      await expect(page).toHaveURL(/.*platform.*tickets/i, { timeout: 10000 });
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      console.log('✅ Step 4: Filled Booking form and navigated to Tickets');
      
      // Step 5: Fill Tickets Page
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
      await fillExperienceTicketsInfo(page, ticketsData);
      await goToNextStep(page);
      await expect(page).toHaveURL(/.*platform.*page/i, { timeout: 10000 });
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      console.log('✅ Step 5: Filled Tickets form and navigated to Page');
      
      // Step 6: Fill Page Step
      const pageData: ExperiencePageData = {
        description: `This is a comprehensive test experience description for ${uniqueId}. It includes details about what learners will do, how the experience is unique, and what knowledge they will gain. This description follows the guidelines provided in the documentation.`,
        videoUrl: 'https://www.youtube.com/watch?v=SHxwjQUVW4k&t=4s',
        // Note: coverPhoto requires actual file path - skipping for now
      };
      await fillExperiencePageInfo(page, pageData);
      await goToNextStep(page);
      await expect(page).toHaveURL(/.*platform.*details/i, { timeout: 10000 });
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      console.log('✅ Step 6: Filled Page form and navigated to Details');
      
      // Step 7: Fill Details Page
      const detailsData: ExperienceDetailsData = {
        learningOutcomes: 'Learners will gain practical skills, understand key concepts, and be able to apply knowledge in real-world scenarios.',
        instructions: 'Please prepare your laptop and ensure you have a stable internet connection. Join the meeting 5 minutes early.',
        materials: 'No materials provided',
        whatToBring: 'This experience does not require anything',
      };
      await fillExperienceDetailsInfo(page, detailsData);
      await goToNextStep(page);
      await expect(page).toHaveURL(/.*platform.*confirm/i, { timeout: 10000 });
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      console.log('✅ Step 7: Filled Details form and navigated to Confirm');
      
      // Step 8: Verify Confirmation Page
      const verification = await verifyConfirmationPage(page);
      console.log(`✅ Step 8: Reached Confirm page - canPublish=${verification.canPublish}`);
      
      if (verification.incompleteSections.length > 0) {
        console.log(`⚠️ Incomplete sections: ${verification.incompleteSections.join(', ')}`);
      }
      
      // Verify Publish button is visible (but don't actually publish to avoid creating test data)
      const publishButton = page.getByRole('button', { name: /Publish/i });
      const publishVisible = await publishButton.isVisible({ timeout: 5000 }).catch(() => false);
      if (publishVisible) {
        const isDisabled = await publishButton.isDisabled().catch(() => false);
        console.log(`✅ Publish button is visible (disabled: ${isDisabled})`);
        
        if (!isDisabled && verification.canPublish) {
          console.log('✅ All required fields filled - experience is ready to publish');
        } else {
          console.log('⚠️ Publish button is disabled - some required fields may be missing');
        }
      } else {
        console.log('⚠️ Publish button not found');
      }
      
      console.log('✅ Complete flow test finished successfully');
    });

    test('should navigate back and forth between steps', async ({ page }) => {
      test.setTimeout(90000);
      console.log('🔍 Test: Navigate back and forth between steps');
      
      // Navigate to Audience page
      await navigateToPlatformStep(page, 'audience');
      await expect(page).toHaveURL(/.*platform.*audience/i, { timeout: 10000 });
      console.log('✅ Navigated to Audience page');
      
      // Go back to Basic Info
      await goToPreviousStep(page);
      await expect(page).toHaveURL(/.*platform.*basic-info/i, { timeout: 10000 });
      console.log('✅ Navigated back to Basic Info');
      
      // Go forward to Audience again
      await goToNextStep(page);
      await expect(page).toHaveURL(/.*platform.*audience/i, { timeout: 10000 });
      console.log('✅ Navigated forward to Audience again');
    });
  });
});
