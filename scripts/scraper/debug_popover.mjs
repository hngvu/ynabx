import { chromium } from "playwright";

async function test() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));

  console.log("Navigating to http://localhost:5173...");
  await page.goto("http://localhost:5173", { waitUntil: "networkidle" });

  const signUpToggle = page.getByRole("button", { name: "Sign Up" });
  if (await signUpToggle.isVisible()) {
    console.log("Registering test user...");
    await signUpToggle.click();
    await page.waitForTimeout(200);
    const testEmail = `debug_plan_${Date.now()}@example.com`;
    await page.fill("#auth-email", testEmail);
    await page.fill("#auth-password", "Password123!");
    await page.getByRole("button", { name: /^Sign Up$/i }).click();
    await page.waitForTimeout(2500);
  }

  await page.waitForSelector(".sidebar", { timeout: 10000 });

  const btn = page.locator(".sidebar-nav-menu-budget");
  console.log("Clicking budget switcher button...");
  await btn.click();
  await page.waitForTimeout(500);

  await page.screenshot({ path: "scripts/scraper/popover_open_debug.png" });
  console.log("Screenshot taken: scripts/scraper/popover_open_debug.png");

  const popover = page.locator(".ynab-new-settings-menu, .modal-popup, .modal-overlay");
  console.log("Popover elements count:", await popover.count());
  for (let i = 0; i < await popover.count(); i++) {
    const el = popover.nth(i);
    const box = await el.boundingBox();
    const isVis = await el.isVisible();
    const cls = await el.getAttribute("class");
    console.log(`Element ${i} [${cls}]: visible=${isVis}, bbox=`, box);
  }

  // Also check if clicking "New Budget" opens form or if there are errors
  const newBudgetBtn = page.getByRole("button", { name: /New Budget/i });
  console.log("New Budget button count:", await newBudgetBtn.count());
  if (await newBudgetBtn.count() > 0) {
    console.log("Clicking New Budget button...");
    await newBudgetBtn.first().click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: "scripts/scraper/popover_new_budget_debug.png" });
  }

  await browser.close();
}

test().catch(console.error);
