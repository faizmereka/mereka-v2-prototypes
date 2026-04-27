import { Component, signal, computed, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DecimalPipe, DatePipe } from '@angular/common';
import { CardComponent, ToastService } from '../../shared/ui';
import { DialogService } from '../../shared/dialog/dialog.service';
import {
  AdminReviewService,
  type AdminReview,
  type ReviewType,
  type ReviewStatus,
  type ReviewFilters,
} from './reviews.service';
import { ReviewDetailDialogComponent } from './review-detail-dialog.component';

type TabType = 'all' | 'booking' | 'contract';

interface ReviewDialogResult {
  action?: 'hide' | 'unhide' | 'delete';
  reason?: string;
}

@Component({
  selector: 'app-reviews',
  imports: [RouterLink, FormsModule, DecimalPipe, DatePipe, CardComponent],
  templateUrl: './reviews.component.html',
  styleUrl: './reviews.component.scss',
})
export class ReviewsComponent implements OnInit {
  private readonly reviewService = inject(AdminReviewService);
  private readonly toast = inject(ToastService);
  private readonly dialogService = inject(DialogService);

  // Local state
  searchQuery = '';
  showFilters = signal(false);
  selectedRating = signal<number | null>(null);
  selectedStatus = signal<'all' | ReviewStatus>('all');
  dateFrom = signal<string | null>(null);
  dateTo = signal<string | null>(null);

  // Expose service signals
  readonly reviews = this.reviewService.reviews;
  readonly pagination = this.reviewService.pagination;
  readonly stats = this.reviewService.stats;
  readonly loading = this.reviewService.loading;
  readonly error = this.reviewService.error;
  readonly filters = this.reviewService.filters;

  // Tabs
  readonly tabs = computed(() => {
    const s = this.stats();
    return [
      { label: 'All Reviews', value: 'all' as TabType, count: s.totals.totalReviews },
      { label: 'Booking Reviews', value: 'booking' as TabType, count: s.totals.bookingReviews },
      { label: 'Contract Reviews', value: 'contract' as TabType, count: s.totals.contractReviews },
    ];
  });

  readonly activeTab = computed(() => this.filters().type);

  // Status options
  readonly statusOptions = computed(() => {
    const s = this.stats();
    return [
      { label: 'All Status', value: 'all' as const, count: s.byStatus.active + s.byStatus.hidden + s.byStatus.deleted },
      { label: 'Active', value: 'active' as ReviewStatus, count: s.byStatus.active },
      { label: 'Hidden', value: 'hidden' as ReviewStatus, count: s.byStatus.hidden },
      { label: 'Deleted', value: 'deleted' as ReviewStatus, count: s.byStatus.deleted },
    ];
  });

  // Rating options
  readonly ratingOptions = [
    { label: 'All Ratings', value: null },
    { label: '5 Stars', value: 5 },
    { label: '4 Stars', value: 4 },
    { label: '3 Stars', value: 3 },
    { label: '2 Stars', value: 2 },
    { label: '1 Star', value: 1 },
  ];

  // Pagination computed
  readonly currentPage = computed(() => this.pagination().page);
  readonly totalPages = computed(() => this.pagination().totalPages);
  readonly totalItems = computed(() => this.pagination().total);
  readonly pageStart = computed(() => {
    const p = this.pagination();
    return (p.page - 1) * p.limit + 1;
  });
  readonly pageEnd = computed(() => {
    const p = this.pagination();
    return Math.min(p.page * p.limit, p.total);
  });

  ngOnInit(): void {
    this.loadStats();
    this.loadReviews();
  }

  async loadStats(): Promise<void> {
    try {
      await this.reviewService.loadStats();
    } catch {
      this.toast.error('Failed to load review statistics');
    }
  }

  async loadReviews(): Promise<void> {
    try {
      await this.reviewService.loadReviews();
    } catch {
      this.toast.error('Failed to load reviews');
    }
  }

  setTab(type: TabType): void {
    this.reviewService.setTab(type);
    this.loadReviews();
  }

  setStatus(status: 'all' | ReviewStatus): void {
    this.selectedStatus.set(status);
    this.reviewService.updateFilters({ status });
    this.loadReviews();
  }

  setRating(rating: number | null): void {
    this.selectedRating.set(rating);
    this.reviewService.updateFilters({ rating });
    this.loadReviews();
  }

  onSearch(): void {
    this.reviewService.updateFilters({ search: this.searchQuery });
    this.loadReviews();
  }

  goToPage(page: number): void {
    this.reviewService.goToPage(page);
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.selectedStatus.set('all');
    this.selectedRating.set(null);
    this.dateFrom.set(null);
    this.dateTo.set(null);
    this.reviewService.resetFilters();
    this.showFilters.set(false);
    this.loadReviews();
  }

  applyFilters(): void {
    this.reviewService.updateFilters({
      status: this.selectedStatus() === 'all' ? 'all' : this.selectedStatus(),
      rating: this.selectedRating(),
      dateFrom: this.dateFrom(),
      dateTo: this.dateTo(),
    });
    this.showFilters.set(false);
    this.loadReviews();
  }

  viewReview(review: AdminReview): void {
    const dialogRef = this.dialogService.open<ReviewDetailDialogComponent, { review: AdminReview }, ReviewDialogResult>(
      ReviewDetailDialogComponent,
      {
        data: { review },
        width: 'lg',
      }
    );

    dialogRef.afterClosed().subscribe((result: ReviewDialogResult | undefined) => {
      if (result?.action) {
        this.handleModeration(review._id, result.action, result.reason);
      }
    });
  }

  async handleModeration(reviewId: string, action: 'hide' | 'unhide' | 'delete', reason?: string): Promise<void> {
    const success = await this.reviewService.moderateReview(reviewId, { action, reason });
    if (success) {
      this.toast.success(`Review ${action === 'hide' ? 'hidden' : action === 'unhide' ? 'restored' : 'deleted'} successfully`);
      await this.loadStats();
    } else {
      this.toast.error(`Failed to ${action} review`);
    }
  }

  async quickHide(review: AdminReview, event: Event): Promise<void> {
    event.stopPropagation();
    const confirmed = await this.dialogService.confirm({
      title: 'Hide Review',
      message: `Are you sure you want to hide this review? It will no longer be visible to users.`,
      confirmText: 'Hide',
      type: 'warning',
    });

    if (confirmed) {
      await this.handleModeration(review._id, 'hide');
    }
  }

  async quickUnhide(review: AdminReview, event: Event): Promise<void> {
    event.stopPropagation();
    await this.handleModeration(review._id, 'unhide');
  }

  async quickDelete(review: AdminReview, event: Event): Promise<void> {
    event.stopPropagation();
    const confirmed = await this.dialogService.confirm({
      title: 'Delete Review',
      message: `Are you sure you want to permanently delete this review? This action cannot be undone.`,
      confirmText: 'Delete',
      type: 'danger',
    });

    if (confirmed) {
      await this.handleModeration(review._id, 'delete');
    }
  }

  // Helper methods
  getStatusClass(status: ReviewStatus): string {
    return this.reviewService.getStatusBadgeClass(status);
  }

  getRatingLabel(rating: number): string {
    return this.reviewService.getRatingLabel(rating);
  }

  getReviewTypeLabel(type: ReviewType): string {
    return type === 'booking' ? 'Booking' : 'Contract';
  }

  getReviewTypeClass(type: ReviewType): string {
    return type === 'booking' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700';
  }

  getTabCountClass(tabValue: string): string {
    const classes: Record<string, string> = {
      all: 'bg-gray-600 text-white',
      booking: 'bg-blue-600 text-white',
      contract: 'bg-purple-600 text-white',
    };
    return classes[tabValue] || 'bg-primary text-white';
  }

  truncateContent(content: string, length = 100): string {
    if (content.length <= length) return content;
    return content.substring(0, length) + '...';
  }

  formatStars(rating: number): string {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  }

  getRatingCount(rating: 1 | 2 | 3 | 4 | 5): number {
    return this.stats().ratingDistribution[rating];
  }

  getRatingPercentage(rating: 1 | 2 | 3 | 4 | 5): number {
    const total = this.stats().totals.totalReviews;
    if (total === 0) return 0;
    return (this.stats().ratingDistribution[rating] / total) * 100;
  }
}
