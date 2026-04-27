import type { FlowStep } from '../contracts/e2e/experience-creation.contract';

export interface GeneratedTest {
  name: string;
  steps: FlowStep[];
}

export function generateE2eTests(flowSteps: FlowStep[], name: string): GeneratedTest {
  return {
    name,
    steps: flowSteps,
  };
}
