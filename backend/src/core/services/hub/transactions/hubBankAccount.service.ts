import { Bank, BankApprovalStatus } from '@core/models/Bank';
import { Hub } from '@core/models/Hub';
import { StripeServiceFactory } from '@core/services/shared/payments/stripeFactory.service';
import type Stripe from 'stripe';

/**
 * Bank account interface
 */
export interface BankAccountItem {
  id: string;
  bankName: string;
  last4: string;
  accountHolderName: string;
  accountHolderType: 'individual' | 'company';
  currency: string;
  country: string;
  isDefault: boolean;
  status: 'new' | 'validated' | 'verified' | 'verification_failed' | 'errored';
  createdAt?: Date;
}

/**
 * Bank account list response
 */
export interface BankAccountListResponse {
  bankAccounts: BankAccountItem[];
  defaultBankAccountId?: string;
}

/**
 * Add bank account request
 */
export interface AddBankAccountRequest {
  accountNumber: string;
  routingNumber: string; // Bank code / Swift code
  accountHolderName: string;
  accountHolderType: 'individual' | 'company';
  currency?: string; // Default: MYR
  country?: string; // Default: MY
  setAsDefault?: boolean;
}

/**
 * Hub Bank Account Service
 *
 * Manages external bank accounts for Hub withdrawals.
 * Uses Stripe's External Accounts API.
 */
export class HubBankAccountService {
  /**
   * Get Hub's Stripe info - reads from Hub directly
   */
  private async getHubStripeInfo(hubId: string): Promise<{
    stripeAccountId: string | null;
    hub: {
      stripeAccountId?: string;
      stripeRegion?: string;
      location?: { country?: string };
    } | null;
  }> {
    const hub = await Hub.findById(hubId).select('stripeAccountId stripeRegion location').lean();
    return {
      stripeAccountId: hub?.stripeAccountId || null,
      hub: hub as {
        stripeAccountId?: string;
        stripeRegion?: string;
        location?: { country?: string };
      } | null,
    };
  }

  /**
   * Add a bank account to Hub's Stripe account
   * Uses regional Stripe service based on hub's stripeRegion
   */
  async addBankAccount(hubId: string, request: AddBankAccountRequest): Promise<BankAccountItem> {
    const { stripeAccountId, hub } = await this.getHubStripeInfo(hubId);

    if (!stripeAccountId || !hub) {
      throw new Error('Hub does not have a Stripe account');
    }

    // Get regional Stripe service
    const regionalStripeService = StripeServiceFactory.getServiceForHub(hub);

    // Create external account (bank account) in Stripe
    const bankAccountParams: Stripe.AccountCreateExternalAccountParams = {
      external_account: {
        object: 'bank_account',
        account_number: request.accountNumber,
        routing_number: request.routingNumber,
        account_holder_name: request.accountHolderName,
        account_holder_type: request.accountHolderType,
        currency: (request.currency || 'MYR').toLowerCase(),
        country: request.country || 'MY',
      },
      // Only set default_for_currency if true (Stripe doesn't allow setting it to false)
      ...(request.setAsDefault && { default_for_currency: true }),
    };

    const externalAccount = await regionalStripeService
      .getStripeInstance()
      .accounts.createExternalAccount(stripeAccountId, bankAccountParams);

    return this.mapStripeBankAccount(externalAccount as Stripe.BankAccount);
  }

  /**
   * Get list of bank accounts for Hub
   * Uses regional Stripe service based on hub's stripeRegion
   */
  async getBankAccounts(hubId: string): Promise<BankAccountListResponse> {
    const { stripeAccountId, hub } = await this.getHubStripeInfo(hubId);

    if (!stripeAccountId || !hub) {
      return {
        bankAccounts: [],
      };
    }

    // Get regional Stripe service
    const regionalStripeService = StripeServiceFactory.getServiceForHub(hub);

    // Fetch external accounts from Stripe
    const externalAccounts = await regionalStripeService
      .getStripeInstance()
      .accounts.listExternalAccounts(stripeAccountId, {
        object: 'bank_account',
        limit: 10,
      });

    const bankAccounts = externalAccounts.data
      .filter((ea): ea is Stripe.BankAccount => ea.object === 'bank_account')
      .map((ba) => this.mapStripeBankAccount(ba));

    // Find default account
    const defaultAccount = bankAccounts.find((ba) => ba.isDefault);

    return {
      bankAccounts,
      defaultBankAccountId: defaultAccount?.id,
    };
  }

  /**
   * Get single bank account details
   * Uses regional Stripe service based on hub's stripeRegion
   */
  async getBankAccount(hubId: string, bankAccountId: string): Promise<BankAccountItem | null> {
    const { stripeAccountId, hub } = await this.getHubStripeInfo(hubId);

    if (!stripeAccountId || !hub) {
      return null;
    }

    // Get regional Stripe service
    const regionalStripeService = StripeServiceFactory.getServiceForHub(hub);

    try {
      const externalAccount = await regionalStripeService
        .getStripeInstance()
        .accounts.retrieveExternalAccount(stripeAccountId, bankAccountId);

      if (externalAccount.object !== 'bank_account') {
        return null;
      }

      return this.mapStripeBankAccount(externalAccount as Stripe.BankAccount);
    } catch (_error) {
      return null;
    }
  }

  /**
   * Set a bank account as default for withdrawals
   * Uses regional Stripe service based on hub's stripeRegion
   */
  async setDefaultBankAccount(hubId: string, bankAccountId: string): Promise<BankAccountItem> {
    const { stripeAccountId, hub } = await this.getHubStripeInfo(hubId);

    if (!stripeAccountId || !hub) {
      throw new Error('Hub does not have a Stripe account');
    }

    // Get regional Stripe service
    const regionalStripeService = StripeServiceFactory.getServiceForHub(hub);

    // Check if this bank account is already the default
    const { defaultBankAccountId } = await this.getBankAccounts(hubId);
    if (bankAccountId === defaultBankAccountId) {
      // Already the default, just retrieve and return it
      const bankAccount = await regionalStripeService
        .getStripeInstance()
        .accounts.retrieveExternalAccount(stripeAccountId, bankAccountId);
      return this.mapStripeBankAccount(bankAccount as Stripe.BankAccount);
    }

    const updatedAccount = await regionalStripeService
      .getStripeInstance()
      .accounts.updateExternalAccount(stripeAccountId, bankAccountId, {
        default_for_currency: true,
      });

    return this.mapStripeBankAccount(updatedAccount as Stripe.BankAccount);
  }

  /**
   * Delete a bank account
   * Uses regional Stripe service based on hub's stripeRegion
   */
  async deleteBankAccount(hubId: string, bankAccountId: string): Promise<void> {
    const { stripeAccountId, hub } = await this.getHubStripeInfo(hubId);

    if (!stripeAccountId || !hub) {
      throw new Error('Hub does not have a Stripe account');
    }

    // Get regional Stripe service
    const regionalStripeService = StripeServiceFactory.getServiceForHub(hub);

    // Check if this is the default account
    const { bankAccounts, defaultBankAccountId } = await this.getBankAccounts(hubId);

    if (bankAccountId === defaultBankAccountId && bankAccounts.length > 1) {
      throw new Error('Cannot delete default bank account. Set another account as default first.');
    }

    await regionalStripeService
      .getStripeInstance()
      .accounts.deleteExternalAccount(stripeAccountId, bankAccountId);
  }

  /**
   * Update bank account details (limited fields)
   * Uses regional Stripe service based on hub's stripeRegion
   */
  async updateBankAccount(
    hubId: string,
    bankAccountId: string,
    updates: {
      accountHolderName?: string;
      accountHolderType?: 'individual' | 'company';
    },
  ): Promise<BankAccountItem> {
    const { stripeAccountId, hub } = await this.getHubStripeInfo(hubId);

    if (!stripeAccountId || !hub) {
      throw new Error('Hub does not have a Stripe account');
    }

    // Get regional Stripe service
    const regionalStripeService = StripeServiceFactory.getServiceForHub(hub);

    const updateParams: Stripe.AccountUpdateExternalAccountParams = {};

    if (updates.accountHolderName) {
      updateParams.account_holder_name = updates.accountHolderName;
    }
    if (updates.accountHolderType) {
      updateParams.account_holder_type = updates.accountHolderType;
    }

    const updatedAccount = await regionalStripeService
      .getStripeInstance()
      .accounts.updateExternalAccount(stripeAccountId, bankAccountId, updateParams);

    return this.mapStripeBankAccount(updatedAccount as Stripe.BankAccount);
  }

  /**
   * Get supported banks from Bank model
   */
  async getSupportedBanks(
    countryCode = 'MY',
  ): Promise<Array<{ id: string; code?: string; name: string; logoUrl?: string }>> {
    const banks = await Bank.find({
      countryCode: countryCode.toUpperCase(),
      isActive: true,
      approvalStatus: BankApprovalStatus.APPROVED,
    })
      .sort({ priority: -1, name: 1 })
      .lean();

    return banks.map((bank) => ({
      id: bank._id.toString(),
      code: bank.routingNumber,
      name: bank.name,
      logoUrl: bank.logoUrl,
    }));
  }

  /**
   * Map Stripe bank account to our format
   */
  private mapStripeBankAccount(ba: Stripe.BankAccount): BankAccountItem {
    return {
      id: ba.id,
      bankName: ba.bank_name || 'Unknown Bank',
      last4: ba.last4,
      accountHolderName: ba.account_holder_name || 'Account Holder',
      accountHolderType: ba.account_holder_type as 'individual' | 'company',
      currency: ba.currency.toUpperCase(),
      country: ba.country,
      isDefault: ba.default_for_currency || false,
      status: ba.status as BankAccountItem['status'],
    };
  }
}

// Export singleton instance
export const hubBankAccountService = new HubBankAccountService();
