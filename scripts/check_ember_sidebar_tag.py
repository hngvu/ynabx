with open("scripts/scraper/output/ember_route_budget.html", "r", encoding="utf-8") as f:
    text = f.read()

import re
sb = re.search(r'<nav[^>]*class="[^"]*sidebar[^"]*"[^>]*>', text)
print("Sidebar tag:", sb.group(0) if sb else "Not found")

# Check Ready to assign HTML
rta = re.search(r'<div class="to-be-budgeted[^"]*"[^>]*>[\s\S]*?</div>\s*</div>\s*</div>', text)
print("RTA snippet:")
print(text[text.find('class="to-be-budgeted'):text.find('class="to-be-budgeted')+600])
