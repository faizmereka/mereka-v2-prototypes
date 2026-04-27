import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogRef, DIALOG_DATA } from '@mereka/ui';
import type { HubBookingItem } from '../../../../models/hub-booking.model';

export interface CancelBookingDialogData {
  booking: HubBookingItem;
}

export interface CancelBookingDialogResult {
  confirmed: boolean;
  reason: string;
}

@Component({
  selector: 'app-cancel-booking-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="cancel-booking-dialog">
      <!-- Header -->
      <div class="dialog-header">
        <h3>Cancel Booking</h3>
        <button class="close-btn" (click)="close()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <!-- Content -->
      <div class="dialog-content">
        <div class="booking-info">
          <p class="service-name">{{ data.booking.service.title }}</p>
          <p class="booking-date">
            {{ data.booking.bookingStartDate | date:'MMM d, yyyy' }} ·
            {{ data.booking.bookingStartDate | date:'h:mm a' }}
          </p>
        </div>

        <div class="warning-message">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <p>This action cannot be undone. The learner will be notified of the cancellation.</p>
        </div>

        <div class="reason-input">
          <label for="reason">Reason for cancellation</label>
          <textarea
            id="reason"
            [ngModel]="reason()"
            (ngModelChange)="reason.set($event)"
            placeholder="Please provide a reason for cancellation..."
            rows="4"
          ></textarea>
        </div>
      </div>

      <!-- Footer -->
      <div class="dialog-footer">
        <button class="cancel-btn" (click)="close()">
          Keep Booking
        </button>
        <button
          class="confirm-btn"
          [disabled]="!reason() || isSubmitting()"
          (click)="confirm()"
        >
          @if (isSubmitting()) {
            <span class="spinner"></span>
          }
          Cancel Booking
        </button>
      </div>
    </div>
  `,
  styles: [`
    .cancel-booking-dialog {
      width: 100%;
      max-width: 450px;
    }

    .dialog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 24px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);

      h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 700;
      }

      .close-btn {
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: none;
        border-radius: 4px;
        background: transparent;
        cursor: pointer;

        &:hover {
          background: rgba(0, 0, 0, 0.04);
        }

        svg {
          width: 20px;
          height: 20px;
          stroke-width: 2;
        }
      }
    }

    .dialog-content {
      padding: 24px;

      .booking-info {
        margin-bottom: 16px;

        .service-name {
          margin: 0 0 4px;
          font-size: 16px;
          font-weight: 600;
        }

        .booking-date {
          margin: 0;
          font-size: 14px;
          color: rgba(0, 0, 0, 0.6);
        }
      }

      .warning-message {
        display: flex;
        gap: 12px;
        padding: 12px;
        background: #fff3cd;
        border-radius: 8px;
        margin-bottom: 16px;

        svg {
          flex-shrink: 0;
          width: 20px;
          height: 20px;
          stroke: #856404;
          stroke-width: 2;
        }

        p {
          margin: 0;
          font-size: 14px;
          color: #856404;
        }
      }

      .reason-input {
        label {
          display: block;
          margin-bottom: 8px;
          font-size: 14px;
          font-weight: 500;
        }

        textarea {
          width: 100%;
          padding: 12px;
          border: 1px solid rgba(0, 0, 0, 0.12);
          border-radius: 8px;
          font-size: 14px;
          resize: vertical;

          &:focus {
            outline: none;
            border-color: #000;
          }
        }
      }
    }

    .dialog-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 24px;
      border-top: 1px solid rgba(0, 0, 0, 0.08);

      button {
        padding: 10px 20px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }

      .cancel-btn {
        border: 1px solid rgba(0, 0, 0, 0.12);
        background: #fff;

        &:hover {
          border-color: #000;
        }
      }

      .confirm-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        border: none;
        background: #d72e32;
        color: #fff;

        &:hover:not(:disabled) {
          background: #b52529;
        }

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
      }
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class CancelBookingDialogComponent {
  private readonly dialogRef = inject<DialogRef<CancelBookingDialogResult>>(DialogRef);
  readonly data = inject<CancelBookingDialogData>(DIALOG_DATA);

  readonly reason = signal('');
  readonly isSubmitting = signal(false);

  close(): void {
    this.dialogRef.close({ confirmed: false, reason: '' });
  }

  confirm(): void {
    if (!this.reason()) return;

    this.isSubmitting.set(true);
    this.dialogRef.close({
      confirmed: true,
      reason: this.reason()
    });
  }
}
