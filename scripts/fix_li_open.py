with open("desktop/src/components/BudgetWorkspace.tsx", "r", encoding="utf-8") as f:
    text = f.read()

text = text.replace(
    '                <li\n                  className="budget-table-cell-',
    '                <div\n                  className="budget-table-cell-'
)

with open("desktop/src/components/BudgetWorkspace.tsx", "w", encoding="utf-8") as f:
    f.write(text)

print("Updated all <li opening tags to <div!")
