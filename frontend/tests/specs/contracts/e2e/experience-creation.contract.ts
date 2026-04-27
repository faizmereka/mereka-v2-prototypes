import type { TestDataContract } from '../shared';

export interface ExperienceCreationContract {
  flow: FlowStep[];
  data: TestDataContract<ExperienceCreationData>;
  outcomes: FlowOutcome[];
  validations: ValidationContract[];
}

export interface ExperienceCreationData {
  title: string;
  slug: string;
  category?: string;
  topics?: string[];
  type?: 'Physical' | 'Virtual' | 'Hybrid';
  location?: string;
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
