import { getBrowserContext, OUTPUT_DIR } from "./browser-context.mjs";
import fs from "node:fs";
import path from "node:path";

const TEST_PLAN_ID = "9a070eef-a9b4-4903-b863-d703e7768ed4";
const REFLECT_URL = `https://app.ynab.com/${TEST_PLAN_ID}/reflect`;
const ALL_ACCOUNTS_URL = `https://app.ynab.com/${TEST_PLAN_ID}/accounts`;
const CHECKING_URL = `https://app.ynab.com/${TEST_PLAN_ID}/accounts/ddd417e8-d4c9-4981-ad15-4c61c5d7ccc4`;
const VISA_URL = `https://app.ynab.com/${TEST_PLAN_ID}/accounts/595deb05-9b69-4aff-8619-1a23c63acbb5`;

const reportsDir = path.join(OUTPUT_DIR, "reports");
const accountsDir = path.join(OUTPUT_DIR, "accounts");

async function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Inlines full CSS bundle and removes crashing JS scripts
 */
function cleanAndInlineHtml(rawHtml, cssContent) {
  let html = rawHtml;

  // 1. Remove <base href="...">
  html = html.replace(/<base\s+href=["'][^"']*["']\s*\/?>/gi, "");

  // 2. Remove external CSS links
  html = html.replace(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi, "");
  html = html.replace(/<link[^>]+href=["'][^"']+\.css["'][^>]*>/gi, "");

  // 3. Disable external scripts
  html = html.replace(/<script\s+([^>]*src=["'][^"']+["'][^>]*)>([\s\S]*?)<\/script>/gi, (m, attrs) => {
    return `<!-- disabled script: ${attrs} -->`;
  });

  // 4. Fix relative images
  html = html.replace(/src=["']\/(?!\/)([^"']+)["']/gi, 'src="https://app.ynab.com/$1"');
  html = html.replace(/href=["']\/(?!\/)(assets|images|favicon)([^"']*)["']/gi, 'href="https://app.ynab.com/$1$2"');

  // 5. Inject complete CSS and Figtree font
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

async function savePageSnapshot(page, outFilePath, shotFilePath, cssContent) {
  await page.waitForTimeout(1000);
  const rawHtml = await page.content();
  const styledHtml = cleanAndInlineHtml(rawHtml, cssContent);
  fs.writeFileSync(outFilePath, styledHtml, "utf8");
  await page.screenshot({ path: shotFilePath, fullPage: true });
  console.log(`  ✔ Saved: ${path.basename(outFilePath)} and screenshot (${path.basename(shotFilePath)})`);
}

async function main() {
  await ensureDir(reportsDir);
  await ensureDir(accountsDir);

  const cssBundlePath = path.join(OUTPUT_DIR, "css", "all-ynab.css");
  const allCss = fs.readFileSync(cssBundlePath, "utf8");

  console.log("=== Scraping Accounts & Reflect Reports (with Inlined CSS) ===\n");
  const { context, page, isCDP } = await getBrowserContext({ headless: false });

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. ACCOUNTS PAGES
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("1. Scraping Accounts Views...");

  // All Accounts
  console.log("Navigating to All Accounts...");
  await page.goto(ALL_ACCOUNTS_URL, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".accounts-header, .ynab-grid, .sidebar", { timeout: 30000 });
  await savePageSnapshot(
    page,
    path.join(accountsDir, "all_accounts_page.html"),
    path.join(accountsDir, "all_accounts_page.png"),
    allCss
  );

  // Chase Checking (with sample transactions)
  console.log("Navigating to Chase Checking...");
  await page.goto(CHECKING_URL, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".accounts-header, .ynab-grid", { timeout: 30000 });
  await savePageSnapshot(
    page,
    path.join(accountsDir, "checking_account_page.html"),
    path.join(accountsDir, "checking_account_page.png"),
    allCss
  );

  // Visa Rewards Credit Card
  console.log("Navigating to Visa Rewards Credit Card...");
  await page.goto(VISA_URL, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".accounts-header, .ynab-grid", { timeout: 30000 });
  await savePageSnapshot(
    page,
    path.join(accountsDir, "credit_card_page.html"),
    path.join(accountsDir, "credit_card_page.png"),
    allCss
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. REFLECT / REPORTS PAGES
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n2. Scraping Reflect Reports Views...");

  // A) Spending Breakdown (Default tab)
  console.log("Navigating to Reflect: Spending Breakdown...");
  await page.goto(REFLECT_URL, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".sidebar, button:has-text('Spending Breakdown')", { timeout: 30000 });
  await page.waitForTimeout(2000);
  await savePageSnapshot(
    page,
    path.join(reportsDir, "report_spending_breakdown.html"),
    path.join(reportsDir, "report_spending_breakdown.png"),
    allCss
  );

  // B) Spending Trends Tab
  console.log("Clicking 'Spending Trends' tab...");
  const spendingTrendsBtn = await page.$("button:has-text('Spending Trends')");
  if (spendingTrendsBtn) {
    await spendingTrendsBtn.click();
    await page.waitForTimeout(2000);
    await savePageSnapshot(
      page,
      path.join(reportsDir, "report_spending_trends.html"),
      path.join(reportsDir, "report_spending_trends.png"),
      allCss
    );
  }

  // C) Net Worth Tab
  console.log("Clicking 'Net Worth' tab...");
  const netWorthBtn = await page.$("button:has-text('Net Worth')");
  if (netWorthBtn) {
    await netWorthBtn.click();
    await page.waitForTimeout(2000);
    await savePageSnapshot(
      page,
      path.join(reportsDir, "report_net_worth.html"),
      path.join(reportsDir, "report_net_worth.png"),
      allCss
    );
  }

  // D) Income v Expense Tab
  console.log("Clicking 'Income v Expense' tab...");
  const incomeExpenseBtn = await page.$("button:has-text('Income v Expense')");
  if (incomeExpenseBtn) {
    await incomeExpenseBtn.click();
    await page.waitForTimeout(2000);
    await savePageSnapshot(
      page,
      path.join(reportsDir, "report_income_vs_expense.html"),
      path.join(reportsDir, "report_income_vs_expense.png"),
      allCss
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. UPDATE GALLERY INDEX
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n3. Updating Gallery index.html with Reports section...");
  const indexHtmlPath = path.join(OUTPUT_DIR, "index.html");
  let indexHtml = fs.readFileSync(indexHtmlPath, "utf8");

  const reportsSection = `
  <div class="section-title">📈 Reflect / Reports Pages</div>
  <div class="grid">
    <div class="card">
      <div class="card-title">Spending Breakdown Report</div>
      <div class="card-desc">Donut charts, category breakdown list, and spending distribution.</div>
      <div class="btn-group">
        <a class="btn btn-primary" href="reports/report_spending_breakdown.html" target="_blank">Open Full HTML</a>
        <a class="btn btn-secondary" href="reports/report_spending_breakdown.png" target="_blank">View PNG</a>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Spending Trends Report</div>
      <div class="card-desc">Monthly spending trends and category comparison charts over time.</div>
      <div class="btn-group">
        <a class="btn btn-primary" href="reports/report_spending_trends.html" target="_blank">Open Full HTML</a>
        <a class="btn btn-secondary" href="reports/report_spending_trends.png" target="_blank">View PNG</a>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Net Worth Report</div>
      <div class="card-desc">Assets vs Debts tracking chart and net worth growth history.</div>
      <div class="btn-group">
        <a class="btn btn-primary" href="reports/report_net_worth.html" target="_blank">Open Full HTML</a>
        <a class="btn btn-secondary" href="reports/report_net_worth.png" target="_blank">View PNG</a>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Income vs Expense Matrix</div>
      <div class="card-desc">Detailed spreadsheet table of monthly income, category spending, and net surplus.</div>
      <div class="btn-group">
        <a class="btn btn-primary" href="reports/report_income_vs_expense.html" target="_blank">Open Full HTML</a>
        <a class="btn btn-secondary" href="reports/report_income_vs_expense.png" target="_blank">View PNG</a>
      </div>
    </div>

    <div class="card">
      <div class="card-title">All Accounts Ledger</div>
      <div class="card-desc">Complete ledger showing all transactions across Cash, Checking, and Credit cards.</div>
      <div class="btn-group">
        <a class="btn btn-primary" href="accounts/all_accounts_page.html" target="_blank">Open Full HTML</a>
        <a class="btn btn-secondary" href="accounts/all_accounts_page.png" target="_blank">View PNG</a>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Chase Checking Register ($7,515.87)</div>
      <div class="card-desc">Individual checking account register with toolbar and cleared balance.</div>
      <div class="btn-group">
        <a class="btn btn-primary" href="accounts/checking_account_page.html" target="_blank">Open Full HTML</a>
        <a class="btn btn-secondary" href="accounts/checking_account_page.png" target="_blank">View PNG</a>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Visa Rewards Credit Card (−$274.88)</div>
      <div class="card-desc">Individual credit card ledger with debt tracking and payment linkage.</div>
      <div class="btn-group">
        <a class="btn btn-primary" href="accounts/credit_card_page.html" target="_blank">Open Full HTML</a>
        <a class="btn btn-secondary" href="accounts/credit_card_page.png" target="_blank">View PNG</a>
      </div>
    </div>
  </div>
`;

  if (!indexHtml.includes("Reflect / Reports Pages")) {
    indexHtml = indexHtml.replace("</body>", `${reportsSection}\n</body>`);
    fs.writeFileSync(indexHtmlPath, indexHtml, "utf8");
    console.log("  ✔ Added Reports section to output/index.html");
  }

  if (!isCDP) {
    await context.close();
  }

  console.log("\n✔ Done scraping Accounts and Reports!");
}

main().catch((err) => {
  console.error("Lỗi:", err);
  process.exit(1);
});
