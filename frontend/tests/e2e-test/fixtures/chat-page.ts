/**
 * Chat Page Object for E2E Tests
 *
 * Page object model for Hub and Learner chat pages
 * Provides locators and actions for chat-related E2E tests
 */

import { Page, Locator } from '@playwright/test';

export class ChatPage {
  readonly page: Page;

  // Page container
  readonly hubChatsPage: Locator;
  readonly learnerChatsPage: Locator;

  // Header elements
  readonly pageTitle: Locator;
  readonly totalUnreadBadge: Locator;
  readonly reconnectingBanner: Locator;

  // Search
  readonly searchInput: Locator;

  // Filter tabs (Hub only)
  readonly filterTabs: Locator;
  readonly filterAll: Locator;
  readonly filterExpertise: Locator;
  readonly filterExperience: Locator;
  readonly filterBooking: Locator;
  readonly filterJob: Locator;
  readonly filterContract: Locator;

  // Room list
  readonly roomList: Locator;
  readonly roomItems: Locator;
  readonly emptyState: Locator;
  readonly loadingSpinner: Locator;

  // Chat detail panel
  readonly chatDetailPanel: Locator;
  readonly backButton: Locator;
  readonly chatHeader: Locator;
  readonly participantsSection: Locator;

  // Actions menu
  readonly actionsMenuButton: Locator;
  readonly actionsDropdown: Locator;
  readonly archiveButton: Locator;
  readonly unarchiveButton: Locator;
  readonly muteButton: Locator;
  readonly unmuteButton: Locator;

  // Hub-specific: Assignment
  readonly joinButton: Locator;
  readonly assignToSelfButton: Locator;
  readonly assignToOtherButton: Locator;

  // Message list
  readonly messageList: Locator;
  readonly messagesContainer: Locator;
  readonly messageBubbles: Locator;
  readonly emptyMessagesState: Locator;
  readonly loadingMoreSpinner: Locator;
  readonly dateSeparator: Locator;

  // Typing indicator
  readonly typingIndicator: Locator;
  readonly typingText: Locator;

  // Chat input
  readonly chatInputContainer: Locator;
  readonly messageTextarea: Locator;
  readonly sendButton: Locator;
  readonly attachFileButton: Locator;
  readonly selectedFilesPreview: Locator;

  constructor(page: Page) {
    this.page = page;

    // Page containers
    this.hubChatsPage = page.locator('[data-testid="hub-chats-page"]');
    this.learnerChatsPage = page.locator('[data-testid="learner-chats-page"]');

    // Header
    this.pageTitle = page.locator('[data-testid="page-title"]');
    this.totalUnreadBadge = page.locator('[data-testid="total-unread-badge"]');
    this.reconnectingBanner = page.locator('[data-testid="reconnecting-banner"]');

    // Search
    this.searchInput = page.locator('[data-testid="search-input"]');

    // Filter tabs
    this.filterTabs = page.locator('[data-testid="filter-tabs"]');
    this.filterAll = page.locator('[data-testid="filter-ALL"]');
    this.filterExpertise = page.locator('[data-testid="filter-EXPERTISE"]');
    this.filterExperience = page.locator('[data-testid="filter-EXPERIENCE"]');
    this.filterBooking = page.locator('[data-testid="filter-BOOKING"]');
    this.filterJob = page.locator('[data-testid="filter-JOB"]');
    this.filterContract = page.locator('[data-testid="filter-CONTRACT"]');

    // Room list
    this.roomList = page.locator('[data-testid="room-list"]');
    this.roomItems = page.locator('[data-testid="room-item"]');
    this.emptyState = page.locator('[data-testid="empty-state"]');
    this.loadingSpinner = page.locator('[data-testid="loading-spinner"]');

    // Chat detail panel
    this.chatDetailPanel = page.locator('[data-testid="chat-detail-panel"]');
    this.backButton = page.locator('[data-testid="back-button"]');
    this.chatHeader = page.locator('[data-testid="chat-header"]');
    this.participantsSection = page.locator('[data-testid="participants-section"]');

    // Actions menu
    this.actionsMenuButton = page.locator('[data-testid="actions-menu-button"]');
    this.actionsDropdown = page.locator('[data-testid="actions-dropdown"]');
    this.archiveButton = page.locator('[data-testid="archive-button"]');
    this.unarchiveButton = page.locator('[data-testid="unarchive-button"]');
    this.muteButton = page.locator('[data-testid="mute-button"]');
    this.unmuteButton = page.locator('[data-testid="unmute-button"]');

    // Hub-specific assignment
    this.joinButton = page.locator('[data-testid="join-button"]');
    this.assignToSelfButton = page.locator('[data-testid="assign-to-self-button"]');
    this.assignToOtherButton = page.locator('[data-testid="assign-to-other-button"]');

    // Message list
    this.messageList = page.locator('[data-testid="message-list"]');
    this.messagesContainer = page.locator('[data-testid="messages-container"]');
    this.messageBubbles = page.locator('[data-testid="message-bubble"]');
    this.emptyMessagesState = page.locator('[data-testid="empty-messages-state"]');
    this.loadingMoreSpinner = page.locator('[data-testid="loading-more-spinner"]');
    this.dateSeparator = page.locator('[data-testid="date-separator"]');

    // Typing indicator
    this.typingIndicator = page.locator('[data-testid="typing-indicator"]');
    this.typingText = page.locator('[data-testid="typing-text"]');

    // Chat input
    this.chatInputContainer = page.locator('[data-testid="chat-input-container"]');
    this.messageTextarea = page.locator('[data-testid="message-textarea"]');
    this.sendButton = page.locator('[data-testid="send-button"]');
    this.attachFileButton = page.locator('[data-testid="attach-file-button"]');
    this.selectedFilesPreview = page.locator('[data-testid="selected-files-preview"]');
  }

  // =========================================================================
  // Navigation Actions
  // =========================================================================

  /**
   * Navigate to Hub Chats page
   */
  async gotoHubChats(hubSlug: string): Promise<void> {
    await this.page.goto(`/hub/${hubSlug}/chats`);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to Learner Chats page
   */
  async gotoLearnerChats(): Promise<void> {
    await this.page.goto('/dashboard/chats');
    await this.page.waitForLoadState('networkidle');
  }

  // =========================================================================
  // Room List Actions
  // =========================================================================

  /**
   * Select a room from the list by index
   */
  async selectRoom(index: number = 0): Promise<void> {
    const room = this.roomItems.nth(index);
    await room.waitFor({ state: 'visible', timeout: 10000 });
    await room.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Select a room by hub/learner name
   */
  async selectRoomByName(name: string): Promise<void> {
    const room = this.roomItems.filter({ hasText: name }).first();
    await room.waitFor({ state: 'visible', timeout: 10000 });
    await room.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Search for rooms
   */
  async searchRooms(query: string): Promise<void> {
    await this.searchInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.searchInput.clear();
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(500); // Debounce
  }

  /**
   * Clear search
   */
  async clearSearch(): Promise<void> {
    await this.searchInput.clear();
    await this.page.waitForTimeout(500);
  }

  /**
   * Filter rooms by context type (Hub only)
   */
  async filterByContext(contextType: 'ALL' | 'EXPERTISE' | 'EXPERIENCE' | 'BOOKING' | 'JOB' | 'CONTRACT'): Promise<void> {
    const filterButton = this.page.locator(`[data-testid="filter-${contextType}"]`);
    await filterButton.waitFor({ state: 'visible', timeout: 10000 });
    await filterButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Get room count
   */
  async getRoomCount(): Promise<number> {
    return await this.roomItems.count();
  }

  // =========================================================================
  // Chat Detail Actions
  // =========================================================================

  /**
   * Go back to room list (mobile view)
   */
  async goBackToList(): Promise<void> {
    await this.backButton.waitFor({ state: 'visible', timeout: 10000 });
    await this.backButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Open actions menu
   */
  async openActionsMenu(): Promise<void> {
    await this.actionsMenuButton.waitFor({ state: 'visible', timeout: 10000 });
    await this.actionsMenuButton.click();
    await this.actionsDropdown.waitFor({ state: 'visible', timeout: 5000 });
  }

  /**
   * Archive current room
   */
  async archiveRoom(): Promise<void> {
    await this.openActionsMenu();
    await this.archiveButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Unarchive current room
   */
  async unarchiveRoom(): Promise<void> {
    await this.openActionsMenu();
    await this.unarchiveButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Mute current room
   */
  async muteRoom(): Promise<void> {
    await this.openActionsMenu();
    await this.muteButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Unmute current room
   */
  async unmuteRoom(): Promise<void> {
    await this.openActionsMenu();
    await this.unmuteButton.click();
    await this.page.waitForTimeout(500);
  }

  // =========================================================================
  // Hub-Specific Actions
  // =========================================================================

  /**
   * Join a conversation as hub team member
   */
  async joinConversation(): Promise<void> {
    await this.joinButton.waitFor({ state: 'visible', timeout: 10000 });
    await this.joinButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Assign conversation to self
   */
  async assignToSelf(): Promise<void> {
    await this.assignToSelfButton.waitFor({ state: 'visible', timeout: 10000 });
    await this.assignToSelfButton.click();
    await this.page.waitForTimeout(500);
  }

  // =========================================================================
  // Messaging Actions
  // =========================================================================

  /**
   * Send a text message
   */
  async sendMessage(text: string): Promise<void> {
    await this.messageTextarea.waitFor({ state: 'visible', timeout: 10000 });
    await this.messageTextarea.fill(text);
    await this.sendButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Send message with Enter key
   */
  async sendMessageWithEnter(text: string): Promise<void> {
    await this.messageTextarea.waitFor({ state: 'visible', timeout: 10000 });
    await this.messageTextarea.fill(text);
    await this.messageTextarea.press('Enter');
    await this.page.waitForTimeout(500);
  }

  /**
   * Attach a file
   */
  async attachFile(filePath: string): Promise<void> {
    const fileInput = this.page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);
    await this.page.waitForTimeout(500);
  }

  /**
   * Remove attached file by index
   */
  async removeAttachedFile(index: number = 0): Promise<void> {
    const removeButton = this.selectedFilesPreview.locator('button').nth(index);
    await removeButton.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Get message count
   */
  async getMessageCount(): Promise<number> {
    return await this.messageBubbles.count();
  }

  /**
   * Get last message text
   */
  async getLastMessageText(): Promise<string | null> {
    const lastMessage = this.messageBubbles.last().locator('[data-testid="message-text"]');
    return await lastMessage.textContent();
  }

  /**
   * Scroll to load more messages
   */
  async scrollToLoadMore(): Promise<void> {
    const messageListContainer = this.page.locator('[data-testid="message-list-container"]');
    await messageListContainer.evaluate(el => {
      el.scrollTop = 0;
    });
    await this.page.waitForTimeout(1000);
  }

  // =========================================================================
  // Verification Helpers
  // =========================================================================

  /**
   * Check if chat input is disabled
   */
  async isInputDisabled(): Promise<boolean> {
    return await this.messageTextarea.isDisabled();
  }

  /**
   * Check if typing indicator is visible
   */
  async isTypingIndicatorVisible(): Promise<boolean> {
    return await this.typingIndicator.isVisible();
  }

  /**
   * Check if empty state is shown
   */
  async isEmptyStateVisible(): Promise<boolean> {
    return await this.emptyState.isVisible();
  }

  /**
   * Check if room list is loading
   */
  async isLoading(): Promise<boolean> {
    return await this.loadingSpinner.isVisible();
  }

  /**
   * Check if reconnecting banner is shown
   */
  async isReconnecting(): Promise<boolean> {
    return await this.reconnectingBanner.isVisible();
  }
}
