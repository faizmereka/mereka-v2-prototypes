# BDD Guide

## Purpose

Behavior-Driven Development (BDD) uses Gherkin feature files to define expected behavior in a human-readable format. These features map to step definitions that drive Playwright actions.

## Directory Layout

```
tests/specs/bdd/
├── features/
├── step-definitions/
├── world/
├── integration/
└── config/
```

## Writing Feature Files

- Use clear `Given / When / Then` steps.
- Keep steps reusable across features.
- Use data tables for structured input.
- Tag scenarios for filtering (`@smoke`, `@regression`, `@experience`).

## Running BDD Tests

From the `tests/e2e-test` directory:

```bash
npm run bdd
```

Or from the repo root:

```bash
cd tests/e2e-test && npm run bdd
```

The script uses a JavaScript config file (`cucumber.config.js`) that automatically registers `ts-node` to load TypeScript step definitions.

## Step Definitions

Step definitions are in `tests/specs/bdd/step-definitions/` and reuse existing Playwright helpers from `tests/e2e-test/fixtures/helpers/`.

## Playwright Bridge

`tests/specs/bdd/integration/playwright-bridge.ts` sets up Playwright for each scenario and binds the page to the Cucumber World context.
