import { getBrowserContext } from "./browser-context.mjs";

async function main() {
  const { context, page } = await getBrowserContext({ headless: false });
  await page.goto("https://app.ynab.com/users/budgets", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  const budgets = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll("a"));
    return links
      .map(a => ({ text: a.innerText.trim(), href: a.href, className: a.className }))
      .filter(a => a.href.includes("/budget") || a.text.toLowerCase().includes("test") || a.className.includes("budget"));
  });

  console.log("Budgets on page:", budgets);
  await context.close();
}

main().catch(console.error);
