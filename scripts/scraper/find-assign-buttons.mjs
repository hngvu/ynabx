import fs from "node:fs";

const html = fs.readFileSync("scripts/scraper/output/test_plan_modals/inspector_category_expanded.html", "utf8");
const buttonMatches = [...html.matchAll(/<button([^>]*)>([\s\S]*?)<\/button>/gi)];

console.log("Total buttons in category inspector:", buttonMatches.length);
buttonMatches.forEach((m, idx) => {
  const attrs = m[1];
  const text = m[2].replace(/<[^>]+>/g, "").trim().replace(/\s+/g, " ");
  if (text.toLowerCase().includes("assign") || attrs.includes("assign")) {
    console.log(`[${idx + 1}] Text: "${text}" | Attrs: ${attrs}`);
  }
});

// Also check month inspector
const monthHtml = fs.readFileSync("scripts/scraper/output/test_plan_modals/inspector_month_full.html", "utf8");
const monthBtnMatches = [...monthHtml.matchAll(/<button([^>]*)>([\s\S]*?)<\/button>/gi)];
console.log("\nTotal buttons in month inspector:", monthBtnMatches.length);
monthBtnMatches.forEach((m, idx) => {
  const attrs = m[1];
  const text = m[2].replace(/<[^>]+>/g, "").trim().replace(/\s+/g, " ");
  if (text.toLowerCase().includes("assign") || attrs.includes("assign")) {
    console.log(`[${idx + 1}] Text: "${text}" | Attrs: ${attrs}`);
  }
});
