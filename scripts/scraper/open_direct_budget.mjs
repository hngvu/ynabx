import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log("Navigating directly to /9a070eef-a9b4-4903-b863-d703e7768ed4/budget ...");
  await page.goto("http://localhost:4200/9a070eef-a9b4-4903-b863-d703e7768ed4/budget", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(4000);

  const status = await page.evaluate(() => {
    return {
      title: document.title,
      url: window.location.href,
      hasTable: !!document.querySelector(".budget-table"),
      hasSidebar: !!document.querySelector(".sidebar")
    };
  });
  console.log("Status:", status);

  await page.screenshot({ path: "output/ember_direct_budget.png" });
  console.log("Saved output/ember_direct_budget.png");

  await browser.close();
}

main().catch(console.error);
