import { chromium } from 'playwright';
import fs from 'fs';

async function testClick() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto('http://localhost:4200/9a070eef-a9b4-4903-b863-d703e7768ed4/budget', { waitUntil: 'networkidle' });

  // 1. Click user button
  console.log('Clicking button.sidebar-nav-menu-budget...');
  await page.click('button.sidebar-nav-menu-budget');
  await page.waitForTimeout(1000);

  // Take screenshot
  await page.screenshot({ path: 'output/click_plan_menu.png' });

  // Check what was added to DOM
  const popoverInfo = await page.evaluate(() => {
    // Look at last children of body or elements with high z-index
    const elements = Array.from(document.querySelectorAll('body > *'));
    return elements.map(el => ({
      tag: el.tagName,
      id: el.id,
      className: el.className
    }));
  });
  console.log('Body direct children after click:', popoverInfo);

  // Look for any newly visible popup / menu / dropdown
  const openMenus = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('*'));
    return all
      .filter(el => {
        const style = window.getComputedStyle(el);
        return style.position === 'absolute' || style.position === 'fixed';
      })
      .filter(el => {
        const rect = el.getBoundingClientRect();
        return rect.width > 50 && rect.height > 50 && rect.top >= 0 && rect.left >= 0 && rect.top < 800;
      })
      .map(el => ({
        tag: el.tagName,
        className: el.className,
        rect: el.getBoundingClientRect(),
        text: el.innerText.slice(0, 100)
      }));
  });
  console.log('Absolute/fixed elements:', openMenus);

  await browser.close();
}
testClick();
