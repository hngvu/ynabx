with open('scripts/scraper/output/budget/full_page.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Let's inspect the entire content div from <div class="ynab-u content"> to </div>
idx_content = html.find('<div class="ynab-u content">')
# Find where this content div ends or find inspector
idx_inspector = html.find('budget-inspector', idx_content)
print('INSPECTOR FOUND AT:', idx_inspector)
if idx_inspector != -1:
    print('BEFORE INSPECTOR:')
    print(html[idx_inspector-500:idx_inspector+1500])
