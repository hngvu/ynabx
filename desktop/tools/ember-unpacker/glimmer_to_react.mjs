import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '@babel/parser';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../../..');
const EMBER_APP = path.join(REPO, 'unminified/ember_app');
const REACT_APP = path.join(REPO, 'unminified/react_app');
const REGISTRY_PATH = path.join(EMBER_APP, 'symbol_registry.json');

const BUILTIN_TAGS = ['div', 'span', 'p', 'a'];
const BUILTIN_ATTRS = ['class', 'id', 'value', 'name', 'type', 'style', 'href'];
const VOID_TAGS = new Set(['input', 'img', 'br', 'hr', 'meta', 'link', 'use', 'path', 'circle', 'rect', 'line', 'source', 'wbr']);
const NUMERIC_ATTRS = new Set(['tabIndex', 'maxLength', 'minLength', 'colSpan', 'rowSpan', 'rows', 'cols', 'size', 'start', 'span', 'aria-colindex', 'aria-rowindex', 'aria-level', 'aria-posinset', 'aria-setsize', 'aria-valuenow', 'aria-valuemin', 'aria-valuemax']);
const BOOLEAN_ATTRS = new Set(['disabled', 'checked', 'readOnly', 'required', 'autoFocus', 'autoPlay', 'multiple', 'selected', 'hidden', 'playsInline', 'controls', 'loop', 'muted']);

const ATTR_MAP = {
  class: 'className',
  for: 'htmlFor',
  tabindex: 'tabIndex',
  readonly: 'readOnly',
  maxlength: 'maxLength',
  minlength: 'minLength',
  colspan: 'colSpan',
  rowspan: 'rowSpan',
  autocomplete: 'autoComplete',
  autofocus: 'autoFocus',
  autoplay: 'autoPlay',
  playsinline: 'playsInline',
  spellcheck: 'spellCheck',
  novalidate: 'noValidate',
  contenteditable: 'contentEditable',
  crossorigin: 'crossOrigin',
  srcset: 'srcSet',
  'stroke-width': 'strokeWidth',
  'stroke-linecap': 'strokeLinecap',
  'stroke-linejoin': 'strokeLinejoin',
  'fill-rule': 'fillRule',
  'clip-rule': 'clipRule',
  viewbox: 'viewBox',
};

const EVENT_MAP = {
  click: 'onClick',
  dblclick: 'onDoubleClick',
  contextmenu: 'onContextMenu',
  input: 'onInput',
  change: 'onChange',
  keydown: 'onKeyDown',
  keyup: 'onKeyUp',
  keypress: 'onKeyPress',
  focus: 'onFocus',
  focusin: 'onFocus',
  focusout: 'onBlur',
  blur: 'onBlur',
  submit: 'onSubmit',
  mouseenter: 'onMouseEnter',
  mouseleave: 'onMouseLeave',
  mousedown: 'onMouseDown',
  mouseup: 'onMouseUp',
  scroll: 'onScroll',
};

function sanitizeIdent(name) {
  let clean = String(name || 'Unknown').replace(/[^A-Za-z0-9_$]/g, '_');
  if (/^[0-9]/.test(clean)) clean = '_' + clean;
  return clean || 'Unknown';
}

function resolveTag(tagCode, upvars = []) {
  if (typeof tagCode === 'string') return tagCode;
  if (typeof tagCode === 'number') return BUILTIN_TAGS[tagCode] || upvars[tagCode] || 'div';
  return 'div';
}

function resolveAttr(attrCode) {
  const raw = typeof attrCode === 'string' ? attrCode : BUILTIN_ATTRS[attrCode] || `data-attr-${attrCode}`;
  return ATTR_MAP[raw] || raw;
}

function resolveScopeMeta(scopeIdx, ctx) {
  const scopeKey = ctx.scopeVars?.[scopeIdx];
  if (scopeKey && ctx.registry?.symbols?.[scopeKey]) {
    return ctx.registry.symbols[scopeKey];
  }
  return null;
}

function resolveExpr(expr, ctx) {
  if (expr === null) return 'null';
  if (expr === undefined) return 'undefined';
  if (typeof expr === 'string') return JSON.stringify(expr);
  if (typeof expr === 'number' || typeof expr === 'boolean') return String(expr);
  if (!Array.isArray(expr)) return 'undefined';

  const op = expr[0];
  switch (op) {
    case 28: {
      // Helper call: [28, callee, posArgs, namedArgs]
      const callee = resolveExpr(expr[1], ctx);
      const pos = (expr[2] || []).map((a) => resolveExpr(a, ctx));
      const named = expr[3];
      let namedObj = '';
      if (named && Array.isArray(named) && Array.isArray(named[0]) && named[0].length > 0) {
        const pairs = named[0].map((k, i) => `${JSON.stringify(k)}: ${resolveExpr(named[1][i], ctx)}`);
        namedObj = `{ ${pairs.join(', ')} }`;
      }
      const helperName = callee.replace(/^scope_/, '');
      if (helperName === 'not' || helperName === 'mo') {
        return `!(${pos[0] || 'false'})`;
      }
      if (helperName === 'eq') {
        return `(${pos[0]} === ${pos[1]})`;
      }
      if (helperName === 'neq') {
        return `(${pos[0]} !== ${pos[1]})`;
      }
      if (helperName === 'and') {
        return `(${pos.join(' && ')})`;
      }
      if (helperName === 'or') {
        return `(${pos.join(' || ')})`;
      }
      if (helperName === 't' || helperName === 'Ca') {
        return namedObj ? `t(${pos[0]}, ${namedObj})` : `t(${pos[0]})`;
      }
      if (helperName === 'format-currency' || helperName === 'pa') {
        return namedObj ? `formatCurrency(${pos[0]}, ${namedObj})` : `formatCurrency(${pos[0]})`;
      }
      if (helperName === 'format-date' || helperName === 'mt') {
        return `formatDate(${pos.join(', ')})`;
      }
      if (helperName === 'fn') {
        const fnExpr = pos[0] || '(() => {})';
        const boundArgs = pos.slice(1);
        return boundArgs.length ? `(..._e: any[]) => (${fnExpr})?.(${boundArgs.join(', ')}, ..._e)` : fnExpr;
      }
      if (helperName === 'hash') {
        return namedObj || '{}';
      }
      if (helperName === 'array') {
        return `[${pos.join(', ')}]`;
      }
      if (helperName === 'concat') {
        return `[${pos.join(', ')}].join("")`;
      }
      const allArgs = [...pos, ...(namedObj ? [namedObj] : [])];
      ctx.usedHelpers.add(sanitizeIdent(helperName));
      return `callHelper(${JSON.stringify(helperName)}, ${allArgs.join(', ')})`;
    }
    case 29: {
      // Concat: [29, parts]
      const parts = (expr[1] || []).map((p) => {
        if (typeof p === 'string') return p.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
        const sub = resolveExpr(p, ctx);
        return `\${${sub}}`;
      });
      return '`' + parts.join('') + '`';
    }
    case 30: {
      // GetSymbol: [30, symIdx, pathParts]
      let root;
      if (expr[1] === 0) {
        root = 'vm';
      } else {
        const sym = ctx.symbols[expr[1] - 1] || `sym${expr[1]}`;
        if (sym.startsWith('@')) {
          root = `props.${sym.slice(1)}`;
        } else {
          root = sanitizeIdent(sym);
        }
      }
      const tail = (expr[2] || []).map((p) => (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(p) ? `.${p}` : `[${JSON.stringify(p)}]`)).join('');
      // Use optional chaining for nested property paths
      if (!tail) return root;
      return `${root}${tail.replace(/\./g, '?.')}`;
    }
    case 31: {
      return JSON.stringify(ctx.upvars[expr[1]] || `upvar_${expr[1]}`);
    }
    case 32: {
      const meta = resolveScopeMeta(expr[1], ctx);
      if (meta) {
        if (meta.kind === 'component' || meta.kind === 'template-controller') {
          const name = sanitizeIdent(meta.componentName);
          ctx.usedComponents.set(name, meta);
          return name;
        }
        return meta.componentName;
      }
      const scopeKey = ctx.scopeVars?.[expr[1]] || `scope_${expr[1]}`;
      const fallbackName = `scope_${sanitizeIdent(scopeKey.split(':')[1] || expr[1])}`;
      ctx.unknownComponents.add(fallbackName);
      return fallbackName;
    }
    case 50:
      return `Boolean(props.children)`;
    case 51:
      return `!(${resolveExpr(expr[1], ctx)})`;
    case 52: {
      const cond = resolveExpr(expr[1], ctx);
      const tVal = resolveExpr(expr[2], ctx);
      const fVal = expr[3] !== undefined ? resolveExpr(expr[3], ctx) : '""';
      return `(${cond} ? ${tVal} : ${fVal})`;
    }
    default:
      return 'undefined';
  }
}

function formatTextNode(str) {
  if (!str) return '';
  if (!str.trim()) return str;
  // Escape JSX special chars {, }, <, >
  return str
    .replace(/\{/g, '{"{"}')
    .replace(/\}/g, '{"}"}')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function compileStatements(stmts, ctx) {
  const out = [];
  let openTag = null;
  let openAttrs = [];
  const tagStack = [];

  function flushOpen() {
    if (openTag !== null) {
      const attrStr = openAttrs.length ? ' ' + openAttrs.join(' ') : '';
      if (VOID_TAGS.has(openTag)) {
        out.push(`<${openTag}${attrStr} />`);
      } else {
        out.push(`<${openTag}${attrStr}>`);
      }
      openTag = null;
      openAttrs = [];
    }
  }

  function pushAttr(attrName, valueExpr, isLiteral = false) {
    if (attrName === 'style' && isLiteral) {
      // Skip raw CSS string in JSX or convert to object? For safety, use data-style or ignore static inline string if complex
      openAttrs.push(`style={parseInlineStyle(${JSON.stringify(valueExpr)})}`);
      return;
    }
    if (attrName === 'style') {
      openAttrs.push(`style={parseInlineStyle(${valueExpr})}`);
      return;
    }
    if (NUMERIC_ATTRS.has(attrName)) {
      if (isLiteral) {
        const num = Number(valueExpr);
        openAttrs.push(`${attrName}={${Number.isFinite(num) ? num : 0}}`);
      } else {
        openAttrs.push(`${attrName}={Number.isFinite(Number(${valueExpr})) ? Number(${valueExpr}) : 0}`);
      }
      return;
    }
    if (BOOLEAN_ATTRS.has(attrName)) {
      if (isLiteral) {
        openAttrs.push(`${attrName}={true}`);
      } else {
        openAttrs.push(`${attrName}={Boolean(${valueExpr})}`);
      }
      return;
    }
    if (isLiteral) {
      openAttrs.push(`${attrName}=${JSON.stringify(valueExpr)}`);
    } else {
      openAttrs.push(`${attrName}={${valueExpr}}`);
    }
  }

  for (const st of stmts || []) {
    if (!Array.isArray(st)) continue;
    const op = st[0];
    switch (op) {
      case 1: {
        flushOpen();
        if (typeof st[1] === 'string') {
          out.push(formatTextNode(st[1]));
        } else {
          out.push(`{${resolveExpr(st[1], ctx)}}`);
        }
        break;
      }
      case 4: {
        // Modifier: {{on "click" this.prevMonth}}
        const meta = st[1]?.[0] === 32 ? resolveScopeMeta(st[1][1], ctx) : null;
        const modName = meta?.componentName || '';
        const pos = st[2] || [];
        if (modName === 'on' && pos.length >= 2 && typeof pos[0] === 'string') {
          const evAttr = EVENT_MAP[pos[0]] || `on${pos[0].charAt(0).toUpperCase() + pos[0].slice(1)}`;
          const handler = resolveExpr(pos[1], ctx);
          openAttrs.push(`${evAttr}={${handler}}`);
        }
        break;
      }
      case 10:
      case 11: {
        flushOpen();
        openTag = resolveTag(st[1], ctx.upvars);
        tagStack.push(openTag);
        openAttrs = [];
        break;
      }
      case 14:
      case 24: {
        pushAttr(resolveAttr(st[1]), String(st[2] ?? ''), true);
        break;
      }
      case 15:
      case 16: {
        pushAttr(resolveAttr(st[1]), resolveExpr(st[2], ctx), false);
        break;
      }
      case 17: {
        openAttrs.push('{...attrs}');
        break;
      }
      case 12: {
        flushOpen();
        break;
      }
      case 13: {
        flushOpen();
        const closed = tagStack.pop() || 'div';
        if (!VOID_TAGS.has(closed)) {
          out.push(`</${closed}>`);
        }
        break;
      }
      case 18: {
        flushOpen();
        const toName = st[1] ? ctx.symbols[st[1] - 1] : null;
        const yieldArgs = Array.isArray(st[2]) ? st[2].map((a) => resolveExpr(a, ctx)).join(', ') : '';
        if (toName && toName !== '&default') {
          const propName = sanitizeIdent(toName);
          out.push(`{typeof props.render${propName.charAt(0).toUpperCase() + propName.slice(1)} === "function" ? props.render${propName.charAt(0).toUpperCase() + propName.slice(1)}(${yieldArgs}) : props.${propName}}`);
        } else {
          out.push(`{typeof props.renderDefault === "function" ? props.renderDefault(${yieldArgs}) : props.children}`);
        }
        break;
      }
      case 8: {
        flushOpen();
        let compName = 'EmberDynamicComponent';
        if (Array.isArray(st[1]) && st[1][0] === 32) {
          const meta = resolveScopeMeta(st[1][1], ctx);
          if (meta) {
            compName = sanitizeIdent(meta.componentName);
            ctx.usedComponents.set(compName, meta);
          } else {
            compName = `ScopeComp_${st[1][1]}`;
            ctx.unknownComponents.add(compName);
          }
        } else if (Array.isArray(st[1]) && st[1][0] === 31) {
          const up = ctx.upvars[st[1][1]] || 'div';
          if (up === 'input' || up === 'textarea') {
            compName = up;
          } else {
            compName = sanitizeIdent(up);
            ctx.unknownComponents.add(compName);
          }
        }

        const compAttrs = [];
        for (const a of st[2] || []) {
          if (!Array.isArray(a)) continue;
          if (a[0] === 14 || a[0] === 24) {
            const attrN = resolveAttr(a[1]);
            if (attrN === 'style') {
              compAttrs.push(`style={parseInlineStyle(${JSON.stringify(String(a[2] ?? ''))})}`);
            } else {
              compAttrs.push(`${attrN}=${JSON.stringify(String(a[2] ?? ''))}`);
            }
          } else if (a[0] === 15 || a[0] === 16) {
            const attrN = resolveAttr(a[1]);
            const valE = resolveExpr(a[2], ctx);
            if (attrN === 'style') {
              compAttrs.push(`style={parseInlineStyle(${valE})}`);
            } else if (attrN === 'disabled' || attrN === 'checked') {
              compAttrs.push(`${attrN}={Boolean(${valE})}`);
            } else {
              compAttrs.push(`${attrN}={${valE}}`);
            }
          } else if (a[0] === 4) {
            const meta = a[1]?.[0] === 32 ? resolveScopeMeta(a[1][1], ctx) : null;
            if (meta?.componentName === 'on' && a[2]?.length >= 2 && typeof a[2][0] === 'string') {
              const evAttr = EVENT_MAP[a[2][0]] || `on${a[2][0]}`;
              compAttrs.push(`${evAttr}={${resolveExpr(a[2][1], ctx)}}`);
            }
          } else if (a[0] === 17) {
            compAttrs.push('{...attrs}');
          }
        }

        if (st[3] && Array.isArray(st[3][0])) {
          const argNames = st[3][0];
          const argVals = st[3][1] || [];
          for (let i = 0; i < argNames.length; i++) {
            const propName = sanitizeIdent(argNames[i].replace(/^@/, ''));
            compAttrs.push(`${propName}={${resolveExpr(argVals[i], ctx)}}`);
          }
        }

        const blocks = st[4];
        if (blocks && Array.isArray(blocks[1]) && blocks[1].length > 0) {
          const blockNames = blocks[0] || ['default'];
          const blockDefs = blocks[1];
          const isSingleDefault = blockNames.length === 1 && blockNames[0] === 'default';
          if (isSingleDefault && (!blockDefs[0]?.[1] || blockDefs[0][1].length === 0)) {
            const attrStr = compAttrs.length ? ' ' + compAttrs.join(' ') : '';
            const innerJsx = compileStatements(blockDefs[0]?.[0] || [], ctx);
            out.push(`<${compName}${attrStr}>${innerJsx}</${compName}>`);
          } else {
            for (let bi = 0; bi < blockDefs.length; bi++) {
              const bDef = blockDefs[bi];
              const bName = sanitizeIdent(blockNames[bi] || 'default');
              const params = (bDef?.[1] || []).map((idx) => sanitizeIdent(ctx.symbols[idx - 1] || `item${idx}`));
              const innerJsx = compileStatements(bDef?.[0] || [], ctx);
              const propKey = bName === 'default' ? 'renderDefault' : `render${bName.charAt(0).toUpperCase() + bName.slice(1)}`;
              if (params.length > 0) {
                compAttrs.push(`${propKey}={(${params.join(', ')}) => (<>${innerJsx}</>)}`);
              } else {
                compAttrs.push(`${bName === 'default' ? 'children' : bName}={<>${innerJsx}</>}`);
              }
            }
            const attrStr = compAttrs.length ? ' ' + compAttrs.join(' ') : '';
            out.push(`<${compName}${attrStr} />`);
          }
        } else {
          const attrStr = compAttrs.length ? ' ' + compAttrs.join(' ') : '';
          out.push(`<${compName}${attrStr} />`);
        }
        break;
      }
      case 41: {
        flushOpen();
        const cond = resolveExpr(st[1], ctx);
        const tJsx = compileStatements(st[2]?.[0] || [], ctx);
        const fStmts = st[3]?.[0] || [];
        if (fStmts.length > 0) {
          const fJsx = compileStatements(fStmts, ctx);
          out.push(`{(${cond}) ? (<>${tJsx}</>) : (<>${fJsx}</>)}`);
        } else {
          out.push(`{(${cond}) ? (<>${tJsx}</>) : null}`);
        }
        break;
      }
      case 42: {
        flushOpen();
        const list = resolveExpr(st[1], ctx);
        const params = (st[3]?.[1] || []).map((idx) => sanitizeIdent(ctx.symbols[idx - 1] || `item${idx}`));
        const itemVar = params[0] || '_item';
        const idxVar = params[1] || '_idx';
        const bodyJsx = compileStatements(st[3]?.[0] || [], ctx);
        out.push(`{(${list} ?? []).map((${itemVar}, ${idxVar}) => (<React.Fragment key={${idxVar}}>${bodyJsx}</React.Fragment>))}`);
        break;
      }
      case 43: {
        flushOpen();
        const val = resolveExpr(st[1], ctx);
        const params = (st[2]?.[1] || []).map((idx) => sanitizeIdent(ctx.symbols[idx - 1] || `val${idx}`));
        const varName = params[0] || '_val';
        const bodyJsx = compileStatements(st[2]?.[0] || [], ctx);
        out.push(`{(() => { const ${varName} = ${val}; return ${varName} ? (<>${bodyJsx}</>) : null; })()}`);
        break;
      }
      case 44: {
        flushOpen();
        const vals = (st[1] || []).map((e) => resolveExpr(e, ctx));
        const params = (st[2]?.[1] || []).map((idx) => sanitizeIdent(ctx.symbols[idx - 1] || `letVal${idx}`));
        const decls = params.map((p, i) => `const ${p} = ${vals[i] ?? 'undefined'};`).join(' ');
        const bodyJsx = compileStatements(st[2]?.[0] || [], ctx);
        out.push(`{(() => { ${decls} return (<>${bodyJsx}</>); })()}`);
        break;
      }
      default:
        break;
    }
  }

  return out.join('');
}

export function transpileAllTemplates() {
  const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
  fs.mkdirSync(path.join(REACT_APP, 'src'), { recursive: true });

  let okCount = 0;
  let tsxValidCount = 0;
  const failures = [];

  for (const tpl of registry.templates) {
    try {
      const parsed = JSON.parse(tpl.block);
      const ctx = {
        symbols: parsed[1] || [],
        upvars: parsed[2] || [],
        scopeVars: tpl.scopeVars || [],
        registry,
        usedComponents: new Map(),
        unknownComponents: new Set(),
        usedHelpers: new Set(),
      };

      const jsxBody = compileStatements(parsed[0] || [], ctx);
      const relTsx = tpl.moduleName.replace(/\.(hbs|gts|gjs)$/, '.tsx');
      const outPath = path.join(REACT_APP, 'src', relTsx);
      const depth = relTsx.split('/').length - 1;
      const runtimeImport = '../'.repeat(depth) + 'ember_shim';

      const compName = sanitizeIdent(
        tpl.moduleName
          .replace(/^app\/(components|templates)\//, '')
          .replace(/\/(index)?\.(hbs|gts|gjs)$/, '')
          .split(/[\/_-]+/)
          .filter(Boolean)
          .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
          .join('')
      );

      // Compute relative imports for child components
      const importLines = [
        `import React from "react";`,
        `import { t, formatCurrency, formatDate, parseInlineStyle, callHelper, domAttrs, useEmberViewModel, EmberDynamicComponent } from "${runtimeImport}";`,
      ];

      for (const [childName, meta] of ctx.usedComponents.entries()) {
        if (childName === compName) continue;
        const childRel = meta.moduleName.replace(/\.(hbs|gts|gjs)$/, '');
        let rel = path.posix.relative(path.posix.dirname(relTsx), childRel);
        if (!rel.startsWith('.')) rel = './' + rel;
        importLines.push(`import { ${childName} } from "${rel}";`);
      }

      for (const unk of ctx.unknownComponents) {
        importLines.push(`const ${unk}: React.FC<any> = (p) => <EmberDynamicComponent name="${unk}" {...p} />;`);
      }

      const tsxSource = `${importLines.join('\n')}\n\nexport const ${compName}: React.FC<any> = ({ vm: externalVm, ...props }) => {\n  const vm = useEmberViewModel(${JSON.stringify(tpl.moduleName)}, props, externalVm);\n  const attrs = domAttrs(props);\n  return (\n    <>\n      ${jsxBody}\n    </>\n  );\n};\n\nexport default ${compName};\n`;

      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, tsxSource, 'utf8');
      okCount++;

      // Verify valid TSX syntax with Babel parser!
      parse(tsxSource, { sourceType: 'module', plugins: ['typescript', 'jsx'] });
      tsxValidCount++;
    } catch (err) {
      failures.push({ moduleName: tpl.moduleName, error: String(err.message || err) });
    }
  }

  console.log(`[glimmer_to_react] Transpiled: ${okCount}/${registry.templates.length}, Valid TSX AST: ${tsxValidCount}/${registry.templates.length}`);
  if (failures.length > 0) {
    console.log(`[glimmer_to_react] Sample failures (${failures.length}):`, failures.slice(0, 5));
  }
  return { total: registry.templates.length, okCount, tsxValidCount, failures };
}

transpileAllTemplates();
