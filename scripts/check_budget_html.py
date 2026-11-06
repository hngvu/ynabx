
import re
with open('scripts/scraper/output/budget/full_page.html', 'r', encoding='utf-8') as f:
    html = f.read()
idx = html.find('budget-header')
print('budget-header idx:', idx)
if idx != -1:
    print(html[idx-30:idx+600])

idx2 = html.find('budget-table-and-inspector')
print('budget-table-and-inspector idx:', idx2)
if idx2 != -1:
    print(html[idx2-30:idx2+600])
