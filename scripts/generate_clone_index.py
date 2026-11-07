with open("ynab-ember-web/index.html", "r", encoding="utf-8") as f:
    ember_html = f.read()

with open("scripts/extracted_sprite_block.html", "r", encoding="utf-8") as f:
    sprite_block = f.read()

# Build clone/index.html with exact stylesheets, Figtree font, CSS variables & sprite
clone_index = f"""<!DOCTYPE html>
<html lang="en" class="no-js mod_flexbox mod_flexwrap">
<head>
  <meta charset="utf-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Plan | YNAB Clone</title>

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="">
  <link href="https://fonts.googleapis.com/css2?family=Figtree:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" crossorigin="">

  <link rel="stylesheet" href="/csw/c.css">
  <link rel="stylesheet" href="/assets/packs/css/before_ynab_web_head-909ebd29.css">
  <link rel="stylesheet" href="/assets/ynab_web-34737bf6f3d43524e02aa494b88bb5ba28199ba46c408f4cd67c629dac364991.css">
  <link rel="stylesheet" crossorigin="" href="/assets/ynab_web/assets/main-DZaJvcyu.css">

  <style>
    /* CSS overrides or custom scrollbars */
    body {{
      margin: 0;
      padding: 0;
      font-family: Figtree, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      overflow: hidden;
      height: 100vh;
      width: 100vw;
      background-color: var(--theme-background, #f8f9fa);
    }}
  </style>
</head>
<body class="ember-application user-logged-in theme-light is-financial-plan">
  {sprite_block}
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
"""

with open("clone/index.html", "w", encoding="utf-8") as f:
    f.write(clone_index)

print("Generated clone/index.html successfully!")
