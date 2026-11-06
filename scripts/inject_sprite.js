const fs = require("fs");
const sprite = fs.readFileSync("desktop/public/icon_sprite.svg", "utf8");
let html = fs.readFileSync("desktop/index.html", "utf8");

if (!html.includes('id="icon_sprite"')) {
  const injection =
    '<div id="icon_sprite" style="display:block;width:0;height:0;position:absolute;top:0;right:0;overflow:hidden" tabindex="-1">\n' +
    sprite +
    "\n</div>";
  html = html.replace('<div id="root"></div>', injection + '\n    <div id="root"></div>');
  fs.writeFileSync("desktop/index.html", html, "utf8");
  console.log("Injected SVG sprite into desktop/index.html");
} else {
  console.log("Already injected SVG sprite");
}
