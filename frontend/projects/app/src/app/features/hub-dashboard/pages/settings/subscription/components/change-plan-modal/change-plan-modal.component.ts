import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent, DialogRef, DIALOG_DATA } from '@mereka/ui';
import {
  HubSubscriptionService,
  PlanInfo,
  PlanChangePreview,
} from '../../../../../services/hub-subscription.service';

export interface ChangePlanModalData {
  currentPlan: PlanInfo;
  availablePlans: PlanInfo[];
}

type ModalStep = 'select' | 'preview' | 'success';

@Component({
  selector: 'app-change-plan-modal',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="change-plan-modal w-full max-w-2xl">
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-neutral-200">
        <h2 class="text-xl font-bold text-neutral-900">
          {{ step() === 'success' ? 'Plan Changed!' : 'Change Plan' }}
        </h2>
        <button
          type="button"
          (click)="close()"
          class="p-2 rounded-lg hover:bg-neutral-100 transition-colors"
        >
          <ui-icon name="close" size="sm" />
        </button>
      </div>

      <!-- Content -->
      <div class="p-6">
        @switch (step()) {
          @case ('select') {
            <!-- Plan Selection -->
            <p class="text-neutral-600 mb-6">
              Select a plan to switch to. Your current plan is
              <strong>{{ data.currentPlan.name }}</strong>.
            </p>

            <div class="grid gap-4">
              @for (plan of data.availablePlans; track plan.planCode) {
                <button
                  type="button"
                  (click)="selectPlan(plan)"
                  [disabled]="plan.isCurrent"
                  class="plan-card text-left p-4 border rounded-xl transition-all"
                  [ngClass]="{
                    'border-primary bg-primary/5': selectedPlan()?.planCode === plan.planCode,
                    'border-neutral-200 hover:border-primary/50': selectedPlan()?.planCode !== plan.planCode && !plan.isCurrent,
                    'border-neutral-100 bg-neutral-50 cursor-not-allowed opacity-60': plan.isCurrent
                  }"
                >
                  <div class="flex items-start justify-between">
                    <div>
                      <div class="flex items-center gap-2 mb-1">
                        <h3 class="text-lg font-bold text-neutral-900 font-sans">{{ plan.name }}</h3>
                        @if (plan.isCurrent) {
                          <span class="px-2 py-0.5 bg-primary text-white text-xs font-medium rounded-full">
                            Current
                          </span>
                        }
                      </div>
                      <p class="text-sm text-neutral-500 font-sans mb-3">{{ plan.tagline }}</p>
                      <ul class="space-y-1">
                        @for (feature of plan.features.slice(0, 3); track feature) {
                          <li class="flex items-center gap-2 text-sm text-neutral-700 font-sans">
                            <svg class="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                            </svg>
                            {{ feature }}
                          </li>
                        }
                        @if (plan.features.length > 3) {
                          <li class="text-sm text-neutral-500 font-sans">
                            +{{ plan.features.length - 3 }} more features
                          </li>
                        }
                      </ul>
                    </div>
                    <div class="text-right">
                      <div class="text-xl font-bold text-neutral-900 font-sans">
                        {{ plan.currency === 'USD' ? '$' : plan.currency }} {{ plan.price / 100 }}
                      </div>
                      <div class="text-sm text-neutral-500 font-sans">/month</div>
                    </div>
                  </div>
                </button>
              }
            </div>
          }

          @case ('preview') {
            <!-- Preview Changes -->
            @if (previewLoading()) {
              <div class="flex items-center justify-center py-12">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span class="ml-3 text-neutral-600">Calculating changes...</span>
              </div>
            } @else if (preview()) {
              <div class="space-y-6">
                <!-- Plan Comparison -->
                <div class="flex items-center justify-between p-4 bg-neutral-50 rounded-xl">
                  <div class="text-center">
                    <div class="text-sm text-neutral-500 mb-1">Current Plan</div>
                    <div class="font-semibold text-neutral-900">{{ preview()!.currentPlan.name }}</div>
                    <div class="text-neutral-600">{{ data.currentPlan.currency === 'USD' ? '$' : data.currentPlan.currency }}{{ preview()!.currentPlan.price / 100 }}/mo</div>
                  </div>
                  <div class="flex items-center px-4">
                    <svg class="w-6 h-6 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                  <div class="text-center">
                    <div class="text-sm text-neutral-500 mb-1">New Plan</div>
                    <div class="font-semibold text-primary">{{ preview()!.newPlan.name }}</div>
                    <div class="text-neutral-600">{{ data.currentPlan.currency === 'USD' ? '$' : data.currentPlan.currency }}{{ preview()!.newPlan.price / 100 }}/mo</div>
                  </div>
                </div>

                <!-- Proration Info -->
                @if (preview()!.proration.amount !== 0) {
                  <div class="p-4 border border-neutral-200 rounded-xl">
                    <h4 class="font-medium text-neutral-900 mb-2">Billing Adjustment</h4>
                    <div class="flex items-center justify-between">
                      <span class="text-neutral-600">{{ preview()!.proration.description }}</span>
                      <span class="font-semibold"
                        [ngClass]="preview()!.proration.amount > 0 ? 'text-red-600' : 'text-green-600'">
                        {{ preview()!.proration.amount > 0 ? '+' : '' }}{{ data.currentPlan.currency === 'USD' ? '$' : data.currentPlan.currency }}{{ preview()!.proration.amount / 100 | number:'1.2-2' }}
                      </span>
                    </div>
                  </div>
                }

                <!-- Summary -->
                <div class="p-4 bg-primary/5 border border-primary/20 rounded-xl">
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-neutral-700">Next billing amount</span>
                    <span class="text-xl font-bold text-neutral-900">
                      {{ data.currentPlan.currency === 'USD' ? '$' : data.currentPlan.currency }}{{ preview()!.nextBillingAmount / 100 | number:'1.2-2' }}
                    </span>
                  </div>
                  <p class="text-sm text-neutral-500">
                    Changes take effect immediately. Your next billing date remains the same.
                  </p>
                </div>
              </div>
            }
          }

          @case ('success') {
            <!-- Success State -->
            <div class="text-center py-8">
              <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 class="text-xl font-bold text-neutral-900 mb-2">Plan Changed Successfully!</h3>
              <p class="text-neutral-600">{{ successMessage() }}</p>
            </div>
          }
        }
      </div>

      <!-- Error -->
      @if (error()) {
        <div class="mx-6 mb-4 p-4 bg-red-50 text-red-700 rounded-lg">
          {{ error() }}
        </div>
      }

      <!-- Footer -->
      <div class="flex justify-end gap-3 p-6 border-t border-neutral-200">
        @switch (step()) {
          @case ('select') {
            <button
              type="button"
              (click)="close()"
              class="px-6 py-2 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              (click)="previewChanges()"
              [disabled]="!selectedPlan() || previewLoading()"
              class="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          }

          @case ('preview') {
            <button
              type="button"
              (click)="goBack()"
              class="px-6 py-2 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
            >
              Back
            </button>
            <button
              type="button"
              (click)="confirmChange()"
              [disabled]="loading()"
              class="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              {{ loading() ? 'Processing...' : 'Confirm Change' }}
            </button>
          }

          @case ('success') {
            <button
              type="button"
              (click)="close(true)"
              class="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
            >
              Done
            </button>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .change-plan-modal {
      max-height: 90vh;
      overflow-y: auto;
    }
    .plan-card,
    .plan-card * {
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
    }
  `],
})
export class ChangePlanModalComponent implements OnInit {
  private readonly dialogRef = inject(DialogRef<boolean>);
  readonly data = inject<ChangePlanModalData>(DIALOG_DATA);
  private readonly subscriptionService = inject(HubSubscriptionService);

  step = signal<ModalStep>('select');
  selectedPlan = signal<PlanInfo | null>(null);
  preview = signal<PlanChangePreview | null>(null);
  previewLoading = signal(false);
  loading = signal(false);
  error = signal('');
  successMessage = signal('');

  ngOnInit(): void {
    // Pre-select a plan if there's only one available
    const nonCurrentPlans = this.data.availablePlans.filter(p => !p.isCurrent);
    if (nonCurrentPlans.length === 1) {
      this.selectedPlan.set(nonCurrentPlans[0]);
    }
  }

  selectPlan(plan: PlanInfo): void {
    if (!plan.isCurrent) {
      this.selectedPlan.set(plan);
    }
  }

  async previewChanges(): Promise<void> {
    const plan = this.selectedPlan();
    if (!plan) return;

    this.previewLoading.set(true);
    this.error.set('');
    this.step.set('preview');

    try {
      const previewData = await this.subscriptionService.previewPlanChange(plan.planCode);
      this.preview.set(previewData);
    } catch (err) {
      this.error.set('Failed to preview plan change. Please try again.');
      this.step.set('select');
      console.error(err);
    } finally {
      this.previewLoading.set(false);
    }
  }

  goBack(): void {
    this.step.set('select');
    this.preview.set(null);
    this.error.set('');
  }

  async confirmChange(): Promise<void> {
    const plan = this.selectedPlan();
    if (!plan) return;

    this.loading.set(true);
    this.error.set('');

    try {
      const result = await this.subscriptionService.changePlan(plan.planCode);
      this.successMessage.set(result.message);
      this.step.set('success');
    } catch (err) {
      this.error.set('Failed to change plan. Please try again.');
      console.error(err);
    } finally {
      this.loading.set(false);
    }
  }

  close(success = false): void {
    this.dialogRef.close(success);
  }
}
