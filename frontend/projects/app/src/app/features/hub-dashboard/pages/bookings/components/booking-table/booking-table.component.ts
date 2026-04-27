import { Component, inject, input, output } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { HubBookingService } from '../../../../services/hub-booking.service';
import type { HubBookingItem } from '../../../../models/hub-booking.model';
import { BOOKING_STATUS_CONFIG } from '../../../../models/hub-booking.model';

@Component({
  selector: 'app-booking-table',
  standalone: true,
  imports: [CommonModule, DatePipe],
  template: `
    <div class="booking-table">
      @for (booking of bookingService.bookingsWithState(); track booking._id) {
        <div class="booking-row" [class.expanded]="booking.isExpanded">
          <!-- Main Row -->
          <div class="booking-row-main">
            <!-- Checkbox -->
            <div class="cell cell-checkbox">
              <input
                type="checkbox"
                [checked]="booking.isSelected"
                (change)="bookingService.toggleSelection(booking._id)"
              />
            </div>

            <!-- Expand Toggle -->
            <div class="cell cell-expand">
              <button
                class="expand-btn"
                (click)="bookingService.toggleExpansion(booking._id)"
              >
                <svg
                  class="chevron"
                  [class.expanded]="booking.isExpanded"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
            </div>

            <!-- Detail -->
            <div class="cell cell-detail">
              <div class="detail-content">
                <span class="date-time">
                  {{ booking.bookingStartDate | date:'MMM d, yyyy' }} ·
                  {{ booking.bookingStartDate | date:'h:mm a' }} - {{ booking.bookingEndDate | date:'h:mm a' }}
                </span>
                <h5 class="title">{{ booking.service.title }}</h5>
                <div class="host-info">
                  @if (booking.host?.name) {
                    <span class="host-name">{{ booking.host?.name }}</span>
                    <span class="divider">|</span>
                  }
                  <span class="type-badge" [class]="booking.bookingType">
                    {{ booking.bookingType === 'experience' ? 'Experience' : 'Expertise' }}
                  </span>
                  @if (booking.service.type) {
                    <span class="divider">|</span>
                    <span class="location-type">
                      @switch (booking.service.type) {
                        @case ('physical') {
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                            <circle cx="12" cy="10" r="3"/>
                          </svg>
                          Physical
                        }
                        @case ('virtual') {
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M23 7l-7 5 7 5V7z"/>
                            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                          </svg>
                          Virtual
                        }
                        @case ('online') {
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="2" y1="12" x2="22" y2="12"/>
                            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                          </svg>
                          Online
                        }
                      }
                    </span>
                  }
                </div>
              </div>
            </div>

            <!-- Status -->
            <div class="cell cell-status">
              <span class="status-label">Status</span>
              <span
                class="status-badge"
                [class]="booking.bookingStatus"
              >
                {{ getStatusLabel(booking.bookingStatus) }}
              </span>
            </div>

            <!-- Last Booked -->
            <div class="cell cell-last-booked">
              <span class="cell-label">Last Booked</span>
              <span class="cell-value">{{ getTimeAgo(booking.updatedAt || booking.createdAt) }}</span>
            </div>

            <!-- Tickets -->
            <div class="cell cell-tickets">
              <span class="cell-label">Tickets</span>
              <div class="tickets-info">
                <span class="tickets-count">{{ booking.bookedSeats }}/{{ booking.totalSeats }}</span>
                <div class="progress-bar">
                  <div
                    class="progress-fill"
                    [style.width.%]="booking.bookingPercentage"
                    [class]="booking.bookingStatus"
                  ></div>
                </div>
              </div>
            </div>

            <!-- Total Cost -->
            <div class="cell cell-cost">
              <span class="cell-label">Total Profit</span>
              <span class="cell-value cost">
                {{ booking.currency }} {{ booking.totalCost | number:'1.2-2' }}
              </span>
            </div>

            <!-- Actions -->
            <div class="cell cell-actions">
              <button class="action-btn" (click)="openActionMenu(booking)">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="5" r="2"/>
                  <circle cx="12" cy="12" r="2"/>
                  <circle cx="12" cy="19" r="2"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- Expanded Detail (Learners) -->
          @if (booking.isExpanded && booking.learners.length > 0) {
            <div class="booking-row-expanded">
              <div class="learners-table">
                <div class="learners-header">
                  <div class="learner-cell">Name</div>
                  <div class="learner-cell">Email</div>
                  <div class="learner-cell">Ticket Type</div>
                  <div class="learner-cell">Phone</div>
                </div>
                @for (learner of booking.learners; track $index) {
                  <div class="learner-row">
                    <div class="learner-cell">{{ learner.name }}</div>
                    <div class="learner-cell">{{ learner.email }}</div>
                    <div class="learner-cell">{{ learner.ticketName || learner.ticketType || '-' }}</div>
                    <div class="learner-cell">{{ learner.phone || '-' }}</div>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      } @empty {
        <!-- This shouldn't show when loading, handled by parent -->
      }
    </div>
  `,
  styles: [`
    .booking-table {
      background: #fff;
    }

    .booking-row {
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);

      &.expanded {
        background: rgba(0, 0, 0, 0.02);
      }

      &:hover:not(.expanded) {
        background: rgba(0, 0, 0, 0.01);
      }
    }

    .booking-row-main {
      display: grid;
      grid-template-columns: 40px 40px 1fr 120px 100px 120px 120px 50px;
      align-items: center;
      min-height: 80px;
      padding: 12px 16px;
    }

    .cell {
      padding: 0 8px;
    }

    .cell-checkbox,
    .cell-expand {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;

      input[type="checkbox"] {
        width: 18px;
        height: 18px;
        cursor: pointer;
      }
    }

    .expand-btn {
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

      .chevron {
        width: 18px;
        height: 18px;
        stroke-width: 2;
        transition: transform 0.2s;

        &.expanded {
          transform: rotate(180deg);
        }
      }
    }

    .cell-detail {
      .detail-content {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .date-time {
        font-size: 12px;
        color: rgba(0, 0, 0, 0.6);
      }

      .title {
        margin: 0;
        font-size: 14px;
        font-weight: 700;
        color: #000;
      }

      .host-info {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        color: rgba(0, 0, 0, 0.6);

        .divider {
          color: rgba(0, 0, 0, 0.2);
        }

        .type-badge {
          padding: 2px 8px;
          border-radius: 2px;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;

          &.experience {
            background: rgba(52, 168, 83, 0.1);
            color: #34a853;
          }

          &.expertise {
            background: rgba(66, 133, 244, 0.1);
            color: #4285f4;
          }
        }

        .location-type {
          display: flex;
          align-items: center;
          gap: 4px;

          svg {
            width: 12px;
            height: 12px;
            stroke-width: 2;
          }
        }
      }
    }

    .cell-status,
    .cell-last-booked,
    .cell-tickets,
    .cell-cost {
      display: flex;
      flex-direction: column;
      gap: 4px;

      .cell-label,
      .status-label {
        font-size: 9px;
        font-weight: 700;
        color: rgba(0, 0, 0, 0.38);
        text-transform: uppercase;
      }

      .cell-value {
        font-size: 12px;
        font-weight: 700;
      }
    }

    .status-badge {
      font-size: 11px;
      font-weight: 900;

      &.no-bookings,
      &.low-bookings {
        color: #d72e32;
      }

      &.partially-booked {
        color: #fdc20e;
      }

      &.mostly-booked,
      &.fully-booked {
        color: #34a853;
      }
    }

    .tickets-info {
      display: flex;
      flex-direction: column;
      gap: 4px;

      .tickets-count {
        font-size: 12px;
        font-weight: 700;
      }

      .progress-bar {
        width: 60px;
        height: 4px;
        background: rgba(0, 0, 0, 0.08);
        border-radius: 2px;
        overflow: hidden;

        .progress-fill {
          height: 100%;
          border-radius: 2px;

          &.no-bookings,
          &.low-bookings {
            background: #d72e32;
          }

          &.partially-booked {
            background: #fdc20e;
          }

          &.mostly-booked,
          &.fully-booked {
            background: #34a853;
          }
        }
      }
    }

    .cell-cost .cost {
      font-weight: 700;
    }

    .cell-actions {
      display: flex;
      justify-content: center;

      .action-btn {
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
          width: 18px;
          height: 18px;
          color: rgba(0, 0, 0, 0.6);
        }
      }
    }

    .booking-row-expanded {
      padding: 0 80px 16px;

      .learners-table {
        background: #fff;
        border-radius: 8px;
        border: 1px solid rgba(0, 0, 0, 0.08);
        overflow: hidden;
      }

      .learners-header {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        padding: 12px 16px;
        background: rgba(0, 0, 0, 0.02);
        border-bottom: 1px solid rgba(0, 0, 0, 0.08);

        .learner-cell {
          font-size: 12px;
          font-weight: 700;
          color: rgba(0, 0, 0, 0.6);
        }
      }

      .learner-row {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        padding: 12px 16px;
        border-bottom: 1px solid rgba(0, 0, 0, 0.04);

        &:last-child {
          border-bottom: none;
        }

        .learner-cell {
          font-size: 13px;
          color: #000;
        }
      }
    }
  `]
})
export class BookingTableComponent {
  readonly bookingService = inject(HubBookingService);

  readonly actionMenuOpen = output<HubBookingItem>();

  getStatusLabel(status: string): string {
    const config = BOOKING_STATUS_CONFIG[status as keyof typeof BOOKING_STATUS_CONFIG];
    return config?.label || status;
  }

  getTimeAgo(dateInput: Date | string | undefined): string {
    if (!dateInput) return '-';

    const date = new Date(dateInput);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return `${Math.floor(diffDays / 30)}mo ago`;
  }

  openActionMenu(booking: HubBookingItem): void {
    this.actionMenuOpen.emit(booking);
  }
}
