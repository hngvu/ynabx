import fs from 'fs';

function extractModals(file) {
  const content = fs.readFileSync(file, 'utf8');
  console.log('=== ' + file + ' ===');
  let idx = 0;
  while ((idx = content.indexOf('class="modal-', idx)) !== -1) {
    console.log('Found modal at pos', idx);
    console.log(content.slice(idx - 50, idx + 700));
    console.log('==============================');
    idx += 20;
    if (idx > 5000000) break;
  }
}

extractModals('output/ember_plan_menu_popover.html');
extractModals('output/ember_account_settings_modal.html');
