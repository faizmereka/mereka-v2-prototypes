# Job Model Documentation

**Location**: `src/models/Job.ts`
**Collection**: `jobs`
**Purpose**: Job postings created by clients to hire experts

---

## Overview

The Job model represents job postings in the Mereka platform. Clients create jobs to find and hire experts for various projects. Jobs can be public (visible to all) or private (invite-only).

---

## Model Structure

### Core Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `jobTitle` | String | Yes | Job title (max 70 chars) |
| `jobDescription` | String | Yes | Detailed job description (min 100 chars) |
| `jobSummary` | String | No | Brief summary for listings |
| `employmentType` | Enum | Yes | full-time, freelance, part-time |
| `status` | Enum | Yes | DRAFT, ACTIVE, IN_PROGRESS, COMPLETED, CANCELLED, EXPIRED |

### Service Category (Subdocument)

```typescript
serviceCategory: {
  category: string;      // Main category (e.g., "Design")
  serviceType: string;   // Specific service (e.g., "UI/UX Design")
}
```

### Budget (Subdocument)

```typescript
jobBudget: {
  pricingType: "fixed" | "hourly";
  fromAmount: number;    // Starting amount
  upToAmount?: number;   // Optional max amount
}
jobCurrency: string;     // Currency code (e.g., "MYR")
```

### Experience & Location

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `expertLevel` | String | No | Required expertise level |
| `jobLocation` | String | No | Job location |
| `preferredLocation` | String[] | No | Preferred expert locations |

### Timeline

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `jobStartDate` | Date | No | Proposed start date |
| `jobEndDate` | String | No | Duration or end date |

### Skills & Attachments

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `jobSkills` | String[] | Yes | Required skills |
| `jobUploads` | String[] | No | Attachment URLs |

### Access & Contact

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `accessMode` | Enum | Yes | PUBLIC or PRIVATE |
| `name` | String | Yes | Contact name |
| `email` | String | Yes | Contact email |
| `phoneNumber` | String | No | Contact phone |
| `organizationName` | String | No | Company name |
| `aboutOrganization` | String | No | Company description |
| `organizationImage` | String | No | Company logo URL |

### References

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `hubId` | String | Yes | Hub/Agency ID |
| `createdBy` | String | Yes | User ID who created job |

---

## Enums

### JobStatus
- `DRAFT` - Job being created, not published
- `ACTIVE` - Published and accepting proposals
- `IN_PROGRESS` - Work has started
- `COMPLETED` - Job finished
- `CANCELLED` - Job cancelled
- `EXPIRED` - Job posting expired

### EmploymentType
- `full-time` - Full-time employment
- `freelance` - Freelance/contract work
- `part-time` - Part-time work

### PricingType
- `fixed` - Fixed project price
- `hourly` - Hourly rate

### AccessMode
- `PUBLIC` - Visible to all experts
- `PRIVATE` - Invite-only

---

## Indexes

```typescript
{ createdBy: 1, status: 1 }       // Client's jobs
{ hubId: 1, status: 1 }           // Hub's jobs
{ status: 1, createdDate: -1 }    // Active jobs by date
```

---

## Instance Methods

### `isActive(): boolean`
Check if job is currently active and accepting proposals.

---

## Static Methods

### `findActiveJobs(limit?: number)`
Find all active jobs, optionally limited.

### `findByCreator(userId: string, status?: JobStatus)`
Find jobs created by a specific user, optionally filtered by status.

### `findByHub(hubId: string, status?: JobStatus)`
Find jobs for a specific hub, optionally filtered by status.

---

## Usage Examples

### Create Job

```typescript
const job = await Job.create({
  jobTitle: "UI/UX Designer Needed",
  jobDescription: "We need an experienced UI/UX designer...",
  employmentType: EmploymentType.FREELANCE,
  status: JobStatus.DRAFT,
  serviceCategory: {
    category: "Design",
    serviceType: "UI/UX Design"
  },
  jobBudget: {
    pricingType: PricingType.FIXED,
    fromAmount: 5000,
    upToAmount: 8000
  },
  jobCurrency: "MYR",
  jobSkills: ["Figma", "Adobe XD", "Prototyping"],
  accessMode: AccessMode.PUBLIC,
  name: "John Doe",
  email: "john@example.com",
  hubId: "hub123",
  createdBy: "user123"
});
```

### Query Active Jobs

```typescript
const activeJobs = await Job.findActiveJobs(20);
```

### Update Job Status

```typescript
const job = await Job.findById(jobId);
job.status = JobStatus.ACTIVE;
await job.save();
```

---

## Related Models

- **JobProposal**: Experts submit proposals for jobs
- **Contract**: Created when a proposal is accepted
- **User**: Creator and assigned expert
- **Hub**: Associated agency/organization

---

## API Endpoints

- `POST /api/v1/jobs` - Create or update job
- `GET /api/v1/jobs` - List jobs with filters
- `GET /api/v1/jobs/:id` - Get job details
- `DELETE /api/v1/jobs/:id` - Delete job

---

## Validation Rules

- `jobTitle`: 1-70 characters
- `jobDescription`: Minimum 100 characters
- `jobBudget.fromAmount`: Must be positive
- `jobSkills`: At least 1 skill required
- `email`: Valid email format

---

## Best Practices

1. Always set status to DRAFT initially, then publish
2. Include detailed job description for better proposals
3. Specify realistic budget ranges
4. Add relevant skills to attract right experts
5. Use PUBLIC mode for wider reach, PRIVATE for curated teams

---

## Migration Notes

Frontend field names match exactly:
- Uses `createdDate`/`lastUpdatedDate` instead of `createdAt`/`updatedAt`
- Contact fields are flat (not nested in contactInfo)
- Budget is a subdocument with pricingType

---

**Last Updated**: 2025-11-20
