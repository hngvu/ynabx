import { chromium } from 'playwright';

async function inspect() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:4200', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  console.log('Sidebar links in Ember:');
  const links = await page.locator('.sidebar-nav a, .nav-main a, button').allInnerTexts();
  console.log(links.filter(t => t.trim().length > 0));

  const reflectLink = page.locator('a[href*="reflect"], button:has-text("Reflect")').first();
  const count = await reflectLink.count();
  console.log('Reflect link count:', count);
  if (count > 0) {
    console.log('Clicking reflect link...');
    await reflectLink.click();
    await page.waitForTimeout(3000);
  } else {
    console.log('Trying direct navigation to /reflect...');
    await page.goto('http://localhost:4200/reflect', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
  }

  console.log('Current URL in Ember:', page.url());
  const hasReflect = await page.locator('.reflect-container, .reports-header, .spending-breakdown, .reflect-content').count();
  console.log('Reflect elements count:', hasReflect);

  const mainHtml = await page.locator('.scroll-wrap, .content, .layout').first().innerHTML().catch(() => 'none');
  console.log('Main snippet:', mainHtml.slice(0, 300));

  await page.screenshot({ path: '../../clone/artifacts/ember_inspect_actual.png' });
  console.log('Screenshot saved to clone/artifacts/ember_inspect_actual.png');

  await browser.close();
}

inspect().catch(console.error);
