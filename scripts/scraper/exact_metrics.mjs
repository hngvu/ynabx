import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const imgPath = 'file:///C:/Users/hoang/.gemini/antigravity/brain/2251b1bd-5559-4194-afea-176bd2fea0ff/.user_uploaded/media_1794038206001_89b514a0.png';
  
  await page.goto(imgPath);
  
  const metrics = await page.evaluate(async () => {
    const img = document.querySelector('img');
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    
    // Top bar (ops's Plan): scan exactly where blue ends and white content begins
    let sidebarBorderX = -1;
    for (let x = 150; x < 250; x++) {
      const p = ctx.getImageData(x, 80, 1, 1).data;
      // Blue is dark: r < 50, b > 70
      if (p[0] > 100) { // transitions to main content!
        sidebarBorderX = x;
        break;
      }
    }
    
    // Popover: scan exactly where popover starts and ends at y = 300
    let popoverLeft = -1, popoverRight = -1;
    for (let x = 0; x < 400; x++) {
      const p = ctx.getImageData(x, 300, 1, 1).data;
      if (p[0] > 250 && p[1] > 250 && p[2] > 250) {
        if (popoverLeft === -1) popoverLeft = x;
        popoverRight = x;
      }
    }
    
    return {
      sidebarBorderX,
      popoverLeft,
      popoverRight,
      sidebarWidth: sidebarBorderX,
      popoverWidth: popoverRight - popoverLeft,
      protrusion: popoverRight - sidebarBorderX
    };
  });
  
  console.log('EXACT PIXEL ANALYSIS:', JSON.stringify(metrics, null, 2));
  await browser.close();
})();
