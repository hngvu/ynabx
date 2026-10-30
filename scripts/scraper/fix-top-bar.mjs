import fs from "fs";
import path from "path";

const APP_PATH = path.resolve("scripts/scraper/output/ynab_assembled_app.html");
let html = fs.readFileSync(APP_PATH, "utf8");

const target = `<button class="nav-btn" onclick="openModal('catEdit')">`;
const replacement = `
      <button class="nav-btn" onclick="openModal('addAccountChoose')">➕ Thêm TK</button>
      <button class="nav-btn" onclick="openModal('addUnlinked')">📝 Form Unlinked</button>
      <button class="nav-btn" onclick="openModal('selectAccountType')">🏦 Chọn Loại TK</button>
      <button class="nav-btn" onclick="openModal('catEdit')">`;

if (html.includes(target) && !html.includes("openModal('addAccountChoose')")) {
  html = html.replace(target, replacement);
  fs.writeFileSync(APP_PATH, html, "utf8");
  console.log("Successfully added top buttons!");
} else {
  console.log("Already present or target not found");
}
