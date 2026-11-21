import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '@babel/parser';
import traverseModule from '@babel/traverse';

const traverse = traverseModule.default || traverseModule;

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../../..');
const WRAPPER_JS = path.join(REPO, 'unminified/webcracked/wrapper.js');
const OUT_EMBER = path.join(REPO, 'unminified/ember_app/locales_en.json');
const OUT_REACT = path.join(REPO, 'unminified/react_app/src/locales_en.json');

console.log('[extract_locales] Parsing wrapper.js...');
const code = fs.readFileSync(WRAPPER_JS, 'utf8');
const ast = parse(code, { sourceType: 'module' });

const locales = {};
let i18nCount = 0;
let slikCount = 0;

traverse(ast, {
  ObjectExpression(p) {
    // Look for the giant English i18n object containing "rta.readyToAssign"
    if (p.node.properties.length < 200) return;
    const hasRta = p.node.properties.some(
      (pr) => pr.type === 'ObjectProperty' && pr.key.type === 'StringLiteral' && pr.key.value === 'rta.readyToAssign'
    );
    if (!hasRta) return;
    for (const pr of p.node.properties) {
      if (
        pr.type === 'ObjectProperty' &&
        pr.key.type === 'StringLiteral' &&
        pr.value.type === 'StringLiteral'
      ) {
        locales[pr.key.value] = pr.value.value;
        i18nCount++;
      }
    }
  },
  ClassBody(p) {
    // Look for the static Strings class containing static get Reflect_SpendingBreakdown()
    const hasReflect = p.node.body.some(
      (m) => m.type === 'ClassMethod' && m.static && m.kind === 'get' && m.key.name === 'Reflect_SpendingBreakdown'
    );
    if (!hasReflect) return;
    for (const m of p.node.body) {
      if (
        m.type === 'ClassMethod' &&
        m.static &&
        m.kind === 'get' &&
        m.key?.name &&
        m.body?.body?.[0]?.type === 'ReturnStatement' &&
        m.body.body[0].argument?.type === 'StringLiteral'
      ) {
        locales[m.key.name] = m.body.body[0].argument.value;
        slikCount++;
      }
    }
  },
});

fs.writeFileSync(OUT_EMBER, JSON.stringify(locales, null, 2) + '\n', 'utf8');
fs.writeFileSync(OUT_REACT, JSON.stringify(locales, null, 2) + '\n', 'utf8');
console.log(`[extract_locales] Extracted ${i18nCount} ember-intl keys + ${slikCount} SLIK static strings = ${Object.keys(locales).length} total keys.`);
