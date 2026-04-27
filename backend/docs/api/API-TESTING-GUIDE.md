# API Testing Guide

**Purpose**: Complete guide for testing all job/proposal/contract/milestone/timelog APIs
**Last Updated**: 2025-11-20

---

## Prerequisites

### 1. MongoDB Running

The server and integration tests require MongoDB to be running:

```bash
# Check if MongoDB is running
lsof -i :27017

# If not running, start MongoDB (macOS with Homebrew)
brew services start mongodb-community

# Or using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### 2. Environment Setup

Ensure your `.env` file is configured:

```env
MONGO_URI=mongodb://localhost:27017/mereka-dev
PORT=8000
NODE_ENV=development
```

---

## Running Integration Tests

### All Tests

```bash
npm test
```

### Specific Test Suites

```bash
# Proposal API tests
npm test -- tests/integration/proposal.routes.test.ts

# Contract API tests
npm test -- tests/integration/contract.routes.test.ts

# Milestone API tests
npm test -- tests/integration/milestone.routes.test.ts

# Timelog API tests
npm test -- tests/integration/timelog.routes.test.ts
```

### Test Coverage

```bash
npm run test:coverage
```

---

## Testing with curl

### 1. Start Development Server

```bash
npm run dev
```

Wait for the server to start and connect to MongoDB:
```
🚀 Server listening at http://0.0.0.0:8000
✅ Connected to MongoDB
```

### 2. Test API Endpoints

#### A. Create Job

```bash
curl -X POST http://localhost:8000/api/v1/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "jobTitle": "Senior UI/UX Designer",
    "jobDescription": "<p>We need an experienced UI/UX designer for our mobile app redesign project</p>",
    "employmentType": "freelance",
    "status": "ACTIVE",
    "serviceCategory": {
      "category": "Design",
      "serviceType": "UI/UX Design"
    },
    "expertLevel": "senior",
    "jobLocation": "remote",
    "preferredLocation": ["Malaysia", "Singapore"],
    "jobBudget": {
      "pricingType": "fixed",
      "fromAmount": 8000,
      "upToAmount": 12000
    },
    "jobCurrency": "MYR",
    "jobStartDate": "2025-12-01",
    "jobEndDate": "3 months",
    "jobSkills": ["Figma", "Adobe XD", "User Research", "Prototyping"],
    "accessMode": "PUBLIC",
    "name": "John Doe",
    "email": "john@techcorp.com",
    "phoneNumber": "+60123456789",
    "organizationName": "TechCorp Malaysia",
    "aboutOrganization": "Leading technology company in Malaysia",
    "hubId": "hub_techcorp_001",
    "organizationImage": "https://example.com/logo.png"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "_id": "673d1a2b3c4d5e6f7a8b9c0d",
    "jobTitle": "Senior UI/UX Designer",
    "status": "ACTIVE",
    ...
  },
  "message": "Job created successfully"
}
```

**Save the `_id` from the response as `JOB_ID`**

---

#### B. Create Proposal (Fixed Price)

```bash
JOB_ID="673d1a2b3c4d5e6f7a8b9c0d"  # Replace with actual job ID

curl -X POST http://localhost:8000/api/v1/proposals \
  -H "Content-Type: application/json" \
  -d '{
    "jobId": "'$JOB_ID'",
    "proposalDetails": "I am a senior UI/UX designer with 8+ years of experience in mobile app design. I have successfully delivered 30+ mobile applications with excellent user feedback. I will deliver complete wireframes, high-fidelity mockups, interactive prototypes, and a design system.",
    "priceType": "fixed",
    "proposedPrice": 10000,
    "selectedCurrency": "MYR",
    "files": ["https://example.com/portfolio.pdf", "https://example.com/case-studies.pdf"],
    "milestones": [
      {
        "taskName": "User Research & Wireframes",
        "taskDescription": "Conduct user research with 20 participants and create low-fidelity wireframes for all key screens",
        "amount": 3000,
        "dueDate": "2025-12-15T00:00:00.000Z"
      },
      {
        "taskName": "High-Fidelity Design & Prototyping",
        "taskDescription": "Create polished high-fidelity designs and interactive prototypes",
        "amount": 4500,
        "dueDate": "2025-12-31T00:00:00.000Z"
      },
      {
        "taskName": "Design System & Documentation",
        "taskDescription": "Build complete design system with documentation and handoff files",
        "amount": 2500,
        "dueDate": "2026-01-15T00:00:00.000Z"
      }
    ]
  }'
```

**Save the `_id` from the response as `PROPOSAL_ID`**

---

#### C. Get All Proposals for a Job

```bash
curl http://localhost:8000/api/v1/proposals?jobId=$JOB_ID
```

---

#### D. Create Contract (Accept Proposal)

```bash
PROPOSAL_ID="673d2b3c4d5e6f7a8b9c0d1e"  # Replace with actual proposal ID

curl -X POST http://localhost:8000/api/v1/contracts \
  -H "Content-Type: application/json" \
  -d '{
    "jobId": "'$JOB_ID'",
    "jobProposalId": "'$PROPOSAL_ID'",
    "hubId": "hub_techcorp_001",
    "contractTitle": "UI/UX Design for Mobile App",
    "contractDescription": "Complete UI/UX design including user research, wireframes, mockups, prototyping, and design system",
    "contractUploads": ["https://example.com/contract.pdf"],
    "priceType": "fixed",
    "proposedPrice": 10000,
    "hasMilestones": true,
    "selectedCurrency": "MYR",
    "startDate": "2025-12-01T00:00:00.000Z",
    "endDate": "2026-01-15T00:00:00.000Z",
    "asssignedExpertId": "expert_123",
    "stripeCustomerId": "cus_techcorp123",
    "stripeAccount": "acct_expert123",
    "paymentMethodId": "pm_card123"
  }'
```

**Save the `_id` from the response as `CONTRACT_ID`**

---

#### E. Activate Contract

```bash
CONTRACT_ID="673d3c4d5e6f7a8b9c0d1e2f"  # Replace with actual contract ID

curl -X PATCH http://localhost:8000/api/v1/contracts/$CONTRACT_ID \
  -H "Content-Type: application/json" \
  -d '{"status": "active"}'
```

---

#### F. Get Milestones for Contract

```bash
curl http://localhost:8000/api/v1/milestones?contractId=$CONTRACT_ID
```

**Save a milestone `_id` as `MILESTONE_ID`**

---

#### G. Submit Work for Milestone

```bash
MILESTONE_ID="673d4d5e6f7a8b9c0d1e2f3a"  # Replace with actual milestone ID

curl -X POST http://localhost:8000/api/v1/milestones/$MILESTONE_ID/submit-work \
  -H "Content-Type: application/json" \
  -d '{
    "workLogDescription": "Completed user research with 20 participants. Key findings: Users prefer larger buttons, need better onboarding flow, want dark mode option. Created 25 low-fidelity wireframes covering all main user flows including authentication, dashboard, and settings.",
    "workLogFilesUrl": [
      "https://example.com/wireframes.pdf",
      "https://example.com/user-research-report.pdf",
      "https://example.com/user-personas.pdf"
    ]
  }'
```

---

#### H. Approve Milestone

```bash
curl -X POST http://localhost:8000/api/v1/milestones/$MILESTONE_ID/approve \
  -H "Content-Type: application/json" \
  -d '{
    "paymentIntentId": "pi_stripe_payment_123"
  }'
```

---

### Hourly Contract Workflow

#### I. Create Hourly Proposal

```bash
curl -X POST http://localhost:8000/api/v1/proposals \
  -H "Content-Type: application/json" \
  -d '{
    "jobId": "'$JOB_ID'",
    "proposalDetails": "I can work on this project at an hourly rate. I am available 40 hours per week and estimate 150-200 total hours.",
    "priceType": "hourly",
    "hourlyProposedPrice": 175,
    "workingHours": 150,
    "selectedCurrency": "MYR",
    "files": []
  }'
```

#### J. Create Hourly Contract

```bash
HOURLY_PROPOSAL_ID="673d2b3c4d5e6f7a8b9c0d2f"  # Replace with hourly proposal ID

curl -X POST http://localhost:8000/api/v1/contracts \
  -H "Content-Type: application/json" \
  -d '{
    "jobId": "'$JOB_ID'",
    "jobProposalId": "'$HOURLY_PROPOSAL_ID'",
    "hubId": "hub_techcorp_001",
    "contractTitle": "Hourly Design Services",
    "contractDescription": "Hourly UI/UX design services",
    "priceType": "hourly",
    "hourlyProposedPrice": 175,
    "weeklyLimit": 40,
    "selectedCurrency": "MYR",
    "startDate": "2025-12-01T00:00:00.000Z",
    "asssignedExpertId": "expert_456",
    "stripeCustomerId": "cus_techcorp456",
    "stripeAccount": "acct_expert456",
    "paymentMethodId": "pm_card456"
  }'
```

**Save as `HOURLY_CONTRACT_ID`**

#### K. Create Timelog Entry

```bash
HOURLY_CONTRACT_ID="673d3c4d5e6f7a8b9c0d1e3f"  # Replace with hourly contract ID

curl -X POST http://localhost:8000/api/v1/timelogs \
  -H "Content-Type: application/json" \
  -d '{
    "contractId": "'$HOURLY_CONTRACT_ID'",
    "workDate": "2025-12-01T00:00:00.000Z",
    "startTime": "09:00",
    "endTime": "17:30",
    "breakDuration": 1,
    "description": "Worked on user research analysis, created initial wireframes for authentication flow, and started dashboard design. Conducted 5 user interviews and documented findings.",
    "tasks": [
      "User research analysis (2 hours)",
      "User interviews (3 hours)",
      "Authentication flow wireframes (1.5 hours)",
      "Dashboard wireframing (1 hour)"
    ]
  }'
```

**Response includes auto-calculated fields:**
```json
{
  "success": true,
  "data": {
    "hoursWorked": 7.5,
    "billableAmount": 1312.5,
    "status": "draft",
    ...
  }
}
```

**Save as `TIMELOG_ID`**

#### L. Get Weekly Summary

```bash
curl "http://localhost:8000/api/v1/timelogs/weekly-summary?contractId=$HOURLY_CONTRACT_ID&year=2025&weekNumber=49"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "contractId": "...",
    "year": 2025,
    "weekNumber": 49,
    "totalHours": 37.5,
    "totalAmount": 6562.5,
    "weeklyLimit": 40,
    "isOverLimit": false,
    "remainingHours": 2.5,
    "entriesCount": 5,
    "byStatus": {
      "draft": 2,
      "submitted": 3,
      "approved": 0,
      "rejected": 0,
      "paid": 0
    },
    "entries": [...]
  }
}
```

#### M. Submit Timelog

```bash
TIMELOG_ID="673d5e6f7a8b9c0d1e2f3a4b"  # Replace with timelog ID

curl -X POST http://localhost:8000/api/v1/timelogs/$TIMELOG_ID/submit
```

#### N. Approve Timelog

```bash
curl -X POST http://localhost:8000/api/v1/timelogs/$TIMELOG_ID/approve \
  -H "Content-Type: application/json" \
  -d '{
    "paymentIntentId": "pi_stripe_timelog_123"
  }'
```

#### O. Reject Timelog

```bash
curl -X POST http://localhost:8000/api/v1/timelogs/$TIMELOG_ID/reject \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Hours seem excessive for the tasks described. Please provide more detailed breakdown and resubmit."
  }'
```

---

## Complete Test Scenarios

### Scenario 1: Fixed Price Project with Milestones

```bash
# 1. Create job
# 2. Expert submits proposal with 3 milestones
# 3. Client reviews proposals: GET /api/v1/proposals?jobId=$JOB_ID
# 4. Client accepts proposal → creates contract
# 5. Activate contract: PATCH /api/v1/contracts/$CONTRACT_ID
# 6. View milestones: GET /api/v1/milestones?contractId=$CONTRACT_ID
# 7. Expert submits work for milestone 1
# 8. Client approves milestone 1 → payment
# 9. Repeat 7-8 for milestones 2 and 3
# 10. Complete contract: PATCH /api/v1/contracts/$CONTRACT_ID (status: completed)
```

### Scenario 2: Hourly Contract with Weekly Tracking

```bash
# 1. Create job
# 2. Expert submits hourly proposal
# 3. Client accepts → creates hourly contract
# 4. Activate contract
# 5. Week 1: Expert logs time daily (5 entries)
#    - Monday: 8 hours
#    - Tuesday: 7.5 hours
#    - Wednesday: 8 hours
#    - Thursday: 7 hours
#    - Friday: 7 hours
# 6. Expert submits all entries
# 7. Client reviews weekly summary
# 8. Client approves all entries → payment
# 9. Repeat weeks 2-8
# 10. Complete contract
```

### Scenario 3: Terms Update (Hourly Contract)

```bash
# 1. Active hourly contract exists
# 2. Expert requests rate increase:
curl -X POST http://localhost:8000/api/v1/contracts/$CONTRACT_ID/terms-update/request \
  -H "Content-Type: application/json" \
  -d '{
    "weeklyLimit": 40,
    "hourlyRate": 200,
    "effectiveDate": "2026-01-01T00:00:00.000Z"
  }'

# 3. Client reviews and approves:
curl -X POST http://localhost:8000/api/v1/contracts/$CONTRACT_ID/terms-update/apply

# 4. New rate applies to future timelogs
```

---

## Error Testing

### Test Duplicate Proposal

```bash
# Submit same proposal twice (should get 409)
curl -X POST http://localhost:8000/api/v1/proposals \
  -H "Content-Type: application/json" \
  -d '{ ... same data ... }'
```

### Test Weekly Limit Exceeded

```bash
# Log more than 40 hours in a week
# Last submission should fail with error about exceeding weekly limit
```

### Test Invalid Status Transition

```bash
# Try to submit work for non-active milestone
curl -X POST http://localhost:8000/api/v1/milestones/$MILESTONE_ID/submit-work \
  -H "Content-Type: application/json" \
  -d '{ "workLogDescription": "..." }'
# Should return 400 if milestone is not active
```

---

## Monitoring & Debugging

### Check Server Logs

```bash
# Server logs show all requests and errors
tail -f logs/app.log  # If logging to file

# Or watch console output from `npm run dev`
```

### Database Inspection

```bash
# Connect to MongoDB
mongosh

# Use database
use mereka-dev

# View collections
show collections

# Query data
db.jobs.find().pretty()
db.jobproposals.find().pretty()
db.contracts.find().pretty()
db.milestones.find().pretty()
db.timelogentries.find().pretty()
```

---

## API Documentation

Full API documentation available at:
- Swagger UI: `http://localhost:8000/documentation` (when server is running)
- [Job Workflow Guide](./JOB-WORKFLOW-COMPLETE.md)
- [Model Documentation](../models/)

---

## Troubleshooting

### MongoDB Connection Error

```
Error: connect ECONNREFUSED 127.0.0.1:27017
```

**Solution**: Start MongoDB service
```bash
brew services start mongodb-community
# or
docker run -d -p 27017:27017 mongo:latest
```

### Port Already in Use

```
Error: Port 8000 is already in use
```

**Solution**: Kill existing process or change port
```bash
lsof -ti:8000 | xargs kill -9
# or change PORT in .env
```

### Validation Errors

```
{
  "success": false,
  "statusCode": 400,
  "code": "FST_ERR_VALIDATION"
}
```

**Solution**: Check request payload matches schema requirements

---

## Integration Test Summary

### Test Coverage

| Module | Test File | Test Cases | Coverage |
|--------|-----------|------------|----------|
| Proposals | `proposal.routes.test.ts` | 13 tests | Create, Read, Update, Withdraw, Reject |
| Contracts | `contract.routes.test.ts` | 12 tests | CRUD, Cancel, Pause, Resume, Terms Update |
| Milestones | `milestone.routes.test.ts` | 14 tests | CRUD, Submit Work, Approve, Change Tracking |
| Timelogs | `timelog.routes.test.ts` | 13 tests | CRUD, Submit, Approve, Reject, Weekly Summary |
| **Total** | **4 files** | **52 tests** | **Complete workflow coverage** |

### Running Specific Tests

```bash
# Run only proposal tests
npm test -- tests/integration/proposal.routes.test.ts

# Run in watch mode
npm test -- --watch tests/integration/

# Run with coverage
npm run test:coverage
```

---

**Last Updated**: 2025-11-20
