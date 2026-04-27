import fs from 'node:fs';
import path from 'node:path';

export interface ParsedStep {
  keyword: string;
  text: string;
}

export interface ParsedScenario {
  title: string;
  steps: ParsedStep[];
}

export interface ParsedFeature {
  title: string;
  tags: string[];
  scenarios: ParsedScenario[];
  path: string;
}

function listFeatureFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFeatureFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.feature')) {
      files.push(fullPath);
    }
  }
  return files;
}

export function parseFeatureFile(filePath: string): ParsedFeature {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const tags: string[] = [];
  const scenarios: ParsedScenario[] = [];

  let featureTitle = '';
  let currentScenario: ParsedScenario | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('@')) {
      tags.push(...trimmed.split(/\s+/));
      continue;
    }
    if (trimmed.startsWith('Feature:')) {
      featureTitle = trimmed.replace('Feature:', '').trim();
      continue;
    }
    if (trimmed.startsWith('Scenario:') || trimmed.startsWith('Scenario Outline:')) {
      if (currentScenario) scenarios.push(currentScenario);
      currentScenario = {
        title: trimmed.replace('Scenario Outline:', '').replace('Scenario:', '').trim(),
        steps: [],
      };
      continue;
    }
    if (/^(Given|When|Then|And|But)\b/.test(trimmed) && currentScenario) {
      const [keyword, ...rest] = trimmed.split(' ');
      currentScenario.steps.push({
        keyword,
        text: rest.join(' ').trim(),
      });
    }
  }

  if (currentScenario) scenarios.push(currentScenario);

  return {
    title: featureTitle,
    tags,
    scenarios,
    path: filePath,
  };
}

export function parseFeatures(rootDir: string): ParsedFeature[] {
  return listFeatureFiles(rootDir).map(parseFeatureFile);
}
