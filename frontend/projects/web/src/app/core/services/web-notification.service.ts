import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';

/**
 * Web notification from the API
 */
export interface WebNotification {
  _id: string;
  userId: string;
  templateId?: string;
  title: string;
  message: string;
  image?: string;
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
    notifications: WebNotification[];
    total: number;
    unreadCount: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface MarkAsReadResponse {
  success: boolean;
  data: WebNotification | { modifiedCount: number };
}

/**
 * Lightweight notification service for web header
 * Only loads unread count and recent notifications for the dropdown
 */
@Injectable({ providedIn: 'root' })
export class WebNotificationService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/me/notifications`;

  // State
  private readonly _notifications = signal<WebNotification[]>([]);
  private readonly _unreadCount = signal(0);
  private readonly _initialized = signal(false);

  // Public readonly signals
  readonly notifications = this._notifications.asReadonly();
  readonly unreadCount = this._unreadCount.asReadonly();
  readonly initialized = this._initialized.asReadonly();

  // Computed - get only recent 5 for dropdown
  readonly recentNotifications = computed(() => this._notifications().slice(0, 5));

  /**
   * Load notifications for the header dropdown (lightweight - only 10 items)
   */
  async loadNotifications(): Promise<void> {
    if (this._initialized()) return;

    try {
      const params = new HttpParams().set('page', '1').set('limit', '10');

      const response = await this.http
        .get<NotificationResponse>(this.apiUrl, { params })
        .toPromise();

      if (response?.success && response.data) {
        this._notifications.set(response.data.notifications);
        this._unreadCount.set(response.data.unreadCount);
      }
      this._initialized.set(true);
    } catch (error) {
      console.error('Error loading notifications:', error);
      this._initialized.set(true);
    }
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      const response = await this.http
        .post<MarkAsReadResponse>(`${this.apiUrl}/${notificationId}/read`, {})
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
        .post<MarkAsReadResponse>(`${this.apiUrl}/mark-all-read`, {})
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
   * Reset state (on logout)
   */
  reset(): void {
    this._notifications.set([]);
    this._unreadCount.set(0);
    this._initialized.set(false);
  }
}
