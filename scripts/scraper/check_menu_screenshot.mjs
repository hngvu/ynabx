import { chromium } from "playwright";
import fs from "fs";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  // Serve or navigate to app
  // Check if dev server is running, or start a preview
  try {
    await page.goto("http://localhost:5173", { waitUntil: "domcontentloaded", timeout: 3000 });
  } catch (e) {
    console.log("Dev server not directly reachable at 5173, skipping live preview capture");
    await browser.close();
    return;
  }

  // Click budget button
  const budgetBtn = page.locator(".sidebar-nav-menu-budget").first();
  if (await budgetBtn.isVisible()) {
    await budgetBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: "scripts/scraper/output/menu_live_screenshot.png" });
    console.log("Saved menu_live_screenshot.png");
  }

  await browser.close();
}

main().catch(console.error);
