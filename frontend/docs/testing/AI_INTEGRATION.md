# AI Integration Guide

## Purpose

This BDD layer provides structured, machine-readable specifications that AI tools can parse to understand and generate tests.

## AI-Friendly Assets

- **Feature files**: `tests/specs/bdd/features/`
- **Step mapping**: `tests/specs/bdd/config/step-mapper.ts`
- **Feature parser**: `tests/specs/bdd/ai/feature-parser.ts`
- **Feature-to-test generator**: `tests/specs/bdd/ai/feature-to-test-generator.ts`
- **Contract-to-feature generator**: `tests/specs/bdd/ai/contract-to-feature-generator.ts`

## Common AI Workflows

### 1. Parse Features into JSON

Use `parseFeatures()` to convert Gherkin into structured JSON that can be used by AI tools.

### 2. Generate Playwright Skeletons

Use `generateSpecsFromFeatures()` in `feature-to-test-generator.ts` to create Playwright test skeletons from Gherkin scenarios.

### 3. Generate Features from Contracts

Use `generateExperienceFeature()` and `generateJobFeature()` in `contract-to-feature-generator.ts` to produce baseline Gherkin files from contracts.

## Recommendations

- Keep feature steps consistent across flows.
- Use tags to enable AI filtering (`@smoke`, `@regression`, `@experience`).
- Keep step definitions small and composable for easy AI mapping.
