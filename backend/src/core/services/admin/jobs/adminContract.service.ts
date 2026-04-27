import { Contract, type ContractStatus, type IContract } from '@core/models/Contract';
import { Hub } from '@core/models/Hub';
import { Job } from '@core/models/Job';
import { JobProposal } from '@core/models/JobProposal';
import { Milestone, MilestoneStatus } from '@core/models/Milestone';
import { TimelogEntry } from '@core/models/TimelogEntry';
import { User } from '@core/models/User';
import type { PipelineStage } from 'mongoose';

export interface AdminListContractsQuery {
  page?: number;
  limit?: number;
  status?: ContractStatus;
  search?: string;
  jobId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ContractTransaction {
  id: string;
  type: 'escrow' | 'release' | 'refund' | 'payment';
  amount: number;
  currency: string;
  description: string;
  date: Date;
  status: string;
  referenceId: string;
  referenceType: 'milestone' | 'timelog';
  referenceName?: string;
}

export class AdminContractService {
  /**
   * List contracts with filtering and pagination
   */
  async listContracts(query: AdminListContractsQuery) {
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

    // Add search filter if provided (search in contract title or description)
    if (search) {
      matchFilter.$or = [
        { contractTitle: { $regex: search, $options: 'i' } },
        { contractDescription: { $regex: search, $options: 'i' } },
      ];
    }

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
            // Lookup job details
            {
              $lookup: {
                from: 'jobs',
                localField: 'jobId',
                foreignField: '_id',
                pipeline: [{ $project: { jobTitle: 1, organizationName: 1, status: 1 } }],
                as: 'jobData',
              },
            },
            // Lookup expert details
            {
              $lookup: {
                from: 'users',
                localField: 'asssignedExpertId',
                foreignField: '_id',
                pipeline: [{ $project: { name: 1, email: 1, profilePhoto: 1 } }],
                as: 'expertData',
              },
            },
            // Lookup client details
            {
              $lookup: {
                from: 'users',
                localField: 'createdBy',
                foreignField: '_id',
                pipeline: [{ $project: { name: 1, email: 1, profilePhoto: 1 } }],
                as: 'clientData',
              },
            },
            // Lookup hub details
            {
              $lookup: {
                from: 'hubs',
                localField: 'hubId',
                foreignField: '_id',
                pipeline: [{ $project: { name: 1, logo: 1 } }],
                as: 'hubData',
              },
            },
            // Lookup milestone stats
            {
              $lookup: {
                from: 'milestones',
                let: { contractId: '$_id' },
                pipeline: [
                  { $match: { $expr: { $eq: ['$contractId', '$$contractId'] } } },
                  {
                    $group: {
                      _id: null,
                      total: { $sum: 1 },
                      funded: {
                        $sum: {
                          $cond: [{ $in: ['$status', ['funded', 'active']] }, 1, 0],
                        },
                      },
                      completed: {
                        $sum: {
                          $cond: [
                            { $in: ['$status', ['completed', 'released', 'approved']] },
                            1,
                            0,
                          ],
                        },
                      },
                      pending: {
                        $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
                      },
                      totalAmount: { $sum: '$amount' },
                      fundedAmount: {
                        $sum: {
                          $cond: [
                            {
                              $in: [
                                '$status',
                                ['funded', 'active', 'completed', 'released', 'approved'],
                              ],
                            },
                            '$amount',
                            0,
                          ],
                        },
                      },
                    },
                  },
                ],
                as: 'milestoneStats',
              },
            },
            // Lookup timelog stats for hourly contracts
            {
              $lookup: {
                from: 'timelogentrys',
                let: { contractId: '$_id' },
                pipeline: [
                  { $match: { $expr: { $eq: ['$contractId', '$$contractId'] } } },
                  {
                    $group: {
                      _id: null,
                      totalHours: { $sum: '$hoursWorked' },
                      totalBillable: { $sum: '$billableAmount' },
                    },
                  },
                ],
                as: 'timelogStats',
              },
            },
            // Project final shape
            {
              $project: {
                _id: 1,
                jobId: 1,
                jobProposalId: 1,
                hubId: 1,
                contractTitle: 1,
                contractDescription: 1,
                priceType: 1,
                proposedPrice: 1,
                hourlyProposedPrice: 1,
                weeklyLimit: 1,
                hasMilestones: 1,
                selectedCurrency: 1,
                startDate: 1,
                endDate: 1,
                status: 1,
                createdAt: { $ifNull: ['$createdAt', '$createdDate'] },
                updatedAt: { $ifNull: ['$updatedAt', '$updatedDate'] },
                job: { $arrayElemAt: ['$jobData', 0] },
                expert: { $arrayElemAt: ['$expertData', 0] },
                client: { $arrayElemAt: ['$clientData', 0] },
                hub: { $arrayElemAt: ['$hubData', 0] },
                milestoneStats: {
                  $ifNull: [
                    { $arrayElemAt: ['$milestoneStats', 0] },
                    {
                      total: 0,
                      funded: 0,
                      completed: 0,
                      pending: 0,
                      totalAmount: 0,
                      fundedAmount: 0,
                    },
                  ],
                },
                timelogStats: {
                  $ifNull: [
                    { $arrayElemAt: ['$timelogStats', 0] },
                    { totalHours: 0, totalBillable: 0 },
                  ],
                },
              },
            },
          ],
        },
      },
    ];

    // Execute aggregation
    const [result] = await Contract.aggregate(pipeline);

    const total = result.totalCount[0]?.count || 0;
    const contracts = result.data || [];

    return {
      items: contracts,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get contract by ID with full details
   */
  async getContractById(id: string) {
    const contract = await Contract.findById(id).lean();

    if (!contract) {
      throw new Error('Contract not found');
    }

    // Get job details
    const job = await Job.findById(contract.jobId)
      .select('jobTitle organizationName status jobBudget jobCurrency')
      .lean();

    // Get expert details
    const expert = await User.findById(contract.asssignedExpertId)
      .select('name email profilePhoto')
      .lean();

    // Get client details
    const client = await User.findById(contract.createdBy).select('name email profilePhoto').lean();

    // Get hub details (clientHubId = employer hub that posted the job)
    const hub = await Hub.findById(contract.clientHubId).select('name logo').lean();

    // Get proposal details
    const proposal = await JobProposal.findById(contract.jobProposalId)
      .select('proposalDetails priceType proposedPrice hourlyProposedPrice workingHours')
      .lean();

    // Get milestone stats
    const milestones = await Milestone.find({ contractId: contract._id }).lean();
    const milestoneStats = {
      total: milestones.length,
      pending: milestones.filter((m) => m.status === MilestoneStatus.PENDING).length,
      funded: milestones.filter((m) =>
        [MilestoneStatus.FUNDED, MilestoneStatus.FUNDED].includes(m.status),
      ).length,
      workSubmitted: milestones.filter((m) => m.status === MilestoneStatus.WORK_SUBMITTED).length,
      completed: milestones.filter((m) =>
        [MilestoneStatus.COMPLETED, MilestoneStatus.RELEASED, MilestoneStatus.RELEASED].includes(
          m.status,
        ),
      ).length,
      cancelled: milestones.filter((m) => m.status === MilestoneStatus.CANCELLED).length,
      totalAmount: milestones.reduce((sum, m) => sum + (m.amount || 0), 0),
      fundedAmount: milestones
        .filter((m) =>
          [
            MilestoneStatus.FUNDED,
            MilestoneStatus.FUNDED,
            MilestoneStatus.WORK_SUBMITTED,
            MilestoneStatus.COMPLETED,
            MilestoneStatus.RELEASED,
            MilestoneStatus.RELEASED,
          ].includes(m.status),
        )
        .reduce((sum, m) => sum + (m.amount || 0), 0),
    };

    // Get timelog stats for hourly contracts
    let timelogStats = null;
    if (contract.priceType === 'hourly') {
      // Calculate current week and previous week
      const now = new Date();
      const currentYear = now.getFullYear();
      const firstDayOfYear = new Date(currentYear, 0, 1);
      const pastDaysOfYear = (now.getTime() - firstDayOfYear.getTime()) / 86400000;
      const currentWeek = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
      const previousWeek = currentWeek > 1 ? currentWeek - 1 : 52;
      const previousWeekYear = currentWeek > 1 ? currentYear : currentYear - 1;

      // Get all timelogs for this contract
      const timelogs = await TimelogEntry.find({ contractId: contract._id }).lean();

      const thisWeekLogs = timelogs.filter(
        (t) => t.year === currentYear && t.weekNumber === currentWeek,
      );
      const prevWeekLogs = timelogs.filter(
        (t) => t.year === previousWeekYear && t.weekNumber === previousWeek,
      );

      timelogStats = {
        hourlyRate: contract.hourlyProposedPrice || 0,
        weeklyLimit: contract.weeklyLimit || 40,
        currency: contract.selectedCurrency || 'MYR',
        thisWeek: {
          hours: thisWeekLogs.reduce((sum, t) => sum + (t.hoursWorked || 0), 0),
          billable: thisWeekLogs.reduce((sum, t) => sum + (t.billableAmount || 0), 0),
          entries: thisWeekLogs.length,
        },
        previousWeek: {
          hours: prevWeekLogs.reduce((sum, t) => sum + (t.hoursWorked || 0), 0),
          billable: prevWeekLogs.reduce((sum, t) => sum + (t.billableAmount || 0), 0),
          entries: prevWeekLogs.length,
        },
        total: {
          hours: timelogs.reduce((sum, t) => sum + (t.hoursWorked || 0), 0),
          billable: timelogs.reduce((sum, t) => sum + (t.billableAmount || 0), 0),
          entries: timelogs.length,
        },
      };
    }

    return {
      ...contract,
      job,
      expert,
      client,
      hub,
      proposal,
      milestoneStats,
      timelogStats,
      milestones: contract.hasMilestones ? milestones : undefined,
    };
  }

  /**
   * Update contract status
   */
  async updateContractStatus(id: string, status: ContractStatus): Promise<IContract> {
    const contract = await Contract.findById(id);
    if (!contract) {
      throw new Error('Contract not found');
    }

    contract.status = status;
    if (status === 'completed') {
      contract.endDate = new Date();
    }
    await contract.save();

    return contract;
  }

  /**
   * Get milestones for a contract (fixed price contracts only)
   */
  async getContractMilestones(contractId: string) {
    const contract = await Contract.findById(contractId).select('priceType').lean();

    if (!contract) {
      throw new Error('Contract not found');
    }

    if (contract.priceType !== 'fixed') {
      throw new Error('Milestones are only available for fixed price contracts');
    }

    const milestones = await Milestone.find({ contractId }).sort({ createdDate: 1 }).lean();

    // Calculate summary stats
    const stats = {
      total: milestones.length,
      pending: milestones.filter((m) => m.status === MilestoneStatus.PENDING).length,
      funded: milestones.filter((m) =>
        [MilestoneStatus.FUNDED, MilestoneStatus.FUNDED].includes(m.status),
      ).length,
      workSubmitted: milestones.filter((m) => m.status === MilestoneStatus.WORK_SUBMITTED).length,
      completed: milestones.filter((m) =>
        [MilestoneStatus.COMPLETED, MilestoneStatus.RELEASED, MilestoneStatus.RELEASED].includes(
          m.status,
        ),
      ).length,
      cancelled: milestones.filter((m) => m.status === MilestoneStatus.CANCELLED).length,
      totalAmount: milestones.reduce((sum, m) => sum + (m.amount || 0), 0),
      fundedAmount: milestones
        .filter((m) =>
          [
            MilestoneStatus.FUNDED,
            MilestoneStatus.FUNDED,
            MilestoneStatus.WORK_SUBMITTED,
            MilestoneStatus.COMPLETED,
            MilestoneStatus.RELEASED,
            MilestoneStatus.RELEASED,
          ].includes(m.status),
        )
        .reduce((sum, m) => sum + (m.amount || 0), 0),
      paidAmount: milestones
        .filter((m) =>
          [MilestoneStatus.COMPLETED, MilestoneStatus.RELEASED, MilestoneStatus.RELEASED].includes(
            m.status,
          ),
        )
        .reduce((sum, m) => sum + (m.amount || 0), 0),
    };

    return {
      items: milestones,
      stats,
    };
  }

  /**
   * Get timelogs for a contract (hourly contracts only)
   */
  async getContractTimelogs(contractId: string, query: { page?: number; limit?: number } = {}) {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const contract = await Contract.findById(contractId)
      .select('priceType hourlyProposedPrice weeklyLimit selectedCurrency')
      .lean();

    if (!contract) {
      throw new Error('Contract not found');
    }

    if (contract.priceType !== 'hourly') {
      throw new Error('Timelogs are only available for hourly contracts');
    }

    // Get all timelogs for this contract
    const [timelogs, total] = await Promise.all([
      TimelogEntry.find({ contractId }).sort({ workDate: -1 }).skip(skip).limit(limit).lean(),
      TimelogEntry.countDocuments({ contractId }),
    ]);

    // Get overall stats for the contract
    const allTimelogs = await TimelogEntry.find({ contractId }).lean();

    // Calculate current week info
    const now = new Date();
    const currentYear = now.getFullYear();
    const firstDayOfYear = new Date(currentYear, 0, 1);
    const pastDaysOfYear = (now.getTime() - firstDayOfYear.getTime()) / 86400000;
    const currentWeek = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);

    const thisWeekLogs = allTimelogs.filter(
      (t) => t.year === currentYear && t.weekNumber === currentWeek,
    );

    const stats = {
      hourlyRate: contract.hourlyProposedPrice || 0,
      weeklyLimit: contract.weeklyLimit || 40,
      currency: contract.selectedCurrency || 'MYR',
      thisWeek: {
        hours: thisWeekLogs.reduce((sum, t) => sum + (t.hoursWorked || 0), 0),
        billable: thisWeekLogs.reduce((sum, t) => sum + (t.billableAmount || 0), 0),
        entries: thisWeekLogs.length,
      },
      total: {
        hours: allTimelogs.reduce((sum, t) => sum + (t.hoursWorked || 0), 0),
        billable: allTimelogs.reduce((sum, t) => sum + (t.billableAmount || 0), 0),
        entries: allTimelogs.length,
        pending: allTimelogs.filter((t) => t.status === 'submitted').length,
        approved: allTimelogs.filter((t) => t.status === 'approved').length,
        paid: allTimelogs.filter((t) => t.status === 'paid').length,
        rejected: allTimelogs.filter((t) => t.status === 'rejected').length,
      },
    };

    return {
      items: timelogs,
      stats,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get transactions/financial history for a contract
   * Combines milestone payments and timelog payments into a unified transaction list
   */
  async getContractTransactions(contractId: string) {
    const contract = await Contract.findById(contractId)
      .select('priceType selectedCurrency proposedPrice hourlyProposedPrice')
      .lean();

    if (!contract) {
      throw new Error('Contract not found');
    }

    const transactions: ContractTransaction[] = [];

    if (contract.priceType === 'fixed') {
      // Get milestone-based transactions for fixed price contracts
      const milestones = await Milestone.find({ contractId }).sort({ createdDate: 1 }).lean();

      for (const m of milestones) {
        // Add funded transaction
        if (m.fundedDate) {
          transactions.push({
            id: `${m._id.toString()}-funded`,
            type: 'escrow',
            amount: m.amount,
            currency: m.currency || contract.selectedCurrency || 'MYR',
            description: `Escrow funded for: ${m.taskName}`,
            date: m.fundedDate,
            status: 'completed',
            referenceId: m._id.toString(),
            referenceType: 'milestone',
            referenceName: m.taskName,
          });
        }

        // Add released transaction
        if (m.releasedDate) {
          transactions.push({
            id: `${m._id.toString()}-released`,
            type: 'release',
            amount: m.amount,
            currency: m.currency || contract.selectedCurrency || 'MYR',
            description: `Payment released for: ${m.taskName}`,
            date: m.releasedDate,
            status: 'completed',
            referenceId: m._id.toString(),
            referenceType: 'milestone',
            referenceName: m.taskName,
          });
        }

        // Add cancelled/refund transaction
        if (m.status === MilestoneStatus.CANCELLED && m.fundedDate) {
          transactions.push({
            id: `${m._id.toString()}-refund`,
            type: 'refund',
            amount: m.amount,
            currency: m.currency || contract.selectedCurrency || 'MYR',
            description: `Refund for cancelled milestone: ${m.taskName}`,
            date: m.updatedDate || new Date(),
            status: 'completed',
            referenceId: m._id.toString(),
            referenceType: 'milestone',
            referenceName: m.taskName,
          });
        }
      }
    } else {
      // Get timelog-based transactions for hourly contracts
      const timelogs = await TimelogEntry.find({
        contractId,
        status: { $in: ['approved', 'paid'] },
      })
        .sort({ workDate: -1 })
        .lean();

      for (const t of timelogs) {
        if (t.status === 'paid' && t.paidDate) {
          transactions.push({
            id: `${t._id.toString()}-paid`,
            type: 'payment',
            amount: t.billableAmount,
            currency: t.currency || contract.selectedCurrency || 'MYR',
            description: `Payment for ${t.hoursWorked} hours on ${new Date(t.workDate).toLocaleDateString()}`,
            date: t.paidDate,
            status: 'completed',
            referenceId: t._id.toString(),
            referenceType: 'timelog',
            referenceName: t.description,
          });
        } else if (t.status === 'approved' && t.approvedDate) {
          transactions.push({
            id: `${t._id.toString()}-approved`,
            type: 'payment',
            amount: t.billableAmount,
            currency: t.currency || contract.selectedCurrency || 'MYR',
            description: `Approved: ${t.hoursWorked} hours on ${new Date(t.workDate).toLocaleDateString()}`,
            date: t.approvedDate,
            status: 'pending_payment',
            referenceId: t._id.toString(),
            referenceType: 'timelog',
            referenceName: t.description,
          });
        }
      }
    }

    // Sort transactions by date descending
    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Calculate summary
    const summary = {
      totalEscrow: transactions
        .filter((t) => t.type === 'escrow')
        .reduce((sum, t) => sum + t.amount, 0),
      totalReleased: transactions
        .filter((t) => t.type === 'release' || (t.type === 'payment' && t.status === 'completed'))
        .reduce((sum, t) => sum + t.amount, 0),
      totalRefunded: transactions
        .filter((t) => t.type === 'refund')
        .reduce((sum, t) => sum + t.amount, 0),
      totalPending: transactions
        .filter((t) => t.status === 'pending_payment')
        .reduce((sum, t) => sum + t.amount, 0),
      currency: contract.selectedCurrency || 'MYR',
    };

    return {
      items: transactions,
      summary,
    };
  }
}

export const adminContractService = new AdminContractService();
