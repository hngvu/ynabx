import { getBrowserContext } from "./browser-context.mjs";

const TEST_PLAN_ID = "9a070eef-a9b4-4903-b863-d703e7768ed4";

async function main() {
  const { context, page } = await getBrowserContext({ headless: false });
  try {
    await page.goto(`https://app.ynab.com/${TEST_PLAN_ID}/budget`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    // Look for link to Reflect
    console.log("Looking for Reflect nav link...");
    const reflectLink = page.locator("a:has-text('Reflect')").first();
    console.log("Reflect link href:", await reflectLink.getAttribute("href"));
    
    await reflectLink.click();
    await page.waitForTimeout(3000);
    console.log("Current URL after click:", page.url());

    const navTabs = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("a, button")).map(el => ({
        tag: el.tagName,
        className: el.className,
        text: el.textContent?.trim().slice(0, 40),
        href: el.getAttribute("href")
      })).filter(x => /spending|breakdown|reflect|report|filter|category|account|time/i.test(x.text || '') || /spending|reflect/i.test(x.href || ''));
    });

    console.log("Found navigation and filter elements:\n", JSON.stringify(navTabs, null, 2));

  } finally {
    await context.close();
  }
}

main().catch(console.error);
