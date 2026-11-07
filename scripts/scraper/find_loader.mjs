import { chromium } from "playwright";
import fs from "fs";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await page.goto("http://localhost:4200/9a070eef-a9b4-4903-b863-d703e7768ed4/budget", {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(3000);

  const loaderInfo = await page.evaluate(() => {
    const keys = Object.keys(window).filter(k => 
      k.includes('require') || k.includes('loader') || k.includes('Ember') || k.includes('define') || k.includes('ynab')
    );
    
    let emberApp = null;
    if (window.Ember && window.Ember.Namespace && window.Ember.Namespace.NAMESPACES) {
      emberApp = window.Ember.Namespace.NAMESPACES.map(n => n.name || n.toString());
    }

    return {
      windowKeys: keys,
      emberNamespaces: emberApp,
      hasDefine: typeof window.define !== 'undefined',
      defineKeys: typeof window.define !== 'undefined' ? Object.keys(window.define) : []
    };
  });

  console.log("Loader inspect:", loaderInfo);
  await browser.close();
}

main().catch(console.error);
