import { Contract } from '@core/models/Contract';
import { Hub } from '@core/models/Hub';
import { User } from '@core/models/User';
import { StripeServiceFactory } from '@core/services/shared/payments/stripeFactory.service';
import { getStripeRegion, type StripeRegion } from '@core/utils/stripe-region';

/**
 * Contract Payment Setup Service
 *
 * Handles setting up payment methods for contract milestone/timelog payments.
 * Uses the expert's regional Stripe platform.
 */
export class HubContractPaymentSetupService {
  /**
   * Get expert's Stripe region for a contract
   * Uses expert's hub region if they belong to one, otherwise their own region
   */
  async getContractRegion(contractId: string): Promise<{
    region: StripeRegion;
    publishableKey: string;
  }> {
    const contract = await Contract.findById(contractId)
      .select('asssignedExpertId expertHubId')
      .lean();

    if (!contract) {
      throw new Error('Contract not found');
    }

    // Determine expert's region
    let region: StripeRegion = 'atlas';

    // First check expert's hub
    if (contract.expertHubId) {
      const expertHub = await Hub.findById(contract.expertHubId)
        .select('stripeRegion location')
        .lean();

      if (expertHub?.stripeRegion === 'malaysia' || expertHub?.stripeRegion === 'atlas') {
        region = expertHub.stripeRegion;
      } else if (expertHub?.location?.country) {
        region = getStripeRegion(expertHub.location.country);
      }
    } else if (contract.asssignedExpertId) {
      // Fall back to expert's own region
      const expert = await User.findById(contract.asssignedExpertId)
        .select('stripeRegion location')
        .lean();

      if (expert?.stripeRegion === 'malaysia' || expert?.stripeRegion === 'atlas') {
        region = expert.stripeRegion;
      } else if (expert?.location?.country) {
        region = getStripeRegion(expert.location.country);
      }
    }

    return {
      region,
      publishableKey: StripeServiceFactory.getPublishableKey(region),
    };
  }

  /**
   * Get or create Stripe customer for client on expert's regional platform
   */
  async getOrCreateCustomer(
    contractId: string,
    clientHubId: string,
  ): Promise<{
    customerId: string;
    region: StripeRegion;
    publishableKey: string;
  }> {
    const { region, publishableKey } = await this.getContractRegion(contractId);
    const stripeService = StripeServiceFactory.getService(region);

    // Get client hub
    const clientHub = await Hub.findById(clientHubId).lean();
    if (!clientHub) {
      throw new Error('Client hub not found');
    }

    // Check if hub already has a customer ID for this region
    const customerField = region === 'malaysia' ? 'stripeCustomerIdMY' : 'stripeCustomerIdAtlas';
    let customerId = (clientHub as Record<string, unknown>)[customerField] as string | undefined;

    if (!customerId) {
      // Create customer on regional platform
      const customer = await stripeService.getStripeInstance().customers.create({
        email: clientHub.socialLinks?.email || undefined,
        name: clientHub.name,
        metadata: {
          hubId: clientHubId,
          region,
          type: 'hub',
        },
      });

      customerId = customer.id;

      // Save customer ID to hub (we'd need to add these fields to the Hub model)
      // For now, we'll store it in a generic way
      await Hub.findByIdAndUpdate(clientHubId, {
        $set: { [`stripeCustomers.${region}`]: customerId },
      });
    }

    return {
      customerId,
      region,
      publishableKey,
    };
  }

  /**
   * Create SetupIntent for adding payment method on expert's regional platform
   */
  async createPaymentSetup(
    contractId: string,
    clientHubId: string,
  ): Promise<{
    clientSecret: string;
    customerId: string;
    region: StripeRegion;
    stripePublishableKey: string;
  }> {
    const { region, publishableKey } = await this.getContractRegion(contractId);
    const stripeService = StripeServiceFactory.getService(region);

    // Get or create customer
    const { customerId } = await this.getOrCreateCustomer(contractId, clientHubId);

    // Create SetupIntent
    const setupIntent = await stripeService.getStripeInstance().setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      metadata: {
        contractId,
        clientHubId,
        region,
        purpose: 'contract_payment',
      },
    });

    return {
      clientSecret: setupIntent.client_secret!,
      customerId,
      region,
      stripePublishableKey: publishableKey,
    };
  }

  /**
   * Get client's payment methods for a contract's regional platform
   */
  async getPaymentMethods(
    contractId: string,
    clientHubId: string,
  ): Promise<{
    paymentMethods: Array<{
      id: string;
      brand: string;
      last4: string;
      expMonth: number;
      expYear: number;
      isDefault: boolean;
    }>;
    customerId: string | null;
    region: StripeRegion;
    stripePublishableKey: string;
  }> {
    const { region, publishableKey } = await this.getContractRegion(contractId);
    const stripeService = StripeServiceFactory.getService(region);

    // Get client hub
    const clientHub = await Hub.findById(clientHubId).lean();
    if (!clientHub) {
      throw new Error('Client hub not found');
    }

    // Check if hub has a customer ID for this region
    const stripeCustomers = (clientHub as Record<string, unknown>).stripeCustomers as
      | Record<string, string>
      | undefined;
    const customerId = stripeCustomers?.[region];

    if (!customerId) {
      return {
        paymentMethods: [],
        customerId: null,
        region,
        stripePublishableKey: publishableKey,
      };
    }

    // Get payment methods
    const paymentMethods = await stripeService.getStripeInstance().paymentMethods.list({
      customer: customerId,
      type: 'card',
    });

    // Get customer to check default payment method
    const customer = await stripeService.getStripeInstance().customers.retrieve(customerId);
    const defaultPaymentMethodId =
      'invoice_settings' in customer ? customer.invoice_settings?.default_payment_method : null;

    return {
      paymentMethods: paymentMethods.data.map((pm) => ({
        id: pm.id,
        brand: pm.card?.brand || 'unknown',
        last4: pm.card?.last4 || '****',
        expMonth: pm.card?.exp_month || 0,
        expYear: pm.card?.exp_year || 0,
        isDefault: pm.id === defaultPaymentMethodId,
      })),
      customerId,
      region,
      stripePublishableKey: publishableKey,
    };
  }
}

export const hubContractPaymentSetupService = new HubContractPaymentSetupService();
