import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent, DialogService, ToastService } from '@mereka/ui';
import {
  HubSubscriptionService,
  PlanInfo,
  PaymentMethodInfo,
  InvoiceInfo,
  TrialInfo,
  UpcomingPaymentInfo,
} from '../../../services/hub-subscription.service';
import { ChangePlanModalComponent, ChangePlanModalData } from './components/change-plan-modal';

@Component({
  selector: 'app-hub-settings-subscription',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './subscription.component.html',
})
export class HubSettingsSubscriptionComponent implements OnInit {
  private readonly dialogService = inject(DialogService);
  private readonly toastService = inject(ToastService);
  private readonly subscriptionService = inject(HubSubscriptionService);

  readonly loading = signal(false);
  readonly showAddPaymentModal = signal(false);
  readonly cancelLoading = signal(false);

  // Subscription data from service
  readonly subscription = this.subscriptionService.subscription;
  readonly availablePlans = this.subscriptionService.availablePlans;
  readonly subscriptionLoading = this.subscriptionService.loading;
  readonly subscriptionError = this.subscriptionService.error;

  // Computed plan info for template
  readonly currentPlan = computed(() => {
    const sub = this.subscription();
    if (sub?.currentPlan) {
      return {
        name: sub.currentPlan.name,
        price: sub.currentPlan.price,
        currency: sub.currentPlan.currency,
        billingCycle: 'monthly',
        features: sub.currentPlan.features,
      };
    }
    // Fallback for no subscription
    return {
      name: 'No Active Plan',
      price: 0,
      currency: 'MYR',
      billingCycle: 'monthly',
      features: [],
    };
  });

  readonly isCancelScheduled = computed(() => this.subscription()?.cancelAtPeriodEnd ?? false);
  readonly cancelDate = computed(() => {
    const sub = this.subscription();
    if (sub?.cancelAtPeriodEnd && sub.currentPeriodEnd) {
      return this.subscriptionService.formatDate(sub.currentPeriodEnd);
    }
    return null;
  });

  readonly hasActiveSubscription = computed(() => {
    const sub = this.subscription();
    return sub !== null && ['active', 'trialing'].includes(sub.status);
  });

  // Payment methods from API
  readonly paymentMethods = signal<PaymentMethodInfo[]>([]);
  readonly paymentMethodsLoading = signal(false);

  // Invoices from API
  readonly invoices = signal<InvoiceInfo[]>([]);
  readonly invoicesLoading = signal(false);
  readonly invoicesHasMore = signal(false);

  // Trial info from API
  readonly trialInfo = signal<TrialInfo | null>(null);

  // Upcoming payment from API
  readonly upcomingPayment = signal<UpcomingPaymentInfo | null>(null);

  async ngOnInit(): Promise<void> {
    await this.subscriptionService.loadSubscriptionSettings();
    // Load payment methods, invoices, trial info, and upcoming payment in parallel
    await Promise.all([
      this.loadPaymentMethods(),
      this.loadInvoices(),
      this.loadTrialInfo(),
      this.loadUpcomingPayment(),
    ]);
  }

  private async loadPaymentMethods(): Promise<void> {
    this.paymentMethodsLoading.set(true);
    try {
      const result = await this.subscriptionService.getPaymentMethods();
      this.paymentMethods.set(result.paymentMethods);
    } catch (error) {
      console.error('Failed to load payment methods:', error);
    } finally {
      this.paymentMethodsLoading.set(false);
    }
  }

  private async loadInvoices(): Promise<void> {
    this.invoicesLoading.set(true);
    try {
      const result = await this.subscriptionService.getInvoices({ limit: 10 });
      this.invoices.set(result.invoices);
      this.invoicesHasMore.set(result.hasMore);
    } catch (error) {
      console.error('Failed to load invoices:', error);
    } finally {
      this.invoicesLoading.set(false);
    }
  }

  private async loadTrialInfo(): Promise<void> {
    try {
      const trialInfo = await this.subscriptionService.getTrialInfo();
      this.trialInfo.set(trialInfo);
    } catch (error) {
      console.error('Failed to load trial info:', error);
    }
  }

  private async loadUpcomingPayment(): Promise<void> {
    try {
      const upcomingPayment = await this.subscriptionService.getUpcomingPayment();
      this.upcomingPayment.set(upcomingPayment);
    } catch (error) {
      console.error('Failed to load upcoming payment:', error);
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-neutral-100 text-neutral-800';
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-MY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  addPaymentMethod(): void {
    this.showAddPaymentModal.set(true);
    // TODO: Implement Stripe Elements for adding payment method
    // This requires creating a SetupIntent and using Stripe.js
  }

  closeAddPaymentModal(): void {
    this.showAddPaymentModal.set(false);
  }

  async setDefaultPayment(id: string): Promise<void> {
    try {
      await this.subscriptionService.setDefaultPaymentMethod(id);
      this.toastService.success('Default payment method updated');
      // Refresh payment methods
      await this.loadPaymentMethods();
    } catch (error) {
      this.toastService.error('Failed to set default payment method');
      console.error(error);
    }
  }

  async removePayment(id: string): Promise<void> {
    const confirmed = await this.dialogService.confirm({
      title: 'Remove Payment Method',
      message: 'Are you sure you want to remove this payment method?',
      confirmText: 'Remove',
      cancelText: 'Cancel',
      type: 'danger',
    });

    if (!confirmed) return;

    try {
      await this.subscriptionService.deletePaymentMethod(id);
      this.toastService.success('Payment method removed');
      // Refresh payment methods
      await this.loadPaymentMethods();
    } catch (error) {
      this.toastService.error('Failed to remove payment method');
      console.error(error);
    }
  }

  async downloadInvoice(invoiceId: string): Promise<void> {
    try {
      const url = await this.subscriptionService.getInvoiceDownloadUrl(invoiceId);
      // Open PDF in new tab
      window.open(url, '_blank');
    } catch (error) {
      this.toastService.error('Failed to download invoice');
      console.error(error);
    }
  }

  async openChangePlanModal(): Promise<void> {
    const currentPlan = this.subscription()?.currentPlan;
    const plans = this.availablePlans();

    if (!currentPlan || plans.length === 0) {
      return;
    }

    const modalData: ChangePlanModalData = {
      currentPlan,
      availablePlans: plans,
    };

    const dialogRef = this.dialogService.open<ChangePlanModalComponent, ChangePlanModalData, boolean>(
      ChangePlanModalComponent,
      {
        data: modalData,
        width: 'lg',
      }
    );

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        // Refresh subscription data after successful change
        await this.subscriptionService.refresh();
      }
    });
  }

  async cancelSubscription(): Promise<void> {
    if (this.cancelLoading()) return;

    const confirmed = await this.dialogService.confirm({
      title: 'Cancel Subscription',
      message: 'Are you sure you want to cancel your subscription? You will continue to have access until the end of your current billing period.',
      confirmText: 'Cancel Subscription',
      cancelText: 'Keep Subscription',
      type: 'danger',
    });

    if (!confirmed) return;

    this.cancelLoading.set(true);

    try {
      const result = await this.subscriptionService.cancelSubscription();
      this.toastService.success(result.message);
    } catch (error) {
      this.toastService.error('Failed to cancel subscription. Please try again.');
      console.error(error);
    } finally {
      this.cancelLoading.set(false);
    }
  }

  async reactivateSubscription(): Promise<void> {
    if (this.cancelLoading()) return;

    this.cancelLoading.set(true);

    try {
      const result = await this.subscriptionService.reactivateSubscription();
      this.toastService.success(result.message);
    } catch (error) {
      this.toastService.error('Failed to reactivate subscription. Please try again.');
      console.error(error);
    } finally {
      this.cancelLoading.set(false);
    }
  }
}
