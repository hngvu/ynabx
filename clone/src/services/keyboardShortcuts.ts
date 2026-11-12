/**
 * EXACT REVERSE-ENGINEERED PORT FROM YNAB EMBER
 * wrapper.renamed.js (lines 11435-11490, 121388-121438, 129842-130272)
 */

export enum ShortcutPlatform {
  All = 'all',
  Mac = 'mac',
}

export enum KBShortcutResult {
  Success = 'success',
  Skipped = 'skipped',
}

export interface ShortcutEvent {
  target: EventTarget | null;
  preventDefault: () => void;
  stopOtherShortcuts: () => void;
  shortcutString: string;
}

export type ShortcutHandler = (event: ShortcutEvent) => KBShortcutResult | boolean | void | Promise<any>;

export enum KeyboardShortcut {
  AddNewTransaction = 'addNewTransaction',
  Approve = 'approve',
  ApproveAll = 'approveAll',
  Categorize = 'categorize',
  CloseModal = 'closeModal',
  CollapseAllCategoryGroups = 'collapseAllCategoryGroups',
  DatePickerFirstDayOfMonth = 'datePickerFirstDayOfMonth',
  DatePickerFirstDayOfYear = 'datePickerFirstDayOfYear',
  DatePickerLastDayOfMonth = 'datePickerLastDayOfMonth',
  DatePickerLastDayOfYear = 'datePickerLastDayOfYear',
  DatePickerNavigate = 'datePickerNavigate',
  DatePickerOneDayBackward = 'datePickerOneDayBackward',
  DatePickerOneDayForward = 'datePickerOneDayForward',
  DatePickerOneWeekBackward = 'datePickerOneWeekBackward',
  DatePickerOneWeekForward = 'datePickerOneWeekForward',
  DatePickerToday = 'datePickerToday',
  DeleteTransactions = 'deleteTransactions',
  DeselectAllCategories = 'deselectAllCategories',
  DeselectAllTransactions = 'deselectAllTransactions',
  Duplicate = 'duplicate',
  EnterNow = 'enterNow',
  ExpandAllCategoryGroups = 'expandAllCategoryGroups',
  Flag = 'flag',
  FlagBlue = 'flagBlue',
  FlagGreen = 'flagGreen',
  FlagNone = 'flagNone',
  FlagOrange = 'flagOrange',
  FlagPurple = 'flagPurple',
  FlagRed = 'flagRed',
  FlagYellow = 'flagYellow',
  FocusSearch = 'focusSearch',
  MakeRepeating = 'makeRepeating',
  Match = 'match',
  MathOperations = 'mathOperations',
  ManagePayeeEnter = 'managePayeeEnter',
  MoveBetweenBudgetRows = 'moveBetweenBudgetRows',
  MoveBetweenTransactions = 'moveBetweenTransactions',
  MoveToNextTransactionField = 'moveToNextTransactionField',
  MoveToPreviousTransactionField = 'moveToPreviousTransactionField',
  OpenShortcutHelpModal = 'openShortcutHelpModal',
  Reconcile = 'reconcile',
  Redo = 'redo',
  Reject = 'reject',
  SelectAllCategories = 'selectAllCategories',
  SelectAllNextCategory = 'selectAllNextCategory',
  SelectAllNextTransaction = 'selectAllNextTransaction',
  SelectAllPreviousCategory = 'selectAllPreviousCategory',
  SelectAllPreviousTransaction = 'selectAllPreviousTransaction',
  SelectAllTransactions = 'selectAllTransactions',
  SelectGroupOfTransactions = 'selectGroupOfTransactions',
  SelectMultipleCategories = 'selectMultipleCategories',
  SelectMultipleTransactions = 'selectMultipleTransactions',
  SelectNextCategory = 'selectNextCategory',
  SelectNextTransaction = 'selectNextTransaction',
  SelectPreviousCategory = 'selectPreviousCategory',
  SelectPreviousTransaction = 'selectPreviousTransaction',
  SnoozeSelectedCategories = 'snoozeSelectedCategories',
  Split = 'split',
  StartEditingTransaction = 'startEditingTransaction',
  SubmitModal = 'submitModal',
  ToggleAllCategoryGroups = 'toggleAllCategoryGroups',
  ToggleCleared = 'toggleCleared',
  ToggleSidebar = 'toggleSidebar',
  Undo = 'undo',
  Unmatch = 'unmatch',
}

export interface ShortcutDefinition {
  uiAll: string[];
  uiMac?: string[];
  uiLocation: 'universal' | 'budget' | 'accounts' | 'datePicker' | 'none';
  keys: (string | string[])[][];
  title?: string;
}

export const SHORTCUT_DEFINITIONS: Record<KeyboardShortcut, ShortcutDefinition> = {
  [KeyboardShortcut.OpenShortcutHelpModal]: {
    uiAll: ['?'],
    uiLocation: 'universal',
    keys: [['?']],
    title: 'Open Keyboard Shortcuts Help',
  },
  [KeyboardShortcut.ToggleSidebar]: {
    uiAll: ['shift', '.'],
    uiLocation: 'universal',
    keys: [['>']],
    title: 'Expand/Collapse Sidebar',
  },
  [KeyboardShortcut.SelectAllTransactions]: {
    uiAll: ['ctrl', 'A'],
    uiMac: ['⌘', 'A'],
    uiLocation: 'universal',
    keys: [['<meta>', 'A'], ['<control>', 'A']],
    title: 'Select All',
  },
  [KeyboardShortcut.DeselectAllTransactions]: {
    uiAll: ['escape'],
    uiLocation: 'universal',
    keys: [['<escape>']],
    title: 'Deselect All',
  },
  [KeyboardShortcut.MathOperations]: {
    uiAll: ['+', '-', 'x', '/'],
    uiLocation: 'universal',
    keys: [],
    title: 'Math operations',
  },
  [KeyboardShortcut.Undo]: {
    uiAll: ['ctrl', 'Z'],
    uiMac: ['⌘', 'Z'],
    uiLocation: 'universal',
    keys: [['<meta>', 'Z'], ['<control>', 'Z']],
    title: 'Undo',
  },
  [KeyboardShortcut.Redo]: {
    uiAll: ['ctrl', 'shift', 'Z'],
    uiMac: ['⌘', 'shift', 'Z'],
    uiLocation: 'universal',
    keys: [
      ['<meta>', 'Y'],
      ['<control>', 'Y'],
      [['<meta>', '<shift>'], 'Z'],
      [['<control>', '<shift>'], 'Z'],
    ],
    title: 'Redo',
  },
  [KeyboardShortcut.SnoozeSelectedCategories]: {
    uiAll: ['shift', 'Z'],
    uiLocation: 'budget',
    keys: [['<shift>', 'Z']],
    title: 'Snooze target',
  },
  [KeyboardShortcut.AddNewTransaction]: {
    uiAll: ['shift', 'N'],
    uiLocation: 'accounts',
    keys: [['<shift>', 'N'], [['<alt>', '<control>'], 'N'], ['<control>', 'N']],
    title: 'Add new transaction',
  },
  [KeyboardShortcut.Approve]: {
    uiAll: ['A'],
    uiLocation: 'accounts',
    keys: [['A']],
    title: 'Approve',
  },
  [KeyboardShortcut.ApproveAll]: {
    uiAll: ['shift', 'L'],
    uiLocation: 'accounts',
    keys: [['<shift>', 'L']],
    title: 'Approve all transactions',
  },
  [KeyboardShortcut.Reject]: {
    uiAll: ['shift', 'R'],
    uiLocation: 'accounts',
    keys: [['<shift>', 'R']],
    title: 'Reject',
  },
  [KeyboardShortcut.Categorize]: {
    uiAll: ['K'],
    uiLocation: 'accounts',
    keys: [['K']],
    title: 'Categorize',
  },
  [KeyboardShortcut.Split]: {
    uiAll: ['S'],
    uiLocation: 'accounts',
    keys: [['S']],
    title: 'Split',
  },
  [KeyboardShortcut.EnterNow]: {
    uiAll: ['E'],
    uiLocation: 'accounts',
    keys: [['E']],
    title: 'Enter Now',
  },
  [KeyboardShortcut.Match]: {
    uiAll: ['M'],
    uiLocation: 'accounts',
    keys: [['M']],
    title: 'Match',
  },
  [KeyboardShortcut.Unmatch]: {
    uiAll: ['shift', 'U'],
    uiLocation: 'accounts',
    keys: [['<shift>', 'U']],
    title: 'Unmatch',
  },
  [KeyboardShortcut.ToggleCleared]: {
    uiAll: ['C'],
    uiLocation: 'accounts',
    keys: [['C']],
    title: 'Toggle cleared state',
  },
  [KeyboardShortcut.Duplicate]: {
    uiAll: ['shift', 'D'],
    uiLocation: 'accounts',
    keys: [['<shift>', 'D']],
    title: 'Duplicate',
  },
  [KeyboardShortcut.Flag]: {
    uiAll: ['shift', 'F', 'then', '0-6'],
    uiLocation: 'accounts',
    keys: [['<shift>', 'F']],
    title: 'Flag',
  },
  [KeyboardShortcut.MakeRepeating]: {
    uiAll: ['shift', 'T'],
    uiLocation: 'accounts',
    keys: [['<shift>', 'T']],
    title: 'Make repeating',
  },
  [KeyboardShortcut.DeleteTransactions]: {
    uiAll: ['delete'],
    uiLocation: 'accounts',
    keys: [['<delete>'], ['<backspace>']],
    title: 'Delete',
  },
  [KeyboardShortcut.Reconcile]: {
    uiAll: ['shift', 'E'],
    uiLocation: 'accounts',
    keys: [['<shift>', 'E']],
    title: 'Reconcile',
  },
  [KeyboardShortcut.FocusSearch]: {
    uiAll: ['ctrl', 'shift', 'F'],
    uiMac: ['⌘', 'shift', 'F'],
    uiLocation: 'accounts',
    keys: [[['<meta>', '<shift>'], 'F'], [['<control>', '<shift>'], 'F']],
    title: 'Focus on the search bar',
  },
  [KeyboardShortcut.DatePickerNavigate]: {
    uiAll: ['↑', '↓', '←', '→'],
    uiLocation: 'datePicker',
    keys: [],
    title: 'Navigate the date picker',
  },
  [KeyboardShortcut.DatePickerOneDayForward]: {
    uiAll: ['+'],
    uiLocation: 'datePicker',
    keys: [['+'], ['<right>'], ['<num-+>'], ['=']],
    title: 'Move date one day forward',
  },
  [KeyboardShortcut.DatePickerOneDayBackward]: {
    uiAll: ['-'],
    uiLocation: 'datePicker',
    keys: [['-'], ['<left>'], ['<num-->']],
    title: 'Move date one day backward',
  },
  [KeyboardShortcut.DatePickerToday]: {
    uiAll: ['T'],
    uiLocation: 'datePicker',
    keys: [['T']],
    title: 'Select today',
  },
  [KeyboardShortcut.DatePickerFirstDayOfMonth]: {
    uiAll: ['M'],
    uiLocation: 'datePicker',
    keys: [['M']],
    title: 'Select first day of month',
  },
  [KeyboardShortcut.DatePickerLastDayOfMonth]: {
    uiAll: ['shift', 'M'],
    uiLocation: 'datePicker',
    keys: [['<shift>', 'M']],
    title: 'Select last day of month',
  },
  [KeyboardShortcut.DatePickerFirstDayOfYear]: {
    uiAll: ['Y'],
    uiLocation: 'datePicker',
    keys: [['Y']],
    title: 'Select first day of year',
  },
  [KeyboardShortcut.DatePickerLastDayOfYear]: {
    uiAll: ['shift', 'Y'],
    uiLocation: 'datePicker',
    keys: [['<shift>', 'Y'], ['R']],
    title: 'Select last day of year',
  },
  [KeyboardShortcut.SelectGroupOfTransactions]: {
    uiAll: ['shift', 'click'],
    uiLocation: 'accounts',
    keys: [],
    title: 'Select a group of transactions',
  },
  [KeyboardShortcut.SelectMultipleTransactions]: {
    uiAll: ['shift', '↑/↓'],
    uiLocation: 'accounts',
    keys: [],
    title: 'Select multiple transactions',
  },
  [KeyboardShortcut.MoveBetweenTransactions]: {
    uiAll: ['↑/↓'],
    uiLocation: 'accounts',
    keys: [],
    title: 'Move between transactions',
  },
  [KeyboardShortcut.MoveToNextTransactionField]: {
    uiAll: ['tab'],
    uiLocation: 'accounts',
    keys: [],
    title: 'Move to next transaction field',
  },
  [KeyboardShortcut.MoveToPreviousTransactionField]: {
    uiAll: ['shift', 'tab'],
    uiLocation: 'accounts',
    keys: [],
    title: 'Move to previous transaction field',
  },
  [KeyboardShortcut.ToggleAllCategoryGroups]: {
    uiAll: ['ctrl', '↑/↓'],
    uiMac: ['⌘', '↑/↓'],
    uiLocation: 'budget',
    keys: [],
    title: 'Collapse/expand groups',
  },
  [KeyboardShortcut.MoveBetweenBudgetRows]: {
    uiAll: ['↑/↓'],
    uiLocation: 'budget',
    keys: [],
    title: 'Move between plan rows',
  },
  [KeyboardShortcut.SelectMultipleCategories]: {
    uiAll: ['shift', '↑/↓'],
    uiLocation: 'budget',
    keys: [],
    title: 'Select multiple categories',
  },
  [KeyboardShortcut.CloseModal]: {
    uiAll: ['escape'],
    uiLocation: 'none',
    keys: [['<escape>']],
  },
  [KeyboardShortcut.SubmitModal]: {
    uiAll: ['enter'],
    uiLocation: 'none',
    keys: [['<enter>']],
  },
  [KeyboardShortcut.StartEditingTransaction]: {
    uiAll: ['enter'],
    uiLocation: 'none',
    keys: [['<enter>']],
  },
  [KeyboardShortcut.ManagePayeeEnter]: {
    uiAll: ['enter'],
    uiLocation: 'none',
    keys: [['<enter>']],
  },
  [KeyboardShortcut.SelectAllCategories]: {
    uiAll: [],
    uiLocation: 'none',
    keys: [['<meta>', 'A'], ['<control>', 'A']],
    title: 'Select All',
  },
  [KeyboardShortcut.DeselectAllCategories]: {
    uiAll: [],
    uiLocation: 'none',
    keys: [['<escape>']],
    title: 'Deselect All',
  },
  [KeyboardShortcut.ExpandAllCategoryGroups]: {
    uiAll: [],
    uiLocation: 'none',
    keys: [['<meta>', '<down>'], ['<control>', '<down>']],
  },
  [KeyboardShortcut.CollapseAllCategoryGroups]: {
    uiAll: [],
    uiLocation: 'none',
    keys: [['<meta>', '<up>'], ['<control>', '<up>']],
  },
  [KeyboardShortcut.SelectNextCategory]: {
    uiAll: [],
    uiLocation: 'none',
    keys: [['<down>']],
  },
  [KeyboardShortcut.SelectPreviousCategory]: {
    uiAll: [],
    uiLocation: 'none',
    keys: [['<up>']],
  },
  [KeyboardShortcut.SelectAllNextCategory]: {
    uiAll: [],
    uiLocation: 'none',
    keys: [['<shift>', '<down>']],
  },
  [KeyboardShortcut.SelectAllPreviousCategory]: {
    uiAll: [],
    uiLocation: 'none',
    keys: [['<shift>', '<up>']],
  },
  [KeyboardShortcut.SelectNextTransaction]: {
    uiAll: [],
    uiLocation: 'none',
    keys: [['<down>']],
  },
  [KeyboardShortcut.SelectPreviousTransaction]: {
    uiAll: [],
    uiLocation: 'none',
    keys: [['<up>']],
  },
  [KeyboardShortcut.SelectAllNextTransaction]: {
    uiAll: [],
    uiLocation: 'none',
    keys: [['<shift>', '<down>']],
  },
  [KeyboardShortcut.SelectAllPreviousTransaction]: {
    uiAll: [],
    uiLocation: 'none',
    keys: [['<shift>', '<up>']],
  },
  [KeyboardShortcut.DatePickerOneWeekForward]: {
    uiAll: [],
    uiLocation: 'none',
    keys: [['<down>']],
  },
  [KeyboardShortcut.DatePickerOneWeekBackward]: {
    uiAll: [],
    uiLocation: 'none',
    keys: [['<up>']],
  },
  [KeyboardShortcut.FlagNone]: {
    uiAll: ['0'],
    uiLocation: 'none',
    keys: [['0']],
  },
  [KeyboardShortcut.FlagRed]: {
    uiAll: ['1'],
    uiLocation: 'none',
    keys: [['1']],
  },
  [KeyboardShortcut.FlagOrange]: {
    uiAll: ['2'],
    uiLocation: 'none',
    keys: [['2']],
  },
  [KeyboardShortcut.FlagYellow]: {
    uiAll: ['3'],
    uiLocation: 'none',
    keys: [['3']],
  },
  [KeyboardShortcut.FlagGreen]: {
    uiAll: ['4'],
    uiLocation: 'none',
    keys: [['4']],
  },
  [KeyboardShortcut.FlagBlue]: {
    uiAll: ['5'],
    uiLocation: 'none',
    keys: [['5']],
  },
  [KeyboardShortcut.FlagPurple]: {
    uiAll: ['6'],
    uiLocation: 'none',
    keys: [['6']],
  },
};

// --- KEY NORMALIZATION HELPER ---
const standardKeyMap: Record<string, string> = {
  Enter: '<enter>',
  Backspace: '<delete>',
  Delete: '<delete>',
  Escape: '<escape>',
  Esc: '<escape>',
  Tab: '<tab>',
  Control: '<control>',
  Meta: '<meta>',
  Shift: '<shift>',
  Alt: '<alt>',
  ArrowLeft: '<left>',
  ArrowRight: '<right>',
  ArrowUp: '<up>',
  ArrowDown: '<down>',
  Left: '<left>',
  Right: '<right>',
  Up: '<up>',
  Down: '<down>',
  ' ': '<space>',
  Spacebar: '<space>',
};

const lettersAndNumbers = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'
];

const specialKeys = [
  '<enter>', '<delete>', '<backspace>', '<escape>', '<tab>', '<left>',
  '<right>', '<up>', '<down>', '<space>', '.', '+', '-', '=', '<num-+>',
  '<num-->', '<', '>', '?', ':', '"', '{', '}', '|', '_', '!', '@',
  '#', '$', '%', '^', '&', '*', '/', '(', ')'
];

const shiftedSymbols = [
  '<', '>', '?', ':', '"', '{', '}', '|', '_', '+', '!', '@', '#', '$', '%', '^', '&', '*', '(', ')'
];

export function isShiftedKey(key: string): boolean {
  return specialKeys.includes(key) && shiftedSymbols.includes(key);
}

export function normalizeKey(e: KeyboardEvent): string | undefined {
  if (e.defaultPrevented) return undefined;
  if (e.key !== undefined) {
    const upper = e.key.toUpperCase();
    if (standardKeyMap[e.key]) return standardKeyMap[e.key];
    if (lettersAndNumbers.includes(upper)) return upper;
    if (specialKeys.includes(e.key)) return e.key;
    return undefined;
  }
  return undefined;
}

// --- LIFO SIGNAL IMPLEMENTATION ---
interface Binding {
  listener: ShortcutHandler;
  context: any;
  priority: number;
}

class ShortcutSignal {
  private bindings: Binding[] = [];
  private shouldPropagate = true;

  addHandler(listener: ShortcutHandler, context: any, priority = 0) {
    let index = this.bindings.length;
    do {
      --index;
    } while (this.bindings[index] && priority <= this.bindings[index].priority);
    this.bindings.splice(index + 1, 0, { listener, context, priority });
  }

  removeHandler(listener: ShortcutHandler, context: any) {
    const idx = this.bindings.findIndex(b => b.listener === listener && b.context === context);
    if (idx !== -1) {
      this.bindings.splice(idx, 1);
    }
  }

  getNumListeners() {
    return this.bindings.length;
  }

  halt() {
    this.shouldPropagate = false;
  }

  dispatch(event: ShortcutEvent) {
    let count = this.bindings.length;
    if (!count) return;
    const current = this.bindings.slice(0);
    this.shouldPropagate = true;
    do {
      count--;
      const b = current[count];
      if (b && this.shouldPropagate) {
        try {
          const res = b.listener.call(b.context, event);
          if (res === false) break;
        } catch (err) {
          console.error('Error executing shortcut handler:', err);
        }
      }
    } while (count > 0 && this.shouldPropagate);
  }
}

// --- GLOBAL KEYBOARD SHORTCUTS SERVICE ---
export class KeyboardShortcutsService {
  private signalMap = new Map<string, ShortcutSignal>();
  private registrationMap = new Map<any, { shortcutString: string; handler: ShortcutHandler }[]>();
  private _disableKeyboardShortcuts = false;
  private lastThrottleTime = 0;
  private listeners: (() => void)[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ynab_disable_keyboard_shortcuts');
      if (saved !== null) {
        this._disableKeyboardShortcuts = saved === '1' || saved === 'true';
      }
      window.addEventListener('keydown', this.handleKeyDown, true);
    }
  }

  get disableKeyboardShortcuts(): boolean {
    return this._disableKeyboardShortcuts;
  }

  set disableKeyboardShortcuts(val: boolean) {
    this._disableKeyboardShortcuts = val;
    if (typeof window !== 'undefined') {
      localStorage.setItem('ynab_disable_keyboard_shortcuts', val ? '1' : '0');
    }
    this.notifyChange();
  }

  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyChange() {
    this.listeners.forEach(fn => fn());
  }

  get platform(): ShortcutPlatform {
    if (typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(window.navigator.userAgent)) {
      return ShortcutPlatform.Mac;
    }
    return ShortcutPlatform.All;
  }

  get isModalClosedAndNoInputEditing(): boolean {
    if (typeof document === 'undefined') return true;
    const hasModal = !!document.querySelector('.modal-overlay.active, .modal-fresh, .modal, .dialog-overlay.active');
    const hasEditingRow = !!document.querySelector('.ynab-grid-body-row.is-editing, .grid-row.is-editing');
    const active = document.activeElement;
    const isInput = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || (active as HTMLElement).isContentEditable);
    return !hasModal && !hasEditingRow && !isInput;
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    if (this._disableKeyboardShortcuts) return;

    const normalized = normalizeKey(event);
    if (!normalized) return;

    const modifiers: string[] = [];
    if (event.metaKey) modifiers.push('<meta>');
    if (event.ctrlKey) modifiers.push('<control>');
    if (event.altKey) modifiers.push('<alt>');
    if (event.shiftKey && !isShiftedKey(normalized)) modifiers.push('<shift>');
    modifiers.sort();

    const pressedKeyArr = modifiers.includes(normalized) ? modifiers : [...modifiers, normalized];
    const shortcutString = pressedKeyArr.join('');

    const now = Date.now();
    if (now - this.lastThrottleTime < 100) return;
    this.lastThrottleTime = now;

    const signal = this.signalMap.get(shortcutString);
    if (signal) {
      signal.dispatch({
        target: event.target,
        preventDefault: () => event.preventDefault(),
        stopOtherShortcuts: () => signal.halt(),
        shortcutString,
      });
    }
  };

  private buildShortcutString(keyOrMods: string | string[], key?: string): string {
    if (key === undefined) {
      return keyOrMods as string;
    }
    if (Array.isArray(keyOrMods)) {
      return `${keyOrMods.slice().sort().join('')}${key}`;
    }
    return `${keyOrMods}${key}`;
  }

  private getShortcutStrings(shortcut: KeyboardShortcut): string[] {
    const def = SHORTCUT_DEFINITIONS[shortcut];
    if (!def) return [];
    const res: string[] = [];
    for (const keyDef of def.keys) {
      if (keyDef.length === 1) {
        res.push(this.buildShortcutString(keyDef[0]));
      } else if (keyDef.length === 2) {
        res.push(this.buildShortcutString(keyDef[0], keyDef[1] as string));
      }
    }
    return res;
  }

  registerShortcut(shortcut: KeyboardShortcut, context: any, callback: ShortcutHandler) {
    const shortcutStrings = this.getShortcutStrings(shortcut);
    const wrappedHandler: ShortcutHandler = (ev: ShortcutEvent) => {
      const res = callback.call(context, ev);
      return res;
    };

    for (const str of shortcutStrings) {
      let signal = this.signalMap.get(str);
      if (!signal) {
        signal = new ShortcutSignal();
        this.signalMap.set(str, signal);
      }
      const priority = signal.getNumListeners();
      signal.addHandler(wrappedHandler, context, priority);

      const existing = this.registrationMap.get(context) || [];
      existing.push({ shortcutString: str, handler: wrappedHandler });
      this.registrationMap.set(context, existing);
    }
  }

  removeAllShortcutsForTarget(context: any) {
    const regs = this.registrationMap.get(context);
    if (regs) {
      regs.forEach(({ shortcutString, handler }) => {
        const signal = this.signalMap.get(shortcutString);
        if (signal) {
          signal.removeHandler(handler, context);
        }
      });
      this.registrationMap.delete(context);
    }
  }

  destroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.handleKeyDown, true);
    }
    this.signalMap.clear();
    this.registrationMap.clear();
  }
}

export const keyboardShortcutsService = new KeyboardShortcutsService();
