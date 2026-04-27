import { ChatEventType } from '@core/models/ChatMessage';
import { Contract } from '@core/models/Contract';
import { ContractPayment, ContractPaymentType } from '@core/models/ContractPayment';
import { Hub } from '@core/models/Hub';
import { Milestone, MilestoneStatus } from '@core/models/Milestone';
import { User } from '@core/models/User';
import { chatEventService } from '@core/services/shared/chat';
import {
  type StripeRegion,
  StripeServiceFactory,
} from '@core/services/shared/payments/stripeFactory.service';
import { getStripeRegion } from '@core/utils/stripe-region';
import type {
  HubApproveMilestoneInput,
  HubCreateMilestoneInput,
  HubCreateMultipleMilestonesInput,
  HubGetMilestonesQuery,
  HubGetOverdueMilestonesQuery,
  HubGetUpcomingMilestonesQuery,
  HubSubmitWorkInput,
  HubUpdateMilestoneInput,
  HubUpdateMilestoneWithTrackingInput,
} from '@schemas/hub';
import mongoose from 'mongoose';
import { hubContractNotificationService } from '../contracts/hubContractNotification.service';

export class HubMilestoneService {
  /**
   * Get regional Stripe service based on expert's hub or user location
   * Used for multi-region Stripe support (Malaysia vs Atlas)
   */
  private async getRegionalStripeService(contract: {
    expertHubId?: mongoose.Types.ObjectId | null;
    asssignedExpertId?: mongoose.Types.ObjectId | null;
  }): Promise<{
    stripeService: ReturnType<typeof StripeServiceFactory.getService>;
    region: StripeRegion;
  }> {
    let region: StripeRegion = 'atlas';

    // First check expert's hub
    if (contract.expertHubId) {
      const expertHub = await Hub.findById(contract.expertHubId)
        .select('stripeRegion location')
        .lean();

      if (expertHub?.stripeRegion === 'malaysia' || expertHub?.stripeRegion === 'atlas') {
        region = expertHub.stripeRegion;
      } else if (expertHub?.location?.country) {
        region = getStripeRegion(expertHub.location.country);
      }
    } else if (contract.asssignedExpertId) {
      // Fall back to expert's own region
      const expert = await User.findById(contract.asssignedExpertId)
        .select('stripeRegion location')
        .lean();

      if (expert?.stripeRegion === 'malaysia' || expert?.stripeRegion === 'atlas') {
        region = expert.stripeRegion;
      } else if (expert?.location?.country) {
        region = getStripeRegion(expert.location.country);
      }
    }

    return {
      stripeService: StripeServiceFactory.getService(region),
      region,
    };
  }

  /**
   * Create a single milestone
   */
  async createMilestone(data: HubCreateMilestoneInput, userId: string) {
    const milestone = await Milestone.create({
      ...data,
      createdBy: new mongoose.Types.ObjectId(userId),
      status: data.status || MilestoneStatus.PENDING,
    });

    // @spec: messaging-events_spec.md
    // @covers AC-EV-030, AC-EV-033, AC-EV-034
    // Create milestone created event (non-blocking)
    if (milestone.contractId) {
      void chatEventService.createMilestoneEvent({
        milestoneId: milestone._id as mongoose.Types.ObjectId,
        contractId: milestone.contractId,
        eventType: ChatEventType.MILESTONE_CREATED,
        summary: `Milestone created: ${milestone.taskName}`,
        data: {
          milestoneId: (milestone._id as mongoose.Types.ObjectId).toString(),
          contractId: milestone.contractId.toString(),
          title: milestone.taskName,
          amount: milestone.amount,
        },
      });
    }

    return milestone;
  }

  /**
   * Create multiple milestones (bulk)
   */
  async createMultipleMilestones(data: HubCreateMultipleMilestonesInput, userId: string) {
    const milestones = data.milestones.map((m) => ({
      ...m,
      createdBy: new mongoose.Types.ObjectId(userId),
      status: MilestoneStatus.PENDING,
    }));

    const created = await Milestone.insertMany(milestones);

    return created;
  }

  /**
   * Get milestones with filters
   */
  async getMilestones(filters: HubGetMilestonesQuery) {
    const { jobProposalId, contractId, jobId, status, page = 1, limit = 20 } = filters;

    const query: Record<string, unknown> = {};

    if (jobProposalId) query.jobProposalId = jobProposalId;
    if (contractId) query.contractId = contractId;
    if (jobId) query.jobId = jobId;
    if (status) query.status = status;

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Milestone.find(query).sort({ createdDate: 1 }).skip(skip).limit(limit).lean(),
      Milestone.countDocuments(query),
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
   * Get milestone by ID
   */
  async getMilestoneById(milestoneId: string) {
    const milestone = await Milestone.findById(milestoneId).lean();

    if (!milestone) {
      throw new Error('Milestone not found');
    }

    return milestone;
  }

  /**
   * Update milestone (simple update without change tracking)
   */
  async updateMilestone(milestoneId: string, data: HubUpdateMilestoneInput, userId: string) {
    const milestone = await Milestone.findById(milestoneId);

    if (!milestone) {
      throw new Error('Milestone not found');
    }

    // Check if milestone can be edited (pending, active, or work_submitted)
    if (
      milestone.status !== MilestoneStatus.PENDING &&
      milestone.status !== MilestoneStatus.FUNDED &&
      milestone.status !== MilestoneStatus.WORK_SUBMITTED
    ) {
      throw new Error('Milestone cannot be edited');
    }

    // Update allowed fields
    if (data.taskName) milestone.taskName = data.taskName;
    if (data.taskDescription !== undefined) milestone.taskDescription = data.taskDescription;
    if (data.amount !== undefined) milestone.amount = data.amount;
    if (data.dueDate) milestone.dueDate = new Date(data.dueDate);
    if (data.status) milestone.status = data.status;
    if (data.workLogDescription !== undefined)
      milestone.workLogDescription = data.workLogDescription;
    if (data.workLogFilesUrl) milestone.workLogFilesUrl = data.workLogFilesUrl;
    if (data.workSubmittedDate) milestone.workSubmittedDate = new Date(data.workSubmittedDate);
    if (data.paymentIntentId) milestone.paymentIntentId = data.paymentIntentId;
    if (data.contractId) milestone.contractId = new mongoose.Types.ObjectId(data.contractId);

    milestone.lastModifiedBy = new mongoose.Types.ObjectId(userId);
    milestone.lastModifiedDate = new Date();

    await milestone.save();

    return milestone;
  }

  /**
   * Update milestone with change tracking
   */
  async updateMilestoneWithTracking(
    milestoneId: string,
    data: HubUpdateMilestoneWithTrackingInput,
    userId: string,
  ) {
    const milestone = await Milestone.findById(milestoneId);

    if (!milestone) {
      throw new Error('Milestone not found');
    }

    // Check if milestone can be edited (pending, active, or work_submitted)
    if (
      milestone.status !== MilestoneStatus.PENDING &&
      milestone.status !== MilestoneStatus.FUNDED &&
      milestone.status !== MilestoneStatus.WORK_SUBMITTED
    ) {
      throw new Error('Milestone cannot be edited');
    }

    // Save old values
    milestone.oldValues = {
      taskName: milestone.taskName,
      taskDescription: milestone.taskDescription,
      amount: milestone.amount,
      dueDate: milestone.dueDate,
      workLogDescription: milestone.workLogDescription,
    };

    // Track changes
    if (!milestone.changeHistory) {
      milestone.changeHistory = [];
    }

    const changes: Array<{
      fieldName: string;
      oldValue: unknown;
      newValue: unknown;
      changedBy: mongoose.Types.ObjectId;
      changedDate: Date;
      changeReason?: string;
    }> = [];

    if (data.taskName && data.taskName !== milestone.taskName) {
      changes.push({
        fieldName: 'taskName',
        oldValue: milestone.taskName,
        newValue: data.taskName,
        changedBy: new mongoose.Types.ObjectId(userId),
        changedDate: new Date(),
        changeReason: data.changeReason,
      });
      milestone.taskName = data.taskName;
    }

    if (data.taskDescription !== undefined && data.taskDescription !== milestone.taskDescription) {
      changes.push({
        fieldName: 'taskDescription',
        oldValue: milestone.taskDescription,
        newValue: data.taskDescription,
        changedBy: new mongoose.Types.ObjectId(userId),
        changedDate: new Date(),
        changeReason: data.changeReason,
      });
      milestone.taskDescription = data.taskDescription;
    }

    if (data.amount !== undefined && data.amount !== milestone.amount) {
      changes.push({
        fieldName: 'amount',
        oldValue: milestone.amount,
        newValue: data.amount,
        changedBy: new mongoose.Types.ObjectId(userId),
        changedDate: new Date(),
        changeReason: data.changeReason,
      });
      milestone.amount = data.amount;
    }

    if (
      data.dueDate &&
      new Date(data.dueDate).getTime() !== new Date(milestone.dueDate).getTime()
    ) {
      const newDueDate = new Date(data.dueDate);
      changes.push({
        fieldName: 'dueDate',
        oldValue: milestone.dueDate,
        newValue: newDueDate,
        changedBy: new mongoose.Types.ObjectId(userId),
        changedDate: new Date(),
        changeReason: data.changeReason,
      });
      milestone.dueDate = newDueDate;
    }

    if (data.workLogDescription !== undefined) {
      milestone.workLogDescription = data.workLogDescription;
    }

    milestone.changeHistory.push(...changes);
    milestone.lastModifiedBy = new mongoose.Types.ObjectId(userId);
    milestone.lastModifiedDate = new Date();

    await milestone.save();

    return milestone;
  }

  /**
   * Delete milestone (only if allowed)
   */
  async deleteMilestone(milestoneId: string, userId: string) {
    const milestone = await Milestone.findById(milestoneId);

    if (!milestone) {
      throw new Error('Milestone not found');
    }

    // Check if milestone can be deleted (pending or active, and no work submitted)
    if (
      (milestone.status !== MilestoneStatus.PENDING &&
        milestone.status !== MilestoneStatus.FUNDED) ||
      milestone.workSubmittedDate
    ) {
      throw new Error('Milestone cannot be deleted');
    }

    // Verify user has permission (creator only)
    if (milestone.createdBy.toString() !== userId) {
      throw new Error('Not authorized to delete this milestone');
    }

    await Milestone.deleteOne({ _id: milestoneId });

    return { success: true, message: 'Milestone deleted successfully' };
  }

  /**
   * Submit work for milestone (expert)
   */
  async submitWork(milestoneId: string, data: HubSubmitWorkInput, userId: string) {
    const milestone = await Milestone.findById(milestoneId);

    if (!milestone) {
      throw new Error('Milestone not found');
    }

    // Check if work can be submitted (only FUNDED milestones)
    if (milestone.status !== MilestoneStatus.FUNDED) {
      throw new Error('Work can only be submitted for funded milestones');
    }

    milestone.workLogDescription = data.workLogDescription;
    milestone.workLogFilesUrl = data.workLogFilesUrl || [];
    milestone.workSubmittedDate = new Date();
    milestone.status = MilestoneStatus.WORK_SUBMITTED;
    milestone.lastModifiedBy = new mongoose.Types.ObjectId(userId);
    milestone.lastModifiedDate = new Date();

    await milestone.save();

    // Notify client that work has been submitted
    await hubContractNotificationService.notifyMilestoneSubmitted(milestoneId);

    // @spec: messaging-events_spec.md
    // @covers AC-EV-031, AC-EV-033, AC-EV-034
    // Create milestone submitted event (non-blocking)
    if (milestone.contractId) {
      void chatEventService.createMilestoneEvent({
        milestoneId: milestone._id as mongoose.Types.ObjectId,
        contractId: milestone.contractId,
        eventType: ChatEventType.MILESTONE_SUBMITTED,
        summary: `Work submitted for: ${milestone.taskName}`,
        data: {
          milestoneId: milestoneId,
          contractId: milestone.contractId.toString(),
          title: milestone.taskName,
          amount: milestone.amount,
        },
      });
    }

    return milestone;
  }

  /**
   * Approve milestone work (client) - includes payment processing
   */
  async approveMilestone(milestoneId: string, data: HubApproveMilestoneInput, userId: string) {
    const milestone = await Milestone.findById(milestoneId);

    if (!milestone) {
      throw new Error('Milestone not found');
    }

    // Check if milestone can be approved
    if (milestone.status !== MilestoneStatus.WORK_SUBMITTED) {
      throw new Error('Only submitted work can be approved');
    }

    // Update milestone status
    milestone.status = MilestoneStatus.RELEASED;
    milestone.lastModifiedBy = new mongoose.Types.ObjectId(userId);
    milestone.lastModifiedDate = new Date();

    if (data.paymentIntentId) {
      milestone.paymentIntentId = data.paymentIntentId;
    }

    await milestone.save();

    // Notify expert that milestone has been approved
    await hubContractNotificationService.notifyMilestoneApproved(milestoneId);

    // @spec: messaging-events_spec.md
    // @covers AC-EV-032, AC-EV-033, AC-EV-034
    // Create milestone approved event (non-blocking)
    if (milestone.contractId) {
      void chatEventService.createMilestoneEvent({
        milestoneId: milestone._id as mongoose.Types.ObjectId,
        contractId: milestone.contractId,
        eventType: ChatEventType.MILESTONE_APPROVED,
        summary: `Milestone approved: ${milestone.taskName}`,
        data: {
          milestoneId: milestoneId,
          contractId: milestone.contractId.toString(),
          title: milestone.taskName,
          amount: milestone.amount,
        },
      });
    }

    // TODO: Process payment through Stripe here
    // This would involve creating payment intent, charging client, transferring to expert

    return milestone;
  }

  /**
   * Get upcoming milestones
   */
  async getUpcomingMilestones(filters: HubGetUpcomingMilestonesQuery) {
    const { jobProposalId, daysAhead = 7 } = filters;

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const milestones = await Milestone.find({
      jobProposalId,
      status: MilestoneStatus.FUNDED,
      dueDate: { $lte: futureDate },
    })
      .sort({ dueDate: 1 })
      .lean();

    return milestones;
  }

  /**
   * Get overdue milestones
   */
  async getOverdueMilestones(filters: HubGetOverdueMilestonesQuery) {
    const { jobProposalId } = filters;

    const milestones = await Milestone.find({
      jobProposalId,
      status: MilestoneStatus.FUNDED,
      dueDate: { $lt: new Date() },
    })
      .sort({ dueDate: 1 })
      .lean();

    return milestones;
  }

  /**
   * Calculate total milestone amount for a proposal
   */
  async calculateTotalAmount(jobProposalId: string): Promise<number> {
    const result = await Milestone.aggregate([
      {
        $match: {
          jobProposalId: new mongoose.Types.ObjectId(jobProposalId),
          status: { $ne: MilestoneStatus.CANCELLED },
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
        },
      },
    ]);

    return result.length > 0 ? (result[0]?.totalAmount as number) : 0;
  }

  // ============================================================
  // Payment Processing Methods
  // ============================================================

  /**
   * Fund milestone(s) - Creates payment intent per milestone (1:1:1 relationship)
   * Each milestone gets its own payment intent and booking transaction
   * Used when sending offer (fund first milestone) or funding additional milestones
   */
  async fundMilestones(input: FundMilestonesInput): Promise<FundMilestonesResult> {
    const { milestoneIds, customerId, paymentMethodId, currency } = input;

    // Validate milestones exist and are pending
    const milestones = await Milestone.find({
      _id: { $in: milestoneIds },
      status: MilestoneStatus.PENDING,
    });

    if (milestones.length !== milestoneIds.length) {
      throw new Error('Some milestones not found or not in pending status');
    }

    // Get contract once for all milestones
    const contract = milestones[0]?.contractId
      ? await Contract.findById(milestones[0].contractId).lean()
      : null;

    // Get regional Stripe service based on expert's hub/location
    // Multi-region: Malaysian experts use MY platform, others use Atlas
    const { stripeService: regionalStripeService, region } = contract
      ? await this.getRegionalStripeService(contract)
      : {
          stripeService: StripeServiceFactory.getService('atlas'),
          region: 'atlas' as StripeRegion,
        };

    let totalAmount = 0;
    let totalStripeFee = 0;
    let totalCharged = 0;
    const fundedMilestoneIds: string[] = [];
    const paymentIntentIds: string[] = [];

    // Process each milestone individually (1 milestone = 1 payment = 1 booking transaction)
    for (const milestone of milestones) {
      // Get milestone ID as string for use throughout this iteration
      const milestoneIdStr = (milestone._id as mongoose.Types.ObjectId).toString();
      const amount = milestone.amount;

      // Calculate Stripe fee (2.9% + $0.30) per milestone
      const stripeFee = (2.9 / 100) * amount + 0.3;
      const amountWithFee = Math.ceil((amount + stripeFee) * 100); // Convert to cents

      // Create payment intent for this milestone (escrow) on expert's regional platform
      const paymentIntent = await regionalStripeService.createPaymentIntent({
        amount: amountWithFee,
        currency: currency.toLowerCase(),
        customerId,
        paymentMethodId,
        description: `Milestone funding: ${milestone.taskName}`,
        metadata: {
          type: 'milestone_funding',
          milestoneId: milestoneIdStr,
          contractId: milestone.contractId?.toString() || '',
          stripeRegion: region,
        },
      });

      // Update milestone to funded status
      await Milestone.updateOne(
        { _id: milestone._id },
        {
          $set: {
            status: MilestoneStatus.FUNDED,
            paymentIntentId: paymentIntent.id,
            fundedDate: new Date(),
          },
        },
      );

      // Create contract payment record for this milestone
      // Store the full PaymentIntent response so we can extract charge ID at release time
      if (contract) {
        await ContractPayment.create({
          paymentType: ContractPaymentType.MILESTONE,
          contractId: contract._id,
          jobId: contract.jobId,
          hubId: contract.clientHubId, // Use clientHubId (employer hub)
          clientId: contract.createdBy,
          expertId: contract.asssignedExpertId,
          milestoneId: new mongoose.Types.ObjectId(milestoneIdStr),
          amount,
          currency: currency.toUpperCase(),
          platformFeeRate: 0.1,
          platformFee: amount * 0.1,
          stripeFee,
          transferAmount: amount - amount * 0.1 - stripeFee,
          stripePaymentIntentId: paymentIntent.id,
          stripeResponse: paymentIntent, // Store full PaymentIntent for charge ID extraction
          stripeRegion: region, // Track which regional platform was used
          status: 'funded',
          escrowStatus: 'held',
          fundedDate: new Date(),
        });
      }

      totalAmount += amount;
      totalStripeFee += stripeFee;
      totalCharged += amountWithFee / 100;
      fundedMilestoneIds.push(milestoneIdStr);
      paymentIntentIds.push(paymentIntent.id);
    }

    return {
      success: true,
      paymentIntentId: paymentIntentIds[0] || '', // First payment intent ID for backwards compatibility
      paymentIntentIds, // All payment intent IDs
      totalAmount,
      stripeFee: totalStripeFee,
      totalCharged,
      fundedMilestones: fundedMilestoneIds,
    };
  }

  /**
   * Release payment for milestone(s) - Transfers funds to expert's Stripe account
   * Each milestone is processed individually (1:1:1 relationship)
   * This is called when client approves the submitted work
   */
  async releaseMilestonePayment(
    milestoneIds: string[],
    userId: string,
  ): Promise<ReleaseMilestoneResult> {
    // Validate milestones exist and have work submitted
    const milestones = await Milestone.find({
      _id: { $in: milestoneIds },
      status: MilestoneStatus.WORK_SUBMITTED,
    });

    if (milestones.length !== milestoneIds.length) {
      throw new Error('Some milestones not found or not in work_submitted status');
    }

    // Get the contract to find expert info
    const firstMilestone = milestones[0];
    if (!firstMilestone?.contractId) {
      throw new Error('Milestone has no associated contract');
    }

    const contract = await Contract.findById(firstMilestone.contractId).lean();
    if (!contract) {
      throw new Error('Contract not found');
    }

    // Get regional Stripe service based on expert's hub/location
    // Multi-region: Malaysian experts use MY platform, others use Atlas
    const { stripeService: regionalStripeService } = await this.getRegionalStripeService(contract);

    // Get expert's Stripe Connect account
    const expertId = contract.asssignedExpertId?.toString();
    if (!expertId) {
      throw new Error('Contract has no assigned expert');
    }

    // Get expert's Stripe account from User model and verify status
    const expert = await User.findById(expertId).select('stripeAccountId').lean();
    if (!expert?.stripeAccountId) {
      throw new Error('Expert has no Stripe Connect account');
    }

    // Fetch current status from Stripe API using regional service
    const stripeAccountStatus = await regionalStripeService.retrieveAccount(expert.stripeAccountId);
    if (!stripeAccountStatus.payouts_enabled) {
      throw new Error('Expert Stripe account is not ready for payouts');
    }

    const stripeAccountId = expert.stripeAccountId;

    // Platform fee (10% default - can be based on subscription tier)
    const platformFeePercent = 10;

    let totalReleased = 0;
    let totalTransferAmount = 0;
    let totalPlatformFee = 0;
    const releasedMilestoneIds: string[] = [];

    // Process each milestone individually (1 milestone = 1 transfer = 1 contract payment)
    for (const milestone of milestones) {
      const amount = milestone.amount;
      const platformFee = (platformFeePercent / 100) * amount;
      const transferAmountCents = Math.round((amount - platformFee) * 100); // Convert to cents

      // Get the contract payment for this milestone
      const contractPayment = await ContractPayment.findOne({
        stripePaymentIntentId: milestone.paymentIntentId,
      }).lean();

      // Extract source charge ID from contract payment or retrieve from Stripe
      let sourceChargeId: string | undefined;

      // Always retrieve from Stripe API to ensure we have the latest status and can capture if needed
      // The transfer currency must match the balance transaction currency (platform's settlement currency)
      // NOT the PaymentIntent's currency, as Stripe converts to settlement currency internally
      let balanceTransactionCurrency = 'usd'; // Default to platform's settlement currency

      if (milestone.paymentIntentId) {
        const paymentIntent = await regionalStripeService.retrievePaymentIntent(
          milestone.paymentIntentId,
        );

        // If PaymentIntent is uncaptured (manual capture mode), capture it first
        if (paymentIntent.status === 'requires_capture') {
          const capturedIntent = await regionalStripeService.capturePaymentIntent(
            milestone.paymentIntentId,
          );
          sourceChargeId =
            typeof capturedIntent.latest_charge === 'string'
              ? capturedIntent.latest_charge
              : capturedIntent.latest_charge?.id;
        } else {
          sourceChargeId =
            typeof paymentIntent.latest_charge === 'string'
              ? paymentIntent.latest_charge
              : paymentIntent.latest_charge?.id;
        }
      }

      if (!sourceChargeId) {
        throw new Error(
          `Cannot find charge for milestone ${milestone.taskName}. The payment may not have been captured.`,
        );
      }

      // Get the balance transaction currency and net amount from the charge
      // This is required because Stripe converts to platform's settlement currency
      const charge = await regionalStripeService.retrieveCharge(sourceChargeId);
      let transferAmountFromBalance = transferAmountCents;

      if (charge.balance_transaction && typeof charge.balance_transaction === 'string') {
        const balanceTransaction = await regionalStripeService.retrieveBalanceTransaction(
          charge.balance_transaction,
        );
        balanceTransactionCurrency = balanceTransaction.currency;

        // Calculate transfer amount from balance transaction's net amount
        // Net = gross - Stripe fees. We take our platform fee from the net.
        const netAmount = balanceTransaction.net; // Already in cents
        const platformFeeFromNet = Math.round(netAmount * (platformFeePercent / 100));
        transferAmountFromBalance = netAmount - platformFeeFromNet;
      }

      // Get milestone ID as string
      const milestoneIdStr = (milestone._id as mongoose.Types.ObjectId).toString();

      // Transfer to expert's Stripe Connect account
      // IMPORTANT: Currency and amount must match the balance transaction when using sourceTransaction
      const transfer = await regionalStripeService.createTransfer({
        amount: transferAmountFromBalance,
        currency: balanceTransactionCurrency,
        destination: stripeAccountId,
        transferGroup: milestone.contractId?.toString() || '',
        sourceTransaction: sourceChargeId,
        metadata: {
          milestoneId: milestoneIdStr,
          contractId: contract._id.toString(),
          expertId,
          type: 'milestone_release',
        },
      });

      // Update milestone to released status
      await Milestone.updateOne(
        { _id: milestone._id },
        {
          $set: {
            status: MilestoneStatus.RELEASED,
            releasedDate: new Date(),
            releasedBy: new mongoose.Types.ObjectId(userId),
          },
        },
      );

      // Update contract payment as transferred
      if (contractPayment) {
        await ContractPayment.updateOne(
          { _id: contractPayment._id },
          {
            $set: {
              status: 'released',
              escrowStatus: 'released',
              transferId: transfer.id,
              transferAmount: transferAmountCents / 100,
              transferStatus: 'paid',
              transferredAt: new Date(),
              releasedDate: new Date(),
            },
          },
        );
      }

      totalReleased += amount;
      totalTransferAmount += transferAmountCents / 100;
      totalPlatformFee += platformFee;
      releasedMilestoneIds.push(milestoneIdStr);
    }

    return {
      success: true,
      releasedMilestones: releasedMilestoneIds,
      totalReleased,
      transferAmount: totalTransferAmount,
      platformFee: totalPlatformFee,
    };
  }

  /**
   * Refund milestone(s) on offer decline
   * Refunds the payment and resets milestone status to pending
   */
  async refundMilestones(contractId: string): Promise<RefundMilestonesResult> {
    // Get contract to determine regional Stripe service
    const contract = await Contract.findById(contractId).lean();
    if (!contract) {
      return {
        success: false,
        refundedMilestones: [],
        totalRefunded: 0,
        message: 'Contract not found',
      };
    }

    // Get regional Stripe service based on expert's hub/location
    const { stripeService: regionalStripeService } = await this.getRegionalStripeService(contract);

    // Find all funded milestones for this contract
    const fundedMilestones = await Milestone.find({
      contractId: new mongoose.Types.ObjectId(contractId),
      status: MilestoneStatus.FUNDED,
      paymentIntentId: { $exists: true, $ne: null },
    });

    if (fundedMilestones.length === 0) {
      return {
        success: true,
        refundedMilestones: [],
        totalRefunded: 0,
        message: 'No funded milestones to refund',
      };
    }

    let totalRefunded = 0;
    const refundedMilestoneIds: string[] = [];
    const errors: string[] = [];

    for (const milestone of fundedMilestones) {
      try {
        if (!milestone.paymentIntentId) continue;

        // Refund through Stripe using regional service
        const refund = await regionalStripeService.refundPaymentIntent(milestone.paymentIntentId);

        // Update milestone status back to pending
        milestone.status = MilestoneStatus.PENDING;
        milestone.paymentIntentId = undefined;
        milestone.fundedDate = undefined;
        await milestone.save();

        totalRefunded += refund.amount / 100;
        refundedMilestoneIds.push((milestone._id as mongoose.Types.ObjectId).toString());
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Milestone ${milestone._id}: ${errorMessage}`);
      }
    }

    return {
      success: errors.length === 0,
      refundedMilestones: refundedMilestoneIds,
      totalRefunded,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Get milestones eligible for auto-release (work submitted > 7 days ago, within last 2 months)
   * Used by auto-release payment cron job
   */
  async getMilestonesForAutoRelease(): Promise<AutoReleaseMilestone[]> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Only process milestones from the last 2 months to avoid processing old data
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

    const milestones = await Milestone.find({
      status: MilestoneStatus.WORK_SUBMITTED,
      workSubmittedDate: { $lte: sevenDaysAgo, $gte: twoMonthsAgo },
      paymentIntentId: { $exists: true, $ne: null },
    }).lean();

    return milestones.map((m) => ({
      _id: m._id.toString(),
      contractId: m.contractId?.toString() || '',
      paymentIntentId: m.paymentIntentId || '',
      amount: m.amount,
      taskName: m.taskName,
      workSubmittedDate: m.workSubmittedDate,
    }));
  }
}

/**
 * Input for funding milestones
 */
export interface FundMilestonesInput {
  milestoneIds: string[];
  customerId: string;
  paymentMethodId: string;
  currency: string;
}

/**
 * Result of funding milestones
 */
export interface FundMilestonesResult {
  success: boolean;
  paymentIntentId: string; // First payment intent ID for backwards compatibility
  paymentIntentIds: string[]; // All payment intent IDs (1 per milestone)
  totalAmount: number;
  stripeFee: number;
  totalCharged: number;
  fundedMilestones: string[];
}

/**
 * Result of releasing milestone payment
 */
export interface ReleaseMilestoneResult {
  success: boolean;
  releasedMilestones: string[];
  totalReleased: number;
  transferAmount?: number;
  platformFee?: number;
}

/**
 * Result of refunding milestones
 */
export interface RefundMilestonesResult {
  success: boolean;
  refundedMilestones: string[];
  totalRefunded: number;
  message?: string;
  errors?: string[];
}

/**
 * Milestone data for auto-release
 */
export interface AutoReleaseMilestone {
  _id: string;
  contractId: string;
  paymentIntentId: string;
  amount: number;
  taskName: string;
  workSubmittedDate?: Date;
}

export const hubMilestoneService = new HubMilestoneService();
