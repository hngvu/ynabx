import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { parse } from '@babel/parser';
import traverseModule from '@babel/traverse';
import generateModule from '@babel/generator';

const traverse = traverseModule.default || traverseModule;
const generate = generateModule.default || generateModule;

const PROP_HINTS = [
  { props: ['currentTarget', 'target', 'preventDefault', 'stopPropagation', 'keyCode', 'which'], name: 'event' },
  { props: ['budgeted', 'activity', 'available', 'overspendingHandling', 'cashOutflows', 'creditOutflows'], name: 'categoryMonth' },
  { props: ['allAccounts', 'allTransactions', 'allSubTransactions', 'allMasterCategories'], name: 'budgetStore' },
  { props: ['account_name', 'account_type', 'cleared_balance', 'uncleared_balance'], name: 'account' },
  { props: ['payee_id', 'account_id', 'category_id', 'memo', 'cleared', 'approved'], name: 'transaction' },
  { props: ['readyToAssign', 'to_be_budgeted', 'leftToBudget'], name: 'monthBudget' },
  { props: ['then', 'catch', 'finally', 'resolve', 'reject'], name: 'promise' },
  { props: ['forEach', 'map', 'filter', 'reduce', 'find', 'findBy', 'firstObject'], name: 'items' },
  { props: ['trim', 'toLowerCase', 'toUpperCase', 'split', 'startsWith', 'endsWith'], name: 'str' },
];

function inferFromInit(initNode) {
  if (!initNode) return null;
  // $(event.currentTarget)
  if (
    initNode.type === 'CallExpression' &&
    initNode.callee.type === 'Identifier' &&
    initNode.callee.name === '$' &&
    initNode.arguments.length === 1
  ) {
    return 'el';
  }
  // this.something
  if (initNode.type === 'MemberExpression' && initNode.object.type === 'ThisExpression' && initNode.property.type === 'Identifier') {
    const p = initNode.property.name;
    if (p.length > 2) return p;
  }
  // obj.get('prop')
  if (
    initNode.type === 'CallExpression' &&
    initNode.callee.type === 'MemberExpression' &&
    initNode.callee.property.name === 'get' &&
    initNode.arguments[0]?.type === 'StringLiteral'
  ) {
    const key = initNode.arguments[0].value.split('.').pop();
    if (key && /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key)) return key;
  }
  return null;
}

export function renameLocalsAst(ast) {
  traverse(ast, {
    Scope(scopePath) {
      if (scopePath.isProgram()) return;
      const bindings = scopePath.scope.bindings;
      for (const [name, binding] of Object.entries(bindings)) {
        if (name.length > 2) continue;
        let candidate = null;

        // 1. Catch clause param
        if (binding.kind === 'param' && binding.path.parentPath?.isCatchClause()) {
          candidate = 'err';
        }

        // 2. VariableDeclarator init inference
        if (!candidate && binding.path.isVariableDeclarator()) {
          candidate = inferFromInit(binding.path.node.init);
        }

        // 3. Array callback (map, filter, forEach, find, some, every)
        if (!candidate && binding.kind === 'param' && binding.path.parentPath?.isArrowFunctionExpression()) {
          const fnParent = binding.path.parentPath.parentPath;
          if (fnParent?.isCallExpression() && fnParent.node.callee.type === 'MemberExpression') {
            const method = fnParent.node.callee.property.name;
            if (['map', 'filter', 'forEach', 'find', 'some', 'every'].includes(method)) {
              const idx = binding.path.parent.params.indexOf(binding.path.node);
              if (idx === 0) candidate = 'item';
              else if (idx === 1) candidate = 'idx';
            } else if (method === 'then') {
              candidate = 'res';
            } else if (method === 'catch') {
              candidate = 'err';
            }
          }
        }

        // 4. Property access hints
        if (!candidate) {
          const accessed = new Set();
          for (const ref of binding.referencePaths) {
            if (ref.parentPath?.isMemberExpression() && ref.parentPath.node.object === ref.node && ref.parentPath.node.property.type === 'Identifier') {
              accessed.add(ref.parentPath.node.property.name);
            }
          }
          for (const rule of PROP_HINTS) {
            if (rule.props.some((p) => accessed.has(p))) {
              candidate = rule.name;
              break;
            }
          }
        }

        if (candidate && candidate !== name) {
          const unique = scopePath.scope.generateUidIdentifier(candidate).name.replace(/^_/, '');
          const finalName = scopePath.scope.hasBinding(candidate) ? unique : candidate;
          if (finalName !== name && !scopePath.scope.hasBinding(finalName)) {
            scopePath.scope.rename(name, finalName);
          }
        }
      }
    },
  });
  return ast;
}

export function humanifyCodeAst(code) {
  const ast = parse(code, {
    sourceType: 'module',
    plugins: ['decorators-legacy', 'classProperties'],
    errorRecovery: true,
  });
  renameLocalsAst(ast);
  return generate(ast, { retainLines: false, compact: false }).code;
}

// CLI mode: node humanify_module.mjs <fileOrDir> [--mode=ast|llm]
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))) {
  const target = process.argv[2];
  const modeArg = process.argv.find((a) => a.startsWith('--mode=')) || '--mode=ast';
  const mode = modeArg.split('=')[1];
  if (!target) {
    console.error('Usage: node humanify_module.mjs <file_or_dir> [--mode=ast|llm]');
    process.exit(1);
  }
  const absTarget = path.resolve(target);
  const files = fs.statSync(absTarget).isDirectory()
    ? fs.readdirSync(absTarget, { recursive: true }).filter((f) => f.endsWith('.js')).map((f) => path.join(absTarget, f))
    : [absTarget];

  for (const file of files) {
    if (mode === 'llm') {
      console.log(`[humanify:llm] Running npx humanify on ${file}...`);
      execFileSync('npx', ['--yes', 'humanifyjs', 'openai', file], { stdio: 'inherit' });
    } else {
      const src = fs.readFileSync(file, 'utf8');
      const out = humanifyCodeAst(src);
      fs.writeFileSync(file, out, 'utf8');
      console.log(`[humanify:ast] Renamed locals in ${file}`);
    }
  }
}
