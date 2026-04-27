---
title: "<Feature name>"
type: "feature_spec"
status: "draft"   # draft | in_review | approved | implemented | deprecated
owner: "<name>"
vehicle: "<voice_ai | agentic_workflow | talent_platform | api_service | data_pipeline | ml_model>"
last_updated: "<YYYY-MM-DD>"
links:
  related_docs: []
  related_specs: []
---

# Human Summary
## What we’re building
<1-3 paragraphs, plain language.>

## Why it matters
<Outcome, user value, business value.>

## Success looks like
<Measurable success criteria.>

# Agent Contract

## Scope
- In scope:
  - ...
- Out of scope:
  - ...

## Non-goals
- ...

## Assumptions
- ...

## Requirements
Write requirements as bullets using MUST/SHOULD/MAY.
### Functional
- The system MUST ...
- The system SHOULD ...

### Non-functional (NFRs)
- p95 latency MUST be <= ...
- Availability SHOULD be >= ...
- Cost per 1k requests SHOULD be <= ...
- Security: the system MUST ...

## Acceptance Criteria
List verifiable checks (Given/When/Then or bullet assertions).
- [ ] ...
- [ ] ...

## Edge Cases
- ...
- Retry/timeout behavior:
- Idempotency:
- Rate limits:
- Partial failures:

## Observability
- Logs:
- Metrics:
- Alerts:
- Dashboards:

## Rollout & Rollback
- Rollout plan:
- Feature flags:
- Backward compatibility:
- Rollback steps:

## Open Questions
- ...
