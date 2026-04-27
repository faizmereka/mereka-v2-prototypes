import { Hub } from '@core/models/Hub';
import { Job } from '@core/models/Job';
import type { IJobProposal } from '@core/models/JobProposal';
import { JobProposal, type ProposalStatus } from '@core/models/JobProposal';
import { User } from '@core/models/User';
import type { PipelineStage } from 'mongoose';

export interface AdminListProposalsQuery {
  page?: number;
  limit?: number;
  status?: ProposalStatus;
  search?: string;
  jobId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class AdminProposalService {
  /**
   * List proposals with filtering and pagination
   */
  async listProposals(query: AdminListProposalsQuery) {
    const {
      page = 1,
      limit = 20,
      status,
      search,
      jobId,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    // Build match filter
    const matchFilter: Record<string, unknown> = {};
    if (status) matchFilter.status = status;
    if (jobId) matchFilter.jobId = jobId;

    // Build sort
    const sort: Record<string, 1 | -1> = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Build aggregation pipeline
    const pipeline: PipelineStage[] = [
      { $match: matchFilter },
      {
        $facet: {
          totalCount: [{ $count: 'count' }],
          data: [
            { $sort: sort },
            { $skip: skip },
            { $limit: limit },
            // Lookup job details (jobId is stored as ObjectId)
            {
              $lookup: {
                from: 'jobs',
                let: { jobId: '$jobId' },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $eq: ['$_id', '$$jobId'],
                      },
                    },
                  },
                  { $project: { jobTitle: 1, organizationName: 1, status: 1, hubId: 1 } },
                ],
                as: 'jobData',
              },
            },
            // Lookup expert details
            {
              $lookup: {
                from: 'users',
                let: { expertId: '$asssignedExpertId' },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $eq: ['$_id', '$$expertId'],
                      },
                    },
                  },
                  { $project: { name: 1, email: 1, profilePhoto: 1 } },
                ],
                as: 'expertData',
              },
            },
            // Extract hubId from jobData and convert to ObjectId for hub lookup
            {
              $addFields: {
                _jobHubId: {
                  $toObjectId: { $arrayElemAt: ['$jobData.hubId', 0] },
                },
              },
            },
            // Lookup hub details via job's hubId
            {
              $lookup: {
                from: 'hubs',
                localField: '_jobHubId',
                foreignField: '_id',
                as: 'hubData',
              },
            },
            // Project final shape
            {
              $project: {
                _id: 1,
                jobId: 1,
                proposalDetails: 1,
                priceType: 1,
                proposedPrice: 1,
                hourlyProposedPrice: 1,
                workingHours: 1,
                selectedCurrency: 1,
                status: 1,
                createdAt: { $ifNull: ['$createdAt', '$createdDate'] },
                updatedAt: { $ifNull: ['$updatedAt', '$updatedDate'] },
                jobTitle: { $arrayElemAt: ['$jobData.jobTitle', 0] },
                organizationName: { $arrayElemAt: ['$jobData.organizationName', 0] },
                hubName: { $ifNull: [{ $arrayElemAt: ['$hubData.name', 0] }, null] },
                hubLogo: { $ifNull: [{ $arrayElemAt: ['$hubData.logo', 0] }, null] },
                expert: { $arrayElemAt: ['$expertData', 0] },
              },
            },
          ],
        },
      },
    ];

    // Add search filter post-lookup if search is provided
    if (search) {
      const searchPipeline: PipelineStage[] = [
        { $match: matchFilter },
        // First do all lookups (jobId is stored as ObjectId)
        {
          $lookup: {
            from: 'jobs',
            let: { jobId: '$jobId' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ['$_id', '$$jobId'],
                  },
                },
              },
              { $project: { jobTitle: 1, organizationName: 1, hubId: 1 } },
            ],
            as: 'jobData',
          },
        },
        {
          $lookup: {
            from: 'users',
            let: { expertId: '$asssignedExpertId' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ['$_id', '$$expertId'],
                  },
                },
              },
              { $project: { name: 1 } },
            ],
            as: 'expertData',
          },
        },
        // Extract hubId from jobData and convert to ObjectId for hub lookup
        {
          $addFields: {
            _jobHubId: {
              $toObjectId: { $arrayElemAt: ['$jobData.hubId', 0] },
            },
          },
        },
        // Lookup hub details via job's hubId
        {
          $lookup: {
            from: 'hubs',
            localField: '_jobHubId',
            foreignField: '_id',
            as: 'hubData',
          },
        },
        // Then filter by search
        {
          $match: {
            $or: [
              { 'jobData.jobTitle': { $regex: search, $options: 'i' } },
              { 'expertData.name': { $regex: search, $options: 'i' } },
              { 'hubData.name': { $regex: search, $options: 'i' } },
            ],
          },
        },
        {
          $facet: {
            totalCount: [{ $count: 'count' }],
            data: [
              { $sort: sort },
              { $skip: skip },
              { $limit: limit },
              {
                $project: {
                  _id: 1,
                  jobId: 1,
                  proposalDetails: 1,
                  priceType: 1,
                  proposedPrice: 1,
                  hourlyProposedPrice: 1,
                  workingHours: 1,
                  selectedCurrency: 1,
                  status: 1,
                  createdAt: { $ifNull: ['$createdAt', '$createdDate'] },
                  updatedAt: { $ifNull: ['$updatedAt', '$updatedDate'] },
                  jobTitle: { $arrayElemAt: ['$jobData.jobTitle', 0] },
                  organizationName: { $arrayElemAt: ['$jobData.organizationName', 0] },
                  hubName: { $arrayElemAt: ['$hubData.name', 0] },
                  hubLogo: { $arrayElemAt: ['$hubData.logo', 0] },
                  expert: { $arrayElemAt: ['$expertData', 0] },
                },
              },
            ],
          },
        },
      ];

      const [result] = await JobProposal.aggregate(searchPipeline);
      const total = result.totalCount[0]?.count || 0;
      const proposals = result.data || [];

      return {
        items: proposals,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    }

    // Execute aggregation
    const [result] = await JobProposal.aggregate(pipeline);

    const total = result.totalCount[0]?.count || 0;
    const proposals = result.data || [];

    return {
      items: proposals,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get proposal by ID with full details
   */
  async getProposalById(id: string) {
    const proposal = await JobProposal.findById(id).lean();

    if (!proposal) {
      throw new Error('Proposal not found');
    }

    // Get job details
    const job = await Job.findById(proposal.jobId)
      .select('jobTitle organizationName status jobBudget jobCurrency hubId')
      .lean();

    // Get hub details if job has hubId
    let hub = null;
    if (job?.hubId) {
      hub = await Hub.findById(job.hubId).select('name logo').lean();
    }

    // Get expert details
    const expert = await User.findById(proposal.asssignedExpertId)
      .select('name email profilePhoto')
      .lean();

    // Get client details
    const client = await User.findById(proposal.createdBy).select('name email profilePhoto').lean();

    return {
      ...proposal,
      job,
      hub,
      expert,
      client,
    };
  }

  /**
   * Update proposal status
   */
  async updateProposalStatus(id: string, status: ProposalStatus): Promise<IJobProposal> {
    const proposal = await JobProposal.findById(id);
    if (!proposal) {
      throw new Error('Proposal not found');
    }

    proposal.status = status;
    await proposal.save();

    return proposal;
  }
}

export const adminProposalService = new AdminProposalService();
