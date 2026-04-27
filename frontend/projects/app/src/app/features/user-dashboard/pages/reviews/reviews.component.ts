import { Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import {
  ReviewService,
  ReviewListItem,
  ToReviewItem,
  ReviewWithReplyItem,
} from '../../../../shared/services/review.service';
import {
  ReviewDialogComponent,
  ReviewSubmitData,
} from '../../../../shared/components/review/review-dialog/review-dialog.component';
import { StarRatingComponent } from '../../../../shared/components/review/star-rating/star-rating.component';

type MobileTab = 'toReview' | 'pastReviews' | 'replies';

@Component({
  selector: 'app-user-reviews',
  standalone: true,
  imports: [CommonModule, DecimalPipe, DatePipe, ReviewDialogComponent, StarRatingComponent],
  templateUrl: './reviews.component.html',
})
export class UserReviewsComponent implements OnInit {
  @ViewChild(ReviewDialogComponent) reviewDialog!: ReviewDialogComponent;

  private readonly reviewService = inject(ReviewService);
  private readonly router = inject(Router);

  readonly loading = this.reviewService.loading;
  readonly activeMobileTab = signal<MobileTab>('toReview');

  // Data from service
  readonly repliesFromHubs = this.reviewService.reviewsWithReplies;
  readonly toReviews = this.reviewService.bookingsToReview;
  readonly pastReviews = this.reviewService.myReviews;

  // Dialog state
  readonly isReviewDialogOpen = signal(false);
  readonly selectedBookingId = signal<string | null>(null);
  readonly selectedServiceName = signal<string>('');

  ngOnInit(): void {
    this.loadAllData();
  }

  private async loadAllData(): Promise<void> {
    // Load all data in parallel
    await Promise.all([
      this.reviewService.loadBookingsToReview(),
      this.reviewService.loadMyReviews(),
      this.reviewService.loadReviewsWithReplies(),
    ]);
  }

  setMobileTab(tab: MobileTab): void {
    this.activeMobileTab.set(tab);
  }

  addReview(toReview: ToReviewItem): void {
    this.selectedBookingId.set(toReview.bookingId);
    this.selectedServiceName.set(toReview.serviceName);
    this.isReviewDialogOpen.set(true);
  }

  closeReviewDialog(): void {
    this.isReviewDialogOpen.set(false);
    this.selectedBookingId.set(null);
    this.selectedServiceName.set('');
  }

  async onReviewSubmit(data: ReviewSubmitData): Promise<void> {
    const bookingId = this.selectedBookingId();
    if (!bookingId) return;

    const result = await this.reviewService.createBookingReview({
      bookingId,
      rating: data.rating,
      content: data.content,
      photos: data.photos,
    });

    if (result) {
      this.reviewDialog.setSubmitting(false);
      this.closeReviewDialog();
      // Reload data
      await this.loadAllData();
    } else {
      this.reviewDialog.setSubmitting(false);
    }
  }

  viewBookingDetails(bookingId: string): void {
    this.router.navigate(['/dashboard/bookings', bookingId]);
  }

  viewServiceDetails(review: ReviewListItem | ReviewWithReplyItem): void {
    const slug = review.service.slug;
    const type = review.service.type;
    if (type === 'experience') {
      this.router.navigate(['/experiences', slug]);
    } else {
      this.router.navigate(['/expertises', slug]);
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}
