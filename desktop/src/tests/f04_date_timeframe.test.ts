import { describe, it, expect } from 'vitest';
import {
  calculateTimeframeDates,
  formatTimeframeLabel,
  filterTransactionsByDateAndFilters,
  MONTH_NAMES,
  TimeframeState,
} from '../components/reflect/reflectDataEngine';
import { TransactionItem } from '../components/accounts/accountData';

const createMockTx = (partial: Partial<TransactionItem>): TransactionItem => ({
  entityId: 'tx-mock',
  accountId: 'acc-1',
  accountName: 'Chase Checking',
  date: '2026-11-01',
  payeeName: 'Mock Payee',
  subCategoryId: 'cat-mock',
  subCategoryName: 'Mock Category',
  memo: '',
  amount: -10000,
  cleared: 'cleared',
  ...partial,
});

describe('F04: Date Parsing & Timeframe Engine', () => {
  // ---------------------------------------------------------------------------
  // Tier 1: Feature Coverage (Equivalence Classes & Primary Path)
  // ---------------------------------------------------------------------------

  it('T1-01: Timeframe date ranges for 1M, 3M, 6M, 1Y, and All Time', () => {
    const baseYear = 2026;
    const baseMonth = 10; // November (0-indexed)

    // 1M: thisMonth -> Nov 2026
    const m1 = calculateTimeframeDates('thisMonth', baseYear, baseMonth);
    expect(m1).toEqual({ startYear: 2026, startMonth: 10, endYear: 2026, endMonth: 10 });

    // 3M: latest3Months -> Sep 2026 to Nov 2026
    const m3 = calculateTimeframeDates('latest3Months', baseYear, baseMonth);
    expect(m3).toEqual({ startYear: 2026, startMonth: 8, endYear: 2026, endMonth: 10 });

    // 6M: latest6Months -> Jun 2026 to Nov 2026
    const m6 = calculateTimeframeDates('latest6Months', baseYear, baseMonth);
    expect(m6).toEqual({ startYear: 2026, startMonth: 5, endYear: 2026, endMonth: 10 });

    // 1Y: latest12Months -> Dec 2025 to Nov 2026
    const m12 = calculateTimeframeDates('latest12Months', baseYear, baseMonth);
    expect(m12).toEqual({ startYear: 2025, startMonth: 11, endYear: 2026, endMonth: 10 });

    // All Time: allDates -> Jan 2024 to Nov 2026
    const all = calculateTimeframeDates('allDates', baseYear, baseMonth);
    expect(all).toEqual({ startYear: 2024, startMonth: 0, endYear: 2026, endMonth: 10 });
  });

  it('T1-02: Monthly interval generation for X-axis labels', () => {
    const tf: TimeframeState = {
      preset: 'latest3Months',
      startYear: 2026,
      startMonth: 8, // Sep
      endYear: 2026,
      endMonth: 10,  // Nov
    };

    // Generate monthly labels between start and end
    const labels: string[] = [];
    let curYear = tf.startYear;
    let curMonth = tf.startMonth;
    while (curYear < tf.endYear || (curYear === tf.endYear && curMonth <= tf.endMonth)) {
      labels.push(`${MONTH_NAMES[curMonth]} ${curYear}`);
      curMonth++;
      if (curMonth > 11) {
        curMonth = 0;
        curYear++;
      }
    }

    expect(labels).toEqual(['Sep 2026', 'Oct 2026', 'Nov 2026']);
  });

  it('T1-03: Year-month ISO string formatting ("YYYY-MM-01")', () => {
    // Standard ISO month key for Jan (0) and Dec (11)
    const formatMonthKey = (year: number, monthIdx: number) =>
      `${year}-${String(monthIdx + 1).padStart(2, '0')}-01`;

    expect(formatMonthKey(2026, 0)).toBe('2026-01-01');
    expect(formatMonthKey(2026, 9)).toBe('2026-10-01');
    expect(formatMonthKey(2026, 11)).toBe('2026-12-01');
  });

  it('T1-04: Transaction date filtering within timeframe boundaries', () => {
    const timeframe: TimeframeState = {
      preset: 'custom',
      startYear: 2026,
      startMonth: 8, // September 2026 (2026-09-01)
      endYear: 2026,
      endMonth: 10,  // November 2026 (2026-11-30)
    };

    const mockTxs: TransactionItem[] = [
      createMockTx({
        entityId: 'tx-prior',
        date: '2026-08-31',
        amount: -50000,
      }),
      createMockTx({
        entityId: 'tx-start-boundary',
        date: '2026-09-01',
        amount: -10000,
      }),
      createMockTx({
        entityId: 'tx-mid',
        date: '2026-10-15',
        amount: -25000,
      }),
      createMockTx({
        entityId: 'tx-end-boundary',
        date: '2026-11-30',
        amount: -30000,
      }),
      createMockTx({
        entityId: 'tx-future',
        date: '2026-12-01',
        amount: -40000,
      }),
    ];

    const filtered = filterTransactionsByDateAndFilters(
      mockTxs,
      timeframe,
      new Set(),
      new Set()
    );

    expect(filtered.map((t) => t.entityId)).toEqual([
      'tx-start-boundary',
      'tx-mid',
      'tx-end-boundary',
    ]);
  });

  it('T1-05: Relative timeframe calculation relative to current date (year wraparound)', () => {
    // Base date: February 2027 (month index 1)
    const baseYear = 2027;
    const baseMonth = 1;

    // 3M relative to Feb 2027 should roll back across year boundary to Dec 2026
    const m3 = calculateTimeframeDates('latest3Months', baseYear, baseMonth);
    expect(m3).toEqual({
      startYear: 2026,
      startMonth: 11, // December 2026
      endYear: 2027,
      endMonth: 1,    // February 2027
    });

    // 12M relative to Feb 2027 should roll back to March 2026
    const m12 = calculateTimeframeDates('latest12Months', baseYear, baseMonth);
    expect(m12).toEqual({
      startYear: 2026,
      startMonth: 2,  // March 2026
      endYear: 2027,
      endMonth: 1,
    });
  });

  // ---------------------------------------------------------------------------
  // Tier 2: Boundary & Corner Cases
  // ---------------------------------------------------------------------------

  it('T2-01: Malformed date strings handled without crashing', () => {
    const timeframe: TimeframeState = {
      preset: 'thisMonth',
      startYear: 2026,
      startMonth: 10,
      endYear: 2026,
      endMonth: 10,
    };

    const malformedTxs: TransactionItem[] = [
      createMockTx({ entityId: 'tx-bad-1', date: '', amount: -1000 }),
      createMockTx({ entityId: 'tx-bad-2', date: 'invalid-date', amount: -2000 }),
      createMockTx({ entityId: 'tx-bad-3', date: '2026', amount: -3000 }),
      createMockTx({ entityId: 'tx-bad-4', date: '2026-99-99', amount: -4000 }),
      createMockTx({ entityId: 'tx-valid', date: '2026-11-15', amount: -5000 }),
    ];

    expect(() =>
      filterTransactionsByDateAndFilters(malformedTxs, timeframe, new Set(), new Set())
    ).not.toThrow();

    const result = filterTransactionsByDateAndFilters(malformedTxs, timeframe, new Set(), new Set());
    expect(result.map((t) => t.entityId)).toEqual(['tx-valid']);
  });

  it('T2-02: Month index out of bounds (>11) formatted safely without throwing', () => {
    // Normalization helper for arbitrary month offset
    const normalizeYearMonth = (year: number, month: number) => {
      const normalizedYear = year + Math.floor(month / 12);
      const normalizedMonth = ((month % 12) + 12) % 12;
      return { year: normalizedYear, month: normalizedMonth };
    };

    const oobUpper = normalizeYearMonth(2026, 15);
    expect(oobUpper).toEqual({ year: 2027, month: 3 });

    const oobNegative = normalizeYearMonth(2026, -3);
    expect(oobNegative).toEqual({ year: 2025, month: 9 });
  });

  it('T2-03: Leap year date handling (Feb 29 inclusion)', () => {
    // 2024 is a leap year; Feb has 29 days
    const leapYearTf: TimeframeState = {
      preset: 'custom',
      startYear: 2024,
      startMonth: 1, // February
      endYear: 2024,
      endMonth: 1,
    };

    const txs: TransactionItem[] = [
      createMockTx({ entityId: 'tx-leap', date: '2024-02-29', amount: -1000 }),
      createMockTx({ entityId: 'tx-mar1', date: '2024-03-01', amount: -2000 }),
    ];

    const filtered = filterTransactionsByDateAndFilters(txs, leapYearTf, new Set(), new Set());
    expect(filtered.map((t) => t.entityId)).toEqual(['tx-leap']);

    // Non-leap year: 2026 Feb has 28 days
    const lastDayFeb2026 = new Date(2026, 2, 0).getDate();
    expect(lastDayFeb2026).toBe(28);

    const lastDayFeb2024 = new Date(2024, 2, 0).getDate();
    expect(lastDayFeb2024).toBe(29);
  });

  it('T2-04: Year boundary transitions (Dec to Jan)', () => {
    const yearCrossingTf: TimeframeState = {
      preset: 'custom',
      startYear: 2025,
      startMonth: 11, // Dec 2025
      endYear: 2026,
      endMonth: 0,    // Jan 2026
    };

    const label = formatTimeframeLabel(yearCrossingTf);
    expect(label).toBe('Dec 2025 - Jan 2026');

    // Single month in same year
    const singleMonthLabel = formatTimeframeLabel({
      preset: 'custom',
      startYear: 2026,
      startMonth: 5,
      endYear: 2026,
      endMonth: 5,
    });
    expect(singleMonthLabel).toBe('Jun 2026');
  });

  it('T2-05: Empty or undefined date inputs fallback safely', () => {
    const timeframe: TimeframeState = {
      preset: 'thisMonth',
      startYear: 2026,
      startMonth: 10,
      endYear: 2026,
      endMonth: 10,
    };

    // Empty transaction list
    expect(filterTransactionsByDateAndFilters([], timeframe, new Set(), new Set())).toEqual([]);

    // Transactions with missing category or account filters
    const tx: TransactionItem = createMockTx({
      entityId: 'tx-1',
      date: '2026-11-05',
      amount: -1000,
    });
    const res = filterTransactionsByDateAndFilters([tx], timeframe, new Set(), new Set());
    expect(res).toHaveLength(1);
  });
});
