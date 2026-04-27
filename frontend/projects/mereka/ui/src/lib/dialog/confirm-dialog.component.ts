import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DialogRef, DIALOG_DATA } from './index';

/**
 * Configuration for confirm dialog
 */
export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  /** Optional: show loading state on confirm */
  showLoading?: boolean;
}

/**
 * Confirm Dialog Component
 *
 * Used internally by DialogService.confirm()
 *
 * @example
 * ```typescript
 * const confirmed = await this.dialogService.confirm({
 *   title: 'Delete Item',
 *   message: 'Are you sure you want to delete this item?',
 *   type: 'danger',
 *   confirmText: 'Delete',
 * });
 *
 * if (confirmed) {
 *   // User confirmed
 * }
 * ```
 */
@Component({
  selector: 'app-dialog-confirm',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Content -->
    <div class="p-6">
      <div class="flex items-start gap-4">
        <!-- Icon based on type -->
        <div [class]="iconContainerClass()">
          @switch (data.type || 'danger') {
            @case ('danger') {
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            }
            @case ('warning') {
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            @case ('info') {
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          }
        </div>

        <!-- Text Content -->
        <div class="flex-1">
          <h3 class="text-lg font-semibold text-neutral-900">
            {{ data.title }}
          </h3>
          <p class="mt-2 text-sm text-neutral-600">
            {{ data.message }}
          </p>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex justify-end gap-3 px-6 py-4 bg-neutral-50 rounded-b-lg">
      <button
        type="button"
        class="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-md hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
        [disabled]="isLoading()"
        (click)="cancel()"
      >
        {{ data.cancelText || 'Cancel' }}
      </button>
      <button
        type="button"
        [class]="confirmButtonClass()"
        [disabled]="isLoading()"
        (click)="confirm()"
      >
        @if (isLoading()) {
          <svg class="animate-spin -ml-1 mr-2 h-4 w-4 inline" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        }
        {{ data.confirmText || 'Confirm' }}
      </button>
    </div>
  `,
})
export class DialogConfirmComponent {
  private readonly dialogRef = inject<DialogRef<boolean>>(DialogRef);
  readonly data = inject<ConfirmDialogData>(DIALOG_DATA);

  readonly isLoading = signal(false);

  iconContainerClass(): string {
    const type = this.data.type || 'danger';
    const baseClass = 'flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full';

    switch (type) {
      case 'danger':
        return `${baseClass} bg-red-100 text-red-600`;
      case 'warning':
        return `${baseClass} bg-yellow-100 text-yellow-600`;
      case 'info':
        return `${baseClass} bg-blue-100 text-blue-600`;
      default:
        return `${baseClass} bg-red-100 text-red-600`;
    }
  }

  confirmButtonClass(): string {
    const type = this.data.type || 'danger';
    const baseClass = 'px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors disabled:opacity-50';

    switch (type) {
      case 'danger':
        return `${baseClass} bg-red-600 hover:bg-red-700 focus:ring-red-500`;
      case 'warning':
        return `${baseClass} bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500`;
      case 'info':
        return `${baseClass} bg-blue-600 hover:bg-blue-700 focus:ring-blue-500`;
      default:
        return `${baseClass} bg-red-600 hover:bg-red-700 focus:ring-red-500`;
    }
  }

  confirm(): void {
    if (this.data.showLoading) {
      this.isLoading.set(true);
    }
    this.dialogRef.close(true);
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}

