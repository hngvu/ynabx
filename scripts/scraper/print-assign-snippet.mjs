import fs from "node:fs";

const html = fs.readFileSync("scripts/scraper/output/test_plan_modals/inspector_category_expanded.html", "utf8");
const idx = html.indexOf("ynab-button warning");
if (idx !== -1) {
  console.log(html.substring(idx - 200, idx + 600));
} else {
  console.log("Not found");
}
