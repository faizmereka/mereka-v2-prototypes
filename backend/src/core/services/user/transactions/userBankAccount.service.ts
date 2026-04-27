import { Bank, BankApprovalStatus } from '@core/models/Bank';
import { Hub } from '@core/models/Hub';
import { User } from '@core/models/User';
import { StripeServiceFactory } from '@core/services/shared/payments/stripeFactory.service';
import type Stripe from 'stripe';

/**
 * Bank account interface
 */
export interface UserBankAccountItem {
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
export interface UserBankAccountListResponse {
  bankAccounts: UserBankAccountItem[];
  defaultBankAccountId?: string;
}

/**
 * Add bank account request
 */
export interface AddUserBankAccountRequest {
  accountNumber: string;
  routingNumber: string; // Bank code / Swift code
  accountHolderName: string;
  accountHolderType: 'individual' | 'company';
  currency?: string; // Default: MYR
  country?: string; // Default: MY
  setAsDefault?: boolean;
}

/**
 * Supported bank item from Bank model
 */
export interface SupportedBankItem {
  id: string;
  name: string;
  code?: string;
  logoUrl?: string;
}

/**
 * User Bank Account Service
 *
 * Manages external bank accounts for User withdrawals.
 * Uses Stripe's External Accounts API.
 */
export class UserBankAccountService {
  /**
   * Get User's Stripe info - reads from User directly
   */
  private async getUserStripeInfo(userId: string): Promise<{
    stripeAccountId: string | null;
    user: {
      stripeAccountId?: string;
      stripeRegion?: string;
      location?: { country?: string };
    } | null;
    hub: {
      stripeAccountId?: string;
      stripeRegion?: string;
      location?: { country?: string };
    } | null;
  }> {
    const user = await User.findById(userId).select('stripeAccountId stripeRegion location').lean();

    const hub = await Hub.findOne({ ownerId: userId })
      .select('stripeAccountId stripeRegion location')
      .lean();

    return {
      stripeAccountId: user?.stripeAccountId || null,
      user: user as {
        stripeAccountId?: string;
        stripeRegion?: string;
        location?: { country?: string };
      } | null,
      hub: hub as {
        stripeAccountId?: string;
        stripeRegion?: string;
        location?: { country?: string };
      } | null,
    };
  }

  /**
   * Get list of bank accounts for User
   * Uses regional Stripe service based on user's stripeRegion
   */
  async getBankAccounts(userId: string): Promise<UserBankAccountListResponse> {
    const { stripeAccountId, user, hub } = await this.getUserStripeInfo(userId);

    if (!stripeAccountId || !user) {
      return {
        bankAccounts: [],
      };
    }

    // Get regional Stripe service
    const regionalStripeService = StripeServiceFactory.getServiceForUser(user, hub);

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
   * Uses regional Stripe service based on user's stripeRegion
   */
  async getBankAccount(userId: string, bankAccountId: string): Promise<UserBankAccountItem | null> {
    const { stripeAccountId, user, hub } = await this.getUserStripeInfo(userId);

    if (!stripeAccountId || !user) {
      return null;
    }

    // Get regional Stripe service
    const regionalStripeService = StripeServiceFactory.getServiceForUser(user, hub);

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
   * Add a bank account to User's Stripe account
   * Uses regional Stripe service based on user's stripeRegion
   */
  async addBankAccount(
    userId: string,
    request: AddUserBankAccountRequest,
  ): Promise<UserBankAccountItem> {
    const { stripeAccountId, user, hub } = await this.getUserStripeInfo(userId);

    if (!stripeAccountId || !user) {
      throw new Error('User does not have a Stripe account');
    }

    // Get regional Stripe service
    const regionalStripeService = StripeServiceFactory.getServiceForUser(user, hub);

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
   * Set a bank account as default for withdrawals
   * Uses regional Stripe service based on user's stripeRegion
   */
  async setDefaultBankAccount(userId: string, bankAccountId: string): Promise<UserBankAccountItem> {
    const { stripeAccountId, user, hub } = await this.getUserStripeInfo(userId);

    if (!stripeAccountId || !user) {
      throw new Error('User does not have a Stripe account');
    }

    // Get regional Stripe service
    const regionalStripeService = StripeServiceFactory.getServiceForUser(user, hub);

    // Check if this bank account is already the default
    const { defaultBankAccountId } = await this.getBankAccounts(userId);
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
   * Uses regional Stripe service based on user's stripeRegion
   */
  async deleteBankAccount(userId: string, bankAccountId: string): Promise<void> {
    const { stripeAccountId, user, hub } = await this.getUserStripeInfo(userId);

    if (!stripeAccountId || !user) {
      throw new Error('User does not have a Stripe account');
    }

    // Get regional Stripe service
    const regionalStripeService = StripeServiceFactory.getServiceForUser(user, hub);

    // Check if this is the default account
    const { bankAccounts, defaultBankAccountId } = await this.getBankAccounts(userId);

    if (bankAccountId === defaultBankAccountId && bankAccounts.length > 1) {
      throw new Error('Cannot delete default bank account. Set another account as default first.');
    }

    await regionalStripeService
      .getStripeInstance()
      .accounts.deleteExternalAccount(stripeAccountId, bankAccountId);
  }

  /**
   * Get supported banks from Bank model
   */
  async getSupportedBanks(countryCode = 'MY'): Promise<SupportedBankItem[]> {
    const banks = await Bank.find({
      countryCode: countryCode.toUpperCase(),
      isActive: true,
      approvalStatus: BankApprovalStatus.APPROVED,
    })
      .sort({ priority: -1, name: 1 })
      .lean();

    return banks.map((bank) => ({
      id: bank._id.toString(),
      name: bank.name,
      code: bank.routingNumber,
      logoUrl: bank.logoUrl,
    }));
  }

  /**
   * Map Stripe bank account to our format
   */
  private mapStripeBankAccount(ba: Stripe.BankAccount): UserBankAccountItem {
    return {
      id: ba.id,
      bankName: ba.bank_name || 'Unknown Bank',
      last4: ba.last4,
      accountHolderName: ba.account_holder_name || 'Account Holder',
      accountHolderType: ba.account_holder_type as 'individual' | 'company',
      currency: ba.currency.toUpperCase(),
      country: ba.country,
      isDefault: ba.default_for_currency || false,
      status: ba.status as UserBankAccountItem['status'],
    };
  }
}

// Export singleton instance
export const userBankAccountService = new UserBankAccountService();
