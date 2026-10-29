import { getBrowserContext } from "./browser-context.mjs";
import readline from "node:readline";

async function main() {
  console.log("=== YNAB Scraper: Login & Session Initialization ===");
  console.log("Starting browser session...");

  const { context, page, isCDP } = await getBrowserContext({ headless: false });

  console.log("Navigating to https://app.ynab.com ...");
  await page.goto("https://app.ynab.com", { waitUntil: "domcontentloaded" });

  console.log("\n------------------------------------------------------------");
  console.log(">> Vui lòng đăng nhập vào YNAB trên cửa sổ trình duyệt vừa mở.");
  console.log(">> Đang chờ đăng nhập (chờ URL chứa '/budget' hoặc sidebar)...");
  console.log("------------------------------------------------------------\n");

  try {
    // Wait until logged in (either budget page loads, or nav element appears)
    await Promise.race([
      page.waitForURL(/app\.ynab\.com\/[a-f0-9-]+\/(budget|accounts)/i, { timeout: 300000 }),
      page.waitForSelector(".nav-main, .budget-header, .budget-toolbar", { timeout: 300000 })
    ]);

    const currentUrl = page.url();
    console.log(`\n✔ Đăng nhập thành công! Trang hiện tại: ${currentUrl}`);
    console.log("✔ Profile và cookies đã được lưu tự động trong .user-data.");
    console.log("Bây giờ bạn có thể chạy các lệnh dump tài nguyên như: npm run dump:budget, npm run dump:accounts\n");
  } catch (err) {
    console.log("\nChưa phát hiện tự động hoặc timeout:", err.message);
    console.log("Nếu bạn đã đăng nhập xong, nhấn Enter tại terminal này để hoàn tất.");
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    await new Promise((resolve) => rl.question("", () => { rl.close(); resolve(); }));
  }

  if (!isCDP) {
    await context.close();
    console.log("Đã đóng trình duyệt.");
  }
}

main().catch((err) => {
  console.error("Lỗi:", err);
  process.exit(1);
});
