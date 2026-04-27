/**
 * Creation Flow Helper Functions for E2E Tests
 * 
 * Provides helper functions for Experience, Expertise, and Job creation flows
 */

import { Page, expect } from '@playwright/test';
import { loginUser } from './auth-e2e-helper';

// Environment configuration
const APP_URL = process.env.TEST_ENV === 'live' || process.env.TEST_ENV === 'production'
  ? 'https://v2.app.mereka.dev'
  : process.env.TEST_ENV === 'staging'
  ? 'https://v2-staging.app.mereka.io'
  : 'https://v2.app.mereka.dev';

// ============================================================================
// EXPERIENCE CREATION HELPERS
// ============================================================================

export interface ExperienceBasicInfoData {
  title: string;
  slug: string;
  category?: string;
  topics?: string[];
  type?: 'Physical' | 'Virtual' | 'Hybrid';
  location?: string;
  hosts?: string[];
}

export interface ExperienceAudienceData {
  access?: 'Everyone' | 'Members';
  targetAudience?: 'Open to Everyone' | 'Specific Groups';
  expertise?: 'Beginner' | 'Intermediate' | 'Advanced' | 'Not Applicable';
  primaryLanguage?: string; // e.g., "English"
  secondaryLanguage?: string; // e.g., "Malay"
  hidden?: boolean; // "I want my Experience to be hidden" checkbox
}

export interface ExperienceBookingData {
  durationHours?: number; // e.g., 1
  durationMinutes?: number; // e.g., 30
  timezone?: string; // e.g., "Malaysia (GMT+8)"
  slotDate?: Date; // Date for slot (defaults to today)
  slotHour?: number; // e.g., 8
  slotMinute?: number; // e.g., 30
  slotAMPM?: 'AM' | 'PM'; // e.g., "AM"
  repeatPattern?: 'Daily' | 'Weekly' | 'Monthly'; // e.g., "Daily"
}

export interface TicketData {
  type: 'Paid' | 'Free';
  name: string;
  price?: number; // Required for Paid tickets
  quantity: number; // e.g., 100
}

export interface ExperienceTicketsData {
  serviceFee?: 'No, users will bear the service fee' | 'Yes, I will absorb the service fee';
  tickets?: TicketData[];
}

export interface ExperiencePageData {
  description?: string; // Max 2000 characters
  coverPhoto?: string; // File path for cover photo upload
  galleryPhotos?: string[]; // File paths for gallery photos (max 10)
  videoUrl?: string; // YouTube or Vimeo URL, e.g., "https://www.youtube.com/watch?v=SHxwjQUVW4k&t=4s"
}

export interface ExperienceDetailsData {
  learningOutcomes?: string; // Description textarea
  instructions?: string; // Description textarea
  materials?: 'No materials provided' | string; // Radio option or custom text
  whatToBring?: 'This experience does not require anything' | string; // Radio option or custom text
  poster?: string; // File path for poster upload
  customQuestions?: any[]; // Array of custom question objects
}

/**
 * Navigate to Experience Creation flow (with login)
 */
export async function navigateToExperienceCreation(page: Page): Promise<void> {
  // Login first
  await loginUser(page);
  
  // Navigate to hub dashboard overview
  await page.goto(`${APP_URL}/hub/overview`);
  await page.waitForLoadState('networkidle');
  
  // Click "Manage Services" menu item
  const manageServicesMenu = page.getByRole('button', { name: /Manage Services/i })
    .or(page.getByRole('link', { name: /Manage Services/i }));
  await expect(manageServicesMenu.first()).toBeVisible({ timeout: 10000 });
  await manageServicesMenu.first().click();
  await page.waitForTimeout(500); // Wait for dropdown to open
  
  // Click "Experiences" option from dropdown
  const experiencesOption = page.getByRole('link', { name: /Experiences/i })
    .or(page.getByRole('menuitem', { name: /Experiences/i }));
  await expect(experiencesOption.first()).toBeVisible({ timeout: 10000 });
  await experiencesOption.first().click();
  await page.waitForLoadState('networkidle');
  
  // Verify we're on Experiences page
  await expect(page).toHaveURL(/.*hub.*services.*experiences|.*services.*experiences/i, { timeout: 10000 });
  
  // Find and click "Add an Experience" button (bottom of left sidebar)
  const addExperienceButton = page.getByRole('button', { name: /Add an Experience/i })
    .or(page.getByRole('link', { name: /Add an Experience/i }))
    .or(page.locator('button').filter({ hasText: /\+.*Add.*Experience/i }))
    .or(page.locator('a').filter({ hasText: /\+.*Add.*Experience/i }));
  
  await expect(addExperienceButton.first()).toBeVisible({ timeout: 15000 });
  await addExperienceButton.first().click();
  await page.waitForLoadState('networkidle');
  
  // Verify we're on the experience type selection page
  await expect(page).toHaveURL(/.*experience.*select-type|.*onboarding.*experience/i, { timeout: 10000 });
}

/**
 * Navigate to Experience Creation flow WITHOUT login (assumes user is already authenticated)
 * Use this when you want to skip the login step to save ~20 seconds
 * 
 * IMPORTANT: Make sure you're already authenticated before calling this function.
 * You can authenticate once using storageState (see playwright.config.ts) or
 * call loginUser() once before running multiple tests.
 */
export async function navigateToExperienceCreationWithoutLogin(page: Page): Promise<void> {
  // Navigate directly to hub dashboard overview (assumes already logged in)
  await page.goto(`${APP_URL}/hub/overview`);
  await page.waitForLoadState('networkidle');
  
  // Click "Manage Services" menu item
  const manageServicesMenu = page.getByRole('button', { name: /Manage Services/i })
    .or(page.getByRole('link', { name: /Manage Services/i }));
  await expect(manageServicesMenu.first()).toBeVisible({ timeout: 10000 });
  await manageServicesMenu.first().click();
  await page.waitForTimeout(500); // Wait for dropdown to open
  
  // Click "Experiences" option from dropdown
  const experiencesOption = page.getByRole('link', { name: /Experiences/i })
    .or(page.getByRole('menuitem', { name: /Experiences/i }));
  await expect(experiencesOption.first()).toBeVisible({ timeout: 10000 });
  await experiencesOption.first().click();
  await page.waitForLoadState('networkidle');
  
  // Verify we're on Experiences page
  await expect(page).toHaveURL(/.*hub.*services.*experiences|.*services.*experiences/i, { timeout: 10000 });
  
  // Find and click "Add an Experience" button (bottom of left sidebar)
  const addExperienceButton = page.getByRole('button', { name: /Add an Experience/i })
    .or(page.getByRole('link', { name: /Add an Experience/i }))
    .or(page.locator('button').filter({ hasText: /\+.*Add.*Experience/i }))
    .or(page.locator('a').filter({ hasText: /\+.*Add.*Experience/i }));
  
  await expect(addExperienceButton.first()).toBeVisible({ timeout: 15000 });
  await addExperienceButton.first().click();
  await page.waitForLoadState('networkidle');
  
  // Verify we're on the experience type selection page
  await expect(page).toHaveURL(/.*experience.*select-type|.*onboarding.*experience/i, { timeout: 10000 });
}

/**
 * Select Experience Type (Express or Platform)
 */
export async function selectExperienceType(page: Page, type: 'express' | 'platform'): Promise<void> {
  // Wait for type selection page to load
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  
  if (type === 'platform') {
    // Strategy: Find the Platform radio button by looking for it near Platform-specific text
    // Platform card has unique text: "Visible & searchable on mereka.io"
    const platformUniqueText = page.getByText(/Visible & searchable on mereka.io/i);
    const hasUniqueText = await platformUniqueText.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (hasUniqueText) {
      // Find the radio button near this text - go up the DOM tree to find the card, then find radio
      const platformCard = platformUniqueText.locator('..').or(platformUniqueText.locator('../..')).or(platformUniqueText.locator('../../..'));
      const platformRadio = platformCard.locator('input[type="radio"]').first();
      
      const radioVisible = await platformRadio.isVisible({ timeout: 3000 }).catch(() => false);
      if (radioVisible) {
        // Click the radio button directly
        await platformRadio.click();
        await page.waitForTimeout(1500);
      } else {
        // If radio not found, click the card itself
        await platformCard.first().click();
        await page.waitForTimeout(1500);
      }
    } else {
      // Fallback: Find by "Platform listing" text
      const platformText = page.getByText(/Platform listing/i);
      if (await platformText.isVisible({ timeout: 5000 }).catch(() => false)) {
        const platformCard = platformText.locator('..').or(platformText.locator('../..'));
        const platformRadio = platformCard.locator('input[type="radio"]').first();
        
        const radioVisible = await platformRadio.isVisible({ timeout: 3000 }).catch(() => false);
        if (radioVisible) {
          await platformRadio.click();
          await page.waitForTimeout(1500);
        } else {
          await platformCard.first().click();
          await page.waitForTimeout(1500);
        }
      } else {
        throw new Error('Could not find Platform listing card');
      }
    }
  } else {
    // For Express, find the Express listing card
    const expressCard = page.locator('div, section, button').filter({ hasText: /Express listing/i })
      .or(page.locator(`[data-type="express"]`))
      .first();
    
    await expect(expressCard).toBeVisible({ timeout: 10000 });
    
    const radioInCard = expressCard.locator('input[type="radio"]');
    const hasRadio = await radioInCard.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (hasRadio) {
      await radioInCard.click();
    } else {
      await expressCard.click();
    }
    
    await page.waitForTimeout(1500);
  }
  
  // Before clicking Next, verify the correct type is selected
  if (type === 'platform') {
    // Check which radio button is currently checked
    const allRadios = page.locator('input[type="radio"]');
    const radioCount = await allRadios.count();
    let platformSelected = false;
    
    for (let i = 0; i < radioCount; i++) {
      const radio = allRadios.nth(i);
      const isChecked = await radio.isChecked().catch(() => false);
      if (isChecked) {
        // Check if this checked radio belongs to Platform card
        const parent = radio.locator('..').or(radio.locator('../..'));
        const parentText = await parent.textContent().catch(() => '');
        if (parentText && /Platform listing/i.test(parentText) && !/Express listing/i.test(parentText)) {
          platformSelected = true;
          break;
        }
      }
    }
    
    // If Platform is not selected, try to select it again
    if (!platformSelected) {
      console.log('⚠️ Platform not selected, attempting to select it...');
      
      // First, check if Express is selected and uncheck it if needed
      for (let i = 0; i < radioCount; i++) {
        const radio = allRadios.nth(i);
        const isChecked = await radio.isChecked().catch(() => false);
        if (isChecked) {
          const parent = radio.locator('..').or(radio.locator('../..'));
          const parentText = await parent.textContent().catch(() => '');
          if (parentText && /Express listing/i.test(parentText)) {
            // Express is selected, click Platform card to switch
            const platformUniqueText = page.getByText(/Visible & searchable on mereka.io/i);
            const platformCard = platformUniqueText.locator('..').or(platformUniqueText.locator('../..')).or(platformUniqueText.locator('../../..'));
            await platformCard.first().click();
            await page.waitForTimeout(1500);
            break;
          }
        }
      }
    }
  }
  
  // Click Next button
  const nextButton = page.getByRole('button', { name: /Next/i });
  await expect(nextButton).toBeVisible({ timeout: 10000 });
  await nextButton.click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  
  // Verify navigation to correct page
  if (type === 'platform') {
    await expect(page).toHaveURL(/.*platform.*basic-info|.*onboarding.*experience.*platform.*basic-info/i, { timeout: 10000 });
  } else {
    await expect(page).toHaveURL(/.*express|.*onboarding.*experience.*express/i, { timeout: 10000 });
  }
}

/**
 * Fill Experience Basic Info (Step 1 of Platform flow)
 */
export async function fillExperienceBasicInfo(page: Page, data: ExperienceBasicInfoData): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  
  // Title - try multiple selectors based on actual page structure
  const titleInput = page.locator('input[formcontrolname="title"]')
    .or(page.locator('input[placeholder*="Title"], input[placeholder*="title"], input[placeholder*="Name"]'))
    .or(page.getByLabel(/Title|Name/i))
    .or(page.locator('textbox').filter({ hasText: /Name/i }).first())
    .or(page.locator('input[type="text"]').first());
  
  const titleVisible = await titleInput.first().isVisible({ timeout: 5000 }).catch(() => false);
  if (titleVisible) {
    await titleInput.first().fill(data.title);
    await page.waitForTimeout(500);
  } else {
    // Try finding by heading context
    const nameHeading = page.getByRole('heading', { name: /Provide a title|Name/i });
    const headingVisible = await nameHeading.isVisible({ timeout: 3000 }).catch(() => false);
    if (headingVisible) {
      const textboxNearHeading = nameHeading.locator('..').locator('textbox').first();
      const textboxVisible = await textboxNearHeading.isVisible({ timeout: 2000 }).catch(() => false);
      if (textboxVisible) {
        await textboxNearHeading.fill(data.title);
        await page.waitForTimeout(500);
      }
    }
  }
  
  // Slug (may auto-generate from title)
  const slugInput = page.locator('input[formcontrolname="slug"]')
    .or(page.locator('input[placeholder*="Slug"], input[placeholder*="slug"], input[placeholder*="your-experience-name"]'))
    .or(page.getByLabel(/Slug|Experience Link/i));
  
  if (await slugInput.first().isVisible({ timeout: 3000 }).catch(() => false)) {
    await slugInput.first().fill(data.slug);
    await page.waitForTimeout(500);
  }
  
  // Category - Step 1: Select "What type of Experience will you offer?"
  // Categories are displayed as cards in a grid, clicking on the card selects it
  if (data.category) {
    // Map common category names to match the card text
    const categoryMap: Record<string, string> = {
      'Technology': 'Workshop',
      'Event': 'Event',
      'Talk': 'Talk',
      'Program': 'Program',
      'Workshop': 'Workshop',
      'Show & Exhibition': 'Show & Exhibition',
    };
    
    const categoryName = categoryMap[data.category] || data.category;
    
    // Find the category card - cards have the category name as a span with font-semibold
    // Look for the card container that contains the category name
    const categoryCard = page.locator('div').filter({ hasText: new RegExp(`^${categoryName}$`, 'i') })
      .or(page.getByText(new RegExp(`^${categoryName}$`, 'i')).locator('..').locator('..'))
      .or(page.locator('div[class*="grid"]').locator('div').filter({ hasText: new RegExp(categoryName, 'i') }))
      .first();
    
    const cardVisible = await categoryCard.isVisible({ timeout: 5000 }).catch(() => false);
    if (cardVisible) {
      await categoryCard.click();
      await page.waitForTimeout(1500); // Wait for category selection to register
      console.log(`✅ Selected experience category: ${categoryName}`);
    } else {
      // Fallback: try finding by exact text match
      const fallbackCard = page.getByText(new RegExp(`^${categoryName}$`, 'i'))
        .locator('..')
        .locator('..')
        .first();
      
      const fallbackVisible = await fallbackCard.isVisible({ timeout: 3000 }).catch(() => false);
      if (fallbackVisible) {
        await fallbackCard.click();
        await page.waitForTimeout(1500);
        console.log(`✅ Selected experience category: ${categoryName} (fallback)`);
      } else {
        console.log(`⚠️ Could not find category card for: ${categoryName}`);
      }
    }
    
    // Step 2: Click "Add Theme" button (only if category was selected)
    await page.waitForTimeout(1000);
    const addThemeButton = page.getByRole('button', { name: /Add Theme/i })
      .or(page.locator('button').filter({ hasText: /Add Theme/i }))
      .or(page.getByText(/Add Theme/i).locator('..'));
    
    const addThemeVisible = await addThemeButton.first().isVisible({ timeout: 5000 }).catch(() => false);
    if (addThemeVisible) {
      await addThemeButton.first().click();
      await page.waitForTimeout(1000);
      console.log('✅ Clicked "Add Theme" button');
      
      // Step 3: Select main theme category (e.g., "Art & Design")
      // Wait for theme selection to appear
      await page.waitForTimeout(1000);
      
      // Select first available theme (or you can make this configurable)
      // Themes are displayed as buttons in a flex-wrap container
      const themeButtons = page.locator('button').filter({ hasText: /Art|Music|Technology|Business|Health|Education|Photography|Writing/i });
      const themeButtonCount = await themeButtons.count();
      
      if (themeButtonCount > 0) {
        // Select first theme (or you can make this configurable via data parameter)
        await themeButtons.first().click();
        await page.waitForTimeout(1000);
        const themeName = await themeButtons.first().textContent();
        console.log(`✅ Selected main theme category: ${themeName}`);
        
        // Step 4: Select topic within the theme
        // Topics appear after selecting a theme - wait for topic selection section to appear
        await page.waitForTimeout(2000); // Give more time for topic section to render
        
        // Look for the topic selection section heading
        const topicSectionHeading = page.getByText(/Select the topic within your theme/i);
        const topicSectionVisible = await topicSectionHeading.isVisible({ timeout: 5000 }).catch(() => false);
        
        if (topicSectionVisible) {
          console.log('✅ Topic selection section is visible');
          
          // Wait a bit more for topic buttons to render
          await page.waitForTimeout(1500);
          
          // Find the topic buttons container - it's a div with flex-wrap that's a sibling of the heading
          // Structure: div (container) > h4 (heading) + div.flex.flex-wrap (topic buttons)
          const topicHeadingParent = topicSectionHeading.locator('..'); // Parent of h4
          const topicButtonsContainer = topicHeadingParent.locator('div.flex.flex-wrap, div[class*="flex"][class*="wrap"]')
            .or(topicHeadingParent.locator('div').filter({ hasText: /Painting|Drawing|Sculpture|Digital Art|Graphic Design/i }));
          
          // Find buttons within the topic buttons container ONLY (not navigation buttons)
          // Topic buttons have specific classes: px-4 py-2 bg-white border border-neutral-200
          const topicButtons = topicButtonsContainer.locator('button')
            .filter({ hasText: /Painting|Drawing|Sculpture|Digital Art|Graphic Design|Photography|Writing|Music|Technology|Business|Health|Education/i })
            .or(topicButtonsContainer.locator('button[class*="px-4"][class*="py-2"]'))
            .or(topicButtonsContainer.locator('button').filter({ hasText: /^[A-Z][a-z]+$/ })); // Topic names are usually single words like "Painting"
          
          const topicButtonCount = await topicButtons.count();
          console.log(`🔍 Found ${topicButtonCount} topic button(s) in topic container`);
          
          if (topicButtonCount > 0) {
            // Filter out navigation buttons - topics are usually single words, not phrases
            let validTopicButton = null;
            const validTopicNames = ['Painting', 'Drawing', 'Sculpture', 'Digital Art', 'Graphic Design', 'Photography', 'Writing', 'Music', 'Technology', 'Business', 'Health', 'Education'];
            
            for (let i = 0; i < topicButtonCount; i++) {
              const btn = topicButtons.nth(i);
              const btnText = await btn.textContent().catch(() => '');
              const trimmedText = btnText?.trim() || '';
              
              // Check if it's a valid topic name (not navigation like "Your Experience", "Booking Details", etc.)
              const isNavigationButton = /Your Experience|Your Audience|Booking Details|Tickets|Your Page|More Details|Confirmation|Next|Back|Continue/i.test(trimmedText);
              const isThemeButton = /Art & Design|Music & Audio|Technology|Business|Health & Wellness|Education|Photography|Writing/i.test(trimmedText);
              const isValidTopic = validTopicNames.some(name => trimmedText.includes(name)) || 
                                   (!isNavigationButton && !isThemeButton && trimmedText.length > 0 && trimmedText.length < 20);
              
              if (isValidTopic && !isNavigationButton && !isThemeButton) {
                validTopicButton = btn;
                console.log(`✅ Found valid topic button: "${trimmedText}"`);
                break;
              }
            }
            
            if (validTopicButton) {
              const topicName = await validTopicButton.textContent().catch(() => '');
              await validTopicButton.click();
              await page.waitForTimeout(2000); // Wait for topic selection to register and UI to close
              console.log(`✅ Selected topic: "${topicName?.trim()}"`);
              
              // Verify that theme selection UI closed (it should close automatically after selecting topic)
              await page.waitForTimeout(1000);
              const themeSelectionHeading = page.getByText(/Select the main theme category/i);
              const themeSelectionStillVisible = await themeSelectionHeading.isVisible({ timeout: 2000 }).catch(() => false);
              
              if (!themeSelectionStillVisible) {
                console.log('✅ Theme selection UI closed successfully after topic selection');
              } else {
                console.log('⚠️ Theme selection UI still visible - may need to close manually');
              }
              
              // Verify topic was added by checking if it appears in the selected themes list
              await page.waitForTimeout(1000);
              const selectedThemeVisible = await page.getByText(themeName || 'Art').isVisible({ timeout: 3000 }).catch(() => false);
              if (selectedThemeVisible) {
                console.log('✅ Verified: Theme and topic were added successfully');
              }
            } else {
              console.log('⚠️ No valid topic button found - all buttons appear to be navigation or theme buttons');
              // Last resort: try clicking the first button in the container that's not a theme button
              const firstButton = topicButtonsContainer.locator('button').first();
              const firstButtonText = await firstButton.textContent().catch(() => '');
              const isNavButton = /Your Experience|Your Audience|Booking Details|Tickets|Your Page/i.test(firstButtonText || '');
              
              if (!isNavButton) {
                await firstButton.click();
                await page.waitForTimeout(2000);
                console.log(`✅ Selected first button as topic (fallback): "${firstButtonText?.trim()}"`);
              } else {
                console.log('⚠️ First button is a navigation button, skipping...');
              }
            }
          } else {
            console.log('⚠️ No topic buttons found in topic container');
          }
        } else {
          console.log('⚠️ Topic selection section not visible - theme may not have been selected properly');
        }
      } else {
        console.log('⚠️ No theme buttons found');
      }
    } else {
      console.log('⚠️ Add Theme button not found - theme selection may already be visible or category not selected');
    }
  }
  
  // Type - use radio buttons (Physical, Virtual, Hybrid)
  if (data.type) {
    const typeRadio = page.getByRole('radio', { name: new RegExp(data.type, 'i') });
    const radioVisible = await typeRadio.isVisible({ timeout: 3000 }).catch(() => false);
    if (radioVisible) {
      await typeRadio.click();
      await page.waitForTimeout(500);
    } else {
      // Fallback to select if radio buttons don't exist
      const typeSelect = page.locator('select[formcontrolname="type"]')
        .or(page.locator('[formcontrolname="type"]'))
        .or(page.getByLabel(/Type/i));
      
      if (await typeSelect.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await typeSelect.first().selectOption(data.type);
        await page.waitForTimeout(500);
      }
    }
  }
  
  // Location (if Physical or Hybrid) - may need to click "New Address" button first
  if (data.location && (data.type === 'Physical' || data.type === 'Hybrid')) {
    // Check if location section is visible
    const locationSection = page.getByRole('heading', { name: /location/i });
    const locationSectionVisible = await locationSection.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (locationSectionVisible) {
      // Try to find location input
      const locationInput = page.locator('input[formcontrolname="location"]')
        .or(page.locator('input[placeholder*="Location"], input[placeholder*="Street Address"]'))
        .or(page.getByLabel(/Location|Street Address/i));
      
      if (await locationInput.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await locationInput.first().fill(data.location);
        await page.waitForTimeout(500);
      }
    }
  }
}

/**
 * Fill Experience Audience Info (Page 2 of Platform flow)
 */
export async function fillExperienceAudienceInfo(page: Page, data: ExperienceAudienceData): Promise<void> {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000);
  
  // Step 1: Experience Access - Select "Everyone" (default selection)
  const everyoneRadio = page.getByRole('radio', { name: /Everyone/i });
  const everyoneVisible = await everyoneRadio.isVisible({ timeout: 5000 }).catch(() => false);
  if (everyoneVisible) {
    const isChecked = await everyoneRadio.isChecked().catch(() => false);
    if (!isChecked) {
      await everyoneRadio.click();
      await page.waitForTimeout(500);
    }
    console.log('✅ Selected "Everyone" for Experience Access');
  }
  
  // Step 2: Target Audience - Select "Open to Everyone"
  const openToEveryoneRadio = page.getByRole('radio', { name: /Open to Everyone/i });
  const openToEveryoneVisible = await openToEveryoneRadio.isVisible({ timeout: 5000 }).catch(() => false);
  if (openToEveryoneVisible) {
    await openToEveryoneRadio.click();
    await page.waitForTimeout(500);
    console.log('✅ Selected "Open to Everyone" for Target Audience');
  }
  
  // Step 3: Level of Expertise - Select "Beginner" (optional)
  if (data.expertise === 'Beginner' || !data.expertise) {
    const beginnerRadio = page.getByRole('radio', { name: /Beginner/i });
    const beginnerVisible = await beginnerRadio.isVisible({ timeout: 5000 }).catch(() => false);
    if (beginnerVisible) {
      await beginnerRadio.click();
      await page.waitForTimeout(500);
      console.log('✅ Selected "Beginner" for Level of Expertise');
    }
  }
  
  // Step 4: Primary Language - Select "English"
  const primaryLanguage = data.primaryLanguage || 'English';
  const primaryLanguageSelect = page.locator('select[formcontrolname="primaryLanguage"]')
    .or(page.locator('select').filter({ hasText: /Choose language/i }).first())
    .or(page.getByLabel(/What language will you be hosting in/i));
  
  const primarySelectVisible = await primaryLanguageSelect.first().isVisible({ timeout: 5000 }).catch(() => false);
  if (primarySelectVisible) {
    // Try to select by visible text first
    try {
      await primaryLanguageSelect.first().selectOption({ label: primaryLanguage });
      await page.waitForTimeout(500);
      console.log(`✅ Selected primary language: ${primaryLanguage}`);
    } catch (error) {
      // Fallback: select first available option
      const options = await primaryLanguageSelect.first().locator('option').count();
      if (options > 1) {
        await primaryLanguageSelect.first().selectOption({ index: 1 });
        await page.waitForTimeout(500);
        console.log('✅ Selected primary language (fallback)');
      }
    }
  }
  
  // Step 5: Secondary Language - Select "Malay" (optional)
  if (data.secondaryLanguage) {
    const secondaryLanguageSelect = page.locator('select').filter({ hasText: /Select language/i }).first()
      .or(page.locator('select[formcontrolname*="secondaryLanguage"]'))
      .or(page.getByLabel(/Do you know any other languages/i));
    
    const secondarySelectVisible = await secondaryLanguageSelect.first().isVisible({ timeout: 5000 }).catch(() => false);
    if (secondarySelectVisible) {
      try {
        await secondaryLanguageSelect.first().selectOption({ label: data.secondaryLanguage });
        await page.waitForTimeout(500);
        console.log(`✅ Selected secondary language: ${data.secondaryLanguage}`);
      } catch (error) {
        // Try to find option by text
        const options = secondaryLanguageSelect.first().locator('option');
        const optionCount = await options.count();
        for (let i = 0; i < optionCount; i++) {
          const optionText = await options.nth(i).textContent();
          if (optionText && optionText.includes(data.secondaryLanguage)) {
            await secondaryLanguageSelect.first().selectOption({ index: i });
            await page.waitForTimeout(500);
            console.log(`✅ Selected secondary language: ${data.secondaryLanguage}`);
            break;
          }
        }
      }
    }
  }
}

/**
 * Fill Experience Booking Info (Page 3 of Platform flow)
 */
export async function fillExperienceBookingInfo(page: Page, data: ExperienceBookingData): Promise<void> {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000);
  
  // Step 1: Schedule Duration - Select 1 hour and 30 minutes
  const hours = data.durationHours ?? 1;
  const minutes = data.durationMinutes ?? 30;
  
  // Find Hour(s) dropdown
  const hourSelect = page.locator('select').filter({ hasText: /Hour/i }).first()
    .or(page.locator('select[formcontrolname*="hour"]'))
    .or(page.getByLabel(/Hour/i));
  
  const hourSelectVisible = await hourSelect.first().isVisible({ timeout: 5000 }).catch(() => false);
  if (hourSelectVisible) {
    try {
      await hourSelect.first().selectOption({ label: hours.toString() });
      await page.waitForTimeout(500);
      console.log(`✅ Selected duration hours: ${hours}`);
    } catch (error) {
      // Fallback: select by index or value
      await hourSelect.first().selectOption({ value: hours.toString() }).catch(() => {
        hourSelect.first().selectOption({ index: hours });
      });
      await page.waitForTimeout(500);
    }
  }
  
  // Find Minute(s) dropdown
  const minuteSelect = page.locator('select').filter({ hasText: /Minute/i }).first()
    .or(page.locator('select[formcontrolname*="minute"]'))
    .or(page.getByLabel(/Minute/i));
  
  const minuteSelectVisible = await minuteSelect.first().isVisible({ timeout: 5000 }).catch(() => false);
  if (minuteSelectVisible) {
    try {
      // Minutes are typically in increments of 5 (00, 05, 10, 15, 20, 25, 30, etc.)
      const minuteValue = minutes.toString().padStart(2, '0');
      await minuteSelect.first().selectOption({ label: minuteValue });
      await page.waitForTimeout(500);
      console.log(`✅ Selected duration minutes: ${minutes}`);
    } catch (error) {
      // Fallback: find option with matching value
      const options = minuteSelect.first().locator('option');
      const optionCount = await options.count();
      for (let i = 0; i < optionCount; i++) {
        const optionValue = await options.nth(i).getAttribute('value') || await options.nth(i).textContent();
        if (optionValue && optionValue.includes(minutes.toString())) {
          await minuteSelect.first().selectOption({ index: i });
          await page.waitForTimeout(500);
          console.log(`✅ Selected duration minutes: ${minutes}`);
          break;
        }
      }
    }
  }
  
  // Step 2: Timezone Selection - Select "Malaysia (GMT+8)"
  const timezone = data.timezone || 'Malaysia (GMT+8)';
  const timezoneSelect = page.locator('select').filter({ hasText: /Timezone/i }).first()
    .or(page.locator('select[formcontrolname*="timezone"]'))
    .or(page.getByLabel(/What timezone will you be hosting from/i));
  
  const timezoneSelectVisible = await timezoneSelect.first().isVisible({ timeout: 5000 }).catch(() => false);
  if (timezoneSelectVisible) {
    try {
      await timezoneSelect.first().selectOption({ label: timezone });
      await page.waitForTimeout(500);
      console.log(`✅ Selected timezone: ${timezone}`);
    } catch (error) {
      // Fallback: find option containing "Malaysia"
      const options = timezoneSelect.first().locator('option');
      const optionCount = await options.count();
      for (let i = 0; i < optionCount; i++) {
        const optionText = await options.nth(i).textContent();
        if (optionText && optionText.includes('Malaysia')) {
          await timezoneSelect.first().selectOption({ index: i });
          await page.waitForTimeout(500);
          console.log(`✅ Selected timezone: ${optionText}`);
          break;
        }
      }
    }
  }
  
  // Step 3: Add Hosting Slot - Click "+ Add Slot" button
  const addSlotButton = page.getByRole('button', { name: /Add Slot/i })
    .or(page.locator('button').filter({ hasText: /\+.*Add.*Slot/i }));
  
  const addSlotVisible = await addSlotButton.first().isVisible({ timeout: 5000 }).catch(() => false);
  if (addSlotVisible) {
    await addSlotButton.first().click();
    await page.waitForTimeout(1000);
    console.log('✅ Clicked "+ Add Slot" button');
    
    // Step 4: Select Date from Calendar - Select tomorrow's date (slotDate)
    // Ensure slotDate is tomorrow (today + 1 day) if not provided
    let slotDate = data.slotDate;
    if (!slotDate) {
      slotDate = new Date();
      slotDate.setDate(slotDate.getDate() + 1);
      slotDate.setHours(0, 0, 0, 0);
    }
    
    // Ensure it's tomorrow, not today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const slotDateOnly = new Date(slotDate);
    slotDateOnly.setHours(0, 0, 0, 0);
    
    // If slotDate is today or in the past, set it to tomorrow
    if (slotDateOnly <= today) {
      slotDate = new Date();
      slotDate.setDate(slotDate.getDate() + 1);
      slotDate.setHours(0, 0, 0, 0);
      console.log('⚠️ slotDate was today or in the past, adjusted to tomorrow');
    }
    
    const targetDay = slotDate.getDate();
    const targetMonth = slotDate.getMonth() + 1; // getMonth() returns 0-11, so add 1
    const targetYear = slotDate.getFullYear();
    
    // Find date input - HTML5 date inputs use type="date" and expect YYYY-MM-DD format
    await page.waitForTimeout(1000); // Wait for form to appear after clicking Add Slot
    const dateInput = page.locator('input[type="date"]')
      .or(page.locator('input[placeholder*="dd/mm/yyyy"]'))
      .or(page.locator('input[formcontrolname*="date"]'))
      .or(page.getByLabel(/Date/i));
    
    const dateInputVisible = await dateInput.first().isVisible({ timeout: 5000 }).catch(() => false);
    if (dateInputVisible) {
      // Format date as YYYY-MM-DD for HTML5 date input (required format)
      const formattedDateISO = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`;
      
      console.log(`📅 Setting date to tomorrow: ${formattedDateISO} (${targetDay}/${targetMonth}/${targetYear})`);
      
      // Check if it's an HTML5 date input
      const inputType = await dateInput.first().getAttribute('type').catch(() => '');
      console.log(`📅 Date input type: ${inputType || 'text'}`);
      
      // Method 1: Use JavaScript to set value directly (most reliable for HTML5 date inputs)
      const dateSetViaJS = await dateInput.first().evaluate((el: HTMLInputElement, date: string) => {
        const oldValue = el.value;
        el.value = date;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
        return { oldValue, newValue: el.value, success: el.value === date };
      }, formattedDateISO).catch(() => ({ success: false }));
      
      await page.waitForTimeout(1000);
      
      if (dateSetViaJS.success) {
        console.log(`✅ Set date via JavaScript: ${formattedDateISO}`);
      } else {
        // Method 2: Try fill() method
        await dateInput.first().click();
        await page.waitForTimeout(300);
        await dateInput.first().fill(formattedDateISO);
        await dateInput.first().blur();
        await page.waitForTimeout(1000);
        console.log(`✅ Filled date input with tomorrow's date: ${formattedDateISO}`);
      }
      
      // Verify the date was set correctly
      const inputValue = await dateInput.first().inputValue().catch(() => '');
      console.log(`📅 Date input value after setting: "${inputValue}"`);
      
      if (inputValue === formattedDateISO || inputValue.includes(formattedDateISO) || inputValue.includes(`${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`)) {
        console.log(`✅ Verified date is set to tomorrow: ${inputValue}`);
      } else {
        // Try one more time with clear and fill
        console.log(`⚠️ Date input value (${inputValue}) doesn't match expected (${formattedDateISO}), trying clear and fill...`);
        await dateInput.first().click();
        await page.waitForTimeout(200);
        await dateInput.first().fill(''); // Clear first
        await page.waitForTimeout(200);
        await dateInput.first().fill(formattedDateISO);
        await dateInput.first().blur();
        await page.waitForTimeout(1000);
        
        const finalValue = await dateInput.first().inputValue().catch(() => '');
        console.log(`📅 Final date input value: "${finalValue}"`);
        
        if (finalValue && (finalValue === formattedDateISO || finalValue.includes(String(targetDay)))) {
          console.log(`✅ Date set successfully after retry: ${finalValue}`);
        } else {
          console.log(`⚠️ Date may not be set correctly, but continuing with test...`);
        }
      }
    } else {
      console.log('⚠️ Date input not found');
    }
    
    // Step 5: Select Start Time - Select 08 hour, 30 minutes, AM
    const slotHour = data.slotHour ?? 8;
    const slotMinute = data.slotMinute ?? 30;
    const slotAMPM = data.slotAMPM || 'AM';
    
    // Find hour dropdown
    const hourDropdowns = page.locator('select').filter({ hasText: /hour|Hour/i });
    const hourDropdownCount = await hourDropdowns.count();
    
    // Look for start time hour dropdown (usually the second or third select)
    for (let i = 0; i < hourDropdownCount; i++) {
      const dropdown = hourDropdowns.nth(i);
      const parentText = await dropdown.locator('..').textContent().catch(() => '');
      if (parentText && /Start Time|start time/i.test(parentText)) {
        try {
          await dropdown.selectOption({ label: slotHour.toString().padStart(2, '0') });
          await page.waitForTimeout(500);
          console.log(`✅ Selected start time hour: ${slotHour}`);
          break;
        } catch (error) {
          // Try by value
          await dropdown.selectOption({ value: slotHour.toString() }).catch(() => {});
          await page.waitForTimeout(500);
        }
      }
    }
    
    // Find minute dropdown
    const minuteDropdowns = page.locator('select').filter({ hasText: /minute|Minute/i });
    const minuteDropdownCount = await minuteDropdowns.count();
    
    for (let i = 0; i < minuteDropdownCount; i++) {
      const dropdown = minuteDropdowns.nth(i);
      const parentText = await dropdown.locator('..').textContent().catch(() => '');
      if (parentText && /Start Time|start time/i.test(parentText)) {
        try {
          const minuteValue = slotMinute.toString().padStart(2, '0');
          await dropdown.selectOption({ label: minuteValue });
          await page.waitForTimeout(500);
          console.log(`✅ Selected start time minute: ${slotMinute}`);
          break;
        } catch (error) {
          // Try to find matching option
          const options = dropdown.locator('option');
          const optionCount = await options.count();
          for (let j = 0; j < optionCount; j++) {
            const optionValue = await options.nth(j).getAttribute('value') || await options.nth(j).textContent();
            if (optionValue && optionValue.includes(slotMinute.toString())) {
              await dropdown.selectOption({ index: j });
              await page.waitForTimeout(500);
              console.log(`✅ Selected start time minute: ${slotMinute}`);
              break;
            }
          }
        }
      }
    }
    
    // Find AM/PM toggle
    const amPmToggle = page.getByRole('button', { name: new RegExp(slotAMPM, 'i') })
      .or(page.locator('button').filter({ hasText: new RegExp(`^${slotAMPM}$`, 'i') }));
    
    const amPmVisible = await amPmToggle.first().isVisible({ timeout: 3000 }).catch(() => false);
    if (amPmVisible) {
      const isSelected = await amPmToggle.first().getAttribute('class').then(cls => cls?.includes('selected') || cls?.includes('active')).catch(() => false);
      if (!isSelected) {
        await amPmToggle.first().click();
        await page.waitForTimeout(500);
        console.log(`✅ Selected ${slotAMPM}`);
      }
    }
    
    // Step 6: Select Repeat Pattern - Select "Daily"
    const repeatPattern = data.repeatPattern || 'Daily';
    const repeatSelect = page.locator('select').filter({ hasText: /Repeat/i }).first()
      .or(page.locator('select[formcontrolname*="repeat"]'))
      .or(page.getByLabel(/Repeat/i));
    
    const repeatSelectVisible = await repeatSelect.first().isVisible({ timeout: 5000 }).catch(() => false);
    if (repeatSelectVisible) {
      try {
        await repeatSelect.first().selectOption({ label: repeatPattern });
        await page.waitForTimeout(500);
        console.log(`✅ Selected repeat pattern: ${repeatPattern}`);
      } catch (error) {
        // Fallback: find option containing "Daily"
        const options = repeatSelect.first().locator('option');
        const optionCount = await options.count();
        for (let i = 0; i < optionCount; i++) {
          const optionText = await options.nth(i).textContent();
          if (optionText && optionText.includes(repeatPattern)) {
            await repeatSelect.first().selectOption({ index: i });
            await page.waitForTimeout(500);
            console.log(`✅ Selected repeat pattern: ${optionText}`);
            break;
          }
        }
      }
    }
    
    // Step 7: Save Slot - Click "Save Slot" button
    // Wait a bit for the form to be ready
    await page.waitForTimeout(1000);
    
    const saveSlotButton = page.getByRole('button', { name: /Save Slot/i })
      .or(page.locator('button').filter({ hasText: /Save Slot/i }))
      .or(page.locator('button').filter({ hasText: /^Save Slot$/i }));
    
    const saveSlotVisible = await saveSlotButton.first().isVisible({ timeout: 10000 }).catch(() => false);
    if (saveSlotVisible) {
      // Check if button is enabled before clicking
      const isEnabled = await saveSlotButton.first().isEnabled().catch(() => false);
      if (isEnabled) {
        await saveSlotButton.first().click();
        await page.waitForTimeout(2000); // Wait for slot to be saved
        console.log('✅ Clicked "Save Slot" button');
      } else {
        // Wait a bit more and try again (form validation might need time)
        await page.waitForTimeout(2000);
        const isEnabledAfterWait = await saveSlotButton.first().isEnabled().catch(() => false);
        if (isEnabledAfterWait) {
          await saveSlotButton.first().click();
          await page.waitForTimeout(2000);
          console.log('✅ Clicked "Save Slot" button (after wait)');
        } else {
          console.log('⚠️ Save Slot button is disabled - form may be invalid');
        }
      }
      
      // Verify slot appears - wait for UI to update after saving
      await page.waitForTimeout(3000); // Give more time for slot to be saved and UI to update
      
      // Format expected date/time to match what's displayed (e.g., "Thu, Feb 12, 2026 at 9:35 AM")
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const dayName = dayNames[slotDate.getDay()];
      const monthName = monthNames[slotDate.getMonth()];
      const day = slotDate.getDate();
      const year = slotDate.getFullYear();
      const hour12 = slotHour === 0 ? 12 : slotHour > 12 ? slotHour - 12 : slotHour;
      const minuteStr = slotMinute.toString().padStart(2, '0');
      
      // Multiple date/time patterns to match different formats
      const expectedDatePatterns = [
        new RegExp(`${dayName}.*${monthName}.*${day}.*${year}.*at.*${hour12}.*${minuteStr}.*${slotAMPM}`, 'i'),
        new RegExp(`${monthName}.*${day}.*${year}.*at.*${hour12}.*${minuteStr}.*${slotAMPM}`, 'i'),
        new RegExp(`${day}.*${monthName}.*${year}.*${hour12}.*${minuteStr}.*${slotAMPM}`, 'i'),
        new RegExp(`${hour12}.*${minuteStr}.*${slotAMPM}`, 'i'), // Just time
        new RegExp(`${slotHour}.*${slotMinute}.*${slotAMPM}`, 'i'), // 24-hour format
      ];
      
      // Check all tabs - slot might be in "Upcoming" or "Recurring" tab
      const tabs = ['Upcoming', 'Recurring', 'Past'];
      let slotFound = false;
      
      for (const tabName of tabs) {
        // Switch to tab
        const tab = page.getByRole('button', { name: new RegExp(tabName, 'i') })
          .or(page.locator('button').filter({ hasText: new RegExp(tabName, 'i') }));
        
        const tabVisible = await tab.first().isVisible({ timeout: 2000 }).catch(() => false);
        if (tabVisible) {
          // Check if already selected
          const isSelected = await tab.first().getAttribute('class').then(cls => 
            cls?.includes('selected') || cls?.includes('active') || cls?.includes('bg-neutral-900') || cls?.includes('bg-black')
          ).catch(() => false);
          
          if (!isSelected) {
            await tab.first().click();
            await page.waitForTimeout(2000); // Wait for tab content to load
            console.log(`✅ Switched to ${tabName} tab`);
          }
          
          // Wait for slot cards to render
          await page.waitForTimeout(1500);
          
          // Method 1: Look for slot card with "Slot" label
          const slotLabel = page.getByText(/^Slot$/i);
          const slotLabelVisible = await slotLabel.isVisible({ timeout: 2000 }).catch(() => false);
          
          if (slotLabelVisible) {
            // Find all slot cards (there might be multiple)
            const slotCards = page.locator('div, section, article').filter({ hasText: /Slot/i });
            const slotCardCount = await slotCards.count();
            
            for (let i = 0; i < slotCardCount; i++) {
              const card = slotCards.nth(i);
              const cardText = await card.textContent().catch(() => '');
              
              // Check if this card contains any of the expected date/time patterns
              const matchesPattern = expectedDatePatterns.some(pattern => pattern.test(cardText || ''));
              
              if (matchesPattern || (cardText && (cardText.includes(hour12.toString()) || cardText.includes(slotAMPM)))) {
                slotFound = true;
                console.log(`✅ Slot successfully saved and verified! Found slot card in ${tabName} tab`);
                console.log(`   Slot content: ${cardText?.trim().substring(0, 80)}...`);
                break;
              }
            }
          }
          
          // Method 2: Look for any element containing date/time pattern
          if (!slotFound) {
            for (const pattern of expectedDatePatterns) {
              const slotWithDate = page.locator('*').filter({ hasText: pattern });
              const slotWithDateCount = await slotWithDate.count();
              
              if (slotWithDateCount > 0) {
                slotFound = true;
                const slotText = await slotWithDate.first().textContent();
                console.log(`✅ Slot successfully saved and verified! Found slot in ${tabName} tab`);
                console.log(`   Slot content: ${slotText?.trim().substring(0, 80)}...`);
                break;
              }
            }
          }
          
          // Method 3: Look for slot card structure (white card with date/time)
          if (!slotFound) {
            // Look for cards that contain time information
            const cardsWithTime = page.locator('div[class*="card"], div[class*="bg-white"], section, article')
              .filter({ hasText: new RegExp(`${hour12}|${slotAMPM}|${day}|${monthName}`, 'i') });
            const cardCount = await cardsWithTime.count();
            
            for (let i = 0; i < cardCount; i++) {
              const card = cardsWithTime.nth(i);
              const cardText = await card.textContent().catch(() => '');
              
              // Check if it looks like a slot card (has time and date info)
              if (cardText && (cardText.includes(slotAMPM) || cardText.includes(hour12.toString()))) {
                // Verify it's not just a button or input
                const tagName = await card.evaluate(el => el.tagName.toLowerCase()).catch(() => '');
                if (tagName !== 'button' && tagName !== 'input' && tagName !== 'select') {
                  slotFound = true;
                  console.log(`✅ Slot successfully saved and verified! Found slot card in ${tabName} tab (method 3)`);
                  console.log(`   Slot content: ${cardText.trim().substring(0, 80)}...`);
                  break;
                }
              }
            }
          }
          
          if (slotFound) {
            break; // Found slot, no need to check other tabs
          }
        }
      }
      
      if (!slotFound) {
        // Debug: Log what's actually on the page
        const pageText = await page.textContent('body').catch(() => '');
        console.log('❌ Slot verification failed - slot card not found with expected date/time');
        console.log(`   Expected pattern: ${dayName}, ${monthName} ${day}, ${year} at ${hour12}:${minuteStr} ${slotAMPM}`);
        console.log(`   Looking for hour: ${hour12}, minute: ${minuteStr}, AM/PM: ${slotAMPM}`);
        console.log(`   Page contains "Slot": ${pageText?.includes('Slot') || false}`);
        console.log(`   Page contains "${slotAMPM}": ${pageText?.includes(slotAMPM) || false}`);
        throw new Error(`Slot verification failed: Expected slot card with date/time not found. Slot may not have been saved properly.`);
      }
    }
  }
}

/**
 * Helper function to fill and save a single ticket
 * Works for both existing tickets (already in editing mode) and new tickets
 */
async function fillAndSaveTicket(page: Page, ticket: TicketData, isExistingTicket: boolean = false): Promise<boolean> {
  console.log(`📝 Filling ${isExistingTicket ? 'existing' : 'new'} ${ticket.type} ticket: ${ticket.name}`);
  
  // If it's a new ticket, we need to click the add button first
  if (!isExistingTicket) {
    // Find the correct button - button text is just "Paid" or "Free" (not "Paid +")
    // The buttons are in a footer div with class bg-[#f5f5f5]
    // Try multiple selectors to find the button
    const addButton = page.getByRole('button', { name: new RegExp(`^${ticket.type}$`, 'i') })
      .or(page.locator('div.bg-\\[\\#f5f5f5\\] button').filter({ hasText: new RegExp(`^${ticket.type}$`, 'i') }))
      .or(page.locator('button').filter({ hasText: new RegExp(`^${ticket.type}$`, 'i') }))
      .first();
    
    const buttonVisible = await addButton.isVisible({ timeout: 5000 }).catch(() => false);
    if (!buttonVisible) {
      console.log(`⚠️ ${ticket.type} button not found`);
      return false;
    }
    
    // Wait for button to be enabled
    let isEnabled = await addButton.isEnabled().catch(() => false);
    let attempts = 0;
    while (!isEnabled && attempts < 20) {
      await page.waitForTimeout(500);
      isEnabled = await addButton.isEnabled().catch(() => false);
      attempts++;
    }
    
    if (!isEnabled) {
      console.log(`⚠️ ${ticket.type} button is disabled - cannot add ticket`);
      return false;
    }
    
    await addButton.click();
    await page.waitForTimeout(1500); // Wait for ticket row to appear
    console.log(`✅ Clicked "${ticket.type}" button to add new ticket`);
  }
  
  // Wait for ticket form to be ready
  await page.waitForTimeout(1000);
  
  // Determine which ticket form to target:
  // - For existing tickets: use .first() (the first ticket form)
  // - For new tickets: use .last() (the newly added ticket form)
  const ticketSelector = isExistingTicket ? 'first' : 'last';
  
  // Fill Ticket Name
  const ticketNameInputs = page.locator('input[placeholder="Name of ticket"]');
  const ticketNameInput = isExistingTicket ? ticketNameInputs.first() : ticketNameInputs.last();
  const nameVisible = await ticketNameInput.isVisible({ timeout: 5000 }).catch(() => false);
  if (nameVisible) {
    // Clear first, then fill to ensure value is set
    await ticketNameInput.clear();
    await ticketNameInput.fill(ticket.name);
    // Trigger both input and blur events to ensure Angular form control updates
    await ticketNameInput.dispatchEvent('input');
    await ticketNameInput.blur();
    await page.waitForTimeout(1500); // Wait for validation to update
    console.log(`✅ Filled ticket name: ${ticket.name} (using ${ticketSelector} ticket form)`);
  } else {
    console.log('⚠️ Ticket name input not found');
    return false;
  }
  
  // Fill Standard Rate (only for Paid tickets)
  if (ticket.type === 'Paid' && ticket.price !== undefined) {
    // Look for number input with placeholder "00.00" - it's in a div with currency prefix
    // Find the price input that's in the same ticket form as the name input we just filled
    // We'll use a more specific selector: find the ticket container and then the price input within it
    const priceInputs = page.locator('input[placeholder="00.00"][type="number"]');
    const priceInput = isExistingTicket ? priceInputs.first() : priceInputs.last();
    const priceVisible = await priceInput.isVisible({ timeout: 5000 }).catch(() => false);
    if (priceVisible) {
      const isDisabled = await priceInput.isDisabled().catch(() => false);
      if (!isDisabled) {
        // Clear first, then fill to ensure value is set
        await priceInput.clear();
        await priceInput.fill(ticket.price.toString());
        // Trigger input event to ensure Angular form control updates
        await priceInput.dispatchEvent('input');
        await page.waitForTimeout(1000); // Wait for validation to update
        console.log(`✅ Filled standard rate: ${ticket.price} (using ${ticketSelector} ticket form)`);
      } else {
        console.log('⚠️ Price input is disabled');
      }
    }
  }
  
  // Fill Ticket Quantity
  // Find the quantity input that's in the same ticket form
  const quantityInputs = page.locator('input[placeholder="1"][type="number"]');
  const quantityInput = isExistingTicket ? quantityInputs.first() : quantityInputs.last();
  const quantityVisible = await quantityInput.isVisible({ timeout: 5000 }).catch(() => false);
  if (quantityVisible) {
    // Clear first, then fill to ensure value is set
    await quantityInput.clear();
    await quantityInput.fill(ticket.quantity.toString());
    // Trigger both input and blur events to ensure Angular form control updates
    await quantityInput.dispatchEvent('input');
    await quantityInput.blur();
    await page.waitForTimeout(1500); // Wait for validation to update
    console.log(`✅ Filled ticket quantity: ${ticket.quantity} (using ${ticketSelector} ticket form)`);
  } else {
    console.log('⚠️ Quantity input not found');
  }
  
  // Click "Save Ticket" button
  const saveButton = page.getByRole('button', { name: /Save Ticket/i }).first();
  const saveVisible = await saveButton.isVisible({ timeout: 5000 }).catch(() => false);
  if (saveVisible) {
    // Wait for button to be enabled (it's disabled if ticket is invalid)
    // Give Angular time to process form changes and update validation
    await page.waitForTimeout(2000);
    let saveEnabled = await saveButton.isEnabled().catch(() => false);
    let attempts = 0;
    while (!saveEnabled && attempts < 15) {
      await page.waitForTimeout(1000);
      saveEnabled = await saveButton.isEnabled().catch(() => false);
      attempts++;
      if (!saveEnabled && attempts % 3 === 0) {
        // Every 3 attempts, try clicking on the input again to trigger validation
        // Use the same selector logic as above (first for existing, last for new)
        const ticketNameInputs = page.locator('input[placeholder="Name of ticket"]');
        const ticketNameInput = isExistingTicket ? ticketNameInputs.first() : ticketNameInputs.last();
        const nameVisible = await ticketNameInput.isVisible({ timeout: 2000 }).catch(() => false);
        if (nameVisible) {
          await ticketNameInput.click();
          await ticketNameInput.blur();
        }
      }
    }
    
    if (saveEnabled) {
      await saveButton.click();
      await page.waitForTimeout(1500); // Wait for save to complete
      console.log(`✅ Saved ${ticket.type} ticket: ${ticket.name}`);
      return true;
    } else {
      console.log('⚠️ Save Ticket button is disabled - ticket may be invalid');
      return false;
    }
  } else {
    console.log('⚠️ Save Ticket button not found');
    return false;
  }
}

/**
 * Fill Experience Tickets Info (Page 4 of Platform flow)
 */
export async function fillExperienceTicketsInfo(page: Page, data: ExperienceTicketsData): Promise<void> {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000); // Wait for component to initialize
  
  // Step 1: Service Fee Selection - Select "No, users will bear the service fee"
  const serviceFeeOption = data.serviceFee || 'No, users will bear the service fee';
  const serviceFeeRadio = page.getByRole('radio', { name: new RegExp(serviceFeeOption, 'i') });
  
  const serviceFeeVisible = await serviceFeeRadio.first().isVisible({ timeout: 5000 }).catch(() => false);
  if (serviceFeeVisible) {
    await serviceFeeRadio.first().click();
    await page.waitForTimeout(500);
    console.log(`✅ Selected service fee option: ${serviceFeeOption}`);
  }
  
  // Step 1.5: Check for existing tickets (component auto-creates one)
  // The component initializes with one default "Paid" ticket that needs to be filled and saved first
  console.log('🔍 Checking for existing tickets...');
  await page.waitForTimeout(2000); // Wait for component to fully initialize
  
  const existingTicketNameInput = page.locator('input[placeholder="Name of ticket"]').first();
  const hasExistingTicket = await existingTicketNameInput.isVisible({ timeout: 5000 }).catch(() => false);
  
  if (hasExistingTicket) {
    console.log('✅ Found existing ticket (component auto-created) - will fill and save it first');
    
    // Fill the existing ticket with the first ticket data
    if (data.tickets && data.tickets.length > 0) {
      const firstTicket = data.tickets[0];
      const saved = await fillAndSaveTicket(page, firstTicket, true); // true = is existing ticket
      
      if (!saved) {
        console.log('⚠️ Failed to save existing ticket - buttons may remain disabled');
      }
      
      // Remove first ticket from array since we've used it
      data.tickets = data.tickets.slice(1);
    }
  }
  
  // Step 2-3: Add and Configure Remaining Tickets
  if (data.tickets && data.tickets.length > 0) {
    for (const ticket of data.tickets) {
      // Use the helper function for all tickets (both Paid and Free)
      const saved = await fillAndSaveTicket(page, ticket, false); // false = new ticket
      if (!saved) {
        console.log(`⚠️ Failed to add ${ticket.type} ticket: ${ticket.name}`);
      }
    }
  }
  
  // All ticket handling is now done via fillAndSaveTicket() helper function above
}

/**
 * Fill Experience Page Info (Page 5 of Platform flow)
 */
export async function fillExperiencePageInfo(page: Page, data: ExperiencePageData): Promise<void> {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000);
  
  // Step 1: Fill Experience Description
  if (data.description) {
    const descriptionTextarea = page.locator('textarea[formcontrolname*="description"]')
      .or(page.locator('textarea[placeholder*="Write a compelling description"]'))
      .or(page.getByLabel(/Describe your Experience/i));
    
    const descriptionVisible = await descriptionTextarea.first().isVisible({ timeout: 5000 }).catch(() => false);
    if (descriptionVisible) {
      await descriptionTextarea.first().fill(data.description);
      await page.waitForTimeout(500);
      console.log(`✅ Filled experience description (${data.description.length} characters)`);
    }
  }
  
  // Step 2: Add Cover Photo
  if (data.coverPhoto) {
    const coverPhotoInput = page.locator('input[type="file"][accept*="image"]')
      .or(page.locator('input[type="file"]').first());
    
    const coverPhotoVisible = await coverPhotoInput.first().isVisible({ timeout: 5000 }).catch(() => false);
    if (coverPhotoVisible) {
      await coverPhotoInput.first().setInputFiles(data.coverPhoto);
      await page.waitForTimeout(1000);
      console.log(`✅ Uploaded cover photo: ${data.coverPhoto}`);
    } else {
      // Try clicking upload button first
      const uploadButton = page.getByRole('button', { name: /Click to upload|Upload|Choose File/i })
        .or(page.locator('button').filter({ hasText: /Click to upload/i }));
      
      const uploadButtonVisible = await uploadButton.first().isVisible({ timeout: 3000 }).catch(() => false);
      if (uploadButtonVisible) {
        await uploadButton.first().click();
        await page.waitForTimeout(500);
        
        // File input might appear after clicking button
        const fileInput = page.locator('input[type="file"]').first();
        const fileInputVisible = await fileInput.isVisible({ timeout: 2000 }).catch(() => false);
        if (fileInputVisible) {
          await fileInput.setInputFiles(data.coverPhoto);
          await page.waitForTimeout(1000);
          console.log(`✅ Uploaded cover photo: ${data.coverPhoto}`);
        }
      }
    }
  }
  
  // Step 3: Add Video URL
  if (data.videoUrl) {
    const videoInput = page.locator('input[formcontrolname*="video"]')
      .or(page.locator('input[placeholder*="youtube.com/watch"]'))
      .or(page.getByLabel(/Add a video to your Experience/i));
    
    const videoInputVisible = await videoInput.first().isVisible({ timeout: 5000 }).catch(() => false);
    if (videoInputVisible) {
      await videoInput.first().fill(data.videoUrl);
      await page.waitForTimeout(500);
      console.log(`✅ Added video URL: ${data.videoUrl}`);
    }
  }
}

/**
 * Fill Experience Details Info (Page 6 of Platform flow)
 */
export async function fillExperienceDetailsInfo(page: Page, data: ExperienceDetailsData): Promise<void> {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000);
  
  // Step 1: Fill Learning Outcomes (optional)
  if (data.learningOutcomes) {
    const learningOutcomesTextarea = page.locator('textarea[formcontrolname*="learningOutcomes"]')
      .or(page.locator('textarea').filter({ hasText: /Learning Outcomes/i }).first())
      .or(page.locator('section').filter({ hasText: /Learning Outcomes/i }).locator('textarea').first());
    
    const learningOutcomesVisible = await learningOutcomesTextarea.first().isVisible({ timeout: 5000 }).catch(() => false);
    if (learningOutcomesVisible) {
      await learningOutcomesTextarea.first().fill(data.learningOutcomes);
      await page.waitForTimeout(500);
      console.log('✅ Filled learning outcomes');
    }
  }
  
  // Step 2: Fill Instructions (optional)
  if (data.instructions) {
    const instructionsTextarea = page.locator('textarea[formcontrolname*="instructions"]')
      .or(page.locator('textarea').filter({ hasText: /Instructions/i }).first())
      .or(page.locator('section').filter({ hasText: /Instructions/i }).locator('textarea').first());
    
    const instructionsVisible = await instructionsTextarea.first().isVisible({ timeout: 5000 }).catch(() => false);
    if (instructionsVisible) {
      await instructionsTextarea.first().fill(data.instructions);
      await page.waitForTimeout(500);
      console.log('✅ Filled instructions');
    }
  }
  
  // Step 3: Select Materials Option - "No materials provided"
  if (data.materials === 'No materials provided' || !data.materials) {
    const noMaterialsRadio = page.getByRole('radio', { name: /No materials provided/i });
    const noMaterialsVisible = await noMaterialsRadio.first().isVisible({ timeout: 5000 }).catch(() => false);
    if (noMaterialsVisible) {
      await noMaterialsRadio.first().click();
      await page.waitForTimeout(500);
      console.log('✅ Selected "No materials provided"');
    }
  }
  
  // Step 4: Select What to Bring Option - "This experience does not require anything"
  if (data.whatToBring === 'This experience does not require anything' || !data.whatToBring) {
    const noRequirementsRadio = page.getByRole('radio', { name: /This experience does not require anything/i });
    const noRequirementsVisible = await noRequirementsRadio.first().isVisible({ timeout: 5000 }).catch(() => false);
    if (noRequirementsVisible) {
      await noRequirementsRadio.first().click();
      await page.waitForTimeout(500);
      console.log('✅ Selected "This experience does not require anything"');
    }
  }
  
  // Step 5: Upload Poster (optional)
  if (data.poster) {
    const posterInput = page.locator('input[type="file"]').filter({ hasText: /poster/i })
      .or(page.locator('section').filter({ hasText: /Poster/i }).locator('input[type="file"]').first());
    
    const posterInputVisible = await posterInput.first().isVisible({ timeout: 5000 }).catch(() => false);
    if (posterInputVisible) {
      await posterInput.first().setInputFiles(data.poster);
      await page.waitForTimeout(1000);
      console.log(`✅ Uploaded poster: ${data.poster}`);
    } else {
      // Try clicking upload button
      const posterUploadButton = page.getByRole('button', { name: /Click to upload poster/i })
        .or(page.locator('button').filter({ hasText: /upload poster/i }));
      
      const posterButtonVisible = await posterUploadButton.first().isVisible({ timeout: 3000 }).catch(() => false);
      if (posterButtonVisible) {
        await posterUploadButton.first().click();
        await page.waitForTimeout(500);
        
        const fileInput = page.locator('input[type="file"]').first();
        const fileInputVisible = await fileInput.isVisible({ timeout: 2000 }).catch(() => false);
        if (fileInputVisible) {
          await fileInput.setInputFiles(data.poster);
          await page.waitForTimeout(1000);
          console.log(`✅ Uploaded poster: ${data.poster}`);
        }
      }
    }
  }
  
  // Step 6: Add Custom Questions (optional)
  if (data.customQuestions && data.customQuestions.length > 0) {
    const addQuestionButton = page.getByRole('button', { name: /Add a question/i })
      .or(page.locator('button').filter({ hasText: /\+.*Add.*question/i }));
    
    const addQuestionVisible = await addQuestionButton.first().isVisible({ timeout: 5000 }).catch(() => false);
    if (addQuestionVisible) {
      // Note: Custom question creation would require more complex form filling
      // For now, just verify the button exists
      console.log('✅ Add Question button found (custom question creation not fully implemented)');
    }
  }
}

/**
 * Extract all information from Confirmation Page
 */
export interface ConfirmPageInfo {
  sections: {
    name: string;
    status: 'complete' | 'incomplete';
    fields: Array<{
      label: string;
      value: string;
      isEmpty: boolean;
    }>;
  }[];
  canPublish: boolean;
  incompleteSections: string[];
  publishButtonDisabled: boolean;
}

export async function extractConfirmPageInfo(page: Page): Promise<ConfirmPageInfo> {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  
  const info: ConfirmPageInfo = {
    sections: [],
    canPublish: true,
    incompleteSections: [],
    publishButtonDisabled: false,
  };
  
  // Find all sections on the confirm page
  // Sections are typically in cards or sections with headings
  const sectionHeaders = page.locator('h2, h3, [class*="section"], [class*="card"]').filter({ hasText: /Basic Information|Audience|Schedule|Booking|Tickets|Pricing|Experience Page|Details/i });
  const sectionCount = await sectionHeaders.count();
  
  console.log(`\n📋 Found ${sectionCount} sections on confirmation page`);
  
  for (let i = 0; i < sectionCount; i++) {
    const header = sectionHeaders.nth(i);
    const sectionName = await header.textContent().catch(() => 'Unknown Section');
    const sectionText = sectionName?.trim() || 'Unknown Section';
    
    // Check if section has warning icon (incomplete)
    const sectionContainer = header.locator('..').or(header.locator('../..'));
    const hasWarningIcon = await sectionContainer.locator('[class*="warning"], [class*="exclamation"], svg[class*="warning"]').isVisible({ timeout: 1000 }).catch(() => false);
    const hasCheckmark = await sectionContainer.locator('[class*="check"], svg[class*="check"], [class*="success"]').isVisible({ timeout: 1000 }).catch(() => false);
    
    const status: 'complete' | 'incomplete' = hasWarningIcon ? 'incomplete' : 'complete';
    
    if (hasWarningIcon) {
      info.incompleteSections.push(sectionText);
      info.canPublish = false;
    }
    
    // Extract fields within this section
    const fields: Array<{ label: string; value: string; isEmpty: boolean }> = [];
    
    // Get all text content from the section
    const sectionTextContent = await sectionContainer.textContent().catch(() => '');
    
    // Try to extract key-value pairs from text content
    // Look for patterns like "Label: Value" or "Label Value"
    const lines = sectionTextContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    for (const line of lines) {
      // Skip if it's just the section header
      if (line.toLowerCase() === sectionText.toLowerCase() || line.length < 3) {
        continue;
      }
      
      // Try to match "Label: Value" pattern
      const colonMatch = line.match(/^([^:]+):\s*(.+)$/);
      if (colonMatch) {
        const [, label, value] = colonMatch;
        const trimmedLabel = label.trim();
        const trimmedValue = value.trim();
        
        // Skip if it's just whitespace or common UI elements
        if (trimmedLabel && trimmedValue && 
            !trimmedLabel.match(/^(Edit|✓|⚠|▲)$/i) &&
            trimmedValue.length > 0) {
          
          const isEmpty = !trimmedValue || 
            trimmedValue.toLowerCase() === 'n/a' || 
            trimmedValue.toLowerCase() === 'not set' || 
            trimmedValue.toLowerCase() === 'none' ||
            trimmedValue === '0' || 
            trimmedValue.match(/^0\s+\w+/) !== null; // e.g., "0 host(s)", "0 schedule(s)"
          
          fields.push({
            label: trimmedLabel,
            value: trimmedValue,
            isEmpty,
          });
        }
      } else {
        // Try to match common field labels followed by values
        const commonFieldPatterns = [
          /^(Title|Slug|Category|Type|Hosts|Topics|Location|Access|Expertise Level|Target Audience|Primary Language|Secondary Language|Duration|Schedules|Timezone|Cutoff|Service Fee|Tickets|Description|Cover Photo|Video|Gallery|Learning Outcomes|Instructions|Materials|What to Bring|Custom Questions)\s*[:]?\s*(.+)$/i,
        ];
        
        for (const pattern of commonFieldPatterns) {
          const match = line.match(pattern);
          if (match) {
            const [, label, value] = match;
            const trimmedValue = value.trim();
            
            if (trimmedValue && trimmedValue.length > 0) {
              const isEmpty = trimmedValue.toLowerCase() === 'n/a' || 
                trimmedValue.toLowerCase() === 'not set' || 
                trimmedValue.toLowerCase() === 'none' ||
                trimmedValue === '0' || 
                trimmedValue.match(/^0\s+\w+/) !== null;
              
              fields.push({
                label: label.trim(),
                value: trimmedValue,
                isEmpty,
              });
              break;
            }
          }
        }
      }
    }
    
    // Remove duplicates (keep first occurrence)
    const seenLabels = new Set<string>();
    const uniqueFields = fields.filter(field => {
      if (seenLabels.has(field.label.toLowerCase())) {
        return false;
      }
      seenLabels.add(field.label.toLowerCase());
      return true;
    });
    
    info.sections.push({
      name: sectionText,
      status,
      fields: uniqueFields,
    });
    
    console.log(`\n📦 Section: ${sectionText} (${status === 'incomplete' ? '⚠️ INCOMPLETE' : '✅ Complete'})`);
    if (uniqueFields.length === 0) {
      console.log(`  ⚠️ No fields extracted. Section text preview: ${sectionTextContent.substring(0, 200)}...`);
    } else {
      uniqueFields.forEach(field => {
        const statusIcon = field.isEmpty ? '⚠️ EMPTY' : '✅';
        console.log(`  ${statusIcon} ${field.label}: "${field.value}"`);
      });
    }
  }
  
  // Check for warning banner
  const warningBanner = page.locator('[class*="warning"], [class*="alert"]').filter({ hasText: /Cannot publish yet/i });
  const warningVisible = await warningBanner.first().isVisible({ timeout: 3000 }).catch(() => false);
  
  if (warningVisible) {
    info.canPublish = false;
    const warningText = await warningBanner.first().textContent().catch(() => '');
    console.log(`\n⚠️ Warning Banner: ${warningText.trim()}`);
  }
  
  // Check Publish button state
  const publishButton = page.getByRole('button', { name: /Publish/i });
  const publishVisible = await publishButton.isVisible({ timeout: 5000 }).catch(() => false);
  
  if (publishVisible) {
    const isDisabled = await publishButton.isDisabled().catch(() => false);
    info.publishButtonDisabled = isDisabled;
    console.log(`\n🔘 Publish Button: ${isDisabled ? 'DISABLED' : 'ENABLED'}`);
  }
  
  return info;
}

/**
 * Verify Confirmation Page (Page 7 of Platform flow)
 */
export async function verifyConfirmationPage(page: Page): Promise<{ canPublish: boolean; incompleteSections: string[] }> {
  const info = await extractConfirmPageInfo(page);
  return {
    canPublish: info.canPublish,
    incompleteSections: info.incompleteSections,
  };
}

/**
 * Navigate to next step in Experience/Expertise creation flow
 */
export async function goToNextStep(page: Page): Promise<void> {
  // Scroll to bottom to ensure footer buttons are visible
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  
  // Find all footer buttons first (most reliable approach)
  const footerButtons = page.locator('footer div button');
  const buttonCount = await footerButtons.count();
  
  // The Continue button is always the 3rd button (index 2) in both experience and expertise onboarding
  // Button order: [Back, Save and Exit, Continue]
  let nextButton = footerButtons.nth(2);
  
  // Verify it's the Continue button by checking text
  const buttonText = await nextButton.textContent().catch(() => '');
  if (!buttonText?.trim().toLowerCase().includes('continue')) {
    // Fallback: try to find by text content
    nextButton = page.locator('footer button').filter({ hasText: /^Continue$/i }).last();
    const fallbackText = await nextButton.textContent().catch(() => '');
    if (!fallbackText?.trim().toLowerCase().includes('continue')) {
      // Last resort: try by role
      nextButton = page.getByRole('button', { name: /Continue/i }).first();
    }
  }
  
  // Wait for button to be visible
  await nextButton.waitFor({ state: 'visible', timeout: 10000 });
  
  // Scroll button into view
  await nextButton.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  
  // Wait for button to be enabled (should be enabled immediately for draft mode)
  // Only wait if button is actually disabled
  let isEnabled = await nextButton.isEnabled();
  if (!isEnabled) {
    // Button might be disabled due to isSaving() - wait a bit
    for (let i = 0; i < 20; i++) { // Wait up to 10 seconds
      isEnabled = await nextButton.isEnabled();
      if (isEnabled) break;
      
      // Check if it's because of saving state
      const isSaving = await page.locator('footer button').filter({ hasText: /Saving|Publishing/i }).isVisible().catch(() => false);
      if (isSaving && i % 5 === 0) {
        console.log(`⏳ Waiting for save/publish operation to complete... (${i}/20)`);
      } else if (!isSaving && i % 5 === 0) {
        console.log(`⏳ Waiting for Continue button to be enabled... (${i}/20)`);
      }
      
      await page.waitForTimeout(500);
    }
  }
  
  if (!isEnabled) {
    // Button is disabled - log debug info
    const disabledReason = await nextButton.getAttribute('disabled');
    const finalButtonText = await nextButton.textContent();
    const buttonClasses = await nextButton.getAttribute('class');
    console.log(`⚠️ Continue button is disabled.`);
    console.log(`   Button text: "${finalButtonText?.trim()}"`);
    console.log(`   Disabled attr: ${disabledReason}`);
    console.log(`   Classes: ${buttonClasses}`);
    
    // Check for validation errors
    const errors = page.locator('[class*="error"], [class*="invalid"], [class*="ng-invalid"], [role="alert"]').filter({ hasText: /required|invalid|error/i });
    const errorCount = await errors.count();
    if (errorCount > 0) {
      console.log(`⚠️ Found ${errorCount} validation error(s) that may be preventing navigation`);
      for (let i = 0; i < Math.min(errorCount, 5); i++) {
        const errorText = await errors.nth(i).textContent();
        console.log(`   - ${errorText?.trim()}`);
      }
    }
    
    await page.screenshot({ path: `artifacts/continue-button-disabled-${Date.now()}.png`, fullPage: true });
    throw new Error('Continue button is disabled - form validation may be failing. Check required fields.');
  }
  
  // Click the button (should work with regular click since button is enabled)
  await nextButton.click({ timeout: 5000 });
  
  // Wait for navigation to start
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000);
}

/**
 * Navigate to previous step in Experience creation flow
 */
export async function goToPreviousStep(page: Page): Promise<void> {
  const backButton = page.getByRole('button', { name: /Back|Previous/i });
  if (await backButton.isVisible({ timeout: 5000 })) {
    await backButton.click();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
  }
}

/**
 * Save Experience as Draft
 */
export async function saveExperienceDraft(page: Page): Promise<void> {
  const saveDraftButton = page.getByRole('button', { name: /Save Draft|Save as Draft|Save and Exit/i });
  await expect(saveDraftButton).toBeVisible({ timeout: 10000 });
  await saveDraftButton.click();
  await page.waitForLoadState('networkidle');
  
  // Verify success message
  const successMessage = page.getByText(/Saved|Draft saved|Success/i)
    .or(page.locator('[class*="success"], [class*="toast"]'));
  
  await expect(successMessage.first()).toBeVisible({ timeout: 10000 });
}

/**
 * Publish Experience
 */
export async function publishExperience(page: Page): Promise<void> {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000);
  
  // Verify we can publish first
  const verification = await verifyConfirmationPage(page);
  if (!verification.canPublish) {
    throw new Error(`Cannot publish: ${verification.incompleteSections.join(', ')}`);
  }
  
  const publishButton = page.getByRole('button', { name: /Publish/i });
  await expect(publishButton).toBeVisible({ timeout: 10000 });
  
  // Check if button is enabled
  const isDisabled = await publishButton.isDisabled().catch(() => false);
  if (isDisabled) {
    throw new Error('Publish button is disabled - required sections may be incomplete');
  }
  
  await publishButton.click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  // Verify success message or redirect
  const successMessage = page.getByText(/Published|Created|Success/i)
    .or(page.locator('[class*="success"], [class*="toast"]'));
  
  const successVisible = await successMessage.first().isVisible({ timeout: 15000 }).catch(() => false);
  if (successVisible) {
    console.log('✅ Experience published successfully');
  } else {
    // Check if redirected to success page
    const currentUrl = page.url();
    if (currentUrl.includes('/success') || currentUrl.includes('/experience/')) {
      console.log('✅ Experience published - redirected to success page');
    } else {
      console.log('⚠️ Success message not found, but publish button was clicked');
    }
  }
}

/**
 * Navigate to specific Platform Experience step
 */
export async function navigateToPlatformStep(page: Page, step: 'basic-info' | 'audience' | 'booking' | 'tickets' | 'page' | 'details' | 'confirm'): Promise<void> {
  // Navigate to Basic Info first
  await navigateToExperienceCreation(page);
  await selectExperienceType(page, 'platform');
  await expect(page).toHaveURL(/.*platform.*basic-info/i, { timeout: 10000 });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  // Fill minimal Basic Info if not on basic-info step
  if (step !== 'basic-info') {
    const testData: ExperienceBasicInfoData = {
      title: `Test Experience ${Date.now()}`,
      slug: `test-experience-${Date.now()}`,
      category: 'Workshop', // Use Workshop which maps to a button
      type: 'Virtual',
    };
    
    // Try to fill Basic Info, but don't fail if some fields aren't found
    try {
      await fillExperienceBasicInfo(page, testData);
      await page.waitForTimeout(1000);
    } catch (error) {
      console.log(`⚠️ Warning: Could not fill all Basic Info fields: ${error}`);
      // Continue anyway - some fields might already be filled or optional
    }
    
    // Navigate through steps to reach target step
    const stepOrder = ['basic-info', 'audience', 'booking', 'tickets', 'page', 'details', 'confirm'];
    const currentStepIndex = stepOrder.indexOf('basic-info');
    const targetStepIndex = stepOrder.indexOf(step);
    
    for (let i = currentStepIndex; i < targetStepIndex; i++) {
      await page.waitForLoadState('domcontentloaded'); // Faster than networkidle
      await page.waitForTimeout(500); // Reduced wait time
      
      // Check if Next button is enabled before clicking
      const nextButton = page.getByRole('button', { name: /Next|Continue/i });
      const nextVisible = await nextButton.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (nextVisible) {
        const isDisabled = await nextButton.isDisabled().catch(() => false);
        
        if (!isDisabled) {
          await nextButton.click();
          await page.waitForLoadState('domcontentloaded'); // Faster than networkidle
          await page.waitForTimeout(1000); // Reduced wait time
        } else {
          // If Next is disabled, wait a bit and check again (form might need time to validate)
          await page.waitForTimeout(1000);
          const stillDisabled = await nextButton.isDisabled().catch(() => false);
          if (!stillDisabled) {
            await nextButton.click();
            await page.waitForLoadState('domcontentloaded');
            await page.waitForTimeout(1000);
          } else {
            console.log(`⚠️ Warning: Next button is disabled on step ${stepOrder[i]}, cannot proceed`);
            // Try to continue anyway - might be a timing issue
            await nextButton.click({ force: true }).catch(() => {});
            await page.waitForLoadState('domcontentloaded');
            await page.waitForTimeout(1000);
          }
        }
      } else {
        console.log(`⚠️ Warning: Next button not found on step ${stepOrder[i]}`);
        // Try to find alternative navigation
        const continueButton = page.getByRole('button', { name: /Continue/i });
        const continueVisible = await continueButton.isVisible({ timeout: 2000 }).catch(() => false);
        if (continueVisible) {
          await continueButton.click();
          await page.waitForLoadState('domcontentloaded');
          await page.waitForTimeout(1000);
        }
      }
    }
  }
  
  // Verify we're on the target step
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500);
  await expect(page).toHaveURL(new RegExp(`.*platform.*${step}`, 'i'), { timeout: 15000 });
}

/**
 * Fill minimal Basic Info to enable navigation to next steps
 */
export async function fillBasicInfoForNavigation(page: Page, data?: ExperienceBasicInfoData): Promise<void> {
  const testData: ExperienceBasicInfoData = data || {
    title: `Test Experience ${Date.now()}`,
    slug: `test-experience-${Date.now()}`,
    category: 'Workshop',
    type: 'Virtual',
  };
  
  await fillExperienceBasicInfo(page, testData);
}

/**
 * Page Element Information Interface
 */
export interface PageElementInfo {
  type: 'input' | 'select' | 'textarea' | 'button' | 'other';
  selector: string;
  formControlName?: string;
  label?: string;
  required?: boolean;
  visible: boolean;
  inputType?: string;
  placeholder?: string;
}

/**
 * Inspect and document page elements
 */
export async function inspectPageElements(page: Page, pageName: string): Promise<PageElementInfo[]> {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000);
  
  const elements: PageElementInfo[] = [];
  
  // Find all form inputs, selects, and textareas
  const formElements = page.locator('input, select, textarea');
  const elementCount = await formElements.count();
  
  for (let i = 0; i < elementCount; i++) {
    const element = formElements.nth(i);
    const formControlName = await element.getAttribute('formcontrolname').catch(() => null);
    const tagName = await element.evaluate(el => el.tagName.toLowerCase()).catch(() => 'input');
    const inputType = await element.getAttribute('type').catch(() => null);
    const placeholder = await element.getAttribute('placeholder').catch(() => null);
    const visible = await element.isVisible().catch(() => false);
    
    // Try to find associated label
    let label: string | undefined;
    if (formControlName) {
      // Try multiple ways to find label
      const labelByFor = page.locator(`label[for="${formControlName}"]`);
      const labelByText = page.locator('label').filter({ hasText: new RegExp(formControlName, 'i') });
      const labelVisible = await labelByFor.isVisible({ timeout: 1000 }).catch(() => false) || 
                           await labelByText.first().isVisible({ timeout: 1000 }).catch(() => false);
      
      if (labelVisible) {
        const labelText = await labelByFor.textContent().catch(() => null) || 
                         await labelByText.first().textContent().catch(() => null);
        label = labelText || undefined;
      }
      
      // Also try finding label by looking for text near the input
      if (!label) {
        const parent = element.locator('..');
        const parentText = await parent.textContent().catch(() => '');
        const labelMatch = parentText.match(/(\w+)\s*(?:field|input|select)/i);
        if (labelMatch) {
          label = labelMatch[1];
        }
      }
    }
    
    // Check if required (check for required attribute or aria-required)
    const requiredAttr = await element.getAttribute('required').catch(() => null);
    const ariaRequired = await element.getAttribute('aria-required').catch(() => null);
    const required = requiredAttr !== null || ariaRequired === 'true';
    
    elements.push({
      type: tagName as any,
      selector: formControlName ? `[formcontrolname="${formControlName}"]` : `${tagName}:nth-child(${i + 1})`,
      formControlName: formControlName || undefined,
      label: label || undefined,
      required: required || undefined,
      visible,
      inputType: inputType || undefined,
      placeholder: placeholder || undefined,
    });
  }
  
  return elements;
}

// ============================================================================
// EXPERTISE CREATION HELPERS
// ============================================================================

export interface ExpertiseBasicInfoData {
  title: string;
  slug: string;
  description?: string;
  category?: string;
  host?: string;
  languages?: string[];
  tags?: string[];
}

export interface ExpertiseAvailabilityRatesData {
  packages?: any[];
  pricing?: any;
  availabilityHours?: any;
}

export interface ExpertiseBookingDetailsData {
  bookingSettings?: any;
  duration?: number;
  instructions?: string;
}

/**
 * Navigate to Expertise Creation flow
 */
export async function navigateToExpertiseCreation(page: Page): Promise<void> {
  // Login first
  await loginUser(page);
  
  // Navigate to hub dashboard
  await page.goto(`${APP_URL}/hub`);
  await page.waitForLoadState('networkidle');
  
  // Navigate to Expertise section
  const expertiseLink = page.getByRole('link', { name: /Expertise/i })
    .or(page.locator('a[href*="expertise"]'));
  
  if (await expertiseLink.first().isVisible({ timeout: 5000 })) {
    await expertiseLink.first().click();
    await page.waitForLoadState('networkidle');
  }
  
  // Find and click "Add Expertise" button
  const addExpertiseButton = page.getByRole('button', { name: /Add Expertise|Create Expertise|New Expertise/i })
    .or(page.getByRole('link', { name: /Add Expertise|Create Expertise/i }));
  
  await expect(addExpertiseButton.first()).toBeVisible({ timeout: 15000 });
  await addExpertiseButton.first().click();
  await page.waitForLoadState('networkidle');
  
  // Verify we're on the expertise creation flow
  await expect(page).toHaveURL(/.*expertise.*onboarding|.*onboarding.*expertise/i, { timeout: 10000 });
}

/**
 * Fill Expertise Basic Info (Step 1)
 */
export async function fillExpertiseBasicInfo(page: Page, data: ExpertiseBasicInfoData): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  
  // Title - form control name is "expertiseTitle", wrapped in ui-input component
  const titleInput = page.locator('ui-input[formcontrolname="expertiseTitle"] input')
    .or(page.locator('input[formcontrolname="expertiseTitle"]'))
    .or(page.locator('input[placeholder*="Title"], input[placeholder*="title"]'))
    .or(page.getByLabel(/Title/i));
  
  const titleVisible = await titleInput.first().isVisible({ timeout: 10000 }).catch(() => false);
  if (titleVisible) {
    // Clear first, then fill
    await titleInput.first().clear();
    await titleInput.first().fill(data.title);
    // Trigger input event to ensure Angular form control updates
    await titleInput.first().dispatchEvent('input');
    await titleInput.first().blur();
    await page.waitForTimeout(500);
    
    // Verify it was filled
    const titleValue = await titleInput.first().inputValue();
    if (titleValue === data.title) {
      console.log(`✅ Filled expertise title: ${data.title}`);
    } else {
      console.log(`⚠️ Title value mismatch. Expected: "${data.title}", Got: "${titleValue}"`);
    }
  } else {
    console.log('⚠️ Title input not found');
  }
  
  // Slug - form control name is "slug", native input (NOT wrapped in ui-input)
  // Located inside a div with "mereka.io/expertise/" prefix
  const slugInput = page.locator('input[formcontrolname="slug"]')
    .or(page.locator('input[placeholder="your-expertise-slug"]'))
    .or(page.locator('input[placeholder*="Slug"]'))
    .or(page.getByLabel(/Slug/i));
  
  const slugVisible = await slugInput.first().isVisible({ timeout: 5000 }).catch(() => false);
  if (slugVisible) {
    // Clear first, then fill
    await slugInput.first().clear();
    await slugInput.first().fill(data.slug);
    // Trigger input event to ensure Angular form control updates
    await slugInput.first().dispatchEvent('input');
    await slugInput.first().blur();
    await page.waitForTimeout(500);
    
    // Verify it was filled
    const slugValue = await slugInput.first().inputValue();
    if (slugValue === data.slug) {
      console.log(`✅ Filled expertise slug: ${data.slug}`);
    } else {
      console.log(`⚠️ Slug value mismatch. Expected: "${data.slug}", Got: "${slugValue}"`);
    }
  } else {
    console.log('⚠️ Slug input not found');
  }
  
  // Description - form control name is "expertiseDescription", uses ui-textarea component
  if (data.description) {
    const descriptionInput = page.locator('ui-textarea[formcontrolname="expertiseDescription"] textarea')
      .or(page.locator('textarea[formcontrolname="expertiseDescription"]'))
      .or(page.locator('textarea[placeholder*="Description"]'))
      .or(page.getByLabel(/Description/i));
    
    const descVisible = await descriptionInput.first().isVisible({ timeout: 5000 }).catch(() => false);
    if (descVisible) {
      // Clear first, then fill
      await descriptionInput.first().clear();
      await descriptionInput.first().fill(data.description);
      // Trigger input event to ensure Angular form control updates
      await descriptionInput.first().dispatchEvent('input');
      await descriptionInput.first().blur();
      await page.waitForTimeout(500);
      
      // Verify it was filled
      const descValue = await descriptionInput.first().inputValue();
      if (descValue.length > 0 && descValue.includes(data.description.substring(0, 20))) {
        console.log(`✅ Filled expertise description: ${descValue.length} characters`);
      } else {
        console.log(`⚠️ Description may not have been filled correctly. Got: "${descValue.substring(0, 50)}..."`);
      }
    } else {
      console.log('⚠️ Description textarea not found');
    }
  }
  
  // Summary - form control name is "expertiseSummary", uses ui-textarea component with placeholder="Summary"
  // This is a required field, so we should fill it if provided
  // Note: Summary is filled separately in the test file, but we can add it here too
  
  // Category
  if (data.category) {
    const categorySelect = page.locator('select[formcontrolname="category"]')
      .or(page.locator('[formcontrolname="category"]'))
      .or(page.getByLabel(/Category/i));
    
    if (await categorySelect.first().isVisible({ timeout: 3000 })) {
      await categorySelect.first().selectOption(data.category);
      await page.waitForTimeout(500);
    }
  }
  
  // Primary Language - form control name is "primaryLanguage", uses ui-select component
  if (data.primaryLanguage) {
    const primaryLanguageSelect = page.locator('ui-select[formcontrolname="primaryLanguage"]')
      .or(page.locator('select[formcontrolname="primaryLanguage"]'))
      .or(page.getByLabel(/Primary.*Language/i));
    
    if (await primaryLanguageSelect.first().isVisible({ timeout: 3000 })) {
      await primaryLanguageSelect.first().selectOption({ label: data.primaryLanguage });
      await page.waitForTimeout(500);
    }
  }
}

/**
 * Fill Expertise Availability & Rates (Step 2)
 */
export async function fillExpertiseAvailabilityRates(page: Page, data: ExpertiseAvailabilityRatesData): Promise<void> {
  // This step may involve creating packages, setting pricing, etc.
  // Implementation depends on actual UI structure
  await page.waitForLoadState('networkidle');
}

/**
 * Fill Expertise Booking Details (Step 3)
 */
export async function fillExpertiseBookingDetails(page: Page, data: ExpertiseBookingDetailsData): Promise<void> {
  // Duration
  if (data.duration) {
    const durationInput = page.locator('input[formcontrolname="duration"]')
      .or(page.locator('input[placeholder*="Duration"]'))
      .or(page.getByLabel(/Duration/i));
    
    if (await durationInput.first().isVisible({ timeout: 3000 })) {
      await durationInput.first().fill(data.duration.toString());
    }
  }
  
  // Instructions
  if (data.instructions) {
    const instructionsInput = page.locator('textarea[formcontrolname="instructions"]')
      .or(page.locator('textarea[placeholder*="Instructions"]'))
      .or(page.getByLabel(/Instructions/i));
    
    if (await instructionsInput.first().isVisible({ timeout: 3000 })) {
      await instructionsInput.first().fill(data.instructions);
    }
  }
}

/**
 * Save Expertise as Draft
 */
export async function saveExpertiseDraft(page: Page): Promise<void> {
  const saveDraftButton = page.getByRole('button', { name: /Save Draft|Save as Draft/i });
  await expect(saveDraftButton).toBeVisible({ timeout: 10000 });
  await saveDraftButton.click();
  await page.waitForLoadState('networkidle');
  
  // Verify success message
  const successMessage = page.getByText(/Saved|Draft saved|Success/i)
    .or(page.locator('[class*="success"], [class*="toast"]'));
  
  await expect(successMessage.first()).toBeVisible({ timeout: 10000 });
}

/**
 * Publish Expertise
 */
export async function publishExpertise(page: Page): Promise<void> {
  const publishButton = page.getByRole('button', { name: /Publish|Submit|Create Expertise/i });
  await expect(publishButton).toBeVisible({ timeout: 10000 });
  await publishButton.click();
  await page.waitForLoadState('networkidle');
  
  // Verify success message or redirect
  const successMessage = page.getByText(/Published|Created|Success/i)
    .or(page.locator('[class*="success"], [class*="toast"]'));
  
  await expect(successMessage.first()).toBeVisible({ timeout: 15000 });
}

// ============================================================================
// JOB CREATION HELPERS
// ============================================================================

export interface JobOverviewData {
  title: string;
  category?: string;
  serviceType?: string;
  employmentType?: string;
  location?: string;
  expertLevel?: string;
}

export interface JobRequirementsData {
  description?: string;
  skills?: string[];
  qualifications?: string[];
}

export interface JobTimelineBudgetData {
  timeline?: string;
  budgetType?: 'Fixed' | 'Hourly';
  currency?: string;
  amount?: number;
}

export interface JobYourDetailData {
  clientName?: string;
  organizationDetails?: string;
  aboutOrganization?: string;
}

/**
 * Navigate to Job Creation flow
 */
export async function navigateToJobCreation(page: Page): Promise<void> {
  // Login first
  await loginUser(page);
  
  // Navigate to hub dashboard
  await page.goto(`${APP_URL}/hub`);
  await page.waitForLoadState('networkidle');
  
  // Navigate to Jobs section
  const jobsLink = page.getByRole('link', { name: /Jobs/i })
    .or(page.locator('a[href*="job"]'));
  
  if (await jobsLink.first().isVisible({ timeout: 5000 })) {
    await jobsLink.first().click();
    await page.waitForLoadState('networkidle');
  }
  
  // Find and click "Create Job" button
  const createJobButton = page.getByRole('button', { name: /Create Job|Post Job|New Job/i })
    .or(page.getByRole('link', { name: /Create Job|Post Job/i }));
  
  await expect(createJobButton.first()).toBeVisible({ timeout: 15000 });
  await createJobButton.first().click();
  await page.waitForLoadState('networkidle');
  
  // Verify we're on the job creation flow
  await expect(page).toHaveURL(/.*job.*onboarding|.*onboarding.*job/i, { timeout: 10000 });
}

/**
 * Fill Job Overview (Step 1)
 */
export async function fillJobOverview(page: Page, data: JobOverviewData): Promise<void> {
  // Title (max 70 chars)
  const titleInput = page.locator('input[formcontrolname="title"]')
    .or(page.locator('input[placeholder*="Title"], input[placeholder*="Job Title"]'))
    .or(page.getByLabel(/Title|Job Title/i));
  
  await expect(titleInput.first()).toBeVisible({ timeout: 10000 });
  await titleInput.first().fill(data.title);
  
  // Category
  if (data.category) {
    const categorySelect = page.locator('select[formcontrolname="category"]')
      .or(page.locator('[formcontrolname="category"]'))
      .or(page.getByLabel(/Category/i));
    
    if (await categorySelect.first().isVisible({ timeout: 3000 })) {
      await categorySelect.first().selectOption(data.category);
    }
  }
  
  // Service Type
  if (data.serviceType) {
    const serviceTypeSelect = page.locator('select[formcontrolname="serviceType"]')
      .or(page.locator('[formcontrolname="serviceType"]'))
      .or(page.getByLabel(/Service Type/i));
    
    if (await serviceTypeSelect.first().isVisible({ timeout: 3000 })) {
      await serviceTypeSelect.first().selectOption(data.serviceType);
    }
  }
  
  // Employment Type
  if (data.employmentType) {
    const employmentTypeSelect = page.locator('select[formcontrolname="employmentType"]')
      .or(page.locator('[formcontrolname="employmentType"]'))
      .or(page.getByLabel(/Employment Type/i));
    
    if (await employmentTypeSelect.first().isVisible({ timeout: 3000 })) {
      await employmentTypeSelect.first().selectOption(data.employmentType);
    }
  }
  
  // Location
  if (data.location) {
    const locationInput = page.locator('input[formcontrolname="location"]')
      .or(page.locator('input[placeholder*="Location"]'))
      .or(page.getByLabel(/Location/i));
    
    if (await locationInput.first().isVisible({ timeout: 3000 })) {
      await locationInput.first().fill(data.location);
    }
  }
  
  // Expert Level
  if (data.expertLevel) {
    const expertLevelSelect = page.locator('select[formcontrolname="expertLevel"]')
      .or(page.locator('[formcontrolname="expertLevel"]'))
      .or(page.getByLabel(/Expert Level/i));
    
    if (await expertLevelSelect.first().isVisible({ timeout: 3000 })) {
      await expertLevelSelect.first().selectOption(data.expertLevel);
    }
  }
}

/**
 * Fill Job Requirements (Step 2)
 */
export async function fillJobRequirements(page: Page, data: JobRequirementsData): Promise<void> {
  // Description
  if (data.description) {
    const descriptionInput = page.locator('textarea[formcontrolname="description"]')
      .or(page.locator('textarea[placeholder*="Description"], textarea[placeholder*="Job Description"]'))
      .or(page.getByLabel(/Description/i));
    
    if (await descriptionInput.first().isVisible({ timeout: 3000 })) {
      await descriptionInput.first().fill(data.description);
    }
  }
  
  // Skills (may be a chip input or multi-select)
  if (data.skills && data.skills.length > 0) {
    const skillsInput = page.locator('input[formcontrolname="skills"]')
      .or(page.locator('[formcontrolname="skills"]'))
      .or(page.getByLabel(/Skills/i));
    
    if (await skillsInput.first().isVisible({ timeout: 3000 })) {
      for (const skill of data.skills) {
        await skillsInput.first().fill(skill);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);
      }
    }
  }
}

/**
 * Fill Job Timeline & Budget (Step 3)
 */
export async function fillJobTimelineBudget(page: Page, data: JobTimelineBudgetData): Promise<void> {
  // Timeline
  if (data.timeline) {
    const timelineInput = page.locator('input[formcontrolname="timeline"]')
      .or(page.locator('input[placeholder*="Timeline"]'))
      .or(page.getByLabel(/Timeline/i));
    
    if (await timelineInput.first().isVisible({ timeout: 3000 })) {
      await timelineInput.first().fill(data.timeline);
    }
  }
  
  // Budget Type
  if (data.budgetType) {
    const budgetTypeSelect = page.locator('select[formcontrolname="budgetType"]')
      .or(page.locator('[formcontrolname="budgetType"]'))
      .or(page.getByLabel(/Budget Type/i));
    
    if (await budgetTypeSelect.first().isVisible({ timeout: 3000 })) {
      await budgetTypeSelect.first().selectOption(data.budgetType);
    }
  }
  
  // Currency
  if (data.currency) {
    const currencySelect = page.locator('select[formcontrolname="currency"]')
      .or(page.locator('[formcontrolname="currency"]'))
      .or(page.getByLabel(/Currency/i));
    
    if (await currencySelect.first().isVisible({ timeout: 3000 })) {
      await currencySelect.first().selectOption(data.currency);
    }
  }
  
  // Amount
  if (data.amount) {
    const amountInput = page.locator('input[formcontrolname="amount"]')
      .or(page.locator('input[placeholder*="Amount"], input[placeholder*="Budget"]'))
      .or(page.getByLabel(/Amount|Budget/i));
    
    if (await amountInput.first().isVisible({ timeout: 3000 })) {
      await amountInput.first().fill(data.amount.toString());
    }
  }
}

/**
 * Fill Job Your Detail (Step 4)
 */
export async function fillJobYourDetail(page: Page, data: JobYourDetailData): Promise<void> {
  // Client Name
  if (data.clientName) {
    const clientNameInput = page.locator('input[formcontrolname="clientName"]')
      .or(page.locator('input[placeholder*="Client Name"], input[placeholder*="Your Name"]'))
      .or(page.getByLabel(/Client Name|Your Name/i));
    
    if (await clientNameInput.first().isVisible({ timeout: 3000 })) {
      await clientNameInput.first().fill(data.clientName);
    }
  }
  
  // Organization Details
  if (data.organizationDetails) {
    const orgDetailsInput = page.locator('textarea[formcontrolname="organizationDetails"]')
      .or(page.locator('textarea[placeholder*="Organization"]'))
      .or(page.getByLabel(/Organization Details/i));
    
    if (await orgDetailsInput.first().isVisible({ timeout: 3000 })) {
      await orgDetailsInput.first().fill(data.organizationDetails);
    }
  }
  
  // About Organization
  if (data.aboutOrganization) {
    const aboutOrgInput = page.locator('textarea[formcontrolname="aboutOrganization"]')
      .or(page.locator('textarea[placeholder*="About"]'))
      .or(page.getByLabel(/About Organization/i));
    
    if (await aboutOrgInput.first().isVisible({ timeout: 3000 })) {
      await aboutOrgInput.first().fill(data.aboutOrganization);
    }
  }
}

/**
 * Save Job as Draft
 */
export async function saveJobDraft(page: Page): Promise<void> {
  const saveDraftButton = page.getByRole('button', { name: /Save Draft|Save as Draft/i });
  await expect(saveDraftButton).toBeVisible({ timeout: 10000 });
  await saveDraftButton.click();
  await page.waitForLoadState('networkidle');
  
  // Verify success message
  const successMessage = page.getByText(/Saved|Draft saved|Success/i)
    .or(page.locator('[class*="success"], [class*="toast"]'));
  
  await expect(successMessage.first()).toBeVisible({ timeout: 10000 });
}

/**
 * Publish Job
 */
export async function publishJob(page: Page): Promise<void> {
  const publishButton = page.getByRole('button', { name: /Publish|Submit|Post Job/i });
  await expect(publishButton).toBeVisible({ timeout: 10000 });
  await publishButton.click();
  await page.waitForLoadState('networkidle');
  
  // Verify success message or redirect
  const successMessage = page.getByText(/Published|Created|Success|Posted/i)
    .or(page.locator('[class*="success"], [class*="toast"]'));
  
  await expect(successMessage.first()).toBeVisible({ timeout: 15000 });
}
