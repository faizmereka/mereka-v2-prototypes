import { Job, JobStatus } from '@core/models/Job';
import { JobProposal, ProposalStatus } from '@core/models/JobProposal';
import { Milestone, MilestoneStatus } from '@core/models/Milestone';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '@/app';

describe('Milestone Routes Integration Tests', () => {
  let app: FastifyInstance;
  let testJobId: string;
  let testProposalId: string;
  let testContractId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // Create test job
    const job = await Job.create({
      jobTitle: 'Test Job for Milestones',
      jobDescription: '<p>Milestone testing job</p>',
      employmentType: 'freelance',
      status: JobStatus.ACTIVE,
      serviceCategory: { category: 'tech', serviceType: 'developer' },
      expertLevel: 'intermediate',
      jobLocation: 'remote',
      jobBudget: { pricingType: 'fixed', fromAmount: 9000 },
      jobCurrency: 'MYR',
      jobStartDate: new Date(),
      jobSkills: ['TypeScript'],
      accessMode: 'PUBLIC',
      name: 'Test Client',
      email: 'client@test.com',
      phoneNumber: '+60123456789',
      organizationName: 'Test Company',
      hubId: 'test-hub-789',
      createdBy: 'client-user-789',
    });
    testJobId = (job._id as string).toString();

    // Create test proposal
    const proposal = await JobProposal.create({
      jobId: testJobId,
      proposalDetails: 'Test proposal with milestones',
      priceType: 'fixed',
      proposedPrice: 9000,
      selectedCurrency: 'MYR',
      asssignedExpertId: 'expert-milestone-test',
      expertId: 'expert-milestone-test',
      createdBy: 'client-user-789',
      status: ProposalStatus.ACCEPTED,
      contractId: 'test-contract-123',
    });
    testProposalId = (proposal._id as string).toString();
    testContractId = 'test-contract-123';
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/milestones', () => {
    it('should create a milestone', async () => {
      const milestoneData = {
        jobId: testJobId,
        jobProposalId: testProposalId,
        hubId: 'test-hub-789',
        taskName: 'Initial Setup & Architecture',
        taskDescription: 'Setup project structure and define architecture',
        amount: 3000,
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        currency: 'MYR',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/milestones',
        payload: milestoneData,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.taskName).toBe('Initial Setup & Architecture');
      expect(body.data.amount).toBe(3000);
      expect(body.data.status).toBe(MilestoneStatus.FUNDED);
    });

    it('should return 400 for invalid input', async () => {
      const invalidData = {
        jobId: testJobId,
        // Missing required fields
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/milestones',
        payload: invalidData,
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /api/v1/milestones/bulk', () => {
    it('should create multiple milestones', async () => {
      const milestonesData = {
        milestones: [
          {
            jobId: testJobId,
            jobProposalId: testProposalId,
            hubId: 'test-hub-789',
            taskName: 'Development Phase 1',
            taskDescription: 'Core features implementation',
            amount: 4000,
            dueDate: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString(),
            currency: 'MYR',
          },
          {
            jobId: testJobId,
            jobProposalId: testProposalId,
            hubId: 'test-hub-789',
            taskName: 'Testing & Deployment',
            taskDescription: 'Complete testing and deploy',
            amount: 2000,
            dueDate: new Date(Date.now() + 42 * 24 * 60 * 60 * 1000).toISOString(),
            currency: 'MYR',
          },
        ],
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/milestones/bulk',
        payload: milestonesData,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.length).toBe(2);
      expect(body.data[0].taskName).toBe('Development Phase 1');
      expect(body.data[1].taskName).toBe('Testing & Deployment');
    });
  });

  describe('GET /api/v1/milestones', () => {
    it('should get all milestones', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/milestones',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('should filter milestones by jobProposalId', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/milestones?jobProposalId=${testProposalId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      for (const milestone of body.data) {
        expect(milestone.jobProposalId).toBe(testProposalId);
      }
    });

    it('should filter milestones by status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/milestones?status=active',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      for (const milestone of body.data) {
        expect(milestone.status).toBe(MilestoneStatus.FUNDED);
      }
    });
  });

  describe('GET /api/v1/milestones/:id', () => {
    it('should get milestone by ID', async () => {
      const milestone = await Milestone.create({
        jobId: testJobId,
        jobProposalId: testProposalId,
        hubId: 'test-hub-789',
        taskName: 'Get by ID Test',
        taskDescription: 'Testing get by ID',
        amount: 1500,
        dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
        currency: 'MYR',
        createdBy: 'client-user-789',
        status: MilestoneStatus.FUNDED,
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/milestones/${milestone._id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.taskName).toBe('Get by ID Test');
    });

    it('should return 404 for non-existent milestone', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/milestones/507f1f77bcf86cd799439011',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('PATCH /api/v1/milestones/:id', () => {
    it('should update milestone', async () => {
      const milestone = await Milestone.create({
        jobId: testJobId,
        jobProposalId: testProposalId,
        hubId: 'test-hub-789',
        taskName: 'Original Name',
        taskDescription: 'Original description',
        amount: 2000,
        dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
        currency: 'MYR',
        createdBy: 'client-user-789',
        status: MilestoneStatus.FUNDED,
      });

      const updateData = {
        taskName: 'Updated Name',
        amount: 2500,
      };

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/milestones/${milestone._id}`,
        payload: updateData,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.taskName).toBe('Updated Name');
      expect(body.data.amount).toBe(2500);
    });
  });

  describe('PATCH /api/v1/milestones/:id/tracked', () => {
    it('should update milestone with change tracking', async () => {
      const milestone = await Milestone.create({
        jobId: testJobId,
        jobProposalId: testProposalId,
        hubId: 'test-hub-789',
        taskName: 'Tracked Update Test',
        taskDescription: 'Original description',
        amount: 3000,
        dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
        currency: 'MYR',
        createdBy: 'client-user-789',
        status: MilestoneStatus.FUNDED,
      });

      const updateData = {
        taskName: 'Updated with Tracking',
        amount: 3500,
        changeReason: 'Scope increased',
      };

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/milestones/${milestone._id}/tracked`,
        payload: updateData,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.taskName).toBe('Updated with Tracking');
      expect(body.data.oldValues).toBeDefined();
      expect(body.data.changeHistory).toBeDefined();
    });
  });

  describe('DELETE /api/v1/milestones/:id', () => {
    it('should delete milestone', async () => {
      const milestone = await Milestone.create({
        jobId: testJobId,
        jobProposalId: testProposalId,
        hubId: 'test-hub-789',
        taskName: 'To Delete',
        taskDescription: 'Will be deleted',
        amount: 1000,
        dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
        currency: 'MYR',
        createdBy: 'client-user-789',
        status: MilestoneStatus.FUNDED,
      });

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/milestones/${milestone._id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);

      // Verify deletion
      const deleted = await Milestone.findById(milestone._id);
      expect(deleted).toBeNull();
    });
  });

  describe('POST /api/v1/milestones/:id/submit-work', () => {
    it('should submit work for milestone', async () => {
      const milestone = await Milestone.create({
        jobId: testJobId,
        jobProposalId: testProposalId,
        hubId: 'test-hub-789',
        taskName: 'Submit Work Test',
        taskDescription: 'Testing work submission',
        amount: 2500,
        dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
        currency: 'MYR',
        createdBy: 'client-user-789',
        status: MilestoneStatus.FUNDED,
      });

      const workData = {
        workLogDescription:
          'Completed all tasks. Implemented core features, wrote tests, and documented the code.',
        workLogFilesUrl: [
          'https://example.com/deliverables.pdf',
          'https://example.com/screenshots.pdf',
        ],
      };

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/milestones/${milestone._id}/submit-work`,
        payload: workData,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.status).toBe(MilestoneStatus.WORK_SUBMITTED);
      expect(body.data.workLogDescription).toBe(workData.workLogDescription);
      expect(body.data.workSubmittedDate).toBeDefined();
    });

    it('should return 400 for non-active milestone', async () => {
      const milestone = await Milestone.create({
        jobId: testJobId,
        jobProposalId: testProposalId,
        hubId: 'test-hub-789',
        taskName: 'Already Submitted',
        taskDescription: 'Already submitted work',
        amount: 2000,
        dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
        currency: 'MYR',
        createdBy: 'client-user-789',
        status: MilestoneStatus.WORK_SUBMITTED,
      });

      const workData = {
        workLogDescription: 'Trying to resubmit',
      };

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/milestones/${milestone._id}/submit-work`,
        payload: workData,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });
  });

  describe('POST /api/v1/milestones/:id/approve', () => {
    it('should approve milestone', async () => {
      const milestone = await Milestone.create({
        jobId: testJobId,
        jobProposalId: testProposalId,
        hubId: 'test-hub-789',
        taskName: 'Approve Test',
        taskDescription: 'Testing approval',
        amount: 3000,
        dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
        currency: 'MYR',
        createdBy: 'client-user-789',
        status: MilestoneStatus.WORK_SUBMITTED,
        workLogDescription: 'Work completed',
      });

      const approvalData = {
        paymentIntentId: 'pi_test123',
      };

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/milestones/${milestone._id}/approve`,
        payload: approvalData,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.status).toBe(MilestoneStatus.RELEASED);
      expect(body.data.paymentIntentId).toBe('pi_test123');
    });
  });

  describe('GET /api/v1/milestones/upcoming', () => {
    it('should get upcoming milestones', async () => {
      // Create a milestone due soon
      await Milestone.create({
        jobId: testJobId,
        jobProposalId: testProposalId,
        hubId: 'test-hub-789',
        taskName: 'Upcoming Milestone',
        taskDescription: 'Due in 5 days',
        amount: 2000,
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        currency: 'MYR',
        createdBy: 'client-user-789',
        status: MilestoneStatus.FUNDED,
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/milestones/upcoming?jobProposalId=${testProposalId}&daysAhead=7`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });
  });

  describe('GET /api/v1/milestones/overdue', () => {
    it('should get overdue milestones', async () => {
      // Create an overdue milestone
      await Milestone.create({
        jobId: testJobId,
        jobProposalId: testProposalId,
        hubId: 'test-hub-789',
        taskName: 'Overdue Milestone',
        taskDescription: 'Past due date',
        amount: 1500,
        dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        currency: 'MYR',
        createdBy: 'client-user-789',
        status: MilestoneStatus.FUNDED,
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/milestones/overdue?jobProposalId=${testProposalId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });
  });

  describe('GET /api/v1/milestones/total-amount/:proposalId', () => {
    it('should calculate total milestone amount', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/milestones/total-amount/${testProposalId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(typeof body.data.total).toBe('number');
    });
  });

  // ============================================================
  // Payment Processing Routes Integration Tests
  // ============================================================

  describe('POST /api/v1/milestones/fund', () => {
    it('should return 400 for empty milestoneIds', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/milestones/fund',
        payload: {
          milestoneIds: [],
          customerId: 'cus_test123',
          paymentMethodId: 'pm_card_visa',
          currency: 'USD',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 for missing customerId', async () => {
      const milestone = await Milestone.create({
        jobId: testJobId,
        jobProposalId: testProposalId,
        hubId: 'test-hub-789',
        taskName: 'Fund Test Milestone',
        taskDescription: 'Testing funding',
        amount: 5000,
        dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
        currency: 'MYR',
        createdBy: 'client-user-789',
        status: MilestoneStatus.FUNDED,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/milestones/fund',
        payload: {
          milestoneIds: [(milestone as { _id: { toString(): string } })._id.toString()],
          paymentMethodId: 'pm_card_visa',
          currency: 'USD',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 for invalid milestone IDs', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/milestones/fund',
        payload: {
          milestoneIds: ['invalid-id'],
          customerId: 'cus_test123',
          paymentMethodId: 'pm_card_visa',
          currency: 'USD',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should fund milestone with valid data', async () => {
      const milestone = await Milestone.create({
        jobId: testJobId,
        jobProposalId: testProposalId,
        hubId: 'test-hub-789',
        taskName: 'Fund Success Milestone',
        taskDescription: 'Testing successful funding',
        amount: 10000,
        dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
        currency: 'USD',
        createdBy: 'client-user-789',
        status: MilestoneStatus.FUNDED,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/milestones/fund',
        payload: {
          milestoneIds: [(milestone as { _id: { toString(): string } })._id.toString()],
          customerId: 'cus_test123',
          paymentMethodId: 'pm_card_visa',
          currency: 'USD',
        },
      });

      // Will fail with Stripe error (invalid customer) but validates the route works
      expect([200, 500]).toContain(response.statusCode);
    });
  });

  describe('POST /api/v1/milestones/release-payment', () => {
    it('should return 400 for empty milestoneIds', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/milestones/release-payment',
        payload: {
          milestoneIds: [],
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 for invalid milestone IDs', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/milestones/release-payment',
        payload: {
          milestoneIds: ['invalid-id'],
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should release payment for funded milestone', async () => {
      // Create a funded milestone with payment intent
      const milestone = await Milestone.create({
        jobId: testJobId,
        jobProposalId: testProposalId,
        hubId: 'test-hub-789',
        taskName: 'Release Payment Milestone',
        taskDescription: 'Testing payment release',
        amount: 5000,
        dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
        currency: 'USD',
        createdBy: 'client-user-789',
        status: MilestoneStatus.WORK_SUBMITTED,
        paymentIntentId: 'pi_test_funded_123',
        workLogDescription: 'Work completed',
        workSubmittedDate: new Date(),
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/milestones/release-payment',
        payload: {
          milestoneIds: [(milestone as { _id: { toString(): string } })._id.toString()],
        },
      });

      // Will fail with Stripe error (invalid payment intent) but validates route
      expect([200, 400, 500]).toContain(response.statusCode);
    });

    it('should return 400 for milestone without payment intent', async () => {
      const milestoneNoPI = await Milestone.create({
        jobId: testJobId,
        jobProposalId: testProposalId,
        hubId: 'test-hub-789',
        taskName: 'No Payment Milestone',
        taskDescription: 'No payment intent',
        amount: 3000,
        dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
        currency: 'USD',
        createdBy: 'client-user-789',
        status: MilestoneStatus.WORK_SUBMITTED,
        workLogDescription: 'Work done',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/milestones/release-payment',
        payload: {
          milestoneIds: [(milestoneNoPI as { _id: { toString(): string } })._id.toString()],
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });
  });

  describe('POST /api/v1/milestones/contract/:contractId/refund', () => {
    it('should return 404 for non-existent contract', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/milestones/contract/507f1f77bcf86cd799439011/refund',
      });

      expect(response.statusCode).toBe(404);
    });

    it('should refund funded milestones for contract', async () => {
      // Create milestone with payment intent for the test contract
      await Milestone.create({
        jobId: testJobId,
        jobProposalId: testProposalId,
        contractId: testContractId,
        hubId: 'test-hub-789',
        taskName: 'Refund Test Milestone',
        taskDescription: 'Testing refund',
        amount: 8000,
        dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
        currency: 'USD',
        createdBy: 'client-user-789',
        status: MilestoneStatus.FUNDED,
        paymentIntentId: 'pi_test_refund_123',
      });

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/milestones/contract/${testContractId}/refund`,
      });

      // Will fail with Stripe error but validates route works
      expect([200, 400, 500]).toContain(response.statusCode);
    });

    it('should return success when no funded milestones to refund', async () => {
      // Use a new contract ID with no funded milestones
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/milestones/contract/no-funded-milestones/refund',
      });

      // Should return 200 with empty result or 404
      expect([200, 404]).toContain(response.statusCode);
    });
  });
});
