import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { BookingDetail } from '../booking-detail.service';

@Component({
  selector: 'app-booking-guests',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-xl border border-neutral-200 p-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-neutral-900">
          {{ booking.serviceType === 'expertise' ? 'Package Details' : 'Guests & Tickets' }}
        </h3>
      </div>

      <!-- Ticket/Package List -->
      <div class="space-y-4" data-testid="booking-ticket-list">
        @for (ticket of booking.selectedTickets; track $index) {
          <div
            class="border border-neutral-200 rounded-lg p-4"
            [attr.data-testid]="'booking-ticket-item-' + $index"
          >
            <div class="flex items-center justify-between mb-2">
              <div class="font-medium text-neutral-900">
                @if (booking.serviceType !== 'expertise') {
                  {{ ticket.quantity }} x {{ ticket.ticketName }}
                } @else {
                  {{ ticket.ticketName }}
                }
              </div>
              <div class="text-neutral-700">
                {{ formatCurrency(ticket.totalPrice) }}
              </div>
            </div>

            @if (ticket.sessionDuration && booking.serviceType === 'expertise') {
              <div class="flex items-center gap-1 text-sm text-neutral-500 mb-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {{ ticket.sessionDuration }}
              </div>
            }

            <!-- Guest Details -->
            @if (ticket.guests && ticket.guests.length > 0) {
              <div class="mt-3 space-y-2">
                @for (guest of ticket.guests; track $index) {
                  <div
                    class="flex items-center gap-3 text-sm text-neutral-600 bg-neutral-50 rounded-lg p-3"
                    [attr.data-testid]="'booking-guest-item-' + $index"
                  >
                    <div class="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-600 font-medium">
                      {{ getInitials(guest.name) }}
                    </div>
                    <div>
                      <p class="font-medium text-neutral-900">{{ guest.name }}</p>
                      <p class="text-neutral-500">{{ guest.email }}</p>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        }
      </div>

      <!-- Booked By Section -->
      <div class="mt-6 pt-6 border-t border-neutral-200" data-testid="booked-by">
        <h4 class="text-sm font-semibold text-neutral-500 uppercase mb-3">Booked by</h4>
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
            {{ getInitials(booking.bookerName) }}
          </div>
          <div>
            <p class="font-medium text-neutral-900">{{ booking.bookerName }}</p>
            <p class="text-sm text-neutral-500">{{ booking.bookerEmail }}</p>
            @if (booking.phoneNumber) {
              <p class="text-sm text-neutral-500">{{ booking.phoneNumber }}</p>
            }
          </div>
        </div>
      </div>
    </div>
  `,
})
export class BookingGuestsComponent {
  @Input({ required: true }) booking!: BookingDetail;

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  formatCurrency(amount: number): string {
    return `${this.booking.currency} ${amount.toFixed(2)}`;
  }
}
