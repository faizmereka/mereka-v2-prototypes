import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HubBookingService } from '../../../../services/hub-booking.service';
import { EMPTY_STATE_MESSAGES } from '../../../../models/hub-booking.model';

@Component({
  selector: 'app-booking-empty-state',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="empty-state">
      <div class="empty-content">
        <img
          src="assets/images/illust-magnifying-man-bust.svg"
          alt="No bookings"
          class="empty-image"
        />
        <p class="empty-message">{{ message() }}</p>
      </div>
    </div>
  `,
  styles: [`
    .empty-state {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 400px;
      background: #fff;
    }

    .empty-content {
      text-align: center;
      max-width: 300px;
    }

    .empty-image {
      width: 200px;
      height: auto;
      margin-bottom: 24px;
    }

    .empty-message {
      font-size: 16px;
      color: rgba(0, 0, 0, 0.6);
      line-height: 1.5;
    }
  `]
})
export class BookingEmptyStateComponent {
  private readonly bookingService = inject(HubBookingService);

  readonly message = computed(() => {
    const status = this.bookingService.statusFilter();
    return EMPTY_STATE_MESSAGES[status] || EMPTY_STATE_MESSAGES['all'];
  });
}
