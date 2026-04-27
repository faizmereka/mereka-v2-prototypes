import {
  ContractPayment,
  type ContractPaymentStatus,
  type ContractPaymentType,
} from '@core/models/ContractPayment';
import type { PipelineStage } from 'mongoose';

export interface AdminListContractPaymentsQuery {
  page?: number;
  limit?: number;
  status?: ContractPaymentStatus;
  paymentType?: ContractPaymentType;
  search?: string;
  contractId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ContractPaymentStats {
  total: number;
  byStatus: {
    pending: number;
    funded: number;
    processing: number;
    released: number;
    refunded: number;
    failed: number;
    cancelled: number;
  };
  byType: {
    milestone: number;
    timelog: number;
  };
  totalAmount: number;
  totalFunded: number;
  totalReleased: number;
  totalPlatformFees: number;
  totalTransferred: number;
  currency: string;
}

export class AdminContractPaymentService {
  /**
   * List contract payments with filtering and pagination
   */
  async listContractPayments(query: AdminListContractPaymentsQuery) {
    const {
      page = 1,
      limit = 20,
      status,
      paymentType,
      search,
      contractId,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    // Build match filter
    const matchFilter: Record<string, unknown> = {};
    if (status) matchFilter.status = status;
    if (paymentType) matchFilter.paymentType = paymentType;
    if (contractId) matchFilter.contractId = contractId;

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
            // Lookup contract details
            {
              $lookup: {
                from: 'contracts',
                localField: 'contractId',
                foreignField: '_id',
                pipeline: [{ $project: { contractTitle: 1, priceType: 1, status: 1 } }],
                as: 'contractData',
              },
            },
            // Lookup job details
            {
              $lookup: {
                from: 'jobs',
                localField: 'jobId',
                foreignField: '_id',
                pipeline: [{ $project: { jobTitle: 1, status: 1 } }],
                as: 'jobData',
              },
            },
            // Lookup expert details
            {
              $lookup: {
                from: 'users',
                localField: 'expertId',
                foreignField: '_id',
                pipeline: [{ $project: { name: 1, email: 1, profilePhoto: 1 } }],
                as: 'expertData',
              },
            },
            // Lookup client details
            {
              $lookup: {
                from: 'users',
                localField: 'clientId',
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
            // Lookup milestone details for milestone payments
            {
              $lookup: {
                from: 'milestones',
                localField: 'milestoneId',
                foreignField: '_id',
                pipeline: [{ $project: { taskName: 1, description: 1, status: 1 } }],
                as: 'milestoneData',
              },
            },
            // Add contract title fallback
            {
              $addFields: {
                contractInfo: { $arrayElemAt: ['$contractData', 0] },
                jobInfo: { $arrayElemAt: ['$jobData', 0] },
              },
            },
            // Project final shape
            {
              $project: {
                _id: 1,
                paymentType: 1,
                contractId: 1,
                jobId: 1,
                hubId: 1,
                clientId: 1,
                expertId: 1,
                milestoneId: 1,
                amount: 1,
                currency: 1,
                platformFee: 1,
                stripeFee: 1,
                transferAmount: 1,
                status: 1,
                escrowStatus: 1,
                // Timelog fields
                hoursWorked: 1,
                weekNumber: 1,
                year: 1,
                weekStartDate: 1,
                weekEndDate: 1,
                // Dates
                fundedDate: 1,
                releasedDate: 1,
                refundedDate: 1,
                createdAt: 1,
                updatedAt: 1,
                // Error info
                errorCode: 1,
                errorMessage: 1,
                retryCount: 1,
                // Lookups with fallback for missing contract title
                contract: {
                  _id: '$contractInfo._id',
                  contractTitle: {
                    $ifNull: [
                      '$contractInfo.contractTitle',
                      { $ifNull: ['$jobInfo.jobTitle', 'Untitled Contract'] },
                    ],
                  },
                  priceType: '$contractInfo.priceType',
                  status: '$contractInfo.status',
                },
                job: { $arrayElemAt: ['$jobData', 0] },
                expert: { $arrayElemAt: ['$expertData', 0] },
                client: { $arrayElemAt: ['$clientData', 0] },
                hub: { $arrayElemAt: ['$hubData', 0] },
                milestone: { $arrayElemAt: ['$milestoneData', 0] },
              },
            },
          ],
        },
      },
    ];

    // Add search filter after lookups if search is provided
    if (search) {
      const searchPipeline: PipelineStage[] = [
        { $match: matchFilter },
        // Same lookups as above
        {
          $lookup: {
            from: 'contracts',
            localField: 'contractId',
            foreignField: '_id',
            pipeline: [{ $project: { contractTitle: 1 } }],
            as: 'contractData',
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'expertId',
            foreignField: '_id',
            pipeline: [{ $project: { name: 1, email: 1 } }],
            as: 'expertData',
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'clientId',
            foreignField: '_id',
            pipeline: [{ $project: { name: 1, email: 1 } }],
            as: 'clientData',
          },
        },
        {
          $addFields: {
            contract: { $arrayElemAt: ['$contractData', 0] },
            expert: { $arrayElemAt: ['$expertData', 0] },
            client: { $arrayElemAt: ['$clientData', 0] },
          },
        },
        {
          $match: {
            $or: [
              { 'contract.contractTitle': { $regex: search, $options: 'i' } },
              { 'expert.name': { $regex: search, $options: 'i' } },
              { 'client.name': { $regex: search, $options: 'i' } },
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
              // Continue with remaining lookups
              {
                $lookup: {
                  from: 'jobs',
                  localField: 'jobId',
                  foreignField: '_id',
                  pipeline: [{ $project: { jobTitle: 1, status: 1 } }],
                  as: 'jobData',
                },
              },
              {
                $lookup: {
                  from: 'hubs',
                  localField: 'hubId',
                  foreignField: '_id',
                  pipeline: [{ $project: { name: 1, logo: 1 } }],
                  as: 'hubData',
                },
              },
              {
                $lookup: {
                  from: 'milestones',
                  localField: 'milestoneId',
                  foreignField: '_id',
                  pipeline: [{ $project: { taskName: 1, description: 1, status: 1 } }],
                  as: 'milestoneData',
                },
              },
              // Add job info for fallback title
              {
                $addFields: {
                  jobInfo: { $arrayElemAt: ['$jobData', 0] },
                },
              },
              {
                $project: {
                  _id: 1,
                  paymentType: 1,
                  contractId: 1,
                  jobId: 1,
                  hubId: 1,
                  clientId: 1,
                  expertId: 1,
                  milestoneId: 1,
                  amount: 1,
                  currency: 1,
                  platformFee: 1,
                  stripeFee: 1,
                  transferAmount: 1,
                  status: 1,
                  escrowStatus: 1,
                  hoursWorked: 1,
                  weekNumber: 1,
                  year: 1,
                  weekStartDate: 1,
                  weekEndDate: 1,
                  fundedDate: 1,
                  releasedDate: 1,
                  refundedDate: 1,
                  createdAt: 1,
                  updatedAt: 1,
                  errorCode: 1,
                  errorMessage: 1,
                  retryCount: 1,
                  // Contract with fallback title
                  contract: {
                    _id: '$contract._id',
                    contractTitle: {
                      $ifNull: [
                        '$contract.contractTitle',
                        { $ifNull: ['$jobInfo.jobTitle', 'Untitled Contract'] },
                      ],
                    },
                    priceType: '$contract.priceType',
                    status: '$contract.status',
                  },
                  expert: 1,
                  client: 1,
                  job: { $arrayElemAt: ['$jobData', 0] },
                  hub: { $arrayElemAt: ['$hubData', 0] },
                  milestone: { $arrayElemAt: ['$milestoneData', 0] },
                },
              },
            ],
          },
        },
      ];

      const [result] = await ContractPayment.aggregate(searchPipeline);
      const total = result.totalCount[0]?.count || 0;
      const payments = result.data || [];

      return {
        items: payments,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    }

    // Execute aggregation
    const [result] = await ContractPayment.aggregate(pipeline);

    const total = result.totalCount[0]?.count || 0;
    const payments = result.data || [];

    return {
      items: payments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get contract payment stats
   */
  async getContractPaymentStats(): Promise<ContractPaymentStats> {
    const stats = await ContractPayment.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          // By status
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          funded: { $sum: { $cond: [{ $eq: ['$status', 'funded'] }, 1, 0] } },
          processing: { $sum: { $cond: [{ $eq: ['$status', 'processing'] }, 1, 0] } },
          released: { $sum: { $cond: [{ $eq: ['$status', 'released'] }, 1, 0] } },
          refunded: { $sum: { $cond: [{ $eq: ['$status', 'refunded'] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          // By type
          milestone: { $sum: { $cond: [{ $eq: ['$paymentType', 'milestone'] }, 1, 0] } },
          timelog: { $sum: { $cond: [{ $eq: ['$paymentType', 'timelog'] }, 1, 0] } },
          // Amounts
          totalAmount: { $sum: '$amount' },
          totalFunded: {
            $sum: {
              $cond: [{ $in: ['$status', ['funded', 'released']] }, '$amount', 0],
            },
          },
          totalReleased: {
            $sum: { $cond: [{ $eq: ['$status', 'released'] }, '$amount', 0] },
          },
          totalPlatformFees: {
            $sum: { $cond: [{ $eq: ['$status', 'released'] }, '$platformFee', 0] },
          },
          totalTransferred: {
            $sum: { $cond: [{ $eq: ['$status', 'released'] }, '$transferAmount', 0] },
          },
        },
      },
    ]);

    if (stats.length === 0) {
      return {
        total: 0,
        byStatus: {
          pending: 0,
          funded: 0,
          processing: 0,
          released: 0,
          refunded: 0,
          failed: 0,
          cancelled: 0,
        },
        byType: {
          milestone: 0,
          timelog: 0,
        },
        totalAmount: 0,
        totalFunded: 0,
        totalReleased: 0,
        totalPlatformFees: 0,
        totalTransferred: 0,
        currency: 'MYR',
      };
    }

    const s = stats[0];
    return {
      total: s.total,
      byStatus: {
        pending: s.pending,
        funded: s.funded,
        processing: s.processing,
        released: s.released,
        refunded: s.refunded,
        failed: s.failed,
        cancelled: s.cancelled,
      },
      byType: {
        milestone: s.milestone,
        timelog: s.timelog,
      },
      totalAmount: s.totalAmount,
      totalFunded: s.totalFunded,
      totalReleased: s.totalReleased,
      totalPlatformFees: s.totalPlatformFees,
      totalTransferred: s.totalTransferred,
      currency: 'MYR',
    };
  }

  /**
   * Get contract payment by ID
   */
  async getContractPaymentById(id: string) {
    const payment = await ContractPayment.findById(id)
      .populate('contractId', 'contractTitle priceType status')
      .populate('jobId', 'jobTitle status')
      .populate('expertId', 'name email profilePhoto')
      .populate('clientId', 'name email profilePhoto')
      .populate('hubId', 'name logo')
      .populate('milestoneId', 'taskName description status amount')
      .lean();

    if (!payment) {
      throw new Error('Contract payment not found');
    }

    return payment;
  }
}

export const adminContractPaymentService = new AdminContractPaymentService();
