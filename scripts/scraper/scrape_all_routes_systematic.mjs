import { chromium } from "playwright";
import fs from "fs";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const baseUrl = "http://localhost:4200/9a070eef-a9b4-4903-b863-d703e7768ed4";

  // 1. Scrape Budget Route
  console.log("Scraping route: /budget ...");
  await page.goto(`${baseUrl}/budget`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(4000);

  fs.writeFileSync("output/ember_route_budget.html", await page.content());
  await page.screenshot({ path: "output/ember_route_budget.png" });

  // 2. Scrape Reflect Route
  console.log("Scraping route: /reflect ...");
  const reflectLink = page.locator(".navlink-reports a").first();
  if (await reflectLink.isVisible()) {
    await reflectLink.click();
    await page.waitForTimeout(3000);
    fs.writeFileSync("output/ember_route_reflect.html", await page.content());
    await page.screenshot({ path: "output/ember_route_reflect.png" });
  }

  // 3. Scrape Accounts Route
  console.log("Scraping route: /accounts ...");
  const accountsLink = page.locator(".navlink-accounts a").first();
  if (await accountsLink.isVisible()) {
    await accountsLink.click();
    await page.waitForTimeout(3000);
    fs.writeFileSync("output/ember_route_accounts.html", await page.content());
    await page.screenshot({ path: "output/ember_route_accounts.png" });
  }

  // 4. Scrape Add Account Modal
  console.log("Scraping Add Account Modal...");
  const addAccountBtn = page.locator(".nav-add-account").first();
  if (await addAccountBtn.isVisible()) {
    await addAccountBtn.click();
    await page.waitForTimeout(1500);
    fs.writeFileSync("output/ember_modal_add_account.html", await page.content());
    await page.screenshot({ path: "output/ember_modal_add_account.png" });
  }

  console.log("Finished scraping all main routes & modal!");
  await browser.close();
}

main().catch(console.error);
