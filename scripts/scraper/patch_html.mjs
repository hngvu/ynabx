import fs from 'fs';

let html = fs.readFileSync('clone/index.html', 'utf8');
const isCRLF = html.includes('\r\n');
const nl = isCRLF ? '\r\n' : '\n';

const oldStyle = `<style>
    /* CSS overrides or custom scrollbars */
    body {
      margin: 0;
      padding: 0;
      font-family: Figtree, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      overflow: hidden;
      height: 100vh;
      width: 100vw;
      background-color: var(--theme-background, #f8f9fa);
    }
  </style>`.replace(/\n/g, nl);

const newStyle = `<style>
    /* CSS overrides or custom scrollbars */
    html, body, #root {
      margin: 0;
      padding: 0;
      font-family: Figtree, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      overflow: hidden;
      height: 100vh;
      width: 100vw;
      background-color: var(--theme-background, #f8f9fa);
    }
    .layout {
      height: 100vh !important;
      max-height: 100vh !important;
      margin-top: 0 !important;
      overflow: hidden;
    }
  </style>`.replace(/\n/g, nl);

if (html.includes(oldStyle)) {
  html = html.replace(oldStyle, newStyle);
  fs.writeFileSync('clone/index.html', html);
  console.log('Successfully updated clone/index.html styles!');
} else {
  console.log('oldStyle not matched');
}
