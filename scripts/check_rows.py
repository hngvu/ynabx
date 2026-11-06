with open('scripts/scraper/output/budget/full_page.html', 'r', encoding='utf-8') as f:
    html = f.read()

body_start = html.find('<body')
idx_sub = html.find('is-sub-category', body_start)
sub_html = html[idx_sub+2500:idx_sub+4500]
with open('scripts/sample_sub_row_end.html', 'w', encoding='utf-8') as f_out:
    f_out.write(sub_html)
print('Wrote sample_sub_row_end.html successfully, length:', len(sub_html))
