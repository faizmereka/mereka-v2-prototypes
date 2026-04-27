import type { Page, Locator } from '@playwright/test';

/**
 * Page Object for Learner Booking Detail Page
 * Maps to: /dashboard/bookings/:bookingId
 */
export class BookingDetailPage {
  readonly page: Page;

  // Page container
  readonly pageContainer: Locator;
  readonly loadingState: Locator;
  readonly errorState: Locator;

  // Header
  readonly header: Locator;
  readonly backButton: Locator;
  readonly title: Locator;
  readonly printButton: Locator;

  // Booking info
  readonly infoSection: Locator;
  readonly statusBadge: Locator;
  readonly dateTime: Locator;
  readonly confirmationCode: Locator;
  readonly serviceLink: Locator;
  readonly serviceType: Locator;
  readonly locationInfo: Locator;

  // Guests section
  readonly guestsSection: Locator;
  readonly ticketList: Locator;

  // Price section
  readonly priceSection: Locator;
  readonly paymentStatus: Locator;
  readonly totalPaid: Locator;

  // Review section
  readonly reviewSection: Locator;
  readonly reviewLoading: Locator;
  readonly existingReview: Locator;
  readonly reviewRating: Locator;
  readonly reviewContent: Locator;
  readonly reviewPhotos: Locator;
  readonly reviewActionsMenu: Locator;
  readonly editReviewButton: Locator;
  readonly deleteReviewButton: Locator;
  readonly leaveReviewButton: Locator;
  readonly hubReply: Locator;
  readonly hubReplyContent: Locator;

  // Review dialog
  readonly reviewDialog: Locator;
  readonly reviewDialogClose: Locator;
  readonly reviewRatingInput: Locator;
  readonly reviewContentInput: Locator;
  readonly reviewPhotoUpload: Locator;
  readonly reviewSubmitButton: Locator;
  readonly reviewCancelButton: Locator;

  // Delete confirmation dialog
  readonly deleteConfirmDialog: Locator;
  readonly deleteConfirmButton: Locator;
  readonly deleteCancelButton: Locator;

  // Location section
  readonly locationSection: Locator;
  readonly locationAddress: Locator;
  readonly locationMap: Locator;

  // Actions
  readonly actionsSection: Locator;
  readonly cancelButton: Locator;
  readonly helpLink: Locator;

  constructor(page: Page) {
    this.page = page;

    // Page container
    this.pageContainer = page.getByTestId('booking-detail-page');
    this.loadingState = page.getByTestId('booking-detail-loading');
    this.errorState = page.getByTestId('booking-detail-error');

    // Header
    this.header = page.getByTestId('booking-detail-header');
    this.backButton = page.getByTestId('booking-back-btn');
    this.title = page.getByTestId('booking-title');
    this.printButton = page.getByTestId('booking-print-btn');

    // Booking info
    this.infoSection = page.getByTestId('booking-info-section');
    this.statusBadge = page.getByTestId('booking-status-badge');
    this.dateTime = page.getByTestId('booking-datetime');
    this.confirmationCode = page.getByTestId('booking-confirmation-code');
    this.serviceLink = page.getByTestId('booking-service-link');
    this.serviceType = page.getByTestId('booking-service-type');
    this.locationInfo = page.getByTestId('booking-location-info');

    // Guests section
    this.guestsSection = page.getByTestId('booking-guests-section');
    this.ticketList = page.getByTestId('booking-ticket-list');

    // Price section
    this.priceSection = page.getByTestId('booking-price-section');
    this.paymentStatus = page.getByTestId('booking-payment-status');
    this.totalPaid = page.getByTestId('booking-total-paid');

    // Review section
    this.reviewSection = page.getByTestId('booking-review-section');
    this.reviewLoading = page.getByTestId('booking-review-loading');
    this.existingReview = page.getByTestId('booking-existing-review');
    this.reviewRating = page.getByTestId('booking-review-rating');
    this.reviewContent = page.getByTestId('booking-review-content');
    this.reviewPhotos = page.getByTestId('booking-review-photos');
    this.reviewActionsMenu = page.getByTestId('booking-review-actions-menu');
    this.editReviewButton = page.getByTestId('booking-edit-review-btn');
    this.deleteReviewButton = page.getByTestId('booking-delete-review-btn');
    this.leaveReviewButton = page.getByTestId('booking-leave-review-btn');
    this.hubReply = page.getByTestId('booking-hub-reply');
    this.hubReplyContent = page.getByTestId('booking-hub-reply-content');

    // Review dialog
    this.reviewDialog = page.getByTestId('booking-review-dialog');
    this.reviewDialogClose = page.getByTestId('booking-review-dialog-close');
    this.reviewRatingInput = page.getByTestId('booking-review-rating-input');
    this.reviewContentInput = page.getByTestId('booking-review-content-input');
    this.reviewPhotoUpload = page.getByTestId('booking-review-photo-upload');
    this.reviewSubmitButton = page.getByTestId('booking-review-submit-btn');
    this.reviewCancelButton = page.getByTestId('booking-review-cancel-btn');

    // Delete confirmation dialog
    this.deleteConfirmDialog = page.getByTestId('booking-delete-confirm-dialog');
    this.deleteConfirmButton = page.getByTestId('booking-delete-confirm-btn');
    this.deleteCancelButton = page.getByTestId('booking-delete-cancel-btn');

    // Location section
    this.locationSection = page.getByTestId('booking-location-section');
    this.locationAddress = page.getByTestId('booking-location-address');
    this.locationMap = page.getByTestId('booking-location-map');

    // Actions
    this.actionsSection = page.getByTestId('booking-actions-section');
    this.cancelButton = page.getByTestId('booking-cancel-btn');
    this.helpLink = page.getByTestId('booking-help-link');
  }

  /**
   * Navigate to booking detail page
   */
  async goto(bookingId: string) {
    await this.page.goto(`/dashboard/bookings/${bookingId}`);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Wait for page to load
   */
  async waitForLoad() {
    await this.loadingState.waitFor({ state: 'hidden', timeout: 10000 });
    await this.pageContainer.waitFor({ state: 'visible' });
  }

  /**
   * Open review dialog
   */
  async openReviewDialog() {
    await this.leaveReviewButton.click();
    await this.reviewDialog.waitFor({ state: 'visible' });
  }

  /**
   * Submit a review
   */
  async submitReview(rating: number, content: string) {
    await this.openReviewDialog();
    await this.selectRating(rating);
    await this.reviewContentInput.fill(content);
    await this.reviewSubmitButton.click();
    await this.reviewDialog.waitFor({ state: 'hidden' });
  }

  /**
   * Select star rating
   */
  async selectRating(rating: number) {
    const starButton = this.page.getByTestId(`rating-star-${rating}`);
    await starButton.click();
  }

  /**
   * Edit existing review
   */
  async editReview(newContent: string) {
    await this.reviewActionsMenu.click();
    await this.editReviewButton.click();
    await this.reviewDialog.waitFor({ state: 'visible' });
    await this.reviewContentInput.clear();
    await this.reviewContentInput.fill(newContent);
    await this.reviewSubmitButton.click();
    await this.reviewDialog.waitFor({ state: 'hidden' });
  }

  /**
   * Delete existing review
   */
  async deleteReview() {
    await this.reviewActionsMenu.click();
    await this.deleteReviewButton.click();
    await this.deleteConfirmDialog.waitFor({ state: 'visible' });
    await this.deleteConfirmButton.click();
    await this.deleteConfirmDialog.waitFor({ state: 'hidden' });
  }

  /**
   * Get ticket item by index
   */
  getTicketItem(index: number): Locator {
    return this.page.getByTestId(`booking-ticket-item-${index}`);
  }

  /**
   * Get guest item by index
   */
  getGuestItem(index: number): Locator {
    return this.page.getByTestId(`booking-guest-item-${index}`);
  }
}
