import path from 'node:path';

const projectRoot = path.resolve(__dirname, '..', '..', '..', '..');
const specsRoot = path.resolve(projectRoot, 'tests', 'specs', 'bdd');

const config = {
  default: {
    paths: [path.join(specsRoot, 'features', '**', '*.feature')],
    require: [
      path.join(specsRoot, 'integration', 'playwright-bridge.ts'),
      path.join(specsRoot, 'step-definitions', '**', '*.ts'),
    ],
    requireModule: ['ts-node/register'],
    format: ['progress', 'json:../../artifacts/test-results/cucumber-results.json'],
    publishQuiet: true,
  },
};

export default config;
