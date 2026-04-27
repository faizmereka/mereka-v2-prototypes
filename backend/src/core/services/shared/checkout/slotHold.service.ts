import { Booking, BookingStatus } from '@core/models/Booking';
import { Experience } from '@core/models/Experience';
import { ExperienceEvent } from '@core/models/ExperienceEvent';
import {
  type ISlotHold,
  SLOT_HOLD_TTL_MINUTES,
  SlotHold,
  SlotHoldStatus,
} from '@core/models/SlotHold';
import mongoose from 'mongoose';

const { ObjectId } = mongoose.Types;

/**
 * Ticket hold request
 */
export interface TicketHoldRequest {
  ticketId: string;
  quantity: number;
}

/**
 * Create hold result
 */
export interface CreateHoldResult {
  hold: ISlotHold;
  expiresAt: Date;
  remainingSeconds: number;
}

/**
 * Ticket availability info
 */
export interface TicketAvailability {
  ticketId: string;
  ticketName: string;
  ticketType: string;
  ticketPrice: number;
  maxQuantity: number; // From ticket definition
  bookedQuantity: number;
  heldQuantity: number;
  availableQuantity: number;
}

/**
 * Capacity error codes
 */
export enum CapacityErrorCode {
  EXPERIENCE_NOT_FOUND = 'EXPERIENCE_NOT_FOUND',
  EVENT_NOT_FOUND = 'EVENT_NOT_FOUND',
  INVALID_TICKET = 'INVALID_TICKET',
  INSUFFICIENT_CAPACITY = 'INSUFFICIENT_CAPACITY',
  HOLD_NOT_FOUND = 'HOLD_NOT_FOUND',
  HOLD_EXPIRED = 'HOLD_EXPIRED',
}

/**
 * Capacity error class
 */
export class CapacityError extends Error {
  constructor(
    public code: CapacityErrorCode,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'CapacityError';
  }
}

/**
 * SlotHold Service
 *
 * Provides atomic slot hold operations to prevent overbooking during checkout.
 * Uses MongoDB aggregations and atomic operations for consistency.
 */
class SlotHoldService {
  /**
   * Create a hold on slot capacity - ATOMIC operation
   *
   * Steps:
   * 1. Validate experience and event exist
   * 2. Calculate current availability (booked + active holds)
   * 3. Validate requested quantities
   * 4. Release any existing hold for this user on this event
   * 5. Create new hold with TTL
   *
   * @param userId - User making the hold
   * @param experienceId - Experience ID
   * @param eventId - ExperienceEvent ID
   * @param tickets - Array of ticket holds requested
   * @returns Created hold with expiry info
   */
  async createHold(
    userId: string,
    experienceId: string,
    eventId: string,
    tickets: TicketHoldRequest[],
  ): Promise<CreateHoldResult> {
    // Step 1: Validate experience and event
    const [experience, event] = await Promise.all([
      Experience.findById(experienceId).lean(),
      ExperienceEvent.findById(eventId).lean(),
    ]);

    if (!experience) {
      throw new CapacityError(CapacityErrorCode.EXPERIENCE_NOT_FOUND, 'Experience not found');
    }

    if (!event) {
      throw new CapacityError(CapacityErrorCode.EVENT_NOT_FOUND, 'Event not found');
    }

    // Step 2: Get current capacity usage
    const availability = await this.getEventAvailability(String(experienceId), String(eventId));
    const availabilityMap = new Map(availability.map((a) => [a.ticketId, a]));

    // Step 3: Validate each ticket has capacity
    const totalQuantity = tickets.reduce((sum, t) => sum + t.quantity, 0);

    for (const ticket of tickets) {
      const ticketAvail = availabilityMap.get(ticket.ticketId);

      if (!ticketAvail) {
        throw new CapacityError(
          CapacityErrorCode.INVALID_TICKET,
          `Invalid ticket: ${ticket.ticketId}`,
          {
            ticketId: ticket.ticketId,
          },
        );
      }

      if (ticket.quantity > ticketAvail.availableQuantity) {
        throw new CapacityError(
          CapacityErrorCode.INSUFFICIENT_CAPACITY,
          `Insufficient capacity for ${ticketAvail.ticketName}. Only ${ticketAvail.availableQuantity} left.`,
          {
            ticketId: ticket.ticketId,
            ticketName: ticketAvail.ticketName,
            requested: ticket.quantity,
            available: ticketAvail.availableQuantity,
          },
        );
      }
    }

    // Step 4: Release any existing hold for this user on this event
    await SlotHold.updateMany(
      {
        userId: new ObjectId(userId),
        eventId: new ObjectId(eventId),
        status: SlotHoldStatus.ACTIVE,
      },
      { $set: { status: SlotHoldStatus.RELEASED } },
    );

    // Step 5: Create the new hold
    const expiresAt = new Date(Date.now() + SLOT_HOLD_TTL_MINUTES * 60 * 1000);

    const hold = await SlotHold.create({
      experienceId: new ObjectId(experienceId),
      eventId: new ObjectId(eventId),
      userId: new ObjectId(userId),
      tickets,
      totalQuantity,
      status: SlotHoldStatus.ACTIVE,
      expiresAt,
    });

    const remainingSeconds = Math.floor((expiresAt.getTime() - Date.now()) / 1000);

    return {
      hold,
      expiresAt,
      remainingSeconds,
    };
  }

  /**
   * Get availability for an event, including active holds
   *
   * @param experienceId - Experience ID
   * @param eventId - ExperienceEvent ID
   * @returns Array of ticket availability info
   */
  async getEventAvailability(experienceId: string, eventId: string): Promise<TicketAvailability[]> {
    const experience = await Experience.findById(experienceId).lean();

    if (!experience || !experience.ticket) {
      return [];
    }

    // Get booking counts per ticket
    const bookingCounts = await Booking.aggregate([
      {
        $match: {
          eventId: new ObjectId(eventId),
          status: { $in: [BookingStatus.PENDING, BookingStatus.ACTIVE] },
        },
      },
      { $unwind: '$selectedTickets' },
      {
        $group: {
          _id: '$selectedTickets.id',
          booked: { $sum: '$selectedTickets.numberOfSelectedTickets' },
        },
      },
    ]);

    // Get hold counts per ticket (only active, non-expired holds)
    const holdCounts = await SlotHold.aggregate([
      {
        $match: {
          eventId: new ObjectId(eventId),
          status: SlotHoldStatus.ACTIVE,
          expiresAt: { $gt: new Date() },
        },
      },
      { $unwind: '$tickets' },
      {
        $group: {
          _id: '$tickets.ticketId',
          held: { $sum: '$tickets.quantity' },
        },
      },
    ]);

    const bookingMap = new Map(bookingCounts.map((b) => [b._id, b.booked]));
    const holdMap = new Map(holdCounts.map((h) => [h._id, h.held]));

    return experience.ticket.map((ticket) => {
      const ticketId = ticket._id?.toString() ?? '';
      const bookedQty = bookingMap.get(ticketId) || 0;
      const heldQty = holdMap.get(ticketId) || 0;
      const maxQty = ticket.ticketQty || 0;
      const availableQty = Math.max(0, maxQty - bookedQty - heldQty);

      return {
        ticketId,
        ticketName: ticket.ticketName,
        ticketType: ticket.ticketType,
        ticketPrice: ticket.ticketPrice,
        maxQuantity: maxQty,
        bookedQuantity: bookedQty,
        heldQuantity: heldQty,
        availableQuantity: availableQty,
      };
    });
  }

  /**
   * Confirm a hold - convert to booking
   *
   * Called after successful payment to mark hold as confirmed
   * and associate with the created booking.
   *
   * @param holdId - Hold ID to confirm
   * @param bookingId - Booking ID to associate
   * @returns Updated hold
   */
  async confirmHold(holdId: string, bookingId: string): Promise<ISlotHold> {
    const hold = await SlotHold.findOneAndUpdate(
      {
        _id: new ObjectId(holdId),
        status: SlotHoldStatus.ACTIVE,
        expiresAt: { $gt: new Date() },
      },
      {
        $set: {
          status: SlotHoldStatus.CONFIRMED,
          bookingId: new ObjectId(bookingId),
        },
      },
      { new: true },
    );

    if (!hold) {
      throw new CapacityError(CapacityErrorCode.HOLD_EXPIRED, 'Hold has expired or is invalid');
    }

    return hold;
  }

  /**
   * Release a hold - manual abandon
   *
   * Called when user abandons checkout or changes selection.
   *
   * @param holdId - Hold ID to release
   * @param userId - User ID (for verification)
   */
  async releaseHold(holdId: string, userId: string): Promise<void> {
    await SlotHold.updateOne(
      {
        _id: new ObjectId(holdId),
        userId: new ObjectId(userId),
        status: SlotHoldStatus.ACTIVE,
      },
      { $set: { status: SlotHoldStatus.RELEASED } },
    );
  }

  /**
   * Get a hold by ID
   *
   * @param holdId - Hold ID
   * @returns Hold document or null
   */
  async getHold(holdId: string): Promise<ISlotHold | null> {
    return SlotHold.findById(holdId);
  }

  /**
   * Get active hold for user on specific event
   *
   * @param userId - User ID
   * @param eventId - Event ID
   * @returns Active hold or null
   */
  async getUserHoldForEvent(userId: string, eventId: string): Promise<ISlotHold | null> {
    return SlotHold.findOne({
      userId: new ObjectId(userId),
      eventId: new ObjectId(eventId),
      status: SlotHoldStatus.ACTIVE,
      expiresAt: { $gt: new Date() },
    });
  }

  /**
   * Check if a hold is still valid
   *
   * @param holdId - Hold ID
   * @returns True if hold is active and not expired
   */
  async isHoldValid(holdId: string): Promise<boolean> {
    const hold = await SlotHold.findById(holdId);
    if (!hold) return false;
    return hold.status === SlotHoldStatus.ACTIVE && hold.expiresAt > new Date();
  }

  /**
   * Extend hold expiry (for cases like payment retries)
   *
   * @param holdId - Hold ID
   * @param userId - User ID (for verification)
   * @param additionalMinutes - Minutes to extend (default: 5)
   * @returns Updated hold or null if not found/invalid
   */
  async extendHold(
    holdId: string,
    userId: string,
    additionalMinutes = 5,
  ): Promise<ISlotHold | null> {
    const newExpiresAt = new Date(Date.now() + additionalMinutes * 60 * 1000);

    return SlotHold.findOneAndUpdate(
      {
        _id: new ObjectId(holdId),
        userId: new ObjectId(userId),
        status: SlotHoldStatus.ACTIVE,
        expiresAt: { $gt: new Date() },
      },
      { $set: { expiresAt: newExpiresAt } },
      { new: true },
    );
  }

  /**
   * Get hold statistics for an event (admin/debug use)
   *
   * @param eventId - Event ID
   * @returns Hold statistics
   */
  async getEventHoldStats(eventId: string): Promise<{
    activeHolds: number;
    totalHeldQuantity: number;
    confirmedHolds: number;
    expiredHolds: number;
  }> {
    const stats = await SlotHold.aggregate([
      { $match: { eventId: new ObjectId(eventId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalQuantity: { $sum: '$totalQuantity' },
        },
      },
    ]);

    const statMap = new Map(stats.map((s) => [s._id, s]));

    return {
      activeHolds: statMap.get(SlotHoldStatus.ACTIVE)?.count || 0,
      totalHeldQuantity: statMap.get(SlotHoldStatus.ACTIVE)?.totalQuantity || 0,
      confirmedHolds: statMap.get(SlotHoldStatus.CONFIRMED)?.count || 0,
      expiredHolds: statMap.get(SlotHoldStatus.EXPIRED)?.count || 0,
    };
  }
}

// Export singleton instance
export const slotHoldService = new SlotHoldService();
