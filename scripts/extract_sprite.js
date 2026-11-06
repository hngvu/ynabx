const fs = require('fs');
const html = fs.readFileSync('scripts/extracted_table.html', 'utf8');
const pStart = html.indexOf('id="icon_sprite"');
const pRealStart = html.lastIndexOf('<div', pStart);
const pEnd = html.indexOf('</svg>\n</div>', pRealStart);
const sprite = html.substring(pRealStart, pEnd + 13);
fs.writeFileSync('desktop/public/icon_sprite.html', sprite);
console.log('Saved desktop/public/icon_sprite.html, length:', sprite.length);
