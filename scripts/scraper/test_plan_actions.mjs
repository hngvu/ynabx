import { chromium } from "playwright";

async function run() {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  
  p.on("console", (m) => console.log("PAGE LOG:", m.text()));
  p.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));

  await p.goto("http://localhost:5173");
  const s = p.getByRole("button", { name: "Sign Up" });
  if (await s.isVisible()) {
    await s.click();
    await p.fill("#auth-email", `test_${Date.now()}@example.com`);
    await p.fill("#auth-password", "Password123!");
    await p.getByRole("button", { name: /^Sign Up$/i }).click();
    await p.waitForTimeout(2500);
  }
  await p.waitForSelector(".sidebar");
  
  console.log("1. Clicking budget switcher button...");
  await p.click(".sidebar-nav-menu-budget");
  await p.waitForTimeout(400);

  console.log("2. Clicking New Budget button...");
  await p.click("button:has-text('New Budget')");
  await p.waitForTimeout(400);

  console.log("3. Filling new budget form...");
  await p.fill("input[placeholder='Plan name']", "Vacation 2027");
  
  console.log("4. Submitting form...");
  await p.click("button[type='submit']:has-text('Create')");
  await p.waitForTimeout(2000);

  console.log("Budget switcher text after create:", await p.locator(".sidebar-nav-budget-email-budget").textContent());

  console.log("5. Re-opening popover to test Rename...");
  await p.click(".sidebar-nav-menu-budget");
  await p.waitForTimeout(400);

  console.log("6. Clicking Budget Settings & Rename...");
  await p.click("button:has-text('Budget Settings & Rename')");
  await p.waitForTimeout(400);

  console.log("7. Renaming budget...");
  await p.fill("input[placeholder='Plan name']", "Vacation 2027 Renamed");
  await p.click("button[type='submit']:has-text('Save')");
  await p.waitForTimeout(2000);

  console.log("Budget switcher text after rename:", await p.locator(".sidebar-nav-budget-email-budget").textContent());

  await b.close();
}

run().catch(console.error);
