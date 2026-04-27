import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';

// ============================================================================
// Types
// ============================================================================

export interface LearnerAccountData {
  accountType: string;
  displayName: string;
  username: string | null;
  email: string;
  phoneNumber: string | null;
  birthDate: string | null;
  language: string | null;
  currency: string;
  timeZone: string;
  emailVerified: boolean;
  profilePhoto: string | null;
}

export interface UpdateAccountInput {
  displayName?: string;
  username?: string;
  birthDate?: string;
  language?: string;
  currency?: string;
  timeZone?: string;
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
// Cache Configuration
// ============================================================================

const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

// ============================================================================
// Learner Account Service
// ============================================================================

@Injectable({ providedIn: 'root' })
export class LearnerAccountService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/me/account`;

  // Cache
  private cachedData: LearnerAccountData | null = null;
  private cacheTimestamp = 0;

  // ============================================================================
  // State Signals
  // ============================================================================

  private readonly _data = signal<LearnerAccountData | null>(null);
  private readonly _loading = signal(false);
  private readonly _saving = signal(false);
  private readonly _error = signal<string | null>(null);

  // ============================================================================
  // Public Readonly Signals
  // ============================================================================

  readonly data = this._data.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly saving = this._saving.asReadonly();
  readonly error = this._error.asReadonly();

  // ============================================================================
  // Computed Signals
  // ============================================================================

  readonly accountType = computed(() => this._data()?.accountType ?? 'User');
  readonly displayName = computed(() => this._data()?.displayName ?? '');
  readonly username = computed(() => this._data()?.username ?? '');
  readonly email = computed(() => this._data()?.email ?? '');
  readonly phoneNumber = computed(() => this._data()?.phoneNumber ?? '');
  readonly birthDate = computed(() => this._data()?.birthDate ?? '');
  readonly language = computed(() => this._data()?.language ?? '');
  readonly currency = computed(() => this._data()?.currency ?? 'MYR');
  readonly timeZone = computed(() => this._data()?.timeZone ?? '');
  readonly emailVerified = computed(() => this._data()?.emailVerified ?? false);
  readonly profilePhoto = computed(() => this._data()?.profilePhoto ?? '');
  readonly hasData = computed(() => this._data() !== null);

  // ============================================================================
  // Public Methods
  // ============================================================================

  /**
   * Load account data with caching
   * @param forceRefresh - If true, bypasses cache and fetches fresh data
   */
  async loadAccount(forceRefresh = false): Promise<void> {
    // Return cached data if valid and not forcing refresh
    if (!forceRefresh && this.isCacheValid()) {
      this._data.set(this.cachedData);
      return;
    }

    if (this._loading()) {
      return;
    }

    this._loading.set(true);
    this._error.set(null);

    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<LearnerAccountData>>(this.apiUrl, {
          withCredentials: true,
        })
      );

      if (response.success && response.data) {
        this._data.set(response.data);
        this.updateCache(response.data);
      } else {
        this._error.set(response.error?.message ?? 'Failed to load account data');
      }
    } catch (error) {
      console.error('Failed to fetch account:', error);
      this._error.set('Failed to load account data');
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Update account data
   * @param data - Partial account data to update
   */
  async updateAccount(data: UpdateAccountInput): Promise<boolean> {
    if (this._saving()) {
      return false;
    }

    this._saving.set(true);
    this._error.set(null);

    try {
      const response = await firstValueFrom(
        this.http.put<ApiResponse<LearnerAccountData>>(this.apiUrl, data, {
          withCredentials: true,
        })
      );

      if (response.success && response.data) {
        this._data.set(response.data);
        this.updateCache(response.data);
        return true;
      } else {
        this._error.set(response.error?.message ?? 'Failed to update account');
        return false;
      }
    } catch (error) {
      console.error('Failed to update account:', error);
      this._error.set('Failed to update account');
      return false;
    } finally {
      this._saving.set(false);
    }
  }

  /**
   * Refresh account data (bypasses cache)
   */
  async refresh(): Promise<void> {
    await this.loadAccount(true);
  }

  /**
   * Clear cached data
   */
  clearCache(): void {
    this.cachedData = null;
    this.cacheTimestamp = 0;
    this._data.set(null);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private isCacheValid(): boolean {
    if (!this.cachedData) {
      return false;
    }
    return Date.now() - this.cacheTimestamp < CACHE_DURATION_MS;
  }

  private updateCache(data: LearnerAccountData): void {
    this.cachedData = data;
    this.cacheTimestamp = Date.now();
  }
}
