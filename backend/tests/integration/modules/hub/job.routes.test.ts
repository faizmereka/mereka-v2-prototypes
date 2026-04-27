import { Job, JobStatus } from '@core/models/Job';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '@/app';

describe('Job Routes Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/jobs', () => {
    it('should create a new job', async () => {
      const jobData = {
        jobTitle: 'Software Engineer',
        jobDescription: '<p>We are looking for a software engineer.</p>',
        employmentType: 'full-time',
        status: 'ACTIVE',
        serviceCategory: {
          category: 'tech-ai',
          serviceType: 'developer',
        },
        expertLevel: 'intermediate',
        jobLocation: 'remote',
        preferredLocation: ['Malaysia'],
        jobBudget: {
          pricingType: 'fixed',
          fromAmount: 1000,
        },
        jobCurrency: 'MYR',
        jobStartDate: new Date().toISOString(),
        jobSkills: ['TypeScript', 'Node.js'],
        accessMode: 'PUBLIC',
        name: 'John Doe',
        email: 'john@example.com',
        phoneNumber: '+1234567890',
        organizationName: 'Tech Corp',
        hubId: 'hub123',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/jobs',
        payload: jobData,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.jobTitle).toBe('Software Engineer');
      expect(body.data.hubId).toBe('hub123');
      expect(body.data.email).toBe('john@example.com');
    });

    it('should update an existing job when ID is provided', async () => {
      // First create a job
      const job = await Job.create({
        jobTitle: 'Initial Title',
        jobDescription: '<p>Initial Description</p>',
        employmentType: 'full-time',
        status: 'DRAFT',
        serviceCategory: { category: 'tech', serviceType: 'dev' },
        expertLevel: 'junior',
        jobLocation: 'remote',
        jobBudget: { pricingType: 'fixed', fromAmount: 500 },
        jobCurrency: 'USD',
        jobStartDate: new Date(),
        jobSkills: ['Java'],
        accessMode: 'PUBLIC',
        name: 'Jane',
        email: 'jane@example.com',
        phoneNumber: '9876543210',
        organizationName: 'Old Corp',
        hubId: 'hub456',
        createdBy: 'user123',
      });

      const updateData = {
        id: (job._id as string).toString(),
        jobTitle: 'Updated Title',
        jobDescription: '<p>Updated Description</p>',
        employmentType: 'part-time',
        status: 'ACTIVE',
        serviceCategory: { category: 'tech', serviceType: 'dev' },
        expertLevel: 'senior',
        jobLocation: 'remote',
        jobBudget: { pricingType: 'hourly', fromAmount: 50 },
        jobCurrency: 'USD',
        jobStartDate: new Date().toISOString(),
        jobSkills: ['Java', 'Spring'],
        accessMode: 'PRIVATE',
        name: 'Jane Smith',
        email: 'jane@example.com',
        phoneNumber: '9876543210',
        organizationName: 'New Corp',
        hubId: 'hub456',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/jobs',
        payload: updateData,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data._id).toBe((job._id as string).toString());
      expect(body.data.jobTitle).toBe('Updated Title');
      expect(body.data.employmentType).toBe('part-time');
      expect(body.data.organizationName).toBe('New Corp');
    });

    it('should return 400 for invalid input', async () => {
      const invalidData = {
        jobTitle: 'Short', // Too short
        // Missing required fields
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/jobs',
        payload: invalidData,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.statusCode).toBe(400);
      expect(body.code).toBe('FST_ERR_VALIDATION');
    });
  });

  describe('GET /api/v1/jobs', () => {
    it('should get paginated jobs', async () => {
      // Create test jobs inline
      await Job.create([
        {
          jobTitle: 'Frontend Dev',
          jobDescription: '<p>React dev needed</p>',
          employmentType: 'full-time',
          status: 'ACTIVE',
          serviceCategory: { category: 'tech', serviceType: 'frontend' },
          expertLevel: 'mid',
          jobLocation: 'remote',
          jobBudget: { pricingType: 'fixed', fromAmount: 2000 },
          jobCurrency: 'USD',
          jobStartDate: new Date(),
          jobSkills: ['React', 'CSS'],
          accessMode: 'PUBLIC',
          name: 'Recruiter 1',
          email: 'r1@test.com',
          phoneNumber: '111',
          organizationName: 'Company A',
          hubId: 'hub_a',
          createdBy: 'user1',
        },
        {
          jobTitle: 'Backend Dev',
          jobDescription: '<p>Node dev needed</p>',
          employmentType: 'freelance',
          status: 'DRAFT',
          serviceCategory: { category: 'tech', serviceType: 'backend' },
          expertLevel: 'senior',
          jobLocation: 'onsite',
          jobBudget: { pricingType: 'hourly', fromAmount: 60 },
          jobCurrency: 'USD',
          jobStartDate: new Date(),
          jobSkills: ['Node.js', 'MongoDB'],
          accessMode: 'PUBLIC',
          name: 'Recruiter 2',
          email: 'r2@test.com',
          phoneNumber: '222',
          organizationName: 'Company B',
          hubId: 'hub_b',
          createdBy: 'user2',
        },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/jobs?page=1&limit=10',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(2);
      expect(body.meta).toBeDefined();
      expect(body.meta.page).toBe(1);
    });

    it('should filter jobs by status', async () => {
      // Create job with ACTIVE status
      await Job.create({
        jobTitle: 'Active Job Filter Test',
        jobDescription: '<p>Active job</p>',
        employmentType: 'full-time',
        status: 'ACTIVE',
        serviceCategory: { category: 'tech', serviceType: 'frontend' },
        expertLevel: 'mid',
        jobLocation: 'remote',
        jobBudget: { pricingType: 'fixed', fromAmount: 2000 },
        jobCurrency: 'USD',
        jobStartDate: new Date(),
        jobSkills: ['React'],
        accessMode: 'PUBLIC',
        name: 'Test User',
        email: 'test@test.com',
        phoneNumber: '123',
        organizationName: 'Company',
        hubId: 'hub_test',
        createdBy: 'user1',
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/jobs?status=ACTIVE',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(1);
      // Check that all returned jobs have ACTIVE status
      for (const job of body.data) {
        expect(job.status).toBe('ACTIVE');
      }
    });

    it('should filter jobs by hubId', async () => {
      // Create job with specific hubId
      await Job.create({
        jobTitle: 'HubId Filter Test',
        jobDescription: '<p>Test job</p>',
        employmentType: 'full-time',
        status: 'ACTIVE',
        serviceCategory: { category: 'tech', serviceType: 'backend' },
        expertLevel: 'mid',
        jobLocation: 'remote',
        jobBudget: { pricingType: 'fixed', fromAmount: 1500 },
        jobCurrency: 'USD',
        jobStartDate: new Date(),
        jobSkills: ['Node.js'],
        accessMode: 'PUBLIC',
        name: 'Test User',
        email: 'test2@test.com',
        phoneNumber: '456',
        organizationName: 'Company',
        hubId: 'hub_filter_test',
        createdBy: 'user2',
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/jobs?hubId=hub_filter_test',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(1);
      // Check that all returned jobs have the correct hubId
      for (const job of body.data) {
        expect(job.hubId).toBe('hub_filter_test');
      }
    });
  });

  describe('GET /api/v1/jobs/:id', () => {
    it('should get job by ID', async () => {
      const job = await Job.create({
        jobTitle: 'Specific Job',
        jobDescription: '<p>Details...</p>',
        employmentType: 'freelance',
        status: 'ACTIVE',
        serviceCategory: { category: 'design', serviceType: 'ui' },
        expertLevel: 'expert',
        jobLocation: 'remote',
        jobBudget: { pricingType: 'fixed', fromAmount: 500 },
        jobCurrency: 'USD',
        jobStartDate: new Date(),
        jobSkills: ['Figma'],
        accessMode: 'PUBLIC',
        name: 'Designer',
        email: 'design@test.com',
        phoneNumber: '333',
        organizationName: 'Design Studio',
        hubId: 'hub_design',
        createdBy: 'user_design',
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/jobs/${job._id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.jobTitle).toBe('Specific Job');
    });

    it('should return 404 for non-existent job', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/jobs/507f1f77bcf86cd799439011',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('DELETE /api/v1/jobs/:id', () => {
    it('should soft delete job', async () => {
      const job = await Job.create({
        jobTitle: 'To Delete',
        jobDescription: '<p>Bye...</p>',
        employmentType: 'freelance',
        status: 'ACTIVE',
        serviceCategory: { category: 'misc', serviceType: 'general' },
        expertLevel: 'any',
        jobLocation: 'remote',
        jobBudget: { pricingType: 'hourly', fromAmount: 10 },
        jobCurrency: 'USD',
        jobStartDate: new Date(),
        jobSkills: ['None'],
        accessMode: 'PUBLIC',
        name: 'Deleter',
        email: 'del@test.com',
        phoneNumber: '000',
        organizationName: 'Del Corp',
        hubId: 'hub_del',
        createdBy: 'user_del',
      });

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/jobs/${job._id}`,
      });

      expect(response.statusCode).toBe(200);

      // Verify soft delete
      const deletedJob = await Job.findById(job._id);
      expect(deletedJob?.status).toBe(JobStatus.CANCELLED);
    });
  });
});
