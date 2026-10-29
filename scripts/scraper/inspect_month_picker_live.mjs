import { chromium } from "playwright";

async function inspectMonthPicker() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  await page.goto("http://localhost:5173", { waitUntil: "networkidle" });
  if (await page.$('input[type="email"]')) {
    await page.click('button:has-text("Sign Up")');
    await page.waitForTimeout(200);
    const testEmail = `test_${Date.now()}@example.com`;
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
  }

  // Click month picker button
  const monthBtn = await page.$(".budget-header-calendar-date-button");
  console.log("Month button box:", await monthBtn.boundingBox());
  await monthBtn.click();
  await page.waitForTimeout(300);

  const popover = await page.$(".month-picker-popover-card, .modal-calendar, .month-picker");
  if (popover) {
    const box = await popover.boundingBox();
    console.log("Popover box:", box);
    const html = await page.evaluate(el => el.outerHTML, popover);
    console.log("Popover HTML:", html.substring(0, 300));
  } else {
    console.log("Popover not found!");
  }

  await browser.close();
}

inspectMonthPicker().catch(console.error);
