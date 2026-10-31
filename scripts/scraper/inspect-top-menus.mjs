import { getBrowserContext } from "./browser-context.mjs";

async function main() {
  const { context, page } = await getBrowserContext({ headless: false });
  try {
    await page.goto("https://app.ynab.com/9a070eef-a9b4-4903-b863-d703e7768ed4/budget", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    const buttons = await page.evaluate(() => {
      return Array.from(document.querySelectorAll(".sidebar button, .sidebar a, header button, .budget-header button, .user-menu, .budget-switcher")).map(e => ({
        tag: e.tagName,
        className: e.className,
        text: e.textContent?.trim().slice(0, 40),
        aria: e.getAttribute("aria-label"),
        role: e.getAttribute("role")
      }));
    });
    console.log("Top / Sidebar interactive elements:\n", JSON.stringify(buttons, null, 2));

  } finally {
    await context.close();
  }
}

main().catch(console.error);
