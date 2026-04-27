import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent, DialogRef, DIALOG_DATA } from '@mereka/ui';
import {
  HubTransactionService,
  type BankAccount,
  type Balance,
} from '../../../../../services/hub-transaction.service';

export interface WithdrawalModalData {
  balance: Balance;
  bankAccounts: BankAccount[];
  defaultBankAccountId: string | null;
}

type ModalStep = 'form' | 'confirm' | 'success';

@Component({
  selector: 'app-withdrawal-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, DecimalPipe],
  template: `
    <div class="withdrawal-modal w-full max-w-lg">
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-neutral-200">
        <h2 class="text-xl font-bold text-neutral-900">
          {{ step() === 'success' ? 'Withdrawal Initiated!' : 'Withdraw Funds' }}
        </h2>
        <button type="button" (click)="close()" class="p-2 rounded-lg hover:bg-neutral-100 transition-colors">
          <ui-icon name="close" size="sm" />
        </button>
      </div>

      <!-- Content -->
      <div class="p-6">
        @switch (step()) {
          @case ('form') {
            <div class="space-y-6">
              <!-- Available Balance -->
              <div class="p-4 bg-green-50 border border-green-200 rounded-xl">
                <p class="text-sm text-green-700 mb-1">Available for Withdrawal</p>
                <p class="text-2xl font-bold text-green-700">
                  {{ data.balance.currency }} {{ data.balance.totalAvailable | number:'1.2-2' }}
                </p>
              </div>

              <!-- Amount Input -->
              <div>
                <label class="block text-sm font-medium text-neutral-700 mb-2">Withdrawal Amount</label>
                <div class="relative">
                  <span class="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">{{ data.balance.currency }}</span>
                  <input
                    type="number"
                    [(ngModel)]="amount"
                    [min]="1"
                    [max]="data.balance.totalAvailable"
                    step="0.01"
                    class="w-full pl-12 pr-4 py-3 border border-neutral-300 rounded-lg text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="0.00"
                  />
                </div>
                <div class="flex justify-between mt-2">
                  <p class="text-sm text-neutral-500">Min: {{ data.balance.currency }} 1.00</p>
                  <button type="button" (click)="setMax()" class="text-sm text-primary hover:underline">Withdraw All</button>
                </div>
              </div>

              <!-- Bank Selection -->
              <div>
                <label class="block text-sm font-medium text-neutral-700 mb-2">Destination</label>
                @if (data.bankAccounts.length === 0) {
                  <div class="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p class="text-sm text-yellow-700">No bank accounts. Add one first.</p>
                  </div>
                } @else {
                  <div class="space-y-2">
                    @for (bank of data.bankAccounts; track bank.id) {
                      <button
                        type="button"
                        (click)="selectBank(bank)"
                        class="w-full p-4 border rounded-xl transition-all text-left"
                        [class.border-primary]="selectedBank()?.id === bank.id"
                        [class.bg-primary-50]="selectedBank()?.id === bank.id"
                        [class.border-neutral-200]="selectedBank()?.id !== bank.id"
                      >
                        <div class="flex items-center gap-3">
                          <div class="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center">
                            <svg class="w-5 h-5 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                          </div>
                          <div class="flex-1">
                            <p class="font-medium text-neutral-900">{{ bank.bankName }}</p>
                            <p class="text-sm text-neutral-500">******{{ bank.last4 }}</p>
                          </div>
                          @if (bank.isDefault) {
                            <span class="px-2 py-1 bg-neutral-100 text-neutral-600 text-xs font-medium rounded">Default</span>
                          }
                        </div>
                      </button>
                    }
                  </div>
                }
              </div>

              <!-- Description -->
              <div>
                <label class="block text-sm font-medium text-neutral-700 mb-2">Note (optional)</label>
                <input
                  type="text"
                  [(ngModel)]="description"
                  maxlength="100"
                  class="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., Monthly withdrawal"
                />
              </div>
            </div>
          }

          @case ('confirm') {
            <div class="space-y-6">
              <div class="text-center py-4">
                <div class="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg class="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 class="text-xl font-bold text-neutral-900 mb-2">Confirm Withdrawal</h3>
              </div>

              <div class="bg-neutral-50 rounded-xl p-4 space-y-3">
                <div class="flex justify-between">
                  <span class="text-neutral-600">Amount</span>
                  <span class="font-bold">{{ data.balance.currency }} {{ amount | number:'1.2-2' }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-neutral-600">Bank</span>
                  <span>{{ selectedBank()?.bankName }} (****{{ selectedBank()?.last4 }})</span>
                </div>
                @if (description) {
                  <div class="flex justify-between">
                    <span class="text-neutral-600">Note</span>
                    <span>{{ description }}</span>
                  </div>
                }
                <div class="border-t pt-3">
                  <div class="flex justify-between">
                    <span class="text-neutral-600">Estimated arrival</span>
                    <span>1-3 business days</span>
                  </div>
                </div>
              </div>
            </div>
          }

          @case ('success') {
            <div class="text-center py-8">
              <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 class="text-xl font-bold text-neutral-900 mb-2">Withdrawal Initiated!</h3>
              <p class="text-neutral-600">{{ data.balance.currency }} {{ amount | number:'1.2-2' }} on its way.</p>
              <p class="text-sm text-neutral-500 mt-2">Expected in 1-3 business days.</p>
            </div>
          }
        }
      </div>

      <!-- Error -->
      @if (error()) {
        <div class="mx-6 mb-4 p-4 bg-red-50 text-red-700 rounded-lg">{{ error() }}</div>
      }

      <!-- Footer -->
      <div class="flex justify-end gap-3 p-6 border-t border-neutral-200">
        @switch (step()) {
          @case ('form') {
            <button type="button" (click)="close()" class="px-6 py-2 border border-neutral-200 rounded-lg hover:bg-neutral-50">Cancel</button>
            <button type="button" (click)="goToConfirm()" [disabled]="!isValid()" class="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50">Continue</button>
          }
          @case ('confirm') {
            <button type="button" (click)="goBack()" class="px-6 py-2 border border-neutral-200 rounded-lg hover:bg-neutral-50">Back</button>
            <button type="button" (click)="confirm()" [disabled]="loading()" class="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50">
              {{ loading() ? 'Processing...' : 'Confirm' }}
            </button>
          }
          @case ('success') {
            <button type="button" (click)="close(true)" class="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark">Done</button>
          }
        }
      </div>
    </div>
  `,
  styles: [`.withdrawal-modal { max-height: 90vh; overflow-y: auto; }`],
})
export class WithdrawalModalComponent implements OnInit {
  private readonly dialogRef = inject(DialogRef<boolean>);
  readonly data = inject<WithdrawalModalData>(DIALOG_DATA);
  private readonly txnService = inject(HubTransactionService);

  step = signal<ModalStep>('form');
  selectedBank = signal<BankAccount | null>(null);
  amount = 0;
  description = '';
  loading = signal(false);
  error = signal('');

  ngOnInit(): void {
    const defaultBank = this.data.bankAccounts.find(b => b.id === this.data.defaultBankAccountId)
      ?? this.data.bankAccounts[0] ?? null;
    this.selectedBank.set(defaultBank);
  }

  selectBank(bank: BankAccount): void {
    this.selectedBank.set(bank);
  }

  setMax(): void {
    this.amount = this.data.balance.totalAvailable;
  }

  isValid(): boolean {
    return this.amount > 0 && this.amount <= this.data.balance.totalAvailable && this.selectedBank() !== null;
  }

  goToConfirm(): void {
    if (this.isValid()) {
      this.error.set('');
      this.step.set('confirm');
    }
  }

  goBack(): void {
    this.step.set('form');
    this.error.set('');
  }

  async confirm(): Promise<void> {
    const bank = this.selectedBank();
    if (!bank || this.amount <= 0) return;

    this.loading.set(true);
    this.error.set('');

    try {
      await this.txnService.createWithdrawal({
        amount: Math.round(this.amount * 100),
        currency: this.data.balance.currency.toLowerCase(),
        bankAccountId: bank.id,
        description: this.description || undefined,
      });
      this.step.set('success');
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Withdrawal failed');
    } finally {
      this.loading.set(false);
    }
  }

  close(success = false): void {
    this.dialogRef.close(success);
  }
}
