import fs from "node:fs";

const html = fs.readFileSync("scripts/scraper/output/test_plan/budget_full_page.html", "utf8");

// Search for sidebar accounts
const accounts = [...html.matchAll(/class="[^"]*(nav-account|sidebar-account)[^"]*"[^>]*>([\s\S]*?)<\/a>/gi)];
console.log("Accounts in sidebar count:", accounts.length);
accounts.forEach(a => {
  console.log("  Account:", a[2].replace(/<[^>]+>/g, "").trim().replace(/\s+/g, " "));
});

// Also check all links under sidebar or nav
const navLinks = [...html.matchAll(/<a[^>]*href="([^"]*accounts[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi)];
console.log("Accounts links count:", navLinks.length);
navLinks.forEach(l => {
  console.log("  Href:", l[1], "| Text:", l[2].replace(/<[^>]+>/g, "").trim().replace(/\s+/g, " "));
});
