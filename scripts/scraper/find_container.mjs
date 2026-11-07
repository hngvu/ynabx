import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto('http://localhost:4200');
  await page.waitForTimeout(3000);
  
  const res = await page.evaluate(() => {
    const app = window.__ynabapp__;
    const instance = app?.__deprecatedInstance__;
    const container = instance?.container || app?.container || (window.Ember?.Namespace?.NAMESPACES?.find(n => n.name === 'ynab_web')?.__container__);
    
    // Look in emberInspectorApps
    const inspectorApp = window.emberInspectorApps?.[0];
    const inspectorContainer = inspectorApp?.__container__ || inspectorApp?.booted && inspectorApp?.buildInstance?.().__container__;
    
    return {
      appKeys: app ? Object.keys(app) : [],
      instanceKeys: instance ? Object.keys(instance) : [],
      containerKeys: container ? Object.keys(container) : null,
      inspectorApp: !!inspectorApp,
      namespaces: window.Ember?.Namespace?.NAMESPACES?.map(n => n.name)
    };
  });
  console.log('Container search:', res);
  await browser.close();
})();
