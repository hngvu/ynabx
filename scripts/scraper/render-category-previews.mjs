import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { chromium } = require("./node_modules/playwright");
import path from "path";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 600, height: 350 } });

  const files = [
    "popover_add_category_group_preview.html",
    "popover_add_category_preview.html",
    "popover_edit_category_group_preview.html",
    "popover_edit_category_preview.html"
  ];

  for (const f of files) {
    const filePath = "file:///" + path.resolve("scripts/scraper/output/test_plan_modals", f).replace(/\\/g, "/");
    await page.goto(filePath, { waitUntil: "domcontentloaded" });
    const outPng = path.resolve("scripts/scraper/output/test_plan_modals", f.replace(".html", ".png"));
    await page.screenshot({ path: outPng });
    console.log("Rendered preview png:", f);
  }

  await browser.close();
})();
