# Complete Job-to-Payment Workflow API Guide

**Purpose**: End-to-end API workflow from job posting to payment
**Last Updated**: 2025-11-20

---

## Overview

This document describes the complete workflow for the Mereka platform:

```
Job Posting → Proposal Submission → Contract Creation → Work Execution → Payment
```

Two work types supported:
- **Fixed Price**: Work divided into milestones
- **Hourly**: Work tracked through daily timelogs

---

## Table of Contents

1. [Phase 1: Job Posting](#phase-1-job-posting)
2. [Phase 2: Proposal Submission](#phase-2-proposal-submission)
3. [Phase 3: Contract Creation](#phase-3-contract-creation)
4. [Phase 4A: Fixed Price Workflow](#phase-4a-fixed-price-workflow)
5. [Phase 4B: Hourly Workflow](#phase-4b-hourly-workflow)
6. [Complete Examples](#complete-examples)

---

## Phase 1: Job Posting

### 1.1 Client Creates Job

**Endpoint**: `POST /api/v1/jobs`

**Request**:
```json
{
  "jobTitle": "UI/UX Designer for Mobile App",
  "jobDescription": "We need an experienced UI/UX designer to create wireframes and mockups for our mobile application. The project requires expertise in user research, information architecture, and modern design tools.",
  "employmentType": "freelance",
  "status": "DRAFT",
  "serviceCategory": {
    "category": "Design",
    "serviceType": "UI/UX Design"
  },
  "jobBudget": {
    "pricingType": "fixed",
    "fromAmount": 5000,
    "upToAmount": 8000
  },
  "jobCurrency": "MYR",
  "jobSkills": ["Figma", "Adobe XD", "User Research", "Prototyping"],
  "jobStartDate": "2025-12-01",
  "jobEndDate": "2 months",
  "accessMode": "PUBLIC",
  "name": "John Doe",
  "email": "john@example.com",
  "phoneNumber": "+60123456789",
  "organizationName": "TechCorp Malaysia",
  "hubId": "hub123"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "673d1a2b3c4d5e6f7a8b9c0d",
    "jobTitle": "UI/UX Designer for Mobile App",
    "status": "DRAFT",
    "createdDate": "2025-11-20T10:00:00.000Z",
    ...
  },
  "message": "Job created successfully"
}
```

### 1.2 Client Publishes Job

**Endpoint**: `PATCH /api/v1/jobs/{jobId}`

**Request**:
```json
{
  "status": "ACTIVE"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "673d1a2b3c4d5e6f7a8b9c0d",
    "status": "ACTIVE",
    ...
  },
  "message": "Job updated successfully"
}
```

---

## Phase 2: Proposal Submission

### 2.1 Expert Submits Proposal (Fixed Price)

**Endpoint**: `POST /api/v1/proposals`

**Request**:
```json
{
  "jobId": "673d1a2b3c4d5e6f7a8b9c0d",
  "proposalDetails": "I am an experienced UI/UX designer with 5+ years in mobile app design. I have successfully delivered 20+ mobile applications with excellent user feedback. I will deliver high-fidelity wireframes, interactive prototypes, and complete design system.",
  "priceType": "fixed",
  "proposedPrice": 6000,
  "selectedCurrency": "MYR",
  "files": ["https://example.com/portfolio.pdf"],
  "milestones": [
    {
      "taskName": "User Research & Wireframes",
      "taskDescription": "Conduct user research and create low-fidelity wireframes",
      "amount": 2000,
      "dueDate": "2025-12-10"
    },
    {
      "taskName": "High-Fidelity Mockups",
      "taskDescription": "Create polished high-fidelity designs",
      "amount": 2500,
      "dueDate": "2025-12-20"
    },
    {
      "taskName": "Interactive Prototype & Design System",
      "taskDescription": "Build interactive prototype and complete design system",
      "amount": 1500,
      "dueDate": "2025-12-30"
    }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "673d2b3c4d5e6f7a8b9c0d1e",
    "jobId": "673d1a2b3c4d5e6f7a8b9c0d",
    "status": "pending",
    "priceType": "fixed",
    "proposedPrice": 6000,
    "createdDate": "2025-11-20T11:00:00.000Z",
    ...
  },
  "message": "Proposal created successfully"
}
```

### 2.2 Expert Submits Proposal (Hourly)

**Endpoint**: `POST /api/v1/proposals`

**Request**:
```json
{
  "jobId": "673d1a2b3c4d5e6f7a8b9c0d",
  "proposalDetails": "I can work 40 hours per week on this project at an hourly rate. I estimate the project will take approximately 80-100 hours to complete.",
  "priceType": "hourly",
  "hourlyProposedPrice": 150,
  "workingHours": 80,
  "selectedCurrency": "MYR",
  "files": []
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "673d2b3c4d5e6f7a8b9c0d1f",
    "jobId": "673d1a2b3c4d5e6f7a8b9c0d",
    "status": "pending",
    "priceType": "hourly",
    "hourlyProposedPrice": 150,
    "workingHours": 80,
    "createdDate": "2025-11-20T11:15:00.000Z",
    ...
  },
  "message": "Proposal created successfully"
}
```

### 2.3 Client Reviews Proposals

**Endpoint**: `GET /api/v1/proposals?jobId={jobId}`

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "673d2b3c4d5e6f7a8b9c0d1e",
      "expertId": "expert123",
      "priceType": "fixed",
      "proposedPrice": 6000,
      "status": "pending",
      ...
    },
    {
      "_id": "673d2b3c4d5e6f7a8b9c0d1f",
      "expertId": "expert456",
      "priceType": "hourly",
      "hourlyProposedPrice": 150,
      "status": "pending",
      ...
    }
  ]
}
```

### 2.4 Client Rejects Proposal

**Endpoint**: `POST /api/v1/proposals/{proposalId}/reject`

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "673d2b3c4d5e6f7a8b9c0d1f",
    "status": "rejected",
    ...
  },
  "message": "Proposal rejected successfully"
}
```

---

## Phase 3: Contract Creation

### 3.1 Client Accepts Proposal & Creates Contract

**Endpoint**: `POST /api/v1/contracts`

**Request (Fixed Price)**:
```json
{
  "jobId": "673d1a2b3c4d5e6f7a8b9c0d",
  "jobProposalId": "673d2b3c4d5e6f7a8b9c0d1e",
  "hubId": "hub123",
  "contractTitle": "UI/UX Design for Mobile App",
  "contractDescription": "Complete UI/UX design including wireframes, mockups, and interactive prototype",
  "contractUploads": ["https://example.com/contract.pdf"],
  "priceType": "fixed",
  "proposedPrice": 6000,
  "hasMilestones": true,
  "selectedCurrency": "MYR",
  "startDate": "2025-12-01",
  "endDate": "2025-12-30",
  "asssignedExpertId": "expert123",
  "stripeCustomerId": "cus_xxxxx",
  "stripeAccount": "acct_xxxxx",
  "paymentMethodId": "pm_xxxxx"
}
```

**Request (Hourly)**:
```json
{
  "jobId": "673d1a2b3c4d5e6f7a8b9c0d",
  "jobProposalId": "673d2b3c4d5e6f7a8b9c0d1e",
  "hubId": "hub123",
  "contractTitle": "UI/UX Design Services",
  "contractDescription": "Hourly design services for mobile app",
  "priceType": "hourly",
  "hourlyProposedPrice": 150,
  "weeklyLimit": 40,
  "selectedCurrency": "MYR",
  "startDate": "2025-12-01",
  "asssignedExpertId": "expert123",
  "stripeCustomerId": "cus_xxxxx",
  "stripeAccount": "acct_xxxxx",
  "paymentMethodId": "pm_xxxxx"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "673d3c4d5e6f7a8b9c0d1e2f",
    "jobId": "673d1a2b3c4d5e6f7a8b9c0d",
    "jobProposalId": "673d2b3c4d5e6f7a8b9c0d1e",
    "status": "pending",
    "priceType": "fixed",
    "proposedPrice": 6000,
    "createdDate": "2025-11-20T12:00:00.000Z",
    ...
  },
  "message": "Contract created successfully"
}
```

**Side Effect**: Proposal status automatically changes to `accepted` and `contractId` is set.

### 3.2 Start Contract

**Endpoint**: `PATCH /api/v1/contracts/{contractId}`

**Request**:
```json
{
  "status": "active"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "673d3c4d5e6f7a8b9c0d1e2f",
    "status": "active",
    ...
  },
  "message": "Contract updated successfully"
}
```

---

## Phase 4A: Fixed Price Workflow

### 4A.1 View Milestones

**Endpoint**: `GET /api/v1/milestones?contractId={contractId}`

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "673d4d5e6f7a8b9c0d1e2f3a",
      "contractId": "673d3c4d5e6f7a8b9c0d1e2f",
      "taskName": "User Research & Wireframes",
      "amount": 2000,
      "dueDate": "2025-12-10",
      "status": "active",
      ...
    },
    {
      "_id": "673d4d5e6f7a8b9c0d1e2f3b",
      "taskName": "High-Fidelity Mockups",
      "amount": 2500,
      "dueDate": "2025-12-20",
      "status": "active",
      ...
    },
    {
      "_id": "673d4d5e6f7a8b9c0d1e2f3c",
      "taskName": "Interactive Prototype & Design System",
      "amount": 1500,
      "dueDate": "2025-12-30",
      "status": "active",
      ...
    }
  ]
}
```

### 4A.2 Expert Submits Work for Milestone

**Endpoint**: `POST /api/v1/milestones/{milestoneId}/submit-work`

**Request**:
```json
{
  "workLogDescription": "Completed user research with 15 participants. Created 20 low-fidelity wireframes covering all main user flows. Delivered comprehensive user research report with insights and recommendations.",
  "workLogFilesUrl": [
    "https://example.com/wireframes.pdf",
    "https://example.com/user-research-report.pdf"
  ]
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "673d4d5e6f7a8b9c0d1e2f3a",
    "status": "work_submitted",
    "workLogDescription": "Completed user research...",
    "workLogFilesUrl": [...],
    "workSubmittedDate": "2025-12-10T15:00:00.000Z",
    ...
  },
  "message": "Work submitted successfully"
}
```

### 4A.3 Client Approves Milestone & Processes Payment

**Endpoint**: `POST /api/v1/milestones/{milestoneId}/approve`

**Request**:
```json
{
  "paymentIntentId": "pi_xxxxx"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "673d4d5e6f7a8b9c0d1e2f3a",
    "status": "approved",
    "paymentIntentId": "pi_xxxxx",
    ...
  },
  "message": "Milestone approved successfully"
}
```

**Payment Flow**:
1. Client calls Stripe API to create payment intent
2. Payment processed through Stripe
3. Client calls approve endpoint with `paymentIntentId`
4. Milestone status → `approved`
5. When payment completes → `completed`

### 4A.4 Repeat for All Milestones

Continue steps 4A.2 and 4A.3 for remaining milestones until all work is completed.

### 4A.5 Complete Contract

**Endpoint**: `PATCH /api/v1/contracts/{contractId}`

**Request**:
```json
{
  "status": "completed"
}
```

---

## Phase 4B: Hourly Workflow

### 4B.1 Expert Logs Daily Work

**Endpoint**: `POST /api/v1/timelogs`

**Request**:
```json
{
  "contractId": "673d3c4d5e6f7a8b9c0d1e2f",
  "workDate": "2025-12-01",
  "startTime": "09:00",
  "endTime": "17:30",
  "breakDuration": 1,
  "description": "Completed user research interviews with 5 participants. Analyzed feedback and created initial insights document.",
  "tasks": [
    "User interviews (3 hours)",
    "Feedback analysis (2.5 hours)",
    "Documentation (2 hours)"
  ]
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "673d5e6f7a8b9c0d1e2f3a4b",
    "contractId": "673d3c4d5e6f7a8b9c0d1e2f",
    "workDate": "2025-12-01",
    "startTime": "09:00",
    "endTime": "17:30",
    "breakDuration": 1,
    "hoursWorked": 7.5,
    "billableAmount": 1125,
    "status": "draft",
    ...
  },
  "message": "Timelog created successfully"
}
```

**Auto-calculated**:
- `hoursWorked` = 7.5 (17:30 - 09:00 - 1:00 break)
- `billableAmount` = 1125 (7.5 × 150)
- `weekNumber` = 49 (from workDate)
- `year` = 2025
- `monthNumber` = 12

### 4B.2 Expert Edits Timelog (While Draft)

**Endpoint**: `PATCH /api/v1/timelogs/{timelogId}`

**Request**:
```json
{
  "endTime": "18:00",
  "description": "Completed user research interviews with 5 participants. Analyzed feedback and created initial insights document. Added more detail to documentation."
}
```

### 4B.3 Expert Submits Timelog

**Endpoint**: `POST /api/v1/timelogs/{timelogId}/submit`

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "673d5e6f7a8b9c0d1e2f3a4b",
    "status": "submitted",
    "submittedDate": "2025-12-01T18:00:00.000Z",
    ...
  },
  "message": "Timelog submitted successfully"
}
```

**Validation**: Checks that weekly limit is not exceeded before allowing submission.

### 4B.4 Get Weekly Summary

**Endpoint**: `GET /api/v1/timelogs/weekly-summary?contractId={contractId}&year=2025&weekNumber=49`

**Response**:
```json
{
  "success": true,
  "data": {
    "contractId": "673d3c4d5e6f7a8b9c0d1e2f",
    "year": 2025,
    "weekNumber": 49,
    "totalHours": 37.5,
    "totalAmount": 5625,
    "weeklyLimit": 40,
    "isOverLimit": false,
    "remainingHours": 2.5,
    "entriesCount": 5,
    "byStatus": {
      "draft": 0,
      "submitted": 5,
      "approved": 0,
      "rejected": 0,
      "paid": 0
    },
    "entries": [...]
  }
}
```

### 4B.5 Client Approves Timelog & Processes Payment

**Endpoint**: `POST /api/v1/timelogs/{timelogId}/approve`

**Request**:
```json
{
  "paymentIntentId": "pi_xxxxx"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "673d5e6f7a8b9c0d1e2f3a4b",
    "status": "approved",
    "paymentIntentId": "pi_xxxxx",
    "approvedDate": "2025-12-02T10:00:00.000Z",
    ...
  },
  "message": "Timelog approved successfully"
}
```

### 4B.6 Client Rejects Timelog

**Endpoint**: `POST /api/v1/timelogs/{timelogId}/reject`

**Request**:
```json
{
  "reason": "Hours seem excessive for the tasks described. Please revise and resubmit."
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "673d5e6f7a8b9c0d1e2f3a4b",
    "status": "rejected",
    "rejectedDate": "2025-12-02T10:00:00.000Z",
    "rejectionReason": "Hours seem excessive for the tasks described. Please revise and resubmit.",
    ...
  },
  "message": "Timelog rejected successfully"
}
```

### 4B.7 Update Hourly Rate (Terms Update)

**Expert or Client Requests Change**:

**Endpoint**: `POST /api/v1/contracts/{contractId}/terms-update/request`

**Request**:
```json
{
  "weeklyLimit": 40,
  "hourlyRate": 175,
  "effectiveDate": "2026-01-01"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "673d3c4d5e6f7a8b9c0d1e2f",
    "pendingTermsUpdate": {
      "weeklyLimit": 40,
      "hourlyRate": 175,
      "effectiveDate": "2026-01-01",
      "requestedDate": "2025-12-15T10:00:00.000Z",
      "requestedBy": "expert123",
      "status": "pending"
    },
    ...
  },
  "message": "Terms update requested successfully"
}
```

**Other Party Approves**:

**Endpoint**: `POST /api/v1/contracts/{contractId}/terms-update/apply`

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "673d3c4d5e6f7a8b9c0d1e2f",
    "hourlyProposedPrice": 175,
    "weeklyLimit": 40,
    "pendingTermsUpdate": {
      "status": "applied",
      "appliedDate": "2025-12-16T14:00:00.000Z",
      ...
    },
    ...
  },
  "message": "Terms update applied successfully"
}
```

---

## Complete Examples

### Example 1: Fixed Price Job (Design Project)

```
1. Client creates job (DRAFT → ACTIVE)
   POST /api/v1/jobs

2. Expert submits proposal with 3 milestones
   POST /api/v1/proposals

3. Client accepts proposal → Creates contract
   POST /api/v1/contracts

4. Contract starts (PENDING → ACTIVE)
   PATCH /api/v1/contracts/{id}

5. Expert works on Milestone 1

6. Expert submits work for Milestone 1
   POST /api/v1/milestones/{id}/submit-work

7. Client reviews and approves → Payment processed
   POST /api/v1/milestones/{id}/approve

8. Repeat steps 5-7 for Milestones 2 and 3

9. All milestones completed → Contract completed
   PATCH /api/v1/contracts/{id} (status: completed)
```

### Example 2: Hourly Job (Consulting Work)

```
1. Client creates job (DRAFT → ACTIVE)
   POST /api/v1/jobs

2. Expert submits hourly proposal
   POST /api/v1/proposals
   (hourlyProposedPrice: 150, workingHours estimate: 80)

3. Client accepts → Creates hourly contract
   POST /api/v1/contracts
   (weeklyLimit: 40 hours)

4. Contract starts (PENDING → ACTIVE)
   PATCH /api/v1/contracts/{id}

5. Week 1: Expert logs time daily
   Mon: POST /api/v1/timelogs (8 hours)
   Tue: POST /api/v1/timelogs (7.5 hours)
   Wed: POST /api/v1/timelogs (8 hours)
   Thu: POST /api/v1/timelogs (6 hours)
   Fri: POST /api/v1/timelogs (8 hours)

6. Expert submits all timelogs
   POST /api/v1/timelogs/{id}/submit (for each entry)

7. Client reviews weekly summary
   GET /api/v1/timelogs/weekly-summary
   (totalHours: 37.5, totalAmount: 5625)

8. Client approves all timelogs → Payment processed
   POST /api/v1/timelogs/{id}/approve (for each entry)

9. Repeat steps 5-8 for subsequent weeks

10. After 3 months, expert requests rate increase
    POST /api/v1/contracts/{id}/terms-update/request
    (hourlyRate: 175)

11. Client approves rate change
    POST /api/v1/contracts/{id}/terms-update/apply

12. Contract continues with new rate

13. Work completed → Contract completed
    PATCH /api/v1/contracts/{id} (status: completed)
```

---

## Status Transitions

### Job Status Flow
```
DRAFT → ACTIVE → IN_PROGRESS → COMPLETED
                              ↘ CANCELLED
                              ↘ EXPIRED
```

### Proposal Status Flow
```
PENDING → ACCEPTED (creates Contract)
        ↘ REJECTED
        ↘ WITHDRAWN (by expert)
```

### Contract Status Flow
```
PENDING → ACTIVE → COMPLETED
                 ↘ CANCELLED
                 ↘ PAUSED → ACTIVE
```

### Milestone Status Flow
```
ACTIVE → WORK_SUBMITTED → APPROVED → COMPLETED
                        ↘ CANCELLED
```

### Timelog Status Flow
```
DRAFT → SUBMITTED → APPROVED → PAID
                  ↘ REJECTED (expert can create new entry)
```

---

## Error Scenarios

### Duplicate Proposal
```json
// POST /api/v1/proposals
{
  "success": false,
  "error": {
    "code": "PROPOSAL_CREATE_ERROR",
    "message": "You have already submitted a proposal for this job"
  }
}
```

### Weekly Limit Exceeded
```json
// POST /api/v1/timelogs/{id}/submit
{
  "success": false,
  "error": {
    "code": "TIMELOG_SUBMIT_ERROR",
    "message": "Weekly limit exceeded: 42.5/40 hours"
  }
}
```

### Duplicate Timelog Entry
```json
// POST /api/v1/timelogs
{
  "success": false,
  "error": {
    "code": "TIMELOG_CREATE_ERROR",
    "message": "A timelog entry already exists for this date"
  }
}
```

### Invalid Status Transition
```json
// POST /api/v1/milestones/{id}/submit-work
{
  "success": false,
  "error": {
    "code": "MILESTONE_SUBMIT_ERROR",
    "message": "Work can only be submitted for active milestones"
  }
}
```

---

## Best Practices

### For Clients

1. **Clear Job Descriptions**: Include detailed requirements to attract quality proposals
2. **Set Realistic Budgets**: Research market rates for better proposal quality
3. **Review Proposals Thoroughly**: Check expert profiles, portfolios, and past work
4. **Timely Reviews**: Approve/reject milestones and timelogs promptly to maintain momentum
5. **Communication**: Provide clear feedback when rejecting work

### For Experts

1. **Detailed Proposals**: Include portfolio samples and clear timeline estimates
2. **Realistic Pricing**: Price competitively but fairly for your expertise
3. **Break Down Milestones**: Create specific, measurable deliverables for fixed projects
4. **Daily Time Logging**: Log hours immediately for accuracy (hourly contracts)
5. **Clear Work Descriptions**: Document what was accomplished clearly
6. **Meet Deadlines**: Stay within weekly limits and milestone due dates

---

## Payment Integration Notes

### Stripe Integration Points

1. **Contract Creation**: Client provides Stripe customer ID, account ID, payment method
2. **Milestone Approval**: Client creates payment intent, provides ID to approval endpoint
3. **Timelog Approval**: Client creates payment intent, provides ID to approval endpoint
4. **Payment Completion**: Backend updates status to `completed`/`paid` after Stripe webhook confirmation

### Payment Workflow

```
1. Work Submitted/Approved
2. Client calls Stripe API → Creates Payment Intent
3. Stripe processes payment
4. Client calls Mereka API with paymentIntentId
5. Mereka updates milestone/timelog status
6. Stripe webhook confirms payment
7. Mereka marks as completed/paid
```

---

## Related Documentation

- [Job Model](../models/JOB.md)
- [JobProposal Model](../models/JOB-PROPOSAL.md)
- [Contract Model](../models/CONTRACT.md)
- [Milestone Model](../models/MILESTONE.md)
- [TimelogEntry Model](../models/TIMELOG-ENTRY.md)

---

**Last Updated**: 2025-11-20
