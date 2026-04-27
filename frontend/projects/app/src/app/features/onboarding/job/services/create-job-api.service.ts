import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import type { Job, CreateJobPayload, ServiceCategory } from '../models';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
  };
}

interface PaginatedResponse<T> {
  success: boolean;
  data: {
    items: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

/** Backend API payload format */
interface BackendJobPayload {
  jobTitle: string;
  jobDescription: string;
  jobSummary?: string;
  employmentType: string;
  status: string;
  serviceCategory: {
    category: string;
    serviceType: string;
  };
  expertLevel?: string;
  jobLocation?: string;
  jobBudget: {
    pricingType: string;
    fromAmount: number;
    upToAmount?: number;
  };
  jobCurrency: string;
  jobStartDate?: string;
  startDateType?: string;
  duration?: string;
  jobSkills: string[];
  jobUploads?: { id?: string; url: string; name: string; size?: number; type?: string }[];
  accessMode?: string;
  name: string;
  email: string;
  phoneNumber?: string;
  organizationName?: string;
  aboutOrganization?: string;
  organizationImage?: string;
  hubId: string;
}

@Injectable({ providedIn: 'root' })
export class CreateJobApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /**
   * Transform frontend payload to backend format
   */
  private transformToBackendPayload(payload: CreateJobPayload): BackendJobPayload {
    return {
      jobTitle: payload.title,
      jobDescription: payload.description,
      jobSummary: payload.summary || undefined,
      employmentType: payload.employmentType,
      status: payload.status === 'draft' ? 'DRAFT' : 'ACTIVE',
      serviceCategory: {
        category: payload.categoryId,
        serviceType: payload.serviceTypeId,
      },
      expertLevel: payload.expertLevelId || undefined,
      jobLocation: payload.location || undefined,
      jobBudget: {
        pricingType: payload.pricingType,
        fromAmount: payload.budgetFrom,
        upToAmount: payload.budgetTo || undefined,
      },
      jobCurrency: payload.currency,
      jobStartDate: payload.startDate || undefined,
      startDateType: payload.startDateType || undefined,
      duration: payload.duration || undefined,
      jobSkills: payload.skills || [],
      jobUploads: payload.attachments?.map(a => ({
        id: a.id,
        url: a.url,
        name: a.name,
        size: a.size,
        type: a.type,
      })) || [],
      accessMode: payload.accessMode?.toUpperCase() || 'PUBLIC',
      name: payload.contactName,
      email: payload.contactEmail,
      phoneNumber: payload.contactPhone || undefined,
      organizationName: payload.organizationName || undefined,
      aboutOrganization: payload.aboutOrganization || undefined,
      organizationImage: payload.organizationLogo || undefined,
      hubId: payload.hubId,
    };
  }

  /**
   * Create a new job
   */
  async create(payload: CreateJobPayload): Promise<Job | null> {
    try {
      const backendPayload = this.transformToBackendPayload(payload);
      const response = await firstValueFrom(
        this.http.post<ApiResponse<Job>>(`${this.apiUrl}/hub/jobs`, backendPayload)
      );
      return response.success ? response.data : null;
    } catch (error) {
      console.error('Error creating job:', error);
      return null;
    }
  }

  /**
   * Update an existing job
   */
  async update(id: string, payload: Partial<CreateJobPayload>): Promise<Job | null> {
    try {
      const backendPayload = this.transformToBackendPayload(payload as CreateJobPayload);
      const response = await firstValueFrom(
        this.http.patch<ApiResponse<Job>>(`${this.apiUrl}/hub/jobs/${id}`, backendPayload)
      );
      return response.success ? response.data : null;
    } catch (error) {
      console.error('Error updating job:', error);
      return null;
    }
  }

  /**
   * Get job by ID
   */
  async getById(id: string): Promise<Job | null> {
    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<Job>>(`${this.apiUrl}/hub/jobs/${id}`)
      );
      return response.success ? response.data : null;
    } catch (error) {
      console.error('Error fetching job:', error);
      return null;
    }
  }

  /**
   * Get categories list
   */
  async getCategories(): Promise<ServiceCategory[]> {
    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<ServiceCategory[]>>(`${this.apiUrl}/job-categories`)
      );
      return response.success ? response.data : [];
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  }

  /**
   * Get skills suggestions
   */
  async getSkillsSuggestions(query: string): Promise<string[]> {
    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<{ name: string }[]>>(`${this.apiUrl}/skills`, {
          params: { q: query },
        })
      );
      // Extract skill names from response
      return response.success ? response.data.map(s => s.name) : [];
    } catch (error) {
      console.error('Error fetching skills:', error);
      return [];
    }
  }

  /**
   * Generate AI summary from description
   */
  async generateAiSummary(description: string): Promise<string | null> {
    try {
      const response = await firstValueFrom(
        this.http.post<ApiResponse<{ summary: string }>>(`${this.apiUrl}/hub/jobs/generate-summary`, {
          description,
        })
      );
      return response.success ? response.data.summary : null;
    } catch (error) {
      console.error('Error generating AI summary:', error);
      return null;
    }
  }
}
