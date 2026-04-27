import { Booking, BookingStatus, BookingType } from '@core/models/Booking';
import { Experience, type IExperience, type IExperienceHost } from '@core/models/Experience';
import { ExperienceEvent } from '@core/models/ExperienceEvent';
import { HubMember, HubMemberStatus } from '@core/models/HubMember';
import { Role, RoleScope, SystemRoleKey } from '@core/models/Role';
import { SlotHold, SlotHoldStatus } from '@core/models/SlotHold';
import { AuthProvider, User } from '@core/models/User';
import { experienceThemeService } from '@services/reference-data';
import mongoose from 'mongoose';

// ============================================================================
// Types
// ============================================================================

export interface ExperienceOverviewStats {
  totalSessions: number;
  totalBookings: number;
  upcomingSessions: number;
  pageViews: number;
}

export interface SessionTicketInfo {
  ticketId: string;
  ticketName: string;
  ticketType: string;
  totalCapacity: number;
  booked: number;
  held: number;
  available: number;
}

export interface ExperienceSessionsResult {
  sessions: Array<{
    _id: string;
    experienceId: string;
    scheduleId: string;
    startTime: Date;
    endTime: Date;
    timeZone: string;
    status: string;
    isLocked: boolean;
    maxCapacity: number;
    bookingCount: number;
    holdCount: number;
    tickets: SessionTicketInfo[];
    createdAt: Date;
    updatedAt: Date;
  }>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================================================
// Hub Experience Service
// ============================================================================

export class HubExperienceService {
  /**
   * Create a new experience
   */
  async createExperience(data: Partial<IExperience>): Promise<IExperience> {
    // Check for duplicate slug
    const existingSlug = await Experience.findOne({ slug: data.slug });
    if (existingSlug) {
      throw new Error(`Experience with slug "${data.slug}" already exists`);
    }

    // Set default status based on validation
    let status = data.status || 'DRAFTED';

    // If all required fields for ACTIVE are present, set to ACTIVE
    if (this.isReadyForPublication(data)) {
      status = 'ACTIVE';
    }

    // Create experience
    const experience = await Experience.create({
      ...data,
      status,
      views: 0,
      priority: data.priority || 1000,
      isFeatured: data.isFeatured || false,
    });

    // Increment theme count if category is provided
    if (data.experienceCategory) {
      await experienceThemeService.incrementCount(data.experienceCategory as string);
    }

    // Ensure hosts are added as collaborators and update hostDetails with userIds
    if (data.hubId && data.hostDetails) {
      await this.ensureHostsAreCollaborators(
        data.hubId as string,
        data.hostDetails,
        String(experience._id),
      );
    }

    // Return fresh experience with updated hostDetails
    return (await Experience.findById(experience._id)) || experience;
  }

  /**
   * Get experience by ID
   */
  async getExperienceById(experienceId: string): Promise<IExperience | null> {
    const experience = await Experience.findById(experienceId);
    return experience;
  }

  /**
   * Get experience by slug
   */
  async getExperienceBySlug(slug: string): Promise<IExperience | null> {
    const experience = await Experience.findOne({ slug });

    // Increment view count
    if (experience) {
      experience.views += 1;
      await experience.save();
    }

    return experience;
  }

  /**
   * Get experience overview data (for manage listing page)
   * Returns basic experience + upcoming events (max 2) + booking stats
   */
  async getExperienceOverview(experience: IExperience) {
    const now = new Date();

    // Calculate max capacity from ticket definitions
    const ticketDefinitions = experience.ticket || [];
    const maxCapacity = ticketDefinitions.reduce((sum, ticket) => sum + (ticket.ticketQty || 0), 0);

    // Fetch upcoming events (max 2) for overview
    const upcomingEvents = await ExperienceEvent.find({
      experienceId: experience._id,
      status: 'ACTIVE',
      startTime: { $gte: now },
    })
      .sort({ startTime: 1 })
      .limit(2)
      .lean();

    // Get all event IDs for this experience
    const eventIds = await ExperienceEvent.find({
      experienceId: experience._id,
      status: { $ne: 'DELETED' },
    })
      .select('_id startTime')
      .lean();

    // Count sessions and upcoming sessions
    const totalSessions = eventIds.length;
    const upcomingSessions = eventIds.filter((e) => e.startTime >= now).length;

    // Get booking counts per event for upcoming events
    const upcomingEventIds = upcomingEvents.map((e) => e._id);
    const bookingCountsPerEvent = await Booking.aggregate([
      {
        $match: {
          eventId: { $in: upcomingEventIds },
          bookingType: BookingType.EXPERIENCE,
          status: { $in: [BookingStatus.ACTIVE, BookingStatus.COMPLETED, BookingStatus.PENDING] },
        },
      },
      { $unwind: '$selectedTickets' },
      {
        $group: {
          _id: '$eventId',
          count: { $sum: '$selectedTickets.numberOfSelectedTickets' },
        },
      },
    ]);

    // Create map for quick lookup
    const bookingCountMap = new Map<string, number>();
    for (const b of bookingCountsPerEvent) {
      bookingCountMap.set(b._id.toString(), b.count);
    }

    // Enrich upcoming events with booking count and max capacity
    const enrichedUpcomingEvents = upcomingEvents.map((event) => ({
      ...event,
      bookingCount: bookingCountMap.get(event._id.toString()) || 0,
      maxCapacity,
    }));

    // Get total bookings from Booking collection
    const bookingCountResult = await Booking.aggregate([
      {
        $match: {
          eventId: { $in: eventIds.map((e) => e._id) },
          bookingType: BookingType.EXPERIENCE,
          status: { $in: [BookingStatus.ACTIVE, BookingStatus.COMPLETED, BookingStatus.PENDING] },
        },
      },
      { $unwind: '$selectedTickets' },
      {
        $group: {
          _id: null,
          totalBookings: { $sum: '$selectedTickets.numberOfSelectedTickets' },
        },
      },
    ]);

    const totalBookings = bookingCountResult[0]?.totalBookings || 0;

    // Convert experience to plain object
    const experienceObj =
      typeof experience.toObject === 'function' ? experience.toObject() : experience;

    return {
      ...experienceObj,
      upcomingEvents: enrichedUpcomingEvents,
      stats: {
        totalSessions,
        totalBookings,
        upcomingSessions,
        pageViews: experience.views || 0,
      },
    };
  }

  /**
   * Get experience sessions/events with pagination and filtering
   * Includes booking counts, hold counts, and per-ticket breakdown for each session
   */
  async getExperienceSessions(
    experienceId: string,
    options: {
      filter?: 'all' | 'upcoming' | 'past';
      page?: number;
      limit?: number;
    } = {},
  ): Promise<ExperienceSessionsResult> {
    const { filter = 'all', page = 1, limit = 20 } = options;
    const now = new Date();

    // Get the experience to get ticket definitions
    const experience = await Experience.findById(experienceId).lean();
    if (!experience) {
      return {
        sessions: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
    }

    // Get ticket definitions from experience
    const ticketDefinitions = experience.ticket || [];

    // Calculate max capacity from all ticket quantities
    const maxCapacity = ticketDefinitions.reduce((sum, ticket) => sum + (ticket.ticketQty || 0), 0);

    // Build query based on filter
    const query: Record<string, unknown> = {
      experienceId: new mongoose.Types.ObjectId(experienceId),
      status: { $ne: 'DELETED' },
    };

    if (filter === 'upcoming') {
      query.startTime = { $gte: now };
    } else if (filter === 'past') {
      query.startTime = { $lt: now };
    }

    const skip = (page - 1) * limit;

    // Fetch sessions and count in parallel
    const [sessions, total] = await Promise.all([
      ExperienceEvent.find(query)
        .sort({ startTime: filter === 'past' ? -1 : 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ExperienceEvent.countDocuments(query),
    ]);

    if (sessions.length === 0) {
      return {
        sessions: [],
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }

    // Get event IDs for booking and hold queries
    const eventIds = sessions.map((s) => s._id);

    // Query booking counts per event AND per ticket
    const bookingCountsPerTicket = await Booking.aggregate([
      {
        $match: {
          eventId: { $in: eventIds },
          bookingType: BookingType.EXPERIENCE,
          status: { $in: [BookingStatus.ACTIVE, BookingStatus.COMPLETED, BookingStatus.PENDING] },
        },
      },
      { $unwind: '$selectedTickets' },
      {
        $group: {
          _id: {
            eventId: '$eventId',
            ticketId: '$selectedTickets.id',
          },
          count: { $sum: '$selectedTickets.numberOfSelectedTickets' },
        },
      },
    ]);

    // Query active hold counts per event AND per ticket
    const holdCountsPerTicket = await SlotHold.aggregate([
      {
        $match: {
          eventId: { $in: eventIds },
          status: SlotHoldStatus.ACTIVE,
          expiresAt: { $gt: now },
        },
      },
      { $unwind: '$tickets' },
      {
        $group: {
          _id: {
            eventId: '$eventId',
            ticketId: '$tickets.ticketId',
          },
          count: { $sum: '$tickets.quantity' },
        },
      },
    ]);

    // Create maps for quick lookup: eventId-ticketId -> count
    const bookingMap = new Map<string, number>();
    for (const b of bookingCountsPerTicket) {
      const key = `${b._id.eventId.toString()}-${b._id.ticketId}`;
      bookingMap.set(key, b.count);
    }

    const holdMap = new Map<string, number>();
    for (const h of holdCountsPerTicket) {
      const key = `${h._id.eventId.toString()}-${h._id.ticketId}`;
      holdMap.set(key, h.count);
    }

    // Enrich sessions with booking/hold counts and per-ticket breakdown
    const enrichedSessions = sessions.map((session) => {
      const eventId = session._id.toString();

      // Build per-ticket breakdown
      let totalBooked = 0;
      let totalHeld = 0;

      const tickets: SessionTicketInfo[] = ticketDefinitions.map((ticket) => {
        const ticketId = ticket._id?.toString() || '';
        const key = `${eventId}-${ticketId}`;
        const booked = bookingMap.get(key) || 0;
        const held = holdMap.get(key) || 0;
        const totalCapacity = ticket.ticketQty || 0;
        const available = Math.max(0, totalCapacity - booked - held);

        totalBooked += booked;
        totalHeld += held;

        return {
          ticketId,
          ticketName: ticket.ticketName || 'Unknown',
          ticketType: ticket.ticketType || 'Paid',
          totalCapacity,
          booked,
          held,
          available,
        };
      });

      return {
        _id: eventId,
        experienceId: session.experienceId.toString(),
        scheduleId: session.scheduleId,
        startTime: session.startTime,
        endTime: session.endTime,
        timeZone: session.timeZone,
        status: session.status,
        isLocked: session.isLocked,
        maxCapacity,
        bookingCount: totalBooked,
        holdCount: totalHeld,
        tickets,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      };
    });

    return {
      sessions: enrichedSessions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Update experience by ID
   */
  async updateExperience(experienceId: string, data: Partial<IExperience>): Promise<IExperience> {
    // Check if experience exists
    const experience = await Experience.findById(experienceId);
    if (!experience) {
      throw new Error('Experience not found');
    }

    // Check for duplicate slug if slug is being updated
    if (data.slug && data.slug !== experience.slug) {
      const existingSlug = await Experience.findOne({ slug: data.slug });
      if (existingSlug) {
        throw new Error(`Experience with slug "${data.slug}" already exists`);
      }
    }

    // Update category count if category is changing
    if (data.experienceCategory && data.experienceCategory !== experience.experienceCategory) {
      // Decrement old category
      if (experience.experienceCategory) {
        await experienceThemeService.decrementCount(experience.experienceCategory as string);
      }
      // Increment new category
      await experienceThemeService.incrementCount(data.experienceCategory as string);
    }

    // Update experience
    Object.assign(experience, data);
    await experience.save();

    // Ensure hosts are added as collaborators and update hostDetails with userIds
    if (data.hostDetails && experience.hubId) {
      await this.ensureHostsAreCollaborators(
        experience.hubId.toString(),
        data.hostDetails,
        String(experience._id),
      );
    }

    // Return fresh experience with updated hostDetails
    return (await Experience.findById(experience._id)) || experience;
  }

  /**
   * List experiences for a hub
   */
  async listHubExperiences(
    hubId: string,
    options: {
      status?: string;
      listingType?: string;
      page?: number;
      limit?: number;
      collaboratorFilter?: { userId: string; userEmail: string };
    } = {},
  ): Promise<{ experiences: IExperience[]; total: number; page: number; limit: number }> {
    const { status, listingType, page = 1, limit = 20, collaboratorFilter } = options;

    // Query with both string and ObjectId since legacy data may have mixed types
    const hubIdQuery = mongoose.isValidObjectId(hubId)
      ? { $or: [{ hubId }, { hubId: new mongoose.Types.ObjectId(hubId) }] }
      : { hubId };

    const query: Record<string, unknown> = { ...hubIdQuery };

    if (status) {
      query.status = status;
    } else {
      // Default: exclude deleted
      query.status = { $ne: 'DELETED' };
    }

    if (listingType) {
      query.listingType = listingType;
    }

    // For collaborators, only show experiences where they're a host
    if (collaboratorFilter) {
      query.$or = [
        { 'hostDetails.userId': collaboratorFilter.userId },
        { 'hostDetails.email': collaboratorFilter.userEmail },
      ];
    }

    const skip = (page - 1) * limit;

    const [experiences, total] = await Promise.all([
      Experience.find(query).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
      Experience.countDocuments(query),
    ]);

    return {
      experiences: experiences as unknown as IExperience[],
      total,
      page,
      limit,
    };
  }

  /**
   * Check if slug is available
   */
  async isSlugAvailable(slug: string, excludeId?: string): Promise<boolean> {
    const query: Record<string, unknown> = { slug };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    const existing = await Experience.findOne(query);
    return !existing;
  }

  /**
   * Ensure hosts are added as collaborators to the hub
   * If a host (by userId or email) is not already a hub member, add them as a collaborator
   * If the user doesn't exist in the system, create a new user first
   * Returns updated hostDetails with userId populated for each host
   */
  private async ensureHostsAreCollaborators(
    hubId: string,
    hostDetails: IExperienceHost[] | undefined,
    experienceId?: string,
  ): Promise<IExperienceHost[]> {
    if (!hostDetails || hostDetails.length === 0) {
      return [];
    }

    // Get collaborator role
    const collaboratorRole = await Role.findOne({
      key: SystemRoleKey.COLLABORATOR,
      scope: RoleScope.SYSTEM,
    }).select('_id');

    if (!collaboratorRole) {
      // Collaborator role not found - return original hostDetails
      return hostDetails;
    }

    const hubObjectId = new mongoose.Types.ObjectId(hubId);
    const updatedHostDetails: IExperienceHost[] = [];

    for (const host of hostDetails) {
      // Get userId from host - try userId field first, then look up/create by email
      let userId = host.userId;

      // If no userId, try to find or create user by email
      if (!userId && host.email) {
        const user = await User.findOne({ email: host.email }).select('_id').lean();

        // If user doesn't exist, create a new user
        if (!user) {
          // Extract name from host details or email
          const name = host.name || host.email.split('@')[0];

          const newUser = await User.create({
            email: host.email,
            name,
            authProviders: [AuthProvider.EMAIL],
            emailVerified: false,
          });
          userId = (newUser._id as mongoose.Types.ObjectId).toString();
        } else if (user._id) {
          userId = user._id.toString();
        }
      }

      // Add updated host with userId to the list
      updatedHostDetails.push({
        ...host,
        userId: userId || host.userId,
      });

      if (!userId) {
        continue; // Skip adding as collaborator if no userId
      }

      // Check if user is already a hub member
      const existingMember = await HubMember.findOne({
        hubId: hubObjectId,
        userId: new mongoose.Types.ObjectId(userId),
        status: { $in: [HubMemberStatus.ACTIVE, HubMemberStatus.INVITED] },
      });

      if (existingMember) {
        continue; // User is already a member, skip
      }

      // Add user as collaborator
      await HubMember.create({
        hubId: hubObjectId,
        userId: new mongoose.Types.ObjectId(userId),
        roleIds: [collaboratorRole._id],
        status: HubMemberStatus.ACTIVE,
        joinedAt: new Date(),
      });
    }

    // Update experience with populated userIds if experienceId provided
    if (experienceId && updatedHostDetails.length > 0) {
      await Experience.findByIdAndUpdate(experienceId, {
        hostDetails: updatedHostDetails,
      });
    }

    return updatedHostDetails;
  }

  /**
   * Check if experience is ready for publication (all required fields present)
   */
  private isReadyForPublication(data: Partial<IExperience>): boolean {
    const requiredFields = [
      'experienceTitle',
      'slug',
      'experienceDescription',
      'experienceType',
      'experienceCategory',
      'experienceTopics',
      'audienceType',
      'primaryLanguage',
      'coverPhoto',
      'hubId',
    ];

    // Check all required fields are present
    for (const field of requiredFields) {
      if (!(field in data) || !data[field as keyof typeof data]) {
        return false;
      }
    }

    // Check experience type specific requirements
    if (data.experienceType === 'Physical' || data.experienceType === 'Hybrid') {
      if (!data.location) {
        return false;
      }
    }

    if (data.experienceType === 'Virtual' || data.experienceType === 'Hybrid') {
      if (!data.meetingLink) {
        return false;
      }
    }

    return true;
  }
}

export const hubExperienceService = new HubExperienceService();
