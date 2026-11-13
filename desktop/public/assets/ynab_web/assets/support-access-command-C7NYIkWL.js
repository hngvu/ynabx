import { n as t, r as e } from "./rolldown-runtime-DEpHKc_W.js";
import {
  E as n,
  _ as o,
  a,
  b as s,
  c as r,
  d as c,
  g as i,
  n as u,
  o as d,
  p as l,
  r as g,
  s as h,
  w as C,
  x as m,
} from "./support-output-store-Dy-pLKuy.js";
var f = e({
  accountTransactionType: () => p,
  assembleTransactionTypeData: () => b,
});
function y(t) {
  let e;
  return (
    (e =
      null === t.importedPayee || null === t.providerCleansedPayee
        ? "Unknown"
        : t.importedPayee === t.providerCleansedPayee
        ? "Provider"
        : "YNAB"),
    {
      id: t.entityId,
      date: t.date.toISOString(),
      amount: t.amount,
      source: t.source || "User",
      approved: t.accepted,
      cleared: t.cleared,
      imported_payee: t.importedPayee,
      provider_cleansed_payee: t.providerCleansedPayee,
      cleansed_by: e,
      imported_date: t.importedDate && t.importedDate.toISOString(),
      memo: t.memo,
      matched_id: t.matchedTransactionId,
    }
  );
}
function A(t) {
  return {
    id: t.entityId,
    originalScheduledDate: t.date.toISOString(),
    nextScheduledDate: t.firstUpcomingInstanceDate.toISOString(),
    amount: t.amount,
    memo: t.memo,
  };
}
function b(t, e) {
  const n = t.map((t) => e.getTransactionById(t)).filter((t) => t),
    o = t.map((t) => e.getScheduledTransactionById(t)).filter((t) => t),
    a = n
      .map((t) => t.matchedTransactionId)
      .filter((t) => t)
      .map((t) => e.getTransactionById(t))
      .filter((t) => t);
  return {
    transactions: n.map(y),
    scheduledTransactions: o.map(A),
    matchedTransactions: a.map(y),
  };
}
function p(t) {
  const e = $("[data-row-id].is-checked")
    .get()
    .map((t) => t.getAttribute("data-row-id"));
  e.length || console.warn("No transactions are selected.");
  const {
    transactions: n,
    scheduledTransactions: o,
    matchedTransactions: a,
  } = b(e, t);
  console.table(n),
    o.length &&
      (console.group("Scheduled:"), console.table(o), console.groupEnd()),
    a.length &&
      (console.group("Matches (hidden):"),
      console.table(a),
      console.groupEnd());
}
function M() {
  return (M = t(() => {}))();
}
var I = e({ budgetBigBudget: () => B });
function B(
  t,
  e = {
    budgetFirstMonthAlertAtYearsAgo: 5,
    entityCountAlertAt: 45e3,
    transactionAlertAtCount: 2e4,
    categoryAlertAtCount: 200,
    accountAlertAtCount: 50,
  }
) {
  const n = t.getFirstMonthForBudget(),
    o =
      n.monthsApart(C.createForToday()) >
      12 * e.budgetFirstMonthAlertAtYearsAgo,
    a = (function () {
      let e = 0;
      return (
        Object.values(t.getChangedCatalogEntities(-1)).forEach((t) =>
          Array.isArray(t) ? (e += t.length) : e++
        ),
        Object.values(t.getChangedBudgetEntities(-1)).forEach((t) =>
          Array.isArray(t) ? (e += t.length) : e++
        ),
        e
      );
    })(),
    s = a >= e.entityCountAlertAt,
    r = t
      .getAllTransactions()
      .filter(
        (t) => l(t.source) && 0 == t.isTombstone && 0 == t.account?.isTombstone
      ).length,
    c = r >= e.transactionAlertAtCount,
    i = t
      .getAllSubCategories()
      .filter((t) => 0 == t.isTombstone && !t.isInternalCategory()).length,
    u = i >= e.categoryAlertAtCount,
    d = t.getAllAccounts().filter((t) => 0 == t.isTombstone).length,
    g = d >= e.accountAlertAtCount;
  function h(t, e = !1, n = !1) {
    console.log(
      `%c ${t}${e && n ? " 🚨" : ""}`,
      (e ? "color: red;" : "") + " font-size: 14px"
    );
  }
  console.group(
    "%cBudget Statistics",
    "color: #20316E; font-weight: bold; font-size: 18px;"
  ),
    h(`First budget month: ${n.toISOString()}`, o, !0),
    h(`Number of entities: ${a}`, s, !0),
    h(`    transactions: ${r}`, c),
    h(`    categories: ${i}`, u),
    h(`    accounts: ${d}`, g),
    (o || s) &&
      h(
        "🚨 This budget is large and may be experiencing performance issues!",
        !0,
        !1
      ),
    console.groupEnd();
}
function T() {
  return (T = t(() => {
    c(), n();
  }))();
}
var S = e({ budgetCashTotal: () => w });
function w(t) {
  const e = ynab.YNABSharedLibWebInstance.firstInstanceCreated;
  function n(t) {
    return e.currencyFormatter.format(t, { includeSymbol: !0 });
  }
  const o = e.viewModelManager.getBudgetViewModel(
      a.AllBudgetMonthsViewModel,
      null
    ).sidebarViewModel,
    s = o.cashAccounts.concat(o.creditAccounts, o.closedAccounts);
  let r = 0,
    c = !1,
    i = !1;
  const u = [],
    d = [];
  for (const a of s) {
    if (!a.onBudget) continue;
    const e = t.getAccountMonthlyCalculationByAccountIdAndMonth(
      a.entityId,
      C.createForCurrentMonth()
    ).rollingBalance;
    if (e > 0 || (e < 0 && !a.isCreditAccount)) {
      r += e;
      const t = n(e);
      let o = a.accountName;
      a.isCreditAccount && ((i = !0), (o += " (credit)")),
        a.isClosed && ((c = !0), (o += " (closed)")),
        u.push({ Account: o, Balance: t }),
        d.push(t);
    }
  }
  const l = n(r);
  u.push({ Account: "TOTAL", Balance: l });
  const g = Math.max(...d.map((t) => t.length));
  u.forEach((t) => {
    (t.Balance = t.Balance.padStart(g, " ")),
      (t.Balance = t.Balance.replace(/ /g, " "));
  });
  const h = `${d.join(" + ")} = ${l}`;
  console.table(u),
    c && console.warn("Balance in closed account"),
    i && console.warn("Positive balance on credit card"),
    console.log(h);
}
function v() {
  return (v = t(() => {
    d(), n();
  }))();
}
var F = e({ budgetHiddenBalances: () => O });
function O(t) {
  console.warn("////\n//// HIDDEN CATEGORIES WITH BALANCES\n////");
  var e = t.getAllSubCategories().filter((t) => t.isHidden),
    n = (e, n) => {
      const o = C.createForToday().addMonths(n),
        a = i.getMonthlySubCategoryBudgetCalculationIdentity(e.entityId, o),
        s = t.getMonthlySubCategoryBudgetCalculationById(a);
      return s ? s.balance : 0;
    },
    o = (t) =>
      (t / 1e3).toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
      }),
    a = e.reduce((t, e) => {
      const a = n(e, -1),
        s = n(e, 0),
        r = n(e, 1);
      return (
        (0 === a && 0 === s && 0 === r) ||
          t.push({
            hiddenCategoryName: e.name,
            balanceLastMonth: o(a),
            balanceThisMonth: o(s),
            balanceNextMonth: o(r),
          }),
        t
      );
    }, []);
  a.length > 0
    ? console.table(a)
    : console.info("No hidden categories with balances found.");
}
function N() {
  return (N = t(() => {
    n(), o();
  }))();
}
var D = e({
  formatCurrency: () => R,
  formatMonthYear: () => P,
  getAllMonthlySubCategoryBudgets: () => H,
  getAssignedForMonth: () => _,
  getAvailableForMonth: () => x,
  getRelevantTransactions: () => E,
});
function R(t) {
  return ynab.YNABSharedLibWebInstance.firstInstanceCreated.currencyFormatter.format(
    t,
    { includeSymbol: !0 }
  );
}
function P(t) {
  return t.format(h.SHORT_MONTH_AND_YEAR);
}
function E(t) {
  const e = [],
    n = s.SplitSubCategory,
    o = t
      .getAllTransactions()
      .filter((t) =>
        t.account
          ? t.account &&
            t.account.onBudget &&
            !t.isTombstone &&
            !t.account.isTombstone &&
            t.subCategory?.name != n &&
            "Pending" != t.source &&
            ynab.isSourceDisplayable(t.source)
          : (console.warn("Transaction with undefined account:", t), !1)
      );
  e.push(...o);
  const a = ynab.YNABSharedLib.defaultInstance.entityManager
    .getAllSubTransactions()
    .filter(
      (t) =>
        t.account &&
        t.account.onBudget &&
        !t.isTombstone &&
        !t.account.isTombstone
    );
  return e.push(...a), e;
}
function _(t, e) {
  const n =
      ynab.utilities.KeyGenerator.getMonthlySubCategoryBudgetCalculationIdentity(
        e.entityId,
        t
      ),
    o =
      ynab.YNABSharedLib.defaultInstance.entityManager.getMonthlySubCategoryBudgetCalculationById(
        n
      );
  return o ? o.budgeted : 0;
}
function x(t, e) {
  const n =
      ynab.utilities.KeyGenerator.getMonthlySubCategoryBudgetCalculationIdentity(
        e.entityId,
        t
      ),
    o =
      ynab.YNABSharedLib.defaultInstance.entityManager.getMonthlySubCategoryBudgetCalculationById(
        n
      );
  return o ? o.balance : 0;
}
function H(t) {
  const e = t.getFirstMonthForBudget(),
    n = t.getLastMonthForBudget();
  let o = [];
  const a = e.clone();
  for (; !a.isAfter(n); ) {
    const e = t.getMonthlySubCategoryBudgetsByMonth(a);
    (o = o.concat(e)), a.addMonths(1).startOfMonth();
  }
  return o;
}
function L() {
  return (L = t(() => {
    m(), r();
  }))();
}
var Y = e({ budgetNegativeAssigningInFuture: () => j });
function j(t) {
  const e = t.getLastMonthForBudget();
  let n = [];
  const o = C.createForCurrentMonth().addMonths(1);
  for (; !o.isAfter(e); ) {
    const e = t.getMonthlySubCategoryBudgetsByMonth(o);
    (n = n.concat(e)), o.addMonths(1).startOfMonth();
  }
  const a = n.filter(
    (t) =>
      t.budgeted < 0 && t.subCategory?.name !== s.ImmediateIncomeSubCategory
  );
  if (0 === a.length)
    return void console.info("No negative assigning in future found.");
  const r = a.map((t) => {
      return {
        Month: ((e = t.month), e.format(h.LONG_MONTH_AND_YEAR)),
        Category: t.subCategory.name,
        Assigned: R(t.budgeted),
      };
      var e;
    }),
    c = r.reduce(
      (t, e) => (
        t[e.Month] || (t[e.Month] = []), t[e.Month].push(e.Category), t
      ),
      {}
    ),
    i = Object.entries(c)
      .map(
        ([t, e]) =>
          `In ${t}, ${(function (t) {
            return 1 === t.length
              ? `the category with negative assigning is ${t[0]}`
              : `the categories with negative assigning are ${t
                  .slice(0, -1)
                  .join(", ")} and ${t.slice(-1)}`;
          })(e)}`
      )
      .join(". ")
      .concat(".");
  console.table(r), console.log(i);
}
function U() {
  return (U = t(() => {
    n(), L(), m(), r();
  }))();
}
var z,
  k,
  W,
  K = e({
    DeltaCause: () => k,
    DeltaCausesForMonth: () => z,
    DeltaSubCause: () => W,
  });
function G() {
  return (G = t(() => {
    (z = class {
      constructor(t, e) {}
      addCause(t, e) {}
      getCause(t) {
        return 0;
      }
    }),
      (k = class {
        description;
        amount;
        subCauses;
        constructor(t, e, n = []) {
          if (
            ((this.description = t),
            (this.amount = e),
            (this.subCauses = n),
            0 === this.subCauses.length && void 0 === this.amount)
          )
            throw new Error(
              "A DeltaCause with no subCauses must have a specified amount."
            );
        }
        getDescription() {
          return this.description;
        }
        getAmount() {
          return void 0 !== this.amount
            ? this.amount
            : this.subCauses.reduce((t, e) => t + e.getAmount(), 0);
        }
        getSubCauses() {
          return this.subCauses;
        }
        findSubCauseByDescription(t) {
          return this.subCauses.find((e) => e.getDescription() === t);
        }
      }),
      (W = class {
        description;
        amount;
        constructor(t, e) {
          (this.description = t), (this.amount = e);
        }
        getDescription() {
          return this.description;
        }
        getAmount() {
          return this.amount;
        }
      });
  }))();
}
var V,
  q = e({ CCAlgoService: () => V });
function J() {
  return (J = t(() => {
    n(),
      G(),
      L(),
      (V = class {
        entityManager;
        algosByMonth;
        constructor(t) {
          (this.entityManager = t),
            (this.algosByMonth = new Map()),
            this.calculateAllAlgos();
        }
        getAlgosForMonthAndAccount(t, e) {
          const n = t.toISOString().substring(0, 7),
            o = this.algosByMonth.get(n);
          if (!o || !o.has(e)) return new k("CC Algo", 0);
          const a = o.get(e),
            s = a.reduce((t, e) => t + e.getAmount(), 0);
          return new k("CC Algo", s, a);
        }
        calculateAllAlgos() {
          const t = this.entityManager.getFirstMonthForBudget(),
            e = this.entityManager.getLastMonthForBudget(),
            n = new Map(),
            o = this.getUncategorizedSubCategoryId(),
            a = E(this.entityManager),
            s = H(this.entityManager),
            r = this.groupTransactionsByMonthAndCategory(a, o);
          for (const c of s) {
            const a = this.getTransactionsForCategoryMonth(c, r);
            if (!this.isCCAlgoCandidate(c, a, o, t, e)) continue;
            const s = a.filter((t) => t.account.isCreditAccount),
              i = this.calculateCategoryMonthBaseline(c, a);
            this.processCCAlgoForCategoryMonth(c, s, i, n);
          }
        }
        groupTransactionsByMonthAndCategory(t, e) {
          return t.reduce((t, n) => {
            const o = n.date.toISOString().substring(0, 7);
            let a;
            if (n.subCategoryId) a = n.subCategoryId;
            else {
              if (
                !n.subCategoryId &&
                n.isTransferTransaction() &&
                n.transferAccount.onBudget
              )
                return t;
              a = e;
            }
            return (
              t[o] || (t[o] = {}), t[o][a] || (t[o][a] = []), t[o][a].push(n), t
            );
          }, {});
        }
        getTransactionsForCategoryMonth(t, e) {
          const n = e[t.month.toISOString().substring(0, 7)];
          return n && n[t.subCategoryId] ? n[t.subCategoryId] : [];
        }
        isCCAlgoCandidate(t, e, n, o, a) {
          if ("DFT" != t.subCategory.type && t.subCategoryId !== n) return !1;
          if (t.month < o || t.month > a) return !1;
          if (0 == e.length) return !1;
          if (!e.find((t) => t.account.isCreditAccount && t.amount > 0))
            return !1;
          const s = e.filter((t) => t.account.isCreditAccount);
          return !(new Set(s.map((t) => t.account)).size < 2);
        }
        calculateCategoryMonthBaseline(t, e) {
          const n = t.month.clone().subtractMonths(1);
          let o = Math.max(x(n, t.subCategory), 0) + t.budgeted;
          return (o += e.reduce((t, e) => t + e.cashAmount, 0)), o;
        }
        processCCAlgoForCategoryMonth(t, e, n, o) {
          const a =
            t.monthlySubCategoryBudgetCalculation.unBudgetedCreditOutflows;
          a && this._removeRealOverspending(e, a, o);
          const s = this._findCCAlgoChunks(e, n, o),
            r = this._getTotalCCAlgoByAccount(s);
          this.storeAlgoResults(t, r);
        }
        storeAlgoResults(t, e) {
          if (0 === e.length) return;
          const n = t.month.toISOString().substring(0, 7);
          for (const o of e) {
            const a = e
              .filter((t) => t.accountId !== o.accountId)
              .map(
                (t) =>
                  this.entityManager.getAccountById(t.accountId).accountName
              );
            this._storeAlgoForMonthAndAccount(
              n,
              o.accountId,
              t.subCategory.name,
              o.amount,
              a
            );
          }
        }
        getUncategorizedSubCategoryId() {
          return this.entityManager.getSubCategoryByInternalName(
            "Category/__None__"
          ).entityId;
        }
        _removeRealOverspending(t, e, n) {
          if (e >= 0) return;
          let o = -e;
          const a = t
            .filter((t) => t.creditAmountAdjusted < 0)
            .sort((t, e) => C.compare(e.date, t.date));
          for (const s of a) {
            const t = o + s.creditAmountAdjusted;
            if (!(t > 0)) {
              if (0 == t) {
                n.set(s.entityId, 0);
                break;
              }
              n.set(s.entityId, t);
              break;
            }
            n.set(s.entityId, 0), (o = t);
          }
        }
        _findCCAlgoChunks(t, e, n) {
          let o,
            a = e < 0 ? 0 : e;
          const s = [],
            r = ynab.array.sortBy(t, ["date", "amount"]);
          for (const c of r) {
            const t = c.account.entityId,
              e = n.get(c.entityId) ?? c.creditAmountAdjusted;
            (o = a + e),
              e < 0 &&
                o < 0 &&
                s.push({ accountId: t, amount: a <= 0 ? e : o }),
              e > 0 &&
                (o <= 0 && a < 0 && s.push({ accountId: t, amount: e }),
                o > 0 && a < 0 && s.push({ accountId: t, amount: e - o })),
              (a = o);
          }
          return s;
        }
        _getTotalCCAlgoByAccount(t) {
          let e = 0;
          const n = [];
          return (
            t.forEach((t) => {
              const o = n.findIndex((e) => e.accountId === t.accountId);
              -1 !== o
                ? (n[o].amount += t.amount)
                : n.push({ accountId: t.accountId, amount: t.amount }),
                (e += t.amount);
            }),
            0 !== e &&
              (console.error("Non-zero-sum CC Algo alert!"),
              console.error(n),
              console.error("Please DM Matthew with the Kustomer link")),
            n
          );
        }
        _storeAlgoForMonthAndAccount(t, e, n, o, a) {
          this.algosByMonth.has(t) || this.algosByMonth.set(t, new Map());
          const s = this.algosByMonth.get(t);
          s.has(e) || s.set(e, []);
          const r = s.get(e);
          "None" === n && (n = "Uncategorized");
          const c = a.length > 0 ? ` (↔ ${a.join(", ")})` : "";
          r.push(new W(`CC Algo in ${n}${c}`, o));
        }
      });
  }))();
}
var Q,
  X,
  Z = e({ CCAccountCalculator: () => Q });
function tt() {
  return (tt = t(() => {
    m(),
      n(),
      L(),
      G(),
      J(),
      (Q = class t {
        transactions;
        accountId;
        CCPCId;
        entityManager;
        static algoService = null;
        static algoServiceKnowledge = -1;
        constructor(t, e) {
          (this.transactions = new X(t, e)),
            (this.accountId = e),
            (this.entityManager = t),
            (this.CCPCId = t.getAccountById(e).accountSubCategory.entityId);
        }
        doAllMonthlyCalculations() {}
        calculateForMonth(t) {}
        getOverspendingForMonth(t) {
          if (!this.entityManager.getAccountById(this.accountId))
            throw new Error("Credit card account not found");
          const e = this.entityManager
            .getMonthlySubCategoryBudgetsByMonth(t.startOfMonth())
            .find((t) => t.subCategoryId === this.CCPCId);
          if (!e) return new k("Overspending", 0);
          const n = e.monthlySubCategoryBudgetCalculation,
            o = n?.allSpending,
            a = n?.budgetedSpending,
            s =
              a -
              o +
              this.transactions
                .getTransactionsForMonth(t)
                .reduce(
                  (t, e) =>
                    e.subCategory &&
                    e.subCategory.isImmediateIncomeCategory() &&
                    "Starting Balance" !== e.payee?.name
                      ? t + e.creditAmount
                      : t,
                  0
                ),
            r = this.getHiddenCategoriesWithOverspending(t).map(
              (t) => new W(`Hidden: ${t}`, 0)
            );
          return new k("Overspending", s, r);
        }
        getHiddenCategoriesWithOverspending(t) {
          const e = this.entityManager.getMonthlySubCategoryBudgetsByMonth(
              t.startOfMonth()
            ),
            n = [],
            o = this.transactions.getTransactionsForMonth(t),
            a = new Set();
          return (
            o.forEach((t) => {
              t.subCategory &&
                !t.subCategory.isImmediateIncomeCategory() &&
                a.add(t.subCategory.entityId);
            }),
            a.forEach((t) => {
              const o = e.find((e) => e.subCategoryId === t);
              if (o) {
                const e = o.monthlySubCategoryBudgetCalculation;
                if (e && e.unBudgetedCreditOutflows < 0) {
                  const e = this.entityManager.getSubCategoryById(t);
                  e && e.isHidden && n.push(e.name);
                }
              }
            }),
            n.sort()
          );
        }
        getOverpaymentsForMonth(t) {
          const e = this.transactions
            .getTransactionsForMonth(t)
            .filter(
              (t) =>
                t.amount > 0 &&
                t.isTransferTransaction() &&
                t.transferAccount.onBudget
            )
            .reduce((t, e) => t + e.cashAmount, 0);
          return new k("Overpayment", -e);
        }
        getCashAdvancesForMonth(t) {
          const e =
              this.getTransfersToCreditCardAccountsForMonth(t).getAmount(),
            n = this.getTransfersToCashAccountsForMonth(t).getAmount();
          return new k("Cash Advance", e + n);
        }
        getTransfersToCreditCardAccountsForMonth(t) {
          const e = this.transactions
            .getTransactionsForMonth(t)
            .filter(
              (t) =>
                t.amount < 0 &&
                t.isTransferTransaction() &&
                t.transferAccount.isCreditAccount
            )
            .reduce((t, e) => t + e.creditAmount, 0);
          return new k("Transfer to Credit Card", e);
        }
        getTransfersToCashAccountsForMonth(t) {
          const e = this.transactions
            .getTransactionsForMonth(t)
            .filter(
              (t) =>
                t.amount < 0 &&
                t.isTransferTransaction() &&
                t.transferAccount.onBudget &&
                !t.transferAccount.isCreditAccount
            )
            .reduce((t, e) => t + e.creditAmount, 0);
          return new k("Transfer to Cash Account", e);
        }
        getUncategorizedTransactionsForMonth(t) {
          const e = this.transactions
            .getTransactionsForMonth(t)
            .filter(
              (t) =>
                !(
                  t.subCategory ||
                  (t.isTransferTransaction() && t.transferAccount.onBudget)
                )
            )
            .reduce((t, e) => t + e.amount, 0);
          return new k("Uncategorized", e);
        }
        getInterestChargesForMonth(t) {
          const e = this.transactions
            .getTransactionsForMonth(t)
            .filter(
              (t) =>
                t.amount < 0 && t.subCategory?.isCreditCardInterestCategory()
            )
            .reduce((t, e) => t + e.amount, 0);
          return new k("Interest Charges", e);
        }
        getIRTAForMonth(t) {
          const e = this.transactions
              .getTransactionsForMonth(t)
              .filter(
                (t) =>
                  t.subCategory && t.subCategory.isImmediateIncomeCategory()
              ),
            n = { StartingBal: 0, Rba: 0, OtherIRTA: 0 };
          e.forEach((t) => {
            switch (t.payee ? t.payee.name : "Other") {
              case "Starting Balance":
                n.StartingBal += t.creditAmount;
                break;
              case "Reconciliation Balance Adjustment":
                n.Rba += t.creditAmount;
                break;
              default:
                n.OtherIRTA += t.creditAmount;
            }
          });
          const o = [];
          0 !== n.StartingBal &&
            o.push(new W("Starting Balance", n.StartingBal)),
            0 !== n.Rba && o.push(new W("RBA", n.Rba)),
            0 !== n.OtherIRTA && o.push(new W("Other IRTA", n.OtherIRTA));
          const a = Object.values(n).reduce((t, e) => t + e, 0);
          return new k("IRTA", a, o);
        }
        getCCPCAssignedForMonth(t) {
          const e = _(t, this.entityManager.getSubCategoryById(this.CCPCId));
          return new k("Assigned", e);
        }
        getIncomingBalanceTransfersForMonth(t) {
          const e = this.transactions
            .getTransactionsForMonth(t)
            .filter(
              (t) =>
                t.amount > 0 &&
                t.isTransferTransaction() &&
                t.transferAccount.isCreditAccount
            )
            .reduce((t, e) => {
              let n;
              return (
                (n =
                  "transferSubTransaction" in e
                    ? e.transferTransaction || e.transferSubTransaction
                    : e.transferTransaction),
                t + n.creditAmount
              );
            }, 0);
          return new k("Transfer from Credit Card", -e);
        }
        getFirstActivityMonth() {
          return (
            this.entityManager
              .getAccountMonthlyCalculationsByAccountId(this.accountId)
              .filter((t) => {
                const e = C.createForToday();
                return !t.month.isAfter(e);
              })
              .sort((t, e) => C.compare(t.month, e.month))
              .find((t) => {
                const e = t.month,
                  n = t.rollingBalance,
                  o = this.getCCPCAssignedForMonth(e).getAmount();
                return (
                  0 !== n ||
                  0 !== o ||
                  this.transactions.getTransactionsForMonth(e).length > 0
                );
              })?.month || null
          );
        }
        getCCAlgosForMonth(e) {
          const n = this.entityManager.getCurrentBudgetKnowledgeValue();
          return (
            (t.algoService && n == t.algoServiceKnowledge) ||
              ((t.algoService = new V(this.entityManager)),
              (t.algoServiceKnowledge = n)),
            t.algoService.getAlgosForMonthAndAccount(e, this.accountId)
          );
        }
      }),
      (X = class {
        entityManager;
        accountId;
        transactionsByMonth;
        constructor(t, e) {
          (this.entityManager = t),
            (this.accountId = e),
            this.getRelevantTransactions();
        }
        getTransactionsForMonth(t) {
          const e = t.toISOString().substring(0, 7);
          return this.transactionsByMonth.get(e) || [];
        }
        getRelevantTransactions() {
          const t = [],
            e = s.SplitSubCategory,
            n = this.entityManager
              .getAllTransactions()
              .filter(
                (t) =>
                  t.account?.onBudget &&
                  t.accountId === this.accountId &&
                  !t.isTombstone &&
                  !t.account.isTombstone &&
                  t.subCategory?.name != e &&
                  "Pending" != t.source &&
                  ynab.isSourceDisplayable(t.source)
              );
          t.push(...n);
          const o = this.entityManager
            .getAllSubTransactions()
            .filter(
              (t) =>
                t.account?.onBudget &&
                !t.isTombstone &&
                !t.account.isTombstone &&
                t.transaction.accountId === this.accountId
            );
          t.push(...o);
          const a = ynab.array.sortBy(t, ["date", "amount"]),
            r = new Map();
          for (const s of a) {
            const t = s.date.toISOString().substring(0, 7);
            r.has(t) || r.set(t, []), r.get(t).push(s);
          }
          this.transactionsByMonth = r;
        }
      });
  }))();
}
var et,
  nt,
  ot = e({ buildCCMatchData: () => at });
function at(t, e) {
  return { planName: t, accounts: e.map(st) };
}
function st(t) {
  const {
    name: e,
    lastReconciled: n,
    shortfallMinusOverspending: o,
    hasOverspending: a,
    rows: s,
    mismatchedAccountName: r,
  } = t;
  let c,
    i = !1;
  if (n) {
    c = n.format("MMM YYYY");
    const t = C.createForCurrentMonth().subtractMonths(2);
    n.isBefore(t) && ((c += nt), (i = !0));
  } else (c = `Never ${nt}`), (i = !0);
  let u = null;
  if (o) {
    const t = o < 0 ? "into" : "out of",
      n = R(Math.abs(o));
    u = a
      ? `After covering overspending in the current month, move ${n} ${t} the ${e} Credit Card Payment category.`
      : `Move ${n} ${t} the ${e} Credit Card Payment category.`;
  }
  const d = s.map((t, e) =>
      (function (t, e, n) {
        if ("collapsed" in t && t.collapsed)
          return { isCollapsed: !0, count: t.count, columnCount: et };
        const o = t,
          { causes: a, causeSubtotals: s } = (function (t) {
            const e = {},
              n = {};
            for (const s of t)
              s.subCauseOf && (e[s.subCauseOf] = (e[s.subCauseOf] || 0) + 1);
            const o = [];
            for (const s of t) {
              const t = Array.isArray(s.cause) ? s.cause[0] : s.cause,
                a = null != s.subCauseOf && e[s.subCauseOf] > 1,
                r = "Uncategorized" !== t && !t.startsWith("Hidden: "),
                c = "CC Algo" === s.subCauseOf && t.startsWith("CC Algo in ");
              let i = "",
                u = t,
                d = "";
              if (c) {
                i = t.slice(11).replace(/ \(↔ .+\)$/, "");
                const e = t.match(/ (\(↔ .+\))$/);
                (d = e ? ` ${e[1]}` : ""), (u = d ? t.slice(0, -d.length) : t);
              }
              s.subCauseOf &&
                !t.startsWith("Hidden: ") &&
                (n[s.subCauseOf] = (n[s.subCauseOf] || 0) + s.amount),
                o.push({
                  text: t,
                  textWithoutCounterpart: u,
                  counterpartSuffix: d,
                  amountFormatted: r ? R(s.amount) : "",
                  showAmount: r,
                  isSubCause: a,
                  subCauseOf: s.subCauseOf,
                  isCopyable: c,
                  copyText: i,
                });
            }
            const a = [];
            for (const [s, r] of Object.entries(n))
              e[s] > 1 &&
                a.push({ label: `Total ${s}`, amountFormatted: R(r) });
            return { causes: o, causeSubtotals: a };
          })(o.Cause);
        return {
          isCollapsed: !1,
          isLastRow: e === n - 1,
          month: o.Month,
          assignedFormatted: R(o.Assigned),
          assignedRaw: o.Assigned,
          balanceFormatted: R(o.Balance),
          balanceRaw: o.Balance,
          ccpcFormatted: R(o.CCPC),
          ccpcRaw: o.CCPC,
          differenceFormatted: R(o.Difference),
          differenceRaw: o.Difference,
          deltaFormatted: R(o.Delta),
          deltaRaw: o.Delta,
          causes: a,
          causeSubtotals: s,
        };
      })(t, e, s.length)
    ),
    l = s.find((t) => !("collapsed" in t && t.collapsed));
  return {
    name: e,
    lastReconciledText: c,
    lastReconciledIsOld: i,
    shortfallText: u,
    initiallyHidden: null != l && 0 === l.Difference && l.Balance <= 0,
    mismatchedAccountName: r,
    rows: d,
  };
}
function rt() {
  return (rt = t(() => {
    n(), L(), (et = 7), (nt = " ⛔️");
  }))();
}
var ct = e({
  creditCardCCMatch: () => dt,
  creditCardCCMatchBeta: () => lt,
  creditCardCCMatchUnified: () => it,
});
async function it(t, e = {}) {
  const n = ynab.YNABSharedLib.defaultInstance.syncManager;
  n.isBackfillSyncInProgress &&
    (await new Promise((t) => {
      const e = (o) => {
        o && (n.onBudgetSyncComplete.removeHandler(e), t());
      };
      n.onBudgetSyncComplete.addHandler(e);
    }));
  const o = e.beta ?? !1,
    a =
      ynab.YNABSharedLibWebInstance.firstInstanceCreated.activeUserBudget
        .budgetName,
    s = o ? `${a} (BETA)` : a,
    r = [],
    c = t.getAllNonTombstonedAccounts().filter((t) => t.isCreditAccount);
  if (0 == c.length) return void console.warn("No CCs in this budget!");
  function i(t) {
    const e = C.createForToday();
    return !t.month.isAfter(e);
  }
  let u = t
    .getAllSubCategories()
    .filter((t) => "DBT" == t.type && !t.isTombstone);
  const d = {};
  let l, h, m;
  c.forEach((t) => {
    d[t.entityId] = t;
  }),
    (u = u.filter((t) => {
      const e = d[t.accountId];
      if (!e) return !1;
      const n = e.isClosed;
      return (
        !n && t.isHidden
          ? console.warn(`${t.name} is open, but the CCPC is hidden`)
          : n &&
            !t.isHidden &&
            console.warn(`${t.name} is closed, but the CCPC is unhidden`),
        !0
      );
    })),
    u.sort((t, e) => {
      const n = d[t.accountId],
        o = d[e.accountId];
      return n && o
        ? n.isClosed !== o.isClosed
          ? n.isClosed
            ? 1
            : -1
          : n.sortableIndex - o.sortableIndex
        : 0;
    });
  let f = !0;
  const y = performance.now();
  for (const g of u) {
    const e = t.getAccountById(g.accountId);
    let n = null;
    e.lastReconciledAt && (n = C.createFromLocalDate(e.lastReconciledAt));
    const o = t.getAccountMonthlyCalculationsByAccountId(e.entityId).filter(i),
      a = new Q(t, e.entityId),
      s = a.getFirstActivityMonth(),
      c = s ? o.filter((t) => !t.month.isBefore(s)) : [];
    c.sort((t, e) => C.compare(t.month, e.month));
    let u = 0,
      d = !1;
    const y = [];
    (f = !0),
      (l = 0),
      (h = 0),
      (m = 0),
      c.forEach((t, e) => {
        const n = t.month,
          o = P(n),
          s = x(n, g),
          r = t.rollingBalance,
          i = a.getCCPCAssignedForMonth(n).getAmount();
        let C = i;
        const A = [],
          b = a.getTransfersToCreditCardAccountsForMonth(n).getAmount();
        b < 0 &&
          ((C += b), A.push({ cause: "Transfer to Credit Card", amount: b }));
        const p = a.getTransfersToCashAccountsForMonth(n).getAmount();
        p < 0 && A.push({ cause: "Transfer to Cash Account", amount: p });
        const M = a.getInterestChargesForMonth(n).getAmount();
        M < 0 && A.push({ cause: "Interest Charges", amount: M });
        const I = a.getOverpaymentsForMonth(n).getAmount();
        I < -9 && (A.push({ cause: "OverPAYMENT", amount: I }), (C += I));
        const B = a.getIncomingBalanceTransfersForMonth(n).getAmount();
        B > 0 &&
          ((C += B), A.push({ cause: "Transfer from Credit Card", amount: B }));
        const T = a.getUncategorizedTransactionsForMonth(n).getAmount();
        0 != T && A.push({ cause: "Uncategorized", amount: T });
        const S = a.getIRTAForMonth(n);
        let w = -1,
          v = 0;
        if (S.getSubCauses().length > 0)
          for (const a of S.getSubCauses()) {
            const t = a.getDescription(),
              e = a.getAmount();
            let n;
            "Starting Balance" === t
              ? ((n = "Starting Balance"),
                (w = A.push({ cause: [n], amount: e }) - 1))
              : A.push({ cause: [t], amount: e }),
              (v += e);
          }
        (C += v),
          f &&
            i + v < 0 &&
            -1 !== w &&
            (A[w].cause = "Starting Balance (not covered)");
        const F = a.getCCAlgosForMonth(n),
          O = F.getAmount();
        if (0 !== O) {
          const t = F.getSubCauses();
          if (t.length > 0)
            for (const e of t)
              A.push({
                cause: [e.getDescription()],
                amount: e.getAmount(),
                subCauseOf: "CC Algo",
              });
          else A.push({ cause: ["CC Algo"], amount: O, subCauseOf: "CC Algo" });
        }
        const N = a.getOverspendingForMonth(n),
          D = N.getAmount();
        C -= D;
        const R = r > 0 ? s : r + s;
        (m = R - h),
          (h = R),
          f
            ? (f = !1)
            : l < 0 &&
              (A.push({ cause: "Negative rollover", amount: -l }), (C -= l)),
          (l = s);
        const $ = m - C,
          E = Math.min(-D - p - M + ($ - O), 0);
        if (E < -5) {
          A.push({ cause: "Overspending", amount: E });
          const t = N.getSubCauses();
          for (const e of t)
            A.push({
              cause: e.getDescription(),
              amount: 0,
              subCauseOf: "Overspending",
            });
        }
        e === c.length - 1 && ((d = E < -5), (u = d ? R - E : R)),
          y.push({
            Month: o,
            Assigned: i,
            Balance: r,
            CCPC: s,
            Difference: R,
            Delta: m,
            Cause: A,
          });
      }),
      y.reverse();
    const A = ut(y),
      b = e.accountName !== g.name ? e.accountName : void 0;
    r.push({
      name: g.account.isClosed ? `${g.name} (CLOSED)` : g.name,
      lastReconciled: n,
      shortfallMinusOverspending: u,
      hasOverspending: d,
      rows: A,
      mismatchedAccountName: b,
    });
  }
  const A = performance.now();
  console.log(`Time spent in main loop: ${(A - y).toFixed(2)}ms`),
    g(at(s, r)),
    window.ynab.scripts.navigateToSupportOutput("CC Match");
}
function ut(t) {
  if (t.length <= 2) return t;
  const e = [t[0]];
  let n = [];
  for (let a = 1; a < t.length - 1; a++)
    0 !== (o = t[a]).Delta ||
    0 !== o.Assigned ||
    (Array.isArray(o.Cause) && o.Cause.length > 0)
      ? (n.length >= 2
          ? e.push({ collapsed: !0, count: n.length })
          : e.push(...n),
        (n = []),
        e.push(t[a]))
      : n.push(t[a]);
  var o;
  return (
    n.length >= 2 ? e.push({ collapsed: !0, count: n.length }) : e.push(...n),
    e.push(t[t.length - 1]),
    e
  );
}
async function dt(t) {
  return await it(t, { beta: !1 });
}
async function lt(t) {
  return await it(t, { beta: !0 });
}
function gt() {
  return (gt = t(() => {
    L(), tt(), n(), rt(), u();
  }))();
}
var ht,
  Ct = e({ SupportAccessCommand: () => ht, setupGlobalShims: () => mt });
function mt() {
  (window.ynab = window.ynab || {}),
    (window.ynab.scripts = window.ynab.scripts || {}),
    (window.ynab.scripts.SupportAccessCommand = ht);
}
function ft() {
  return (ft = t(() => {
    T(),
      N(),
      gt(),
      v(),
      U(),
      (function (t) {
        let e;
        var n;
        let o, a;
        var s;
        ((n = e || (e = t.Budget || (t.Budget = {}))).hiddenBalances = O),
          (n.bigBudget = B),
          (n.cashTotal = w),
          (n.negativeAssigningInFuture = j),
          ((o || (o = t.Account || (t.Account = {}))).transactionType = p),
          ((s = a || (a = t.CreditCard || (t.CreditCard = {}))).ccMatchBeta =
            lt),
          (s.ccMatch = dt);
      })(ht || (ht = {}));
  }))();
}
export {
  M as C,
  T as S,
  F as _,
  ot as a,
  v as b,
  tt as c,
  K as d,
  G as f,
  L as g,
  D as h,
  gt as i,
  q as l,
  Y as m,
  Ct as n,
  rt as o,
  U as p,
  ct as r,
  Z as s,
  ft as t,
  J as u,
  N as v,
  f as w,
  I as x,
  S as y,
};
//# sourceMappingURL=support-access-command-C7NYIkWL.js.map
