import { Contract } from '@core/models/Contract';
import { ContractPayment } from '@core/models/ContractPayment';
import { Hub } from '@core/models/Hub';
import { type IJob, Job, JobStatus } from '@core/models/Job';
import { JobProposal } from '@core/models/JobProposal';
import { PendingPayment } from '@core/models/PendingPayment';

export interface AdminListJobsQuery {
  page?: number;
  limit?: number;
  status?: JobStatus;
  search?: string;
  employmentType?: string;
  hubId?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface JobStatsResponse {
  total: number;
  byStatus: Record<string, number>;
  active: number;
  inProgress: number;
  totalProposals: number;
  proposalsByStatus: Record<string, number>;
  totalContracts: number;
  contractsByStatus: Record<string, number>;
  // Contract Payments stats
  totalContractPayments: number;
  contractPaymentsByStatus: Record<string, number>;
  contractPaymentsByType: Record<string, number>;
  // Pending Payments stats (retry queue)
  totalPendingPayments: number;
  pendingPaymentsByStatus: Record<string, number>;
}

export class AdminJobService {
  /**
   * Get job statistics for admin dashboard
   */
  async getJobStats(): Promise<JobStatsResponse> {
    const [
      total,
      statusCounts,
      proposalStats,
      contractStats,
      contractPaymentStatusStats,
      contractPaymentTypeStats,
      pendingPaymentStats,
    ] = await Promise.all([
      Job.countDocuments(),
      Job.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      JobProposal.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Contract.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      ContractPayment.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      ContractPayment.aggregate([{ $group: { _id: '$paymentType', count: { $sum: 1 } } }]),
      PendingPayment.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);

    // Convert job status aggregation to object
    const byStatus: Record<string, number> = {
      DRAFT: 0,
      ACTIVE: 0,
      IN_PROGRESS: 0,
      COMPLETED: 0,
      CANCELLED: 0,
      EXPIRED: 0,
    };

    for (const item of statusCounts) {
      if (item._id in byStatus) {
        byStatus[item._id] = item.count;
      }
    }

    // Convert proposal status aggregation to object (lowercase values as per ProposalStatus enum)
    const proposalsByStatus: Record<string, number> = {
      pending: 0,
      accepted: 0,
      rejected: 0,
      withdrawn: 0,
    };

    for (const item of proposalStats) {
      if (item._id in proposalsByStatus) {
        proposalsByStatus[item._id] = item.count;
      }
    }

    // Convert contract status aggregation to object (lowercase values as per ContractStatus enum)
    const contractsByStatus: Record<string, number> = {
      pending: 0,
      active: 0,
      completed: 0,
      cancelled: 0,
      paused: 0,
    };

    for (const item of contractStats) {
      if (item._id in contractsByStatus) {
        contractsByStatus[item._id] = item.count;
      }
    }

    // Convert contract payment status aggregation to object
    const contractPaymentsByStatus: Record<string, number> = {
      pending: 0,
      funded: 0,
      processing: 0,
      released: 0,
      refunded: 0,
      failed: 0,
      cancelled: 0,
    };

    for (const item of contractPaymentStatusStats) {
      if (item._id in contractPaymentsByStatus) {
        contractPaymentsByStatus[item._id] = item.count;
      }
    }

    // Convert contract payment type aggregation to object
    const contractPaymentsByType: Record<string, number> = {
      milestone: 0,
      timelog: 0,
    };

    for (const item of contractPaymentTypeStats) {
      if (item._id in contractPaymentsByType) {
        contractPaymentsByType[item._id] = item.count;
      }
    }

    // Convert pending payment status aggregation to object
    const pendingPaymentsByStatus: Record<string, number> = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
    };

    for (const item of pendingPaymentStats) {
      if (item._id in pendingPaymentsByStatus) {
        pendingPaymentsByStatus[item._id] = item.count;
      }
    }

    const totalProposals = Object.values(proposalsByStatus).reduce((a, b) => a + b, 0);
    const totalContracts = Object.values(contractsByStatus).reduce((a, b) => a + b, 0);
    const totalContractPayments = Object.values(contractPaymentsByStatus).reduce(
      (a, b) => a + b,
      0,
    );
    const totalPendingPayments = Object.values(pendingPaymentsByStatus).reduce((a, b) => a + b, 0);

    return {
      total,
      byStatus,
      active: byStatus.ACTIVE ?? 0,
      inProgress: byStatus.IN_PROGRESS ?? 0,
      totalProposals,
      proposalsByStatus,
      totalContracts,
      contractsByStatus,
      totalContractPayments,
      contractPaymentsByStatus,
      contractPaymentsByType,
      totalPendingPayments,
      pendingPaymentsByStatus,
    };
  }

  /**
   * List all jobs with filtering and pagination
   */
  async listJobs(query: AdminListJobsQuery) {
    const {
      page = 1,
      limit = 20,
      status,
      search,
      employmentType,
      hubId,
      dateFrom,
      dateTo,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    // Build match filter
    const matchFilter: Record<string, unknown> = {};
    if (status) matchFilter.status = status;
    if (employmentType) matchFilter.employmentType = employmentType;
    if (hubId) matchFilter.hubId = hubId;
    if (search) {
      matchFilter.$or = [
        { jobTitle: { $regex: search, $options: 'i' } },
        { organizationName: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
      ];
    }

    // Date range filter
    if (dateFrom || dateTo) {
      matchFilter.createdAt = {};
      if (dateFrom) {
        (matchFilter.createdAt as Record<string, Date>).$gte = new Date(dateFrom);
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setDate(endDate.getDate() + 1);
        (matchFilter.createdAt as Record<string, Date>).$lt = endDate;
      }
    }

    // Build sort
    const sort: Record<string, 1 | -1> = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Run count and data queries in parallel for better performance
    // Note: hubId and createdBy are stored as strings (may be Firebase UIDs or ObjectId strings)
    const [total, jobs] = await Promise.all([
      Job.countDocuments(matchFilter),
      Job.find(matchFilter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select(
          '_id jobTitle jobDescription jobSummary employmentType status serviceCategory expertLevel jobLocation jobBudget jobCurrency jobSkills name email organizationName organizationImage hubId createdBy createdAt updatedAt',
        )
        .lean(),
    ]);

    // Count proposals for each job (batch lookup)
    const jobIds = jobs.map((j) => j._id);
    const proposalCounts = await JobProposal.aggregate([
      { $match: { jobId: { $in: jobIds } } },
      {
        $group: {
          _id: '$jobId',
          total: { $sum: 1 },
          hires: { $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] } },
        },
      },
    ]);
    const proposalMap = new Map(
      proposalCounts.map((p) => [p._id.toString(), { total: p.total, hires: p.hires }]),
    );

    // Lookup hub names for all jobs (batch lookup)
    const hubIds = [...new Set(jobs.map((j) => j.hubId).filter(Boolean))];
    const hubs = await Hub.find({ _id: { $in: hubIds } })
      .select('_id name logo')
      .lean();
    const hubMap = new Map(hubs.map((h) => [h._id.toString(), { name: h.name, logo: h.logo }]));

    // Attach proposal counts and hub name to jobs
    const jobsWithData = jobs.map((job) => {
      const proposalData = proposalMap.get(job._id.toString()) || { total: 0, hires: 0 };
      const hubData = job.hubId ? hubMap.get(job.hubId.toString()) : null;
      return {
        ...job,
        hubName: hubData?.name || job.organizationName || '',
        hubLogo: hubData?.logo || job.organizationImage || '',
        proposalsCount: proposalData.total,
        hiresCount: proposalData.hires,
      };
    });

    return {
      items: jobsWithData,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get job by ID with full details
   */
  async getJobById(id: string) {
    const job = await Job.findById(id).lean();

    if (!job) {
      throw new Error('Job not found');
    }

    // Get hub details
    let hubData: { name: string; logo: string } | null = null;
    if (job.hubId) {
      const hub = await Hub.findById(job.hubId).select('name logo').lean();
      if (hub) {
        hubData = { name: hub.name, logo: hub.logo };
      }
    }

    // Get proposals for this job
    const proposals = await JobProposal.find({ jobId: job._id }).sort({ createdAt: -1 }).lean();

    // Get proposal count and hires count
    const proposalsCount = proposals.length;
    const hiresCount = proposals.filter((p) => p.status === 'accepted').length;

    return {
      ...job,
      hubName: hubData?.name || job.organizationName || '',
      hubLogo: hubData?.logo || job.organizationImage || '',
      proposalsCount,
      hiresCount,
      proposals,
    };
  }

  /**
   * Update job status
   */
  async updateJobStatus(id: string, status: JobStatus): Promise<IJob> {
    const job = await Job.findById(id);
    if (!job) {
      throw new Error('Job not found');
    }

    job.status = status;
    await job.save();

    return job;
  }

  /**
   * Delete job (soft delete - set status to CANCELLED)
   */
  async deleteJob(id: string): Promise<void> {
    const job = await Job.findById(id);
    if (!job) {
      throw new Error('Job not found');
    }

    job.status = JobStatus.CANCELLED;
    await job.save();
  }

  /**
   * Bulk update job status
   */
  async bulkUpdateJobStatus(jobIds: string[], status: JobStatus) {
    const result = await Job.updateMany({ _id: { $in: jobIds } }, { $set: { status } });

    return {
      modifiedCount: result.modifiedCount,
    };
  }
}

export const adminJobService = new AdminJobService();
