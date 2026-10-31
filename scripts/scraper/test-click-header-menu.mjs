import { getBrowserContext } from "./browser-context.mjs";

async function main() {
  const { context, page } = await getBrowserContext({ headless: false });
  try {
    await page.goto("https://app.ynab.com/9a070eef-a9b4-4903-b863-d703e7768ed4/budget", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    const btn = page.locator(".sidebar-nav-menu-budget").first();
    await btn.click({ force: true });
    await page.waitForTimeout(1000);

    const domChanges = await page.evaluate(() => {
      // Find any element whose z-index is large or fixed positioned
      const all = Array.from(document.querySelectorAll("body *")).filter(el => {
        const style = window.getComputedStyle(el);
        return (style.position === 'fixed' || style.position === 'absolute') && parseInt(style.zIndex, 10) > 10;
      }).map(el => ({
        tag: el.tagName,
        className: el.className,
        id: el.id,
        text: el.textContent?.trim().slice(0, 100)
      }));
      return all;
    });
    console.log("Floating elements:", domChanges);
  } finally {
    await context.close();
  }
}

main().catch(console.error);
