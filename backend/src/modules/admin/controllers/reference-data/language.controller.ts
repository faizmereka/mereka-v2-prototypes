import type { AdminCreateLanguageInput, AdminUpdateLanguageInput } from '@schemas/admin';
import type { ListLanguagesQuery } from '@services/reference-data';
import { languageService } from '@services/reference-data';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Language Controllers
 */
export async function createLanguage(
  request: FastifyRequest<{ Body: AdminCreateLanguageInput }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const language = await languageService.createLanguage(request.body);
    return reply.status(201).send({
      success: true,
      data: language,
    });
  } catch (error) {
    request.log.error({ error }, 'Error creating language');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'LANGUAGE_CREATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create language',
      },
    });
  }
}

export async function listLanguages(
  request: FastifyRequest<{ Querystring: ListLanguagesQuery }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const result = await languageService.listLanguages(request.query);
    return reply.send({
      success: true,
      data: result.languages,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    request.log.error({ error }, 'Error listing languages');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'LANGUAGE_LIST_ERROR',
        message: 'Failed to list languages',
      },
    });
  }
}

export async function listActiveLanguages(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    const languages = await languageService.listActiveLanguages();
    return reply.send({
      success: true,
      data: languages,
    });
  } catch (error) {
    request.log.error({ error }, 'Error listing active languages');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'LANGUAGE_LIST_ERROR',
        message: 'Failed to list active languages',
      },
    });
  }
}

export async function getLanguageById(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const language = await languageService.getLanguageById(request.params.id);

    if (!language) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'LANGUAGE_NOT_FOUND',
          message: 'Language not found',
        },
      });
    }

    return reply.send({
      success: true,
      data: language,
    });
  } catch (error) {
    request.log.error({ error }, 'Error getting language');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'LANGUAGE_GET_ERROR',
        message: 'Failed to get language',
      },
    });
  }
}

export async function updateLanguage(
  request: FastifyRequest<{
    Params: { id: string };
    Body: AdminUpdateLanguageInput;
  }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const language = await languageService.updateLanguage(request.params.id, request.body);
    return reply.send({
      success: true,
      data: language,
    });
  } catch (error) {
    request.log.error({ error }, 'Error updating language');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'LANGUAGE_UPDATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update language',
      },
    });
  }
}

export async function deleteLanguage(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    await languageService.deleteLanguage(request.params.id);
    return reply.send({
      success: true,
      message: 'Language deactivated successfully',
    });
  } catch (error) {
    request.log.error({ error }, 'Error deleting language');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'LANGUAGE_DELETE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to delete language',
      },
    });
  }
}
