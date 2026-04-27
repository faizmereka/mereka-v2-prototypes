import { Injectable, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { TransferState, makeStateKey } from '@angular/core';
import { Observable, firstValueFrom, catchError, of, tap, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type {
  JobDetail,
  JobListItem,
  JobInfoItem,
  ApiResponse,
  PaginatedResponse,
} from '../models/job.model';

export interface JobFilters {
  page?: number;
  limit?: number;
  category?: string;
  serviceType?: string;
  employmentType?: string;
  expertLevel?: string;
  jobLocation?: string;
  search?: string;
}

export interface ClientReview {
  _id: string;
  rating: number;
  content: string;
  createdAt: string;
  reviewer?: {
    _id: string;
    name: string;
    profileImage?: string;
  };
}

// TransferState key factory for job data (uses ID as unique key)
const makeJobKey = (id: string) => makeStateKey<JobDetail>(`job-${id}`);

@Injectable({ providedIn: 'root' })
export class JobService {
  private readonly http = inject(HttpClient);
  private readonly transferState = inject(TransferState);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly apiUrl = `${environment.apiUrl}/jobs`;

  // Signals for reactive state
  private readonly _job = signal<JobDetail | null>(null);
  private readonly _similarJobs = signal<JobListItem[]>([]);
  private readonly _similarLoading = signal(false);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  // Client reviews state
  private readonly _clientReviews = signal<ClientReview[]>([]);
  private readonly _clientReviewsLoading = signal(false);

  // List state signals
  private readonly _jobs = signal<JobListItem[]>([]);
  private readonly _listLoading = signal(false);
  private readonly _pagination = signal({ page: 1, limit: 20, total: 0, totalPages: 0 });

  // Public readonly signals
  readonly job = this._job.asReadonly();
  readonly similarJobs = this._similarJobs.asReadonly();
  readonly similarLoading = this._similarLoading.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  // Client reviews readonly signals
  readonly clientReviews = this._clientReviews.asReadonly();
  readonly clientReviewsLoading = this._clientReviewsLoading.asReadonly();

  // List readonly signals
  readonly jobs = this._jobs.asReadonly();
  readonly listLoading = this._listLoading.asReadonly();
  readonly pagination = this._pagination.asReadonly();
  readonly hasJobs = computed(() => this._jobs().length > 0);

  // Computed values for template convenience
  readonly hasJob = computed(() => !!this._job());
  readonly hasSimilarJobs = computed(() => this._similarJobs().length > 0);
  readonly hasClient = computed(() => !!this._job()?.client);
  readonly hasClientReviews = computed(() => this._clientReviews().length > 0);

  // Computed: Info items for the info grid
  readonly infoItems = computed(() => this.buildInfoItems(this._job()));

  // Computed: Budget text
  readonly budgetText = computed(() => this.formatBudget(this._job()));

  // Computed: Posted ago text
  readonly postedAgo = computed(() => this.formatPostedDate(this._job()));

  /**
   * Fetch job detail by ID
   * Uses TransferState to transfer server-fetched data to the client,
   * preventing duplicate API calls during hydration.
   */
  getJobById(id: string): Observable<JobDetail | null> {
    const stateKey = makeJobKey(id);

    // If same ID already loaded, return cached as Observable
    const currentJob = this._job();
    if (currentJob?._id === id) {
      return of(currentJob);
    }

    // On browser, check if data was transferred from server
    if (isPlatformBrowser(this.platformId)) {
      const transferredData = this.transferState.get(stateKey, null);
      if (transferredData) {
        // Remove the key so it's not used again on navigation
        this.transferState.remove(stateKey);
        this._job.set(transferredData);
        return of(transferredData);
      }
    }

    // Prevent duplicate calls while loading
    if (this._loading()) {
      return of(null);
    }

    this._loading.set(true);
    this._error.set(null);

    return this.http
      .get<ApiResponse<JobDetail>>(`${this.apiUrl}/${id}`, { withCredentials: true })
      .pipe(
        map((response) => {
          if (!response.success || !response.data) {
            this._error.set(response.error?.message || 'Job not found');
            this._job.set(null);
            return null;
          }
          return response.data;
        }),
        tap((data) => {
          if (data) {
            this._job.set(data);

            // On server, store data in TransferState for client
            if (isPlatformServer(this.platformId)) {
              this.transferState.set(stateKey, data);
            }
          }
          this._loading.set(false);
        }),
        catchError((err) => {
          console.error('Error fetching job:', err);
          this._error.set('Failed to load job');
          this._job.set(null);
          this._loading.set(false);
          return of(null);
        })
      );
  }

  /**
   * Fetch job list with filters
   */
  getJobs(filters: JobFilters = {}): Observable<JobListItem[]> {
    this._listLoading.set(true);

    let params = new HttpParams();
    if (filters.page) params = params.set('page', filters.page.toString());
    if (filters.limit) params = params.set('limit', filters.limit.toString());
    if (filters.category) params = params.set('category', filters.category);
    if (filters.serviceType) params = params.set('serviceType', filters.serviceType);
    if (filters.employmentType) params = params.set('employmentType', filters.employmentType);
    if (filters.expertLevel) params = params.set('expertLevel', filters.expertLevel);
    if (filters.jobLocation) params = params.set('jobLocation', filters.jobLocation);
    if (filters.search) params = params.set('search', filters.search);

    return this.http
      .get<PaginatedResponse<JobListItem>>(this.apiUrl, { params })
      .pipe(
        tap((response) => {
          if (response.success && response.data) {
            this._jobs.set(response.data);
            if (response.meta) {
              this._pagination.set({
                page: response.meta.page,
                limit: response.meta.limit,
                total: response.meta.total,
                totalPages: response.meta.totalPages,
              });
            }
          }
          this._listLoading.set(false);
        }),
        map((response) => response.data || []),
        catchError((err) => {
          console.error('Error fetching jobs:', err);
          this._listLoading.set(false);
          return of([]);
        })
      );
  }

  /**
   * Fetch similar jobs (lazy load on client)
   */
  async getSimilarJobs(id: string, limit: number = 6): Promise<JobListItem[]> {
    this._similarLoading.set(true);
    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<JobListItem[]>>(`${this.apiUrl}/${id}/similar`, {
          params: { limit: limit.toString() },
        })
      );
      if (response.success && response.data) {
        this._similarJobs.set(response.data);
        return response.data;
      }
      return [];
    } catch (err) {
      console.error('Error fetching similar jobs:', err);
      return [];
    } finally {
      this._similarLoading.set(false);
    }
  }

  /**
   * Fetch client reviews (reviews from experts about this client)
   */
  async getClientReviews(clientId: string, limit: number = 5): Promise<ClientReview[]> {
    this._clientReviewsLoading.set(true);
    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<ClientReview[]>>(
          `${environment.apiUrl}/hubs/${clientId}/reviews`,
          { params: { limit: limit.toString(), type: 'received' } }
        )
      );
      if (response.success && response.data) {
        this._clientReviews.set(response.data);
        return response.data;
      }
      return [];
    } catch (err) {
      console.error('Error fetching client reviews:', err);
      return [];
    } finally {
      this._clientReviewsLoading.set(false);
    }
  }

  /**
   * Build info items for the job detail page grid
   */
  private buildInfoItems(job: JobDetail | null): JobInfoItem[] {
    if (!job) return [];
    const items: JobInfoItem[] = [];

    if (job.expertLevel) {
      items.push({
        icon: 'military_tech',
        label: 'Experience Level',
        value: this.capitalize(job.expertLevel),
      });
    }
    if (job.jobLocation) {
      const locationValue =
        job.jobLocation === 'onSite'
          ? job.preferredLocation?.join(', ') || 'On-site'
          : this.capitalize(job.jobLocation);
      items.push({ icon: 'place', label: 'Location', value: locationValue });
    }
    if (job.jobEndDate) {
      items.push({ icon: 'event', label: 'Timeline', value: this.formatTimeline(job.jobEndDate) });
    }
    if (job.jobStartDate) {
      items.push({ icon: 'schedule', label: 'Starts', value: this.formatStartDate(job.jobStartDate) });
    }
    if (job.jobBudget) {
      items.push({ icon: 'attach_money', label: 'Budget', value: this.formatBudget(job) });
    }

    return items;
  }

  private formatBudget(job: JobDetail | null): string {
    if (!job?.jobBudget) return '';
    const { fromAmount, upToAmount, pricingType } = job.jobBudget;
    const currency = job.jobCurrency || 'MYR';
    const unit = pricingType === 'hourly' ? '/hr' : '';
    let range = `${currency} ${fromAmount.toLocaleString()}${unit}`;
    if (upToAmount) {
      range += ` - ${currency} ${upToAmount.toLocaleString()}${unit}`;
    }
    return range;
  }

  private formatTimeline(jobEndDate: string): string {
    switch (jobEndDate) {
      case '>6':
        return 'More than 6 Months';
      case 'onGoing':
        return 'Ongoing or Flexible';
      case '1-6':
        return '1 to 6 Months';
      case '<1':
        return 'Less than 1 Month';
      default:
        return jobEndDate;
    }
  }

  private formatStartDate(startDate: string): string {
    if (startDate === 'asap') return 'ASAP';
    if (startDate === 'flexible') return 'Flexible';
    try {
      const date = new Date(startDate);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return startDate;
    }
  }

  private formatPostedDate(job: JobDetail | null): string {
    if (!job?.createdDate && !job?.createdAt) return '';
    const date = new Date(job.createdDate || job.createdAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Posted today';
    if (diffDays === 1) return 'Posted yesterday';
    if (diffDays < 7) return `Posted ${diffDays} days ago`;
    if (diffDays < 30) return `Posted ${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `Posted ${Math.floor(diffDays / 30)} months ago`;
    return `Posted ${Math.floor(diffDays / 365)} years ago`;
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).replace(/-/g, ' ');
  }

  /**
   * Clear current job state
   */
  clearJob(): void {
    this._job.set(null);
    this._similarJobs.set([]);
    this._error.set(null);
    this._loading.set(false);
  }
}
