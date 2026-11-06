with open('scripts/scraper/output/budget/full_page.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Extract Header
idx_header_start = html.find('class="budget-header')
if idx_header_start != -1:
    idx_header_start = html.rfind('<header', 0, idx_header_start)
    idx_header_end = html.find('</header>', idx_header_start) + len('</header>')
    header_html = html[idx_header_start:idx_header_end]
    print('HEADER HTML found, length:', len(header_html))
    with open('scripts/extracted_header.html', 'w', encoding='utf-8') as f:
        f.write(header_html)

# 2. Extract Budget views / filter row
idx_views_start = html.find('class="budget-view-row"')
if idx_views_start != -1:
    idx_views_start = html.rfind('<section', 0, idx_views_start)
    idx_views_end = html.find('</section>', idx_views_start) + len('</section>')
    views_html = html[idx_views_start:idx_views_end]
    print('VIEWS HTML found, length:', len(views_html))
    with open('scripts/extracted_views.html', 'w', encoding='utf-8') as f:
        f.write(views_html)

# 3. Extract Table
idx_table_start = html.find('class="budget-table ')
if idx_table_start != -1:
    idx_table_start = html.rfind('<div', 0, idx_table_start)
    idx_table_end = html.find('</section>', idx_table_start)
    table_html = html[idx_table_start:idx_table_end]
    print('TABLE HTML found, length:', len(table_html))
    with open('scripts/extracted_table.html', 'w', encoding='utf-8') as f:
        f.write(table_html)

print('Done extracting.')
