import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto('http://localhost:4200/9a070eef-a9b4-4903-b863-d703e7768ed4/budget');
  await page.waitForTimeout(3000);
  
  const tableData = await page.evaluate(() => {
    const tableHeader = document.querySelector('.budget-table-header')?.outerHTML;
    const groups = Array.from(document.querySelectorAll('.budget-table-row-group')).map(g => {
      const headerRow = g.querySelector('.budget-table-row-ul');
      const subRows = Array.from(g.querySelectorAll('.budget-table-row:not(.budget-table-row-ul)')).map(r => ({
        class: r.className,
        entityId: r.getAttribute('data-entity-id'),
        name: r.querySelector('.budget-table-cell-name')?.innerText.trim(),
        assigned: r.querySelector('.budget-table-cell-budgeted')?.innerText.trim(),
        activity: r.querySelector('.budget-table-cell-activity')?.innerText.trim(),
        available: r.querySelector('.budget-table-cell-available')?.innerText.trim(),
      }));
      return {
        groupName: headerRow?.querySelector('.budget-table-cell-name')?.innerText.trim(),
        assigned: headerRow?.querySelector('.budget-table-cell-budgeted')?.innerText.trim(),
        activity: headerRow?.querySelector('.budget-table-cell-activity')?.innerText.trim(),
        available: headerRow?.querySelector('.budget-table-cell-available')?.innerText.trim(),
        subRows
      };
    });
    
    const inspectorHtml = document.querySelector('.budget-inspector-content')?.outerHTML;
    
    return {
      tableHeader,
      groups,
      inspectorHtml
    };
  });
  
  console.log('TABLE HEADER:\n', tableData.tableHeader);
  console.log('\nGROUPS COUNT:', tableData.groups.length);
  console.log('FIRST 3 GROUPS:', JSON.stringify(tableData.groups.slice(0, 3), null, 2));
  console.log('\nINSPECTOR HTML (first 1000 chars):\n', tableData.inspectorHtml?.slice(0, 1000));
  
  await browser.close();
})();
