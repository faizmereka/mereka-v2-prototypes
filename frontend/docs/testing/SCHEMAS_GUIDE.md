# Schemas Guide

## Purpose

Schemas define the structure of test data used by specs and tests. They provide a consistent model for valid and invalid inputs.

## Structure

```
tests/specs/schemas/
├── e2e/
├── api/
└── validation/
```

## Usage

- Schemas should be referenced by contracts in `tests/specs/contracts/`.
- Tests can use schema-based test data factories to generate inputs.

## Recommended Conventions

- Provide example data alongside schema definitions.
- Separate positive and negative examples.
