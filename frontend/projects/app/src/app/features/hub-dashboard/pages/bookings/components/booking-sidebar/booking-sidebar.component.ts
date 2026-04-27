import { Component, inject, computed, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HubBookingService } from '../../../../services/hub-booking.service';
import { AuthStateService } from '../../../../../../core/services/auth-state.service';
import type { BookingServiceType, BookingStatusFilter } from '../../../../models/hub-booking.model';
import { SERVICE_TYPE_OPTIONS, BOOKING_TABS } from '../../../../models/hub-booking.model';

@Component({
  selector: 'app-booking-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="booking-sidebar">
      <!-- Service Type Dropdown -->
      <div class="service-type-dropdown">
        <select
          class="form-select"
          [ngModel]="bookingService.serviceType()"
          (ngModelChange)="onServiceTypeChange($event)"
        >
          @for (option of serviceTypeOptions; track option.value) {
            <option [value]="option.value">{{ option.label }}</option>
          }
        </select>
      </div>

      <!-- Status Tabs -->
      <div class="status-tabs">
        @for (tab of statusTabs; track tab.id) {
          <button
            class="status-tab"
            [class.active]="bookingService.statusFilter() === tab.id"
            (click)="onStatusChange(tab.id)"
          >
            {{ tab.label }}
          </button>
        }
      </div>

      <!-- Add Experience Button -->
      <button
        class="add-experience-btn"
        (click)="navigateToAddExperience()"
      >
        Add an Experience
      </button>
    </div>
  `,
  styles: [`
    .booking-sidebar {
      width: 300px;
      padding: 24px;
      background: #ffffff;
      border-right: 1px solid rgba(0, 0, 0, 0.08);
      height: 100%;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .service-type-dropdown {
      .form-select {
        width: 100%;
        padding: 12px 16px;
        border: 1px solid rgba(0, 0, 0, 0.12);
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        background-color: #fff;
        cursor: pointer;

        &:focus {
          border-color: #000;
          outline: none;
          box-shadow: none;
        }
      }
    }

    .status-tabs {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .status-tab {
      padding: 12px 16px;
      border: none;
      border-radius: 8px;
      background: transparent;
      text-align: left;
      font-size: 14px;
      font-weight: 500;
      color: #000;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        background: rgba(0, 0, 0, 0.04);
      }

      &.active {
        background: linear-gradient(0deg, rgba(0, 0, 0, 0.08), rgba(0, 0, 0, 0.08)), #ffffff;
        font-weight: 700;
      }
    }

    .add-experience-btn {
      margin-top: auto;
      padding: 12px 24px;
      border: none;
      border-radius: 20px;
      background: #000;
      color: #fff;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.2s ease;

      &:hover {
        background: #333;
      }
    }
  `]
})
export class BookingSidebarComponent {
  readonly bookingService = inject(HubBookingService);
  private readonly authState = inject(AuthStateService);
  private readonly router = inject(Router);

  readonly serviceTypeOptions = SERVICE_TYPE_OPTIONS;
  readonly statusTabs = BOOKING_TABS;

  readonly addExperience = output<void>();

  onServiceTypeChange(serviceType: BookingServiceType): void {
    this.bookingService.setServiceType(serviceType);
  }

  onStatusChange(status: BookingStatusFilter): void {
    this.bookingService.setStatusFilter(status);
  }

  navigateToAddExperience(): void {
    const hubId = this.authState.selectedHub()?.id;
    if (hubId) {
      this.router.navigate(['/express-experience/welcome'], {
        queryParams: { hubId }
      });
    }
  }
}
