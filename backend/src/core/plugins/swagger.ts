import { env } from '@core/config/env';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import type { FastifyInstance } from 'fastify';

/**
 * Module configuration for Swagger documentation
 */
interface ModuleSwaggerConfig {
  title: string;
  description: string;
  routePrefix: string;
  tags: Array<{ name: string; description: string }>;
}

/**
 * Security schemes shared across all modules
 */
const securitySchemes = {
  bearerAuth: {
    type: 'http' as const,
    scheme: 'bearer',
    bearerFormat: 'JWT',
    description: `Enter your JWT access token (without 'Bearer' prefix)

How to get your token:
1. Call POST /api/v1/auth/login with your credentials
2. Copy the 'accessToken' from the response
3. Paste it here
4. Click 'Authorize'
5. Now you can test protected endpoints!

Example token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`,
  },
  cookieAuth: {
    type: 'apiKey' as const,
    in: 'cookie' as const,
    name: 'accessToken',
    description: `Cookie-based authentication for admin panel

The accessToken cookie is automatically set after login.
This authentication method is used for admin routes.`,
  },
};

/**
 * Mereka Logo SVG (inline for embedding)
 */
const merekaLogoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 35" width="120" height="35">
  <defs>
    <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#1a1623;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#2d2838;stop-opacity:1" />
    </linearGradient>
  </defs>
  <text x="0" y="26" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="700" fill="#ffffff" letter-spacing="-1">Mereka</text>
</svg>`;

/**
 * Custom CSS for Mereka branding
 */
const merekaBrandingCSS = `
  /* Mereka Brand Colors */
  :root {
    --mereka-primary: #1a1623;
    --mereka-primary-light: #2d2838;
    --mereka-accent: #000000;
    --mereka-success: #34a853;
    --mereka-error: #a80909;
    --mereka-warning: #f59e0b;
  }

  /* Hide default Swagger topbar completely */
  .swagger-ui .topbar {
    display: none !important;
  }

  /* Navigation header */
  .mereka-nav {
    background: linear-gradient(135deg, var(--mereka-primary) 0%, var(--mereka-primary-light) 100%);
    padding: 14px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
    border-bottom: 3px solid var(--mereka-accent);
    position: sticky;
    top: 0;
    z-index: 1000;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  }

  .mereka-nav-brand {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .mereka-nav-logo {
    display: flex;
    align-items: center;
    text-decoration: none;
  }

  .mereka-nav-logo svg {
    height: 32px;
    width: auto;
  }

  .mereka-nav-badge {
    background: rgba(255,255,255,0.18);
    color: #fff;
    padding: 5px 12px;
    border-radius: 5px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .mereka-nav-links {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .mereka-nav-link {
    color: rgba(255,255,255,0.9);
    text-decoration: none;
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    transition: all 0.2s ease;
    background: rgba(255,255,255,0.1);
    border: 1px solid rgba(255,255,255,0.15);
  }

  .mereka-nav-link:hover {
    background: rgba(255,255,255,0.2);
    color: #fff;
    transform: translateY(-1px);
  }

  .mereka-nav-link.active {
    background: #fff;
    color: var(--mereka-primary);
    font-weight: 600;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }

  /* Info section styling */
  .swagger-ui .info {
    margin: 30px 0;
  }

  .swagger-ui .info .title {
    color: var(--mereka-primary);
    font-weight: 700;
  }

  .swagger-ui .info .title small {
    background: var(--mereka-primary);
    color: #fff;
    padding: 4px 8px;
    border-radius: 4px;
  }

  /* Operation styling */
  .swagger-ui .opblock-tag {
    border-bottom: 1px solid #e2e2e2;
    font-weight: 600;
  }

  .swagger-ui .opblock.opblock-get .opblock-summary-method {
    background: var(--mereka-success);
  }

  .swagger-ui .opblock.opblock-post .opblock-summary-method {
    background: #3b82f6;
  }

  .swagger-ui .opblock.opblock-put .opblock-summary-method,
  .swagger-ui .opblock.opblock-patch .opblock-summary-method {
    background: var(--mereka-warning);
  }

  .swagger-ui .opblock.opblock-delete .opblock-summary-method {
    background: var(--mereka-error);
  }

  /* Button styling */
  .swagger-ui .btn.authorize {
    background-color: var(--mereka-primary);
    border-color: var(--mereka-primary);
    color: #fff;
  }

  .swagger-ui .btn.authorize:hover {
    background-color: var(--mereka-primary-light);
  }

  .swagger-ui .btn.execute {
    background-color: var(--mereka-primary);
    border-color: var(--mereka-primary);
  }

  .swagger-ui .btn.execute:hover {
    background-color: var(--mereka-primary-light);
  }

  /* Hide empty tags */
  .swagger-ui .opblock-tag-section:not(:has(.opblock)) {
    display: none !important;
  }

  /* Wrapper to add padding for sticky nav */
  .swagger-ui .wrapper {
    padding-top: 20px;
  }

  /* Model styling */
  .swagger-ui section.models {
    border-color: #e2e2e2;
  }

  .swagger-ui section.models h4 {
    color: var(--mereka-primary);
  }

  /* Hide server selector, authorize, and filter on main /docs page */
  .swagger-ui .scheme-container {
    display: none !important;
  }

  .swagger-ui .servers-title,
  .swagger-ui .servers {
    display: none !important;
  }

  /* Hide info URLs */
  .swagger-ui .info .base-url {
    display: none !important;
  }

  /* Style filter input for module docs */
  .swagger-ui .filter-container {
    margin: 15px 0;
    padding: 0 20px;
  }

  .swagger-ui .filter-container input {
    border: 2px solid #e5e5e5;
    border-radius: 6px;
    padding: 10px 15px;
    font-size: 14px;
  }

  .swagger-ui .filter-container input:focus {
    border-color: var(--mereka-primary);
    outline: none;
  }

  /* Hide OAS version badge and version info */
  .swagger-ui .info hgroup small,
  .swagger-ui .info .version-pragma,
  .swagger-ui .info .version-stamp {
    display: none !important;
  }

  /* Hide contact and license info */
  .swagger-ui .info .contact,
  .swagger-ui .info .license,
  .swagger-ui .info .terms-of-service {
    display: none !important;
  }

  /* Style the info section as cards for module links */
  .swagger-ui .info .description {
    padding: 20px 0;
  }

  .swagger-ui .info .description h2 {
    color: var(--mereka-primary);
    font-size: 18px;
    margin-top: 20px;
    padding-bottom: 8px;
    border-bottom: 2px solid #e5e5e5;
  }

  .swagger-ui .info .description ul {
    list-style: none;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
    margin: 16px 0;
  }

  .swagger-ui .info .description li {
    background: #f8f8f8;
    border: 1px solid #e5e5e5;
    border-radius: 8px;
    padding: 16px;
    transition: all 0.2s ease;
  }

  .swagger-ui .info .description li:hover {
    background: #fff;
    border-color: var(--mereka-primary);
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  }

  .swagger-ui .info .description a {
    color: var(--mereka-primary);
    font-weight: 600;
    text-decoration: none;
  }

  .swagger-ui .info .description a:hover {
    text-decoration: underline;
  }

  .swagger-ui .info .description strong {
    color: var(--mereka-primary);
  }

  /* Hide the title version number */
  .swagger-ui .info .title span {
    display: none;
  }
`;

/**
 * Generate navigation HTML for module docs with Mereka logo
 */
function generateNavHtml(currentModule: string | null): string {
  const modules = [
    { key: 'docs', label: 'All APIs', path: '/docs' },
    { key: 'hub', label: 'Hub', path: '/docs/hub' },
    { key: 'admin', label: 'Admin', path: '/docs/admin' },
    { key: 'web', label: 'Web', path: '/docs/web' },
    { key: 'shared', label: 'Shared', path: '/docs/shared' },
  ];

  const links = modules
    .map(
      (m) =>
        `<a href="${m.path}" class="mereka-nav-link ${currentModule === m.key ? 'active' : ''}">${m.label}</a>`,
    )
    .join('');

  const badge = currentModule && currentModule !== 'docs' ? currentModule.toUpperCase() : 'API';

  return `
    <div class="mereka-nav">
      <div class="mereka-nav-brand">
        <a href="/docs" class="mereka-nav-logo">${merekaLogoSvg}</a>
        <span class="mereka-nav-badge">${badge} Documentation</span>
      </div>
      <div class="mereka-nav-links">${links}</div>
    </div>
  `;
}

/**
 * Base Swagger UI configuration
 */
const baseSwaggerUiConfig = {
  docExpansion: 'list' as const,
  deepLinking: true,
  displayRequestDuration: true,
  showExtensions: true,
  showCommonExtensions: true,
  syntaxHighlight: {
    activate: true,
    theme: 'monokai' as const,
  },
  tagsSorter: 'alpha' as const,
  operationsSorter: 'alpha' as const,
  displayOperationId: false,
  tryItOutEnabled: true,
  persistAuthorization: true,
};

/**
 * Swagger UI config for module docs (with filter enabled)
 */
const moduleSwaggerUiConfig = {
  ...baseSwaggerUiConfig,
  filter: true, // Enable filter for module docs
};

/**
 * Swagger UI config for main docs (filter disabled)
 */
const mainSwaggerUiConfig = {
  ...baseSwaggerUiConfig,
  filter: false, // Disable filter for main docs
};

/**
 * Module configurations
 */
export const moduleConfigs: Record<string, ModuleSwaggerConfig> = {
  hub: {
    title: 'Mereka Hub API',
    description:
      'Hub management APIs - Jobs, Contracts, Proposals, Milestones, Timelogs, Invitations',
    routePrefix: '/docs/hub',
    tags: [
      { name: 'Hub Profile', description: 'Hub profile management' },
      { name: 'Jobs', description: 'Job posting and management' },
      { name: 'Proposals', description: 'Proposal submission and management' },
      { name: 'Contracts', description: 'Contract lifecycle management' },
      { name: 'Milestones', description: 'Milestone tracking and payments' },
      { name: 'Timelogs', description: 'Time tracking for hourly contracts' },
      { name: 'Hub Invitations', description: 'Team member invitations' },
      { name: 'Hub Invitation Links', description: 'Invitation link management' },
      { name: 'Hub Members', description: 'Hub member management' },
    ],
  },
  admin: {
    title: 'Mereka Admin API',
    description: 'Admin panel APIs - Users, RBAC, Reference Data, Communications, Infrastructure',
    routePrefix: '/docs/admin',
    tags: [
      { name: 'Admin Auth', description: 'Admin authentication' },
      { name: 'Admin Users', description: 'User management' },
      { name: 'Roles', description: 'Role management (RBAC)' },
      { name: 'Permissions', description: 'Permission management (RBAC)' },
      { name: 'Banks', description: 'Bank management' },
      { name: 'Reference Data', description: 'Reference data management' },
      { name: 'Email Templates', description: 'Email template management' },
      { name: 'Notification Templates', description: 'Notification template management' },
      { name: 'Email Logs', description: 'Email log monitoring' },
      { name: 'Notification Logs', description: 'Notification log monitoring' },
      { name: 'API Monitoring', description: 'API usage and quota monitoring' },
      { name: 'Cron Jobs', description: 'Scheduled job management' },
      { name: 'Plans', description: 'Subscription plan management' },
      { name: 'Admin Experiences', description: 'Experience management' },
      { name: 'Admin Expertise', description: 'Expertise management' },
      { name: 'Admin Contracts', description: 'Contract administration' },
      { name: 'Admin Jobs', description: 'Job administration' },
      { name: 'Admin Hubs', description: 'Hub administration' },
    ],
  },
  web: {
    title: 'Mereka Web API',
    description: 'Public marketplace APIs - Experiences, Profiles, Bookings, Reference Data',
    routePrefix: '/docs/web',
    tags: [
      { name: 'Learner Profile', description: 'Learner profile management' },
      { name: 'Experiences', description: 'Experience discovery and booking' },
      { name: 'Expertise', description: 'Expertise and skills' },
      { name: 'Booking Transactions', description: 'Booking and payment transactions' },
      { name: 'Subscription', description: 'Subscription management' },
      { name: 'Slug', description: 'Slug availability checking' },
      { name: 'Amenities', description: 'Amenity reference data' },
      { name: 'Facilities', description: 'Facility reference data' },
      { name: 'Skills', description: 'Skill reference data' },
      { name: 'Languages', description: 'Language reference data' },
      { name: 'Experience Types', description: 'Experience type reference data' },
      { name: 'Experience Themes', description: 'Experience theme reference data' },
      { name: 'Focus Areas', description: 'Focus area reference data' },
      { name: 'Space Types', description: 'Space type reference data' },
      { name: 'Company Types', description: 'Company type reference data' },
      { name: 'Job Preferences', description: 'Job preference reference data' },
    ],
  },
  shared: {
    title: 'Mereka Shared API',
    description: 'Shared APIs - Authentication, Payments, Stripe Integration',
    routePrefix: '/docs/shared',
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication (login, register, password reset)',
      },
      { name: 'Stripe Account', description: 'Stripe Connect account management' },
      { name: 'Stripe Payment', description: 'Payment processing and escrow' },
      { name: 'Bank Accounts', description: 'Bank account management for payouts' },
      { name: 'Balance', description: 'Balance and earnings' },
      { name: 'Withdrawals', description: 'Payout requests' },
      { name: 'Webhook', description: 'Payment webhook handlers' },
    ],
  },
};

/**
 * Register Swagger plugin (call BEFORE registering routes)
 */
async function registerModuleSwaggerPlugin(
  fastify: FastifyInstance,
  config: ModuleSwaggerConfig,
): Promise<void> {
  await fastify.register(fastifySwagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: config.title,
        description: config.description,
        version: '1.0.0',
        contact: {
          name: 'Mereka Team',
          email: 'support@mereka.com',
        },
      },
      servers: [
        {
          url: `http://localhost:${env.PORT}`,
          description: 'Development server',
        },
        {
          url: 'https://api.mereka.com',
          description: 'Production server',
        },
      ],
      tags: config.tags,
      components: {
        securitySchemes,
      },
    },
  });
}

/**
 * Get the module key from route prefix
 */
function getModuleKeyFromPrefix(routePrefix: string): string {
  const parts = routePrefix.split('/');
  return parts[parts.length - 1] || 'docs';
}

/**
 * Register Swagger UI (call AFTER registering routes)
 */
async function registerModuleSwaggerUI(
  fastify: FastifyInstance,
  config: ModuleSwaggerConfig,
): Promise<void> {
  const moduleKey = getModuleKeyFromPrefix(config.routePrefix);

  await fastify.register(fastifySwaggerUi, {
    routePrefix: config.routePrefix,
    uiConfig: moduleSwaggerUiConfig,
    staticCSP: true,
    transformStaticCSP: (header) => header,
    theme: {
      title: config.title,
      css: [{ filename: 'mereka-theme.css', content: merekaBrandingCSS }],
    },
    transformSpecification: (swaggerObject) => {
      // Remove tags that have no operations
      return swaggerObject;
    },
    uiHooks: {
      onRequest: (_request, _reply, done) => {
        done();
      },
      preHandler: (_request, _reply, done) => {
        done();
      },
    },
    transformSpecificationClone: true,
  });

  // Add custom route to inject navigation header
  fastify.addHook('onSend', async (request, reply, payload) => {
    if (
      request.url === config.routePrefix ||
      request.url === `${config.routePrefix}/` ||
      request.url === `${config.routePrefix}/index.html`
    ) {
      if (typeof payload === 'string' && payload.includes('<!DOCTYPE html>')) {
        const navHtml = generateNavHtml(moduleKey);
        const modifiedPayload = payload
          .replace('<body>', `<body><style>${merekaBrandingCSS}</style>${navHtml}`)
          .replace(/<title>.*?<\/title>/, `<title>${config.title} | Mereka API</title>`);
        reply.header('content-length', Buffer.byteLength(modifiedPayload));
        return modifiedPayload;
      }
    }
    return payload;
  });

  fastify.log.info(`📚 ${config.title} documentation registered at ${config.routePrefix}`);
}

/**
 * Register main Swagger documentation (all APIs combined)
 */
export async function registerSwagger(fastify: FastifyInstance): Promise<void> {
  // Collect all tags from all modules
  const allTags = Object.entries(moduleConfigs).flatMap(([moduleKey, config]) =>
    config.tags.map((tag) => ({
      name: `${moduleKey.charAt(0).toUpperCase() + moduleKey.slice(1)}: ${tag.name}`,
      description: tag.description,
    })),
  );

  // Add system tags
  allTags.unshift({ name: 'Health', description: 'Health check endpoints' });

  // Register main Swagger with all APIs
  await fastify.register(fastifySwagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'Mereka Backend API',
        description: `RESTful API powering the Mereka platform. Built with **Node.js**, **MongoDB**, and **Fastify**.

## Quick Links

- **[Hub APIs](/docs/hub)** - Jobs, Contracts, Proposals, Milestones, Timelogs
- **[Admin APIs](/docs/admin)** - User Management, RBAC, Reference Data, Monitoring
- **[Web APIs](/docs/web)** - Experiences, Learner Profiles, Bookings, Subscriptions
- **[Shared APIs](/docs/shared)** - Authentication, Stripe Payments, Webhooks

Use the navigation bar above to explore module-specific documentation.`,
        version: '1.0.0',
      },
      servers: [
        {
          url: `http://localhost:${env.PORT}`,
          description: 'Development server',
        },
        {
          url: 'https://api.mereka.com',
          description: 'Production server',
        },
      ],
      tags: allTags,
      components: {
        securitySchemes,
      },
    },
  });

  // Register main Swagger UI at /docs
  await fastify.register(fastifySwaggerUi, {
    routePrefix: '/docs',
    uiConfig: mainSwaggerUiConfig,
    staticCSP: true,
    transformStaticCSP: (header) => header,
    theme: {
      title: 'Mereka API Documentation',
      css: [{ filename: 'mereka-theme.css', content: merekaBrandingCSS }],
    },
  });

  // Add custom hook to inject navigation header
  fastify.addHook('onSend', async (request, reply, payload) => {
    if (request.url === '/docs' || request.url === '/docs/' || request.url === '/docs/index.html') {
      if (typeof payload === 'string' && payload.includes('<!DOCTYPE html>')) {
        const navHtml = generateNavHtml('docs');
        const modifiedPayload = payload
          .replace('<body>', `<body><style>${merekaBrandingCSS}</style>${navHtml}`)
          .replace(/<title>.*?<\/title>/, '<title>Mereka API Documentation</title>');
        reply.header('content-length', Buffer.byteLength(modifiedPayload));
        return modifiedPayload;
      }
    }
    return payload;
  });

  fastify.log.info('📚 Main Swagger documentation registered at /docs');
}

/**
 * Initialize module Swagger plugin (call BEFORE registering routes)
 * This sets up the swagger plugin to collect routes for this module only
 */
export async function initModuleSwagger(
  fastify: FastifyInstance,
  moduleKey: 'hub' | 'admin' | 'web' | 'shared',
): Promise<void> {
  const config = moduleConfigs[moduleKey];
  if (config) {
    await registerModuleSwaggerPlugin(fastify, config);
  }
}

/**
 * Finalize module Swagger UI (call AFTER registering routes)
 * This registers the Swagger UI to display the collected routes
 */
export async function finalizeModuleSwagger(
  fastify: FastifyInstance,
  moduleKey: 'hub' | 'admin' | 'web' | 'shared',
): Promise<void> {
  const config = moduleConfigs[moduleKey];
  if (config) {
    await registerModuleSwaggerUI(fastify, config);
  }
}

/**
 * Get module config for external use
 */
export function getModuleConfig(moduleKey: string): ModuleSwaggerConfig | undefined {
  return moduleConfigs[moduleKey];
}
