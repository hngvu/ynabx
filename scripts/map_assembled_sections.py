with open("scripts/scraper/output/ynab_assembled_app.html", "r", encoding="utf-8") as f:
    c = f.read()

# Let's inspect where views appear
import re
for m in re.finditer(r'id="view-[^"]+"', c):
    print(m.group(0), "at index:", m.start())

# Also where modals appear
for m in re.finditer(r'<!-- (MODAL MANAGER|TOP RAPID|MAIN APP|FOOTER)', c):
    print(m.group(0), "at index:", m.start())
