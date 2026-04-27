import { ChatEventType } from '@core/models/ChatMessage';
import { Hub } from '@core/models/Hub';
import { HubMember, HubMemberStatus } from '@core/models/HubMember';
import { Job } from '@core/models/Job';
import { JobProposal, ProposalStatus } from '@core/models/JobProposal';
import { Milestone } from '@core/models/Milestone';
import { User } from '@core/models/User';
import { chatEventService, conversationTriggerService } from '@core/services/shared/chat';
import type { HubCreateProposalInput, HubGetProposalsQuery, HubMilestoneInput } from '@schemas/hub';
import { communicationTriggerService } from '@services/communications';
import mongoose from 'mongoose';

export class HubProposalService {
  /**
   * Create a new proposal
   */
  async createProposal(data: HubCreateProposalInput, userId: string) {
    // Check if job exists
    const job = await Job.findById(data.jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    const expertId = data.asssignedExpertId || userId;

    // Check for duplicate proposal
    const existing = await JobProposal.findOne({
      jobId: data.jobId,
      asssignedExpertId: expertId,
    });
    if (existing) {
      throw new Error('You have already submitted a proposal for this job');
    }

    // Look up expert's hub membership to get expertHubId
    const expertHubMembership = await HubMember.findOne({
      userId: expertId,
      status: HubMemberStatus.ACTIVE,
    }).lean();

    // Build proposal milestones data if provided (for embedding on proposal)
    const hasMilestones = !!(data.milestones && data.milestones.length > 0);
    const proposalMilestones =
      hasMilestones && data.milestones
        ? data.milestones.map((m, index) => ({
            taskName: m.taskName,
            taskDescription: m.taskDescription,
            amount: m.amount,
            dueDate: m.dueDate ? new Date(m.dueDate) : undefined,
            order: index,
          }))
        : undefined;

    // Create proposal with embedded milestones
    const proposal = await JobProposal.create({
      jobId: data.jobId,
      proposalDetails: data.proposalDetails,
      priceType: data.priceType,
      proposedPrice: data.proposedPrice,
      hourlyProposedPrice: data.hourlyProposedPrice,
      workingHours: data.workingHours,
      selectedCurrency: data.selectedCurrency,
      files: data.files,
      asssignedExpertId: expertId,
      createdBy: new mongoose.Types.ObjectId(userId), // User who submitted the proposal
      clientHubId: job.hubId, // Hub that posted the job (employer)
      expertHubId: expertHubMembership?.hubId, // Hub the expert belongs to (may be undefined if no hub)
      status: ProposalStatus.PENDING,
      hasMilestones: hasMilestones || false,
      milestones: proposalMilestones,
    });

    // Also create milestones in separate collection for tracking
    if (hasMilestones && data.milestones) {
      await this.createMilestonesForProposal(
        proposal._id as mongoose.Types.ObjectId,
        job._id as mongoose.Types.ObjectId,
        job.hubId ? (job.hubId as unknown as mongoose.Types.ObjectId) : undefined,
        data.milestones,
        userId,
        data.selectedCurrency || 'MYR',
      );
    }

    // Send notification to job poster about new proposal
    void this.sendProposalReceivedNotification(proposal, job, expertId);

    // @spec: messaging-conversation-triggers_spec.md
    // @covers AC-CT-010, AC-CT-011, AC-CT-012, AC-CT-013
    // Create chat room for proposal (non-blocking)
    void this.createProposalChatRoom(proposal, job);

    return proposal;
  }

  /**
   * Create chat room for a proposal
   * @covers AC-CT-010, AC-CT-011, AC-CT-012, AC-CT-013
   */
  private async createProposalChatRoom(
    proposal: typeof JobProposal.prototype,
    job: typeof Job.prototype,
  ): Promise<void> {
    try {
      const clientHubId = job.hubId;
      const expertHubId = proposal.expertHubId;

      if (!clientHubId || !expertHubId) {
        console.warn('Cannot create proposal chat room: missing hub IDs');
        return;
      }

      await conversationTriggerService.createProposalRoom({
        proposalId: proposal._id as mongoose.Types.ObjectId,
        jobId: job._id as mongoose.Types.ObjectId,
        clientHubId: clientHubId as mongoose.Types.ObjectId,
        expertHubId: expertHubId as mongoose.Types.ObjectId,
        jobTitle: job.title || 'Job Proposal',
        proposedAmount: proposal.proposedPrice,
      });
    } catch (error) {
      // Log but don't fail the proposal
      console.error('Failed to create chat room for proposal:', error);
    }
  }

  /**
   * Send notification to job poster about new proposal
   */
  private async sendProposalReceivedNotification(
    proposal: typeof JobProposal.prototype,
    job: typeof Job.prototype,
    expertId: string,
  ): Promise<void> {
    try {
      if (!job.hubId || !job.createdBy) return;

      const [jobPoster, expert] = await Promise.all([
        User.findById(job.createdBy).select('name email phoneNumber').lean(),
        User.findById(expertId).select('name email').lean(),
      ]);

      if (!jobPoster || !expert) return;

      await communicationTriggerService.triggerCommunicationWithUser({
        templateId: 'PROPOSAL_RECEIVED',
        user: {
          _id: jobPoster._id.toString(),
          name: jobPoster.name,
          email: jobPoster.email,
          phone: jobPoster.phoneNumber,
        },
        hubId: job.hubId.toString(),
        data: {
          userName: jobPoster.name,
          userEmail: jobPoster.email,
          userPhone: jobPoster.phoneNumber,
          expertName: expert.name,
          jobTitle: job.jobTitle,
          jobId: job._id?.toString(),
          proposalId: proposal._id?.toString(),
          proposedRate:
            proposal.priceType === 'hourly'
              ? `${proposal.selectedCurrency || 'MYR'} ${proposal.hourlyProposedPrice}/hr`
              : `${proposal.selectedCurrency || 'MYR'} ${proposal.proposedPrice}`,
        },
      });
    } catch (error) {
      console.error('Failed to send proposal received notification:', error);
    }
  }

  /**
   * Create milestones for a proposal
   */
  private async createMilestonesForProposal(
    proposalId: mongoose.Types.ObjectId,
    jobId: mongoose.Types.ObjectId,
    hubId: mongoose.Types.ObjectId | undefined,
    milestones: HubMilestoneInput[],
    userId: string,
    currency: string,
  ) {
    const milestoneData = milestones.map((m) => ({
      jobId,
      jobProposalId: proposalId,
      ...(hubId && { hubId }),
      taskName: m.taskName,
      taskDescription: m.taskDescription,
      amount: m.amount,
      dueDate: m.dueDate,
      currency,
      createdBy: new mongoose.Types.ObjectId(userId),
    }));

    return await Milestone.insertMany(milestoneData);
  }

  /**
   * Get proposals with filters
   */
  async getProposals(filters: HubGetProposalsQuery) {
    const {
      jobId,
      createdBy,
      asssignedExpertId,
      clientHubId,
      expertHubId,
      status,
      page = 1,
      limit = 20,
    } = filters;

    const query: Record<string, unknown> = {};

    if (jobId) query.jobId = jobId;
    if (createdBy) query.createdBy = createdBy;
    if (asssignedExpertId) query.asssignedExpertId = asssignedExpertId;
    if (clientHubId) query.clientHubId = clientHubId;
    if (expertHubId) query.expertHubId = expertHubId;
    if (status) query.status = status;

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      JobProposal.find(query)
        .populate('jobId', 'jobTitle serviceCategory jobBudget jobCurrency status')
        .populate('asssignedExpertId', 'name email profileImage')
        .populate('clientHubId', 'name slug logo')
        .populate('expertHubId', 'name slug logo')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      JobProposal.countDocuments(query),
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
   * Get proposal by ID
   * @param proposalId - The proposal ID
   * @param hubId - Optional: The hub ID to verify access (for hub-scoped routes)
   * @param userId - Optional: The user ID to verify access (for user-scoped routes)
   */
  async getProposalById(proposalId: string, hubId?: string, userId?: string) {
    const proposal = await JobProposal.findById(proposalId)
      .populate('jobId', 'jobTitle serviceCategory jobBudget jobCurrency status')
      .populate('asssignedExpertId', 'name email profileImage')
      .populate('clientHubId', 'name slug logo')
      .populate('expertHubId', 'name slug logo')
      .lean();

    if (!proposal) {
      throw new Error('Proposal not found');
    }

    // Authorization check: User must have access via hub or as expert
    if (hubId) {
      const clientHubId = proposal.clientHubId?._id?.toString() || proposal.clientHubId?.toString();
      const expertHubId = proposal.expertHubId?._id?.toString() || proposal.expertHubId?.toString();

      if (hubId !== clientHubId && hubId !== expertHubId) {
        throw new Error('Not authorized to view this proposal');
      }
    } else if (userId) {
      const expertId =
        proposal.asssignedExpertId?._id?.toString() || proposal.asssignedExpertId?.toString();
      if (userId !== expertId) {
        throw new Error('Not authorized to view this proposal');
      }
    }

    return proposal;
  }

  /**
   * Update proposal
   */
  async updateProposal(proposalId: string, data: { status?: ProposalStatus; contractId?: string }) {
    const proposal = await JobProposal.findById(proposalId);

    if (!proposal) {
      throw new Error('Proposal not found');
    }

    // Update fields
    if (data.status) proposal.status = data.status;
    if (data.contractId) proposal.contractId = new mongoose.Types.ObjectId(data.contractId);

    await proposal.save();

    return proposal;
  }

  /**
   * Withdraw proposal
   */
  async withdrawProposal(proposalId: string, userId: string) {
    const proposal = await JobProposal.findById(proposalId);

    if (!proposal) {
      throw new Error('Proposal not found');
    }

    // Check if expert owns the proposal
    if (proposal.asssignedExpertId.toString() !== userId) {
      throw new Error('Not authorized to withdraw this proposal');
    }

    // Check if proposal can be withdrawn (only PENDING proposals)
    if (proposal.status !== ProposalStatus.PENDING) {
      throw new Error('Proposal cannot be withdrawn');
    }

    proposal.status = ProposalStatus.WITHDRAWN;
    await proposal.save();

    // Send notification to job poster about withdrawn proposal
    void this.sendProposalWithdrawnNotification(proposal);

    // @spec: messaging-events_spec.md
    // @covers AC-EV-012, AC-EV-013, AC-EV-014
    // Create proposal withdrawn event (non-blocking)
    void chatEventService.createProposalEvent({
      proposalId: proposalId,
      jobId: proposal.jobId?.toString() || '',
      clientHubId: proposal.clientHubId?.toString() || '',
      expertHubId: proposal.expertHubId?.toString() || '',
      eventType: ChatEventType.PROPOSAL_WITHDRAWN,
      summary: 'Proposal withdrawn by expert',
      data: {
        proposalId,
        jobId: proposal.jobId?.toString(),
        amount: proposal.proposedPrice,
        status: 'WITHDRAWN',
      },
    });

    return proposal;
  }

  /**
   * Send notification about proposal withdrawal
   */
  private async sendProposalWithdrawnNotification(
    proposal: typeof JobProposal.prototype,
  ): Promise<void> {
    try {
      const job = await Job.findById(proposal.jobId).select('jobTitle hubId createdBy').lean();
      if (!job?.createdBy) return;

      const [jobPoster, expert] = await Promise.all([
        User.findById(job.createdBy).select('name email phoneNumber').lean(),
        User.findById(proposal.asssignedExpertId).select('name').lean(),
      ]);

      if (!jobPoster || !expert) return;

      await communicationTriggerService.triggerCommunicationWithUser({
        templateId: 'PROPOSAL_WITHDRAWN',
        user: {
          _id: jobPoster._id.toString(),
          name: jobPoster.name,
          email: jobPoster.email,
          phone: jobPoster.phoneNumber,
        },
        hubId: job.hubId?.toString(),
        data: {
          userName: jobPoster.name,
          expertName: expert.name,
          jobTitle: job.jobTitle,
        },
        channels: ['inApp'], // Withdrawal is inApp only as per template
      });
    } catch (error) {
      console.error('Failed to send proposal withdrawn notification:', error);
    }
  }

  /**
   * Accept proposal (called when creating contract)
   */
  async acceptProposal(proposalId: string, contractId: string) {
    const proposal = await JobProposal.findById(proposalId);

    if (!proposal) {
      throw new Error('Proposal not found');
    }

    // Check if proposal can be accepted (only PENDING proposals)
    if (proposal.status !== ProposalStatus.PENDING) {
      throw new Error('Proposal cannot be accepted');
    }

    proposal.status = ProposalStatus.ACCEPTED;
    proposal.contractId = new mongoose.Types.ObjectId(contractId);
    await proposal.save();

    // Link milestones to contract
    await Milestone.updateMany(
      { jobProposalId: proposalId },
      { $set: { contractId: new mongoose.Types.ObjectId(contractId) } },
    );

    // Send notification to expert about accepted proposal
    void this.sendProposalAcceptedNotification(proposal, contractId);

    // @spec: messaging-conversation-triggers_spec.md
    // @covers AC-CT-020, AC-CT-021, AC-CT-022, AC-CT-023, AC-CT-024
    // Transition proposal chat room to contract (non-blocking)
    void conversationTriggerService.transitionProposalToContract({
      proposalId,
      contractId,
    });

    return proposal;
  }

  /**
   * Send notification about proposal acceptance
   */
  private async sendProposalAcceptedNotification(
    proposal: typeof JobProposal.prototype,
    contractId: string,
  ): Promise<void> {
    try {
      const job = await Job.findById(proposal.jobId).select('jobTitle hubId').lean();
      if (!job?.hubId) return;

      const [expert, hub] = await Promise.all([
        User.findById(proposal.asssignedExpertId).select('name email phoneNumber').lean(),
        Hub.findById(job.hubId).select('name').lean(),
      ]);

      if (!expert) return;

      await communicationTriggerService.triggerCommunicationWithUser({
        templateId: 'PROPOSAL_ACCEPTED',
        user: {
          _id: expert._id.toString(),
          name: expert.name,
          email: expert.email,
          phone: expert.phoneNumber,
        },
        hubId: job.hubId.toString(),
        data: {
          userName: expert.name,
          userEmail: expert.email,
          userPhone: expert.phoneNumber,
          hubName: hub?.name || 'The client',
          jobTitle: job.jobTitle,
          contractId,
        },
      });
    } catch (error) {
      console.error('Failed to send proposal accepted notification:', error);
    }
  }

  /**
   * Reject proposal
   * @param proposalId - The proposal ID
   * @param userId - The user ID (for non-hub-scoped routes)
   * @param hubId - Optional: The hub ID for hub-scoped routes
   */
  async rejectProposal(proposalId: string, userId: string, hubId?: string) {
    const proposal = await JobProposal.findById(proposalId);

    if (!proposal) {
      throw new Error('Proposal not found');
    }

    // Authorization check: User must belong to the client hub (job poster)
    if (hubId) {
      // Hub-scoped route: Check if hub is the client hub
      if (proposal.clientHubId?.toString() !== hubId) {
        throw new Error('Not authorized to reject this proposal');
      }
    } else {
      // User-scoped route: Check if user is a member of the client hub
      const hubMembership = await HubMember.findOne({
        userId,
        hubId: proposal.clientHubId,
        status: HubMemberStatus.ACTIVE,
      }).lean();

      if (!hubMembership) {
        throw new Error('Not authorized to reject this proposal');
      }
    }

    // Check if proposal can be rejected (only PENDING proposals)
    if (proposal.status !== ProposalStatus.PENDING) {
      throw new Error('Proposal cannot be rejected');
    }

    proposal.status = ProposalStatus.REJECTED;
    await proposal.save();

    // Send notification to expert about rejected proposal
    void this.sendProposalRejectedNotification(proposal);

    // @spec: messaging-events_spec.md
    // @covers AC-EV-012, AC-EV-013, AC-EV-014
    // Create proposal rejected event (non-blocking)
    void chatEventService.createProposalEvent({
      proposalId: proposalId,
      jobId: proposal.jobId?.toString() || '',
      clientHubId: proposal.clientHubId?.toString() || '',
      expertHubId: proposal.expertHubId?.toString() || '',
      eventType: ChatEventType.PROPOSAL_REJECTED,
      summary: 'Proposal rejected',
      data: {
        proposalId,
        jobId: proposal.jobId?.toString(),
        amount: proposal.proposedPrice,
        status: 'REJECTED',
      },
    });

    return proposal;
  }

  /**
   * Send notification about proposal rejection
   */
  private async sendProposalRejectedNotification(
    proposal: typeof JobProposal.prototype,
  ): Promise<void> {
    try {
      const job = await Job.findById(proposal.jobId).select('jobTitle hubId').lean();
      if (!job?.hubId) return;

      const [expert, hub] = await Promise.all([
        User.findById(proposal.asssignedExpertId).select('name email phoneNumber').lean(),
        Hub.findById(job.hubId).select('name').lean(),
      ]);

      if (!expert) return;

      await communicationTriggerService.triggerCommunicationWithUser({
        templateId: 'PROPOSAL_REJECTED',
        user: {
          _id: expert._id.toString(),
          name: expert.name,
          email: expert.email,
          phone: expert.phoneNumber,
        },
        hubId: job.hubId.toString(),
        data: {
          userName: expert.name,
          userEmail: expert.email,
          hubName: hub?.name || 'The client',
          jobTitle: job.jobTitle,
          feedbackMessage: '',
        },
      });
    } catch (error) {
      console.error('Failed to send proposal rejected notification:', error);
    }
  }
}

export const hubProposalService = new HubProposalService();
