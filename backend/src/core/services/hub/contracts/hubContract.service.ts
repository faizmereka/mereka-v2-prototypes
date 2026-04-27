import { ChatEventType } from '@core/models/ChatMessage';
import { Contract, ContractStatus, TermsUpdateStatus } from '@core/models/Contract';
import { Hub } from '@core/models/Hub';
import { HubMember, HubMemberStatus } from '@core/models/HubMember';
import { JobProposal } from '@core/models/JobProposal';
import { Milestone, MilestoneStatus } from '@core/models/Milestone';
import { User } from '@core/models/User';
import { conversationTriggerService } from '@core/services/shared/chat';
import {
  type StripeRegion,
  StripeServiceFactory,
} from '@core/services/shared/payments/stripeFactory.service';
import { getStripeRegion } from '@core/utils/stripe-region';
import type {
  HubAcceptOfferInput,
  HubApplyTermsUpdateParams,
  HubCancelContractInput,
  HubCompleteContractInput,
  HubCreateContractInput,
  HubDeclineOfferInput,
  HubGetContractsQuery,
  HubGetPendingOffersQuery,
  HubPauseContractInput,
  HubRequestTermsUpdateInput,
  HubSendOfferInput,
  HubUpdateContractInput,
} from '@schemas/hub';
import mongoose from 'mongoose';
import { hubProposalService } from '../proposals/hubProposal.service';
import { hubContractNotificationService } from './hubContractNotification.service';

export class HubContractService {
  /**
   * Get regional Stripe service based on expert's hub or user location
   * Used for multi-region Stripe support (Malaysia vs Atlas)
   */
  private async getRegionalStripeService(params: {
    expertHubId?: mongoose.Types.ObjectId | string | null;
    expertId?: mongoose.Types.ObjectId | string | null;
  }): Promise<{
    stripeService: ReturnType<typeof StripeServiceFactory.getService>;
    region: StripeRegion;
  }> {
    let region: StripeRegion = 'atlas';

    // Priority 1: Check expert's hub
    if (params.expertHubId) {
      const expertHub = await Hub.findById(params.expertHubId)
        .select('stripeRegion location')
        .lean();
      if (expertHub?.stripeRegion === 'malaysia' || expertHub?.stripeRegion === 'atlas') {
        region = expertHub.stripeRegion;
      } else if (expertHub?.location?.country) {
        region = getStripeRegion(expertHub.location.country);
      }
    }
    // Priority 2: Check expert user directly (for independent experts)
    else if (params.expertId) {
      const expert = await User.findById(params.expertId).select('stripeRegion location').lean();
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
   * Create a new contract (usually from accepted proposal)
   */
  async createContract(data: HubCreateContractInput, userId: string) {
    // Verify proposal exists
    const proposal = await JobProposal.findById(data.jobProposalId);
    if (!proposal) {
      throw new Error('Proposal not found');
    }

    // Check if contract already exists for this proposal
    const existing = await Contract.findOne({ jobProposalId: data.jobProposalId });
    if (existing) {
      throw new Error('Contract already exists for this proposal');
    }

    // Look up expert's hub membership to get expertHubId
    const expertHubMembership = await HubMember.findOne({
      userId: data.asssignedExpertId,
      status: HubMemberStatus.ACTIVE,
    }).lean();

    // Create contract
    const contract = await Contract.create({
      ...data,
      createdBy: new mongoose.Types.ObjectId(userId),
      clientHubId: data.clientHubId, // Hub that posted the job (employer)
      expertHubId: expertHubMembership?.hubId || data.expertHubId, // Hub the expert belongs to
      status: ContractStatus.PENDING,
    });

    // Update proposal status to ACCEPTED
    await hubProposalService.acceptProposal(
      data.jobProposalId,
      (contract._id as mongoose.Types.ObjectId).toString(),
    );

    // Send notification (non-blocking)
    void hubContractNotificationService.notifyContractCreated(
      (contract._id as mongoose.Types.ObjectId).toString(),
    );

    return contract;
  }

  /**
   * Get contracts with filters
   */
  async getContracts(filters: HubGetContractsQuery) {
    const {
      clientHubId,
      expertHubId,
      asssignedExpertId,
      createdBy,
      jobId,
      status,
      priceType,
      page = 1,
      limit = 20,
    } = filters;

    const query: Record<string, unknown> = {};

    if (clientHubId) query.clientHubId = clientHubId;
    if (expertHubId) query.expertHubId = expertHubId;
    if (asssignedExpertId) query.asssignedExpertId = asssignedExpertId;
    if (createdBy) query.createdBy = createdBy;
    if (jobId) query.jobId = jobId;
    if (status) query.status = status;
    if (priceType) query.priceType = priceType;

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Contract.find(query)
        .populate('clientHubId', 'name slug logo')
        .populate('expertHubId', 'name slug logo')
        .populate('asssignedExpertId', 'name email profileImage')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Contract.countDocuments(query),
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
   * Get contract by ID
   */
  async getContractById(contractId: string) {
    const contract = await Contract.findById(contractId).lean();

    if (!contract) {
      throw new Error('Contract not found');
    }

    return contract;
  }

  /**
   * Update contract
   */
  async updateContract(contractId: string, data: HubUpdateContractInput, userId: string) {
    const contract = await Contract.findById(contractId);

    if (!contract) {
      throw new Error('Contract not found');
    }

    // Verify user has permission (client or expert)
    const isClient = contract.createdBy.toString() === userId;
    const isExpert = contract.asssignedExpertId.toString() === userId;

    if (!isClient && !isExpert) {
      throw new Error('Not authorized to update this contract');
    }

    // Update allowed fields
    if (data.status) contract.status = data.status;
    if (data.contractTitle) contract.contractTitle = data.contractTitle;
    if (data.contractDescription) contract.contractDescription = data.contractDescription;
    if (data.contractUploads) contract.contractUploads = data.contractUploads;
    if (data.endDate) contract.endDate = new Date(data.endDate);
    // Note: pendingTermsUpdate should be managed through dedicated requestTermsUpdate/applyTermsUpdate methods
    if (data.weeklyLimit) contract.weeklyLimit = data.weeklyLimit;
    if (data.hourlyProposedPrice) contract.hourlyProposedPrice = data.hourlyProposedPrice;

    await contract.save();

    return contract;
  }

  /**
   * Cancel contract
   */
  async cancelContract(contractId: string, userId: string, _input?: HubCancelContractInput) {
    const contract = await Contract.findById(contractId);

    if (!contract) {
      throw new Error('Contract not found');
    }

    // Verify user has permission
    const isClient = contract.createdBy.toString() === userId;
    const isExpert = contract.asssignedExpertId.toString() === userId;

    if (!isClient && !isExpert) {
      throw new Error('Not authorized to cancel this contract');
    }

    // Check if contract can be cancelled
    if (
      contract.status !== ContractStatus.PENDING &&
      contract.status !== ContractStatus.ACTIVE &&
      contract.status !== ContractStatus.PAUSED
    ) {
      throw new Error('Contract cannot be cancelled');
    }

    contract.status = ContractStatus.CANCELLED;
    contract.endDate = new Date();

    await contract.save();

    // Send cancellation notification
    const cancelledBy = isClient ? 'client' : 'expert';
    await hubContractNotificationService.notifyContractCancelled(
      contractId,
      cancelledBy,
      _input?.reason,
    );

    // @spec: messaging-conversation-triggers_spec.md
    // @covers AC-CT-034
    // Add contract cancelled event and close chat room (non-blocking)
    void conversationTriggerService.addContractEvent(
      contractId,
      ChatEventType.CONTRACT_CANCELLED,
      `Contract cancelled by ${cancelledBy}`,
      true, // Close the room
    );

    return contract;
  }

  /**
   * Pause contract
   */
  async pauseContract(contractId: string, userId: string, _input?: HubPauseContractInput) {
    const contract = await Contract.findById(contractId);

    if (!contract) {
      throw new Error('Contract not found');
    }

    // Verify user has permission
    const isClient = contract.createdBy.toString() === userId;
    const isExpert = contract.asssignedExpertId.toString() === userId;

    if (!isClient && !isExpert) {
      throw new Error('Not authorized to pause this contract');
    }

    // Check if contract can be paused
    if (contract.status !== ContractStatus.ACTIVE) {
      throw new Error('Only active contracts can be paused');
    }

    contract.status = ContractStatus.PAUSED;
    await contract.save();

    // Determine who paused and send notification (non-blocking)
    const pausedBy = contract.createdBy.toString() === userId ? 'client' : 'expert';
    void hubContractNotificationService.notifyContractPaused(contractId, pausedBy);

    // @spec: messaging-conversation-triggers_spec.md
    // @covers AC-CT-033
    // Add contract paused event to chat room (non-blocking)
    void conversationTriggerService.addContractEvent(
      contractId,
      ChatEventType.CONTRACT_PAUSED,
      `Contract paused by ${pausedBy}`,
    );

    return contract;
  }

  /**
   * Resume paused contract
   */
  async resumeContract(contractId: string, userId: string) {
    const contract = await Contract.findById(contractId);

    if (!contract) {
      throw new Error('Contract not found');
    }

    // Verify user has permission
    const isClient = contract.createdBy.toString() === userId;
    const isExpert = contract.asssignedExpertId.toString() === userId;

    if (!isClient && !isExpert) {
      throw new Error('Not authorized to resume this contract');
    }

    // Check if contract can be resumed
    if (contract.status !== ContractStatus.PAUSED) {
      throw new Error('Only paused contracts can be resumed');
    }

    contract.status = ContractStatus.ACTIVE;
    await contract.save();

    // Send notification (non-blocking)
    void hubContractNotificationService.notifyContractResumed(contractId);

    // @spec: messaging-conversation-triggers_spec.md
    // @covers AC-CT-033
    // Add contract resumed event to chat room (non-blocking)
    void conversationTriggerService.addContractEvent(
      contractId,
      ChatEventType.CONTRACT_STARTED, // Using STARTED for resume
      'Contract resumed',
    );

    return contract;
  }

  /**
   * Complete contract (only client can complete)
   * Marks the contract as completed, sends notifications, and adds chat event
   */
  async completeContract(contractId: string, userId: string, input?: HubCompleteContractInput) {
    const contract = await Contract.findById(contractId);

    if (!contract) {
      throw new Error('Contract not found');
    }

    // Only the client can complete a contract
    const isClient = contract.createdBy.toString() === userId;
    if (!isClient) {
      throw new Error('Only the client can complete a contract');
    }

    // Check if contract can be completed (must be active or paused)
    if (contract.status !== ContractStatus.ACTIVE && contract.status !== ContractStatus.PAUSED) {
      throw new Error('Only active or paused contracts can be completed');
    }

    // Update contract status
    const previousStatus = contract.status;
    contract.status = ContractStatus.COMPLETED;
    contract.endDate = new Date();
    contract.statusHistory.push({
      from: previousStatus,
      to: ContractStatus.COMPLETED,
      changedBy: new mongoose.Types.ObjectId(userId),
      changedAt: new Date(),
      reason: input?.reason || 'Contract completed by client',
    });
    contract.version += 1;

    await contract.save();

    // Send notification to both parties (non-blocking)
    void hubContractNotificationService.notifyContractCompleted(contractId);

    // Add contract completed event to chat room (non-blocking)
    // Chat room stays open so parties can continue communication and leave reviews
    void conversationTriggerService.addContractEvent(
      contractId,
      ChatEventType.CONTRACT_COMPLETED,
      input?.reason ? `Contract completed: ${input.reason}` : 'Contract completed',
    );

    return contract;
  }

  /**
   * Request terms update (hourly contracts only)
   */
  async requestTermsUpdate(contractId: string, data: HubRequestTermsUpdateInput, userId: string) {
    const contract = await Contract.findById(contractId);

    if (!contract) {
      throw new Error('Contract not found');
    }

    // Only for hourly contracts
    if (contract.priceType !== 'hourly') {
      throw new Error('Terms update is only available for hourly contracts');
    }

    // Verify user has permission (client or expert)
    const isClient = contract.createdBy.toString() === userId;
    const isExpert = contract.asssignedExpertId.toString() === userId;

    if (!isClient && !isExpert) {
      throw new Error('Not authorized to request terms update');
    }

    // Check if there's already a pending update
    if (contract.pendingTermsUpdate?.status === TermsUpdateStatus.PENDING) {
      throw new Error('There is already a pending terms update');
    }

    // Create pending terms update
    const currentDate = new Date();
    contract.pendingTermsUpdate = {
      weeklyLimit: data.weeklyLimit,
      hourlyRate: data.hourlyRate,
      effectiveDate: new Date(data.effectiveDate),
      requestedDate: currentDate,
      requestedBy: new mongoose.Types.ObjectId(userId),
      status: TermsUpdateStatus.PENDING,
    };

    await contract.save();

    // Send notification (non-blocking)
    const requestedBy = contract.createdBy.toString() === userId ? 'client' : 'expert';
    const proposedChanges = `Weekly limit: ${data.weeklyLimit} hrs, Hourly rate: $${data.hourlyRate}`;
    void hubContractNotificationService.notifyTermsUpdateRequested(
      contractId,
      requestedBy,
      proposedChanges,
    );

    return contract;
  }

  /**
   * Apply pending terms update
   */
  async applyTermsUpdate(params: HubApplyTermsUpdateParams, userId: string) {
    const contract = await Contract.findById(params.contractId);

    if (!contract) {
      throw new Error('Contract not found');
    }

    // Only for hourly contracts
    if (contract.priceType !== 'hourly') {
      throw new Error('Terms update is only available for hourly contracts');
    }

    // Check if there's a pending update
    if (
      !contract.pendingTermsUpdate ||
      contract.pendingTermsUpdate.status !== TermsUpdateStatus.PENDING
    ) {
      throw new Error('No pending terms update to apply');
    }

    // Verify user has permission (should be the other party who didn't request)
    const requestedBy = contract.pendingTermsUpdate.requestedBy.toString();
    const isClient = contract.createdBy.toString() === userId;
    const isExpert = contract.asssignedExpertId.toString() === userId;

    // The approver must be the other party (not the requester)
    if (requestedBy === userId) {
      throw new Error('Cannot approve your own terms update request');
    }

    if (!isClient && !isExpert) {
      throw new Error('Not authorized to approve terms update');
    }

    // Apply the update
    contract.weeklyLimit = contract.pendingTermsUpdate.weeklyLimit;
    contract.hourlyProposedPrice = contract.pendingTermsUpdate.hourlyRate;
    contract.pendingTermsUpdate.status = TermsUpdateStatus.APPLIED;
    contract.pendingTermsUpdate.appliedDate = new Date();

    await contract.save();

    // Send notification (non-blocking)
    void hubContractNotificationService.notifyTermsUpdateApplied(params.contractId);

    return contract;
  }

  // ============================================================
  // Offer Methods - Contract Offer Flow
  // ============================================================

  /**
   * Send Offer - Creates contract in PENDING status with optional milestones
   * For fixed price contracts with milestones, milestones are created but NOT funded at this stage
   * NO escrow funding at send time - funding happens after expert accepts
   *
   * Note: This method works without transactions in development (standalone MongoDB).
   * In production with replica set, transactions provide atomicity guarantees.
   */
  async sendOffer(data: HubSendOfferInput, userId: string) {
    // Verify proposal exists and is not already accepted
    const proposal = await JobProposal.findById(data.jobProposalId);
    if (!proposal) {
      throw new Error('Proposal not found');
    }

    // Check if contract already exists for this proposal
    const existing = await Contract.findOne({ jobProposalId: data.jobProposalId });
    if (existing) {
      throw new Error('Contract already exists for this proposal');
    }

    // Look up expert's hub membership to get expertHubId if not provided
    let expertHubId = data.expertHubId;
    if (!expertHubId) {
      const expertHubMembership = await HubMember.findOne({
        userId: data.asssignedExpertId,
        status: HubMemberStatus.ACTIVE,
      }).lean();
      expertHubId = expertHubMembership?.hubId?.toString();
    }

    // Validate pricing based on priceType
    if (data.priceType === 'fixed') {
      if (!data.proposedPrice || data.proposedPrice <= 0) {
        throw new Error('proposedPrice is required for fixed price contracts');
      }
      // Validate milestones if hasMilestones is true
      if (data.hasMilestones) {
        if (!data.milestones || data.milestones.length === 0) {
          throw new Error('At least one milestone is required when hasMilestones is true');
        }
        // Verify milestone amounts sum to proposedPrice
        const totalMilestoneAmount = data.milestones.reduce((sum, m) => sum + m.amount, 0);
        if (Math.abs(totalMilestoneAmount - data.proposedPrice) > 0.01) {
          throw new Error(
            `Milestone amounts ($${totalMilestoneAmount}) must equal proposed price ($${data.proposedPrice})`,
          );
        }
      }
    } else if (data.priceType === 'hourly') {
      if (!data.hourlyProposedPrice || data.hourlyProposedPrice <= 0) {
        throw new Error('hourlyProposedPrice is required for hourly contracts');
      }
    }

    // Create the contract in PENDING status (this is the "offer")
    const contractData = {
      jobId: new mongoose.Types.ObjectId(data.jobId),
      jobProposalId: new mongoose.Types.ObjectId(data.jobProposalId),
      clientHubId: new mongoose.Types.ObjectId(data.clientHubId),
      expertHubId: expertHubId ? new mongoose.Types.ObjectId(expertHubId) : undefined,
      contractTitle: data.contractTitle,
      contractDescription: data.contractDescription,
      contractUploads: data.contractUploads || [],
      priceType: data.priceType,
      proposedPrice: data.proposedPrice,
      hasMilestones: data.hasMilestones || false,
      hourlyProposedPrice: data.hourlyProposedPrice,
      weeklyLimit: data.weeklyLimit,
      startDate: new Date(data.startDate),
      selectedCurrency: data.selectedCurrency.toUpperCase(),
      asssignedExpertId: new mongoose.Types.ObjectId(data.asssignedExpertId),
      createdBy: new mongoose.Types.ObjectId(userId),
      stripeCustomerId: data.stripeCustomerId,
      paymentMethodId: data.paymentMethodId,
      status: ContractStatus.PENDING,
      statusHistory: [
        {
          from: null,
          to: ContractStatus.PENDING,
          changedBy: new mongoose.Types.ObjectId(userId),
          changedAt: new Date(),
          reason: 'Offer sent',
        },
      ],
      version: 0,
    };

    const contract = await Contract.create(contractData);

    if (!contract) {
      throw new Error('Failed to create contract');
    }

    // Create milestones if fixed price with milestones
    let firstMilestoneId: mongoose.Types.ObjectId | undefined;
    let firstMilestoneAmount = 0;

    if (data.priceType === 'fixed' && data.hasMilestones && data.milestones) {
      const milestonesData = data.milestones.map((m, index) => ({
        jobId: new mongoose.Types.ObjectId(data.jobId),
        jobProposalId: new mongoose.Types.ObjectId(data.jobProposalId),
        contractId: contract._id,
        hubId: new mongoose.Types.ObjectId(data.clientHubId),
        taskName: m.taskName,
        taskDescription: m.taskDescription || '',
        amount: m.amount,
        dueDate: new Date(m.dueDate),
        currency: data.selectedCurrency.toUpperCase(),
        status: MilestoneStatus.PENDING, // Will fund first one below
        order: m.order ?? index,
        createdBy: new mongoose.Types.ObjectId(userId),
      }));

      const insertedMilestones = await Milestone.insertMany(milestonesData);

      // Get first milestone info for funding
      if (insertedMilestones.length > 0) {
        const firstMilestone =
          insertedMilestones.find((m) => m.order === 0) ?? insertedMilestones[0];
        if (firstMilestone) {
          firstMilestoneId = firstMilestone._id as mongoose.Types.ObjectId;
          firstMilestoneAmount = firstMilestone.amount;
        }
      }
    }

    // Fund first milestone if payment method and customer ID are provided
    if (
      data.paymentMethodId &&
      data.stripeCustomerId &&
      firstMilestoneId &&
      firstMilestoneAmount > 0
    ) {
      try {
        // Use the stripeCustomerId from frontend (the payment method belongs to this customer)
        const customerId = data.stripeCustomerId;

        // Update contract with Stripe customer ID
        await Contract.updateOne({ _id: contract._id }, { $set: { stripeCustomerId: customerId } });

        // Get regional Stripe service based on expert's hub/location
        // Payments use expert's region for multi-region support
        const { stripeService: regionalStripeService, region } =
          await this.getRegionalStripeService({
            expertHubId: expertHubId,
            expertId: data.asssignedExpertId,
          });

        // Create escrow payment intent for first milestone
        // Amount should be in cents (smallest currency unit)
        const amountInCents = Math.round(firstMilestoneAmount * 100);

        const paymentIntent = await regionalStripeService.createEscrowPaymentIntent({
          amount: amountInCents,
          currency: data.selectedCurrency.toLowerCase(),
          customerId: customerId,
          paymentMethodId: data.paymentMethodId,
          description: `Milestone funding for contract: ${data.contractTitle}`,
          metadata: {
            contractId: (contract._id as mongoose.Types.ObjectId).toString(),
            milestoneId: firstMilestoneId.toString(),
            type: 'milestone_funding',
            stripeRegion: region,
          },
          confirm: true, // Confirm immediately to hold funds
        });

        // Update first milestone with payment info and set to FUNDED
        await Milestone.updateOne(
          { _id: firstMilestoneId },
          {
            $set: {
              status: MilestoneStatus.FUNDED,
              paymentIntentId: paymentIntent.id,
              fundedDate: new Date(),
            },
          },
        );
      } catch (paymentError) {
        // Log error but don't fail the offer - milestone stays PENDING
        // The client can fund it later
        console.error('Failed to fund first milestone:', paymentError);
      }
    }

    // Update proposal status to indicate offer sent
    await JobProposal.updateOne(
      { _id: data.jobProposalId },
      {
        $set: {
          status: 'offer_sent',
          contractId: contract._id,
        },
      },
    );

    // Return contract with milestones
    const contractWithMilestones = await Contract.findById(contract._id)
      .populate('clientHubId', 'name slug logo')
      .populate('expertHubId', 'name slug logo')
      .populate('asssignedExpertId', 'name email profileImage')
      .lean();

    const milestones =
      data.hasMilestones && data.milestones
        ? await Milestone.find({ contractId: contract._id }).sort({ order: 1 }).lean()
        : [];

    // Send notification to expert about the new job offer
    await hubContractNotificationService.notifyJobOfferReceived(
      (contract._id as mongoose.Types.ObjectId).toString(),
    );

    // @spec: messaging-conversation-triggers_spec.md
    // @covers AC-CT-030, AC-CT-031
    // Create chat room for contract offer (non-blocking)
    void conversationTriggerService.createContractRoom({
      contractId: contract._id as mongoose.Types.ObjectId,
      jobId: data.jobId,
      clientHubId: data.clientHubId,
      expertHubId: expertHubId || '',
      contractTitle: data.contractTitle,
    });

    return {
      contract: contractWithMilestones,
      milestones,
    };
  }

  /**
   * Accept Offer - Expert accepts the contract offer
   * Validates expert has Stripe payout setup before accepting
   * Transitions contract from PENDING to ACTIVE
   */
  async acceptOffer(contractId: string, userId: string, input?: HubAcceptOfferInput) {
    // Note: For production, transactions should be re-enabled with a MongoDB replica set
    const contract = await Contract.findById(contractId);
    if (!contract) {
      throw new Error('Contract not found');
    }

    // Verify this is a pending offer
    if (contract.status !== ContractStatus.PENDING) {
      throw new Error('This contract is not a pending offer');
    }

    // Verify the user is the assigned expert
    if (contract.asssignedExpertId.toString() !== userId) {
      throw new Error('Only the assigned expert can accept this offer');
    }

    // Validate expert has Stripe payout setup
    const expert = await User.findById(userId).select('stripeAccountId name email').lean();
    if (!expert) {
      throw new Error('Expert user not found');
    }

    if (!expert.stripeAccountId) {
      throw new Error(
        'Please set up your payout account before accepting offers. Go to Settings → Transactions → My Earnings to complete your Stripe account setup.',
      );
    }

    // Verify Stripe account is ready for payouts using regional service
    // Expert's Stripe account is on their regional platform
    const { stripeService: regionalStripeService } = await this.getRegionalStripeService({
      expertHubId: contract.expertHubId,
      expertId: contract.asssignedExpertId,
    });

    try {
      const stripeAccount = await regionalStripeService.retrieveAccount(expert.stripeAccountId);
      if (!stripeAccount.payouts_enabled) {
        throw new Error(
          'Your Stripe account is not fully set up for payouts. Please complete your account setup in Settings → Transactions → My Earnings.',
        );
      }
    } catch (stripeError) {
      if (stripeError instanceof Error && stripeError.message.includes('not fully set up')) {
        throw stripeError;
      }
      throw new Error(
        'Unable to verify your payout account. Please check your account setup in Settings → Transactions → My Earnings.',
      );
    }

    // Update contract status to ACTIVE
    contract.status = ContractStatus.ACTIVE;
    contract.acceptedAt = new Date();
    contract.acceptMessage = input?.acceptMessage;
    contract.statusHistory.push({
      from: ContractStatus.PENDING,
      to: ContractStatus.ACTIVE,
      changedBy: new mongoose.Types.ObjectId(userId),
      changedAt: new Date(),
      reason: 'Offer accepted by expert',
    });
    contract.version += 1;

    await contract.save();

    // Update proposal status to accepted
    await JobProposal.updateOne({ _id: contract.jobProposalId }, { $set: { status: 'accepted' } });

    // Return updated contract
    const updatedContract = await Contract.findById(contractId)
      .populate('clientHubId', 'name slug logo')
      .populate('expertHubId', 'name slug logo')
      .populate('asssignedExpertId', 'name email profileImage')
      .lean();

    // Send notification to client that expert accepted the offer
    await hubContractNotificationService.notifyJobOfferAccepted(contractId);

    // @spec: messaging-conversation-triggers_spec.md
    // @covers AC-CT-032
    // Add contract accepted event to chat room (non-blocking)
    void conversationTriggerService.addContractEvent(
      contractId,
      ChatEventType.CONTRACT_STARTED,
      'Contract accepted and started',
    );

    return updatedContract;
  }

  /**
   * Decline Offer - Expert declines the contract offer
   * Refunds any funded milestones and transitions contract to CANCELLED
   */
  async declineOffer(contractId: string, userId: string, input: HubDeclineOfferInput) {
    // Note: For production, transactions should be re-enabled with a MongoDB replica set
    const contract = await Contract.findById(contractId);
    if (!contract) {
      throw new Error('Contract not found');
    }

    // Verify this is a pending offer
    if (contract.status !== ContractStatus.PENDING) {
      throw new Error('This contract is not a pending offer');
    }

    // Verify the user is the assigned expert
    if (contract.asssignedExpertId.toString() !== userId) {
      throw new Error('Only the assigned expert can decline this offer');
    }

    // Check for funded milestones and refund them
    const fundedMilestones = await Milestone.find({
      contractId: new mongoose.Types.ObjectId(contractId),
      status: MilestoneStatus.FUNDED,
      paymentIntentId: { $exists: true, $ne: null },
    });

    // Get regional Stripe service for refunds
    // Refunds must go through the same platform where payment was made
    const { stripeService: regionalStripeService } = await this.getRegionalStripeService({
      expertHubId: contract.expertHubId,
      expertId: contract.asssignedExpertId,
    });

    // Refund each funded milestone using regional service
    for (const milestone of fundedMilestones) {
      if (milestone.paymentIntentId) {
        try {
          await regionalStripeService.refundPaymentIntent(milestone.paymentIntentId);
        } catch (refundError) {
          // Log but don't fail the entire operation
          console.error(`Failed to refund milestone ${milestone._id}:`, refundError);
        }
      }
    }

    // Update all milestones to cancelled
    await Milestone.updateMany(
      { contractId: new mongoose.Types.ObjectId(contractId) },
      { $set: { status: MilestoneStatus.CANCELLED } },
    );

    // Update contract status to CANCELLED
    contract.status = ContractStatus.CANCELLED;
    contract.declinedAt = new Date();
    contract.declineReason = input.declineReason;
    contract.endDate = new Date();
    contract.statusHistory.push({
      from: ContractStatus.PENDING,
      to: ContractStatus.CANCELLED,
      changedBy: new mongoose.Types.ObjectId(userId),
      changedAt: new Date(),
      reason: `Offer declined: ${input.declineReason}`,
    });
    contract.version += 1;

    await contract.save();

    // Update proposal status back to submitted (can receive new offers)
    await JobProposal.updateOne(
      { _id: contract.jobProposalId },
      {
        $set: { status: 'submitted' },
        $unset: { contractId: 1 },
      },
    );

    // Send notification to client that expert declined the offer
    await hubContractNotificationService.notifyJobOfferDeclined(contractId, input.declineReason);

    // @spec: messaging-conversation-triggers_spec.md
    // @covers AC-CT-035
    // Add offer declined event and close chat room (non-blocking)
    void conversationTriggerService.addContractEvent(
      contractId,
      ChatEventType.CONTRACT_CANCELLED,
      `Offer declined: ${input.declineReason}`,
      true, // Close the room
    );

    return contract;
  }

  /**
   * Get pending offers for an expert
   * Returns contracts with PENDING status assigned to this expert
   */
  async getPendingOffers(userId: string, query?: HubGetPendingOffersQuery) {
    const expertId = query?.expertId || userId;
    const page = query?.page || 1;
    const limit = query?.limit || 20;
    const skip = (page - 1) * limit;

    const filter = {
      asssignedExpertId: new mongoose.Types.ObjectId(expertId),
      status: ContractStatus.PENDING,
    };

    const [items, total] = await Promise.all([
      Contract.find(filter)
        .populate('clientHubId', 'name slug logo')
        .populate('expertHubId', 'name slug logo')
        .populate('createdBy', 'name email profileImage')
        .populate('jobId', 'title description')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Contract.countDocuments(filter),
    ]);

    // Get milestones for each contract
    const contractIds = items.map((c) => c._id);
    const milestones = await Milestone.find({
      contractId: { $in: contractIds },
    })
      .sort({ order: 1 })
      .lean();

    // Group milestones by contractId
    const milestonesByContract = milestones.reduce(
      (acc, m) => {
        const contractId = m.contractId?.toString();
        if (contractId) {
          if (!acc[contractId]) acc[contractId] = [];
          acc[contractId].push(m);
        }
        return acc;
      },
      {} as Record<string, typeof milestones>,
    );

    // Attach milestones to contracts
    const itemsWithMilestones = items.map((contract) => ({
      ...contract,
      milestones: milestonesByContract[contract._id.toString()] || [],
    }));

    return {
      items: itemsWithMilestones,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ============================================================
  // Cron Job Methods - Used by payment processing jobs
  // ============================================================

  /**
   * Get contract with payment details for weekly payout processing
   * Returns lean contract object with essential fields for payment processing
   */
  async getContractForPayment(contractId: string) {
    const contract = await Contract.findById(contractId)
      .select(
        '_id hourlyProposedPrice paymentMethodId stripeCustomerId selectedCurrency contractTitle jobId jobProposalId asssignedExpertId createdBy hubId',
      )
      .lean();

    return contract;
  }
}

export const hubContractService = new HubContractService();
