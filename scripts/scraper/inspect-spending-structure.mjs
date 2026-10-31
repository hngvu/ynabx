import { getBrowserContext } from "./browser-context.mjs";
import fs from "fs";

const TEST_PLAN_ID = "9a070eef-a9b4-4903-b863-d703e7768ed4";

async function main() {
  const { context, page } = await getBrowserContext({ headless: false });
  try {
    await page.goto(`https://app.ynab.com/${TEST_PLAN_ID}/reflect/spending-breakdown`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    // Let's inspect the container of spending breakdown content
    const breakdownDetails = await page.evaluate(() => {
      const container = document.querySelector(".reports-content, .scroll-container, .spending-breakdown");
      const chart = document.querySelector(".spending-breakdown__chart, .chart-container, .highcharts-container");
      const list = document.querySelector(".spending-breakdown__list, .reports-table, .category-list");
      return {
        containerClass: container?.className,
        chartClass: chart?.className,
        listClass: list?.className,
        mainHtmlStructure: Array.from(document.querySelectorAll(".scroll-container > div, .reports-content > div")).map(d => ({
          className: d.className,
          tagName: d.tagName
        }))
      };
    });

    console.log("Breakdown Structure:\n", JSON.stringify(breakdownDetails, null, 2));

  } finally {
    await context.close();
  }
}

main().catch(console.error);
