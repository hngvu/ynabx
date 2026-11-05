import json

# Glimmer Opcode Decompiler to Handlebars (HBS)
# Glimmer Wire Format Opcode Reference:
# [1, text] -> Text
# [10, tag] -> Open Element (tag 0 is div)
# [11, tag] -> Open Component / Element
# [12] -> Finalize Element Attributes / Close Opening Tag
# [13] -> Close Element </tag>
# [14, name, value] -> Static Attribute
# [15, type, [path]] -> Dynamic Attribute
# [16, name, expr] -> Dynamic Attribute
# [24, name, value] -> Static Attribute
# [28, helper, params, hash] -> Helper invocation
# [29, parts] -> Concat expression
# [30, scope, [path]] -> Path expression (e.g. this.isNegative or var)
# [32, helperId] -> In-scope helper/component name
# [4, modifier, params, hash] -> Element modifier, e.g. {{on "click" this.foo}}
# [8, component, params, hash, block] -> Component invocation
# [41, condition, [truthy_statements], [falsy_statements]] -> If statement
# [42, iterable, [block_statements], key] -> Each loop

def decode_expr(expr):
    if not isinstance(expr, list):
        return str(expr)
    if not expr:
        return ""
    op = expr[0]
    if op == 30: # Path: [30, scope, [path_parts]]
        parts = expr[2]
        return ".".join(str(p) for p in parts)
    elif op == 29: # Concat: [29, [part1, part2, ...]]
        return "".join(decode_expr(p) for p in expr[1])
    elif op == 52: # Ternary if: [52, cond, truthy, falsy]
        cond = decode_expr(expr[1])
        t = decode_expr(expr[2])
        f = decode_expr(expr[3])
        return f"(if {cond} '{t}' '{f}')"
    elif op == 28: # Helper call: [28, helper, args, hash]
        h = decode_expr(expr[1])
        args = " ".join(decode_expr(a) for a in (expr[2] or []))
        return f"({h} {args})".strip()
    elif op == 32:
        return f"scope_{expr[1]}"
    return str(expr)

def decompile(ast, indent=0):
    output = []
    pad = "  " * indent
    if not isinstance(ast, list):
        return ""
    
    # Check if ast is the top-level [[statements], symbols, ...]
    if len(ast) >= 1 and isinstance(ast[0], list) and (len(ast) == 4 or len(ast) == 5):
        statements = ast[0]
    else:
        statements = ast

    tag_stack = []
    
    for item in statements:
        if not isinstance(item, list) or not item:
            continue
        op = item[0]
        
        if op == 1: # Text
            text = item[1].strip("\r\n")
            if text:
                output.append(f"{pad}{text}")
        elif op == 10 or op == 11: # Open Tag
            tag = item[1]
            if tag == 0:
                tag_name = "div"
            elif isinstance(tag, str):
                tag_name = tag
            else:
                tag_name = f"tag_{tag}"
            tag_stack.append(tag_name)
            output.append(f"{pad}<{tag_name}")
        elif op == 14 or op == 24: # Static attribute [14, name, value]
            name = "class" if item[1] == 0 else str(item[1])
            val = str(item[2])
            if output and output[-1].startswith(f"{pad}<"):
                output[-1] += f' {name}="{val}"'
            else:
                output.append(f"{pad}  {name}='{val}'")
        elif op == 15 or op == 16: # Dynamic attribute [16, name, expr]
            name = "class" if item[1] == 0 else str(item[1])
            val = decode_expr(item[2])
            if output and output[-1].startswith(f"{pad}<"):
                output[-1] += f' {name}={{{{ {val} }}}}'
            else:
                output.append(f"{pad}  {name}={{{{ {val} }}}}")
        elif op == 4: # Modifier [4, mod, args, hash]
            args = " ".join(decode_expr(a) for a in (item[2] or []))
            if output and output[-1].startswith(f"{pad}<"):
                output[-1] += f" {{{{on {args}}}}}"
        elif op == 12: # Finish tag opening
            if output and output[-1].startswith(f"{pad}<"):
                output[-1] += ">"
        elif op == 13: # Close Tag
            if tag_stack:
                closed = tag_stack.pop()
                output.append(f"{pad}</{closed}>")
        elif op == 8: # Component invocation [8, comp, hash_keys, hash_values, block]
            comp_name = decode_expr(item[1])
            props = []
            if len(item) > 3 and item[3]:
                # hash keys & values
                keys = item[3][0] if len(item[3]) > 0 else []
                vals = item[3][1] if len(item[3]) > 1 else []
                for k, v in zip(keys, vals):
                    props.append(f"{k}='{decode_expr(v)}'")
            prop_str = " ".join(props)
            output.append(f"{pad}<{comp_name} {prop_str} />")
        elif op == 41: # If [41, cond, truthy, falsy]
            cond = decode_expr(item[1])
            output.append(f"{pad}{{{{if {cond}}}}}")
            if len(item) > 2 and item[2]:
                output.append(decompile(item[2][0] if isinstance(item[2], list) and len(item[2])>0 and isinstance(item[2][0], list) else item[2], indent + 1))
            if len(item) > 3 and item[3]:
                output.append(f"{pad}{{{{else}}}}")
                output.append(decompile(item[3][0] if isinstance(item[3], list) and len(item[3])>0 and isinstance(item[3][0], list) else item[3], indent + 1))
            output.append(f"{pad}{{{{/if}}}}")
        elif op == 42: # Each
            iterable = decode_expr(item[1])
            output.append(f"{pad}{{{{each {iterable} as |item|}}}}")
            if len(item) > 2 and item[2]:
                output.append(decompile(item[2], indent + 1))
            output.append(f"{pad}{{{{/each}}}}")

    return "\n".join(output)

with open("scripts/budget_templates_extracted.json", "r", encoding="utf-8") as f:
    templates = json.load(f)

print(f"Decompiling {len(templates)} templates...")
for t in templates:
    hbs = decompile(t["ast"])
    idx = t["idx"]
    # check keywords in hbs
    first_few_lines = "\n".join(hbs.split("\n")[:10])
    print(f"\n================ Template #{idx} ================")
    print(first_few_lines)
    with open(f"scripts/decompiled_template_{idx}.hbs", "w", encoding="utf-8") as out:
        out.write(hbs)

print("\nDecompilation complete! Check scripts/decompiled_template_*.hbs")
