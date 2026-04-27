import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { Milestone, Contract } from '../../../../../services/hub-jobs-api.service';

@Component({
  selector: 'app-milestone-timeline',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="milestone-timeline">
      <h3 class="text-lg font-semibold text-neutral-900 mb-6">Milestone timeline</h3>

      <div class="relative pl-1">
        <!-- Milestones -->
        @for (milestone of milestones(); track milestone._id; let i = $index; let isLast = $last) {
          <div class="relative flex gap-4 pb-8" [class.pb-0]="isLast">
            <!-- Timeline line segment (between circles) -->
            @if (!isLast) {
              <div class="absolute left-[19px] top-10 w-0.5 h-full bg-neutral-200 -z-0"></div>
            }
            <!-- Circle indicator -->
            <div class="relative z-10 flex-shrink-0">
              <div
                class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-all bg-white"
                [ngClass]="getCircleClasses(milestone.status)"
              >
                @if (isCompleted(milestone.status)) {
                  <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                  </svg>
                } @else {
                  {{ i + 1 }}
                }
              </div>
            </div>

            <!-- Milestone content -->
            <div class="flex-1 pt-1">
              <div class="bg-white rounded-lg border border-neutral-200 p-4 hover:shadow-md transition-shadow">
                <div class="flex items-start justify-between gap-4">
                  <div class="flex-1 min-w-0">
                    <h4 class="text-base font-medium text-neutral-900 mb-1">{{ milestone.taskName }}</h4>
                    <div class="flex items-center gap-2 mb-2">
                      <span class="text-lg font-semibold text-neutral-900">
                        {{ currency() }} {{ milestone.amount | number:'1.2-2' }}
                      </span>
                      <span
                        class="px-2 py-0.5 text-xs font-medium rounded-full"
                        [ngClass]="getStatusBadgeClasses(milestone.status)"
                      >
                        {{ getStatusLabel(milestone.status) }}
                      </span>
                    </div>
                    @if (milestone.dueDate) {
                      <p class="text-sm text-neutral-500">Due: {{ formatDate(milestone.dueDate) }}</p>
                    }
                    @if (milestone.taskDescription) {
                      <p class="text-sm text-neutral-600 mt-2">{{ milestone.taskDescription }}</p>
                    }
                    @if (milestone.workLogDescription) {
                      <div class="mt-3 p-3 bg-neutral-50 rounded border border-neutral-100">
                        <p class="text-xs text-neutral-500 uppercase tracking-wide mb-1">Work Submitted</p>
                        <p class="text-sm text-neutral-700">{{ milestone.workLogDescription }}</p>
                      </div>
                    }
                  </div>

                  <!-- Action buttons -->
                  <div class="flex flex-col gap-2">
                    @switch (milestone.status) {
                      @case ('pending') {
                        @if (!isExpert()) {
                          <button
                            (click)="fundMilestone.emit(milestone)"
                            class="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors whitespace-nowrap"
                          >
                            Fund milestone
                          </button>
                        } @else {
                          <!-- Expert sees disabled Submit work button on pending milestone -->
                          <button
                            disabled
                            class="px-4 py-2 bg-neutral-200 text-neutral-400 text-sm font-medium rounded-lg cursor-not-allowed whitespace-nowrap"
                          >
                            Submit work
                          </button>
                        }
                      }
                      @case ('funded') {
                        @if (isExpert()) {
                          <button
                            (click)="submitWork.emit(milestone)"
                            class="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors whitespace-nowrap"
                          >
                            Submit work
                          </button>
                        }
                      }
                      @case ('work_submitted') {
                        @if (!isExpert()) {
                          <button
                            (click)="requestChange.emit(milestone)"
                            class="px-4 py-2 border border-neutral-300 text-neutral-700 text-sm font-medium rounded-lg hover:bg-neutral-50 transition-colors whitespace-nowrap"
                          >
                            Request change
                          </button>
                          <button
                            (click)="releasePayment.emit(milestone)"
                            class="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
                          >
                            Release payment
                          </button>
                        } @else {
                          <!-- Expert sees Remind to pay button -->
                          <button
                            (click)="remindToPay.emit(milestone)"
                            [disabled]="!canRemindToPay(milestone)"
                            class="px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors"
                            [ngClass]="canRemindToPay(milestone)
                              ? 'bg-primary text-white hover:bg-primary/90'
                              : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'"
                          >
                            Remind to pay
                          </button>
                        }
                        <button
                          (click)="viewWork.emit(milestone)"
                          class="px-4 py-2 border border-neutral-300 text-neutral-700 text-sm font-medium rounded-lg hover:bg-neutral-50 transition-colors whitespace-nowrap"
                        >
                          View work
                        </button>
                      }
                      @case ('submitted') {
                        @if (!isExpert()) {
                          <button
                            (click)="requestChange.emit(milestone)"
                            class="px-4 py-2 border border-neutral-300 text-neutral-700 text-sm font-medium rounded-lg hover:bg-neutral-50 transition-colors whitespace-nowrap"
                          >
                            Request change
                          </button>
                          <button
                            (click)="releasePayment.emit(milestone)"
                            class="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
                          >
                            Release payment
                          </button>
                        } @else {
                          <button
                            (click)="remindToPay.emit(milestone)"
                            [disabled]="!canRemindToPay(milestone)"
                            class="px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors"
                            [ngClass]="canRemindToPay(milestone)
                              ? 'bg-primary text-white hover:bg-primary/90'
                              : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'"
                          >
                            Remind to pay
                          </button>
                        }
                      }
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>
        }
      </div>

      <!-- Add milestone link (V1 style) -->
      @if (!isExpert()) {
        <div class="relative flex gap-4 mt-4 pl-1">
          <div class="relative z-10 flex-shrink-0">
            <div class="w-10 h-10 rounded-full flex items-center justify-center border-2 border-dashed border-pink-300 text-pink-500 bg-white">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
              </svg>
            </div>
          </div>
          <div class="flex-1 pt-2">
            <button
              (click)="addMilestone.emit()"
              class="text-pink-500 hover:text-pink-600 text-sm font-medium transition-colors"
            >
              Add a new milestone
            </button>
          </div>
        </div>

        <div class="mt-6">
          <button
            (click)="manageMilestones.emit()"
            class="px-4 py-2 border border-neutral-300 text-neutral-700 text-sm font-medium rounded-lg hover:bg-neutral-50 transition-colors"
          >
            Manage milestones
          </button>
        </div>
      }
    </div>
  `,
})
export class MilestoneTimelineComponent {
  milestones = input.required<Milestone[]>();
  contract = input<Contract | null>();
  isExpert = input<boolean>(false);

  fundMilestone = output<Milestone>();
  submitWork = output<Milestone>();
  releasePayment = output<Milestone>();
  viewWork = output<Milestone>();
  requestChange = output<Milestone>();
  remindToPay = output<Milestone>();
  addMilestone = output<void>();
  manageMilestones = output<void>();

  currency = computed(() => this.contract()?.selectedCurrency || 'MYR');

  getCircleClasses(status: string): Record<string, boolean> {
    const completed = this.isCompleted(status);
    const inProgress = status === 'funded' || status === 'work_submitted' || status === 'submitted';

    return {
      'bg-green-500 border-green-500 text-white': completed,
      'bg-blue-500 border-blue-500 text-white': inProgress,
      'bg-white border-neutral-300 text-neutral-600': !completed && !inProgress,
    };
  }

  getStatusBadgeClasses(status: string): Record<string, boolean> {
    return {
      'bg-yellow-100 text-yellow-700': status === 'pending',
      'bg-blue-100 text-blue-700': status === 'funded',
      'bg-orange-100 text-orange-700': status === 'work_submitted' || status === 'submitted',
      'bg-green-100 text-green-700': status === 'released' || status === 'approved' || status === 'paid',
      'bg-neutral-100 text-neutral-600': !['pending', 'funded', 'work_submitted', 'submitted', 'released', 'approved', 'paid'].includes(status),
    };
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'Pending',
      funded: 'Funded',
      work_submitted: 'Work Submitted',
      submitted: 'Submitted',
      approved: 'Approved',
      released: 'Paid',
      paid: 'Paid',
    };
    return labels[status] || status.charAt(0).toUpperCase() + status.slice(1);
  }

  isCompleted(status: string): boolean {
    return ['released', 'approved', 'paid'].includes(status);
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  /**
   * Determines if expert can send a reminder to pay.
   * In v1: Expert can only remind within 24 hours of work submission.
   */
  canRemindToPay(milestone: Milestone): boolean {
    const workSubmittedDate = (milestone as any).workSubmittedDate;
    if (!workSubmittedDate) return false;

    const now = new Date();
    const submittedDate = new Date(workSubmittedDate);
    const diffInHours = (now.getTime() - submittedDate.getTime()) / (1000 * 60 * 60);

    // Expert can remind only within 24 hours of submission
    return diffInHours <= 24;
  }
}
