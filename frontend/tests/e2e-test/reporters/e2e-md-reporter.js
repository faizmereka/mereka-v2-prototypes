const fs = require('fs');
const path = require('path');

const NEGATIVE_KEYWORDS = [
  'invalid',
  'error',
  'fail',
  'fails',
  'should not',
  'unauthorized',
  'forbidden',
  'denied',
  'empty',
];

const RISKY_PATTERNS = [
  { label: 'waitForTimeout usage', regex: /waitForTimeout\s*\(/ },
  { label: 'networkidle waits', regex: /networkidle/ },
  { label: 'Date.now usage', regex: /Date\.now\s*\(/ },
  { label: 'Math.random usage', regex: /Math\.random\s*\(/ },
  { label: 'text-based selectors', regex: /getByText\s*\(|locator\(['"]text=|getByLabel\s*\(/ },
];

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function toTimestamp(value) {
  if (value) return value;
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
}

function safeRead(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    return '';
  }
}

function listSpecFiles(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...listSpecFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.spec.ts')) {
      files.push(fullPath);
    }
  }
  return files;
}

function analyzeFileContent(filePath) {
  const content = safeRead(filePath);
  const findings = RISKY_PATTERNS
    .filter(pattern => pattern.regex.test(content))
    .map(pattern => pattern.label);

  return {
    hasBeforeEach: /test\.beforeEach\s*\(/.test(content),
    hasExpect: /expect\s*\(/.test(content),
    usesTestId: /getByTestId\s*\(/.test(content),
    findings,
  };
}

function detectNegativeCoverage(testTitles) {
  return testTitles.some(title =>
    NEGATIVE_KEYWORDS.some(keyword => title.toLowerCase().includes(keyword))
  );
}

class E2eMarkdownReporter {
  constructor(options = {}) {
    this.options = options;
    this.results = new Map();
    this.testFiles = new Set();
    this.startTime = Date.now();
  }

  onBegin(config) {
    this.config = config;
  }

  onTestEnd(test, result) {
    const testKey = test.titlePath().join(' > ');
    const file = test.location?.file || 'unknown';
    this.testFiles.add(file);

    const errors = result.errors && result.errors.length ? result.errors : result.error ? [result.error] : [];

    this.results.set(testKey, {
      title: test.title,
      titlePath: test.titlePath(),
      file,
      status: result.status,
      duration: result.duration,
      retry: result.retry,
      errors: errors.map(error => error.message || String(error)),
    });
  }

  async onEnd() {
    const timestamp = toTimestamp(process.env.REPORT_TIMESTAMP);
    const projectRoot = this.options.projectRoot || path.resolve(__dirname, '..', '..', '..');
    const outputDir = this.options.outputDir || path.resolve(projectRoot, 'docs', 'testing');
    const reportFile = path.join(outputDir, `e2e-report-${timestamp}.md`);

    ensureDir(outputDir);

    const results = Array.from(this.results.values());
    const total = results.length;
    const passed = results.filter(r => r.status === 'passed').length;
    const failed = results.filter(r => ['failed', 'timedOut', 'interrupted'].includes(r.status)).length;
    const skipped = results.filter(r => r.status === 'skipped').length;
    const flaky = results.filter(r => r.retry > 0 && r.status === 'passed').length;
    const duration = results.reduce((sum, r) => sum + (r.duration || 0), 0);

    const slowTests = results
      .filter(r => r.duration > 10000)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);

    const failedTests = results.filter(r => ['failed', 'timedOut', 'interrupted'].includes(r.status));

    const executedFiles = Array.from(this.testFiles).sort();
    const allSpecFiles = listSpecFiles(path.resolve(projectRoot, 'tests', 'e2e-test', 'tests'));
    const missingFiles = allSpecFiles.filter(file => !this.testFiles.has(file));

    const fileAnalysis = executedFiles.map(filePath => ({
      filePath,
      ...analyzeFileContent(filePath),
    }));

    const negativeCoverageByFile = executedFiles.map(filePath => {
      const titles = results
        .filter(r => r.file === filePath)
        .map(r => r.titlePath.join(' > '));
      return {
        filePath,
        hasNegativeCoverage: detectNegativeCoverage(titles),
      };
    });

    const reportLines = [
      `# E2E Test Report - ${timestamp}`,
      '',
      '## Summary (Honest Results)',
      `- Total: ${total}`,
      `- Passed: ${passed}`,
      `- Failed: ${failed}`,
      `- Skipped: ${skipped}`,
      `- Flaky (passed after retry): ${flaky}`,
      `- Total Duration: ${(duration / 1000).toFixed(2)}s`,
      '',
      '## Failures',
      failedTests.length
        ? failedTests
            .map(test => {
              const errorText = test.errors.length ? ` - ${test.errors[0]}` : '';
              return `- ${test.titlePath.join(' > ')}${errorText}`;
            })
            .join('\n')
        : '- No failures',
      '',
      '## Slow Tests (>= 10s)',
      slowTests.length
        ? slowTests
            .map(test => `- ${test.titlePath.join(' > ')} (${(test.duration / 1000).toFixed(2)}s)`)
            .join('\n')
        : '- No slow tests detected',
      '',
      '## Shortcomings, Gaps, and Opportunities',
      '',
      '### Coverage Completeness',
      `- Executed spec files: ${executedFiles.length}`,
      `- Total spec files: ${allSpecFiles.length}`,
      `- Missing spec files in this run: ${missingFiles.length}`,
      missingFiles.length
        ? missingFiles.map(file => `  - ${file}`).join('\n')
        : '  - None',
      '',
      '### Negative Coverage Signals',
      negativeCoverageByFile
        .filter(entry => !entry.hasNegativeCoverage)
        .map(entry => `- No explicit negative cases in ${entry.filePath}`)
        .join('\n') || '- Negative coverage present in all executed files',
      '',
      '### Test Robustness Signals',
      fileAnalysis
        .filter(entry => entry.findings.length)
        .map(entry => `- ${entry.filePath}: ${entry.findings.join(', ')}`)
        .join('\n') || '- No obvious robustness risks detected by heuristics',
      '',
      '### Assertion Signals',
      fileAnalysis
        .filter(entry => !entry.hasExpect)
        .map(entry => `- No explicit expect() assertions found in ${entry.filePath}`)
        .join('\n') || '- Assertions detected in all executed files',
      '',
      '### Setup/Teardown Signals',
      fileAnalysis
        .filter(entry => !entry.hasBeforeEach)
        .map(entry => `- No test.beforeEach() found in ${entry.filePath}`)
        .join('\n') || '- Setup hooks detected in all executed files',
      '',
      '## Recommendation Ticket (GitHub Issue Format)',
      '',
      'Title: Improve E2E Test Stability and UX-Testability Contract',
      '',
      'Labels: quality, testing, dx, ux',
      '',
      'Body:',
      '- Summary:',
      '  - Introduce stable selectors (data-testid) for critical user flows.',
      '  - Reduce flaky waits by replacing fixed timeouts with deterministic waits.',
      '  - Align UI states with test contracts (loading states, disabled states, empty states).',
      '',
      '- Problem:',
      failedTests.length
        ? `  - ${failedTests.length} tests failed in this run; failures include timeouts or missing elements.`
        : '  - No failures in this run, but robustness heuristics indicate opportunities.',
      '',
      '- Proposed Changes:',
      '  1) Add data-testid attributes to key action buttons, inputs, and step navigation components.',
      '  2) Standardize loading spinners and disable states for async actions.',
      '  3) Remove hard-coded waits and replace with reliable UI state checks.',
      '  4) Document UI contracts for E2E flows in specs to enforce consistency.',
      '',
      '- Acceptance Criteria:',
      '  - All primary flow pages have stable data-testid selectors.',
      '  - No E2E test relies on waitForTimeout for core flow steps.',
      '  - Loading and error states are consistent and testable.',
      '  - E2E specs map to UI contracts and are referenced in tests.',
      '',
      '- Notes:',
      '  - This ticket improves user experience, test stability, and developer experience.',
      '',
    ];

    fs.writeFileSync(reportFile, reportLines.join('\n'), 'utf8');
  }
}

module.exports = E2eMarkdownReporter;
