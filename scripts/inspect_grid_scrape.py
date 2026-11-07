with open("scripts/scraper/output/ember_route_accounts.html", "r", encoding="utf-8") as f:
    text = f.read()

idx_grid = text.find('ynab-grid-header')
print("ynab-grid-header at:", idx_grid)
if idx_grid != -1:
    print(text[idx_grid-40:idx_grid+2000])
