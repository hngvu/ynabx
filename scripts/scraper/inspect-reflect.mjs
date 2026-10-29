import { getBrowserContext } from "./browser-context.mjs";

async function main() {
  const { context, page } = await getBrowserContext({ headless: false });
  await page.goto("https://app.ynab.com/9a070eef-a9b4-4903-b863-d703e7768ed4/reflect", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  const reflectInfo = await page.evaluate(() => {
    // Check tabs or report switcher
    const tabs = Array.from(document.querySelectorAll("button, a, [role='tab']"))
      .filter(el => {
        const t = (el.innerText || "").toLowerCase();
        return t.includes("spending") || t.includes("net worth") || t.includes("income") || t.includes("reflect");
      })
      .map(el => ({ text: el.innerText.trim(), tag: el.tagName, className: el.className }));

    const charts = Array.from(document.querySelectorAll("svg, canvas, .highcharts-container, [class*='chart']"))
      .map(el => ({ tag: el.tagName, className: el.className }));

    const title = document.title;
    return { title, tabs, chartsCount: charts.length };
  });

  console.log("Reflect page info:", reflectInfo);
  await context.close();
}

main().catch(console.error);
