import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '@babel/parser';
import traverseModule from '@babel/traverse';

const traverse = traverseModule.default || traverseModule;

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../../..');
const WEBCRACK_DIR = path.join(REPO, 'unminified/webcracked');
const OUT_DIR = path.join(REPO, 'unminified/ember_app');
const REGISTRY_PATH = path.join(OUT_DIR, 'symbol_registry.json');

fs.mkdirSync(OUT_DIR, { recursive: true });

const BUNDLES = [
  { name: 'internals', file: 'internals.js' },
  { name: 'wrapper', file: 'wrapper.js' },
  { name: 'main', file: 'main.js' },
];

const MODULE_PREFIX = '/home/runner/_work/evergreen/evergreen/ynab_web/';

function toPascalCase(str) {
  return str
    .replace(/^app\/(components|templates|controllers|routes|services)\//, '')
    .replace(/\/(index)?\.(hbs|gts|gjs|js|ts)$/, '')
    .split(/[\/_-]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join('');
}

function stripModulePath(moduleName) {
  let clean = moduleName.startsWith(MODULE_PREFIX)
    ? moduleName.slice(MODULE_PREFIX.length)
    : moduleName;
  return clean.replace(/\/(index)?\.(hbs|gts|gjs|js|ts)$/, '');
}

function classifyBundleSource(sourceStr) {
  if (sourceStr.includes('internals-')) return 'internals';
  if (sourceStr.includes('wrapper-')) return 'wrapper';
  if (sourceStr.includes('main-')) return 'main';
  return null;
}

const asts = {};
const exportsByBundle = { internals: {}, wrapper: {}, main: {} };
const importsByBundle = { internals: {}, wrapper: {}, main: {} };
const namespaceDefaults = {}; // bundle:nsVar -> bundle:defaultVar
const symbols = {}; // originId -> metadata
const templates = [];
const resolverModules = {};

console.log('[link_symbols] Parsing webcracked ASTs...');
for (const b of BUNDLES) {
  const code = fs.readFileSync(path.join(WEBCRACK_DIR, b.file), 'utf8');
  asts[b.name] = parse(code, { sourceType: 'module', errorRecovery: false });
}

// Pass 1: Collect exports, imports, and namespace objects (i({ default: () => Target }))
for (const b of BUNDLES) {
  traverse(asts[b.name], {
    ExportNamedDeclaration(p) {
      for (const spec of p.node.specifiers) {
        if (spec.type === 'ExportSpecifier' && spec.local && spec.exported) {
          const exportedName = spec.exported.name || spec.exported.value;
          exportsByBundle[b.name][exportedName] = `${b.name}:${spec.local.name}`;
        }
      }
    },
    ImportDeclaration(p) {
      const targetBundle = classifyBundleSource(p.node.source.value);
      if (!targetBundle) return;
      for (const spec of p.node.specifiers) {
        if (spec.type === 'ImportSpecifier' && spec.imported && spec.local) {
          const importedName = spec.imported.name || spec.imported.value;
          importsByBundle[b.name][spec.local.name] = {
            targetBundle,
            importedName,
          };
        }
      }
    },
    VariableDeclarator(p) {
      // Match: var Xg = i({ default: () => Qg }) or { default: () => ... }
      if (
        p.node.id.type === 'Identifier' &&
        p.node.init &&
        p.node.init.type === 'CallExpression' &&
        p.node.init.arguments.length >= 1 &&
        p.node.init.arguments[0].type === 'ObjectExpression'
      ) {
        const obj = p.node.init.arguments[0];
        const defProp = obj.properties.find(
          (pr) =>
            pr.type === 'ObjectProperty' &&
            ((pr.key.type === 'Identifier' && pr.key.name === 'default') ||
              (pr.key.type === 'StringLiteral' && pr.key.value === 'default'))
        );
        if (defProp && defProp.value.type === 'ArrowFunctionExpression' && defProp.value.body.type === 'Identifier') {
          namespaceDefaults[`${b.name}:${p.node.id.name}`] = `${b.name}:${defProp.value.body.name}`;
        }
      }
    },
  });
}

function resolveOrigin(bundleName, localName, visited = new Set()) {
  const key = `${bundleName}:${localName}`;
  if (visited.has(key)) return key;
  visited.add(key);
  const imp = importsByBundle[bundleName]?.[localName];
  if (imp) {
    const exportedOrigin = exportsByBundle[imp.targetBundle]?.[imp.importedName];
    if (exportedOrigin) {
      const [nextBundle, nextLocal] = exportedOrigin.split(':');
      return resolveOrigin(nextBundle, nextLocal, visited);
    }
  }
  return key;
}

// Pass 2: Extract Glimmer templates (le({ block, moduleName, scope }) / xt({ ... }))
// and Backing Classes via setComponentTemplate(tpl, cls) or static { a(xt(...), this) }
const tplVarToTemplate = {}; // bundle:tplVar -> templateEntry

function extractTemplateObj(objNode, bundleName) {
  if (!objNode || objNode.type !== 'ObjectExpression') return null;
  let blockStr = null;
  let moduleName = null;
  let scopeVars = [];
  let isStrictMode = false;

  for (const prop of objNode.properties) {
    if (prop.type !== 'ObjectProperty') continue;
    const keyName = prop.key.name || prop.key.value;
    if (keyName === 'block' && prop.value.type === 'StringLiteral') {
      blockStr = prop.value.value;
    } else if (keyName === 'moduleName' && prop.value.type === 'StringLiteral') {
      moduleName = prop.value.value;
    } else if (keyName === 'isStrictMode' && prop.value.type === 'BooleanLiteral') {
      isStrictMode = prop.value.value;
    } else if (keyName === 'scope' && prop.value.type === 'ArrowFunctionExpression') {
      if (prop.value.body.type === 'ArrayExpression') {
        scopeVars = prop.value.body.elements.map((el) =>
          el && el.type === 'Identifier' ? `${bundleName}:${el.name}` : null
        );
      }
    }
  }

  if (!blockStr || !moduleName) return null;
  const cleanModule = moduleName.startsWith(MODULE_PREFIX)
    ? moduleName.slice(MODULE_PREFIX.length)
    : moduleName;

  return {
    bundle: bundleName,
    moduleName: cleanModule,
    rawModuleName: moduleName,
    block: blockStr,
    scopeVars,
    isStrictMode,
    tplVar: null,
    classVar: null,
  };
}

for (const b of BUNDLES) {
  if (b.name === 'internals') continue;
  traverse(asts[b.name], {
    CallExpression(p) {
      if (p.node.arguments.length !== 1) return;
      const tpl = extractTemplateObj(p.node.arguments[0], b.name);
      if (!tpl) return;

      // Case 1: tplVar = le({ ... })
      if (p.parent.type === 'AssignmentExpression' && p.parent.left.type === 'Identifier') {
        tpl.tplVar = `${b.name}:${p.parent.left.name}`;
        tplVarToTemplate[tpl.tplVar] = tpl;
        templates.push(tpl);
        return;
      }

      // Case 2: inline .gts: static { a(xt({ ... }), this); }
      if (
        p.parent.type === 'CallExpression' &&
        p.parent.arguments.length === 2 &&
        p.parent.arguments[1].type === 'ThisExpression'
      ) {
        const classNode = p.findParent((anc) => anc.isClassExpression() || anc.isClassDeclaration());
        if (classNode) {
          let classVarName = null;
          if (classNode.parent.type === 'AssignmentExpression' && classNode.parent.left.type === 'Identifier') {
            classVarName = classNode.parent.left.name;
          } else if (classNode.node.id) {
            classVarName = classNode.node.id.name;
          }
          if (classVarName) {
            tpl.classVar = `${b.name}:${classVarName}`;
          }
        }
        templates.push(tpl);
      }
    },
  });
}

// Pass 3: Link setComponentTemplate(tplVar, ClassVar) or setComponentTemplate(tplVar, ClassVar = class ...)
for (const b of BUNDLES) {
  if (b.name === 'internals') continue;
  traverse(asts[b.name], {
    CallExpression(p) {
      if (p.node.arguments.length !== 2) return;
      const [arg0, arg1] = p.node.arguments;
      if (arg0.type !== 'Identifier') return;
      let classIdent = null;
      if (arg1.type === 'Identifier') {
        classIdent = arg1.name;
      } else if (arg1.type === 'AssignmentExpression' && arg1.left.type === 'Identifier') {
        classIdent = arg1.left.name;
      }
      if (!classIdent) return;
      const tplKey = `${b.name}:${arg0.name}`;
      const tpl = tplVarToTemplate[tplKey];
      if (tpl) {
        tpl.classVar = `${b.name}:${classIdent}`;
      }
    },
  });
}

// Register all template backing classes in symbols
for (const tpl of templates) {
  if (!tpl.classVar) continue;
  const [bundleName, localVar] = tpl.classVar.split(':');
  const originId = resolveOrigin(bundleName, localVar);
  const modulePath = stripModulePath(tpl.moduleName);
  const componentName = toPascalCase(tpl.moduleName);
  const meta = {
    originId,
    kind: tpl.moduleName.startsWith('app/components/') ? 'component' : 'template-controller',
    componentName,
    modulePath,
    moduleName: tpl.moduleName,
  };
  symbols[tpl.classVar] = meta;
  symbols[originId] = meta;
}

// Pass 4: Extract Ember Resolver map (Cie = Object.assign({}, Bm, { "ynab_web/...": nsVar }))
for (const b of BUNDLES) {
  if (b.name === 'internals') continue;
  traverse(asts[b.name], {
    ObjectProperty(p) {
      if (p.node.key.type !== 'StringLiteral') return;
      const key = p.node.key.value;
      if (!key.startsWith('ynab_web/')) return;
      if (p.node.value.type !== 'Identifier') return;

      const nsVar = `${b.name}:${p.node.value.name}`;
      const targetVar = namespaceDefaults[nsVar] || nsVar;
      const [tBundle, tName] = targetVar.split(':');
      const originId = resolveOrigin(tBundle, tName);

      resolverModules[key] = {
        nsVar,
        targetVar,
        originId,
      };

      const shortName = toPascalCase(key.replace(/^ynab_web\//, 'app/'));
      const existing = symbols[originId];
      if (!existing) {
        const meta = {
          originId,
          kind: key.split('/')[1] || 'module',
          componentName: shortName,
          modulePath: key,
          moduleName: key,
        };
        symbols[targetVar] = meta;
        symbols[originId] = meta;
        if (nsVar !== targetVar && !symbols[nsVar]) {
          symbols[nsVar] = { ...meta, namespaceFor: originId };
        }
      } else if (nsVar !== targetVar && !symbols[nsVar]) {
        symbols[nsVar] = { ...existing, namespaceFor: originId };
      }
    },
  });
}

// Pass 5: Map all cross-bundle imports in main/wrapper that point to an already-known originId
for (const b of BUNDLES) {
  for (const localName of Object.keys(importsByBundle[b.name])) {
    const localKey = `${b.name}:${localName}`;
    const originId = resolveOrigin(b.name, localName);
    if (symbols[originId] && !symbols[localKey]) {
      symbols[localKey] = {
        ...symbols[originId],
        localAlias: localKey,
      };
    }
  }
}

// Pass 6: Infer core Glimmer helpers/modifiers from their AST usage in templates
function registerBuiltin(scopeKey, helperName, kind = 'helper') {
  const [bName, lName] = scopeKey.split(':');
  const originId = resolveOrigin(bName, lName);
  const meta = {
    originId,
    kind,
    componentName: helperName,
    modulePath: `ember/${helperName}`,
    moduleName: `ember/${helperName}`,
  };
  if (!symbols[scopeKey]) symbols[scopeKey] = meta;
  if (!symbols[originId]) symbols[originId] = meta;
}

function walkBlockJson(node, scopeVars, parentAttr = null) {
  if (!Array.isArray(node)) return;
  const op = node[0];
  // [4, [32, scopeIdx], args, named] -> Modifier
  if (op === 4 && Array.isArray(node[1]) && node[1][0] === 32) {
    const scopeKey = scopeVars[node[1][1]];
    if (scopeKey) {
      const args = node[2] || [];
      if (args.length >= 2 && typeof args[0] === 'string' && ['click', 'input', 'change', 'keydown', 'keyup', 'focus', 'blur', 'submit', 'mouseenter', 'mouseleave', 'mousedown'].includes(args[0])) {
        registerBuiltin(scopeKey, 'on', 'modifier');
      } else if (args.length === 1) {
        registerBuiltin(scopeKey, 'did-insert', 'modifier');
      } else if (args.length === 2 && Array.isArray(args[0]) && Array.isArray(args[1])) {
        registerBuiltin(scopeKey, 'did-update', 'modifier');
      }
    }
  }
  // [28, [32, scopeIdx], posArgs, namedArgs] -> Helper
  if (op === 28 && Array.isArray(node[1]) && node[1][0] === 32) {
    const scopeKey = scopeVars[node[1][1]];
    if (scopeKey) {
      const pos = node[2] || [];
      const named = node[3];
      const namedKeys = Array.isArray(named) && Array.isArray(named[0]) ? named[0] : [];
      if (pos.length === 1 && typeof pos[0] === 'string' && /^[a-z0-9_-]+\.[a-z0-9_.-]+$/i.test(pos[0])) {
        registerBuiltin(scopeKey, 't', 'helper');
      } else if (
        pos.length >= 2 &&
        typeof pos[1] === 'string' &&
        /^(SHORT|LONG|FULL|MEDIUM)_(MONTH|DATE|YEAR|TIME)/.test(pos[1])
      ) {
        registerBuiltin(scopeKey, 'format-date', 'helper');
      } else if (namedKeys.includes('tabularNums') || namedKeys.includes('showPositiveSign')) {
        registerBuiltin(scopeKey, 'format-currency', 'helper');
      } else if (pos.length === 1 && namedKeys.length === 0 && parentAttr === 'disabled') {
        registerBuiltin(scopeKey, 'not', 'helper');
      }
    }
  }
  const nextAttr = (op === 15 || op === 16) && typeof node[1] === 'string' ? node[1] : null;
  for (const item of node) {
    if (Array.isArray(item)) walkBlockJson(item, scopeVars, nextAttr);
  }
}

for (const tpl of templates) {
  try {
    const parsed = JSON.parse(tpl.block);
    walkBlockJson(parsed[0] || [], tpl.scopeVars);
  } catch {
    // ignore malformed
  }
}

// Known core Glimmer helpers/modifiers from wrapper & main
const KNOWN_BUILTINS = [
  ['wrapper:DM', 'fn', 'helper'],
  ['wrapper:yN', 't-slik', 'helper'],
  ['wrapper:L3', 'tooltip', 'modifier'],
  ['wrapper:fQ', 'render-svg', 'helper'],
  ['main:Gz', 'truncate', 'helper'],
];
for (const [scopeKey, helperName, kind] of KNOWN_BUILTINS) {
  registerBuiltin(scopeKey, helperName, kind);
}

// Re-propagate newly discovered builtins across imports
for (const b of BUNDLES) {
  for (const localName of Object.keys(importsByBundle[b.name])) {
    const localKey = `${b.name}:${localName}`;
    const originId = resolveOrigin(b.name, localName);
    if (symbols[originId] && !symbols[localKey]) {
      symbols[localKey] = {
        ...symbols[originId],
        localAlias: localKey,
      };
    }
  }
}

const registry = {
  generatedAt: new Date().toISOString(),
  stats: {
    templates: templates.length,
    templatesWithClass: templates.filter((t) => t.classVar).length,
    resolverModules: Object.keys(resolverModules).length,
    mappedSymbols: Object.keys(symbols).length,
  },
  templates,
  resolverModules,
  symbols,
  exportsByBundle,
  importsByBundle,
};

fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2), 'utf8');
console.log('[link_symbols] Done:', registry.stats);
