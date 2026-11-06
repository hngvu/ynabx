const fs = require('fs');
const html = fs.readFileSync('desktop/dist-ynab/index.html', 'utf8');
const pStart = html.indexOf('id="icon_sprite"');
const pRealStart = html.lastIndexOf('<div', pStart);
const pSvgEnd = html.indexOf('</svg>', pStart);
const pEnd = html.indexOf('</div>', pSvgEnd);
const sprite = html.substring(pRealStart, pEnd + 6);
fs.writeFileSync('desktop/public/icon_sprite_full.html', sprite);
console.log('Saved icon_sprite_full.html, length:', sprite.length);
