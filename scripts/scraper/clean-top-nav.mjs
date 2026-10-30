import fs from "fs";
import path from "path";

const APP_PATH = path.resolve("scripts/scraper/output/ynab_assembled_app.html");
let html = fs.readFileSync(APP_PATH, "utf8");

// Look at the assembly nav block
const navStart = html.indexOf('<div class="assembly-nav">');
const navEnd = html.indexOf('</div>', navStart);

if (navStart !== -1 && navEnd !== -1) {
  const newNav = `<div class="assembly-nav">
      <span class="brand">YNAB ASSEMBLY</span>
      <button class="nav-btn active" id="btn-tab-budget" onclick="switchView('budget')">📊 Ngân Sách (Plan)</button>
      <button class="nav-btn" id="btn-tab-reflect" onclick="switchView('reflect')">📈 Báo Cáo (Reflect)</button>
      <button class="nav-btn" id="btn-tab-accounts" onclick="switchView('accounts')">💳 Sổ Cái (Checking)</button>
      <span style="border-left: 1px solid rgba(255,255,255,0.2); height: 20px; margin: 0 4px;"></span>
      <button class="nav-btn" onclick="openModal('addCategoryGroup')">➕ Thêm Nhóm</button>
      <button class="nav-btn" onclick="openModal('addCategory')">➕ Thêm DM</button>
      <button class="nav-btn" onclick="openModal('editCategoryGroup')">✏️ Sửa Nhóm</button>
      <button class="nav-btn" onclick="openModal('editCategory')">✏️ Sửa DM</button>
      <button class="nav-btn" onclick="openModal('addAccountChoose')">🏦 Thêm TK</button>
      <button class="nav-btn" onclick="openModal('selectAccountType')">📋 Loại TK</button>
      <button class="nav-btn" onclick="openModal('moveMoney')">💸 Move Money</button>
      <button class="nav-btn" onclick="openModal('recentMoves')">📜 Recent Moves</button>
      <button class="nav-btn" onclick="openModal('monthPicker')">📅 Lịch 12T</button>
      <button class="nav-btn" onclick="openModal('reconcile')">⚖️ Đối Soát</button>`;

  html = html.slice(0, navStart) + newNav + html.slice(navEnd);
  fs.writeFileSync(APP_PATH, html, "utf8");
  console.log("Successfully replaced assembly nav with clean buttons!");
} else {
  console.error("Could not find assembly-nav");
}
