import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../../environments/environment';

// ============================================================================
// Types
// ============================================================================

export type BookingViewMode = 'learner' | 'hub';

export interface BookingTicket {
  ticketId: string;
  ticketName: string;
  quantity: number;
  standardRate: number;
  totalPrice: number;
  sessionDuration?: string;
  guests?: Array<{ name: string; email: string; phone?: string }>;
}

export interface BookingLocation {
  streetAddress: string;
  city: string;
  state: string;
  country: string;
  postalCode?: string;
  lat?: number;
  lng?: number;
}

export interface BookingReview {
  _id: string;
  rating: number;
  content: string;
  photos?: string[];
  createdAt: string;
  updatedAt: string;
  hubReply?: {
    content: string;
    createdAt: string;
    updatedAt?: string;
  };
}

export interface BookingHub {
  _id: string;
  name: string;
  slug?: string;
  logo?: string;
}

export interface BookingDetail {
  _id: string;
  confirmationCode?: string;
  serviceId: string;
  serviceType: 'experience' | 'expertise' | 'space';
  serviceTitle: string;
  serviceCover?: string;
  serviceSlug?: string;
  experienceType?: 'Online' | 'Physical' | 'Hybrid';

  hubId: string;
  hub: BookingHub;

  hostName?: string;
  hostDetails?: Array<{ fullName: string; profileImage?: string }>;

  bookingStartDate: string;
  bookingEndDate: string;
  timeZone?: string;

  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  cancelledBy?: 'learner' | 'hub';
  cancellationReason?: string;
  cancelledDate?: string;

  selectedTickets: BookingTicket[];

  bookerName: string;
  bookerEmail: string;
  phoneNumber?: string;

  totalCost: number;
  totalAmount: number;
  currency: string;
  serviceFee?: number;
  serviceFeePayBy?: 'learner' | 'hub';
  membershipDiscount?: number;
  membershipDiscountAmount?: number;
  promotionCode?: string;
  discountAmount?: number;
  isFree?: boolean;
  hubPayout?: number;

  paymentMethod?: {
    type: 'card' | 'fpx' | 'grabpay';
    brand?: string;
    last4?: string;
    expMonth?: number;
    expYear?: number;
  };

  refundAmount?: number;
  refundPercentage?: number;

  location?: BookingLocation;
  review?: BookingReview;

  createdAt: string;
  updatedAt: string;
}

export interface ReviewInput {
  rating: number;
  content: string;
  photos?: string[];
}

export interface HubReplyInput {
  content: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// ============================================================================
// Booking Detail Service
// ============================================================================

@Injectable({ providedIn: 'root' })
export class BookingDetailService {
  private readonly http = inject(HttpClient);

  // Mode and context
  private _mode: BookingViewMode = 'learner';
  private _hubId: string | null = null;

  private get apiUrl(): string {
    if (this._mode === 'hub' && this._hubId) {
      return `${environment.apiUrl}/hub/${this._hubId}/bookings`;
    }
    return `${environment.apiUrl}/me/bookings`;
  }

  // Public mode signal for components
  readonly mode = signal<BookingViewMode>('learner');

  // State
  private readonly _booking = signal<BookingDetail | null>(null);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  // Public readonly signals
  readonly booking = this._booking.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  setError(message: string): void {
    this._error.set(message);
  }

  /**
   * Set the service mode and optional hub context
   */
  setMode(mode: BookingViewMode, hubId?: string): void {
    this._mode = mode;
    this._hubId = hubId ?? null;
    this.mode.set(mode);
  }

  async loadBooking(bookingId: string): Promise<void> {
    this._loading.set(true);
    this._error.set(null);

    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<BookingDetail>>(`${this.apiUrl}/${bookingId}`, {
          withCredentials: true,
        })
      );

      if (response.success && response.data) {
        this._booking.set(response.data);
      } else {
        this._error.set(response.error?.message ?? 'Failed to load booking');
      }
    } catch (error) {
      console.error('Failed to fetch booking:', error);
      this._error.set('Failed to load booking details');
    } finally {
      this._loading.set(false);
    }
  }

  async submitReview(bookingId: string, review: ReviewInput): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.http.post<ApiResponse<BookingReview>>(
          `${this.apiUrl}/${bookingId}/review`,
          review,
          { withCredentials: true }
        )
      );

      if (response.success && response.data) {
        // Update local booking with new review
        this._booking.update((b) =>
          b ? { ...b, review: response.data } : null
        );
        return true;
      }

      this._error.set(response.error?.message ?? 'Failed to submit review');
      return false;
    } catch (error) {
      console.error('Failed to submit review:', error);
      this._error.set('Failed to submit review');
      return false;
    }
  }

  async updateReview(bookingId: string, review: ReviewInput): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.http.put<ApiResponse<BookingReview>>(
          `${this.apiUrl}/${bookingId}/review`,
          review,
          { withCredentials: true }
        )
      );

      if (response.success && response.data) {
        this._booking.update((b) =>
          b ? { ...b, review: response.data } : null
        );
        return true;
      }

      this._error.set(response.error?.message ?? 'Failed to update review');
      return false;
    } catch (error) {
      console.error('Failed to update review:', error);
      this._error.set('Failed to update review');
      return false;
    }
  }

  async deleteReview(bookingId: string): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.http.delete<ApiResponse<{ success: boolean }>>(
          `${this.apiUrl}/${bookingId}/review`,
          { withCredentials: true }
        )
      );

      if (response.success) {
        this._booking.update((b) =>
          b ? { ...b, review: undefined } : null
        );
        return true;
      }

      this._error.set(response.error?.message ?? 'Failed to delete review');
      return false;
    } catch (error) {
      console.error('Failed to delete review:', error);
      this._error.set('Failed to delete review');
      return false;
    }
  }

  async cancelBooking(bookingId: string, reason: string): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.http.post<ApiResponse<BookingDetail>>(
          `${this.apiUrl}/${bookingId}/cancel`,
          { reason },
          { withCredentials: true }
        )
      );

      if (response.success && response.data) {
        this._booking.set(response.data);
        return true;
      }

      this._error.set(response.error?.message ?? 'Failed to cancel booking');
      return false;
    } catch (error) {
      console.error('Failed to cancel booking:', error);
      this._error.set('Failed to cancel booking');
      return false;
    }
  }

  // ============================================================================
  // Hub Reply Methods (Hub Mode Only)
  // ============================================================================

  async submitHubReply(bookingId: string, reply: HubReplyInput): Promise<boolean> {
    if (this._mode !== 'hub') {
      this._error.set('Hub reply is only available in hub mode');
      return false;
    }

    try {
      const response = await firstValueFrom(
        this.http.post<ApiResponse<{ hubReply: BookingReview['hubReply'] }>>(
          `${this.apiUrl}/${bookingId}/reply`,
          reply,
          { withCredentials: true }
        )
      );

      if (response.success && response.data) {
        // Update local booking with new hub reply
        this._booking.update((b) => {
          if (b?.review) {
            return {
              ...b,
              review: { ...b.review, hubReply: response.data!.hubReply },
            };
          }
          return b;
        });
        return true;
      }

      this._error.set(response.error?.message ?? 'Failed to submit reply');
      return false;
    } catch (error) {
      console.error('Failed to submit hub reply:', error);
      this._error.set('Failed to submit reply');
      return false;
    }
  }

  async updateHubReply(bookingId: string, reply: HubReplyInput): Promise<boolean> {
    if (this._mode !== 'hub') {
      this._error.set('Hub reply is only available in hub mode');
      return false;
    }

    try {
      const response = await firstValueFrom(
        this.http.put<ApiResponse<{ hubReply: BookingReview['hubReply'] }>>(
          `${this.apiUrl}/${bookingId}/reply`,
          reply,
          { withCredentials: true }
        )
      );

      if (response.success && response.data) {
        this._booking.update((b) => {
          if (b?.review) {
            return {
              ...b,
              review: { ...b.review, hubReply: response.data!.hubReply },
            };
          }
          return b;
        });
        return true;
      }

      this._error.set(response.error?.message ?? 'Failed to update reply');
      return false;
    } catch (error) {
      console.error('Failed to update hub reply:', error);
      this._error.set('Failed to update reply');
      return false;
    }
  }

  async deleteHubReply(bookingId: string): Promise<boolean> {
    if (this._mode !== 'hub') {
      this._error.set('Hub reply is only available in hub mode');
      return false;
    }

    try {
      const response = await firstValueFrom(
        this.http.delete<ApiResponse<{ success: boolean }>>(
          `${this.apiUrl}/${bookingId}/reply`,
          { withCredentials: true }
        )
      );

      if (response.success) {
        this._booking.update((b) => {
          if (b?.review) {
            const { hubReply: _removed, ...reviewWithoutReply } = b.review;
            return { ...b, review: reviewWithoutReply };
          }
          return b;
        });
        return true;
      }

      this._error.set(response.error?.message ?? 'Failed to delete reply');
      return false;
    } catch (error) {
      console.error('Failed to delete hub reply:', error);
      this._error.set('Failed to delete reply');
      return false;
    }
  }

  reset(): void {
    this._booking.set(null);
    this._loading.set(false);
    this._error.set(null);
    this._mode = 'learner';
    this._hubId = null;
    this.mode.set('learner');
  }
}
