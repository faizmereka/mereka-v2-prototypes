# Outcomes Guide

## Purpose

Outcomes define what success and failure look like for a test run and for each test scenario.

## Outcome Types

- **Success**: Expected UI/API behavior is observed.
- **Failure**: Behavior deviates from contract or assertions fail.
- **Skipped**: Test was intentionally not executed.
- **Flaky**: Passed after one or more retries.

## Usage

Outcomes are captured in reports and referenced by contracts in `tests/specs/contracts/shared/test-outcome.contract.ts`.
