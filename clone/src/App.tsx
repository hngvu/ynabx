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
} from './components/modals';
import { BudgetWorkspace } from './components/budget';
import { INITIAL_CATEGORY_GROUPS } from './components/budget/budgetData';
import { AccountsWorkspace } from './components/accounts';
import { ReflectWorkspace } from './components/reflect/ReflectWorkspace';
import { ReflectStoryViewer } from './components/reflect/ReflectStoryViewer';
import {
  KeyboardShortcut,
  keyboardShortcutsService,
  KBShortcutResult,
} from './services/keyboardShortcuts';

const INITIAL_CASH_ACCOUNTS: AccountItem[] = [
  {
    entityId: 'acc-chase-checking',
    accountName: 'Chase Checking',
    accountType: 'checking',
    isDirectImportLinked: true,
    directImportStatus: 'good',
    accountCalculation: { balance: 7515870, notificationCount: 0 },
  },
  {
    entityId: 'acc-ally-savings',
    accountName: 'Ally Savings',
    accountType: 'savings',
    isDirectImportLinked: true,
    directImportStatus: 'good',
    accountCalculation: { balance: 7100000, notificationCount: 0 },
  },
  {
    entityId: 'acc-wallet-cash',
    accountName: 'Wallet Cash',
    accountType: 'cash',
    isDirectImportLinked: false,
    accountCalculation: { balance: 51370, notificationCount: 0 },
  },
];

const INITIAL_CREDIT_ACCOUNTS: AccountItem[] = [
  {
    entityId: 'acc-visa-rewards',
    accountName: 'Visa Rewards',
    accountType: 'creditCard',
    isDirectImportLinked: true,
    directImportStatus: 'good',
    accountCalculation: { balance: -27480, notificationCount: 0 },
  },
];

const INITIAL_TRACKING_ACCOUNTS: AccountItem[] = [
  {
    entityId: 'acc-vanguard-brokerage',
    accountName: 'Vanguard Brokerage',
    accountType: 'otherAsset',
    isDirectImportLinked: true,
    directImportStatus: 'good',
    accountCalculation: { balance: 11200000, notificationCount: 0 },
  },
  {
    entityId: 'acc-car-loan',
    accountName: 'Car Loan',
    accountType: 'otherLiability',
    isMissingLoanDetails: true,
    accountCalculation: { balance: -6680000, notificationCount: 0 },
  },
];

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

  const allAccounts = [...cashAccounts, ...creditAccounts, ...trackingAccounts];

  const handleOpenEditAccount = (accId: string) => {
    const acc = allAccounts.find((a) => a.entityId === accId) || null;
    setEditingAccount(acc);
    setActiveModal('editAccount');
  };

  const handleSaveAccount = (updated: AccountItem) => {
    setCashAccounts((prev) => prev.map((a) => (a.entityId === updated.entityId ? updated : a)));
    setCreditAccounts((prev) => prev.map((a) => (a.entityId === updated.entityId ? updated : a)));
    setTrackingAccounts((prev) => prev.map((a) => (a.entityId === updated.entityId ? updated : a)));
  };

  const handleDeleteAccount = (accId: string) => {
    setCashAccounts((prev) => prev.filter((a) => a.entityId !== accId));
    setCreditAccounts((prev) => prev.filter((a) => a.entityId !== accId));
    setTrackingAccounts((prev) => prev.filter((a) => a.entityId !== accId));
    if (selectedAccountId === accId) {
      navigate('/accounts');
    }
  };

  const handleReorderAccounts = (
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
              />
            }
          />
          <Route
            path="/budget/:month"
            element={
              <BudgetWorkspace
                onAddAccount={() => setActiveModal('addAccount')}
                onOpenSettings={() => setActiveModal('planSettings')}
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
                categoryGroups={INITIAL_CATEGORY_GROUPS}
                onOpenEditAccount={(account) => handleOpenEditAccount(account.entityId)}
              />
            }
          />
          <Route
            path="/accounts/:accountId"
            element={
              <AccountRouteWrapper
                accounts={allAccounts}
                onOpenEditAccount={handleOpenEditAccount}
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
        onSave={(settings) => setBudgetName(settings.budgetName)}
      />

      <AddAccountModal
        isOpen={activeModal === 'addAccount'}
        onClose={() => setActiveModal(null)}
        onAddAccount={(newAcc) => {
          const item: AccountItem = {
            entityId: `acc-${Date.now()}`,
            accountName: newAcc.nickname,
            accountType: newAcc.type.toLowerCase(),
            isDirectImportLinked: false,
            accountCalculation: { balance: newAcc.balance, notificationCount: 0 },
          };
          setCashAccounts((prev) => [item, ...prev]);
        }}
      />

      <ManagePayeesModal
        isOpen={activeModal === 'managePayees'}
        onClose={() => setActiveModal(null)}
      />

      <DisplayOptionsModal
        isOpen={activeModal === 'displayOptions'}
        onClose={() => setActiveModal(null)}
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
        onConfirm={(newName) => setBudgetName(newName)}
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
        onConfirmClose={(acc) => {
          handleDeleteAccount(acc.entityId);
          setActiveModal(null);
          setEditingAccount(null);
        }}
      />
    </TopLayout>
  );
}

function AccountRouteWrapper({
  accounts,
  onOpenEditAccount,
}: {
  accounts: AccountItem[];
  onOpenEditAccount: (id: string) => void;
}) {
  const { accountId } = useParams<{ accountId: string }>();
  return (
    <AccountsWorkspace
      selectedAccountId={accountId ? decodeURIComponent(accountId) : null}
      accounts={accounts}
      categoryGroups={INITIAL_CATEGORY_GROUPS}
      onOpenEditAccount={(account) => onOpenEditAccount(account.entityId)}
    />
  );
}

function BudgetWorkspaceRedirect() {
  const { month } = useParams<{ month: string }>();
  return <Navigate to={month ? `/budget/${month}` : '/budget'} replace />;
}

export function App() {
  const [budgetName, setBudgetName] = useState('My Personal Budget');
  const [email] = useState('local@user.me');

  // Accounts state
  const [cashAccounts, setCashAccounts] = useState(INITIAL_CASH_ACCOUNTS);
  const [creditAccounts, setCreditAccounts] = useState(INITIAL_CREDIT_ACCOUNTS);
  const [trackingAccounts, setTrackingAccounts] = useState(INITIAL_TRACKING_ACCOUNTS);

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
      />
    </BrowserRouter>
  );
}

export default App;
