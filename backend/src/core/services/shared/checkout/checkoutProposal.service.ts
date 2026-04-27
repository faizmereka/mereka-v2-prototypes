/**
 * Checkout Proposal Service
 * Handles proposal submission from checkout.mereka.io
 */

import { HubMember, HubMemberStatus } from '@core/models/HubMember';
import { Job, JobStatus } from '@core/models/Job';
import { type IJobProposal, JobProposal, PriceType } from '@core/models/JobProposal';
import { Role, SystemRoleKey } from '@core/models/Role';
import { User } from '@core/models/User';
import type {
  CheckoutProposalInitResponse,
  HubExpert,
  SubmitProposalInput,
  SubmitProposalResponse,
} from '@core/schemas/shared/checkout/checkoutProposal.schema';
import { hubProposalService } from '@core/services/hub/proposals/hubProposal.service';

export class CheckoutProposalService {
  /**
   * Initialize proposal checkout
   * Returns job details, expert info, hub experts list, and checks for existing proposal
   */
  async initProposalCheckout(jobId: string, userId: string): Promise<CheckoutProposalInitResponse> {
    // Get job with validation
    const job = await Job.findById(jobId).lean();
    if (!job) {
      throw new Error('Job not found');
    }

    // Verify job is active and accepting proposals
    if (job.status !== JobStatus.ACTIVE) {
      throw new Error('This job is no longer accepting proposals');
    }

    // Get expert (current user) info
    const expert = await User.findById(userId)
      .select('_id name email profilePhoto professionalTitle')
      .lean();
    if (!expert) {
      throw new Error('User not found');
    }

    // Check for existing proposal
    const existingProposal = await JobProposal.findOne({
      jobId,
      asssignedExpertId: userId,
    })
      .select('_id status')
      .lean();

    // Get user's hub membership and hub experts
    let hubExperts: HubExpert[] = [];
    let hubPlan: string | undefined;

    // Find user's active hub membership
    const hubMembership = await HubMember.findOne({
      userId,
      status: HubMemberStatus.ACTIVE,
    }).lean();

    if (hubMembership) {
      // Get all experts from the hub
      hubExperts = await this.getHubExperts(hubMembership.hubId.toString());

      // If no experts found (or only current user), default to current user
      if (hubExperts.length === 0) {
        hubExperts = [
          {
            _id: expert._id.toString(),
            name: expert.name,
            email: expert.email,
            profileImage: expert.profilePhoto,
          },
        ];
      }

      // Determine plan based on expert count (scale = 1 expert only, soar = multiple)
      hubPlan = hubExperts.length <= 1 ? 'scale' : 'soar';
    } else {
      // User not in any hub - they can only submit as themselves
      hubExperts = [
        {
          _id: expert._id.toString(),
          name: expert.name,
          email: expert.email,
          profileImage: expert.profilePhoto,
        },
      ];
    }

    return {
      job: {
        _id: job._id.toString(),
        jobTitle: job.jobTitle,
        jobDescription: job.jobDescription,
        jobSummary: job.jobSummary,
        employmentType: job.employmentType,
        serviceCategory: job.serviceCategory,
        expertLevel: job.expertLevel,
        jobLocation: job.jobLocation,
        jobBudget: job.jobBudget,
        jobCurrency: job.jobCurrency,
        jobSkills: job.jobSkills,
        client: {
          name: job.name,
          organizationName: job.organizationName,
          organizationImage: job.organizationImage,
        },
      },
      expert: {
        _id: expert._id.toString(),
        name: expert.name,
        email: expert.email,
        profilePhoto: expert.profilePhoto,
        professionalTitle: expert.professionalTitle,
      },
      hubExperts,
      hubPlan,
      hasExistingProposal: !!existingProposal,
      existingProposalId: existingProposal?._id.toString(),
    };
  }

  /**
   * Get all experts from a hub
   */
  private async getHubExperts(hubId: string): Promise<HubExpert[]> {
    // Find the expert role
    const expertRole = await Role.findOne({
      key: SystemRoleKey.EXPERT,
      isSystemRole: true,
    }).lean();

    if (!expertRole) {
      return [];
    }

    // Find all hub members with expert role (or owner/admin who can also submit)
    const ownerRole = await Role.findOne({ key: SystemRoleKey.OWNER, isSystemRole: true }).lean();
    const adminRole = await Role.findOne({ key: SystemRoleKey.ADMIN, isSystemRole: true }).lean();

    const roleIds = [expertRole._id];
    if (ownerRole) roleIds.push(ownerRole._id);
    if (adminRole) roleIds.push(adminRole._id);

    const members = await HubMember.find({
      hubId,
      status: HubMemberStatus.ACTIVE,
      roleIds: { $in: roleIds },
    })
      .populate<{ userId: { _id: string; name: string; email: string; profilePhoto?: string } }>(
        'userId',
        '_id name email profilePhoto',
      )
      .lean();

    // Map to HubExpert format
    return members
      .filter((m) => m.userId) // Filter out members without user (invited but not joined)
      .map((m) => ({
        _id: m.userId._id.toString(),
        name: m.userId.name,
        email: m.userId.email,
        profileImage: m.userId.profilePhoto,
      }));
  }

  /**
   * Submit a proposal
   * Delegates to hubProposalService for actual creation
   */
  async submitProposal(data: SubmitProposalInput, userId: string): Promise<SubmitProposalResponse> {
    // Validate price type requirements
    if (data.priceType === 'fixed') {
      if (data.proposedPrice === undefined || data.proposedPrice <= 0) {
        throw new Error('Proposed price is required for fixed price proposals');
      }

      // Validate milestones total doesn't exceed proposed price
      if (data.milestones && data.milestones.length > 0) {
        const milestonesTotal = data.milestones.reduce((sum, m) => sum + m.amount, 0);
        if (milestonesTotal > data.proposedPrice) {
          throw new Error('Milestones total cannot exceed proposed price');
        }
      }
    } else if (data.priceType === 'hourly') {
      if (data.hourlyProposedPrice === undefined || data.hourlyProposedPrice <= 0) {
        throw new Error('Hourly rate is required for hourly proposals');
      }
      if (data.workingHours === undefined || data.workingHours <= 0) {
        throw new Error('Working hours is required for hourly proposals');
      }
    }

    // Validate milestones dates are in the future
    if (data.milestones && data.milestones.length > 0) {
      const now = new Date();
      for (const milestone of data.milestones) {
        const dueDate = new Date(milestone.dueDate);
        if (dueDate <= now) {
          throw new Error('Milestone due dates must be in the future');
        }
      }
    }

    // Create proposal using hub service
    const proposal = await hubProposalService.createProposal(
      {
        jobId: data.jobId,
        asssignedExpertId: data.asssignedExpertId, // Pass selected expert (or undefined to use userId)
        proposalDetails: data.proposalDetails,
        priceType: data.priceType === 'fixed' ? PriceType.FIXED : PriceType.HOURLY,
        proposedPrice: data.proposedPrice,
        hourlyProposedPrice: data.hourlyProposedPrice,
        workingHours: data.workingHours,
        selectedCurrency: data.selectedCurrency.toUpperCase(),
        files: data.files || [],
        milestones: data.milestones?.map((m) => ({
          taskName: m.taskName,
          taskDescription: m.taskDescription,
          amount: m.amount,
          dueDate: m.dueDate,
        })),
      },
      userId,
    );

    // Cast to IJobProposal for type safety
    const proposalDoc = proposal as IJobProposal;

    return {
      proposalId: String(proposalDoc._id),
      status: proposalDoc.status,
    };
  }

  /**
   * Get proposal by ID (for success page)
   */
  async getProposalById(proposalId: string, userId: string) {
    const proposal = await JobProposal.findById(proposalId).lean();

    if (!proposal) {
      throw new Error('Proposal not found');
    }

    // Verify user can view this proposal (either assigned expert or creator)
    const isAssignedExpert = proposal.asssignedExpertId.toString() === userId;
    const isCreator = proposal.createdBy?.toString() === userId;
    if (!isAssignedExpert && !isCreator) {
      throw new Error('Not authorized to view this proposal');
    }

    // Get job details
    const job = await Job.findById(proposal.jobId).lean();

    return {
      proposal: {
        _id: proposal._id.toString(),
        status: proposal.status,
        proposalDetails: proposal.proposalDetails,
        priceType: proposal.priceType,
        proposedPrice: proposal.proposedPrice,
        hourlyProposedPrice: proposal.hourlyProposedPrice,
        workingHours: proposal.workingHours,
        selectedCurrency: proposal.selectedCurrency,
        createdAt: proposal.createdAt,
      },
      job: job
        ? {
            _id: job._id.toString(),
            jobTitle: job.jobTitle,
            client: {
              name: job.name,
              organizationName: job.organizationName,
            },
          }
        : null,
    };
  }
}

export const checkoutProposalService = new CheckoutProposalService();
