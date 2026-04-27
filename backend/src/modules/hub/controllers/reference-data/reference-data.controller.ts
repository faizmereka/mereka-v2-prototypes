import {
  amenityService,
  companyTypeService,
  experienceThemeService,
  experienceTopicService,
  experienceTypeService,
  facilityService,
  focusAreaService,
  jobPreferenceService,
  languageService,
  skillService,
  spaceTypeService,
  targetAudienceService,
} from '@services/admin';
import type { FastifyReply, FastifyRequest } from 'fastify';

type IncludeInactiveQuery = { includeInactive?: string };

/**
 * Static job categories data
 * TODO: Move to database model when admin management is needed
 */
const JOB_CATEGORIES = [
  {
    id: 'design-creative',
    name: 'Design & Creative',
    serviceTypes: [
      { id: 'graphic-design', name: 'Graphic Design' },
      { id: 'ui-ux-design', name: 'UI/UX Design' },
      { id: 'logo-design', name: 'Logo Design' },
      { id: 'illustration', name: 'Illustration' },
      { id: 'motion-graphics', name: 'Motion Graphics' },
      { id: 'video-editing', name: 'Video Editing' },
      { id: 'photography', name: 'Photography' },
      { id: '3d-modeling', name: '3D Modeling' },
    ],
  },
  {
    id: 'development-it',
    name: 'Development & IT',
    serviceTypes: [
      { id: 'web-development', name: 'Web Development' },
      { id: 'mobile-development', name: 'Mobile App Development' },
      { id: 'software-development', name: 'Software Development' },
      { id: 'frontend-development', name: 'Frontend Development' },
      { id: 'backend-development', name: 'Backend Development' },
      { id: 'devops', name: 'DevOps & Cloud' },
      { id: 'database-admin', name: 'Database Administration' },
      { id: 'qa-testing', name: 'QA & Testing' },
    ],
  },
  {
    id: 'writing-translation',
    name: 'Writing & Translation',
    serviceTypes: [
      { id: 'content-writing', name: 'Content Writing' },
      { id: 'copywriting', name: 'Copywriting' },
      { id: 'technical-writing', name: 'Technical Writing' },
      { id: 'translation', name: 'Translation' },
      { id: 'proofreading', name: 'Proofreading & Editing' },
      { id: 'blog-writing', name: 'Blog Writing' },
      { id: 'creative-writing', name: 'Creative Writing' },
    ],
  },
  {
    id: 'marketing-sales',
    name: 'Marketing & Sales',
    serviceTypes: [
      { id: 'digital-marketing', name: 'Digital Marketing' },
      { id: 'social-media-marketing', name: 'Social Media Marketing' },
      { id: 'seo', name: 'SEO' },
      { id: 'sem', name: 'SEM / PPC' },
      { id: 'email-marketing', name: 'Email Marketing' },
      { id: 'content-marketing', name: 'Content Marketing' },
      { id: 'lead-generation', name: 'Lead Generation' },
      { id: 'sales-development', name: 'Sales Development' },
    ],
  },
  {
    id: 'business-consulting',
    name: 'Business & Consulting',
    serviceTypes: [
      { id: 'business-strategy', name: 'Business Strategy' },
      { id: 'financial-consulting', name: 'Financial Consulting' },
      { id: 'hr-consulting', name: 'HR Consulting' },
      { id: 'legal-consulting', name: 'Legal Consulting' },
      { id: 'project-management', name: 'Project Management' },
      { id: 'business-analysis', name: 'Business Analysis' },
    ],
  },
  {
    id: 'data-analytics',
    name: 'Data & Analytics',
    serviceTypes: [
      { id: 'data-analysis', name: 'Data Analysis' },
      { id: 'data-science', name: 'Data Science' },
      { id: 'machine-learning', name: 'Machine Learning' },
      { id: 'business-intelligence', name: 'Business Intelligence' },
      { id: 'data-visualization', name: 'Data Visualization' },
      { id: 'data-engineering', name: 'Data Engineering' },
    ],
  },
  {
    id: 'admin-support',
    name: 'Admin & Support',
    serviceTypes: [
      { id: 'virtual-assistant', name: 'Virtual Assistant' },
      { id: 'customer-support', name: 'Customer Support' },
      { id: 'data-entry', name: 'Data Entry' },
      { id: 'administrative', name: 'Administrative Support' },
      { id: 'research', name: 'Research' },
    ],
  },
];

/**
 * Get all job categories with service types
 */
export async function getJobCategories(_request: FastifyRequest, reply: FastifyReply) {
  return reply.send({ success: true, data: JOB_CATEGORIES });
}

/**
 * Get all focus areas
 */
export async function getFocusAreas(
  request: FastifyRequest<{ Querystring: IncludeInactiveQuery }>,
  reply: FastifyReply,
) {
  const { includeInactive } = request.query;
  const items = await focusAreaService.getAll(includeInactive === 'true');
  return reply.send({ success: true, data: items });
}

/**
 * Get all company types
 */
export async function getCompanyTypes(
  request: FastifyRequest<{ Querystring: IncludeInactiveQuery }>,
  reply: FastifyReply,
) {
  const { includeInactive } = request.query;
  const items = await companyTypeService.getAll(includeInactive === 'true');
  return reply.send({ success: true, data: items });
}

/**
 * Get all experience types
 */
export async function getExperienceTypes(
  request: FastifyRequest<{ Querystring: IncludeInactiveQuery }>,
  reply: FastifyReply,
) {
  const { includeInactive } = request.query;
  const items = await experienceTypeService.getAll(includeInactive === 'true');
  return reply.send({ success: true, data: items });
}

/**
 * Get all experience themes
 */
export async function getExperienceThemes(
  request: FastifyRequest<{ Querystring: IncludeInactiveQuery }>,
  reply: FastifyReply,
) {
  const { includeInactive } = request.query;
  if (includeInactive === 'true') {
    const result = await experienceThemeService.listThemes({});
    return reply.send({ success: true, data: result.themes });
  }
  const items = await experienceThemeService.listActiveThemes();
  return reply.send({ success: true, data: items });
}

/**
 * Get all experience topics
 */
export async function getExperienceTopics(
  request: FastifyRequest<{ Querystring: IncludeInactiveQuery }>,
  reply: FastifyReply,
) {
  const { includeInactive } = request.query;
  const result = await experienceTopicService.listTopics({
    isActive: includeInactive !== 'true' ? 'true' : undefined,
  });
  return reply.send({ success: true, data: result.topics });
}

/**
 * Get all job preferences
 */
export async function getJobPreferences(
  request: FastifyRequest<{ Querystring: IncludeInactiveQuery }>,
  reply: FastifyReply,
) {
  const { includeInactive } = request.query;
  const items = await jobPreferenceService.getAll(includeInactive === 'true');
  return reply.send({ success: true, data: items });
}

/**
 * Get all amenities
 */
export async function getAmenities(
  request: FastifyRequest<{ Querystring: IncludeInactiveQuery }>,
  reply: FastifyReply,
) {
  const { includeInactive } = request.query;
  const items = await amenityService.getAll(includeInactive === 'true');
  return reply.send({ success: true, data: items });
}

/**
 * Get all facilities
 */
export async function getFacilities(
  request: FastifyRequest<{ Querystring: IncludeInactiveQuery }>,
  reply: FastifyReply,
) {
  const { includeInactive } = request.query;
  const items = await facilityService.getAll(includeInactive === 'true');
  return reply.send({ success: true, data: items });
}

/**
 * Get all skills
 */
export async function getSkills(
  request: FastifyRequest<{ Querystring: IncludeInactiveQuery }>,
  reply: FastifyReply,
) {
  const { includeInactive } = request.query;
  const items = await skillService.getAll(includeInactive === 'true');
  return reply.send({ success: true, data: items });
}

/**
 * Get all languages
 */
export async function getLanguages(
  request: FastifyRequest<{ Querystring: IncludeInactiveQuery }>,
  reply: FastifyReply,
) {
  const { includeInactive } = request.query;
  if (includeInactive === 'true') {
    const result = await languageService.listLanguages({});
    return reply.send({ success: true, data: result.languages });
  }
  const items = await languageService.listActiveLanguages();
  return reply.send({ success: true, data: items });
}

/**
 * Get all space types
 */
export async function getSpaceTypes(
  request: FastifyRequest<{ Querystring: IncludeInactiveQuery }>,
  reply: FastifyReply,
) {
  const { includeInactive } = request.query;
  const items = await spaceTypeService.getAll(includeInactive === 'true');
  return reply.send({ success: true, data: items });
}

/**
 * Get all target audiences
 */
export async function getTargetAudiences(
  request: FastifyRequest<{ Querystring: IncludeInactiveQuery }>,
  reply: FastifyReply,
) {
  const { includeInactive } = request.query;
  if (includeInactive === 'true') {
    const result = await targetAudienceService.listAudiences({});
    return reply.send({ success: true, data: result.audiences });
  }
  const items = await targetAudienceService.listActiveAudiences();
  return reply.send({ success: true, data: items });
}
