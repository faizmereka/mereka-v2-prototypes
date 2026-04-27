/**
 * Chat E2E Helper Functions
 *
 * Helper functions for chat-related E2E tests
 * Provides common operations for Hub and Learner chat flows
 */

import { Page, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_ENV === 'live' || process.env.TEST_ENV === 'production'
  ? 'https://v2.mereka.dev'
  : process.env.TEST_ENV === 'staging'
  ? 'https://v2-staging.mereka.io'
  : 'https://v2.mereka.dev';

const APP_URL = process.env.TEST_ENV === 'live' || process.env.TEST_ENV === 'production'
  ? 'https://app.mereka.dev'
  : process.env.TEST_ENV === 'staging'
  ? 'https://app-staging.mereka.io'
  : 'https://app.mereka.dev';

// ============================================================================
// Navigation Helpers
// ============================================================================

/**
 * Navigate to Hub Dashboard chats page
 */
export async function navigateToHubChats(page: Page, hubSlug: string): Promise<void> {
  await page.goto(`${APP_URL}/hub/${hubSlug}/chats`);
  await page.waitForLoadState('networkidle');

  // Wait for either room list or empty state
  const roomList = page.locator('[data-testid="room-list"]');
  const emptyState = page.locator('[data-testid="empty-state"]');
  const loadingSpinner = page.locator('[data-testid="loading-spinner"]');

  // Wait for loading to complete
  await loadingSpinner.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});

  // Either rooms are shown or empty state
  const hasRooms = await roomList.isVisible({ timeout: 5000 }).catch(() => false);
  const hasEmptyState = await emptyState.isVisible({ timeout: 5000 }).catch(() => false);

  if (!hasRooms && !hasEmptyState) {
    // Try waiting a bit more
    await page.waitForTimeout(2000);
  }

  console.log(`✅ Navigated to Hub chats: ${hubSlug}`);
}

/**
 * Navigate to Learner Dashboard chats page
 */
export async function navigateToLearnerChats(page: Page): Promise<void> {
  await page.goto(`${APP_URL}/dashboard/chats`);
  await page.waitForLoadState('networkidle');

  // Wait for either room list or empty state
  const roomList = page.locator('[data-testid="room-list"]');
  const emptyState = page.locator('[data-testid="empty-state"]');
  const loadingSpinner = page.locator('[data-testid="loading-spinner"]');

  // Wait for loading to complete
  await loadingSpinner.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});

  // Either rooms are shown or empty state
  const hasRooms = await roomList.isVisible({ timeout: 5000 }).catch(() => false);
  const hasEmptyState = await emptyState.isVisible({ timeout: 5000 }).catch(() => false);

  if (!hasRooms && !hasEmptyState) {
    await page.waitForTimeout(2000);
  }

  console.log('✅ Navigated to Learner chats');
}

// ============================================================================
// Room Interaction Helpers
// ============================================================================

/**
 * Select a chat room from the list
 */
export async function selectChatRoom(page: Page, index: number = 0): Promise<void> {
  const roomItem = page.locator('[data-testid="room-item"]').nth(index);
  await roomItem.waitFor({ state: 'visible', timeout: 10000 });
  await roomItem.click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  // Verify chat detail panel is visible
  const chatDetailPanel = page.locator('[data-testid="chat-detail-panel"]');
  await expect(chatDetailPanel).toBeVisible({ timeout: 10000 });

  console.log(`✅ Selected chat room ${index}`);
}

/**
 * Search for rooms by query
 */
export async function searchChatRooms(page: Page, query: string): Promise<void> {
  const searchInput = page.locator('[data-testid="search-input"]');
  await searchInput.waitFor({ state: 'visible', timeout: 10000 });
  await searchInput.clear();
  await searchInput.fill(query);
  await page.waitForTimeout(500); // Wait for debounce

  console.log(`✅ Searched for: "${query}"`);
}

/**
 * Filter rooms by context type (Hub only)
 */
export async function filterByContextType(
  page: Page,
  contextType: 'ALL' | 'EXPERTISE' | 'EXPERIENCE' | 'BOOKING' | 'JOB' | 'CONTRACT'
): Promise<void> {
  const filterButton = page.locator(`[data-testid="filter-${contextType}"]`);
  await filterButton.waitFor({ state: 'visible', timeout: 10000 });
  await filterButton.click();
  await page.waitForTimeout(500);

  console.log(`✅ Filtered by: ${contextType}`);
}

/**
 * Get count of visible rooms
 */
export async function getRoomCount(page: Page): Promise<number> {
  const rooms = page.locator('[data-testid="room-item"]');
  return await rooms.count();
}

// ============================================================================
// Message Interaction Helpers
// ============================================================================

/**
 * Send a text message
 */
export async function sendMessage(page: Page, text: string): Promise<void> {
  const textarea = page.locator('[data-testid="message-textarea"]');
  const sendButton = page.locator('[data-testid="send-button"]');

  await textarea.waitFor({ state: 'visible', timeout: 10000 });
  await textarea.fill(text);
  await sendButton.click();
  await page.waitForTimeout(1000);

  console.log(`✅ Sent message: "${text.substring(0, 30)}..."`);
}

/**
 * Send a message using Enter key
 */
export async function sendMessageWithEnter(page: Page, text: string): Promise<void> {
  const textarea = page.locator('[data-testid="message-textarea"]');

  await textarea.waitFor({ state: 'visible', timeout: 10000 });
  await textarea.fill(text);
  await textarea.press('Enter');
  await page.waitForTimeout(1000);

  console.log(`✅ Sent message with Enter: "${text.substring(0, 30)}..."`);
}

/**
 * Attach a file to the message
 */
export async function attachFile(page: Page, filePath: string): Promise<void> {
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(filePath);
  await page.waitForTimeout(500);

  // Verify file preview is shown
  const filesPreview = page.locator('[data-testid="selected-files-preview"]');
  await expect(filesPreview).toBeVisible({ timeout: 5000 });

  console.log(`✅ Attached file: ${filePath}`);
}

/**
 * Get count of messages in current conversation
 */
export async function getMessageCount(page: Page): Promise<number> {
  const messages = page.locator('[data-testid="message-bubble"]');
  return await messages.count();
}

/**
 * Get last message text
 */
export async function getLastMessageText(page: Page): Promise<string | null> {
  const lastMessage = page.locator('[data-testid="message-bubble"]').last();
  const messageText = lastMessage.locator('[data-testid="message-text"]');
  return await messageText.textContent();
}

/**
 * Scroll to load more messages
 */
export async function scrollToLoadMore(page: Page): Promise<void> {
  const container = page.locator('[data-testid="message-list-container"]');
  await container.evaluate(el => {
    el.scrollTop = 0;
  });
  await page.waitForTimeout(1500);

  console.log('✅ Scrolled to load more messages');
}

// ============================================================================
// Action Menu Helpers
// ============================================================================

/**
 * Open the actions menu
 */
export async function openActionsMenu(page: Page): Promise<void> {
  const actionsButton = page.locator('[data-testid="actions-menu-button"]');
  await actionsButton.waitFor({ state: 'visible', timeout: 10000 });
  await actionsButton.click();

  const dropdown = page.locator('[data-testid="actions-dropdown"]');
  await expect(dropdown).toBeVisible({ timeout: 5000 });

  console.log('✅ Opened actions menu');
}

/**
 * Archive the current room
 */
export async function archiveCurrentRoom(page: Page): Promise<void> {
  await openActionsMenu(page);
  const archiveButton = page.locator('[data-testid="archive-button"]');
  await archiveButton.click();
  await page.waitForTimeout(500);

  console.log('✅ Archived room');
}

/**
 * Mute the current room
 */
export async function muteCurrentRoom(page: Page): Promise<void> {
  await openActionsMenu(page);
  const muteButton = page.locator('[data-testid="mute-button"]');
  await muteButton.click();
  await page.waitForTimeout(500);

  console.log('✅ Muted room');
}

/**
 * Unmute the current room
 */
export async function unmuteCurrentRoom(page: Page): Promise<void> {
  await openActionsMenu(page);
  const unmuteButton = page.locator('[data-testid="unmute-button"]');
  await unmuteButton.click();
  await page.waitForTimeout(500);

  console.log('✅ Unmuted room');
}

// ============================================================================
// Hub-Specific Helpers
// ============================================================================

/**
 * Join a conversation as hub team member
 */
export async function joinConversation(page: Page): Promise<void> {
  const joinButton = page.locator('[data-testid="join-button"]');
  await joinButton.waitFor({ state: 'visible', timeout: 10000 });
  await joinButton.click();
  await page.waitForTimeout(500);

  console.log('✅ Joined conversation');
}

/**
 * Assign conversation to self
 */
export async function assignToSelf(page: Page): Promise<void> {
  const assignButton = page.locator('[data-testid="assign-to-self-button"]');
  await assignButton.waitFor({ state: 'visible', timeout: 10000 });
  await assignButton.click();
  await page.waitForTimeout(500);

  console.log('✅ Assigned to self');
}

// ============================================================================
// Verification Helpers
// ============================================================================

/**
 * Verify chat page is loaded
 */
export async function verifyChatPageLoaded(page: Page): Promise<void> {
  const pageTitle = page.locator('[data-testid="page-title"]');
  await expect(pageTitle).toBeVisible({ timeout: 15000 });
  await expect(pageTitle).toContainText(/Chats|Messages/i);
}

/**
 * Verify message was sent successfully
 */
export async function verifyMessageSent(page: Page, expectedText: string): Promise<void> {
  const lastMessage = page.locator('[data-testid="message-bubble"]').last();
  const messageText = lastMessage.locator('[data-testid="message-text"]');
  await expect(messageText).toContainText(expectedText, { timeout: 10000 });

  console.log('✅ Message sent verification passed');
}

/**
 * Verify typing indicator is shown
 */
export async function verifyTypingIndicator(page: Page): Promise<void> {
  const typingIndicator = page.locator('[data-testid="typing-indicator"]');
  await expect(typingIndicator).toBeVisible({ timeout: 10000 });
}

/**
 * Verify empty state is shown
 */
export async function verifyEmptyState(page: Page): Promise<void> {
  const emptyState = page.locator('[data-testid="empty-state"]');
  await expect(emptyState).toBeVisible({ timeout: 10000 });
}

/**
 * Verify room is in the list
 */
export async function verifyRoomInList(page: Page, roomName: string): Promise<void> {
  const roomItem = page.locator('[data-testid="room-item"]').filter({ hasText: roomName });
  await expect(roomItem).toBeVisible({ timeout: 10000 });
}

/**
 * Verify unread badge count
 */
export async function verifyUnreadBadge(page: Page, expectedCount: number): Promise<void> {
  const unreadBadge = page.locator('[data-testid="total-unread-badge"]');
  if (expectedCount > 0) {
    await expect(unreadBadge).toBeVisible({ timeout: 10000 });
    await expect(unreadBadge).toContainText(String(expectedCount));
  } else {
    await expect(unreadBadge).not.toBeVisible();
  }
}

/**
 * Check if send button is disabled
 */
export async function isSendButtonDisabled(page: Page): Promise<boolean> {
  const sendButton = page.locator('[data-testid="send-button"]');
  return await sendButton.isDisabled();
}

/**
 * Check if chat input is disabled
 */
export async function isInputDisabled(page: Page): Promise<boolean> {
  const textarea = page.locator('[data-testid="message-textarea"]');
  return await textarea.isDisabled();
}

// ============================================================================
// Wait Helpers
// ============================================================================

/**
 * Wait for messages to load
 */
export async function waitForMessagesToLoad(page: Page): Promise<void> {
  const loadingSpinner = page.locator('[data-testid="loading-more-spinner"]');
  await loadingSpinner.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});

  const messagesContainer = page.locator('[data-testid="messages-container"]');
  await messagesContainer.waitFor({ state: 'visible', timeout: 10000 });
}

/**
 * Wait for WebSocket connection
 */
export async function waitForSocketConnection(page: Page): Promise<void> {
  // Wait for reconnecting banner to disappear
  const reconnectingBanner = page.locator('[data-testid="reconnecting-banner"]');
  await reconnectingBanner.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
}

/**
 * Wait for real-time message
 */
export async function waitForNewMessage(page: Page, timeout: number = 30000): Promise<void> {
  const initialCount = await getMessageCount(page);

  await page.waitForFunction(
    (count) => {
      const messages = document.querySelectorAll('[data-testid="message-bubble"]');
      return messages.length > count;
    },
    initialCount,
    { timeout }
  );
}
