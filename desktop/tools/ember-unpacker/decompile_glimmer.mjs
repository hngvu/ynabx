const BUILTIN_TAGS = ['div', 'span', 'p', 'a'];
const BUILTIN_ATTRS = ['class', 'id', 'value', 'name', 'type', 'style', 'href'];

function resolveTag(tagCode, upvars = []) {
  if (typeof tagCode === 'string') return tagCode;
  if (typeof tagCode === 'number') {
    return BUILTIN_TAGS[tagCode] || upvars[tagCode] || `tag_${tagCode}`;
  }
  return 'div';
}

function resolveAttr(attrCode) {
  if (typeof attrCode === 'string') return attrCode;
  if (typeof attrCode === 'number') return BUILTIN_ATTRS[attrCode] || `attr_${attrCode}`;
  return 'attr';
}

function resolveScope(scopeIdx, scopeVars, symbolRegistry, fallbackPrefix = 'scope') {
  const scopeKey = scopeVars?.[scopeIdx];
  if (scopeKey && symbolRegistry?.symbols?.[scopeKey]) {
    return symbolRegistry.symbols[scopeKey].componentName;
  }
  if (scopeKey) {
    return `${fallbackPrefix}_${scopeKey.split(':')[1] || scopeIdx}`;
  }
  return `${fallbackPrefix}_${scopeIdx}`;
}

function formatLiteral(val) {
  if (typeof val === 'string') return JSON.stringify(val);
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (val === null) return 'null';
  if (val === undefined) return 'undefined';
  return String(val);
}

function formatNamedArgs(named, ctx) {
  if (!named || !Array.isArray(named) || !Array.isArray(named[0])) return '';
  const [keys, vals] = named;
  const parts = [];
  for (let i = 0; i < keys.length; i++) {
    const v = decodeExpr(vals[i], ctx, true);
    parts.push(`${keys[i]}=${v}`);
  }
  return parts.length ? ' ' + parts.join(' ') : '';
}

function decodeExpr(expr, ctx, asArg = false) {
  if (expr === null || expr === undefined) return asArg ? 'null' : '';
  if (typeof expr === 'string' || typeof expr === 'number' || typeof expr === 'boolean') {
    return asArg ? formatLiteral(expr) : String(expr);
  }
  if (!Array.isArray(expr)) return '';

  const op = expr[0];
  switch (op) {
    case 28: {
      // Helper call: [28, callee, positional, named]
      const callee = decodeExpr(expr[1], ctx, false);
      const pos = (expr[2] || []).map((a) => decodeExpr(a, ctx, true));
      const named = formatNamedArgs(expr[3], ctx);
      const inner = [callee, ...pos].filter(Boolean).join(' ') + named;
      return asArg ? `(${inner})` : `{{${inner}}}`;
    }
    case 29: {
      // Concat: [29, [part1, part2, ...]]
      const parts = (expr[1] || []).map((p) => {
        if (typeof p === 'string') return p;
        const inner = decodeExpr(p, ctx, false);
        return inner.startsWith('{{') ? inner : `{{${inner}}}`;
      });
      const joined = parts.join('');
      return asArg ? JSON.stringify(joined) : joined;
    }
    case 30: {
      // GetSymbol / Path: [30, symIdx, pathParts]
      const root = expr[1] === 0 ? 'this' : ctx.symbols[expr[1] - 1] || `sym${expr[1]}`;
      const tail = (expr[2] || []).join('.');
      const full = tail ? `${root}.${tail}` : root;
      return asArg ? full : `{{${full}}}`;
    }
    case 31: {
      // GetFreeAsComponentOrHelper / Upvar
      const name = ctx.upvars[expr[1]] || `upvar_${expr[1]}`;
      return asArg ? name : name;
    }
    case 32: {
      // GetLexicalScope
      const name = resolveScope(expr[1], ctx.scopeVars, ctx.registry, 'scope');
      return name;
    }
    case 50: {
      // Debugger / HasBlock
      return asArg ? `(has-block ${formatLiteral(expr[1] || 'default')})` : `{{has-block}}`;
    }
    case 51: {
      // Not: [51, inner]
      const inner = decodeExpr(expr[1], ctx, true);
      return asArg ? `(not ${inner})` : `{{not ${inner}}}`;
    }
    case 52: {
      // IfInline: [52, cond, truthy, falsy]
      const cond = decodeExpr(expr[1], ctx, true);
      const t = decodeExpr(expr[2], ctx, true);
      const f = expr[3] !== undefined ? ' ' + decodeExpr(expr[3], ctx, true) : '';
      const inner = `if ${cond} ${t}${f}`;
      return asArg ? `(${inner})` : `{{${inner}}}`;
    }
    default:
      return asArg ? `/*op_${op}*/` : '';
  }
}

function formatBlockParams(params, ctx) {
  if (!Array.isArray(params) || params.length === 0) return '';
  const names = params.map((symIdx) => ctx.symbols[symIdx - 1] || `item${symIdx}`);
  return ` as |${names.join(' ')}|`;
}

function decompileStatements(stmts, ctx, depth = 0) {
  const out = [];
  let openTag = null;
  let openAttrs = [];
  const tagStack = [];

  function flushOpen() {
    if (openTag !== null) {
      const attrStr = openAttrs.length ? ' ' + openAttrs.join(' ') : '';
      out.push(`<${openTag}${attrStr}>`);
      openTag = null;
      openAttrs = [];
    }
  }

  for (const st of stmts || []) {
    if (!Array.isArray(st)) continue;
    const op = st[0];
    switch (op) {
      case 1: {
        // Append: [1, expr, isTrusting]
        flushOpen();
        const val = st[1];
        if (typeof val === 'string') {
          out.push(val);
        } else {
          const rendered = decodeExpr(val, ctx, false);
          out.push(rendered.startsWith('{{') ? rendered : `{{${rendered}}}`);
        }
        break;
      }
      case 4: {
        // Modifier: [4, callee, posArgs, namedArgs]
        const callee = decodeExpr(st[1], ctx, false);
        const pos = (st[2] || []).map((a) => decodeExpr(a, ctx, true));
        const named = formatNamedArgs(st[3], ctx);
        const modStr = `{{${[callee, ...pos].filter(Boolean).join(' ')}${named}}}`;
        openAttrs.push(modStr);
        break;
      }
      case 10: // OpenElement
      case 11: { // OpenElementWithSplat
        flushOpen();
        openTag = resolveTag(st[1], ctx.upvars);
        tagStack.push(openTag);
        openAttrs = [];
        break;
      }
      case 14: // StaticAttr
      case 24: { // StaticComponentAttr
        const name = resolveAttr(st[1]);
        const val = String(st[2] ?? '').replace(/\s+/g, ' ').trim();
        openAttrs.push(`${name}="${val}"`);
        break;
      }
      case 15: // DynamicAttr
      case 16: { // TrustingAttr / ComponentAttr
        const name = resolveAttr(st[1]);
        const val = decodeExpr(st[2], ctx, false).replace(/\s+/g, ' ').trim();
        openAttrs.push(`${name}="${val}"`);
        break;
      }
      case 17: {
        // ...attributes (splattributes)
        openAttrs.push('...attributes');
        break;
      }
      case 12: { // FlushElement
        flushOpen();
        break;
      }
      case 13: { // CloseElement
        flushOpen();
        const closed = tagStack.pop() || 'div';
        out.push(`</${closed}>`);
        break;
      }
      case 18: {
        // Yield: [18, toSym, args]
        flushOpen();
        const toName = st[1] ? ctx.symbols[st[1] - 1] : null;
        if (toName && toName !== '&default') {
          out.push(`{{yield to=${JSON.stringify(toName)}}}`);
        } else {
          out.push('{{yield}}');
        }
        break;
      }
      case 8: { // Component: [8, compExpr, attrs, args, blocks]
        flushOpen();
        const compName = decodeExpr(st[1], ctx, false);
        const compAttrs = [];

        for (const a of st[2] || []) {
          if (!Array.isArray(a)) continue;
          if (a[0] === 14 || a[0] === 24) {
            compAttrs.push(`${resolveAttr(a[1])}="${String(a[2] ?? '').replace(/\s+/g, ' ').trim()}"`);
          } else if (a[0] === 15 || a[0] === 16) {
            compAttrs.push(`${resolveAttr(a[1])}="${decodeExpr(a[2], ctx, false).replace(/\s+/g, ' ').trim()}"`);
          } else if (a[0] === 4) {
            const callee = decodeExpr(a[1], ctx, false);
            const pos = (a[2] || []).map((x) => decodeExpr(x, ctx, true));
            const named = formatNamedArgs(a[3], ctx);
            compAttrs.push(`{{${[callee, ...pos].filter(Boolean).join(' ')}${named}}}`);
          } else if (a[0] === 17) {
            compAttrs.push('...attributes');
          }
        }

        if (st[3] && Array.isArray(st[3][0])) {
          const argNames = st[3][0];
          const argVals = st[3][1] || [];
          for (let i = 0; i < argNames.length; i++) {
            const v = argVals[i];
            if (typeof v === 'string') {
              compAttrs.push(`${argNames[i]}=${JSON.stringify(v)}`);
            } else if (Array.isArray(v) && v[0] === 29) {
              compAttrs.push(`${argNames[i]}="${decodeExpr(v, ctx, false)}"`);
            } else {
              compAttrs.push(`${argNames[i]}={{${decodeExpr(v, ctx, true)}}}`);
            }
          }
        }

        const attrStr = compAttrs.length ? ' ' + compAttrs.join(' ') : '';
        const blocks = st[4];
        if (blocks && Array.isArray(blocks[1]) && blocks[1].length > 0) {
          const blockNames = blocks[0] || ['default'];
          const blockDefs = blocks[1];
          const isSingleDefault = blockNames.length === 1 && blockNames[0] === 'default';
          const defaultParams = isSingleDefault ? formatBlockParams(blockDefs[0]?.[1], ctx) : '';
          out.push(`<${compName}${attrStr}${defaultParams}>`);
          for (let bi = 0; bi < blockDefs.length; bi++) {
            const bDef = blockDefs[bi];
            const bName = blockNames[bi] || 'default';
            if (!isSingleDefault) {
              const bParams = formatBlockParams(bDef?.[1], ctx);
              out.push(`<:${bName}${bParams}>`);
            }
            if (Array.isArray(bDef) && Array.isArray(bDef[0])) {
              out.push(decompileStatements(bDef[0], ctx, depth + 1));
            }
            if (!isSingleDefault) {
              out.push(`</:${bName}>`);
            }
          }
          out.push(`</${compName}>`);
        } else {
          out.push(`<${compName}${attrStr} />`);
        }
        break;
      }
      case 41: { // If: [41, cond, truthyBlock, falsyBlock]
        flushOpen();
        const cond = decodeExpr(st[1], ctx, true);
        out.push(`{{#if ${cond}}}`);
        if (st[2] && Array.isArray(st[2][0])) {
          out.push(decompileStatements(st[2][0], ctx, depth + 1));
        }
        if (st[3] && Array.isArray(st[3][0]) && st[3][0].length > 0) {
          out.push(`{{else}}`);
          out.push(decompileStatements(st[3][0], ctx, depth + 1));
        }
        out.push(`{{/if}}`);
        break;
      }
      case 42: { // Each: [42, listExpr, key, block, elseBlock]
        flushOpen();
        const list = decodeExpr(st[1], ctx, true);
        const params = formatBlockParams(st[3]?.[1], ctx);
        out.push(`{{#each ${list}${params}}}`);
        if (st[3] && Array.isArray(st[3][0])) {
          out.push(decompileStatements(st[3][0], ctx, depth + 1));
        }
        if (st[4] && Array.isArray(st[4][0]) && st[4][0].length > 0) {
          out.push(`{{else}}`);
          out.push(decompileStatements(st[4][0], ctx, depth + 1));
        }
        out.push(`{{/each}}`);
        break;
      }
      case 43: { // With: [43, expr, block, elseBlock]
        flushOpen();
        const exprStr = decodeExpr(st[1], ctx, true);
        const params = formatBlockParams(st[2]?.[1], ctx);
        out.push(`{{#with ${exprStr}${params}}}`);
        if (st[2] && Array.isArray(st[2][0])) {
          out.push(decompileStatements(st[2][0], ctx, depth + 1));
        }
        out.push(`{{/with}}`);
        break;
      }
      case 44: { // Let: [44, exprs, block]
        flushOpen();
        const exprs = (st[1] || []).map((e) => decodeExpr(e, ctx, true)).join(' ');
        const params = formatBlockParams(st[2]?.[1], ctx);
        out.push(`{{#let ${exprs}${params}}}`);
        if (st[2] && Array.isArray(st[2][0])) {
          out.push(decompileStatements(st[2][0], ctx, depth + 1));
        }
        out.push(`{{/let}}`);
        break;
      }
      default:
        break;
    }
  }
  return out.join('');
}

export function decompileTemplate(templateEntry, symbolRegistry) {
  const parsed = JSON.parse(templateEntry.block);
  const stmts = parsed[0] || [];
  const symbols = parsed[1] || [];
  const upvars = parsed[2] || [];

  const ctx = {
    symbols,
    upvars,
    scopeVars: templateEntry.scopeVars || [],
    registry: symbolRegistry,
  };

  const hbs = decompileStatements(stmts, ctx, 0);
  return {
    moduleName: templateEntry.moduleName,
    hbs,
  };
}
