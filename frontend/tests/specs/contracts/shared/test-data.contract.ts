export interface TestDataContract<T = unknown> {
  schema: TestSchema;
  validExamples: T[];
  invalidExamples: InvalidExample<T>[];
  validationRules: ValidationRule[];
}

export interface InvalidExample<T> {
  label: string;
  value: T;
  expectedError: string;
}

export interface ValidationRule {
  field: string;
  rule: 'required' | 'format' | 'range' | 'enum' | 'custom';
  value?: unknown;
  message: string;
}

export interface TestSchema {
  type: 'object';
  required?: string[];
  properties: Record<string, TestSchemaProperty>;
}

export interface TestSchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  enum?: string[];
  items?: TestSchemaProperty;
}
