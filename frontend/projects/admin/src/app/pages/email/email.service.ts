import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, tap, throwError, firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Email Template Category
 */
export type EmailTemplateCategory =
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
 * Email Template interface
 */
export interface EmailTemplate {
  _id: string;
  templateId: string;
  name: string;
  title: string;
  description: string;
  category: EmailTemplateCategory;
  scope: NotificationScope;
  targetUserTypes: TargetUserType[];
  sendGridTemplateId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Email Template Stats
 */
export interface EmailTemplateStats {
  total: number;
  active: number;
  inactive: number;
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
 * Create Email Template input
 */
export interface CreateEmailTemplateInput {
  templateId: string;
  name: string;
  title: string;
  description?: string;
  category?: EmailTemplateCategory;
  scope?: NotificationScope;
  targetUserTypes?: TargetUserType[];
  sendGridTemplateId: string;
}

/**
 * Update Email Template input
 */
export interface UpdateEmailTemplateInput {
  name?: string;
  title?: string;
  description?: string;
  category?: EmailTemplateCategory;
  scope?: NotificationScope;
  targetUserTypes?: TargetUserType[];
  sendGridTemplateId?: string;
  isActive?: boolean;
}

// ============ EMAIL LOG TYPES ============

/**
 * Email Status Enum
 */
export type EmailStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'OPENED' | 'CLICKED' | 'BOUNCED' | 'FAILED';

/**
 * Email Log interface
 */
export interface EmailLog {
  _id: string;
  toEmail: string;
  emailType: string;
  sendGridTemplateId: string;
  data: Record<string, unknown>;
  status: EmailStatus;
  providerMessageId?: string;
  sendGridEvents: Array<{
    event: string;
    timestamp: string;
    reason?: string;
    url?: string;
  }>;
  userId?: string;
  error?: string;
  sentAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Email Log Stats
 */
export interface EmailLogStats {
  total: number;
  last24Hours: number;
  byStatus: Record<string, number>;
  topTypes: Array<{ type: string; count: number }>;
  delivered: number;
  failed: number;
  bounced: number;
}

/**
 * Query params for email logs
 */
export interface EmailLogQueryParams {
  status?: EmailStatus;
  emailType?: string;
  toEmail?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

/**
 * Query params for email templates
 */
export interface EmailTemplateQueryParams {
  isActive?: boolean;
  page?: number;
  limit?: number;
}

/**
 * Email Template Service
 * Handles email template CRUD operations
 */
@Injectable({
  providedIn: 'root',
})
export class EmailService {
  private readonly http = inject(HttpClient);
  private readonly ADMIN_URL = `${environment.apiUrl}/admin`;

  // Templates state
  private readonly _templates = signal<EmailTemplate[]>([]);
  private readonly _templatesLoading = signal(false);
  private readonly _templatesError = signal<string | null>(null);
  private readonly _templatesMeta = signal<ApiResponse<unknown>['meta'] | null>(null);

  // Stats state
  private readonly _stats = signal<EmailTemplateStats | null>(null);
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

  // Email Logs state
  private readonly _logs = signal<EmailLog[]>([]);
  private readonly _logsLoading = signal(false);
  private readonly _logsError = signal<string | null>(null);
  private readonly _logsMeta = signal<ApiResponse<unknown>['meta'] | null>(null);

  // Email Logs Stats state
  private readonly _logStats = signal<EmailLogStats | null>(null);
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
  readonly deliveredLogs = computed(() => this._logStats()?.delivered ?? 0);
  readonly failedLogs = computed(() => this._logStats()?.failed ?? 0);
  readonly bouncedLogs = computed(() => this._logStats()?.bounced ?? 0);

  // ============ EMAIL TEMPLATES ============

  /**
   * Get all email templates
   */
  getTemplates(options?: EmailTemplateQueryParams): Observable<ApiResponse<EmailTemplate[]>> {
    this._templatesLoading.set(true);
    this._templatesError.set(null);

    let params = new HttpParams();
    if (options?.isActive !== undefined) params = params.set('isActive', options.isActive.toString());
    if (options?.page) params = params.set('page', options.page.toString());
    if (options?.limit) params = params.set('limit', options.limit.toString());

    return this.http
      .get<ApiResponse<EmailTemplate[]>>(`${this.ADMIN_URL}/email-templates`, {
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
        })
      );
  }

  /**
   * Get templates (async)
   */
  async getTemplatesAsync(options?: EmailTemplateQueryParams): Promise<EmailTemplate[]> {
    const response = await firstValueFrom(this.getTemplates(options));
    return response.data;
  }

  /**
   * Get single template by ID
   */
  getTemplateById(id: string): Observable<ApiResponse<EmailTemplate>> {
    return this.http.get<ApiResponse<EmailTemplate>>(
      `${this.ADMIN_URL}/email-templates/${id}`,
      { withCredentials: true }
    );
  }

  /**
   * Create email template
   */
  createTemplate(data: CreateEmailTemplateInput): Observable<ApiResponse<EmailTemplate>> {
    return this.http
      .post<ApiResponse<EmailTemplate>>(`${this.ADMIN_URL}/email-templates`, data, {
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
  async createTemplateAsync(data: CreateEmailTemplateInput): Promise<EmailTemplate> {
    const response = await firstValueFrom(this.createTemplate(data));
    return response.data;
  }

  /**
   * Update email template
   */
  updateTemplate(
    id: string,
    data: UpdateEmailTemplateInput
  ): Observable<ApiResponse<EmailTemplate>> {
    return this.http
      .patch<ApiResponse<EmailTemplate>>(`${this.ADMIN_URL}/email-templates/${id}`, data, {
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
    data: UpdateEmailTemplateInput
  ): Promise<EmailTemplate> {
    const response = await firstValueFrom(this.updateTemplate(id, data));
    return response.data;
  }

  /**
   * Delete email template
   */
  deleteTemplate(id: string): Observable<ApiResponse<void>> {
    return this.http
      .delete<ApiResponse<void>>(`${this.ADMIN_URL}/email-templates/${id}`, {
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
  toggleTemplateStatus(id: string, isActive: boolean): Observable<ApiResponse<EmailTemplate>> {
    return this.http
      .patch<ApiResponse<EmailTemplate>>(
        `${this.ADMIN_URL}/email-templates/${id}/status`,
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
  searchTemplates(query: string): Observable<ApiResponse<EmailTemplate[]>> {
    return this.http.get<ApiResponse<EmailTemplate[]>>(
      `${this.ADMIN_URL}/email-templates/search`,
      {
        params: { query },
        withCredentials: true,
      }
    );
  }

  /**
   * Get template stats
   */
  getStats(): Observable<ApiResponse<EmailTemplateStats>> {
    this._statsLoading.set(true);

    return this.http
      .get<ApiResponse<EmailTemplateStats>>(`${this.ADMIN_URL}/email-templates/stats`, {
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
  async getStatsAsync(): Promise<EmailTemplateStats> {
    const response = await firstValueFrom(this.getStats());
    return response.data;
  }

  // ============ EMAIL LOGS ============

  /**
   * Get all email logs
   */
  getLogs(options?: EmailLogQueryParams): Observable<ApiResponse<EmailLog[]>> {
    this._logsLoading.set(true);
    this._logsError.set(null);

    let params = new HttpParams();
    if (options?.status) params = params.set('status', options.status);
    if (options?.emailType) params = params.set('emailType', options.emailType);
    if (options?.toEmail) params = params.set('toEmail', options.toEmail);
    if (options?.startDate) params = params.set('startDate', options.startDate);
    if (options?.endDate) params = params.set('endDate', options.endDate);
    if (options?.page) params = params.set('page', options.page.toString());
    if (options?.limit) params = params.set('limit', options.limit.toString());

    return this.http
      .get<ApiResponse<EmailLog[]>>(`${this.ADMIN_URL}/emails`, {
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
          this._logsError.set(error.error?.message || 'Failed to fetch email logs');
          return throwError(() => error);
        })
      );
  }

  /**
   * Get logs (async)
   */
  async getLogsAsync(options?: EmailLogQueryParams): Promise<EmailLog[]> {
    const response = await firstValueFrom(this.getLogs(options));
    return response.data;
  }

  /**
   * Get single email log by ID
   */
  getLogById(id: string): Observable<ApiResponse<EmailLog>> {
    return this.http.get<ApiResponse<EmailLog>>(
      `${this.ADMIN_URL}/emails/${id}`,
      { withCredentials: true }
    );
  }

  /**
   * Get email log stats
   */
  getLogStats(): Observable<ApiResponse<EmailLogStats>> {
    this._logStatsLoading.set(true);

    return this.http
      .get<ApiResponse<EmailLogStats>>(`${this.ADMIN_URL}/emails/stats`, {
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
        })
      );
  }

  /**
   * Get log stats (async)
   */
  async getLogStatsAsync(): Promise<EmailLogStats> {
    const response = await firstValueFrom(this.getLogStats());
    return response.data;
  }

  /**
   * Search email logs
   */
  searchLogs(
    query: string,
    options?: { startDate?: string; endDate?: string; page?: number; limit?: number }
  ): Observable<ApiResponse<EmailLog[]>> {
    let params = new HttpParams().set('query', query);
    if (options?.startDate) params = params.set('startDate', options.startDate);
    if (options?.endDate) params = params.set('endDate', options.endDate);
    if (options?.page) params = params.set('page', options.page.toString());
    if (options?.limit) params = params.set('limit', options.limit.toString());

    return this.http.get<ApiResponse<EmailLog[]>>(
      `${this.ADMIN_URL}/emails/search`,
      {
        params,
        withCredentials: true,
      }
    );
  }

  /**
   * Delete email log
   */
  deleteLog(id: string): Observable<ApiResponse<void>> {
    return this.http
      .delete<ApiResponse<void>>(`${this.ADMIN_URL}/emails/${id}`, {
        withCredentials: true,
      })
      .pipe(
        tap((response) => {
          if (response.success) {
            this._logs.update((logs) => logs.filter((l) => l._id !== id));
          }
        })
      );
  }

  /**
   * Delete log (async)
   */
  async deleteLogAsync(id: string): Promise<void> {
    await firstValueFrom(this.deleteLog(id));
  }
}
