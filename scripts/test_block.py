with open("desktop/dist-ynab/assets/ynab_web/assets/main-Dmb20EGn.js", "r", encoding="utf-8", errors="ignore") as f:
    content = f.read()

idx = content.find("budget-header-flexbox")
print("idx:", idx)
# Find 'block:' before idx
block_pos = content.rfind("block:", 0, idx)
print("block_pos:", block_pos)
print(content[block_pos-50:block_pos+100])
