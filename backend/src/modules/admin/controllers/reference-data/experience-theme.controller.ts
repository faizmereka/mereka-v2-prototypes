import type {
  AdminCreateExperienceThemeInput,
  AdminListExperienceThemesQuery,
  AdminUpdateExperienceThemeInput,
} from '@schemas/admin';
import { experienceThemeService } from '@services/reference-data';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Experience Theme Controllers
 */
export async function createExperienceTheme(
  request: FastifyRequest<{ Body: AdminCreateExperienceThemeInput }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const theme = await experienceThemeService.createTheme(request.body);
    return reply.status(201).send({
      success: true,
      data: theme,
    });
  } catch (error) {
    request.log.error({ error }, 'Error creating experience theme');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'THEME_CREATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create theme',
      },
    });
  }
}

export async function getExperienceThemeById(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const theme = await experienceThemeService.getThemeById(request.params.id);
    if (!theme) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'THEME_NOT_FOUND',
          message: 'Theme not found',
        },
      });
    }
    return reply.send({
      success: true,
      data: theme,
    });
  } catch (error) {
    request.log.error({ error }, 'Error getting experience theme');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'THEME_GET_ERROR',
        message: 'Failed to get theme',
      },
    });
  }
}

export async function listExperienceThemes(
  request: FastifyRequest<{ Querystring: AdminListExperienceThemesQuery }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const result = await experienceThemeService.listThemes(request.query);
    return reply.send({
      success: true,
      data: result.themes,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    request.log.error({ error }, 'Error listing experience themes');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'THEME_LIST_ERROR',
        message: 'Failed to list themes',
      },
    });
  }
}

export async function listActiveExperienceThemes(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    const themes = await experienceThemeService.listActiveThemes();
    return reply.send({
      success: true,
      data: themes,
    });
  } catch (error) {
    request.log.error({ error }, 'Error listing active experience themes');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'THEME_LIST_ERROR',
        message: 'Failed to list active themes',
      },
    });
  }
}

export async function updateExperienceTheme(
  request: FastifyRequest<{
    Params: { id: string };
    Body: AdminUpdateExperienceThemeInput;
  }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const theme = await experienceThemeService.updateTheme(request.params.id, request.body);
    return reply.send({
      success: true,
      data: theme,
    });
  } catch (error) {
    request.log.error({ error }, 'Error updating experience theme');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'THEME_UPDATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update theme',
      },
    });
  }
}

export async function deleteExperienceTheme(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    await experienceThemeService.deleteTheme(request.params.id);
    return reply.send({
      success: true,
      message: 'Theme deleted successfully',
    });
  } catch (error) {
    request.log.error({ error }, 'Error deleting experience theme');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'THEME_DELETE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to delete theme',
      },
    });
  }
}
