import type { TestDataContract } from '../shared';

export interface JobCreationContract {
  flow: FlowStep[];
  data: TestDataContract<JobCreationData>;
  outcomes: FlowOutcome[];
  validations: ValidationContract[];
}

export interface JobCreationData {
  title: string;
  category: string;
  serviceType: string;
  employmentType: string;
  location: string;
  expertLevel: string;
}

export interface FlowStep {
  stepId: string;
  stepName: string;
  url: string;
  required: boolean;
  actions: ActionContract[];
  assertions: AssertionContract[];
}

export interface ActionContract {
  type: 'click' | 'fill' | 'select' | 'upload' | 'navigate';
  selector: string;
  value?: unknown;
  waitFor?: string;
}

export interface AssertionContract {
  type: 'url' | 'visible' | 'text' | 'count' | 'attribute';
  selector?: string;
  expected: unknown;
  message: string;
}

export interface FlowOutcome {
  name: string;
  description: string;
}

export interface ValidationContract {
  field: string;
  rule: string;
  message: string;
}
