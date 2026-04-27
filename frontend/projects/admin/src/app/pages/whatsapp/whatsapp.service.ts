import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, tap, throwError, firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * WhatsApp Template Categories
 */
export type WhatsAppTemplateCategory =
  | 'chats'
  | 'bookings'
  | 'jobs'
  | 'promotions'
  | 'system'
  | 'experiences'
  | 'members'
  | 'payments';

/**
 * Notification Scope - determines if notification is user-level or hub-level
 */
export type NotificationScope = 'user' | 'hub';

/**
 * Target User Type - specifies which user types receive the notification
 */
export type TargetUserType = 'learner' | 'expert' | 'hub_owner' | 'hub_admin' | 'hub_collaborator';

/**
 * WhatsApp Template interface
 */
export interface WhatsAppTemplate {
  _id: string;
  templateId: string;
  name: string;
  title: string;
  description: string;
  category: WhatsAppTemplateCategory;
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
 * WhatsApp Template Stats
 */
export interface WhatsAppTemplateStats {
  total: number;
  active: number;
  inactive: number;
  byCategory: Array<{ category: string; count: number }>;
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
 * Create WhatsApp Template input
 */
export interface CreateWhatsAppTemplateInput {
  templateId: string;
  name: string;
  title: string;
  description: string;
  category: WhatsAppTemplateCategory;
  scope?: NotificationScope;
  targetUserTypes?: TargetUserType[];
  whatsAppTemplateName: string;
  languageCode?: string;
  bodyPreview: string;
}

/**
 * Update WhatsApp Template input
 */
export interface UpdateWhatsAppTemplateInput {
  name?: string;
  title?: string;
  description?: string;
  category?: WhatsAppTemplateCategory;
  scope?: NotificationScope;
  targetUserTypes?: TargetUserType[];
  whatsAppTemplateName?: string;
  languageCode?: string;
  bodyPreview?: string;
  isActive?: boolean;
}

// ============ WHATSAPP LOG TYPES ============

/**
 * WhatsApp Status Enum
 */
export type WhatsAppStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';

/**
 * WhatsApp Log interface
 */
export interface WhatsAppLog {
  _id: string;
  toPhone: string;
  templateId: string;
  whatsAppTemplateName: string;
  data: Record<string, unknown>;
  status: WhatsAppStatus;
  providerMessageId?: string;
  userId?: {
    _id: string;
    email: string;
    name?: string;
    phone?: string;
  };
  hubId?: {
    _id: string;
    name: string;
  };
  error?: string;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * WhatsApp Log Stats
 */
export interface WhatsAppLogStats {
  total: number;
  last24Hours: number;
  byStatus: Record<string, number>;
  topTemplates: Array<{ templateId: string; count: number }>;
  sent: number;
  delivered: number;
  failed: number;
}

/**
 * Query params for WhatsApp logs
 */
export interface WhatsAppLogQueryParams {
  status?: WhatsAppStatus;
  templateId?: string;
  toPhone?: string;
  userId?: string;
  hubId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

/**
 * Query params for WhatsApp templates
 */
export interface WhatsAppTemplateQueryParams {
  isActive?: boolean;
  category?: WhatsAppTemplateCategory;
  page?: number;
  limit?: number;
}

/**
 * WhatsApp Service
 * Handles WhatsApp template and log operations
 */
@Injectable({
  providedIn: 'root',
})
export class WhatsAppService {
  private readonly http = inject(HttpClient);
  private readonly ADMIN_URL = `${environment.apiUrl}/admin`;

  // Templates state
  private readonly _templates = signal<WhatsAppTemplate[]>([]);
  private readonly _templatesLoading = signal(false);
  private readonly _templatesError = signal<string | null>(null);
  private readonly _templatesMeta = signal<ApiResponse<unknown>['meta'] | null>(null);

  // Stats state
  private readonly _stats = signal<WhatsAppTemplateStats | null>(null);
  private readonly _statsLoading = signal(false);

  // Public readonly signals
  readonly templates = this._templates.asReadonly();
  readonly templatesLoading = this._templatesLoading.asReadonly();
  readonly templatesError = this._templatesError.asReadonly();
  readonly templatesMeta = this._templatesMeta.asReadonly();

  readonly stats = this._stats.asReadonly();
  readonly statsLoading = this._statsLoading.asReadonly();

  // Computed stats
  readonly totalTemplates = computed(() => this._stats()?.total ?? 0);
  readonly activeTemplates = computed(() => this._stats()?.active ?? 0);
  readonly inactiveTemplates = computed(() => this._stats()?.inactive ?? 0);

  // WhatsApp Logs state
  private readonly _logs = signal<WhatsAppLog[]>([]);
  private readonly _logsLoading = signal(false);
  private readonly _logsError = signal<string | null>(null);
  private readonly _logsMeta = signal<ApiResponse<unknown>['meta'] | null>(null);

  // WhatsApp Logs Stats state
  private readonly _logStats = signal<WhatsAppLogStats | null>(null);
  private readonly _logStatsLoading = signal(false);

  // Public readonly signals for logs
  readonly logs = this._logs.asReadonly();
  readonly logsLoading = this._logsLoading.asReadonly();
  readonly logsError = this._logsError.asReadonly();
  readonly logsMeta = this._logsMeta.asReadonly();

  readonly logStats = this._logStats.asReadonly();
  readonly logStatsLoading = this._logStatsLoading.asReadonly();

  // Computed log stats
  readonly totalLogs = computed(() => this._logStats()?.total ?? 0);
  readonly logsLast24Hours = computed(() => this._logStats()?.last24Hours ?? 0);
  readonly sentLogs = computed(() => this._logStats()?.sent ?? 0);
  readonly deliveredLogs = computed(() => this._logStats()?.delivered ?? 0);
  readonly failedLogs = computed(() => this._logStats()?.failed ?? 0);

  // ============ WHATSAPP TEMPLATES ============

  /**
   * Get all WhatsApp templates
   */
  getTemplates(options?: WhatsAppTemplateQueryParams): Observable<ApiResponse<WhatsAppTemplate[]>> {
    this._templatesLoading.set(true);
    this._templatesError.set(null);

    let params = new HttpParams();
    if (options?.isActive !== undefined) params = params.set('isActive', options.isActive.toString());
    if (options?.category) params = params.set('category', options.category);
    if (options?.page) params = params.set('page', options.page.toString());
    if (options?.limit) params = params.set('limit', options.limit.toString());

    return this.http
      .get<ApiResponse<WhatsAppTemplate[]>>(`${this.ADMIN_URL}/whatsapp-templates`, {
        params,
        withCredentials: true,
      })
      .pipe(
        tap((response) => {
          if (response.success) {
            this._templates.set(response.data);
            this._templatesMeta.set(response.meta ?? null);
          }
          this._templatesLoading.set(false);
        }),
        catchError((error) => {
          this._templatesLoading.set(false);
          this._templatesError.set(error.error?.message || 'Failed to fetch templates');
          return throwError(() => error);
        }),
      );
  }

  /**
   * Get templates (async)
   */
  async getTemplatesAsync(options?: WhatsAppTemplateQueryParams): Promise<WhatsAppTemplate[]> {
    const response = await firstValueFrom(this.getTemplates(options));
    return response.data;
  }

  /**
   * Get single template by ID
   */
  getTemplateById(id: string): Observable<ApiResponse<WhatsAppTemplate>> {
    return this.http.get<ApiResponse<WhatsAppTemplate>>(
      `${this.ADMIN_URL}/whatsapp-templates/${id}`,
      { withCredentials: true },
    );
  }

  /**
   * Create WhatsApp template
   */
  createTemplate(data: CreateWhatsAppTemplateInput): Observable<ApiResponse<WhatsAppTemplate>> {
    return this.http
      .post<ApiResponse<WhatsAppTemplate>>(`${this.ADMIN_URL}/whatsapp-templates`, data, {
        withCredentials: true,
      })
      .pipe(
        tap((response) => {
          if (response.success) {
            this._templates.update((templates) => [...templates, response.data]);
          }
        }),
      );
  }

  /**
   * Create template (async)
   */
  async createTemplateAsync(data: CreateWhatsAppTemplateInput): Promise<WhatsAppTemplate> {
    const response = await firstValueFrom(this.createTemplate(data));
    return response.data;
  }

  /**
   * Update WhatsApp template
   */
  updateTemplate(
    id: string,
    data: UpdateWhatsAppTemplateInput,
  ): Observable<ApiResponse<WhatsAppTemplate>> {
    return this.http
      .patch<ApiResponse<WhatsAppTemplate>>(`${this.ADMIN_URL}/whatsapp-templates/${id}`, data, {
        withCredentials: true,
      })
      .pipe(
        tap((response) => {
          if (response.success) {
            this._templates.update((templates) =>
              templates.map((t) => (t._id === id ? response.data : t)),
            );
          }
        }),
      );
  }

  /**
   * Update template (async)
   */
  async updateTemplateAsync(id: string, data: UpdateWhatsAppTemplateInput): Promise<WhatsAppTemplate> {
    const response = await firstValueFrom(this.updateTemplate(id, data));
    return response.data;
  }

  /**
   * Delete WhatsApp template
   */
  deleteTemplate(id: string): Observable<ApiResponse<void>> {
    return this.http
      .delete<ApiResponse<void>>(`${this.ADMIN_URL}/whatsapp-templates/${id}`, {
        withCredentials: true,
      })
      .pipe(
        tap((response) => {
          if (response.success) {
            this._templates.update((templates) => templates.filter((t) => t._id !== id));
          }
        }),
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
  toggleTemplateStatus(id: string, isActive: boolean): Observable<ApiResponse<WhatsAppTemplate>> {
    return this.http
      .patch<ApiResponse<WhatsAppTemplate>>(
        `${this.ADMIN_URL}/whatsapp-templates/${id}/status`,
        { isActive },
        { withCredentials: true },
      )
      .pipe(
        tap((response) => {
          if (response.success) {
            this._templates.update((templates) =>
              templates.map((t) => (t._id === id ? response.data : t)),
            );
          }
        }),
      );
  }

  /**
   * Search templates
   */
  searchTemplates(query: string): Observable<ApiResponse<WhatsAppTemplate[]>> {
    return this.http.get<ApiResponse<WhatsAppTemplate[]>>(
      `${this.ADMIN_URL}/whatsapp-templates/search`,
      {
        params: { query },
        withCredentials: true,
      },
    );
  }

  /**
   * Get template stats
   */
  getStats(): Observable<ApiResponse<WhatsAppTemplateStats>> {
    this._statsLoading.set(true);

    return this.http
      .get<ApiResponse<WhatsAppTemplateStats>>(`${this.ADMIN_URL}/whatsapp-templates/stats`, {
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
        }),
      );
  }

  /**
   * Get stats (async)
   */
  async getStatsAsync(): Promise<WhatsAppTemplateStats> {
    const response = await firstValueFrom(this.getStats());
    return response.data;
  }

  // ============ WHATSAPP LOGS ============

  /**
   * Get all WhatsApp logs
   */
  getLogs(options?: WhatsAppLogQueryParams): Observable<ApiResponse<WhatsAppLog[]>> {
    this._logsLoading.set(true);
    this._logsError.set(null);

    let params = new HttpParams();
    if (options?.status) params = params.set('status', options.status);
    if (options?.templateId) params = params.set('templateId', options.templateId);
    if (options?.toPhone) params = params.set('toPhone', options.toPhone);
    if (options?.userId) params = params.set('userId', options.userId);
    if (options?.hubId) params = params.set('hubId', options.hubId);
    if (options?.startDate) params = params.set('startDate', options.startDate);
    if (options?.endDate) params = params.set('endDate', options.endDate);
    if (options?.page) params = params.set('page', options.page.toString());
    if (options?.limit) params = params.set('limit', options.limit.toString());

    return this.http
      .get<ApiResponse<WhatsAppLog[]>>(`${this.ADMIN_URL}/whatsapp-logs`, {
        params,
        withCredentials: true,
      })
      .pipe(
        tap((response) => {
          if (response.success) {
            this._logs.set(response.data);
            this._logsMeta.set(response.meta ?? null);
          }
          this._logsLoading.set(false);
        }),
        catchError((error) => {
          this._logsLoading.set(false);
          this._logsError.set(error.error?.message || 'Failed to fetch WhatsApp logs');
          return throwError(() => error);
        }),
      );
  }

  /**
   * Get logs (async)
   */
  async getLogsAsync(options?: WhatsAppLogQueryParams): Promise<WhatsAppLog[]> {
    const response = await firstValueFrom(this.getLogs(options));
    return response.data;
  }

  /**
   * Get single WhatsApp log by ID
   */
  getLogById(id: string): Observable<ApiResponse<WhatsAppLog>> {
    return this.http.get<ApiResponse<WhatsAppLog>>(`${this.ADMIN_URL}/whatsapp-logs/${id}`, {
      withCredentials: true,
    });
  }

  /**
   * Get WhatsApp log stats
   */
  getLogStats(): Observable<ApiResponse<WhatsAppLogStats>> {
    this._logStatsLoading.set(true);

    return this.http
      .get<ApiResponse<WhatsAppLogStats>>(`${this.ADMIN_URL}/whatsapp-logs/stats`, {
        withCredentials: true,
      })
      .pipe(
        tap((response) => {
          if (response.success) {
            this._logStats.set(response.data);
          }
          this._logStatsLoading.set(false);
        }),
        catchError((error) => {
          this._logStatsLoading.set(false);
          return throwError(() => error);
        }),
      );
  }

  /**
   * Get log stats (async)
   */
  async getLogStatsAsync(): Promise<WhatsAppLogStats> {
    const response = await firstValueFrom(this.getLogStats());
    return response.data;
  }

  /**
   * Search WhatsApp logs
   */
  searchLogs(
    query: string,
    options?: { startDate?: string; endDate?: string; page?: number; limit?: number },
  ): Observable<ApiResponse<WhatsAppLog[]>> {
    let params = new HttpParams().set('query', query);
    if (options?.startDate) params = params.set('startDate', options.startDate);
    if (options?.endDate) params = params.set('endDate', options.endDate);
    if (options?.page) params = params.set('page', options.page.toString());
    if (options?.limit) params = params.set('limit', options.limit.toString());

    return this.http.get<ApiResponse<WhatsAppLog[]>>(`${this.ADMIN_URL}/whatsapp-logs/search`, {
      params,
      withCredentials: true,
    });
  }

  /**
   * Delete WhatsApp log
   */
  deleteLog(id: string): Observable<ApiResponse<void>> {
    return this.http
      .delete<ApiResponse<void>>(`${this.ADMIN_URL}/whatsapp-logs/${id}`, {
        withCredentials: true,
      })
      .pipe(
        tap((response) => {
          if (response.success) {
            this._logs.update((logs) => logs.filter((l) => l._id !== id));
          }
        }),
      );
  }

  /**
   * Delete log (async)
   */
  async deleteLogAsync(id: string): Promise<void> {
    await firstValueFrom(this.deleteLog(id));
  }
}
