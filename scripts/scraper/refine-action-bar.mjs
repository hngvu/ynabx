import fs from "fs";
import path from "path";

const APP_PATH = path.resolve("scripts/scraper/output/ynab_assembled_app.html");
const MODALS_DIR = path.resolve("scripts/scraper/output/test_plan_modals");
const actionBarHtml = fs.readFileSync(path.join(MODALS_DIR, "transaction_action_bar.html"), "utf8");

let html = fs.readFileSync(APP_PATH, "utf8");

// Remove old live-action-bar if present
html = html.replace(/<!-- Floating Transaction Action Bar -->[\s\S]*?<\/div>\s*<\/div>/, '');

// Insert action bar properly styled
const properActionBar = `
  <!-- Floating Transaction Action Bar -->
  <div id="live-action-bar" style="display: none; position: fixed; bottom: 20px; left: 260px; right: 0; z-index: 999; pointer-events: none;">
    <div style="display: flex; justify-content: center; pointer-events: auto;">
      ${actionBarHtml}
    </div>
  </div>
`;

html = html.replace(
  '<div id="view-accounts" class="view-container">',
  '<div id="view-accounts" class="view-container">' + properActionBar
);

// Update initAccountInteractions script
const updatedScript = `
    // Account register checkbox & action bar interaction
    function initAccountInteractions() {
      const checkboxes = document.querySelectorAll('#view-accounts .ynab-grid-cell-checkbox button, #view-accounts .ynab-grid-cell-checkbox');
      const actionBar = document.getElementById('live-action-bar');

      checkboxes.forEach(cb => {
        cb.addEventListener('click', (e) => {
          e.stopPropagation();
          const btn = cb.tagName === 'BUTTON' ? cb : cb.querySelector('button') || cb;
          btn.classList.toggle('is-checked');
          
          const checkedCount = document.querySelectorAll('#view-accounts .ynab-grid-cell-checkbox .is-checked, #view-accounts .ynab-grid-cell-checkbox.is-checked').length;

          if (checkedCount > 0 && actionBar) {
            actionBar.style.display = 'block';
            const countBtn = actionBar.querySelector('.register-action-bar-inner button:first-child');
            if (countBtn) {
              countBtn.innerText = '× ' + checkedCount + (checkedCount === 1 ? ' Transaction' : ' Transactions');
            }
          } else if (actionBar) {
            actionBar.style.display = 'none';
          }
        });
      });

      // Action Bar Button Click Handlers
      if (actionBar) {
        const allButtons = Array.from(actionBar.querySelectorAll('button'));
        
        // More button
        const moreBtn = allButtons.find(b => b.innerText.includes('More')) || allButtons[allButtons.length - 1];
        if (moreBtn) {
          moreBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openModal('actionBarMore');
          });
        }

        // Categorize button
        const catBtn = allButtons.find(b => b.innerText.includes('Categorize'));
        if (catBtn) {
          catBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openModal('actionBarCategorize');
          });
        }

        // Flag button
        const flagBtn = allButtons.find(b => b.innerText.includes('Flag'));
        if (flagBtn) {
          flagBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openModal('actionBarFlag');
          });
        }

        // Close action bar button
        const closeBtn = allButtons.find(b => b.innerText.includes('Transaction'));
        if (closeBtn) {
          closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('#view-accounts .is-checked').forEach(el => el.classList.remove('is-checked'));
            actionBar.style.display = 'none';
          });
        }
      }

      // Add Transaction row interactions
      const dateCell = document.querySelector('#view-accounts .ynab-grid-cell-date input, #view-accounts .ynab-grid-cell-date');
      if (dateCell) {
        dateCell.addEventListener('click', (e) => {
          e.stopPropagation();
          openModal('datePicker');
        });
      }

      const payeeCell = document.querySelector('#view-accounts .ynab-grid-cell-payeeName input, #view-accounts .ynab-grid-cell-payeeName');
      if (payeeCell) {
        payeeCell.addEventListener('click', (e) => {
          e.stopPropagation();
          openModal('payeeDropdown');
        });
      }

      const catCell = document.querySelector('#view-accounts .ynab-grid-cell-subCategoryName input, #view-accounts .ynab-grid-cell-subCategoryName');
      if (catCell) {
        catCell.addEventListener('click', (e) => {
          e.stopPropagation();
          openModal('catDropdown');
        });
      }
    }

    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', initAccountInteractions);
    } else {
      initAccountInteractions();
    }
`;

const startIdx = html.indexOf('// Account register checkbox & action bar interaction');
const endIdx = html.lastIndexOf('</script>');
if (startIdx !== -1 && endIdx !== -1) {
  html = html.slice(0, startIdx) + updatedScript + '\n  ' + html.slice(endIdx);
  fs.writeFileSync(APP_PATH, html, "utf8");
  console.log("Successfully refined Action Bar in ynab_assembled_app.html!");
} else {
  console.log("Could not find start/end idx");
}
