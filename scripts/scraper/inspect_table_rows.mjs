import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto('http://localhost:4200/9a070eef-a9b4-4903-b863-d703e7768ed4/budget');
  await page.waitForTimeout(3000);
  
  const rows = await page.evaluate(() => {
    const list = document.querySelectorAll('.budget-table-row');
    return Array.from(list).map(r => ({
      class: r.className,
      role: r.getAttribute('role'),
      entityId: r.getAttribute('data-entity-id'),
      isGroup: r.classList.contains('budget-table-row-ul'),
      name: r.querySelector('.budget-table-cell-name')?.innerText.trim(),
      assigned: r.querySelector('.budget-table-cell-budgeted')?.innerText.trim(),
      activity: r.querySelector('.budget-table-cell-activity')?.innerText.trim(),
      available: r.querySelector('.budget-table-cell-available')?.innerText.trim(),
    }));
  });
  
  console.log('Total budget table rows:', rows.length);
  console.log('Sample rows:', JSON.stringify(rows.slice(0, 10), null, 2));
  await browser.close();
})();
