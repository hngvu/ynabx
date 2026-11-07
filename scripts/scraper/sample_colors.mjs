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
    
    // Top bar (ops's Plan): look at y = 80
    // Popover: look at y = 300
    // Check colors along x from 0 to 400 at y = 80, y = 300, y = 640
    const sampleY = [80, 200, 600, 650];
    const results = {};
    for (const y of sampleY) {
      const colors = [];
      for (let x = 0; x < 400; x += 10) {
        const p = ctx.getImageData(x, y, 1, 1).data;
        colors.push({ x, hex: `rgb(${p[0]},${p[1]},${p[2]})` });
      }
      results[y] = colors;
    }
    return results;
  });
  
  console.log(JSON.stringify(metrics, null, 2));
  await browser.close();
})();
