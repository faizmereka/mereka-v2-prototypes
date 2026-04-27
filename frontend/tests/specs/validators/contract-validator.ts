import type { FlowStep } from '../contracts/e2e/experience-creation.contract';

export interface ContractValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateFlowContract(steps: FlowStep[]): ContractValidationResult {
  const errors: string[] = [];

  steps.forEach((step, index) => {
    if (!step.stepId) errors.push(`Step ${index + 1}: stepId is required`);
    if (!step.stepName) errors.push(`Step ${index + 1}: stepName is required`);
    if (!step.url) errors.push(`Step ${index + 1}: url is required`);
    if (!step.actions?.length) errors.push(`Step ${index + 1}: actions are required`);
    if (!step.assertions?.length) errors.push(`Step ${index + 1}: assertions are required`);
  });

  return { valid: errors.length === 0, errors };
}
