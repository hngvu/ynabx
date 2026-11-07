with open("scripts/scraper/output/ynab_assembled_app.html", "r", encoding="utf-8") as f:
    c = f.read()

# Extract budget view
b_start = c.find('id="view-budget"')
b_start = c.rfind('<div', 0, b_start)
b_end = c.find('id="view-reflect"', b_start)
b_end = c.rfind('</div>', 0, b_end)
print(f"Budget view length: {b_end - b_start}")
with open("scripts/full_assembled_budget.html", "w", encoding="utf-8") as out:
    out.write(c[b_start:b_end])

# Extract reflect view
r_start = c.find('id="view-reflect"')
r_start = c.rfind('<div', 0, r_start)
r_end = c.find('id="view-accounts"', r_start)
r_end = c.rfind('</div>', 0, r_end)
print(f"Reflect view length: {r_end - r_start}")
with open("scripts/full_assembled_reflect.html", "w", encoding="utf-8") as out:
    out.write(c[r_start:r_end])

# Extract accounts view
a_start = c.find('id="view-accounts"')
a_start = c.rfind('<div', 0, a_start)
# find closing for view-accounts
# it sits inside content div
a_end = c.find('<!-- MODAL MANAGER', a_start)
if a_end == -1:
    a_end = c.find('</main>', a_start)
print(f"Accounts view length: {a_end - a_start}")
with open("scripts/full_assembled_accounts.html", "w", encoding="utf-8") as out:
    out.write(c[a_start:a_end])
