import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DialogService } from '@mereka/ui';
import { AuthStateService } from '../../../../core/services/auth-state.service';
import { HubBookingService } from '../../services/hub-booking.service';
import { BookingSidebarComponent } from './components/booking-sidebar';
import { BookingFiltersComponent } from './components/booking-filters';
import { BookingTableComponent } from './components/booking-table';
import { BookingEmptyStateComponent } from './components/booking-empty-state';
import { HasPermissionDirective } from '../../../../core/directives/has-permission.directive';
import { PermissionService } from '../../../../core/services/permission.service';
import {
  AddBookingDialogComponent,
  type AddBookingDialogData,
  type AddBookingDialogResult,
} from './components/dialogs/add-booking-dialog.component';
import {
  CancelBookingDialogComponent,
  type CancelBookingDialogData,
  type CancelBookingDialogResult,
} from './components/dialogs/cancel-booking-dialog.component';
import {
  ExportBookingDialogComponent,
  type ExportBookingDialogData,
  type ExportBookingDialogResult,
} from './components/dialogs/export-booking-dialog.component';
import type { HubBookingItem } from '../../models/hub-booking.model';

@Component({
  selector: 'app-hub-bookings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    BookingSidebarComponent,
    BookingFiltersComponent,
    BookingTableComponent,
    BookingEmptyStateComponent,
    HasPermissionDirective,
  ],
  templateUrl: './bookings.component.html',
  styleUrl: './bookings.component.scss',
})
export class HubBookingsComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly dialogService = inject(DialogService);
  private readonly authState = inject(AuthStateService);
  readonly bookingService = inject(HubBookingService);
  readonly permissions = inject(PermissionService);

  // Mobile state
  readonly isMobile = signal(false);
  readonly showMobileFilter = signal(false);
  readonly showActionMenu = signal(false);
  readonly selectedBooking = signal<HubBookingItem | null>(null);

  private resizeHandler = () => this.checkMobile();

  // Check if we're on mobile
  private checkMobile(): void {
    this.isMobile.set(window.innerWidth < 1024);
  }

  async ngOnInit(): Promise<void> {
    this.checkMobile();
    window.addEventListener('resize', this.resizeHandler);

    // Load bookings
    await this.bookingService.loadBookings();
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.resizeHandler);
  }

  openAddBookingDialog(): void {
    const hubId = this.authState.selectedHub()?.id;
    if (!hubId) return;

    const dialogRef = this.dialogService.open<
      AddBookingDialogComponent,
      AddBookingDialogData,
      AddBookingDialogResult
    >(AddBookingDialogComponent, {
      data: {
        hubId,
        serviceType: this.bookingService.serviceType(),
      },
      width: 'lg',
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result?.confirmed) {
        // Refresh the list after successful booking
        await this.bookingService.refresh();
      }
    });
  }

  openExportDialog(): void {
    const dialogRef = this.dialogService.open<
      ExportBookingDialogComponent,
      ExportBookingDialogData,
      ExportBookingDialogResult
    >(ExportBookingDialogComponent, {
      data: {
        serviceType: this.bookingService.serviceType(),
        status: this.bookingService.statusFilter(),
        totalBookings: this.bookingService.totalBookings(),
        selectedCount: this.bookingService.selectedCount(),
      },
      width: 'md',
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result?.confirmed) {
        await this.bookingService.exportBookings({
          serviceType: result.serviceType,
          status: result.status,
          dateFrom: result.dateFrom,
          dateTo: result.dateTo,
        });
      }
    });
  }

  openActionMenu(booking: HubBookingItem): void {
    this.selectedBooking.set(booking);
    this.showActionMenu.set(true);
  }

  closeActionMenu(): void {
    this.showActionMenu.set(false);
    this.selectedBooking.set(null);
  }

  openCancelDialog(): void {
    const booking = this.selectedBooking();
    if (!booking) return;

    this.closeActionMenu();

    const dialogRef = this.dialogService.open<
      CancelBookingDialogComponent,
      CancelBookingDialogData,
      CancelBookingDialogResult
    >(CancelBookingDialogComponent, {
      data: { booking },
      width: 'sm',
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result?.confirmed) {
        await this.bookingService.updateBookingStatus({
          bookingId: booking._id,
          status: 'cancelled',
          reason: result.reason,
        });
        // Refresh the list
        await this.bookingService.refresh();
      }
    });
  }

  toggleMobileFilter(): void {
    this.showMobileFilter.update((v) => !v);
  }

  applyMobileFilters(): void {
    this.showMobileFilter.set(false);
  }

  viewBookingDetails(): void {
    const booking = this.selectedBooking();
    if (!booking) return;

    this.closeActionMenu();
    // Navigate to the booking detail page
    void this.router.navigate(['/hub/bookings', booking._id]);
  }
}
