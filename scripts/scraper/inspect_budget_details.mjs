import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto('http://localhost:4200/9a070eef-a9b4-4903-b863-d703e7768ed4/budget');
  await page.waitForTimeout(3000);
  
  const details = await page.evaluate(() => {
    const calendar = document.querySelector('.budget-header-calendar');
    const totals = document.querySelector('.budget-header-totals');
    const share = document.querySelector('.budget-header-share');
    const viewButtons = Array.from(document.querySelectorAll('.budget-view-buttons li')).map(li => ({
      class: li.className,
      text: li.innerText.trim()
    }));
    const toolbar = document.querySelector('.budget-toolbar, .budget-table-header');
    
    return {
      calendarHtml: calendar?.outerHTML,
      totalsHtml: totals?.outerHTML,
      shareHtml: share?.outerHTML,
      viewButtons,
      toolbarHtml: toolbar?.outerHTML,
      tableChildren: Array.from(document.querySelector('.budget-table')?.children || []).map(c => ({
        tag: c.tagName,
        class: c.className
      }))
    };
  });
  
  console.log('Calendar HTML:\n', details.calendarHtml);
  console.log('\nTotals HTML:\n', details.totalsHtml);
  console.log('\nShare HTML:\n', details.shareHtml);
  console.log('\nView Buttons:\n', details.viewButtons);
  console.log('\nTable Children:\n', details.tableChildren);
  
  await browser.close();
})();
