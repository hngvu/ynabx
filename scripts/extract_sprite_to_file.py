import json

with open("ynab-ember-web/index.html", "r", encoding="utf-8") as f:
    html = f.read()

# Find <div style="display:none;" ... with svg sprite
start = html.find('<svg xmlns="http://www.w3.org/2000/svg"><symbol id="icon_sprite_')
if start != -1:
    div_start = html.rfind('<div', 0, start)
    end_svg = html.find('</svg>', start)
    div_end = html.find('</div>', end_svg) + len('</div>')
    sprite_block = html[div_start:div_end]
    print(f"Extracted sprite block: {len(sprite_block)} characters")
    with open("scripts/extracted_sprite_block.html", "w", encoding="utf-8") as out:
        out.write(sprite_block)
else:
    print("Could not find sprite block!")
