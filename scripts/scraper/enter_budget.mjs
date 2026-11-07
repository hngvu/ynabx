import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await page.goto("http://localhost:4200/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  // Check what modal or buttons exist
  const buttons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("button, a")).map(el => ({
      tag: el.tagName,
      text: el.innerText.trim(),
      className: el.className
    })).filter(b => b.text.length > 0 && b.text.length < 50);
  });
  console.log("Visible buttons on live Ember:", buttons.slice(0, 15));

  // Let's click the first button or plan link to enter the budget
  const planLink = page.locator('a, button').filter({ hasText: /Open Plan|test|Plan/i }).first();
  if (await planLink.isVisible()) {
    console.log("Clicking plan button/link:", await planLink.innerText());
    await planLink.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: "output/live_ember_budget_active.png" });
    console.log("Saved output/live_ember_budget_active.png");
  }

  await browser.close();
}

main().catch(console.error);
