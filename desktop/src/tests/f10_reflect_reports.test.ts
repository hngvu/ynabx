import { describe, it, expect } from 'vitest';
import * as reflectEngine from '../components/reflect/reflectDataEngine';
import { NetWorthMonthPoint, TimeframeState } from '../components/reflect/reflectDataEngine';
import { AccountItem } from '../components/sidebar/NavAccountRow';
import { TransactionItem } from '../components/accounts/accountData';

interface NetWorthCalculationResult {
  assets: number;
  debts: number;
  netWorth: number;
}

interface AgeOfMoneyCalculationResult {
  age: number | null;
  isReady: boolean;
}

describe('F10: Reflect Reports (Net Worth & Age of Money FIFO)', () => {
  // ---------------------------------------------------------------------------
  // Tier 1: Feature Coverage (Equivalence Classes & Primary Path)
  // ---------------------------------------------------------------------------

  it('T1-01: Net Worth calculation summing assets minus debts across accounts', () => {
    const fn = (reflectEngine as Record<string, unknown>).calculateNetWorth;
    expect(typeof fn, 'reflectDataEngine must export calculateNetWorth function (R3 / Feature 35)').toBe('function');

    const accounts: Partial<AccountItem>[] = [
      {
        entityId: 'acc-checking',
        accountName: 'Checking',
        accountType: 'checking',
        accountCalculation: { balance: 5000000, notificationCount: 0 },
      },
      {
        entityId: 'acc-savings',
        accountName: 'Savings',
        accountType: 'savings',
        accountCalculation: { balance: 10000000, notificationCount: 0 },
      },
      {
        entityId: 'acc-credit',
        accountName: 'Visa Card',
        accountType: 'creditCard',
        accountCalculation: { balance: -3000000, notificationCount: 0 },
      },
    ];

    const result = (fn as (accs: unknown[]) => NetWorthCalculationResult)(accounts);
    expect(result.assets).toBe(15000000); // 5,000.00 + 10,000.00
    expect(result.debts).toBe(3000000);   // 3,000.00
    expect(result.netWorth).toBe(12000000); // 15,000.00 - 3,000.00
  });

  it('T1-02: Asset vs Debt breakdown correctly categorized by account type', () => {
    const fn = (reflectEngine as Record<string, unknown>).calculateNetWorth;
    expect(typeof fn, 'reflectDataEngine must export calculateNetWorth function (R3 / Feature 35)').toBe('function');

    const accounts: Partial<AccountItem>[] = [
      { entityId: 'a1', accountType: 'checking', accountCalculation: { balance: 1000000, notificationCount: 0 } },
      { entityId: 'a2', accountType: 'savings', accountCalculation: { balance: 2000000, notificationCount: 0 } },
      { entityId: 'a3', accountType: 'cash', accountCalculation: { balance: 500000, notificationCount: 0 } },
      { entityId: 'a4', accountType: 'creditCard', accountCalculation: { balance: -1500000, notificationCount: 0 } },
      { entityId: 'a5', accountType: 'lineOfCredit', accountCalculation: { balance: -800000, notificationCount: 0 } },
    ];

    const result = (fn as (accs: unknown[]) => NetWorthCalculationResult)(accounts);
    expect(result.assets).toBe(3500000); // 1,000,000 + 2,000,000 + 500,000
    expect(result.debts).toBe(2300000);  // 1,500,000 + 800,000
    expect(result.netWorth).toBe(1200000);
  });

  it('T1-03: Age of Money calculation matching cash outflows against chronological income batches (FIFO)', () => {
    const fn = (reflectEngine as Record<string, unknown>).calculateAgeOfMoney;
    expect(typeof fn, 'reflectDataEngine must export calculateAgeOfMoney function (R3 / Feature 35)').toBe('function');

    // Chronological income batches and cash outflows
    const txs: Partial<TransactionItem>[] = [
      // Batch 1: Jan 1 income $1,000 (1,000,000 milliunits)
      { entityId: 'tx-inc-1', date: '2026-01-01', amount: 1000000, accountId: 'acc-checking' },
      // Batch 2: Jan 15 income $1,000
      { entityId: 'tx-inc-2', date: '2026-01-15', amount: 1000000, accountId: 'acc-checking' },
      // 10 chronological cash outflows (totaling $1,000 to fully consume Batch 1)
      { entityId: 'tx-out-1', date: '2026-01-20', amount: -100000, accountId: 'acc-checking' }, // 19 days
      { entityId: 'tx-out-2', date: '2026-01-22', amount: -100000, accountId: 'acc-checking' }, // 21 days
      { entityId: 'tx-out-3', date: '2026-01-25', amount: -100000, accountId: 'acc-checking' }, // 24 days
      { entityId: 'tx-out-4', date: '2026-01-28', amount: -100000, accountId: 'acc-checking' }, // 27 days
      { entityId: 'tx-out-5', date: '2026-01-30', amount: -100000, accountId: 'acc-checking' }, // 29 days
      { entityId: 'tx-out-6', date: '2026-02-01', amount: -100000, accountId: 'acc-checking' }, // 31 days
      { entityId: 'tx-out-7', date: '2026-02-05', amount: -100000, accountId: 'acc-checking' }, // 35 days
      { entityId: 'tx-out-8', date: '2026-02-10', amount: -100000, accountId: 'acc-checking' }, // 40 days
      { entityId: 'tx-out-9', date: '2026-02-15', amount: -100000, accountId: 'acc-checking' }, // 45 days
      { entityId: 'tx-out-10', date: '2026-02-20', amount: -100000, accountId: 'acc-checking' }, // 50 days
    ];

    const result = (fn as (txList: unknown[]) => AgeOfMoneyCalculationResult | number)(txs);
    const age = typeof result === 'object' && result !== null ? result.age : result;
    expect(age).toBeDefined();
    expect(Number(age)).toBeGreaterThan(0);
  });

  it('T1-04: Multi-month historical data series generation', () => {
    const fn = (reflectEngine as Record<string, unknown>).generateNetWorthHistory;
    expect(typeof fn, 'reflectDataEngine must export generateNetWorthHistory function (R3 / Feature 35)').toBe('function');

    const accounts: Partial<AccountItem>[] = [
      { entityId: 'acc-1', accountType: 'checking', accountCalculation: { balance: 2000000, notificationCount: 0 } },
    ];
    const timeframe: TimeframeState = {
      preset: 'latest3Months',
      startYear: 2026,
      startMonth: 8,
      endYear: 2026,
      endMonth: 10,
    };

    const history = (fn as (accs: unknown[], txs: unknown[], tf: unknown) => NetWorthMonthPoint[])(
      accounts,
      [],
      timeframe
    );
    expect(Array.isArray(history)).toBe(true);
    expect(history).toHaveLength(3);
    expect(history[0]).toHaveProperty('month');
    expect(history[0]).toHaveProperty('assets');
    expect(history[0]).toHaveProperty('debts');
    expect(history[0]).toHaveProperty('netWorth');
  });

  it('T1-05: Filter by account selection (all accounts vs specific accounts)', () => {
    const fn = (reflectEngine as Record<string, unknown>).calculateNetWorth;
    expect(typeof fn, 'reflectDataEngine must export calculateNetWorth function (R3 / Feature 35)').toBe('function');

    const accounts: Partial<AccountItem>[] = [
      { entityId: 'acc-1', accountType: 'checking', accountCalculation: { balance: 5000000, notificationCount: 0 } },
      { entityId: 'acc-2', accountType: 'savings', accountCalculation: { balance: 10000000, notificationCount: 0 } },
      { entityId: 'acc-3', accountType: 'creditCard', accountCalculation: { balance: -2000000, notificationCount: 0 } },
    ];

    // Filter only acc-1
    const selected = new Set(['acc-1']);
    const result = (fn as (accs: unknown[], sel?: Set<string>) => NetWorthCalculationResult)(
      accounts,
      selected
    );
    expect(result.assets).toBe(5000000);
    expect(result.debts).toBe(0);
    expect(result.netWorth).toBe(5000000);
  });

  // ---------------------------------------------------------------------------
  // Tier 2: Boundary & Corner Cases
  // ---------------------------------------------------------------------------

  it('T2-01: Zero balances across all accounts produces 0 net worth without NaN', () => {
    const fn = (reflectEngine as Record<string, unknown>).calculateNetWorth;
    expect(typeof fn, 'reflectDataEngine must export calculateNetWorth function (R3 / Feature 35)').toBe('function');

    const accounts: Partial<AccountItem>[] = [
      { entityId: 'acc-1', accountType: 'checking', accountCalculation: { balance: 0, notificationCount: 0 } },
      { entityId: 'acc-2', accountType: 'creditCard', accountCalculation: { balance: 0, notificationCount: 0 } },
    ];

    const result = (fn as (accs: unknown[]) => NetWorthCalculationResult)(accounts);
    expect(result.assets).toBe(0);
    expect(result.debts).toBe(0);
    expect(result.netWorth).toBe(0);
    expect(Number.isNaN(result.netWorth)).toBe(false);
  });

  it('T2-02: Negative net worth (debts exceed assets) calculates correctly', () => {
    const fn = (reflectEngine as Record<string, unknown>).calculateNetWorth;
    expect(typeof fn, 'reflectDataEngine must export calculateNetWorth function (R3 / Feature 35)').toBe('function');

    const accounts: Partial<AccountItem>[] = [
      { entityId: 'acc-checking', accountType: 'checking', accountCalculation: { balance: 2000000, notificationCount: 0 } },
      { entityId: 'acc-cc', accountType: 'creditCard', accountCalculation: { balance: -5000000, notificationCount: 0 } },
    ];

    const result = (fn as (accs: unknown[]) => NetWorthCalculationResult)(accounts);
    expect(result.assets).toBe(2000000);
    expect(result.debts).toBe(5000000);
    expect(result.netWorth).toBe(-3000000);
  });

  it('T2-03: Zero or insufficient transactions for Age of Money returns empty/calculating state without division by zero', () => {
    const fn = (reflectEngine as Record<string, unknown>).calculateAgeOfMoney;
    expect(typeof fn, 'reflectDataEngine must export calculateAgeOfMoney function (R3 / Feature 35)').toBe('function');

    // 0 transactions
    const result0 = (fn as (txList: unknown[]) => AgeOfMoneyCalculationResult | null)([]);
    expect(result0 === null || (typeof result0 === 'object' && result0.isReady === false)).toBe(true);

    // 3 transactions (< 10 threshold)
    const fewTxs: Partial<TransactionItem>[] = [
      { entityId: 'tx-1', date: '2026-01-01', amount: 1000000, accountId: 'acc-1' },
      { entityId: 'tx-2', date: '2026-01-05', amount: -50000, accountId: 'acc-1' },
      { entityId: 'tx-3', date: '2026-01-10', amount: -20000, accountId: 'acc-1' },
    ];
    const result3 = (fn as (txList: unknown[]) => AgeOfMoneyCalculationResult | null)(fewTxs);
    expect(result3 === null || (typeof result3 === 'object' && result3.isReady === false)).toBe(true);
  });

  it('T2-04: Large milliunit balances ($10,000,000+ = 10,000,000,000 milliunits) without integer overflow', () => {
    const fn = (reflectEngine as Record<string, unknown>).calculateNetWorth;
    expect(typeof fn, 'reflectDataEngine must export calculateNetWorth function (R3 / Feature 35)').toBe('function');

    const largeAsset = 15_000_000_000; // $15,000,000.00
    const largeDebt = 5_000_000_000;   // $5,000,000.00
    const accounts: Partial<AccountItem>[] = [
      { entityId: 'acc-asset', accountType: 'savings', accountCalculation: { balance: largeAsset, notificationCount: 0 } },
      { entityId: 'acc-debt', accountType: 'otherDebt', accountCalculation: { balance: -largeDebt, notificationCount: 0 } },
    ];

    const result = (fn as (accs: unknown[]) => NetWorthCalculationResult)(accounts);
    expect(result.assets).toBe(largeAsset);
    expect(result.debts).toBe(largeDebt);
    expect(result.netWorth).toBe(10_000_000_000);
  });

  it('T2-05: Single transaction on inception date handled safely without crashing', () => {
    const fn = (reflectEngine as Record<string, unknown>).calculateAgeOfMoney;
    expect(typeof fn, 'reflectDataEngine must export calculateAgeOfMoney function (R3 / Feature 35)').toBe('function');

    const singleTx: Partial<TransactionItem>[] = [
      { entityId: 'tx-start', date: '2026-01-01', amount: 1000000, accountId: 'acc-1' },
    ];

    expect(() => (fn as (txList: unknown[]) => unknown)(singleTx)).not.toThrow();
    const result = (fn as (txList: unknown[]) => AgeOfMoneyCalculationResult | null)(singleTx);
    expect(result === null || (typeof result === 'object' && result.isReady === false)).toBe(true);
  });
});
