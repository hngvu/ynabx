import re
import json
import glob

files = [
    "desktop/dist-ynab/assets/ynab_web/assets/main-Dmb20EGn.js",
    "desktop/dist-ynab/assets/ynab_web/assets/wrapper-DkFKwf1z.js"
]

pattern = re.compile(r'block:\s*\n?\s*\'((?:[^\'\\]|\\.)*)\'', re.DOTALL)

all_templates = []
for file_path in files:
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()
    matches = pattern.findall(content)
    print(f"File {file_path}: found {len(matches)} Glimmer blocks")
    for idx, raw_block in enumerate(matches):
        if any(k in raw_block for k in [
            "ynab-grid", "register", "accounts-toolbar", "sidebar-left",
            "reports", "reflect", "spending-totals", "net-worth"
        ]):
            clean_json_str = raw_block.replace("\\'", "'").replace('\\"', '"').replace("\\\\", "\\")
            try:
                parsed = json.loads(clean_json_str)
                all_templates.append({
                    "file": file_path,
                    "idx": idx,
                    "raw_preview": raw_block[:100],
                    "ast": parsed
                })
            except Exception as e:
                pass

print(f"Total relevant templates extracted: {len(all_templates)}")
with open("scripts/all_extracted_templates.json", "w", encoding="utf-8") as out:
    json.dump(all_templates, out, indent=2)

print("Saved to scripts/all_extracted_templates.json")
