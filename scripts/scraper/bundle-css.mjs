import fs from "node:fs";
import path from "node:path";

const OUTPUT_DIR = path.resolve("scripts/scraper/output");
const cssDir = path.join(OUTPUT_DIR, "css");
if (!fs.existsSync(cssDir)) {
  fs.mkdirSync(cssDir, { recursive: true });
}

async function main() {
  console.log("=== Fetching & Bundling YNAB CSS directly from dumped HTML ===");
  const budgetHtmlPath = path.join(OUTPUT_DIR, "budget", "full_page.html");
  const html = fs.readFileSync(budgetHtmlPath, "utf8");

  // Extract all <link rel="stylesheet" href="...">
  const linkMatches = [...html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["']/gi)];
  // Also check href before rel
  const linkMatches2 = [...html.matchAll(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']stylesheet["']/gi)];
  
  const urls = new Set();
  for (const m of [...linkMatches, ...linkMatches2]) {
    let href = m[1];
    if (href.startsWith("/")) {
      href = "https://app.ynab.com" + href;
    } else if (href.startsWith("//")) {
      href = "https:" + href;
    }
    urls.add(href);
  }

  console.log("Found CSS URLs:", Array.from(urls));

  let bundleText = `/* YNAB Bundled CSS */\n@import url('https://fonts.googleapis.com/css2?family=Figtree:wght@300;400;500;600;700;800;900&display=swap');\n\n`;

  for (const url of urls) {
    console.log(`Downloading: ${url} ...`);
    try {
      const resp = await fetch(url);
      if (resp.ok) {
        let css = await resp.text();
        const parsed = new URL(url);
        const filename = path.basename(parsed.pathname) || "style.css";
        
        // Fix relative font/asset URLs inside the CSS
        // e.g. url(/assets/...) -> url(https://app.ynab.com/assets/...)
        css = css.replace(/url\(\s*(['"]?)\/(?!\/)/g, "url($1https://app.ynab.com/");

        fs.writeFileSync(path.join(cssDir, filename), css, "utf8");
        bundleText += `/* --- File: ${filename} (${url}) --- */\n${css}\n\n`;
        console.log(`  ✔ Saved ${filename} (${(css.length / 1024).toFixed(1)} KB)`);
      } else {
        console.warn(`  ✖ Failed: ${resp.status}`);
      }
    } catch (err) {
      console.warn(`  ✖ Error: ${err.message}`);
    }
  }

  // Also extract inline <style> tags
  const styleMatches = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)];
  styleMatches.forEach((m, idx) => {
    let styleContent = m[1].trim();
    if (styleContent) {
      styleContent = styleContent.replace(/url\(\s*(['"]?)\/(?!\/)/g, "url($1https://app.ynab.com/");
      bundleText += `/* --- Inline Style ${idx + 1} --- */\n${styleContent}\n\n`;
    }
  });

  const bundleFile = path.join(cssDir, "all-ynab.css");
  fs.writeFileSync(bundleFile, bundleText, "utf8");
  console.log(`\n✔ Created complete CSS bundle: ${bundleFile} (${(bundleText.length / 1024).toFixed(1)} KB)`);

  // Update budget full_page.html and accounts full_page.html
  function patchHtml(filePath) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, "utf8");
    // Replace relative stylesheet links with absolute or local bundle
    if (!content.includes('<base href="https://app.ynab.com/">')) {
      content = content.replace("<head>", '<head>\n  <base href="https://app.ynab.com/">');
    }
    if (!content.includes('all-ynab.css')) {
      content = content.replace("</head>", '  <link rel="stylesheet" href="../css/all-ynab.css">\n</head>');
    }
    fs.writeFileSync(filePath, content, "utf8");
    console.log(`  ✔ Patched base href and CSS link into: ${path.basename(filePath)}`);
  }

  patchHtml(path.join(OUTPUT_DIR, "budget", "full_page.html"));
  patchHtml(path.join(OUTPUT_DIR, "accounts", "full_page.html"));

  // Generate component preview wrappers
  function createPreview(componentHtml, title) {
    return `<!DOCTYPE html>
<html lang="en" class="theme-default ynab-app">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <base href="https://app.ynab.com/">
  <title>${title} - YNAB Preview</title>
  <link rel="stylesheet" href="../css/all-ynab.css">
  <style>
    body {
      background: #f4f5f7;
      margin: 30px;
      font-family: Figtree, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    .preview-wrapper {
      max-width: 1200px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #d9dcde;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
      overflow: hidden;
    }
    .preview-header {
      background: #2c323f;
      color: #ffffff;
      padding: 10px 16px;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .preview-content {
      padding: 16px;
    }
  </style>
</head>
<body class="ynab-u">
  <div class="preview-wrapper">
    <div class="preview-header">${title}</div>
    <div class="preview-content">
      ${componentHtml}
    </div>
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
    const src = path.join(budgetDir, item.file);
    if (fs.existsSync(src)) {
      const fragment = fs.readFileSync(src, "utf8");
      const previewHtml = createPreview(fragment, item.title);
      fs.writeFileSync(path.join(budgetDir, item.file.replace(".html", "_preview.html")), previewHtml, "utf8");
      console.log(`  ✔ Created ${item.file.replace(".html", "_preview.html")}`);
    }
  }

  const accountsDir = path.join(OUTPUT_DIR, "accounts");
  const accountFiles = [
    { file: "accounts_header.html", title: "Accounts Header" },
    { file: "accounts_toolbar.html", title: "Accounts Toolbar" },
    { file: "grid_header.html", title: "Grid Header" }
  ];

  for (const item of accountFiles) {
    const src = path.join(accountsDir, item.file);
    if (fs.existsSync(src)) {
      const fragment = fs.readFileSync(src, "utf8");
      const previewHtml = createPreview(fragment, item.title);
      fs.writeFileSync(path.join(accountsDir, item.file.replace(".html", "_preview.html")), previewHtml, "utf8");
      console.log(`  ✔ Created ${item.file.replace(".html", "_preview.html")}`);
    }
  }

  console.log("\nDone!");
}

main().catch(console.error);
