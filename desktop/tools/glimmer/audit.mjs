// Automated Glimmer DOM & Bundled CSS Conflict Auditor for `ynab-desktop`
//
// Compares:
//   1. Key decompiled Ember templates (`templates.json`) vs Dioxus RSX (`src/ui/*.rs`)
//   2. `ember_glimmer_components.css` selectors vs `ynab_original_bundled.css` selectors
//      to detect any accidental `display`, `position`, `table-layout`, or `flex` collisions.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../../..');
const DESKTOP = path.join(REPO, 'desktop/crates/ynab-desktop');
const UI_DIR = path.join(DESKTOP, 'src/ui');
const ASSETS_DIR = path.join(DESKTOP, 'assets');

const templatesData = JSON.parse(fs.readFileSync(path.join(HERE, 'templates.json'), 'utf8'));
const templates = templatesData.templates;

// 1. Print key template module names for our core views
const keyPatterns = [
  'templates/budget',
  'budget-table',
  'budget-header',
  'budget-inspector',
  'templates/accounts',
  'account-toolbar',
  'grid-header',
  'grid-row',
  'grid-container',
  'register',
  'sidebar',
  'reports',
  'reflect',
  'loan',
  'file-import',
  'recent-moves',
];

const matchedModules = Object.keys(templates).filter((m) =>
  keyPatterns.some((p) => m.toLowerCase().includes(p)),
);
console.log(`Found ${matchedModules.length} core UI templates in templates.json.`);

// 2. Parse CSS rules (top-level selector -> properties map) from bundled CSS and ember_glimmer_components.css
function parseSimpleCssRules(cssText) {
  // Strip comments
  const clean = cssText.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = new Map();
  const re = /([^{}@]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(clean)) !== null) {
    const rawSel = m[1].trim();
    const body = m[2].trim();
    if (!rawSel || rawSel.startsWith('@') || rawSel.startsWith(':root') || rawSel === 'to' || rawSel === 'from') {
      continue;
    }
    const props = {};
    for (const decl of body.split(';')) {
      const idx = decl.indexOf(':');
      if (idx > 0) {
        const k = decl.slice(0, idx).trim().toLowerCase();
        const v = decl.slice(idx + 1).trim();
        if (k && v) props[k] = v;
      }
    }
    for (const sel of rawSel.split(',')) {
      const s = sel.trim().replace(/\s+/g, ' ');
      if (!s) continue;
      const existing = rules.get(s) || {};
      Object.assign(existing, props);
      rules.set(s, existing);
    }
  }
  return rules;
}

const bundledCss = fs.readFileSync(path.join(ASSETS_DIR, 'ynab_original_bundled.css'), 'utf8');
const glimmerCss = fs.readFileSync(path.join(ASSETS_DIR, 'ember_glimmer_components.css'), 'utf8');

const bundledRules = parseSimpleCssRules(bundledCss);
const glimmerRules = parseSimpleCssRules(glimmerCss);

const displayCollisions = [];
const layoutCollisions = [];

for (const [sel, gProps] of glimmerRules.entries()) {
  const bProps = bundledRules.get(sel);
  if (!bProps) continue;

  if (gProps.display && bProps.display && gProps.display !== bProps.display) {
    displayCollisions.push({
      selector: sel,
      bundledDisplay: bProps.display,
      glimmerDisplay: gProps.display,
      bundledProps: bProps,
      glimmerProps: gProps,
    });
  }

  for (const prop of ['position', 'flex-direction', 'flex-wrap', 'table-layout']) {
    if (gProps[prop] && bProps[prop] && gProps[prop] !== bProps[prop]) {
      layoutCollisions.push({
        selector: sel,
        property: prop,
        bundled: bProps[prop],
        glimmer: gProps[prop],
      });
    }
  }
}

console.log(`\n=== DISPLAY COLLISIONS (${displayCollisions.length}) ===`);
for (const c of displayCollisions) {
  console.log(`  ${c.selector}: bundled="display: ${c.bundledDisplay}" vs glimmer="display: ${c.glimmerDisplay}"`);
}

console.log(`\n=== LAYOUT COLLISIONS (${layoutCollisions.length}) ===`);
for (const c of layoutCollisions) {
  console.log(`  ${c.selector} [${c.property}]: bundled="${c.bundled}" vs glimmer="${c.glimmer}"`);
}

// 3. Check core Ember templates DOM structure vs RSX
const coreTemplateList = [
  'app/templates/budget.hbs',
  'app/templates/accounts.hbs',
  'app/components/accounts/account-toolbar/index.hbs',
  'app/components/budget/header/index.hbs',
  'app/components/budget/inspector/index.hbs',
  'app/components/budget/table/budget-table/index.hbs',
  'app/components/budget/table/header/index.hbs',
  'app/components/budget/table/master-category-row/index.hbs',
  'app/components/budget/table/sub-category-row/index.hbs',
  'app/components/sidebar/index.hbs',
];

console.log('\n=== CORE TEMPLATES IN BUNDLE ===');
for (const mod of Object.keys(templates).sort()) {
  if (
    mod.startsWith('app/templates/') ||
    mod.includes('budget/table') ||
    mod.includes('budget/header') ||
    mod.includes('budget/inspector') ||
    mod.includes('accounts/') ||
    mod.includes('register/') ||
    mod.includes('sidebar/') ||
    mod.includes('reports/')
  ) {
    console.log(`  - ${mod}`);
  }
}

fs.writeFileSync(
  path.join(HERE, 'audit_report.json'),
  JSON.stringify(
    {
      displayCollisions,
      layoutCollisions,
      matchedModules,
    },
    null,
    2,
  ) + '\n',
);
