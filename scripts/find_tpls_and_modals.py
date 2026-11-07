with open("scripts/scraper/output/ynab_assembled_app.html", "r", encoding="utf-8") as f:
    c = f.read()

import re
matches = re.findall(r'id=["\'](tpl-[^"\']+)["\']', c)
print("Found templates:", matches)

# Also check all modal IDs
modals = re.findall(r'id=["\']modal-([^"\']+)["\']', c)
print("Found modals:", modals)
