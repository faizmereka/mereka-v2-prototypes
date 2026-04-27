import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TicketItemComponent } from '../ticket-item/ticket-item.component';
import { BookingDataService } from '../../../services/booking-data.service';

/**
 * TicketSelectionComponent
 *
 * Displays all available tickets for the selected slot.
 * Shows:
 * - Back button to return to slot selection
 * - Selected slot date/time info
 * - List of tickets with availability
 * - Continue button when tickets are selected
 */
@Component({
  selector: 'app-ticket-selection',
  standalone: true,
  imports: [CommonModule, TicketItemComponent],
  template: `
    <div class="ticket-selection">
      <!-- Header with Back Button -->
      <div class="flex items-center gap-3 mb-4">
        <button
          type="button"
          (click)="onBack()"
          class="flex items-center gap-1 text-sm text-neutral-600 hover:text-neutral-900 transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          <span>Back to dates</span>
        </button>
      </div>

      <!-- Selected Slot Info -->
      @if (selectedSlot()) {
        <div class="bg-neutral-50 rounded-lg p-3 mb-4">
          <div class="font-medium text-neutral-900">
            {{ formatDate(selectedSlot()!.startTime) }}
          </div>
          <div class="text-sm text-neutral-600">
            {{ formatTime(selectedSlot()!.startTime) }} - {{ formatTime(selectedSlot()!.endTime) }}
            <span class="text-neutral-400">({{ selectedSlot()!.timeZone }})</span>
          </div>
        </div>
      }

      <!-- Ticket Type Header -->
      <div class="flex items-center justify-between mb-3">
        <span class="text-sm font-medium text-neutral-700">Select tickets</span>
        @if (totalTicketCount() > 0) {
          <span class="text-sm text-primary font-medium">
            {{ totalTicketCount() }} selected
          </span>
        }
      </div>

      <!-- Tickets List -->
      <div class="space-y-3">
        @for (ticket of tickets(); track ticket.id) {
          <app-ticket-item
            [ticket]="ticket"
            [currency]="currency()" />
        }
      </div>

      <!-- Price Summary (shown when tickets selected) -->
      @if (hasSelectedTickets()) {
        <div class="mt-4 pt-4 border-t border-neutral-200">
          <!-- Ticket Subtotal -->
          <div class="flex justify-between text-sm mb-2">
            <span class="text-neutral-600">Tickets ({{ totalTicketCount() }})</span>
            <span class="text-neutral-900">{{ currency() }} {{ totalPrice() | number:'1.2-2' }}</span>
          </div>

          <!-- Service Fee -->
          @if (serviceFee() > 0) {
            <div class="flex justify-between text-sm mb-2">
              <span class="text-neutral-600">Service fee</span>
              <span class="text-neutral-900">{{ currency() }} {{ serviceFee() | number:'1.2-2' }}</span>
            </div>
          }

          <!-- Total -->
          <div class="flex justify-between font-semibold text-base pt-2 border-t border-neutral-100">
            <span class="text-neutral-900">Total</span>
            <span class="text-neutral-900">{{ currency() }} {{ grandTotal() | number:'1.2-2' }}</span>
          </div>
        </div>
      }
    </div>
  `,
})
export class TicketSelectionComponent {
  private readonly bookingData = inject(BookingDataService);

  /** Selected slot from booking data service */
  readonly selectedSlot = this.bookingData.selectedSlot;

  /** Currency from booking data service */
  readonly currency = this.bookingData.currency;

  /** Tickets from selected slot */
  readonly tickets = computed(() => this.selectedSlot()?.tickets || []);

  /** Whether any tickets are selected */
  readonly hasSelectedTickets = this.bookingData.hasSelectedTickets;

  /** Total count of selected tickets */
  readonly totalTicketCount = this.bookingData.totalTicketCount;

  /** Total price of selected tickets */
  readonly totalPrice = this.bookingData.totalPrice;

  /** Service fee */
  readonly serviceFee = this.bookingData.serviceFee;

  /** Grand total */
  readonly grandTotal = this.bookingData.grandTotal;

  /** Go back to slot selection */
  onBack(): void {
    this.bookingData.clearSlot();
  }

  /** Format date for display */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    };
    return date.toLocaleDateString('en-GB', options);
  }

  /** Format time for display */
  formatTime(dateString: string): string {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    };
    return date.toLocaleTimeString('en-US', options);
  }
}
