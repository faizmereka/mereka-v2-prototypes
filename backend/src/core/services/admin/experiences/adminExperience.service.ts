import { Experience } from '@core/models/Experience';
import { ExperienceEvent } from '@core/models/ExperienceEvent';
import { Hub } from '@core/models/Hub';
import { HubMember, HubMemberStatus } from '@core/models/HubMember';
import { Role, RoleScope, SystemRoleKey } from '@core/models/Role';
import { communicationTriggerService } from '@services/communications';
import mongoose from 'mongoose';
import pkg from 'rrule';

const { RRule } = pkg;

export type ExperienceStatus = 'ACTIVE' | 'DRAFTED' | 'DELETED' | 'EXPIRED';

export interface AdminListExperiencesQuery {
  page?: number;
  limit?: number;
  status?: ExperienceStatus;
  search?: string;
  isFeatured?: boolean;
  hubId?: string;
  experienceType?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ExperienceStatsResponse {
  total: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  featured: number;
  toReview: number;
  active: number;
  recentExperiences: unknown[];
}

export class AdminExperienceService {
  /**
   * Get experience statistics for admin dashboard
   */
  async getExperienceStats(): Promise<ExperienceStatsResponse> {
    const [total, statusCounts, featuredCount, recentExperiences] = await Promise.all([
      Experience.countDocuments({ status: { $ne: 'DELETED' } }),
      Experience.aggregate([
        { $match: { status: { $ne: 'DELETED' } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Experience.countDocuments({ isFeatured: true, status: 'ACTIVE' }),
      Experience.find({ status: { $ne: 'DELETED' } })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('experienceTitle coverPhoto createdAt status hubId')
        .lean(),
    ]);

    // Convert aggregation results to object
    const byStatus: Record<string, number> = {
      ACTIVE: 0,
      DRAFTED: 0,
      EXPIRED: 0,
    };

    for (const item of statusCounts) {
      if (item._id && item._id !== 'DELETED') {
        byStatus[item._id] = item.count;
      }
    }

    // Get type counts
    const typeCounts = await Experience.aggregate([
      { $match: { status: { $ne: 'DELETED' } } },
      { $group: { _id: '$experienceType', count: { $sum: 1 } } },
    ]);

    const byType: Record<string, number> = {
      Physical: 0,
      Virtual: 0,
      Hybrid: 0,
    };

    for (const item of typeCounts) {
      if (item._id in byType) {
        byType[item._id] = item.count;
      }
    }

    return {
      total,
      byStatus,
      byType,
      featured: featuredCount,
      toReview: byStatus.DRAFTED ?? 0,
      active: byStatus.ACTIVE ?? 0,
      recentExperiences,
    };
  }

  /**
   * List all experiences with filtering and pagination
   * Optimized: Uses parallel queries instead of $facet for better performance
   */
  async listExperiences(query: AdminListExperiencesQuery) {
    const {
      page = 1,
      limit = 20,
      status,
      search,
      isFeatured,
      hubId,
      experienceType,
      dateFrom,
      dateTo,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    // Build match filter
    const matchFilter: Record<string, unknown> = {
      status: { $ne: 'DELETED' },
    };
    if (status) matchFilter.status = status;
    if (isFeatured !== undefined) matchFilter.isFeatured = isFeatured;
    if (hubId) matchFilter.hubId = hubId;
    if (experienceType) matchFilter.experienceType = experienceType;
    if (search) {
      matchFilter.$or = [
        { experienceTitle: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
      ];
    }

    // Date range filter
    if (dateFrom || dateTo) {
      matchFilter.createdAt = {};
      if (dateFrom) {
        (matchFilter.createdAt as Record<string, Date>).$gte = new Date(dateFrom);
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setDate(endDate.getDate() + 1);
        (matchFilter.createdAt as Record<string, Date>).$lt = endDate;
      }
    }

    // Build sort
    const sort: Record<string, 1 | -1> = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Run count and data queries in parallel for better performance
    const [total, experiences] = await Promise.all([
      Experience.countDocuments(matchFilter),
      Experience.find(matchFilter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select(
          '_id experienceTitle slug coverPhoto experienceType experienceDescription status isFeatured views priority audienceType currency ticket createdAt updatedAt hubId',
        )
        .lean(),
    ]);

    // Collect unique hubIds for batch lookup
    const hubIds = [
      ...new Set(
        experiences
          .map((exp) => exp.hubId)
          .filter((id): id is mongoose.Types.ObjectId | string => id != null),
      ),
    ];

    // Batch lookup hubs - handle both ObjectId and string hubIds
    let hubMap = new Map<string, Record<string, unknown>>();
    if (hubIds.length > 0) {
      const hubs = await mongoose.connection
        .collection('hubs')
        .find({
          _id: {
            $in: hubIds.map((id) =>
              typeof id === 'string' && id.length === 24
                ? new mongoose.Types.ObjectId(id)
                : (id as mongoose.Types.ObjectId),
            ),
          },
        })
        .project({ name: 1, slug: 1, logo: 1 })
        .toArray();

      hubMap = new Map(hubs.map((hub) => [hub._id.toString(), hub]));
    }

    // Attach hub data to experiences
    const experiencesWithHub = experiences.map((exp) => ({
      ...exp,
      hub: exp.hubId ? hubMap.get(exp.hubId.toString()) || null : null,
    }));

    return {
      items: experiencesWithHub,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get experience by ID with full details
   */
  async getExperienceById(id: string) {
    const experienceId = new mongoose.Types.ObjectId(id);
    const now = new Date();

    // Single aggregation pipeline
    const result = await Experience.aggregate([
      { $match: { _id: experienceId } },
      // Lookup hub details
      {
        $addFields: {
          hubObjectId: {
            $cond: [
              { $eq: [{ $type: '$hubId' }, 'objectId'] },
              '$hubId',
              {
                $cond: [
                  {
                    $and: [
                      { $ne: ['$hubId', null] },
                      { $eq: [{ $strLenCP: { $toString: '$hubId' } }, 24] },
                    ],
                  },
                  { $toObjectId: '$hubId' },
                  null,
                ],
              },
            ],
          },
        },
      },
      {
        $lookup: {
          from: 'hubs',
          localField: 'hubObjectId',
          foreignField: '_id',
          pipeline: [{ $project: { name: 1, logo: 1, slug: 1 } }],
          as: 'hubData',
        },
      },
      // Lookup events
      {
        $lookup: {
          from: 'experienceEvents',
          let: { expId: { $toString: '$_id' } },
          pipeline: [
            { $match: { $expr: { $eq: ['$experienceId', '$$expId'] } } },
            {
              $lookup: {
                from: 'bookings',
                let: { eventId: '$_id' },
                pipeline: [
                  {
                    $match: {
                      $expr: { $eq: ['$eventId', '$$eventId'] },
                      status: { $in: ['active', 'completed', 'pending'] },
                    },
                  },
                  { $unwind: '$selectedTickets' },
                  {
                    $group: {
                      _id: '$selectedTickets.id',
                      ticketName: { $first: '$selectedTickets.ticketName' },
                      ticketType: { $first: '$selectedTickets.ticketType' },
                      totalBooked: { $sum: '$selectedTickets.numberOfSelectedTickets' },
                      bookingCount: { $sum: 1 },
                    },
                  },
                ],
                as: 'ticketBookings',
              },
            },
            {
              $addFields: {
                totalBookings: { $size: '$ticketBookings' },
                totalTicketsSold: { $sum: '$ticketBookings.totalBooked' },
              },
            },
            { $sort: { startTime: -1 } },
            { $limit: 50 },
          ],
          as: 'allEvents',
        },
      },
      // Aggregate overall booking stats
      {
        $lookup: {
          from: 'bookings',
          let: { expId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$serviceId', '$$expId'] },
                status: { $in: ['active', 'completed', 'pending'] },
              },
            },
            { $unwind: '$selectedTickets' },
            {
              $group: {
                _id: '$selectedTickets.id',
                ticketName: { $first: '$selectedTickets.ticketName' },
                totalBooked: { $sum: '$selectedTickets.numberOfSelectedTickets' },
                bookingCount: { $sum: 1 },
              },
            },
          ],
          as: 'ticketBookings',
        },
      },
      { $project: { hubObjectId: 0 } },
    ]);

    if (!result || result.length === 0) {
      throw new Error('Experience not found');
    }

    const experience = result[0];
    const hub = experience.hubData?.[0] || null;
    const allEvents = experience.allEvents || [];
    const ticketBookings = experience.ticketBookings || [];

    // Create ticket booking map
    const ticketBookingMap: Record<
      string,
      { totalBooked: number; bookingCount: number; ticketName: string }
    > = {};
    for (const stat of ticketBookings) {
      ticketBookingMap[stat._id] = {
        totalBooked: stat.totalBooked,
        bookingCount: stat.bookingCount,
        ticketName: stat.ticketName,
      };
    }

    // Enhance tickets with booking info
    const ticketsWithStats =
      experience.ticket?.map(
        (ticket: { _id?: unknown; ticketQty?: number; [key: string]: unknown }) => {
          const ticketId = ticket._id?.toString() ?? '';
          const bookingInfo = ticketBookingMap[ticketId] || {
            totalBooked: 0,
            bookingCount: 0,
          };
          const totalCapacity = ticket.ticketQty || 0;
          const booked = bookingInfo.totalBooked;
          const available = Math.max(0, totalCapacity - booked);

          return {
            ...ticket,
            totalCapacity,
            booked,
            available,
            bookingCount: bookingInfo.bookingCount,
            isSoldOut: available === 0 && totalCapacity > 0,
          };
        },
      ) || [];

    // Separate upcoming and past events
    const upcomingEvents = allEvents
      .filter(
        (e: { status: string; startTime: string | Date }) =>
          e.status === 'ACTIVE' && new Date(e.startTime) >= now,
      )
      .sort(
        (a: { startTime: string | Date }, b: { startTime: string | Date }) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
      );

    const pastEvents = allEvents
      .filter((e: { startTime: string | Date }) => new Date(e.startTime) < now)
      .sort(
        (a: { startTime: string | Date }, b: { startTime: string | Date }) =>
          new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
      );

    // Parse schedules
    const schedulesWithReadableRules =
      experience.schedules?.map(
        (schedule: { recurringRule?: string[]; [key: string]: unknown }) => ({
          ...schedule,
          readableRule: this.parseRRuleToText(schedule.recurringRule || []),
        }),
      ) || [];

    // Calculate total booking stats
    const totalBookingStats = {
      totalBookings: ticketBookings.reduce(
        (sum: number, s: { bookingCount: number }) => sum + s.bookingCount,
        0,
      ),
      totalTicketsSold: ticketBookings.reduce(
        (sum: number, s: { totalBooked: number }) => sum + s.totalBooked,
        0,
      ),
      totalCapacity:
        experience.ticket?.reduce(
          (sum: number, t: { ticketQty?: number }) => sum + (t.ticketQty || 0),
          0,
        ) || 0,
    };

    // Clean up
    delete experience.hubData;
    delete experience.allEvents;
    delete experience.ticketBookings;

    return {
      ...experience,
      ticket: ticketsWithStats,
      hub,
      upcomingEvents,
      pastEvents,
      schedulesWithReadableRules,
      bookingStats: totalBookingStats,
    };
  }

  /**
   * Update experience status
   */
  async updateExperienceStatus(id: string, status: ExperienceStatus, reason?: string) {
    const experience = await Experience.findById(id);
    if (!experience) {
      throw new Error('Experience not found');
    }

    const previousStatus = experience.status;
    experience.status = status;

    if (status === 'DELETED' || status === 'EXPIRED') {
      experience.isFeatured = false;
    }

    await experience.save();

    // Send notifications for status changes (non-blocking)
    void this.sendExperienceStatusNotification(experience, previousStatus, status, reason);

    return experience;
  }

  /**
   * Send notification when experience status changes
   */
  private async sendExperienceStatusNotification(
    experience: typeof Experience.prototype,
    previousStatus: string,
    newStatus: ExperienceStatus,
    reason?: string,
  ): Promise<void> {
    try {
      if (!experience.hubId) return;

      // Find the owner role first
      const ownerRole = await Role.findOne({
        key: SystemRoleKey.OWNER,
        scope: RoleScope.SYSTEM,
      }).lean();

      if (!ownerRole) return;

      // Get hub owner to send notification
      const [hub, hubOwner] = await Promise.all([
        Hub.findById(experience.hubId).select('name').lean(),
        HubMember.findOne({
          hubId: experience.hubId,
          roleIds: ownerRole._id,
          status: HubMemberStatus.ACTIVE,
        })
          .populate<{
            userId: { _id: unknown; name: string; email: string; phoneNumber?: string };
          }>('userId', 'name email phoneNumber')
          .lean(),
      ]);

      if (!hubOwner?.userId || typeof hubOwner.userId !== 'object') return;

      const owner = hubOwner.userId;
      const hubName = hub?.name || 'Your Hub';
      const experienceName = experience.experienceTitle || 'your experience';
      const experienceId = experience._id?.toString();
      const hubIdStr = experience.hubId?.toString();

      let templateId: string | null = null;

      // Determine which notification to send
      if (newStatus === 'ACTIVE' && previousStatus === 'DRAFTED') {
        // Experience was approved
        templateId = 'EXPERIENCE_APPROVED';
      } else if (newStatus === 'DELETED' && reason) {
        // Experience was rejected (deleted with a reason)
        templateId = 'EXPERIENCE_REJECTED';
      } else if (newStatus === 'EXPIRED') {
        // Experience expired
        templateId = 'EXPERIENCE_EXPIRING';
      }

      if (!templateId) return;

      // Format expiry date for EXPERIENCE_EXPIRING notification
      const expiryDate = experience.endDate
        ? new Date(experience.endDate).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        : '';

      await communicationTriggerService.triggerCommunicationWithUser({
        templateId,
        user: {
          _id: owner._id.toString(),
          name: owner.name,
          email: owner.email,
          phone: owner.phoneNumber,
        },
        hubId: hubIdStr,
        data: {
          userName: owner.name,
          hubName,
          experienceName,
          experienceId,
          reason: reason || '',
          rejectionReason: reason || '',
          expiryDate,
          experienceUrl: `/hub/experiences/${experienceId}`,
        },
      });
    } catch (error) {
      console.error('Failed to send experience status notification:', error);
    }
  }

  /**
   * Toggle experience featured status
   */
  async toggleExperienceFeatured(id: string) {
    const experience = await Experience.findById(id);
    if (!experience) {
      throw new Error('Experience not found');
    }

    if (experience.status !== 'ACTIVE' && !experience.isFeatured) {
      throw new Error('Only active experiences can be featured');
    }

    experience.isFeatured = !experience.isFeatured;
    await experience.save();

    return experience;
  }

  /**
   * Delete experience (soft delete)
   */
  async deleteExperience(id: string) {
    const experience = await Experience.findById(id);
    if (!experience) {
      throw new Error('Experience not found');
    }

    experience.status = 'DELETED';
    experience.isFeatured = false;
    await experience.save();

    return experience;
  }

  /**
   * Bulk update experience status
   */
  async bulkUpdateExperienceStatus(experienceIds: string[], status: ExperienceStatus) {
    const updateData: Record<string, unknown> = { status };

    if (status === 'DELETED' || status === 'EXPIRED') {
      updateData.isFeatured = false;
    }

    const result = await Experience.updateMany(
      { _id: { $in: experienceIds } },
      { $set: updateData },
    );

    return {
      modifiedCount: result.modifiedCount,
    };
  }

  /**
   * Update experience priority
   */
  async updateExperiencePriority(id: string, priority: number) {
    const experience = await Experience.findById(id);
    if (!experience) {
      throw new Error('Experience not found');
    }

    experience.priority = priority;
    await experience.save();

    return experience;
  }

  /**
   * Get experience events
   */
  async getExperienceEvents(
    id: string,
    options: { limit?: number; status?: 'ACTIVE' | 'CANCELLED' | 'DELETED'; upcoming?: boolean },
  ) {
    const { limit = 20, status = 'ACTIVE', upcoming = true } = options;

    const filter: Record<string, unknown> = { experienceId: id };
    if (status) filter.status = status;
    if (upcoming) filter.startTime = { $gte: new Date() };

    const events = await ExperienceEvent.find(filter).sort({ startTime: 1 }).limit(limit).lean();

    const experience = await Experience.findById(id)
      .select('schedules experienceTitle timeZone')
      .lean();

    const schedulesWithReadableRules =
      experience?.schedules?.map((schedule) => ({
        ...schedule,
        readableRule: this.parseRRuleToText(schedule.recurringRule),
      })) || [];

    return {
      events,
      schedules: schedulesWithReadableRules,
      total: events.length,
    };
  }

  /**
   * Parse rrule to human-readable text
   */
  private parseRRuleToText(recurringRule: string[]): string {
    if (!recurringRule || recurringRule.length < 2) {
      return 'No recurrence rule';
    }

    try {
      const rruleLine = recurringRule[1];
      if (!rruleLine) {
        return 'Invalid recurrence rule';
      }
      const rruleString = rruleLine.replace('RRULE:', '');
      const rule = RRule.fromString(rruleString);
      return rule.toText();
    } catch {
      return 'Unable to parse recurrence rule';
    }
  }
}

export const adminExperienceService = new AdminExperienceService();
