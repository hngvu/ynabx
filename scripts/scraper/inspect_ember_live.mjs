import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on("console", (msg) => console.log("BROWSER LOG:", msg.type(), msg.text()));
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));

  console.log("Navigating to http://localhost:4200/ ...");
  try {
    await page.goto("http://localhost:4200/", { waitUntil: "domcontentloaded", timeout: 15000 });
  } catch (e) {
    console.log("goto failed:", e.message);
  }

  await page.waitForTimeout(4000);
  await page.screenshot({ path: "output/live_ember_actual.png" });
  console.log("Saved output/live_ember_actual.png");

  // Check DOM
  const bodyClass = await page.evaluate(() => document.body.className);
  console.log("Body className:", bodyClass);

  const html = await page.evaluate(() => {
    const layout = document.querySelector(".layout");
    const sidebar = document.querySelector(".sidebar");
    const budget = document.querySelector(".budget-table");
    return {
      hasLayout: !!layout,
      hasSidebar: !!sidebar,
      hasBudget: !!budget,
      title: document.title,
      contentLength: document.body.innerHTML.length
    };
  });
  console.log("Ember page status:", html);

  await browser.close();
}

main().catch(console.error);
