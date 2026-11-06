with open('scripts/extracted_table.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Let's inspect the header toolbar and labels in extracted_table.html
idx_draggable = html.find('budget-table-draggable')
print('TABLE HEADER SNIPPET:')
print(html[:idx_draggable+50])
