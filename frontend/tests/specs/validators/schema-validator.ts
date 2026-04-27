import type { TestSchema } from '../contracts/shared';

export interface SchemaValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateSchema(schema: TestSchema, value: Record<string, unknown>): SchemaValidationResult {
  const errors: string[] = [];
  const required = schema.required || [];

  for (const field of required) {
    if (value[field] === undefined || value[field] === null || value[field] === '') {
      errors.push(`${field} is required`);
    }
  }

  for (const [key, property] of Object.entries(schema.properties)) {
    if (value[key] === undefined || value[key] === null) continue;
    const valueType = Array.isArray(value[key]) ? 'array' : typeof value[key];
    if (property.type !== valueType && !(property.type === 'array' && Array.isArray(value[key]))) {
      errors.push(`${key} should be ${property.type}`);
    }
  }

  return { valid: errors.length === 0, errors };
}
