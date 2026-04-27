import type { Page, Locator } from '@playwright/test';

/**
 * Page Object for Contract Reviews Tab
 * Part of Contract Detail Page in Hub Dashboard
 */
export class ContractReviewsPage {
  readonly page: Page;

  // Tab
  readonly reviewsTab: Locator;
  readonly reviewsTabBadge: Locator;

  // Section
  readonly reviewsSection: Locator;
  readonly loadingState: Locator;
  readonly emptyState: Locator;

  // Actions
  readonly writeReviewButton: Locator;

  // Review dialog
  readonly reviewDialog: Locator;
  readonly reviewDialogClose: Locator;
  readonly reviewRatingInput: Locator;
  readonly reviewContentInput: Locator;
  readonly qualityRatingInput: Locator;
  readonly communicationRatingInput: Locator;
  readonly professionalismRatingInput: Locator;
  readonly timelinessRatingInput: Locator;
  readonly reviewSubmitButton: Locator;
  readonly reviewCancelButton: Locator;

  // Delete confirmation dialog
  readonly deleteConfirmDialog: Locator;
  readonly deleteConfirmButton: Locator;
  readonly deleteCancelButton: Locator;

  // Reply dialog
  readonly replyDialog: Locator;
  readonly replyInput: Locator;
  readonly replySubmitButton: Locator;
  readonly replyCancelButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Tab
    this.reviewsTab = page.getByTestId('contract-review-tab');
    this.reviewsTabBadge = page.getByTestId('contract-reviews-tab-badge');

    // Section
    this.reviewsSection = page.getByTestId('contract-reviews-section');
    this.loadingState = page.getByTestId('contract-reviews-loading');
    this.emptyState = page.getByTestId('contract-reviews-empty');

    // Actions
    this.writeReviewButton = page.getByTestId('contract-write-review-btn');

    // Review dialog
    this.reviewDialog = page.getByTestId('contract-review-dialog');
    this.reviewDialogClose = page.getByTestId('contract-review-dialog-close');
    this.reviewRatingInput = page.getByTestId('contract-review-rating-input');
    this.reviewContentInput = page.getByTestId('contract-review-content-input');
    this.qualityRatingInput = page.getByTestId('contract-quality-rating-input');
    this.communicationRatingInput = page.getByTestId('contract-communication-rating-input');
    this.professionalismRatingInput = page.getByTestId('contract-professionalism-rating-input');
    this.timelinessRatingInput = page.getByTestId('contract-timeliness-rating-input');
    this.reviewSubmitButton = page.getByTestId('contract-review-submit-btn');
    this.reviewCancelButton = page.getByTestId('contract-review-cancel-btn');

    // Delete confirmation dialog
    this.deleteConfirmDialog = page.getByTestId('contract-review-delete-confirm-dialog');
    this.deleteConfirmButton = page.getByTestId('contract-review-delete-confirm-btn');
    this.deleteCancelButton = page.getByTestId('contract-review-delete-cancel-btn');

    // Reply dialog
    this.replyDialog = page.getByTestId('contract-review-reply-dialog');
    this.replyInput = page.getByTestId('contract-review-reply-input');
    this.replySubmitButton = page.getByTestId('contract-review-reply-submit-btn');
    this.replyCancelButton = page.getByTestId('contract-review-reply-cancel-btn');
  }

  /**
   * Navigate to contract detail and select reviews tab
   */
  async goto(contractId: string) {
    await this.page.goto(`/hub/contracts/${contractId}`);
    await this.page.waitForLoadState('networkidle');
    await this.reviewsTab.click();
    await this.reviewsSection.waitFor({ state: 'visible' });
  }

  /**
   * Wait for reviews to load
   */
  async waitForLoad() {
    await this.loadingState.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
  }

  /**
   * Get review card by ID
   */
  getReviewCard(reviewId: string): Locator {
    return this.page.getByTestId(`contract-review-card-${reviewId}`);
  }

  /**
   * Get review rating in a review card
   */
  getReviewRating(reviewId: string): Locator {
    return this.getReviewCard(reviewId).getByTestId('contract-review-rating');
  }

  /**
   * Get review content in a review card
   */
  getReviewContent(reviewId: string): Locator {
    return this.getReviewCard(reviewId).getByTestId('contract-review-content');
  }

  /**
   * Get review criteria ratings
   */
  getReviewCriteria(reviewId: string): Locator {
    return this.getReviewCard(reviewId).getByTestId('contract-review-criteria');
  }

  /**
   * Get edit review button in a review card
   */
  getEditButton(reviewId: string): Locator {
    return this.getReviewCard(reviewId).getByTestId('contract-edit-review-btn');
  }

  /**
   * Get delete review button in a review card
   */
  getDeleteButton(reviewId: string): Locator {
    return this.getReviewCard(reviewId).getByTestId('contract-delete-review-btn');
  }

  /**
   * Get reply button in a review card
   */
  getReplyButton(reviewId: string): Locator {
    return this.getReviewCard(reviewId).getByTestId('contract-reply-btn');
  }

  /**
   * Get existing reply in a review card
   */
  getReply(reviewId: string): Locator {
    return this.getReviewCard(reviewId).getByTestId('contract-review-reply');
  }

  /**
   * Open write review dialog
   */
  async openWriteReviewDialog() {
    await this.writeReviewButton.click();
    await this.reviewDialog.waitFor({ state: 'visible' });
  }

  /**
   * Submit a contract review with criteria ratings
   */
  async submitReview(options: {
    overallRating: number;
    quality: number;
    communication: number;
    professionalism: number;
    timeliness: number;
    content: string;
  }) {
    await this.openWriteReviewDialog();

    // Select overall rating
    await this.selectRating(this.reviewRatingInput, options.overallRating);

    // Select criteria ratings
    await this.selectRating(this.qualityRatingInput, options.quality);
    await this.selectRating(this.communicationRatingInput, options.communication);
    await this.selectRating(this.professionalismRatingInput, options.professionalism);
    await this.selectRating(this.timelinessRatingInput, options.timeliness);

    // Fill content
    await this.reviewContentInput.fill(options.content);

    // Submit
    await this.reviewSubmitButton.click();
    await this.reviewDialog.waitFor({ state: 'hidden' });
  }

  /**
   * Select a star rating
   */
  private async selectRating(container: Locator, rating: number) {
    const star = container.locator(`[data-rating="${rating}"]`);
    await star.click();
  }

  /**
   * Edit an existing review
   */
  async editReview(reviewId: string, newContent: string) {
    await this.getEditButton(reviewId).click();
    await this.reviewDialog.waitFor({ state: 'visible' });
    await this.reviewContentInput.clear();
    await this.reviewContentInput.fill(newContent);
    await this.reviewSubmitButton.click();
    await this.reviewDialog.waitFor({ state: 'hidden' });
  }

  /**
   * Delete an existing review
   */
  async deleteReview(reviewId: string) {
    await this.getDeleteButton(reviewId).click();
    await this.deleteConfirmDialog.waitFor({ state: 'visible' });
    await this.deleteConfirmButton.click();
    await this.deleteConfirmDialog.waitFor({ state: 'hidden' });
  }

  /**
   * Reply to a review
   */
  async replyToReview(reviewId: string, content: string) {
    await this.getReplyButton(reviewId).click();
    await this.replyDialog.waitFor({ state: 'visible' });
    await this.replyInput.fill(content);
    await this.replySubmitButton.click();
    await this.replyDialog.waitFor({ state: 'hidden' });
  }
}
