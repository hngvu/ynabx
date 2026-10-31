import { chromium } from "playwright";
import path from "path";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1200, height: 1000 } });

  const files = [
    {
      url: `file://${path.resolve("scripts/scraper/output/test_plan_modals/modal_account_view_options_preview.html")}`,
      out: "scripts/scraper/output/test_plan_modals/modal_account_view_options_preview.png"
    },
    {
      url: `file://${path.resolve("scripts/scraper/output/test_plan_modals/transaction_search_with_recommendations_preview.html")}`,
      out: "scripts/scraper/output/test_plan_modals/transaction_search_with_recommendations_preview.png"
    },
    {
      url: `file://${path.resolve("scripts/scraper/output/test_plan_modals/transaction_search_filter_applied_preview.html")}`,
      out: "scripts/scraper/output/test_plan_modals/transaction_search_filter_applied_preview.png"
    }
  ];

  for (const item of files) {
    await page.goto(item.url, { waitUntil: "networkidle" });
    const card = page.locator(".preview-card").first();
    await card.screenshot({ path: item.out });
    console.log("Captured:", item.out);
  }

  await browser.close();
}

main().catch(console.error);
