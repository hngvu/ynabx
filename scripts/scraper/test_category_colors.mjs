import { chromium } from "playwright";

async function testCategoryColors() {
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

  // Click "+ Category Group"
  console.log("Adding Category Group 'Living'...");
  await page.click('.budget-toolbar-add-category');
  await page.fill('input[placeholder="New Category Group"]', 'Living');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1000);

  // Click "+ Category" in that group
  console.log("Adding Category 'Rent'...");
  const addCatBtn = await page.$('button[title*="Add Category"]');
  if (addCatBtn) {
    await addCatBtn.click();
    await page.waitForTimeout(300);
    const input = await page.$('input[placeholder="New Category Name"]');
    if (input) {
      await input.fill('Rent');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);
    }
  }

  // Take screenshot
  await page.screenshot({ path: "../../scratch/after_adding_category.png" });
  console.log("Saved scratch/after_adding_category.png");

  // Inspect the created category row
  const rows = await page.$$eval(".budget-table-row", (els) => els.map(el => ({
    class: el.className,
    text: el.innerText.replace(/\n+/g, " | ").trim(),
  })));
  console.log("Rows:", rows);

  await browser.close();
}

testCategoryColors().catch(console.error);
