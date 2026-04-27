import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { Contract } from '../../../../../services/hub-jobs-api.service';

export type ContractTab = 'worklog' | 'transaction' | 'details' | 'review';

@Component({
  selector: 'app-contract-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white border-b border-neutral-200">
      <!-- Top section with back button and status -->
      <div class="px-6 pt-6">
        <div class="flex items-center gap-4 mb-4">
          <button
            (click)="goBack.emit()"
            class="p-2 rounded-lg hover:bg-neutral-100 transition-colors"
          >
            <svg class="w-5 h-5 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <span
            class="px-3 py-1 text-sm font-medium rounded-full"
            [ngClass]="getStatusClasses(contract()?.status || '')"
          >
            {{ contract()?.status?.toUpperCase() }}
          </span>
        </div>

        <!-- Contract Title -->
        <h1 class="text-2xl lg:text-3xl font-bold text-neutral-900 mb-6">
          {{ contract()?.contractTitle }}
        </h1>

        <!-- Profile Cards Row -->
        <div class="flex flex-wrap gap-8 mb-6">
          <!-- Contracted To (Expert Info for Client, Client Info for Expert) -->
          <div class="flex items-start gap-3">
            <div class="w-12 h-12 rounded-full bg-neutral-200 overflow-hidden flex-shrink-0">
              @if (expertProfile()?.profileImage) {
                <img [src]="expertProfile()?.profileImage" alt="Expert" class="w-full h-full object-cover" />
              } @else {
                <div class="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-medium">
                  {{ expertProfile()?.name?.charAt(0) || 'E' }}
                </div>
              }
            </div>
            <div>
              <p class="text-xs text-neutral-500 uppercase tracking-wide">CONTRACTED TO:</p>
              <p class="font-semibold text-neutral-900">{{ expertProfile()?.name || 'Expert' }}</p>
              <p class="text-sm text-neutral-500">{{ expertHubName() }}</p>
            </div>
          </div>

          <!-- Expert -->
          <div class="flex items-start gap-3">
            <div class="w-12 h-12 rounded-full bg-neutral-200 overflow-hidden flex-shrink-0">
              @if (expertProfile()?.profileImage) {
                <img [src]="expertProfile()?.profileImage" alt="Expert" class="w-full h-full object-cover" />
              } @else {
                <div class="w-full h-full flex items-center justify-center bg-green-100 text-green-700 font-medium">
                  {{ expertProfile()?.name?.charAt(0) || 'E' }}
                </div>
              }
            </div>
            <div>
              <p class="text-xs text-neutral-500 uppercase tracking-wide">EXPERT:</p>
              <p class="font-semibold text-neutral-900">{{ expertProfile()?.name || 'Expert' }}</p>
            </div>
          </div>

          <!-- Client -->
          <div class="flex items-start gap-3">
            <div class="w-12 h-12 rounded-full bg-neutral-200 overflow-hidden flex-shrink-0">
              @if (clientHub()?.logo) {
                <img [src]="clientHub()?.logo" alt="Client" class="w-full h-full object-cover" />
              } @else {
                <div class="w-full h-full flex items-center justify-center bg-blue-100 text-blue-700 font-medium">
                  {{ clientHub()?.name?.charAt(0) || 'C' }}
                </div>
              }
            </div>
            <div>
              <p class="text-xs text-neutral-500 uppercase tracking-wide">CLIENT:</p>
              <p class="font-semibold text-neutral-900">{{ clientHub()?.name || 'Client Hub' }}</p>
              <p class="text-sm text-neutral-500">PIC: {{ clientProfile()?.name }}</p>
            </div>
          </div>

        </div>
      </div>

      <!-- Tabs Navigation with Message Button -->
      <div class="px-6 flex items-center border-t border-neutral-100">
        <div class="flex gap-6">
        <button
          (click)="tabChange.emit('worklog')"
          class="py-4 px-1 text-sm font-medium border-b-2 transition-colors"
          [ngClass]="activeTab() === 'worklog'
            ? 'border-primary text-primary'
            : 'border-transparent text-neutral-500 hover:text-neutral-700'"
        >
          Work log
        </button>
        <button
          (click)="tabChange.emit('transaction')"
          class="py-4 px-1 text-sm font-medium border-b-2 transition-colors"
          [ngClass]="activeTab() === 'transaction'
            ? 'border-primary text-primary'
            : 'border-transparent text-neutral-500 hover:text-neutral-700'"
        >
          Transaction history
        </button>
        <button
          (click)="tabChange.emit('details')"
          class="py-4 px-1 text-sm font-medium border-b-2 transition-colors"
          [ngClass]="activeTab() === 'details'
            ? 'border-primary text-primary'
            : 'border-transparent text-neutral-500 hover:text-neutral-700'"
        >
          Contract details
        </button>
        <button
          (click)="tabChange.emit('review')"
          class="py-4 px-1 text-sm font-medium border-b-2 transition-colors"
          [ngClass]="activeTab() === 'review'
            ? 'border-primary text-primary'
            : 'border-transparent text-neutral-500 hover:text-neutral-700'"
          data-testid="contract-review-tab"
        >
          Review
        </button>
        </div>

        <!-- Message Button (V1 style - pink, after tabs) -->
        <div class="ml-auto py-2">
          <button
            (click)="message.emit()"
            class="px-5 py-2.5 bg-pink-500 text-white rounded-full hover:bg-pink-600 transition-colors font-medium text-sm"
          >
            @if (isExpert()) {
              Message Client
            } @else {
              Message Expert
            }
          </button>
        </div>
      </div>
    </div>
  `,
})
export class ContractHeaderComponent {
  contract = input<Contract | null>();
  isExpert = input<boolean>(false);
  activeTab = input<ContractTab>('worklog');

  goBack = output<void>();
  message = output<void>();
  tabChange = output<ContractTab>();

  expertProfile = computed(() => {
    const c = this.contract();
    return c?.expert || null;
  });

  clientProfile = computed(() => {
    const c = this.contract();
    return c?.client || null;
  });

  clientHub = computed(() => {
    const c = this.contract();
    return c?.clientHub || null;
  });

  expertHubName = computed(() => {
    const c = this.contract();
    return c?.expertHub?.name || '';
  });

  getStatusClasses(status: string): Record<string, boolean> {
    const s = status?.toLowerCase();
    return {
      'bg-green-100 text-green-700': s === 'active',
      'bg-blue-100 text-blue-700': s === 'active-funded',
      'bg-yellow-100 text-yellow-700': s === 'pending',
      'bg-neutral-100 text-neutral-600': s === 'closed' || s === 'completed',
      'bg-red-100 text-red-700': s === 'cancelled' || s === 'declined',
    };
  }
}
