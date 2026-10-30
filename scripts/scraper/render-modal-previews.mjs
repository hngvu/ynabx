import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { chromium } = require("./node_modules/playwright");
import path from "path";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });

  const files = [
    "modal_add_account_choose_preview.html",
    "modal_add_unlinked_account_preview.html",
    "modal_select_account_type_preview.html",
    "modal_add_unlinked_account_filled_preview.html"
  ];

  for (const f of files) {
    const filePath = "file:///" + path.resolve("scripts/scraper/output/test_plan_modals", f).replace(/\\/g, "/");
    await page.goto(filePath, { waitUntil: "domcontentloaded" });
    const outPng = path.resolve("scripts/scraper/output/test_plan_modals", f.replace(".html", ".png"));
    await page.screenshot({ path: outPng });
    console.log("Saved preview png for:", f);
  }

  await browser.close();
})();
