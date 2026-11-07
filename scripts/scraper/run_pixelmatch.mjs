import { chromium } from "playwright";
import fs from "fs";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

async function comparePages(pageEmber, pageReact, testName) {
  const emberImgPath = `output/cmp_${testName}_ember.png`;
  const reactImgPath = `output/cmp_${testName}_react.png`;
  const diffImgPath = `output/cmp_${testName}_diff.png`;

  await pageEmber.screenshot({ path: emberImgPath });
  await pageReact.screenshot({ path: reactImgPath });

  const img1 = PNG.sync.read(fs.readFileSync(emberImgPath));
  const img2 = PNG.sync.read(fs.readFileSync(reactImgPath));

  const { width, height } = img1;
  const diff = new PNG({ width, height });

  const numDiffPixels = pixelmatch(
    img1.data,
    img2.data,
    diff.data,
    width,
    height,
    { threshold: 0.1 }
  );

  fs.writeFileSync(diffImgPath, PNG.sync.write(diff));

  const totalPixels = width * height;
  const diffPercentage = ((numDiffPixels / totalPixels) * 100).toFixed(2);
  const matchPercentage = (100 - diffPercentage).toFixed(2);

  console.log(`[${testName}] Diff pixels: ${numDiffPixels} / ${totalPixels} (${diffPercentage}% diff, ${matchPercentage}% match)`);
  return { numDiffPixels, totalPixels, diffPercentage, matchPercentage, diffImgPath };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  const pageEmber = await context.newPage();
  const pageReact = await context.newPage();

  console.log("Loading Ember...");
  await pageEmber.goto("http://localhost:4200/9a070eef-a9b4-4903-b863-d703e7768ed4/budget", { waitUntil: "domcontentloaded" });
  await pageEmber.waitForTimeout(4000);

  // Hide cookies banner or floating chat widget on Ember if any to have clean diff
  await pageEmber.evaluate(() => {
    const cookie = document.querySelector("#onetrust-consent-sdk, .ot-sdk-container, .chat-widget");
    if (cookie) cookie.remove();
  });

  console.log("Loading React Clone...");
  await pageReact.goto("http://localhost:5174/", { waitUntil: "domcontentloaded" });
  await pageReact.waitForTimeout(2000);

  // 1. Compare Budget View
  console.log("=== COMPARING BUDGET VIEW ===");
  const budgetResult = await comparePages(pageEmber, pageReact, "budget");

  // 2. Compare Accounts View
  console.log("=== COMPARING ACCOUNTS VIEW ===");
  await pageEmber.click(".navlink-accounts a");
  await pageReact.click(".navlink-accounts a");
  await pageEmber.waitForTimeout(2000);
  await pageReact.waitForTimeout(1000);
  const accountsResult = await comparePages(pageEmber, pageReact, "accounts");

  await browser.close();
  console.log("Playwright pixelmatch finished!");
}

main().catch(console.error);
