import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await page.goto("http://localhost:4200/9a070eef-a9b4-4903-b863-d703e7768ed4/budget", {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(3000);

  const webpackInfo = await page.evaluate(() => {
    const chunk = window.webpackChunkynab_api;
    if (chunk) {
      return {
        chunkLength: chunk.length,
        chunkKeys: chunk.map(c => c[0])
      };
    }
    return null;
  });

  console.log("Webpack chunk:", webpackInfo);
  await browser.close();
}

main().catch(console.error);
