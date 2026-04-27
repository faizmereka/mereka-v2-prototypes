/**
 * Run E2E tests with consistent timestamp for report generation
 * This ensures all workers write to the same report folder
 */

const { execSync } = require('child_process');
const path = require('path');

// Generate a single timestamp for this test run
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);

console.log(`📊 Using report timestamp: ${timestamp}`);
console.log(`🚀 Running E2E tests...\n`);

// Set the timestamp as environment variable and run tests
process.env.REPORT_TIMESTAMP = timestamp;

try {
  execSync('npx playwright test --config=playwright.config.ts', {
    stdio: 'inherit',
    cwd: __dirname,
    env: {
      ...process.env,
      REPORT_TIMESTAMP: timestamp,
    },
  });

  // Find the generated report
  const artifactsDir = path.join(__dirname, '../../artifacts');
  const fs = require('fs');
  
  if (fs.existsSync(artifactsDir)) {
    const reports = fs.readdirSync(artifactsDir)
      .filter(f => f.startsWith('playwright-report-e2e-'))
      .sort()
      .reverse();
    
    if (reports.length > 0) {
      const latestReport = reports[0];
      const reportPath = path.join(artifactsDir, latestReport);
      
      console.log(`\n✅ Tests completed!`);
      console.log(`📊 Report location: ${reportPath}`);
      console.log(`📄 HTML file: ${path.join(reportPath, 'index.html')}`);
      console.log(`\nTo view the report:`);
      console.log(`  npx playwright show-report "${reportPath}"`);
      console.log(`  OR open: ${path.join(reportPath, 'index.html')}`);
    }
  }
} catch (error) {
  console.error('\n❌ Tests failed:', error.message);
  process.exit(1);
}
