with open('scripts/scraper/output/budget/full_page.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Let's inspect the entire DOM wrapper around budget-header and budget-table
body_start = html.find('<body')
main_content = html[body_start:body_start+30000]
print(main_content[:2000])
