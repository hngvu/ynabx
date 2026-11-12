import React, { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { YnabIcon } from "./components/YnabIcon.tsx";
import { Sidebar, AccountItem } from "./components/Sidebar.tsx";
import { BudgetTable, MasterCategoryData } from "./components/BudgetTable.tsx";
import { BudgetInspector } from "./components/BudgetInspector.tsx";
import { PlanMonthSummary, Account as ApiAccount, PlanSummary } from "./api/types.ts";

export const App: React.FC = () => {
  const [budgetName, setBudgetName] = useState("My Plan");
  const [activeRoute, setActiveRoute] = useState("budget");
  const [categories, setCategories] = useState<MasterCategoryData[]>([]);
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [currentMonthIso] = useState("2026-11-01");
  const [currentMonthDisplay] = useState("Nov 2026");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [readyToAssign, setReadyToAssign] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const formatCurrency = (milliunits: number) => {
    const dollars = milliunits / 1000;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(dollars);
  };

  const loadData = useCallback(async () => {
    try {
      // 1. Fetch Plan Summary
      const plan = await invoke<PlanSummary>("get_plan_summary", {});
      if (plan && plan.name) {
        setBudgetName(plan.name);
      }

      // 2. Fetch Accounts
      const rawAccounts = await invoke<ApiAccount[]>("get_accounts", {});
      if (rawAccounts) {
        setAccounts(
          rawAccounts.map((a) => ({
            id: a.id,
            name: a.name,
            type: a.type === "creditCard" ? "credit" : (a.type.toLowerCase() as any),
            balance: a.balance_milliunits,
          }))
        );
      }

      // 3. Fetch Budget Month & Calculations
      const budgetMonth = await invoke<PlanMonthSummary>("get_budget_month", {
        targetMonth: currentMonthIso,
      });

      if (budgetMonth) {
        setReadyToAssign(budgetMonth.ready_to_assign_milliunits);
        const mappedGroups: MasterCategoryData[] = budgetMonth.category_groups.map((g) => ({
          id: g.id,
          name: g.name,
          isCreditCardPayment: g.internal_name === "MasterCategory/__DebtPayment__",
          subcategories: g.categories.map((c) => ({
            id: c.id,
            name: c.name,
            assigned: c.assigned_milliunits,
            activity: c.activity_milliunits,
            available: c.available_milliunits,
            isCreditCardPayment: c.is_credit_card_payment,
          })),
        }));
        setCategories(mappedGroups);
      }
    } catch (err) {
      console.error("[YNAB Desktop] Error invoking Tauri commands:", err);
    } finally {
      setLoading(false);
    }
  }, [currentMonthIso]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalAssigned = categories.reduce(
    (sum, g) => sum + g.subcategories.reduce((s, c) => s + c.assigned, 0),
    0
  );
  const totalActivity = categories.reduce(
    (sum, g) => sum + g.subcategories.reduce((s, c) => s + c.activity, 0),
    0
  );

  // Find selected category for inspector
  let selectedCategory: { id: string; name: string; assigned: number; activity: number; available: number } | undefined;
  for (const group of categories) {
    const found = group.subcategories.find((c) => c.id === selectedCategoryId);
    if (found) {
      selectedCategory = found;
      break;
    }
  }

  const handleAssignedChange = async (subcatId: string, newAssigned: number) => {
    // Optimistic UI update
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

    // Call Rust backend calculation engine
    try {
      const updatedMonth = await invoke<PlanMonthSummary>("set_category_assigned", {
        payload: {
          category_id: subcatId,
          month: currentMonthIso,
          assigned_milliunits: newAssigned,
        },
      });

      if (updatedMonth) {
        setReadyToAssign(updatedMonth.ready_to_assign_milliunits);
        const mappedGroups: MasterCategoryData[] = updatedMonth.category_groups.map((g) => ({
          id: g.id,
          name: g.name,
          isCreditCardPayment: g.internal_name === "MasterCategory/__DebtPayment__",
          subcategories: g.categories.map((c) => ({
            id: c.id,
            name: c.name,
            assigned: c.assigned_milliunits,
            activity: c.activity_milliunits,
            available: c.available_milliunits,
            isCreditCardPayment: c.is_credit_card_payment,
          })),
        }));
        setCategories(mappedGroups);
      }
    } catch (err) {
      console.error("[YNAB Desktop] Error setting category assigned:", err);
      // Reload source of truth on error
      loadData();
    }
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

  const handleReorderMasterCategories = (draggedId: string, targetId: string) => {
    setCategories((prev) => {
      const fromIdx = prev.findIndex((g) => g.id === draggedId);
      const toIdx = prev.findIndex((g) => g.id === targetId);
      if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return prev;
      const copy = [...prev];
      const [item] = copy.splice(fromIdx, 1);
      copy.splice(toIdx, 0, item);
      return copy;
    });
  };

  const handleReorderSubcategories = (masterId: string, draggedSubId: string, targetSubId: string) => {
    setCategories((prev) =>
      prev.map((g) => {
        if (g.id !== masterId) return g;
        const fromIdx = g.subcategories.findIndex((s) => s.id === draggedSubId);
        const toIdx = g.subcategories.findIndex((s) => s.id === targetSubId);
        if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return g;
        const copySubs = [...g.subcategories];
        const [sub] = copySubs.splice(fromIdx, 1);
        copySubs.splice(toIdx, 0, sub);
        return { ...g, subcategories: copySubs };
      })
    );
  };

  const handleMoveSubcategoryAcrossGroups = (sourceMasterId: string, targetMasterId: string, subId: string) => {
    setCategories((prev) => {
      let movedSub: any = null;
      const newGroups = prev.map((g) => {
        if (g.id === sourceMasterId) {
          movedSub = g.subcategories.find((s) => s.id === subId);
          return {
            ...g,
            subcategories: g.subcategories.filter((s) => s.id !== subId),
          };
        }
        return g;
      });

      if (!movedSub) return prev;

      return newGroups.map((g) => {
        if (g.id === targetMasterId) {
          return {
            ...g,
            subcategories: [...g.subcategories, movedSub],
          };
        }
        return g;
      });
    });
  };

  const handleReorderAccounts = (draggedId: string, targetId: string) => {
    setAccounts((prev) => {
      const fromIdx = prev.findIndex((a) => a.id === draggedId);
      const toIdx = prev.findIndex((a) => a.id === targetId);
      if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return prev;
      const copy = [...prev];
      const [item] = copy.splice(fromIdx, 1);
      copy.splice(toIdx, 0, item);
      return copy;
    });
  };

  const handleAddAccount = async (newAcc: { name: string; type: string; balance: number }) => {
    try {
      await invoke("create_account", {
        payload: {
          name: newAcc.name,
          account_type: newAcc.type === "credit" ? "creditCard" : newAcc.type,
          balance_milliunits: newAcc.balance,
          on_budget: true,
          note: null,
        },
      });
      await loadData();
    } catch (err) {
      console.error("[YNAB Desktop] Failed to create account:", err);
    }
  };

  if (loading) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", color: "#64748b" }}>
        Loading YNAB Desktop...
      </div>
    );
  }

  return (
    <div className="layout" style={{ height: "100vh", width: "100vw", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div className="content-layout user-logged-in" style={{ flex: 1, display: "flex", height: "100%", width: "100%", overflow: "hidden" }}>
        {/* Full-featured Ember-aligned Sidebar */}
        <Sidebar
          currentMonth={currentMonthDisplay}
          budgetName={budgetName}
          email="USD ($)"
          accounts={accounts}
          activeRoute={activeRoute}
          onNavigate={(route) => setActiveRoute(route)}
          onAddAccount={handleAddAccount}
          onUpdateAccount={(accId: string, newName: string) => {
            setAccounts((prev) =>
              prev.map((a) => (a.id === accId ? { ...a, name: newName } : a))
            );
          }}
          onUpdateBudgetName={(newName: string) => setBudgetName(newName)}
          onReorderAccounts={handleReorderAccounts}
        />

        {/* Main Budget Workspace */}
        <div className="budget-workspace" style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--color-background-primary, #ffffff)", overflow: "hidden" }}>
          {/* Header Banner matching YNAB */}
          <header className="budget-header" style={{ padding: "16px 24px", borderBottom: "1px solid var(--color-border-primary, #e2e8f0)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--color-background-secondary, #f8fafc)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button className="button button-icon" style={{ border: "none", background: "transparent", cursor: "pointer", padding: 4 }}>
                  <YnabIcon name="chevron-left" width={16} height={16} />
                </button>
                <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "var(--color-text-primary, #0f172a)" }}>
                  {currentMonthDisplay}
                </h1>
                <button className="button button-icon" style={{ border: "none", background: "transparent", cursor: "pointer", padding: 4 }}>
                  <YnabIcon name="chevron-right" width={16} height={16} />
                </button>
              </div>

              {/* Ready to Assign Banner */}
              <div
                style={{
                  padding: "6px 16px",
                  borderRadius: 6,
                  background: readyToAssign > 0 ? "rgba(22, 163, 74, 0.1)" : "rgba(239, 68, 68, 0.1)",
                  border: readyToAssign > 0 ? "1px solid rgba(22, 163, 74, 0.2)" : "1px solid rgba(239, 68, 68, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 500, color: readyToAssign > 0 ? "#15803d" : "#b91c1c" }}>
                  {readyToAssign > 0 ? "Ready to Assign:" : "All Money Assigned"}
                </span>
                <span style={{ fontSize: 16, fontWeight: 700, color: readyToAssign > 0 ? "#15803d" : "#0f172a" }}>
                  {formatCurrency(readyToAssign)}
                </span>
              </div>
            </div>

            {/* Quick Stats */}
            <div style={{ display: "flex", gap: 24, fontSize: 13 }}>
              <div>
                <span style={{ color: "var(--color-text-secondary, #64748b)" }}>Total Assigned: </span>
                <strong style={{ color: "var(--color-text-primary, #0f172a)" }}>{formatCurrency(totalAssigned)}</strong>
              </div>
              <div>
                <span style={{ color: "var(--color-text-secondary, #64748b)" }}>Total Activity: </span>
                <strong style={{ color: "var(--color-text-primary, #0f172a)" }}>{formatCurrency(totalActivity)}</strong>
              </div>
            </div>
          </header>

          {/* Budget Table Body */}
          <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
            <div style={{ flex: 1, overflowY: "auto" }}>
              <BudgetTable
                masterCategories={categories}
                onAssignedChange={handleAssignedChange}
                onSelectCategory={(id) => setSelectedCategoryId(id)}
                selectedCategoryId={selectedCategoryId}
                onAddMasterCategory={handleAddMasterCategory}
                onAddSubCategory={handleAddSubCategory}
                onReorderMasterCategories={handleReorderMasterCategories}
                onReorderSubcategories={handleReorderSubcategories}
                onMoveSubcategoryAcrossGroups={handleMoveSubcategoryAcrossGroups}
              />
            </div>

            {/* Right Inspector Panel */}
            {selectedCategory && (
              <BudgetInspector
                selectedSubcategoryName={selectedCategory.name}
                selectedSubcategoryAssigned={selectedCategory.assigned}
                selectedSubcategoryActivity={selectedCategory.activity}
                selectedSubcategoryAvailable={selectedCategory.available}
                readyToAssign={readyToAssign}
                currentMonth={currentMonthDisplay}
                totalAssigned={totalAssigned}
                totalActivity={totalActivity}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default App;
