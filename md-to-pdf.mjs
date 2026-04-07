#!/usr/bin/env node

/**
 * md-to-pdf.mjs — Markdown → PDF via Playwright
 *
 * Usage:
 *   node md-to-pdf.mjs <input.md> [output.pdf]
 *   node md-to-pdf.mjs output/003-openai-cv.md
 *
 * Converts a markdown CV or cover letter to a clean, ATS-friendly PDF.
 * If no output path given, uses same basename with .pdf extension.
 *
 * Requires: playwright, marked
 *   npm install playwright marked
 *   npx playwright install chromium
 */

import { chromium } from 'playwright';
import { readFile, writeFile } from 'fs/promises';
import { resolve, basename, dirname, join } from 'path';
import { marked } from 'marked';

async function run() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: node md-to-pdf.mjs <input.md> [output.pdf]');
    process.exit(1);
  }

  const inputPath = resolve(args[0]);
  const outputPath = args[1]
    ? resolve(args[1])
    : join(dirname(inputPath), basename(inputPath, '.md') + '.pdf');

  console.log(`📄 Input:  ${inputPath}`);
  console.log(`📁 Output: ${outputPath}`);

  const md = await readFile(inputPath, 'utf-8');
  const bodyHtml = marked.parse(md);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>CV</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }

  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 10.5pt;
    line-height: 1.5;
    color: #1a1a2e;
    background: #ffffff;
    padding: 0.5in 0.6in;
    max-width: 8.5in;
    margin: 0 auto;
  }

  h1 {
    font-family: 'IBM Plex Sans', sans-serif;
    font-size: 24pt;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: #0f172a;
    margin-bottom: 4px;
  }

  h1 + p {
    font-size: 9.5pt;
    color: #475569;
    margin-bottom: 14px;
    padding-bottom: 10px;
    border-bottom: 2px solid;
    border-image: linear-gradient(to right, #0891b2, #7c3aed) 1;
  }

  h2 {
    font-family: 'IBM Plex Sans', sans-serif;
    font-size: 12pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #0891b2;
    margin-top: 18px;
    margin-bottom: 8px;
    padding-bottom: 3px;
    border-bottom: 1px solid #e2e8f0;
  }

  h3 {
    font-family: 'IBM Plex Sans', sans-serif;
    font-size: 11pt;
    font-weight: 600;
    color: #0f172a;
    margin-top: 12px;
    margin-bottom: 2px;
  }

  h3 + p strong:first-child {
    font-weight: 500;
    color: #64748b;
    font-size: 9.5pt;
  }

  p {
    margin-bottom: 8px;
    text-align: left;
  }

  ul {
    margin-left: 18px;
    margin-bottom: 10px;
  }

  li {
    margin-bottom: 4px;
    padding-left: 2px;
  }

  strong { color: #0f172a; font-weight: 600; }

  em { color: #475569; }

  a { color: #0891b2; text-decoration: none; }

  hr {
    border: 0;
    border-top: 1px solid #e2e8f0;
    margin: 14px 0;
  }

  hr + h2 { margin-top: 8px; }

  /* Tighten spacing inside experience sections */
  h3 + p { margin-bottom: 6px; }

  /* Keep contact info compact */
  body > p:first-of-type { margin-bottom: 0; }

  @page {
    size: letter;
    margin: 0;
  }
</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  const pdfBuffer = await page.pdf({
    format: 'letter',
    printBackground: true,
    margin: { top: '0.5in', right: '0.6in', bottom: '0.5in', left: '0.6in' },
    preferCSSPageSize: false,
  });

  await writeFile(outputPath, pdfBuffer);
  await browser.close();

  console.log(`✅ PDF generated: ${outputPath}`);
  console.log(`📦 Size: ${(pdfBuffer.length / 1024).toFixed(1)} KB`);
}

run().catch((err) => {
  console.error('❌ PDF generation failed:', err.message);
  process.exit(1);
});
