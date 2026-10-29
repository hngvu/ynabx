import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_DIR = path.resolve(__dirname, "output");

const cssBundlePath = path.join(OUTPUT_DIR, "css", "all-ynab.css");
const allCss = fs.readFileSync(cssBundlePath, "utf8");

// Modals
const moveMoneyHtml = fs.readFileSync(path.join(OUTPUT_DIR, "test_plan_modals", "popover_move_money.html"), "utf8");
const monthPickerHtml = fs.readFileSync(path.join(OUTPUT_DIR, "test_plan_modals", "popover_month_picker.html"), "utf8");
const catEditModalHtml = fs.readFileSync(path.join(OUTPUT_DIR, "test_plan_modals", "popover_category_edit_menu.html"), "utf8");
const reconcileStep1Html = fs.readFileSync(path.join(OUTPUT_DIR, "test_plan_modals", "modal_reconcile_step1_confirm.html"), "utf8");
const reconcileStep2Html = fs.readFileSync(path.join(OUTPUT_DIR, "test_plan_modals", "modal_reconcile_step2_discrepancy.html"), "utf8");
const recentMovesHtml = fs.readFileSync(path.join(OUTPUT_DIR, "test_plan_modals", "modal_recent_moves.html"), "utf8");

// Inspectors
const inspectorUnderfundedHtml = fs.readFileSync(path.join(OUTPUT_DIR, "test_plan_modals", "inspector_category_expanded.html"), "utf8");
const inspectorFundedHtml = fs.readFileSync(path.join(OUTPUT_DIR, "test_plan_modals", "inspector_funded_target.html"), "utf8");
const inspectorMonthHtml = fs.readFileSync(path.join(OUTPUT_DIR, "test_plan_modals", "inspector_month_full.html"), "utf8");

// Pages
const budgetFullHtml = fs.readFileSync(path.join(OUTPUT_DIR, "test_plan", "budget_full_page.html"), "utf8");
const reportsAomHtml = fs.readFileSync(path.join(OUTPUT_DIR, "reports", "report_age_of_money.html"), "utf8");
const checkingHtml = fs.readFileSync(path.join(OUTPUT_DIR, "accounts", "checking_account_page.html"), "utf8");

console.log("Building complete unified YNAB app with all popovers & inspector states...");

const unifiedApp = `<!DOCTYPE html>
<html lang="en" class="no-js mod_flexbox mod_flexwrap theme-default ynab-app">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>YNAB Master Prototype - Fully Assembled</title>
  <style>
    ${allCss}

    /* Standalone master app styles */
    html, body {
      height: 100%;
      margin: 0;
      padding: 0;
      overflow: hidden;
      font-family: Figtree, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    
    .view-container {
      display: none;
      height: 100%;
      width: 100%;
      overflow-y: auto;
    }
    .view-container.active {
      display: block;
    }

    /* Modal Backdrop */
    #modal-wrapper {
      position: fixed;
      inset: 0;
      z-index: 100000;
      display: none;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.45);
      backdrop-filter: blur(2px);
    }
    .modal-item {
      display: none;
    }

    /* Top Navigation Toolbar for Rapid Demonstration */
    #demo-toolbar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 42px;
      background: #0f172a;
      color: #94a3b8;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      font-size: 12px;
      z-index: 999999;
      border-bottom: 1px solid #334155;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }
    .nav-pill-group {
      display: flex;
      gap: 6px;
      align-items: center;
    }
    .nav-btn {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #f8fafc;
      padding: 5px 12px;
      border-radius: 6px;
      font-size: 11px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.15s ease;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .nav-btn:hover {
      background: #38bdf8;
      color: #0f172a;
      border-color: #38bdf8;
    }
    .nav-btn.active {
      background: #38bdf8;
      color: #0f172a;
      border-color: #38bdf8;
    }
    .divider {
      width: 1px;
      height: 20px;
      background: #334155;
      margin: 0 6px;
    }

    /* Shift content below demo toolbar */
    .layout {
      margin-top: 42px;
      height: calc(100vh - 42px) !important;
      overflow: hidden;
    }

    /* Inspector switcher container */
    .inspector-state {
      display: none;
      height: 100%;
    }
    .inspector-state.active {
      display: block;
    }
  </style>
</head>
<body class="ember-application ynab-u">

  <!-- TOP RAPID NAVIGATION BAR -->
  <div id="demo-toolbar">
    <div class="nav-pill-group">
      <span style="background: #38bdf8; color: #0f172a; padding: 2px 8px; border-radius: 4px; font-weight: 800; font-size: 10px; text-transform: uppercase;">YNAB Assembly</span>
      <span style="font-weight: 600; color: #e2e8f0;">Giao Diện:</span>
      <button class="nav-btn active" id="btn-tab-budget" onclick="switchView('budget')">📊 Ngân Sách (Plan)</button>
      <button class="nav-btn" id="btn-tab-reflect" onclick="switchView('reflect')">📈 Báo Cáo (Reflect & Age of Money 75d)</button>
      <button class="nav-btn" id="btn-tab-accounts" onclick="switchView('accounts')">💳 Sổ Cái (Chase Checking $7,515.87)</button>
    </div>

    <div class="nav-pill-group">
      <span class="divider"></span>
      <span style="font-weight: 600; color: #e2e8f0;">Bật Popover & Modal:</span>
      <button class="nav-btn" onclick="openModal('catEdit')">⚙️ Menu Category</button>
      <button class="nav-btn" onclick="openModal('moveMoney')">💸 Chuyển Tiền (Move Money)</button>
      <button class="nav-btn" onclick="openModal('recentMoves')">📜 Lịch Sử (Recent Moves)</button>
      <button class="nav-btn" onclick="openModal('monthPicker')">📅 Lịch 12 Tháng</button>
      <button class="nav-btn" onclick="openModal('reconcile')">🏦 Đối Soát (Reconcile)</button>
    </div>
  </div>

  <!-- MODAL MANAGER (POPOVERS & DIALOGS) -->
  <div id="modal-wrapper" onclick="handleBackdropClick(event)">
    <div id="modal-catEdit" class="modal-item">${catEditModalHtml}</div>
    <div id="modal-moveMoney" class="modal-item">${moveMoneyHtml}</div>
    <div id="modal-recentMoves" class="modal-item">${recentMovesHtml}</div>
    <div id="modal-monthPicker" class="modal-item">${monthPickerHtml}</div>
    <div id="modal-reconcile" class="modal-item">${reconcileStep1Html}</div>
    <div id="modal-reconcile-step2" class="modal-item">${reconcileStep2Html}</div>
  </div>

  <!-- VIEW 1: BUDGET VIEW -->
  <div id="view-budget" class="view-container active">
    ${budgetFullHtml.replace(/^[\s\S]*?<body[^>]*>/i, "").replace(/<\/body>[\s\S]*$/i, "")}
  </div>

  <!-- VIEW 2: REFLECT (REPORTS) VIEW -->
  <div id="view-reflect" class="view-container">
    ${reportsAomHtml.replace(/^[\s\S]*?<body[^>]*>/i, "").replace(/<\/body>[\s\S]*$/i, "")}
  </div>

  <!-- VIEW 3: ACCOUNTS VIEW -->
  <div id="view-accounts" class="view-container">
    ${checkingHtml.replace(/^[\s\S]*?<body[^>]*>/i, "").replace(/<\/body>[\s\S]*$/i, "")}
  </div>

  <!-- HIDDEN TEMPLATES FOR DYNAMIC INSPECTOR -->
  <div id="tpl-inspector-underfunded" style="display: none;">
    ${inspectorUnderfundedHtml}
  </div>
  <div id="tpl-inspector-funded" style="display: none;">
    ${inspectorFundedHtml}
  </div>
  <div id="tpl-inspector-month" style="display: none;">
    ${inspectorMonthHtml}
  </div>

  <script>
    // 1. View Switcher
    function switchView(viewName) {
      document.querySelectorAll('.view-container').forEach(el => el.classList.remove('active'));
      document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

      if (viewName === 'budget') {
        document.getElementById('view-budget').classList.add('active');
        document.getElementById('btn-tab-budget').classList.add('active');
      } else if (viewName === 'reflect') {
        document.getElementById('view-reflect').classList.add('active');
        document.getElementById('btn-tab-reflect').classList.add('active');
      } else if (viewName === 'accounts') {
        document.getElementById('view-accounts').classList.add('active');
        document.getElementById('btn-tab-accounts').classList.add('active');
      }
    }

    // 2. Modal Manager
    function openModal(id) {
      const wrapper = document.getElementById('modal-wrapper');
      wrapper.style.display = 'flex';
      document.querySelectorAll('.modal-item').forEach(m => m.style.display = 'none');
      const target = document.getElementById('modal-' + id);
      if (target) {
        target.style.display = 'block';
      }
    }

    function closeModal() {
      const wrapper = document.getElementById('modal-wrapper');
      wrapper.style.display = 'none';
      document.querySelectorAll('.modal-item').forEach(m => m.style.display = 'none');
    }

    function handleBackdropClick(e) {
      if (e.target.id === 'modal-wrapper' || e.target.classList.contains('modal-overlay')) {
        closeModal();
      }
    }

    // 3. Dynamic Inspector Switcher
    function setInspectorContent(templateId) {
      const liveInspector = document.querySelector('#view-budget .budget-inspector');
      const tpl = document.getElementById(templateId);
      if (liveInspector && tpl) {
        liveInspector.innerHTML = tpl.innerHTML;
        bindInspectorInteractions();
      }
    }

    function bindInspectorInteractions() {
      // Auto-assign expand toggle
      const autoAssignToggle = document.querySelector('#view-budget .budget-breakdown-auto-assign .card-roll-up, #view-budget .budget-breakdown-auto-assign button.card-roll-up');
      if (autoAssignToggle) {
        autoAssignToggle.addEventListener('click', (e) => {
          e.stopPropagation();
          const card = document.querySelector('#view-budget .budget-breakdown-auto-assign');
          if (card) card.classList.toggle('is-collapsed');
        });
      }

      // Assign button in Inspector impact message
      const assignBtn = document.querySelector('#view-budget .impact-message button.ynab-button');
      if (assignBtn) {
        assignBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          alert("✔ Đã kích hoạt [Assign $1,400.00] để tài trợ hoàn tất mục tiêu cho danh mục này!");
          setInspectorContent('tpl-inspector-funded');
        });
      }

      // Edit category button in Inspector
      const editCatBtn = document.querySelector('#view-budget .inspector-category-edit, #view-budget button[aria-label*="Edit category"]');
      if (editCatBtn) {
        editCatBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          openModal('catEdit');
        });
      }

      // Recent moves button in Inspector
      const recentMovesBtn = document.querySelector('#view-budget .recent-moves-open-modal-container button');
      if (recentMovesBtn) {
        recentMovesBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          openModal('recentMoves');
        });
      }
    }

    // 4. Initialize Interactive Attachments
    document.addEventListener('DOMContentLoaded', () => {
      // Connect Sidebar Links
      document.querySelectorAll("a[href*='/budget']").forEach(a => {
        a.addEventListener('click', (e) => { e.preventDefault(); switchView('budget'); });
      });
      document.querySelectorAll("a[href*='/reflect']").forEach(a => {
        a.addEventListener('click', (e) => { e.preventDefault(); switchView('reflect'); });
      });
      document.querySelectorAll("a[href*='/accounts']").forEach(a => {
        a.addEventListener('click', (e) => { e.preventDefault(); switchView('accounts'); });
      });

      // Connect Category Row Clicks
      document.querySelectorAll('#view-budget .budget-table-row:not(.is-master-category)').forEach(row => {
        row.style.cursor = 'pointer';
        row.addEventListener('click', (e) => {
          // Deselect previous
          document.querySelectorAll('#view-budget .budget-table-row').forEach(r => r.classList.remove('is-checked'));
          row.classList.add('is-checked');

          const name = (row.querySelector('.budget-table-cell-name') || {}).innerText || '';
          if (name.includes('Groceries') || name.includes('Gas') || name.includes('Entertainment')) {
            setInspectorContent('tpl-inspector-funded');
          } else {
            setInspectorContent('tpl-inspector-underfunded');
          }
        });
      });

      // Clicking outside category rows deselects to month inspector
      document.querySelector('#view-budget .budget-table-header')?.addEventListener('click', () => {
        document.querySelectorAll('#view-budget .budget-table-row').forEach(r => r.classList.remove('is-checked'));
        setInspectorContent('tpl-inspector-month');
      });

      // Move Money Popover on Available Balance Click
      document.querySelectorAll('#view-budget .budget-table-cell-available').forEach(cell => {
        cell.style.cursor = 'pointer';
        cell.addEventListener('click', (e) => {
          e.stopPropagation();
          openModal('moveMoney');
        });
      });

      // Calculator Mode on Assigned Cell Click
      document.querySelectorAll('#view-budget .budget-table-cell-budgeted').forEach(cell => {
        cell.addEventListener('click', (e) => {
          e.stopPropagation();
          const curr = cell.querySelector('.ynab-new-currency-input');
          if (curr) {
            curr.classList.add('is-focused', 'is-editing');
            const input = curr.querySelector('input');
            if (input) input.focus();
          }
        });
      });

      // Month Header Click -> Month Picker
      document.querySelectorAll('#view-budget .budget-header-calendar-date-button, #view-budget .button-calendar-date').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          openModal('monthPicker');
        });
      });

      // Reconcile Button & Steps
      document.querySelectorAll('#view-accounts button:has-text("Reconcile"), #view-accounts .button-reconcile').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          openModal('reconcile');
        });
      });

      document.querySelectorAll('#modal-reconcile button').forEach(b => {
        if (b.innerText.trim().toLowerCase() === 'no') {
          b.addEventListener('click', (e) => {
            e.stopPropagation();
            openModal('reconcile-step2');
          });
        }
      });

      // Escape key closes modals & deselects rows
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          closeModal();
          document.querySelectorAll('#view-budget .budget-table-row').forEach(r => r.classList.remove('is-checked'));
          setInspectorContent('tpl-inspector-month');
        }
      });

      // Bind initial inspector
      bindInspectorInteractions();
    });
  </script>
</body>
</html>`;

const outPath = path.join(OUTPUT_DIR, "ynab_assembled_app.html");
fs.writeFileSync(outPath, unifiedApp, "utf8");
console.log(`✔ Upgraded Master Assembled App built at:\n  ${outPath} (${(unifiedApp.length / 1024).toFixed(1)} KB)`);
