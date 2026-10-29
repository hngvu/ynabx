import { chromium } from "playwright";

async function run() {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
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
  await p.click(".sidebar-nav-menu-budget");
  await p.waitForTimeout(500);
  const popover = await p.$(".modal-popup");
  if (popover) {
    console.log("POPOVER OUTER HTML:\n", await popover.evaluate((el) => el.outerHTML));
  } else {
    console.log("POPOVER NOT FOUND IN DOM!");
  }
  await b.close();
}

run().catch(console.error);
