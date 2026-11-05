import json

def decode_expr(expr):
    if not isinstance(expr, list):
        return str(expr)
    if not expr:
        return ""
    op = expr[0]
    try:
        if op == 30: # Path: [30, scope, [path_parts]]
            if len(expr) > 2 and isinstance(expr[2], list):
                parts = expr[2]
                return "this." + ".".join(str(p) for p in parts) if len(parts) > 0 else "this"
            return f"var_{expr[1] if len(expr)>1 else ''}"
        elif op == 29: # Concat: [29, [parts...]]
            if len(expr) > 1 and isinstance(expr[1], list):
                return "".join(decode_expr(p) for p in expr[1])
            return ""
        elif op == 52: # Ternary if: [52, cond, truthy, falsy]
            cond = decode_expr(expr[1]) if len(expr) > 1 else ""
            t = decode_expr(expr[2]) if len(expr) > 2 else ""
            f = decode_expr(expr[3]) if len(expr) > 3 else ""
            return f"{{{{if {cond} '{t}' '{f}'}}}}"
        elif op == 28: # Helper call: [28, helper, args, hash]
            h = decode_expr(expr[1]) if len(expr) > 1 else ""
            args = " ".join(decode_expr(a) for a in (expr[2] if len(expr) > 2 and expr[2] else []))
            hash_str = ""
            if len(expr) > 3 and expr[3]:
                keys = expr[3][0] if len(expr[3]) > 0 else []
                vals = expr[3][1] if len(expr[3]) > 1 else []
                hash_str = " " + " ".join(f"{k}={decode_expr(v)}" for k, v in zip(keys, vals))
            return f"({h} {args}{hash_str})".strip()
        elif op == 32:
            return f"helper_{expr[1] if len(expr)>1 else ''}"
    except Exception as e:
        return f"<expr_err_{op}>"
    return str(expr)

def decompile_stmts(statements, indent=0):
    output = []
    pad = "  " * indent
    tag_stack = []

    for item in statements:
        if not isinstance(item, list) or not item:
            continue
        op = item[0]

        try:
            if op == 1: # Dynamic content or literal text
                val = item[1] if len(item) > 1 else ""
                if isinstance(val, str):
                    text = val.strip("\r\n")
                    if text.strip():
                        output.append(f"{pad}{text.strip()}")
                elif isinstance(val, list):
                    output.append(f"{pad}{{{{{decode_expr(val)}}}}}")
            elif op == 10 or op == 11: # Open Tag
                tag = item[1] if len(item) > 1 else 0
                tag_name = "div" if tag == 0 else str(tag)
                tag_stack.append(tag_name)
                output.append(f"{pad}<{tag_name}")
            elif op == 14 or op == 24: # Static attribute [14, name, value]
                name = "class" if len(item) > 1 and item[1] == 0 else str(item[1] if len(item) > 1 else "")
                val = str(item[2] if len(item) > 2 else "")
                if output and output[-1].startswith(f"{pad}<"):
                    output[-1] += f' {name}="{val}"'
                else:
                    output.append(f"{pad}  {name}='{val}'")
            elif op == 15 or op == 16: # Dynamic attribute [16, name, expr]
                name = "class" if len(item) > 1 and item[1] == 0 else str(item[1] if len(item) > 1 else "")
                val = decode_expr(item[2]) if len(item) > 2 else ""
                if output and output[-1].startswith(f"{pad}<"):
                    output[-1] += f' {name}="{val}"'
                else:
                    output.append(f"{pad}  {name}='{val}'")
            elif op == 4: # Modifier
                args = " ".join(decode_expr(a) for a in (item[2] if len(item) > 2 and item[2] else []))
                if output and output[-1].startswith(f"{pad}<"):
                    output[-1] += f" {{{{on {args}}}}}"
            elif op == 12: # Finish tag
                if output and output[-1].startswith(f"{pad}<"):
                    output[-1] += ">"
            elif op == 13: # Close tag
                if tag_stack:
                    closed = tag_stack.pop()
                    output.append(f"{pad}</{closed}>")
            elif op == 8: # Component invocation
                comp = decode_expr(item[1]) if len(item) > 1 else ""
                props = []
                if len(item) > 3 and item[3]:
                    keys = item[3][0] if len(item[3]) > 0 else []
                    vals = item[3][1] if len(item[3]) > 1 else []
                    for k, v in zip(keys, vals):
                        props.append(f"{k}='{decode_expr(v)}'")
                prop_str = " ".join(props)
                output.append(f"{pad}<{comp} {prop_str} />")
            elif op == 41: # If
                cond = decode_expr(item[1]) if len(item) > 1 else ""
                output.append(f"{pad}{{{{if {cond}}}}}")
                if len(item) > 2 and item[2]:
                    inner = item[2][0] if isinstance(item[2], list) and len(item[2]) > 0 and isinstance(item[2][0], list) else item[2]
                    output.append(decompile_stmts(inner, indent + 1))
                if len(item) > 3 and item[3]:
                    output.append(f"{pad}{{{{else}}}}")
                    inner_else = item[3][0] if isinstance(item[3], list) and len(item[3]) > 0 and isinstance(item[3][0], list) else item[3]
                    output.append(decompile_stmts(inner_else, indent + 1))
                output.append(f"{pad}{{{{/if}}}}")
            elif op == 42: # Each
                iterable = decode_expr(item[1]) if len(item) > 1 else ""
                output.append(f"{pad}{{{{each {iterable} as |item|}}}}")
                if len(item) > 2 and item[2]:
                    inner_each = item[2][0] if isinstance(item[2], list) and len(item[2]) > 0 and isinstance(item[2][0], list) else item[2]
                    output.append(decompile_stmts(inner_each, indent + 1))
                output.append(f"{pad}{{{{/each}}}}")
        except Exception as e:
            output.append(f"{pad}<!-- error decompiling op {op}: {e} -->")

    return "\n".join(output)

with open("scripts/budget_templates_extracted.json", "r", encoding="utf-8") as f:
    templates = json.load(f)

for t in templates:
    ast = t["ast"]
    stmts = ast[0] if isinstance(ast, list) and len(ast) > 0 and isinstance(ast[0], list) else ast
    hbs = decompile_stmts(stmts)
    idx = t["idx"]
    with open(f"scripts/decompiled_{idx}.hbs", "w", encoding="utf-8") as out:
        out.write(hbs)

print("Decompiled all templates successfully!")
