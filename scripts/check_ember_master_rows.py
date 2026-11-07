with open("scripts/scraper/output/ember_route_budget.html", "r", encoding="utf-8") as f:
    text = f.read()

import re
rows = re.findall(r'<div id="ember[0-9]+" draggable="true" class="budget-table-row js-budget-table-row budget-table-row-ul is-master-category"[^>]*>[\s\S]*?class="budget-table-cell-name budget-table-row-li"[^>]*>([\s\S]*?)</div>', text)
for r in rows:
    clean = re.sub(r'<[^>]+>', '', r).strip()
    print("Master category:", clean)
