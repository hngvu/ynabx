import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await page.goto("http://localhost:4200/9a070eef-a9b4-4903-b863-d703e7768ed4/budget", {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(3000);

  const appInfo = await page.evaluate(() => {
    const app = window.__ynabapp__;
    const res = {
      appKeys: app ? Object.keys(app) : [],
    };
    if (app && app.__container__) {
      res.containerEntries = Object.keys(app.__container__.lookupCache || {});
    }
    return res;
  });

  console.log("App container info:", appInfo);
  await browser.close();
}

main().catch(console.error);
