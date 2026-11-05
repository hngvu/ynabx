import re

with open("desktop/src/components/BudgetWorkspace.tsx", "r", encoding="utf-8") as f:
    text = f.read()

# Replace <ul className="budget-table-header-labels with <div className="budget-table-header-labels
text = text.replace(
    '<ul className="budget-table-header-labels budget-table-row-ul" role="row">',
    '<div className="budget-table-header-labels budget-table-row-ul" role="row">'
)
text = text.replace(
    '              </ul>\n            </div>\n\n            {/* Draggable Rows Container */}\n            <div className="budget-table-draggable">',
    '              </div>\n            </div>\n\n            {/* Draggable Rows Container */}\n            <div className="budget-table-draggable">'
)

# Replace <li className="budget-table-cell-... with <div className="budget-table-cell-...
text = re.sub(r'<li(\s+className="budget-table-cell-[^"]*")', r'<div\1', text)
text = text.replace('</li>', '</div>')

with open("desktop/src/components/BudgetWorkspace.tsx", "w", encoding="utf-8") as f:
    f.write(text)

print("BudgetWorkspace header labels successfully converted to div!")
