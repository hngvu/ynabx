import re
import json

with open("desktop/dist-ynab/assets/ynab_web/assets/main-Dmb20EGn.js", "r", encoding="utf-8", errors="ignore") as f:
    content = f.read()

# Match block: followed by single quote or double quote
pattern = re.compile(r'block:\s*\n?\s*\'((?:[^\'\\]|\\.)*)\'', re.DOTALL)
matches = pattern.findall(content)
print(f"Total single-quoted Glimmer templates found: {len(matches)}")

found_budget_templates = []
for idx, raw_block in enumerate(matches):
    if any(k in raw_block for k in ["budget-header", "budget-table", "budget-inspector", "to-be-budgeted", "register-row"]):
        # unescape raw string
        clean_json_str = raw_block.replace("\\'", "'").replace('\\"', '"').replace("\\\\", "\\")
        try:
            parsed = json.loads(clean_json_str)
            found_budget_templates.append((idx, parsed))
        except Exception as e:
            # try direct json loads of json string
            pass

print(f"Parsed {len(found_budget_templates)} budget templates!")

with open("scripts/budget_templates_extracted.json", "w", encoding="utf-8") as out:
    json.dump([{"idx": t[0], "ast": t[1]} for t in found_budget_templates], out, indent=2)

print("Saved to scripts/budget_templates_extracted.json")
