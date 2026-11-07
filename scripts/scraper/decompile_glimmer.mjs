/**
 * Glimmer Wire-Format -> Annotated JSX Decompiler + Component Logic & i18n Extractor
 *
 * Uses the exact SexpOpcodes, TagShortcuts, and AttrShortcuts extracted from
 * ynab-ember-web/assets/ynab_web/assets/internals-D4sll0cF.js
 */
import fs from 'fs';
import path from 'path';

// 1. Exact Opcodes from internals-D4sll0cF.js (Sg enum)
const SexpOpcodes = {
  Append: 1,
  TrustingAppend: 2,
  Comment: 3,
  Modifier: 4,
  StrictModifier: 5,
  Block: 6,
  StrictBlock: 7,
  Component: 8,
  OpenElement: 10,
  OpenElementWithSplat: 11,
  FlushElement: 12,
  CloseElement: 13,
  StaticAttr: 14,
  DynamicAttr: 15,
  ComponentAttr: 16,
  AttrSplat: 17,
  Yield: 18,
  DynamicArg: 20,
  StaticArg: 21,
  TrustingDynamicAttr: 22,
  TrustingComponentAttr: 23,
  StaticComponentAttr: 24,
  Debugger: 26,
  Undefined: 27,
  Call: 28,
  Concat: 29,
  GetSymbol: 30,
  GetStrictKeyword: 31,
  GetLexicalSymbol: 32,
  GetFreeAsComponentOrHelperHead: 35,
  GetFreeAsHelperHead: 37,
  GetFreeAsModifierHead: 38,
  GetFreeAsComponentHead: 39,
  InElement: 40,
  If: 41,
  Each: 42,
  Let: 44,
  WithDynamicVars: 45,
  InvokeComponent: 46,
  HasBlock: 48,
  HasBlockParams: 49,
  Curry: 50,
  Not: 51,
  IfInline: 52,
  GetDynamicVar: 53,
  Log: 54,
};

// 2. Exact Shortcuts from internals-D4sll0cF.js (Wg and Hg arrays)
const TagShortcuts = ['div', 'span', 'p', 'a'];
const AttrShortcuts = ['class', 'id', 'value', 'name', 'type', 'style', 'href'];

function resolveTag(t) {
  return typeof t === 'number' ? TagShortcuts[t] || `tag_${t}` : t;
}

function resolveAttr(a) {
  const name = typeof a === 'number' ? AttrShortcuts[a] || `attr_${a}` : a;
  if (name === 'class') return 'className';
  if (name === 'for') return 'htmlFor';
  if (name === 'tabindex') return 'tabIndex';
  if (name === 'maxlength') return 'maxLength';
  if (name === 'readonly') return 'readOnly';
  if (name === 'autocomplete') return 'autoComplete';
  if (name === 'autofocus') return 'autoFocus';
  return name;
}

// 3. Load bundle files
console.log('Loading bundle files...');
const mainJs = fs.readFileSync('ynab-ember-web/assets/ynab_web/assets/main-Dmb20EGn.js', 'utf8');
const wrapperJs = fs.readFileSync('ynab-ember-web/assets/ynab_web/assets/wrapper-DkFKwf1z.js', 'utf8');

// 4. Extract i18n dictionary from wrapper-DkFKwf1z.js
function extractI18nDictionary(js) {
  const dict = {};
  const startIdx = js.indexOf('"app.done": "Done"');
  const endIdx = js.indexOf('"forYouFeedCard.feed.empty.actionUrl"');
  if (startIdx !== -1 && endIdx !== -1) {
    const chunk = js.slice(startIdx - 20, endIdx + 200);
    const pairRegex = /"([^"]+)":\s*"((?:[^"\\]|\\.)*)"/g;
    let m;
    while ((m = pairRegex.exec(chunk)) !== null) {
      dict[m[1]] = m[2].replace(/\\"/g, '"').replace(/\\n/g, '\n');
    }
  }
  return dict;
}

const i18n = extractI18nDictionary(wrapperJs);
console.log(`Loaded ${Object.keys(i18n).length} i18n strings.`);

// 5. Build Global Lexical Scope Symbol Map: varName -> original component name (.hbs/.gts)
function buildSymbolMap(jsFiles) {
  const map = {
    // Common built-in helpers/modifiers/components in YNAB bundle
    EN: 't', // i18n translation helper
    x: 'on', // {{on "click" ...}} modifier
    Wt: 'Input', // <Input @type="text" @value=... />
    B2: 'components/modal/index',
    x2: 'components/modal/header/index',
    M2: 'components/modal/hero/index',
    D2: 'components/modal/body/index',
    R2: 'components/modal/footer/index',
  };

  for (const { name: fileName, content } of jsFiles) {
    // Pattern A: (varName = xt({ ... moduleName: "..." }))
    // Or class static { a(xt({ ... moduleName: "..." }), this) } inside (varName = class extends ...)
    const moduleRegex = /moduleName:\s*"([^"]+)"/g;
    let m;
    while ((m = moduleRegex.exec(content)) !== null) {
      const modPath = m[1];
      const shortName = modPath
        .replace(/^.*\/app\//, '')
        .replace(/\.(hbs|gts|gjs)$/, '');

      // Look backwards up to 1500 chars for `(VAR = xt({` or `(VAR = class extends`
      const before = content.slice(Math.max(0, m.index - 2000), m.index);
      const varMatches = [...before.matchAll(/\(([a-zA-Z0-9_$]+)\s*=\s*(?:xt\(\{|class\s+extends)/g)];
      if (varMatches.length > 0) {
        const lastVar = varMatches[varMatches.length - 1][1];
        map[lastVar] = shortName;
      }

      // Also look forwards up to 1500 chars for `(CLASS_VAR = class extends` followed by `a(TEMPLATE_VAR, CLASS_VAR)`
      const after = content.slice(m.index, Math.min(content.length, m.index + 3500));
      const linkMatch = after.match(/a\(([a-zA-Z0-9_$]+),\s*([a-zA-Z0-9_$]+)\)/);
      if (linkMatch) {
        const [, tplVar, clsVar] = linkMatch;
        map[tplVar] = shortName;
        map[clsVar] = shortName;
      }
    }
  }
  return map;
}

const symbolMap = buildSymbolMap([
  { name: 'main', content: mainJs },
  { name: 'wrapper', content: wrapperJs },
]);
console.log(`Mapped ${Object.keys(symbolMap).length} minified component/template symbols.`);

// 6. Decompiler Class for a single Glimmer Wire-Format Block
class GlimmerDecompiler {
  constructor(wireJson, scopeVars, moduleName) {
    this.wire = JSON.parse(wireJson);
    this.statements = this.wire[0] || [];
    this.locals = this.wire[1] || []; // block params / @args symbols (1-indexed: symbol 1 -> locals[0])
    this.upvars = this.wire[2] || []; // free variables / helpers
    this.scopeVars = scopeVars || []; // lexical scope array from `scope: () => [...]`
    this.moduleName = moduleName;
  }

  getLocalName(symIdx) {
    if (symIdx === 0) return 'this';
    const raw = this.locals[symIdx - 1];
    if (!raw) return `sym_${symIdx}`;
    return raw.startsWith('@') ? `props.${raw.slice(1)}` : raw;
  }

  getUpvarName(upvarIdx) {
    return this.upvars[upvarIdx] || `upvar_${upvarIdx}`;
  }

  getLexicalName(lexIdx) {
    const varName = this.scopeVars[lexIdx] || `lex_${lexIdx}`;
    const mapped = symbolMap[varName];
    if (mapped) {
      // Convert path like components/button/index -> Button
      const parts = mapped
        .replace(/^components\//, '')
        .replace(/\/index$/, '')
        .split(/[\/-]/);
      const pascal = parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('');
      return `${pascal} /* ${varName}: ${mapped} */`;
    }
    return varName;
  }

  getLexicalShortTag(lexIdx) {
    const varName = this.scopeVars[lexIdx] || `lex_${lexIdx}`;
    const mapped = symbolMap[varName];
    if (mapped) {
      if (mapped === 't' || mapped === 'on') return mapped;
      const parts = mapped
        .replace(/^components\//, '')
        .replace(/\/index$/, '')
        .split(/[\/-]/);
      return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('');
    }
    return varName;
  }

  // Decompile an expression (e.g., GetSymbol, Call, Concat, IfInline, Not)
  decompileExpr(expr) {
    if (expr === null || expr === undefined) return 'null';
    if (typeof expr === 'string') return JSON.stringify(expr);
    if (typeof expr === 'number' || typeof expr === 'boolean') return String(expr);
    if (!Array.isArray(expr)) return String(expr);

    const op = expr[0];
    switch (op) {
      case SexpOpcodes.GetSymbol: {
        // [30, symIdx, ["path", "to", "prop"]]
        const base = this.getLocalName(expr[1]);
        const pathArr = expr[2] || [];
        return [base, ...pathArr].join('.');
      }
      case SexpOpcodes.GetLexicalSymbol: {
        // [32, lexIdx, ["path"]]
        const base = this.getLexicalShortTag(expr[1]);
        const pathArr = expr[2] || [];
        return [base, ...pathArr].join('.');
      }
      case SexpOpcodes.GetStrictKeyword:
      case SexpOpcodes.GetFreeAsHelperHead:
      case SexpOpcodes.GetFreeAsComponentOrHelperHead:
      case SexpOpcodes.GetFreeAsModifierHead:
      case SexpOpcodes.GetFreeAsComponentHead: {
        const upvar = this.getUpvarName(expr[1]);
        const pathArr = expr[2] || [];
        return [upvar, ...pathArr].join('.');
      }
      case SexpOpcodes.Call: {
        // [28, head, positionalArgs, namedArgs]
        const head = this.decompileExpr(expr[1]);
        const pos = (expr[2] || []).map((p) => this.decompileExpr(p));
        const named = expr[3];
        let namedStr = '';
        if (named && named[0] && named[0].length > 0) {
          const pairs = named[0].map((k, i) => `${k}: ${this.decompileExpr(named[1][i])}`);
          namedStr = `{ ${pairs.join(', ')} }`;
        }

        // Special handling for i18n helper `t("key")` or `EN("key")`
        if ((head === 't' || head === 'EN' || head === 'Ln') && pos.length > 0) {
          const rawKey = pos[0].replace(/^"|"$/g, '');
          const translated = i18n[rawKey];
          if (translated) {
            return `t(${pos[0]}${namedStr ? `, ${namedStr}` : ''}) /* "${translated}" */`;
          }
        }
        // Special handling for `-track-array`
        if (head === '-track-array' && pos.length === 1) {
          return pos[0];
        }

        const allArgs = [...pos, ...(namedStr ? [namedStr] : [])];
        return `${head}(${allArgs.join(', ')})`;
      }
      case SexpOpcodes.Concat: {
        // [29, [part1, part2, ...]]
        const parts = (expr[1] || []).map((p) => {
          if (typeof p === 'string') return p;
          return `\${${this.decompileExpr(p)}}`;
        });
        return '`' + parts.join('') + '`';
      }
      case SexpOpcodes.IfInline: {
        // [52, cond, truthy, falsy]
        const cond = this.decompileExpr(expr[1]);
        const truthy = expr[2] !== undefined ? this.decompileExpr(expr[2]) : '""';
        const falsy = expr[3] !== undefined ? this.decompileExpr(expr[3]) : '""';
        return `(${cond} ? ${truthy} : ${falsy})`;
      }
      case SexpOpcodes.Not: {
        return `!(${this.decompileExpr(expr[1])})`;
      }
      case SexpOpcodes.Undefined:
        return 'undefined';
      case SexpOpcodes.HasBlock:
        return `hasBlock(${this.decompileExpr(expr[1])})`;
      case SexpOpcodes.Curry: {
        return `curry(${this.decompileExpr(expr[1])})`;
      }
      default:
        return `/* expr_op_${op} */ ${JSON.stringify(expr)}`;
    }
  }

  // Decompile a list of statements into indented JSX string
  decompileStatements(stmts, indent = '  ') {
    let out = '';
    let i = 0;

    while (i < stmts.length) {
      const stmt = stmts[i];
      if (!Array.isArray(stmt)) {
        i++;
        continue;
      }

      const op = stmt[0];
      switch (op) {
        case SexpOpcodes.Append:
        case SexpOpcodes.TrustingAppend: {
          const val = stmt[1];
          if (typeof val === 'string') {
            // Preserve meaningful text, skip pure whitespace-only newlines if desired or keep tidy
            const trimmed = val.trim();
            if (trimmed) {
              out += `${indent}${trimmed}\n`;
            }
          } else {
            out += `${indent}{${this.decompileExpr(val)}}\n`;
          }
          i++;
          break;
        }

        case SexpOpcodes.Comment: {
          out += `${indent}{/* ${stmt[1]} */}\n`;
          i++;
          break;
        }

        case SexpOpcodes.OpenElement:
        case SexpOpcodes.OpenElementWithSplat: {
          const tag = resolveTag(stmt[1]);
          let attrs = [];
          i++;
          // Collect all attributes & modifiers until FlushElement (12)
          while (i < stmts.length && stmts[i][0] !== SexpOpcodes.FlushElement) {
            const attrStmt = stmts[i];
            const attrOp = attrStmt[0];
            if (attrOp === SexpOpcodes.StaticAttr || attrOp === SexpOpcodes.StaticComponentAttr) {
              const name = resolveAttr(attrStmt[1]);
              const val = attrStmt[2];
              attrs.push(`${name}=${JSON.stringify(val)}`);
            } else if (
              attrOp === SexpOpcodes.DynamicAttr ||
              attrOp === SexpOpcodes.ComponentAttr ||
              attrOp === SexpOpcodes.TrustingDynamicAttr ||
              attrOp === SexpOpcodes.TrustingComponentAttr
            ) {
              const name = resolveAttr(attrStmt[1]);
              const valExpr = this.decompileExpr(attrStmt[2]);
              attrs.push(`${name}={${valExpr}}`);
            } else if (attrOp === SexpOpcodes.Modifier) {
              // [4, head, positional, named]
              const modHead = this.decompileExpr(attrStmt[1]);
              const pos = (attrStmt[2] || []).map((p) => this.decompileExpr(p));
              if (modHead === 'on' && pos.length >= 2) {
                const evtName = pos[0].replace(/^"|"$/g, '');
                const reactEvt = 'on' + evtName.charAt(0).toUpperCase() + evtName.slice(1);
                attrs.push(`${reactEvt}={${pos[1]}}`);
              } else {
                attrs.push(`/* modifier: ${modHead}(${pos.join(', ')}) */`);
              }
            } else if (attrOp === SexpOpcodes.AttrSplat) {
              attrs.push(`{...attrs}`);
            }
            i++;
          }
          // Skip FlushElement (12)
          if (i < stmts.length && stmts[i][0] === SexpOpcodes.FlushElement) {
            i++;
          }

          // Collect child statements until matching CloseElement (13)
          let depth = 1;
          let childStmts = [];
          while (i < stmts.length && depth > 0) {
            const cur = stmts[i];
            if (
              cur[0] === SexpOpcodes.OpenElement ||
              cur[0] === SexpOpcodes.OpenElementWithSplat
            ) {
              depth++;
            } else if (cur[0] === SexpOpcodes.CloseElement) {
              depth--;
              if (depth === 0) {
                i++;
                break;
              }
            }
            childStmts.push(cur);
            i++;
          }

          const attrStr = attrs.length > 0 ? ' ' + attrs.join(' ') : '';
          const childrenOut = this.decompileStatements(childStmts, indent + '  ');
          if (!childrenOut.trim()) {
            out += `${indent}<${tag}${attrStr} />\n`;
          } else {
            out += `${indent}<${tag}${attrStr}>\n${childrenOut}${indent}</${tag}>\n`;
          }
          break;
        }

        case SexpOpcodes.Component:
        case SexpOpcodes.Block:
        case SexpOpcodes.InvokeComponent: {
          // [8, headExpr, elementAttrs, namedArgs, blocks]
          const headExpr = stmt[1];
          let compTag = '';
          let compComment = '';
          if (Array.isArray(headExpr) && headExpr[0] === SexpOpcodes.GetLexicalSymbol) {
            compTag = this.getLexicalShortTag(headExpr[1]);
            const fullDesc = this.getLexicalName(headExpr[1]);
            if (fullDesc.includes('/*')) {
              compComment = ` {/* ${fullDesc.split('/*')[1].trim()}}`;
            }
          } else {
            compTag = this.decompileExpr(headExpr);
          }

          let propsList = [];
          // Element attrs (stmt[2])
          const elAttrs = stmt[2] || [];
          for (const a of elAttrs) {
            const aOp = a[0];
            if (aOp === SexpOpcodes.StaticAttr || aOp === SexpOpcodes.StaticComponentAttr) {
              propsList.push(`${resolveAttr(a[1])}=${JSON.stringify(a[2])}`);
            } else if (
              aOp === SexpOpcodes.DynamicAttr ||
              aOp === SexpOpcodes.ComponentAttr
            ) {
              propsList.push(`${resolveAttr(a[1])}={${this.decompileExpr(a[2])}}`);
            } else if (aOp === SexpOpcodes.Modifier) {
              const modHead = this.decompileExpr(a[1]);
              const pos = (a[2] || []).map((p) => this.decompileExpr(p));
              if (modHead === 'on' && pos.length >= 2) {
                const evtName = pos[0].replace(/^"|"$/g, '');
                const reactEvt = 'on' + evtName.charAt(0).toUpperCase() + evtName.slice(1);
                propsList.push(`${reactEvt}={${pos[1]}}`);
              } else {
                propsList.push(`/* modifier: ${modHead}(${pos.join(', ')}) */`);
              }
            }
          }

          // Named args (stmt[3]): [["@arg1", "@arg2"], [val1, val2]]
          const namedArgs = stmt[3];
          if (namedArgs && Array.isArray(namedArgs[0])) {
            const names = namedArgs[0];
            const vals = namedArgs[1];
            for (let k = 0; k < names.length; k++) {
              const argName = names[k].replace(/^@/, '');
              const argVal = vals[k];
              if (typeof argVal === 'string') {
                propsList.push(`${argName}=${JSON.stringify(argVal)}`);
              } else {
                propsList.push(`${argName}={${this.decompileExpr(argVal)}}`);
              }
            }
          }

          // Named blocks (stmt[4]): [["default", ...], [blockDef1, ...]]
          const blocks = stmt[4];
          let childrenStr = '';
          if (blocks && Array.isArray(blocks[0])) {
            const blockNames = blocks[0];
            const blockDefs = blocks[1];
            for (let b = 0; b < blockNames.length; b++) {
              const bName = blockNames[b];
              const bDef = blockDefs[b]; // [stmts, localSymbolIds]
              if (bDef && Array.isArray(bDef[0])) {
                const bParams = (bDef[1] || []).map((id) => this.getLocalName(id));
                const inner = this.decompileStatements(bDef[0], indent + '  ');
                if (bName === 'default' && blockNames.length === 1) {
                  if (bParams.length > 0) {
                    childrenStr += `${indent}  {/* block params: (${bParams.join(', ')}) */}\n`;
                  }
                  childrenStr += inner;
                } else {
                  childrenStr += `${indent}  {/* Named Block: :${bName}${
                    bParams.length ? ` |${bParams.join(', ')}|` : ''
                  } */}\n${inner}`;
                }
              }
            }
          }

          const propsStr = propsList.length > 0 ? ' ' + propsList.join(' ') : '';
          if (!childrenStr.trim()) {
            out += `${indent}<${compTag}${propsStr} />${compComment}\n`;
          } else {
            out += `${indent}<${compTag}${propsStr}>${compComment}\n${childrenStr}${indent}</${compTag}>\n`;
          }
          i++;
          break;
        }

        case SexpOpcodes.If: {
          // [41, condExpr, [thenStmts, params], [elseStmts, params]]
          const cond = this.decompileExpr(stmt[1]);
          const thenBranch = stmt[2] ? this.decompileStatements(stmt[2][0], indent + '    ') : '';
          const elseBranch =
            stmt[3] && stmt[3][0] && stmt[3][0].length > 0
              ? this.decompileStatements(stmt[3][0], indent + '    ')
              : null;

          if (elseBranch) {
            out += `${indent}{${cond} ? (\n${indent}  <>\n${thenBranch}${indent}  </>\n${indent}) : (\n${indent}  <>\n${elseBranch}${indent}  </>\n${indent})}\n`;
          } else {
            out += `${indent}{${cond} && (\n${indent}  <>\n${thenBranch}${indent}  </>\n${indent})}\n`;
          }
          i++;
          break;
        }

        case SexpOpcodes.Each: {
          // [42, listExpr, keyExpr, [bodyStmts, [itemSym, idxSym]], [elseStmts]]
          const listExpr = this.decompileExpr(stmt[1]);
          const bodyBlock = stmt[3];
          const params = (bodyBlock && bodyBlock[1] ? bodyBlock[1] : []).map((id) =>
            this.getLocalName(id)
          );
          const bodyStmts = bodyBlock ? bodyBlock[0] : [];
          const inner = this.decompileStatements(bodyStmts, indent + '    ');
          const paramList = params.length > 0 ? params.join(', ') : 'item';
          out += `${indent}{${listExpr}.map((${paramList}) => (\n${indent}  <React.Fragment>\n${inner}${indent}  </React.Fragment>\n${indent}))}\n`;
          i++;
          break;
        }

        case SexpOpcodes.Let: {
          // [44, [valExprs], [bodyStmts, [paramSyms]]]
          const vals = (stmt[1] || []).map((v) => this.decompileExpr(v));
          const bodyBlock = stmt[2];
          const params = (bodyBlock && bodyBlock[1] ? bodyBlock[1] : []).map((id) =>
            this.getLocalName(id)
          );
          const inner = this.decompileStatements(bodyBlock ? bodyBlock[0] : [], indent + '  ');
          out += `${indent}{/* @let ${params.map((p, k) => `${p} = ${vals[k]}`).join(', ')} */}\n${inner}`;
          i++;
          break;
        }

        case SexpOpcodes.Yield: {
          // [18, blockSymbol, positionalArgs]
          const pos = (stmt[2] || []).map((p) => this.decompileExpr(p));
          out += `${indent}{props.children${pos.length ? ` /* yield(${pos.join(', ')}) */` : ''}}\n`;
          i++;
          break;
        }

        default: {
          out += `${indent}{/* unhandled_stmt_op_${op}: ${JSON.stringify(stmt)} */}\n`;
          i++;
          break;
        }
      }
    }

    return out;
  }
}

// 7. Function to extract a target moduleName's template AND backing class
function decompileTargetComponent(targetSubstr) {
  for (const { name: bundleName, content } of [
    { name: 'wrapper-DkFKwf1z.js', content: wrapperJs },
    { name: 'main-Dmb20EGn.js', content: mainJs },
  ]) {
    const modIdx = content.indexOf(targetSubstr);
    if (modIdx === -1) continue;

    // Extract moduleName string
    const modLineMatch = content.slice(modIdx - 50, modIdx + 200).match(/moduleName:\s*"([^"]+)"/);
    const fullModuleName = modLineMatch ? modLineMatch[1] : targetSubstr;

    // Find `block:` preceding `moduleName:`
    const before = content.slice(Math.max(0, modIdx - 25000), modIdx);
    const blockMarker = before.lastIndexOf('block:');
    if (blockMarker === -1) continue;

    const blockRegion = before.slice(blockMarker);
    const strMatch = blockRegion.match(/block:\s*'((?:[^'\\]|\\.)*)'/);
    if (!strMatch) continue;

    // Unescape single-quoted JS string literal to get raw JSON string
    const rawJson = strMatch[1]
      .replace(/\\'/g, "'")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');

    // Check for `scope: () => [...]` right after `moduleName:`
    const afterMod = content.slice(modIdx, modIdx + 500);
    const scopeMatch = afterMod.match(/scope:\s*\(\)\s*=>\s*\[([^\]]+)\]/);
    const scopeVars = scopeMatch
      ? scopeMatch[1].split(',').map((s) => s.trim())
      : [];

    // Find backing class (either right after `xt({...})` or enclosing `class extends`)
    const surrounding = content.slice(Math.max(0, modIdx - 4000), Math.min(content.length, modIdx + 8000));
    let backingClassCode = '';
    const afterClassMatch = content.slice(modIdx, modIdx + 8000).match(/\([a-zA-Z0-9_$]+\s*=\s*class\s+extends\s+[a-zA-Z0-9_$]+\s*\{[\s\S]*?\}\),\s*a\(/);
    if (afterClassMatch) {
      backingClassCode = afterClassMatch[0];
    } else {
      // Check if template is inside `static { a(xt({...}), this); }` of a class
      const beforeClassIdx = before.lastIndexOf('class extends');
      if (beforeClassIdx !== -1) {
        backingClassCode = before.slice(beforeClassIdx - 20, blockMarker);
      }
    }

    const decompiler = new GlimmerDecompiler(rawJson, scopeVars, fullModuleName);
    const jsx = decompiler.decompileStatements(decompiler.statements, '    ');

    return {
      bundleName,
      fullModuleName,
      locals: decompiler.locals,
      upvars: decompiler.upvars,
      scopeVars: scopeVars.map((v) => `${v} -> ${symbolMap[v] || 'unknown'}`),
      jsx,
      backingClassCode: backingClassCode.slice(0, 3500),
    };
  }
  return null;
}

// 8. Discover all modal/popover moduleNames and test on 5 Pilot Templates
const allMods = [
  ...[...wrapperJs.matchAll(/moduleName:\s*"([^"]+)"/g)].map((m) => m[1]),
  ...[...mainJs.matchAll(/moduleName:\s*"([^"]+)"/g)].map((m) => m[1]),
];
fs.mkdirSync('scripts/scraper/output', { recursive: true });
fs.writeFileSync('scripts/scraper/output/all_templates_catalog.txt', allMods.join('\n'), 'utf8');

const cliArgs = process.argv.slice(2);
const defaultTargets = [
  'components/modals/flag-names.hbs',
  'components/settings-menu/index.hbs',
  'components/modals/sidebar/edit-account.hbs',
  'components/modals/budget/move-money.hbs',
  'components/modals/export-budget.hbs',
];
const rawTargets = cliArgs.length > 0 ? cliArgs : defaultTargets;
const pilotTargets = rawTargets.map(
  (t) => allMods.find((m) => m.endsWith(t)) || allMods.find((m) => m.includes(t.replace('.hbs', ''))) || t
);

let report = `# Pilot Decompilation Report (5 Templates + Backing Classes + i18n)\n\n`;
report += `Total templates indexed across bundles: **${allMods.length}**\n`;
report += `Total i18n strings indexed: **${Object.keys(i18n).length}**\n`;
report += `Total minified component symbols mapped: **${Object.keys(symbolMap).length}**\n\n---\n\n`;

let idx = 1;
for (const target of pilotTargets) {
  console.log(`Decompiling ${target}...`);
  const res = decompileTargetComponent(target);
  if (!res) {
    console.log(`Could not find ${target}`);
    continue;
  }

  report += `## ${idx++}. \`${res.fullModuleName}\` (from \`${res.bundleName}\`)\n\n`;
  report += `- **Locals / Block Params**: \`${JSON.stringify(res.locals)}\`\n`;
  report += `- **Upvars / Helpers**: \`${JSON.stringify(res.upvars)}\`\n`;
  report += `- **Lexical Scope Mapping**: \`${JSON.stringify(res.scopeVars)}\`\n\n`;
  report += `### Decompiled Annotated JSX:\n\`\`\`tsx\nexport function Template(props: any) {\n  return (\n    <>\n${res.jsx}    </>\n  );\n}\n\`\`\`\n\n`;
  if (res.backingClassCode) {
    report += `### Backing Component Class Specification (Original Ember):\n\`\`\`js\n${res.backingClassCode}\n\`\`\`\n\n`;
  }
  report += `---\n\n`;
}

fs.writeFileSync('scripts/scraper/output/pilot_decompiled_specs.md', report, 'utf8');
console.log('Saved pilot report to scripts/scraper/output/pilot_decompiled_specs.md');
