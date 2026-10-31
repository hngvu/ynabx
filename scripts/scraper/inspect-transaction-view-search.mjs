import { getBrowserContext } from './browser-context.mjs';

async function main() {
  const { context, page } = await getBrowserContext({ headless: true });
  try {
    await page.goto('https://app.ynab.com/9a070eef-a9b4-4903-b863-d703e7768ed4/accounts');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const toolbarElements = await page.evaluate(() => {
      // Find elements around toolbar, view options, search
      return Array.from(document.querySelectorAll('header, .accounts-toolbar, .ynab-grid-actions, .register-top, button, input')).map(el => ({
        tag: el.tagName,
        className: el.className,
        text: el.textContent?.trim().slice(0, 50),
        ariaLabel: el.getAttribute('aria-label'),
        title: el.getAttribute('title'),
        placeholder: el.getAttribute('placeholder'),
        role: el.getAttribute('role')
      })).filter(x => 
        (x.text && /view|setting|search|filter/i.test(x.text)) || 
        (x.ariaLabel && /view|setting|search|filter/i.test(x.ariaLabel)) ||
        (x.placeholder && /view|setting|search|filter/i.test(x.placeholder)) ||
        (x.className && /toolbar|search|view|filter/i.test(x.className))
      );
    });

    console.log('Relevant Elements:', JSON.stringify(toolbarElements, null, 2));

    // Also look for all buttons in .accounts-toolbar or register header
    const allToolbarButtons = await page.evaluate(() => {
      const container = document.querySelector('.accounts-toolbar') || document.querySelector('.register-toolbar') || document.querySelector('.ynab-grid-actions');
      if (!container) return 'No toolbar container found';
      return Array.from(container.querySelectorAll('button, input, a, div[role="button"]')).map(el => ({
        tag: el.tagName,
        className: el.className,
        text: el.textContent?.trim(),
        ariaLabel: el.getAttribute('aria-label')
      }));
    });
    console.log('Toolbar Buttons:', JSON.stringify(allToolbarButtons, null, 2));

  } finally {
    await context.close();
  }
}

main().catch(console.error);
