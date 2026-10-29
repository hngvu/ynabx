import fs from "node:fs";

const html = fs.readFileSync("scripts/scraper/output/test_plan/budget_full_page.html", "utf8");
console.log("HTML length:", html.length);

// Check month displayed
const monthMatch = html.match(/class="[^"]*calendar[^"]*"[^>]*>([^<]+)</i);
console.log("Month match:", monthMatch ? monthMatch[0] : "none");

// Check category rows
const rows = [...html.matchAll(/class="([^"]*budget-table-row[^"]*)"/g)];
console.log("Budget table rows found:", rows.length);
rows.slice(0, 10).forEach(r => console.log("  row class:", r[1]));

// Check text in category rows
const catNames = [...html.matchAll(/class="[^"]*budget-table-cell-name[^"]*"[^>]*>([\s\S]*?)<\/div>/gi)];
console.log("Category cells count:", catNames.length);
catNames.slice(0, 10).forEach(c => {
  const clean = c[1].replace(/<[^>]+>/g, "").trim();
  console.log("  cat:", clean);
});

// Check modals/popups/dialogs in DOM or ember components
const emberDialogs = [...html.matchAll(/class="[^"]*(modal|popup|dropdown|flyout|popover|dialog)[^"]*"/gi)];
console.log("Dialog/modal classes found:", new Set(emberDialogs.map(d => d[0])));
