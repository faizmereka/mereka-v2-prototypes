import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AuthStateService } from '../../../core/services/auth-state.service';

/**
 * Hub notification from the API
 */
export interface HubNotification {
  _id: string;
  userId: string;
  hubId?: string;
  templateId?: string;
  title: string;
  message: string;
  image?: string;
  actions?: Array<{
    label: string;
    type: 'primary' | 'secondary';
    url?: string;
    actionType?: string;
  }>;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Paginated notification response
 */
interface NotificationResponse {
  success: boolean;
  data: {
    notifications: HubNotification[];
    total: number;
    unreadCount: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface UnreadCountResponse {
  success: boolean;
  data: {
    unreadCount: number;
  };
}

interface MarkAsReadResponse {
  success: boolean;
  data: HubNotification | { modifiedCount: number };
}

@Injectable({ providedIn: 'root' })
export class HubNotificationService {
  private readonly http = inject(HttpClient);
  private readonly authState = inject(AuthStateService);

  // State
  private readonly _notifications = signal<HubNotification[]>([]);
  private readonly _loading = signal(false);
  private readonly _loadingMore = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _unreadCount = signal(0);
  private readonly _total = signal(0);
  private readonly _page = signal(1);
  private readonly _totalPages = signal(1);

  // Public readonly signals
  readonly notifications = this._notifications.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly loadingMore = this._loadingMore.asReadonly();
  readonly error = this._error.asReadonly();
  readonly unreadCount = this._unreadCount.asReadonly();
  readonly total = this._total.asReadonly();
  readonly page = this._page.asReadonly();
  readonly totalPages = this._totalPages.asReadonly();

  // Computed
  readonly hasMore = computed(() => this._page() < this._totalPages());

  private getApiUrl(): string {
    const hubId = this.authState.selectedHub()?.id;
    return `${environment.apiUrl}/hub/${hubId}/notifications`;
  }

  /**
   * Load notifications for the current hub (first page)
   */
  async loadNotifications(limit = 20): Promise<void> {
    const hubId = this.authState.selectedHub()?.id;
    if (!hubId) {
      this._error.set('No hub selected');
      return;
    }

    this._loading.set(true);
    this._error.set(null);
    this._page.set(1);

    try {
      const params = new HttpParams().set('page', '1').set('limit', limit.toString());

      const response = await this.http
        .get<NotificationResponse>(this.getApiUrl(), { params })
        .toPromise();

      if (response?.success && response.data) {
        this._notifications.set(response.data.notifications);
        this._total.set(response.data.total);
        this._unreadCount.set(response.data.unreadCount);
        this._totalPages.set(response.data.totalPages);
      }
    } catch (error) {
      console.error('Error loading hub notifications:', error);
      this._error.set('Failed to load notifications');
      this._notifications.set([]);
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Load more notifications (next page)
   */
  async loadMore(limit = 20): Promise<void> {
    if (!this.hasMore() || this._loadingMore()) {
      return;
    }

    this._loadingMore.set(true);

    try {
      const nextPage = this._page() + 1;
      const params = new HttpParams()
        .set('page', nextPage.toString())
        .set('limit', limit.toString());

      const response = await this.http
        .get<NotificationResponse>(this.getApiUrl(), { params })
        .toPromise();

      if (response?.success && response.data) {
        this._notifications.update((existing) => [...existing, ...response.data.notifications]);
        this._page.set(nextPage);
        this._totalPages.set(response.data.totalPages);
      }
    } catch (error) {
      console.error('Error loading more notifications:', error);
    } finally {
      this._loadingMore.set(false);
    }
  }

  /**
   * Get unread count for the current hub
   */
  async getUnreadCount(): Promise<number> {
    const hubId = this.authState.selectedHub()?.id;
    if (!hubId) return 0;

    try {
      const response = await this.http
        .get<UnreadCountResponse>(`${this.getApiUrl()}/unread-count`)
        .toPromise();

      if (response?.success && response.data) {
        this._unreadCount.set(response.data.unreadCount);
        return response.data.unreadCount;
      }
      return 0;
    } catch {
      return 0;
    }
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      const response = await this.http
        .post<MarkAsReadResponse>(`${this.getApiUrl()}/${notificationId}/read`, {})
        .toPromise();

      if (response?.success) {
        this._notifications.update((notifications) =>
          notifications.map((n) => (n._id === notificationId ? { ...n, isRead: true } : n))
        );
        this._unreadCount.update((count) => Math.max(0, count - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<void> {
    try {
      const response = await this.http
        .post<MarkAsReadResponse>(`${this.getApiUrl()}/mark-all-read`, {})
        .toPromise();

      if (response?.success) {
        this._notifications.update((notifications) =>
          notifications.map((n) => ({ ...n, isRead: true }))
        );
        this._unreadCount.set(0);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    try {
      await this.http.delete(`${this.getApiUrl()}/${notificationId}`).toPromise();

      this._notifications.update((notifications) =>
        notifications.filter((n) => n._id !== notificationId)
      );
      this._total.update((total) => Math.max(0, total - 1));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }

  /**
   * Reset state (call when switching hubs)
   */
  reset(): void {
    this._notifications.set([]);
    this._loading.set(false);
    this._loadingMore.set(false);
    this._error.set(null);
    this._unreadCount.set(0);
    this._total.set(0);
    this._page.set(1);
    this._totalPages.set(1);
  }
}
