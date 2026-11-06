with open('desktop/src/components/BudgetWorkspace.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

# 1. Clean container inline flex styles that fight ynab.css
c = c.replace('style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%" }}', '')
c = c.replace('style={{ flex: "0 0 auto", height: "auto", overflow: "visible" }}', '')
c = c.replace('style={{ flex: "1 1 0%", minWidth: 0, height: "100%", overflowY: "auto" }}', '')
c = c.replace('style={{ display: "flex", flexDirection: "row", flex: 1, minHeight: 0, width: "100%", position: "relative", overflow: "hidden" }}', '')

# 2. Fix budget-table wrapper to match decompiled_19.hbs
# decompiled_19.hbs:
# <div class="budget-table" role="treegrid">
#   <div class="budget-table-header" role="rowgroup">
#     <div class="budget-toolbar" role="row">
#     <div class="budget-table-header-labels budget-table-row-ul" role="row">
c = c.replace('<div className="budget-table" role="grid">', '<div className="budget-table" role="treegrid">')

with open('desktop/src/components/BudgetWorkspace.tsx', 'w', encoding='utf-8') as f:
    f.write(c)

print("BUDGET WORKSPACE UPDATED TO MATCH DECOMPILED TEMPLATE")
