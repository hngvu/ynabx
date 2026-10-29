import { getBrowserContext, OUTPUT_DIR } from "./browser-context.mjs";
import fs from "node:fs";
import path from "node:path";

async function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function main() {
  const cssDir = path.join(OUTPUT_DIR, "css");
  await ensureDir(cssDir);

  console.log("=== Extracting and Bundling YNAB Stylesheets ===");
  const { context, page, isCDP } = await getBrowserContext({ headless: false });

  console.log("Navigating to YNAB...");
  await page.goto("https://app.ynab.com", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".nav-main, .budget-header", { timeout: 30000 });
  await page.waitForTimeout(2000);

  // 1. Get all stylesheet hrefs and inline styles
  console.log("Collecting stylesheet links...");
  const styleData = await page.evaluate(async () => {
    const results = [];
    const linkEls = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
    for (const link of linkEls) {
      const href = link.href;
      try {
        const resp = await fetch(href);
        if (resp.ok) {
          const text = await resp.text();
          results.push({ type: "link", href, text });
        } else {
          results.push({ type: "link", href, error: resp.status });
        }
      } catch (err) {
        results.push({ type: "link", href, error: err.message });
      }
    }

    const inlineStyles = Array.from(document.querySelectorAll("style"));
    inlineStyles.forEach((st, idx) => {
      const id = st.id || `inline-style-${idx + 1}`;
      results.push({ type: "inline", id, text: st.textContent });
    });

    return results;
  });

  console.log(`Found ${styleData.length} style blocks / sheets.`);
  let bundledCss = `/* YNAB Bundled CSS - Extracted via Playwright */\n\n`;

  // Add Figtree font import at the top
  bundledCss += `@import url('https://fonts.googleapis.com/css2?family=Figtree:wght@300;400;500;600;700;800;900&display=swap');\n\n`;

  for (let i = 0; i < styleData.length; i++) {
    const item = styleData[i];
    if (item.text) {
      const label = item.type === "link" ? item.href : item.id;
      bundledCss += `/* --- Source: ${label} --- */\n${item.text}\n\n`;

      // Also save individual sheet if it's a link
      if (item.type === "link") {
        const parsed = new URL(item.href);
        const basename = path.basename(parsed.pathname) || `sheet-${i + 1}.css`;
        fs.writeFileSync(path.join(cssDir, basename), item.text, "utf8");
        console.log(`  ✔ Saved individual sheet: ${basename}`);
      }
    }
  }

  const bundlePath = path.join(cssDir, "all-ynab.css");
  fs.writeFileSync(bundlePath, bundledCss, "utf8");
  console.log(`✔ Saved bundled stylesheet to:\n  ${bundlePath} (${(bundledCss.length / 1024).toFixed(1)} KB)`);

  // 2. Fix output/budget/full_page.html and output/accounts/full_page.html
  console.log("Fixing relative asset paths in dumped full_page.html files...");
  const budgetFullHtmlPath = path.join(OUTPUT_DIR, "budget", "full_page.html");
  if (fs.existsSync(budgetFullHtmlPath)) {
    let html = fs.readFileSync(budgetFullHtmlPath, "utf8");
    // Inject <base href="https://app.ynab.com/"> and local bundled CSS
    if (!html.includes('<base href="https://app.ynab.com/">')) {
      html = html.replace("<head>", '<head>\n  <base href="https://app.ynab.com/">');
    }
    // Also inject local bundled CSS link before </head>
    if (!html.includes('all-ynab.css')) {
      html = html.replace("</head>", '  <link rel="stylesheet" href="../css/all-ynab.css">\n</head>');
    }
    fs.writeFileSync(budgetFullHtmlPath, html, "utf8");
    console.log("  ✔ Updated output/budget/full_page.html with CSS links and base href");
  }

  const accountsFullHtmlPath = path.join(OUTPUT_DIR, "accounts", "full_page.html");
  if (fs.existsSync(accountsFullHtmlPath)) {
    let html = fs.readFileSync(accountsFullHtmlPath, "utf8");
    if (!html.includes('<base href="https://app.ynab.com/">')) {
      html = html.replace("<head>", '<head>\n  <base href="https://app.ynab.com/">');
    }
    if (!html.includes('all-ynab.css')) {
      html = html.replace("</head>", '  <link rel="stylesheet" href="../css/all-ynab.css">\n</head>');
    }
    fs.writeFileSync(accountsFullHtmlPath, html, "utf8");
    console.log("  ✔ Updated output/accounts/full_page.html with CSS links and base href");
  }

  // 3. Create standalone component preview HTML files
  console.log("Creating standalone component preview files...");
  function createPreviewHtml(componentHtml, title) {
    return `<!DOCTYPE html>
<html lang="en" class="theme-default ynab-app">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <base href="https://app.ynab.com/">
  <title>${title} - YNAB Component Preview</title>
  <link rel="stylesheet" href="../css/all-ynab.css">
  <style>
    body {
      background-color: var(--color-background, #f4f5f7);
      margin: 20px;
      font-family: Figtree, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    .preview-card {
      background: #ffffff;
      border: 1px solid #d9dcde;
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      margin-bottom: 24px;
    }
  </style>
</head>
<body class="ynab-u">
  <div class="preview-card">
    <h3 style="margin-top:0; color:#585d68; font-size:14px; text-transform:uppercase; letter-spacing:0.5px;">${title}</h3>
    ${componentHtml}
  </div>
</body>
</html>`;
  }

  const budgetDir = path.join(OUTPUT_DIR, "budget");
  const budgetFiles = [
    { file: "budget_header.html", title: "Budget Header" },
    { file: "ready_to_assign_banner.html", title: "Ready To Assign Banner" },
    { file: "sample_category_row.html", title: "Sample Category Row" },
    { file: "sample_master_category_row.html", title: "Sample Master Category Row" },
    { file: "budget_inspector.html", title: "Budget Inspector" },
    { file: "sidebar.html", title: "Sidebar Navigation" }
  ];

  for (const item of budgetFiles) {
    const srcPath = path.join(budgetDir, item.file);
    if (fs.existsSync(srcPath)) {
      const fragment = fs.readFileSync(srcPath, "utf8");
      const previewHtml = createPreviewHtml(fragment, item.title);
      const outPreview = path.join(budgetDir, item.file.replace(".html", "_preview.html"));
      fs.writeFileSync(outPreview, previewHtml, "utf8");
    }
  }
  console.log("  ✔ Generated *_preview.html files in output/budget/");

  if (!isCDP) {
    await context.close();
  }

  console.log("\n✔ Hoàn tất trích xuất và xử lý CSS!");
}

main().catch((err) => {
  console.error("Lỗi:", err);
  process.exit(1);
});
