import fs from "node:fs";
import path from "node:path";
import { getBrowserContext, OUTPUT_DIR } from "./browser-context.mjs";

async function fixFullPageHtml() {
  const cssBundlePath = path.join(OUTPUT_DIR, "css", "all-ynab.css");
  const allCss = fs.readFileSync(cssBundlePath, "utf8");

  const targets = [
    path.join(OUTPUT_DIR, "budget", "full_page.html"),
    path.join(OUTPUT_DIR, "accounts", "full_page.html"),
    path.join(OUTPUT_DIR, "test_plan", "budget_full_page.html"),
    path.join(OUTPUT_DIR, "test_plan", "accounts_full_page.html")
  ];

  for (const targetPath of targets) {
    if (!fs.existsSync(targetPath)) continue;

    console.log(`Processing ${path.relative(OUTPUT_DIR, targetPath)} ...`);
    let html = fs.readFileSync(targetPath, "utf8");

    // 1. Remove any <base href="...">
    html = html.replace(/<base\s+href=["'][^"']*["']\s*\/?>/gi, "");

    // 2. Remove all external <link rel="stylesheet"> that cause 404/CORS
    html = html.replace(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi, "");
    html = html.replace(/<link[^>]+href=["'][^"']+\.css["'][^>]*>/gi, "");

    // 3. Disable all external <script src="..."> tags so Ember won't crash/wipe the DOM
    html = html.replace(/<script\s+([^>]*src=["'][^"']+["'][^>]*)>([\s\S]*?)<\/script>/gi, (match, attrs, content) => {
      return `<!-- disabled script: ${attrs} -->`;
    });

    // 4. Fix relative images/assets: src="/..." -> src="https://app.ynab.com/..."
    html = html.replace(/src=["']\/(?!\/)([^"']+)["']/gi, 'src="https://app.ynab.com/$1"');
    html = html.replace(/href=["']\/(?!\/)(assets|images|favicon)([^"']*)["']/gi, 'href="https://app.ynab.com/$1$2"');

    // 5. Inject complete inlined CSS at the top of <head>
    const injectedStyle = `
<style id="inlined-ynab-master-css">
${allCss}
</style>
<link href="https://fonts.googleapis.com/css2?family=Figtree:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
`;

    if (html.includes("<head>")) {
      html = html.replace("<head>", `<head>\n${injectedStyle}`);
    } else {
      html = `<!DOCTYPE html><html><head>${injectedStyle}</head>${html}</html>`;
    }

    fs.writeFileSync(targetPath, html, "utf8");
    console.log(`  ✔ Successfully fixed and inlined CSS for: ${path.basename(targetPath)}`);
  }

  // Verify by loading in Playwright and taking a screenshot
  console.log("\nVerifying fixed budget full_page.html in Playwright...");
  const { context, page } = await getBrowserContext({ headless: false });
  const testUrl = "file:///" + targets[0].replace(/\\/g, "/");
  await page.goto(testUrl, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  const shotPath = path.join(OUTPUT_DIR, "budget", "verify_fixed_full_page.png");
  await page.screenshot({ path: shotPath, fullPage: true });
  console.log(`✔ Verified screenshot saved to:\n  ${shotPath}`);

  // Check computed styles of header and sidebar
  const check = await page.evaluate(() => {
    const sidebar = document.querySelector(".sidebar, nav");
    const h1 = document.querySelector("h1, .budget-header");
    return {
      sidebarBg: sidebar ? window.getComputedStyle(sidebar).backgroundColor : "no sidebar",
      sidebarWidth: sidebar ? window.getComputedStyle(sidebar).width : null,
      fontFamily: h1 ? window.getComputedStyle(h1).fontFamily : null
    };
  });
  console.log("Check styles:", check);

  await context.close();
}

fixFullPageHtml().catch(console.error);
