import { chromium } from 'playwright';

async function checkEmberParents() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:4200/9a070eef-a9b4-4903-b863-d703e7768ed4/reflect/spending-breakdown', { waitUntil: 'networkidle' });

  const parents = await page.evaluate(() => {
    const el = document.querySelector('.reflect-spending-breakdown');
    if (!el) return 'NOT_FOUND';
    const chain = [];
    let cur = el;
    while (cur && cur !== document.body) {
      chain.push({
        tag: cur.tagName,
        className: cur.className,
        id: cur.id,
        overflow: getComputedStyle(cur).overflow,
        overflowY: getComputedStyle(cur).overflowY,
        height: getComputedStyle(cur).height,
        display: getComputedStyle(cur).display,
        flex: getComputedStyle(cur).flex
      });
      cur = cur.parentElement;
    }
    return chain;
  });

  console.log('Ember Parent Chain:');
  console.log(JSON.stringify(parents, null, 2));

  await browser.close();
}

checkEmberParents().catch(console.error);
