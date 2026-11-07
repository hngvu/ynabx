with open("scripts/scraper/output/ynab_assembled_app.html", "r", encoding="utf-8") as f:
    c = f.read()

idx_demo = c.find('id="demo-toolbar"')
print("Found demo toolbar at:", idx_demo)

# Find where the demo toolbar ends
idx_demo_end = c.find('</div>\n  </div>', idx_demo)
if idx_demo_end == -1:
    idx_demo_end = c.find('</nav>', idx_demo)
print("Demo toolbar ends around:", idx_demo_end)

# Let's inspect next 1000 characters
print("=== NEXT DOM AFTER DEMO TOOLBAR ===")
print(c[idx_demo_end:idx_demo_end+1000])
