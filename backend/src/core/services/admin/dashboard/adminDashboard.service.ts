import { Contract } from '@core/models/Contract';
import { Experience } from '@core/models/Experience';
import { Expertise } from '@core/models/Expertise';
import { Hub } from '@core/models/Hub';
import { Job } from '@core/models/Job';
import { JobProposal } from '@core/models/JobProposal';
import { User } from '@core/models/User';

export interface DashboardStats {
  users: {
    total: number;
    active: number;
    inactive: number;
    newThisMonth: number;
  };
  hubs: {
    total: number;
    active: number;
    pending: number;
  };
  jobs: {
    total: number;
    active: number;
    completed: number;
    inProgress: number;
  };
  contracts: {
    total: number;
    active: number;
    completed: number;
    pending: number;
  };
  proposals: {
    total: number;
    pending: number;
    accepted: number;
    rejected: number;
  };
  experiences: {
    total: number;
    published: number;
    draft: number;
  };
  expertise: {
    total: number;
    published: number;
    draft: number;
  };
}

export class AdminDashboardService {
  /**
   * Get comprehensive dashboard statistics
   */
  async getDashboardStats(): Promise<DashboardStats> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Run all queries in parallel for performance
    const [
      // User stats
      totalUsers,
      activeUsers,
      inactiveUsers,
      newUsersThisMonth,
      // Hub stats
      totalHubs,
      activeHubs,
      pendingHubs,
      // Job stats
      totalJobs,
      activeJobs,
      completedJobs,
      inProgressJobs,
      // Contract stats
      totalContracts,
      activeContracts,
      completedContracts,
      pendingContracts,
      // Proposal stats
      totalProposals,
      pendingProposals,
      acceptedProposals,
      rejectedProposals,
      // Experience stats
      totalExperiences,
      publishedExperiences,
      draftExperiences,
      // Expertise stats
      totalExpertise,
      publishedExpertise,
      draftExpertise,
    ] = await Promise.all([
      // Users
      User.countDocuments(),
      User.countDocuments({ status: 'active' }),
      User.countDocuments({ status: { $ne: 'active' } }),
      User.countDocuments({ createdAt: { $gte: startOfMonth } }),
      // Hubs
      Hub.countDocuments(),
      Hub.countDocuments({ status: 'active' }),
      Hub.countDocuments({ status: 'pending' }),
      // Jobs
      Job.countDocuments(),
      Job.countDocuments({ status: 'ACTIVE' }),
      Job.countDocuments({ status: 'COMPLETED' }),
      Job.countDocuments({ status: 'IN_PROGRESS' }),
      // Contracts
      Contract.countDocuments(),
      Contract.countDocuments({ status: 'active' }),
      Contract.countDocuments({ status: 'completed' }),
      Contract.countDocuments({ status: 'pending' }),
      // Proposals
      JobProposal.countDocuments(),
      JobProposal.countDocuments({ status: 'pending' }),
      JobProposal.countDocuments({ status: 'accepted' }),
      JobProposal.countDocuments({ status: 'rejected' }),
      // Experiences
      Experience.countDocuments(),
      Experience.countDocuments({ status: 'published' }),
      Experience.countDocuments({ status: 'draft' }),
      // Expertise
      Expertise.countDocuments(),
      Expertise.countDocuments({ status: 'published' }),
      Expertise.countDocuments({ status: 'draft' }),
    ]);

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        inactive: inactiveUsers,
        newThisMonth: newUsersThisMonth,
      },
      hubs: {
        total: totalHubs,
        active: activeHubs,
        pending: pendingHubs,
      },
      jobs: {
        total: totalJobs,
        active: activeJobs,
        completed: completedJobs,
        inProgress: inProgressJobs,
      },
      contracts: {
        total: totalContracts,
        active: activeContracts,
        completed: completedContracts,
        pending: pendingContracts,
      },
      proposals: {
        total: totalProposals,
        pending: pendingProposals,
        accepted: acceptedProposals,
        rejected: rejectedProposals,
      },
      experiences: {
        total: totalExperiences,
        published: publishedExperiences,
        draft: draftExperiences,
      },
      expertise: {
        total: totalExpertise,
        published: publishedExpertise,
        draft: draftExpertise,
      },
    };
  }
}

export const adminDashboardService = new AdminDashboardService();
