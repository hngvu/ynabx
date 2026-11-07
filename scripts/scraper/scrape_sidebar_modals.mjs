import { chromium } from "playwright";
import fs from "fs";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log("Navigating to Ember...");
  await page.goto("http://localhost:4200/9a070eef-a9b4-4903-b863-d703e7768ed4/budget", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  // 1. Click Plan Switcher Menu Button in Sidebar
  console.log("Clicking Plan Menu button in Sidebar...");
  const planBtn = page.locator(".sidebar-nav-menu-budget").first();
  if (await planBtn.isVisible()) {
    await planBtn.click();
    await page.waitForTimeout(1000);
    fs.writeFileSync("output/ember_plan_menu_popover.html", await page.content());
    await page.screenshot({ path: "output/ember_plan_menu_popover.png" });
    console.log("Captured Plan Menu popover!");
  }

  // Close popover
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);

  // 2. Click Edit Account icon on Chase Checking in Sidebar
  console.log("Clicking Edit Account pencil icon...");
  const editAccIcon = page.locator(".nav-account-row .nav-account-icons-left").first();
  if (await editAccIcon.isVisible()) {
    await editAccIcon.click();
    await page.waitForTimeout(1000);
    fs.writeFileSync("output/ember_account_settings_modal.html", await page.content());
    await page.screenshot({ path: "output/ember_account_settings_modal.png" });
    console.log("Captured Account Settings modal!");
  }

  await browser.close();
}

main().catch(console.error);
