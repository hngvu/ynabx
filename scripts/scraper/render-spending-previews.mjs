import { chromium } from "playwright";
import path from "path";
import fs from "fs";

const MASTER_CSS = fs.readFileSync(path.resolve("scripts/scraper/output/css/all-ynab.css"), "utf8");

function wrapModal(html, title, width = 280) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${title} - YNAB Component</title>
  <style>
${MASTER_CSS}
  </style>
  <style>
    body {
      background-color: #f4f5f7;
      margin: 0;
      padding: 40px;
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      box-sizing: border-box;
      font-family: Figtree, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    .preview-card {
      width: ${width}px;
      position: relative;
    }
    .modal {
      position: static !important;
      display: block !important;
      height: auto !important;
      box-shadow: 0 4px 20px rgba(0,0,0,0.18) !important;
    }
  </style>
</head>
<body class="ember-application">
  <div class="preview-card">
    ${html}
  </div>
</body>
</html>`;
}

async function main() {
  // Wrap timeframe html into preview
  const timeRaw = fs.readFileSync("scripts/scraper/output/reports/popover_filter_timeframe.html", "utf8");
  const timeModalBox = timeRaw.includes('<div class="modal"') ? timeRaw.substring(timeRaw.indexOf('<div class="modal"'), timeRaw.lastIndexOf('</div>\n</div>') + 6) : timeRaw;
  const timePreviewHtml = wrapModal(timeModalBox, "Filter by Timeframe Popover", 240);
  fs.writeFileSync("scripts/scraper/output/reports/popover_filter_timeframe_preview.html", timePreviewHtml);

  // Take screenshot of previews
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1200, height: 1000 } });

  const files = [
    {
      url: `file://${path.resolve("scripts/scraper/output/reports/spending_breakdown_categories_view_preview.html")}`,
      out: "scripts/scraper/output/reports/spending_breakdown_categories_view_preview.png"
    },
    {
      url: `file://${path.resolve("scripts/scraper/output/reports/spending_breakdown_groups_view_preview.html")}`,
      out: "scripts/scraper/output/reports/spending_breakdown_groups_view_preview.png"
    },
    {
      url: `file://${path.resolve("scripts/scraper/output/reports/popover_filter_categories_preview.html")}`,
      out: "scripts/scraper/output/reports/popover_filter_categories_preview.png"
    },
    {
      url: `file://${path.resolve("scripts/scraper/output/reports/popover_filter_accounts_preview.html")}`,
      out: "scripts/scraper/output/reports/popover_filter_accounts_preview.png"
    },
    {
      url: `file://${path.resolve("scripts/scraper/output/reports/popover_filter_timeframe_preview.html")}`,
      out: "scripts/scraper/output/reports/popover_filter_timeframe_preview.png"
    }
  ];

  for (const item of files) {
    await page.goto(item.url, { waitUntil: "networkidle" });
    const card = page.locator(".preview-card").first();
    await card.screenshot({ path: item.out });
    console.log("Rendered:", item.out);
  }

  await browser.close();
}

main().catch(console.error);
