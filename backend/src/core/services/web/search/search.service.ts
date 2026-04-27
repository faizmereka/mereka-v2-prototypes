import { Experience } from '@core/models/Experience';
import { Expertise, ExpertiseStatus } from '@core/models/Expertise';
import { Hub, HubStatus } from '@core/models/Hub';
import { AccessMode, Job, JobStatus } from '@core/models/Job';
import { User, UserStatus } from '@core/models/User';
import type { SearchResultItem } from '@core/schemas/web/search';

/**
 * Unified Search Service
 * Searches across all public entities: experts, hubs, expertise, experiences, jobs
 */
export class SearchService {
  /**
   * Search across all entities
   * @param query - Search query string
   * @param limit - Total results limit (distributed across entities)
   */
  async search(query: string, limit: number = 10): Promise<SearchResultItem[]> {
    // Calculate per-entity limit (ensure at least 2 per entity, now 5 entities)
    const perEntityLimit = Math.max(2, Math.ceil(limit / 5));

    // Run all searches in parallel
    const [experts, hubs, expertises, experiences, jobs] = await Promise.all([
      this.searchExperts(query, perEntityLimit),
      this.searchHubs(query, perEntityLimit),
      this.searchExpertises(query, perEntityLimit),
      this.searchExperiences(query, perEntityLimit),
      this.searchJobs(query, perEntityLimit),
    ]);

    // Combine and limit results
    const allResults = [...experts, ...hubs, ...expertises, ...experiences, ...jobs];

    // Sort by relevance (text score) if available, then limit
    return allResults.slice(0, limit);
  }

  /**
   * Search experts (users with professionalTitle)
   */
  private async searchExperts(query: string, limit: number): Promise<SearchResultItem[]> {
    const users = await User.find(
      {
        $text: { $search: query },
        status: UserStatus.ACTIVE,
        professionalTitle: { $exists: true, $ne: '' },
      },
      { score: { $meta: 'textScore' } },
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(limit)
      .select('name username profilePhoto professionalTitle')
      .lean();

    return users.map((user) => ({
      id: user._id?.toString() || '',
      type: 'experts' as const,
      title: user.name || '',
      image: user.profilePhoto,
      slug: user.username || user._id?.toString() || '',
    }));
  }

  /**
   * Search hubs
   */
  private async searchHubs(query: string, limit: number): Promise<SearchResultItem[]> {
    const hubs = await Hub.find(
      {
        $text: { $search: query },
        status: HubStatus.ACTIVE,
        isActive: true,
      },
      { score: { $meta: 'textScore' } },
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(limit)
      .select('name slug logo')
      .lean();

    return hubs.map((hub) => ({
      id: hub._id?.toString() || '',
      type: 'hubs' as const,
      title: hub.name || '',
      image: hub.logo,
      slug: hub.slug || '',
    }));
  }

  /**
   * Search expertises
   */
  private async searchExpertises(query: string, limit: number): Promise<SearchResultItem[]> {
    const expertises = await Expertise.find(
      {
        $text: { $search: query },
        status: ExpertiseStatus.PUBLISHED,
      },
      { score: { $meta: 'textScore' } },
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(limit)
      .select('expertiseTitle slug coverPhoto')
      .lean();

    return expertises.map((exp) => ({
      id: exp._id?.toString() || '',
      type: 'expertise' as const,
      title: exp.expertiseTitle || '',
      image: exp.coverPhoto,
      slug: exp.slug || '',
    }));
  }

  /**
   * Search experiences
   */
  private async searchExperiences(query: string, limit: number): Promise<SearchResultItem[]> {
    const experiences = await Experience.find(
      {
        $text: { $search: query },
        status: 'ACTIVE',
        audienceType: { $nin: ['Hidden', 'PRIVATE'] },
      },
      { score: { $meta: 'textScore' } },
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(limit)
      .select('experienceTitle slug coverPhoto')
      .lean();

    return experiences.map((exp) => ({
      id: exp._id?.toString() || '',
      type: 'experiences' as const,
      title: exp.experienceTitle || '',
      image: exp.coverPhoto,
      slug: exp.slug || '',
    }));
  }

  /**
   * Search jobs
   */
  private async searchJobs(query: string, limit: number): Promise<SearchResultItem[]> {
    const jobs = await Job.find({
      $or: [
        { jobTitle: { $regex: query, $options: 'i' } },
        { jobSummary: { $regex: query, $options: 'i' } },
        { jobSkills: { $in: [new RegExp(query, 'i')] } },
      ],
      status: JobStatus.ACTIVE,
      accessMode: AccessMode.PUBLIC,
    })
      .limit(limit)
      .select('jobTitle organizationName')
      .lean();

    return jobs.map((job) => ({
      id: job._id?.toString() || '',
      type: 'jobs' as const,
      title: job.jobTitle || '',
      image: undefined, // Jobs don't have images
      slug: job._id?.toString() || '',
    }));
  }
}

export const searchService = new SearchService();
