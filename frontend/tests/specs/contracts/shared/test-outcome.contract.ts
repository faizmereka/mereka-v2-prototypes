export interface TestOutcomeContract {
  success: boolean;
  assertions: AssertionResult[];
  metadata: TestMetadata;
  errors?: TestError[];
}

export interface AssertionResult {
  name: string;
  passed: boolean;
  expected: unknown;
  actual: unknown;
  message?: string;
}

export interface TestMetadata {
  testId: string;
  feature: string;
  scenario: string;
  durationMs: number;
  timestamp: string;
  environment: string;
}

export interface TestError {
  code: string;
  message: string;
  stack?: string;
}
