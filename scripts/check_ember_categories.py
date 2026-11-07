with open("scripts/scraper/output/ember_route_budget.html", "r", encoding="utf-8") as f:
    text = f.read()

import re
subcats = re.findall(r'<button title="([^"]+)">\1</button>', text)
print("Subcategories in Ember:", subcats)

masters = re.findall(r'class="budget-table-cell-edit-category">([^<]+)</button>', text)
print("Master categories in Ember:", masters)
