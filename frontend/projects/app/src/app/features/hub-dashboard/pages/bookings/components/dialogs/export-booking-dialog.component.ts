import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogRef, DIALOG_DATA } from '@mereka/ui';
import type { BookingServiceType, BookingStatusFilter } from '../../../../models/hub-booking.model';

export interface ExportBookingDialogData {
  serviceType: BookingServiceType;
  status: BookingStatusFilter;
  totalBookings: number;
  selectedCount: number;
}

export interface ExportBookingDialogResult {
  confirmed: boolean;
  exportType: 'all' | 'selected' | 'filtered';
  serviceType: BookingServiceType;
  status: BookingStatusFilter;
  dateFrom?: string;
  dateTo?: string;
}

@Component({
  selector: 'app-export-booking-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="export-booking-dialog">
      <!-- Header -->
      <div class="dialog-header">
        <h3>Export Bookings</h3>
        <button class="close-btn" (click)="close()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <!-- Content -->
      <div class="dialog-content">
        <!-- Export Type Selection -->
        <div class="export-type-section">
          <label class="section-label">What to export</label>

          @if (data.selectedCount > 0) {
            <label class="radio-option">
              <input
                type="radio"
                name="exportType"
                value="selected"
                [checked]="exportType() === 'selected'"
                (change)="exportType.set('selected')"
              />
              <span class="radio-label">
                Selected bookings ({{ data.selectedCount }})
              </span>
            </label>
          }

          <label class="radio-option">
            <input
              type="radio"
              name="exportType"
              value="filtered"
              [checked]="exportType() === 'filtered'"
              (change)="exportType.set('filtered')"
            />
            <span class="radio-label">
              Current filtered results ({{ data.totalBookings }})
            </span>
          </label>

          <label class="radio-option">
            <input
              type="radio"
              name="exportType"
              value="all"
              [checked]="exportType() === 'all'"
              (change)="exportType.set('all')"
            />
            <span class="radio-label">
              All bookings
            </span>
          </label>
        </div>

        <!-- Service Type Filter -->
        <div class="filter-section">
          <label class="section-label">Service Type</label>
          <select
            [ngModel]="serviceType()"
            (ngModelChange)="serviceType.set($event)"
            [disabled]="exportType() !== 'all'"
          >
            <option value="all">All Services</option>
            <option value="experience">Experiences</option>
            <option value="expertise">Expertise</option>
          </select>
        </div>

        <!-- Status Filter -->
        <div class="filter-section">
          <label class="section-label">Status</label>
          <select
            [ngModel]="status()"
            (ngModelChange)="status.set($event)"
            [disabled]="exportType() !== 'all'"
          >
            <option value="all">All Status</option>
            <option value="upcoming">Upcoming</option>
            <option value="past">Past</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <!-- Date Range (optional) -->
        <div class="filter-section">
          <label class="section-label">Date Range (optional)</label>
          <div class="date-range">
            <input
              type="date"
              placeholder="From"
              [ngModel]="dateFrom()"
              (ngModelChange)="dateFrom.set($event)"
              [disabled]="exportType() !== 'all'"
            />
            <span class="range-separator">to</span>
            <input
              type="date"
              placeholder="To"
              [ngModel]="dateTo()"
              (ngModelChange)="dateTo.set($event)"
              [disabled]="exportType() !== 'all'"
            />
          </div>
        </div>

        <!-- Format Info -->
        <div class="format-info">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
          <span>Export format: CSV (Comma Separated Values)</span>
        </div>
      </div>

      <!-- Footer -->
      <div class="dialog-footer">
        <button class="cancel-btn" (click)="close()">
          Cancel
        </button>
        <button
          class="export-btn"
          [disabled]="isExporting()"
          (click)="export()"
        >
          @if (isExporting()) {
            <span class="spinner"></span>
          }
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Export CSV
        </button>
      </div>
    </div>
  `,
  styles: [`
    .export-booking-dialog {
      width: 100%;
      max-width: 500px;
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

      .section-label {
        display: block;
        margin-bottom: 8px;
        font-size: 14px;
        font-weight: 600;
        color: rgba(0, 0, 0, 0.87);
      }

      .export-type-section {
        margin-bottom: 20px;

        .radio-option {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 0;
          cursor: pointer;

          input[type="radio"] {
            width: 18px;
            height: 18px;
          }

          .radio-label {
            font-size: 14px;
          }
        }
      }

      .filter-section {
        margin-bottom: 16px;

        select {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid rgba(0, 0, 0, 0.12);
          border-radius: 8px;
          font-size: 14px;
          background: #fff;

          &:focus {
            outline: none;
            border-color: #000;
          }

          &:disabled {
            background: rgba(0, 0, 0, 0.04);
            cursor: not-allowed;
          }
        }

        .date-range {
          display: flex;
          align-items: center;
          gap: 12px;

          input {
            flex: 1;
            padding: 10px 12px;
            border: 1px solid rgba(0, 0, 0, 0.12);
            border-radius: 8px;
            font-size: 14px;

            &:focus {
              outline: none;
              border-color: #000;
            }

            &:disabled {
              background: rgba(0, 0, 0, 0.04);
              cursor: not-allowed;
            }
          }

          .range-separator {
            font-size: 14px;
            color: rgba(0, 0, 0, 0.6);
          }
        }
      }

      .format-info {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px;
        background: rgba(0, 0, 0, 0.02);
        border-radius: 8px;
        margin-top: 20px;

        svg {
          width: 20px;
          height: 20px;
          stroke-width: 2;
          color: rgba(0, 0, 0, 0.6);
        }

        span {
          font-size: 13px;
          color: rgba(0, 0, 0, 0.6);
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

      .export-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        border: none;
        background: #000;
        color: #fff;

        &:hover:not(:disabled) {
          background: #333;
        }

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        svg {
          width: 16px;
          height: 16px;
          stroke-width: 2;
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
export class ExportBookingDialogComponent {
  private readonly dialogRef = inject<DialogRef<ExportBookingDialogResult>>(DialogRef);
  readonly data = inject<ExportBookingDialogData>(DIALOG_DATA);

  readonly exportType = signal<'all' | 'selected' | 'filtered'>(
    this.data.selectedCount > 0 ? 'selected' : 'filtered'
  );
  readonly serviceType = signal<BookingServiceType>(this.data.serviceType);
  readonly status = signal<BookingStatusFilter>(this.data.status);
  readonly dateFrom = signal('');
  readonly dateTo = signal('');
  readonly isExporting = signal(false);

  close(): void {
    this.dialogRef.close({
      confirmed: false,
      exportType: 'filtered',
      serviceType: 'all',
      status: 'all'
    });
  }

  export(): void {
    this.isExporting.set(true);
    this.dialogRef.close({
      confirmed: true,
      exportType: this.exportType(),
      serviceType: this.exportType() === 'all' ? this.serviceType() : this.data.serviceType,
      status: this.exportType() === 'all' ? this.status() : this.data.status,
      dateFrom: this.dateFrom() || undefined,
      dateTo: this.dateTo() || undefined
    });
  }
}
