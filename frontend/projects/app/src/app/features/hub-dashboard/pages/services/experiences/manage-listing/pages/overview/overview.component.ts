import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  ExperienceApiService,
  type Experience,
  type ExperienceEvent,
  type ExperienceBooking,
} from '../../../../../../../onboarding/experience/services/experience-api.service';

@Component({
  selector: 'app-manage-experience-overview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './overview.component.html',
})
export class ManageExperienceOverviewComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly experienceApi = inject(ExperienceApiService);

  readonly loading = signal(true);
  readonly experience = signal<Experience | null>(null);
  readonly upcomingSessions = signal<ExperienceEvent[]>([]);
  readonly recentBookings = signal<ExperienceBooking[]>([]);

  private experienceId = '';

  async ngOnInit(): Promise<void> {
    this.experienceId = this.route.parent?.snapshot.paramMap.get('experienceId') || '';
    if (this.experienceId) {
      await this.loadData();
    }
    this.loading.set(false);
  }

  private async loadData(): Promise<void> {
    try {
      // Load experience (includes upcomingEvents and stats)
      const exp = await this.experienceApi.getById(this.experienceId);
      this.experience.set(exp);

      if (exp?.upcomingEvents) {
        this.upcomingSessions.set(exp.upcomingEvents);
      }

      // Load recent bookings (limit to 5)
      const bookingsResponse = await this.experienceApi.getBookings(this.experienceId, {
        status: 'all',
        page: 1,
        limit: 5,
      });
      this.recentBookings.set(bookingsResponse.bookings);
    } catch (error) {
      console.error('Error loading overview data:', error);
    }
  }

  formatDate(date: string | Date): string {
    return new Date(date).toLocaleDateString('en-MY', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }

  formatTime(date: string | Date): string {
    return new Date(date).toLocaleTimeString('en-MY', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatAmount(amount: number, currency: string, isFree: boolean): string {
    if (isFree || amount === 0) return 'Free';
    return `${currency} ${amount.toFixed(2)}`;
  }

  getStatusClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'active':
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
      case 'withdrawn':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-neutral-100 text-neutral-800';
    }
  }

  goToSessions(): void {
    this.router.navigate(['../sessions'], { relativeTo: this.route });
  }

  goToBookings(): void {
    this.router.navigate(['../bookings'], { relativeTo: this.route });
  }

  viewSessionBookings(eventId: string): void {
    this.router.navigate(['../bookings'], {
      relativeTo: this.route,
      queryParams: { eventId },
    });
  }
}
