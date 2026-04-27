import type { TestDataContract, TestSchema } from '../../contracts/shared';

const experienceSchema: TestSchema = {
  type: 'object',
  required: ['title', 'slug'],
  properties: {
    title: { type: 'string', description: 'Experience title' },
    slug: { type: 'string', description: 'Experience slug' },
    category: { type: 'string', description: 'Experience category' },
    topics: { type: 'array', items: { type: 'string' } },
    type: { type: 'string', enum: ['Physical', 'Virtual', 'Hybrid'] },
    location: { type: 'string' },
  },
};

export const experienceDataContract: TestDataContract = {
  schema: experienceSchema,
  validExamples: [
    {
      title: 'Test Experience',
      slug: 'test-experience',
      category: 'Education',
      topics: ['Leadership'],
      type: 'Virtual',
      location: 'Remote',
    },
  ],
  invalidExamples: [
    {
      label: 'Missing title',
      value: { slug: 'missing-title' },
      expectedError: 'title is required',
    },
  ],
  validationRules: [
    { field: 'title', rule: 'required', message: 'title is required' },
    { field: 'slug', rule: 'required', message: 'slug is required' },
  ],
};
