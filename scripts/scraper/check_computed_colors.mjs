import { chromium } from 'playwright';

async function checkColors() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:4200/9a070eef-a9b4-4903-b863-d703e7768ed4/reflect/spending-breakdown', { waitUntil: 'networkidle' });

  const colors = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    return {
      top1: style.getPropertyValue('--reportsSpendingBreakdownTop1').trim(),
      top2: style.getPropertyValue('--reportsSpendingBreakdownTop2').trim(),
      top3: style.getPropertyValue('--reportsSpendingBreakdownTop3').trim(),
      top4: style.getPropertyValue('--reportsSpendingBreakdownTop4').trim(),
      top5: style.getPropertyValue('--reportsSpendingBreakdownTop5').trim(),
      top6: style.getPropertyValue('--reportsSpendingBreakdownTop6').trim(),
      top7: style.getPropertyValue('--reportsSpendingBreakdownTop7').trim(),
      top8: style.getPropertyValue('--reportsSpendingBreakdownTop8').trim(),
      top9: style.getPropertyValue('--reportsSpendingBreakdownTop9').trim(),
      top10: style.getPropertyValue('--reportsSpendingBreakdownTop10').trim(),
      other: style.getPropertyValue('--reportsSpendingBreakdownTopOther').trim(),
      bgEmpty: style.getPropertyValue('--backgroundGroupedPrimary').trim()
    };
  });

  console.log('Real Ember computed colors on Spending Breakdown:');
  console.log(JSON.stringify(colors, null, 2));

  await browser.close();
}

checkColors().catch(console.error);
