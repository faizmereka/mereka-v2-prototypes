import {
  Component,
  input,
  computed,
  inject,
  effect,
  signal,
  OnDestroy,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ExperienceService } from '../../services/experience.service';
import { BookingDataService } from '../../services/booking-data.service';
import { ChatInitiationService } from '../../../../core/services/chat-initiation.service';
import { TicketSelectionComponent } from './ticket-selection/ticket-selection.component';
import type { ExperienceSlot } from '../../models/experience.model';
import { environment } from '../../../../../environments/environment';

/**
 * ExperienceBookingWidgetComponent
 *
 * Main booking widget for experience detail page.
 * Handles:
 * - Loading slots with ticket availability from API
 * - Slot selection
 * - Ticket selection (via TicketSelectionComponent)
 * - Price display and "Book" action
 */
@Component({
  selector: 'app-experience-booking-widget',
  standalone: true,
  imports: [CommonModule, TicketSelectionComponent],
  templateUrl: './experience-booking-widget.component.html',
})
export class ExperienceBookingWidgetComponent implements OnDestroy {
  private readonly experienceService = inject(ExperienceService);
  private readonly chatService = inject(ChatInitiationService);
  private readonly platformId = inject(PLATFORM_ID);
  readonly bookingData = inject(BookingDataService);

  /** Experience slug (required) */
  readonly slug = input.required<string>();

  /** Mobile mode flag */
  readonly isMobile = input<boolean>(false);

  /** Loading state from booking data service */
  readonly loading = this.bookingData.loading;

  /** Slots from booking data service */
  readonly slots = this.bookingData.slots;

  /** Whether a slot is selected */
  readonly isSlotSelected = this.bookingData.isSlotSelected;

  /** Selected slot */
  readonly selectedSlot = this.bookingData.selectedSlot;

  /** Currency */
  readonly currency = this.bookingData.currency;

  /** Min price */
  readonly minPrice = this.bookingData.minPrice;

  /** Whether there are any slots */
  readonly hasSlots = computed(() => this.slots().length > 0);

  /** Mobile modal visibility */
  readonly showMobileModal = signal(false);

  /** Number of ticket types */
  readonly ticketTypesCount = computed(() => {
    const slot = this.slots()[0];
    return slot?.tickets.length || 0;
  });

  /** Whether tickets are selected (for Continue button) */
  readonly hasSelectedTickets = this.bookingData.hasSelectedTickets;

  /** Grand total for display */
  readonly grandTotal = this.bookingData.grandTotal;

  /** State for chat initiation loading */
  readonly startingChat = signal(false);

  constructor() {
    // Load slots when slug changes and we're in browser
    effect(() => {
      const slug = this.slug();
      if (slug && isPlatformBrowser(this.platformId)) {
        // Use service to check if we should load (prevents duplicate calls across instances)
        if (this.bookingData.shouldLoadSlots(slug)) {
          this.loadSlots(slug);
        }
      }
    });
  }

  ngOnDestroy(): void {
    // Restore body scroll if modal was open
    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = '';
    }
  }

  /**
   * Load slots from API
   */
  private async loadSlots(slug: string): Promise<void> {
    this.bookingData.setLoading(true);

    try {
      const response = await this.experienceService.getExperienceSlots(slug);

      if (response) {
        this.bookingData.setSlots(
          response.slots,
          response.currency,
          response.minPrice,
          response.isHubPayingFee
        );
      }
    } catch (error) {
      console.error('Error loading slots:', error);
    } finally {
      this.bookingData.setLoading(false);
    }
  }

  /**
   * Select a slot and show ticket selection
   */
  selectSlot(slot: ExperienceSlot): void {
    this.bookingData.selectSlot(slot);
  }

  /**
   * View more dates (calendar modal - TODO)
   */
  onViewMoreDates(): void {
    // TODO: Implement calendar modal for date filtering
    console.log('View more dates - TODO');
  }

  /**
   * Open mobile booking modal
   */
  openMobileModal(): void {
    this.showMobileModal.set(true);
    // Prevent body scroll when modal is open
    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = 'hidden';
    }
  }

  /**
   * Close mobile booking modal
   */
  closeMobileModal(): void {
    this.showMobileModal.set(false);
    // Restore body scroll
    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = '';
    }
  }

  /**
   * Proceed to checkout
   */
  onBook(): void {
    const selectedSlot = this.selectedSlot();
    const selectedTickets = this.bookingData.selectedTickets();
    const slug = this.slug();

    if (!selectedSlot || selectedTickets.length === 0) {
      console.warn('Cannot book: no slot or tickets selected');
      return;
    }

    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // Build checkout URL with query params
    // Format: /experience/{slug}?slot={slotId}&tickets={base64EncodedTickets}
    const ticketsPayload = selectedTickets.map((t) => ({
      id: t.id,
      qty: t.quantity,
    }));
    const ticketsParam = btoa(JSON.stringify(ticketsPayload));

    const checkoutUrl = `${environment.appUrls.checkout}/experience/${slug}?slot=${selectedSlot.id}&tickets=${encodeURIComponent(ticketsParam)}`;

    // Navigate to checkout app
    window.location.href = checkoutUrl;
  }

  /**
   * Format date for slot display
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    };
    return date.toLocaleDateString('en-GB', options);
  }

  /**
   * Format time for slot display
   */
  formatTime(dateString: string): string {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    };
    return date.toLocaleTimeString('en-US', options);
  }

  /**
   * Get slot status text
   */
  getSlotStatus(slot: ExperienceSlot): string | null {
    if (slot.totalAvailableQuantity === 0) {
      return 'Sold out';
    }

    // Check if all tickets have passed their cutoff time (sales ended)
    const now = new Date();
    const allSalesEnded = slot.tickets.every((t) => {
      if (t.ticketSalePeriodEndTime) {
        return new Date(t.ticketSalePeriodEndTime) < now;
      }
      return false;
    });
    if (allSalesEnded && slot.tickets.length > 0) {
      return 'Sales ended';
    }

    // Calculate if selling fast (less than 50% of any ticket's max)
    const isSellingFast = slot.tickets.some(
      (t) => t.maximumQuantity > 0 && t.availableQuantity < t.maximumQuantity / 2
    );
    if (isSellingFast) {
      return 'Selling fast!';
    }
    return null;
  }

  /**
   * Check if slot is unavailable (sold out or sales ended)
   */
  isSlotUnavailable(slot: ExperienceSlot): boolean {
    if (slot.totalAvailableQuantity === 0) {
      return true;
    }

    // Check if all tickets have passed their cutoff time
    const now = new Date();
    const allSalesEnded = slot.tickets.every((t) => {
      if (t.ticketSalePeriodEndTime) {
        return new Date(t.ticketSalePeriodEndTime) < now;
      }
      return false;
    });
    return allSalesEnded && slot.tickets.length > 0;
  }

  /**
   * Ask a question about this experience
   * Opens chat with the hub, with this experience as context
   */
  async askQuestion(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const experience = this.experienceService.experience();
    if (!experience?.hub?._id) {
      console.error('No experience or hub available');
      return;
    }

    this.startingChat.set(true);
    try {
      await this.chatService.initiateChat({
        hubId: experience.hub._id,
        contextType: 'EXPERIENCE',
        contextId: experience._id,
      });
    } catch (error) {
      console.error('Failed to start chat:', error);
    } finally {
      this.startingChat.set(false);
    }
  }
}
