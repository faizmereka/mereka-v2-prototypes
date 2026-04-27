import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';

// ============================================================================
// Types
// ============================================================================

export interface FocusArea {
  _id: string;
  name: string;
  icon?: string;
  description?: string;
  isActive: boolean;
  priority: number;
}

export interface CompanyType {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  priority: number;
}

export interface ExperienceType {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  priority: number;
}

export interface JobPreference {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  priority: number;
}

// Experience-specific reference data types
export interface ExperienceTheme {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  count?: number;
  isActive: boolean;
}

export interface ExperienceTopicItem {
  _id: string;
  name: string;
  slug: string;
  theme: string;
  isActive: boolean;
}

export interface TargetAudience {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

export interface Language {
  _id: string;
  name: string;
  code?: string;
  isActive: boolean;
}

export interface Skill {
  _id: string;
  name: string;
  category?: string;
  isActive: boolean;
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
// Reference Data Service - Service Level Caching
// ============================================================================

@Injectable({
  providedIn: 'root',
})
export class ReferenceDataService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  // ============================================================================
  // State Signals
  // ============================================================================

  // Hub onboarding reference data
  private readonly _focusAreas = signal<FocusArea[]>([]);
  private readonly _companyTypes = signal<CompanyType[]>([]);
  private readonly _experienceTypes = signal<ExperienceType[]>([]);
  private readonly _jobPreferences = signal<JobPreference[]>([]);

  // Experience onboarding reference data
  private readonly _experienceThemes = signal<ExperienceTheme[]>([]);
  private readonly _experienceTopics = signal<ExperienceTopicItem[]>([]);
  private readonly _targetAudiences = signal<TargetAudience[]>([]);
  private readonly _languages = signal<Language[]>([]);
  private readonly _skills = signal<Skill[]>([]);

  private readonly _isLoading = signal(false);

  // ============================================================================
  // Public Readonly Signals
  // ============================================================================

  readonly focusAreas = this._focusAreas.asReadonly();
  readonly companyTypes = this._companyTypes.asReadonly();
  readonly experienceTypes = this._experienceTypes.asReadonly();
  readonly jobPreferences = this._jobPreferences.asReadonly();

  readonly experienceThemes = this._experienceThemes.asReadonly();
  readonly experienceTopics = this._experienceTopics.asReadonly();
  readonly targetAudiences = this._targetAudiences.asReadonly();
  readonly languages = this._languages.asReadonly();
  readonly skills = this._skills.asReadonly();

  readonly isLoading = this._isLoading.asReadonly();

  // ============================================================================
  // In-flight request promises (prevents duplicate API calls)
  // ============================================================================

  private focusAreasPromise: Promise<FocusArea[]> | null = null;
  private companyTypesPromise: Promise<CompanyType[]> | null = null;
  private experienceTypesPromise: Promise<ExperienceType[]> | null = null;
  private jobPreferencesPromise: Promise<JobPreference[]> | null = null;

  private experienceThemesPromise: Promise<ExperienceTheme[]> | null = null;
  private experienceTopicsPromise: Promise<ExperienceTopicItem[]> | null = null;
  private targetAudiencesPromise: Promise<TargetAudience[]> | null = null;
  private languagesPromise: Promise<Language[]> | null = null;
  private skillsPromise: Promise<Skill[]> | null = null;

  // ============================================================================
  // API Methods
  // ============================================================================

  /**
   * Load all reference data needed for hub onboarding
   */
  async loadAll(): Promise<void> {
    this._isLoading.set(true);
    try {
      await Promise.all([
        this.loadFocusAreas(),
        this.loadCompanyTypes(),
        this.loadExperienceTypes(),
        this.loadJobPreferences(),
      ]);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Load focus areas - uses service-level caching
   */
  async loadFocusAreas(): Promise<FocusArea[]> {
    // Return cached data if available
    if (this._focusAreas().length > 0) {
      return this._focusAreas();
    }

    // Return in-flight request if one exists
    if (this.focusAreasPromise) {
      return this.focusAreasPromise;
    }

    // Create new request
    this.focusAreasPromise = this.fetchFocusAreas();
    const result = await this.focusAreasPromise;
    this.focusAreasPromise = null;
    return result;
  }

  private async fetchFocusAreas(): Promise<FocusArea[]> {
    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<FocusArea[]>>(`${this.apiUrl}/focus-areas`, {
          withCredentials: true,
        })
      );

      if (response.success && response.data) {
        const sorted = response.data.sort((a, b) => a.priority - b.priority);
        this._focusAreas.set(sorted);
        return sorted;
      }

      return [];
    } catch (error) {
      console.error('Error loading focus areas:', error);
      return [];
    }
  }

  /**
   * Load company types - uses service-level caching
   */
  async loadCompanyTypes(): Promise<CompanyType[]> {
    // Return cached data if available
    if (this._companyTypes().length > 0) {
      return this._companyTypes();
    }

    // Return in-flight request if one exists
    if (this.companyTypesPromise) {
      return this.companyTypesPromise;
    }

    // Create new request
    this.companyTypesPromise = this.fetchCompanyTypes();
    const result = await this.companyTypesPromise;
    this.companyTypesPromise = null;
    return result;
  }

  private async fetchCompanyTypes(): Promise<CompanyType[]> {
    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<CompanyType[]>>(`${this.apiUrl}/company-types`, {
          withCredentials: true,
        })
      );

      if (response.success && response.data) {
        const sorted = response.data.sort((a, b) => a.priority - b.priority);
        this._companyTypes.set(sorted);
        return sorted;
      }

      return [];
    } catch (error) {
      console.error('Error loading company types:', error);
      return [];
    }
  }

  /**
   * Load experience types - uses service-level caching
   */
  async loadExperienceTypes(): Promise<ExperienceType[]> {
    // Return cached data if available
    if (this._experienceTypes().length > 0) {
      return this._experienceTypes();
    }

    // Return in-flight request if one exists
    if (this.experienceTypesPromise) {
      return this.experienceTypesPromise;
    }

    // Create new request
    this.experienceTypesPromise = this.fetchExperienceTypes();
    const result = await this.experienceTypesPromise;
    this.experienceTypesPromise = null;
    return result;
  }

  private async fetchExperienceTypes(): Promise<ExperienceType[]> {
    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<ExperienceType[]>>(`${this.apiUrl}/experience-types`, {
          withCredentials: true,
        })
      );

      if (response.success && response.data) {
        const sorted = response.data.sort((a, b) => a.priority - b.priority);
        this._experienceTypes.set(sorted);
        return sorted;
      }

      return [];
    } catch (error) {
      console.error('Error loading experience types:', error);
      return [];
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  getFocusAreaById(id: string): FocusArea | undefined {
    return this._focusAreas().find((fa) => fa._id === id);
  }

  getFocusAreaName(id: string): string {
    return this.getFocusAreaById(id)?.name || '';
  }

  getCompanyTypeById(id: string): CompanyType | undefined {
    return this._companyTypes().find((ct) => ct._id === id);
  }

  getCompanyTypeName(id: string): string {
    return this.getCompanyTypeById(id)?.name || '';
  }

  getExperienceTypeById(id: string): ExperienceType | undefined {
    return this._experienceTypes().find((et) => et._id === id);
  }

  getExperienceTypeName(id: string): string {
    return this.getExperienceTypeById(id)?.name || '';
  }

  getExperienceTypeNames(ids: string[]): string[] {
    return ids.map((id) => this.getExperienceTypeName(id)).filter(Boolean);
  }

  /**
   * Load job preferences - uses service-level caching
   */
  async loadJobPreferences(): Promise<JobPreference[]> {
    // Return cached data if available
    if (this._jobPreferences().length > 0) {
      return this._jobPreferences();
    }

    // Return in-flight request if one exists
    if (this.jobPreferencesPromise) {
      return this.jobPreferencesPromise;
    }

    // Create new request
    this.jobPreferencesPromise = this.fetchJobPreferences();
    const result = await this.jobPreferencesPromise;
    this.jobPreferencesPromise = null;
    return result;
  }

  private async fetchJobPreferences(): Promise<JobPreference[]> {
    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<JobPreference[]>>(`${this.apiUrl}/job-preferences`, {
          withCredentials: true,
        })
      );

      if (response.success && response.data) {
        const sorted = response.data.sort((a, b) => a.priority - b.priority);
        this._jobPreferences.set(sorted);
        return sorted;
      }

      return [];
    } catch (error) {
      console.error('Error loading job preferences:', error);
      return [];
    }
  }

  getJobPreferenceById(id: string): JobPreference | undefined {
    return this._jobPreferences().find((jp) => jp._id === id);
  }

  getJobPreferenceName(id: string): string {
    return this.getJobPreferenceById(id)?.name || '';
  }

  getJobPreferenceNames(ids: string[]): string[] {
    return ids.map((id) => this.getJobPreferenceName(id)).filter(Boolean);
  }

  // ============================================================================
  // Experience Reference Data Methods
  // ============================================================================

  /**
   * Load all reference data needed for experience onboarding
   */
  async loadExperienceReferenceData(): Promise<void> {
    this._isLoading.set(true);
    try {
      await Promise.all([
        this.loadExperienceTypes(),  // Categories: Event, Talk, Workshop, etc.
        this.loadExperienceThemes(),
        this.loadExperienceTopics(),
        this.loadTargetAudiences(),
        this.loadLanguages(),
        this.loadSkills(),
      ]);
    } finally {
      this._isLoading.set(false);
    }
  }

  async loadExperienceThemes(): Promise<ExperienceTheme[]> {
    if (this._experienceThemes().length > 0) return this._experienceThemes();
    if (this.experienceThemesPromise) return this.experienceThemesPromise;

    this.experienceThemesPromise = this.fetchExperienceThemes();
    const result = await this.experienceThemesPromise;
    this.experienceThemesPromise = null;
    return result;
  }

  private async fetchExperienceThemes(): Promise<ExperienceTheme[]> {
    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<ExperienceTheme[]>>(`${this.apiUrl}/experience-themes`, {
          withCredentials: true,
        })
      );
      if (response.success && response.data) {
        this._experienceThemes.set(response.data);
        return response.data;
      }
      return [];
    } catch (error) {
      console.error('Error loading experience themes:', error);
      return [];
    }
  }

  async loadExperienceTopics(): Promise<ExperienceTopicItem[]> {
    if (this._experienceTopics().length > 0) return this._experienceTopics();
    if (this.experienceTopicsPromise) return this.experienceTopicsPromise;

    this.experienceTopicsPromise = this.fetchExperienceTopics();
    const result = await this.experienceTopicsPromise;
    this.experienceTopicsPromise = null;
    return result;
  }

  private async fetchExperienceTopics(): Promise<ExperienceTopicItem[]> {
    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<Array<{ _id: string; name: string; parentCategory: { _id: string } | string; isActive: boolean }>>>(`${this.apiUrl}/experience-topics`, {
          withCredentials: true,
        })
      );
      if (response.success && response.data) {
        // Transform API response to match expected interface
        // API returns parentCategory (object or string), frontend expects theme (string)
        const topics: ExperienceTopicItem[] = response.data.map(item => ({
          _id: item._id,
          name: item.name,
          slug: item.name.toLowerCase().replace(/\s+/g, '-'),
          theme: typeof item.parentCategory === 'object' ? item.parentCategory._id : item.parentCategory,
          isActive: item.isActive,
        }));
        this._experienceTopics.set(topics);
        return topics;
      }
      return [];
    } catch (error) {
      console.error('Error loading experience topics:', error);
      return [];
    }
  }

  async loadTargetAudiences(): Promise<TargetAudience[]> {
    if (this._targetAudiences().length > 0) return this._targetAudiences();
    if (this.targetAudiencesPromise) return this.targetAudiencesPromise;

    this.targetAudiencesPromise = this.fetchTargetAudiences();
    const result = await this.targetAudiencesPromise;
    this.targetAudiencesPromise = null;
    return result;
  }

  private async fetchTargetAudiences(): Promise<TargetAudience[]> {
    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<TargetAudience[]>>(`${this.apiUrl}/target-audiences`, {
          withCredentials: true,
        })
      );
      if (response.success && response.data) {
        this._targetAudiences.set(response.data);
        return response.data;
      }
      return [];
    } catch (error) {
      console.error('Error loading target audiences:', error);
      return [];
    }
  }

  async loadLanguages(): Promise<Language[]> {
    if (this._languages().length > 0) return this._languages();
    if (this.languagesPromise) return this.languagesPromise;

    this.languagesPromise = this.fetchLanguages();
    const result = await this.languagesPromise;
    this.languagesPromise = null;
    return result;
  }

  private async fetchLanguages(): Promise<Language[]> {
    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<Language[]>>(`${this.apiUrl}/languages`, {
          withCredentials: true,
        })
      );
      if (response.success && response.data) {
        this._languages.set(response.data);
        return response.data;
      }
      return [];
    } catch (error) {
      console.error('Error loading languages:', error);
      return [];
    }
  }

  async loadSkills(): Promise<Skill[]> {
    if (this._skills().length > 0) return this._skills();
    if (this.skillsPromise) return this.skillsPromise;

    this.skillsPromise = this.fetchSkills();
    const result = await this.skillsPromise;
    this.skillsPromise = null;
    return result;
  }

  private async fetchSkills(): Promise<Skill[]> {
    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<Skill[]>>(`${this.apiUrl}/skills`, {
          withCredentials: true,
        })
      );
      if (response.success && response.data) {
        this._skills.set(response.data);
        return response.data;
      }
      return [];
    } catch (error) {
      console.error('Error loading skills:', error);
      return [];
    }
  }

  // Helper methods for experience reference data
  getExperienceThemeById(id: string): ExperienceTheme | undefined {
    return this._experienceThemes().find((t) => t._id === id);
  }

  getExperienceThemeName(id: string): string {
    return this.getExperienceThemeById(id)?.name || '';
  }

  getTopicsByTheme(themeId: string): ExperienceTopicItem[] {
    return this._experienceTopics().filter((t) => t.theme === themeId);
  }

  getTargetAudienceById(id: string): TargetAudience | undefined {
    return this._targetAudiences().find((a) => a._id === id);
  }

  getTargetAudienceName(id: string): string {
    return this.getTargetAudienceById(id)?.name || '';
  }

  getLanguageById(id: string): Language | undefined {
    return this._languages().find((l) => l._id === id);
  }

  getLanguageName(id: string): string {
    return this.getLanguageById(id)?.name || '';
  }

  getSkillById(id: string): Skill | undefined {
    return this._skills().find((s) => s._id === id);
  }

  getSkillName(id: string): string {
    return this.getSkillById(id)?.name || '';
  }
}
