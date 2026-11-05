with open("desktop/src/components/BudgetWorkspace.tsx", "r", encoding="utf-8") as f:
    text = f.read()

idx1 = text.find('<ul className="budget-table-header-labels')
idx2 = text.find('</ul>', idx1) + 5

snippet = text[idx1:idx2]
new_snippet = (
    snippet
    .replace('<ul ', '<div ')
    .replace('</ul>', '</div>')
    .replace('<li ', '<div ')
    .replace('</li>', '</div>')
)
text = text[:idx1] + new_snippet + text[idx2:]

with open("desktop/src/components/BudgetWorkspace.tsx", "w", encoding="utf-8") as f:
    f.write(text)

print("Replaced range successfully!")
