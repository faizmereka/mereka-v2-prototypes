# QA Testing Agents, Skills & Commands Usage Guide

Complete guide to using QA testing agents, skills, and commands in frontend-workspace-v2.

## Table of Contents

1. [Overview](#overview)
2. [Test Types](#test-types)
3. [QA Agents](#qa-agents)
4. [QA Skills](#qa-skills)
5. [QA Commands](#qa-commands)
6. [Examples](#examples)
7. [Best Practices](#best-practices)

---

## Overview

Frontend-workspace-v2 uses QA-specific agents, skills, and commands to automate E2E test generation, execution, and maintenance. These tools complement existing dev-focused agents without conflicts.

**Key Distinction**:
- **Dev Agents**: Create Angular components/services (development)
- **QA Agents**: Create Playwright E2E tests (user journey validation)

---

## Test Types

### Unit Tests (Dev)
- **Framework**: Karma/Vitest
- **Location**: `src/**/*.spec.ts`
- **Execution**: In-process
- **Purpose**: Component testing
- **Speed**: Fast
- **Command**: `/test`

### E2E Tests (QA)
- **Framework**: Playwright
- **Location**: `tests/e2e-test/tests/`
- **Execution**: Browser automation
- **Purpose**: User journey testing
- **Speed**: Slower
- **Command**: `/qa-e2e-run`

---

## QA Agents

Agents are **automatically activated** when you mention specific keywords.

### How Agents Work

Agents monitor your conversation for trigger keywords. When detected, they automatically activate and assist with the task.

**Example**:
```
You: "Create an e2e test for the login flow"
→ qa-e2e-test-generator agent activates automatically
```

### Available QA Agents

#### 1. qa-e2e-test-generator

**Purpose**: Generate Playwright E2E test files for frontend features

**Triggers**:
- "qa e2e test", "e2e test", "frontend qa test"
- "create e2e test", "generate e2e test"
- "playwright e2e test", "qa e2e test for"

**Example Usage**:
```
You: "Create an e2e test for the login flow"
Agent: Generates tests/e2e-test/tests/auth/auth-login.spec.ts
```

**What It Does**:
- Creates test files in `tests/e2e-test/tests/`
- Creates Page Object Model classes
- Uses test fixtures
- Follows E2E test patterns
- Handles multiple frontend apps

---

#### 2. qa-e2e-test-runner

**Purpose**: Execute E2E tests and handle test execution

**Triggers**:
- "run e2e test", "execute e2e test", "e2e test run"
- "test e2e", "playwright e2e test"
- "e2e test [feature]"

**Example Usage**:
```
You: "Run e2e tests for authentication"
Agent: Executes npx playwright test --config=tests/e2e-test/playwright.config.ts tests/e2e-test/tests/auth/
```

**What It Does**:
- Runs E2E tests via Playwright
- Handles environment variables
- Generates Playwright reports
- Helps debug failures

---

#### 3. qa-e2e-coverage

**Purpose**: Analyze E2E test coverage and identify gaps

**Triggers**:
- "e2e test coverage", "e2e coverage", "qa e2e coverage"
- "analyze e2e tests", "e2e test analysis"

**Example Usage**:
```
You: "Analyze e2e test coverage for authentication"
Agent: Analyzes coverage and identifies gaps
```

**What It Does**:
- Analyzes E2E test coverage
- Compares with unit tests
- Identifies missing E2E tests
- Provides recommendations

---

## QA Skills

Skills are **manually invoked** using `@skill-name`.

### How Skills Work

Skills require explicit invocation with the `@` symbol followed by the skill name.

**Example**:
```
You: "@qa-e2e-coverage-analyzer analyze authentication coverage"
Skill: Analyzes authentication E2E test coverage
```

### Available QA Skills

#### 1. @qa-e2e-coverage-analyzer

**Purpose**: Analyze E2E test coverage by feature and app

**When to Use**:
- Before releases
- When reviewing E2E test coverage
- Identifying missing E2E tests

**Example Usage**:
```
@qa-e2e-coverage-analyzer

Analyze E2E test coverage for authentication and experience features.
Compare with unit tests and identify high-priority gaps.
```

**Output**:
- Coverage by feature
- Coverage by app
- Missing E2E tests
- Comparison with unit tests
- Priority recommendations

---

#### 2. @qa-e2e-test-maintainer

**Purpose**: Maintain and update E2E tests

**When to Use**:
- When UI changes break tests
- Updating selectors
- Fixing broken E2E tests
- Refactoring E2E tests

**Example Usage**:
```
@qa-e2e-test-maintainer

Update selectors in tests/e2e-test/tests/auth/auth-login.spec.ts.
The login button changed from "Sign In" to "Log In".
Also update the page object accordingly.
```

**Output**:
- Updated test files
- Fixed selectors
- Improved test stability

---

#### 3. @qa-page-object-generator

**Purpose**: Generate Page Object Model classes for E2E tests

**When to Use**:
- Creating new page objects
- Refactoring existing page objects
- Extracting selectors from tests

**Example Usage**:
```
@qa-page-object-generator

Create a page object for the booking page.
Extract all selectors and create reusable methods.
```

**Output**:
- Page Object Model classes
- Proper selector organization
- Reusable page methods

---

## QA Commands

Commands are **invoked with slash notation** `/command-name`.

### How Commands Work

Commands are invoked by typing `/` followed by the command name, optionally with parameters.

**Example**:
```
You: "/qa-e2e-generate login"
Command: Generates E2E test file
```

### Available QA Commands

#### 1. /qa-e2e-generate

**Purpose**: Generate E2E test for specific feature

**Usage**: `/qa-e2e-generate <feature>`

**Examples**:
```
/qa-e2e-generate login
/qa-e2e-generate registration
/qa-e2e-generate booking
```

**What It Does**:
- Identifies feature
- Generates Playwright E2E test file
- Creates Page Object Model if needed
- Includes test fixtures
- Follows E2E patterns

---

#### 2. /qa-e2e-run

**Purpose**: Run E2E tests

**Usage**: `/qa-e2e-run [feature]`

**Examples**:
```
/qa-e2e-run              # Run all E2E tests
/qa-e2e-run auth         # Run authentication tests
/qa-e2e-run experience   # Run experience tests
```

**What It Does**:
- Executes E2E tests
- Handles environment setup
- Generates reports
- Handles failures

---

#### 3. /qa-e2e-coverage

**Purpose**: Analyze E2E test coverage

**Usage**: `/qa-e2e-coverage [feature]`

**Examples**:
```
/qa-e2e-coverage              # Analyze all features
/qa-e2e-coverage auth         # Analyze authentication
/qa-e2e-coverage experience   # Analyze experience
```

**What It Does**:
- Analyzes coverage
- Identifies gaps
- Provides recommendations
- Compares coverage across apps

---

## Examples

### Example 1: Creating a New E2E Test

**Scenario**: You need to create E2E tests for a new "booking" feature.

**Step 1**: Generate E2E test
```
/qa-e2e-generate booking
```
OR
```
Create an e2e test for the booking flow
```

**Step 2**: Review generated test
- File created: `tests/e2e-test/tests/booking/booking-flow.spec.ts`
- Page object created: `tests/e2e-test/fixtures/booking-page.ts`
- Includes proper structure

**Step 3**: Run and verify
```
/qa-e2e-run booking
```

**Step 4**: Debug if needed
```
Run e2e tests for booking in debug mode
```

---

### Example 2: Running E2E Tests

**Scenario**: You want to run E2E tests before a release.

**Step 1**: Run all tests
```
/qa-e2e-run
```

**Step 2**: Run specific feature
```
/qa-e2e-run auth
```

**Step 3**: Run against staging
```
FRONTEND_URL=https://v2-staging.mereka.io npx playwright test --config=tests/e2e-test/playwright.config.ts
```

**Step 4**: View reports
```
npx playwright show-report
```

---

### Example 3: Analyzing Coverage

**Scenario**: You want to know E2E test coverage before a release.

**Step 1**: Analyze coverage
```
@qa-e2e-coverage-analyzer

Analyze E2E test coverage for all features.
Compare with unit tests and identify high-priority gaps.
```

**Step 2**: Review report
- Coverage percentages by feature
- Coverage by app
- Missing tests identified
- Priority recommendations

**Step 3**: Generate missing tests
```
/qa-e2e-generate [missing-feature]
```

---

### Example 4: Maintaining Tests After UI Changes

**Scenario**: UI changed and E2E tests are failing.

**Step 1**: Analyze failures
```
/qa-e2e-run auth
```

**Step 2**: Fix selectors
```
@qa-e2e-test-maintainer

Update tests/e2e-test/tests/auth/auth-login.spec.ts.
The login button selector changed. Update all references.
Also update the page object.
```

**Step 3**: Verify fixes
```
/qa-e2e-run auth
```

---

### Example 5: Creating Page Objects

**Scenario**: You want to refactor tests to use page objects.

**Step 1**: Generate page object
```
@qa-page-object-generator

Create a page object for the booking page.
Include methods for selecting date, time, and submitting.
```

**Step 2**: Review generated page object
- File created: `tests/e2e-test/fixtures/booking-page.ts`
- Includes all selectors
- Has reusable methods

**Step 3**: Update tests to use page object
```
@qa-e2e-test-maintainer

Refactor tests/e2e-test/tests/booking/booking-flow.spec.ts to use the BookingPage page object.
```

---

## Best Practices

### Using QA Agents

1. **Be Specific**: Mention the feature or flow clearly
   ```
   ✅ "Create an e2e test for login flow"
   ❌ "Create a test"
   ```

2. **Use E2E Keywords**: Include "e2e test" to trigger agents
   ```
   ✅ "I need to create an e2e test for..."
   ❌ "I need to create a test for..."
   ```

3. **Provide Context**: Give details about what to test
   ```
   ✅ "Create an e2e test for login that tests valid credentials, 
       invalid credentials, and password reset"
   ❌ "Create a login test"
   ```

### Using QA Skills

1. **Be Clear About Goals**: Specify what you want to analyze
   ```
   ✅ "@qa-e2e-coverage-analyzer analyze authentication coverage 
       and identify missing tests"
   ❌ "@qa-e2e-coverage-analyzer"
   ```

2. **Provide Context**: Include relevant information
   ```
   ✅ "@qa-e2e-test-maintainer update tests/auth/auth-login.spec.ts. 
       The login button changed from 'Sign In' to 'Log In'"
   ❌ "@qa-e2e-test-maintainer fix login test"
   ```

### Using QA Commands

1. **Use Correct Syntax**: Follow `/command-name [parameters]` format
   ```
   ✅ "/qa-e2e-generate login"
   ❌ "/qa e2e generate login"
   ```

2. **Provide Parameters**: Include required parameters
   ```
   ✅ "/qa-e2e-generate login"
   ❌ "/qa-e2e-generate"
   ```

### General Best Practices

1. **Start with Commands**: Use commands for quick tasks
   ```
   /qa-e2e-generate login
   ```

2. **Use Agents for Complex Tasks**: Let agents handle multi-step processes
   ```
   "Create an e2e test for login with authentication and error scenarios"
   ```

3. **Use Skills for Analysis**: Skills are best for analysis and utilities
   ```
   @qa-e2e-coverage-analyzer
   @qa-e2e-test-maintainer
   ```

4. **Review Generated Code**: Always review and adjust generated code
   ```
   ✅ Generate → Review → Adjust → Test
   ❌ Generate → Use directly
   ```

5. **Follow Project Patterns**: Generated code should follow project patterns
   ```
   ✅ Uses Page Object Model
   ✅ Uses semantic selectors
   ✅ Includes proper waits
   ```

6. **Test After Generation**: Always run tests after generation
   ```
   /qa-e2e-run [feature]
   ```

---

## Quick Reference

### Agent Triggers

| Agent | Trigger Keywords |
|-------|-----------------|
| qa-e2e-test-generator | "qa e2e test", "e2e test", "frontend qa test" |
| qa-e2e-test-runner | "run e2e test", "execute e2e test", "e2e test run" |
| qa-e2e-coverage | "e2e test coverage", "e2e coverage", "qa e2e coverage" |

### Skill Invocations

| Skill | Usage |
|-------|-------|
| @qa-e2e-coverage-analyzer | Analyze E2E test coverage |
| @qa-e2e-test-maintainer | Maintain and update E2E tests |
| @qa-page-object-generator | Generate Page Object Model classes |

### Command Syntax

| Command | Syntax | Example |
|---------|--------|---------|
| /qa-e2e-generate | `/qa-e2e-generate <feature>` | `/qa-e2e-generate login` |
| /qa-e2e-run | `/qa-e2e-run [feature]` | `/qa-e2e-run auth` |
| /qa-e2e-coverage | `/qa-e2e-coverage [feature]` | `/qa-e2e-coverage auth` |

---

## Additional Resources

- **README**: `.claude/README.md` - Quick reference guide
- **E2E Test Patterns**: `.claude/context/e2e-test-patterns.md` - E2E test patterns
- **E2E Tests**: `tests/e2e-test/README.md` - E2E test documentation
- **Agent Details**: `.claude/agents/` - Individual agent documentation
- **Skill Details**: `.claude/skills/` - Individual skill documentation
- **Command Details**: `.claude/commands/` - Individual command documentation

---

_Last Updated: January 2025_
