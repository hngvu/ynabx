import React, { useCallback, useEffect, useMemo, useState } from "react";
import type {
  Account,
  CategoryGroupWithCategories,
  PlanMonthSummary,
  Transaction,
} from "../api/types";
import { useOptionalApp } from "../context/AppContext";
import { useMockReflect } from "../hooks/useUiOnlyFeatures";
import { formatMilliunits } from "../utils/currency";
import { addMonths, formatMonthLabel, getCurrentMonthIso } from "../utils/dates";
import { YnabIcon } from "./common/YnabIcon";

export interface ReflectViewProps {
  monthSummary: PlanMonthSummary | null;
  accounts: Account[];
  currencySymbol?: string;
  categoryGroups?: CategoryGroupWithCategories[];
  currentMonth?: string;
  onChangeMonth?: (monthIso: string) => void;
  transactions?: Transaction[];
  initialTab?: ReflectTab;
}

export type ReflectTab =
  | "spending-breakdown"
  | "spending-trends"
  | "net-worth"
  | "income-expense"
  | "age-of-money";

export type TimeframePreset =
  | "thismonth"
  | "latest3months"
  | "latest6months"
  | "latest12months"
  | "thisyear"
  | "lastyear"
  | "alldates"
  | "custom";

// Official YNAB Report colors from ynab.css (--reportsSpendingBreakdownTop1 to Top10 + TopOther)
export const YNAB_REPORT_COLORS = [
  "#545bfe", // Top 1: brand blurple
  "#93d53e", // Top 2: firefly green
  "#f6c91d", // Top 3: dandelion yellow
  "#ce5e66", // Top 4: mulberry pink/red
  "#7583ff", // Top 5: light blurple
  "#aee865", // Top 6: lime firefly
  "#f8d655", // Top 7: light dandelion
  "#e48585", // Top 8: coral
  "#a3acff", // Top 9: lavender
  "#c2f680", // Top 10: pastel firefly
  "#d4d5ff", // Top Other: soft pastel
];

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

interface DisplayBreakdownItem {
  id: string;
  name: string;
  spentMilliunits: number;
  percentageBasisPoints: number;
  isGroup: boolean;
  categoryCount?: number;
}

export function ReflectView({
  monthSummary: propMonthSummary,
  accounts: propAccounts,
  currencySymbol,
  categoryGroups: propCategoryGroups,
  currentMonth: propCurrentMonth,
  onChangeMonth: propOnChangeMonth,
  transactions: propTransactions,
  initialTab,
}: ReflectViewProps): React.JSX.Element {
  const app = useOptionalApp();
  const monthSummary = propMonthSummary ?? app?.monthSummary ?? null;
  const accounts = propAccounts ?? app?.accounts ?? [];
  const categoryGroups = useMemo(
    () => propCategoryGroups ?? app?.categoryGroups ?? [],
    [propCategoryGroups, app?.categoryGroups],
  );
  const currentMonth = propCurrentMonth ?? app?.currentMonth ?? getCurrentMonthIso();
  const onChangeMonth = propOnChangeMonth ?? app?.setCurrentMonth;
  const rawTransactions: Transaction[] = propTransactions ?? [];

  // Tab State
  const [activeTab, setActiveTab] = useState<ReflectTab>(
    initialTab || "spending-breakdown",
  );
  const [viewBy, setViewBy] = useState<"categories" | "groups">("categories");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Timeframe Filter State
  const [activeMonth, setActiveMonth] = useState<string>(currentMonth);
  const [timeframePreset, setTimeframePreset] = useState<TimeframePreset>("thismonth");
  const [displayYear, setDisplayYear] = useState<number>(() => {
    const yr = parseInt(currentMonth.slice(0, 4), 10);
    return isNaN(yr) ? new Date().getFullYear() : yr;
  });

  // Filter Popover States
  const [timeframeOpen, setTimeframeOpen] = useState(false);
  const [timeframeAnchor, setTimeframeAnchor] = useState<{
    top: number;
    left: number;
  } | null>(null);

  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [categoriesAnchor, setCategoriesAnchor] = useState<{
    top: number;
    left: number;
  } | null>(null);

  const [accountsOpen, setAccountsOpen] = useState(false);
  const [accountsAnchor, setAccountsAnchor] = useState<{
    top: number;
    left: number;
  } | null>(null);

  // Search queries inside dropdowns
  const [categorySearch, setCategorySearch] = useState("");
  const [accountSearch, setAccountSearch] = useState("");

  // Filter selection sets (null means ALL selected)
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string> | null>(null);
  const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string> | null>(null);

  // Keep activeMonth in sync with prop currentMonth if it changes from outside
  useEffect(() => {
    if (currentMonth && currentMonth !== activeMonth && timeframePreset === "thismonth") {
      setActiveMonth(currentMonth);
      const yr = parseInt(currentMonth.slice(0, 4), 10);
      if (!isNaN(yr)) setDisplayYear(yr);
    }
  }, [currentMonth]);

  // Escape key handler for popovers
  useEffect(() => {
    if (!timeframeOpen && !categoriesOpen && !accountsOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setTimeframeOpen(false);
        setCategoriesOpen(false);
        setAccountsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [timeframeOpen, categoriesOpen, accountsOpen]);

  // Filter transactions by period
  const periodTransactions = useMemo(() => {
    if (rawTransactions.length === 0) return [];
    if (timeframePreset === "thismonth" || timeframePreset === "custom") {
      const ym = activeMonth.slice(0, 7);
      return rawTransactions.filter((tx: Transaction) => tx.date.startsWith(ym));
    }
    if (timeframePreset === "latest3months") {
      const d1 = addMonths(activeMonth, -2).slice(0, 7);
      const d2 = activeMonth.slice(0, 7);
      return rawTransactions.filter((tx: Transaction) => {
        const ym = tx.date.slice(0, 7);
        return ym >= d1 && ym <= d2;
      });
    }
    if (timeframePreset === "latest6months") {
      const d1 = addMonths(activeMonth, -5).slice(0, 7);
      const d2 = activeMonth.slice(0, 7);
      return rawTransactions.filter((tx: Transaction) => {
        const ym = tx.date.slice(0, 7);
        return ym >= d1 && ym <= d2;
      });
    }
    if (timeframePreset === "latest12months") {
      const d1 = addMonths(activeMonth, -11).slice(0, 7);
      const d2 = activeMonth.slice(0, 7);
      return rawTransactions.filter((tx: Transaction) => {
        const ym = tx.date.slice(0, 7);
        return ym >= d1 && ym <= d2;
      });
    }
    if (timeframePreset === "thisyear") {
      const yr = activeMonth.slice(0, 4);
      return rawTransactions.filter((tx: Transaction) => tx.date.startsWith(yr));
    }
    if (timeframePreset === "lastyear") {
      const lastYr = String(parseInt(activeMonth.slice(0, 4), 10) - 1);
      return rawTransactions.filter((tx: Transaction) => tx.date.startsWith(lastYr));
    }
    return rawTransactions;
  }, [rawTransactions, activeMonth, timeframePreset]);

  // Extract filterable categories
  const filterableCategories = useMemo(() => {
    if (categoryGroups.length > 0) {
      return categoryGroups
        .filter((g) => !g.hidden && !g.is_system)
        .flatMap((g) =>
          g.categories
            .filter((c) => !c.hidden && !c.is_credit_card_payment)
            .map((c) => ({ id: c.id, name: c.name, groupId: g.id, groupName: g.name })),
        );
    }
    if (monthSummary?.categories) {
      return monthSummary.categories
        .filter((c) => !c.hidden && !c.is_credit_card_payment)
        .map((c) => ({
          id: c.category_id,
          name: c.name,
          groupId: c.group_id,
          groupName: c.group_id || "Categories",
        }));
    }
    return [];
  }, [categoryGroups, monthSummary]);

  // Group categories for modal popover
  const groupedCategoriesForFilter = useMemo(() => {
    const q = categorySearch.trim().toLowerCase();
    if (categoryGroups.length > 0) {
      return categoryGroups
        .filter((g) => !g.hidden && !g.is_system)
        .map((g) => {
          const visibleCats = g.categories.filter((c) => {
            if (c.hidden || c.is_credit_card_payment) return false;
            if (!q) return true;
            return c.name.toLowerCase().includes(q) || g.name.toLowerCase().includes(q);
          });
          return {
            id: g.id,
            name: g.name,
            categories: visibleCats,
          };
        })
        .filter((g) => g.categories.length > 0);
    }

    const map = new Map<
      string,
      { id: string; name: string; categories: { id: string; name: string }[] }
    >();

    for (const c of monthSummary?.categories ?? []) {
      if (c.hidden || c.is_credit_card_payment) continue;
      if (!q || c.name.toLowerCase().includes(q)) {
        const grpId = c.group_id || "other";
        const cur = map.get(grpId) || {
          id: grpId,
          name: grpId === "other" ? "Categories" : grpId,
          categories: [],
        };
        cur.categories.push({ id: c.category_id, name: c.name });
        map.set(grpId, cur);
      }
    }

    return Array.from(map.values());
  }, [categoryGroups, monthSummary, categorySearch]);

  // Active accounts
  const activeAccounts = useMemo(
    () => accounts.filter((a) => !a.closed),
    [accounts],
  );

  const cashAccounts = useMemo(() => {
    const q = accountSearch.trim().toLowerCase();
    return activeAccounts.filter((a) => {
      const isCash = a.type === "CHECKING" || a.type === "SAVINGS" || a.type === "CASH";
      if (!isCash) return false;
      if (!q) return true;
      return a.name.toLowerCase().includes(q);
    });
  }, [activeAccounts, accountSearch]);

  const creditAccounts = useMemo(() => {
    const q = accountSearch.trim().toLowerCase();
    return activeAccounts.filter((a) => {
      const isCredit = a.type === "CREDIT_CARD";
      if (!isCredit) return false;
      if (!q) return true;
      return a.name.toLowerCase().includes(q);
    });
  }, [activeAccounts, accountSearch]);

  const trackingAccounts = useMemo(() => {
    const q = accountSearch.trim().toLowerCase();
    return activeAccounts.filter((a) => {
      if (a.on_budget) return false;
      if (!q) return true;
      return a.name.toLowerCase().includes(q);
    });
  }, [activeAccounts, accountSearch]);

  // Compute reflect data
  const reflect = useMockReflect(monthSummary, accounts, {
    categoryGroups,
    selectedCategoryIds,
    selectedAccountIds,
    transactions: periodTransactions,
  });

  // Timeframe handlers
  const handlePrevMonth = useCallback(() => {
    const prev = addMonths(activeMonth, -1);
    setActiveMonth(prev);
    setTimeframePreset("thismonth");
    onChangeMonth?.(prev);
  }, [activeMonth, onChangeMonth]);

  const handleNextMonth = useCallback(() => {
    const next = addMonths(activeMonth, 1);
    setActiveMonth(next);
    setTimeframePreset("thismonth");
    onChangeMonth?.(next);
  }, [activeMonth, onChangeMonth]);

  const handleSelectPreset = useCallback(
    (preset: TimeframePreset) => {
      setTimeframePreset(preset);
      if (preset === "thismonth") {
        const cur = getCurrentMonthIso();
        setActiveMonth(cur);
        onChangeMonth?.(cur);
      }
      if (preset !== "custom") {
        setTimeframeOpen(false);
      }
    },
    [onChangeMonth],
  );

  const handleSelectMonth = useCallback(
    (year: number, monthIdx: number) => {
      const monthIso = `${year}-${String(monthIdx + 1).padStart(2, "0")}-01`;
      setActiveMonth(monthIso);
      setTimeframePreset("thismonth");
      onChangeMonth?.(monthIso);
      setTimeframeOpen(false);
    },
    [onChangeMonth],
  );

  // Categories filter handlers
  const handleSelectAllCategories = useCallback(() => {
    setSelectedCategoryIds(null);
  }, []);

  const handleSelectNoneCategories = useCallback(() => {
    setSelectedCategoryIds(new Set());
  }, []);

  const toggleCategory = useCallback(
    (catId: string) => {
      setSelectedCategoryIds((prev) => {
        const allIds = filterableCategories.map((c) => c.id);
        const set = prev === null ? new Set(allIds) : new Set(prev);
        if (set.has(catId)) {
          set.delete(catId);
        } else {
          set.add(catId);
        }
        if (set.size === allIds.length) {
          return null;
        }
        return set;
      });
    },
    [filterableCategories],
  );

  const toggleGroup = useCallback(
    (grpCatIds: string[]) => {
      setSelectedCategoryIds((prev) => {
        const allIds = filterableCategories.map((c) => c.id);
        const set = prev === null ? new Set(allIds) : new Set(prev);
        const allInGroupSelected = grpCatIds.every((id) => set.has(id));
        if (allInGroupSelected) {
          for (const id of grpCatIds) {
            set.delete(id);
          }
        } else {
          for (const id of grpCatIds) {
            set.add(id);
          }
        }
        if (set.size === allIds.length) {
          return null;
        }
        return set;
      });
    },
    [filterableCategories],
  );

  // Accounts filter handlers
  const handleSelectAllAccounts = useCallback(() => {
    setSelectedAccountIds(null);
  }, []);

  const handleSelectNoneAccounts = useCallback(() => {
    setSelectedAccountIds(new Set());
  }, []);

  const toggleAccount = useCallback(
    (accId: string) => {
      setSelectedAccountIds((prev) => {
        const allIds = activeAccounts.map((a) => a.id);
        const set = prev === null ? new Set(allIds) : new Set(prev);
        if (set.has(accId)) {
          set.delete(accId);
        } else {
          set.add(accId);
        }
        if (set.size === allIds.length) {
          return null;
        }
        return set;
      });
    },
    [activeAccounts],
  );

  const toggleAccountGroup = useCallback(
    (accIds: string[]) => {
      setSelectedAccountIds((prev) => {
        const allIds = activeAccounts.map((a) => a.id);
        const set = prev === null ? new Set(allIds) : new Set(prev);
        const allSelected = accIds.every((id) => set.has(id));
        if (allSelected) {
          for (const id of accIds) {
            set.delete(id);
          }
        } else {
          for (const id of accIds) {
            set.add(id);
          }
        }
        if (set.size === allIds.length) {
          return null;
        }
        return set;
      });
    },
    [activeAccounts],
  );

  // Timeframe button label
  const timeframeLabel = useMemo(() => {
    if (timeframePreset === "thismonth") {
      return formatMonthLabel(activeMonth);
    }
    if (timeframePreset === "latest3months") {
      return "Last 3 Months";
    }
    if (timeframePreset === "latest6months") {
      return "Last 6 Months";
    }
    if (timeframePreset === "latest12months") {
      return "Last 12 Months";
    }
    if (timeframePreset === "thisyear") {
      return "Year To Date";
    }
    if (timeframePreset === "lastyear") {
      return "Last Year";
    }
    if (timeframePreset === "alldates") {
      return "All Dates";
    }
    return formatMonthLabel(activeMonth);
  }, [timeframePreset, activeMonth]);

  // Categories button label & pill
  const categoriesCount = useMemo(() => {
    if (selectedCategoryIds === null) return filterableCategories.length;
    return selectedCategoryIds.size;
  }, [selectedCategoryIds, filterableCategories.length]);

  const categoriesLabel = useMemo(() => {
    if (
      selectedCategoryIds === null ||
      categoriesCount === filterableCategories.length
    ) {
      return "All Categories";
    }
    if (categoriesCount === 0) {
      return "0 Categories";
    }
    return `${categoriesCount} Categories`;
  }, [selectedCategoryIds, categoriesCount, filterableCategories.length]);

  // Accounts button label & pill
  const accountsCount = useMemo(() => {
    if (selectedAccountIds === null) return activeAccounts.length;
    return selectedAccountIds.size;
  }, [selectedAccountIds, activeAccounts.length]);

  const accountsLabel = useMemo(() => {
    if (
      selectedAccountIds === null ||
      accountsCount === activeAccounts.length
    ) {
      return "All Accounts";
    }
    if (accountsCount === 0) {
      return "0 Accounts";
    }
    if (accountsCount === 1) {
      const singleId = Array.from(selectedAccountIds)[0];
      const acc = activeAccounts.find((a) => a.id === singleId);
      return acc?.name || "1 Account";
    }
    return `${accountsCount} Accounts`;
  }, [selectedAccountIds, accountsCount, activeAccounts]);

  // Spending breakdown items for display
  const displayItems = useMemo<DisplayBreakdownItem[]>(() => {
    if (viewBy === "categories") {
      return reflect.spendingItems.map((item) => ({
        id: item.categoryId,
        name: item.categoryName,
        spentMilliunits: item.spentMilliunits,
        percentageBasisPoints: item.percentageBasisPoints,
        isGroup: false,
      }));
    }

    // Groups view
    if (selectedGroupId !== null) {
      const groupCategories = reflect.spendingItems.filter(
        (item) => item.groupId === selectedGroupId,
      );
      const groupTotal = groupCategories.reduce(
        (sum, item) => sum + item.spentMilliunits,
        0,
      );
      return groupCategories.map((item) => ({
        id: item.categoryId,
        name: item.categoryName,
        spentMilliunits: item.spentMilliunits,
        percentageBasisPoints:
          groupTotal > 0
            ? Math.round((item.spentMilliunits * 10000) / groupTotal)
            : 0,
        isGroup: false,
      }));
    }

    // All groups view
    return reflect.spendingGroupItems.map((item) => ({
      id: item.groupId,
      name: item.groupName,
      spentMilliunits: item.spentMilliunits,
      percentageBasisPoints: item.percentageBasisPoints,
      isGroup: true,
      categoryCount: item.categoryCount,
    }));
  }, [
    viewBy,
    selectedGroupId,
    reflect.spendingItems,
    reflect.spendingGroupItems,
  ]);

  const activeTotalSpending = useMemo(() => {
    if (viewBy === "groups" && selectedGroupId !== null) {
      return displayItems.reduce((sum, item) => sum + item.spentMilliunits, 0);
    }
    return reflect.totalSpendingMilliunits;
  }, [viewBy, selectedGroupId, displayItems, reflect.totalSpendingMilliunits]);

  const selectedGroupName = useMemo(() => {
    if (!selectedGroupId) return "";
    const grp = reflect.spendingGroupItems.find(
      (g) => g.groupId === selectedGroupId,
    );
    if (grp) return grp.groupName;
    const catGrp = categoryGroups.find((g) => g.id === selectedGroupId);
    if (catGrp) return catGrp.name;
    return selectedGroupId;
  }, [selectedGroupId, reflect.spendingGroupItems, categoryGroups]);

  // Hovered item details for donut center title
  const hoveredItem = useMemo(() => {
    if (!hoveredId) return null;
    return displayItems.find((item) => item.id === hoveredId) ?? null;
  }, [hoveredId, displayItems]);

  // -------------------------------------------------------------
  // Spending Breakdown Metrics Calculations
  // -------------------------------------------------------------
  const monthsInPeriod = useMemo(() => {
    if (timeframePreset === "latest3months") return 3;
    if (timeframePreset === "latest6months") return 6;
    if (timeframePreset === "latest12months" || timeframePreset === "lastyear") return 12;
    return 1;
  }, [timeframePreset]);

  const averageMonthlySpending = useMemo(() => {
    return Math.round(activeTotalSpending / monthsInPeriod);
  }, [activeTotalSpending, monthsInPeriod]);

  const daysInPeriod = useMemo(() => {
    const ym = activeMonth.slice(0, 7);
    const [yStr, mStr] = ym.split("-");
    const y = parseInt(yStr, 10) || 2026;
    const m = parseInt(mStr, 10) || 10;
    const daysInCurrentMonth = new Date(y, m, 0).getDate();
    return daysInCurrentMonth * monthsInPeriod;
  }, [activeMonth, monthsInPeriod]);

  const averageDailySpending = useMemo(() => {
    if (daysInPeriod <= 0 || activeTotalSpending <= 0) return 0;
    return Math.round(activeTotalSpending / daysInPeriod);
  }, [activeTotalSpending, daysInPeriod]);

  // Most frequent category or group
  const mostFrequentMetric = useMemo(() => {
    if (viewBy === "groups") {
      // Group frequency
      if (periodTransactions.length > 0) {
        const counts: Record<string, { count: number; name: string }> = {};
        for (const tx of periodTransactions) {
          if (tx.amount_milliunits >= 0) continue;
          const cat = filterableCategories.find((c) => c.id === tx.category_id);
          const grpId = cat?.groupId || "uncategorized";
          const grpName = cat?.groupName || "Uncategorized";
          if (!counts[grpId]) counts[grpId] = { count: 0, name: grpName };
          counts[grpId].count++;
        }
        const entries = Object.values(counts);
        if (entries.length > 0) {
          entries.sort((a, b) => b.count - a.count);
          return { name: entries[0].name, count: entries[0].count };
        }
      }
      if (displayItems.length > 0) {
        const top = displayItems[0];
        const estimatedCount = Math.max(1, Math.round(top.spentMilliunits / 35000));
        return { name: top.name, count: estimatedCount };
      }
      return { name: "Needs", count: 0 };
    }

    // Categories frequency
    if (periodTransactions.length > 0) {
      const counts: Record<string, { count: number; name: string }> = {};
      for (const tx of periodTransactions) {
        if (tx.amount_milliunits >= 0) continue;
        const cat = filterableCategories.find((c) => c.id === tx.category_id);
        const name = cat?.name || "Uncategorized";
        if (!counts[tx.category_id || "uncat"]) {
          counts[tx.category_id || "uncat"] = { count: 0, name };
        }
        counts[tx.category_id || "uncat"].count++;
      }
      const entries = Object.values(counts);
      if (entries.length > 0) {
        entries.sort((a, b) => b.count - a.count);
        return { name: entries[0].name, count: entries[0].count };
      }
    }
    if (displayItems.length > 0) {
      const top = displayItems[0];
      const estimatedCount = Math.max(1, Math.round(top.spentMilliunits / 35000));
      return { name: top.name, count: estimatedCount };
    }
    return { name: "Rent", count: 0 };
  }, [viewBy, periodTransactions, filterableCategories, displayItems]);

  // Largest outflow
  const largestOutflowMetric = useMemo(() => {
    if (periodTransactions.length > 0) {
      let maxOutflowTx: Transaction | null = null;
      for (const tx of periodTransactions) {
        if (tx.amount_milliunits >= 0) continue;
        if (!maxOutflowTx || tx.amount_milliunits < maxOutflowTx.amount_milliunits) {
          maxOutflowTx = tx;
        }
      }
      if (maxOutflowTx) {
        const cat = filterableCategories.find((c) => c.id === maxOutflowTx.category_id);
        const name = maxOutflowTx.memo || cat?.name || "Outflow";
        return { name, amountMilliunits: Math.abs(maxOutflowTx.amount_milliunits) };
      }
    }
    if (displayItems.length > 0) {
      const top = displayItems[0];
      return { name: top.name, amountMilliunits: top.spentMilliunits };
    }
    return { name: "None", amountMilliunits: 0 };
  }, [periodTransactions, filterableCategories, displayItems]);

  // Approximate Age of Money (default 75 days or based on net worth / buffer)
  const ageOfMoneyDays =
    reflect.totalSpendingMilliunits > 0
      ? Math.max(
          15,
          Math.min(
            180,
            Math.round(
              (reflect.assetsMilliunits / reflect.totalSpendingMilliunits) * 30,
            ),
          ),
        )
      : 75;

  const currencyOptions = currencySymbol ? { currencySymbol } : undefined;

  // Donut chart geometry calculations for Billboard.js SVG styling
  const donutArcs = useMemo(() => {
    if (displayItems.length === 0 || activeTotalSpending <= 0) return [];
    // Billboard.js donut center is (0, 0) inside <g transform="translate(337.55, 196.5)">
    const R = 186.675;
    const r = 112.005;

    let accumulatedFraction = 0;
    return displayItems.map((item, idx) => {
      const fraction = item.percentageBasisPoints / 10000;
      const isFullCircle = fraction >= 0.999 || displayItems.length === 1;

      let pathD: string;
      let labelX: number;
      let labelY: number;
      let textAnchor: "start" | "end" | "middle";

      if (isFullCircle) {
        // Complete 360-degree donut ring centered at (0, 0)
        // Two 180-degree arcs for outer circle, line inward, two 180-degree arcs counter-clockwise for inner circle
        pathD = `M 0 ${-R} A ${R} ${R} 0 1 1 0 ${R} A ${R} ${R} 0 1 1 0 ${-R} L 0 ${-r} A ${r} ${r} 0 1 0 0 ${r} A ${r} ${r} 0 1 0 0 ${-r} Z`;
        const labelR = R + 22.375;
        // Position single item label at 3 o'clock
        labelX = labelR;
        labelY = 0;
        textAnchor = "start";
      } else {
        const startAngle = accumulatedFraction * 2 * Math.PI - Math.PI / 2;
        const endAngle = (accumulatedFraction + fraction) * 2 * Math.PI - Math.PI / 2;
        accumulatedFraction += fraction;

        const xOuterStart = R * Math.cos(startAngle);
        const yOuterStart = R * Math.sin(startAngle);
        const xOuterEnd = R * Math.cos(endAngle);
        const yOuterEnd = R * Math.sin(endAngle);

        const xInnerEnd = r * Math.cos(endAngle);
        const yInnerEnd = r * Math.sin(endAngle);
        const xInnerStart = r * Math.cos(startAngle);
        const yInnerStart = r * Math.sin(startAngle);

        const largeArc = fraction > 0.5 ? 1 : 0;
        pathD = `M ${xOuterStart} ${yOuterStart} A ${R} ${R} 0 ${largeArc} 1 ${xOuterEnd} ${yOuterEnd} L ${xInnerEnd} ${yInnerEnd} A ${r} ${r} 0 ${largeArc} 0 ${xInnerStart} ${yInnerStart} Z`;

        const midAngle = (startAngle + endAngle) / 2;
        const labelR = R + 22.375;
        labelX = labelR * Math.cos(midAngle);
        labelY = labelR * Math.sin(midAngle);
        textAnchor = Math.abs(labelX) < 10 ? "middle" : labelX >= 0 ? "start" : "end";
      }

      const showText = isFullCircle || (idx < 3 && item.percentageBasisPoints >= 800);
      const color = YNAB_REPORT_COLORS[idx % YNAB_REPORT_COLORS.length];

      return {
        item,
        pathD,
        color,
        labelX,
        labelY,
        textAnchor,
        showText,
        isHovered: hoveredId === item.id,
      };
    });
  }, [displayItems, activeTotalSpending, hoveredId]);

  return (
    <div
      className="ynab-u content"
      style={{
        flex: 1,
        overflowY: "auto",
        backgroundColor: "var(--backgroundPrimary)",
        color: "var(--labelPrimary)",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div className="content-min-break reports-header-top">
        {/* Reports Navigation Tabs */}
        <div className="ynab-u reports-header" role="tablist">
          <button
            type="button"
            className={activeTab === "spending-breakdown" ? "active" : ""}
            onClick={() => setActiveTab("spending-breakdown")}
          >
            Spending Breakdown
          </button>
          <button
            type="button"
            className={activeTab === "spending-trends" ? "active" : ""}
            onClick={() => setActiveTab("spending-trends")}
          >
            Spending Trends
          </button>
          <button
            type="button"
            className={activeTab === "net-worth" ? "active" : ""}
            onClick={() => setActiveTab("net-worth")}
          >
            Net Worth
          </button>
          <button
            type="button"
            className={activeTab === "income-expense" ? "active" : ""}
            onClick={() => setActiveTab("income-expense")}
          >
            Income v Expense
          </button>
          <button
            type="button"
            className={activeTab === "age-of-money" ? "active" : ""}
            onClick={() => setActiveTab("age-of-money")}
          >
            Age of Money
          </button>
        </div>

        <div className="reflect-container" style={{ padding: "1.5rem 2rem" }}>
          <div
            className="reflect-content"
            style={{ width: "100%", maxWidth: "1200px" }}
          >
            {/* Filter Controls Bar (hidden on Age of Money tab per YNAB standard) */}
            {activeTab !== "age-of-money" && (
              <div
                className="reflect-filter-controls"
                style={{ marginBottom: "1.25rem" }}
              >
                {/* Timeframe Filter Button Group */}
                <div className="reflect-filter-button-group">
                  <button
                    className="ghost-button primary is-icon-only type-body filter-button filter-button__left-arrow"
                    aria-label="Previous date range"
                    type="button"
                    onClick={handlePrevMonth}
                  >
                    <YnabIcon name="chevron_left" size={12} />
                    <div className="filter-button__divider"></div>
                  </button>
                  <button
                    className="ghost-button primary type-body filter-button filter-button--middle-state filter-button-timeframe"
                    type="button"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setTimeframeAnchor({
                        top: rect.bottom + 6,
                        left: Math.max(16, rect.left),
                      });
                      setTimeframeOpen((prev) => !prev);
                      setCategoriesOpen(false);
                      setAccountsOpen(false);
                    }}
                  >
                    <YnabIcon name="calendar" size={12} />
                    {timeframeLabel}
                  </button>
                  <button
                    className="ghost-button primary is-icon-only type-body filter-button filter-button__right-arrow"
                    aria-label="Next date range"
                    type="button"
                    onClick={handleNextMonth}
                  >
                    <div className="filter-button__divider"></div>
                    <YnabIcon name="chevron_right" size={12} />
                  </button>
                </div>

                <div className="filter-controls-divider"></div>

                {/* Categories Filter Button Group */}
                <div className="reflect-filter-button-group">
                  <button
                    className="ghost-button primary is-dropdown type-body filter-button filter-button-categories"
                    type="button"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setCategoriesAnchor({
                        top: rect.bottom + 6,
                        left: Math.max(16, rect.left),
                      });
                      setCategoriesOpen((prev) => !prev);
                      setTimeframeOpen(false);
                      setAccountsOpen(false);
                    }}
                  >
                    {selectedCategoryIds !== null &&
                      categoriesCount !== filterableCategories.length && (
                        <span className="filter-button__pill">
                          {categoriesCount}
                        </span>
                      )}
                    {categoriesLabel}
                    <YnabIcon name="caret_down" size={8} />
                  </button>
                </div>

                {/* Accounts Filter Button Group */}
                <div className="reflect-filter-button-group">
                  <button
                    className="ghost-button primary is-dropdown type-body filter-button filter-button-accounts"
                    type="button"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setAccountsAnchor({
                        top: rect.bottom + 6,
                        left: Math.max(16, rect.left),
                      });
                      setAccountsOpen((prev) => !prev);
                      setTimeframeOpen(false);
                      setCategoriesOpen(false);
                    }}
                  >
                    {selectedAccountIds !== null &&
                      accountsCount !== activeAccounts.length && (
                        <span className="filter-button__pill">
                          {accountsCount}
                        </span>
                      )}
                    {accountsLabel}
                    <YnabIcon name="caret_down" size={8} />
                  </button>
                </div>
              </div>
            )}

            {/* TAB 1: Spending Breakdown (Fully authentic to newest YNAB scrape) */}
            {activeTab === "spending-breakdown" && (
              <div className="reflect-spending-breakdown">
                <div className="reflect-page-header-group">
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <h3 className="reflect-page-title">Spending Breakdown</h3>

                    {/* Authentic Breadcrumbs for Group drill-down */}
                    {viewBy === "groups" && selectedGroupId !== null && (
                      <div className="reflect-breadcrumbs__selected-group-breadcrumbs">
                        <button
                          type="button"
                          className="ghost-button all-groups-button type-body"
                          onClick={() => setSelectedGroupId(null)}
                          style={{
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            padding: 0,
                            fontWeight: 600,
                          }}
                        >
                          All Category Groups
                        </button>
                        <YnabIcon name="chevron_right" size={10} />
                        <span className="group-name">{selectedGroupName}</span>
                      </div>
                    )}
                  </div>

                  <div className="reflect-page-header-actions">
                    <button
                      className="ghost-button primary type-body reflect-export-button"
                      type="button"
                    >
                      <YnabIcon name="document_with_arrow_down" size={14} />
                      <span>Export</span>
                    </button>
                  </div>
                </div>

                <div className="spending-breakdown__content">
                  {/* Left Column: Donut Card + Metrics Card */}
                  <div className="spending-breakdown__column left">
                    <div className="spending-breakdown__donut-card card">
                      <div className="spending-breakdown__donut-header">
                        <div className="spending-breakdown__total-spending" tabIndex={0}>
                          <span className="total-spending-title">Total Spending</span>
                          <span className="total-spending-value">
                            {formatMilliunits(activeTotalSpending, currencyOptions)}
                          </span>
                        </div>
                        <div
                          className="segmented-control textOnlyOption spending-breakdown__category-group-toggle"
                          role="tablist"
                          tabIndex={0}
                        >
                          <button
                            className={`segmented-control-button ${
                              viewBy === "categories" ? "selected" : ""
                            } spending-breakdown-category-group-toggle__button`}
                            aria-selected={viewBy === "categories"}
                            role="tab"
                            tabIndex={-1}
                            type="button"
                            onClick={() => {
                              setViewBy("categories");
                              setSelectedGroupId(null);
                            }}
                          >
                            Categories
                          </button>
                          <button
                            className={`segmented-control-button ${
                              viewBy === "groups" ? "selected" : ""
                            } spending-breakdown-category-group-toggle__button`}
                            aria-selected={viewBy === "groups"}
                            role="tab"
                            tabIndex={-1}
                            type="button"
                            onClick={() => {
                              setViewBy("groups");
                              setSelectedGroupId(null);
                            }}
                          >
                            Groups
                          </button>
                        </div>
                      </div>

                      {/* Donut Chart with billboard.js hierarchy */}
                      <div className="spending-breakdown-donut-chart">
                        <div className="spending-breakdown-donut-chart__title">
                          <span>
                            {hoveredItem
                              ? hoveredItem.name
                              : viewBy === "groups" && selectedGroupId
                                ? selectedGroupName
                                : "Total Spending"}
                          </span>
                          <span className="spending-breakdown-donut-chart__title-amount">
                            {formatMilliunits(
                              hoveredItem ? hoveredItem.spentMilliunits : activeTotalSpending,
                              currencyOptions,
                            )}
                          </span>
                          {hoveredItem && (
                            <span className="spending-breakdown-donut-chart__percentage">
                              {hoveredItem.percentageBasisPoints < 100 &&
                              hoveredItem.percentageBasisPoints > 0
                                ? "<1%"
                                : `${Math.round(hoveredItem.percentageBasisPoints / 100)}%`}
                            </span>
                          )}
                        </div>
                        <div className="spending-breakdown-donut-chart__modal-trigger"></div>
                        <div
                          id="ember20"
                          className="spending-breakdown-donut-chart__bb"
                          style={{ position: "relative" }}
                        >
                          <svg
                            width="675"
                            height="519"
                            viewBox="0 0 675 519"
                            style={{ overflow: "hidden", display: "block" }}
                          >
                            <g className="bb-main" transform="translate(0.5, 60.5)">
                              <g className="bb-chart">
                                <g className="bb-chart-arcs" transform="translate(337.55, 196.5)">
                                  {donutArcs.length === 0 ? (
                                    <circle
                                      cx="0"
                                      cy="0"
                                      r="150"
                                      fill="transparent"
                                      stroke="var(--separatorStandard)"
                                      strokeWidth="74"
                                    />
                                  ) : (
                                    donutArcs.map((arc) => (
                                      <g
                                        key={arc.item.id}
                                        className={`bb-chart-arc bb-target bb-target-${arc.item.id}`}
                                        style={{ cursor: arc.item.isGroup ? "pointer" : "default" }}
                                        onClick={() => {
                                          if (arc.item.isGroup) {
                                            setSelectedGroupId(arc.item.id);
                                          }
                                        }}
                                        onMouseEnter={() => setHoveredId(arc.item.id)}
                                        onMouseLeave={() => setHoveredId(null)}
                                      >
                                        <g className={`bb-shapes bb-shapes-${arc.item.id} bb-arcs`}>
                                          <path
                                            className={`bb-shape bb-arc bb-arc-${arc.item.id}`}
                                            d={arc.pathD}
                                            fillRule="evenodd"
                                            style={{
                                              fill: arc.color,
                                              transition: "transform 0.15s ease",
                                              transform: arc.isHovered ? "scale(1.03)" : undefined,
                                              transformOrigin: "0px 0px",
                                            }}
                                          />
                                        </g>
                                        {arc.showText && (
                                          <text
                                            transform={`translate(${arc.labelX}, ${arc.labelY})`}
                                            style={{
                                              textAnchor: arc.textAnchor,
                                              pointerEvents: "none",
                                              display: "block",
                                            }}
                                          >
                                            <tspan x="0" dy="0em">
                                              {arc.item.name}
                                            </tspan>
                                            <tspan x="0" dy="1.45em">
                                              {formatMilliunits(
                                                arc.item.spentMilliunits,
                                                currencyOptions,
                                              )}{" "}
                                              ({Math.round(arc.item.percentageBasisPoints / 100)}%)
                                            </tspan>
                                          </text>
                                        )}
                                      </g>
                                    ))
                                  )}
                                </g>
                              </g>
                            </g>
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Scraped Metrics Section */}
                    <div className="spending-breakdown__metrics">
                      <div className="spending-breakdown__metrics-row">
                        <div className="spending-breakdown__metric monthly-average-spending">
                          <span className="spending-metric-title">Average Monthly Spending</span>
                          <span className="spending-metric-value">
                            {formatMilliunits(averageMonthlySpending, currencyOptions)}
                          </span>
                        </div>
                        <div className="spending-breakdown__metric daily-average-spending">
                          <span className="spending-metric-title">Average Daily Spending</span>
                          <span className="spending-metric-value">
                            {formatMilliunits(averageDailySpending, currencyOptions)}
                          </span>
                        </div>
                      </div>
                      <div className="spending-breakdown__metrics-row">
                        <div className="spending-breakdown__metric most-frequent-category">
                          <span className="spending-metric-title">
                            {viewBy === "groups"
                              ? "Most Frequent Group"
                              : "Most Frequent Category"}
                          </span>
                          <span className="spending-metric-value">
                            {mostFrequentMetric.name}
                          </span>
                          <span className="spending-metric-subtitle">
                            {mostFrequentMetric.count} transactions
                          </span>
                        </div>
                        <div className="spending-breakdown__metric largest-outflow">
                          <span className="spending-metric-title">Largest Outflow</span>
                          <span className="spending-metric-value">
                            {largestOutflowMetric.name}
                          </span>
                          <span className="spending-metric-subtitle">
                            {formatMilliunits(
                              largestOutflowMetric.amountMilliunits,
                              currencyOptions,
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Bar Chart Card */}
                  <div className="spending-breakdown__column right">
                    <div className="spending-breakdown__bar-card card">
                      <div className="spending-breakdown-bar-chart-header spending-breakdown-bar-chart-row">
                        <div className="spending-breakdown-bar-chart-section">
                          <span>
                            {viewBy === "groups"
                              ? selectedGroupId
                                ? `${selectedGroupName} Categories`
                                : "Groups"
                              : "Categories"}
                          </span>
                          <span>Total Spending</span>
                        </div>
                      </div>
                      <div className="spending-breakdown-bar-chart-body card-body">
                        {displayItems.length === 0 ? (
                          <p
                            style={{
                              color: "var(--labelSecondary)",
                              fontStyle: "italic",
                              padding: "1rem 0",
                            }}
                          >
                            No spending activity recorded for this period.
                          </p>
                        ) : (
                          displayItems.map((item, idx) => {
                            const pctValue = item.percentageBasisPoints / 100;
                            const pctText =
                              item.percentageBasisPoints < 100 &&
                              item.percentageBasisPoints > 0
                                ? "<1%"
                                : `${Math.round(pctValue)}%`;
                            const color =
                              YNAB_REPORT_COLORS[idx % YNAB_REPORT_COLORS.length];
                            return (
                              <button
                                key={item.id}
                                className="ghost-button secondary type-body reflect-bar-chart-row spending-breakdown-bar-chart-row"
                                type="button"
                                onClick={() => {
                                  if (item.isGroup) {
                                    setSelectedGroupId(item.id);
                                  }
                                }}
                                onMouseEnter={() => setHoveredId(item.id)}
                                onMouseLeave={() => setHoveredId(null)}
                              >
                                <div className="spending-breakdown-bar-chart-section">
                                  <span>{item.name}</span>
                                  <span className="amount">
                                    {formatMilliunits(item.spentMilliunits, currencyOptions)}
                                  </span>
                                </div>
                                <div className="spending-breakdown-bar-chart-section bar-section">
                                  <div
                                    className="spending-breakdown-bar-chart-bar"
                                    style={{
                                      width: `${Math.max(0.5, pctValue).toFixed(2)}%`,
                                      backgroundColor: color,
                                    }}
                                  ></div>
                                  {pctText}
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                      <div className="reflect-card-gradient hidden"></div>
                    </div>
                  </div>
                </div>

                {/* Net Worth Quick Overview Section */}
                <div style={{ marginTop: "1.5rem" }}>
                  <div className="card" style={{ padding: "1.25rem" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>
                          Net Worth
                        </h4>
                        <span style={{ fontSize: "0.85rem", color: "var(--labelSecondary)" }}>
                          Assets minus Debts overview (filtered accounts)
                        </span>
                      </div>
                      <div
                        className="tabular-nums"
                        style={{ fontSize: "1.4rem", fontWeight: 700 }}
                      >
                        {formatMilliunits(reflect.netWorthMilliunits, currencyOptions)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Net Worth */}
            {activeTab === "net-worth" && (
              <div className="reflect-net-worth">
                <div className="reflect-page-header-group">
                  <h3 className="reflect-page-title">Net Worth</h3>
                  <div className="reflect-page-header-actions">
                    <button
                      className="ghost-button primary type-body reflect-export-button"
                      type="button"
                    >
                      <YnabIcon name="document_with_arrow_down" size={14} />
                      <span>Export</span>
                    </button>
                  </div>
                </div>

                <div className="card" style={{ padding: "2rem", marginBottom: "1.5rem" }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: "1.5rem",
                      textAlign: "center",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: "0.875rem",
                          color: "var(--labelSecondary)",
                          marginBottom: "0.25rem",
                        }}
                      >
                        Assets
                      </div>
                      <div
                        className="tabular-nums"
                        style={{
                          fontSize: "1.5rem",
                          fontWeight: 700,
                          color: "var(--labelPositive)",
                        }}
                      >
                        {formatMilliunits(reflect.assetsMilliunits, currencyOptions)}
                      </div>
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: "0.875rem",
                          color: "var(--labelSecondary)",
                          marginBottom: "0.25rem",
                        }}
                      >
                        Debts
                      </div>
                      <div
                        className="tabular-nums"
                        style={{
                          fontSize: "1.5rem",
                          fontWeight: 700,
                          color: "var(--labelNegative)",
                        }}
                      >
                        {formatMilliunits(reflect.debtsMilliunits, currencyOptions)}
                      </div>
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: "0.875rem",
                          color: "var(--labelSecondary)",
                          marginBottom: "0.25rem",
                        }}
                      >
                        Total Net Worth
                      </div>
                      <div
                        className="tabular-nums"
                        style={{ fontSize: "1.75rem", fontWeight: 800 }}
                      >
                        {formatMilliunits(reflect.netWorthMilliunits, currencyOptions)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Age of Money */}
            {activeTab === "age-of-money" && (
              <div className="reflect-age-of-money">
                <div className="reflect-page-header-group">
                  <h3 className="reflect-page-title">Age of Money</h3>
                </div>

                <section
                  className="card chart-card"
                  style={{ padding: "1.5rem", marginBottom: "1.5rem" }}
                >
                  <div className="top-row" style={{ marginBottom: "1.5rem" }}>
                    <div className="current-age-of-money" tabIndex={0}>
                      <span
                        className="current-age-of-money-title"
                        style={{
                          display: "block",
                          fontSize: "0.875rem",
                          color: "var(--labelSecondary)",
                        }}
                      >
                        Current
                      </span>
                      <span
                        className="current-age-of-money-value"
                        style={{
                          fontSize: "2rem",
                          fontWeight: 800,
                          color: "var(--labelPrimary)",
                        }}
                      >
                        {ageOfMoneyDays} days
                      </span>
                    </div>
                  </div>

                  <div
                    className="age-of-money-chart"
                    style={{ width: "100%", height: "260px" }}
                  >
                    <div className="chart bb" style={{ position: "relative" }}>
                      <svg
                        width="100%"
                        height="260"
                        viewBox="0 0 600 240"
                        style={{ overflow: "visible" }}
                      >
                        <defs>
                          <linearGradient
                            id="aomGradient"
                            x1="0%"
                            y1="0%"
                            x2="0%"
                            y2="100%"
                          >
                            <stop
                              offset="0%"
                              stopColor="var(--reportsChartTrendAOMSelected, #77ba21)"
                              stopOpacity="0.4"
                            />
                            <stop
                              offset="100%"
                              stopColor="var(--reportsChartTrendAOMSelected, #77ba21)"
                              stopOpacity="0.02"
                            />
                          </linearGradient>
                        </defs>
                        <g className="bb-axis bb-axis-y" transform="translate(40, 0)">
                          <line x1="0" y1="20" x2="560" y2="20" stroke="var(--separatorLight, #eee)" />
                          <line x1="0" y1="80" x2="560" y2="80" stroke="var(--separatorLight, #eee)" />
                          <line x1="0" y1="140" x2="560" y2="140" stroke="var(--separatorLight, #eee)" />
                          <line x1="0" y1="200" x2="560" y2="200" stroke="var(--separatorLight, #eee)" />
                          <text x="-10" y="25" fontSize="11" fill="var(--labelSecondary)" textAnchor="end">
                            90 days
                          </text>
                          <text x="-10" y="85" fontSize="11" fill="var(--labelSecondary)" textAnchor="end">
                            60 days
                          </text>
                          <text x="-10" y="145" fontSize="11" fill="var(--labelSecondary)" textAnchor="end">
                            30 days
                          </text>
                          <text x="-10" y="205" fontSize="11" fill="var(--labelSecondary)" textAnchor="end">
                            0 days
                          </text>
                        </g>
                        <g className="bb-axis bb-axis-x" transform="translate(40, 200)">
                          {["May", "Jun", "Jul", "Aug", "Sep", "Oct"].map((m, i) => (
                            <text
                              key={m}
                              x={30 + i * 100}
                              y="20"
                              fontSize="11"
                              fill="var(--labelSecondary)"
                              textAnchor="middle"
                            >
                              {m}
                            </text>
                          ))}
                        </g>
                        <g transform="translate(40, 0)">
                          <path
                            className="bb-area bb-area-ageOfMoney"
                            d="M 30 180 L 130 150 L 230 110 L 330 90 L 430 75 L 530 50 L 530 200 L 30 200 Z"
                            fill="url(#aomGradient)"
                          />
                          <path
                            className="bb-line bb-line-ageOfMoney"
                            d="M 30 180 L 130 150 L 230 110 L 330 90 L 430 75 L 530 50"
                            fill="none"
                            stroke="var(--reportsChartTrendAOMSelected, #77ba21)"
                            strokeWidth="3"
                          />
                          {[
                            [30, 180],
                            [130, 150],
                            [230, 110],
                            [330, 90],
                            [430, 75],
                            [530, 50],
                          ].map(([x, y], idx) => (
                            <circle
                              key={idx}
                              className="bb-circle"
                              cx={x}
                              cy={y}
                              r={idx === 5 ? "6" : "4"}
                              fill={idx === 5 ? "var(--reportsChartTrendAOMSelected, #77ba21)" : "#fff"}
                              stroke="var(--reportsChartTrendAOMSelected, #77ba21)"
                              strokeWidth="2.5"
                            />
                          ))}
                        </g>
                      </svg>
                    </div>
                  </div>
                </section>

                <div className="card card-body" style={{ padding: "1.5rem" }}>
                  <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "1.1rem", fontWeight: 700 }}>
                    Understanding Age of Money
                  </h4>
                  <p style={{ color: "var(--labelSecondary)", lineHeight: 1.5, margin: "0 0 1rem 0" }}>
                    Age of Money is how long, on average, money sits in your account(s) between earning and spending it.
                  </p>
                  <p style={{ color: "var(--labelSecondary)", lineHeight: 1.5, margin: 0 }}>
                    Want to have more time to make decisions? Tired of shifting money around at the last minute? Use Age of Money to help you gauge the time between earning and spending.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 4: Spending Trends Placeholder */}
            {activeTab === "spending-trends" && (
              <div className="reflect-spending-trends card" style={{ padding: "2rem" }}>
                <h3 style={{ margin: "0 0 1rem 0" }}>Spending Trends</h3>
                <p style={{ color: "var(--labelSecondary)" }}>
                  Historical comparative data across past billing cycles.
                </p>
                <div style={{ marginTop: "1.5rem", fontSize: "1.2rem", fontWeight: 600 }}>
                  Total Spending Tracked: {formatMilliunits(reflect.totalSpendingMilliunits, currencyOptions)}
                </div>
              </div>
            )}

            {/* TAB 5: Income v Expense Placeholder */}
            {activeTab === "income-expense" && (
              <div className="reflect-income-expense card" style={{ padding: "2rem" }}>
                <h3 style={{ margin: "0 0 1rem 0" }}>Income v Expense</h3>
                <p style={{ color: "var(--labelSecondary)" }}>
                  Compare monthly income versus categorical outflow over time.
                </p>
                <div style={{ marginTop: "1.5rem", fontSize: "1.2rem", fontWeight: 600 }}>
                  Total Spending Tracked: {formatMilliunits(reflect.totalSpendingMilliunits, currencyOptions)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          AUTHENTIC YNAB FILTER POPOVERS (Scraped DOM & Exact CSS Hierarchy)
      ───────────────────────────────────────────────────────────────────────────── */}

      {/* 1. Category Filter Popover */}
      {categoriesOpen && categoriesAnchor && (
        <div
          className="modal-overlay active modal-reports-dropdown"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10005,
            backgroundColor: "transparent",
            backdropFilter: "none",
            WebkitBackdropFilter: "none",
          }}
          onClick={() => setCategoriesOpen(false)}
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            style={{
              position: "fixed",
              top: `${categoriesAnchor.top}px`,
              left: `${categoriesAnchor.left}px`,
              zIndex: 10006,
              width: "28.125rem",
              maxHeight: "26.5rem",
              backgroundColor: "var(--backgroundPrimaryElevated, #ffffff)",
              borderRadius: "8px",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.25)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="filter-items-search">
                <YnabIcon name="search" size={16} />
                <input
                  type="text"
                  className="ember-text-field ember-view filter-items-search-input"
                  placeholder="Search All Categories"
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  spellCheck={false}
                  autoComplete="off"
                />
                {categorySearch && (
                  <button
                    type="button"
                    className="filter-items-search-cancel-icon ghost-button is-icon-only"
                    onClick={() => setCategorySearch("")}
                  >
                    <YnabIcon name="cross" size={12} />
                  </button>
                )}
              </div>
            </div>

            <div
              className="modal-overflow-area"
              style={{ flex: 1, overflowY: "auto", maxHeight: "18rem" }}
            >
              <ul className="modal-list">
                {groupedCategoriesForFilter.length === 0 ? (
                  <li
                    style={{
                      justifyContent: "center",
                      color: "var(--labelSecondary)",
                      fontStyle: "italic",
                      padding: "1rem",
                    }}
                  >
                    No matching categories found
                  </li>
                ) : (
                  groupedCategoriesForFilter.map((grp) => {
                    const grpCatIds = grp.categories.map((c) => c.id);
                    const selectedCount = grpCatIds.filter((id) =>
                      selectedCategoryIds === null
                        ? true
                        : selectedCategoryIds.has(id),
                    ).length;
                    const isAllChecked = selectedCount === grpCatIds.length;
                    const isPartial =
                      selectedCount > 0 && selectedCount < grpCatIds.length;

                    return (
                      <React.Fragment key={grp.id}>
                        <li
                          className="user-data is-section-item"
                          onClick={() => toggleGroup(grpCatIds)}
                        >
                          <button
                            className={`ynab-checkbox ynab-checkbox-button ${
                              isAllChecked ? "is-checked" : isPartial ? "is-partial" : ""
                            }`}
                            role="checkbox"
                            aria-checked={isAllChecked}
                            aria-label={grp.name}
                            type="button"
                          >
                            <svg
                              className={`ynab-new-icon ynab-checkbox-button-square ${
                                isAllChecked
                                  ? "is-checked"
                                  : isPartial
                                    ? "is-partial"
                                    : ""
                              }`}
                              width="13"
                              height="13"
                            >
                              {isAllChecked && <use href="#icon_sprite_check"></use>}
                              {isPartial && (
                                <rect
                                  x="2"
                                  y="5.5"
                                  width="9"
                                  height="2"
                                  fill="currentColor"
                                  rx="1"
                                />
                              )}
                            </svg>
                          </button>
                          <span className="main-category">{grp.name}</span>
                        </li>
                        {grp.categories.map((cat) => {
                          const isChecked =
                            selectedCategoryIds === null ||
                            selectedCategoryIds.has(cat.id);
                          return (
                            <li
                              key={cat.id}
                              className="user-data not-section-item"
                              onClick={() => toggleCategory(cat.id)}
                            >
                              <button
                                className={`ynab-checkbox ynab-checkbox-button ${
                                  isChecked ? "is-checked" : ""
                                }`}
                                role="checkbox"
                                aria-checked={isChecked}
                                aria-label={cat.name}
                                type="button"
                              >
                                <svg
                                  className={`ynab-new-icon ynab-checkbox-button-square ${
                                    isChecked ? "is-checked" : ""
                                  }`}
                                  width="13"
                                  height="13"
                                >
                                  {isChecked && <use href="#icon_sprite_check"></use>}
                                </svg>
                              </button>
                              <span>{cat.name}</span>
                            </li>
                          );
                        })}
                      </React.Fragment>
                    );
                  })
                )}
              </ul>
            </div>

            <div className="modal-actions">
              <div className="actions">
                <div className="modal-action-group">
                  <button
                    type="button"
                    className="ghost-button secondary type-body select-items-button"
                    onClick={handleSelectAllCategories}
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    className="ghost-button secondary type-body select-items-button"
                    onClick={handleSelectNoneCategories}
                  >
                    Select None
                  </button>
                </div>
                <div className="modal-action-group">
                  <button
                    type="button"
                    className="ynab-button secondary button-cancel"
                    onClick={() => setCategoriesOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="ynab-button primary"
                    onClick={() => setCategoriesOpen(false)}
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>

            <svg
              className="modal-arrow"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              style={{
                left: "105px",
                bottom: "100%",
                height: "0.9375rem",
                width: "1.875rem",
              }}
            >
              <path
                d="M 0 100 L 50 0 L 100 100 L 0 100 Z"
                fill="var(--backgroundPrimaryElevated, #ffffff)"
              ></path>
            </svg>
          </div>
        </div>
      )}

      {/* 2. Account Filter Popover */}
      {accountsOpen && accountsAnchor && (
        <div
          className="modal-overlay active modal-reports-dropdown"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10005,
            backgroundColor: "transparent",
            backdropFilter: "none",
            WebkitBackdropFilter: "none",
          }}
          onClick={() => setAccountsOpen(false)}
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            style={{
              position: "fixed",
              top: `${accountsAnchor.top}px`,
              left: `${accountsAnchor.left}px`,
              zIndex: 10006,
              width: "28.125rem",
              maxHeight: "26.5rem",
              backgroundColor: "var(--backgroundPrimaryElevated, #ffffff)",
              borderRadius: "8px",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.25)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="filter-items-search">
                <YnabIcon name="search" size={16} />
                <input
                  type="text"
                  className="ember-text-field ember-view filter-items-search-input"
                  placeholder="Search All Accounts"
                  value={accountSearch}
                  onChange={(e) => setAccountSearch(e.target.value)}
                  spellCheck={false}
                  autoComplete="off"
                />
                {accountSearch && (
                  <button
                    type="button"
                    className="filter-items-search-cancel-icon ghost-button is-icon-only"
                    onClick={() => setAccountSearch("")}
                  >
                    <YnabIcon name="cross" size={12} />
                  </button>
                )}
              </div>
            </div>

            <div
              className="modal-overflow-area"
              style={{ flex: 1, overflowY: "auto", maxHeight: "18rem" }}
            >
              <ul className="modal-list">
                {/* Cash Accounts */}
                {cashAccounts.length > 0 && (
                  <>
                    <li
                      className="user-data is-section-item"
                      onClick={() =>
                        toggleAccountGroup(cashAccounts.map((a) => a.id))
                      }
                    >
                      <button
                        className="ynab-checkbox ynab-checkbox-button"
                        role="checkbox"
                        type="button"
                      >
                        {(() => {
                          const ids = cashAccounts.map((a) => a.id);
                          const selCount = ids.filter((id) =>
                            selectedAccountIds === null
                              ? true
                              : selectedAccountIds.has(id),
                          ).length;
                          const isAll = selCount === ids.length;
                          const isPart = selCount > 0 && selCount < ids.length;
                          return (
                            <svg
                              className={`ynab-new-icon ynab-checkbox-button-square ${
                                isAll ? "is-checked" : isPart ? "is-partial" : ""
                              }`}
                              width="13"
                              height="13"
                            >
                              {isAll && <use href="#icon_sprite_check"></use>}
                              {isPart && (
                                <rect
                                  x="2"
                                  y="5.5"
                                  width="9"
                                  height="2"
                                  fill="currentColor"
                                  rx="1"
                                />
                              )}
                            </svg>
                          );
                        })()}
                      </button>
                      <span className="main-category">Cash Accounts</span>
                    </li>
                    {cashAccounts.map((acc) => {
                      const isChecked =
                        selectedAccountIds === null ||
                        selectedAccountIds.has(acc.id);
                      return (
                        <li
                          key={acc.id}
                          className="user-data not-section-item"
                          onClick={() => toggleAccount(acc.id)}
                        >
                          <button
                            className={`ynab-checkbox ynab-checkbox-button ${
                              isChecked ? "is-checked" : ""
                            }`}
                            role="checkbox"
                            type="button"
                          >
                            <svg
                              className={`ynab-new-icon ynab-checkbox-button-square ${
                                isChecked ? "is-checked" : ""
                              }`}
                              width="13"
                              height="13"
                            >
                              {isChecked && <use href="#icon_sprite_check"></use>}
                            </svg>
                          </button>
                          <span>{acc.name}</span>
                          <span
                            className="currency tabular-nums"
                            style={{
                              marginLeft: "auto",
                              fontSize: "0.85rem",
                              color: "var(--labelSecondary)",
                            }}
                          >
                            {formatMilliunits(acc.balance_milliunits, currencyOptions)}
                          </span>
                        </li>
                      );
                    })}
                  </>
                )}

                {/* Credit Accounts */}
                {creditAccounts.length > 0 && (
                  <>
                    <li
                      className="user-data is-section-item"
                      onClick={() =>
                        toggleAccountGroup(creditAccounts.map((a) => a.id))
                      }
                    >
                      <button
                        className="ynab-checkbox ynab-checkbox-button"
                        role="checkbox"
                        type="button"
                      >
                        {(() => {
                          const ids = creditAccounts.map((a) => a.id);
                          const selCount = ids.filter((id) =>
                            selectedAccountIds === null
                              ? true
                              : selectedAccountIds.has(id),
                          ).length;
                          const isAll = selCount === ids.length;
                          const isPart = selCount > 0 && selCount < ids.length;
                          return (
                            <svg
                              className={`ynab-new-icon ynab-checkbox-button-square ${
                                isAll ? "is-checked" : isPart ? "is-partial" : ""
                              }`}
                              width="13"
                              height="13"
                            >
                              {isAll && <use href="#icon_sprite_check"></use>}
                              {isPart && (
                                <rect
                                  x="2"
                                  y="5.5"
                                  width="9"
                                  height="2"
                                  fill="currentColor"
                                  rx="1"
                                />
                              )}
                            </svg>
                          );
                        })()}
                      </button>
                      <span className="main-category">Credit Accounts</span>
                    </li>
                    {creditAccounts.map((acc) => {
                      const isChecked =
                        selectedAccountIds === null ||
                        selectedAccountIds.has(acc.id);
                      return (
                        <li
                          key={acc.id}
                          className="user-data not-section-item"
                          onClick={() => toggleAccount(acc.id)}
                        >
                          <button
                            className={`ynab-checkbox ynab-checkbox-button ${
                              isChecked ? "is-checked" : ""
                            }`}
                            role="checkbox"
                            type="button"
                          >
                            <svg
                              className={`ynab-new-icon ynab-checkbox-button-square ${
                                isChecked ? "is-checked" : ""
                              }`}
                              width="13"
                              height="13"
                            >
                              {isChecked && <use href="#icon_sprite_check"></use>}
                            </svg>
                          </button>
                          <span>{acc.name}</span>
                          <span
                            className="currency tabular-nums"
                            style={{
                              marginLeft: "auto",
                              fontSize: "0.85rem",
                              color: "var(--labelSecondary)",
                            }}
                          >
                            {formatMilliunits(acc.balance_milliunits, currencyOptions)}
                          </span>
                        </li>
                      );
                    })}
                  </>
                )}

                {/* Tracking Accounts */}
                {trackingAccounts.length > 0 && (
                  <>
                    <li
                      className="user-data is-section-item"
                      onClick={() =>
                        toggleAccountGroup(trackingAccounts.map((a) => a.id))
                      }
                    >
                      <button
                        className="ynab-checkbox ynab-checkbox-button"
                        role="checkbox"
                        type="button"
                      >
                        {(() => {
                          const ids = trackingAccounts.map((a) => a.id);
                          const selCount = ids.filter((id) =>
                            selectedAccountIds === null
                              ? true
                              : selectedAccountIds.has(id),
                          ).length;
                          const isAll = selCount === ids.length;
                          const isPart = selCount > 0 && selCount < ids.length;
                          return (
                            <svg
                              className={`ynab-new-icon ynab-checkbox-button-square ${
                                isAll ? "is-checked" : isPart ? "is-partial" : ""
                              }`}
                              width="13"
                              height="13"
                            >
                              {isAll && <use href="#icon_sprite_check"></use>}
                              {isPart && (
                                <rect
                                  x="2"
                                  y="5.5"
                                  width="9"
                                  height="2"
                                  fill="currentColor"
                                  rx="1"
                                />
                              )}
                            </svg>
                          );
                        })()}
                      </button>
                      <span className="main-category">Tracking Accounts</span>
                    </li>
                    {trackingAccounts.map((acc) => {
                      const isChecked =
                        selectedAccountIds === null ||
                        selectedAccountIds.has(acc.id);
                      return (
                        <li
                          key={acc.id}
                          className="user-data not-section-item"
                          onClick={() => toggleAccount(acc.id)}
                        >
                          <button
                            className={`ynab-checkbox ynab-checkbox-button ${
                              isChecked ? "is-checked" : ""
                            }`}
                            role="checkbox"
                            type="button"
                          >
                            <svg
                              className={`ynab-new-icon ynab-checkbox-button-square ${
                                isChecked ? "is-checked" : ""
                              }`}
                              width="13"
                              height="13"
                            >
                              {isChecked && <use href="#icon_sprite_check"></use>}
                            </svg>
                          </button>
                          <span>{acc.name}</span>
                          <span
                            className="currency tabular-nums"
                            style={{
                              marginLeft: "auto",
                              fontSize: "0.85rem",
                              color: "var(--labelSecondary)",
                            }}
                          >
                            {formatMilliunits(acc.balance_milliunits, currencyOptions)}
                          </span>
                        </li>
                      );
                    })}
                  </>
                )}
              </ul>
            </div>

            <div className="modal-actions">
              <div className="actions">
                <div className="modal-action-group">
                  <button
                    type="button"
                    className="ghost-button secondary type-body select-items-button"
                    onClick={handleSelectAllAccounts}
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    className="ghost-button secondary type-body select-items-button"
                    onClick={handleSelectNoneAccounts}
                  >
                    Select None
                  </button>
                </div>
                <div className="modal-action-group">
                  <button
                    type="button"
                    className="ynab-button secondary button-cancel"
                    onClick={() => setAccountsOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="ynab-button primary"
                    onClick={() => setAccountsOpen(false)}
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>

            <svg
              className="modal-arrow"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              style={{
                left: "105px",
                bottom: "100%",
                height: "0.9375rem",
                width: "1.875rem",
              }}
            >
              <path
                d="M 0 100 L 50 0 L 100 100 L 0 100 Z"
                fill="var(--backgroundPrimaryElevated, #ffffff)"
              ></path>
            </svg>
          </div>
        </div>
      )}

      {/* 3. Timeframe Popover (Exact match to popover_filter_timeframe.html) */}
      {timeframeOpen && timeframeAnchor && (
        <div
          id="ember21"
          className="modal-overlay active modal-fresh reflect-timeframe-dropdown"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10005,
            backgroundColor: "transparent",
            backdropFilter: "none",
            WebkitBackdropFilter: "none",
          }}
          onClick={() => setTimeframeOpen(false)}
        >
          <div
            className="modal modal-timeframe"
            role="dialog"
            aria-modal="true"
            style={{
              position: "fixed",
              top: `${timeframeAnchor.top}px`,
              left: `${timeframeAnchor.left}px`,
              zIndex: 10006,
              height: "auto",
              width: "16rem",
              maxWidth: "15rem",
              backgroundColor: "var(--backgroundPrimaryElevated, #ffffff)",
              borderRadius: "8px",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.25)",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="modal-fresh-body js-ynab-modal-scrollable-area"
              style={{ overflow: "visible", padding: "0.5rem 0.25rem" }}
            >
              <div
                role="menu"
                className="timeframe-preset-options"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  width: "100%",
                  padding: 0,
                  margin: 0,
                }}
              >
                <button
                  className={`timeframe-option thismonth ${
                    timeframePreset === "thismonth" ? "active" : ""
                  }`}
                  title="This Month"
                  type="button"
                  onClick={() => handleSelectPreset("thismonth")}
                >
                  This Month
                  {timeframePreset === "thismonth" && (
                    <YnabIcon name="check" size={16} className="selected-preset-icon" />
                  )}
                </button>
                <button
                  className={`timeframe-option latest3months ${
                    timeframePreset === "latest3months" ? "active" : ""
                  }`}
                  title="Last 3 Months"
                  type="button"
                  onClick={() => handleSelectPreset("latest3months")}
                >
                  Last 3 Months
                  {timeframePreset === "latest3months" && (
                    <YnabIcon name="check" size={16} className="selected-preset-icon" />
                  )}
                </button>
                <button
                  className={`timeframe-option latest6months ${
                    timeframePreset === "latest6months" ? "active" : ""
                  }`}
                  title="Last 6 Months"
                  type="button"
                  onClick={() => handleSelectPreset("latest6months")}
                >
                  Last 6 Months
                  {timeframePreset === "latest6months" && (
                    <YnabIcon name="check" size={16} className="selected-preset-icon" />
                  )}
                </button>
                <button
                  className={`timeframe-option latest12months ${
                    timeframePreset === "latest12months" ? "active" : ""
                  }`}
                  title="Last 12 Months"
                  type="button"
                  onClick={() => handleSelectPreset("latest12months")}
                >
                  Last 12 Months
                  {timeframePreset === "latest12months" && (
                    <YnabIcon name="check" size={16} className="selected-preset-icon" />
                  )}
                </button>
                <button
                  className={`timeframe-option thisyear ${
                    timeframePreset === "thisyear" ? "active" : ""
                  }`}
                  title="Year To Date"
                  type="button"
                  onClick={() => handleSelectPreset("thisyear")}
                >
                  Year To Date
                  {timeframePreset === "thisyear" && (
                    <YnabIcon name="check" size={16} className="selected-preset-icon" />
                  )}
                </button>
                <button
                  className={`timeframe-option lastyear ${
                    timeframePreset === "lastyear" ? "active" : ""
                  }`}
                  title="Last Year"
                  type="button"
                  onClick={() => handleSelectPreset("lastyear")}
                >
                  Last Year
                  {timeframePreset === "lastyear" && (
                    <YnabIcon name="check" size={16} className="selected-preset-icon" />
                  )}
                </button>
                <button
                  className={`timeframe-option alldates ${
                    timeframePreset === "alldates" ? "active" : ""
                  }`}
                  title="All Dates"
                  type="button"
                  onClick={() => handleSelectPreset("alldates")}
                >
                  All Dates
                  {timeframePreset === "alldates" && (
                    <YnabIcon name="check" size={16} className="selected-preset-icon" />
                  )}
                </button>
                <div className="separator" role="separator"></div>
                <button
                  className={`timeframe-option timeframe-option--custom ${
                    timeframePreset === "custom" ? "active" : ""
                  }`}
                  title="Custom"
                  type="button"
                  onClick={() => setTimeframePreset("custom")}
                >
                  <div>Custom</div>
                  {timeframePreset === "custom" && (
                    <YnabIcon name="check" size={16} className="selected-preset-icon" />
                  )}
                </button>
              </div>

              {/* If custom is selected, show 12-month picker with year navigation */}
              {timeframePreset === "custom" && (
                <div
                  style={{
                    padding: "0.75rem 1rem 1rem 1rem",
                    borderTop: "1px solid var(--separatorStandard)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <button
                      type="button"
                      className="ghost-button is-icon-only"
                      onClick={() => setDisplayYear((y) => y - 1)}
                    >
                      <YnabIcon name="chevron_left" size={12} />
                    </button>
                    <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>
                      {displayYear}
                    </span>
                    <button
                      type="button"
                      className="ghost-button is-icon-only"
                      onClick={() => setDisplayYear((y) => y + 1)}
                    >
                      <YnabIcon name="chevron_right" size={12} />
                    </button>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: "0.375rem",
                    }}
                  >
                    {MONTH_NAMES.map((mName, mIdx) => {
                      const curMonthStr = `${displayYear}-${String(
                        mIdx + 1,
                      ).padStart(2, "0")}-01`;
                      const isSel = activeMonth.startsWith(
                        curMonthStr.slice(0, 7),
                      );
                      return (
                        <button
                          key={mName}
                          type="button"
                          className={`ghost-button type-body ${
                            isSel ? "primary" : "secondary"
                          }`}
                          style={{
                            padding: "0.375rem 0.25rem",
                            fontSize: "0.8rem",
                            fontWeight: isSel ? 700 : 500,
                            backgroundColor: isSel
                              ? "var(--brandSPBlurple500, #545bfe)"
                              : "transparent",
                            color: isSel ? "#ffffff" : "var(--labelPrimary)",
                            borderRadius: "4px",
                          }}
                          onClick={() => handleSelectMonth(displayYear, mIdx)}
                        >
                          {mName}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <svg
              className="modal-arrow"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              style={{
                left: "105px",
                bottom: "100%",
                height: "0.9375rem",
                width: "1.875rem",
              }}
            >
              <path
                d="M 0 100 L 50 0 L 100 100 L 0 100 Z"
                fill="var(--backgroundPrimaryElevated, #ffffff)"
              ></path>
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
