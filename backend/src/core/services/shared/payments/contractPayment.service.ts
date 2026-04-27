import {
  ContractPayment,
  ContractPaymentStatus,
  ContractPaymentType,
  EscrowStatus,
  type IContractPayment,
} from '@core/models/ContractPayment';
import { Hub } from '@core/models/Hub';
import { Milestone, MilestoneStatus } from '@core/models/Milestone';
import { TimelogEntry, TimelogStatus } from '@core/models/TimelogEntry';
import {
  SourceModel,
  Transaction,
  TransactionDirection,
  TransactionType,
} from '@core/models/Transaction';
import { User } from '@core/models/User';
import { getStripeRegion, type StripeRegion } from '@core/utils/stripe-region';
import mongoose from 'mongoose';
import { StripeServiceFactory } from './stripeFactory.service';

/**
 * Create milestone payment input
 */
export interface CreateMilestonePaymentInput {
  contractId: string;
  jobId: string;
  hubId: string;
  clientId: string;
  expertId: string;
  milestoneId: string;
  amount: number;
  currency?: string;
  platformFeeRate?: number;
  stripeCustomerId: string;
  paymentMethodId: string;
}

/**
 * Create timelog payment input
 */
export interface CreateTimelogPaymentInput {
  contractId: string;
  jobId: string;
  hubId: string;
  clientId: string;
  expertId: string;
  timelogEntryIds: string[];
  weekNumber: number;
  year: number;
  hoursWorked: number;
  hourlyRate: number;
  currency?: string;
  platformFeeRate?: number;
  stripeCustomerId: string;
  paymentMethodId: string;
  weekStartDate?: Date;
  weekEndDate?: Date;
}

/**
 * List contract payments params
 */
export interface ListContractPaymentsParams {
  contractId?: string;
  jobId?: string;
  hubId?: string;
  clientId?: string;
  expertId?: string;
  paymentType?: ContractPaymentType;
  status?: ContractPaymentStatus;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Contract Payment Service - Handles job milestone and timelog payments
 *
 * Multi-region support:
 * - Job payments use Expert's region (expert's hub region or independent expert's region)
 * - Payment & Transfer must be on the same platform
 */
export class ContractPaymentService {
  /**
   * Get expert's Stripe region
   * Uses expert's hub region if they belong to one, otherwise their own region
   */
  private async getExpertRegion(expertId: string): Promise<StripeRegion> {
    const expert = await User.findById(expertId).select('stripeRegion location').lean();

    // Check if expert has a stored region
    if (expert?.stripeRegion === 'malaysia' || expert?.stripeRegion === 'atlas') {
      return expert.stripeRegion;
    }

    // Check if expert owns a hub
    const expertHub = await Hub.findOne({ ownerId: expertId })
      .select('stripeRegion location')
      .lean();

    if (expertHub) {
      if (expertHub.stripeRegion === 'malaysia' || expertHub.stripeRegion === 'atlas') {
        return expertHub.stripeRegion;
      }
      return getStripeRegion(expertHub.location?.country);
    }

    // Fall back to expert's own location
    return getStripeRegion(expert?.location?.country);
  }

  /**
   * Fund milestone (escrow)
   * Uses Expert's regional Stripe platform
   */
  async fundMilestone(input: CreateMilestonePaymentInput): Promise<{
    payment: IContractPayment;
    transaction: InstanceType<typeof Transaction>;
  }> {
    // Check if milestone exists and is in correct status
    const milestone = await Milestone.findById(input.milestoneId);
    if (!milestone) {
      throw new Error('Milestone not found');
    }

    if (
      milestone.status !== MilestoneStatus.PENDING &&
      milestone.status !== MilestoneStatus.FUNDED
    ) {
      throw new Error('Milestone cannot be funded in current status');
    }

    // Check if payment already exists
    const existingPayment = await ContractPayment.findOne({
      milestoneId: input.milestoneId,
      paymentType: ContractPaymentType.MILESTONE,
      status: { $in: [ContractPaymentStatus.FUNDED, ContractPaymentStatus.RELEASED] },
    });

    if (existingPayment) {
      throw new Error('Milestone already funded');
    }

    // Determine expert's Stripe region for this payment
    const region = await this.getExpertRegion(input.expertId);
    const regionalStripeService = StripeServiceFactory.getService(region);

    // Calculate fees
    const platformFeeRate = input.platformFeeRate ?? 0.15;
    const platformFee = Number((input.amount * platformFeeRate).toFixed(2));
    const stripeFeeRate = 0.029;
    const stripeFeeFixed = (input.currency || 'MYR') === 'MYR' ? 1.0 : 0.3;
    const stripeFee = Number((input.amount * stripeFeeRate + stripeFeeFixed).toFixed(2));
    const transferAmount = Number((input.amount - platformFee - stripeFee).toFixed(2));

    // Create escrow PaymentIntent (manual capture) on expert's regional platform
    const paymentIntent = await regionalStripeService.getStripeInstance().paymentIntents.create({
      amount: Math.round(input.amount * 100), // Convert to cents
      currency: (input.currency || 'MYR').toLowerCase(),
      customer: input.stripeCustomerId,
      payment_method: input.paymentMethodId,
      description: `Milestone funding: ${milestone.taskName}`,
      capture_method: 'manual', // Escrow - requires manual capture
      metadata: {
        contractId: input.contractId,
        milestoneId: input.milestoneId,
        jobId: input.jobId,
        expertId: input.expertId,
        stripeRegion: region,
      },
      confirm: true,
      off_session: true,
    });

    // Create contract payment record with stripeRegion
    const payment = new ContractPayment({
      paymentType: ContractPaymentType.MILESTONE,
      contractId: new mongoose.Types.ObjectId(input.contractId),
      jobId: new mongoose.Types.ObjectId(input.jobId),
      hubId: new mongoose.Types.ObjectId(input.hubId),
      clientId: new mongoose.Types.ObjectId(input.clientId),
      expertId: new mongoose.Types.ObjectId(input.expertId),
      milestoneId: new mongoose.Types.ObjectId(input.milestoneId),
      amount: input.amount,
      currency: input.currency || 'MYR',
      platformFee,
      platformFeeRate,
      stripeFee,
      transferAmount,
      status: ContractPaymentStatus.FUNDED,
      escrowStatus: EscrowStatus.REQUIRES_CAPTURE,
      stripePaymentIntentId: paymentIntent.id,
      stripeRegion: region, // Track which platform was used
      fundedDate: new Date(),
    });

    await payment.save();

    // Update milestone status
    milestone.status = MilestoneStatus.FUNDED;
    milestone.fundedDate = new Date();
    milestone.paymentIntentId = paymentIntent.id;
    await milestone.save();

    // Create transaction record
    const transaction = await Transaction.create({
      type: TransactionType.MILESTONE_FUND,
      direction: TransactionDirection.INBOUND,
      sourceModel: SourceModel.CONTRACT_PAYMENT,
      sourceId: payment._id,
      amount: input.amount,
      currency: input.currency || 'MYR',
      platformFee,
      platformFeeRate,
      stripeFee,
      transferAmount,
      fromUserId: new mongoose.Types.ObjectId(input.clientId),
      toUserId: new mongoose.Types.ObjectId(input.expertId),
      hubId: new mongoose.Types.ObjectId(input.hubId),
      serviceType: 'milestone',
      serviceId: new mongoose.Types.ObjectId(input.milestoneId),
      stripePaymentIntentId: paymentIntent.id,
      status: 'succeeded',
      stripeStatus: paymentIntent.status,
      description: `Milestone escrow: ${milestone.taskName}`,
    });

    payment.transactionId = transaction._id as mongoose.Types.ObjectId;
    await payment.save();

    return { payment, transaction };
  }

  /**
   * Release milestone payment (capture escrow)
   * Uses the SAME regional platform as the original payment
   */
  async releaseMilestone(
    paymentId: string,
    releasedBy: string,
  ): Promise<{ payment: IContractPayment; transaction: InstanceType<typeof Transaction> }> {
    const payment = await ContractPayment.findById(paymentId);
    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.status !== ContractPaymentStatus.FUNDED) {
      throw new Error('Payment not in funded status');
    }

    if (!payment.stripePaymentIntentId) {
      throw new Error('No payment intent found');
    }

    // Use SAME region as the payment (critical!)
    const region = (payment.stripeRegion as StripeRegion) || 'atlas';
    const regionalStripeService = StripeServiceFactory.getService(region);

    // Capture the escrow funds using regional service
    await regionalStripeService
      .getStripeInstance()
      .paymentIntents.capture(payment.stripePaymentIntentId);

    // Update payment
    payment.status = ContractPaymentStatus.RELEASED;
    payment.escrowStatus = EscrowStatus.CAPTURED;
    payment.releasedDate = new Date();
    payment.releasedBy = new mongoose.Types.ObjectId(releasedBy);
    await payment.save();

    // Update milestone
    if (payment.milestoneId) {
      await Milestone.findByIdAndUpdate(payment.milestoneId, {
        status: MilestoneStatus.RELEASED,
        releasedDate: new Date(),
        releasedBy: new mongoose.Types.ObjectId(releasedBy),
      });
    }

    // Create release transaction record
    const transaction = await Transaction.create({
      type: TransactionType.MILESTONE_RELEASE,
      direction: TransactionDirection.INTERNAL,
      sourceModel: SourceModel.CONTRACT_PAYMENT,
      sourceId: payment._id,
      amount: payment.transferAmount,
      currency: payment.currency,
      platformFee: 0,
      platformFeeRate: 0,
      stripeFee: 0,
      transferAmount: payment.transferAmount,
      toUserId: payment.expertId,
      hubId: payment.hubId,
      serviceType: 'milestone',
      serviceId: payment.milestoneId,
      stripePaymentIntentId: payment.stripePaymentIntentId,
      status: 'succeeded',
      description: 'Milestone payment released',
    });

    return { payment, transaction };
  }

  /**
   * Process timelog payment (weekly batch)
   * Uses Expert's regional Stripe platform
   */
  async processTimelogPayment(input: CreateTimelogPaymentInput): Promise<{
    payment: IContractPayment;
    transaction: InstanceType<typeof Transaction>;
  }> {
    // Check if payment already exists for this week
    const existingPayment = await ContractPayment.findOne({
      contractId: input.contractId,
      paymentType: ContractPaymentType.TIMELOG,
      year: input.year,
      weekNumber: input.weekNumber,
      status: { $in: [ContractPaymentStatus.PROCESSING, ContractPaymentStatus.RELEASED] },
    });

    if (existingPayment) {
      throw new Error('Payment already exists for this week');
    }

    // Verify timelogs are approved
    const timelogs = await TimelogEntry.find({
      _id: { $in: input.timelogEntryIds.map((id) => new mongoose.Types.ObjectId(id)) },
      status: TimelogStatus.APPROVED,
    });

    if (timelogs.length !== input.timelogEntryIds.length) {
      throw new Error('Some timelogs are not approved');
    }

    // Determine expert's Stripe region for this payment
    const region = await this.getExpertRegion(input.expertId);
    const regionalStripeService = StripeServiceFactory.getService(region);

    // Calculate amount
    const amount = Number((input.hoursWorked * input.hourlyRate).toFixed(2));

    // Calculate fees
    const platformFeeRate = input.platformFeeRate ?? 0.15;
    const platformFee = Number((amount * platformFeeRate).toFixed(2));
    const stripeFeeRate = 0.029;
    const stripeFeeFixed = (input.currency || 'MYR') === 'MYR' ? 1.0 : 0.3;
    const stripeFee = Number((amount * stripeFeeRate + stripeFeeFixed).toFixed(2));
    const transferAmount = Number((amount - platformFee - stripeFee).toFixed(2));

    // Create PaymentIntent (immediate capture) on expert's regional platform
    const paymentIntent = await regionalStripeService.getStripeInstance().paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: (input.currency || 'MYR').toLowerCase(),
      customer: input.stripeCustomerId,
      payment_method: input.paymentMethodId,
      description: `Weekly payment: Week ${input.weekNumber}, ${input.year}`,
      metadata: {
        contractId: input.contractId,
        jobId: input.jobId,
        expertId: input.expertId,
        weekNumber: input.weekNumber.toString(),
        year: input.year.toString(),
        hoursWorked: input.hoursWorked.toString(),
        stripeRegion: region,
      },
      confirm: true,
      off_session: true,
    });

    // Create contract payment record with stripeRegion
    const payment = new ContractPayment({
      paymentType: ContractPaymentType.TIMELOG,
      contractId: new mongoose.Types.ObjectId(input.contractId),
      jobId: new mongoose.Types.ObjectId(input.jobId),
      hubId: new mongoose.Types.ObjectId(input.hubId),
      clientId: new mongoose.Types.ObjectId(input.clientId),
      expertId: new mongoose.Types.ObjectId(input.expertId),
      timelogEntryIds: input.timelogEntryIds.map((id) => new mongoose.Types.ObjectId(id)),
      weekNumber: input.weekNumber,
      year: input.year,
      hoursWorked: input.hoursWorked,
      weekStartDate: input.weekStartDate,
      weekEndDate: input.weekEndDate,
      amount,
      currency: input.currency || 'MYR',
      hourlyRate: input.hourlyRate,
      platformFee,
      platformFeeRate,
      stripeFee,
      transferAmount,
      status:
        paymentIntent.status === 'succeeded'
          ? ContractPaymentStatus.RELEASED
          : ContractPaymentStatus.PROCESSING,
      stripePaymentIntentId: paymentIntent.id,
      stripeRegion: region, // Track which platform was used
      releasedDate: paymentIntent.status === 'succeeded' ? new Date() : undefined,
    });

    await payment.save();

    // Update timelogs to paid
    if (paymentIntent.status === 'succeeded') {
      await TimelogEntry.updateMany(
        { _id: { $in: input.timelogEntryIds.map((id) => new mongoose.Types.ObjectId(id)) } },
        {
          status: TimelogStatus.PAID,
          paidDate: new Date(),
          paymentIntentId: paymentIntent.id,
        },
      );
    }

    // Create transaction record
    const transaction = await Transaction.create({
      type: TransactionType.TIMELOG_PAYMENT,
      direction: TransactionDirection.INBOUND,
      sourceModel: SourceModel.CONTRACT_PAYMENT,
      sourceId: payment._id,
      amount,
      currency: input.currency || 'MYR',
      platformFee,
      platformFeeRate,
      stripeFee,
      transferAmount,
      fromUserId: new mongoose.Types.ObjectId(input.clientId),
      toUserId: new mongoose.Types.ObjectId(input.expertId),
      hubId: new mongoose.Types.ObjectId(input.hubId),
      serviceType: 'timelog',
      stripePaymentIntentId: paymentIntent.id,
      status: paymentIntent.status === 'succeeded' ? 'succeeded' : 'processing',
      stripeStatus: paymentIntent.status,
      description: `Weekly payment: ${input.hoursWorked} hours @ ${input.hourlyRate}/hr`,
    });

    payment.transactionId = transaction._id as mongoose.Types.ObjectId;
    await payment.save();

    return { payment, transaction };
  }

  /**
   * Get contract payment by ID
   */
  async getById(id: string): Promise<IContractPayment | null> {
    const payment = await ContractPayment.findById(id)
      .populate('contractId', 'contractTitle priceType')
      .populate('jobId', 'title')
      .populate('hubId', 'name slug')
      .populate('clientId', 'name email')
      .populate('expertId', 'name email')
      .populate('milestoneId', 'taskName amount')
      .lean();
    return payment as unknown as IContractPayment | null;
  }

  /**
   * List contract payments
   */
  async list(params: ListContractPaymentsParams): Promise<{
    payments: IContractPayment[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      contractId,
      jobId,
      hubId,
      clientId,
      expertId,
      paymentType,
      status,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params;

    const filter: Record<string, unknown> = {};

    if (contractId) filter.contractId = new mongoose.Types.ObjectId(contractId);
    if (jobId) filter.jobId = new mongoose.Types.ObjectId(jobId);
    if (hubId) filter.hubId = new mongoose.Types.ObjectId(hubId);
    if (clientId) filter.clientId = new mongoose.Types.ObjectId(clientId);
    if (expertId) filter.expertId = new mongoose.Types.ObjectId(expertId);
    if (paymentType) filter.paymentType = paymentType;
    if (status) filter.status = status;

    const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [paymentsResult, total] = await Promise.all([
      ContractPayment.find(filter)
        .populate('contractId', 'contractTitle priceType')
        .populate('clientId', 'name email')
        .populate('expertId', 'name email')
        .populate('milestoneId', 'taskName')
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ContractPayment.countDocuments(filter),
    ]);

    return {
      payments: paymentsResult as unknown as IContractPayment[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Refund contract payment
   * Uses the SAME regional platform as the original payment
   */
  async refund(
    paymentId: string,
    options?: {
      amount?: number;
      reason?: string;
      refundedBy?: string;
    },
  ): Promise<IContractPayment | null> {
    const payment = await ContractPayment.findById(paymentId);
    if (!payment) {
      throw new Error('Payment not found');
    }

    if (!payment.stripePaymentIntentId) {
      throw new Error('No payment intent found');
    }

    // Use SAME region as the payment (critical!)
    const region = (payment.stripeRegion as StripeRegion) || 'atlas';
    const regionalStripeService = StripeServiceFactory.getService(region);

    // For escrow payments, cancel the payment intent
    if (payment.status === ContractPaymentStatus.FUNDED) {
      await regionalStripeService
        .getStripeInstance()
        .paymentIntents.cancel(payment.stripePaymentIntentId, {
          cancellation_reason: 'requested_by_customer',
        });
    } else if (payment.status === ContractPaymentStatus.RELEASED) {
      // For released payments, create refund
      await regionalStripeService.getStripeInstance().refunds.create({
        payment_intent: payment.stripePaymentIntentId,
        amount: options?.amount ? Math.round(options.amount * 100) : undefined,
      });
    } else {
      throw new Error('Payment cannot be refunded in current status');
    }

    // Update payment
    payment.status = ContractPaymentStatus.REFUNDED;
    payment.refundedDate = new Date();
    payment.refundReason = options?.reason;
    if (options?.refundedBy) {
      payment.refundedBy = new mongoose.Types.ObjectId(options.refundedBy);
    }
    await payment.save();

    // Update milestone if applicable
    if (payment.milestoneId) {
      await Milestone.findByIdAndUpdate(payment.milestoneId, {
        status: MilestoneStatus.CANCELLED,
      });
    }

    // Create refund transaction
    await Transaction.create({
      type: TransactionType.REFUND,
      direction: TransactionDirection.OUTBOUND,
      sourceModel: SourceModel.CONTRACT_PAYMENT,
      sourceId: payment._id,
      amount: options?.amount || payment.amount,
      currency: payment.currency,
      platformFee: 0,
      platformFeeRate: 0,
      stripeFee: 0,
      transferAmount: 0,
      fromUserId: payment.clientId,
      hubId: payment.hubId,
      serviceType: payment.paymentType === ContractPaymentType.MILESTONE ? 'milestone' : 'timelog',
      status: 'succeeded',
      refundedAt: new Date(),
      refundReason: options?.reason,
      refundedBy: options?.refundedBy ? new mongoose.Types.ObjectId(options.refundedBy) : undefined,
      description: `Refund for ${payment.paymentType} payment`,
    });

    return payment;
  }

  /**
   * Transfer payment to expert
   * Uses the SAME regional platform as the original payment
   */
  async transferToExpert(
    paymentId: string,
    expertStripeAccountId: string,
  ): Promise<IContractPayment | null> {
    const payment = await ContractPayment.findById(paymentId);
    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.status !== ContractPaymentStatus.RELEASED) {
      throw new Error('Payment must be released before transfer');
    }

    if (payment.transferStatus === 'paid') {
      throw new Error('Transfer already completed');
    }

    if (payment.transferAmount <= 0) {
      payment.transferStatus = 'paid';
      payment.transferredAt = new Date();
      await payment.save();
      return payment;
    }

    // Use SAME region as the payment (critical - payment and transfer must be on same platform!)
    const region = (payment.stripeRegion as StripeRegion) || 'atlas';
    const regionalStripeService = StripeServiceFactory.getService(region);

    // Create Stripe transfer using regional service
    const paymentIdStr = (payment._id as mongoose.Types.ObjectId).toString();
    const transfer = await regionalStripeService.getStripeInstance().transfers.create({
      amount: Math.round(payment.transferAmount * 100),
      currency: payment.currency.toLowerCase(),
      destination: expertStripeAccountId,
      transfer_group: `contract_${payment.contractId}_${payment.paymentType}`,
      metadata: {
        paymentId: paymentIdStr,
        contractId: payment.contractId.toString(),
        paymentType: payment.paymentType,
        stripeRegion: region,
      },
    });

    // Update payment
    payment.transferId = transfer.id;
    payment.transferStatus = 'paid';
    payment.transferredAt = new Date();
    await payment.save();

    // Create transfer transaction
    await Transaction.create({
      type: TransactionType.EXPERT_TRANSFER,
      direction: TransactionDirection.INTERNAL,
      sourceModel: SourceModel.CONTRACT_PAYMENT,
      sourceId: payment._id,
      amount: payment.transferAmount,
      currency: payment.currency,
      platformFee: 0,
      platformFeeRate: 0,
      stripeFee: 0,
      transferAmount: payment.transferAmount,
      toUserId: payment.expertId,
      hubId: payment.hubId,
      serviceType: payment.paymentType === ContractPaymentType.MILESTONE ? 'milestone' : 'timelog',
      stripeTransferId: transfer.id,
      status: 'succeeded',
      transferredAt: new Date(),
      transferMethod: 'stripe_connect',
      description: `Transfer to expert for ${payment.paymentType} payment`,
    });

    return payment;
  }

  /**
   * Get payments pending transfer
   */
  async getPendingTransfers(): Promise<IContractPayment[]> {
    const payments = await ContractPayment.find({
      status: ContractPaymentStatus.RELEASED,
      transferStatus: { $ne: 'paid' },
      transferAmount: { $gt: 0 },
    })
      .populate('contractId', 'contractTitle')
      .populate('expertId', 'name email')
      .sort({ releasedDate: 1 })
      .lean();
    return payments as unknown as IContractPayment[];
  }

  /**
   * Get payment statistics by contract
   */
  async getStatsByContract(contractId: string): Promise<{
    totalPaid: number;
    totalPending: number;
    milestonesPaid: number;
    milestonesTotal: number;
    timelogHours: number;
    timelogAmount: number;
  }> {
    const [milestoneStats, timelogStats] = await Promise.all([
      ContractPayment.aggregate([
        {
          $match: {
            contractId: new mongoose.Types.ObjectId(contractId),
            paymentType: ContractPaymentType.MILESTONE,
          },
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            amount: { $sum: '$amount' },
          },
        },
      ]),
      ContractPayment.aggregate([
        {
          $match: {
            contractId: new mongoose.Types.ObjectId(contractId),
            paymentType: ContractPaymentType.TIMELOG,
            status: ContractPaymentStatus.RELEASED,
          },
        },
        {
          $group: {
            _id: null,
            totalHours: { $sum: '$hoursWorked' },
            totalAmount: { $sum: '$amount' },
          },
        },
      ]),
    ]);

    const milestonesPaid =
      milestoneStats.find((s) => s._id === ContractPaymentStatus.RELEASED)?.count || 0;
    const milestonesTotal = milestoneStats.reduce((acc, s) => acc + s.count, 0);
    const totalPaid = milestoneStats
      .filter((s) => s._id === ContractPaymentStatus.RELEASED)
      .reduce((acc, s) => acc + s.amount, 0);
    const totalPending = milestoneStats
      .filter((s) => s._id === ContractPaymentStatus.FUNDED)
      .reduce((acc, s) => acc + s.amount, 0);

    return {
      totalPaid: totalPaid + (timelogStats[0]?.totalAmount || 0),
      totalPending,
      milestonesPaid,
      milestonesTotal,
      timelogHours: timelogStats[0]?.totalHours || 0,
      timelogAmount: timelogStats[0]?.totalAmount || 0,
    };
  }
}

// Export singleton instance
export const contractPaymentService = new ContractPaymentService();
