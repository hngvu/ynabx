with open("scripts/scraper/output/ember_route_budget.html", "r", encoding="utf-8") as f:
    text = f.read()

import re
# Find all accounts in sidebar
accs = re.findall(r'<div class="nav-account-name user-data" title="([^"]+)">', text)
print("Accounts in Ember sidebar:", accs)

# Find account types (CASH, CREDIT, TRACKING)
groups = re.findall(r'<button class="nav-account-name nav-account-name-button user-data"[^>]*>[\s\S]*?<div>([^<]+)</div>', text)
print("Account groups in Ember sidebar:", groups)
