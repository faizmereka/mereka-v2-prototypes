#!/usr/bin/env node

/**
 * PDF Report Generator for E2E Tests
 * 
 * Converts Playwright HTML test reports to PDF format for stakeholder sharing.
 * Uses Playwright's built-in PDF generation capability.
 * 
 * Usage:
 *   node scripts/generate-pdf-report.js
 *   node scripts/generate-pdf-report.js --latest
 *   node scripts/generate-pdf-report.js --report-path ../../artifacts/playwright-report-e2e-2026-01-12T17-21-37
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const useLatest = args.includes('--latest');
const reportPathArg = args.find(arg => arg.startsWith('--report-path='));
const customReportPath = reportPathArg ? reportPathArg.split('=')[1] : null;

/**
 * Find the latest HTML report directory
 */
function findLatestReport() {
  // Script is in tests/e2e-test/scripts/, artifacts is at repo root
  const artifactsDir = path.resolve(__dirname, '../../../artifacts');
  
  if (!fs.existsSync(artifactsDir)) {
    throw new Error(`Artifacts directory not found: ${artifactsDir}`);
  }

  const reports = fs.readdirSync(artifactsDir)
    .filter(f => f.startsWith('playwright-report-e2e-'))
    .map(f => ({
      name: f,
      path: path.join(artifactsDir, f),
      stat: fs.statSync(path.join(artifactsDir, f))
    }))
    .filter(item => item.stat.isDirectory())
    .sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs);

  if (reports.length === 0) {
    throw new Error('No E2E test reports found. Run tests first: npm test');
  }

  return reports[0].path;
}

/**
 * Generate PDF from HTML report
 */
async function generatePDF(htmlReportPath) {
  const reportIndexPath = path.join(htmlReportPath, 'index.html');
  
  if (!fs.existsSync(reportIndexPath)) {
    throw new Error(`Report index.html not found: ${reportIndexPath}`);
  }

  console.log('📄 Generating PDF report...');
  console.log(`   Source: ${htmlReportPath}`);

  // Launch browser
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Load HTML report
    const fileUrl = `file://${path.resolve(reportIndexPath)}`;
    console.log(`   Loading: ${fileUrl}`);
    
    await page.goto(fileUrl, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });

    // Wait for report to fully render
    await page.waitForTimeout(2000);

    // Generate timestamp for PDF filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const outputDir = path.resolve(__dirname, '../../../artifacts/test-results');
    
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const pdfPath = path.join(outputDir, `e2e-report-${timestamp}.pdf`);

    // Generate PDF
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        bottom: '20mm',
        left: '10mm',
        right: '10mm'
      },
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="font-size: 10px; text-align: center; width: 100%; padding: 0 20mm;">
          <span>Mereka Frontend V2 - E2E Test Report</span>
        </div>
      `,
      footerTemplate: `
        <div style="font-size: 10px; text-align: center; width: 100%; padding: 0 20mm;">
          <span>Generated: <span class="date"></span></span> | 
          <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        </div>
      `
    });

    await browser.close();

    console.log(`✅ PDF report generated successfully!`);
    console.log(`   Output: ${pdfPath}`);
    console.log(`   Size: ${(fs.statSync(pdfPath).size / 1024).toFixed(2)} KB`);

    return pdfPath;
  } catch (error) {
    await browser.close();
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    let reportPath;

    if (customReportPath) {
      reportPath = path.resolve(customReportPath);
    } else {
      reportPath = findLatestReport();
      console.log(`📊 Found latest report: ${path.basename(reportPath)}`);
    }

    const pdfPath = await generatePDF(reportPath);
    
    console.log('\n📋 PDF Report Summary:');
    console.log('   - Contains all test results');
    console.log('   - Includes screenshots and error details for failed tests');
    console.log('   - Ready for stakeholder sharing');
    console.log(`\n💡 To view: Open ${pdfPath}`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error generating PDF report:');
    console.error(`   ${error.message}`);
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Ensure tests have been run: npm test');
    console.error('   2. Check that HTML report exists in artifacts/');
    console.error('   3. Verify Playwright is installed: npx playwright --version');
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { generatePDF, findLatestReport };
