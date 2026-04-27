const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..', '..', '..', '..');
const specsRoot = path.resolve(projectRoot, 'tests', 'specs', 'bdd');
const tsConfigPath = path.join(specsRoot, 'tsconfig.json');

require('ts-node').register({
  project: tsConfigPath,
  transpileOnly: true,
});

module.exports = {
  default: {
    paths: [path.join(specsRoot, 'features', '**', '*.feature')],
    require: [
      path.join(specsRoot, 'integration', 'playwright-bridge.ts'),
      path.join(specsRoot, 'step-definitions', '**', '*.ts'),
    ],
    format: ['progress', 'json:../../artifacts/test-results/cucumber-results.json'],
    publishQuiet: true,
  },
};
