import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  ExperienceApiService,
  type ExperienceEvent,
  type SessionTicketInfo,
} from '../../../../../../../onboarding/experience/services/experience-api.service';

type SessionFilter = 'upcoming' | 'past' | 'all';

interface SessionTicketDisplay {
  ticketId: string;
  ticketName: string;
  ticketType: string;
  totalCapacity: number;
  booked: number;
  held: number;
  available: number;
}

interface SessionDisplay {
  id: string;
  date: Date;
  startTime: string;
  endTime: string;
  totalSeats: number;
  bookedSeats: number;
  heldSeats: number;
  availableSeats: number;
  tickets: SessionTicketDisplay[];
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
}

@Component({
  selector: 'app-manage-experience-sessions',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sessions.component.html',
})
export class ManageExperienceSessionsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly experienceApi = inject(ExperienceApiService);

  readonly filter = signal<SessionFilter>('upcoming');
  readonly sessions = signal<SessionDisplay[]>([]);
  readonly loading = signal(false);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly totalPages = signal(0);

  private experienceId = '';

  ngOnInit(): void {
    // Get experienceId from parent route
    this.experienceId = this.route.parent?.snapshot.paramMap.get('experienceId') || '';
    this.loadSessions();
  }

  async loadSessions(): Promise<void> {
    if (!this.experienceId) return;

    this.loading.set(true);
    try {
      const response = await this.experienceApi.getSessions(this.experienceId, {
        filter: this.filter(),
        page: this.page(),
        limit: 20,
      });

      // Map API response to display format
      const displaySessions = response.sessions.map((event) => this.mapEventToSession(event));
      this.sessions.set(displaySessions);
      this.total.set(response.total);
      this.totalPages.set(response.totalPages);
    } catch (error) {
      console.error('Error loading sessions:', error);
      this.sessions.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  private mapEventToSession(event: ExperienceEvent): SessionDisplay {
    const startDate = new Date(event.startTime);
    const endDate = new Date(event.endTime);
    const now = new Date();

    // Determine status based on time and event status
    let status: SessionDisplay['status'] = 'scheduled';
    if (event.status === 'CANCELLED') {
      status = 'cancelled';
    } else if (endDate < now) {
      status = 'completed';
    } else if (startDate <= now && endDate >= now) {
      status = 'ongoing';
    }

    const totalSeats = event.maxCapacity || 0;
    const bookedSeats = event.bookingCount || 0;
    const heldSeats = event.holdCount || 0;

    // Map tickets from API response
    const tickets: SessionTicketDisplay[] = (event.tickets || []).map((t) => ({
      ticketId: t.ticketId,
      ticketName: t.ticketName,
      ticketType: t.ticketType,
      totalCapacity: t.totalCapacity,
      booked: t.booked,
      held: t.held,
      available: t.available,
    }));

    return {
      id: event._id || '',
      date: startDate,
      startTime: startDate.toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' }),
      endTime: endDate.toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' }),
      totalSeats,
      bookedSeats,
      heldSeats,
      availableSeats: Math.max(0, totalSeats - bookedSeats - heldSeats),
      tickets,
      status,
    };
  }

  setFilter(filter: SessionFilter): void {
    this.filter.set(filter);
    this.page.set(1);
    this.loadSessions();
  }

  nextPage(): void {
    if (this.page() < this.totalPages()) {
      this.page.update((p) => p + 1);
      this.loadSessions();
    }
  }

  prevPage(): void {
    if (this.page() > 1) {
      this.page.update((p) => p - 1);
      this.loadSessions();
    }
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('en-MY', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'ongoing':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-neutral-100 text-neutral-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-neutral-100 text-neutral-800';
    }
  }

  getAvailabilityClass(session: SessionDisplay): string {
    if (session.totalSeats === 0) return 'text-neutral-600';
    const percentage = (session.availableSeats / session.totalSeats) * 100;
    if (percentage === 0) return 'text-red-600';
    if (percentage <= 20) return 'text-orange-600';
    return 'text-green-600';
  }

  viewBookings(sessionId: string): void {
    // Navigate to bookings tab with eventId filter
    this.router.navigate(['../bookings'], {
      relativeTo: this.route,
      queryParams: { eventId: sessionId },
    });
  }
}
