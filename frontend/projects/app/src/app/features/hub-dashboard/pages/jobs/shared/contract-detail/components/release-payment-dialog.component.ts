import { Component, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { Milestone } from '../../../../../services/hub-jobs-api.service';

export type ReleaseOption = 'single' | 'all' | 'specific';

@Component({
  selector: 'app-release-payment-dialog',
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
            <h2 class="text-xl font-semibold text-neutral-900">Confirm Payment Release</h2>
          </div>

          <!-- Content -->
          <div class="p-6">
            @if (!isLoading()) {
              <!-- Info message -->
              <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p class="text-sm text-blue-800">
                  Once released, the funds will be sent to the Expert.
                </p>
              </div>

              <!-- Release Options -->
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
                    name="releaseOption"
                    value="single"
                    [checked]="selectedOption() === 'single'"
                    (change)="selectOption('single')"
                    class="w-4 h-4 text-primary focus:ring-primary"
                  />
                  <span class="text-neutral-700">
                    Release payment for <strong>{{ milestone()?.taskName }}</strong> only
                  </span>
                </label>

                <!-- Release all option (if multiple submitted) -->
                @if (allSubmittedMilestones().length > 1) {
                  <label
                    class="flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors"
                    [ngClass]="selectedOption() === 'all'
                      ? 'border-primary bg-primary/5'
                      : 'border-neutral-200 hover:border-neutral-300'"
                  >
                    <input
                      type="radio"
                      name="releaseOption"
                      value="all"
                      [checked]="selectedOption() === 'all'"
                      (change)="selectOption('all')"
                      class="w-4 h-4 text-primary focus:ring-primary"
                    />
                    <span class="text-neutral-700">
                      Release all pending payments ({{ allSubmittedMilestones().length }})
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
                      name="releaseOption"
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
                      @for (m of allSubmittedMilestones(); track m._id) {
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
              <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <div class="flex justify-between items-center">
                  <span class="text-green-800">Total amount to release:</span>
                  <span class="text-2xl font-bold text-green-700">
                    {{ currency() }} {{ totalAmount() | number:'1.2-2' }}
                  </span>
                </div>
              </div>

              <!-- Work submitted preview -->
              @if (milestone()?.workLogDescription && selectedOption() === 'single') {
                <div class="bg-neutral-50 rounded-lg p-4 mb-6">
                  <p class="text-xs text-neutral-500 uppercase tracking-wide mb-2">Work Submitted</p>
                  <p class="text-sm text-neutral-700">{{ milestone()?.workLogDescription }}</p>
                </div>
              }
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
              (click)="release()"
              [disabled]="isLoading() || totalAmount() === 0"
              class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              @if (isLoading()) {
                <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Processing...
              } @else {
                Release payment
              }
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ReleasePaymentDialogComponent {
  isOpen = input<boolean>(false);
  milestone = input<Milestone | null>(null);
  allSubmittedMilestones = input<Milestone[]>([]);
  currency = input<string>('MYR');
  isLoading = input<boolean>(false);

  close = output<void>();
  releaseMilestones = output<{ milestoneIds: string[]; option: ReleaseOption }>();

  selectedOption = signal<ReleaseOption>('single');
  selectedMilestoneIds = signal<Set<string>>(new Set());

  totalAmount = computed(() => {
    const option = this.selectedOption();
    const ms = this.milestone();
    const allMs = this.allSubmittedMilestones();

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

  selectOption(option: ReleaseOption): void {
    this.selectedOption.set(option);
    if (option === 'single' && this.milestone()) {
      this.selectedMilestoneIds.set(new Set([this.milestone()!._id]));
    } else if (option === 'all') {
      this.selectedMilestoneIds.set(new Set(this.allSubmittedMilestones().map(m => m._id)));
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

  release(): void {
    const option = this.selectedOption();
    let milestoneIds: string[] = [];

    switch (option) {
      case 'single':
        if (this.milestone()) {
          milestoneIds = [this.milestone()!._id];
        }
        break;
      case 'all':
        milestoneIds = this.allSubmittedMilestones().map(m => m._id);
        break;
      case 'specific':
        milestoneIds = Array.from(this.selectedMilestoneIds());
        break;
    }

    if (milestoneIds.length > 0) {
      this.releaseMilestones.emit({ milestoneIds, option });
    }
  }
}
