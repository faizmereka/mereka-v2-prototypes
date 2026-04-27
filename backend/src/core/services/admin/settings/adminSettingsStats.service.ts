import { Amenity } from '@core/models/Amenity';
import { CompanyType } from '@core/models/CompanyType';
import { ExperienceTheme } from '@core/models/ExperienceTheme';
import { ExperienceTopic } from '@core/models/ExperienceTopic';
import { ExperienceType } from '@core/models/ExperienceType';
import { Facility } from '@core/models/Facility';
import { FocusArea } from '@core/models/FocusArea';
import { JobPreference } from '@core/models/JobPreference';
import { Language } from '@core/models/Language';
import { Skill } from '@core/models/Skill';
import { SpaceType } from '@core/models/SpaceType';
import { TargetAudience } from '@core/models/TargetAudience';

/**
 * Stats for a single collection
 */
export interface CollectionStats {
  total: number;
  active: number;
  inactive: number;
}

/**
 * All settings stats response
 */
export interface SettingsStatsResponse {
  amenities: CollectionStats;
  facilities: CollectionStats;
  focusAreas: CollectionStats;
  skills: CollectionStats;
  spaceTypes: CollectionStats;
  experienceTypes: CollectionStats;
  experienceTopics: CollectionStats;
  experienceThemes: CollectionStats;
  languages: CollectionStats;
  companyTypes: CollectionStats;
  targetAudiences: CollectionStats;
  jobPreferences: CollectionStats;
  totals: {
    total: number;
    active: number;
    inactive: number;
  };
}

/**
 * Admin Settings Stats Service
 * Provides statistics for all reference data collections
 */
export class AdminSettingsStatsService {
  /**
   * Get stats for a single collection
   */
  private async getCollectionStats(
    // biome-ignore lint/suspicious/noExplicitAny: Mongoose model type
    Model: any,
  ): Promise<CollectionStats> {
    const [total, active] = await Promise.all([
      Model.countDocuments({}),
      Model.countDocuments({ isActive: true }),
    ]);

    return {
      total,
      active,
      inactive: total - active,
    };
  }

  /**
   * Get stats for all reference data collections
   */
  async getAllStats(): Promise<SettingsStatsResponse> {
    const [
      amenities,
      facilities,
      focusAreas,
      skills,
      spaceTypes,
      experienceTypes,
      experienceTopics,
      experienceThemes,
      languages,
      companyTypes,
      targetAudiences,
      jobPreferences,
    ] = await Promise.all([
      this.getCollectionStats(Amenity),
      this.getCollectionStats(Facility),
      this.getCollectionStats(FocusArea),
      this.getCollectionStats(Skill),
      this.getCollectionStats(SpaceType),
      this.getCollectionStats(ExperienceType),
      this.getCollectionStats(ExperienceTopic),
      this.getCollectionStats(ExperienceTheme),
      this.getCollectionStats(Language),
      this.getCollectionStats(CompanyType),
      this.getCollectionStats(TargetAudience),
      this.getCollectionStats(JobPreference),
    ]);

    // Calculate totals
    const allStats = [
      amenities,
      facilities,
      focusAreas,
      skills,
      spaceTypes,
      experienceTypes,
      experienceTopics,
      experienceThemes,
      languages,
      companyTypes,
      targetAudiences,
      jobPreferences,
    ];

    const totals = allStats.reduce(
      (acc, stats) => ({
        total: acc.total + stats.total,
        active: acc.active + stats.active,
        inactive: acc.inactive + stats.inactive,
      }),
      { total: 0, active: 0, inactive: 0 },
    );

    return {
      amenities,
      facilities,
      focusAreas,
      skills,
      spaceTypes,
      experienceTypes,
      experienceTopics,
      experienceThemes,
      languages,
      companyTypes,
      targetAudiences,
      jobPreferences,
      totals,
    };
  }
}

export const adminSettingsStatsService = new AdminSettingsStatsService();
