with open("scripts/scraper/output/ynab_assembled_app.html", "r", encoding="utf-8") as f:
    c = f.read()

import re
matches = re.findall(r'id=["\']view-[^"\']+["\']', c)
print("Views found:", matches)

# Find layout-master
idx_app = c.find('class="layout')
print("Class layout found at:", idx_app)
if idx_app != -1:
    print(c[idx_app-30:idx_app+400])
