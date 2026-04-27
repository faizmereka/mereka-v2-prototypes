import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Review {
  id: string;
  learnerName: string;
  learnerPhoto: string;
  rating: number;
  comment: string;
  date: Date;
}

@Component({
  selector: 'app-manage-experience-analytics',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './analytics.component.html',
})
export class ManageExperienceAnalyticsComponent {
  readonly reviews = signal<Review[]>([]);
  readonly averageRating = signal(0);
  readonly totalReviews = signal(0);

  getRatingStars(rating: number): number[] {
    return Array.from({ length: 5 }, (_, i) => (i < rating ? 1 : 0));
  }
}
