import fs from "node:fs";

const html = fs.readFileSync("scripts/scraper/output/test_plan/budget_full_page.html", "utf8");

// Look for month title
const dateMatch = html.match(/<button[^>]*class="[^"]*calendar[^"]*"[^>]*>([\s\S]*?)<\/button>/i);
console.log("Calendar button:", dateMatch ? dateMatch[1].replace(/<[^>]+>/g, "").trim() : "not found");

// Check Available amounts
const availableCells = [...html.matchAll(/class="[^"]*budget-table-cell-available[^"]*"[^>]*>([\s\S]*?)<\/li>/gi)];
console.log("Available cells sample:");
availableCells.slice(0, 10).forEach(c => {
  console.log("  avail:", c[1].replace(/<[^>]+>/g, "").trim().replace(/\s+/g, " "));
});

// Check if any row has progress or target indicators
const progressSample = html.match(/<svg[^>]*class="[^"]*progress[^"]*"[^>]*>/gi);
console.log("Progress SVGs found:", progressSample);

const goalMatch = html.match(/class="[^"]*goal[^"]*"/gi);
console.log("Goal classes found:", goalMatch ? goalMatch.slice(0, 10) : "none");

const targetMatch = html.match(/class="[^"]*target[^"]*"/gi);
console.log("Target classes found:", targetMatch ? targetMatch.slice(0, 10) : "none");
