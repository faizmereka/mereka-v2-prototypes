import fs from 'node:fs';
import path from 'node:path';
import { parseFeatures, type ParsedFeature } from './feature-parser';

function toTestName(text: string) {
  return text.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();
}

export function generatePlaywrightSpec(feature: ParsedFeature): string {
  const testBlocks = feature.scenarios
    .map(
      scenario => `
  test('${scenario.title}', async ({ page }) => {
    // TODO: map steps to Playwright actions
    ${scenario.steps
      .map(step => `// ${step.keyword} ${step.text}`)
      .join('\n    ')}
  });
`
    )
    .join('\n');

  return `
import { test } from '@playwright/test';

test.describe('${feature.title}', () => {
${testBlocks}
});
`.trim();
}

export function generateSpecsFromFeatures(featuresRoot: string, outputDir: string) {
  const features = parseFeatures(featuresRoot);
  fs.mkdirSync(outputDir, { recursive: true });

  for (const feature of features) {
    const fileName = `${toTestName(feature.title)}.spec.ts`;
    const outputPath = path.join(outputDir, fileName);
    const content = generatePlaywrightSpec(feature);
    fs.writeFileSync(outputPath, content, 'utf8');
  }
}
