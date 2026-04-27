import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import type { BookingDetail, BookingViewMode } from '../booking-detail.service';

@Component({
  selector: 'app-booking-info',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="bg-white rounded-xl border border-neutral-200 p-6" data-testid="booking-info">
      <!-- Status Badge -->
      <div class="mb-4">
        <span
          class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium capitalize"
          [ngClass]="getStatusClass()"
          data-testid="booking-status-badge"
        >
          {{ getStatusLabel() }}
        </span>
      </div>

      <!-- Date & Time -->
      <div class="mb-4" data-testid="booking-datetime">
        <p class="text-lg font-medium text-neutral-900">
          {{ formatDate(booking.bookingStartDate) }}
        </p>
        <p class="text-neutral-600">
          {{ formatTime(booking.bookingStartDate) }} - {{ formatTime(booking.bookingEndDate) }}
          @if (booking.timeZone) {
            <span class="text-neutral-400">({{ booking.timeZone }})</span>
          }
        </p>
      </div>

      <!-- Confirmation Code -->
      <div class="mb-4" data-testid="booking-confirmation-code">
        <p class="text-sm text-neutral-500">Confirmation Code</p>
        <p class="font-mono text-neutral-900">{{ booking.confirmationCode || booking._id }}</p>
      </div>

      <!-- Service Title -->
      <a
        [routerLink]="getServiceLink()"
        class="block mb-4 group"
        data-testid="booking-service-link"
      >
        <h2 class="text-xl font-semibold text-neutral-900 group-hover:text-primary transition-colors">
          {{ booking.serviceTitle }}
          @if (booking.hostName) {
            <span class="font-normal text-neutral-600">with {{ booking.hostName }}</span>
          }
        </h2>
        <div class="flex items-center gap-1 text-primary text-sm mt-1">
          <span>View details</span>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </div>
      </a>

      <!-- Service Meta -->
      <div class="flex flex-wrap items-center gap-4 text-sm text-neutral-600" data-testid="booking-meta">
        <!-- Service Type Badge -->
        <span
          class="inline-flex items-center px-2 py-1 rounded text-xs font-medium"
          [ngClass]="getServiceTypeBadgeClass()"
          data-testid="booking-service-type"
        >
          {{ booking.serviceType | titlecase }}
        </span>

        <!-- Location Type -->
        <span class="flex items-center gap-1" data-testid="booking-location-info">
          @if (booking.experienceType === 'Physical') {
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {{ booking.location?.city || 'Physical' }}
          } @else {
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Online
          }
        </span>

        <!-- Hub Name -->
        @if (booking.hub) {
          <a
            [routerLink]="['/hub', booking.hub.slug || booking.hub._id]"
            class="flex items-center gap-1 hover:text-primary transition-colors"
          >
            @if (booking.hub.logo) {
              <img [src]="booking.hub.logo" [alt]="booking.hub.name" class="w-5 h-5 rounded-full object-cover" />
            }
            {{ booking.hub.name }}
          </a>
        }
      </div>
    </div>
  `,
})
export class BookingInfoComponent {
  @Input({ required: true }) booking!: BookingDetail;
  @Input() mode: BookingViewMode = 'learner';

  getStatusClass(): string {
    switch (this.booking.status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-neutral-100 text-neutral-800';
    }
  }

  getStatusLabel(): string {
    if (this.booking.status === 'cancelled' && this.booking.cancelledBy) {
      return `Cancelled by ${this.booking.cancelledBy}`;
    }
    return this.booking.status;
  }

  getServiceTypeBadgeClass(): string {
    switch (this.booking.serviceType) {
      case 'experience':
        return 'bg-green-100 text-green-700';
      case 'expertise':
        return 'bg-blue-100 text-blue-700';
      case 'space':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-neutral-100 text-neutral-700';
    }
  }

  getServiceLink(): string[] {
    const type = this.booking.serviceType;
    const slug = this.booking.serviceSlug || this.booking.serviceId;

    switch (type) {
      case 'experience':
        return ['/experience', slug];
      case 'expertise':
        return ['/expertise', slug];
      case 'space':
        return ['/space', slug];
      default:
        return ['/'];
    }
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  formatTime(dateStr: string): string {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }
}
