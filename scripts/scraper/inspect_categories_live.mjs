import { chromium } from "playwright";

async function inspectCategories() {
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

  // Find all category rows
  const rows = await page.$$eval(".budget-table-row", (els) => els.map(el => ({
    class: el.className,
    text: el.innerText.replace(/\n+/g, " | ").trim()
  })));
  console.log("Budget table rows:", rows);

  // Check available capsules:
  const pills = await page.$$eval(".ynab-new-budget-available-number", (els) => els.map(el => ({
    class: el.className,
    text: el.innerText.trim(),
    bg: window.getComputedStyle(el).backgroundColor,
    color: window.getComputedStyle(el).color
  })));
  console.log("Available pills:", pills);

  // Check ready to assign banner:
  const rta = await page.$eval(".to-be-budgeted", (el) => ({
    class: el.className,
    text: el.innerText.replace(/\n+/g, " | ").trim(),
    bg: window.getComputedStyle(el).backgroundColor,
    color: window.getComputedStyle(el).color
  }));
  console.log("Ready to Assign banner:", rta);

  await browser.close();
}

inspectCategories().catch(console.error);
