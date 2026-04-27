import fs from 'node:fs';
import path from 'node:path';
import type { ExperienceCreationContract } from '../../contracts/e2e/experience-creation.contract';
import type { JobCreationContract } from '../../contracts/e2e/job-creation.contract';

function toFeatureTitle(name: string) {
  return name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function generateExperienceFeature(contract: ExperienceCreationContract): string {
  const steps = contract.flow
    .map(step => `    # ${step.stepName} (${step.url})`)
    .join('\n');

  return `
@experience @contract
Feature: ${toFeatureTitle('experience-creation')}
  As a hub owner
  I want to create a platform experience
  So that I can offer services to learners

  Scenario: Contracted experience creation flow
${steps}
`.trim();
}

export function generateJobFeature(contract: JobCreationContract): string {
  const steps = contract.flow
    .map(step => `    # ${step.stepName} (${step.url})`)
    .join('\n');

  return `
@job @contract
Feature: ${toFeatureTitle('job-creation')}
  As a hub owner
  I want to create a job posting
  So that I can hire experts

  Scenario: Contracted job creation flow
${steps}
`.trim();
}

export function writeFeatureFile(featureContent: string, outputPath: string) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, featureContent, 'utf8');
}
