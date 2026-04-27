import { Transaction, TransactionStatus, TransactionType } from '@core/models/Transaction';
import { User } from '@core/models/User';
import type {
  ListWithdrawalsQuery,
  SourceTypeValue,
  WithdrawalResponse,
  WithdrawalStatsResponse,
  WithdrawalStatusType,
} from '@core/schemas/admin/withdrawals';

/**
 * Map transaction status to withdrawal status
 */
function mapToWithdrawalStatus(status: TransactionStatus): WithdrawalStatusType {
  switch (status) {
    case TransactionStatus.PENDING:
      return 'pending';
    case TransactionStatus.PROCESSING:
      return 'in_transit';
    case TransactionStatus.SUCCEEDED:
      return 'paid';
    case TransactionStatus.FAILED:
      return 'failed';
    case TransactionStatus.CANCELLED:
      return 'canceled';
    default:
      return 'pending';
  }
}

/**
 * Admin Withdrawal Service
 *
 * Manages withdrawal transactions for admin panel.
 * Withdrawals are stored as Transaction with type='withdrawal'.
 */
export class AdminWithdrawalService {
  /**
   * List withdrawals with filtering and pagination
   */
  async list(query: ListWithdrawalsQuery): Promise<{
    items: WithdrawalResponse[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const {
      page = 1,
      limit = 20,
      status,
      search,
      dateFrom,
      dateTo,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    // Build filter - only withdrawal type transactions
    const filter: Record<string, unknown> = {
      type: TransactionType.WITHDRAWAL,
    };

    // Map withdrawal status to transaction status
    if (status) {
      switch (status) {
        case 'pending':
          filter.status = TransactionStatus.PENDING;
          break;
        case 'in_transit':
          filter.status = TransactionStatus.PROCESSING;
          break;
        case 'paid':
          filter.status = TransactionStatus.SUCCEEDED;
          break;
        case 'failed':
          filter.status = TransactionStatus.FAILED;
          break;
        case 'canceled':
          filter.status = TransactionStatus.CANCELLED;
          break;
      }
    }

    // Search by reference ID or description
    if (search) {
      filter.$or = [
        { referenceId: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // Date range filter
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) (filter.createdAt as Record<string, unknown>).$gte = new Date(dateFrom);
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        (filter.createdAt as Record<string, unknown>).$lte = endDate;
      }
    }

    // Build sort
    const sort: Record<string, 1 | -1> = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [items, total] = await Promise.all([
      Transaction.find(filter)
        .populate('hubId', 'name ownerId')
        .skip(skip)
        .limit(limit)
        .sort(sort)
        .lean(),
      Transaction.countDocuments(filter),
    ]);

    // Get unique owner IDs from hubs to fetch users
    const ownerIds = new Set<string>();
    for (const txn of items) {
      const hub = txn.hubId as { ownerId?: string } | undefined;
      if (hub?.ownerId) {
        ownerIds.add(hub.ownerId);
      }
    }

    // Fetch users by their firebaseId (ownerId is Firebase user ID)
    const users = await User.find({
      $or: [
        { firebaseId: { $in: Array.from(ownerIds) } },
        { firebaseUid: { $in: Array.from(ownerIds) } },
      ],
    })
      .select('firebaseId firebaseUid name email')
      .lean();

    // Create user lookup map
    const userMap = new Map<string, { _id: string; name: string; email: string }>();
    for (const user of users) {
      const key = user.firebaseId || user.firebaseUid;
      if (key) {
        userMap.set(key, {
          _id: String(user._id),
          name: user.name || '',
          email: user.email || '',
        });
      }
    }

    // Map transactions to withdrawal response format
    const withdrawals: WithdrawalResponse[] = items.map((txn) =>
      this.mapToWithdrawalResponse(txn, userMap),
    );

    return {
      items: withdrawals,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get withdrawal by ID
   */
  async getById(id: string): Promise<WithdrawalResponse> {
    const txn = await Transaction.findOne({
      _id: id,
      type: TransactionType.WITHDRAWAL,
    })
      .populate('hubId', 'name ownerId')
      .lean();

    if (!txn) {
      throw new Error('Withdrawal not found');
    }

    // Get user from hub's ownerId
    const hub = txn.hubId as { ownerId?: string } | undefined;
    const userMap = new Map<string, { _id: string; name: string; email: string }>();

    if (hub?.ownerId) {
      const user = await User.findOne({
        $or: [{ firebaseId: hub.ownerId }, { firebaseUid: hub.ownerId }],
      })
        .select('firebaseId firebaseUid name email')
        .lean();

      if (user) {
        const key = user.firebaseId || user.firebaseUid;
        if (key) {
          userMap.set(key, {
            _id: String(user._id),
            name: user.name || '',
            email: user.email || '',
          });
        }
      }
    }

    return this.mapToWithdrawalResponse(txn as Record<string, unknown>, userMap);
  }

  /**
   * Get withdrawal statistics
   */
  async getStats(): Promise<WithdrawalStatsResponse> {
    const [statusStats, totalStats] = await Promise.all([
      // Group by status
      Transaction.aggregate([
        { $match: { type: TransactionType.WITHDRAWAL } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            amount: { $sum: '$amount' },
          },
        },
      ]),
      // Get totals
      Transaction.aggregate([
        { $match: { type: TransactionType.WITHDRAWAL } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
            pendingAmount: {
              $sum: {
                $cond: [{ $eq: ['$status', TransactionStatus.PENDING] }, '$amount', 0],
              },
            },
            completedAmount: {
              $sum: {
                $cond: [{ $eq: ['$status', TransactionStatus.SUCCEEDED] }, '$amount', 0],
              },
            },
          },
        },
      ]),
    ]);

    // Build status counts
    const byStatus: Record<WithdrawalStatusType, number> = {
      pending: 0,
      in_transit: 0,
      paid: 0,
      failed: 0,
      canceled: 0,
    };

    for (const stat of statusStats) {
      const withdrawalStatus = mapToWithdrawalStatus(stat._id as TransactionStatus);
      byStatus[withdrawalStatus] = stat.count;
    }

    // Build source type counts (default to bank_transfer since that's the only type now)
    const bySourceType: Record<SourceTypeValue, number> = {
      card: 0,
      fpx: 0,
      bank_transfer: totalStats[0]?.total || 0,
    };

    return {
      total: totalStats[0]?.total || 0,
      totalAmount: totalStats[0]?.totalAmount || 0,
      pendingAmount: totalStats[0]?.pendingAmount || 0,
      completedAmount: totalStats[0]?.completedAmount || 0,
      byStatus,
      bySourceType,
      currency: 'MYR', // Default currency
    };
  }

  /**
   * Approve withdrawal (mark as processing/in_transit)
   */
  async approve(id: string, adminId: string, note?: string): Promise<WithdrawalResponse> {
    const txn = await Transaction.findOneAndUpdate(
      {
        _id: id,
        type: TransactionType.WITHDRAWAL,
        status: TransactionStatus.PENDING,
      },
      {
        status: TransactionStatus.PROCESSING,
        notes: note,
        processedBy: adminId,
        updatedAt: new Date(),
      },
      { new: true },
    )
      .populate('hubId', 'name ownerId')
      .lean();

    if (!txn) {
      throw new Error('Withdrawal not found or already processed');
    }

    // Get user from hub's ownerId
    const hub = txn.hubId as { ownerId?: string } | undefined;
    const userMap = new Map<string, { _id: string; name: string; email: string }>();

    if (hub?.ownerId) {
      const user = await User.findOne({
        $or: [{ firebaseId: hub.ownerId }, { firebaseUid: hub.ownerId }],
      })
        .select('firebaseId firebaseUid name email')
        .lean();

      if (user) {
        const key = user.firebaseId || user.firebaseUid;
        if (key) {
          userMap.set(key, {
            _id: String(user._id),
            name: user.name || '',
            email: user.email || '',
          });
        }
      }
    }

    return this.mapToWithdrawalResponse(txn as Record<string, unknown>, userMap);
  }

  /**
   * Reject withdrawal (mark as failed/canceled)
   */
  async reject(id: string, adminId: string, reason: string): Promise<WithdrawalResponse> {
    const txn = await Transaction.findOneAndUpdate(
      {
        _id: id,
        type: TransactionType.WITHDRAWAL,
        status: TransactionStatus.PENDING,
      },
      {
        status: TransactionStatus.FAILED,
        errorMessage: reason,
        processedBy: adminId,
        updatedAt: new Date(),
      },
      { new: true },
    )
      .populate('hubId', 'name ownerId')
      .lean();

    if (!txn) {
      throw new Error('Withdrawal not found or already processed');
    }

    // Get user from hub's ownerId
    const hub = txn.hubId as { ownerId?: string } | undefined;
    const userMap = new Map<string, { _id: string; name: string; email: string }>();

    if (hub?.ownerId) {
      const user = await User.findOne({
        $or: [{ firebaseId: hub.ownerId }, { firebaseUid: hub.ownerId }],
      })
        .select('firebaseId firebaseUid name email')
        .lean();

      if (user) {
        const key = user.firebaseId || user.firebaseUid;
        if (key) {
          userMap.set(key, {
            _id: String(user._id),
            name: user.name || '',
            email: user.email || '',
          });
        }
      }
    }

    return this.mapToWithdrawalResponse(txn as Record<string, unknown>, userMap);
  }

  /**
   * Map transaction to withdrawal response format
   */
  private mapToWithdrawalResponse(
    txn: Record<string, unknown>,
    userMap?: Map<string, { _id: string; name: string; email: string }>,
  ): WithdrawalResponse {
    const hub = txn.hubId as { _id: string; name?: string; ownerId?: string } | undefined;

    // Get user from userMap using hub's ownerId
    let user: { _id: string; name: string; email: string } | undefined;
    if (hub?.ownerId && userMap) {
      user = userMap.get(hub.ownerId);
    }

    return {
      _id: String(txn._id),
      userId: user?._id || '',
      stripeAccountId: txn.stripeAccountId as string | undefined,
      stripePayoutId: txn.stripePayoutId as string | undefined,
      amount: txn.amount as number,
      currency: (txn.currency as string) || 'MYR',
      bankAccountId: txn.metadata
        ? ((txn.metadata as Record<string, unknown>).bankAccountId as string)
        : undefined,
      sourceType: 'bank_transfer',
      status: mapToWithdrawalStatus(txn.status as TransactionStatus),
      description: txn.description as string | undefined,
      requestedBy: user?._id,
      approvedBy: txn.processedBy ? String(txn.processedBy) : undefined,
      arrivalDate: txn.transferredAt
        ? new Date(txn.transferredAt as string).toISOString()
        : undefined,
      completedDate:
        txn.status === TransactionStatus.SUCCEEDED
          ? new Date(txn.updatedAt as string).toISOString()
          : undefined,
      createdAt: new Date(txn.createdAt as string).toISOString(),
      updatedAt: new Date(txn.updatedAt as string).toISOString(),
      user: user,
      hub: hub
        ? {
            _id: String(hub._id),
            name: hub.name || '',
          }
        : undefined,
      bankAccount: txn.metadata
        ? {
            bankName: ((txn.metadata as Record<string, unknown>).bankName as string) || '',
            accountNumber:
              ((txn.metadata as Record<string, unknown>).accountNumber as string) || '',
            accountHolderName:
              ((txn.metadata as Record<string, unknown>).accountHolderName as string) || '',
          }
        : undefined,
    };
  }
}

export const adminWithdrawalService = new AdminWithdrawalService();
