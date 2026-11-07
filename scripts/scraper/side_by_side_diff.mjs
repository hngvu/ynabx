import { chromium } from "playwright";
import fs from "fs";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  const pageEmber = await context.newPage();
  const pageReact = await context.newPage();

  console.log("Navigating to Ember (4200)...");
  try {
    await pageEmber.goto("http://localhost:4200", { waitUntil: "networkidle", timeout: 8000 });
  } catch (e) {
    console.log("Ember navigation timeout/error, taking screenshot anyway:", e.message);
  }
  await pageEmber.waitForTimeout(2000);
  await pageEmber.screenshot({ path: "scripts/scraper/output/side_by_side_ember.png" });
  console.log("Captured Ember: scripts/scraper/output/side_by_side_ember.png");

  console.log("Navigating to React Clone (5174)...");
  await pageReact.goto("http://localhost:5174", { waitUntil: "networkidle", timeout: 8000 });
  await pageReact.waitForTimeout(1000);
  await pageReact.screenshot({ path: "scripts/scraper/output/side_by_side_react_clone.png" });
  console.log("Captured React Clone: scripts/scraper/output/side_by_side_react_clone.png");

  await browser.close();
  console.log("Finished capturing side-by-side snapshots!");
}

main().catch(console.error);
