import { Component, input, inject, computed, signal, output, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { DialogService } from '@mereka/ui';
import { ExpertiseService } from '../../services/expertise.service';
import { ChatInitiationService } from '../../../../core/services/chat-initiation.service';
import type { ExpertiseTicket, AvailabilityType } from '../../models';
import type { TimeSlot } from '../expertise-time-slots/expertise-time-slots.component';
import {
  ExpertiseBookingDialogComponent,
  type BookingDialogData,
  type BookingDialogResult,
} from '../expertise-booking-dialog/expertise-booking-dialog.component';
import { environment } from '../../../../../environments/environment';

// Booking state for output
export interface BookingSelection {
  ticket: ExpertiseTicket;
  date: Date;
  timeSlot: TimeSlot;
}

@Component({
  selector: 'app-expertise-booking-widget',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './expertise-booking-widget.component.html',
})
export class ExpertiseBookingWidgetComponent {
  readonly slug = input.required<string>();
  readonly isMobile = input(false);
  readonly bookingConfirmed = output<BookingSelection>();

  readonly expertiseService = inject(ExpertiseService);
  private readonly dialogService = inject(DialogService);
  private readonly chatService = inject(ChatInitiationService);
  private readonly platformId = inject(PLATFORM_ID);

  // State
  readonly selectedTicketIndex = signal(0);
  readonly selectedDate = signal<Date | null>(null);
  readonly selectedTimeSlot = signal<TimeSlot | null>(null);
  readonly startingChat = signal(false);

  // Computed values
  readonly tickets = computed<ExpertiseTicket[]>(() => {
    return this.expertiseService.expertise()?.ticket || [];
  });

  readonly hasTickets = computed(() => this.tickets().length > 0);

  readonly selectedTicket = computed(() => {
    const index = this.selectedTicketIndex();
    return this.tickets()[index] || null;
  });

  readonly priceDisplay = computed(() => {
    const ticket = this.selectedTicket();
    if (!ticket) return 'Contact for pricing';
    if (ticket.ticketType === 'Free') return 'Free';
    return `RM ${ticket.standardRate}`;
  });

  readonly durationDisplay = computed(() => {
    const ticket = this.selectedTicket();
    if (!ticket || !ticket.sessionDuration) return '';
    return this.expertiseService.formatDuration(ticket.sessionDuration, ticket.durationUnit);
  });

  readonly availabilityType = computed<AvailabilityType>(() => {
    return this.expertiseService.expertise()?.availabilityType || 'manual';
  });

  readonly operatingHours = computed(() => {
    return this.expertiseService.expertise()?.operatingHours || null;
  });

  readonly isFlexibleOrAutofill = computed(() => {
    const type = this.availabilityType();
    return type === 'flexible' || type === 'autofill';
  });

  readonly hasSelection = computed(() => {
    return this.selectedDate() !== null && this.selectedTimeSlot() !== null;
  });

  readonly bookingLabel = computed(() => {
    const type = this.availabilityType();
    if (type === 'manual') return 'Request Booking';
    if (this.hasSelection()) return 'Confirm Booking';
    return 'Select Date & Time';
  });

  readonly selectedDateDisplay = computed(() => {
    const date = this.selectedDate();
    if (!date) return '';
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  });

  readonly selectedTimeDisplay = computed(() => {
    const slot = this.selectedTimeSlot();
    if (!slot) return '';
    return `${slot.label} - ${slot.endLabel}`;
  });

  selectTicket(index: number): void {
    this.selectedTicketIndex.set(index);
    // Reset date/time when ticket changes
    this.selectedDate.set(null);
    this.selectedTimeSlot.set(null);
  }

  openDateTimePicker(): void {
    const ticket = this.selectedTicket();
    if (!ticket) return;

    const dialogData: BookingDialogData = {
      ticket,
      operatingHours: this.operatingHours(),
      slug: this.slug(),
    };

    const dialogRef = this.dialogService.open<
      ExpertiseBookingDialogComponent,
      BookingDialogData,
      BookingDialogResult
    >(ExpertiseBookingDialogComponent, {
      data: dialogData,
      width: 'md',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.selectedDate.set(result.date);
        this.selectedTimeSlot.set(result.timeSlot);
      }
    });
  }

  clearSelection(): void {
    this.selectedDate.set(null);
    this.selectedTimeSlot.set(null);
  }

  onBook(): void {
    const ticket = this.selectedTicket();
    const slug = this.slug();
    if (!ticket) return;

    const type = this.availabilityType();

    if (type === 'manual') {
      // For manual, just output booking request
      console.log('Manual booking request for:', ticket);
      // TODO: Open contact form or navigate to booking request page
      return;
    }

    // For flexible/autofill, require date and time
    const date = this.selectedDate();
    const timeSlot = this.selectedTimeSlot();

    if (!date || !timeSlot) {
      // Open dialog to select date/time
      this.openDateTimePicker();
      return;
    }

    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // Build checkout URL with query params
    // Format: /expertise/{slug}?ticket={ticketId}&date={YYYY-MM-DD}&time={HH:mm}
    // Use local date (not UTC) to avoid timezone conversion issues
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const timeStr = timeSlot.time; // HH:mm format

    const checkoutUrl = `${environment.appUrls.checkout}/expertise/${slug}?ticket=${ticket.id}&date=${dateStr}&time=${timeStr}`;

    // Navigate to checkout app
    window.location.href = checkoutUrl;

    // Also emit for any parent component listeners
    this.bookingConfirmed.emit({ ticket, date, timeSlot });
  }

  /**
   * Ask a question about this expertise
   * Opens chat with the hub, with this expertise as context
   */
  async askQuestion(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const expertise = this.expertiseService.expertise();
    if (!expertise?.hub?._id) {
      console.error('No expertise or hub available');
      return;
    }

    this.startingChat.set(true);
    try {
      await this.chatService.initiateChat({
        hubId: expertise.hub._id,
        contextType: 'EXPERTISE',
        contextId: expertise._id,
      });
    } catch (error) {
      console.error('Failed to start chat:', error);
    } finally {
      this.startingChat.set(false);
    }
  }
}
