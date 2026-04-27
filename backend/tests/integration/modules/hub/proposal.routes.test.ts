import { Job, JobStatus } from '@core/models/Job';
import { JobProposal, ProposalStatus } from '@core/models/JobProposal';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '@/app';

describe('Proposal Routes Integration Tests', () => {
  let app: FastifyInstance;
  let testJobId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // Create a test job for proposals
    const job = await Job.create({
      jobTitle: 'Test Job for Proposals',
      jobDescription: '<p>This is a test job for proposal testing</p>',
      employmentType: 'freelance',
      status: JobStatus.ACTIVE,
      serviceCategory: { category: 'tech', serviceType: 'developer' },
      expertLevel: 'intermediate',
      jobLocation: 'remote',
      jobBudget: { pricingType: 'fixed', fromAmount: 5000, upToAmount: 8000 },
      jobCurrency: 'MYR',
      jobStartDate: new Date(),
      jobSkills: ['TypeScript', 'Node.js'],
      accessMode: 'PUBLIC',
      name: 'Test Client',
      email: 'client@test.com',
      phoneNumber: '+60123456789',
      organizationName: 'Test Company',
      hubId: 'test-hub-123',
      createdBy: 'client-user-123',
    });
    testJobId = (job._id as string).toString();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/proposals', () => {
    it('should create a fixed price proposal', async () => {
      const proposalData = {
        jobId: testJobId,
        proposalDetails:
          'I am an experienced developer with 5+ years in Node.js and TypeScript. I can deliver this project within 2 months.',
        priceType: 'fixed',
        proposedPrice: 6000,
        selectedCurrency: 'MYR',
        files: ['https://example.com/portfolio.pdf'],
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/proposals',
        payload: proposalData,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.jobId).toBe(testJobId);
      expect(body.data.priceType).toBe('fixed');
      expect(body.data.proposedPrice).toBe(6000);
      expect(body.data.status).toBe(ProposalStatus.PENDING);
    });

    it('should create an hourly proposal', async () => {
      const proposalData = {
        jobId: testJobId,
        proposalDetails: 'I can work on this project at an hourly rate. I estimate 80 hours total.',
        priceType: 'hourly',
        hourlyProposedPrice: 150,
        workingHours: 80,
        selectedCurrency: 'MYR',
        files: [],
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/proposals',
        payload: proposalData,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.priceType).toBe('hourly');
      expect(body.data.hourlyProposedPrice).toBe(150);
      expect(body.data.workingHours).toBe(80);
    });

    it('should create proposal with milestones', async () => {
      const proposalData = {
        jobId: testJobId,
        proposalDetails: 'Proposal with milestones',
        priceType: 'fixed',
        proposedPrice: 9000,
        selectedCurrency: 'MYR',
        milestones: [
          {
            taskName: 'Initial Setup',
            taskDescription: 'Setup project and architecture',
            amount: 3000,
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            taskName: 'Development',
            taskDescription: 'Core feature implementation',
            amount: 4000,
            dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            taskName: 'Testing & Deployment',
            taskDescription: 'Final testing and deployment',
            amount: 2000,
            dueDate: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ],
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/proposals',
        payload: proposalData,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.proposedPrice).toBe(9000);
    });

    it('should return 409 for duplicate proposal', async () => {
      // Create first proposal
      await JobProposal.create({
        jobId: testJobId,
        proposalDetails: 'First proposal',
        priceType: 'fixed',
        proposedPrice: 5000,
        selectedCurrency: 'MYR',
        asssignedExpertId: 'expert-duplicate-test',
        expertId: 'expert-duplicate-test',
        createdBy: 'client-user-123',
        status: ProposalStatus.PENDING,
      });

      // Try to create second proposal with same expert
      const proposalData = {
        jobId: testJobId,
        proposalDetails: 'Second proposal (should fail)',
        priceType: 'fixed',
        proposedPrice: 6000,
        selectedCurrency: 'MYR',
        asssignedExpertId: 'expert-duplicate-test',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/proposals',
        payload: proposalData,
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.message).toContain('already submitted');
    });

    it('should return 400 for invalid input', async () => {
      const invalidData = {
        jobId: testJobId,
        // Missing required fields
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/proposals',
        payload: invalidData,
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/proposals', () => {
    it('should get all proposals', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/proposals',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('should filter proposals by jobId', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/proposals?jobId=${testJobId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      for (const proposal of body.data) {
        expect(proposal.jobId).toBe(testJobId);
      }
    });

    it('should filter proposals by status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/proposals?status=pending',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      for (const proposal of body.data) {
        expect(proposal.status).toBe(ProposalStatus.PENDING);
      }
    });
  });

  describe('GET /api/v1/proposals/:id', () => {
    it('should get proposal by ID', async () => {
      const proposal = await JobProposal.create({
        jobId: testJobId,
        proposalDetails: 'Test proposal for get by ID',
        priceType: 'fixed',
        proposedPrice: 7000,
        selectedCurrency: 'MYR',
        asssignedExpertId: 'expert-get-test',
        expertId: 'expert-get-test',
        createdBy: 'client-user-123',
        status: ProposalStatus.PENDING,
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/proposals/${proposal._id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.proposalDetails).toBe('Test proposal for get by ID');
    });

    it('should return 404 for non-existent proposal', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/proposals/507f1f77bcf86cd799439011',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('PATCH /api/v1/proposals/:id', () => {
    it('should update proposal', async () => {
      const proposal = await JobProposal.create({
        jobId: testJobId,
        proposalDetails: 'Original proposal',
        priceType: 'fixed',
        proposedPrice: 5000,
        selectedCurrency: 'MYR',
        asssignedExpertId: 'expert-update-test',
        expertId: 'expert-update-test',
        createdBy: 'client-user-123',
        status: ProposalStatus.PENDING,
      });

      const updateData = {
        proposalDetails: 'Updated proposal details',
        proposedPrice: 5500,
      };

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/proposals/${proposal._id}`,
        payload: updateData,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.proposalDetails).toBe('Updated proposal details');
      expect(body.data.proposedPrice).toBe(5500);
    });
  });

  describe('POST /api/v1/proposals/:id/withdraw', () => {
    it('should withdraw proposal', async () => {
      const proposal = await JobProposal.create({
        jobId: testJobId,
        proposalDetails: 'Proposal to withdraw',
        priceType: 'fixed',
        proposedPrice: 6000,
        selectedCurrency: 'MYR',
        asssignedExpertId: 'expert-withdraw-test',
        expertId: 'expert-withdraw-test',
        createdBy: 'client-user-123',
        status: ProposalStatus.PENDING,
      });

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/proposals/${proposal._id}/withdraw`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.status).toBe(ProposalStatus.WITHDRAWN);
    });
  });

  describe('POST /api/v1/proposals/:id/reject', () => {
    it('should reject proposal', async () => {
      const proposal = await JobProposal.create({
        jobId: testJobId,
        proposalDetails: 'Proposal to reject',
        priceType: 'fixed',
        proposedPrice: 4000,
        selectedCurrency: 'MYR',
        asssignedExpertId: 'expert-reject-test',
        expertId: 'expert-reject-test',
        createdBy: 'client-user-123',
        status: ProposalStatus.PENDING,
      });

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/proposals/${proposal._id}/reject`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.status).toBe(ProposalStatus.REJECTED);
    });
  });
});
