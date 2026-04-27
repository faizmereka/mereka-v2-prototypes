import type { TestDataContract, TestSchema } from '../../contracts/shared';

const jobSchema: TestSchema = {
  type: 'object',
  required: ['title', 'category', 'serviceType', 'employmentType', 'location', 'expertLevel'],
  properties: {
    title: { type: 'string', description: 'Job title' },
    category: { type: 'string' },
    serviceType: { type: 'string' },
    employmentType: { type: 'string' },
    location: { type: 'string' },
    expertLevel: { type: 'string' },
  },
};

export const jobDataContract: TestDataContract = {
  schema: jobSchema,
  validExamples: [
    {
      title: 'Test Job',
      category: 'Technology',
      serviceType: 'Consulting',
      employmentType: 'Contract',
      location: 'Remote',
      expertLevel: 'Senior',
    },
  ],
  invalidExamples: [
    {
      label: 'Missing title',
      value: {
        category: 'Technology',
        serviceType: 'Consulting',
        employmentType: 'Contract',
        location: 'Remote',
        expertLevel: 'Senior',
      },
      expectedError: 'title is required',
    },
  ],
  validationRules: [
    { field: 'title', rule: 'required', message: 'title is required' },
    { field: 'category', rule: 'required', message: 'category is required' },
  ],
};
