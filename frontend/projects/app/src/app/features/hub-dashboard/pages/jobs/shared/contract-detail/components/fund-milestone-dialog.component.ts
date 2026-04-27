import { Component, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { Milestone } from '../../../../../services/hub-jobs-api.service';

export type FundOption = 'single' | 'all' | 'specific';

@Component({
  selector: 'app-fund-milestone-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (isOpen()) {
      <div
        class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
        (click)="close.emit()"
      >
        <div
          class="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
          (click)="$event.stopPropagation()"
        >
          <!-- Header -->
          <div class="p-6 border-b border-neutral-200">
            <h2 class="text-xl font-semibold text-neutral-900">Fund Milestone</h2>
          </div>

          <!-- Content -->
          <div class="p-6">
            @if (!isLoading()) {
              <!-- Funding Options -->
              <div class="space-y-3 mb-6">
                <!-- Single milestone option -->
                <label
                  class="flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors"
                  [ngClass]="selectedOption() === 'single'
                    ? 'border-primary bg-primary/5'
                    : 'border-neutral-200 hover:border-neutral-300'"
                >
                  <input
                    type="radio"
                    name="fundOption"
                    value="single"
                    [checked]="selectedOption() === 'single'"
                    (change)="selectOption('single')"
                    class="w-4 h-4 text-primary focus:ring-primary"
                  />
                  <span class="text-neutral-700">
                    Fund <strong>{{ milestone()?.taskName }}</strong>
                  </span>
                </label>

                <!-- Fund all option (if multiple pending) -->
                @if (allPendingMilestones().length > 1) {
                  <label
                    class="flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors"
                    [ngClass]="selectedOption() === 'all'
                      ? 'border-primary bg-primary/5'
                      : 'border-neutral-200 hover:border-neutral-300'"
                  >
                    <input
                      type="radio"
                      name="fundOption"
                      value="all"
                      [checked]="selectedOption() === 'all'"
                      (change)="selectOption('all')"
                      class="w-4 h-4 text-primary focus:ring-primary"
                    />
                    <span class="text-neutral-700">
                      Fund all remaining milestones ({{ allPendingMilestones().length }})
                    </span>
                  </label>

                  <!-- Choose specific option -->
                  <label
                    class="flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors"
                    [ngClass]="selectedOption() === 'specific'
                      ? 'border-primary bg-primary/5'
                      : 'border-neutral-200 hover:border-neutral-300'"
                  >
                    <input
                      type="radio"
                      name="fundOption"
                      value="specific"
                      [checked]="selectedOption() === 'specific'"
                      (change)="selectOption('specific')"
                      class="w-4 h-4 text-primary focus:ring-primary"
                    />
                    <span class="text-neutral-700">
                      Choose specific milestones
                    </span>
                  </label>

                  <!-- Specific milestone selection -->
                  @if (selectedOption() === 'specific') {
                    <div class="ml-7 space-y-2">
                      @for (m of allPendingMilestones(); track m._id) {
                        <label
                          class="flex items-center gap-3 p-3 rounded-lg border border-neutral-200 cursor-pointer hover:bg-neutral-50"
                        >
                          <input
                            type="checkbox"
                            [checked]="isSelected(m)"
                            (change)="toggleMilestone(m)"
                            class="w-4 h-4 text-primary focus:ring-primary rounded"
                          />
                          <span class="flex-1 text-neutral-700">{{ m.taskName }}</span>
                          <span class="font-medium text-neutral-900">
                            {{ currency() }} {{ m.amount | number:'1.2-2' }}
                          </span>
                        </label>
                      }
                    </div>
                  }
                }
              </div>

              <!-- Total Amount -->
              <div class="bg-neutral-50 rounded-lg p-4 mb-6">
                <div class="flex justify-between items-center">
                  <span class="text-neutral-600">Total amount:</span>
                  <span class="text-2xl font-bold text-neutral-900">
                    {{ currency() }} {{ totalAmount() | number:'1.2-2' }}
                  </span>
                </div>
              </div>

              <!-- Payment Method -->
              <div class="mb-6">
                @if (paymentMethod()) {
                  <p class="text-sm text-neutral-500 mb-3">Your payment will be charged to:</p>
                  <div class="flex items-center gap-3 p-4 border border-neutral-200 rounded-lg">
                    <div class="w-10 h-10 bg-neutral-100 rounded flex items-center justify-center">
                      <svg class="w-6 h-6 text-neutral-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
                      </svg>
                    </div>
                    <div class="flex-1">
                      <p class="font-medium text-neutral-900 capitalize">{{ cardBrand }}</p>
                      <p class="text-sm text-neutral-500">**** **** **** {{ cardLast4 }}</p>
                    </div>
                    <span class="px-2 py-1 text-xs font-medium bg-neutral-100 text-neutral-600 rounded">
                      Default
                    </span>
                  </div>
                  <p class="text-xs text-neutral-400 mt-2">
                    Payment region: {{ stripeRegion() === 'malaysia' ? 'Malaysia' : 'Global' }}
                  </p>
                } @else {
                  <div class="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p class="text-sm text-yellow-800 mb-2">
                      You don't have any payment methods for this region. Please add a payment method to continue.
                    </p>
                    <p class="text-xs text-neutral-500 mb-2">
                      Payment region: {{ stripeRegion() === 'malaysia' ? 'Malaysia' : 'Global' }}
                    </p>
                    <button
                      (click)="addPaymentMethod.emit()"
                      class="text-sm font-medium text-primary hover:text-primary/80"
                    >
                      Add Payment Method
                    </button>
                  </div>
                }
              </div>
            } @else {
              <!-- Loading state -->
              <div class="flex items-center justify-center py-12">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            }
          </div>

          <!-- Actions -->
          <div class="p-6 border-t border-neutral-200 flex justify-end gap-3">
            <button
              (click)="close.emit()"
              [disabled]="isLoading()"
              class="px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              (click)="fund()"
              [disabled]="isLoading() || !paymentMethod() || totalAmount() === 0"
              class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              @if (isLoading()) {
                <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Processing...
              } @else {
                Fund milestone(s)
              }
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class FundMilestoneDialogComponent {
  isOpen = input<boolean>(false);
  milestone = input<Milestone | null>(null);
  allPendingMilestones = input<Milestone[]>([]);
  currency = input<string>('MYR');
  paymentMethod = input<{
    id?: string;
    brand?: string;
    last4?: string;
    expMonth?: number;
    expYear?: number;
    card?: { brand?: string; last4?: string }; // Legacy format support
  } | null>(null);
  isLoading = input<boolean>(false);
  stripeRegion = input<'malaysia' | 'atlas'>('atlas');

  close = output<void>();
  fundMilestones = output<{ milestoneIds: string[]; option: FundOption }>();
  addPaymentMethod = output<void>();

  // Helper to get brand (supports both old and new format)
  get cardBrand(): string {
    const pm = this.paymentMethod();
    return pm?.brand || pm?.card?.brand || 'Card';
  }

  // Helper to get last4 (supports both old and new format)
  get cardLast4(): string {
    const pm = this.paymentMethod();
    return pm?.last4 || pm?.card?.last4 || '****';
  }

  selectedOption = signal<FundOption>('single');
  selectedMilestoneIds = signal<Set<string>>(new Set());

  totalAmount = computed(() => {
    const option = this.selectedOption();
    const ms = this.milestone();
    const allMs = this.allPendingMilestones();

    switch (option) {
      case 'single':
        return ms?.amount || 0;
      case 'all':
        return allMs.reduce((sum, m) => sum + (m.amount || 0), 0);
      case 'specific':
        const selectedIds = this.selectedMilestoneIds();
        return allMs
          .filter(m => selectedIds.has(m._id))
          .reduce((sum, m) => sum + (m.amount || 0), 0);
      default:
        return 0;
    }
  });

  selectOption(option: FundOption): void {
    this.selectedOption.set(option);
    if (option === 'single' && this.milestone()) {
      this.selectedMilestoneIds.set(new Set([this.milestone()!._id]));
    } else if (option === 'all') {
      this.selectedMilestoneIds.set(new Set(this.allPendingMilestones().map(m => m._id)));
    }
  }

  toggleMilestone(milestone: Milestone): void {
    const current = new Set(this.selectedMilestoneIds());
    if (current.has(milestone._id)) {
      current.delete(milestone._id);
    } else {
      current.add(milestone._id);
    }
    this.selectedMilestoneIds.set(current);
  }

  isSelected(milestone: Milestone): boolean {
    return this.selectedMilestoneIds().has(milestone._id);
  }

  fund(): void {
    const option = this.selectedOption();
    let milestoneIds: string[] = [];

    switch (option) {
      case 'single':
        if (this.milestone()) {
          milestoneIds = [this.milestone()!._id];
        }
        break;
      case 'all':
        milestoneIds = this.allPendingMilestones().map(m => m._id);
        break;
      case 'specific':
        milestoneIds = Array.from(this.selectedMilestoneIds());
        break;
    }

    if (milestoneIds.length > 0) {
      this.fundMilestones.emit({ milestoneIds, option });
    }
  }
}
