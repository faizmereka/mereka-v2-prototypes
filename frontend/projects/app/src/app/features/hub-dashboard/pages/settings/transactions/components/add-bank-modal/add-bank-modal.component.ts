import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DIALOG_DATA, DialogRef, ToastService } from '@mereka/ui';
import {
  HubTransactionService,
  type SupportedBank,
  type AddBankAccountRequest,
} from '../../../../../services/hub-transaction.service';
import { UserTransactionService } from '../../../../../services/user-transaction.service';

export interface AddBankModalData {
  mode: 'hub' | 'expert';
  /** Currency code (e.g., 'MYR', 'USD', 'IDR'). Defaults to 'MYR' if not provided */
  currency?: string;
  /** Country code (e.g., 'MY', 'US', 'ID'). Defaults to 'MY' if not provided */
  country?: string;
}

@Component({
  selector: 'app-add-bank-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-6">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-lg font-semibold text-neutral-900">Add Bank Account</h2>
        <button (click)="close()" class="text-neutral-400 hover:text-neutral-600">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form (ngSubmit)="submit()" class="space-y-4">
        <!-- Bank Selection -->
        <div>
          <label class="block text-sm font-medium text-neutral-700 mb-1">Bank</label>
          <select
            [(ngModel)]="selectedBank"
            name="bank"
            required
            class="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Select a bank</option>
            @for (bank of supportedBanks(); track bank.code) {
              <option [value]="bank.code">{{ bank.name }}</option>
            }
            <option value="__OTHER__">Other (Enter manually)</option>
          </select>
        </div>

        <!-- Manual Routing Number (when Other is selected) -->
        @if (selectedBank === '__OTHER__') {
          <div>
            <label class="block text-sm font-medium text-neutral-700 mb-1">Bank Name</label>
            <input
              type="text"
              [(ngModel)]="manualBankName"
              name="manualBankName"
              required
              placeholder="Enter bank name"
              class="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-neutral-700 mb-1">Routing Number / SWIFT Code</label>
            <input
              type="text"
              [(ngModel)]="manualRoutingNumber"
              name="manualRoutingNumber"
              required
              placeholder="Enter routing number or SWIFT code"
              class="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p class="text-xs text-neutral-500 mt-1">For Malaysian banks, use the SWIFT/BIC code (e.g., MABORUMY for Maybank)</p>
          </div>
        }

        <!-- Account Holder Name -->
        <div>
          <label class="block text-sm font-medium text-neutral-700 mb-1">Account Holder Name</label>
          <input
            type="text"
            [(ngModel)]="accountHolderName"
            name="accountHolderName"
            required
            placeholder="As it appears on bank account"
            class="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <!-- Account Number -->
        <div>
          <label class="block text-sm font-medium text-neutral-700 mb-1">Account Number</label>
          <input
            type="text"
            [(ngModel)]="accountNumber"
            name="accountNumber"
            required
            placeholder="Enter account number"
            class="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <!-- Account Holder Type -->
        <div>
          <label class="block text-sm font-medium text-neutral-700 mb-1">Account Type</label>
          <div class="flex gap-4">
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                [(ngModel)]="accountHolderType"
                name="accountHolderType"
                value="individual"
                class="text-primary focus:ring-primary"
              />
              <span class="text-sm text-neutral-700">Individual</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                [(ngModel)]="accountHolderType"
                name="accountHolderType"
                value="company"
                class="text-primary focus:ring-primary"
              />
              <span class="text-sm text-neutral-700">Company</span>
            </label>
          </div>
        </div>

        <!-- Set as Default -->
        <div class="flex items-center gap-2">
          <input
            type="checkbox"
            [(ngModel)]="setAsDefault"
            name="setAsDefault"
            id="setAsDefault"
            class="rounded border-neutral-300 text-primary focus:ring-primary"
          />
          <label for="setAsDefault" class="text-sm text-neutral-700">Set as default bank account</label>
        </div>

        <!-- Error -->
        @if (error()) {
          <div class="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p class="text-sm text-red-700">{{ error() }}</p>
          </div>
        }

        <!-- Actions -->
        <div class="flex justify-end gap-3 pt-4">
          <button
            type="button"
            (click)="close()"
            class="px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="submit"
            [disabled]="submitting() || !isValid()"
            class="px-4 py-2 text-sm font-medium text-white bg-neutral-900 rounded-lg hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            @if (submitting()) {
              <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            }
            Add Bank Account
          </button>
        </div>
      </form>
    </div>
  `,
})
export class AddBankModalComponent implements OnInit {
  private readonly dialogRef = inject(DialogRef<boolean>);
  private readonly data = inject<AddBankModalData>(DIALOG_DATA);
  private readonly hubService = inject(HubTransactionService);
  private readonly userService = inject(UserTransactionService);
  private readonly toastService = inject(ToastService);

  readonly supportedBanks = signal<SupportedBank[]>([]);
  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);

  // Form fields
  selectedBank = '';
  manualBankName = '';
  manualRoutingNumber = '';
  accountHolderName = '';
  accountNumber = '';
  accountHolderType: 'individual' | 'company' = 'individual';
  setAsDefault = false;

  async ngOnInit(): Promise<void> {
    try {
      const banks = this.data.mode === 'hub'
        ? await this.hubService.getSupportedBanks()
        : await this.userService.getSupportedBanks();
      this.supportedBanks.set(banks);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load banks';
      this.error.set(message);
      this.toastService.error(message);
    } finally {
      this.loading.set(false);
    }
  }

  isValid(): boolean {
    const hasBank = this.selectedBank === '__OTHER__'
      ? !!(this.manualBankName && this.manualRoutingNumber)
      : !!this.selectedBank;
    return !!(hasBank && this.accountHolderName && this.accountNumber && this.accountHolderType);
  }

  async submit(): Promise<void> {
    if (!this.isValid() || this.submitting()) return;

    this.submitting.set(true);
    this.error.set(null);

    try {
      // Use manual routing number if "Other" is selected
      const routingNumber = this.selectedBank === '__OTHER__'
        ? this.manualRoutingNumber.toUpperCase().trim()
        : this.selectedBank;

      const request: AddBankAccountRequest = {
        accountNumber: this.accountNumber,
        routingNumber,
        accountHolderName: this.accountHolderName,
        accountHolderType: this.accountHolderType,
        currency: this.data.currency || 'MYR',
        country: this.data.country || 'MY',
        setAsDefault: this.setAsDefault,
      };

      if (this.data.mode === 'hub') {
        await this.hubService.addBankAccount(request);
      } else {
        await this.userService.addBankAccount(request);
      }
      this.dialogRef.close(true);
    } catch (err) {
      const message = this.parseErrorMessage(err);
      this.error.set(message);
      this.toastService.error(message);
    } finally {
      this.submitting.set(false);
    }
  }

  private parseErrorMessage(err: unknown): string {
    if (err instanceof Error) {
      // Return the actual error message from backend/Stripe
      return err.message;
    }
    return 'Failed to add bank account. Please try again.';
  }

  close(): void {
    this.dialogRef.close(false);
  }
}
