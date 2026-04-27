# Contracts Guide

## Purpose

Contracts define expected behavior, data, and outcomes for a test domain. They act as a single source of truth for how tests should behave.

## Structure

```
tests/specs/contracts/
├── shared/
├── e2e/
├── api/
└── component/
```

## Contract Types

- **Shared**: Common result and test data contracts.
- **E2E**: Multi-step flow definitions.
- **API**: Endpoint request/response contracts.
- **Component**: UI component behavior contracts.

## Best Practices

- Keep contracts minimal but explicit.
- Include expected outcomes and validations.
- Use schema references for test data.
