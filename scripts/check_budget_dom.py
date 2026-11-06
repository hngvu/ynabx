with open('scripts/scraper/output/budget/full_page.html', 'r', encoding='utf-8') as f:
    html = f.read()

body_start = html.find('<body')
idx = html.find('budget-header', body_start)
print('budget-header in body idx:', idx)
if idx != -1:
    print('--- HEADER ---')
    print(html[idx-20:idx+800])

idx_table = html.find('budget-table', body_start)
print('budget-table in body idx:', idx_table)
if idx_table != -1:
    print('--- TABLE ---')
    print(html[idx_table-20:idx_table+1500])
