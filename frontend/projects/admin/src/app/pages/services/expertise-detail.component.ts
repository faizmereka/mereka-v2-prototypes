import { Component, signal, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule, DecimalPipe, DatePipe, CurrencyPipe } from '@angular/common';
import { PageHeaderComponent, CardComponent, BadgeComponent, AvatarComponent, ToastService } from '../../shared/ui';
import { DialogService } from '../../shared/dialog';
import { ServicesService, Expertise, ExpertiseStatus } from './services.service';

@Component({
  selector: 'app-expertise-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    DecimalPipe,
    DatePipe,
    CurrencyPipe,
    PageHeaderComponent,
    CardComponent,
    BadgeComponent,
    AvatarComponent,
  ],
  template: `
    <div class="flex flex-col gap-6 animate-fade-in">
      <!-- Header -->
      <header class="flex justify-between items-center">
        <div class="flex items-center gap-4">
          <a routerLink="/dashboard/services" class="p-2 hover:bg-gray-100 rounded-lg">
            <img src="icons/icon-leftArrow-small.svg" alt="Back" class="w-5 h-5" />
          </a>
          <div>
            <h1 class="text-2xl font-bold m-0">Expertise Details</h1>
            <p class="text-gray-500 mt-1">View and manage expertise information</p>
          </div>
        </div>
        @if (expertise()) {
        <div class="flex items-center gap-3">
          @if (expertise()?.isDisabled) {
          <button
            class="px-4 py-2 border border-green-300 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 text-sm font-medium"
            (click)="toggleDisabled()">
            Enable
          </button>
          } @else {
          <button
            class="px-4 py-2 border border-amber-300 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 text-sm font-medium"
            (click)="toggleDisabled()">
            Disable
          </button>
          }
          <button
            class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
            (click)="deleteExpertise()">
            Delete
          </button>
        </div>
        }
      </header>

      @if (loading()) {
      <div class="text-center py-16 text-gray-500">
        <div class="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p class="mt-4">Loading expertise details...</p>
      </div>
      } @else if (expertise()) {
      <!-- Main Content Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Left Column - Main Info -->
        <div class="lg:col-span-2 flex flex-col gap-6">
          <!-- Cover Image -->
          @if (expertise()?.coverPhoto) {
          <div class="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <img [src]="expertise()?.coverPhoto" [alt]="expertise()?.expertiseTitle"
              class="w-full h-[300px] object-cover" />
          </div>
          }

          <!-- Basic Info -->
          <div class="bg-white border border-gray-200 rounded-lg p-6">
            <div class="flex items-start justify-between mb-4">
              <div>
                <h2 class="text-xl font-bold m-0">{{ expertise()?.expertiseTitle }}</h2>
                <p class="text-gray-500 mt-1">{{ expertise()?.slug }}</p>
              </div>
              <div class="flex items-center gap-2">
                <span class="px-3 py-1 rounded-full text-sm font-medium capitalize"
                  [class.bg-green-100]="expertise()?.status === 'published'"
                  [class.text-green-700]="expertise()?.status === 'published'"
                  [class.bg-amber-100]="expertise()?.status === 'draft'"
                  [class.text-amber-700]="expertise()?.status === 'draft'"
                  [class.bg-gray-100]="expertise()?.status === 'archived'"
                  [class.text-gray-600]="expertise()?.status === 'archived'">
                  {{ expertise()?.status }}
                </span>
                @if (expertise()?.isDisabled) {
                <span class="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700">
                  Disabled
                </span>
                }
              </div>
            </div>

            @if (expertise()?.expertiseSummary) {
            <div class="border-t border-gray-100 pt-4 mt-4">
              <h3 class="font-semibold mb-2">Summary</h3>
              <p class="text-gray-600">{{ expertise()?.expertiseSummary }}</p>
            </div>
            }
          </div>

          <!-- Host Info -->
          @if (expertise()?.host) {
          <div class="bg-white border border-gray-200 rounded-lg p-6">
            <h3 class="font-semibold mb-4">Host</h3>
            <div class="flex items-center gap-4">
              <ui-avatar [imageUrl]="expertise()?.host?.profileUrl" [name]="expertise()?.host?.name || ''" size="lg" />
              <div>
                <p class="font-medium">{{ expertise()?.host?.name }}</p>
                <p class="text-sm text-gray-500">{{ expertise()?.host?.description }}</p>
              </div>
            </div>
          </div>
          }

          <!-- Tickets -->
          @if (expertise()?.ticket && expertise()?.ticket?.length) {
          <div class="bg-white border border-gray-200 rounded-lg p-6">
            <h3 class="font-semibold mb-4">Tickets / Pricing</h3>
            <div class="space-y-3">
              @for (ticket of expertise()?.ticket; track ticket.id) {
              <div class="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <div>
                  <p class="font-medium">{{ ticket.ticketName }}</p>
                  <p class="text-sm text-gray-500">{{ ticket.ticketType }} - {{ ticket.ticketQty }} available</p>
                </div>
                <p class="font-bold text-lg">{{ expertise()?.currency }} {{ ticket.standardRate | number:'1.2-2' }}</p>
              </div>
              }
            </div>
          </div>
          }
        </div>

        <!-- Right Column - Sidebar -->
        <div class="flex flex-col gap-6">
          <!-- Hub Info -->
          @if (expertise()?.hub) {
          <div class="bg-white border border-gray-200 rounded-lg p-6">
            <h3 class="font-semibold mb-4">Hub</h3>
            <div class="flex items-center gap-3">
              <ui-avatar [imageUrl]="expertise()?.hub?.logo" [name]="expertise()?.hub?.name || ''" size="lg" />
              <div>
                <p class="font-medium">{{ expertise()?.hub?.name }}</p>
                <p class="text-sm text-gray-500">{{ expertise()?.hub?.slug }}</p>
              </div>
            </div>
          </div>
          }

          <!-- Creator Info -->
          @if (expertise()?.creator) {
          <div class="bg-white border border-gray-200 rounded-lg p-6">
            <h3 class="font-semibold mb-4">Created By</h3>
            <div class="flex items-center gap-3">
              <ui-avatar [imageUrl]="expertise()?.creator?.profilePhoto" [name]="expertise()?.creator?.name || ''" size="md" />
              <div>
                <p class="font-medium">{{ expertise()?.creator?.name }}</p>
                <p class="text-sm text-gray-500">{{ expertise()?.creator?.email }}</p>
              </div>
            </div>
          </div>
          }

          <!-- Status Actions -->
          <div class="bg-white border border-gray-200 rounded-lg p-6">
            <h3 class="font-semibold mb-4">Actions</h3>
            <div class="flex flex-col gap-2">
              @if (expertise()?.status !== 'published') {
              <button
                class="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                (click)="updateStatus('published')">
                Publish
              </button>
              }
              @if (expertise()?.status !== 'draft') {
              <button
                class="w-full px-4 py-2 border border-amber-300 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 text-sm font-medium"
                (click)="updateStatus('draft')">
                Set as Draft
              </button>
              }
              @if (expertise()?.status !== 'archived') {
              <button
                class="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium"
                (click)="updateStatus('archived')">
                Archive
              </button>
              }
            </div>
          </div>

          <!-- Metadata -->
          <div class="bg-white border border-gray-200 rounded-lg p-6">
            <h3 class="font-semibold mb-4">Metadata</h3>
            <div class="space-y-3 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-500">ID</span>
                <span class="font-mono text-xs">{{ expertise()?._id }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">Language</span>
                <span>{{ expertise()?.primaryLanguage }}</span>
              </div>
              @if (expertise()?.rating) {
              <div class="flex justify-between">
                <span class="text-gray-500">Rating</span>
                <span>{{ expertise()?.rating | number:'1.1-1' }} / 5</span>
              </div>
              }
              <div class="flex justify-between">
                <span class="text-gray-500">Created</span>
                <span>{{ expertise()?.createdAt | date:'medium' }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">Updated</span>
                <span>{{ expertise()?.updatedAt | date:'medium' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      } @else {
      <div class="text-center py-16 text-gray-500">
        <p class="m-0">Expertise not found</p>
        <a routerLink="/dashboard/services" class="text-primary hover:underline mt-2 inline-block">
          Back to Services
        </a>
      </div>
      }
    </div>
  `,
})
export class ExpertiseDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly servicesService = inject(ServicesService);
  private readonly dialogService = inject(DialogService);
  private readonly toast = inject(ToastService);

  loading = signal(true);
  expertise = signal<Expertise | null>(null);

  ngOnInit() {
    this.route.params.subscribe((params) => {
      const id = params['id'];
      if (id) {
        this.loadExpertise(id);
      }
    });
  }

  loadExpertise(id: string) {
    this.loading.set(true);
    this.servicesService.getExpertiseById(id).subscribe({
      next: (response) => {
        this.expertise.set(response.data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load expertise:', err);
        this.loading.set(false);
        this.toast.error('Failed to load expertise');
      },
    });
  }

  async updateStatus(status: ExpertiseStatus) {
    const exp = this.expertise();
    if (!exp) return;

    const statusLabels: Record<ExpertiseStatus, string> = {
      draft: 'Draft',
      published: 'Published',
      archived: 'Archived',
    };

    const confirmed = await this.dialogService.confirm({
      title: `Change Status to ${statusLabels[status]}`,
      message: `Are you sure you want to change the status to ${statusLabels[status]}?`,
      type: status === 'archived' ? 'danger' : 'warning',
      confirmText: 'Confirm',
    });

    if (!confirmed) return;

    this.servicesService.updateExpertiseStatus(exp._id, status).subscribe({
      next: (response) => {
        this.expertise.set(response.data);
        this.toast.success(`Status updated to ${statusLabels[status]}`);
      },
      error: (err) => {
        this.toast.error(err.error?.error?.message || 'Failed to update status');
      },
    });
  }

  async toggleDisabled() {
    const exp = this.expertise();
    if (!exp) return;

    const action = exp.isDisabled ? 'enable' : 'disable';
    const confirmed = await this.dialogService.confirm({
      title: exp.isDisabled ? 'Enable Expertise' : 'Disable Expertise',
      message: `Are you sure you want to ${action} this expertise?`,
      type: 'warning',
      confirmText: 'Confirm',
    });

    if (!confirmed) return;

    this.servicesService.toggleExpertiseDisabled(exp._id).subscribe({
      next: (response) => {
        this.expertise.set(response.data);
        this.toast.success(exp.isDisabled ? 'Expertise enabled' : 'Expertise disabled');
      },
      error: (err) => {
        this.toast.error(err.error?.error?.message || 'Failed to toggle disabled status');
      },
    });
  }

  async deleteExpertise() {
    const exp = this.expertise();
    if (!exp) return;

    const confirmed = await this.dialogService.confirm({
      title: 'Delete Expertise',
      message: `Are you sure you want to permanently delete "${exp.expertiseTitle}"?`,
      type: 'danger',
      confirmText: 'Delete',
    });

    if (!confirmed) return;

    this.servicesService.deleteExpertise(exp._id).subscribe({
      next: () => {
        this.toast.success('Expertise deleted');
        this.router.navigate(['/dashboard/services']);
      },
      error: (err) => {
        this.toast.error(err.error?.error?.message || 'Failed to delete expertise');
      },
    });
  }
}
