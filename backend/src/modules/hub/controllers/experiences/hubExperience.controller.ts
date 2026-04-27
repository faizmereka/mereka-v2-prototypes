import type { IExperience, IExperienceSchedule } from '@core/models/Experience';
import type { HubCreateExperienceInput, HubUpdateExperienceInput } from '@schemas/hub';
import { HubExperienceEventService, hubExperienceService } from '@services/hub';
import type { FastifyBaseLogger, FastifyReply, FastifyRequest } from 'fastify';

const hubExperienceEventService = new HubExperienceEventService();

/**
 * Create Experience
 */
export async function createExperience(
  request: FastifyRequest<{
    Params: { hubId: string };
    Body: HubCreateExperienceInput;
  }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    // Get hubId from route params and merge with body
    const { hubId } = request.params;
    // Transform 'Online' to 'Virtual' for experienceType compatibility
    const experienceType =
      request.body.experienceType === 'Online' ? 'Virtual' : request.body.experienceType;
    const experienceData = { ...request.body, hubId, experienceType } as Partial<IExperience>;

    const experience = await hubExperienceService.createExperience(experienceData);

    // Generate experienceEvents in background (don't block response)
    if (experience.schedules && experience.schedules.length > 0) {
      void generateExperienceEventsForExperience(experience, request.log);
    }

    return reply.status(201).send({
      success: true,
      data: experience,
    });
  } catch (error) {
    request.log.error({ error, body: request.body }, 'Error creating experience');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'EXPERIENCE_CREATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create experience',
      },
    });
  }
}

/**
 * Update Experience
 */
export async function updateExperience(
  request: FastifyRequest<{
    Params: { hubId: string; id: string };
    Body: HubUpdateExperienceInput;
  }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const { hubId, id } = request.params;
    const hubContext = request.hubContext;

    // Get existing experience to check for schedule changes
    const existingExperience = await hubExperienceService.getExperienceById(id);

    // Verify experience belongs to hub
    const experienceHubId = existingExperience?.hubId?.toString() ?? '';
    if (existingExperience && experienceHubId !== hubId) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Experience does not belong to this hub',
        },
      });
    }

    // For collaborators, check if they're a host of this experience
    if (existingExperience && hubContext && isCollaboratorOnly(hubContext.roles)) {
      if (
        !collaboratorHasAccessToExperience(
          existingExperience,
          hubContext.userId,
          hubContext.userEmail,
        )
      ) {
        return reply.status(403).send({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'You do not have access to edit this experience',
          },
        });
      }
    }

    // Transform 'Online' to 'Virtual' for experienceType compatibility
    const experienceType =
      request.body.experienceType === 'Online' ? 'Virtual' : request.body.experienceType;
    const updateData = { ...request.body, experienceType } as Partial<IExperience>;

    const experience = await hubExperienceService.updateExperience(id, updateData);

    // If schedules were updated, regenerate experienceEvents in background
    if (request.body.schedules && existingExperience) {
      void handleScheduleChanges(existingExperience, experience, request.log);
    }

    return reply.send({
      success: true,
      data: experience,
    });
  } catch (error) {
    request.log.error(
      { error, id: request.params.id, body: request.body },
      'Error updating experience',
    );
    return reply.status(400).send({
      success: false,
      error: {
        code: 'EXPERIENCE_UPDATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update experience',
      },
    });
  }
}

/**
 * Check if collaborator has access to experience (is a host)
 */
function collaboratorHasAccessToExperience(
  experience: IExperience,
  userId: string,
  userEmail: string,
): boolean {
  if (!experience.hostDetails || experience.hostDetails.length === 0) {
    return false;
  }
  return experience.hostDetails.some((host) => host.userId === userId || host.email === userEmail);
}

/**
 * Get Experience by ID or Slug
 * Returns basic experience data + overview stats (upcoming events, booking summary)
 */
export async function getExperienceById(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const param = request.params.id;
    const hubContext = request.hubContext;
    let experience: IExperience | null = null;

    // Check if param is a valid MongoDB ObjectId (24 hex characters)
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(param);

    if (isObjectId) {
      // Fetch by ID
      experience = await hubExperienceService.getExperienceById(param);
    } else {
      // Fetch by slug
      experience = await hubExperienceService.getExperienceBySlug(param);
    }

    if (!experience) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'EXPERIENCE_NOT_FOUND',
          message: 'Experience not found',
        },
      });
    }

    // For collaborators, check if they're a host of this experience
    if (hubContext && isCollaboratorOnly(hubContext.roles)) {
      if (!collaboratorHasAccessToExperience(experience, hubContext.userId, hubContext.userEmail)) {
        return reply.status(403).send({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'You do not have access to this experience',
          },
        });
      }
    }

    // Get overview data (upcoming events + stats) instead of all events
    const overviewData = await hubExperienceService.getExperienceOverview(experience);

    return reply.send({
      success: true,
      data: overviewData,
    });
  } catch (error) {
    request.log.error({ error, param: request.params.id }, 'Error fetching experience');
    return reply.status(404).send({
      success: false,
      error: {
        code: 'EXPERIENCE_NOT_FOUND',
        message: error instanceof Error ? error.message : 'Experience not found',
      },
    });
  }
}

/**
 * Get Experience Sessions/Events
 * Returns all events for an experience with pagination and filtering
 */
export async function getExperienceSessions(
  request: FastifyRequest<{
    Params: { hubId: string; id: string };
    Querystring: {
      filter?: 'all' | 'upcoming' | 'past';
      page?: number;
      limit?: number;
    };
  }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const { id, hubId } = request.params;
    const { filter = 'all', page = 1, limit = 20 } = request.query;

    // Verify experience exists and belongs to hub
    const experience = await hubExperienceService.getExperienceById(id);
    if (!experience) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'EXPERIENCE_NOT_FOUND',
          message: 'Experience not found',
        },
      });
    }

    // Normalize hubId for comparison (handles ObjectId vs string)
    const experienceHubId = experience.hubId?.toString?.() ?? String(experience.hubId);
    if (experienceHubId !== hubId) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Experience does not belong to this hub',
        },
      });
    }

    // Get sessions with pagination
    const result = await hubExperienceService.getExperienceSessions(id, {
      filter,
      page,
      limit,
    });

    return reply.send({
      success: true,
      data: result,
    });
  } catch (error) {
    request.log.error({ error, id: request.params.id }, 'Error fetching experience sessions');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'SESSIONS_FETCH_ERROR',
        message: 'Failed to fetch experience sessions',
      },
    });
  }
}

/**
 * Check if user is collaborator-only (has collaborator role but not owner/admin)
 */
function isCollaboratorOnly(roles: string[]): boolean {
  const hasCollaborator = roles.includes('collaborator');
  const hasOwner = roles.includes('owner');
  const hasAdmin = roles.includes('admin');
  return hasCollaborator && !hasOwner && !hasAdmin;
}

/**
 * List Hub Experiences
 * For collaborators, only shows experiences they're a host of
 */
export async function listHubExperiences(
  request: FastifyRequest<{
    Params: { hubId: string };
    Querystring: {
      status?: string;
      listingType?: string;
      page?: number;
      limit?: number;
    };
  }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const { hubId } = request.params;
    const { status, listingType, page = 1, limit = 20 } = request.query;
    const hubContext = request.hubContext;

    // For collaborators, filter to only their assigned experiences
    const collaboratorFilter =
      hubContext && isCollaboratorOnly(hubContext.roles)
        ? { userId: hubContext.userId, userEmail: hubContext.userEmail }
        : undefined;

    const result = await hubExperienceService.listHubExperiences(hubId, {
      status,
      listingType,
      page,
      limit,
      collaboratorFilter,
    });

    return reply.send({
      success: true,
      data: result,
    });
  } catch (error) {
    request.log.error({ error, hubId: request.params.hubId }, 'Error listing experiences');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'EXPERIENCE_LIST_ERROR',
        message: 'Failed to list experiences',
      },
    });
  }
}

/**
 * Delete Experience (soft delete)
 */
export async function deleteExperience(
  request: FastifyRequest<{ Params: { hubId: string; id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const { id, hubId } = request.params;

    // Verify experience belongs to hub
    const experience = await hubExperienceService.getExperienceById(id);
    if (!experience) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'EXPERIENCE_NOT_FOUND',
          message: 'Experience not found',
        },
      });
    }

    // Normalize hubId for comparison (handles ObjectId vs string)
    const experienceHubId = experience.hubId?.toString?.() ?? String(experience.hubId);
    if (experienceHubId !== hubId) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Experience does not belong to this hub',
        },
      });
    }

    // Soft delete by setting status to DELETED
    await hubExperienceService.updateExperience(id, { status: 'DELETED' });

    return reply.send({
      success: true,
      data: { deleted: true },
    });
  } catch (error) {
    request.log.error({ error, id: request.params.id }, 'Error deleting experience');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'EXPERIENCE_DELETE_ERROR',
        message: 'Failed to delete experience',
      },
    });
  }
}

/**
 * Check Slug Availability
 */
export async function checkExperienceSlugAvailability(
  request: FastifyRequest<{
    Querystring: { slug: string; excludeId?: string };
  }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const { slug, excludeId } = request.query;
    const isAvailable = await hubExperienceService.isSlugAvailable(slug, excludeId);
    return reply.send({
      success: true,
      data: {
        slug,
        available: isAvailable,
      },
    });
  } catch (error) {
    request.log.error({ error, query: request.query }, 'Error checking slug');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'SLUG_CHECK_ERROR',
        message: 'Failed to check slug availability',
      },
    });
  }
}

/**
 * Generate experienceEvents for an experience (background job)
 */
async function generateExperienceEventsForExperience(
  experience: IExperience,
  logger: FastifyBaseLogger,
): Promise<void> {
  try {
    const allEventIds: string[] = [];

    for (const schedule of experience.schedules || []) {
      // Generate events for this schedule
      const events = hubExperienceEventService.generateExperienceEvents(
        String(experience._id),
        schedule,
        experience.experienceDuration || 0,
        experience.timeZone || 'UTC',
      );

      // Save events to database
      const createdEvents = await hubExperienceEventService.createExperienceEvents(events);

      // Collect event IDs
      allEventIds.push(...createdEvents.map((e) => String(e._id)));
    }

    logger.info(
      { experienceId: String(experience._id), eventCount: allEventIds.length },
      'Generated experienceEvents',
    );
  } catch (error) {
    logger.error({ error, experienceId: experience._id }, 'Error generating experienceEvents');
  }
}

/**
 * Handle schedule changes (background job)
 */
async function handleScheduleChanges(
  oldExperience: IExperience,
  newExperience: IExperience,
  logger: FastifyBaseLogger,
): Promise<void> {
  try {
    const oldSchedules = oldExperience.schedules || [];
    const newSchedules = newExperience.schedules || [];

    // Check for new or modified schedules
    for (const newSchedule of newSchedules) {
      const oldSchedule = oldSchedules.find((s) => s.uid === newSchedule.uid);

      if (!oldSchedule) {
        // New schedule added - generate events
        logger.info(
          { experienceId: newExperience._id, scheduleId: newSchedule.uid },
          'New schedule added, generating events',
        );

        const events = hubExperienceEventService.generateExperienceEvents(
          String(newExperience._id),
          newSchedule,
          newExperience.experienceDuration || 0,
          newExperience.timeZone || 'UTC',
        );

        logger.info(
          {
            experienceId: newExperience._id,
            scheduleId: newSchedule.uid,
            eventCount: events.length,
          },
          'Events generated, saving to database',
        );

        const createdEvents = await hubExperienceEventService.createExperienceEvents(events);

        logger.info(
          {
            experienceId: newExperience._id,
            scheduleId: newSchedule.uid,
            savedCount: createdEvents.length,
          },
          'Events saved successfully',
        );
      } else if (hasScheduleChanged(oldSchedule, newSchedule)) {
        // Schedule modified - regenerate events
        logger.info(
          { experienceId: newExperience._id, scheduleId: newSchedule.uid },
          'Schedule modified, regenerating events',
        );

        await hubExperienceEventService.updateExperienceEventsForSchedule(
          String(newExperience._id),
          newSchedule.uid,
          newSchedule,
          newExperience.experienceDuration || 0,
          newExperience.timeZone || 'UTC',
        );
      }
    }

    // Check for deleted schedules
    for (const oldSchedule of oldSchedules) {
      const stillExists = newSchedules.find((s) => s.uid === oldSchedule.uid);

      if (!stillExists) {
        // Schedule removed - soft delete events
        logger.info(
          { experienceId: newExperience._id, scheduleId: oldSchedule.uid },
          'Schedule removed, deleting events',
        );

        await hubExperienceEventService.deleteExperienceEventsForSchedule(
          String(newExperience._id),
          oldSchedule.uid,
        );
      }
    }
  } catch (error) {
    logger.error({ error, experienceId: newExperience._id }, 'Error handling schedule changes');
  }
}

/**
 * Check if schedule has changed
 */
function hasScheduleChanged(
  oldSchedule: IExperienceSchedule,
  newSchedule: IExperienceSchedule,
): boolean {
  // Compare dates as timestamps to handle Date vs string comparison
  const oldStartTime = new Date(oldSchedule.startDate).getTime();
  const newStartTime = new Date(newSchedule.startDate).getTime();
  const oldEndTime = oldSchedule.endDate ? new Date(oldSchedule.endDate).getTime() : null;
  const newEndTime = newSchedule.endDate ? new Date(newSchedule.endDate).getTime() : null;

  return (
    oldStartTime !== newStartTime ||
    oldEndTime !== newEndTime ||
    oldSchedule.recurringType !== newSchedule.recurringType ||
    JSON.stringify(oldSchedule.recurringRule) !== JSON.stringify(newSchedule.recurringRule)
  );
}
