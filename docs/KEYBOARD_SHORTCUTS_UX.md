# PhÃ¢n TÃ­ch ToÃ n Diá»‡n PhÃ­m Táº¯t Thao TÃ¡c (Keyboard UX) Trong YNAB Ember & Káº¿ Hoáº¡ch Triá»ƒn Khai

## Má»¥c TiÃªu (Goal Description)

Giáº£i mÃ£ 100% kiáº¿n trÃºc xá»­ lÃ½ bÃ n phÃ­m, há»‡ thá»‘ng phÃ­m táº¯t (`keyboard-shortcuts` service), cÃ¡c bá»™ láº¯ng nghe cá»¥c bá»™ (`onKeyDown` / `onKeyPress` / `onFocusTrap`) vÃ  cÃ¡c quy táº¯c UX thao tÃ¡c bÃ n phÃ­m trong mÃ£ nguá»“n gá»‘c YNAB Ember ([wrapper.renamed.js](file:///c:/Users/hoang/Desktop/ynabx/unminified/wrapper.renamed.js) vÃ  [main.renamed.js](file:///c:/Users/hoang/Desktop/ynabx/unminified/main.renamed.js)), tá»« Ä‘Ã³ lÃ m cÆ¡ sá»Ÿ ká»¹ thuáº­t chÃ­nh xÃ¡c Ä‘á»ƒ tÃ i liá»‡u hÃ³a hoáº·c triá»ƒn khai Ä‘á»“ng bá»™ (pixel-perfect & behavior-perfect) sang á»©ng dá»¥ng React ([clone/](file:///c:/Users/hoang/Desktop/ynabx/clone) / [frontend/](file:///c:/Users/hoang/Desktop/ynabx/frontend)).

---

## 1. Kiáº¿n TrÃºc Tá»•ng Thá»ƒ Há»‡ Thá»‘ng BÃ n PhÃ­m Trong Ember

YNAB Ember thiáº¿t káº¿ thao tÃ¡c bÃ n phÃ­m theo **kiáº¿n trÃºc lai 2 táº§ng (Two-Tier Hybrid Keyboard Architecture)**:

```mermaid
flowchart TD
    A["Sá»± kiá»‡n bÃ n phÃ­m cá»§a trÃ¬nh duyá»‡t (DOM KeyboardEvent)"] --> B{"Táº§ng 2: Local Component Handlers\n(input, dropdown, inline editor, modal focus trap)"}
    B -- "e.stopPropagation() / e.preventDefault()" --> C["Xá»­ lÃ½ cá»¥c bá»™ ngay táº¡i Component\n(Tab/Enter qua cÃ¡c Ã´, +-*/ mÃ¡y tÃ­nh, â†‘â†“ trong dropdown)"]
    B -- "Sá»± kiá»‡n ná»•i bá»t (bubble) lÃªn document" --> D["Táº§ng 1: Global KeyboardShortcutsService\n$(document).on('keydown.global')"]
    D --> E{"applicationService.disableKeyboardShortcuts?"}
    E -- "true" --> F["Bá» qua toÃ n bá»™ phÃ­m táº¯t"]
    E -- "false" --> G["Chuáº©n hÃ³a chuá»—i tá»• há»£p phÃ­m: getPressedKeys(event)\n(VÃ­ dá»¥: '<meta><shift>Z', '<shift>F', '?')"]
    G --> H["Ember.run.throttle(..., 100ms, immediate=true)"]
    H --> I["Signal Map (Nr): LIFO Priority Dispatch\n(Component Ä‘Äƒng kÃ½ sau cÃ¹ng nháº­n sá»± kiá»‡n trÆ°á»›c)"]
    I --> J{"Handler kiá»ƒm tra Guard\n(shouldRunShortcut / isModalClosedAndNoInputEditing)"}
    J -- "stopOtherShortcuts() (n.halt())" --> K["Thá»±c thi & Cháº·n lan truyá»n xuá»‘ng táº§ng dÆ°á»›i\n(VD: Esc Ä‘Ã³ng Popover hiá»‡n táº¡i mÃ  khÃ´ng Ä‘Ã³ng Modal ná»n)"]
    J -- "KBShortcutResult.Skipped" --> L["Bá» qua / Cho phÃ©p listener tiáº¿p theo xá»­ lÃ½"]
```

---

## 2. Giáº£i MÃ£ Chi Tiáº¿t Táº§ng 1: `KeyboardShortcutsService` (`Px`)

**Vá»‹ trÃ­ mÃ£ nguá»“n**: [wrapper.renamed.js](file:///c:/Users/hoang/Desktop/ynabx/unminified/wrapper.renamed.js#L129842-L130272) (Ä‘Æ°á»£c Ä‘Äƒng kÃ½ vÃ o DI container vá»›i tÃªn `"ynab_web/services/keyboard-shortcuts"` táº¡i [main.renamed.js](file:///c:/Users/hoang/Desktop/ynabx/unminified/main.renamed.js#L52028)).

### 2.1. Chuáº©n hÃ³a mÃ£ phÃ­m (`a$`, `u$`, `d$`)
**Vá»‹ trÃ­**: [wrapper.renamed.js](file:///c:/Users/hoang/Desktop/ynabx/unminified/wrapper.renamed.js#L121388-L121438).
1. **Kiá»ƒm tra `defaultPrevented`**: Náº¿u `event.isDefaultPrevented()` lÃ  `true`, hÃ m `a$(event)` tráº£ vá» `null` ngay láº­p tá»©c Ä‘á»ƒ trÃ¡nh kÃ­ch hoáº¡t phÃ­m táº¯t khi sá»± kiá»‡n Ä‘Ã£ bá»‹ cháº·n á»Ÿ táº§ng dÆ°á»›i.
2. **Ãnh xáº¡ phÃ­m chuáº©n (`t$`)**:
   - `Enter` $\rightarrow$ `"<enter>"`
   - `Backspace` / `Delete` $\rightarrow$ `"<delete>"` (lÆ°u Ã½ cáº£ hai Ä‘á»u quy vá» `"<delete>"` trong `t$`, nhÆ°ng báº£ng `keys` cÅ©ng khai bÃ¡o dá»± phÃ²ng `["<backspace>"]`)
   - `Escape` / `Esc` $\rightarrow$ `"<escape>"`
   - `Tab` $\rightarrow$ `"<tab>"`
   - `ArrowLeft` / `Left` $\rightarrow$ `"<left>"`, `ArrowRight` / `Right` $\rightarrow$ `"<right>"`, `ArrowUp` / `Up` $\rightarrow$ `"<up>"`, `ArrowDown` / `Down` $\rightarrow$ `"<down>"`
   - `" "` / `Spacebar` $\rightarrow$ `"<space>"`
   - Chá»¯ cÃ¡i & chá»¯ sá»‘ (`a-z`, `0-9`) Ä‘Æ°á»£c viáº¿t hoa (`toUpperCase()`).
   - Fallback cho trÃ¬nh duyá»‡t cÅ© qua báº£ng mÃ£ `keyCode` (`Qw[event.keyCode]`, bao gá»“m cáº£ phÃ­m Numpad `<num-0>`..`<num-9>`, `<num-+>`, `<num-->`).
3. **Quy táº¯c khá»­ `<shift>` thÃ´ng minh trÃªn kÃ½ tá»± Ä‘áº·c biá»‡t (`u$` / `isShiftedKey`)**:
   - Máº£ng `i$ = ["<", ">", "?", ":", '"', "{", "}", "|", "_", "+", "!", "@", "#", "$", "%", "^", "&", "*", "(", ")"]`.
   - Trong `getPressedModifiers(key, event)`:
     ```js
     e.metaKey && n.push("<meta>");
     e.ctrlKey && n.push("<control>");
     e.altKey && n.push("<alt>");
     e.shiftKey && !u$(t) && n.push("<shift>");
     return n.sort();
     ```
   - **Ã nghÄ©a UX**: Khi ngÆ°á»i dÃ¹ng báº¥m `Shift + /` Ä‘á»ƒ ra dáº¥u `?` (má»Ÿ báº£ng trá»£ giÃºp) hoáº·c `Shift + .` Ä‘á»ƒ ra dáº¥u `>` (Ä‘Ã³ng/má»Ÿ Sidebar), trÃ¬nh duyá»‡t bÃ¡o `event.shiftKey === true` vÃ  `event.key === "?"` (hoáº·c `">"`). Nhá» `!u$(t)`, `<shift>` **khÃ´ng** bá»‹ ná»‘i thÃªm vÃ o chuá»—i, giÃºp chuá»—i khá»›p chÃ­nh xÃ¡c vá»›i `"?"` vÃ  `">"` trÃªn má»i bá»‘ cá»¥c bÃ n phÃ­m quá»‘c táº¿.

### 2.2. CÆ¡ cháº¿ LIFO Priority Stack (`Nr` Signal) & `stopOtherShortcuts()`
**Vá»‹ trÃ­**: [wrapper.renamed.js](file:///c:/Users/hoang/Desktop/ynabx/unminified/wrapper.renamed.js#L11435-L11490) vÃ  [wrapper.renamed.js](file:///c:/Users/hoang/Desktop/ynabx/unminified/wrapper.renamed.js#L130211-L130252).
- Má»—i chuá»—i phÃ­m (vÃ­ dá»¥ `"<escape>"`) Ã¡nh xáº¡ tá»›i má»™t Ä‘á»‘i tÆ°á»£ng `Signal` (`Nr`) trong `this.signalMap`.
- Khi má»™t component gá»i `registerShortcut(shortcutEnum, target, callback)` trong `constructor`:
  - Äá»™ Æ°u tiÃªn (`priority`) Ä‘Æ°á»£c gÃ¡n báº±ng `t.getNumListeners()` (tÄƒng dáº§n theo thá»© tá»± thá»i gian mount).
  - Khi `Signal.dispatch(...)` cháº¡y, vÃ²ng láº·p duyá»‡t ngÆ°á»£c tá»« cuá»‘i máº£ng `_bindings` vá» Ä‘áº§u (`do { e--; } while (n[e] && this._shouldPropagate ...)`), tá»©c lÃ  **LIFO (Last-In, First-Out)**.
- **VÃ­ dá»¥ thá»±c táº¿**:
  1. MÃ n hÃ¬nh `AccountRegister` mount trÆ°á»›c, Ä‘Äƒng kÃ½ `<escape>` (`DeselectAllTransactions`).
  2. NgÆ°á»i dÃ¹ng má»Ÿ `ManagePayeesModal` (Ä‘Äƒng kÃ½ `<escape>` $\rightarrow$ `CloseModal`).
  3. Trong `ManagePayeesModal`, ngÆ°á»i dÃ¹ng má»Ÿ tiáº¿p `Popover/Sub-modal` (Ä‘Äƒng kÃ½ `<escape>` $\rightarrow$ `CloseModal`).
  4. Khi báº¥m `Esc`, Popover trong cÃ¹ng nháº­n sá»± kiá»‡n Ä‘áº§u tiÃªn, gá»i `t.stopOtherShortcuts()` (`n.halt()`), chá»‰ Ä‘Ã³ng Popover Ä‘Ã³ mÃ  **khÃ´ng** Ä‘Ã³ng `ManagePayeesModal` vÃ  **khÃ´ng** bá» chá»n cÃ¡c dÃ²ng giao dá»‹ch bÃªn dÆ°á»›i.
- **Throttle chá»‘ng láº·p phÃ­m**: `globalKeydownHandler` bá»c lá»‡nh `dispatch` trong `N(this, fn, 100, true)` (Ember `run.throttle` 100ms vá»›i `immediate: true`), ngÄƒn viá»‡c Ä‘Ã¨ phÃ­m gÃ¢y lag giao diá»‡n.

### 2.3. Hai cá»•ng kiá»ƒm soÃ¡t tráº¡ng thÃ¡i (Guard Conditions)
1. **Cá» táº¯t toÃ n cá»¥c (`disableKeyboardShortcuts`)**:
   - LÆ°u trong User Setting: `SettingNames.DisableKeyboardShortcuts = "disable_keyboard_shortcuts"` (`"1"` / `"0"`).
   - Khi báº­t cá» nÃ y, `globalKeydownHandler` return sá»›m, Ä‘á»“ng thá»i component hiá»ƒn thá»‹ nhÃ£n phÃ­m táº¯t `<ShortcutKeys>` tá»± Ä‘á»™ng áº©n toÃ n bá»™ cÃ¡c badge phÃ­m táº¯t trÃªn UI (trá»« trong modal Keyboard Shortcuts Help nÆ¡i cÃ³ `@alwaysShow={{true}}` vÃ  nÃºt **"Enable Shortcuts"**).
2. **Kiá»ƒm tra tráº¡ng thÃ¡i Modal & Input (`isModalClosedAndNoInputEditing`)**:
   ```js
   get isModalClosedAndNoInputEditing() {
     return !(
       $(".modal-overlay").hasClass("active") ||
       $(".dialog-overlay").hasClass("active") ||
       $(".ynab-grid-body-row.is-editing").length ||
       $(".ynab-new-currency-input.is-editing").length
     );
   }
   ```
   - NgÄƒn cÃ¡c phÃ­m táº¯t Ä‘Æ¡n (nhÆ° `A`, `C`, `E`, `K`, `M`, `S`, `>`) vÃ´ tÃ¬nh kÃ­ch hoáº¡t khi ngÆ°á»i dÃ¹ng Ä‘ang má»Ÿ modal, Ä‘ang sá»­a dÃ²ng giao dá»‹ch, hoáº·c Ä‘ang gÃµ sá»‘ tiá»n vÃ o Ã´ `ynab-new-currency-input`.

---

## 3. Báº£ng Danh Má»¥c Äáº§y Äá»§ 57 Äá»‹nh NghÄ©a PhÃ­m Táº¯t (`SHORTCUT_DEFINITIONS` / `Dx`)

**Vá»‹ trÃ­**: [wrapper.renamed.js](file:///c:/Users/hoang/Desktop/ynabx/unminified/wrapper.renamed.js#L129851-L130184) vÃ  chuá»—i i18n táº¡i [wrapper.renamed.js](file:///c:/Users/hoang/Desktop/ynabx/unminified/wrapper.renamed.js#L4173-L4221).

> [!NOTE]
> YNAB tÃ¡ch biá»‡t **hiá»ƒn thá»‹ trÃªn báº£ng Help (`uiLocation`, `uiAll`, `uiMac`)** vá»›i **tá»• há»£p phÃ­m thá»±c thi (`keys`)**. Má»™t sá»‘ má»¥c chá»‰ dÃ¹ng Ä‘á»ƒ hiá»ƒn thá»‹ gom nhÃ³m trÃªn báº£ng Help (`keys: []`, vÃ­ dá»¥ `â†‘/â†“` cho `MoveBetweenBudgetRows`), trong khi viá»‡c báº¯t phÃ­m thá»±c táº¿ Ä‘Æ°á»£c tÃ¡ch thÃ nh cÃ¡c háº±ng sá»‘ cÃ³ `uiLocation: "none"` (`SelectNextCategory`, `SelectPreviousCategory`) hoáº·c xá»­ lÃ½ á»Ÿ táº§ng Local Handler.

### 3.1. NhÃ³m Universal (`uiLocation: "universal"`)
| Enum (`Ex` / `Ot`) | NhÃ£n UI (`uiAll` / `uiMac`) | Tá»• há»£p phÃ­m thá»±c táº¿ (`keys`) | MÃ´ táº£ & NÆ¡i Ä‘Äƒng kÃ½ |
| :--- | :--- | :--- | :--- |
| `OpenShortcutHelpModal` | `?` | `["?"]` | Má»Ÿ/Ä‘Ã³ng modal trá»£ giÃºp phÃ­m táº¯t (`EvergreenApp`, `KeyboardShortcutsModal`) |
| `ToggleSidebar` | `shift` `.` | `[">"]` | Thu gá»n / má»Ÿ rá»™ng thanh Sidebar trÃ¡i (`Sidebar`, trá»« route `users.budgets`) |
| `SelectAllTransactions` | `ctrl` `A` / `âŒ˜` `A` | `["<meta>", "A"]`, `["<control>", "A"]` | Chá»n táº¥t cáº£ giao dá»‹ch trÃªn sá»• cÃ¡i (`RegisterGrid`) |
| `DeselectAllTransactions` | `escape` | `["<escape>"]` | Bá» chá»n toÃ n bá»™ giao dá»‹ch hoáº·c thoÃ¡t cháº¿ Ä‘á»™ Reconcile Adjustment (`RegisterGrid`) |
| `MathOperations` | `+`, `-`, `x`, `/` | `[]` *(Local handler)* | PhÃ©p tÃ­nh cá»™ng/trá»«/nhÃ¢n/chia/lÅ©y thá»«a trá»±c tiáº¿p trong Ã´ tiá»n tá»‡ (`ynab-new-currency-input`) |
| `Undo` | `ctrl` `Z` / `âŒ˜` `Z` | `["<meta>", "Z"]`, `["<control>", "Z"]` | HoÃ n tÃ¡c thay Ä‘á»•i (`EvergreenApp`, `ManagePayeesModal`) |
| `Redo` | `ctrl` `shift` `Z` / `âŒ˜` `shift` `Z` | `["<meta>", "Y"]`, `["<control>", "Y"]`, `[["<meta>", "<shift>"], "Z"]`, `[["<control>", "<shift>"], "Z"]` | LÃ m láº¡i thay Ä‘á»•i (`EvergreenApp`, `ManagePayeesModal`) |

### 3.2. NhÃ³m Plan / Budget Actions (`uiLocation: "budget"` & cÃ¡c phÃ­m áº©n Ä‘i kÃ¨m)
| Enum (`Ex` / `Ot`) | NhÃ£n UI (`uiAll` / `uiMac`) | Tá»• há»£p phÃ­m thá»±c táº¿ (`keys`) | HÃ nh vi UX trong `BudgetTable` ([main.renamed.js](file:///c:/Users/hoang/Desktop/ynabx/unminified/main.renamed.js#L25374-L25583)) |
| :--- | :--- | :--- | :--- |
| `MoveBetweenBudgetRows` | `â†‘/â†“` | `[]` *(Äáº¡i diá»‡n UI cho 2 phÃ­m dÆ°á»›i)* | Hiá»ƒn thá»‹ trong Help Modal |
| `SelectNextCategory` | *(áº¨n)* | `["<down>"]` | Di chuyá»ƒn xuá»‘ng dÃ²ng Category tiáº¿p theo vÃ  má»Ÿ Ã´ nháº­p `Assigned` (xoay vÃ²ng tá»« cuá»‘i lÃªn Ä‘áº§u, throttle 50ms) |
| `SelectPreviousCategory` | *(áº¨n)* | `["<up>"]` | Di chuyá»ƒn lÃªn dÃ²ng Category phÃ­a trÃªn vÃ  má»Ÿ Ã´ nháº­p `Assigned` (xoay vÃ²ng tá»« Ä‘áº§u xuá»‘ng cuá»‘i, throttle 50ms) |
| `SelectMultipleCategories` | `shift` `â†‘/â†“` | `[]` *(Äáº¡i diá»‡n UI cho 2 phÃ­m dÆ°á»›i)* | Hiá»ƒn thá»‹ trong Help Modal |
| `SelectAllNextCategory` | *(áº¨n)* | `["<shift>", "<down>"]` | Má»Ÿ rá»™ng/thu háº¹p vÃ¹ng tick chá»n nhiá»u Category xuá»‘ng dÆ°á»›i tÃ­nh tá»« `multipleSelectOriginItemIndex` (Ä‘á»“ng thá»i Ä‘Ã³ng Ã´ Ä‘ang sá»­a) |
| `SelectAllPreviousCategory` | *(áº¨n)* | `["<shift>", "<up>"]` | Má»Ÿ rá»™ng/thu háº¹p vÃ¹ng tick chá»n nhiá»u Category lÃªn trÃªn tÃ­nh tá»« `multipleSelectOriginItemIndex` |
| `ToggleAllCategoryGroups` | `ctrl` `â†‘/â†“` / `âŒ˜` `â†‘/â†“` | `[]` *(Äáº¡i diá»‡n UI cho 2 phÃ­m dÆ°á»›i)* | Hiá»ƒn thá»‹ trong Help Modal |
| `CollapseAllCategoryGroups` | *(áº¨n)* | `["<meta>", "<up>"]`, `["<control>", "<up>"]` | Thu gá»n toÃ n bá»™ cÃ¡c nhÃ³m Master Category |
| `ExpandAllCategoryGroups` | *(áº¨n)* | `["<meta>", "<down>"]`, `["<control>", "<down>"]` | Má»Ÿ rá»™ng toÃ n bá»™ cÃ¡c nhÃ³m Master Category |
| `SelectAllCategories` | *(áº¨n)* | `["<meta>", "A"]`, `["<control>", "A"]` | Tick chá»n táº¥t cáº£ cÃ¡c dÃ²ng Category (ká»ƒ cáº£ dÃ²ng Uncategorized Transactions náº¿u Ä‘ang hiá»‡n) |
| `DeselectAllCategories` | *(áº¨n)* | `["<escape>"]` | Bá» tick chá»n táº¥t cáº£ cÃ¡c dÃ²ng Category |
| `SnoozeSelectedCategories` | `shift` `Z` | `["<shift>", "Z"]` | Táº¡m áº©n (Snooze/Unsnooze) Target trong thÃ¡ng hiá»‡n táº¡i cho cÃ¡c Category Ä‘ang chá»n (gá»™p trong 1 ChangeSet nguyÃªn tá»­) |

### 3.3. NhÃ³m Account Actions (`uiLocation: "accounts"` & cÃ¡c phÃ­m áº©n Ä‘i kÃ¨m)
| Enum (`Ex` / `Ot`) | NhÃ£n UI (`uiAll` / `uiMac`) | Tá»• há»£p phÃ­m thá»±c táº¿ (`keys`) | NÆ¡i xá»­ lÃ½ & HÃ nh vi UX |
| :--- | :--- | :--- | :--- |
| `AddNewTransaction` | `shift` `N` | `["<shift>", "N"]`, `[["<alt>", "<control>"], "N"]`, `["<control>", "N"]` | Má»Ÿ dÃ²ng thÃªm giao dá»‹ch má»›i (`RegisterGrid`) |
| `Approve` | `A` | `["A"]` | Duyá»‡t cÃ¡c giao dá»‹ch Ä‘ang chá»n (`RegisterActionBar`) |
| `ApproveAll` | `shift` `L` | `["<shift>", "L"]` | Chá»n táº¥t cáº£ $\rightarrow$ Duyá»‡t táº¥t cáº£ $\rightarrow$ Bá» chá»n táº¥t cáº£ (`RegisterGrid`) |
| `Reject` | `shift` `R` | `["<shift>", "R"]` | Tá»« chá»‘i giao dá»‹ch nháº­p tá»± Ä‘á»™ng Ä‘ang chá»n (`RegisterActionBar`) |
| `Categorize` | `K` | `["K"]` | Náº¿u chá»n **1 dÃ²ng**: báº¯t Ä‘áº§u sá»­a dÃ²ng vÃ  focus tháº³ng vÃ o Ã´ `subCategoryName` (`RegisterGrid`). Náº¿u chá»n **>1 dÃ²ng**: má»Ÿ Popover chá»n Category trÃªn Action Bar (`RegisterActionBar`). |
| `Split` | `S` | `["S"]` | Náº¿u chá»n **1 dÃ²ng**: má»Ÿ cháº¿ Ä‘á»™ sá»­a (náº¿u chÆ°a sá»­a) vÃ  tÃ¡ch giao dá»‹ch thÃ nh Split Transaction (`RegisterGrid`) |
| `EnterNow` | `E` | `["E"]` | Nháº­p ngay giao dá»‹ch Ä‘á»‹nh ká»³ (Scheduled) hoáº·c Pending vÃ o sá»• cÃ¡i (`RegisterActionBar`) |
| `Match` | `M` | `["M"]` | GhÃ©p (Match) 2 giao dá»‹ch Ä‘ang chá»n (`RegisterActionBar`) |
| `Unmatch` | `shift` `U` | `["<shift>", "U"]` | Há»§y ghÃ©p (Unmatch) giao dá»‹ch (`RegisterActionBar`) |
| `ToggleCleared` | `C` | `["C"]` | Äáº£o tráº¡ng thÃ¡i Cleared / Uncleared cho cÃ¡c giao dá»‹ch Ä‘ang chá»n (`RegisterGrid`) |
| `Duplicate` | `shift` `D` | `["<shift>", "D"]` | NhÃ¢n báº£n cÃ¡c giao dá»‹ch Ä‘ang chá»n (`RegisterActionBar`) |
| `Flag` | `shift` `F` `then` `0â€‘6` | `["<shift>", "F"]` | Má»Ÿ menu chá»n cá» mÃ u: náº¿u chá»n **1 dÃ²ng** thÃ¬ má»Ÿ dropdown táº¡i pill cá» cá»§a dÃ²ng Ä‘Ã³ (`RegisterGrid`); náº¿u chá»n **>1 dÃ²ng** thÃ¬ má»Ÿ menu cá» táº¡i Action Bar (`RegisterActionBar`). Khi menu cá» má»Ÿ (`FlagsList`), nÃ³ Ä‘Äƒng kÃ½ tiáº¿p phÃ­m `0`â€“`6`! |
| `FlagNone` .. `FlagPurple` | `0` .. `6` | `["0"]` .. `["6"]` | Chá»‰ Ä‘Æ°á»£c Ä‘Äƒng kÃ½ khi component `FlagsList` ([wrapper.renamed.js](file:///c:/Users/hoang/Desktop/ynabx/unminified/wrapper.renamed.js#L159530)) Ä‘ang má»Ÿ: `0`=Clear, `1`=Red, `2`=Orange, `3`=Yellow, `4`=Green, `5`=Blue, `6`=Purple. |
| `MakeRepeating` | `shift` `T` | `["<shift>", "T"]` | Biáº¿n giao dá»‹ch Ä‘ang chá»n thÃ nh giao dá»‹ch láº·p láº¡i (`RegisterActionBar`) |
| `DeleteTransactions` | `delete` | `["<delete>"]`, `["<backspace>"]` | XÃ³a cÃ¡c giao dá»‹ch Ä‘ang chá»n (náº¿u xÃ³a nhiá»u dÃ²ng hoáº·c dÃ²ng Ä‘Ã£ Reconciled/Closed account sáº½ báº­t modal cáº£nh bÃ¡o) (`RegisterGrid`) |
| `Reconcile` | `shift` `E` | `["<shift>", "E"]` | Má»Ÿ luá»“ng Ä‘á»‘i soÃ¡t tÃ i khoáº£n (Reconcile) náº¿u khÃ´ng pháº£i Ä‘ang á»Ÿ view "All Accounts" (`RegisterHeader`) |
| `FocusSearch` | `ctrl` `shift` `F` / `âŒ˜` `shift` `F` | `[["<meta>", "<shift>"], "F"]`, `[["<control>", "<shift>"], "F"]` | Focus vÃ o Ã´ tÃ¬m kiáº¿m giao dá»‹ch (`TransactionSearch`) hoáº·c Ã´ tÃ¬m kiáº¿m Payee náº¿u Ä‘ang má»Ÿ `ManagePayeesModal` |
| `StartEditingTransaction` | `enter` | `["<enter>"]` | Khi Ä‘ang chá»n Ä‘Ãºng 1 dÃ²ng giao dá»‹ch vÃ  chÆ°a á»Ÿ cháº¿ Ä‘á»™ sá»­a: báº¯t Ä‘áº§u sá»­a dÃ²ng Ä‘Ã³ vÃ  focus vÃ o Ã´ `date` (`RegisterGrid`) |
| `SelectNextTransaction` | *(áº¨n - `â†‘/â†“`)* | `["<down>"]` | Chá»n duy nháº¥t dÃ²ng giao dá»‹ch káº¿ tiáº¿p bÃªn dÆ°á»›i (bá» qua dÃ²ng sub-transaction/footer/header, cuá»™n tá»›i Ä‘áº§u/cuá»‘i náº¿u cháº¡m biÃªn) |
| `SelectPreviousTransaction` | *(áº¨n - `â†‘/â†“`)* | `["<up>"]` | Chá»n duy nháº¥t dÃ²ng giao dá»‹ch phÃ­a trÃªn |
| `SelectAllNextTransaction` | *(áº¨n - `shift` `â†‘/â†“`)* | `["<shift>", "<down>"]` | Má»Ÿ rá»™ng/thu háº¹p vÃ¹ng chá»n nhiá»u giao dá»‹ch xuá»‘ng dÆ°á»›i quanh `selectNextOriginItemIndex` |
| `SelectAllPreviousTransaction` | *(áº¨n - `shift` `â†‘/â†“`)* | `["<shift>", "<up>"]` | Má»Ÿ rá»™ng/thu háº¹p vÃ¹ng chá»n nhiá»u giao dá»‹ch lÃªn trÃªn quanh `selectNextOriginItemIndex` |
| `SelectGroupOfTransactions` | `shift` `click` | `[]` *(Click handler)* | Chá»n dáº£i giao dá»‹ch liÃªn tiáº¿p báº±ng `Shift + Click` |
| `MoveToNextTransactionField` | `tab` | `[]` *(Local handler)* | Chuyá»ƒn sang trÆ°á»ng tiáº¿p theo khi Ä‘ang sá»­a giao dá»‹ch |
| `MoveToPreviousTransactionField` | `shift` `tab` | `[]` *(Local handler)* | LÃ¹i vá» trÆ°á»ng trÆ°á»›c Ä‘Ã³ khi Ä‘ang sá»­a giao dá»‹ch |

### 3.4. NhÃ³m Date Picker (`uiLocation: "datePicker"` & cÃ¡c phÃ­m áº©n Ä‘i kÃ¨m)
ÄÆ°á»£c Ä‘Äƒng kÃ½ khi `RegisterCalendar` ([main.renamed.js](file:///c:/Users/hoang/Desktop/ynabx/unminified/main.renamed.js#L45020)) Ä‘ang má»Ÿ:
| Enum (`Ex` / `Ot`) | NhÃ£n UI (`uiAll`) | Tá»• há»£p phÃ­m thá»±c táº¿ (`keys`) | HÃ nh vi UX |
| :--- | :--- | :--- | :--- |
| `DatePickerNavigate` | `â†‘`, `â†“`, `â†`, `â†’` | `[]` *(Äáº¡i diá»‡n UI)* | Äiá»u hÆ°á»›ng ngÃ y trÃªn lá»‹ch |
| `DatePickerOneDayForward` | `+` | `["+"]`, `["<right>"]`, `["<num-+>"]`, `["="]` | TÄƒng 1 ngÃ y (`+1 day`) |
| `DatePickerOneDayBackward` | `-` | `["-"]`, `["<left>"]`, `["<num-->"]` | Giáº£m 1 ngÃ y (`-1 day`). **LÆ°u Ã½ tinh táº¿**: Náº¿u phÃ­m báº¥m lÃ  `"-"`, há»‡ thá»‘ng kiá»ƒm tra `dateFormatter.getSelectedDateFormat()?.includes("-")` â€” náº¿u Ä‘á»‹nh dáº¡ng ngÃ y cá»§a ngÆ°á»i dÃ¹ng cÃ³ chá»©a dáº¥u gáº¡ch ngang (vÃ­ dá»¥ `YYYY-MM-DD` hoáº·c `DD-MM-YYYY`), phÃ­m `"-"` sáº½ tráº£ vá» `Skipped` Ä‘á»ƒ ngÆ°á»i dÃ¹ng cÃ³ thá»ƒ tá»± gÃµ ngÃ y báº±ng tay mÃ  khÃ´ng bá»‹ nháº£y lÃ¹i 1 ngÃ y! |
| `DatePickerOneWeekForward` | *(áº¨n)* | `["<down>"]` | TÄƒng 1 tuáº§n (`+7 days`) |
| `DatePickerOneWeekBackward` | *(áº¨n)* | `["<up>"]` | Giáº£m 1 tuáº§n (`-7 days`) |
| `DatePickerToday` | `T` | `["T"]` | Chá»n ngÃ y hÃ´m nay (`Today`) |
| `DatePickerFirstDayOfMonth` | `M` | `["M"]` | Chá»n ngÃ y Ä‘áº§u thÃ¡ng Ä‘ang hiá»ƒn thá»‹ (`startOfMonth()`) |
| `DatePickerLastDayOfMonth` | `shift` `M` | `["<shift>", "M"]` | Chá»n ngÃ y cuá»‘i thÃ¡ng Ä‘ang hiá»ƒn thá»‹ (`endOfMonth()`) |
| `DatePickerFirstDayOfYear` | `Y` | `["Y"]` | Chá»n ngÃ y Ä‘áº§u nÄƒm Ä‘ang hiá»ƒn thá»‹ (`startOfYear()`) |
| `DatePickerLastDayOfYear` | `shift` `Y` | `["<shift>", "Y"]`, `["R"]` | Chá»n ngÃ y cuá»‘i nÄƒm Ä‘ang hiá»ƒn thá»‹ (`endOfYear()`) â€” há»— trá»£ cáº£ `Shift+Y` vÃ  phÃ­m Ä‘Æ¡n `R`! |

### 3.5. NhÃ³m Modal & Dialog (`uiLocation: "none"`)
| Enum (`Ex` / `Ot`) | Tá»• há»£p phÃ­m (`keys`) | NÆ¡i Ä‘Äƒng kÃ½ & HÃ nh vi UX |
| :--- | :--- | :--- |
| `CloseModal` | `["<escape>"]` | ÄÃ³ng Modal/Dialog/Menu/Overlay/Calendar hiá»‡n hÃ nh vÃ  gá»i `stopOtherShortcuts()` |
| `SubmitModal` | `["<enter>"]` | XÃ¡c nháº­n lÆ°u trong modal sá»­a giao dá»‹ch Ä‘Ã£ Reconciled (`EditReconciledTransactionModal`) |
| `ManagePayeeEnter` | `["<enter>"]` | Trong `ManagePayeesModal`: Ä‘Ã³ng sub-modal náº¿u Ä‘ang má»Ÿ, xÃ¡c nháº­n xÃ³a Payee náº¿u Ä‘ang hiá»‡n há»™p thoáº¡i xÃ¡c nháº­n xÃ³a, hoáº·c kÃ­ch hoáº¡t nÃºt `.button-primary` cÃ¹ng cáº¥p vá»›i input Ä‘ang focus |

---

## 4. Giáº£i MÃ£ Chi Tiáº¿t Táº§ng 2: Local Component Keyboard UX

NgoÃ i `KeyboardShortcutsService`, pháº§n lá»›n tráº£i nghiá»‡m "mÆ°á»£t" khi nháº­p liá»‡u cá»§a YNAB náº±m á»Ÿ cÃ¡c bá»™ xá»­ lÃ½ sá»± kiá»‡n bÃ n phÃ­m cá»¥c bá»™:

### 4.1. MÃ¡y tÃ­nh tiá»n tá»‡ Inline (`ynab-new-currency-input`)
**Vá»‹ trÃ­**: [wrapper.renamed.js](file:///c:/Users/hoang/Desktop/ynabx/unminified/wrapper.renamed.js#L160815-L160905).
- **KÃ­ch hoáº¡t phÃ©p tÃ­nh (`onKeyPress`)**:
  - Khi gÃµ cÃ¡c toÃ¡n tá»­ `+`, `-`, `*`, `/`, `%`, `^`, `=` (`Ui(n)`):
  - **Quy táº¯c sá»‘ Ã¢m / dáº¥u cá»™ng Ä‘áº§u dÃ²ng**: Náº¿u giÃ¡ trá»‹ hiá»‡n táº¡i báº±ng `0` (`formatter.clean(editValue) === 0`) vÃ  ngÆ°á»i dÃ¹ng gÃµ `"-"` (hoáº·c `"+"` khi `@allowLeadingPlusSign` báº­t nhÆ° á»Ÿ mÃ n hÃ¬nh Reconcile), nÃ³ Ä‘Æ°á»£c hiá»ƒu lÃ  dáº¥u Ã¢m/dÆ°Æ¡ng cá»§a con sá»‘ chá»© **khÃ´ng** má»Ÿ mÃ¡y tÃ­nh.
  - NgÆ°á»£c láº¡i, náº¿u toÃ n bá»™ vÄƒn báº£n trong Ã´ Ä‘ang Ä‘Æ°á»£c bÃ´i Ä‘en (`i0(e)` â€” tráº¡ng thÃ¡i vá»«a focus vÃ o Ã´ tiá»n tá»‡ trÃªn dÃ²ng Budget), viá»‡c gÃµ `+`, `-`, `*`, `/` sáº½ **khÃ´ng xÃ³a sá»‘ cÅ©** mÃ  ná»‘i toÃ¡n tá»­ vÃ o sau sá»‘ cÅ© (`r + t`), bá» bÃ´i Ä‘en vÃ  Ä‘áº·t con trá» vá» cuá»‘i chuá»—i (`focusAndSelect(r0.end)`) Ä‘á»ƒ ngÆ°á»i dÃ¹ng cá»™ng/trá»« thÃªm vÃ o sá»‘ tiá»n hiá»‡n cÃ³!
  - Náº¿u kÃ½ tá»± cuá»‘i cÃ¹ng Ä‘Ã£ lÃ  má»™t toÃ¡n tá»­ mÃ  ngÆ°á»i dÃ¹ng gÃµ toÃ¡n tá»­ khÃ¡c, toÃ¡n tá»­ cuá»‘i sáº½ Ä‘Æ°á»£c thay tháº¿ báº±ng toÃ¡n tá»­ má»›i.
- **TÃ­nh káº¿t quáº£ & LÆ°u (`onKeyDown`)**:
  - `Ctrl/Cmd + Enter` khi Ä‘ang cÃ³ biá»ƒu thá»©c toÃ¡n há»c: chá»‰ tÃ­nh ra káº¿t quáº£ (`this.calculate("=")`) vÃ  giá»¯ focus trong Ã´ Ä‘á»ƒ xem káº¿t quáº£ trÆ°á»›c khi lÆ°u.
  - `Enter`, `Tab`, `ArrowUp`, `ArrowDown`: gá»i `commitValue()` (tÃ­nh biá»ƒu thá»©c toÃ¡n há»c qua parser `Ki()`, quy Ä‘á»•i ra milliunits giá»›i háº¡n trong `Â±1e15`, lÆ°u giÃ¡ trá»‹ vÃ  Ä‘Ã³ng popup calculator).
  - Äáº·c biá»‡t, khi báº¥m `ArrowUp` hoáº·c `ArrowDown` trong Ã´ `Assigned` cá»§a `BudgetTable`:
    - `ynab-new-currency-input` Ä‘Ã¡nh dáº¥u `forceCommitOnNextFocusOut = true` vÃ  gá»i `commitValue()`, nhÆ°ng **khÃ´ng** gá»i `stopPropagation()` Ä‘á»‘i vá»›i `<up>` / `<down>`.
    - Nhá» Ä‘Ã³ sá»± kiá»‡n `<up>` / `<down>` tiáº¿p tá»¥c ná»•i bá»t lÃªn `document`, kÃ­ch hoáº¡t `SelectPreviousCategory` / `SelectNextCategory` cá»§a `BudgetTable` $\rightarrow$ **vá»«a lÆ°u sá»‘ tiá»n á»Ÿ dÃ²ng hiá»‡n táº¡i, vá»«a nháº£y ngay sang má»Ÿ Ã´ nháº­p tiá»n á»Ÿ dÃ²ng Category káº¿ tiáº¿p!**
  - `Escape`:
    - Náº¿u popup mÃ¡y tÃ­nh (`showCalculatorPopup`) Ä‘ang má»Ÿ $\rightarrow$ chá»‰ Ä‘Ã³ng popup mÃ¡y tÃ­nh (`stopPropagation()`).
    - Náº¿u giÃ¡ trá»‹ trong Ã´ Ä‘Ã£ bá»‹ sá»­a Ä‘á»•i (`_hasValueChanged()`) $\rightarrow$ khÃ´i phá»¥c `previousValue` vÃ  blur khá»i Ã´ (`stopPropagation()`).
    - Náº¿u giÃ¡ trá»‹ chÆ°a Ä‘á»•i $\rightarrow$ `budget-table-row` (`onKeyDown` táº¡i [main.renamed.js](file:///c:/Users/hoang/Desktop/ynabx/unminified/main.renamed.js#L25087)) báº¯t `<escape>` vÃ  gá»i `tryToCancelEditing(categoryId)`.

### 4.2. Äiá»u hÆ°á»›ng khi ThÃªm / Sá»­a Giao dá»‹ch trÃªn Sá»• cÃ¡i (`RegisterGrid` & `TransactionEditorService`)
**Vá»‹ trÃ­**: [main.renamed.js](file:///c:/Users/hoang/Desktop/ynabx/unminified/main.renamed.js#L22856-L22950), [main.renamed.js](file:///c:/Users/hoang/Desktop/ynabx/unminified/main.renamed.js#L43115-L43130), [main.renamed.js](file:///c:/Users/hoang/Desktop/ynabx/unminified/main.renamed.js#L45829-L45860).
- **Thá»© tá»± vÃ²ng láº·p cÃ¡c trÆ°á»ng (`registerAreaOrder`)**:
  `Account` (náº¿u á»Ÿ All Accounts) $\rightarrow$ `Date` $\rightarrow$ `Payee` $\rightarrow$ `Category` $\rightarrow$ `Memo` $\rightarrow$ `Outflow` $\rightarrow$ `Inflow` $\rightarrow$ NÃºt `Save` / `Save and Add Another` / `Cancel`.
- **PhÃ­m `Tab` vÃ  `Shift + Tab` (`grid-index.hbs` `onKeyDown`)**:
  - **Focus Trap vÃ²ng trÃ²n trÃªn dÃ²ng Ä‘ang sá»­a**:
    - Náº¿u Ä‘ang á»Ÿ input Ä‘áº§u tiÃªn cá»§a dÃ²ng sá»­a vÃ  báº¥m `Shift + Tab` $\rightarrow$ nháº£y vÃ²ng xuá»‘ng nÃºt `.button-primary` cuá»‘i cÃ¹ng (`Save` hoáº·c `Save and Add Another`).
    - Náº¿u Ä‘ang á»Ÿ nÃºt `.button-primary` cuá»‘i cÃ¹ng vÃ  báº¥m `Tab` $\rightarrow$ nháº£y vÃ²ng láº¡i vá» input Ä‘áº§u tiÃªn cá»§a dÃ²ng sá»­a.
  - **Nháº£y thÃ´ng minh qua Ã´ Outflow khi thu nháº­p (`ImmediateIncomeSubCategory`)**:
    - Náº¿u giao dá»‹ch cÃ³ Category lÃ  `Inflow: Ready to Assign` (`ImmediateIncomeSubCategory`), khi Ä‘ang á»Ÿ Ã´ `Memo` vÃ  báº¥m `Tab`, con trá» **bá» qua Ã´ Outflow** vÃ  nháº£y tháº³ng vÃ o Ã´ `Inflow`!
  - **Loáº¡i trá»« láº«n nhau giá»¯a `Inflow` vÃ  `Outflow` (`grid-edit.hbs` `onInput`)**:
    - Ngay khi ngÆ°á»i dÃ¹ng gÃµ vÃ o Ã´ `Inflow`, giÃ¡ trá»‹ trong Ã´ `Outflow` tá»± Ä‘á»™ng bá»‹ xÃ³a rá»—ng (`""`) vÃ  ngÆ°á»£c láº¡i.
  - **Focus Trap trÃªn Action Bar khi Ä‘ang chá»n giao dá»‹ch (khÃ´ng sá»­a)**:
    - Náº¿u cÃ³ $\ge 1$ giao dá»‹ch Ä‘ang Ä‘Æ°á»£c tick chá»n (thanh Action Bar mÃ u xanh hiá»ƒn thá»‹ á»Ÿ dÆ°á»›i), báº¥m `Tab` sáº½ Ä‘Æ°a focus vÃ o nÃºt Ä‘áº§u tiÃªn trÃªn Action Bar vÃ  xoay vÃ²ng `Tab` / `Shift + Tab` giá»¯a cÃ¡c nÃºt trong Action Bar.
- **PhÃ­m `Enter` khi Ä‘ang sá»­a giao dá»‹ch**:
  - Náº¿u Ä‘ang á»Ÿ Ã´ `Date`, `Account`: lÆ°u giÃ¡ trá»‹ trÆ°á»ng hiá»‡n táº¡i vÃ  gá»i `focusOnNextField()` (chuyá»ƒn sang Ã´ káº¿ tiáº¿p, bá» qua Ã´ bá»‹ `disabled` nhÆ° Category cá»§a giao dá»‹ch Transfer).
  - Náº¿u Ä‘ang á»Ÿ Ã´ `Payee` hoáº·c `Category`: dropdown `register-payees` / `register-categories` báº¯t `Enter`, chá»n má»¥c Ä‘ang highlight (hoáº·c má»Ÿ form táº¡o Category má»›i / tÃ¡ch Split / chuyá»ƒn sang Payee náº¿u chá»n "Payment or Transfer"), tá»± Ä‘á»™ng Ä‘iá»n Category gá»£i Ã½ theo Payee (`autoFillFieldsBasedOnPayee`), rá»“i gá»i `focusOnNextField()` (náº¿u lÃ  giao dá»‹ch tráº£ tháº» tÃ­n dá»¥ng thÃ¬ nháº£y tháº³ng tá»›i `Memo`).
  - Náº¿u Ä‘ang á»Ÿ Ã´ `Memo`, `Outflow`, hoáº·c `Inflow`: báº¥m `Enter` sáº½ **kÃ­ch hoáº¡t ngay nÃºt `.button-primary-small:last`** (náº¿u Ä‘ang thÃªm giao dá»‹ch má»›i thÃ¬ kÃ­ch hoáº¡t **"Save and Add Another"**, náº¿u Ä‘ang sá»­a giao dá»‹ch cÅ© thÃ¬ kÃ­ch hoáº¡t **"Save"** / **"Approve"**)!
- **PhÃ­m `Escape` khi Ä‘ang sá»­a giao dá»‹ch**:
  - Náº¿u khÃ´ng cÃ³ modal bÃ¡o lá»—i Ä‘ang má»Ÿ, há»§y ngay cháº¿ Ä‘á»™ chá»‰nh sá»­a dÃ²ng (`this.cancel()`).

### 4.3. Äiá»u hÆ°á»›ng trong cÃ¡c Dropdown & Modal Ä‘áº·c biá»‡t
1. **Dropdown tÃ¬m kiáº¿m giao dá»‹ch (`TransactionSearch` - [main.renamed.js](file:///c:/Users/hoang/Desktop/ynabx/unminified/main.renamed.js#L41563-L41570))**:
   - `onKeyDown` gá»i `event.stopPropagation()` Ä‘á»ƒ ngÄƒn phÃ­m mÅ©i tÃªn lÃ m nháº£y dÃ²ng giao dá»‹ch bÃªn dÆ°á»›i.
   - `<down>` / `<up>`: di chuyá»ƒn `selectedIndex` xoay vÃ²ng qua danh sÃ¡ch gá»£i Ã½ (`recommendations`).
   - `<escape>`: Ä‘Ã³ng danh sÃ¡ch gá»£i Ã½ (`cancelRecommendation()`).
   - `<enter>`: chá»n gá»£i Ã½ Ä‘ang highlight (hoáº·c xÃ³a bá»™ lá»c náº¿u Ä‘ang focus nÃºt clear / chuá»—i rá»—ng).
2. **Dropdown danh má»¥c trong Move Money / Cover Overspending (`CategoriesDropdown` - [wrapper.renamed.js](file:///c:/Users/hoang/Desktop/ynabx/unminified/wrapper.renamed.js#L162436-L162453))**:
   - Há»— trá»£ tÃ¬m kiáº¿m má» (fuzzy search), phÃ­m `<up>` / `<down>` di chuyá»ƒn qua cÃ¡c má»¥c khÃ´ng pháº£i tiÃªu Ä‘á» nhÃ³m (`!item.isSectionItem`) vÃ  tá»± Ä‘á»™ng cuá»™n vÃ¹ng `.dropdown-modal-body`, phÃ­m `<enter>` chá»n Category.
   - Trong `MoveMoneyModal` ([wrapper.renamed.js](file:///c:/Users/hoang/Desktop/ynabx/unminified/wrapper.renamed.js#L163344)): náº¿u báº¥m `<enter>` khi nÃºt "OK" cÃ²n bá»‹ disable (chÆ°a Ä‘iá»n Ä‘á»§ sá»‘ tiá»n hoáº·c chÆ°a chá»n Category), focus sáº½ tá»± Ä‘á»™ng nháº£y sang Ã´ `input` cÃ²n láº¡i trong modal! Khi Ä‘Ã£ Ä‘á»§ cáº£ hai, báº¥m `<enter>` thá»±c thi `moveMoney()` ngay.
3. **Modal xÃ¡c nháº­n xÃ³a giao dá»‹ch / gá»™p Split (`DeleteTransactionsWarning`, `ConfirmCategorizingSplits` - [wrapper.renamed.js](file:///c:/Users/hoang/Desktop/ynabx/unminified/wrapper.renamed.js#L158934-L159005))**:
   - Cho phÃ©p xÃ¡c nháº­n xÃ³a nhanh báº±ng `<enter>` **HOáº¶C** `Ctrl/Cmd + Backspace/Delete` (`"<delete>" === e && (event.metaKey || event.ctrlKey)`), vÃ  há»§y báº±ng `<escape>`.
4. **Focus Trap & Enter Submit trong Base Modal (`Modal` - [wrapper.renamed.js](file:///c:/Users/hoang/Desktop/ynabx/unminified/wrapper.renamed.js#L158646-L158696))**:
   - Khi má»Ÿ modal, tá»± Ä‘á»™ng focus vÃ o pháº§n tá»­ `.js-focus-on-start`.
   - `onFocusTrap`: Giá»¯ vÃ²ng láº·p `Tab` / `Shift + Tab` bÃªn trong cÃ¡c pháº§n tá»­ kháº£ dá»¥ng (`button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])`) cá»§a modal.
   - `onKeyPress`: Khi báº¥m `Enter` (trá»« khi truyá»n `@preventActionOnEnter`), tá»± Ä‘á»™ng tÃ¬m vÃ  click `.button-primary` hoáº·c `button.primary` náº¿u nÃºt Ä‘Ã³ khÃ´ng bá»‹ disabled.
5. **Ghi chÃº thÃ¡ng ngÃ¢n sÃ¡ch (`BudgetMonthTextarea` - [wrapper.renamed.js](file:///c:/Users/hoang/Desktop/ynabx/unminified/wrapper.renamed.js#L163406-L163420))**:
   - `Enter` (khÃ´ng giá»¯ `Shift`): lÆ°u ghi chÃº ngay (`this.args.save()`).
   - `Shift + Enter`: xuá»‘ng dÃ²ng má»›i trong textarea vÃ  tá»± Ä‘á»™ng giÃ£n chiá»u cao (`_autogrow()`).
   - `Escape`: há»§y chá»‰nh sá»­a ghi chÃº (`this.args.cancel()`).
6. **Há»‡ thá»‘ng Toast Máº¹o PhÃ­m Táº¯t (`ToastService` - [wrapper.renamed.js](file:///c:/Users/hoang/Desktop/ynabx/unminified/wrapper.renamed.js#L200344))**:
   - Khi ngÆ°á»i dÃ¹ng thá»±c hiá»‡n thao tÃ¡c báº±ng **chuá»™t** (`"click" == e?.type`) Ä‘á»‘i vá»›i cÃ¡c hÃ nh Ä‘á»™ng nhÆ° Approve, Match, Split, Snooze Target, YNAB hiá»ƒn thá»‹ má»™t Toast nhá» á»Ÿ gÃ³c dÆ°á»›i: *"Keyboard Tip: Press [A] to approve..."* kÃ¨m component `<ShortcutKeys>` Ä‘á»ƒ huáº¥n luyá»‡n ngÆ°á»i dÃ¹ng dÃ¹ng phÃ­m táº¯t.

---

## 5. So SÃ¡nh Khoáº£ng CÃ¡ch Hiá»‡n Táº¡i (Gap Analysis) Trong Dá»± Ãn

Qua kiá»ƒm tra mÃ£ nguá»“n hiá»‡n táº¡i trong [clone/](file:///c:/Users/hoang/Desktop/ynabx/clone) vÃ  [frontend/](file:///c:/Users/hoang/Desktop/ynabx/frontend):
- [clone/src/components/modals/KeyboardShortcutsModal.tsx](file:///c:/Users/hoang/Desktop/ynabx/clone/src/components/modals/KeyboardShortcutsModal.tsx) vÃ  [frontend/src/components/modals/KeyboardShortcutsModal.tsx](file:///c:/Users/hoang/Desktop/ynabx/frontend/src/components/modals/KeyboardShortcutsModal.tsx) hiá»‡n má»›i chá»‰ lÃ  báº£ng táº¡m (7â€“9 dÃ²ng tÄ©nh, dÃ¹ng phÃ­m giáº£ nhÆ° `/` hoáº·c `R` thay vÃ¬ Ä‘Ãºng chuáº©n Ember lÃ  `?`, `Shift+E`, `Ctrl/Cmd+Shift+F`, vÃ  chÆ°a chia thÃ nh 4 phÃ¢n vÃ¹ng `Universal`, `Plan Actions`, `Account Actions`, `Date Picker` kÃ¨m banner báº­t/táº¯t `disableKeyboardShortcuts`).
- ChÆ°a cÃ³ dá»‹ch vá»¥ Ä‘iá»u phá»‘i trung tÃ¢m tÆ°Æ¡ng Ä‘Æ°Æ¡ng `KeyboardShortcutsService` vá»›i cÆ¡ cháº¿ LIFO priority stack (`stopOtherShortcuts`) vÃ  bá»™ chuáº©n hÃ³a phÃ­m (`isShiftedKey`).
- Nhiá»u phÃ­m táº¯t thao tÃ¡c nhanh trÃªn lÆ°á»›i Budget (`â†‘/â†“`, `Shift+â†‘/â†“`, `Ctrl/Cmd+â†‘/â†“`, `Ctrl/Cmd+A`, `Shift+Z`), trÃªn Account Register (`Shift+N`, `A`, `Shift+L`, `Shift+R`, `K`, `S`, `E`, `M`, `Shift+U`, `C`, `Shift+D`, `Shift+F` $\rightarrow$ `0-6`, `Shift+T`, `Shift+E`) vÃ  trong Date Picker (`+`, `-`, `T`, `M`, `Shift+M`, `Y`, `Shift+Y`/`R`) chÆ°a Ä‘Æ°á»£c káº¿t ná»‘i Ä‘áº§y Ä‘á»§.

---

## Open Questions

> [!IMPORTANT]
> Báº¡n muá»‘n bÆ°á»›c tiáº¿p theo sau báº£n phÃ¢n tÃ­ch nÃ y lÃ  gÃ¬?
> 1. **LÆ°u thÃ nh tÃ i liá»‡u Ä‘áº·c táº£ ká»¹ thuáº­t** (vÃ­ dá»¥ `docs/KEYBOARD_SHORTCUTS_UX.md`) Ä‘á»ƒ lÃ m tÃ i liá»‡u tham chiáº¿u Reverse Engineering chuáº©n?
> 2. **Triá»ƒn khai toÃ n bá»™ há»‡ thá»‘ng PhÃ­m táº¯t & UX bÃ n phÃ­m chuáº©n Ember vÃ o `clone/`** (hoáº·c `frontend/`): bao gá»“m `KeyboardShortcutsService` (LIFO stack + `disableKeyboardShortcuts`), component `<ShortcutKeys>`, `KeyboardShortcutsModal` chuáº©n 4 nhÃ³m tá»« `modals/keyboard-shortcuts/index.hbs`, vÃ  Ä‘áº§y Ä‘á»§ phÃ­m táº¯t cho Budget Table, Account Register, Action Bar, Date Picker?

---

## Proposed Changes (Náº¿u thá»±c hiá»‡n triá»ƒn khai code & tÃ i liá»‡u)

### 1. TÃ i liá»‡u Reverse Engineering (`docs/`)
#### [NEW] [KEYBOARD_SHORTCUTS_UX.md](file:///c:/Users/hoang/Desktop/ynabx/docs/KEYBOARD_SHORTCUTS_UX.md)
- LÆ°u trá»¯ toÃ n bá»™ káº¿t quáº£ giáº£i mÃ£ kiáº¿n trÃºc 2 táº§ng, báº£ng 57 `SHORTCUT_DEFINITIONS`, quy táº¯c `isShiftedKey`, LIFO Signal stack vÃ  luá»“ng Ä‘iá»u hÆ°á»›ng chi tiáº¿t tá»«ng mÃ n hÃ¬nh.

---

### 2. Dá»‹ch vá»¥ & Component PhÃ­m táº¯t Trung tÃ¢m (`clone/src/`)
#### [NEW] [keyboardShortcuts.ts](file:///c:/Users/hoang/Desktop/ynabx/clone/src/services/keyboardShortcuts.ts)
- Port nguyÃªn báº£n `KeyboardShortcut` enum (`Ex`), `SHORTCUT_DEFINITIONS` (`Dx`), hÃ m chuáº©n hÃ³a phÃ­m (`normalizeKey`, `isShiftedKey`), vÃ  bá»™ Ä‘iá»u phá»‘i Æ°u tiÃªn LIFO (`registerShortcut`, `stopOtherShortcuts`, throttle 100ms, cá» `disableKeyboardShortcuts`).

#### [NEW] [ShortcutKeys.tsx](file:///c:/Users/hoang/Desktop/ynabx/clone/src/components/core/ShortcutKeys.tsx)
- Port component `components/keyboard-shortcuts/shortcut-keys/index.hbs` (`<div class="shortcut-keys"><div class="shortcut-key">...</div></div>`) tá»± Ä‘á»™ng hiá»ƒn thá»‹ theo OS (`macOS` vs `all`) vÃ  áº©n khi `disableKeyboardShortcuts` báº­t.

#### [MODIFY] [KeyboardShortcutsModal.tsx](file:///c:/Users/hoang/Desktop/ynabx/clone/src/components/modals/KeyboardShortcutsModal.tsx)
- Cáº­p nháº­t Ä‘Ãºng cáº¥u trÃºc Glimmer template `components/modals/keyboard-shortcuts/index.hbs` (`@size="large"`, há»™p cáº£nh bÃ¡o `ynab-helpbox` khi phÃ­m táº¯t bá»‹ táº¯t kÃ¨m nÃºt `Enable Shortcuts`, vÃ  4 danh sÃ¡ch `Universal`, `Plan Actions`, `Account Actions`, `Date Picker` sá»­ dá»¥ng `<ShortcutKeys @alwaysShow={true} />`).

---

### 3. Káº¿t ná»‘i PhÃ­m táº¯t vÃ o cÃ¡c PhÃ¢n há»‡ UI (`clone/src/`)
#### [MODIFY] [App.tsx](file:///c:/Users/hoang/Desktop/ynabx/clone/src/App.tsx)
- ÄÄƒng kÃ½ cÃ¡c phÃ­m táº¯t toÃ n cá»¥c: `?` (`OpenShortcutHelpModal`), `>` (`ToggleSidebar`), `Ctrl/Cmd+Z` (`Undo`), `Ctrl/Cmd+Shift+Z` / `Ctrl/Cmd+Y` (`Redo`), `Ctrl/Cmd+Shift+F` (`FocusSearch`), vÃ  phÃ­m táº¯t trÃªn Budget Table (`â†‘/â†“`, `Shift+â†‘/â†“`, `Ctrl/Cmd+â†‘/â†“`, `Ctrl/Cmd+A`, `Esc`, `Shift+Z`) cÃ¹ng Account Register (`Shift+N`, `C`, `A`, `Shift+L`, `Shift+R`, `K`, `S`, `E`, `M`, `Shift+U`, `Shift+D`, `Shift+F` + `0..6`, `Shift+T`, `Delete/Backspace`, `Shift+E`).

#### [MODIFY] [DatePickerPopover.tsx](file:///c:/Users/hoang/Desktop/ynabx/clone/src/components/accounts/DatePickerPopover.tsx)
- Bá»• sung Ä‘áº§y Ä‘á»§ cÃ¡c phÃ­m táº¯t lá»‹ch: `+`/`â†’`/`=`, `-`/`â†` (cÃ³ kiá»ƒm tra format ngÃ y chá»©a `-`), `â†“`/`â†‘` (Â±1 tuáº§n), `T` (Today), `M` / `Shift+M` (Ä‘áº§u/cuá»‘i thÃ¡ng), `Y` / `Shift+Y` / `R` (Ä‘áº§u/cuá»‘i nÄƒm).

---

## Verification Plan

### Automated Tests
- Cháº¡y kiá»ƒm tra typecheck vÃ  build cho á»©ng dá»¥ng thÃ´ng qua lá»‡nh chuáº©n hoáº·c script kiá»ƒm thá»­:
  - Kiá»ƒm tra biÃªn dá»‹ch TypeScript (`npm run build` trong `clone/` hoáº·c `make check`).
  - Viáº¿t unit test kiá»ƒm chá»©ng bá»™ chuáº©n hÃ³a phÃ­m (`normalizeKey`, `isShiftedKey` vá»›i `?`, `>`), thá»© tá»± Æ°u tiÃªn LIFO vÃ  `stopOtherShortcuts()`.

### Manual Verification
- Nháº¥n `?` á»Ÿ báº¥t ká»³ mÃ n hÃ¬nh nÃ o (khi khÃ´ng gÃµ input) Ä‘á»ƒ má»Ÿ/Ä‘Ã³ng `KeyboardShortcutsModal` vÃ  Ä‘á»‘i chiáº¿u giao diá»‡n 4 nhÃ³m vá»›i Ember gá»‘c.
- Nháº¥n `Shift + .` (`>`) Ä‘á»ƒ Ä‘Ã³ng/má»Ÿ Sidebar.
- TrÃªn báº£ng Budget: nháº¥n `â†‘`/`â†“` Ä‘á»ƒ nháº£y liÃªn tiáº¿p giá»¯a cÃ¡c Ã´ `Assigned`, gÃµ `+ 50 Enter` Ä‘á»ƒ tÃ­nh toÃ¡n cá»™ng dá»“n, `Shift + â†‘/â†“` Ä‘á»ƒ chá»n nhiá»u dÃ²ng, `Ctrl/Cmd + â†‘/â†“` Ä‘á»ƒ Ä‘Ã³ng/má»Ÿ táº¥t cáº£ nhÃ³m.
- TrÃªn báº£ng Account Register: kiá»ƒm tra `Shift + N` (thÃªm giao dá»‹ch), `â†‘`/`â†“` (di chuyá»ƒn dÃ²ng), `C` (Ä‘á»•i Cleared), `K` (categorize), `Shift + F` rá»“i báº¥m `1`â€“`6` (gáº¯n cá» mÃ u), vÃ  cÃ¡c phÃ­m táº¯t trong Date Picker (`T`, `M`, `Shift+M`, `Y`, `Shift+Y`, `+`, `-`).
