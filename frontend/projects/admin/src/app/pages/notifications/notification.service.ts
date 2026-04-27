import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, tap, throwError, firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Notification Template Category
 */
export type NotificationCategory =
  | 'system'
  | 'bookings'
  | 'experiences'
  | 'jobs'
  | 'members'
  | 'payments'
  | 'chats'
  | 'promotions';

/**
 * Notification Scope - determines if notification is user-level or hub-level
 */
export type NotificationScope = 'user' | 'hub';

/**
 * Target User Type - specifies which user types receive the notification
 */
export type TargetUserType = 'learner' | 'expert' | 'hub_owner' | 'hub_admin' | 'hub_collaborator';

/**
 * Notification Template interface (In-App)
 * Includes category, title, description for UI grouping
 */
export interface NotificationTemplate {
  _id: string;
  templateId: string;
  name: string;
  title: string;
  body: string;
  description: string;
  category: NotificationCategory;
  scope: NotificationScope;
  targetUserTypes: TargetUserType[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * WhatsApp Template interface
 */
export interface WhatsAppTemplate {
  _id: string;
  templateId: string;
  name: string;
  title: string;
  description: string;
  category: NotificationCategory;
  scope: NotificationScope;
  targetUserTypes: TargetUserType[];
  whatsAppTemplateName: string;
  languageCode: string;
  bodyPreview: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Notification Status
 */
export type NotificationStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';

/**
 * Notification (log) interface (simplified)
 * Fields: userId, templateId, title, message, status, isRead, readAt, sentAt
 */
export interface Notification {
  _id: string;
  userId: { _id: string; name: string; email: string } | string;
  templateId?: string;
  title: string;
  message: string;
  status: NotificationStatus;
  isRead: boolean;
  readAt?: string;
  sentAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Notification Stats
 */
export interface NotificationStats {
  total: number;
  byStatus: Array<{ status: string; count: number }>;
  byTemplateId: Array<{ templateId: string; count: number }>;
  recentActivity: Array<{ date: string; count: number }>;
}

/**
 * API Response structure
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Create Notification Template input (In-App)
 */
export interface CreateNotificationTemplateInput {
  templateId: string;
  name: string;
  title: string;
  body: string;
  description?: string;
  category?: NotificationCategory;
  scope?: NotificationScope;
  targetUserTypes?: TargetUserType[];
}

/**
 * Update Notification Template input
 */
export interface UpdateNotificationTemplateInput {
  name?: string;
  title?: string;
  body?: string;
  description?: string;
  category?: NotificationCategory;
  scope?: NotificationScope;
  targetUserTypes?: TargetUserType[];
  isActive?: boolean;
}

/**
 * Create WhatsApp Template input
 */
export interface CreateWhatsAppTemplateInput {
  templateId: string;
  name: string;
  title: string;
  description?: string;
  category?: NotificationCategory;
  scope?: NotificationScope;
  targetUserTypes?: TargetUserType[];
  whatsAppTemplateName: string;
  languageCode: string;
  bodyPreview: string;
}

/**
 * Update WhatsApp Template input
 */
export interface UpdateWhatsAppTemplateInput {
  name?: string;
  title?: string;
  description?: string;
  category?: NotificationCategory;
  scope?: NotificationScope;
  targetUserTypes?: TargetUserType[];
  whatsAppTemplateName?: string;
  languageCode?: string;
  bodyPreview?: string;
  isActive?: boolean;
}

/**
 * Query params for notifications (simplified)
 */
export interface NotificationQueryParams {
  userId?: string;
  templateId?: string;
  status?: NotificationStatus;
  isRead?: boolean;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

/**
 * Notification Service
 * Handles notification templates and notification logs
 */
@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly ADMIN_URL = `${environment.apiUrl}/admin`;

  // Templates state
  private readonly _templates = signal<NotificationTemplate[]>([]);
  private readonly _templatesLoading = signal(false);
  private readonly _templatesError = signal<string | null>(null);

  // Notifications (logs) state
  private readonly _notifications = signal<Notification[]>([]);
  private readonly _notificationsLoading = signal(false);
  private readonly _notificationsError = signal<string | null>(null);
  private readonly _notificationsMeta = signal<ApiResponse<unknown>['meta'] | null>(null);

  // Stats state
  private readonly _stats = signal<NotificationStats | null>(null);
  private readonly _statsLoading = signal(false);

  // Public readonly signals
  readonly templates = this._templates.asReadonly();
  readonly templatesLoading = this._templatesLoading.asReadonly();
  readonly templatesError = this._templatesError.asReadonly();

  readonly notifications = this._notifications.asReadonly();
  readonly notificationsLoading = this._notificationsLoading.asReadonly();
  readonly notificationsError = this._notificationsError.asReadonly();
  readonly notificationsMeta = this._notificationsMeta.asReadonly();

  readonly stats = this._stats.asReadonly();
  readonly statsLoading = this._statsLoading.asReadonly();

  // Computed stats from API response
  readonly totalNotifications = computed(() => this._stats()?.total ?? 0);
  readonly deliveredCount = computed(() => {
    const byStatus = this._stats()?.byStatus ?? [];
    const delivered = byStatus.find((s) => s.status === 'DELIVERED');
    const sent = byStatus.find((s) => s.status === 'SENT');
    return (delivered?.count ?? 0) + (sent?.count ?? 0);
  });
  readonly readCount = computed(() => {
    const byStatus = this._stats()?.byStatus ?? [];
    return byStatus.find((s) => s.status === 'READ')?.count ?? 0;
  });
  readonly failedCount = computed(() => {
    const byStatus = this._stats()?.byStatus ?? [];
    return byStatus.find((s) => s.status === 'FAILED')?.count ?? 0;
  });

  // ============ NOTIFICATION TEMPLATES ============

  /**
   * Get all notification templates
   */
  getTemplates(options?: { isActive?: boolean }): Observable<ApiResponse<NotificationTemplate[]>> {
    this._templatesLoading.set(true);
    this._templatesError.set(null);

    let params = new HttpParams();
    if (options?.isActive !== undefined) params = params.set('isActive', options.isActive.toString());

    return this.http
      .get<ApiResponse<NotificationTemplate[]>>(`${this.ADMIN_URL}/notification-templates`, {
        params,
        withCredentials: true,
      })
      .pipe(
        tap((response) => {
          if (response.success) {
            this._templates.set(response.data);
          }
          this._templatesLoading.set(false);
        }),
        catchError((error) => {
          this._templatesLoading.set(false);
          this._templatesError.set(error.error?.message || 'Failed to fetch templates');
          return throwError(() => error);
        })
      );
  }

  /**
   * Get templates (async)
   */
  async getTemplatesAsync(options?: { isActive?: boolean }): Promise<NotificationTemplate[]> {
    const response = await firstValueFrom(this.getTemplates(options));
    return response.data;
  }

  /**
   * Get single template by ID
   */
  getTemplateById(id: string): Observable<ApiResponse<NotificationTemplate>> {
    return this.http.get<ApiResponse<NotificationTemplate>>(
      `${this.ADMIN_URL}/notification-templates/${id}`,
      { withCredentials: true }
    );
  }

  /**
   * Create notification template
   */
  createTemplate(data: CreateNotificationTemplateInput): Observable<ApiResponse<NotificationTemplate>> {
    return this.http
      .post<ApiResponse<NotificationTemplate>>(`${this.ADMIN_URL}/notification-templates`, data, {
        withCredentials: true,
      })
      .pipe(
        tap((response) => {
          if (response.success) {
            this._templates.update((templates) => [...templates, response.data]);
          }
        })
      );
  }

  /**
   * Create template (async)
   */
  async createTemplateAsync(data: CreateNotificationTemplateInput): Promise<NotificationTemplate> {
    const response = await firstValueFrom(this.createTemplate(data));
    return response.data;
  }

  /**
   * Update notification template
   */
  updateTemplate(
    id: string,
    data: UpdateNotificationTemplateInput
  ): Observable<ApiResponse<NotificationTemplate>> {
    return this.http
      .patch<ApiResponse<NotificationTemplate>>(`${this.ADMIN_URL}/notification-templates/${id}`, data, {
        withCredentials: true,
      })
      .pipe(
        tap((response) => {
          if (response.success) {
            this._templates.update((templates) =>
              templates.map((t) => (t._id === id ? response.data : t))
            );
          }
        })
      );
  }

  /**
   * Update template (async)
   */
  async updateTemplateAsync(
    id: string,
    data: UpdateNotificationTemplateInput
  ): Promise<NotificationTemplate> {
    const response = await firstValueFrom(this.updateTemplate(id, data));
    return response.data;
  }

  /**
   * Delete notification template
   */
  deleteTemplate(id: string): Observable<ApiResponse<void>> {
    return this.http
      .delete<ApiResponse<void>>(`${this.ADMIN_URL}/notification-templates/${id}`, {
        withCredentials: true,
      })
      .pipe(
        tap((response) => {
          if (response.success) {
            this._templates.update((templates) => templates.filter((t) => t._id !== id));
          }
        })
      );
  }

  /**
   * Delete template (async)
   */
  async deleteTemplateAsync(id: string): Promise<void> {
    await firstValueFrom(this.deleteTemplate(id));
  }

  /**
   * Toggle template status
   */
  toggleTemplateStatus(id: string, isActive: boolean): Observable<ApiResponse<NotificationTemplate>> {
    return this.http
      .patch<ApiResponse<NotificationTemplate>>(
        `${this.ADMIN_URL}/notification-templates/${id}/status`,
        { isActive },
        { withCredentials: true }
      )
      .pipe(
        tap((response) => {
          if (response.success) {
            this._templates.update((templates) =>
              templates.map((t) => (t._id === id ? response.data : t))
            );
          }
        })
      );
  }

  /**
   * Search templates
   */
  searchTemplates(query: string): Observable<ApiResponse<NotificationTemplate[]>> {
    return this.http.get<ApiResponse<NotificationTemplate[]>>(
      `${this.ADMIN_URL}/notification-templates/search`,
      {
        params: { query },
        withCredentials: true,
      }
    );
  }

  // ============ NOTIFICATION LOGS ============

  /**
   * Get notification logs
   */
  getNotifications(params?: NotificationQueryParams): Observable<ApiResponse<Notification[]>> {
    this._notificationsLoading.set(true);
    this._notificationsError.set(null);

    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          httpParams = httpParams.set(key, value.toString());
        }
      });
    }

    return this.http
      .get<ApiResponse<Notification[]>>(`${this.ADMIN_URL}/notifications`, {
        params: httpParams,
        withCredentials: true,
      })
      .pipe(
        tap((response) => {
          if (response.success) {
            this._notifications.set(response.data);
            this._notificationsMeta.set(response.meta ?? null);
          }
          this._notificationsLoading.set(false);
        }),
        catchError((error) => {
          this._notificationsLoading.set(false);
          this._notificationsError.set(error.error?.message || 'Failed to fetch notifications');
          return throwError(() => error);
        })
      );
  }

  /**
   * Get notifications (async)
   */
  async getNotificationsAsync(params?: NotificationQueryParams): Promise<Notification[]> {
    const response = await firstValueFrom(this.getNotifications(params));
    return response.data;
  }

  /**
   * Get notification stats
   */
  getStats(): Observable<ApiResponse<NotificationStats>> {
    this._statsLoading.set(true);

    return this.http
      .get<ApiResponse<NotificationStats>>(`${this.ADMIN_URL}/notifications/stats`, {
        withCredentials: true,
      })
      .pipe(
        tap((response) => {
          if (response.success) {
            this._stats.set(response.data);
          }
          this._statsLoading.set(false);
        }),
        catchError((error) => {
          this._statsLoading.set(false);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get stats (async)
   */
  async getStatsAsync(): Promise<NotificationStats> {
    const response = await firstValueFrom(this.getStats());
    return response.data;
  }

  /**
   * Search notifications
   */
  searchNotifications(
    query: string,
    params?: { startDate?: string; endDate?: string; page?: number; limit?: number }
  ): Observable<ApiResponse<Notification[]>> {
    let httpParams = new HttpParams().set('query', query);
    if (params?.startDate) httpParams = httpParams.set('startDate', params.startDate);
    if (params?.endDate) httpParams = httpParams.set('endDate', params.endDate);
    if (params?.page) httpParams = httpParams.set('page', params.page.toString());
    if (params?.limit) httpParams = httpParams.set('limit', params.limit.toString());

    return this.http.get<ApiResponse<Notification[]>>(`${this.ADMIN_URL}/notifications/search`, {
      params: httpParams,
      withCredentials: true,
    });
  }

  /**
   * Delete notification
   */
  deleteNotification(id: string): Observable<ApiResponse<void>> {
    return this.http
      .delete<ApiResponse<void>>(`${this.ADMIN_URL}/notifications/${id}`, {
        withCredentials: true,
      })
      .pipe(
        tap((response) => {
          if (response.success) {
            this._notifications.update((notifications) =>
              notifications.filter((n) => n._id !== id)
            );
          }
        })
      );
  }

  /**
   * Update notification status
   */
  updateNotificationStatus(id: string, status: NotificationStatus): Observable<ApiResponse<Notification>> {
    return this.http.patch<ApiResponse<Notification>>(
      `${this.ADMIN_URL}/notifications/${id}/status`,
      { status },
      { withCredentials: true }
    );
  }

  /**
   * Cleanup old notifications
   */
  cleanupNotifications(olderThanDays: number): Observable<ApiResponse<{ deletedCount: number }>> {
    return this.http.post<ApiResponse<{ deletedCount: number }>>(
      `${this.ADMIN_URL}/notifications/cleanup`,
      { olderThanDays },
      { withCredentials: true }
    );
  }
}
