import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pageEmber = await context.newPage();
  const pageReact = await context.newPage();

  await pageEmber.goto("http://localhost:4200/9a070eef-a9b4-4903-b863-d703e7768ed4/budget", { waitUntil: "domcontentloaded" });
  await pageReact.goto("http://localhost:5174/", { waitUntil: "domcontentloaded" });
  await pageEmber.waitForTimeout(3000);
  await pageReact.waitForTimeout(1500);

  const getMetrics = async (page) => {
    return await page.evaluate(() => {
      const sidebar = document.querySelector(".sidebar-left");
      const header = document.querySelector(".budget-header");
      const table = document.querySelector(".budget-table");
      const inspector = document.querySelector(".budget-inspector");
      const rta = document.querySelector(".to-be-budgeted-amount");

      return {
        sidebarWidth: sidebar ? sidebar.getBoundingClientRect().width : 0,
        headerHeight: header ? header.getBoundingClientRect().height : 0,
        inspectorWidth: inspector ? inspector.getBoundingClientRect().width : 0,
        rtaText: rta ? rta.innerText.trim() : "",
        monthText: document.querySelector(".budget-header-calendar-date-button")?.innerText.trim()
      };
    });
  };

  const emberMetrics = await getMetrics(pageEmber);
  const reactMetrics = await getMetrics(pageReact);

  console.log("EMBER METRICS:", emberMetrics);
  console.log("REACT METRICS:", reactMetrics);

  await browser.close();
}

main().catch(console.error);
