with open('scripts/extracted_table.html', 'r', encoding='utf-8') as f:
    html = f.read()

mStart = html.find('is-master-category')
if mStart != -1:
    mStart = html.rfind('<div', 0, mStart)
    with open('scripts/extracted_master_row.html', 'w', encoding='utf-8') as out:
        out.write(html[mStart:mStart + 2200])

sStart = html.find('is-sub-category')
if sStart != -1:
    sStart = html.rfind('<div', 0, sStart)
    with open('scripts/extracted_sub_row.html', 'w', encoding='utf-8') as out:
        out.write(html[sStart:sStart + 3500])

print('Saved extracted rows.')
