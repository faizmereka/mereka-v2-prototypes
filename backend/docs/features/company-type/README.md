# CompanyType Feature

## Overview

The CompanyType feature defines organizational categories for hubs on the Mereka platform. Company types help classify organizations by their size, structure, or nature, enabling better matching, analytics, and targeted services.

## Business Context

Company Types are essential for:
- **Hub Classification** - Categorize organizations appropriately
- **Service Customization** - Offer type-specific features and pricing
- **Analytics & Reporting** - Track platform usage by organization type
- **Partnerships** - Identify potential partnership opportunities
- **Marketing** - Target campaigns to specific company types
- **Requirements** - Apply type-specific policies or features

Examples: Startup, SME, Corporate, Non-Profit, Educational Institution, Government, Social Enterprise, Freelancer/Solopreneur

## Model Structure

**Location:** `src/models/CompanyType.ts`

### Core Fields

#### Basic Information
- `name` (required, unique, indexed) - Company type name (e.g., "Startup", "Corporate")
- `description` (optional) - Detailed explanation of this company type

#### Status
- `isActive` (boolean, indexed, default: true) - Whether company type is visible and selectable

#### Metadata
- `priority` (number, default: 0) - Sort order for display (lower = higher priority)

#### Audit Fields
- `createdAt` - Auto-generated timestamp
- `updatedAt` - Auto-generated timestamp

## Indexes

### Single Field Indexes
- `name` (unique) - Ensure unique company type names
- `isActive` (standard) - Filter active company types

### Compound Indexes
- `{ isActive: 1, priority: 1 }` - Get active company types sorted by priority

## Relationships

### Referenced By
- **Hub** - Hubs reference company type via `companyType` field
  - Hub has ONE company type
  - Stored as: `companyType: ObjectId`
  - Populated to show full details

## API Endpoints

**Base Path:** `/api/v1/company-types`

### GET /
**Get All Company Types**
- **Auth:** None
- **Query:** `includeInactive` (optional) - Include inactive company types
- **Returns:** Array of company types sorted by priority

### GET /:id
**Get Company Type by ID**
- **Auth:** None
- **Params:** `id` - CompanyType ObjectId
- **Returns:** Single company type object

### POST /
**Create Company Type**
- **Auth:** Required
- **Body:**
  ```json
  {
    "name": "Startup",
    "description": "Early-stage company focused on innovation and growth",
    "priority": 1
  }
  ```
- **Returns:** Created company type object

### PATCH /:id
**Update Company Type**
- **Auth:** Required
- **Params:** `id` - CompanyType ObjectId
- **Body:** Partial company type object
- **Returns:** Updated company type object

### DELETE /:id
**Delete Company Type (Soft Delete)**
- **Auth:** Required
- **Params:** `id` - CompanyType ObjectId
- **Action:** Sets `isActive: false`
- **Returns:** Success message

## Business Logic

### Naming Convention
- Clear, recognized business terms
- Title Case
- 1-3 words typical
- Use globally understood terms

### Description Guidelines
- 1-2 sentences explaining the organization type
- Mention typical characteristics (size, structure, purpose)
- Clarify what qualifies as this type
- Examples:
  - **Startup:** Early-stage company typically with high growth potential and innovative products/services
  - **SME:** Small and Medium Enterprise with established operations and revenue
  - **Corporate:** Large established organization with formal structures and multiple departments
  - **Non-Profit:** Organization operating for social/charitable purposes rather than profit

### Priority System
- Lower numbers = higher priority
- Order by platform focus:
  - Startup: 1
  - SME: 2
  - Corporate: 3
- Default: 0

## Query Patterns

### Get Active Company Types for Dropdown
```typescript
const companyTypes = await CompanyType.find({ isActive: true })
  .sort({ priority: 1, name: 1 })
  .select('name description')
  .lean();
```

### Get Hub with Company Type (Populated)
```typescript
const hub = await Hub.findById(hubId)
  .populate('companyType', 'name description')
  .lean();
```

### Get Hubs by Company Type
```typescript
const hubs = await Hub.find({
  companyType: companyTypeId,
  isActive: true,
}).lean();
```

### Get Company Type Distribution
```typescript
const distribution = await Hub.aggregate([
  {
    $group: {
      _id: '$companyType',
      count: { $sum: 1 },
    },
  },
  {
    $lookup: {
      from: 'companytypes',
      localField: '_id',
      foreignField: '_id',
      as: 'companyType',
    },
  },
  { $unwind: '$companyType' },
  {
    $project: {
      name: '$companyType.name',
      hubCount: '$count',
    },
  },
  { $sort: { hubCount: -1 } },
]);
```

## File References

- **Model:** `src/models/CompanyType.ts`
- **Schema:** `src/schemas/reference-data.schema.ts`
- **Controller:** `src/controllers/company-type.controller.ts`
- **Service:** `src/services/company-type.service.ts`
- **Routes:** `src/routes/company-type.routes.ts`

## Related Documentation

- [Hub](../hub/README.md) - Hubs have a company type

## Usage Examples

### Create Company Type
```typescript
const companyType = await CompanyType.create({
  name: "Social Enterprise",
  description: "Business with primary mission to address social/environmental issues",
  isActive: true,
  priority: 7,
});
```

### Set Hub's Company Type
```typescript
await Hub.findByIdAndUpdate(hubId, {
  companyType: companyTypeId,
});
```

## Validation Rules

### Name
- Required, unique, trimmed
- Length: 2-50 characters

### Description
- Optional, trimmed
- Length: 10-200 characters

### Priority
- Default: 0
- Any integer

## Standard Company Types

### By Size
- **Freelancer/Solopreneur** - Individual operating independently
- **Micro Business** - Very small business (1-10 employees)
- **SME (Small & Medium Enterprise)** - Established small to medium business (10-250 employees)
- **Corporate** - Large established organization (250+ employees)
- **Enterprise** - Very large corporation with multiple divisions
- **Multinational** - Large corporation operating in multiple countries

### By Stage
- **Startup** - Early-stage, high-growth potential (0-3 years)
- **Scale-up** - Growing rapidly, expanding operations (3-10 years)
- **Established Business** - Mature, stable operations (10+ years)

### By Purpose
- **For-Profit** - Commercial business seeking profit
- **Non-Profit** - Organization for social/charitable purposes
- **Social Enterprise** - Business with social mission
- **B-Corp** - Certified benefit corporation
- **Cooperative** - Member-owned and operated

### By Sector
- **Educational Institution** - Schools, universities, training centers
- **Government** - Public sector organizations
- **NGO (Non-Governmental Organization)** - Non-profit advocacy or service
- **Think Tank** - Research and policy organization
- **Incubator/Accelerator** - Startup support organization

### By Structure
- **Private Company** - Privately held, not publicly traded
- **Public Company** - Publicly traded on stock exchange
- **Family Business** - Family-owned and operated
- **Partnership** - Business owned by partners
- **Sole Proprietorship** - Single owner business

## Typical Characteristics

### Startup
- **Size:** 1-50 employees
- **Age:** 0-3 years
- **Focus:** Innovation, growth, product-market fit
- **Structure:** Lean, flexible, fast-moving
- **Funding:** Bootstrapped, angel, VC

### SME
- **Size:** 10-250 employees
- **Age:** 3+ years
- **Focus:** Profitability, stability, growth
- **Structure:** Established processes, departments
- **Funding:** Revenue, bank loans, investors

### Corporate
- **Size:** 250+ employees
- **Age:** 10+ years
- **Focus:** Market leadership, efficiency, scale
- **Structure:** Formal hierarchy, multiple departments
- **Funding:** Revenue, shareholders, debt

### Non-Profit
- **Size:** Varies
- **Purpose:** Social/charitable mission
- **Focus:** Impact, sustainability, donor relations
- **Structure:** Board-governed
- **Funding:** Donations, grants, fundraising

## Use Cases by Company Type

### Startups
- Looking for affordable coworking spaces
- Need mentorship and networking
- Seek  skill development workshops
- Want access to innovation programs

### SMEs
- Need professional meeting spaces
- Require training for employee development
- Want business growth workshops
- Seek B2B networking opportunities

### Corporates
- Book event spaces for team building
- Hire trainers for employee programs
- Sponsor community initiatives
- Partner for CSR programs

### Educational Institutions
- Offer courses and programs
- Provide professional development
- Host student workshops
- Collaborate on research

## Future Enhancements

1. Company size ranges (employee count)
2. Industry verticals within company types
3. Company stage/maturity indicators
4. Type-specific pricing tiers
5. Type-specific features
6. Verification badges for company types
7. Company type recommendations
8. Type-specific analytics dashboards
9. Partnership matching by type
10. Type-specific compliance requirements
