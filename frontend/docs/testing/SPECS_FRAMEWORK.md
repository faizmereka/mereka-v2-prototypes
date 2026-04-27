# Specs-Based Testing Framework

## Overview

Specs are executable contracts that define expected behavior, test data, and outcomes.
Docs describe how to run tests and interpret results. This framework keeps them separate.

## Goals

- Define contracts for E2E flows, API interactions, and component behavior.
- Make expected outcomes explicit and reusable across tests.
- Generate consistent reports and gap analysis after every run.

## Key Concepts

### Specs

- Contracts and schemas under `tests/specs/`.
- Designed to be referenced by tests and tools.

### Docs

- Explanations and guides under `docs/testing/`.
- Not used directly by automated tooling.

## Workflow

1. Define or update a contract in `tests/specs/contracts/`.
2. Update schemas in `tests/specs/schemas/`.
3. Write or update tests to align with the contract.
4. Run E2E tests to generate an honest report in `docs/testing/`.
