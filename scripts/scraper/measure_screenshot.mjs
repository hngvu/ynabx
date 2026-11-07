import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const imgPath = 'file:///C:/Users/hoang/.gemini/antigravity/brain/2251b1bd-5559-4194-afea-176bd2fea0ff/.user_uploaded/media_1794038206001_89b514a0.png';
  
  await page.goto(imgPath);
  
  // Measure exact pixel coordinates in user's screenshot
  const metrics = await page.evaluate(async () => {
    const img = document.querySelector('img');
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    
    // Look at a row around y = 100 to find:
    // 1. Where does the dark blue sidebar start and end?
    // 2. Where does the white menu popover start and end?
    const yScan = 200; // y = 200 is inside the white popover
    const row = ctx.getImageData(0, yScan, canvas.width, 1).data;
    
    // Also scan y = 900 or near bottom below popover (y = 800) to find sidebar width
    const yBottom = canvas.height - 20; // below popover
    const bottomRow = ctx.getImageData(0, yBottom, canvas.width, 1).data;
    
    // Let's measure white popover on yScan
    let popoverLeft = -1, popoverRight = -1;
    for (let x = 0; x < canvas.width; x++) {
      const r = row[x * 4];
      const g = row[x * 4 + 1];
      const b = row[x * 4 + 2];
      // popover is white / near white (r > 240, g > 240, b > 240)
      if (r > 240 && g > 240 && b > 240) {
        if (popoverLeft === -1) popoverLeft = x;
        popoverRight = x;
      }
    }
    
    // Let's measure sidebar on bottomRow (dark blue background)
    // Dark blue: r around 30-50, g around 40-70, b around 80-130
    let sidebarLeft = 0, sidebarRight = -1;
    for (let x = 0; x < canvas.width; x++) {
      const r = bottomRow[x * 4];
      const g = bottomRow[x * 4 + 1];
      const b = bottomRow[x * 4 + 2];
      // check if it's sidebar color (not white/light background of main content)
      if (b > 60 && r < 50) {
        sidebarRight = x;
      } else {
        if (sidebarRight > 50) break; // found sidebar boundary!
      }
    }
    
    // Also scan top header trigger button at y = 80
    const topRow = ctx.getImageData(0, 80, canvas.width, 1).data;
    let triggerLeft = -1, triggerRight = -1;
    for (let x = 0; x < 350; x++) {
      const r = topRow[x * 4];
      const g = topRow[x * 4 + 1];
      const b = topRow[x * 4 + 2];
      // top header button is blue
      if (b > 60 && r < 50) {
        triggerRight = x;
      }
    }
    
    return {
      imageDimensions: { width: canvas.width, height: canvas.height },
      popover: {
        left: popoverLeft,
        right: popoverRight,
        width: popoverRight - popoverLeft
      },
      sidebarAtBottom: {
        left: sidebarLeft,
        right: sidebarRight,
        width: sidebarRight
      }
    };
  });
  
  console.log('MEASURED PIXELS FROM USER SCREENSHOT:', JSON.stringify(metrics, null, 2));
  await browser.close();
})();
