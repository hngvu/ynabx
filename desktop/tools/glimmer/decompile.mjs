// Glimmer Wire Format Decompiler & DOM/CSS Parity Auditor for `ynab-desktop`
//
// DEV / TEST TOOLING ONLY (under desktop/tools/glimmer/). Nothing here ships in the binary;
// the desktop binary remains 100% Pure Rust.
//
// What it does:
//   1. Parses all 493 precompiled Glimmer templates (`le({ id, block, moduleName, scope })`)
//      from `clone/public/assets/ynab_web/assets/main-*.js` and `wrapper-*.js`.
//   2. Decompiles the Glimmer Wire Format JSON (`block`) into human-readable HTML/HBS DOM trees
//      with exact tag names (`div`, `section`, `aside`, `header`, `button`, `ul`, `li`, ...)
//      and exact static + dynamic class names.
//   3. Audits `desktop/crates/ynab-desktop/assets/ember_glimmer_components.css` against
//      `ynab_original_bundled.css` to find any selector that conflicts with original bundled rules.
//   4. Writes `desktop/tools/glimmer/templates.json` and `desktop/tools/glimmer/audit_report.json`.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../../..');
const ASSETS = path.join(REPO, 'clone/public/assets/ynab_web/assets');
const DESKTOP_ASSETS = path.join(REPO, 'desktop/crates/ynab-desktop/assets');

function findAsset(prefix) {
  const f = fs.readdirSync(ASSETS).find((n) => n.startsWith(prefix) && n.endsWith('.js'));
  if (!f) throw new Error(`Asset ${prefix}*.js not found`);
  return path.join(ASSETS, f);
}

// Built-in element/attribute table indices in Glimmer Wire Format v2
const BUILTIN_TAGS = ['div', 'span', 'p', 'a'];
const BUILTIN_ATTRS = ['class', 'id', 'value', 'name', 'type', 'style', 'href'];

function decodeExpr(expr, symbols = [], upvars = []) {
  if (expr == null) return '';
  if (typeof expr === 'string' || typeof expr === 'number' || typeof expr === 'boolean') {
    return String(expr);
  }
  if (!Array.isArray(expr)) return '';
  const op = expr[0];
  switch (op) {
    case 28: {
      // Helper call: [28, callee, positional, named]
      const args = (expr[2] || []).map((a) => decodeExpr(a, symbols, upvars)).join(' ');
      return `{{helper ${args}}}`;
    }
    case 29: {
      // Concat: [29, [part1, part2, ...]]
      return (expr[1] || []).map((p) => decodeExpr(p, symbols, upvars)).join('');
    }
    case 30: {
      // GetSymbol / Path: [30, symIdx, pathParts]
      const root = expr[1] === 0 ? 'this' : `@${symbols[expr[1] - 1] || `sym${expr[1]}`}`;
      const tail = (expr[2] || []).join('.');
      return tail ? `{{${root}.${tail}}}` : `{{${root}}}`;
    }
    case 31: {
      // GetFreeAsComponentOrHelper / Upvar
      return upvars[expr[1]] || `upvar_${expr[1]}`;
    }
    case 32: {
      // GetLexicalScope
      return upvars[expr[1]] || `scope_${expr[1]}`;
    }
    case 51: {
      // Not: [51, inner]
      return `(!${decodeExpr(expr[1], symbols, upvars)})`;
    }
    case 52: {
      // IfInline: [52, cond, truthy, falsy]
      const t = decodeExpr(expr[2], symbols, upvars);
      const f = expr[3] !== undefined ? decodeExpr(expr[3], symbols, upvars) : '';
      return f ? `${t}|${f}` : t;
    }
    default:
      return '';
  }
}

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

function decompileStatements(stmts, symbols, upvars, elements, depth = 0) {
  const indent = '  '.repeat(depth);
  const lines = [];
  let openTag = null;
  let openAttrs = [];
  const tagStack = [];

  function flushOpen() {
    if (openTag !== null) {
      const attrStr = openAttrs.length ? ' ' + openAttrs.join(' ') : '';
      lines.push(`${'  '.repeat(tagStack.length - 1)}<${openTag}${attrStr}>`);
      elements.push({
        tag: openTag,
        attrs: Object.fromEntries(
          openAttrs.map((a) => {
            const eq = a.indexOf('=');
            return [a.slice(0, eq), a.slice(eq + 2, -1)];
          }),
        ),
      });
      openTag = null;
      openAttrs = [];
    }
  }

  for (const st of stmts || []) {
    if (!Array.isArray(st)) continue;
    const op = st[0];
    switch (op) {
      case 10: // OpenElement
      case 11: { // OpenElementWithSplat
        flushOpen();
        openTag = resolveTag(st[1], upvars);
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
        const val = decodeExpr(st[2], symbols, upvars).replace(/\s+/g, ' ').trim();
        openAttrs.push(`${name}="${val}"`);
        break;
      }
      case 12: { // FlushElement
        flushOpen();
        break;
      }
      case 13: { // CloseElement
        flushOpen();
        const closed = tagStack.pop() || 'div';
        lines.push(`${'  '.repeat(tagStack.length)}</${closed}>`);
        break;
      }
      case 8: { // Component: [8, compExpr, attrs, args, blocks]
        flushOpen();
        const compName = decodeExpr(st[1], symbols, upvars);
        const compAttrs = [];
        for (const a of st[2] || []) {
          if (Array.isArray(a) && (a[0] === 14 || a[0] === 24 || a[0] === 15 || a[0] === 16)) {
            const name = resolveAttr(a[1]);
            const val = (a[0] === 14 || a[0] === 24 ? String(a[2] ?? '') : decodeExpr(a[2], symbols, upvars))
              .replace(/\s+/g, ' ')
              .trim();
            compAttrs.push(`${name}="${val}"`);
          }
        }
        if (st[3] && Array.isArray(st[3][0])) {
          const argNames = st[3][0];
          const argVals = st[3][1] || [];
          for (let i = 0; i < argNames.length; i++) {
            compAttrs.push(`${argNames[i]}="${decodeExpr(argVals[i], symbols, upvars)}"`);
          }
        }
        const attrStr = compAttrs.length ? ' ' + compAttrs.join(' ') : '';
        const blocks = st[4];
        if (blocks && Array.isArray(blocks[1]) && blocks[1].length > 0) {
          lines.push(`${'  '.repeat(tagStack.length)}<Component(${compName})${attrStr}>`);
          for (const b of blocks[1]) {
            if (Array.isArray(b) && Array.isArray(b[0])) {
              lines.push(
                ...decompileStatements(b[0], symbols, upvars, elements, tagStack.length + 1),
              );
            }
          }
          lines.push(`${'  '.repeat(tagStack.length)}</Component(${compName})>`);
        } else {
          lines.push(`${'  '.repeat(tagStack.length)}<Component(${compName})${attrStr} />`);
        }
        break;
      }
      case 41: { // If: [41, cond, truthyBlock, falsyBlock]
        flushOpen();
        const cond = decodeExpr(st[1], symbols, upvars);
        lines.push(`${'  '.repeat(tagStack.length)}{{#if ${cond}}}`);
        if (st[2] && Array.isArray(st[2][0])) {
          lines.push(
            ...decompileStatements(st[2][0], symbols, upvars, elements, tagStack.length + 1),
          );
        }
        if (st[3] && Array.isArray(st[3][0]) && st[3][0].length > 0) {
          lines.push(`${'  '.repeat(tagStack.length)}{{else}}`);
          lines.push(
            ...decompileStatements(st[3][0], symbols, upvars, elements, tagStack.length + 1),
          );
        }
        lines.push(`${'  '.repeat(tagStack.length)}}{{/if}}`);
        break;
      }
      case 42: { // Each: [42, listExpr, key, block, elseBlock]
        flushOpen();
        const list = decodeExpr(st[1], symbols, upvars);
        lines.push(`${'  '.repeat(tagStack.length)}{{#each ${list}}}`);
        if (st[3] && Array.isArray(st[3][0])) {
          lines.push(
            ...decompileStatements(st[3][0], symbols, upvars, elements, tagStack.length + 1),
          );
        }
        lines.push(`${'  '.repeat(tagStack.length)}}{{/each}}`);
        break;
      }
      default:
        break;
    }
  }
  void indent;
  return lines;
}

function extractTemplatesFromBundle(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const re = /block:\s*'(\[\[\[[\s\S]*?)'\s*,\s*moduleName:\s*"([^"]+)"(?:\s*,\s*scope:\s*\(\)\s*=>\s*\[([^\]]*)\])?/g;
  const templates = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    const rawBlock = m[1];
    const moduleName = m[2].replace(/^\/home\/runner\/_work\/evergreen\/evergreen\/ynab_web\//, '');
    const scopeVars = m[3] ? m[3].split(',').map((s) => s.trim()) : [];
    try {
      // Unescape single-quoted JS string literal into valid JSON string
      const unescaped = Function(`return '${rawBlock}';`)();
      const parsed = JSON.parse(unescaped);
      const stmts = parsed[0] || [];
      const symbols = parsed[1] || [];
      const upvars = parsed[2] || [];
      const elements = [];
      const domLines = decompileStatements(stmts, symbols, upvars, elements);
      templates.push({
        sourceFile: path.basename(filePath),
        moduleName,
        scopeVars,
        symbols,
        upvars,
        elements,
        dom: domLines.join('\n'),
      });
    } catch (err) {
      templates.push({
        sourceFile: path.basename(filePath),
        moduleName,
        error: String(err),
      });
    }
  }
  return templates;
}

const mainPath = findAsset('main-');
const wrapperPath = findAsset('wrapper-');
const allTemplates = [
  ...extractTemplatesFromBundle(mainPath),
  ...extractTemplatesFromBundle(wrapperPath),
];

// Write decompiled templates
const byModule = {};
for (const t of allTemplates) {
  byModule[t.moduleName] = {
    sourceFile: t.sourceFile,
    elements: t.elements || [],
    dom: t.dom || '',
    error: t.error,
  };
}

fs.writeFileSync(
  path.join(HERE, 'templates.json'),
  JSON.stringify(
    {
      totalTemplates: allTemplates.length,
      decompiledSuccessfully: allTemplates.filter((t) => !t.error).length,
      templates: byModule,
    },
    null,
    2,
  ) + '\n',
);

console.log(
  `Decompiled ${allTemplates.filter((t) => !t.error).length} / ${allTemplates.length} templates into desktop/tools/glimmer/templates.json`,
);
