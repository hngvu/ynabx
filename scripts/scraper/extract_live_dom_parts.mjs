import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await page.goto("http://localhost:4200/9a070eef-a9b4-4903-b863-d703e7768ed4/budget", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(4000);

  const dom = await page.evaluate(() => {
    const sidebar = document.querySelector(".sidebar-left");
    const header = document.querySelector(".budget-header");
    const views = document.querySelector(".budget-view-row");
    const table = document.querySelector(".budget-table");
    const inspector = document.querySelector(".budget-inspector");

    return {
      sidebarHtml: sidebar ? sidebar.outerHTML : "",
      headerHtml: header ? header.outerHTML : "",
      viewsHtml: views ? views.outerHTML : "",
      tableHtml: table ? table.outerHTML : "",
      inspectorHtml: inspector ? inspector.outerHTML : ""
    };
  });

  const fs = await import("fs");
  fs.writeFileSync("../../scripts/live_ember_sidebar.html", dom.sidebarHtml);
  fs.writeFileSync("../../scripts/live_ember_header.html", dom.headerHtml);
  fs.writeFileSync("../../scripts/live_ember_views.html", dom.viewsHtml);
  fs.writeFileSync("../../scripts/live_ember_table.html", dom.tableHtml);
  fs.writeFileSync("../../scripts/live_ember_inspector.html", dom.inspectorHtml);

  console.log("Successfully extracted live Ember DOM parts!");
  await browser.close();
}

main().catch(console.error);
