import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { Contract, Milestone } from '../../../../../services/hub-jobs-api.service';

@Component({
  selector: 'app-financial-overview',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-xl border border-neutral-200 p-6">
      @if (contract()?.priceType === 'fixed') {
        <!-- Fixed Price Layout -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
          <!-- Project Price -->
          <div class="text-center md:text-left">
            <p class="text-xs text-neutral-500 uppercase tracking-wide mb-1">PROJECT PRICE</p>
            <p class="text-xl font-bold text-neutral-900">
              {{ currency() }} {{ contract()?.proposedPrice | number:'1.2-2' }}
            </p>
            <span class="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-neutral-100 text-neutral-600 rounded">
              FIXED PRICE
            </span>
          </div>

          <!-- In Escrow -->
          <div class="text-center md:text-left">
            <p class="text-xs text-neutral-500 uppercase tracking-wide mb-1">IN ESCROW</p>
            <p class="text-xl font-bold text-blue-600">
              {{ currency() }} {{ inEscrow() | number:'1.2-2' }}
            </p>
          </div>

          <!-- Milestone Remaining -->
          <div class="text-center md:text-left">
            <p class="text-xs text-neutral-500 uppercase tracking-wide mb-1">
              MILESTONE REMAINING ({{ pendingMilestones() }}/{{ totalMilestones() }})
            </p>
            <p class="text-xl font-bold text-neutral-900">
              {{ currency() }} {{ remainingAmount() | number:'1.2-2' }}
            </p>
          </div>

          <!-- Paid to Date -->
          <div class="text-center md:text-left">
            <p class="text-xs text-neutral-500 uppercase tracking-wide mb-1">PAID TO DATE</p>
            <p class="text-xl font-bold text-green-600">
              {{ currency() }} {{ paidAmount() | number:'1.2-2' }}
            </p>
          </div>
        </div>
      } @else {
        <!-- Hourly Layout -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
          <!-- Total Charged This Week -->
          <div class="text-center md:text-left">
            <p class="text-xs text-neutral-500 uppercase tracking-wide mb-1">
              @if (isExpert()) {
                TOTAL TO BE EARNED THIS WEEK
              } @else {
                TOTAL CHARGED THIS WEEK
              }
            </p>
            <p class="text-xl font-bold text-neutral-900">
              {{ currency() }} {{ weeklyCharge() | number:'1.2-2' }}
            </p>
            <p class="text-xs text-neutral-500 mt-1">
              at a rate of {{ currency() }} {{ contract()?.hourlyProposedPrice | number:'1.2-2' }}/hr
            </p>
          </div>

          <!-- Hours Logged This Week -->
          <div class="text-center md:text-left">
            <div class="flex items-center gap-3">
              <div class="relative w-14 h-14">
                <svg class="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                  <circle cx="28" cy="28" r="24" fill="none" stroke="#E5E7EB" stroke-width="4"/>
                  <circle
                    cx="28" cy="28" r="24"
                    fill="none"
                    stroke="#EC4899"
                    stroke-width="4"
                    stroke-linecap="round"
                    [attr.stroke-dasharray]="circumference()"
                    [attr.stroke-dashoffset]="getStrokeDashoffset(hoursThisWeek(), weeklyLimit())"
                  />
                </svg>
              </div>
              <div>
                <p class="text-xs text-neutral-500 uppercase tracking-wide">HOURS LOGGED THIS WEEK</p>
                <p class="text-lg font-bold text-neutral-900">
                  {{ hoursThisWeek() | number:'1.0-1' }} of {{ weeklyLimit() }} hrs
                </p>
              </div>
            </div>
          </div>

          <!-- Hours Logged Last Week -->
          <div class="text-center md:text-left">
            <div class="flex items-center gap-3">
              <div class="relative w-14 h-14">
                <svg class="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                  <circle cx="28" cy="28" r="24" fill="none" stroke="#E5E7EB" stroke-width="4"/>
                  <circle
                    cx="28" cy="28" r="24"
                    fill="none"
                    stroke="#6B7280"
                    stroke-width="4"
                    stroke-linecap="round"
                    [attr.stroke-dasharray]="circumference()"
                    [attr.stroke-dashoffset]="getStrokeDashoffset(hoursLastWeek(), weeklyLimit())"
                  />
                </svg>
              </div>
              <div>
                <p class="text-xs text-neutral-500 uppercase tracking-wide">HOURS LOGGED LAST WEEK</p>
                <p class="text-lg font-bold text-neutral-900">
                  {{ hoursLastWeek() | number:'1.0-1' }} of {{ weeklyLimit() }} hrs
                </p>
              </div>
            </div>
          </div>

          <!-- Paid to Date / Since Start -->
          <div class="text-center md:text-left">
            <p class="text-xs text-neutral-500 uppercase tracking-wide mb-1">
              @if (isExpert()) {
                SINCE START
              } @else {
                PAID TO DATE
              }
            </p>
            <p class="text-xl font-bold text-green-600">
              {{ currency() }} {{ paidAmount() | number:'1.2-2' }}
            </p>
            <p class="text-xs text-neutral-500 mt-1">
              ({{ totalHoursWorked() | number:'1.1-1' }} hrs)
            </p>
          </div>
        </div>
      }
    </div>
  `,
})
export class FinancialOverviewComponent {
  contract = input<Contract | null>();
  milestones = input<Milestone[]>([]);
  isExpert = input<boolean>(false);
  hoursThisWeek = input<number>(0);
  hoursLastWeek = input<number>(0);
  weeklyCharge = input<number>(0);
  totalHoursWorked = input<number>(0);

  currency = computed(() => this.contract()?.selectedCurrency || 'MYR');
  weeklyLimit = computed(() => this.contract()?.weeklyLimit || 40);

  // Fixed price computed values
  totalMilestones = computed(() => this.milestones().length);

  pendingMilestones = computed(() => {
    const ms = this.milestones();
    return ms.filter(m => !['released', 'approved', 'paid'].includes(m.status)).length;
  });

  inEscrow = computed(() => {
    const ms = this.milestones();
    return ms
      .filter(m => m.status === 'funded' || m.status === 'work_submitted' || m.status === 'submitted')
      .reduce((sum, m) => sum + (m.amount || 0), 0);
  });

  paidAmount = computed(() => {
    if (this.contract()?.priceType === 'fixed') {
      const ms = this.milestones();
      return ms
        .filter(m => ['released', 'approved', 'paid'].includes(m.status))
        .reduce((sum, m) => sum + (m.amount || 0), 0);
    }
    return this.contract()?.paidAmount || 0;
  });

  remainingAmount = computed(() => {
    const ms = this.milestones();
    return ms
      .filter(m => m.status === 'pending')
      .reduce((sum, m) => sum + (m.amount || 0), 0);
  });

  // Circle progress helpers
  circumference(): number {
    return 2 * Math.PI * 24; // radius = 24
  }

  getStrokeDashoffset(current: number, max: number): number {
    const percentage = Math.min(current / max, 1);
    return this.circumference() * (1 - percentage);
  }
}
