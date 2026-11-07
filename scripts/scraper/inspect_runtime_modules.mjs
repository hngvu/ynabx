import { chromium } from "playwright";
import fs from "fs";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log("Connecting to live Ember app...");
  await page.goto("http://localhost:4200/9a070eef-a9b4-4903-b863-d703e7768ed4/budget", {
    waitUntil: "domcontentloaded",
    timeout: 10000,
  });
  await page.waitForTimeout(3000);

  // Inspect runtime modules
  const runtimeInfo = await page.evaluate(() => {
    let modules = [];
    if (typeof window.requirejs !== "undefined" && window.requirejs.entries) {
      modules = Object.keys(window.requirejs.entries);
    } else if (typeof window.require !== "undefined" && window.require.entries) {
      modules = Object.keys(window.require.entries);
    }

    const filtered = modules.filter(
      (k) => k.includes("/routes/") || k.includes("/templates/") || k.includes("/components/") || k.includes("/services/")
    );

    return {
      totalModules: modules.length,
      filteredModules: filtered,
      hasEmber: typeof window.Ember !== "undefined",
    };
  });

  console.log("Runtime info:", {
    totalModules: runtimeInfo.totalModules,
    filteredCount: runtimeInfo.filteredModules.length,
    hasEmber: runtimeInfo.hasEmber,
  });

  fs.writeFileSync("output/runtime_modules.json", JSON.stringify(runtimeInfo, null, 2));

  await browser.close();
}

main().catch(console.error);
