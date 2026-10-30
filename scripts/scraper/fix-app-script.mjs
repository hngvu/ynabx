import fs from "fs";
import path from "path";

const APP_PATH = path.resolve("scripts/scraper/output/ynab_assembled_app.html");
let html = fs.readFileSync(APP_PATH, "utf8");

// Rewrite the initAccountInteractions function properly
const newScript = `
    // Account register checkbox & action bar interaction
    function initAccountInteractions() {
      const checkboxes = document.querySelectorAll('#view-accounts .ynab-grid-cell-checkbox button, #view-accounts .ynab-grid-cell-checkbox, #view-accounts input[type="checkbox"]');
      const actionBar = document.getElementById('live-action-bar');

      console.log('Found checkboxes:', checkboxes.length, 'ActionBar:', !!actionBar);

      checkboxes.forEach(cb => {
        cb.addEventListener('click', (e) => {
          e.stopPropagation();
          const btn = cb.tagName === 'BUTTON' ? cb : cb.querySelector('button') || cb;
          const isChecked = btn.classList.toggle('is-checked');
          
          const checkedCount = document.querySelectorAll('#view-accounts .ynab-grid-cell-checkbox .is-checked, #view-accounts .ynab-grid-cell-checkbox.is-checked').length;
          console.log('Checked count:', checkedCount);

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
        // More button
        const allButtons = Array.from(actionBar.querySelectorAll('button'));
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

        // Close action bar button (the count button)
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

    // Call init on load
    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', initAccountInteractions);
    } else {
      initAccountInteractions();
    }
`;

// Replace from '// Account register checkbox & action bar interaction' to '</script>'
const startIdx = html.indexOf('// Account register checkbox & action bar interaction');
const endIdx = html.lastIndexOf('</script>');
if (startIdx !== -1 && endIdx !== -1) {
  html = html.slice(0, startIdx) + newScript + '\n  ' + html.slice(endIdx);
  fs.writeFileSync(APP_PATH, html, "utf8");
  console.log("Successfully fixed initAccountInteractions script!");
} else {
  console.error("Could not find start/end indices");
}
