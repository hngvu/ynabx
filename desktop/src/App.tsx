import React, { useState } from "react";
import { YnabIcon } from "./components/YnabIcon.tsx";
import { Sidebar, AccountItem } from "./components/Sidebar.tsx";
import { BudgetTable, MasterCategoryData } from "./components/BudgetTable.tsx";
import { BudgetInspector } from "./components/BudgetInspector.tsx";

const INITIAL_GROUPS: MasterCategoryData[] = [
  {
    id: "mg_cc_payment",
    name: "Credit Card Payments",
    isCreditCardPayment: true,
    subcategories: [
      { id: "sub_cc_visa", name: "Rewards Visa Payment", assigned: 450000, activity: 0, available: 450000, isCreditCardPayment: true },
    ],
  },
  {
    id: "mg_immediate",
    name: "Immediate Obligations",
    subcategories: [
      { id: "sub_rent", name: "Rent / Mortgage", assigned: 1200000, activity: -1200000, available: 0 },
      { id: "sub_electric", name: "Electric", assigned: 150000, activity: -120000, available: 30000 },
      { id: "sub_water", name: "Water", assigned: 45000, activity: -40000, available: 5000 },
      { id: "sub_internet", name: "Internet", assigned: 65000, activity: 0, available: 65000 },
      { id: "sub_groceries", name: "Groceries", assigned: 400000, activity: -250000, available: 150000 },
    ],
  },
  {
    id: "mg_true_expenses",
    name: "True Expenses",
    subcategories: [
      { id: "sub_auto_maint", name: "Auto Maintenance", assigned: 100000, activity: 0, available: 100000 },
      { id: "sub_home_maint", name: "Home Maintenance", assigned: 75000, activity: 0, available: 75000 },
      { id: "sub_medical", name: "Medical", assigned: 50000, activity: -15000, available: 35000 },
      { id: "sub_clothing", name: "Clothing", assigned: 50000, activity: 0, available: 50000 },
    ],
  },
  {
    id: "mg_quality_of_life",
    name: "Quality of Life Goals",
    subcategories: [
      { id: "sub_vacation", name: "Vacation", assigned: 200000, activity: 0, available: 200000 },
      { id: "sub_dining", name: "Dining Out", assigned: 150000, activity: -85000, available: 65000 },
      { id: "sub_gaming", name: "Gaming / Entertainment", assigned: 50000, activity: -30000, available: 20000 },
    ],
  },
];

const INITIAL_ACCOUNTS: AccountItem[] = [
  { id: "acc_checking", name: "Main Checking", type: "checking", balance: 3500000 },
  { id: "acc_savings", name: "Emergency Savings", type: "savings", balance: 10000000 },
  { id: "acc_credit_visa", name: "Rewards Visa", type: "credit", balance: -450000 },
];

export const App: React.FC = () => {
  const [budgetName, setBudgetName] = useState("My Plan");
  const [activeRoute, setActiveRoute] = useState("budget");
  const [categories, setCategories] = useState<MasterCategoryData[]>(INITIAL_GROUPS);
  const [accounts, setAccounts] = useState<AccountItem[]>(INITIAL_ACCOUNTS);
  const [currentMonth] = useState("Nov 2026");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const formatCurrency = (milliunits: number) => {
    const dollars = milliunits / 1000;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(dollars);
  };

  const totalAssigned = categories.reduce(
    (sum, g) => sum + g.subcategories.reduce((s, c) => s + c.assigned, 0),
    0
  );
  const totalActivity = categories.reduce(
    (sum, g) => sum + g.subcategories.reduce((s, c) => s + c.activity, 0),
    0
  );
  const totalCash = accounts
    .filter((a) => a.type === "checking" || a.type === "savings" || a.type === "cash")
    .reduce((sum, a) => sum + a.balance, 0);

  // Ready To Assign
  const readyToAssign = Math.max(0, totalCash - totalAssigned);

  // Find selected category for inspector
  let selectedCategory: { id: string; name: string; assigned: number; activity: number; available: number } | undefined;
  for (const group of categories) {
    const found = group.subcategories.find((c) => c.id === selectedCategoryId);
    if (found) {
      selectedCategory = found;
      break;
    }
  }

  const handleAssignedChange = (subcatId: string, newAssigned: number) => {
    setCategories((prev) =>
      prev.map((group) => ({
        ...group,
        subcategories: group.subcategories.map((sub) => {
          if (sub.id === subcatId) {
            const diff = newAssigned - sub.assigned;
            return {
              ...sub,
              assigned: newAssigned,
              available: sub.available + diff,
            };
          }
          return sub;
        }),
      }))
    );
  };

  const handleAddMasterCategory = () => {
    const name = prompt("Enter category group name (e.g., Just for Fun):");
    if (name) {
      setCategories((prev) => [
        ...prev,
        { id: `mg_${Date.now()}`, name, subcategories: [] },
      ]);
    }
  };

  const handleAddSubCategory = (masterCategoryId: string) => {
    const name = prompt("Enter subcategory name (e.g., Coffee, Pet Care):");
    if (name) {
      setCategories((prev) =>
        prev.map((group) => {
          if (group.id === masterCategoryId) {
            return {
              ...group,
              subcategories: [
                ...group.subcategories,
                { id: `sub_${Date.now()}`, name, assigned: 0, activity: 0, available: 0 },
              ],
            };
          }
          return group;
        })
      );
    }
  };

  return (
    <div className="layout" style={{ height: "100vh", width: "100vw", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div className="content-layout user-logged-in" style={{ flex: 1, display: "flex", height: "100%", width: "100%", overflow: "hidden" }}>
        {/* Full-featured Ember-aligned Sidebar */}
        <Sidebar
          currentMonth={currentMonth}
          budgetName={budgetName}
          email="USD ($)"
          accounts={accounts}
          activeRoute={activeRoute}
          onNavigate={(route) => setActiveRoute(route)}
          onAddAccount={(newAcc) => {
            setAccounts((prev) => [
              ...prev,
              {
                id: `acc_${Date.now()}`,
                name: newAcc.name,
                type: newAcc.type,
                balance: newAcc.balance,
              },
            ]);
          }}
          onUpdateAccount={(accountId, newName, newBalance) => {
            setAccounts((prev) =>
              prev.map((a) => (a.id === accountId ? { ...a, name: newName, balance: newBalance } : a))
            );
          }}
          onDeleteAccount={(accountId) => {
            setAccounts((prev) => prev.filter((a) => a.id !== accountId));
          }}
          onUpdateBudgetName={(name) => {
            setBudgetName(name);
          }}
        />

        {/* Main Content Area */}
        <main
          className="ynab-u content"
          id="start-of-content"
          style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", minWidth: 0 }}
        >
          <div className="content-min-break has-budget-views" style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%", overflow: "hidden" }}>
            {/* Header with Month Navigation & Ready to Assign */}
            <header className="budget-header left-to-budget-is-positive" style={{ flexShrink: 0, padding: "0.5rem 1.5rem" }}>
              <div className="budget-header-flexbox" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                {/* Month Picker Controls */}
                <div className="budget-header-item budget-header-calendar">
                  <button className="budget-header-calendar-prev" type="button" aria-label="previous month">
                    <YnabIcon name="chevron_left_circle" width={28} height={28} />
                  </button>
                  <div className="budget-header-calendar-date">
                    <button className="budget-header-calendar-date-button" type="button">
                      {currentMonth}
                      <YnabIcon name="caret_down" width={12} height={12} />
                    </button>
                  </div>
                  <button className="budget-header-calendar-next" type="button" aria-label="next month">
                    <YnabIcon name="chevron_right_circle" width={28} height={28} />
                  </button>
                </div>

                {/* Ready to Assign Box - Authentic Ember DOM */}
                <div className="budget-header-item budget-header-totals">
                  <div className="to-be-budgeted is-positive">
                    <div className="to-be-budgeted-heading-wrapper">
                      <h1>
                        <div className="to-be-budgeted-amount">
                          <span className="currency">{formatCurrency(readyToAssign)}</span>
                        </div>
                        <div className="to-be-budgeted-label">Ready to Assign</div>
                      </h1>
                    </div>
                    <button className="to-be-budgeted-button" type="button">
                      <span className="label">Assign</span>
                      <YnabIcon name="caret_down" width={10} height={10} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Filter Pills */}
              <div
                className="budget-header-views"
                style={{
                  padding: "0.5rem 0",
                  display: "flex",
                  gap: "1.25rem",
                  fontSize: "0.85rem",
                  borderBottom: "1px solid var(--separatorStandard)",
                }}
              >
                <span style={{ cursor: "pointer", fontWeight: 600, color: "var(--labelPrimary)" }}>All</span>
                <span style={{ cursor: "pointer", color: "var(--labelSecondary)" }}>Underfunded</span>
                <span style={{ cursor: "pointer", color: "var(--labelSecondary)" }}>Overfunded</span>
                <span style={{ cursor: "pointer", color: "var(--labelSecondary)" }}>Money Available</span>
              </div>
            </header>

            {/* Split View: Budget Table (Left) + Budget Inspector (Right) */}
            <div className="budget-table-and-inspector js-budget-table-and-inspector" style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
              <BudgetTable
                masterCategories={categories}
                selectedCategoryId={selectedCategoryId}
                onSelectCategory={(id) => setSelectedCategoryId(id === selectedCategoryId ? null : id)}
                onAssignedChange={handleAssignedChange}
                onAddMasterCategory={handleAddMasterCategory}
                onAddSubCategory={handleAddSubCategory}
              />

              <BudgetInspector
                selectedSubcategoryName={selectedCategory?.name}
                selectedSubcategoryAssigned={selectedCategory?.assigned}
                selectedSubcategoryActivity={selectedCategory?.activity}
                selectedSubcategoryAvailable={selectedCategory?.available}
                currentMonth={currentMonth}
                totalAssigned={totalAssigned}
                totalActivity={totalActivity}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
