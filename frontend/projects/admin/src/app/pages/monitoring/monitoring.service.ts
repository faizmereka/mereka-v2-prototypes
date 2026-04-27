import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export type LogLevel = 'info' | 'warn' | 'error';
export type ApiModule = 'auth' | 'web' | 'admin' | 'hub' | 'payments' | 'other';
export type CronJobStatus = 'running' | 'completed' | 'failed' | 'skipped';
export type CronJobCategory = 'payment' | 'notification' | 'maintenance' | 'data_sync' | 'cleanup';

export interface ApiLog {
  _id: string;
  requestId: string;
  userId?: string;
  userEmail?: string;
  method: string;
  path: string;
  route?: string;
  module?: ApiModule;
  statusCode: number;
  responseTime: number;
  ip: string;
  userAgent?: string;
  level: LogLevel;
  errorCode?: string;
  errorMessage?: string;
  tags: string[];
  createdAt: string;
}

export interface ApiStats {
  totalRequests: number;
  uniqueUsers: number;
  uniqueIPs: number;
  avgResponseTime: number;
  errorRate: number;
  statusCodeDistribution: Record<string, number>;
  topPaths: Array<{ path: string; count: number }>;
  period: { start: string; end: string };
}

export interface SuspiciousActivity {
  highVolumeIPs: Array<{ ip: string; count: number }>;
  highErrorRateIPs: Array<{ ip: string; errorRate: number; count: number }>;
  blockedAttempts: number;
}

export interface CronJobRun {
  _id: string;
  jobName: string;
  jobCategory: CronJobCategory;
  status: CronJobStatus;
  startedAt: string;
  completedAt?: string;
  duration?: number;
  error?: string;
  errorStack?: string;
  metadata: {
    recordsProcessed?: number;
    recordsSucceeded?: number;
    recordsFailed?: number;
    recordsSkipped?: number;
    [key: string]: unknown;
  };
  retryCount: number;
  triggeredBy: 'schedule' | 'manual' | 'retry';
  serverInstance?: string;
  createdAt: string;
}

export interface CronJobStats {
  _id: string;
  totalRuns: number;
  statuses: Array<{
    status: CronJobStatus;
    count: number;
    avgDuration: number;
    maxDuration: number;
    minDuration: number;
  }>;
}

export interface RegisteredJob {
  name: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// Backend response interfaces (actual format from API)
interface BackendLogsResponse {
  logs: ApiLog[];
  total: number;
  page: number;
  totalPages: number;
}

export interface QueryLogsParams {
  page?: number;
  limit?: number;
  method?: string;
  path?: string;
  module?: ApiModule;
  statusCode?: number;
  statusCodeGte?: number;  // For status code range filtering (e.g., >= 400)
  statusCodeLte?: number;  // For status code range filtering (e.g., < 500)
  level?: LogLevel;
  userId?: string;
  ip?: string;
  tags?: string;
  startDate?: string;
  endDate?: string;
  search?: string;  // Text search across path, ip, userEmail, errorMessage
}

@Injectable({
  providedIn: 'root'
})
export class MonitoringService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/admin/monitoring`;

  // ============================================
  // API LOG ENDPOINTS
  // ============================================

  /**
   * Query API logs with filters
   */
  queryLogs(params: QueryLogsParams = {}): Observable<ApiResponse<PaginatedResponse<ApiLog>>> {
    let httpParams = new HttpParams();
    const limit = params.limit || 50;

    if (params.page) httpParams = httpParams.set('page', params.page.toString());
    if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());
    if (params.method) httpParams = httpParams.set('method', params.method);
    if (params.path) httpParams = httpParams.set('path', params.path);
    if (params.module) httpParams = httpParams.set('module', params.module);
    if (params.statusCode) httpParams = httpParams.set('statusCode', params.statusCode.toString());
    if (params.statusCodeGte) httpParams = httpParams.set('statusCodeGte', params.statusCodeGte.toString());
    if (params.statusCodeLte) httpParams = httpParams.set('statusCodeLte', params.statusCodeLte.toString());
    if (params.level) httpParams = httpParams.set('level', params.level);
    if (params.userId) httpParams = httpParams.set('userId', params.userId);
    if (params.ip) httpParams = httpParams.set('ip', params.ip);
    if (params.tags) httpParams = httpParams.set('tags', params.tags);
    if (params.startDate) httpParams = httpParams.set('startDate', params.startDate);
    if (params.endDate) httpParams = httpParams.set('endDate', params.endDate);
    if (params.search) httpParams = httpParams.set('search', params.search);

    return this.http.get<ApiResponse<BackendLogsResponse>>(`${this.apiUrl}/logs`, { params: httpParams }).pipe(
      map(response => ({
        success: response.success,
        data: {
          items: response.data.logs || [],
          pagination: {
            page: response.data.page || 1,
            limit: limit,
            total: response.data.total || 0,
            totalPages: response.data.totalPages || 0
          }
        },
        message: response.message
      }))
    );
  }

  /**
   * Get API log statistics
   */
  getLogStats(startDate?: string, endDate?: string): Observable<ApiResponse<ApiStats>> {
    let httpParams = new HttpParams();
    if (startDate) httpParams = httpParams.set('startDate', startDate);
    if (endDate) httpParams = httpParams.set('endDate', endDate);

    return this.http.get<ApiResponse<ApiStats>>(`${this.apiUrl}/logs/stats`, { params: httpParams });
  }

  /**
   * Get error logs
   */
  getErrorLogs(page = 1, limit = 50): Observable<ApiResponse<PaginatedResponse<ApiLog>>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    return this.http.get<ApiResponse<PaginatedResponse<ApiLog>>>(`${this.apiUrl}/logs/errors`, { params });
  }

  /**
   * Get suspicious activity
   */
  getSuspiciousActivity(minutes = 15, threshold = 100): Observable<ApiResponse<SuspiciousActivity>> {
    const params = new HttpParams()
      .set('minutes', minutes.toString())
      .set('threshold', threshold.toString());

    return this.http.get<ApiResponse<SuspiciousActivity>>(`${this.apiUrl}/logs/suspicious`, { params });
  }

  // ============================================
  // RATE LIMIT CONFIG ENDPOINTS
  // ============================================

  /**
   * Get rate limit configuration
   */
  getRateLimitConfig(): Observable<ApiResponse<RateLimitConfig>> {
    return this.http.get<ApiResponse<RateLimitConfig>>(`${this.apiUrl}/config/rate-limits`);
  }

  /**
   * Update rate limit configuration
   */
  updateRateLimitConfig(config: RateLimitConfig): Observable<ApiResponse<RateLimitConfig>> {
    return this.http.put<ApiResponse<RateLimitConfig>>(`${this.apiUrl}/config/rate-limits`, config);
  }

  // ============================================
  // CRON JOB ENDPOINTS
  // ============================================

  private readonly cronJobUrl = `${environment.apiUrl}/admin/cron-jobs`;

  /**
   * Get cron job runs with filters
   */
  getCronJobRuns(params: {
    jobName?: string;
    status?: CronJobStatus;
    category?: CronJobCategory;
    limit?: number;
    offset?: number;
  } = {}): Observable<ApiResponse<{ runs: CronJobRun[]; total: number }>> {
    let httpParams = new HttpParams();
    if (params.jobName) httpParams = httpParams.set('jobName', params.jobName);
    if (params.status) httpParams = httpParams.set('status', params.status);
    if (params.category) httpParams = httpParams.set('category', params.category);
    if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());
    if (params.offset) httpParams = httpParams.set('offset', params.offset.toString());

    return this.http.get<ApiResponse<{ runs: CronJobRun[]; total: number }>>(`${this.cronJobUrl}/runs`, { params: httpParams });
  }

  /**
   * Get cron job statistics
   */
  getCronJobStats(jobName?: string, hours = 24): Observable<ApiResponse<CronJobStats[]>> {
    let httpParams = new HttpParams().set('hours', hours.toString());
    if (jobName) httpParams = httpParams.set('jobName', jobName);

    return this.http.get<ApiResponse<CronJobStats[]>>(`${this.cronJobUrl}/statistics`, { params: httpParams });
  }

  /**
   * Get most recent run for each job
   */
  getRecentJobRuns(): Observable<ApiResponse<CronJobRun[]>> {
    return this.http.get<ApiResponse<CronJobRun[]>>(`${this.cronJobUrl}/recent`);
  }

  /**
   * Get stuck jobs (running for 30+ minutes)
   */
  getStuckJobs(): Observable<ApiResponse<{ data: CronJobRun[]; count: number }>> {
    return this.http.get<ApiResponse<{ data: CronJobRun[]; count: number }>>(`${this.cronJobUrl}/stuck`);
  }

  /**
   * Get list of registered jobs
   */
  getRegisteredJobs(): Observable<ApiResponse<RegisteredJob[]>> {
    return this.http.get<ApiResponse<RegisteredJob[]>>(`${this.cronJobUrl}/registered`);
  }

  /**
   * Trigger a job manually
   */
  triggerJob(jobName: string): Observable<ApiResponse<{ message: string }>> {
    return this.http.post<ApiResponse<{ message: string }>>(`${this.cronJobUrl}/trigger`, { jobName });
  }

  /**
   * Get a specific job run by ID
   */
  getJobRunById(id: string): Observable<ApiResponse<CronJobRun>> {
    return this.http.get<ApiResponse<CronJobRun>>(`${this.cronJobUrl}/run/${id}`);
  }

  /**
   * Reset all stuck jobs (mark as failed)
   */
  resetStuckJobs(): Observable<ApiResponse<{ markedAsFailed: number }>> {
    return this.http.post<ApiResponse<{ markedAsFailed: number }>>(`${this.cronJobUrl}/reset-stuck`, {});
  }

  /**
   * Reset a specific stuck job by ID
   */
  resetStuckJob(id: string): Observable<ApiResponse<{ message: string }>> {
    return this.http.post<ApiResponse<{ message: string }>>(`${this.cronJobUrl}/reset/${id}`, {});
  }
}

/**
 * Rate Limit Configuration Interface
 */
export interface RateLimitConfig {
  skipPaths: string[];
  skipSuperAdmin: boolean;
  unauthenticated: {
    perMinute: number;
    perDay: number;
  };
  authenticated: {
    perMinute: number;
    perDay: number;
  };
}
