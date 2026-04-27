import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthStateService } from '../../../core/services/auth-state.service';
import type {
  HubBookingItem,
  HubBookingListParams,
  HubBookingListResponse,
  HubBookingPagination,
  HubUpdateBookingParams,
  HubUpdateBookingResponse,
  HubExportBookingsParams,
  BookingServiceType,
  BookingStatusFilter,
  BookingFilterState,
} from '../models/hub-booking.model';

// ============================================================================
// API Response Types
// ============================================================================

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// ============================================================================
// Default Values
// ============================================================================

const DEFAULT_FILTER_STATE: BookingFilterState = {
  serviceType: 'all',
  status: 'upcoming',
  search: '',
  dateFrom: '',
  dateTo: '',
  grouped: true,
};

const DEFAULT_PAGINATION: HubBookingPagination = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0,
};

// ============================================================================
// Hub Booking Service
// ============================================================================

/**
 * Hub Booking Service - Handles hub booking data with signal-based state management
 *
 * Features:
 * - Signal-based reactive state
 * - Automatic cache invalidation on hub change
 * - Pagination support
 * - Filter management
 * - Selection and expansion state
 */
@Injectable({ providedIn: 'root' })
export class HubBookingService {
  private readonly http = inject(HttpClient);
  private readonly authState = inject(AuthStateService);

  // Base URL pattern: /hub/:hubId/bookings
  private getApiUrl(hubId: string): string {
    return `${environment.apiUrl}/hub/${hubId}/bookings`;
  }

  // ============================================================================
  // State Signals
  // ============================================================================

  // Booking data
  private readonly _bookings = signal<HubBookingItem[]>([]);
  private readonly _pagination = signal<HubBookingPagination>(DEFAULT_PAGINATION);

  // Filter state
  private readonly _filters = signal<BookingFilterState>(DEFAULT_FILTER_STATE);

  // Loading and error states
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _exporting = signal(false);

  // Selection and expansion state
  private readonly _selectedIds = signal<Set<string>>(new Set());
  private readonly _expandedIds = signal<Set<string>>(new Set());

  // Cache tracking
  private readonly _cachedHubId = signal<string | null>(null);
  private readonly _initialized = signal(false);

  // ============================================================================
  // Public Readonly Signals
  // ============================================================================

  readonly bookings = this._bookings.asReadonly();
  readonly pagination = this._pagination.asReadonly();
  readonly filters = this._filters.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly exporting = this._exporting.asReadonly();
  readonly selectedIds = this._selectedIds.asReadonly();
  readonly expandedIds = this._expandedIds.asReadonly();
  readonly initialized = this._initialized.asReadonly();

  // ============================================================================
  // Computed Signals
  // ============================================================================

  readonly hasBookings = computed(() => this._bookings().length > 0);
  readonly totalBookings = computed(() => this._pagination().total);
  readonly currentPage = computed(() => this._pagination().page);
  readonly totalPages = computed(() => this._pagination().totalPages);

  readonly selectedCount = computed(() => this._selectedIds().size);
  readonly hasSelection = computed(() => this._selectedIds().size > 0);

  readonly allSelected = computed(() => {
    const bookings = this._bookings();
    const selected = this._selectedIds();
    return bookings.length > 0 && bookings.every((b) => selected.has(b._id));
  });

  readonly someSelected = computed(() => {
    const bookings = this._bookings();
    const selected = this._selectedIds();
    return bookings.some((b) => selected.has(b._id)) && !this.allSelected();
  });

  // Current filter values as individual signals
  readonly serviceType = computed(() => this._filters().serviceType);
  readonly statusFilter = computed(() => this._filters().status);
  readonly searchText = computed(() => this._filters().search);
  readonly isGrouped = computed(() => this._filters().grouped);

  // Bookings with UI state merged
  readonly bookingsWithState = computed(() => {
    const bookings = this._bookings();
    const selected = this._selectedIds();
    const expanded = this._expandedIds();

    return bookings.map((booking) => ({
      ...booking,
      isSelected: selected.has(booking._id),
      isExpanded: expanded.has(booking._id),
    }));
  });

  // ============================================================================
  // Filter Methods
  // ============================================================================

  setServiceType(serviceType: BookingServiceType): void {
    this._filters.update((f) => ({ ...f, serviceType }));
    this.resetAndFetch();
  }

  setStatusFilter(status: BookingStatusFilter): void {
    this._filters.update((f) => ({ ...f, status }));
    this.resetAndFetch();
  }

  setSearch(search: string): void {
    this._filters.update((f) => ({ ...f, search }));
    // Debounce search - fetch after user stops typing
  }

  setDateRange(dateFrom: string, dateTo: string): void {
    this._filters.update((f) => ({ ...f, dateFrom, dateTo }));
    this.resetAndFetch();
  }

  toggleGrouped(): void {
    this._filters.update((f) => ({ ...f, grouped: !f.grouped }));
    this.resetAndFetch();
  }

  resetFilters(): void {
    this._filters.set(DEFAULT_FILTER_STATE);
    this.resetAndFetch();
  }

  // ============================================================================
  // Selection Methods
  // ============================================================================

  toggleSelection(bookingId: string): void {
    this._selectedIds.update((selected) => {
      const newSet = new Set(selected);
      if (newSet.has(bookingId)) {
        newSet.delete(bookingId);
      } else {
        newSet.add(bookingId);
      }
      return newSet;
    });
  }

  toggleSelectAll(): void {
    const bookings = this._bookings();
    const allCurrentlySelected = this.allSelected();

    if (allCurrentlySelected) {
      // Deselect all
      this._selectedIds.set(new Set());
    } else {
      // Select all
      this._selectedIds.set(new Set(bookings.map((b) => b._id)));
    }
  }

  clearSelection(): void {
    this._selectedIds.set(new Set());
  }

  // ============================================================================
  // Expansion Methods
  // ============================================================================

  toggleExpansion(bookingId: string): void {
    this._expandedIds.update((expanded) => {
      const newSet = new Set(expanded);
      if (newSet.has(bookingId)) {
        newSet.delete(bookingId);
      } else {
        newSet.add(bookingId);
      }
      return newSet;
    });
  }

  expandAll(): void {
    const bookings = this._bookings();
    this._expandedIds.set(new Set(bookings.map((b) => b._id)));
  }

  collapseAll(): void {
    this._expandedIds.set(new Set());
  }

  // ============================================================================
  // Data Fetching Methods
  // ============================================================================

  /**
   * Load bookings - uses cache if available for current hub and filters
   */
  async loadBookings(): Promise<void> {
    const currentHubId = this.authState.selectedHub()?.id;

    // Clear cache if hub changed
    if (this._cachedHubId() !== currentHubId) {
      this.clearCache();
    }

    // Prevent concurrent calls
    if (this._loading()) {
      return;
    }

    await this.fetchBookings();
  }

  /**
   * Force refresh bookings from API
   */
  async refresh(): Promise<void> {
    await this.fetchBookings();
  }

  /**
   * Load next page of bookings
   */
  async loadNextPage(): Promise<void> {
    const pagination = this._pagination();
    if (pagination.page >= pagination.totalPages) {
      return;
    }

    await this.fetchBookings(pagination.page + 1);
  }

  /**
   * Load specific page
   */
  async loadPage(page: number): Promise<void> {
    if (page < 1 || page > this._pagination().totalPages) {
      return;
    }

    await this.fetchBookings(page);
  }

  /**
   * Search bookings with current search text
   */
  async searchBookings(): Promise<void> {
    this._pagination.update((p) => ({ ...p, page: 1 }));
    await this.fetchBookings();
  }

  // ============================================================================
  // Update Methods
  // ============================================================================

  /**
   * Update booking status (approve/reject/cancel)
   */
  async updateBookingStatus(params: HubUpdateBookingParams): Promise<HubUpdateBookingResponse | null> {
    const hubId = this.authState.selectedHub()?.id;
    if (!hubId) {
      this._error.set('No hub selected');
      return null;
    }

    try {
      const response = await firstValueFrom(
        this.http.patch<ApiResponse<HubUpdateBookingResponse>>(
          `${this.getApiUrl(hubId)}/${params.bookingId}/status`,
          { status: params.status, reason: params.reason },
          { withCredentials: true }
        )
      );

      if (response.success && response.data) {
        // Update local state
        this._bookings.update((bookings) =>
          bookings.map((b) =>
            b._id === params.bookingId
              ? { ...b, status: response.data!.status, updatedAt: response.data!.updatedAt }
              : b
          )
        );
        return response.data;
      }

      this._error.set(response.error?.message ?? 'Failed to update booking');
      return null;
    } catch (error) {
      console.error('Failed to update booking status:', error);
      this._error.set('Failed to update booking status');
      return null;
    }
  }

  /**
   * Cancel multiple selected bookings
   */
  async cancelSelectedBookings(reason: string): Promise<boolean> {
    const selectedIds = Array.from(this._selectedIds());
    if (selectedIds.length === 0) {
      return false;
    }

    const results = await Promise.all(
      selectedIds.map((bookingId) =>
        this.updateBookingStatus({ bookingId, status: 'cancelled', reason })
      )
    );

    // Clear selection after operation
    this.clearSelection();

    // Refresh to get updated data
    await this.refresh();

    return results.every((r) => r !== null);
  }

  // ============================================================================
  // Export Methods
  // ============================================================================

  /**
   * Export bookings as CSV
   */
  async exportBookings(params?: HubExportBookingsParams): Promise<void> {
    const hubId = this.authState.selectedHub()?.id;
    if (!hubId) {
      this._error.set('No hub selected');
      return;
    }

    this._exporting.set(true);

    try {
      const filters = this._filters();
      const queryParams = new HttpParams()
        .set('serviceType', params?.serviceType ?? filters.serviceType)
        .set('status', params?.status ?? filters.status)
        .set('dateFrom', params?.dateFrom ?? filters.dateFrom)
        .set('dateTo', params?.dateTo ?? filters.dateTo);

      const response = await firstValueFrom(
        this.http.get(`${this.getApiUrl(hubId)}/export`, {
          params: queryParams,
          responseType: 'blob',
          withCredentials: true,
        })
      );

      // Download the file
      this.downloadBlob(response, `hub-bookings-${new Date().toISOString().split('T')[0]}.csv`);
    } catch (error) {
      console.error('Failed to export bookings:', error);
      this._error.set('Failed to export bookings');
    } finally {
      this._exporting.set(false);
    }
  }

  // ============================================================================
  // Cache Methods
  // ============================================================================

  clearCache(): void {
    this._bookings.set([]);
    this._pagination.set(DEFAULT_PAGINATION);
    this._filters.set(DEFAULT_FILTER_STATE);
    this._selectedIds.set(new Set());
    this._expandedIds.set(new Set());
    this._initialized.set(false);
    this._cachedHubId.set(null);
    this._error.set(null);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async resetAndFetch(): Promise<void> {
    this._pagination.update((p) => ({ ...p, page: 1 }));
    this._selectedIds.set(new Set());
    await this.fetchBookings();
  }

  private async fetchBookings(page?: number): Promise<void> {
    const hubId = this.authState.selectedHub()?.id;
    if (!hubId) {
      this._error.set('No hub selected');
      return;
    }

    this._loading.set(true);
    this._error.set(null);

    try {
      const filters = this._filters();
      const pagination = this._pagination();

      const params: HubBookingListParams = {
        serviceType: filters.serviceType,
        status: filters.status,
        page: page ?? pagination.page,
        limit: pagination.limit,
        search: filters.search || undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        grouped: filters.grouped,
      };

      let httpParams = new HttpParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          httpParams = httpParams.set(key, String(value));
        }
      });

      const response = await firstValueFrom(
        this.http.get<ApiResponse<HubBookingListResponse>>(this.getApiUrl(hubId), {
          params: httpParams,
          withCredentials: true,
        })
      );

      if (response.success && response.data) {
        this._bookings.set(response.data.bookings);
        this._pagination.set(response.data.pagination);
        this._cachedHubId.set(hubId);
        this._initialized.set(true);
      } else {
        this._error.set(response.error?.message ?? 'Failed to load bookings');
      }
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
      this._error.set('Failed to load bookings');
    } finally {
      this._loading.set(false);
    }
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }
}
