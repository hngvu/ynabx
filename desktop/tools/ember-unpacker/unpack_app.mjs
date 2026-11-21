import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '@babel/parser';
import traverseModule from '@babel/traverse';
import generateModule from '@babel/generator';
import * as t from '@babel/types';
import { decompileTemplate } from './decompile_glimmer.mjs';
import { renameLocalsAst } from './humanify_module.mjs';

const traverse = traverseModule.default || traverseModule;
const generate = generateModule.default || generateModule;

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../../..');
const WEBCRACK_DIR = path.join(REPO, 'unminified/webcracked');
const EMBER_APP = path.join(REPO, 'unminified/ember_app');
const REGISTRY_PATH = path.join(EMBER_APP, 'symbol_registry.json');
const GLIMMER_TEMPLATES_JSON = path.join(REPO, 'desktop/tools/glimmer/templates.json');

const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));

// 1. Decompile all 629 templates to .hbs and update desktop/tools/glimmer/templates.json
console.log('[unpack_app] Decompiling all Glimmer templates...');
const glimmerOut = {};
let hbsCount = 0;

for (const tpl of registry.templates) {
  try {
    const { hbs } = decompileTemplate(tpl, registry);
    let outRel = tpl.moduleName;
    if (outRel.endsWith('.gts') || outRel.endsWith('.gjs')) {
      outRel = outRel.replace(/\.(gts|gjs)$/, '.hbs');
    }
    const outPath = path.join(EMBER_APP, outRel);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, hbs, 'utf8');
    hbsCount++;

    glimmerOut[tpl.moduleName] = {
      sourceFile: `${tpl.bundle}.js`,
      elements: [],
      dom: hbs,
    };
  } catch (err) {
    glimmerOut[tpl.moduleName] = {
      sourceFile: `${tpl.bundle}.js`,
      elements: [],
      dom: '',
      error: String(err),
    };
  }
}

fs.writeFileSync(
  GLIMMER_TEMPLATES_JSON,
  JSON.stringify(
    {
      totalTemplates: registry.templates.length,
      decompiledSuccessfully: hbsCount,
      templates: glimmerOut,
    },
    null,
    2
  ) + '\n',
  'utf8'
);
console.log(`[unpack_app] Wrote ${hbsCount} .hbs files and updated templates.json`);

// 2. Parse wrapper.js and main.js to extract class/module definitions
console.log('[unpack_app] Parsing webcracked bundles for JS class extraction...');
const bundleAsts = {
  wrapper: parse(fs.readFileSync(path.join(WEBCRACK_DIR, 'wrapper.js'), 'utf8'), { sourceType: 'module' }),
  main: parse(fs.readFileSync(path.join(WEBCRACK_DIR, 'main.js'), 'utf8'), { sourceType: 'module' }),
};

// Index all top-level function definitions and variable assignments per bundle
const classNodesByOrigin = {}; // "bundle:varName" -> { bundle, varName, fnNode, classNode, declNode }

for (const [bundleName, ast] of Object.entries(bundleAsts)) {
  for (const stmt of ast.program.body) {
    // Rolldown lazy init: function BH() { return (BH = t(() => { ... }))(); }
    if (stmt.type === 'FunctionDeclaration' && stmt.body.body.length > 0) {
      const ret = stmt.body.body[0];
      let assignExpr = null;
      if (ret.type === 'ReturnStatement') {
        if (ret.argument?.type === 'AssignmentExpression') {
          assignExpr = ret.argument;
        } else if (ret.argument?.type === 'CallExpression' && ret.argument.callee?.type === 'AssignmentExpression') {
          assignExpr = ret.argument.callee;
        }
      }
      if (
        assignExpr &&
        assignExpr.right?.type === 'CallExpression' &&
        assignExpr.right.arguments[0]?.type === 'ArrowFunctionExpression'
      ) {
        const initBody = assignExpr.right.arguments[0].body;
        if (initBody.type === 'BlockStatement') {
          const registerAssign = (expr) => {
            if (expr?.type === 'AssignmentExpression' && expr.left.type === 'Identifier') {
              const varName = expr.left.name;
              const rhs = expr.right;
              if (rhs.type === 'ClassExpression' || rhs.type === 'ObjectExpression' || rhs.type === 'CallExpression' || rhs.type === 'ArrowFunctionExpression' || rhs.type === 'FunctionExpression') {
                classNodesByOrigin[`${bundleName}:${varName}`] = {
                  bundle: bundleName,
                  varName,
                  initBody,
                  mainExpr: rhs,
                };
              }
            }
          };
          for (const inner of initBody.body) {
            if (inner.type === 'ExpressionStatement') {
              if (inner.expression.type === 'SequenceExpression') {
                for (const sub of inner.expression.expressions) registerAssign(sub);
              } else {
                registerAssign(inner.expression);
              }
            }
          }
        }
      }
    }
    // CommonJS wrapper: var bm = r((exports) => { ... })
    if (stmt.type === 'VariableDeclaration') {
      for (const decl of stmt.declarations) {
        if (decl.id.type === 'Identifier' && decl.init?.type === 'CallExpression') {
          classNodesByOrigin[`${bundleName}:${decl.id.name}`] = {
            bundle: bundleName,
            varName: decl.id.name,
            initBody: null,
            mainExpr: decl.init,
          };
        }
      }
    }
  }
}

function mapDecoratorCall(callNode) {
  if (!callNode || callNode.type !== 'CallExpression') {
    if (callNode?.type === 'Identifier') {
      // Single identifier decorator like [W] -> @action
      return { name: 'action', args: [] };
    }
    return null;
  }
  const calleeName = callNode.callee.type === 'Identifier' ? callNode.callee.name : '';
  const arg0 = callNode.arguments[0];
  if (arg0?.type === 'StringLiteral') {
    const val = arg0.value;
    // Heuristic: @service("budget") vs @alias("a.b") vs @computed("a", "b")
    if (callNode.arguments.length === 1 && !val.includes('.')) {
      // Check if it looks like a service name (kebab-case or single word) vs property path
      // In YNAB, V("budget") is @service, O("budgetViewModel.leftToBudget") is @alias, X("leftToBudget") is @computed
      return { calleeName, val, args: callNode.arguments };
    }
  }
  return { calleeName, args: callNode.arguments };
}

function restoreClassDecorators(classNode, componentName) {
  if (!classNode || classNode.type !== 'ClassExpression') return;
  if (!classNode.id) {
    classNode.id = t.identifier(componentName);
  }

  const body = classNode.body.body;
  const fieldDecorators = new Map(); // propName -> decoratorNode[]
  const methodDecorators = new Map(); // methodName -> decoratorNode[]
  const toRemove = new Set();

  for (let i = 0; i < body.length; i++) {
    const member = body[i];
    if (member.type !== 'StaticBlock') continue;

    // Check for inline .gts template static { a(xt({ block, moduleName }), this); }
    const stmt0 = member.body[0];
    if (
      stmt0?.type === 'ExpressionStatement' &&
      stmt0.expression.type === 'CallExpression' &&
      stmt0.expression.arguments.length === 2 &&
      stmt0.expression.arguments[1].type === 'ThisExpression'
    ) {
      toRemove.add(member);
      continue;
    }

    // Check for decorator static block: static { Wl(this.prototype, "propName", [Dec(...)]); }
    if (
      stmt0?.type === 'ExpressionStatement' &&
      stmt0.expression.type === 'CallExpression' &&
      stmt0.expression.arguments.length >= 3 &&
      stmt0.expression.arguments[1].type === 'StringLiteral' &&
      stmt0.expression.arguments[2].type === 'ArrayExpression'
    ) {
      const propName = stmt0.expression.arguments[1].value;
      const decArray = stmt0.expression.arguments[2].elements;
      const nextMember = body[i + 1];

      // Determine if nextMember is private field `#x = void ul(this, "propName")`
      const isPrivateField =
        nextMember?.type === 'ClassPrivateProperty' &&
        nextMember.value?.type === 'UnaryExpression' &&
        nextMember.value.operator === 'void';

      const decorators = [];
      for (const dec of decArray) {
        if (!dec) continue;
        if (dec.type === 'Identifier') {
          decorators.push(t.decorator(t.identifier('action')));
        } else if (dec.type === 'CallExpression') {
          const args = dec.arguments;
          let decName = 'computed';
          if (isPrivateField && args.length === 1 && args[0].type === 'StringLiteral') {
            decName = args[0].value.includes('.') ? 'alias' : 'service';
          }
          decorators.push(t.decorator(t.callExpression(t.identifier(decName), args)));
        }
      }

      if (isPrivateField) {
        fieldDecorators.set(propName, { decorators, replaceIndex: i + 1 });
        toRemove.add(member);
      } else {
        methodDecorators.set(propName, decorators);
        toRemove.add(member);
      }
    }
  }

  // Apply decorators & clean body
  const newBody = [];
  for (let i = 0; i < body.length; i++) {
    const member = body[i];
    if (toRemove.has(member)) continue;

    // Replace `#t = void ul(this, "applicationService")` with `@service("application") applicationService;`
    if (member.type === 'ClassPrivateProperty') {
      let matchedProp = null;
      for (const [pName, info] of fieldDecorators.entries()) {
        if (info.replaceIndex === i) {
          matchedProp = { pName, decorators: info.decorators };
          break;
        }
      }
      if (matchedProp) {
        const propDef = t.classProperty(t.identifier(matchedProp.pName), null, null, null, false, false);
        propDef.decorators = matchedProp.decorators;
        newBody.push(propDef);
        continue;
      }
    }

    // Attach decorators to methods / getters
    if (member.type === 'ClassMethod' && member.key.type === 'Identifier') {
      const decs = methodDecorators.get(member.key.name);
      if (decs) {
        member.decorators = [...(member.decorators || []), ...decs];
      }
    }

    newBody.push(member);
  }

  classNode.body.body = newBody;
}

function transformModuleToEsSource(entry, meta) {
  const { bundle, varName, initBody, mainExpr } = entry;
  const stmts = [];

  if (initBody) {
    for (const st of initBody.body) {
      // Skip bare init calls like `Wo();`
      if (
        st.type === 'ExpressionStatement' &&
        st.expression.type === 'CallExpression' &&
        st.expression.arguments.length === 0 &&
        st.expression.callee.type === 'Identifier'
      ) {
        continue;
      }
      // Skip `a(tplVar, ClassVar)`
      if (
        st.type === 'ExpressionStatement' &&
        st.expression.type === 'CallExpression' &&
        st.expression.arguments.length === 2 &&
        st.expression.arguments[1].type === 'Identifier' &&
        st.expression.arguments[1].name === varName
      ) {
        continue;
      }
      const cloned = t.cloneNode(st, true);
      if (
        cloned.type === 'ExpressionStatement' &&
        cloned.expression.type === 'AssignmentExpression' &&
        cloned.expression.left.type === 'Identifier' &&
        cloned.expression.left.name === varName
      ) {
        const rhs = cloned.expression.right;
        if (rhs.type === 'ClassExpression') {
          restoreClassDecorators(rhs, meta.componentName);
          stmts.push(t.exportDefaultDeclaration(rhs));
        } else {
          stmts.push(t.exportDefaultDeclaration(rhs));
        }
      } else {
        stmts.push(cloned);
      }
    }
  } else if (mainExpr) {
    const cloned = t.cloneNode(mainExpr, true);
    stmts.push(t.exportDefaultDeclaration(cloned));
  }

  const fileAst = t.file(t.program(stmts, [], 'module'));

  // Replace known cross-module symbols and rename local variables
  traverse(fileAst, {
    Identifier(p) {
      if (!p.isReferencedIdentifier()) return;
      const key = `${bundle}:${p.node.name}`;
      const sym = registry.symbols[key];
      if (sym && sym.componentName && /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(sym.componentName)) {
        // Don't rename property keys
        if (p.parent.type === 'MemberExpression' && p.parent.property === p.node && !p.parent.computed) return;
        if (p.parent.type === 'ObjectProperty' && p.parent.key === p.node && !p.parent.computed) return;
        p.node.name = sym.componentName;
      }
    },
  });

  renameLocalsAst(fileAst);

  const header = `// Source: ${meta.moduleName}\n// Origin: ${bundle}:${varName}\n\n`;
  return header + generate(fileAst, { retainLines: false, compact: false }).code + '\n';
}

// 3. Extract all backing classes and resolver modules
let jsCount = 0;
const indexRows = [];

// First extract all template backing classes
for (const tpl of registry.templates) {
  let jsRel = null;
  if (tpl.classVar) {
    const entry = classNodesByOrigin[tpl.classVar];
    const meta = registry.symbols[tpl.classVar] || {
      componentName: tpl.moduleName.split('/').pop().replace(/\..*$/, ''),
      moduleName: tpl.moduleName,
    };
    if (entry) {
      jsRel = tpl.moduleName.replace(/\.(hbs|gts|gjs)$/, '.js');
      const outPath = path.join(EMBER_APP, jsRel);
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      const code = transformModuleToEsSource(entry, meta);
      fs.writeFileSync(outPath, code, 'utf8');
      jsCount++;
    }
  }
  const hbsRel = tpl.moduleName.replace(/\.(gts|gjs)$/, '.hbs');
  indexRows.push({
    module: tpl.moduleName,
    hbs: hbsRel,
    js: jsRel || '-',
    origin: tpl.classVar || '-',
  });
}

// Extract resolver modules (services, controllers, routes, utils, lib) not already written
for (const [resKey, resInfo] of Object.entries(registry.resolverModules)) {
  const entry = classNodesByOrigin[resInfo.targetVar] || classNodesByOrigin[resInfo.originId];
  if (!entry) continue;
  const relPath = resKey.replace(/^ynab_web\//, 'app/') + '.js';
  const outPath = path.join(EMBER_APP, relPath);
  if (fs.existsSync(outPath)) continue;
  const meta = registry.symbols[resInfo.originId] || {
    componentName: resKey.split('/').pop(),
    moduleName: resKey,
  };
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const code = transformModuleToEsSource(entry, meta);
  fs.writeFileSync(outPath, code, 'utf8');
  jsCount++;
  indexRows.push({
    module: resKey,
    hbs: '-',
    js: relPath,
    origin: resInfo.originId,
  });
}

// 4. Write INDEX.md
const indexLines = [
  '# YNAB Ember UI Source Tree (`unminified/ember_app/`)',
  '',
  `Generated: ${new Date().toISOString()}`,
  `- Templates (\`.hbs\`): **${hbsCount}**`,
  `- JS Classes & Modules (\`.js\`): **${jsCount}**`,
  '',
  '| Module | Template (`.hbs`) | Backing Class / Module (`.js`) | Origin |',
  '|--------|-------------------|--------------------------------|--------|',
];

for (const row of indexRows.sort((a, b) => a.module.localeCompare(b.module))) {
  const hbsLink = row.hbs !== '-' ? `[${path.basename(row.hbs)}](${row.hbs})` : '-';
  const jsLink = row.js !== '-' ? `[${path.basename(row.js)}](${row.js})` : '-';
  indexLines.push(`| \`${row.module}\` | ${hbsLink} | ${jsLink} | \`${row.origin}\` |`);
}

fs.writeFileSync(path.join(EMBER_APP, 'INDEX.md'), indexLines.join('\n') + '\n', 'utf8');
console.log(`[unpack_app] Done! Extracted ${hbsCount} .hbs templates and ${jsCount} .js modules into unminified/ember_app/`);
