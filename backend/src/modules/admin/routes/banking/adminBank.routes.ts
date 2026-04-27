import {
  approveBank,
  createBank,
  deleteBank,
  getBankById,
  listActiveBanks,
  listBanks,
  listBanksByCountry,
  listPendingBanks,
  rejectBank,
  updateBank,
} from '@controllers/admin';
import { requireAdminAuth } from '@core/middlewares/adminAuth.middleware';
import {
  adminBankCountryCodeSchema,
  adminBankIdSchema,
  adminCreateBankSchema,
  adminListBanksQuerySchema,
  adminUpdateBankSchema,
} from '@schemas/admin';
import type { FastifyInstance } from 'fastify';

/**
 * Admin Bank Routes
 */
export async function adminBankRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/v1/banks - List all banks with filtering
  fastify.get('/', {
    schema: {
      tags: ['Banks'],
      summary: 'Get all banks',
      description: 'List all banks with optional filtering by country code and active status',
      querystring: adminListBanksQuerySchema.querystring,
    },
    handler: listBanks,
  });

  // GET /api/v1/banks/active - List all active banks
  fastify.get('/active', {
    schema: {
      tags: ['Banks'],
      summary: 'Get active banks',
      description: 'List all active and approved banks for dropdown selection',
    },
    handler: listActiveBanks,
  });

  // GET /api/v1/banks/pending - List pending banks for admin approval
  fastify.get('/pending', {
    preHandler: [requireAdminAuth],
    schema: {
      tags: ['Banks'],
      summary: 'Get pending banks',
      description: 'List all banks pending super admin approval',
      security: [{ bearerAuth: [] }],
    },
    handler: listPendingBanks,
  });

  // GET /api/v1/banks/country/:countryCode - List banks by country
  fastify.get('/country/:countryCode', {
    schema: {
      tags: ['Banks'],
      summary: 'Get banks by country',
      description: 'List all active banks for a specific country code',
      params: adminBankCountryCodeSchema.params,
    },
    handler: listBanksByCountry,
  });

  // GET /api/v1/banks/:id - Get bank by ID
  fastify.get('/:id', {
    schema: {
      tags: ['Banks'],
      summary: 'Get bank by ID',
      params: adminBankIdSchema.params,
    },
    handler: getBankById,
  });

  // POST /api/v1/banks - Create new bank
  fastify.post('/', {
    preHandler: [requireAdminAuth],
    schema: {
      tags: ['Banks'],
      summary: 'Create new bank',
      description: 'Create a new bank entry (admin only)',
      body: adminCreateBankSchema.body,
      security: [{ bearerAuth: [] }],
    },
    handler: createBank,
  });

  // PATCH /api/v1/banks/:id - Update bank
  fastify.patch('/:id', {
    preHandler: [requireAdminAuth],
    schema: {
      tags: ['Banks'],
      summary: 'Update bank',
      description: 'Update an existing bank entry (admin only)',
      params: adminUpdateBankSchema.params,
      body: adminUpdateBankSchema.body,
      security: [{ bearerAuth: [] }],
    },
    handler: updateBank,
  });

  // DELETE /api/v1/banks/:id - Soft delete bank
  fastify.delete('/:id', {
    preHandler: [requireAdminAuth],
    schema: {
      tags: ['Banks'],
      summary: 'Delete bank',
      description: 'Soft delete a bank (sets isActive to false)',
      params: adminBankIdSchema.params,
      security: [{ bearerAuth: [] }],
    },
    handler: deleteBank,
  });

  // POST /api/v1/banks/:id/approve - Approve a pending bank
  fastify.post('/:id/approve', {
    preHandler: [requireAdminAuth],
    schema: {
      tags: ['Banks'],
      summary: 'Approve bank',
      description: 'Approve a pending bank (super admin only)',
      params: adminBankIdSchema.params,
      security: [{ bearerAuth: [] }],
    },
    handler: approveBank,
  });

  // POST /api/v1/banks/:id/reject - Reject a pending bank
  fastify.post('/:id/reject', {
    preHandler: [requireAdminAuth],
    schema: {
      tags: ['Banks'],
      summary: 'Reject bank',
      description: 'Reject a pending bank (super admin only)',
      params: adminBankIdSchema.params,
      security: [{ bearerAuth: [] }],
    },
    handler: rejectBank,
  });
}
