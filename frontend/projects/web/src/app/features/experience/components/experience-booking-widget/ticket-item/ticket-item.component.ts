import { Component, input, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuantityStepperComponent } from '../../../../../shared/components/quantity-stepper/quantity-stepper.component';
import { BookingDataService } from '../../../services/booking-data.service';
import { TicketStatus } from '../../../models/experience.model';
import type { ExperienceSlotTicket } from '../../../models/experience.model';

/**
 * TicketItemComponent
 *
 * Displays a single ticket type with:
 * - Ticket name and price
 * - Availability status (Available, Selling Fast, Sold Out, Sales Ended)
 * - Quantity stepper for selection
 * - Description (if available)
 */
@Component({
  selector: 'app-ticket-item',
  standalone: true,
  imports: [CommonModule, QuantityStepperComponent],
  template: `
    <div
      class="p-4 border rounded-lg transition-colors"
      [class.border-neutral-200]="!isSelected()"
      [class.border-primary]="isSelected()"
      [class.bg-primary/5]="isSelected()"
      [class.opacity-60]="!isPurchasable()">
      <div class="flex items-start justify-between gap-4">
        <!-- Left: Ticket Info -->
        <div class="flex-1 min-w-0">
          <!-- Status Badge -->
          @if (statusBadge()) {
            <span
              class="inline-block px-2 py-0.5 text-xs font-medium rounded-full mb-2"
              [class.bg-green-100]="status() === TicketStatus.AVAILABLE"
              [class.text-green-700]="status() === TicketStatus.AVAILABLE"
              [class.bg-orange-100]="status() === TicketStatus.SELLING_FAST"
              [class.text-orange-700]="status() === TicketStatus.SELLING_FAST"
              [class.bg-red-100]="status() === TicketStatus.SOLD_OUT || status() === TicketStatus.SALES_ENDED"
              [class.text-red-700]="status() === TicketStatus.SOLD_OUT || status() === TicketStatus.SALES_ENDED">
              {{ statusBadge() }}
            </span>
          }

          <!-- Ticket Name -->
          <h4 class="font-medium text-neutral-900 truncate">
            {{ ticket().name }}
          </h4>

          <!-- Price -->
          <div class="text-sm mt-1">
            @if (ticket().price > 0) {
              <span class="font-semibold text-neutral-900">
                {{ currency() }} {{ ticket().price | number:'1.0-2' }}
              </span>
            } @else {
              <span class="font-semibold text-green-600">Free</span>
            }
          </div>

          <!-- Description -->
          @if (ticket().description) {
            <p class="text-xs text-neutral-500 mt-2 line-clamp-2">
              {{ ticket().description }}
            </p>
          }

          <!-- Availability Info -->
          @if (isPurchasable()) {
            <p class="text-xs mt-2"
               [class.text-orange-600]="ticket().availableQuantity < 10"
               [class.text-neutral-500]="ticket().availableQuantity >= 10">
              @if (ticket().availableQuantity < 10) {
                Only {{ ticket().availableQuantity }} left
              } @else {
                {{ ticket().availableQuantity }} seats available
              }
            </p>
          }
        </div>

        <!-- Right: Quantity Stepper -->
        <div class="flex-shrink-0">
          @if (isPurchasable()) {
            <app-quantity-stepper
              [value]="currentQuantity()"
              [min]="0"
              [max]="ticket().availableQuantity"
              (valueChange)="onQuantityChange($event)" />
          } @else {
            <span class="text-sm text-neutral-400 italic">
              {{ status() === TicketStatus.SOLD_OUT ? 'Sold out' : 'Unavailable' }}
            </span>
          }
        </div>
      </div>
    </div>
  `,
})
export class TicketItemComponent {
  private readonly bookingData = inject(BookingDataService);

  /** The ticket to display */
  readonly ticket = input.required<ExperienceSlotTicket>();

  /** Currency for display */
  readonly currency = input<string>('MYR');

  /** Reference to TicketStatus enum for template */
  readonly TicketStatus = TicketStatus;

  /** Computed ticket status */
  readonly status = computed(() => this.bookingData.getTicketStatus(this.ticket()));

  /** Status badge text (only show for non-available statuses or selling fast) */
  readonly statusBadge = computed(() => {
    const s = this.status();
    if (s === TicketStatus.AVAILABLE) return null; // Don't show badge for available
    return s;
  });

  /** Whether the ticket can be purchased */
  readonly isPurchasable = computed(() =>
    this.bookingData.isTicketPurchasable(this.ticket())
  );

  /** Current selected quantity for this ticket */
  readonly currentQuantity = computed(() =>
    this.bookingData.getTicketQuantity(this.ticket().id)
  );

  /** Whether this ticket has any quantity selected */
  readonly isSelected = computed(() => this.currentQuantity() > 0);

  /** Handle quantity change from stepper */
  onQuantityChange(quantity: number): void {
    this.bookingData.updateTicketQuantity(this.ticket(), quantity);
  }
}
