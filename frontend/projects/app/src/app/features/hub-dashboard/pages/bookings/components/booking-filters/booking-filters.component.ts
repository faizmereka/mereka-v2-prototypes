import { Component, inject, signal, output, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HubBookingService } from '../../../../services/hub-booking.service';
import { HasPermissionDirective } from '../../../../../../core/directives/has-permission.directive';

@Component({
  selector: 'app-booking-filters',
  standalone: true,
  imports: [CommonModule, FormsModule, HasPermissionDirective],
  template: `
    <div class="booking-filters">
      <div class="filters-left">
        <!-- Select All Checkbox -->
        <label class="checkbox-wrapper">
          <input
            type="checkbox"
            [checked]="bookingService.allSelected()"
            [indeterminate]="bookingService.someSelected()"
            (change)="bookingService.toggleSelectAll()"
          />
        </label>

        <!-- Search Input -->
        <div class="search-box">
          <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Search Experience"
            [ngModel]="searchText()"
            (ngModelChange)="onSearchChange($event)"
          />
        </div>

        <!-- Grouped Toggle -->
        <div class="grouped-toggle" [class.active]="bookingService.isGrouped()">
          <button (click)="toggleGroupedDropdown()">
            Grouped
            @if (bookingService.isGrouped()) {
              <svg class="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            }
          </button>

          @if (showGroupedDropdown()) {
            <div class="grouped-dropdown">
              <div class="grouped-content">
                <div class="group-by">
                  <span class="label">Grouped by</span>
                  <select disabled>
                    <option>Experience</option>
                  </select>
                </div>
                <div class="group-action">
                  <button
                    class="bordered-btn"
                    (click)="toggleGrouped()"
                  >
                    {{ bookingService.isGrouped() ? 'UnGroup' : 'ReGroup' }}
                  </button>
                  <p class="description">
                    Ungrouping the bookings will show the bookings by user
                  </p>
                </div>
              </div>
            </div>
          }
        </div>

        <!-- Items Count -->
        @if (bookingService.totalBookings() > 0) {
          <span class="items-count">
            1 - {{ bookingService.bookings().length }} of {{ bookingService.totalBookings() }} items
          </span>
        }
      </div>

      <div class="filters-right">
        <!-- Add Booking Button -->
        <button
          *hasPermission="'booking.create'"
          class="add-booking-btn"
          [disabled]="bookingService.statusFilter() !== 'upcoming'"
          (click)="addBooking.emit()"
        >
          Add Booking
        </button>

        <!-- CSV Export Button -->
        @if (bookingService.hasBookings()) {
          <button
            class="export-btn"
            [disabled]="bookingService.exporting()"
            (click)="exportBookings.emit()"
          >
            @if (bookingService.exporting()) {
              <span class="spinner"></span>
            } @else {
              <svg class="export-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            }
          </button>
        }

        <!-- Filter Dropdown -->
        @if (bookingService.hasBookings()) {
          <div class="filter-dropdown-wrapper">
            <button class="filter-btn" (click)="toggleFilterDropdown()">
              <svg class="filter-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
              </svg>
            </button>

            @if (showFilterDropdown()) {
              <div class="filter-dropdown">
                <!-- Date Filter -->
                <div class="filter-section">
                  <button
                    class="section-header"
                    (click)="toggleSection('date')"
                  >
                    Date
                    <svg class="chevron" [class.open]="openSection() === 'date'" viewBox="0 0 24 24">
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </button>
                  @if (openSection() === 'date') {
                    <div class="section-content">
                      <div class="date-range-input">
                        <input
                          type="text"
                          placeholder="Select date range"
                          [value]="dateRangeDisplay()"
                          readonly
                          (click)="toggleDatePicker()"
                        />
                        @if (dateFrom() || dateTo()) {
                          <button class="clear-btn" (click)="clearDateRange()">×</button>
                        }
                        <svg class="calendar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                          <line x1="16" y1="2" x2="16" y2="6"/>
                          <line x1="8" y1="2" x2="8" y2="6"/>
                          <line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                      </div>
                      @if (showDatePicker()) {
                        <div class="date-inputs">
                          <div class="date-input">
                            <label>From</label>
                            <input
                              type="date"
                              [ngModel]="dateFrom()"
                              (ngModelChange)="onDateFromChange($event)"
                            />
                          </div>
                          <div class="date-input">
                            <label>To</label>
                            <input
                              type="date"
                              [ngModel]="dateTo()"
                              (ngModelChange)="onDateToChange($event)"
                            />
                          </div>
                          <button class="apply-date-btn" (click)="applyDateRange()">Apply</button>
                        </div>
                      }
                    </div>
                  }
                </div>

                <!-- Status Filter -->
                <div class="filter-section">
                  <button
                    class="section-header"
                    (click)="toggleSection('status')"
                  >
                    Status
                    <svg class="chevron" [class.open]="openSection() === 'status'" viewBox="0 0 24 24">
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </button>
                  @if (openSection() === 'status') {
                    <div class="section-content">
                      <label class="status-option">
                        <input
                          type="checkbox"
                          [checked]="selectedStatuses().includes('low-bookings')"
                          (change)="toggleStatus('low-bookings')"
                        />
                        <span>Low Bookings</span>
                      </label>
                      <label class="status-option">
                        <input
                          type="checkbox"
                          [checked]="selectedStatuses().includes('partially-booked')"
                          (change)="toggleStatus('partially-booked')"
                        />
                        <span>Partially Booked</span>
                      </label>
                      <label class="status-option">
                        <input
                          type="checkbox"
                          [checked]="selectedStatuses().includes('fully-booked')"
                          (change)="toggleStatus('fully-booked')"
                        />
                        <span>Fully Booked</span>
                      </label>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>

    <!-- Backdrop for dropdowns -->
    @if (showGroupedDropdown() || showFilterDropdown()) {
      <div class="backdrop" (click)="closeAllDropdowns()"></div>
    }
  `,
  styles: [`
    .booking-filters {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 24px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
      background: #fff;
    }

    .filters-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .filters-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .checkbox-wrapper {
      display: flex;
      align-items: center;

      input[type="checkbox"] {
        width: 18px;
        height: 18px;
        cursor: pointer;
      }
    }

    .search-box {
      position: relative;
      display: flex;
      align-items: center;

      .search-icon {
        position: absolute;
        left: 12px;
        width: 16px;
        height: 16px;
        stroke-width: 2;
        color: rgba(0, 0, 0, 0.38);
      }

      input {
        padding: 8px 12px 8px 36px;
        border: 1px solid rgba(0, 0, 0, 0.12);
        border-radius: 8px;
        font-size: 14px;
        width: 200px;

        &:focus {
          outline: none;
          border-color: #000;
        }
      }
    }

    .grouped-toggle {
      position: relative;

      button {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        border: none;
        border-radius: 8px;
        background: transparent;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;

        &:hover {
          background: rgba(0, 0, 0, 0.04);
        }
      }

      &.active button {
        color: #FF1010;

        .check-icon {
          width: 16px;
          height: 16px;
          stroke: #FF1010;
          stroke-width: 3;
        }
      }

      .grouped-dropdown {
        position: absolute;
        top: 100%;
        left: 0;
        margin-top: 8px;
        background: #fff;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 100;
        min-width: 250px;

        .grouped-content {
          padding: 16px;
        }

        .group-by {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;

          .label {
            font-size: 14px;
            color: rgba(0, 0, 0, 0.6);
          }

          select {
            padding: 8px;
            border: 1px solid rgba(0, 0, 0, 0.12);
            border-radius: 4px;
          }
        }

        .group-action {
          .bordered-btn {
            padding: 8px 16px;
            border: 1px solid #000;
            border-radius: 4px;
            background: transparent;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;

            &:hover {
              background: rgba(0, 0, 0, 0.04);
            }
          }

          .description {
            margin-top: 8px;
            font-size: 12px;
            color: rgba(0, 0, 0, 0.6);
          }
        }
      }
    }

    .items-count {
      font-size: 14px;
      color: rgba(0, 0, 0, 0.6);
    }

    .add-booking-btn {
      padding: 8px 16px;
      border: 1px solid rgba(0, 0, 0, 0.12);
      border-radius: 8px;
      background: #fff;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;

      &:hover:not(:disabled) {
        border-color: #000;
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    .export-btn,
    .filter-btn {
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid rgba(0, 0, 0, 0.12);
      border-radius: 50%;
      background: #fff;
      cursor: pointer;

      &:hover {
        border-color: #000;
      }

      svg {
        width: 18px;
        height: 18px;
        stroke-width: 2;
      }

      .spinner {
        width: 16px;
        height: 16px;
        border: 2px solid rgba(0, 0, 0, 0.1);
        border-top-color: #000;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }
    }

    .filter-dropdown-wrapper {
      position: relative;

      .filter-dropdown {
        position: absolute;
        top: 100%;
        right: 0;
        margin-top: 8px;
        background: #fff;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 100;
        min-width: 280px;
        overflow: hidden;

        .filter-section {
          border-bottom: 1px solid rgba(0, 0, 0, 0.08);

          &:last-child {
            border-bottom: none;
          }

          .section-header {
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 16px;
            border: none;
            background: transparent;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;

            &:hover {
              background: rgba(0, 0, 0, 0.02);
            }

            .chevron {
              width: 16px;
              height: 16px;
              stroke: currentColor;
              stroke-width: 2;
              fill: none;
              transition: transform 0.2s;

              &.open {
                transform: rotate(180deg);
              }
            }
          }

          .section-content {
            padding: 12px 16px;
            background: rgba(0, 0, 0, 0.02);
          }
        }

        .date-range-input {
          position: relative;
          display: flex;
          align-items: center;

          input {
            width: 100%;
            padding: 8px 36px 8px 12px;
            border: 1px solid rgba(0, 0, 0, 0.12);
            border-radius: 4px;
            font-size: 14px;
          }

          .clear-btn {
            position: absolute;
            right: 32px;
            border: none;
            background: none;
            font-size: 18px;
            cursor: pointer;
            color: rgba(0, 0, 0, 0.5);
          }

          .calendar-icon {
            position: absolute;
            right: 8px;
            width: 18px;
            height: 18px;
            stroke-width: 2;
            color: rgba(0, 0, 0, 0.38);
          }
        }

        .date-inputs {
          margin-top: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;

          .date-input {
            display: flex;
            align-items: center;
            gap: 8px;

            label {
              width: 40px;
              font-size: 12px;
              color: rgba(0, 0, 0, 0.6);
            }

            input {
              flex: 1;
              padding: 8px;
              border: 1px solid rgba(0, 0, 0, 0.12);
              border-radius: 4px;
              font-size: 14px;
            }
          }

          .apply-date-btn {
            margin-top: 4px;
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            background: #000;
            color: #fff;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
          }
        }

        .status-option {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 0;
          cursor: pointer;

          input {
            width: 16px;
            height: 16px;
          }

          span {
            font-size: 14px;
          }
        }
      }
    }

    .backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 99;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class BookingFiltersComponent {
  readonly bookingService = inject(HubBookingService);

  readonly addBooking = output<void>();
  readonly exportBookings = output<void>();

  // Local state
  readonly searchText = signal('');
  readonly showGroupedDropdown = signal(false);
  readonly showFilterDropdown = signal(false);
  readonly openSection = signal<'date' | 'status' | null>(null);
  readonly showDatePicker = signal(false);
  readonly dateFrom = signal('');
  readonly dateTo = signal('');
  readonly selectedStatuses = signal<string[]>([]);

  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  dateRangeDisplay(): string {
    const from = this.dateFrom();
    const to = this.dateTo();
    if (from && to) {
      return `${this.formatDate(from)} - ${this.formatDate(to)}`;
    }
    return '';
  }

  private formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return `${date.getDate()}/${date.getMonth() + 1}`;
  }

  onSearchChange(value: string): void {
    this.searchText.set(value);

    // Debounce search
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    this.searchTimeout = setTimeout(() => {
      this.bookingService.setSearch(value);
      this.bookingService.searchBookings();
    }, 300);
  }

  toggleGroupedDropdown(): void {
    this.showGroupedDropdown.update(v => !v);
    this.showFilterDropdown.set(false);
  }

  toggleGrouped(): void {
    this.bookingService.toggleGrouped();
    this.showGroupedDropdown.set(false);
  }

  toggleFilterDropdown(): void {
    this.showFilterDropdown.update(v => !v);
    this.showGroupedDropdown.set(false);
  }

  toggleSection(section: 'date' | 'status'): void {
    this.openSection.update(current => current === section ? null : section);
  }

  toggleDatePicker(): void {
    this.showDatePicker.update(v => !v);
  }

  onDateFromChange(value: string): void {
    this.dateFrom.set(value);
  }

  onDateToChange(value: string): void {
    this.dateTo.set(value);
  }

  applyDateRange(): void {
    this.bookingService.setDateRange(this.dateFrom(), this.dateTo());
    this.showDatePicker.set(false);
  }

  clearDateRange(): void {
    this.dateFrom.set('');
    this.dateTo.set('');
    this.bookingService.setDateRange('', '');
  }

  toggleStatus(status: string): void {
    this.selectedStatuses.update(statuses => {
      if (statuses.includes(status)) {
        return statuses.filter(s => s !== status);
      }
      return [...statuses, status];
    });
  }

  closeAllDropdowns(): void {
    this.showGroupedDropdown.set(false);
    this.showFilterDropdown.set(false);
  }
}
