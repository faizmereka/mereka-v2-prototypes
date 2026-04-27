import { webJobService } from '@core/services/web/jobs';
import type { FastifyReply, FastifyRequest } from 'fastify';

// ============================================================================
// Types
// ============================================================================

interface AuthUser {
  sub: string; // MongoDB user ID from JWT
  email: string;
}

interface GetJobByIdParams {
  id: string;
}

interface ListJobsQuery {
  page?: number;
  limit?: number;
  category?: string;
  serviceType?: string;
  employmentType?: string;
  expertLevel?: string;
  jobLocation?: string;
  search?: string;
}

interface GetSimilarJobsQuery {
  limit?: number;
}

// ============================================================================
// Controllers
// ============================================================================

/**
 * Get job detail by ID
 * GET /jobs/:id
 * Uses optional auth - client info is only shown to authenticated users
 */
export async function getJobById(
  request: FastifyRequest<{ Params: GetJobByIdParams }>,
  reply: FastifyReply,
) {
  try {
    const { id } = request.params;
    const user = (request as unknown as { user?: AuthUser }).user;

    // Pass user info to service - client info shown only to authenticated users
    // The service will interpret any authenticated user as having access to client info
    // For stricter "expert-only" access, additional hub membership checks would be needed
    const job = await webJobService.getJobById({
      id,
      userId: user?.sub,
      userType: user ? 'expert' : undefined, // Treat all authenticated users as having access
    });

    if (!job) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'JOB_NOT_FOUND',
          message: 'Job not found or is not publicly available',
        },
      });
    }

    return reply.send({
      success: true,
      data: job,
    });
  } catch (error) {
    request.log.error({ error }, 'Error fetching job by ID');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch job',
      },
    });
  }
}

/**
 * List public jobs
 * GET /jobs
 */
export async function listJobs(
  request: FastifyRequest<{ Querystring: ListJobsQuery }>,
  reply: FastifyReply,
) {
  try {
    const result = await webJobService.listJobs(request.query);

    return reply.send({
      success: true,
      data: result.jobs,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    request.log.error({ error }, 'Error listing jobs');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to list jobs',
      },
    });
  }
}

/**
 * Get similar jobs
 * GET /jobs/:id/similar
 */
export async function getSimilarJobs(
  request: FastifyRequest<{ Params: GetJobByIdParams; Querystring: GetSimilarJobsQuery }>,
  reply: FastifyReply,
) {
  try {
    const { id } = request.params;
    const { limit = 6 } = request.query;

    const jobs = await webJobService.getSimilarJobs(id, limit);

    return reply.send({
      success: true,
      data: jobs,
    });
  } catch (error) {
    request.log.error({ error }, 'Error fetching similar jobs');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch similar jobs',
      },
    });
  }
}
