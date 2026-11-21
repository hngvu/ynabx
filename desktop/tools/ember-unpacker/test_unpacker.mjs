import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../../..');
const EMBER_APP = path.join(REPO, 'unminified/ember_app');
const REGISTRY_PATH = path.join(EMBER_APP, 'symbol_registry.json');

function testSymbolRegistry() {
  assert.ok(fs.existsSync(REGISTRY_PATH), 'symbol_registry.json must exist');
  const reg = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));

  assert.ok(reg.templates.length >= 600, `Expected >= 600 templates, got ${reg.templates.length}`);
  assert.ok(Object.keys(reg.resolverModules).length >= 200, `Expected >= 200 resolver modules`);

  // Check ToBeBudgeted (in main.js)
  const tbbSym = reg.symbols['main:Sz'];
  assert.ok(tbbSym, 'main:Sz must be in symbol registry');
  assert.equal(tbbSym.modulePath, 'app/components/to-be-budgeted');

  // Check cross-bundle Icon (po in main.js -> zI in wrapper.js)
  const iconMainSym = reg.symbols['main:po'];
  assert.ok(iconMainSym, 'main:po must be resolved cross-bundle');
  assert.equal(iconMainSym.originId, 'wrapper:zI');
  assert.equal(iconMainSym.componentName, 'Icon');

  // Check BudgetService (CB in main.js)
  const budgetSvc = reg.symbols['main:CB'];
  assert.ok(budgetSvc, 'main:CB must be in symbol registry');
  assert.equal(budgetSvc.modulePath, 'ynab_web/services/budget');

  console.log('PASS: testSymbolRegistry');
}

async function testGlimmerDecompiler() {
  const { decompileTemplate } = await import('./decompile_glimmer.mjs');
  const reg = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));

  const headerTpl = reg.templates.find((t) => t.moduleName === 'app/components/budget-header/index.hbs');
  assert.ok(headerTpl, 'budget-header/index.hbs must exist in registry');
  const headerRes = decompileTemplate(headerTpl, reg);
  assert.ok(!headerRes.hbs.includes('scope_'), `budget-header still has unresolved scope_: ${headerRes.hbs}`);
  assert.ok(!headerRes.hbs.includes('<Component(div)>'), 'budget-header must not have <Component(div)>');
  assert.ok(headerRes.hbs.includes('<ToBeBudgeted />'), 'budget-header must render <ToBeBudgeted />');
  assert.ok(headerRes.hbs.includes('<Icon @name="chevron_left_circle" @width="30" />'), 'budget-header must render <Icon ... />');
  assert.ok(headerRes.hbs.includes('{{on "click" this.prevMonth}}'), 'budget-header must render {{on "click" this.prevMonth}}');

  const tbbTpl = reg.templates.find((t) => t.moduleName === 'app/components/to-be-budgeted/index.hbs');
  assert.ok(tbbTpl, 'to-be-budgeted/index.hbs must exist in registry');
  const tbbRes = decompileTemplate(tbbTpl, reg);
  assert.ok(!tbbRes.hbs.includes('scope_'), `to-be-budgeted still has unresolved scope_: ${tbbRes.hbs}`);
  assert.ok(tbbRes.hbs.includes('{{this.rtaState.label}}'), 'to-be-budgeted must include {{this.rtaState.label}}');

  console.log('PASS: testGlimmerDecompiler');
}

async function testUnpackedFiles() {
  const tbbHbs = path.join(EMBER_APP, 'app/components/to-be-budgeted/index.hbs');
  const tbbJs = path.join(EMBER_APP, 'app/components/to-be-budgeted/index.js');
  const indexMd = path.join(EMBER_APP, 'INDEX.md');

  assert.ok(fs.existsSync(tbbHbs), 'unpacked to-be-budgeted/index.hbs must exist');
  assert.ok(fs.existsSync(tbbJs), 'unpacked to-be-budgeted/index.js must exist');
  assert.ok(fs.existsSync(indexMd), 'INDEX.md must exist');

  const jsCode = fs.readFileSync(tbbJs, 'utf8');
  assert.ok(jsCode.includes('@service("budget")') || jsCode.includes('@service'), 'Expected restored @service decorator');
  assert.ok(jsCode.includes('@action'), 'Expected restored @action decorator');
  assert.ok(jsCode.includes('class ToBeBudgeted'), 'Expected renamed class ToBeBudgeted');

  console.log('PASS: testUnpackedFiles');
}

const mode = process.argv[2] || 'all';
if (mode === 'registry' || mode === 'all') testSymbolRegistry();
if (mode === 'glimmer' || mode === 'all') await testGlimmerDecompiler();
if (mode === 'unpacked' || mode === 'all') await testUnpackedFiles();
