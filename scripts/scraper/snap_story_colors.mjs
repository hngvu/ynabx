import { chromium } from 'playwright';

async function capture() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:5174/?story=1', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '../../clone/artifacts/clone_story_new_colors.png' });
  console.log('Saved updated story screenshot: clone_story_new_colors.png');
  await browser.close();
}

capture().catch(console.error);
