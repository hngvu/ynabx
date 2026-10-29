import { getBrowserContext, OUTPUT_DIR } from "./browser-context.mjs";
import fs from "node:fs";
import path from "node:path";

async function main() {
  const targetDir = path.join(OUTPUT_DIR, "icons");
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  console.log("=== Extracting YNAB SVG Icons ===");
  const { context, page, isCDP } = await getBrowserContext({ headless: false });

  console.log("Navigating to YNAB...");
  await page.goto("https://app.ynab.com", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".nav-main, .budget-header", { timeout: 30000 });
  await page.waitForTimeout(2000);

  console.log("Extracting SVGs from document...");
  const icons = await page.evaluate(() => {
    const list = [];
    const svgs = document.querySelectorAll("svg");
    const seen = new Set();

    svgs.forEach((svg) => {
      // Look for identifiable class name or title or use href
      const className = (svg.getAttribute("class") || "").trim();
      const useEl = svg.querySelector("use");
      const useHref = useEl ? (useEl.getAttribute("href") || useEl.getAttribute("xlink:href") || "") : "";
      
      let name = "";
      if (useHref) {
        name = useHref.replace(/^#/, "");
      } else if (className) {
        const iconMatch = className.match(/ynab-new-icon--([a-z0-9-]+)/i) || className.match(/icon-([a-z0-9-]+)/i);
        if (iconMatch) {
          name = iconMatch[1];
        }
      }

      const outer = svg.outerHTML;
      if (!seen.has(outer)) {
        seen.add(outer);
        list.push({
          name: name || `icon-${list.length + 1}`,
          className,
          svg: outer
        });
      }
    });

    // Also extract symbol sprites if present
    const symbols = document.querySelectorAll("svg symbol");
    symbols.forEach((sym) => {
      const symId = sym.getAttribute("id");
      if (symId) {
        const viewBox = sym.getAttribute("viewBox") || "0 0 24 24";
        const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${sym.innerHTML}</svg>`;
        list.push({
          name: symId,
          className: "symbol-sprite",
          svg: svgContent
        });
      }
    });

    return list;
  });

  console.log(`Found ${icons.length} unique SVGs.`);
  let count = 0;
  for (const item of icons) {
    const filename = `${item.name.replace(/[^a-z0-9_-]/gi, "_")}.svg`;
    const cleanSvg = item.svg
      .replace(/id="ember\d+"/g, "")
      .replace(/data-ember-action-[^=]+="[^"]*"/g, "");
    fs.writeFileSync(path.join(targetDir, filename), cleanSvg, "utf8");
    count++;
  }

  console.log(`✔ Extracted and saved ${count} SVG icons to:\n  ${targetDir}\n`);

  if (!isCDP) {
    await context.close();
  }
}

main().catch((err) => {
  console.error("Lỗi:", err);
  process.exit(1);
});
