// Golden-data generator for differential testing of `ynab-core` against the ORIGINAL Ember bundle.
//
// TEST TOOLING ONLY. Nothing under desktop/tools/ ships in the product (the product stays pure Rust).
//
// What it does:
//   1. Reads clone/public/assets/ynab_web/assets/wrapper-*.js (+ support-output-store-*.js for the
//      DateWithoutTime/moment class) and slices out the REAL source text of:
//        - `is` (SubcategoryCalculations)  : performMonthlySubcategoryBudgetCalculations, calculateBalance,
//                                            calculateBudgetedCashCreditOutflows, calculateGoals,
//                                            calculateCurrentGoalPeriod, goalEffectiveTargetAmount*, ...
//        - `Dg` (MonthlyCalculations)      : performCalculations (available-to-budget recurrence),
//                                            calculateLeftToBudget / calculateFundedInFuture /
//                                            calculateBudgetedInFutureMonths
//        - the Goal enums (Xa, Ga, Ja) and CurrencyFormatter.roundMilliDollars
//   2. Evaluates that text in Node with minimal stubs for bookkeeping-only collaborators (logger, id helpers).
//   3. Runs fixed, seeded inputs and writes golden.json (inputs + Ember outputs).
//
// Usage:  node generate.mjs            (writes ./golden.json next to this file)

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.resolve(HERE, '../../../clone/public/assets/ynab_web/assets');

function readNorm(name) {
  const p = path.join(ASSETS, name);
  const buf = fs.readFileSync(p);
  return { text: buf.toString('utf8').replace(/\r\n/g, '\n'), sha256: crypto.createHash('sha256').update(buf).digest('hex'), bytes: buf.length };
}
function findAsset(prefix) {
  const f = fs.readdirSync(ASSETS).find((n) => n.startsWith(prefix) && n.endsWith('.js'));
  if (!f) throw new Error(`asset ${prefix}*.js not found in ${ASSETS}`);
  return f;
}
function must(idx, what) {
  if (idx < 0) throw new Error(`anchor not found: ${what}`);
  return idx;
}
function sliceBetween(text, startAnchor, endAnchor, endKeep) {
  const s = must(text.indexOf(startAnchor), startAnchor);
  const e = must(text.indexOf(endAnchor, s), endAnchor);
  return { src: text.slice(s, e + endKeep), line: text.slice(0, s).split('\n').length };
}

const wrapperName = findAsset('wrapper-');
const storeName = findAsset('support-output-store-');
const rtName = findAsset('rolldown-runtime-');
const wrapper = readNorm(wrapperName);
const store = readNorm(storeName);
const T = wrapper.text;

// ---------------------------------------------------------------- real DateWithoutTime (moment based)
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ynab-golden-'));
fs.writeFileSync(path.join(tmp, 'rt.mjs'), fs.readFileSync(path.join(ASSETS, rtName), 'utf8').replace(/\/\/# sourceMappingURL.*$/m, ''));
fs.writeFileSync(
  path.join(tmp, 'store.mjs'),
  store.text.replace(`./${rtName}`, './rt.mjs').replace(/\/\/# sourceMappingURL.*$/m, ''),
);
const storeMod = await import(pathToFileURL(path.join(tmp, 'store.mjs')).href);
storeMod.E(); // lazy initializer of DateWithoutTime (`sa`)
const DateWithoutTime = storeMod.w;
if (typeof DateWithoutTime?.createFromISOString !== 'function') throw new Error('DateWithoutTime not initialised');

// ---------------------------------------------------------------- real enums
const enumSrc = sliceBetween(T, 'function su() {', '})(Ja || (Ja = {}));\n  }))();\n}', '})(Ja || (Ja = {}));\n  }))();\n}'.length).src;
// su (Ga), lu (Xa), cu (Ja) are lazily-initialised modules: `function su(){ return (su = n(()=>{...}))(); }`
const enums = new Function(
  `let Ga, Xa, Ja; const n = (f) => () => f();\n${enumSrc}\nsu(); lu(); cu();\nreturn { Ga, Xa, Ja };`,
)();

// ---------------------------------------------------------------- real CurrencyFormatter.roundMilliDollars
function methodSrc(anchor) {
  const s = must(T.indexOf(anchor), anchor);
  const e = must(T.indexOf('\n        }\n', s), `end of ${anchor}`);
  return T.slice(s, e + '\n        }'.length);
}
const roundInstance = methodSrc('        roundMilliDollars(t, e = Math.round) {');
const minAmount = methodSrc('        getMinimumAmount() {');
const roundStatic = methodSrc('        static roundMilliDollars(t, e, n = Math.round) {');
const Pn = { info() {}, warning() {}, warn() {}, error() {}, debug() {} };
const { CurrencyFormatterLike, UI } = new Function(
  'Pn',
  `class CurrencyFormatterLike { constructor(d){ this._currencyObj = { decimal_digits: d }; }\n${roundInstance}\n${minAmount}\n}
   class UI {\n${roundStatic}\n}
   return { CurrencyFormatterLike, UI };`,
)(Pn);
const fmt = (digits) => ({ currencyFormatter: new CurrencyFormatterLike(digits) });

// ---------------------------------------------------------------- real SubcategoryCalculations (`is`) and MonthlyCalculations (`Dg`)
const subSlice = sliceBetween(T, '(is = class t {', '\n      });\n  }))();\n}\nfunction fu(', '\n      }'.length);
const monSlice = sliceBetween(T, '(Dg = class {', '\n      });\n  }))();\n}\nfunction wm(', '\n      }'.length);
const de = {
  getMonthlySubCategoryBudgetCalculationIdFromMonthlySubCategoryBudgetId: (id) => `calc:${id}`,
  getMonthlyBudgetIdentity: (v, d) => `mb:${v}:${d.toISOString()}`,
  getMonthlyBudgetCalculationIdentity: (v, d) => `mbc:${v}:${d.toISOString()}`,
};
const names = ['Pn', 'be', 'ui', 'Xa', 'Ga', 'Ja', 'Qa', 'ro', 'de', 'ns', 'ts'];
const deps = { Pn, be: DateWithoutTime, ui: UI, ...enums, Qa: {}, ro: {}, de, ns: class {}, ts: {} };
const mk = (src) => new Function(...names, `return ${src.replace(/^\(\w+ = /, '').replace(/\)$/, '')};`)(...names.map((k) => deps[k]));
// strip the leading "(is = " so that it is a plain class expression
const SubBase = new Function(...names, `return ${subSlice.src.replace(/^\(is = /, '')};`)(...names.map((k) => deps[k]));
const MonBase = new Function(...names, `return ${monSlice.src.replace(/^\(Dg = /, '')};`)(...names.map((k) => deps[k]));
void mk;

class SubCalc extends SubBase {
  saveData() {} // persistence is not part of the math
}
const subCalc = new SubCalc();
const deviceKnowledge = (() => {
  let k = 0;
  return { incrementDeviceKnowledge: () => ++k };
})();

// ---------------------------------------------------------------- deterministic RNG
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const R = rng(0xc0ffee);
const ri = (lo, hi) => lo + Math.floor(R() * (hi - lo + 1));
const pick = (arr) => arr[ri(0, arr.length - 1)];
// USD has 2 decimals => Ember rounds to 10 milliunits. Keep every money input a multiple of 10 so the
// rounding is a no-op and any difference is real math, not currency precision.
const money = (lo, hi) => ri(Math.ceil(lo / 10), Math.floor(hi / 10)) * 10;

const pad = (n) => String(n).padStart(2, '0');
const ym = (idx) => `${2026 + Math.floor(idx / 12)}-${pad((((idx % 12) + 12) % 12) + 1)}`; // idx 0 = 2026-01, idx -1 = 2025-12
const iso = (idx, day = 1) => `${ym(idx)}-${pad(day)}`;

// ================================================================= 1. MONTHLY (ATB recurrence, funded-in-future, left-to-budget)
const monthly = [];
for (let c = 0; c < 300; c++) {
  const n = ri(1, 7);
  const rows = [];
  for (let i = 0; i < n; i++) {
    rows.push({
      month: iso(i),
      immediateIncome: R() < 0.5 ? money(0, 6_000_000) : 0,
      additionalToBeBudgeted: R() < 0.2 ? money(0, 500_000) : 0,
      budgeted: R() < 0.85 ? money(-200_000, 5_000_000) : 0,
      overSpent: R() < 0.3 ? -money(10, 800_000) : 0,
    });
  }
  class MonCalc extends MonBase {
    loadData() {
      return {
        be_monthly_budgets: [],
        monthlySubCategoryBudgetsAggregated: rows.map((r) => ({ ...r })),
      };
    }
    saveData(t, e, agg) {
      this.out = agg;
    }
  }
  const mc = new MonCalc();
  mc.performCalculations('bv', deviceKnowledge, { formattingManager: fmt(2) }, DateWithoutTime.createFromISOString(rows[0].month), DateWithoutTime.createFromISOString(rows[n - 1].month));
  const entities = rows.map((r) => ({ month: DateWithoutTime.createFromISOString(r.month), monthlyBudgetCalculation: { budgeted: r.budgeted } }));
  const expected = mc.out.map((o, i) => {
    const futureBudgeted = MonBase.calculateBudgetedInFutureMonths(entities[i].month, null, entities);
    return {
      month: rows[i].month,
      availableToBudget: o.availableToBudget,
      budgetedInFuture: futureBudgeted,
      fundedInFuture: MonBase.calculateFundedInFuture(o.availableToBudget, futureBudgeted),
      leftToBudget: MonBase.calculateLeftToBudget(o.availableToBudget, futureBudgeted),
    };
  });
  monthly.push({ id: `monthly-${c}`, input: rows, expected });
}

// ================================================================= helpers for subcategory runs
const FIRST_MONTH = DateWithoutTime.createFromISOString('2025-01-01');
function runSub({ type, monthIdx, prev, budgeted, cash, credit, goal, accountId }) {
  const sc = {
    isTombstone: false,
    masterCategoryId: 'm1',
    type,
    accountId: accountId ?? null,
    internalName: null,
    name: 'c',
    sortableIndex: 0,
    pinnedIndex: null,
    note: null,
    ...(goal ?? {}),
  };
  const ctx = {
    subCategoriesMap: { c1: sc },
    masterCategoriesMap: { m1: { name: 'm', internalName: null, sortableIndex: 0 } },
    firstBudgetMonth: FIRST_MONTH,
    formattingManager: fmt(2),
    accountBalancesByAccountId: {},
    paymentCategories: [],
  };
  const rows = [];
  if (prev) {
    rows.push({
      entityId: 'prev', subCategoryId: 'c1', month: iso(monthIdx - 1), isTombstone: false,
      budgeted: 0, cashOutflows: 0, creditOutflows: 0,
      balance: prev.balance, goalOverallFunded: prev.goalOverallFunded ?? 0, goalOverallOutflows: prev.goalOverallOutflows ?? 0,
    });
  }
  const cur = { entityId: 'cur', subCategoryId: 'c1', month: iso(monthIdx), isTombstone: false, budgeted, cashOutflows: cash, creditOutflows: credit };
  rows.push(cur);
  subCalc.performMonthlySubcategoryBudgetCalculations('bv', deviceKnowledge, ctx, DateWithoutTime.createFromISOString(iso(monthIdx)), rows);
  return cur;
}

// ================================================================= 2. SUBCATEGORY balance / cash-credit split
const subcategory = [];
for (let c = 0; c < 800; c++) {
  const type = R() < 0.25 ? 'DBT' : 'DFT';
  const prev = R() < 0.6 ? { balance: money(-1_000_000, 3_000_000) } : null;
  const budgeted = R() < 0.9 ? money(-100_000, 3_000_000) : 0;
  const cash = R() < 0.7 ? -money(0, 3_000_000) : money(0, 200_000);
  const credit = type === 'DBT' ? 0 : R() < 0.5 ? -money(0, 2_000_000) : 0;
  const out = runSub({ type, monthIdx: 5, prev, budgeted, cash, credit });
  subcategory.push({
    id: `sub-${c}`,
    input: { type, prev_balance: prev ? prev.balance : null, budgeted, cash_outflows: cash, credit_outflows: credit },
    expected: {
      balance: out.balance,
      balancePreviousMonth: out.balancePreviousMonth ?? null,
      budgetedCashOutflows: out.budgetedCashOutflows,
      unBudgetedCashOutflows: out.unBudgetedCashOutflows,
      budgetedCreditOutflows: out.budgetedCreditOutflows,
      unBudgetedCreditOutflows: out.unBudgetedCreditOutflows,
    },
  });
}

// ================================================================= 3. GOALS (calculateGoals through the real per-row pipeline)
const goals = [];
const GOAL_FIELDS = ['goalOverallFunded', 'goalOverallOutflows', 'goalTarget', 'goalUnderFunded', 'goalOverallLeft', 'goalExpectedCompletion', 'goalPercentageComplete'];
for (let c = 0; c < 1500; c++) {
  const goalType = pick(['MF', 'TB', 'TBD', 'NEED', 'DEBT']);
  const monthIdx = ri(0, 17);
  const createdIdx = Math.max(0, monthIdx - ri(0, 14));
  const amount = money(10_000, 3_000_000);
  let cadence = 0;
  let freq = null;
  let goalDay = null;
  let targetIdx = null;
  if (goalType === 'MF' || goalType === 'DEBT') {
    cadence = 1;
    freq = 1;
  } else if (goalType === 'TBD') {
    cadence = 0;
    targetIdx = monthIdx + ri(0, 18);
  } else if (goalType === 'NEED') {
    cadence = pick([1, 1, 2, 13, 3, 4, 7, 14]);
    freq = cadence === 2 ? pick([1, 1, 2]) : 1;
    if (cadence === 2) goalDay = ri(0, 6);
    else if (cadence === 1 && R() < 0.5) goalDay = ri(1, 28);
    if (cadence !== 1 || R() < 0.3) targetIdx = createdIdx + ri(0, 14);
  }
  const needsWhole = goalType === 'NEED' ? R() < 0.5 : false;
  const prev = R() < 0.4 ? { balance: money(0, 2_000_000), goalOverallFunded: money(0, 2_000_000), goalOverallOutflows: -money(0, 1_000_000) } : null;
  const budgeted = money(0, 2_500_000);
  const cash = R() < 0.6 ? -money(0, 2_000_000) : 0;
  const goal = {
    goalType,
    goalCadence: cadence,
    goalCadenceFrequency: freq,
    goalDay,
    goalCreatedOn: iso(createdIdx),
    goalTargetDate: targetIdx == null ? null : iso(targetIdx),
    goalTargetAmount: amount,
    monthlyFunding: amount,
    goalNeedsWholeAmount: needsWhole,
  };
  const out = runSub({ type: 'DFT', monthIdx, prev, budgeted, cash, credit: 0, goal });
  const expected = { balance: out.balance };
  for (const f of GOAL_FIELDS) expected[f] = out[f] ?? null;
  goals.push({
    id: `goal-${c}`,
    input: {
      month: ym(monthIdx), goalType, cadence, cadenceFrequency: freq, goalDay,
      createdMonth: ym(createdIdx), targetMonth: targetIdx == null ? null : ym(targetIdx),
      targetAmount: amount, goalNeedsWholeAmount: needsWhole,
      budgeted, cashOutflows: cash, prev,
    },
    expected,
  });
}

// ================================================================= 4. GOAL PERIOD (calculateCurrentGoalPeriod)
const goalPeriods = [];
for (let c = 0; c < 800; c++) {
  const goalType = pick(['MF', 'DEBT', 'TB', 'TBD', 'NEED']);
  const monthIdx = ri(0, 30);
  const createdIdx = Math.max(0, monthIdx - ri(0, 20));
  const cadence = goalType === 'NEED' ? pick([1, 2, 13, 3, 4, 5, 6, 7, 14]) : goalType === 'MF' || goalType === 'DEBT' ? 1 : 0;
  const freq = cadence === 0 ? null : cadence === 2 ? pick([1, 2, 3]) : 1;
  const goalDay = cadence === 2 ? ri(0, 6) : cadence === 1 && R() < 0.4 ? ri(1, 28) : null;
  const targetIdx = goalType === 'TBD' || (goalType === 'NEED' && (cadence !== 1 || R() < 0.4)) ? createdIdx + ri(0, 18) : null;
  const created = DateWithoutTime.createFromISOString(iso(createdIdx));
  const target = targetIdx == null ? null : DateWithoutTime.createFromISOString(iso(targetIdx));
  const today = DateWithoutTime.createFromISOString(iso(monthIdx));
  const p = SubBase.calculateCurrentGoalPeriod(created, target, goalType, cadence, freq, goalDay, today);
  goalPeriods.push({
    id: `period-${c}`,
    input: { month: ym(monthIdx), goalType, cadence, cadenceFrequency: freq, goalDay, createdMonth: ym(createdIdx), targetMonth: targetIdx == null ? null : ym(targetIdx) },
    expected: {
      startMonth: p.goalStartDate.format('YYYY-MM'),
      finishMonth: p.goalFinishDate.format('YYYY-MM'),
      monthsInGoalPeriod: p.monthsInGoalPeriod,
      monthsFromMonthToFinish: today.isAfter(p.goalFinishDate) ? 0 : today.monthsApart(p.goalFinishDate) + 1,
    },
  });
}

// ================================================================= 5. WEEKLY NEED effective target (goalEffectiveTargetAmount, weekly)
const weekly = [];
for (let c = 0; c < 400; c++) {
  const monthIdx = ri(0, 23);
  const createdIdx = Math.max(0, monthIdx - ri(0, 6));
  const dow = R() < 0.15 ? null : ri(0, 6);
  const amount = money(10_000, 500_000);
  const freq = pick([1, 1, 2]);
  const created = DateWithoutTime.createFromISOString(iso(createdIdx));
  const month = DateWithoutTime.createFromISOString(iso(monthIdx));
  const v = SubBase.goalEffectiveTargetAmount('NEED', 2, freq, dow, created, 0, amount, 'DFT', null, null, month);
  weekly.push({ id: `weekly-${c}`, input: { month: ym(monthIdx), createdMonth: ym(createdIdx), goalDay: dow, targetAmount: amount, cadenceFrequency: freq }, expected: { effectiveTarget: v } });
}

const golden = {
  meta: {
    generator: 'desktop/tools/golden/generate.mjs',
    node: process.version,
    currency: 'USD (decimal_digits=2 => Ember rounds to 10 milliunits; all inputs are multiples of 10)',
    bundle: { wrapper: wrapperName, wrapperBytes: wrapper.bytes, wrapperSha256: wrapper.sha256, dateModule: storeName, dateModuleSha256: store.sha256 },
    extractedFrom: { SubcategoryCalculations_line: subSlice.line, MonthlyCalculations_line: monSlice.line },
    counts: { monthly: monthly.length, subcategory: subcategory.length, goals: goals.length, goalPeriods: goalPeriods.length, weekly: weekly.length },
  },
  monthly, subcategory, goals, goalPeriods, weekly,
};
fs.writeFileSync(path.join(HERE, 'golden.json'), JSON.stringify(golden, null, 1) + '\n');
fs.rmSync(tmp, { recursive: true, force: true });
process.stdout.write(`wrote golden.json ${JSON.stringify(golden.meta.counts)}\n`);
