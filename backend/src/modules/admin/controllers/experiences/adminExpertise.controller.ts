import { Expertise, type ExpertiseStatus } from '@core/models/Expertise';
import { Hub } from '@core/models/Hub';
import { User } from '@core/models/User';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { PipelineStage } from 'mongoose';

/**
 * Get expertise statistics for admin dashboard
 */
export async function getExpertiseStats(_request: FastifyRequest, reply: FastifyReply) {
  try {
    const [total, statusCounts, recentExpertise] = await Promise.all([
      Expertise.countDocuments(),
      Expertise.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Expertise.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('expertiseTitle coverPhoto createdAt status hubId')
        .lean(),
    ]);

    // Convert aggregation results to object
    const byStatus: Record<string, number> = {
      draft: 0,
      published: 0,
      archived: 0,
    };

    for (const item of statusCounts) {
      if (item._id in byStatus) {
        byStatus[item._id] = item.count;
      }
    }

    return reply.status(200).send({
      success: true,
      data: {
        total,
        byStatus,
        toReview: byStatus.draft, // Drafted expertise may need review
        published: byStatus.published,
        recentExpertise,
      },
    });
  } catch (error) {
    _request.log.error({ error }, 'Failed to get expertise stats');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'EXPERTISE_STATS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get expertise stats',
      },
    });
  }
}

/**
 * List all expertises with filtering and pagination
 */
export async function listExpertises(
  request: FastifyRequest<{
    Querystring: {
      page?: number;
      limit?: number;
      status?: string;
      search?: string;
      hubId?: string;
      dateFrom?: string;
      dateTo?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    };
  }>,
  reply: FastifyReply,
) {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      search,
      hubId,
      dateFrom,
      dateTo,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = request.query;

    const skip = (page - 1) * limit;

    // Build match filter
    const matchFilter: Record<string, unknown> = {};
    if (status) matchFilter.status = status;
    if (hubId) matchFilter.hubId = hubId;
    if (search) {
      matchFilter.$or = [
        { expertiseTitle: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
        { expertiseSummary: { $regex: search, $options: 'i' } },
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

    // Build aggregation pipeline
    const pipeline: PipelineStage[] = [
      { $match: matchFilter },
      {
        $facet: {
          totalCount: [{ $count: 'count' }],
          data: [
            { $sort: sort },
            { $skip: skip },
            { $limit: limit },
            // Lookup hub details
            {
              $lookup: {
                from: 'hubs',
                localField: 'hubId',
                foreignField: '_id',
                as: 'hubData',
                pipeline: [{ $project: { _id: 1, name: 1, logo: 1, slug: 1 } }],
              },
            },
            // Lookup creator details
            {
              $lookup: {
                from: 'users',
                localField: 'createdBy',
                foreignField: '_id',
                as: 'creatorData',
                pipeline: [{ $project: { _id: 1, name: 1, email: 1, profilePhoto: 1 } }],
              },
            },
            // Project final shape
            {
              $project: {
                _id: 1,
                expertiseTitle: 1,
                slug: 1,
                expertiseSummary: 1,
                coverPhoto: 1,
                status: 1,
                currency: 1,
                ticket: 1,
                host: 1,
                rating: 1,
                primaryLanguage: 1,
                createdAt: 1,
                updatedAt: 1,
                hubId: 1,
                createdBy: 1,
                hub: { $arrayElemAt: ['$hubData', 0] },
                creator: { $arrayElemAt: ['$creatorData', 0] },
              },
            },
          ],
        },
      },
    ];

    // Execute aggregation
    const [result] = await Expertise.aggregate(pipeline);

    const total = result.totalCount[0]?.count || 0;
    const expertises = result.data || [];

    return reply.status(200).send({
      success: true,
      data: expertises,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to list expertises');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'LIST_EXPERTISES_ERROR',
        message: error instanceof Error ? error.message : 'Failed to list expertises',
      },
    });
  }
}

/**
 * Get expertise by ID with full details
 */
export async function getExpertiseById(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    const expertise = await Expertise.findById(request.params.id).lean();

    if (!expertise) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'EXPERTISE_NOT_FOUND',
          message: 'Expertise not found',
        },
      });
    }

    // Get hub details
    const hub = await Hub.findById(expertise.hubId).select('name logo slug').lean();

    // Get creator details
    const creator = await User.findById(expertise.createdBy)
      .select('name email profilePhoto')
      .lean();

    return reply.status(200).send({
      success: true,
      data: {
        ...expertise,
        hub,
        creator,
      },
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to get expertise');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'GET_EXPERTISE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get expertise',
      },
    });
  }
}

/**
 * Update expertise status
 */
export async function updateExpertiseStatus(
  request: FastifyRequest<{
    Params: { id: string };
    Body: { status: ExpertiseStatus; reason?: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const { status } = request.body;

    const expertise = await Expertise.findById(request.params.id);
    if (!expertise) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'EXPERTISE_NOT_FOUND',
          message: 'Expertise not found',
        },
      });
    }

    expertise.status = status;
    await expertise.save();

    return reply.status(200).send({
      success: true,
      data: expertise,
      message: `Expertise status updated to ${status}`,
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to update expertise status');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'UPDATE_EXPERTISE_STATUS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update expertise status',
      },
    });
  }
}

/**
 * Delete expertise (hard delete)
 */
export async function deleteExpertise(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    const expertise = await Expertise.findByIdAndDelete(request.params.id);
    if (!expertise) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'EXPERTISE_NOT_FOUND',
          message: 'Expertise not found',
        },
      });
    }

    return reply.status(200).send({
      success: true,
      message: 'Expertise deleted successfully',
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to delete expertise');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'DELETE_EXPERTISE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to delete expertise',
      },
    });
  }
}

/**
 * Bulk update expertise status
 */
export async function bulkUpdateExpertiseStatus(
  request: FastifyRequest<{
    Body: { expertiseIds: string[]; status: ExpertiseStatus };
  }>,
  reply: FastifyReply,
) {
  try {
    const { expertiseIds, status } = request.body;

    const result = await Expertise.updateMany(
      { _id: { $in: expertiseIds } },
      { $set: { status, lastModified: new Date() } },
    );

    return reply.status(200).send({
      success: true,
      data: {
        modifiedCount: result.modifiedCount,
      },
      message: `${result.modifiedCount} expertises updated to ${status}`,
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to bulk update expertise status');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'BULK_UPDATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to bulk update expertises',
      },
    });
  }
}
