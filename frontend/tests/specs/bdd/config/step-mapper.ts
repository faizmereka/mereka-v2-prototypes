export type StepActionType = 'navigate' | 'click' | 'fill' | 'select' | 'assert';

export interface StepMapping {
  step: string;
  action: StepActionType;
  description: string;
}

const mappings: StepMapping[] = [
  { step: 'I navigate to the experience creation flow', action: 'navigate', description: 'Open experience creation flow' },
  { step: 'I navigate to the job creation flow', action: 'navigate', description: 'Open job creation flow' },
  { step: 'I go to the next step', action: 'click', description: 'Proceed to next wizard step' },
  { step: 'I fill the basic info with:', action: 'fill', description: 'Fill experience basic info form' },
  { step: 'I fill the audience info with:', action: 'fill', description: 'Fill experience audience form' },
  { step: 'I fill the booking info with:', action: 'fill', description: 'Fill experience booking form' },
  { step: 'I fill the tickets info with:', action: 'fill', description: 'Fill experience tickets form' },
  { step: 'I fill the page info with:', action: 'fill', description: 'Fill experience page info' },
  { step: 'I fill the details info with:', action: 'fill', description: 'Fill experience details form' },
  { step: 'I fill the job overview with:', action: 'fill', description: 'Fill job overview form' },
  { step: 'I fill the job requirements with:', action: 'fill', description: 'Fill job requirements form' },
  { step: 'I fill the job timeline and budget with:', action: 'fill', description: 'Fill job timeline and budget form' },
  { step: 'I fill the job client details with:', action: 'fill', description: 'Fill job client details form' },
  { step: 'I should see the confirmation page', action: 'assert', description: 'Verify confirmation page' },
  { step: 'I should see the job confirmation page', action: 'assert', description: 'Verify job confirmation page' },
];

export function mapStepToAction(stepText: string): StepMapping | undefined {
  return mappings.find(mapping => stepText.startsWith(mapping.step));
}

export function listStepMappings(): StepMapping[] {
  return [...mappings];
}
