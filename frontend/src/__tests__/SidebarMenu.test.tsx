import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { Sidebar } from "../components/Sidebar";
import { ManagePayeesModal } from "../components/modals/ManagePayeesModal";
import { EditFlagsModal } from "../components/modals/EditFlagsModal";
import { KeyboardShortcutsModal } from "../components/modals/KeyboardShortcutsModal";
import { FreshStartModal } from "../components/modals/FreshStartModal";
import { AccountSettingsModal } from "../components/modals/AccountSettingsModal";
import { BankConnectionsModal } from "../components/modals/BankConnectionsModal";
import { DisplayOptionsModal } from "../components/modals/DisplayOptionsModal";
import type { PlanSummary, Account } from "../api/types";

const mockPlans: PlanSummary[] = [
  {
    id: "plan-1",
    name: "hng's Plan",
    currency_code: "USD",
    number_format: "#,##0.00",
    currency_symbol_first: true,
    currency_display_symbol: true,
    date_format: "YYYY-MM-DD",
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-01T00:00:00Z",
  },
  {
    id: "plan-2",
    name: "Vacation Budget",
    currency_code: "EUR",
    number_format: "#,##0.00",
    currency_symbol_first: true,
    currency_display_symbol: true,
    date_format: "YYYY-MM-DD",
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-01T00:00:00Z",
  },
];

const mockAccounts: Account[] = [
  {
    id: "acc-1",
    plan_id: "plan-1",
    name: "Checking",
    type: "CHECKING",
    on_budget: true,
    closed: false,
    balance_milliunits: 2500000,
    cleared_balance_milliunits: 2500000,
    uncleared_balance_milliunits: 0,
    sort_order: 1,
  },
];

describe("Sidebar Navigation and Settings Menu", () => {
  it("renders header button with plan name, email, logo, and caret down", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <Sidebar
          plans={mockPlans}
          activePlan={mockPlans[0]!}
          accounts={mockAccounts}
          activeView={{ type: "budget" }}
          currentMonth="2026-10-01"
          onSelectView={vi.fn()}
          onSelectPlan={vi.fn()}
          onCreatePlan={vi.fn()}
          onOpenAddAccount={vi.fn()}
          theme="theme-light"
          onToggleTheme={vi.fn()}
          onLogout={vi.fn()}
          userEmail="vuhse182692@fpt.edu.vn"
        />
      </MemoryRouter>
    );

    expect(html).toContain("hng&#x27;s Plan");
    expect(html).toContain("vuhse182692@fpt.edu.vn");
    expect(html).toContain("icon_sprite_ynab_logo");
    expect(html).toContain("icon_sprite_caret_down");
    expect(html).toContain("sidebar-nav-menu-budget");
  });

  it("renders ManagePayeesModal when open", () => {
    const html = renderToStaticMarkup(
      <ManagePayeesModal
        isOpen={true}
        planId="plan-1"
        onClose={vi.fn()}
      />
    );
    expect(html).toContain("Manage Payees");
    expect(html).toContain("Add new payee...");
    expect(html).toContain("Search payees...");
  });

  it("renders EditFlagsModal with all 6 color options", () => {
    const html = renderToStaticMarkup(
      <EditFlagsModal
        isOpen={true}
        planId="plan-1"
        onClose={vi.fn()}
      />
    );
    expect(html).toContain("Edit Flag Names");
    expect(html).toContain("placeholder=\"Red\"");
    expect(html).toContain("placeholder=\"Orange\"");
    expect(html).toContain("placeholder=\"Yellow\"");
    expect(html).toContain("placeholder=\"Green\"");
    expect(html).toContain("placeholder=\"Blue\"");
    expect(html).toContain("placeholder=\"Purple\"");
  });

  it("renders KeyboardShortcutsModal with shortcuts list", () => {
    const html = renderToStaticMarkup(
      <KeyboardShortcutsModal
        isOpen={true}
        onClose={vi.fn()}
      />
    );
    expect(html).toContain("Keyboard Shortcuts");
    expect(html).toContain("Toggle cleared status");
    expect(html).toContain("Approve selected transactions");
    expect(html).toContain("Reconcile account");
    expect(html).toContain("Move money between categories");
  });

  it("renders FreshStartModal with explanation and plan name", () => {
    const html = renderToStaticMarkup(
      <FreshStartModal
        isOpen={true}
        planName="hng's Plan"
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(html).toContain("Make a Fresh Start");
    expect(html).toContain("hng&#x27;s Plan (Fresh Start)");
    expect(html).toContain("Continue with Fresh Start");
  });

  it("renders AccountSettingsModal with user details", () => {
    const html = renderToStaticMarkup(
      <AccountSettingsModal
        isOpen={true}
        userEmail="vuhse182692@fpt.edu.vn"
        activePlan={mockPlans[0]!}
        totalPlansCount={2}
        onLogout={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(html).toContain("Account Settings");
    expect(html).toContain("vuhse182692@fpt.edu.vn");
    expect(html).toContain("hng&#x27;s Plan");
    expect(html).toContain("Total Plans");
    expect(html).toContain("Log Out");
  });

  it("renders BankConnectionsModal with unlinked manual mode status", () => {
    const html = renderToStaticMarkup(
      <BankConnectionsModal
        isOpen={true}
        accounts={mockAccounts}
        onClose={vi.fn()}
      />
    );
    expect(html).toContain("Manage Bank Connections");
    expect(html).toContain("Direct Import: Manual Entry Mode");
    expect(html).toContain("Checking");
    expect(html).toContain("Unlinked");
  });

  it("renders DisplayOptionsModal with Light and Dark options and Hide Amounts", () => {
    const html = renderToStaticMarkup(
      <DisplayOptionsModal
        isOpen={true}
        theme="theme-light"
        onToggleTheme={vi.fn()}
        hideAmounts={false}
        onToggleHideAmounts={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(html).toContain("Display Options");
    expect(html).toContain("Light");
    expect(html).toContain("Dark");
    expect(html).toContain("Hide Monetary Amounts");
  });
});
