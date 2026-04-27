import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export type UserStatus = 'active' | 'inactive' | 'suspended';
export type PlatformUserType = 'all' | 'learner' | 'hub_owner' | 'expert' | 'admin' | 'member';

export interface PlatformUser {
  _id: string;
  name: string;
  email: string;
  profilePhoto?: string;
  status: UserStatus;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt?: string;
  userTypes: string[];
  hubCount: number;
  hubDisplay: string; // "Hub Name" or "Hub Name (+2)"
  primaryRole: string;
}

export interface PlatformUserStats {
  total: number;
  active: number;
  inactive: number;
  suspended: number;
  byType: {
    learners: number;
    hubOwners: number;
    experts: number;
    admins: number;
    members: number;
  };
  newThisMonth: number;
  newThisWeek: number;
}

export interface ExpertiseItem {
  _id: string;
  expertiseTitle: string;
  slug: string;
  status: string;
  coverPhoto: string;
  currency: string;
  createdAt: string;
  hubId?: {
    _id: string;
    name: string;
    slug: string;
  };
}

export interface OwnedHub {
  _id: string;
  name: string;
  slug: string;
  logo?: string;
  status: string;
  location?: {
    city?: string;
    country?: string;
  };
  createdAt: string;
}

export interface RecentBooking {
  _id: string;
  serviceType: string;
  status: string;
  totalCost: number;
  currency: string;
  bookingStartDate: string;
  bookingEndDate: string;
  createdAt: string;
  hubId?: {
    _id: string;
    name: string;
    slug: string;
  };
  serviceId?: {
    _id: string;
    expertiseTitle?: string;
    name?: string;
    slug?: string;
  };
}

export interface PortfolioItem {
  title: string;
  description?: string;
  images?: string[];
  skills?: Array<{ _id: string; name: string }>;
  year?: string;
}

export interface LanguageItem {
  languageId: { _id: string; name: string };
  proficiency: string;
}

export interface EducationItem {
  degree: string;
  institution: string;
  year: string;
}

export interface EmploymentItem {
  title: string;
  company: string;
  duration?: string;
  description?: string;
}

export interface PlatformUserDetail {
  user: {
    _id: string;
    name: string;
    email: string;
    birthDate?: string;
    profilePhoto?: string;
    coverPhoto?: string;
    status: UserStatus;
    emailVerified: boolean;
    createdAt: string;
    updatedAt?: string;
    lastLoginAt?: string;
    lastLoginMethod?: string;
    lastLoginIp?: string;
    phoneNumber?: string;
    bio?: string;
    location?: {
      city?: string;
      country?: string;
      lat?: number;
      lng?: number;
    };
    socialLinks?: {
      website?: string;
      facebook?: string;
      instagram?: string;
      twitter?: string;
      linkedin?: string;
    };
    // Auth
    authProviders?: string[];
    firebaseUid?: string;
    // User Profile
    currency?: string;
    timeZone?: string;
    locale?: string;
    isGuestSignup?: boolean;
    // Expert fields
    professionalTitle?: string;
    introVideo?: string;
    skills?: Array<{ _id: string; name: string }>;
    focusAreaId?: { _id: string; name: string };
    languages?: LanguageItem[];
    portfolio?: PortfolioItem[];
    education?: EducationItem[];
    employment?: EmploymentItem[];
    hourlyRate?: number;
    jobPreferences?: Array<{ _id: string; name: string }>;
    // Stripe
    stripeAccountId?: string;
  };
  hubMemberships: Array<{
    _id: string;
    status: string;
    hubId: {
      _id: string;
      name: string;
      slug: string;
      logo?: string;
      status: string;
    };
    roleIds: Array<{
      key: string;
      name: string;
    }>;
  }>;
  roleData: {
    isLearner: boolean;
    isExpert: boolean;
    isHubOwner: boolean;
    expertData?: {
      expertises: ExpertiseItem[];
      totalExpertises: number;
      publishedExpertises: number;
      totalBookings: number;
      totalEarnings: number;
    };
    hubOwnerData?: {
      ownedHubs: OwnedHub[];
      totalHubs: number;
      totalMembers: number;
      totalServices: number;
    };
    learnerData?: {
      recentBookings: RecentBooking[];
      totalBookings: number;
      totalSpent: number;
    };
  };
  stats: {
    totalBookings: number;
    totalSpent: number;
    totalEarnings: number;
  };
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ListPlatformUsersParams {
  page?: number;
  limit?: number;
  status?: UserStatus;
  userType?: PlatformUserType;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

@Injectable({
  providedIn: 'root',
})
export class PlatformUsersService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/admin/users`;

  // State signals for caching
  readonly stats = signal<PlatformUserStats | null>(null);
  readonly statsLoading = signal(false);
  readonly statsError = signal<string | null>(null);

  readonly users = signal<PlatformUser[]>([]);
  readonly usersLoading = signal(false);
  readonly usersError = signal<string | null>(null);
  readonly usersMeta = signal<{ total: number; page: number; limit: number; totalPages: number } | null>(null);

  readonly userDetail = signal<PlatformUserDetail | null>(null);
  readonly userDetailLoading = signal(false);
  readonly userDetailError = signal<string | null>(null);

  /**
   * Get platform user statistics
   */
  getStats(): Observable<ApiResponse<PlatformUserStats>> {
    return this.http.get<ApiResponse<PlatformUserStats>>(`${this.apiUrl}/stats`);
  }

  /**
   * Get stats with signal updates
   */
  async getStatsAsync(): Promise<PlatformUserStats> {
    this.statsLoading.set(true);
    this.statsError.set(null);

    return new Promise((resolve, reject) => {
      this.getStats().subscribe({
        next: (response) => {
          if (response.success) {
            this.stats.set(response.data);
            this.statsLoading.set(false);
            resolve(response.data);
          } else {
            const error = 'Failed to load stats';
            this.statsError.set(error);
            this.statsLoading.set(false);
            reject(new Error(error));
          }
        },
        error: (err) => {
          const error = err.error?.error?.message || 'Failed to load stats';
          this.statsError.set(error);
          this.statsLoading.set(false);
          reject(err);
        },
      });
    });
  }

  /**
   * List platform users with filtering and pagination
   */
  listUsers(params?: ListPlatformUsersParams): Observable<ApiResponse<PlatformUser[]>> {
    const queryParams: Record<string, string> = {};

    if (params?.page) queryParams['page'] = params.page.toString();
    if (params?.limit) queryParams['limit'] = params.limit.toString();
    if (params?.status) queryParams['status'] = params.status;
    if (params?.userType && params.userType !== 'all') queryParams['userType'] = params.userType;
    if (params?.search) queryParams['search'] = params.search;
    if (params?.sortBy) queryParams['sortBy'] = params.sortBy;
    if (params?.sortOrder) queryParams['sortOrder'] = params.sortOrder;

    return this.http.get<ApiResponse<PlatformUser[]>>(this.apiUrl, { params: queryParams });
  }

  /**
   * List users with signal updates
   */
  async listUsersAsync(params?: ListPlatformUsersParams): Promise<PlatformUser[]> {
    this.usersLoading.set(true);
    this.usersError.set(null);

    return new Promise((resolve, reject) => {
      this.listUsers(params).subscribe({
        next: (response) => {
          if (response.success) {
            this.users.set(response.data);
            if (response.meta) {
              this.usersMeta.set(response.meta);
            }
            this.usersLoading.set(false);
            resolve(response.data);
          } else {
            const error = 'Failed to load users';
            this.usersError.set(error);
            this.usersLoading.set(false);
            reject(new Error(error));
          }
        },
        error: (err) => {
          const error = err.error?.error?.message || 'Failed to load users';
          this.usersError.set(error);
          this.usersLoading.set(false);
          reject(err);
        },
      });
    });
  }

  /**
   * Get platform user by ID
   */
  getUserById(id: string): Observable<ApiResponse<PlatformUserDetail>> {
    return this.http.get<ApiResponse<PlatformUserDetail>>(`${this.apiUrl}/${id}`);
  }

  /**
   * Get user detail with signal updates
   */
  async getUserByIdAsync(id: string): Promise<PlatformUserDetail> {
    this.userDetailLoading.set(true);
    this.userDetailError.set(null);

    return new Promise((resolve, reject) => {
      this.getUserById(id).subscribe({
        next: (response) => {
          if (response.success) {
            this.userDetail.set(response.data);
            this.userDetailLoading.set(false);
            resolve(response.data);
          } else {
            const error = 'Failed to load user details';
            this.userDetailError.set(error);
            this.userDetailLoading.set(false);
            reject(new Error(error));
          }
        },
        error: (err) => {
          const error = err.error?.error?.message || 'Failed to load user details';
          this.userDetailError.set(error);
          this.userDetailLoading.set(false);
          reject(err);
        },
      });
    });
  }

  /**
   * Clear user detail state
   */
  clearUserDetail(): void {
    this.userDetail.set(null);
    this.userDetailError.set(null);
  }
}
