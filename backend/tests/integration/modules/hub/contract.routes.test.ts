import { Contract, ContractStatus } from '@core/models/Contract';
import { Job, JobStatus } from '@core/models/Job';
import { JobProposal, ProposalStatus } from '@core/models/JobProposal';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '@/app';

describe('Contract Routes Integration Tests', () => {
  let app: FastifyInstance;
  let testJobId: string;
  let testProposalId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // Create a test job
    const job = await Job.create({
      jobTitle: 'Test Job for Contracts',
      jobDescription: '<p>Contract testing job</p>',
      employmentType: 'freelance',
      status: JobStatus.ACTIVE,
      serviceCategory: { category: 'tech', serviceType: 'developer' },
      expertLevel: 'intermediate',
      jobLocation: 'remote',
      jobBudget: { pricingType: 'fixed', fromAmount: 5000 },
      jobCurrency: 'MYR',
      jobStartDate: new Date(),
      jobSkills: ['TypeScript'],
      accessMode: 'PUBLIC',
      name: 'Test Client',
      email: 'client@test.com',
      phoneNumber: '+60123456789',
      organizationName: 'Test Company',
      hubId: 'test-hub-456',
      createdBy: 'client-user-456',
    });
    testJobId = (job._id as string).toString();

    // Create a test proposal
    const proposal = await JobProposal.create({
      jobId: testJobId,
      proposalDetails: 'Test proposal for contract',
      priceType: 'fixed',
      proposedPrice: 6000,
      selectedCurrency: 'MYR',
      asssignedExpertId: 'expert-contract-test',
      expertId: 'expert-contract-test',
      createdBy: 'client-user-456',
      status: ProposalStatus.PENDING,
    });
    testProposalId = (proposal._id as string).toString();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/contracts', () => {
    it('should create a fixed price contract', async () => {
      const contractData = {
        jobId: testJobId,
        jobProposalId: testProposalId,
        hubId: 'test-hub-456',
        contractTitle: 'Test Contract',
        contractDescription: 'This is a test contract for fixed price work',
        priceType: 'fixed',
        proposedPrice: 6000,
        hasMilestones: true,
        selectedCurrency: 'MYR',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        asssignedExpertId: 'expert-contract-test',
        stripeCustomerId: 'cus_test123',
        stripeAccount: 'acct_test123',
        paymentMethodId: 'pm_test123',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/contracts',
        payload: contractData,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.contractTitle).toBe('Test Contract');
      expect(body.data.priceType).toBe('fixed');
      expect(body.data.status).toBe(ContractStatus.PENDING);
    });

    it('should create an hourly contract', async () => {
      // Create another proposal for hourly contract
      const hourlyProposal = await JobProposal.create({
        jobId: testJobId,
        proposalDetails: 'Hourly proposal',
        priceType: 'hourly',
        hourlyProposedPrice: 150,
        workingHours: 80,
        selectedCurrency: 'MYR',
        asssignedExpertId: 'expert-hourly-test',
        expertId: 'expert-hourly-test',
        createdBy: 'client-user-456',
        status: ProposalStatus.PENDING,
      });

      const contractData = {
        jobId: testJobId,
        jobProposalId: (hourlyProposal._id as string).toString(),
        hubId: 'test-hub-456',
        contractTitle: 'Hourly Test Contract',
        contractDescription: 'Hourly contract for testing',
        priceType: 'hourly',
        hourlyProposedPrice: 150,
        weeklyLimit: 40,
        selectedCurrency: 'MYR',
        startDate: new Date().toISOString(),
        asssignedExpertId: 'expert-hourly-test',
        stripeCustomerId: 'cus_hourly123',
        stripeAccount: 'acct_hourly123',
        paymentMethodId: 'pm_hourly123',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/contracts',
        payload: contractData,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.priceType).toBe('hourly');
      expect(body.data.hourlyProposedPrice).toBe(150);
      expect(body.data.weeklyLimit).toBe(40);
    });

    it('should return 400 for duplicate contract', async () => {
      // Try to create another contract for the same proposal
      const contractData = {
        jobId: testJobId,
        jobProposalId: testProposalId,
        hubId: 'test-hub-456',
        contractTitle: 'Duplicate Contract',
        contractDescription: 'Should fail',
        priceType: 'fixed',
        proposedPrice: 6000,
        selectedCurrency: 'MYR',
        startDate: new Date().toISOString(),
        asssignedExpertId: 'expert-contract-test',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/contracts',
        payload: contractData,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.message).toContain('already exists');
    });
  });

  describe('GET /api/v1/contracts', () => {
    it('should get all contracts', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/contracts',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('should filter contracts by status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/contracts?status=pending',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      for (const contract of body.data) {
        expect(contract.status).toBe(ContractStatus.PENDING);
      }
    });

    it('should filter contracts by hubId', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/contracts?hubId=test-hub-456',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      for (const contract of body.data) {
        expect(contract.hubId).toBe('test-hub-456');
      }
    });
  });

  describe('GET /api/v1/contracts/:id', () => {
    it('should get contract by ID', async () => {
      // Create another proposal and contract for this test
      const proposal = await JobProposal.create({
        jobId: testJobId,
        proposalDetails: 'Get by ID test',
        priceType: 'fixed',
        proposedPrice: 5000,
        selectedCurrency: 'MYR',
        asssignedExpertId: 'expert-get-test',
        expertId: 'expert-get-test',
        createdBy: 'client-user-456',
        status: ProposalStatus.PENDING,
      });

      const contract = await Contract.create({
        jobId: testJobId,
        jobProposalId: (proposal._id as string).toString(),
        hubId: 'test-hub-456',
        contractTitle: 'Contract for Get Test',
        contractDescription: 'Testing get by ID',
        priceType: 'fixed',
        proposedPrice: 5000,
        selectedCurrency: 'MYR',
        startDate: new Date(),
        asssignedExpertId: 'expert-get-test',
        expertId: 'expert-get-test',
        createdBy: 'client-user-456',
        status: ContractStatus.PENDING,
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/contracts/${contract._id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.contractTitle).toBe('Contract for Get Test');
    });

    it('should return 404 for non-existent contract', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/contracts/507f1f77bcf86cd799439011',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('PATCH /api/v1/contracts/:id', () => {
    it('should update contract', async () => {
      const proposal = await JobProposal.create({
        jobId: testJobId,
        proposalDetails: 'Update test',
        priceType: 'fixed',
        proposedPrice: 5000,
        selectedCurrency: 'MYR',
        asssignedExpertId: 'expert-update-test',
        expertId: 'expert-update-test',
        createdBy: 'client-user-456',
        status: ProposalStatus.PENDING,
      });

      const contract = await Contract.create({
        jobId: testJobId,
        jobProposalId: (proposal._id as string).toString(),
        hubId: 'test-hub-456',
        contractTitle: 'Original Title',
        contractDescription: 'Original description',
        priceType: 'fixed',
        proposedPrice: 5000,
        selectedCurrency: 'MYR',
        startDate: new Date(),
        asssignedExpertId: 'expert-update-test',
        expertId: 'expert-update-test',
        createdBy: 'client-user-456',
        status: ContractStatus.PENDING,
      });

      const updateData = {
        status: 'active',
      };

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/contracts/${contract._id}`,
        payload: updateData,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.status).toBe(ContractStatus.ACTIVE);
    });
  });

  describe('POST /api/v1/contracts/:id/cancel', () => {
    it('should cancel contract', async () => {
      const proposal = await JobProposal.create({
        jobId: testJobId,
        proposalDetails: 'Cancel test',
        priceType: 'fixed',
        proposedPrice: 5000,
        selectedCurrency: 'MYR',
        asssignedExpertId: 'expert-cancel-test',
        expertId: 'expert-cancel-test',
        createdBy: 'client-user-456',
        status: ProposalStatus.PENDING,
      });

      const contract = await Contract.create({
        jobId: testJobId,
        jobProposalId: (proposal._id as string).toString(),
        hubId: 'test-hub-456',
        contractTitle: 'Contract to Cancel',
        contractDescription: 'Testing cancellation',
        priceType: 'fixed',
        proposedPrice: 5000,
        selectedCurrency: 'MYR',
        startDate: new Date(),
        asssignedExpertId: 'expert-cancel-test',
        expertId: 'expert-cancel-test',
        createdBy: 'client-user-456',
        status: ContractStatus.ACTIVE,
      });

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/contracts/${contract._id}/cancel`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.status).toBe(ContractStatus.CANCELLED);
    });
  });

  describe('POST /api/v1/contracts/:id/pause', () => {
    it('should pause contract', async () => {
      const proposal = await JobProposal.create({
        jobId: testJobId,
        proposalDetails: 'Pause test',
        priceType: 'fixed',
        proposedPrice: 5000,
        selectedCurrency: 'MYR',
        asssignedExpertId: 'expert-pause-test',
        expertId: 'expert-pause-test',
        createdBy: 'client-user-456',
        status: ProposalStatus.PENDING,
      });

      const contract = await Contract.create({
        jobId: testJobId,
        jobProposalId: (proposal._id as string).toString(),
        hubId: 'test-hub-456',
        contractTitle: 'Contract to Pause',
        contractDescription: 'Testing pause',
        priceType: 'fixed',
        proposedPrice: 5000,
        selectedCurrency: 'MYR',
        startDate: new Date(),
        asssignedExpertId: 'expert-pause-test',
        expertId: 'expert-pause-test',
        createdBy: 'client-user-456',
        status: ContractStatus.ACTIVE,
      });

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/contracts/${contract._id}/pause`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.status).toBe(ContractStatus.PAUSED);
    });
  });

  describe('POST /api/v1/contracts/:id/resume', () => {
    it('should resume paused contract', async () => {
      const proposal = await JobProposal.create({
        jobId: testJobId,
        proposalDetails: 'Resume test',
        priceType: 'fixed',
        proposedPrice: 5000,
        selectedCurrency: 'MYR',
        asssignedExpertId: 'expert-resume-test',
        expertId: 'expert-resume-test',
        createdBy: 'client-user-456',
        status: ProposalStatus.PENDING,
      });

      const contract = await Contract.create({
        jobId: testJobId,
        jobProposalId: (proposal._id as string).toString(),
        hubId: 'test-hub-456',
        contractTitle: 'Contract to Resume',
        contractDescription: 'Testing resume',
        priceType: 'fixed',
        proposedPrice: 5000,
        selectedCurrency: 'MYR',
        startDate: new Date(),
        asssignedExpertId: 'expert-resume-test',
        expertId: 'expert-resume-test',
        createdBy: 'client-user-456',
        status: ContractStatus.PAUSED,
      });

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/contracts/${contract._id}/resume`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.status).toBe(ContractStatus.ACTIVE);
    });
  });

  describe('POST /api/v1/contracts/:id/terms-update/request', () => {
    it('should request terms update for hourly contract', async () => {
      const proposal = await JobProposal.create({
        jobId: testJobId,
        proposalDetails: 'Terms update test',
        priceType: 'hourly',
        hourlyProposedPrice: 150,
        workingHours: 80,
        selectedCurrency: 'MYR',
        asssignedExpertId: 'expert-terms-test',
        expertId: 'expert-terms-test',
        createdBy: 'client-user-456',
        status: ProposalStatus.PENDING,
      });

      const contract = await Contract.create({
        jobId: testJobId,
        jobProposalId: (proposal._id as string).toString(),
        hubId: 'test-hub-456',
        contractTitle: 'Hourly Contract for Terms Update',
        contractDescription: 'Testing terms update',
        priceType: 'hourly',
        hourlyProposedPrice: 150,
        weeklyLimit: 40,
        selectedCurrency: 'MYR',
        startDate: new Date(),
        asssignedExpertId: 'expert-terms-test',
        expertId: 'expert-terms-test',
        createdBy: 'client-user-456',
        status: ContractStatus.ACTIVE,
      });

      const termsUpdateData = {
        weeklyLimit: 40,
        hourlyRate: 175,
        effectiveDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/contracts/${contract._id}/terms-update/request`,
        payload: termsUpdateData,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.pendingTermsUpdate).toBeDefined();
      expect(body.data.pendingTermsUpdate.hourlyRate).toBe(175);
      expect(body.data.pendingTermsUpdate.status).toBe('pending');
    });
  });

  describe('POST /api/v1/contracts/:id/terms-update/apply', () => {
    it('should apply pending terms update', async () => {
      const proposal = await JobProposal.create({
        jobId: testJobId,
        proposalDetails: 'Apply terms test',
        priceType: 'hourly',
        hourlyProposedPrice: 150,
        workingHours: 80,
        selectedCurrency: 'MYR',
        asssignedExpertId: 'expert-apply-terms-test',
        expertId: 'expert-apply-terms-test',
        createdBy: 'client-user-456',
        status: ProposalStatus.PENDING,
      });

      const contract = await Contract.create({
        jobId: testJobId,
        jobProposalId: (proposal._id as string).toString(),
        hubId: 'test-hub-456',
        contractTitle: 'Contract for Apply Terms',
        contractDescription: 'Testing apply terms',
        priceType: 'hourly',
        hourlyProposedPrice: 150,
        weeklyLimit: 40,
        selectedCurrency: 'MYR',
        startDate: new Date(),
        asssignedExpertId: 'expert-apply-terms-test',
        expertId: 'expert-apply-terms-test',
        createdBy: 'client-user-456',
        status: ContractStatus.ACTIVE,
        pendingTermsUpdate: {
          weeklyLimit: 40,
          hourlyRate: 175,
          effectiveDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          requestedDate: new Date(),
          requestedBy: 'expert-apply-terms-test',
          status: 'pending',
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/contracts/${contract._id}/terms-update/apply`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.hourlyProposedPrice).toBe(175);
      expect(body.data.pendingTermsUpdate.status).toBe('applied');
    });
  });
});
