import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const imgPath = 'file:///C:/Users/hoang/.gemini/antigravity/brain/2251b1bd-5559-4194-afea-176bd2fea0ff/.user_uploaded/media_1794040367111_9f7f0f6a.jpg';
  await page.goto(imgPath);
  
  const metrics = await page.evaluate(async () => {
    const img = document.querySelector('img');
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    
    // Find sidebar border at y = 50 (in header where dark blue meets white grid)
    let sidebarRight = -1;
    for (let x = 100; x < canvas.width; x++) {
      const p = ctx.getImageData(x, 50, 1, 1).data;
      if (p[0] > 100 && p[1] > 100 && p[2] > 100) { // white grid
        sidebarRight = x;
        break;
      }
    }
    
    // Find popover border at y = 200 (white popover over dark blue sidebar)
    let popoverLeft = -1, popoverRight = -1;
    for (let x = 0; x < canvas.width; x++) {
      const p = ctx.getImageData(x, 200, 1, 1).data;
      if (p[0] > 240 && p[1] > 240 && p[2] > 240) {
        if (popoverLeft === -1) popoverLeft = x;
        popoverRight = x;
      } else {
        if (popoverRight > 50) break;
      }
    }
    
    return {
      imageDimensions: { width: canvas.width, height: canvas.height },
      sidebarRight,
      popoverLeft,
      popoverRight,
      popoverWidth: popoverRight - popoverLeft,
      sidebarWidth: sidebarRight,
      marginRightToSidebar: sidebarRight - popoverRight
    };
  });
  
  console.log('MEASURED INTERNET SCREENSHOT:', JSON.stringify(metrics, null, 2));
  await browser.close();
})();
