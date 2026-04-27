import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { IconComponent } from '@mereka/ui';
import { AuthStateService } from '../../../../core/services/auth-state.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { firstValueFrom } from 'rxjs';

interface ExperienceHost {
  name: string;
  email: string;
}

interface CollaboratorExperience {
  _id: string;
  title: string;
  slug: string;
  status: string;
  coverPhoto?: string;
  hostDetails?: ExperienceHost[];
}

interface CollaboratorBooking {
  _id: string;
  experienceId: string;
  experienceTitle: string;
  experienceSlug: string;
  customerName: string;
  customerEmail: string;
  bookingDate: string;
  status: string;
  totalCost: number;
  currency: string;
  ticketCount: number;
}

interface CollaboratorDashboardData {
  hub: {
    id: string;
    name: string;
    logo?: string;
    companyType?: string;
    location?: {
      city?: string;
      country?: string;
    };
  };
  experienceCount: number;
  bookingCount: number;
  experiences: CollaboratorExperience[];
  bookings: CollaboratorBooking[];
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

@Component({
  selector: 'app-collaborator-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent],
  template: `
    <div class="min-h-screen bg-neutral-50 p-6">
      <div class="max-w-7xl mx-auto space-y-6">
        <!-- Header -->
        <div class="flex items-center justify-between">
          <h1 class="text-2xl font-bold text-neutral-900">Collaborator Dashboard</h1>
          <span class="px-4 py-1.5 text-sm font-medium uppercase bg-blue-100 text-blue-800 rounded-full">
            collaborator
          </span>
        </div>

        <!-- Hub Info Card -->
        <div class="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
          @if (loading()) {
            <div class="animate-pulse flex gap-4">
              <div class="w-20 h-20 bg-neutral-200 rounded-full"></div>
              <div class="flex-1">
                <div class="h-6 bg-neutral-200 rounded w-1/3 mb-2"></div>
                <div class="h-4 bg-neutral-200 rounded w-1/4"></div>
              </div>
            </div>
          } @else {
            <div class="flex items-center gap-4">
              <!-- Hub Logo -->
              <div class="w-20 h-20 bg-neutral-100 rounded-full flex items-center justify-center flex-shrink-0">
                @if (hubLogo()) {
                  <img [src]="hubLogo()" [alt]="hubName()" class="w-full h-full object-cover rounded-full" />
                } @else {
                  <span class="text-xl font-bold text-neutral-400">{{ hubInitials() }}</span>
                }
              </div>

              <!-- Hub Details -->
              <div class="flex-1">
                <h2 class="text-xl font-bold text-neutral-900">{{ hubName() }}</h2>
                @if (hubCompanyType()) {
                  <p class="text-sm font-medium text-neutral-600">{{ hubCompanyType() }}</p>
                }
                @if (hubLocation()) {
                  <div class="flex items-center gap-1 text-sm text-neutral-500 mt-1">
                    <ui-icon name="location" class="w-4 h-4"></ui-icon>
                    <span>{{ hubLocation() }}</span>
                  </div>
                }
              </div>

              <!-- Stats -->
              <div class="flex gap-6">
                <div class="text-center">
                  <p class="text-2xl font-bold text-neutral-900">{{ experienceCount() }}</p>
                  <p class="text-sm text-neutral-500">Experiences</p>
                </div>
                <div class="text-center">
                  <p class="text-2xl font-bold text-neutral-900">{{ bookingCount() }}</p>
                  <p class="text-sm text-neutral-500">Bookings</p>
                </div>
              </div>
            </div>
          }
        </div>

        <!-- Experiences Section -->
        <div class="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
          <div class="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
            <h2 class="text-lg font-bold text-neutral-900">Your Experiences</h2>
            <span class="text-sm text-neutral-500">{{ experienceCount() }} total</span>
          </div>

          @if (loading()) {
            <div class="p-6">
              <div class="animate-pulse space-y-4">
                @for (i of [1, 2, 3]; track i) {
                  <div class="h-16 bg-neutral-200 rounded"></div>
                }
              </div>
            </div>
          } @else if (experiences().length === 0) {
            <div class="p-12 text-center">
              <ui-icon name="star" class="w-12 h-12 text-neutral-300 mx-auto mb-3"></ui-icon>
              <p class="text-neutral-500">No experiences assigned to you yet</p>
            </div>
          } @else {
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead class="bg-neutral-50 border-b border-neutral-200">
                  <tr>
                    <th class="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Experience</th>
                    <th class="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Host</th>
                    <th class="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Status</th>
                    <th class="px-6 py-3 text-center text-xs font-semibold text-neutral-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-neutral-200">
                  @for (experience of experiences(); track experience._id) {
                    <tr class="hover:bg-neutral-50">
                      <td class="px-6 py-4">
                        <div class="flex items-center gap-3">
                          @if (experience.coverPhoto) {
                            <img [src]="experience.coverPhoto" [alt]="experience.title" class="w-12 h-12 rounded-lg object-cover" />
                          } @else {
                            <div class="w-12 h-12 bg-neutral-100 rounded-lg flex items-center justify-center">
                              <ui-icon name="star" class="w-6 h-6 text-neutral-400"></ui-icon>
                            </div>
                          }
                          <span class="font-semibold text-neutral-900">{{ experience.title }}</span>
                        </div>
                      </td>
                      <td class="px-6 py-4">
                        <span class="text-sm text-neutral-700">{{ getHost(experience) }}</span>
                      </td>
                      <td class="px-6 py-4">
                        <span
                          class="inline-flex px-2 py-1 text-xs font-bold uppercase rounded"
                          [class]="getStatusClass(experience.status)"
                        >
                          {{ getStatusLabel(experience.status) }}
                        </span>
                      </td>
                      <td class="px-6 py-4 text-center">
                        <div class="flex items-center justify-center gap-2">
                          <button
                            (click)="viewExperience(experience.slug)"
                            class="p-2 rounded-lg hover:bg-neutral-100 transition-colors"
                            title="View"
                          >
                            <ui-icon name="eye" class="w-4 h-4 text-neutral-600"></ui-icon>
                          </button>
                          <button
                            (click)="editExperience(experience._id)"
                            class="p-2 rounded-lg hover:bg-neutral-100 transition-colors"
                            title="Edit"
                          >
                            <ui-icon name="edit" class="w-4 h-4 text-neutral-600"></ui-icon>
                          </button>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>

        <!-- Bookings Section -->
        <div class="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
          <div class="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
            <h2 class="text-lg font-bold text-neutral-900">Recent Bookings</h2>
            <span class="text-sm text-neutral-500">{{ bookingCount() }} total</span>
          </div>

          @if (loading()) {
            <div class="p-6">
              <div class="animate-pulse space-y-4">
                @for (i of [1, 2, 3]; track i) {
                  <div class="h-16 bg-neutral-200 rounded"></div>
                }
              </div>
            </div>
          } @else if (bookings().length === 0) {
            <div class="p-12 text-center">
              <ui-icon name="calendar" class="w-12 h-12 text-neutral-300 mx-auto mb-3"></ui-icon>
              <p class="text-neutral-500">No bookings yet for your experiences</p>
            </div>
          } @else {
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead class="bg-neutral-50 border-b border-neutral-200">
                  <tr>
                    <th class="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Customer</th>
                    <th class="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Experience</th>
                    <th class="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Date</th>
                    <th class="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Tickets</th>
                    <th class="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Amount</th>
                    <th class="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-neutral-200">
                  @for (booking of bookings(); track booking._id) {
                    <tr class="hover:bg-neutral-50">
                      <td class="px-6 py-4">
                        <div>
                          <p class="font-medium text-neutral-900">{{ booking.customerName }}</p>
                          <p class="text-sm text-neutral-500">{{ booking.customerEmail }}</p>
                        </div>
                      </td>
                      <td class="px-6 py-4">
                        <span class="text-sm text-neutral-700">{{ booking.experienceTitle }}</span>
                      </td>
                      <td class="px-6 py-4">
                        <span class="text-sm text-neutral-700">{{ formatDate(booking.bookingDate) }}</span>
                      </td>
                      <td class="px-6 py-4">
                        <span class="text-sm text-neutral-700">{{ booking.ticketCount }}</span>
                      </td>
                      <td class="px-6 py-4">
                        <span class="font-medium text-neutral-900">{{ booking.currency }} {{ booking.totalCost.toFixed(2) }}</span>
                      </td>
                      <td class="px-6 py-4">
                        <span
                          class="inline-flex px-2 py-1 text-xs font-bold uppercase rounded"
                          [class]="getBookingStatusClass(booking.status)"
                        >
                          {{ getBookingStatusLabel(booking.status) }}
                        </span>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class CollaboratorDashboardComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly authState = inject(AuthStateService);
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  // State
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  // Dashboard data
  private readonly dashboardData = signal<CollaboratorDashboardData | null>(null);

  // Computed from auth state
  readonly hubName = computed(() => this.authState.selectedHub()?.name ?? 'Hub');
  readonly hubLogo = computed(() => this.authState.selectedHub()?.logo ?? null);
  readonly hubInitials = computed(() =>
    this.hubName()
      .split(' ')
      .map((n) => n.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase()
  );

  // Computed from dashboard data
  readonly hubCompanyType = computed(() => this.dashboardData()?.hub?.companyType ?? null);
  readonly hubLocation = computed(() => {
    const location = this.dashboardData()?.hub?.location;
    if (!location) return null;
    const parts = [location.city, location.country].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  });
  readonly experienceCount = computed(() => this.dashboardData()?.experienceCount ?? 0);
  readonly bookingCount = computed(() => this.dashboardData()?.bookingCount ?? 0);
  readonly experiences = computed(() => this.dashboardData()?.experiences ?? []);
  readonly bookings = computed(() => this.dashboardData()?.bookings ?? []);

  private clickOutsideHandler = this.handleClickOutside.bind(this);

  ngOnInit(): void {
    this.loadDashboard();
    document.addEventListener('click', this.clickOutsideHandler);
  }

  ngOnDestroy(): void {
    document.removeEventListener('click', this.clickOutsideHandler);
  }

  private handleClickOutside(): void {
    // Not needed anymore since we removed dropdown menu
  }

  private async loadDashboard(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    const hubId = this.authState.selectedHub()?.id;
    if (!hubId) {
      this.error.set('No hub selected');
      this.loading.set(false);
      return;
    }

    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<CollaboratorDashboardData>>(
          `${this.apiUrl}/hub/${hubId}/dashboard/collaborator`,
          { withCredentials: true }
        )
      );

      if (response.success && response.data) {
        this.dashboardData.set(response.data);
      } else {
        this.error.set(response.error?.message ?? 'Failed to load dashboard');
      }
    } catch (err) {
      console.error('Failed to load collaborator dashboard:', err);
      this.error.set('Failed to load dashboard');
    } finally {
      this.loading.set(false);
    }
  }

  getHost(experience: CollaboratorExperience): string {
    const hosts = experience.hostDetails;
    if (!hosts || hosts.length === 0) {
      return this.hubName();
    }
    if (hosts.length > 1) {
      return 'Multiple Hosts';
    }
    return hosts[0].name || hosts[0].email || this.hubName();
  }

  getStatusLabel(status: string): string {
    const statusMap: Record<string, string> = {
      active: 'Active',
      published: 'Active',
      drafted: 'Draft',
      pending: 'Under Review',
      unlisted: 'Unlisted',
      unlist: 'Unlisted',
      archived: 'Archived',
    };
    return statusMap[status.toLowerCase()] || status;
  }

  getStatusClass(status: string): string {
    const statusClasses: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      published: 'bg-green-100 text-green-800',
      drafted: 'bg-neutral-900 text-white',
      pending: 'bg-yellow-100 text-yellow-800',
      unlisted: 'bg-neutral-200 text-neutral-600',
      unlist: 'bg-neutral-200 text-neutral-600',
      archived: 'bg-red-100 text-red-800',
    };
    return statusClasses[status.toLowerCase()] || 'bg-neutral-100 text-neutral-700';
  }

  getBookingStatusLabel(status: string): string {
    const statusMap: Record<string, string> = {
      pending: 'Pending',
      active: 'Confirmed',
      completed: 'Completed',
      cancelled: 'Cancelled',
      refunded: 'Refunded',
    };
    return statusMap[status.toLowerCase()] || status;
  }

  getBookingStatusClass(status: string): string {
    const statusClasses: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      active: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      refunded: 'bg-neutral-200 text-neutral-600',
    };
    return statusClasses[status.toLowerCase()] || 'bg-neutral-100 text-neutral-700';
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  viewExperience(slug: string): void {
    window.open(`${environment.webUrl}/experience/${slug}`, '_blank');
  }

  editExperience(experienceId: string): void {
    // Navigate to onboarding edit page with returnUrl to come back to collaborator dashboard
    this.router.navigate(
      ['/onboarding/experience/platform', experienceId, 'basic-info'],
      { queryParams: { returnUrl: '/hub/collaborator-dashboard' } }
    );
  }
}
