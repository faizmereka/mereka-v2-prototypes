import type { Page, Locator } from '@playwright/test';

/**
 * Page Object for Hub Booking Detail Modal/View
 * Accessed from Hub Dashboard Bookings List
 */
export class HubBookingDetailPage {
  readonly page: Page;

  // Modal container
  readonly modal: Locator;
  readonly closeButton: Locator;
  readonly loadingState: Locator;

  // Booking info
  readonly bookingInfo: Locator;
  readonly dateTime: Locator;
  readonly status: Locator;
  readonly service: Locator;
  readonly bookerInfo: Locator;
  readonly participantsList: Locator;
  readonly paymentDetails: Locator;
  readonly payoutAmount: Locator;

  // Learner review section
  readonly learnerReview: Locator;
  readonly learnerReviewRating: Locator;
  readonly learnerReviewContent: Locator;
  readonly replyButton: Locator;
  readonly replyInput: Locator;
  readonly replySubmit: Locator;
  readonly existingReply: Locator;
  readonly editReplyButton: Locator;
  readonly deleteReplyButton: Locator;

  // Delete reply confirmation
  readonly deleteReplyConfirmDialog: Locator;
  readonly deleteReplyConfirmButton: Locator;
  readonly deleteReplyCancelButton: Locator;

  // Actions
  readonly cancelButton: Locator;
  readonly messageButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Modal container
    this.modal = page.getByTestId('hub-booking-detail');
    this.closeButton = page.getByTestId('hub-booking-close-btn');
    this.loadingState = page.getByTestId('hub-booking-loading');

    // Booking info
    this.bookingInfo = page.getByTestId('hub-booking-info');
    this.dateTime = page.getByTestId('hub-booking-datetime');
    this.status = page.getByTestId('hub-booking-status');
    this.service = page.getByTestId('hub-booking-service');
    this.bookerInfo = page.getByTestId('hub-booking-booker-info');
    this.participantsList = page.getByTestId('hub-booking-participants-list');
    this.paymentDetails = page.getByTestId('hub-booking-payment-details');
    this.payoutAmount = page.getByTestId('hub-booking-payout-amount');

    // Learner review section
    this.learnerReview = page.getByTestId('hub-booking-learner-review');
    this.learnerReviewRating = page.getByTestId('hub-booking-learner-review-rating');
    this.learnerReviewContent = page.getByTestId('hub-booking-learner-review-content');
    this.replyButton = page.getByTestId('hub-booking-reply-btn');
    this.replyInput = page.getByTestId('hub-booking-reply-input');
    this.replySubmit = page.getByTestId('hub-booking-reply-submit');
    this.existingReply = page.getByTestId('hub-booking-existing-reply');
    this.editReplyButton = page.getByTestId('hub-booking-edit-reply-btn');
    this.deleteReplyButton = page.getByTestId('hub-booking-delete-reply-btn');

    // Delete reply confirmation
    this.deleteReplyConfirmDialog = page.getByTestId('hub-booking-delete-reply-confirm-dialog');
    this.deleteReplyConfirmButton = page.getByTestId('hub-booking-delete-reply-confirm-btn');
    this.deleteReplyCancelButton = page.getByTestId('hub-booking-delete-reply-cancel-btn');

    // Actions
    this.cancelButton = page.getByTestId('hub-booking-cancel-btn');
    this.messageButton = page.getByTestId('hub-booking-message-btn');
  }

  /**
   * Wait for modal to be visible and loaded
   */
  async waitForLoad() {
    await this.modal.waitFor({ state: 'visible' });
    await this.loadingState.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
  }

  /**
   * Close the modal
   */
  async close() {
    await this.closeButton.click();
    await this.modal.waitFor({ state: 'hidden' });
  }

  /**
   * Submit a reply to learner review
   */
  async submitReply(content: string) {
    await this.replyButton.click();
    await this.replyInput.waitFor({ state: 'visible' });
    await this.replyInput.fill(content);
    await this.replySubmit.click();
    await this.replyInput.waitFor({ state: 'hidden' });
  }

  /**
   * Edit existing reply
   */
  async editReply(newContent: string) {
    await this.editReplyButton.click();
    await this.replyInput.waitFor({ state: 'visible' });
    await this.replyInput.clear();
    await this.replyInput.fill(newContent);
    await this.replySubmit.click();
    await this.replyInput.waitFor({ state: 'hidden' });
  }

  /**
   * Delete existing reply
   */
  async deleteReply() {
    await this.deleteReplyButton.click();
    await this.deleteReplyConfirmDialog.waitFor({ state: 'visible' });
    await this.deleteReplyConfirmButton.click();
    await this.deleteReplyConfirmDialog.waitFor({ state: 'hidden' });
  }

  /**
   * Get participant by index
   */
  getParticipant(index: number): Locator {
    return this.page.getByTestId(`hub-booking-participant-${index}`);
  }
}

/**
 * Page Object for Hub Bookings List
 * Used to navigate to booking detail
 */
export class HubBookingsListPage {
  readonly page: Page;
  readonly bookingsList: Locator;
  readonly loadingState: Locator;

  constructor(page: Page) {
    this.page = page;
    this.bookingsList = page.getByTestId('hub-bookings-list');
    this.loadingState = page.getByTestId('hub-bookings-loading');
  }

  /**
   * Navigate to hub bookings page
   */
  async goto() {
    await this.page.goto('/hub/bookings');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Wait for page to load
   */
  async waitForLoad() {
    await this.loadingState.waitFor({ state: 'hidden', timeout: 10000 });
  }

  /**
   * Open booking detail from action menu
   */
  async openBookingDetail(bookingIndex: number) {
    const actionButton = this.page.getByTestId(`booking-action-btn-${bookingIndex}`);
    await actionButton.click();
    const viewDetailsOption = this.page.getByTestId('booking-view-details-option');
    await viewDetailsOption.click();
  }

  /**
   * Get booking row by index
   */
  getBookingRow(index: number): Locator {
    return this.page.getByTestId(`booking-row-${index}`);
  }
}
