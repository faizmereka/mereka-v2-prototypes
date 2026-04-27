import { Contract } from '@core/models/Contract';
import type { IJob } from '@core/models/Job';
import { Job, JobStatus } from '@core/models/Job';
import { JobProposal } from '@core/models/JobProposal';
import type {
  HubCreateJobInput,
  HubGetJobsQuery,
  HubUpdateJobInput,
  HubUpsertJobInput,
} from '@schemas/hub';
import mongoose from 'mongoose';

export class HubJobService {
  /**
   * Create a new job
   */
  async createJob(data: HubCreateJobInput, userId: string): Promise<IJob> {
    const job = await Job.create({
      ...data,
      createdBy: new mongoose.Types.ObjectId(userId),
    });
    return job;
  }

  /**
   * Update an existing job
   */
  async updateJob(id: string, data: HubUpdateJobInput, userId: string): Promise<IJob | null> {
    const job = await Job.findByIdAndUpdate(
      id,
      { ...data, updatedBy: userId },
      { new: true, runValidators: true },
    );
    return job;
  }

  /**
   * Generate AI summary from job description
   * Currently returns a simple truncated version, can be replaced with actual AI service
   */
  async generateSummary(description: string): Promise<string> {
    // Strip HTML tags for processing
    const plainText = description
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();

    // Simple summary: take first 150 characters of the description
    // TODO: Replace with actual AI service (OpenAI, Claude, etc.)
    const summary = plainText.length > 150 ? `${plainText.substring(0, 147)}...` : plainText;

    return summary;
  }

  /**
   * @deprecated Use createJob + updateJob instead
   * Upsert job (Create or Update based on ID presence)
   */
  async upsertJob(data: HubUpsertJobInput, userId: string): Promise<IJob> {
    if (data.id) {
      const job = await Job.findByIdAndUpdate(
        data.id,
        { ...data, updatedBy: userId },
        { new: true, runValidators: true },
      );

      if (!job) {
        throw new Error('Job not found');
      }
      return job;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, ...createData } = data;
    const job = await Job.create({
      ...createData,
      createdBy: new mongoose.Types.ObjectId(userId),
    });
    return job;
  }

  /**
   * Get job by ID
   */
  async getJobById(id: string): Promise<IJob | null> {
    const job = await Job.findById(id);
    return job;
  }

  /**
   * Get list of jobs with filtering and pagination
   */
  async getJobs(query: HubGetJobsQuery) {
    const { status, hubId, search, category, skills } = query;
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    // Build filter
    const filter: Record<string, unknown> = {};

    if (status) filter.status = status;
    if (hubId) filter.hubId = hubId;

    if (category) {
      filter['serviceCategory.category'] = category;
    }

    if (skills) {
      const skillsList = skills.split(',').map((s) => s.trim());
      filter.jobSkills = { $in: skillsList };
    }

    if (search) {
      filter.$or = [
        { jobTitle: { $regex: search, $options: 'i' } },
        { jobDescription: { $regex: search, $options: 'i' } },
        { organizationName: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [jobs, total] = await Promise.all([
      Job.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Job.countDocuments(filter),
    ]);

    return {
      jobs: jobs as unknown as IJob[],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Delete job (soft delete by setting status to CANCELLED)
   */
  async deleteJob(id: string, _userId: string): Promise<void> {
    const job = await Job.findById(id);
    if (!job) {
      throw new Error('Job not found');
    }

    // Soft delete
    job.status = JobStatus.CANCELLED;
    await job.save();
  }

  /**
   * Get stats for hub jobs page (counts for jobs, proposals, contracts)
   * This is for the Posts page (employer/client perspective):
   * - Jobs: Posted by this hub (hubId)
   * - Proposals: Received for jobs posted by this hub (clientHubId)
   * - Contracts: Where this hub is the employer/client (clientHubId)
   */
  async getStats(hubId: string) {
    const [jobsCount, proposalsCount, contractsCount] = await Promise.all([
      Job.countDocuments({ hubId, status: { $ne: JobStatus.CANCELLED } }),
      JobProposal.countDocuments({ clientHubId: hubId }),
      Contract.countDocuments({ clientHubId: hubId }),
    ]);

    return {
      jobs: jobsCount,
      proposals: proposalsCount,
      contracts: contractsCount,
    };
  }

  /**
   * Get stats for applications page (expert perspective):
   * - Proposals: Submitted by experts from this hub (expertHubId)
   * - Contracts: Where experts from this hub are assigned (expertHubId)
   */
  async getExpertStats(hubId: string) {
    const [proposalsCount, contractsCount] = await Promise.all([
      JobProposal.countDocuments({ expertHubId: hubId }),
      Contract.countDocuments({ expertHubId: hubId }),
    ]);

    return {
      proposals: proposalsCount,
      contracts: contractsCount,
    };
  }
}

export const hubJobService = new HubJobService();
