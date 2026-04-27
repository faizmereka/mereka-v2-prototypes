import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { DialogService, ToastService } from '@mereka/ui';
import {
  HubTransactionService,
  Transaction,
  TransactionType,
  TransactionDirection,
  TransactionStatus,
  type Balance,
  type BankAccount,
} from '../../../services/hub-transaction.service';
import { UserTransactionService } from '../../../services/user-transaction.service';
import { AuthStateService } from '../../../../../core/services/auth-state.service';
import { WithdrawalModalComponent, type WithdrawalModalData } from './components/withdrawal-modal';
import { AddBankModalComponent, type AddBankModalData } from './components/add-bank-modal';

type ViewType = 'hub' | 'expert';
type HubTabType = 'all' | 'inbound' | 'outbound' | 'withdrawals';
type ExpertTabType = 'earnings' | 'withdrawals';

@Component({
  selector: 'app-hub-settings-transactions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './transactions.component.html',
})
export class HubSettingsTransactionsComponent implements OnInit {
  private readonly hubService = inject(HubTransactionService);
  private readonly userService = inject(UserTransactionService);
  private readonly dialogService = inject(DialogService);
  private readonly toastService = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly authState = inject(AuthStateService);

  // View State
  readonly activeView = signal<ViewType>('hub');
  readonly hubTab = signal<HubTabType>('all');
  readonly expertTab = signal<ExpertTabType>('earnings');
  readonly searchText = signal('');

  // Button Loading States
  readonly settingUpStripe = signal(false);
  readonly openingDashboard = signal(false);
  readonly exporting = signal(false);
  readonly refreshing = signal(false);

  // Hub Data
  readonly hubLoading = this.hubService.loading;
  readonly hubError = this.hubService.error;
  readonly hubStripeStatus = this.hubService.stripeStatus;
  readonly hubBalance = this.hubService.balance;
  readonly hubTransactions = this.hubService.transactions;
  readonly hubWithdrawals = this.hubService.withdrawals;
  readonly hubBankAccounts = this.hubService.bankAccounts;
  readonly hubDefaultBank = this.hubService.defaultBankAccount;
  readonly hubHasStripe = this.hubService.hasStripeAccount;
  readonly hubKycComplete = this.hubService.isKycComplete;
  readonly hubCanWithdraw = this.hubService.canWithdraw;
  readonly hubAvailable = this.hubService.availableBalance;
  readonly hubPending = this.hubService.pendingBalance;
  readonly showMyEarningsTab = this.hubService.showMyEarnings;

  // Expert Data
  readonly expertLoading = this.userService.loading;
  readonly expertError = this.userService.error;
  readonly expertStripeStatus = this.userService.stripeStatus;
  readonly expertBalance = this.userService.balance;
  readonly expertEarnings = this.userService.earnings;
  readonly expertWithdrawals = this.userService.withdrawals;
  readonly expertBankAccounts = this.userService.bankAccounts;
  readonly expertDefaultBank = this.userService.defaultBankAccount;
  readonly expertHasStripe = this.userService.hasStripeAccount;
  readonly expertKycComplete = this.userService.isKycComplete;
  readonly expertCanWithdraw = this.userService.canWithdraw;
  readonly expertAvailable = this.userService.availableBalance;
  readonly expertPending = this.userService.pendingBalance;

  // Dynamic based on view
  readonly loading = computed(() => this.activeView() === 'hub' ? this.hubLoading() : this.expertLoading());
  readonly error = computed(() => this.activeView() === 'hub' ? this.hubError() : this.expertError());
  readonly stripeStatus = computed(() => this.activeView() === 'hub' ? this.hubStripeStatus() : this.expertStripeStatus());
  readonly hasStripe = computed(() => this.activeView() === 'hub' ? this.hubHasStripe() : this.expertHasStripe());
  readonly kycComplete = computed(() => this.activeView() === 'hub' ? this.hubKycComplete() : this.expertKycComplete());
  readonly canWithdraw = computed(() => this.activeView() === 'hub' ? this.hubCanWithdraw() : this.expertCanWithdraw());
  readonly available = computed(() => this.activeView() === 'hub' ? this.hubAvailable() : this.expertAvailable());
  readonly pending = computed(() => this.activeView() === 'hub' ? this.hubPending() : this.expertPending());
  readonly bankAccounts = computed(() => this.activeView() === 'hub' ? this.hubBankAccounts() : this.expertBankAccounts());
  readonly defaultBank = computed(() => this.activeView() === 'hub' ? this.hubDefaultBank() : this.expertDefaultBank());
  readonly balanceCurrency = computed(() => this.activeView() === 'hub' ? this.hubBalance()?.currency : this.expertBalance()?.currency);

  // Check if external_account is required
  readonly needsExternalAccount = computed(() => {
    const status = this.stripeStatus();
    if (!status) return false;
    const currentlyDue = status.requirements?.currentlyDue || [];
    return currentlyDue.includes('external_account');
  });

  // Check if there are KYC requirements OTHER than external_account
  readonly hasKycRequirements = computed(() => {
    const status = this.stripeStatus();
    if (!status) return false;
    const currentlyDue = status.requirements?.currentlyDue || [];
    return currentlyDue.some(req => req !== 'external_account');
  });

  // Get the first verification error reason (if any)
  readonly verificationErrorReason = computed(() => {
    const status = this.stripeStatus();
    if (!status?.requirements?.errors?.length) return null;
    return status.requirements.errors[0].reason;
  });

  // Currency mismatch detection
  readonly hasCurrencyMismatch = computed(() => {
    const status = this.hubStripeStatus();
    return this.activeView() === 'hub' && status?.currencyMismatch === true;
  });
  readonly hubCurrency = computed(() => this.hubStripeStatus()?.hubCurrency);
  readonly stripeAccountCurrency = computed(() => this.hubStripeStatus()?.stripeAccountCurrency);

  // Filtered Hub Transactions
  readonly filteredHubTransactions = computed(() => {
    let txns = this.hubTransactions();
    const tab = this.hubTab();
    const search = this.searchText().toLowerCase();

    if (tab === 'inbound') {
      txns = txns.filter(t => t.direction === TransactionDirection.INBOUND);
    } else if (tab === 'outbound') {
      txns = txns.filter(t => t.direction === TransactionDirection.OUTBOUND);
    } else if (tab === 'withdrawals') {
      txns = txns.filter(t => t.type === TransactionType.WITHDRAWAL);
    }

    if (search) {
      txns = txns.filter(t =>
        t.referenceId.toLowerCase().includes(search) ||
        t.description?.toLowerCase().includes(search) ||
        t.fromUser?.displayName?.toLowerCase().includes(search)
      );
    }

    return txns;
  });

  // Filtered Expert Earnings
  readonly filteredExpertTransactions = computed(() => {
    const tab = this.expertTab();
    const search = this.searchText().toLowerCase();

    if (tab === 'withdrawals') {
      return this.expertWithdrawals().filter(w =>
        !search || w.description?.toLowerCase().includes(search)
      );
    }

    return this.expertEarnings().filter(e =>
      !search ||
      e.description?.toLowerCase().includes(search) ||
      e.metadata.hubName?.toLowerCase().includes(search)
    );
  });

  // Setup flags - only show after data is loaded (not during loading)
  readonly needsStripeSetup = computed(() => !this.loading() && !this.hasStripe());
  // Show KYC banner only if there are requirements OTHER than external_account
  readonly needsKyc = computed(() => !this.loading() && this.hasStripe() && this.hasKycRequirements());
  // Show bank banner if external_account is required OR if KYC complete but no banks
  readonly needsBank = computed(() => {
    if (this.loading()) return false;
    if (!this.hasStripe()) return false;
    // Show if Stripe requires external_account
    if (this.needsExternalAccount()) return true;
    // Also show if KYC complete but no banks added
    return this.kycComplete() && this.bankAccounts().length === 0;
  });
  // Show bank accounts section if user has Stripe account (for adding/managing banks)
  readonly showBankSection = computed(() => !this.loading() && this.hasStripe());

  async ngOnInit(): Promise<void> {
    // Check for view query parameter (from Stripe redirect or offer page)
    const viewParam = this.route.snapshot.queryParamMap.get('view');
    const setupParam = this.route.snapshot.queryParamMap.get('setup');

    if (viewParam === 'expert') {
      this.activeView.set('expert');
      await this.userService.loadUserTransactionData();

      // Auto-trigger Stripe setup if coming from offer page
      if (setupParam === 'true') {
        // Small delay to ensure UI is ready
        setTimeout(() => {
          this.setupStripe();
        }, 100);
      }
    } else {
      await this.hubService.loadTransactionData();
    }
  }

  // View switching
  async switchView(view: ViewType): Promise<void> {
    this.activeView.set(view);
    this.searchText.set('');

    if (view === 'hub') {
      await this.hubService.loadTransactionData();
    } else {
      await this.userService.loadUserTransactionData();
    }
  }

  setHubTab(tab: HubTabType): void {
    this.hubTab.set(tab);
  }

  setExpertTab(tab: ExpertTabType): void {
    this.expertTab.set(tab);
  }

  // Actions
  async withdraw(): Promise<void> {
    if (!this.canWithdraw()) return;

    const isHub = this.activeView() === 'hub';
    const balance = isHub ? this.hubBalance() : this.expertBalance();
    const banks = this.bankAccounts();
    const defaultId = isHub ? this.hubService.defaultBankAccountId() : this.userService.defaultBankAccountId();

    if (!balance || banks.length === 0) {
      this.toastService.warning('Please add a bank account first');
      return;
    }

    const modalData: WithdrawalModalData = {
      balance: balance as Balance,
      bankAccounts: banks as BankAccount[],
      defaultBankAccountId: defaultId,
    };

    const ref = this.dialogService.open<WithdrawalModalComponent, WithdrawalModalData, boolean>(
      WithdrawalModalComponent,
      { data: modalData, width: 'lg' }
    );

    ref.afterClosed().subscribe(async result => {
      if (result) {
        this.toastService.success('Withdrawal initiated');
        // Refresh data to update balance and transactions
        await this.refresh();
      }
    });
  }

  async setupStripe(): Promise<void> {
    if (this.settingUpStripe()) return;

    const currentView = this.activeView();
    const isHub = currentView === 'hub';

    // Show pre-onboarding confirmation for hub (first-time setup)
    if (isHub && !this.hasStripe()) {
      const hub = this.authState.selectedHub();
      const country = hub?.location?.country || 'your country';
      const currency = hub?.currency || 'the default currency';

      const confirmed = await this.dialogService.confirm({
        title: 'Important Notice',
        message: `Once you complete Stripe onboarding, your country (${country}) and currency (${currency}) cannot be changed. Please ensure your hub location is correct before proceeding.`,
        type: 'warning',
        confirmText: 'Continue with Onboarding',
        cancelText: 'Cancel',
      });

      if (!confirmed) {
        return;
      }
    }

    this.settingUpStripe.set(true);
    try {
      this.toastService.info('Setting up payments...');
      const service = isHub ? this.hubService : this.userService;

      if (!this.hasStripe()) {
        await service.createStripeAccount();
      }

      // Build return URL with view parameter to restore the correct tab after redirect
      const baseUrl = window.location.origin + window.location.pathname;
      const returnUrl = `${baseUrl}?view=${currentView}`;
      const url = await service.getOnboardingLink(returnUrl, returnUrl);
      window.location.href = url;
    } catch (err) {
      const message = this.parseStripeError(err);
      this.toastService.error(message);
      this.settingUpStripe.set(false);
    }
  }

  private parseStripeError(err: unknown): string {
    if (err instanceof Error) {
      const msg = err.message.toLowerCase();
      if (msg.includes('country') || msg.includes('region')) {
        return 'Stripe is not available in your country/region.';
      }
      if (msg.includes('already') || msg.includes('exists')) {
        return 'A Stripe account already exists. Please refresh and try again.';
      }
      if (msg.includes('network') || msg.includes('timeout')) {
        return 'Network error. Please check your connection and try again.';
      }
      if (msg.includes('unauthorized') || msg.includes('permission')) {
        return 'You do not have permission to set up payments for this hub.';
      }
      return err.message;
    }
    return 'Failed to set up payments. Please try again.';
  }

  async openDashboard(): Promise<void> {
    if (this.openingDashboard()) return;
    this.openingDashboard.set(true);
    try {
      const service = this.activeView() === 'hub' ? this.hubService : this.userService;
      const url = await service.getDashboardLink();
      window.open(url, '_blank');
    } catch (err) {
      const message = this.parseStripeError(err);
      this.toastService.error(message || 'Could not open Stripe dashboard');
    } finally {
      this.openingDashboard.set(false);
    }
  }

  async exportCsv(): Promise<void> {
    if (this.exporting()) return;
    this.exporting.set(true);
    try {
      this.toastService.info('Exporting...');
      const blob = this.activeView() === 'hub'
        ? await this.hubService.exportTransactions()
        : await this.userService.exportEarnings();

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${this.activeView()}-transactions-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      this.toastService.success('Export complete');
    } catch (err) {
      this.toastService.error('Export failed');
    } finally {
      this.exporting.set(false);
    }
  }

  async refresh(): Promise<void> {
    if (this.refreshing()) return;
    this.refreshing.set(true);
    try {
      if (this.activeView() === 'hub') {
        await this.hubService.refresh();
      } else {
        await this.userService.refresh();
      }
    } finally {
      this.refreshing.set(false);
    }
  }

  // Bank Account Management
  async openAddBankModal(): Promise<void> {
    // Determine currency and country based on balance/stripe status
    const isHub = this.activeView() === 'hub';
    const balance = isHub ? this.hubBalance() : this.expertBalance();
    const balanceCurrency = balance?.currency || 'MYR';

    // For Stripe Atlas accounts (non-Malaysian), bank accounts should use US/USD
    // since that's the platform country for Stripe Atlas
    const { currency, country } = this.getBankAccountDefaults(balanceCurrency);

    const modalData: AddBankModalData = {
      mode: isHub ? 'hub' : 'expert',
      currency,
      country,
    };

    const ref = this.dialogService.open<AddBankModalComponent, AddBankModalData, boolean>(
      AddBankModalComponent,
      { data: modalData, width: 'md' }
    );

    ref.afterClosed().subscribe(async result => {
      if (result) {
        this.toastService.success('Bank account added successfully');
        // Refresh data to update bank accounts list and hide banner
        await this.refresh();
      }
    });
  }

  async setDefaultBank(bankAccountId: string): Promise<void> {
    try {
      const service = this.activeView() === 'hub' ? this.hubService : this.userService;
      await service.setDefaultBankAccount(bankAccountId);
      this.toastService.success('Default bank account updated');
    } catch (err) {
      this.toastService.error(err instanceof Error ? err.message : 'Failed to set default');
    }
  }

  async deleteBank(bankAccountId: string): Promise<void> {
    if (!confirm('Are you sure you want to remove this bank account?')) return;

    try {
      const service = this.activeView() === 'hub' ? this.hubService : this.userService;
      await service.deleteBankAccount(bankAccountId);
      this.toastService.success('Bank account removed');
    } catch (err) {
      this.toastService.error(err instanceof Error ? err.message : 'Failed to remove bank account');
    }
  }

  // Utilities
  formatDate(date: string): string {
    return this.hubService.formatDate(date);
  }

  getStatusClass(status: string): string {
    return this.hubService.getStatusClass(status);
  }

  getTypeLabel(type: string): string {
    return this.hubService.getTypeLabel(type as TransactionType);
  }

  getServiceLabel(type?: string): string {
    return this.hubService.getServiceTypeLabel(type);
  }

  /**
   * Get the default currency and country for bank account creation.
   * The bank account country/currency must match the Stripe account's country.
   * Stripe determines the account country based on user's location.
   */
  private getBankAccountDefaults(balanceCurrency: string): { currency: string; country: string } {
    const currencyUpperCase = balanceCurrency.toUpperCase();

    // Map currency to country code
    const currencyToCountry: Record<string, string> = {
      MYR: 'MY',
      IDR: 'ID',
      SGD: 'SG',
      THB: 'TH',
      VND: 'VN',
      PHP: 'PH',
      HKD: 'HK',
      JPY: 'JP',
      KRW: 'KR',
      AUD: 'AU',
      NZD: 'NZ',
      INR: 'IN',
      USD: 'US',
      GBP: 'GB',
    };

    const country = currencyToCountry[currencyUpperCase] || 'US';
    return { currency: currencyUpperCase, country };
  }
}
