import re
import json
import os
from decompiler_v2 import decompile_stmts

files = [
    "ynab-ember-web/assets/ynab_web/assets/main-Dmb20EGn.js",
    "ynab-ember-web/assets/ynab_web/assets/wrapper-DkFKwf1z.js"
]

out_dir = "scripts/extracted_accounts_ember"
os.makedirs(out_dir, exist_ok=True)

pattern = re.compile(r'block:\s*\n?\s*\'((?:[^\'\\]|\\.)*)\',\s*\n?\s*moduleName:\s*\n?\s*\"([^\"]+)\"', re.DOTALL)

all_extracted = []

for file_path in files:
    if not os.path.exists(file_path):
        continue
    print(f"Scanning {file_path}...")
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()

    matches = pattern.findall(content)
    print(f"Found {len(matches)} block/moduleName pairs in {file_path}")

    for raw_block, mod_name in matches:
        if any(k in mod_name for k in ["account", "register"]):
            clean_json_str = raw_block.replace("\\'", "'").replace('\\"', '"').replace("\\\\", "\\")
            try:
                ast = json.loads(clean_json_str)
            except Exception as e:
                # Some may have special escapes
                try:
                    ast = json.loads(clean_json_str.encode().decode('unicode_escape'))
                except Exception as e2:
                    print(f"Error parsing JSON for {mod_name}: {e2}")
                    continue

            # Clean module filename
            base_name = mod_name.replace("/home/runner/_work/evergreen/evergreen/ynab_web/app/", "").replace("/", "_").replace(".hbs", "").replace(".gts", "")
            
            # Decompile
            stmts = ast[0] if isinstance(ast, list) and len(ast) > 0 and isinstance(ast[0], list) else ast
            symbols = ast[2] if len(ast) > 2 and isinstance(ast[2], list) else []
            hbs = decompile_stmts(stmts)

            dump_path = os.path.join(out_dir, f"{base_name}.hbs")
            with open(dump_path, "w", encoding="utf-8") as out_f:
                out_f.write(f"{{!-- Module: {mod_name} --}}\n{{!-- Symbols: {symbols} --}}\n\n" + hbs)

            all_extracted.append({
                "moduleName": mod_name,
                "file": base_name,
                "symbols": symbols,
                "ast": ast
            })

print(f"Successfully decompiled {len(all_extracted)} templates to {out_dir}")
with open("scripts/extracted_accounts_meta.json", "w", encoding="utf-8") as meta_f:
    json.dump([{"moduleName": t["moduleName"], "file": t["file"], "symbols": t["symbols"]} for t in all_extracted], meta_f, indent=2)
