import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IconComponent, type IconName } from '@mereka/ui';
import { LearnerOverviewService } from '../../services/learner-overview.service';

interface RecentActivity {
  id: string;
  type: 'booking' | 'review' | 'payment';
  title: string;
  description: string;
  date: string;
}

interface SavedExperience {
  id: string;
  name: string;
  hubName: string;
  price: number;
  currency: string;
  imageUrl?: string;
}

@Component({
  selector: 'app-user-overview',
  standalone: true,
  imports: [CommonModule, RouterLink, DecimalPipe, IconComponent],
  templateUrl: './overview.component.html',
})
export class UserOverviewComponent implements OnInit {
  private readonly overviewService = inject(LearnerOverviewService);

  // Service signals
  readonly loading = this.overviewService.loading;
  readonly error = this.overviewService.error;
  readonly stats = this.overviewService.statCards;
  readonly upcomingBookings = this.overviewService.upcomingBookings;
  readonly currency = this.overviewService.currency;

  // User info from service
  readonly userName = computed(() => this.overviewService.user()?.firstName || 'there');
  readonly isEmailVerified = computed(() => this.overviewService.user()?.emailVerified ?? true);
  readonly isProfileComplete = computed(() => this.overviewService.user()?.profileComplete ?? true);

  // Local UI state
  readonly showSuccessProfileNotification = signal(false);

  // Hardcoded data - will integrate later
  readonly recentActivity = signal<RecentActivity[]>([
    {
      id: '1',
      type: 'booking',
      title: 'Booking Confirmed',
      description: 'Photography Workshop on Dec 20, 2024',
      date: 'Dec 15, 2024',
    },
    {
      id: '2',
      type: 'review',
      title: 'Review Submitted',
      description: 'You rated Art Workshop 4.5 stars',
      date: 'Dec 12, 2024',
    },
    {
      id: '3',
      type: 'payment',
      title: 'Payment Successful',
      description: 'RM 200 for Photography Workshop',
      date: 'Dec 10, 2024',
    },
    {
      id: '4',
      type: 'booking',
      title: 'Booking Completed',
      description: 'Music Production Class',
      date: 'Dec 8, 2024',
    },
  ]);

  readonly savedExperiences = signal<SavedExperience[]>([
    {
      id: '1',
      name: 'Pottery Making',
      hubName: 'Clay Studio',
      price: 150,
      currency: 'RM',
    },
    {
      id: '2',
      name: 'Dance Workshop',
      hubName: 'Rhythm Academy',
      price: 80,
      currency: 'RM',
    },
    {
      id: '3',
      name: 'Wine Tasting',
      hubName: 'The Wine Room',
      price: 200,
      currency: 'RM',
    },
  ]);

  ngOnInit(): void {
    // Load overview data on init
    void this.overviewService.loadOverview();

    // Show profile notification if profile is not complete
    // This is checked after data loads
  }

  getActivityIcon(type: string): IconName {
    switch (type) {
      case 'booking':
        return 'calendar';
      case 'review':
        return 'star';
      case 'payment':
        return 'dollar';
      default:
        return 'calendar';
    }
  }

  getActivityIconClass(type: string): string {
    switch (type) {
      case 'booking':
        return 'bg-blue-100 text-blue-600';
      case 'review':
        return 'bg-yellow-100 text-yellow-600';
      case 'payment':
        return 'bg-green-100 text-green-600';
      default:
        return 'bg-neutral-100 text-neutral-600';
    }
  }

  verifyEmail(): void {
    // TODO: Implement email verification
    console.log('Verifying email...');
  }

  refresh(): void {
    void this.overviewService.refresh();
  }
}
