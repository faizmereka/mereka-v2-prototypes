import { Injectable, computed, signal } from '@angular/core';
import {
  TicketStatus,
  type ExperienceSlot,
  type ExperienceSlotTicket,
  type SelectedTicket,
} from '../models/experience.model';

/**
 * Stripe fee calculation constants
 */
const STRIPE_FEE_PERCENTAGE = 0.029; // 2.9%
const STRIPE_FEE_FIXED_MYR = 1.0; // RM 1.00 fixed fee

/**
 * BookingDataService
 *
 * Central state management for the booking flow.
 * Manages slots, selected slot, ticket selection, and pricing.
 */
@Injectable({ providedIn: 'root' })
export class BookingDataService {
  // ============================================================================
  // State Signals
  // ============================================================================

  /** All available slots from API */
  private readonly _slots = signal<ExperienceSlot[]>([]);

  /** Currently selected slot */
  private readonly _selectedSlot = signal<ExperienceSlot | null>(null);

  /** Selected tickets with quantities */
  private readonly _selectedTickets = signal<SelectedTicket[]>([]);

  /** Currency from API */
  private readonly _currency = signal<string>('MYR');

  /** Min price from API */
  private readonly _minPrice = signal<number>(0);

  /** Whether hub is paying the fee */
  private readonly _isHubPayingFee = signal<boolean>(false);

  /** Loading state */
  private readonly _loading = signal<boolean>(false);

  /** Track last loaded slug to prevent duplicate API calls across component instances */
  private _lastLoadedSlug: string | null = null;

  // ============================================================================
  // Public Readonly Signals
  // ============================================================================

  readonly slots = this._slots.asReadonly();
  readonly selectedSlot = this._selectedSlot.asReadonly();
  readonly selectedTickets = this._selectedTickets.asReadonly();
  readonly currency = this._currency.asReadonly();
  readonly minPrice = this._minPrice.asReadonly();
  readonly isHubPayingFee = this._isHubPayingFee.asReadonly();
  readonly loading = this._loading.asReadonly();

  // ============================================================================
  // Computed Values
  // ============================================================================

  /** Whether a slot is currently selected */
  readonly isSlotSelected = computed(() => this._selectedSlot() !== null);

  /** Whether any tickets are selected */
  readonly hasSelectedTickets = computed(() => this._selectedTickets().length > 0);

  /** Total number of tickets selected */
  readonly totalTicketCount = computed(() =>
    this._selectedTickets().reduce((sum, t) => sum + t.quantity, 0)
  );

  /** Total ticket price (before fees) */
  readonly totalPrice = computed(() =>
    this._selectedTickets().reduce((sum, t) => sum + t.price * t.quantity, 0)
  );

  /** Service fee (Stripe fee) */
  readonly serviceFee = computed(() => {
    if (this._isHubPayingFee()) {
      return 0;
    }
    const total = this.totalPrice();
    if (total === 0) return 0;
    return Math.round((total * STRIPE_FEE_PERCENTAGE + STRIPE_FEE_FIXED_MYR) * 100) / 100;
  });

  /** Grand total (tickets + service fee) */
  readonly grandTotal = computed(() => this.totalPrice() + this.serviceFee());

  /** Available slots count */
  readonly slotsCount = computed(() => this._slots().length);

  /** Number of ticket types for display */
  readonly ticketTypesCount = computed(() => {
    const slot = this._selectedSlot();
    return slot?.tickets.length || 0;
  });

  // ============================================================================
  // Methods
  // ============================================================================

  /**
   * Check if slots should be loaded for a slug (prevents duplicate calls)
   */
  shouldLoadSlots(slug: string): boolean {
    if (this._lastLoadedSlug === slug) {
      return false;
    }
    this._lastLoadedSlug = slug;
    return true;
  }

  /**
   * Set slots data from API response
   */
  setSlots(
    slots: ExperienceSlot[],
    currency: string,
    minPrice: number,
    isHubPayingFee: boolean
  ): void {
    this._slots.set(slots);
    this._currency.set(currency);
    this._minPrice.set(minPrice);
    this._isHubPayingFee.set(isHubPayingFee);
  }

  /**
   * Set loading state
   */
  setLoading(loading: boolean): void {
    this._loading.set(loading);
  }

  /**
   * Select a slot and prepare for ticket selection
   */
  selectSlot(slot: ExperienceSlot): void {
    this._selectedSlot.set(slot);
    // Clear any previously selected tickets when selecting a new slot
    this._selectedTickets.set([]);
  }

  /**
   * Clear selected slot and go back to slot list
   */
  clearSlot(): void {
    this._selectedSlot.set(null);
    this._selectedTickets.set([]);
  }

  /**
   * Update ticket quantity for a specific ticket
   */
  updateTicketQuantity(ticket: ExperienceSlotTicket, quantity: number): void {
    const current = this._selectedTickets();

    if (quantity === 0) {
      // Remove ticket from selection
      this._selectedTickets.set(current.filter((t) => t.id !== ticket.id));
    } else {
      const existing = current.find((t) => t.id === ticket.id);
      if (existing) {
        // Update existing ticket quantity
        this._selectedTickets.set(
          current.map((t) => (t.id === ticket.id ? { ...t, quantity } : t))
        );
      } else {
        // Add new ticket to selection
        this._selectedTickets.set([
          ...current,
          {
            id: ticket.id,
            name: ticket.name,
            price: ticket.price,
            quantity,
          },
        ]);
      }
    }
  }

  /**
   * Get quantity for a specific ticket
   */
  getTicketQuantity(ticketId: string): number {
    return this._selectedTickets().find((t) => t.id === ticketId)?.quantity || 0;
  }

  /**
   * Clear all selected tickets
   */
  clearTickets(): void {
    this._selectedTickets.set([]);
  }

  /**
   * Reset all booking data
   */
  reset(): void {
    this._slots.set([]);
    this._selectedSlot.set(null);
    this._selectedTickets.set([]);
    this._currency.set('MYR');
    this._minPrice.set(0);
    this._isHubPayingFee.set(false);
    this._loading.set(false);
    this._lastLoadedSlug = null;
  }

  /**
   * Calculate ticket status based on availability and cutoff time
   */
  getTicketStatus(ticket: ExperienceSlotTicket): TicketStatus {
    // Check if sold out
    if (ticket.availableQuantity === 0) {
      return TicketStatus.SOLD_OUT;
    }

    // Check if sales ended (cutoff time passed)
    if (ticket.ticketSalePeriodEndTime) {
      const cutoffTime = new Date(ticket.ticketSalePeriodEndTime);
      if (new Date() > cutoffTime) {
        return TicketStatus.SALES_ENDED;
      }
    }

    // Check if selling fast (less than 50% available)
    if (
      ticket.maximumQuantity > 0 &&
      ticket.availableQuantity < ticket.maximumQuantity / 2
    ) {
      return TicketStatus.SELLING_FAST;
    }

    return TicketStatus.AVAILABLE;
  }

  /**
   * Check if a ticket can be purchased
   */
  isTicketPurchasable(ticket: ExperienceSlotTicket): boolean {
    // Can't purchase if sold out
    if (ticket.availableQuantity === 0) {
      return false;
    }

    // Can't purchase if cutoff time passed
    if (ticket.ticketSalePeriodEndTime) {
      const cutoffTime = new Date(ticket.ticketSalePeriodEndTime);
      if (new Date() > cutoffTime) {
        return false;
      }
    }

    return true;
  }
}
