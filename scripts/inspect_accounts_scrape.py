with open("scripts/scraper/output/ember_route_accounts.html", "r", encoding="utf-8") as f:
    text = f.read()

# Let's find register header and toolbar
idx = text.find('accounts-header')
print("accounts-header at:", idx)
if idx != -1:
    print(text[idx-40:idx+1500])

idx_tb = text.find('accounts-toolbar')
print("accounts-toolbar at:", idx_tb)
if idx_tb != -1:
    print(text[idx_tb-40:idx_tb+1500])
