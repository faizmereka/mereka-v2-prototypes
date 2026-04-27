import { Hub } from '@core/models/Hub';
import { AccessMode, Job, JobStatus } from '@core/models/Job';
import type {
  WebJobDetailResponse,
  WebJobListItem,
  WebJobListOptions,
  WebJobListResult,
} from '@schemas/web';

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const SIMILAR_JOBS_LIMIT = 6;

// ============================================================================
// Types
// ============================================================================

export interface GetJobByIdOptions {
  id: string;
  userId?: string;
  userType?: string;
}

// ============================================================================
// Web Job Service - Public API
// ============================================================================

export class WebJobService {
  /**
   * Get job detail by ID
   * Only returns ACTIVE, PUBLIC jobs
   * Client info is only included for authenticated expert users
   */
  async getJobById(options: GetJobByIdOptions): Promise<WebJobDetailResponse | null> {
    const { id, userType } = options;

    // Find the job - only ACTIVE and PUBLIC
    const job = await Job.findOne({
      _id: id,
      status: JobStatus.ACTIVE,
      accessMode: AccessMode.PUBLIC,
    }).lean();

    if (!job) {
      return null;
    }

    // Get hub info
    const hub = await Hub.findById(job.hubId).select('name slug logo').lean();

    // Determine if user is authenticated
    const isAuthenticated = !!userType;

    // Build response
    const response: WebJobDetailResponse = {
      _id: job._id?.toString(),
      jobTitle: job.jobTitle,
      jobDescription: job.jobDescription,
      jobSummary: job.jobSummary,
      employmentType: job.employmentType,
      status: job.status,
      serviceCategory: job.serviceCategory,
      expertLevel: job.expertLevel,
      jobLocation: job.jobLocation,
      preferredLocation: job.preferredLocation,
      jobBudget: job.jobBudget,
      jobCurrency: job.jobCurrency,
      jobStartDate: job.jobStartDate ? job.jobStartDate.toISOString() : undefined,
      jobEndDate: job.jobEndDate,
      jobSkills: job.jobSkills || [],
      jobUploads: job.jobUploads,

      // Client info - always include basic info for public job postings
      // Email is only included for authenticated users
      client: {
        name: job.name,
        email: isAuthenticated ? job.email : undefined,
        organizationName: job.organizationName,
        organizationImage: job.organizationImage,
        aboutOrganization: job.aboutOrganization,
      },

      // Hub info
      hub: hub
        ? {
            _id: hub._id?.toString(),
            name: hub.name,
            slug: hub.slug,
            logo: hub.logo,
          }
        : undefined,

      // Timestamps
      createdDate: job.createdDate,
      createdAt: job.createdAt,
    };

    return response;
  }

  /**
   * List public jobs with filtering and pagination
   */
  async listJobs(options: WebJobListOptions = {}): Promise<WebJobListResult> {
    const {
      page = 1,
      limit = DEFAULT_PAGE_SIZE,
      category,
      serviceType,
      employmentType,
      expertLevel,
      jobLocation,
      search,
    } = options;

    // Clamp limit
    const clampedLimit = Math.min(limit, MAX_PAGE_SIZE);

    // Build query - only ACTIVE, PUBLIC jobs
    const query: Record<string, unknown> = {
      status: JobStatus.ACTIVE,
      accessMode: AccessMode.PUBLIC,
    };

    if (category) {
      query['serviceCategory.category'] = category;
    }

    if (serviceType) {
      query['serviceCategory.serviceType'] = serviceType;
    }

    if (employmentType) {
      query.employmentType = employmentType;
    }

    if (expertLevel) {
      query.expertLevel = expertLevel;
    }

    if (jobLocation) {
      query.jobLocation = jobLocation;
    }

    if (search) {
      query.$or = [
        { jobTitle: { $regex: search, $options: 'i' } },
        { jobSummary: { $regex: search, $options: 'i' } },
        { jobSkills: { $in: [new RegExp(search, 'i')] } },
      ];
    }

    const skip = (page - 1) * clampedLimit;

    // Execute queries in parallel
    const [jobDocs, total] = await Promise.all([
      Job.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(clampedLimit)
        .select(
          'jobTitle jobSummary employmentType expertLevel jobLocation jobBudget jobCurrency jobStartDate jobEndDate serviceCategory organizationName createdDate createdAt',
        )
        .lean(),
      Job.countDocuments(query),
    ]);

    // Map to list items
    const jobs: WebJobListItem[] = jobDocs.map((job) => ({
      _id: job._id?.toString(),
      jobTitle: job.jobTitle,
      jobSummary: job.jobSummary,
      employmentType: job.employmentType,
      expertLevel: job.expertLevel,
      jobLocation: job.jobLocation,
      jobBudget: job.jobBudget,
      jobCurrency: job.jobCurrency,
      jobStartDate: job.jobStartDate ? job.jobStartDate.toISOString() : undefined,
      jobEndDate: job.jobEndDate,
      serviceCategory: job.serviceCategory,
      organizationName: job.organizationName,
      createdDate: job.createdDate,
      createdAt: job.createdAt,
    }));

    return {
      jobs,
      total,
      page,
      limit: clampedLimit,
      totalPages: Math.ceil(total / clampedLimit),
    };
  }

  /**
   * Get similar jobs based on category and skills
   */
  async getSimilarJobs(
    jobId: string,
    limit: number = SIMILAR_JOBS_LIMIT,
  ): Promise<WebJobListItem[]> {
    // First get the job to find its category and skills
    const job = await Job.findOne({
      _id: jobId,
      status: JobStatus.ACTIVE,
      accessMode: AccessMode.PUBLIC,
    })
      .select('serviceCategory jobSkills')
      .lean();

    if (!job) {
      return [];
    }

    // Find similar jobs by category or skills, excluding the current job
    const query: Record<string, unknown> = {
      _id: { $ne: jobId },
      status: JobStatus.ACTIVE,
      accessMode: AccessMode.PUBLIC,
      $or: [
        { 'serviceCategory.category': job.serviceCategory?.category },
        { jobSkills: { $in: job.jobSkills || [] } },
      ],
    };

    const similarJobs = await Job.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .select(
        'jobTitle jobSummary employmentType expertLevel jobLocation jobBudget jobCurrency jobStartDate jobEndDate serviceCategory organizationName createdDate createdAt',
      )
      .lean();

    return similarJobs.map((j) => ({
      _id: j._id?.toString(),
      jobTitle: j.jobTitle,
      jobSummary: j.jobSummary,
      employmentType: j.employmentType,
      expertLevel: j.expertLevel,
      jobLocation: j.jobLocation,
      jobBudget: j.jobBudget,
      jobCurrency: j.jobCurrency,
      jobStartDate: j.jobStartDate ? j.jobStartDate.toISOString() : undefined,
      jobEndDate: j.jobEndDate,
      serviceCategory: j.serviceCategory,
      organizationName: j.organizationName,
      createdDate: j.createdDate,
      createdAt: j.createdAt,
    }));
  }
}

export const webJobService = new WebJobService();
