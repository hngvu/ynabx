import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { webcrack } from 'webcrack';
import { parse } from '@babel/parser';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../../..');
const ASSETS_DIR = path.join(REPO, 'ynab-ember-web/assets/ynab_web/assets');
const OUT_DIR = path.join(REPO, 'unminified/webcracked');

fs.mkdirSync(OUT_DIR, { recursive: true });

function findAsset(prefix) {
  const file = fs.readdirSync(ASSETS_DIR).find((n) => n.startsWith(prefix) && n.endsWith('.js'));
  if (!file) throw new Error(`Asset ${prefix}*.js not found in ${ASSETS_DIR}`);
  return path.join(ASSETS_DIR, file);
}

const TARGETS = [
  { prefix: 'internals-', outName: 'internals.js' },
  { prefix: 'main-', outName: 'main.js' },
  { prefix: 'wrapper-', outName: 'wrapper.js' },
];

for (const target of TARGETS) {
  const srcPath = findAsset(target.prefix);
  const outPath = path.join(OUT_DIR, target.outName);
  const code = fs.readFileSync(srcPath, 'utf8');
  console.log(`[webcrack] Processing ${path.basename(srcPath)} (${(code.length / 1024 / 1024).toFixed(2)} MB)...`);
  const t0 = Date.now();
  const result = await webcrack(code, {
    unpack: false,
    deobfuscate: true,
    unminify: true,
    jsx: false,
    mangle: false,
  });
  fs.writeFileSync(outPath, result.code, 'utf8');
  // Verify AST parseability
  parse(result.code, { sourceType: 'module', errorRecovery: false });
  const dt = ((Date.now() - t0) / 1000).toFixed(2);
  console.log(`[webcrack] Wrote ${outPath} (${(result.code.length / 1024 / 1024).toFixed(2)} MB) in ${dt}s (AST valid)`);
}
