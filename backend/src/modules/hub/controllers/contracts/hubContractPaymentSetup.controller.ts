import { hubContractPaymentSetupService } from '@core/services/hub/contracts/hubContractPaymentSetup.service';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Get contract payment region and publishable key
 * Returns the Stripe region and publishable key for a contract
 */
export async function getContractPaymentRegion(
  request: FastifyRequest<{ Params: { contractId: string } }>,
  reply: FastifyReply,
) {
  try {
    const result = await hubContractPaymentSetupService.getContractRegion(
      request.params.contractId,
    );

    return reply.send({
      success: true,
      data: {
        region: result.region,
        stripePublishableKey: result.publishableKey,
      },
    });
  } catch (error) {
    request.log.error({ error, params: request.params }, 'Error getting contract payment region');
    const statusCode = error instanceof Error && error.message === 'Contract not found' ? 404 : 400;

    return reply.status(statusCode).send({
      success: false,
      error: {
        code: 'CONTRACT_PAYMENT_REGION_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get contract payment region',
      },
    });
  }
}

/**
 * Get payment methods for a contract
 * Returns available payment methods on the contract's regional platform
 */
export async function getContractPaymentMethods(
  request: FastifyRequest<{
    Params: { contractId: string };
    Querystring: { hubId: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const result = await hubContractPaymentSetupService.getPaymentMethods(
      request.params.contractId,
      request.query.hubId,
    );

    return reply.send({
      success: true,
      data: result,
    });
  } catch (error) {
    request.log.error(
      { error, params: request.params, query: request.query },
      'Error getting contract payment methods',
    );
    const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 400;

    return reply.status(statusCode).send({
      success: false,
      error: {
        code: 'CONTRACT_PAYMENT_METHODS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get payment methods',
      },
    });
  }
}

/**
 * Create setup intent for adding payment method
 * Creates a SetupIntent on the contract's regional Stripe platform
 */
export async function createContractPaymentSetup(
  request: FastifyRequest<{
    Params: { contractId: string };
    Body: { hubId: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const result = await hubContractPaymentSetupService.createPaymentSetup(
      request.params.contractId,
      request.body.hubId,
    );

    return reply.status(201).send({
      success: true,
      data: {
        clientSecret: result.clientSecret,
        customerId: result.customerId,
        region: result.region,
        stripePublishableKey: result.stripePublishableKey,
      },
    });
  } catch (error) {
    request.log.error(
      { error, params: request.params, body: request.body },
      'Error creating contract payment setup',
    );
    const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 400;

    return reply.status(statusCode).send({
      success: false,
      error: {
        code: 'CONTRACT_PAYMENT_SETUP_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create payment setup',
      },
    });
  }
}
