import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const imgPath = 'file:///C:/Users/hoang/.gemini/antigravity/brain/2251b1bd-5559-4194-afea-176bd2fea0ff/.user_uploaded/media_1794038206001_89b514a0.png';
  await page.goto(imgPath);
  
  const scan = await page.evaluate(async () => {
    const img = document.querySelector('img');
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    
    // Look at scrollbar thumb at x around 300-330
    // Scrollbar is visible vertically! Where is the scrollbar thumb in the screenshot?
    const scrollbarScan = [];
    for (let x = 250; x < 350; x += 2) {
      const p = ctx.getImageData(x, 250, 1, 1).data;
      scrollbarScan.push({ x, rgb: `${p[0]},${p[1]},${p[2]}` });
    }
    return scrollbarScan;
  });
  
  // Find where gray thumb is (thumb is gray: r ~150-180)
  console.log(scan.filter(s => {
    const [r, g, b] = s.rgb.split(',').map(Number);
    return Math.abs(r - g) < 5 && Math.abs(g - b) < 5 && r < 200 && r > 100;
  }));
  await browser.close();
})();
