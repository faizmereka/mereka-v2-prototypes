import { Contract } from '@core/models/Contract';
import { TimelogEntry, TimelogStatus } from '@core/models/TimelogEntry';
import type {
  HubApproveTimelogInput,
  HubCreateTimelogInput,
  HubGetTimelogsQuery,
  HubGetWeeklySummaryQuery,
  HubRejectTimelogInput,
  HubUpdateTimelogInput,
} from '@schemas/hub';
import mongoose from 'mongoose';
import { hubContractNotificationService } from '../contracts/hubContractNotification.service';

export class HubTimelogService {
  /**
   * Create a new timelog entry
   */
  async createTimelog(data: HubCreateTimelogInput, userId: string) {
    // Verify contract exists
    const contract = await Contract.findById(data.contractId);
    if (!contract) {
      throw new Error('Contract not found');
    }

    // Verify contract is hourly
    if (contract.priceType !== 'hourly') {
      throw new Error('Timelog entries are only for hourly contracts');
    }

    // Verify user is the assigned expert
    if (contract.asssignedExpertId.toString() !== userId) {
      throw new Error('Only the assigned expert can create timelog entries');
    }

    // Check for duplicate entry (same contract, expertHub, and workDate)
    const existing = await TimelogEntry.findOne({
      contractId: data.contractId,
      expertHubId: contract.expertHubId,
      workDate: data.workDate,
    });

    if (existing) {
      throw new Error('A timelog entry already exists for this date');
    }

    // Create timelog entry
    const timelog = await TimelogEntry.create({
      ...data,
      jobId: contract.jobId,
      clientHubId: contract.clientHubId,
      expertHubId: contract.expertHubId,
      hourlyRate: contract.hourlyProposedPrice || 0,
      weeklyLimit: contract.weeklyLimit || 40,
      currency: contract.selectedCurrency,
      status: TimelogStatus.DRAFT,
      tasks: data.tasks || [],
      createdBy: new mongoose.Types.ObjectId(userId),
    });

    return timelog;
  }

  /**
   * Get timelogs with filters
   */
  async getTimelogs(filters: HubGetTimelogsQuery) {
    const {
      contractId,
      expertId, // Maps to expertHubId for backwards compatibility
      status,
      year,
      weekNumber,
      monthNumber,
      page = 1,
      limit = 20,
    } = filters;

    const query: Record<string, unknown> = {};

    if (contractId) query.contractId = contractId;
    if (expertId) query.expertHubId = expertId; // Use expertHubId instead
    if (status) query.status = status;
    if (year) query.year = year;
    if (weekNumber) query.weekNumber = weekNumber;
    if (monthNumber) query.monthNumber = monthNumber;

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      TimelogEntry.find(query).sort({ workDate: -1 }).skip(skip).limit(limit).lean(),
      TimelogEntry.countDocuments(query),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get timelog by ID
   */
  async getTimelogById(timelogId: string) {
    const timelog = await TimelogEntry.findById(timelogId).lean();

    if (!timelog) {
      throw new Error('Timelog entry not found');
    }

    return timelog;
  }

  /**
   * Update timelog entry (only if draft)
   */
  async updateTimelog(timelogId: string, data: HubUpdateTimelogInput, userId: string) {
    const timelog = await TimelogEntry.findById(timelogId);

    if (!timelog) {
      throw new Error('Timelog entry not found');
    }

    // Verify user is the assigned expert via contract
    const contract = await Contract.findById(timelog.contractId);
    if (!contract || contract.asssignedExpertId.toString() !== userId) {
      throw new Error('Not authorized to update this timelog entry');
    }

    // Check if timelog can be edited (only DRAFT status)
    if (timelog.status !== TimelogStatus.DRAFT) {
      throw new Error('Only draft timelog entries can be edited');
    }

    // Update allowed fields
    if (data.startTime) timelog.startTime = data.startTime;
    if (data.endTime) timelog.endTime = data.endTime;
    if (data.breakDuration !== undefined) timelog.breakDuration = data.breakDuration;
    if (data.description) timelog.description = data.description;
    if (data.tasks) timelog.tasks = data.tasks;

    // hoursWorked and billableAmount will be recalculated by pre-save hook

    await timelog.save();

    return timelog;
  }

  /**
   * Delete timelog entry (only if draft)
   */
  async deleteTimelog(timelogId: string, userId: string) {
    const timelog = await TimelogEntry.findById(timelogId);

    if (!timelog) {
      throw new Error('Timelog entry not found');
    }

    // Verify user is the assigned expert via contract
    const contract = await Contract.findById(timelog.contractId);
    if (!contract || contract.asssignedExpertId.toString() !== userId) {
      throw new Error('Not authorized to delete this timelog entry');
    }

    // Check if timelog can be deleted (only DRAFT status)
    if (timelog.status !== TimelogStatus.DRAFT) {
      throw new Error('Only draft timelog entries can be deleted');
    }

    await TimelogEntry.deleteOne({ _id: timelogId });

    return { success: true, message: 'Timelog entry deleted successfully' };
  }

  /**
   * Submit timelog entry for client approval
   */
  async submitTimelog(timelogId: string, userId: string) {
    const timelog = await TimelogEntry.findById(timelogId);

    if (!timelog) {
      throw new Error('Timelog entry not found');
    }

    // Verify user is the assigned expert via contract
    const contract = await Contract.findById(timelog.contractId);
    if (!contract || contract.asssignedExpertId.toString() !== userId) {
      throw new Error('Not authorized to submit this timelog entry');
    }

    // Check if timelog can be submitted (only DRAFT status)
    if (timelog.status !== TimelogStatus.DRAFT) {
      throw new Error('Only draft timelog entries can be submitted');
    }

    // Check weekly limit before submission
    const weeklyCheck = await TimelogEntry.checkWeeklyLimit(
      timelog.contractId.toString(),
      timelog.year,
      timelog.weekNumber,
      timelog.weeklyLimit,
    );

    if (weeklyCheck.isExceeded) {
      throw new Error(
        `Weekly limit exceeded. Total hours: ${weeklyCheck.total}, Limit: ${timelog.weeklyLimit}`,
      );
    }

    timelog.status = TimelogStatus.SUBMITTED;
    timelog.submittedDate = new Date();

    await timelog.save();

    // Notify client about timelog submission
    await hubContractNotificationService.notifyTimelogSubmitted(timelogId);

    return timelog;
  }

  /**
   * Approve timelog entry and process payment
   */
  async approveTimelog(timelogId: string, data: HubApproveTimelogInput, userId: string) {
    const timelog = await TimelogEntry.findById(timelogId);

    if (!timelog) {
      throw new Error('Timelog entry not found');
    }

    // Verify user is the client via contract
    const contract = await Contract.findById(timelog.contractId);
    if (!contract || contract.createdBy.toString() !== userId) {
      throw new Error('Only the client can approve timelog entries');
    }

    // Check if timelog can be approved (only SUBMITTED status)
    if (timelog.status !== TimelogStatus.SUBMITTED) {
      throw new Error('Only submitted timelog entries can be approved');
    }

    timelog.status = TimelogStatus.APPROVED;
    timelog.approvedDate = new Date();

    if (data.paymentIntentId) {
      timelog.paymentIntentId = data.paymentIntentId;
    }

    await timelog.save();

    // Notify expert that timelog has been approved
    await hubContractNotificationService.notifyTimelogApproved(timelogId);

    // TODO: Process payment through Stripe here
    // This would involve creating payment intent, charging client, transferring to expert

    return timelog;
  }

  /**
   * Reject timelog entry with reason
   */
  async rejectTimelog(timelogId: string, data: HubRejectTimelogInput, userId: string) {
    const timelog = await TimelogEntry.findById(timelogId);

    if (!timelog) {
      throw new Error('Timelog entry not found');
    }

    // Verify user is the client via contract
    const contract = await Contract.findById(timelog.contractId);
    if (!contract || contract.createdBy.toString() !== userId) {
      throw new Error('Only the client can reject timelog entries');
    }

    // Check if timelog can be rejected (only SUBMITTED status)
    if (timelog.status !== TimelogStatus.SUBMITTED) {
      throw new Error('Only submitted timelog entries can be rejected');
    }

    timelog.status = TimelogStatus.REJECTED;
    timelog.rejectedDate = new Date();
    timelog.rejectionReason = data.reason;

    await timelog.save();

    // Notify expert that timelog has been rejected
    await hubContractNotificationService.notifyTimelogRejected(timelogId, data.reason);

    return timelog;
  }

  /**
   * Get weekly summary for a contract
   */
  async getWeeklySummary(filters: HubGetWeeklySummaryQuery) {
    const { contractId, year, weekNumber } = filters;

    // Get all timelog entries for this week
    const timelogs = await TimelogEntry.findByWeek(contractId, year, weekNumber);

    // Calculate totals
    const totalHours = timelogs.reduce((sum, log) => sum + log.hoursWorked, 0);
    const totalAmount = timelogs.reduce((sum, log) => sum + log.billableAmount, 0);

    // Group by status
    const byStatus = {
      draft: timelogs.filter((log) => log.status === TimelogStatus.DRAFT).length,
      submitted: timelogs.filter((log) => log.status === TimelogStatus.SUBMITTED).length,
      approved: timelogs.filter((log) => log.status === TimelogStatus.APPROVED).length,
      rejected: timelogs.filter((log) => log.status === TimelogStatus.REJECTED).length,
      paid: timelogs.filter((log) => log.status === TimelogStatus.PAID).length,
    };

    // Get weekly limit from first timelog (they all have the same limit)
    const weeklyLimit = timelogs[0]?.weeklyLimit || 40;

    return {
      contractId,
      year,
      weekNumber,
      totalHours,
      totalAmount,
      weeklyLimit,
      isOverLimit: totalHours > weeklyLimit,
      remainingHours: Math.max(0, weeklyLimit - totalHours),
      entriesCount: timelogs.length,
      byStatus,
      entries: timelogs,
    };
  }

  /**
   * Get weekly total hours
   */
  async getWeeklyTotal(contractId: string, year: number, weekNumber: number): Promise<number> {
    const total = await TimelogEntry.calculateWeeklyTotal(contractId, year, weekNumber);
    return total;
  }

  /**
   * Check if adding hours would exceed weekly limit
   */
  async checkWeeklyLimit(
    contractId: string,
    year: number,
    weekNumber: number,
    weeklyLimit: number,
  ) {
    const result = await TimelogEntry.checkWeeklyLimit(contractId, year, weekNumber, weeklyLimit);
    return result;
  }

  // ============================================================
  // Cron Job Methods - Used by payment processing jobs
  // ============================================================

  /**
   * Get approved timelogs that haven't been paid yet within a date range
   * Used by weeklyPayoutProcessor cron job
   */
  async getApprovedUnpaidTimelogs(startDate: Date, endDate: Date) {
    const timelogs = await TimelogEntry.find({
      createdAt: {
        $gte: startDate,
        $lte: endDate,
      },
      status: TimelogStatus.APPROVED,
      paymentStatus: { $ne: 'paid' },
    }).lean();

    return timelogs;
  }

  /**
   * Mark timelogs as paid after successful payment processing
   * Used by weeklyPayoutProcessor and retryPendingPayments cron jobs
   */
  async markTimelogsAsPaid(timelogIds: string[], paymentIntentId: string): Promise<void> {
    await TimelogEntry.updateMany(
      { _id: { $in: timelogIds } },
      {
        $set: {
          paymentStatus: 'paid',
          paymentIntentId,
          status: TimelogStatus.PAID,
          paidDate: new Date(),
        },
      },
    );
  }

  /**
   * Get timelogs by IDs
   * Used for verifying timelog records before payment processing
   */
  async getTimelogsByIds(timelogIds: string[]) {
    const timelogs = await TimelogEntry.find({
      _id: { $in: timelogIds },
    }).lean();

    return timelogs;
  }
}

export const hubTimelogService = new HubTimelogService();
