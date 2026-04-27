import type { AdminCreateSkillInput, AdminUpdateSkillInput } from '@schemas/admin';
import { skillService } from '@services/reference-data';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Skill Controllers
 */
export async function getAllSkills(
  request: FastifyRequest<{ Querystring: { includeInactive?: string } }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const includeInactive = request.query.includeInactive === 'true';
    const skills = await skillService.getAll(includeInactive);

    return reply.send({
      success: true,
      data: skills,
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to get skills');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'GET_SKILLS_FAILED',
        message: error instanceof Error ? error.message : 'Failed to get skills',
      },
    });
  }
}

export async function getSkillById(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const skill = await skillService.getById(request.params.id);

    if (!skill) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'SKILL_NOT_FOUND',
          message: 'Skill not found',
        },
      });
    }

    return reply.send({
      success: true,
      data: skill,
    });
  } catch (error) {
    request.log.error({ error, id: request.params.id }, 'Failed to get skill');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'GET_SKILL_FAILED',
        message: error instanceof Error ? error.message : 'Failed to get skill',
      },
    });
  }
}

export async function createSkill(
  request: FastifyRequest<{ Body: AdminCreateSkillInput }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const skill = await skillService.create(
      request.body as unknown as Parameters<typeof skillService.create>[0],
    );

    return reply.status(201).send({
      success: true,
      data: skill,
    });
  } catch (error) {
    request.log.error({ error, body: request.body }, 'Failed to create skill');

    if (error instanceof Error && error.message.includes('already exists')) {
      return reply.status(409).send({
        success: false,
        error: {
          code: 'SKILL_ALREADY_EXISTS',
          message: error.message,
        },
      });
    }

    return reply.status(500).send({
      success: false,
      error: {
        code: 'CREATE_SKILL_FAILED',
        message: error instanceof Error ? error.message : 'Failed to create skill',
      },
    });
  }
}

export async function updateSkill(
  request: FastifyRequest<{
    Params: { id: string };
    Body: AdminUpdateSkillInput;
  }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const skill = await skillService.update(
      request.params.id,
      request.body as unknown as Parameters<typeof skillService.update>[1],
    );

    if (!skill) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'SKILL_NOT_FOUND',
          message: 'Skill not found',
        },
      });
    }

    return reply.send({
      success: true,
      data: skill,
    });
  } catch (error) {
    request.log.error(
      { error, id: request.params.id, body: request.body },
      'Failed to update skill',
    );

    if (error instanceof Error && error.message.includes('already exists')) {
      return reply.status(409).send({
        success: false,
        error: {
          code: 'SKILL_ALREADY_EXISTS',
          message: error.message,
        },
      });
    }

    return reply.status(500).send({
      success: false,
      error: {
        code: 'UPDATE_SKILL_FAILED',
        message: error instanceof Error ? error.message : 'Failed to update skill',
      },
    });
  }
}

export async function deleteSkill(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const skill = await skillService.delete(request.params.id);

    if (!skill) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'SKILL_NOT_FOUND',
          message: 'Skill not found',
        },
      });
    }

    return reply.send({
      success: true,
      data: skill,
      message: 'Skill deactivated successfully',
    });
  } catch (error) {
    request.log.error({ error, id: request.params.id }, 'Failed to delete skill');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'DELETE_SKILL_FAILED',
        message: error instanceof Error ? error.message : 'Failed to delete skill',
      },
    });
  }
}

/**
 * Get skills by focus area (special endpoint for Skill)
 */
export async function getSkillsByFocusArea(
  request: FastifyRequest<{ Params: { focusAreaId: string } }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const skills = await skillService.getByFocusArea(request.params.focusAreaId);

    return reply.send({
      success: true,
      data: skills,
    });
  } catch (error) {
    request.log.error(
      { error, focusAreaId: request.params.focusAreaId },
      'Failed to get skills by focus area',
    );
    return reply.status(500).send({
      success: false,
      error: {
        code: 'GET_SKILLS_BY_FOCUS_AREA_FAILED',
        message: error instanceof Error ? error.message : 'Failed to get skills by focus area',
      },
    });
  }
}
