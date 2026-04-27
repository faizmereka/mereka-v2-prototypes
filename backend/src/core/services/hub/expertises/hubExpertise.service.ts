import { Booking, BookingStatus } from '@core/models/Booking';
import { Expertise } from '@core/models/Expertise';
import type {
  HubDeleteExpertiseInput,
  HubGetExpertiseByIdInput,
  HubQueryExpertisesInput,
  HubUpsertExpertiseInput,
} from '@schemas/hub';
import mongoose from 'mongoose';

// ============================================================================
// Types - Expertise Slots
// ============================================================================

export interface HubExpertiseTicketInfo {
  id: string;
  name: string;
  price: number;
  type: 'Paid' | 'Free';
  description?: string;
  mode: string;
  sessionDuration: number;
  durationUnit: string;
  bufferTime?: number;
  instantBooking: boolean;
}

export interface HubExpertiseTimeSlot {
  time: string;
  available: boolean;
}

export interface HubExpertiseDateSlots {
  date: string;
  dayOfWeek: string;
  slots: HubExpertiseTimeSlot[];
}

export interface HubExpertiseSlotsResponse {
  tickets: HubExpertiseTicketInfo[];
  currency: string;
  availableDates: HubExpertiseDateSlots[];
}

/**
 * Hub Expertise Service
 * Handles CRUD operations for expertise/service offerings
 */
export class HubExpertiseService {
  /**
   * Strip frontend-generated `id` from tickets so Mongoose generates `_id`
   */
  private cleanTicketData(data: HubUpsertExpertiseInput): HubUpsertExpertiseInput {
    if (!data.ticket || !Array.isArray(data.ticket)) {
      return data;
    }

    return {
      ...data,
      ticket: data.ticket.map((t) => {
        // Remove frontend-generated `id` field, keep all other fields
        const { id: _frontendId, ...ticketWithoutId } = t as typeof t & {
          id?: string;
        };
        return ticketWithoutId;
      }),
    };
  }

  /**
   * Create or Update Expertise (Upsert)
   * @param data Expertise data
   * @param id Optional expertise ID (for update)
   */
  async upsertExpertise(data: HubUpsertExpertiseInput, id?: string) {
    // Clean ticket data - strip frontend `id` so Mongoose generates `_id`
    const cleanedData = this.cleanTicketData(data);

    // If ID is provided, update existing expertise
    if (id) {
      const existing = await Expertise.findById(id);

      if (!existing) {
        throw new Error('Expertise not found');
      }

      // Update lastModified timestamp
      const updateData = {
        ...cleanedData,
        lastModified: new Date(),
      };

      const updated = await Expertise.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      })
        .populate('hubId', 'name logo')
        .populate('createdBy', 'name email profilePhoto')
        .lean();

      return updated;
    }

    // Otherwise, create new expertise
    // Check for slug uniqueness
    const existingSlug = await Expertise.findOne({ slug: data.slug });
    if (existingSlug) {
      throw new Error('Slug already exists');
    }

    const expertise = await Expertise.create({
      ...cleanedData,
      createdDate: new Date(),
      lastModified: new Date(),
    });

    // Populate and return
    const populated = await Expertise.findById(expertise._id)
      .populate('hubId', 'name logo')
      .populate('createdBy', 'name email profilePhoto')
      .lean();

    return populated;
  }

  /**
   * Get expertise by ID
   */
  async getExpertiseById(params: HubGetExpertiseByIdInput) {
    const expertise = await Expertise.findById(params.id)
      .populate('hubId', 'name logo email')
      .populate('createdBy', 'name email profilePhoto')
      .lean();

    if (!expertise) {
      throw new Error('Expertise not found');
    }

    return expertise;
  }

  /**
   * Query expertises with filters and pagination
   */
  async queryExpertises(query: HubQueryExpertisesInput) {
    const { sortBy: querySortBy, sortOrder: querySortOrder, ...filters } = query;
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortBy = querySortBy ?? 'createdAt';
    const sortOrder = querySortOrder ?? 'desc';

    // Build filter object
    const filterObj: Record<string, unknown> = {};

    if (filters.hubId) {
      filterObj.hubId = new mongoose.Types.ObjectId(filters.hubId);
    }

    if (filters.createdBy) {
      filterObj.createdBy = new mongoose.Types.ObjectId(filters.createdBy);
    }

    if (filters.status) {
      filterObj.status = filters.status;
    }

    if (filters.isDisabled !== undefined) {
      filterObj.isDisabled = filters.isDisabled;
    }

    // Calculate skip
    const skip = (page - 1) * limit;

    // Build sort object
    const sort: Record<string, 1 | -1> = {
      [sortBy]: sortOrder === 'asc' ? 1 : -1,
    };

    // Execute query
    const [expertises, total] = await Promise.all([
      Expertise.find(filterObj)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('hubId', 'name logo')
        .populate('createdBy', 'name email profilePhoto')
        .lean(),
      Expertise.countDocuments(filterObj),
    ]);

    return {
      expertises,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Delete expertise by ID
   */
  async deleteExpertise(params: HubDeleteExpertiseInput) {
    const expertise = await Expertise.findByIdAndDelete(params.id);

    if (!expertise) {
      throw new Error('Expertise not found');
    }

    return { message: 'Expertise deleted successfully' };
  }

  /**
   * Publish expertise (change status to published)
   */
  async publishExpertise(id: string) {
    const expertise = await Expertise.findByIdAndUpdate(
      id,
      {
        status: 'published',
        lastModified: new Date(),
      },
      { new: true },
    );

    if (!expertise) {
      throw new Error('Expertise not found');
    }

    return expertise;
  }

  /**
   * Archive expertise
   */
  async archiveExpertise(id: string) {
    const expertise = await Expertise.findByIdAndUpdate(
      id,
      {
        status: 'archived',
        lastModified: new Date(),
      },
      { new: true },
    );

    if (!expertise) {
      throw new Error('Expertise not found');
    }

    return expertise;
  }

  /**
   * Get expertise slots with available dates and times for booking
   * Generates available slots based on operating hours
   */
  async getExpertiseSlots(
    expertiseId: string,
    ticketId?: string,
    daysAhead: number = 30,
  ): Promise<HubExpertiseSlotsResponse> {
    // Get the expertise with ticket definitions and operating hours
    const expertise = await Expertise.findById(expertiseId)
      .select('_id expertiseTitle ticket currency operatingHours')
      .lean();

    if (!expertise) {
      throw new Error('Expertise not found');
    }

    // Build ticket info
    const tickets = expertise.ticket || [];
    if (tickets.length === 0) {
      return {
        tickets: [],
        currency: expertise.currency || 'MYR',
        availableDates: [],
      };
    }

    // Build ticket info array
    const ticketInfos: HubExpertiseTicketInfo[] = tickets.map((t) => ({
      id: t._id?.toString() ?? '',
      name: t.ticketName,
      price: t.standardRate,
      type: t.ticketType === 'Paid' ? 'Paid' : 'Free',
      description: t.description,
      mode: t.expertiseMode || 'online',
      sessionDuration: t.sessionDuration || 60,
      durationUnit: t.durationUnit || 'minutes',
      bufferTime: t.hasBufferTime ? t.bufferTime : undefined,
      instantBooking: t.instantBooking ?? true,
    }));

    // Get the selected ticket (or first one by default) for slot generation
    const selectedTicket = ticketId
      ? ticketInfos.find((t) => t.id === ticketId) || ticketInfos[0]
      : ticketInfos[0];

    if (!selectedTicket) {
      return {
        tickets: ticketInfos,
        currency: expertise.currency || 'MYR',
        availableDates: [],
      };
    }

    // Generate available dates based on operating hours
    const operatingHours = expertise.operatingHours;
    const availableDates: HubExpertiseDateSlots[] = [];

    if (operatingHours) {
      const now = new Date();
      const startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() + daysAhead);
      endDate.setHours(23, 59, 59, 999);

      // Get existing bookings for this expertise
      const existingBookings = await Booking.find({
        serviceId: expertise._id,
        bookingType: 'expertise',
        status: { $in: [BookingStatus.ACTIVE, BookingStatus.PENDING] },
        bookingStartDate: { $gte: startDate, $lte: endDate },
      })
        .select('bookingStartDate bookingEndDate')
        .lean();

      const bookedSlots = existingBookings.map((b) => ({
        start: new Date(b.bookingStartDate).getTime(),
        end: new Date(b.bookingEndDate).getTime(),
      }));

      const dayKeyMap: Record<number, string> = {
        0: 'sun',
        1: 'mon',
        2: 'tue',
        3: 'wed',
        4: 'thu',
        5: 'fri',
        6: 'sat',
      };

      const dayNameMap: Record<number, string> = {
        0: 'Sunday',
        1: 'Monday',
        2: 'Tuesday',
        3: 'Wednesday',
        4: 'Thursday',
        5: 'Friday',
        6: 'Saturday',
      };

      // Session duration in minutes
      let sessionDurationMins = selectedTicket.sessionDuration;
      if (selectedTicket.durationUnit === 'hours') {
        sessionDurationMins = selectedTicket.sessionDuration * 60;
      }
      const bufferMins = selectedTicket.bufferTime || 0;
      const totalSlotDuration = sessionDurationMins + bufferMins;

      // Generate slots for each day
      for (let dayOffset = 0; dayOffset < daysAhead; dayOffset++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + dayOffset);

        const dayOfWeek = currentDate.getDay();
        const dayKey = dayKeyMap[dayOfWeek] || 'sun';
        const dayName = dayNameMap[dayOfWeek] || 'Sunday';

        const dayConfig = operatingHours.days?.find((d) => d.key === dayKey);

        if (!dayConfig?.isActive) continue;

        let dayStartTime: string;
        let dayEndTime: string;

        if (operatingHours.sameOperatingHoursForAll) {
          dayStartTime = operatingHours.allOperatingStartTime || '09:00';
          dayEndTime = operatingHours.allOperatingEndTime || '17:00';
        } else {
          dayStartTime = dayConfig.startTime || '09:00';
          dayEndTime = dayConfig.endTime || '17:00';
        }

        const timeParts = dayStartTime.split(':');
        const endTimeParts = dayEndTime.split(':');
        const startHour = Number(timeParts[0]) || 9;
        const startMin = Number(timeParts[1]) || 0;
        const endHour = Number(endTimeParts[0]) || 17;
        const endMin = Number(endTimeParts[1]) || 0;

        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        const slots: HubExpertiseTimeSlot[] = [];

        let slotHour: number = startHour;
        let slotMin: number = startMin;

        while (true) {
          const sessionEndHour = slotHour + Math.floor((slotMin + sessionDurationMins) / 60);
          const sessionEndMin = (slotMin + sessionDurationMins) % 60;

          if (sessionEndHour > endHour || (sessionEndHour === endHour && sessionEndMin > endMin)) {
            break;
          }

          const timeStr = `${slotHour.toString().padStart(2, '0')}:${slotMin.toString().padStart(2, '0')}`;

          const slotStart = new Date(currentDate);
          slotStart.setHours(slotHour, slotMin, 0, 0);
          const slotEnd = new Date(slotStart.getTime() + sessionDurationMins * 60 * 1000);

          const minBookingTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);
          const isPast = slotStart < minBookingTime;

          const hasConflict = bookedSlots.some((booked) => {
            return slotStart.getTime() < booked.end && slotEnd.getTime() > booked.start;
          });

          slots.push({
            time: timeStr,
            available: !isPast && !hasConflict,
          });

          slotMin += totalSlotDuration;
          slotHour += Math.floor(slotMin / 60);
          slotMin = slotMin % 60;
        }

        if (slots.some((s) => s.available)) {
          availableDates.push({
            date: dateStr,
            dayOfWeek: dayName,
            slots,
          });
        }
      }
    }

    return {
      tickets: ticketInfos,
      currency: expertise.currency || 'MYR',
      availableDates,
    };
  }
}

export const hubExpertiseService = new HubExpertiseService();
