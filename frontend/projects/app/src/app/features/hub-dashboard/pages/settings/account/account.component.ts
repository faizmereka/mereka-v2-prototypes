import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IconComponent, ToastService, DialogService, type IconName } from '@mereka/ui';
import { AuthStateService } from '../../../../../core/services/auth-state.service';
import { environment } from '../../../../../../environments/environment';
import { HubSettingsAccountService } from '../../../services/hub-settings-account.service';
import { HubSubscriptionService } from '../../../services/hub-subscription.service';
import { ChangePlanModalComponent, ChangePlanModalData } from '../subscription/components/change-plan-modal';

interface QuickAccessItem {
  label: string;
  description: string;
  path?: string;
  externalUrl?: string;
  icon: IconName;
}

interface HelpResource {
  label: string;
  url: string;
}

@Component({
  selector: 'app-hub-settings-account',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent],
  templateUrl: './account.component.html',
})
export class HubSettingsAccountComponent implements OnInit {
  private readonly authState = inject(AuthStateService);
  private readonly accountService = inject(HubSettingsAccountService);
  private readonly subscriptionService = inject(HubSubscriptionService);
  private readonly toastService = inject(ToastService);
  private readonly dialogService = inject(DialogService);

  readonly deleting = signal(false);
  readonly showDeleteConfirm = signal(false);
  readonly deleteConfirmText = signal('');

  readonly webUrl = environment.webUrl;

  // Loading states
  readonly loading = this.accountService.loading;
  readonly subscriptionLoading = this.subscriptionService.loading;

  // Hub info from account service (API + auth state)
  readonly hubName = this.accountService.hubName;
  readonly hubLogo = this.accountService.hubLogo;
  readonly hubSlug = this.accountService.hubSlug;
  readonly hubPhone = this.accountService.hubPhone;
  readonly hubEmail = this.accountService.hubEmail;
  readonly hubLocation = this.accountService.hubLocation;
  readonly hubCreatedAt = this.accountService.hubCreatedAt;
  readonly hubStatus = this.accountService.hubStatus;

  readonly hubProfileUrl = computed(() => `${this.webUrl}/hub/${this.hubSlug()}`);

  // Subscription info from subscription service
  readonly currentPlan = computed(() => {
    const sub = this.subscriptionService.subscription();
    if (sub?.currentPlan) {
      return {
        name: sub.currentPlan.name,
        isFreePlan: sub.currentPlan.price === 0,
      };
    }
    return {
      name: 'No Active Plan',
      isFreePlan: true,
    };
  });

  // Hub stats from auth state (ratings/reviews would come from separate API if needed)
  readonly hubRating = computed(() => {
    const hub = this.authState.selectedHub();
    return (hub as { rating?: number })?.rating ?? null;
  });
  readonly totalReviews = computed(() => {
    const hub = this.authState.selectedHub();
    return (hub as { totalReviews?: number })?.totalReviews ?? 0;
  });
  readonly isApproved = computed(() => {
    const hub = this.authState.selectedHub();
    return (hub as { isApproved?: boolean })?.isApproved ?? true;
  });
  readonly isCompleted = computed(() => {
    const hub = this.authState.selectedHub();
    return (hub as { isCompleted?: boolean })?.isCompleted ?? true;
  });

  // Owner email from auth state
  readonly ownerEmail = computed(() => this.authState.user()?.email || '');

  readonly quickAccessItems = computed<QuickAccessItem[]>(() => [
    {
      label: 'Business Profile',
      description: 'View and manage your business profile details.',
      externalUrl: this.hubProfileUrl(),
      icon: 'user',
    },
    {
      label: 'Team Members',
      description: 'Invite and manage your team members.',
      path: 'members',
      icon: 'users',
    },
    {
      label: 'Transactions',
      description: 'Manage balance, bank details, and transaction history.',
      path: 'transactions',
      icon: 'wallet',
    },
    {
      label: 'Subscription',
      description: 'Manage your subscription plan and payment methods.',
      path: 'subscription',
      icon: 'credit-card',
    },
  ]);

  readonly helpResources = signal<HelpResource[]>([
    {
      label: 'How to complete your Business profile',
      url: 'https://help.mereka.io/hc/basics/how-do-i-add-a-hub',
    },
    {
      label: 'How to make your Business profile stand out',
      url: 'https://help.mereka.io/hc/basics/successful-hub-application-tips-and-guidelines',
    },
    {
      label: 'How to list an Experience',
      url: 'https://help.mereka.io/hc/onboarding-steps/how-do-i-upload-an-experience',
    },
    {
      label: 'Successful Experience listing: FAQ',
      url: 'https://help.mereka.io/hc/onboarding-tips-guidelines/successful-experience-application-tips-and-guidelines',
    },
    {
      label: 'Getting paid on Mereka Connect',
      url: 'https://help.mereka.io/hc/payments-billing',
    },
  ]);

  async ngOnInit(): Promise<void> {
    // Load both profile and subscription data in parallel
    await Promise.all([
      this.accountService.loadProfile(),
      this.subscriptionService.loadSubscriptionSettings(),
    ]);
  }

  get createdAgoText(): string {
    const created = this.hubCreatedAt();
    if (!created) return '';

    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    if (diffYears > 0) {
      const remainingMonths = diffMonths - diffYears * 12;
      if (remainingMonths > 0) {
        return `Created ${diffYears} year${diffYears > 1 ? 's' : ''} and ${remainingMonths} month${remainingMonths > 1 ? 's' : ''} ago`;
      }
      return `Created ${diffYears} year${diffYears > 1 ? 's' : ''} ago`;
    } else if (diffMonths > 0) {
      return `Created ${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
    } else if (diffDays > 0) {
      return `Created ${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    }
    return 'Created today';
  }

  openDeleteConfirm(): void {
    this.showDeleteConfirm.set(true);
    this.deleteConfirmText.set('');
  }

  closeDeleteConfirm(): void {
    this.showDeleteConfirm.set(false);
    this.deleteConfirmText.set('');
  }

  onDeleteConfirmInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.deleteConfirmText.set(input.value);
  }

  get canDelete(): boolean {
    return this.deleteConfirmText().toLowerCase() === 'delete';
  }

  deleteHub(): void {
    if (!this.canDelete) return;

    this.deleting.set(true);
    // TODO: Implement delete hub API call
    console.log('Delete hub');
    setTimeout(() => {
      this.deleting.set(false);
      this.closeDeleteConfirm();
    }, 1000);
  }

  changePlan(): void {
    const currentPlan = this.subscriptionService.subscription()?.currentPlan;
    const plans = this.subscriptionService.availablePlans();

    if (!currentPlan || plans.length === 0) {
      this.toastService.error('Unable to load plan information');
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

  async editPhone(): Promise<void> {
    // TODO: Implement phone edit dialog with API update
    const newPhone = prompt('Enter new phone number:', this.hubPhone());
    if (newPhone !== null && newPhone !== this.hubPhone()) {
      try {
        await this.accountService.updateProfile({ phoneNumber: newPhone });
        this.toastService.success('Phone number updated successfully');
      } catch {
        this.toastService.error('Failed to update phone number');
      }
    }
  }

  embedProfile(): void {
    // TODO: Implement embed profile dialog
    console.log('Embed profile');
  }
}
