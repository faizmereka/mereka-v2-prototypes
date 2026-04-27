import { Contract, ContractStatus } from '@core/models/Contract';
import { Job, JobStatus } from '@core/models/Job';
import { JobProposal, ProposalStatus } from '@core/models/JobProposal';
import { TimelogEntry, TimelogStatus } from '@core/models/TimelogEntry';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '@/app';

describe('Timelog Routes Integration Tests', () => {
  let app: FastifyInstance;
  let testJobId: string;
  let testContractId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // Create test job
    const job = await Job.create({
      jobTitle: 'Test Job for Timelogs',
      jobDescription: '<p>Timelog testing job</p>',
      employmentType: 'freelance',
      status: JobStatus.ACTIVE,
      serviceCategory: { category: 'tech', serviceType: 'developer' },
      expertLevel: 'intermediate',
      jobLocation: 'remote',
      jobBudget: { pricingType: 'hourly', fromAmount: 150 },
      jobCurrency: 'MYR',
      jobStartDate: new Date(),
      jobSkills: ['TypeScript'],
      accessMode: 'PUBLIC',
      name: 'Test Client',
      email: 'client@test.com',
      phoneNumber: '+60123456789',
      organizationName: 'Test Company',
      hubId: 'test-hub-timelog',
      createdBy: 'client-user-timelog',
    });
    testJobId = (job._id as string).toString();

    // Create hourly proposal
    const proposal = await JobProposal.create({
      jobId: testJobId,
      proposalDetails: 'Hourly work proposal',
      priceType: 'hourly',
      hourlyProposedPrice: 150,
      workingHours: 80,
      selectedCurrency: 'MYR',
      asssignedExpertId: 'expert-timelog-test',
      expertId: 'expert-timelog-test',
      createdBy: 'client-user-timelog',
      status: ProposalStatus.ACCEPTED,
    });

    // Create hourly contract
    const contract = await Contract.create({
      jobId: testJobId,
      jobProposalId: (proposal._id as string).toString(),
      hubId: 'test-hub-timelog',
      contractTitle: 'Hourly Test Contract',
      contractDescription: 'Contract for timelog testing',
      priceType: 'hourly',
      hourlyProposedPrice: 150,
      weeklyLimit: 40,
      selectedCurrency: 'MYR',
      startDate: new Date(),
      asssignedExpertId: 'expert-timelog-test',
      expertId: 'expert-timelog-test',
      createdBy: 'client-user-timelog',
      status: ContractStatus.ACTIVE,
    });
    testContractId = contract._id.toString();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/timelogs', () => {
    it('should create a timelog entry', async () => {
      const timelogData = {
        contractId: testContractId,
        workDate: new Date().toISOString(),
        startTime: '09:00',
        endTime: '17:30',
        breakDuration: 1,
        description: 'Worked on implementing user authentication, API development, and unit tests',
        tasks: ['User authentication module', 'API endpoint development', 'Unit test creation'],
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/timelogs',
        payload: timelogData,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.hoursWorked).toBe(7.5); // 17:30 - 09:00 - 1:00 = 7.5
      expect(body.data.billableAmount).toBe(1125); // 7.5 * 150 = 1125
      expect(body.data.status).toBe(TimelogStatus.DRAFT);
    });

    it('should calculate hours worked correctly for overnight shift', async () => {
      const timelogData = {
        contractId: testContractId,
        workDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
        startTime: '22:00',
        endTime: '06:00',
        breakDuration: 1,
        description: 'Night shift work',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/timelogs',
        payload: timelogData,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.hoursWorked).toBe(7); // 22:00 to 06:00 = 8 hours - 1 break = 7
    });

    it('should return 400 for duplicate timelog entry', async () => {
      const testDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);

      // Create first entry
      await TimelogEntry.create({
        contractId: testContractId,
        expertId: 'test-user-id',
        clientId: 'client-user-timelog',
        hubId: 'test-hub-timelog',
        workDate: testDate,
        startTime: '09:00',
        endTime: '17:00',
        breakDuration: 1,
        hoursWorked: 7,
        description: 'First entry',
        hourlyRate: 150,
        weeklyLimit: 40,
        billableAmount: 1050,
        currency: 'MYR',
        status: TimelogStatus.DRAFT,
      });

      // Try to create duplicate
      const timelogData = {
        contractId: testContractId,
        workDate: testDate.toISOString(),
        startTime: '10:00',
        endTime: '18:00',
        breakDuration: 1,
        description: 'Duplicate entry (should fail)',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/timelogs',
        payload: timelogData,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.message).toContain('already exists');
    });

    it('should return 400 for invalid input', async () => {
      const invalidData = {
        contractId: testContractId,
        // Missing required fields
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/timelogs',
        payload: invalidData,
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/timelogs', () => {
    it('should get all timelogs', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/timelogs',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('should filter timelogs by contractId', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/timelogs?contractId=${testContractId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      for (const timelog of body.data) {
        expect(timelog.contractId).toBe(testContractId);
      }
    });

    it('should filter timelogs by status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/timelogs?status=draft',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      for (const timelog of body.data) {
        expect(timelog.status).toBe(TimelogStatus.DRAFT);
      }
    });
  });

  describe('GET /api/v1/timelogs/weekly-summary', () => {
    it('should get weekly summary', async () => {
      const today = new Date();
      const year = today.getFullYear();
      const weekNumber = Math.ceil(
        (today.getTime() - new Date(year, 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000),
      );

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/timelogs/weekly-summary?contractId=${testContractId}&year=${year}&weekNumber=${weekNumber}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.contractId).toBe(testContractId);
      expect(body.data.year).toBe(year);
      expect(body.data.weekNumber).toBe(weekNumber);
      expect(typeof body.data.totalHours).toBe('number');
      expect(typeof body.data.totalAmount).toBe('number');
      expect(body.data.byStatus).toBeDefined();
    });
  });

  describe('GET /api/v1/timelogs/:id', () => {
    it('should get timelog by ID', async () => {
      const timelog = await TimelogEntry.create({
        contractId: testContractId,
        expertId: 'test-user-id',
        clientId: 'client-user-timelog',
        hubId: 'test-hub-timelog',
        workDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        startTime: '09:00',
        endTime: '17:00',
        breakDuration: 1,
        hoursWorked: 7,
        description: 'Get by ID test',
        hourlyRate: 150,
        weeklyLimit: 40,
        billableAmount: 1050,
        currency: 'MYR',
        status: TimelogStatus.DRAFT,
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/timelogs/${timelog._id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.description).toBe('Get by ID test');
    });

    it('should return 404 for non-existent timelog', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/timelogs/507f1f77bcf86cd799439011',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('PATCH /api/v1/timelogs/:id', () => {
    it('should update draft timelog', async () => {
      const timelog = await TimelogEntry.create({
        contractId: testContractId,
        expertId: 'test-user-id',
        clientId: 'client-user-timelog',
        hubId: 'test-hub-timelog',
        workDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
        startTime: '09:00',
        endTime: '17:00',
        breakDuration: 1,
        hoursWorked: 7,
        description: 'Original description',
        hourlyRate: 150,
        weeklyLimit: 40,
        billableAmount: 1050,
        currency: 'MYR',
        status: TimelogStatus.DRAFT,
      });

      const updateData = {
        endTime: '18:00',
        description: 'Updated description with more details',
      };

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/timelogs/${timelog._id}`,
        payload: updateData,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.description).toBe('Updated description with more details');
      expect(body.data.hoursWorked).toBe(8); // 18:00 - 09:00 - 1 = 8
    });

    it('should return 400 for updating submitted timelog', async () => {
      const timelog = await TimelogEntry.create({
        contractId: testContractId,
        expertId: 'test-user-id',
        clientId: 'client-user-timelog',
        hubId: 'test-hub-timelog',
        workDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        startTime: '09:00',
        endTime: '17:00',
        breakDuration: 1,
        hoursWorked: 7,
        description: 'Submitted timelog',
        hourlyRate: 150,
        weeklyLimit: 40,
        billableAmount: 1050,
        currency: 'MYR',
        status: TimelogStatus.SUBMITTED,
      });

      const updateData = {
        description: 'Trying to update',
      };

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/timelogs/${timelog._id}`,
        payload: updateData,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/timelogs/:id', () => {
    it('should delete draft timelog', async () => {
      const timelog = await TimelogEntry.create({
        contractId: testContractId,
        expertId: 'test-user-id',
        clientId: 'client-user-timelog',
        hubId: 'test-hub-timelog',
        workDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
        startTime: '09:00',
        endTime: '17:00',
        breakDuration: 1,
        hoursWorked: 7,
        description: 'To delete',
        hourlyRate: 150,
        weeklyLimit: 40,
        billableAmount: 1050,
        currency: 'MYR',
        status: TimelogStatus.DRAFT,
      });

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/timelogs/${timelog._id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);

      // Verify deletion
      const deleted = await TimelogEntry.findById(timelog._id);
      expect(deleted).toBeNull();
    });
  });

  describe('POST /api/v1/timelogs/:id/submit', () => {
    it('should submit timelog', async () => {
      const timelog = await TimelogEntry.create({
        contractId: testContractId,
        expertId: 'test-user-id',
        clientId: 'client-user-timelog',
        hubId: 'test-hub-timelog',
        workDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        startTime: '09:00',
        endTime: '17:00',
        breakDuration: 1,
        hoursWorked: 7,
        description: 'Ready to submit',
        hourlyRate: 150,
        weeklyLimit: 40,
        billableAmount: 1050,
        currency: 'MYR',
        status: TimelogStatus.DRAFT,
        weekNumber: 1,
        year: 2025,
      });

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/timelogs/${timelog._id}/submit`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.status).toBe(TimelogStatus.SUBMITTED);
      expect(body.data.submittedDate).toBeDefined();
    });
  });

  describe('POST /api/v1/timelogs/:id/approve', () => {
    it('should approve timelog', async () => {
      const timelog = await TimelogEntry.create({
        contractId: testContractId,
        expertId: 'test-user-id',
        clientId: 'client-user-timelog',
        hubId: 'test-hub-timelog',
        workDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
        startTime: '09:00',
        endTime: '17:00',
        breakDuration: 1,
        hoursWorked: 7,
        description: 'Timelog to approve',
        hourlyRate: 150,
        weeklyLimit: 40,
        billableAmount: 1050,
        currency: 'MYR',
        status: TimelogStatus.SUBMITTED,
      });

      const approvalData = {
        paymentIntentId: 'pi_test_timelog_123',
      };

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/timelogs/${timelog._id}/approve`,
        payload: approvalData,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.status).toBe(TimelogStatus.APPROVED);
      expect(body.data.paymentIntentId).toBe('pi_test_timelog_123');
      expect(body.data.approvedDate).toBeDefined();
    });
  });

  describe('POST /api/v1/timelogs/:id/reject', () => {
    it('should reject timelog with reason', async () => {
      const timelog = await TimelogEntry.create({
        contractId: testContractId,
        expertId: 'test-user-id',
        clientId: 'client-user-timelog',
        hubId: 'test-hub-timelog',
        workDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000),
        startTime: '09:00',
        endTime: '17:00',
        breakDuration: 1,
        hoursWorked: 7,
        description: 'Timelog to reject',
        hourlyRate: 150,
        weeklyLimit: 40,
        billableAmount: 1050,
        currency: 'MYR',
        status: TimelogStatus.SUBMITTED,
      });

      const rejectionData = {
        reason: 'Hours seem excessive for the tasks described. Please revise.',
      };

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/timelogs/${timelog._id}/reject`,
        payload: rejectionData,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.status).toBe(TimelogStatus.REJECTED);
      expect(body.data.rejectionReason).toBe(rejectionData.reason);
      expect(body.data.rejectedDate).toBeDefined();
    });
  });
});
