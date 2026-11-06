with open('scripts/scraper/output/budget/full_page.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Let's find what is right between sidebar and inspector
idx_sidebar = html.find('role="navigation"')
idx_after_sidebar = html.find('</nav>', idx_sidebar)
print('AFTER NAV:')
print(html[idx_after_sidebar:idx_after_sidebar + 3000])
