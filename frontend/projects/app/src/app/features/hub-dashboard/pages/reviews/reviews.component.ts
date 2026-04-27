import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IconComponent } from '@mereka/ui';
import {
  HubReviewService,
  HubBookingReview,
  HubContractReview,
  ReviewStats,
} from '../../services/hub-review.service';

@Component({
  selector: 'app-hub-reviews',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, IconComponent],
  templateUrl: './reviews.component.html',
})
export class HubReviewsComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly hubReviewService = inject(HubReviewService);

  readonly loading = this.hubReviewService.loading;
  readonly stats = this.hubReviewService.stats;
  readonly reviews = this.hubReviewService.reviews;
  readonly contractReviews = this.hubReviewService.contractReviews;
  readonly pagination = this.hubReviewService.pagination;

  readonly selectedService = signal<'experience' | 'expertise'>('experience');
  readonly selectedFilter = signal<'all' | 'notReplied' | 'replied'>('all');
  readonly selectedCategory = signal(0);
  readonly currentPage = signal(1);
  readonly recordsPerPage = 20;

  readonly selectedRecord = signal<string | null>(null);
  readonly showPaging = signal(true);

  // Review type tab: booking or contract
  readonly reviewTab = signal<'booking' | 'contract'>('booking');

  // Reply form state
  readonly replyingToReviewId = signal<string | null>(null);
  readonly editingReplyId = signal<string | null>(null);
  readonly replyContent = signal('');
  readonly replySubmitting = signal(false);

  // Computed signals from stats
  readonly totalRating = computed(() => this.stats().averageRating);
  readonly totalReviews = computed(() => this.stats().totalReviews);
  readonly starsCount = computed(() => {
    const dist = this.stats().ratingDistribution;
    return {
      FiveStar: dist[5] || 0,
      FourStar: dist[4] || 0,
      ThreeStar: dist[3] || 0,
      TwoStar: dist[2] || 0,
      OneStar: dist[1] || 0,
    };
  });

  readonly serviceRating = computed(() => {
    const reviewList = this.filteredReviews();
    if (reviewList.length === 0) return 0;
    const ratings = reviewList.map(r => r.rating || 0);
    const sum = ratings.reduce((a, b) => a + b, 0);
    return Math.round((sum / ratings.length) * 10) / 10;
  });

  readonly filteredReviews = computed(() => {
    const reviewsData = this.reviews();
    // Ensure we have an array
    let reviews: HubBookingReview[] = Array.isArray(reviewsData) ? reviewsData as HubBookingReview[] : [];

    // Filter by service type
    const serviceType = this.selectedService();
    reviews = reviews.filter(r => r.serviceType === serviceType);

    // Filter by rating category
    const category = this.selectedCategory();
    if (category > 0) {
      reviews = reviews.filter(r => r.rating === category);
    }

    // Filter by specific service
    const selectedId = this.selectedRecord();
    if (selectedId) {
      reviews = reviews.filter(r => r.serviceId === selectedId);
    }

    // Filter by reply status
    const replyFilter = this.selectedFilter();
    if (replyFilter === 'replied') {
      reviews = reviews.filter(r => !!r.hubReply);
    } else if (replyFilter === 'notReplied') {
      reviews = reviews.filter(r => !r.hubReply);
    }

    return reviews;
  });

  readonly paginatedReviews = computed(() => {
    const reviews = this.filteredReviews();
    const page = this.currentPage();
    const start = (page - 1) * this.recordsPerPage;
    const end = start + this.recordsPerPage;
    return reviews.slice(start, end);
  });

  readonly totalPages = computed(() => {
    return Math.ceil(this.filteredReviews().length / this.recordsPerPage);
  });

  ngOnInit(): void {
    this.loadData();
  }

  async loadData(): Promise<void> {
    await Promise.all([
      this.hubReviewService.loadHubReviews(),
      this.hubReviewService.loadStats(),
    ]);
  }

  goToDashboard(): void {
    this.router.navigate(['/hub/overview']);
  }

  selectedTab(type: 'experience' | 'expertise'): void {
    this.selectedService.set(type);
    this.hubReviewService.setServiceType(type);
    this.selectedRecord.set(null);
    this.selectedCategory.set(0);
    this.currentPage.set(1);
  }

  filter(filterType: 'all' | 'notReplied' | 'replied'): void {
    this.selectedFilter.set(filterType);
    this.hubReviewService.setReplyFilter(filterType);
    this.currentPage.set(1);
  }

  changeCategory(rating: number): void {
    this.selectedCategory.set(rating);
    this.selectedRecord.set(null);
    this.showPaging.set(true);
    this.currentPage.set(1);
  }

  handlePagination(page: number): void {
    this.currentPage.set(page);
  }

  openSelectReviewDialog(): void {
    // TODO: Implement share review link dialog
  }

  showExperience(experience: { _id: string } | null): void {
    if (experience) {
      this.selectedRecord.set(experience._id);
      this.showPaging.set(false);
      this.selectedCategory.set(0);
    } else {
      this.selectedRecord.set(null);
      this.showPaging.set(true);
    }
    this.currentPage.set(1);
  }

  showExpertise(expertise: { _id: string } | null): void {
    if (expertise) {
      this.selectedRecord.set(expertise._id);
      this.showPaging.set(false);
      this.selectedCategory.set(0);
    } else {
      this.selectedRecord.set(null);
      this.showPaging.set(true);
    }
    this.currentPage.set(1);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  // Review tab switching
  switchReviewTab(tab: 'booking' | 'contract'): void {
    this.reviewTab.set(tab);
    this.currentPage.set(1);
    if (tab === 'contract') {
      this.loadContractReviews();
    }
  }

  async loadContractReviews(): Promise<void> {
    await this.hubReviewService.getHubContractReviews();
  }

  // Reply methods
  startReply(reviewId: string): void {
    this.replyingToReviewId.set(reviewId);
    this.editingReplyId.set(null);
    this.replyContent.set('');
  }

  startEditReply(review: HubBookingReview): void {
    this.editingReplyId.set(review._id);
    this.replyingToReviewId.set(null);
    this.replyContent.set(review.hubReply?.content || '');
  }

  cancelReply(): void {
    this.replyingToReviewId.set(null);
    this.editingReplyId.set(null);
    this.replyContent.set('');
  }

  async submitReply(review: HubBookingReview): Promise<void> {
    const content = this.replyContent().trim();
    if (!content || this.replySubmitting()) return;

    this.replySubmitting.set(true);

    try {
      if (this.editingReplyId()) {
        await this.hubReviewService.updateHubReply(review.bookingId, content);
      } else {
        await this.hubReviewService.addHubReply(review.bookingId, content);
      }
      this.cancelReply();
    } catch (error) {
      console.error('Failed to submit reply:', error);
    } finally {
      this.replySubmitting.set(false);
    }
  }

  async deleteReply(review: HubBookingReview): Promise<void> {
    if (!confirm('Are you sure you want to delete this reply?')) return;

    try {
      await this.hubReviewService.deleteHubReply(review.bookingId);
    } catch (error) {
      console.error('Failed to delete reply:', error);
    }
  }

  // Helper to check if reply form is open for a review
  isReplyFormOpen(reviewId: string): boolean {
    return this.replyingToReviewId() === reviewId || this.editingReplyId() === reviewId;
  }
}

