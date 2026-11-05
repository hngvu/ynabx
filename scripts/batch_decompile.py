import json
from decompiler_v2 import decompile_stmts

with open("scripts/all_extracted_templates.json", "r", encoding="utf-8") as f:
    templates = json.load(f)

print(f"Decompiling {len(templates)} templates...")

categorized = {
    "register": [],
    "reports": [],
    "sidebar": []
}

for i, t in enumerate(templates):
    ast = t["ast"]
    stmts = ast[0] if isinstance(ast, list) and len(ast) > 0 and isinstance(ast[0], list) else ast
    hbs = decompile_stmts(stmts)
    f_name = t["file"].split("/")[-1].split("\\")[-1]
    idx = t["idx"]
    target_name = f"scripts/decompiled_{f_name}_{idx}.hbs"
    with open(target_name, "w", encoding="utf-8") as out:
        out.write(hbs)
    
    if any(k in hbs for k in ["ynab-grid", "register", "accounts-toolbar"]):
        categorized["register"].append((target_name, hbs[:200]))
    elif any(k in hbs for k in ["reports", "reflect", "spending", "net-worth"]):
        categorized["reports"].append((target_name, hbs[:200]))
    elif "sidebar" in hbs:
        categorized["sidebar"].append((target_name, hbs[:200]))

print(f"Register templates: {len(categorized['register'])}")
print(f"Reports templates: {len(categorized['reports'])}")
print(f"Sidebar templates: {len(categorized['sidebar'])}")
