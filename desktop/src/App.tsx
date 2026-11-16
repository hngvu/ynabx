import React, { useState, useEffect } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom';
import './ynab_original_bundled.css';
import { TopLayout } from './components/layout/TopLayout';
import { TopSidebar } from './components/sidebar/TopSidebar';
import { AccountItem } from './components/sidebar/NavAccountRow';
import { PlanMenuPopover } from './components/sidebar/PlanMenuPopover';
import {
  EditFlagsModal,
  PlanSettingsModal,
  ExportPlanModal,
  FreshStartModal,
  EditAccountModal,
  CloseAccountModal,
  DisplayOptionsModal,
  ManagePayeesModal,
  KeyboardShortcutsModal,
  AddAccountModal,
  applyTheme,
} from './components/modals';
import { BudgetWorkspace } from './components/budget';
import { MasterCategoryGroup } from './components/budget/budgetData';
import { AccountsWorkspace } from './components/accounts';
import { isCreditCardAccount } from './components/accounts/AccountsHeader';
import { ReflectWorkspace } from './components/reflect/ReflectWorkspace';
import { ReflectStoryViewer } from './components/reflect/ReflectStoryViewer';
import {
  KeyboardShortcut,
  keyboardShortcutsService,
  KBShortcutResult,
} from './services/keyboardShortcuts';
import {
  getPlanSummary,
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  closeAccount,
  reorderAccounts,
  saveTransaction,
  getPayees,
  getCategoryGroups,
  updatePlanSettings,
  makeFreshStart,
  DEFAULT_BUDGET_ID,
} from './api/tauriBridge';

interface MainAppShellProps {
  budgetName: string;
  setBudgetName: (name: string) => void;
  email: string;
  cashAccounts: AccountItem[];
  setCashAccounts: React.Dispatch<React.SetStateAction<AccountItem[]>>;
  creditAccounts: AccountItem[];
  setCreditAccounts: React.Dispatch<React.SetStateAction<AccountItem[]>>;
  trackingAccounts: AccountItem[];
  setTrackingAccounts: React.Dispatch<React.SetStateAction<AccountItem[]>>;
  closedAccounts: AccountItem[];
  setClosedAccounts: React.Dispatch<React.SetStateAction<AccountItem[]>>;
  categoryGroups: MasterCategoryGroup[];
  setCategoryGroups: React.Dispatch<React.SetStateAction<MasterCategoryGroup[]>>;
  refreshAccounts: () => Promise<void>;
}

function MainAppShell({
  budgetName,
  setBudgetName,
  email,
  cashAccounts,
  setCashAccounts,
  creditAccounts,
  setCreditAccounts,
  trackingAccounts,
  setTrackingAccounts,
  closedAccounts,
  setClosedAccounts,
  categoryGroups,
  setCategoryGroups,
  refreshAccounts,
}: MainAppShellProps) {
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active route & selected account ID from URL
  const pathname = location.pathname;
  let activeRoute: 'budget' | 'reflect' | 'accounts' = 'budget';
  let selectedAccountId: string | null = null;

  if (pathname.startsWith('/reflect') || pathname.startsWith('/reports')) {
    activeRoute = 'reflect';
  } else if (pathname.startsWith('/accounts')) {
    activeRoute = 'accounts';
    const sub = pathname.replace(/^\/accounts\/?/, '');
    if (sub) {
      selectedAccountId = decodeURIComponent(sub);
    }
  } else {
    activeRoute = 'budget';
  }

  const [showStoryViewer, setShowStoryViewer] = useState<boolean>(() => {
    return typeof window !== 'undefined' && window.location.search.includes('story=1');
  });

  // Sidebar collapse state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Feature state: Hide Amounts
  const [isHideAmountsEnabled, setIsHideAmountsEnabled] = useState(false);

  // Popover & Modal state
  const [isPlanMenuOpen, setIsPlanMenuOpen] = useState(false);
  const [planMenuTriggerRect, setPlanMenuTriggerRect] = useState<DOMRect | null>(null);

  const [activeModal, setActiveModal] = useState<
    | 'planSettings'
    | 'editFlags'
    | 'exportPlan'
    | 'freshStart'
    | 'editAccount'
    | 'closeAccount'
    | 'displayOptions'
    | 'managePayees'
    | 'keyboardShortcuts'
    | 'addAccount'
    | null
  >(null);
  const [editingAccount, setEditingAccount] = useState<AccountItem | null>(null);

  const allAccounts = [...cashAccounts, ...creditAccounts, ...trackingAccounts, ...closedAccounts];

  const handleOpenEditAccount = (accId: string) => {
    const acc = allAccounts.find((a) => a.entityId === accId) || null;
    setEditingAccount(acc);
    setActiveModal('editAccount');
  };

  const handleSaveAccount = async (updated: AccountItem, deltaOverride?: number) => {
    const currentWorkingBalance = editingAccount?.accountCalculation?.balance ?? 0;
    const newBalance = updated.accountCalculation?.balance ?? currentWorkingBalance;
    const delta = deltaOverride !== undefined ? deltaOverride : (newBalance - currentWorkingBalance);

    try {
      await updateAccount(updated.entityId, updated.accountName, updated.note);

      if (delta !== 0) {
        let sbPayeeId: string | undefined;
        try {
          const payees = await getPayees();
          const sb = payees.find(
            (p) =>
              p.internal_name === 'StartingBalancePayee' ||
              p.internal_name === 'Payee/__StartingBalance__' ||
              p.name === 'Starting Balance'
          );
          sbPayeeId = sb?.id;
        } catch {
          // ignore
        }

        await saveTransaction({
          account_id: updated.entityId,
          payee_id: sbPayeeId,
          date: new Date().toISOString().slice(0, 10),
          amount_milliunits: delta,
          memo: 'Manual Balance Adjustment',
          cleared: 'Cleared',
          approved: true,
        });
      }

      await refreshAccounts();
    } catch (err) {
      console.error('Failed to update account in Tauri:', err);
    }
  };

  const handleCloseAccount = async (accId: string) => {
    try {
      await closeAccount(accId);
      await refreshAccounts();
    } catch (err) {
      console.error('Failed to close account in Tauri:', err);
    }
  };

  const handleDeleteAccount = async (accId: string) => {
    setCashAccounts((prev) => prev.filter((a) => a.entityId !== accId));
    setCreditAccounts((prev) => prev.filter((a) => a.entityId !== accId));
    setTrackingAccounts((prev) => prev.filter((a) => a.entityId !== accId));
    setClosedAccounts((prev) => prev.filter((a) => a.entityId !== accId));
    if (selectedAccountId === accId) {
      navigate('/accounts');
    }
    try {
      await deleteAccount(accId);
      await refreshAccounts();
    } catch (err) {
      console.error('Failed to delete account in Tauri:', err);
    }
  };

  const handleReorderAccounts = async (
    groupType: 'cash' | 'credit' | 'loan' | 'tracking' | 'closed',
    orderedIds: string[]
  ) => {
    const reorder = (list: AccountItem[]) => {
      const byId = new Map(list.map((a) => [a.entityId, a]));
      const next = orderedIds.map((id) => byId.get(id)).filter((a): a is AccountItem => !!a);
      return [...next, ...list.filter((a) => !orderedIds.includes(a.entityId))];
    };

    if (groupType === 'cash') {
      setCashAccounts((prev) => reorder(prev));
    } else if (groupType === 'credit') {
      setCreditAccounts((prev) => reorder(prev));
    } else if (groupType === 'tracking') {
      setTrackingAccounts((prev) => reorder(prev));
    } else if (groupType === 'closed') {
      setClosedAccounts((prev) => reorder(prev));
    }

    try {
      await reorderAccounts(orderedIds);
    } catch (err) {
      console.error('Failed to persist account reorder in Tauri:', err);
    }
  };

  // Register Global App Shortcuts: ?, ToggleSidebar
  useEffect(() => {
    const target = {};

    keyboardShortcutsService.registerShortcut(
      KeyboardShortcut.OpenShortcutHelpModal,
      target,
      (e) => {
        if (!keyboardShortcutsService.isModalClosedAndNoInputEditing && activeModal !== 'keyboardShortcuts') {
          return;
        }
        e.preventDefault();
        e.stopOtherShortcuts();
        setActiveModal((prev) => (prev === 'keyboardShortcuts' ? null : 'keyboardShortcuts'));
        return KBShortcutResult.Success;
      }
    );

    keyboardShortcutsService.registerShortcut(
      KeyboardShortcut.ToggleSidebar,
      target,
      (e) => {
        if (!keyboardShortcutsService.isModalClosedAndNoInputEditing) return;
        e.preventDefault();
        e.stopOtherShortcuts();
        setIsSidebarCollapsed((prev) => !prev);
        return KBShortcutResult.Success;
      }
    );

    return () => {
      keyboardShortcutsService.removeAllShortcutsForTarget(target);
    };
  }, [activeModal]);

  if (showStoryViewer) {
    return <ReflectStoryViewer onExit={() => setShowStoryViewer(false)} />;
  }

  return (
    <TopLayout loggedIn={true}>
      <TopSidebar
        budgetName={budgetName}
        email={email}
        activeRoute={activeRoute}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        width={260}
        isHideAmountsEnabled={isHideAmountsEnabled}
        onNavigate={(route) => {
          if (route === 'budget') navigate('/budget');
          else if (route === 'reflect') navigate('/reflect');
          else if (route === 'accounts') navigate('/accounts');
        }}
        onOpenSidebarMenu={() => {
          const btn = document.querySelector('.sidebar-nav-menu-budget');
          if (btn) {
            setPlanMenuTriggerRect(btn.getBoundingClientRect());
          }
          setIsPlanMenuOpen(true);
        }}
        cashAccounts={cashAccounts}
        creditAccounts={creditAccounts}
        trackingAccounts={trackingAccounts}
        closedAccounts={closedAccounts}
        selectedAccountId={selectedAccountId}
        onSelectAccount={(id) => {
          navigate(`/accounts/${encodeURIComponent(id)}`);
        }}
        onEditAccount={handleOpenEditAccount}
        onAddAccount={() => {
          setActiveModal('addAccount');
        }}
        onManageConnections={() => {
          console.log('Manage Connections clicked');
        }}
        onReorderAccounts={handleReorderAccounts}
      />

      <section className="scroll-wrap ynab-u content">
        <Routes>
          <Route
            path="/budget"
            element={
              <BudgetWorkspace
                onAddAccount={() => setActiveModal('addAccount')}
                onOpenSettings={() => setActiveModal('planSettings')}
                isHideAmountsEnabled={isHideAmountsEnabled}
              />
            }
          />
          <Route
            path="/budget/:month"
            element={
              <BudgetWorkspace
                onAddAccount={() => setActiveModal('addAccount')}
                onOpenSettings={() => setActiveModal('planSettings')}
                isHideAmountsEnabled={isHideAmountsEnabled}
              />
            }
          />
          <Route
            path="/plan"
            element={<Navigate to="/budget" replace />}
          />
          <Route
            path="/plan/:month"
            element={<BudgetWorkspaceRedirect />}
          />
          <Route
            path="/reflect"
            element={
              <div style={{ position: 'relative', width: '100%', height: '100%', overflowX: 'hidden' }}>
                {import.meta.env.DEV && (
                  <div style={{ position: 'absolute', top: 8, right: 16, zIndex: 9999 }}>
                    <button
                      type="button"
                      className="button-ghost button-secondary"
                      style={{ fontSize: 11, background: '#1c3d5a', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: 4, cursor: 'pointer' }}
                      onClick={() => setShowStoryViewer(true)}
                    >
                      Story Matrix (21)
                    </button>
                  </div>
                )}
                <ReflectWorkspace />
              </div>
            }
          />
          <Route
            path="/reports/*"
            element={<Navigate to="/reflect" replace />}
          />
          <Route
            path="/accounts"
            element={
              <AccountsWorkspace
                selectedAccountId={null}
                accounts={allAccounts}
                categoryGroups={categoryGroups}
                isHideAmountsEnabled={isHideAmountsEnabled}
                onOpenEditAccount={(account) => handleOpenEditAccount(account.entityId)}
                onRefreshAccounts={refreshAccounts}
              />
            }
          />
          <Route
            path="/accounts/:accountId"
            element={
              <AccountRouteWrapper
                accounts={allAccounts}
                categoryGroups={categoryGroups}
                isHideAmountsEnabled={isHideAmountsEnabled}
                onOpenEditAccount={handleOpenEditAccount}
                onRefreshAccounts={refreshAccounts}
              />
            }
          />
          <Route
            path="/"
            element={<Navigate to="/budget" replace />}
          />
          <Route
            path="*"
            element={<Navigate to="/budget" replace />}
          />
        </Routes>
      </section>

      {/* Plan Menu Popover */}
      <PlanMenuPopover
        isOpen={isPlanMenuOpen}
        onClose={() => setIsPlanMenuOpen(false)}
        triggerRect={planMenuTriggerRect}
        currentPlanName={budgetName}
        onOpenPlan={(id, name) => setBudgetName(name)}
        onOpenPlanSettings={() => setActiveModal('planSettings')}
        onOpenManagePayees={() => setActiveModal('managePayees')}
        onOpenEditFlags={() => setActiveModal('editFlags')}
        onOpenDisplayOptions={() => setActiveModal('displayOptions')}
        onOpenExportPlan={() => setActiveModal('exportPlan')}
        onOpenFreshStart={() => setActiveModal('freshStart')}
        onOpenKeyboardShortcuts={() => setActiveModal('keyboardShortcuts')}
        onToggleHideAmounts={() => setIsHideAmountsEnabled(!isHideAmountsEnabled)}
        isHideAmountsEnabled={isHideAmountsEnabled}
        onOpenAccountSettings={() => alert('Opening Account Settings')}
        onOpenReferAFriend={() => alert('Refer a Friend modal')}
        onOpenGiftYnab={() => alert('Gift YNAB')}
        onOpenYnabTogether={() => alert('YNAB Together Settings')}
        onOpenWorkshops={() => window.open('https://www.ynab.com/free-workshops', '_blank')}
        onLogout={() => alert('Log out clicked')}
      />

      {/* Modals */}
      <PlanSettingsModal
        isOpen={activeModal === 'planSettings'}
        onClose={() => setActiveModal(null)}
        budgetName={budgetName}
        onSave={async (settings) => {
          setBudgetName(settings.budgetName);
          try {
            await updatePlanSettings(settings.budgetName);
          } catch (err) {
            console.error('Failed to update plan settings in Tauri:', err);
          }
        }}
      />

      <AddAccountModal
        isOpen={activeModal === 'addAccount'}
        onClose={() => setActiveModal(null)}
        onAddAccount={async (newAcc) => {
          try {
            const item = await createAccount({
              name: newAcc.nickname,
              account_type: newAcc.type,
              balance_milliunits: newAcc.balance,
              on_budget: !['otherasset', 'otherliability', 'mortgage', 'autoloan', 'studentloan', 'personalloan', 'medicaldebt', 'otherdebt'].includes(newAcc.type.toLowerCase()),
            });
            if (isCreditCardAccount(item.accountType)) {
              setCreditAccounts((prev) => [item, ...prev]);
            } else if (item.accountType === 'otherAsset' || item.accountType === 'otherLiability') {
              setTrackingAccounts((prev) => [item, ...prev]);
            } else {
              setCashAccounts((prev) => [item, ...prev]);
            }
          } catch (err) {
            console.error('Failed to create account via Tauri:', err);
          }
        }}
      />

      <ManagePayeesModal
        isOpen={activeModal === 'managePayees'}
        onClose={() => setActiveModal(null)}
      />

      <DisplayOptionsModal
        isOpen={activeModal === 'displayOptions'}
        onClose={() => setActiveModal(null)}
        onSave={(opts) => {
          applyTheme(opts.theme || 'default');
        }}
      />

      <KeyboardShortcutsModal
        isOpen={activeModal === 'keyboardShortcuts'}
        onClose={() => setActiveModal(null)}
      />

      <EditFlagsModal
        isOpen={activeModal === 'editFlags'}
        onClose={() => setActiveModal(null)}
      />

      <ExportPlanModal
        isOpen={activeModal === 'exportPlan'}
        onClose={() => setActiveModal(null)}
      />

      <FreshStartModal
        isOpen={activeModal === 'freshStart'}
        onClose={() => setActiveModal(null)}
        currentBudgetName={budgetName}
        onConfirm={async (newName) => {
          try {
            await makeFreshStart(DEFAULT_BUDGET_ID, newName);
            setBudgetName(newName);
            await refreshAccounts();
            try {
              const groups = await getCategoryGroups();
              setCategoryGroups(groups);
            } catch (catErr) {
              console.error('Failed to reload category groups after fresh start:', catErr);
            }
          } catch (err) {
            console.error('Failed to make fresh start in Tauri:', err);
          }
        }}
      />

      <EditAccountModal
        isOpen={activeModal === 'editAccount'}
        onClose={() => {
          setActiveModal(null);
          setEditingAccount(null);
        }}
        account={editingAccount}
        onSave={handleSaveAccount}
        onDelete={handleDeleteAccount}
        onCloseAccount={(acc) => {
          setEditingAccount(acc);
          setActiveModal('closeAccount');
        }}
      />

      <CloseAccountModal
        isOpen={activeModal === 'closeAccount'}
        onClose={() => {
          setActiveModal('editAccount');
        }}
        account={editingAccount}
        onConfirmClose={async (acc) => {
          await handleCloseAccount(acc.entityId);
          setActiveModal(null);
          setEditingAccount(null);
        }}
      />
    </TopLayout>
  );
}

function AccountRouteWrapper({
  accounts,
  categoryGroups,
  isHideAmountsEnabled,
  onOpenEditAccount,
  onRefreshAccounts,
}: {
  accounts: AccountItem[];
  categoryGroups: MasterCategoryGroup[];
  isHideAmountsEnabled?: boolean;
  onOpenEditAccount: (id: string) => void;
  onRefreshAccounts?: () => Promise<void> | void;
}) {
  const { accountId } = useParams<{ accountId: string }>();
  return (
    <AccountsWorkspace
      selectedAccountId={accountId ? decodeURIComponent(accountId) : null}
      accounts={accounts}
      categoryGroups={categoryGroups}
      isHideAmountsEnabled={isHideAmountsEnabled}
      onOpenEditAccount={(account) => onOpenEditAccount(account.entityId)}
      onRefreshAccounts={onRefreshAccounts}
    />
  );
}

function BudgetWorkspaceRedirect() {
  const { month } = useParams<{ month: string }>();
  return <Navigate to={month ? `/budget/${month}` : '/budget'} replace />;
}

export function App() {
  const [budgetName, setBudgetName] = useState('My Plan');
  const [email] = useState('local@user.me');

  // Accounts state
  const [cashAccounts, setCashAccounts] = useState<AccountItem[]>([]);
  const [creditAccounts, setCreditAccounts] = useState<AccountItem[]>([]);
  const [trackingAccounts, setTrackingAccounts] = useState<AccountItem[]>([]);
  const [closedAccounts, setClosedAccounts] = useState<AccountItem[]>([]);
  const [categoryGroups, setCategoryGroups] = useState<MasterCategoryGroup[]>([]);

  const refreshAccounts = async () => {
    try {
      const accs = await getAccounts();
      const cash: AccountItem[] = [];
      const credit: AccountItem[] = [];
      const tracking: AccountItem[] = [];
      const closed: AccountItem[] = [];

      accs.forEach((a) => {
        if (a.isClosed) {
          closed.push(a);
        } else if (['creditcard', 'credit', 'lineofcredit'].includes(a.accountType?.toLowerCase() || '')) {
          credit.push(a);
        } else if (a.accountType === 'otherAsset' || a.accountType === 'otherLiability') {
          tracking.push(a);
        } else {
          cash.push(a);
        }
      });

      setCashAccounts(cash);
      setCreditAccounts(credit);
      setTrackingAccounts(tracking);
      setClosedAccounts(closed);
    } catch (err) {
      console.error('Failed to load accounts from Tauri:', err);
    }
  };

  useEffect(() => {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('ynab_theme') : null;
    if (stored) {
      applyTheme(stored);
    }
  }, []);

  useEffect(() => {
    async function initData() {
      try {
        const plan = await getPlanSummary();
        if (plan?.name) {
          setBudgetName(plan.name);
        }
        // Task 2: load category groups on startup so register category picker displays categories immediately
        try {
          const groups = await getCategoryGroups();
          if (groups && groups.length > 0) {
            setCategoryGroups(groups);
          }
        } catch (catErr) {
          console.error('Failed to load category groups on startup:', catErr);
        }

        await refreshAccounts();
      } catch (err) {
        console.error('Failed to load initial data from Tauri:', err);
      }
    }
    initData();
  }, []);

  return (
    <BrowserRouter>
      <MainAppShell
        budgetName={budgetName}
        setBudgetName={setBudgetName}
        email={email}
        cashAccounts={cashAccounts}
        setCashAccounts={setCashAccounts}
        creditAccounts={creditAccounts}
        setCreditAccounts={setCreditAccounts}
        trackingAccounts={trackingAccounts}
        setTrackingAccounts={setTrackingAccounts}
        closedAccounts={closedAccounts}
        setClosedAccounts={setClosedAccounts}
        categoryGroups={categoryGroups}
        setCategoryGroups={setCategoryGroups}
        refreshAccounts={refreshAccounts}
      />
    </BrowserRouter>
  );
}

export default App;
