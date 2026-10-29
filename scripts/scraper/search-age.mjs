import fs from "node:fs";

const budgetHtml = fs.readFileSync("scripts/scraper/output/test_plan/budget_full_page.html", "utf8");
console.log("Searching in budget_full_page.html...");

const matches = [...budgetHtml.matchAll(/([^>]{0,50}age[^<]{0,50})/gi)];
console.log("Matches count:", matches.length);
matches.slice(0, 20).forEach((m, idx) => {
  console.log(`[${idx + 1}]`, m[1].trim());
});

const reflectHtml = fs.readFileSync("scripts/scraper/output/reports/report_spending_breakdown.html", "utf8");
console.log("\nSearching in report_spending_breakdown.html...");
const reflectMatches = [...reflectHtml.matchAll(/([^>]{0,50}age[^<]{0,50})/gi)];
console.log("Reflect matches count:", reflectMatches.length);
reflectMatches.slice(0, 20).forEach((m, idx) => {
  console.log(`[${idx + 1}]`, m[1].trim());
});
