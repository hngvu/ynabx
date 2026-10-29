import { getBrowserContext, OUTPUT_DIR } from "./browser-context.mjs";
import fs from "node:fs";
import path from "node:path";

const TEST_PLAN_ID = "9a070eef-a9b4-4903-b863-d703e7768ed4";
const AOM_URL = `https://app.ynab.com/${TEST_PLAN_ID}/reflect/age-of-money`;

const reportsDir = path.join(OUTPUT_DIR, "reports");

function cleanAndInlineHtml(rawHtml, cssContent) {
  let html = rawHtml;
  html = html.replace(/<base\s+href=["'][^"']*["']\s*\/?>/gi, "");
  html = html.replace(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi, "");
  html = html.replace(/<link[^>]+href=["'][^"']+\.css["'][^>]*>/gi, "");
  html = html.replace(/<script\s+([^>]*src=["'][^"']+["'][^>]*)>([\s\S]*?)<\/script>/gi, (m, attrs) => {
    return `<!-- disabled script: ${attrs} -->`;
  });
  html = html.replace(/src=["']\/(?!\/)([^"']+)["']/gi, 'src="https://app.ynab.com/$1"');
  html = html.replace(/href=["']\/(?!\/)(assets|images|favicon)([^"']*)["']/gi, 'href="https://app.ynab.com/$1$2"');

  const styleBlock = `
<style id="inlined-ynab-master-css">
${cssContent}
</style>
<link href="https://fonts.googleapis.com/css2?family=Figtree:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
`;

  if (html.includes("<head>")) {
    html = html.replace("<head>", `<head>\n${styleBlock}`);
  } else {
    html = `<!DOCTYPE html><html><head>${styleBlock}</head>${html}</html>`;
  }
  return html;
}

async function main() {
  const cssBundlePath = path.join(OUTPUT_DIR, "css", "all-ynab.css");
  const allCss = fs.readFileSync(cssBundlePath, "utf8");

  console.log("=== Scraping Age of Money Report ===");
  const { context, page, isCDP } = await getBrowserContext({ headless: false });

  console.log(`Navigating to: ${AOM_URL} ...`);
  await page.goto(AOM_URL, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".sidebar, .reflect-age-of-money, .content", { timeout: 30000 });
  await page.waitForTimeout(2500);

  const rawHtml = await page.content();
  const styledHtml = cleanAndInlineHtml(rawHtml, allCss);

  const htmlOut = path.join(reportsDir, "report_age_of_money.html");
  const shotOut = path.join(reportsDir, "report_age_of_money.png");

  fs.writeFileSync(htmlOut, styledHtml, "utf8");
  await page.screenshot({ path: shotOut, fullPage: true });

  console.log(`✔ Saved HTML: ${htmlOut}`);
  console.log(`✔ Saved PNG:  ${shotOut}`);

  // Update index.html
  const indexHtmlPath = path.join(OUTPUT_DIR, "index.html");
  let indexHtml = fs.readFileSync(indexHtmlPath, "utf8");

  const aomCard = `
    <div class="card">
      <div class="card-title">Age of Money Report (75 Days)</div>
      <div class="card-desc">Rule Four tracking: current Age of Money metric, 90-day history trend chart, and guide.</div>
      <div class="btn-group">
        <a class="btn btn-primary" href="reports/report_age_of_money.html" target="_blank">Open Full HTML</a>
        <a class="btn btn-secondary" href="reports/report_age_of_money.png" target="_blank">View PNG</a>
      </div>
    </div>
`;

  if (!indexHtml.includes("Age of Money Report")) {
    // Insert after Reflect / Reports Pages grid start
    indexHtml = indexHtml.replace('<div class="section-title">📈 Reflect / Reports Pages</div>\n  <div class="grid">', `<div class="section-title">📈 Reflect / Reports Pages</div>\n  <div class="grid">\n${aomCard}`);
    fs.writeFileSync(indexHtmlPath, indexHtml, "utf8");
    console.log("✔ Added Age of Money card to index.html");
  }

  if (!isCDP) {
    await context.close();
  }

  console.log("\nDone!");
}

main().catch(console.error);
