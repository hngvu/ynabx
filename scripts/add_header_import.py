with open("desktop/src/components/BudgetWorkspace.tsx", "r", encoding="utf-8") as f:
    text = f.read()

if "import { BudgetHeader }" not in text:
    text = 'import { BudgetHeader } from "./BudgetHeader";\n' + text
    with open("desktop/src/components/BudgetWorkspace.tsx", "w", encoding="utf-8") as f:
        f.write(text)
    print("Added BudgetHeader import!")
else:
    print("Already imported.")
