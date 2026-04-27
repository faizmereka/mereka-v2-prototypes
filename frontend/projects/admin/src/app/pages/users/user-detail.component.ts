import { Component, signal, computed, OnInit, OnDestroy, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule, DecimalPipe, DatePipe, TitleCasePipe } from '@angular/common';
import { PageHeaderComponent, CardComponent, BadgeComponent, ToastService } from '../../shared/ui';
import {
  PlatformUsersService,
  type PlatformUserDetail,
  type ExpertiseItem,
  type OwnedHub,
  type RecentBooking,
  type PortfolioItem,
  type LanguageItem,
} from './platform-users.service';

@Component({
  selector: 'app-user-detail',
  imports: [CommonModule, DecimalPipe, DatePipe, TitleCasePipe, PageHeaderComponent, CardComponent, BadgeComponent],
  templateUrl: './user-detail.component.html',
  styleUrl: './user-detail.component.scss'
})
export class UserDetailComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly platformUsersService = inject(PlatformUsersService);
  private readonly toast = inject(ToastService);

  userId = signal<string>('');

  // Expose service signals
  readonly userDetail = this.platformUsersService.userDetail;
  readonly loading = this.platformUsersService.userDetailLoading;
  readonly error = this.platformUsersService.userDetailError;

  // Computed values from API response
  user = computed(() => this.userDetail()?.user);
  hubMemberships = computed(() => this.userDetail()?.hubMemberships ?? []);
  roleData = computed(() => this.userDetail()?.roleData);
  stats = computed(() => this.userDetail()?.stats);

  // Role checks
  isExpert = computed(() => this.roleData()?.isExpert ?? false);
  isHubOwner = computed(() => this.roleData()?.isHubOwner ?? false);
  isLearner = computed(() => this.roleData()?.isLearner ?? false);

  // Role-specific data
  expertData = computed(() => this.roleData()?.expertData);
  hubOwnerData = computed(() => this.roleData()?.hubOwnerData);
  learnerData = computed(() => this.roleData()?.learnerData);

  // Skills from user
  skills = computed(() => this.user()?.skills?.map(s => s.name) ?? []);

  // Languages from user
  languages = computed(() => this.user()?.languages ?? []);

  // Portfolio from user
  portfolio = computed(() => this.user()?.portfolio ?? []);

  // Focus area
  focusArea = computed(() => this.user()?.focusAreaId?.name ?? null);

  // Location string
  location = computed(() => {
    const loc = this.user()?.location;
    if (!loc) return null;
    const parts = [loc.city, loc.country].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  });

  // Auth providers display
  authProviders = computed(() => this.user()?.authProviders ?? []);

  // Has any social links
  hasSocialLinks = computed(() => {
    const links = this.user()?.socialLinks;
    if (!links) return false;
    return !!(links.website || links.linkedin || links.instagram || links.facebook || links.twitter);
  });

  // User types from hub memberships
  userTypes = computed(() => {
    const memberships = this.hubMemberships();
    const types = new Set<string>();
    for (const m of memberships) {
      for (const role of m.roleIds) {
        types.add(role.key);
      }
    }
    if (types.size === 0) {
      types.add('learner');
    }
    return Array.from(types);
  });

  ngOnInit() {
    this.route.params.subscribe((params: Record<string, string>) => {
      const id = params['id'];
      if (id) {
        this.userId.set(id);
        this.loadUserDetail(id);
      }
    });
  }

  ngOnDestroy() {
    this.platformUsersService.clearUserDetail();
  }

  async loadUserDetail(id: string) {
    try {
      await this.platformUsersService.getUserByIdAsync(id);
    } catch (error) {
      console.error('Error loading user detail:', error);
      this.toast.error('Failed to load user details');
    }
  }

  getRoleLabel(role: string): string {
    const labels: Record<string, string> = {
      learner: 'Learner',
      owner: 'Hub Owner',
      expert: 'Expert',
      admin: 'Admin',
      member: 'Member',
    };
    return labels[role] || role;
  }

  getRoleClass(role: string): string {
    const classes: Record<string, string> = {
      learner: 'bg-blue-100 text-blue-700',
      owner: 'bg-green-100 text-green-700',
      expert: 'bg-purple-100 text-purple-700',
      admin: 'bg-orange-100 text-orange-700',
      member: 'bg-gray-100 text-gray-700',
    };
    return classes[role] || 'bg-gray-100 text-gray-700';
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      active: 'bg-green-100 text-green-700',
      inactive: 'bg-orange-100 text-orange-700',
      suspended: 'bg-red-100 text-red-700',
      draft: 'bg-gray-100 text-gray-700',
      published: 'bg-green-100 text-green-700',
      archived: 'bg-red-100 text-red-700',
      pending: 'bg-yellow-100 text-yellow-700',
      completed: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700',
    };
    return classes[status] || 'bg-gray-100 text-gray-700';
  }

  getHubStatusClass(status: string): string {
    const classes: Record<string, string> = {
      active: 'bg-green-100 text-green-700',
      draft: 'bg-gray-100 text-gray-700',
      pending_review: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-blue-100 text-blue-700',
      rejected: 'bg-red-100 text-red-700',
      inactive: 'bg-orange-100 text-orange-700',
    };
    return classes[status] || 'bg-gray-100 text-gray-700';
  }

  getServiceName(booking: RecentBooking): string {
    const service = booking.serviceId;
    if (!service) return 'Unknown Service';
    return service.expertiseTitle || service.name || 'Service';
  }

  getBookingStatusVariant(status: string): 'success' | 'warning' | 'error' | 'default' {
    switch (status) {
      case 'completed':
      case 'active':
        return 'success';
      case 'pending':
        return 'warning';
      case 'cancelled':
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
  }

  getAuthProviderLabel(provider: string): string {
    const labels: Record<string, string> = {
      email: 'Email',
      google: 'Google',
      facebook: 'Facebook',
      firebase: 'Firebase',
      kajabi: 'Kajabi',
      custom: 'Custom',
    };
    return labels[provider] || provider;
  }

  getAuthProviderClass(provider: string): string {
    const classes: Record<string, string> = {
      email: 'bg-gray-100 text-gray-700',
      google: 'bg-red-100 text-red-700',
      facebook: 'bg-blue-100 text-blue-700',
      firebase: 'bg-yellow-100 text-yellow-700',
      kajabi: 'bg-purple-100 text-purple-700',
      custom: 'bg-gray-100 text-gray-700',
    };
    return classes[provider] || 'bg-gray-100 text-gray-700';
  }

  getProficiencyClass(proficiency: string): string {
    const classes: Record<string, string> = {
      Native: 'bg-green-100 text-green-700',
      Fluent: 'bg-blue-100 text-blue-700',
      Proficient: 'bg-indigo-100 text-indigo-700',
      Conversational: 'bg-yellow-100 text-yellow-700',
      Basic: 'bg-gray-100 text-gray-700',
    };
    return classes[proficiency] || 'bg-gray-100 text-gray-700';
  }
}
