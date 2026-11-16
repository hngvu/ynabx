# Comprehensive Desktop Application Release Audit & Windows Packaging Readiness Report

**Application Target:** `desktop/` (`ynab-desktop` v0.2.0)  
**Host Environment:** Windows 10 / 11 x64  
**Audit Date:** November 16, 2026  
**Auditor:** Teamwork Lead Audit Worker (`worker_1`)  
**Audit Scope:** Full Desktop Codebase, Tauri Native Shell & Rust Engine, React/TypeScript Frontend, Verification Scripts, and Windows Installer Packaging Pipelines  
**Overall Release Readiness:** ❌ **NOT READY FOR WINDOWS RELEASE OR PUBLISHING**

---

## 1. Executive Summary & Architecture Overview

### 1.1 Executive Summary

An exhaustive, multi-dimensional code audit and verification analysis of the `desktop/` application codebase in the `ynabx` repository was conducted to assess its completeness, stability, security posture, and readiness for Windows desktop distribution.

The audit examined every layer of the desktop application: the React 18 / TypeScript single-page application (`desktop/src/`), the Tauri v2 desktop container and Cargo configuration (`desktop/src-tauri/`), the underlying SQLite ledger persistence layer (`rusqlite`), and the Windows installer generation pipelines utilizing the WiX Toolset (`.msi`) and NSIS (`.exe`).

The desktop application demonstrates remarkable engineering strengths in its core calculation engine: the Rust backend faithfully reproduces YNAB's complex zero-based envelope budgeting invariants—including two-pass credit card payment movements, Ready-to-Assign (RTA) timeline rollovers, cash vs. credit overspending reset rules, and sparse index sort ordering (all 10 domain calculation unit tests pass cleanly). Furthermore, all 311 TypeScript modules in the frontend pass strict static typechecking (`tsc --noEmit`) without errors.

However, the desktop application is **strictly NOT ready for Windows release or general publishing**. The application is barred by **8 Critical Blockers**, accompanied by **14 High Severity**, **14 Medium Severity**, and **6 Low Severity** defects (42 itemized findings in total).

```
┌────────────────────────────────────────────────────────────────────────┐
│                        RELEASE READINESS SUMMARY                       │
├─────────────────────┬─────────┬────────────────────────────────────────┤
│ Severity Level      │ Count   │ Primary Impact                         │
├─────────────────────┼─────────┼────────────────────────────────────────┤
│ 🔴 BLOCKER          │    8    │ App crash on launch, data destruction, │
│                     │         │ startup data duplication, CI failures  │
│ 🟠 HIGH SEVERITY    │   14    │ Broken transfer/reconciliation IPC, CC │
│                     │         │ calculation errors, SmartScreen block  │
│ 🟡 MEDIUM SEVERITY  │   14    │ Incomplete modals, memory leaks, theme │
│                     │         │ settings ignored, division by zero     │
│ 🔵 LOW SEVERITY     │    6    │ Dead code warnings, hardcoded dates,   │
│                     │         │ missing app metadata, stubbed alerts   │
├─────────────────────┼─────────┼────────────────────────────────────────┤
│ TOTAL DEFECTS       │   42    │ RELEASE STATUS: ❌ REJECTED            │
└─────────────────────┴─────────┴────────────────────────────────────────┘
```

#### Key Release Blockers:
1. **Immediate Startup Crash in Production (`main.rs:24`)**: The SQLite database connection is opened using a bare relative path (`"ynab_desktop.sqlite"`). When deployed via standard Windows per-machine installers (`.msi` or `.exe`), the executable runs from `C:\Program Files\YNAB Desktop\`. Standard Windows users lack write permissions to `Program Files`, causing an unhandled Rust panic (`Access is denied (os error 5)`) that terminates the application before any window can render.
2. **Perpetual Startup Data Duplication (`main.rs:26-27` & `seed.rs:23-152`)**: On every application startup, `seed_new_budget` unconditionally executes and generates random UUIDs for envelope category groups, subcategories, and system payees into SQLite tables lacking unique constraints. As a result, every launch multiplies categories and payees indefinitely in the user's database.
3. **Missing Tauri v2 Window Capabilities (`src-tauri/capabilities/`)**: The `capabilities/` directory does not exist. Under Tauri v2's strict Access Control List (ACL) security architecture, webviews without explicit capability grants cannot invoke Tauri commands or plugin APIs.
4. **Broken Verification Lint Script (`package.json:12`)**: `npm run lint` fails immediately with exit code 1 because `eslint` is missing from `devDependencies`, no ESLint configuration file exists, and the script references obsolete command-line flags.
5. **Failing Test Verification (`package.json:10`)**: `npm run test` fails immediately with exit code 1 because zero test files exist in `desktop/src/`, and Vitest defaults to interactive watch mode rather than single-run CI execution.
6. **Data Destruction on Category Hide (`BudgetWorkspace.tsx:561-567`)**: Clicking "Hide Category" invokes `deleteCategory()` via Tauri IPC, permanently erasing the user's category envelope and historical allocation from SQLite rather than toggling `is_hidden`.
7. **Data Destruction on Account Close (`App.tsx:449-453`)**: Confirming an account closure in the modal invokes `handleDeleteAccount()`, which calls `deleteAccount()` and erases the entire account record and all historical transactions, breaking net worth and audit trails.
8. **Categorization Workflow Blocked (`App.tsx:308, 471`)**: `App.tsx` passes an empty hardcoded array `INITIAL_CATEGORY_GROUPS = []` to the transaction register workspaces. Categories are never loaded from SQLite into the accounts view, making it impossible to assign categories to transactions.

---

### 1.2 Target Architecture

The desktop application is built as a hybrid desktop container:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        YNABX DESKTOP ARCHITECTURE                      │
├────────────────────────────────────────────────────────────────────────┤
│  Frontend Presentation Layer (React 18 + TypeScript + Vite)            │
│  - Single-Page Application running inside OS WebView2 (Edge Chromium)  │
│  - Replicates YNAB Ember UI styles, keyboard navigation, popovers      │
│  - Communicates with native shell via @tauri-apps/api/core IPC         │
├──────────────────────────────────┬─────────────────────────────────────┤
│  IPC Bridge (tauriBridge.ts)     │  Tauri v2 ACL Capabilities (MISSING)│
├──────────────────────────────────┴─────────────────────────────────────┤
│  Native Shell & Calculation Engine (Rust 2021 + Cargo)                 │
│  - Tauri v2 runtime (`tauri` v2.12.5, `tao`, `wry`)                    │
│  - Zero-based envelope budgeting math engine (`src-tauri/src/calc/`)   │
│  - Sparse fractional indexing for reordering (`sortable_index.rs`)     │
│  - In-process SQLite database (`rusqlite`) holding full ledger state   │
├────────────────────────────────────────────────────────────────────────┤
│  Windows Packaging & Distribution Layer                                │
│  - WiX Toolset v3.14 (.msi) & NSIS v3.10 (.exe)                        │
│  - Microsoft Defender SmartScreen & Authenticode signing (MISSING)     │
│  - Auto-Updater via ed25519 signatures (UNCONFIGURED)                  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Verification Against Project Quality Checks

Every project verification script defined in `desktop/package.json`, Cargo manifests, and Tauri CLI was executed and evaluated. The table below presents the verified results:

| Verification Script | Command Executed | Toolchain / Binary | Exit Code | Verification Status | Operational Notes |
|:---|:---|:---|:---:|:---:|:---|
| **TypeScript Typecheck** | `npm run typecheck` | `tsc --noEmit` (TS 5.8.2) | `0` | **PASS** | 311 TypeScript modules checked with 0 errors. Strict mode enabled. |
| **Code Style & Linting** | `npm run lint` | `eslint . --ext ts,tsx` | `1` | ❌ **FAIL** | Binary not found; missing from `devDependencies`; missing config; deprecated flags. |
| **Unit / Integration Tests** | `npm run test` | `vitest` / `npx vitest run` | `1` | ❌ **FAIL** | Zero test files exist in `desktop/src/`. Exits code 1; lacks `--run` flag. |
| **Frontend Production Build** | `npm run build` | `tsc -b && vite build` | `0` | ⚠️ **PASS (Warnings)** | Built in 2.63s. 40+ missing static asset warnings; CSS syntax typo warning. |
| **Rust Backend Tests** | `cargo test` | `cargo test` (Rust 1.99.1) | `0` | ⚠️ **PASS (Warnings)** | 10 unit tests pass. 12 dead code / unused variable compiler warnings. |
| **Tauri System Diagnostics** | `npx tauri info` | `@tauri-apps/cli` 2.12.4 | `0` | **PASS** | Captured WebView2, GNU toolchain; flagged missing MSVC build tools. |
| **Windows Release Packaging** | `npx tauri bundle` | WiX v3 & NSIS v3.10 | `0` | ⚠️ **PASS (Unsigned)** | Generated `.msi` (11.28 MiB) and `.exe` (8.78 MiB). Missing code signing. |

---

### 2.1 Check 1: TypeScript Static Typecheck (`npm run typecheck`)

- **Command:** `npm run typecheck`
- **Underlying Configuration:** `desktop/tsconfig.json`
- **Working Directory:** `c:\Users\hoang\Desktop\ynabx\desktop`
- **Exit Code:** `0` (Success)
- **Verbatim Output:**
```
> ynab-desktop@0.2.0 typecheck
> tsc --noEmit
```
- **Technical Evaluation:**
  - `tsconfig.json` specifies `"target": "ES2020"`, `"module": "ESNext"`, `"jsx": "react-jsx"`, and `"strict": true`.
  - All 311 TypeScript modules in `desktop/src/` passed type checking without a single compile-time type mismatch.
  - Interface contracts between components, utility functions, and `tauriBridge.ts` are internally consistent in type definitions.

---

### 2.2 Check 2: Code Style & Linting (`npm run lint`)

- **Command:** `npm run lint`
- **Underlying Script (`package.json:12`):** `"eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0"`
- **Working Directory:** `c:\Users\hoang\Desktop\ynabx\desktop`
- **Exit Code:** `1` (Failure)
- **Verbatim Failure Output:**
```
> ynab-desktop@0.2.0 lint
> eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0

'eslint' is not recognized as an internal or external command,
operable program or batch file.
```
- **Root Cause & Gap Analysis:**
  1. `eslint` is absent from `desktop/package.json`'s `devDependencies`.
  2. `desktop/node_modules/.bin/eslint` does not exist on disk.
  3. No ESLint configuration file (`eslint.config.js` or `.eslintrc.*`) exists in `desktop/`.
  4. The command uses `--ext ts,tsx`, which was removed in ESLint v9's flat config format (used by `frontend/eslint.config.js`).

---

### 2.3 Check 3: Automated Unit & Component Testing (`npm run test`)

- **Command:** `npm run test` / `npx vitest run`
- **Underlying Script (`package.json:10`):** `"test": "vitest"`
- **Working Directory:** `c:\Users\hoang\Desktop\ynabx\desktop`
- **Exit Code:** `1` (Failure)
- **Verbatim Failure Output:**
```
 RUN  v3.2.7 C:/Users/hoang/Desktop/ynabx/desktop

No test files found, exiting with code 1

include: **/*.{test,spec}.?(c|m)[jt]s?(x)
exclude:  **/node_modules/**, **/dist/**, **/cypress/**, **/.{idea,git,cache,output,temp}/**, **/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*
```
- **Root Cause & Gap Analysis:**
  1. Recursive search across `desktop/src/` confirms that **zero** test files (`*.test.ts`, `*.test.tsx`, `*.spec.ts`) exist. The frontend has 0% automated test coverage.
  2. `package.json` defines `"test": "vitest"`. When executed without `--run`, Vitest enters interactive watch mode, which indefinitely hangs automated CI/CD runners if tests were present.

---

### 2.4 Check 4: Production Frontend Asset Build (`npm run build`)

- **Command:** `npm run build`
- **Underlying Script (`package.json:8`):** `"tsc -b && vite build"`
- **Working Directory:** `c:\Users\hoang\Desktop\ynabx\desktop`
- **Exit Code:** `0` (Success with build warnings)
- **Verbatim Output Trace:**
```
> ynab-desktop@0.2.0 build
> tsc -b && vite build

vite v6.4.6 building for production...
transforming...

/images/admin/close-icon.svg referenced in /images/admin/close-icon.svg didn't resolve at build time, it will remain unchanged to be resolved at runtime
/images/admin/sort-icon.svg referenced in /images/admin/sort-icon.svg didn't resolve at build time, it will remain unchanged to be resolved at runtime
/images/admin/ynab-logo.svg referenced in /images/admin/ynab-logo.svg didn't resolve at build time, it will remain unchanged to be resolved at runtime
/images/avatar/pattern-five.svg referenced in /images/avatar/pattern-five.svg didn't resolve at build time, it will remain unchanged to be resolved at runtime
/images/category-set-wizard/aleta.webp referenced in /images/category-set-wizard/aleta.webp didn't resolve at build time, it will remain unchanged to be resolved at runtime
xxii-0b9abade547cc7e067ce6a14d0eefbcf02d599eec0d637141661bf70573cdfb0.eot referenced in xxii-0b9abade547cc7e067ce6a14d0eefbcf02d599eec0d637141661bf70573cdfb0.eot didn't resolve at build time, it will remain unchanged to be resolved at runtime
WishFarm-SemiBold-602d8ec77dce60f654e09b2fdab3f8e68a14321e9e922e46094789cdfad9c550.otf referenced in WishFarm-SemiBold-602d8ec77dce60f654e09b2fdab3f8e68a14321e9e922e46094789cdfad9c550.otf didn't resolve at build time, it will remain unchanged to be resolved at runtime

✓ 311 modules transformed.
[esbuild css minify]
▲ [WARNING] "align-itmes" is not a known CSS property [unsupported-css-property]

    <stdin>:18:107050:
      18 │ ...to-be-me-summary .actions{align-itmes:flex-start;flex-direction...
         │                              ~~~~~~~~~~~
         ╵                              align-items

  Did you mean "align-items" instead?

rendering chunks...
computing gzip size...
dist/index.html                 287.31 kB │ gzip:  92.31 kB
dist/assets/index-CY-QQuKy.css  948.56 kB │ gzip: 133.02 kB
dist/assets/index-D9N9MYjd.js   991.60 kB │ gzip: 278.07 kB

(!) Some chunks are larger than 500 kB after minification.
✓ built in 2.63s
```
- **Technical Evaluation:**
  - Build succeeds in bundling HTML, CSS, and JS into `desktop/dist/`.
  - **Asset 404 Defect:** 40+ static SVG illustrations, avatar patterns, wizard images, and web fonts referenced in `ynab_original_bundled.css` are completely absent from `desktop/public/`. In the running application, any UI invoking these paths displays broken image icons or font fallbacks.
  - **CSS Syntax Error:** `align-itmes` typo at `ynab_original_bundled.css:18:107050`.
  - **Bundle Performance Warning:** Single JS bundle (`index-D9N9MYjd.js`) is 991.6 kB (exceeding recommended chunk limits).

---

### 2.5 Check 5: Rust Backend Compilation & Unit Testing (`cargo test`)

- **Command:** `cargo test`
- **Working Directory:** `c:\Users\hoang\Desktop\ynabx\desktop\src-tauri`
- **Exit Code:** `0` (Success with compiler warnings)
- **Verbatim Output Trace:**
```
   Compiling ynab-desktop v0.2.0 (C:\Users\hoang\Desktop\ynabx\desktop\src-tauri)
warning: fields `master_category_id` and `activity` are never read (src\calc\auto_assign.rs:32:9)
warning: struct `GoalPeriod` is never constructed (src\calc\goals_calc.rs:24:12)
warning: multiple fields are never read (src\calc\goals_calc.rs:38:9)
warning: function `format_ym` is never used (src\calc\goals_calc.rs:77:8)
warning: function `calculate_current_goal_period` is never used (src\calc\goals_calc.rs:128:8)
warning: field `budget_id` is never read (src\commands.rs:1267:9, 1317:9, 1353:9, 1379:9)
warning: enum `AutoCategorizeReason` is never used (src\ledger\payee_autocat.rs:8:10)
warning: function `compute_payee_auto_categorization` is never used (src\ledger\payee_autocat.rs:16:8)
warning: function `update_payee_autofill_category` is never used (src\ledger\payee_autocat.rs:81:8)
warning: `ynab-desktop` (bin "ynab-desktop" test) generated 12 warnings
    Finished `test` profile [unoptimized + debuginfo] target(s) in 2.13s
     Running unittests src\main.rs (target\debug\deps\ynab_desktop-19d198a5927a1971.exe)

running 10 tests
test calc::auto_assign::tests::test_underfunded_priority_sorting ... ok
test calc::goals_calc::tests::test_ccpc_underfunded ... ok
test calc::goals_calc::tests::test_day_of_week_and_weekly_goal ... ok
test calc::goals_calc::tests::test_monthly_funding_goal ... ok
test calc::monthly_calc::tests::test_stealing_from_the_future ... ok
test calc::monthly_calc::tests::test_cash_overspent_deduction_in_next_month ... ok
test sortable_index::tests::test_midpoint_no_gap ... ok
test calc::subcategory_calc::tests::test_cash_first_and_multi_credit_card_chronological ... ok
test sortable_index::tests::test_midpoint_empty_or_open_ended ... ok
test sortable_index::tests::test_midpoint_with_gap ... ok

test result: ok. 10 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s
```
- **Technical Evaluation:**
  - All 10 domain logic tests pass in under 1 millisecond.
  - The tests rigorously exercise:
    * `test_stealing_from_the_future`: Verified RTA timeline reductions when future months are over-budgeted.
    * `test_cash_overspent_deduction_in_next_month`: Verified that cash overspending resets to 0 and docks next month's RTA.
    * `test_cash_first_and_multi_credit_card_chronological`: Verified 2-pass credit card payment transfers.
    * `test_midpoint_*`: Verified sparse integer index midpoint calculations for drag-and-drop category/account reordering.
  - 12 compiler warnings indicate dead code and unread fields in goals, payee auto-categorization, and command parameter structs.

---

### 2.6 Check 6: Tauri System Diagnostics (`npx tauri info`)

- **Command:** `npx tauri info`
- **Working Directory:** `c:\Users\hoang\Desktop\ynabx\desktop`
- **Exit Code:** `0`
- **Verbatim Output Trace:**
```
[✘] Environment
    - OS: Windows 10.0.26200 x86_64 (X64)
    ✔ WebView2: 157.0.4341.57
    ✘ Couldn't detect any Visual Studio or VS Build Tools instance with MSVC and SDK components. Download from https://aka.ms/vs/17/release/vs_BuildTools.exe
    ✔ rustc: 1.99.1 (58cf8f9c3 2026-10-13)
    ✔ cargo: 1.99.1 (5f94df478 2026-08-27)
    ✔ rustup: 1.29.3 (edbc831ce 2026-11-02)
    ✔ Rust toolchain: stable-x86_64-pc-windows-gnu (default)
    - node: 22.16.0
    - pnpm: 11.2.2
    - npm: 11.4.1

[-] Packages
    - tauri 🦀: 2.12.5
    - tauri-build 🦀: 2.7.4
    - wry 🦀: 0.57.1, (outdated, latest: 0.57.2)
    - tao 🦀: 0.37.2
    - @tauri-apps/api  ⱼₛ: 2.12.4
    - @tauri-apps/cli  ⱼₛ: 2.12.4

[-] Plugins

[-] App
    - build-type: bundle
    - CSP: unset
    - frontendDist: ../dist
    - devUrl: http://localhost:5173/
    - framework: React
    - bundler: Vite
```
- **Technical Evaluation:**
  - Host OS has valid Evergreen WebView2 runtime installed (`157.0.4341.57`).
  - Active toolchain is `stable-x86_64-pc-windows-gnu`. For official Windows desktop software distribution, Microsoft recommends compiling with the `x86_64-pc-windows-msvc` target with MSVC C++ runtime dependencies.
  - Tauri CLI flagged `CSP: unset` (Content Security Policy disabled).

---

### 2.7 Check 7: Windows Release Bundler Execution (`npx tauri bundle`)

- **Command:** `npx tauri bundle`
- **Working Directory:** `c:\Users\hoang\Desktop\ynabx\desktop`
- **Exit Code:** `0` (Success)
- **Verbatim Output Trace:**
```
        Info Patching C:\Users\hoang\Desktop\ynabx\desktop\src-tauri\target\release\ynab-desktop.exe with bundle type information: msi
        Info Target: x64
     Running candle for "C:\\Users\\hoang\\Desktop\\ynabx\\desktop\\src-tauri\\target\\release\\wix\\x64\\main.wxs"
     Running light to produce C:\Users\hoang\Desktop\ynabx\desktop\src-tauri\target\release\bundle\msi\YNAB Desktop_0.2.0_x64_en-US.msi
        Info Patching C:\Users\hoang\Desktop\ynabx\desktop\src-tauri\target\release\ynab-desktop.exe with bundle type information: nsis
        Info Target: x64
     Running makensis to produce C:\Users\hoang\Desktop\ynabx\desktop\src-tauri\target\release\bundle\nsis\YNAB Desktop_0.2.0_x64-setup.exe
    Finished 2 bundles at:
        C:\Users\hoang\Desktop\ynabx\desktop\src-tauri\target\release\bundle\msi\YNAB Desktop_0.2.0_x64_en-US.msi (11.28 MiB)
        C:\Users\hoang\Desktop\ynabx\desktop\src-tauri\target\release\bundle\nsis\YNAB Desktop_0.2.0_x64-setup.exe (8.78 MiB)
```
- **Technical Evaluation:**
  - WiX Toolset v3 (`candle.exe`, `light.exe`) and NSIS (`makensis.exe`) successfully executed to generate both standard Windows distribution packages:
    * MSI Installer: `YNAB Desktop_0.2.0_x64_en-US.msi` (11.28 MiB)
    * NSIS Setup: `YNAB Desktop_0.2.0_x64-setup.exe` (8.78 MiB)
  - Crucial Discovery: While both installers compile cleanly, **neither package can run successfully on a standard Windows user desktop** because the packaged `ynab-desktop.exe` attempts to write `ynab_desktop.sqlite` to `C:\Program Files\YNAB Desktop\`, crashing instantly on launch. Furthermore, both packages are unsigned and blocked by SmartScreen.

---

## 3. Windows Installer Packaging Readiness & Configuration Validation

A line-by-line validation of `desktop/src-tauri/tauri.conf.json` and associated native configuration files was conducted.

### 3.1 Application Identity, Metadata & Window Configuration

```json
{
  "$schema": "https://raw.githubusercontent.com/tauri-apps/tauri/dev/crates/tauri-cli/schema.json",
  "productName": "YNAB Desktop",
  "version": "0.2.0",
  "identifier": "com.ynabx.desktop",
  "build": {
    "beforeDevCommand": "npm run dev",
    "devUrl": "http://localhost:5173",
    "beforeBuildCommand": "npm run build",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [
      {
        "title": "YNAB Desktop",
        "width": 1366,
        "height": 850,
        "minWidth": 900,
        "minHeight": 600,
        "resizable": true,
        "fullscreen": false,
        "dragDropEnabled": false
      }
    ],
    "security": {
      "csp": null
    }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [
      "icons/icon.ico"
    ]
  }
}
```

#### Deficiencies Identified:
1. **Missing Window Label (`tauri.conf.json:14-23`):** The primary window object lacks an explicit `"label": "main"`. Window references in code (`app.get_webview_window("main")`) rely on default convention rather than explicit binding.
2. **Missing Center Coordinate Positioning (`tauri.conf.json:14-23`):** `"center": true` is omitted. When launched on multi-monitor systems or high-DPI displays, the window spawns at arbitrary OS-cascaded coordinates, frequently clipping outside viewport boundaries.
3. **White Flash on Startup (`tauri.conf.json:14-23`):** `"visible": false` is omitted. On slower Windows machines, the webview window displays a pure white rectangle for 200–800ms before Vite mounts the React DOM. Best practice requires creating the window hidden and calling `window.show()` once the frontend dispatches its initial mount event.
4. **Missing Publisher & Metadata Attributes (`tauri.conf.json:1-6, 29-35`):** Root and bundle blocks omit `publisher`, `copyright`, `shortDescription`, `longDescription`, and `category`. When installed on Windows, the application displays as "Unknown Publisher" in Windows Settings -> Apps & Features and the Volume Mixer.

---

### 3.2 Tauri v2 Capabilities & Permissions Architecture Gap

In Tauri v2, window permissions are strictly enforced by the Access Control List (ACL) capability system.
- **Direct Observation:** The directory `desktop/src-tauri/capabilities/` does not exist (`Test-Path` returned `False`).
- **Impact:** `desktop/src-tauri/gen/schemas/capabilities.json` is `{}`. Because no capability configuration binds the `main` window to core permission sets (such as `core:default`, `opener:default`, or file system plugins), any future plugin integration or restricted API call is blocked by default.
- **Remediation:** Create `desktop/src-tauri/capabilities/default.json`:
```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default-capability",
  "description": "Default permissions for YNAB Desktop main window",
  "windows": ["main"],
  "permissions": [
    "core:default"
  ]
}
```

---

### 3.3 Security & Content Security Policy (`"csp": null`)

- **Direct Observation (`tauri.conf.json:25-27`):**
```json
"security": {
  "csp": null
}
```
- **Security Assessment:** Setting `"csp": null` completely disables Content Security Policy enforcement in the WebView2 container.
- **Vulnerability Exposure:** The application accepts and renders user-supplied text (payee names, memos, category notes, split transaction rows). In `BudgetSubCategoryRow.tsx:213, 221`, goal progress HTML strings are injected directly using `dangerouslySetInnerHTML`. In the absence of a strict CSP, any Cross-Site Scripting (XSS) payload embedded in an imported CSV or malicious budget file could execute unrestricted JavaScript, access the local filesystem via Tauri IPC, or exfiltrate private financial data.
- **Remediation:** Configure a strict, local-only Content Security Policy:
```json
"security": {
  "csp": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: asset: http://asset.localhost; font-src 'self' data:; connect-src 'self' ipc: http://ipc.localhost"
}
```

---

### 3.4 WiX UpgradeCode GUID & NSIS Bundler Configuration

- **Direct Observation (`tauri.conf.json:29-35`):**
```json
"bundle": {
  "active": true,
  "targets": "all",
  "icon": ["icons/icon.ico"]
}
```
- **Packaging Analysis:**
  1. **WiX UpgradeCode Missing:** In WiX installers (`.msi`), the `UpgradeCode` GUID uniquely identifies a family of product releases. If omitted, Tauri generates a temporary GUID per build. Consequently, when a user installs v0.2.1 over v0.2.0, Windows Installer treats them as distinct applications, failing to replace existing binaries and leaving orphaned installations in `Add/Remove Programs`.
  2. **NSIS InstallMode Missing:** NSIS builds defaults to per-machine installation requiring UAC elevation (`MULTIUSER_USE_PROGRAMFILES64`). Modern desktop software (such as Slack, VS Code, and YNAB) installs to `AppData\Local\Programs` by default (`installMode: "currentUser"`), allowing seamless updates without administrator rights.
- **Remediation:** Add dedicated Windows bundling configuration:
```json
"bundle": {
  "active": true,
  "targets": ["msi", "nsis"],
  "icon": ["icons/icon.ico"],
  "windows": {
    "wix": {
      "upgradeCode": "4D6E3F18-A785-4B9F-8342-12C851F25E89",
      "language": ["en-US"]
    },
    "nsis": {
      "installMode": "currentUser"
    }
  }
}
```

---

### 3.5 Icon Assets Completeness

- **Direct Observation:** Inspection of `desktop/src-tauri/icons/` reveals only a single file: `icon.ico` (285,478 bytes).
- **Missing Asset Inventory:**
  - `32x32.png` (Taskbar & System Tray icon)
  - `128x128.png` & `128x128@2x.png` (High-DPI file explorer view)
  - `icon.png` (512x512 master high-resolution icon)
  - Windows Store & Start Menu Tile Logos: `Square30x30Logo.png`, `Square44x44Logo.png`, `Square71x71Logo.png`, `Square89x89Logo.png`, `Square107x107Logo.png`, `Square142x142Logo.png`, `Square150x150Logo.png`, `Square284x284Logo.png`, `Square310x310Logo.png`, `StoreLogo.png`.
- **Consequence:** In Windows Start Menu search, Alt+Tab app switcher, and Windows Task Manager, the application displays generic blank executable icons.

---

### 3.6 Windows Authenticode Code Signing & SmartScreen Impact

- **Direct Observation:** No code signing parameters (`certificateThumbprint`, `signCommand`, or timestamp URLs) are configured in `tauri.conf.json` or build scripts.
- **Operating System Impact:** When Windows users download and execute the generated `.msi` or `.exe` installer, Microsoft Defender SmartScreen immediately displays a full-screen warning:
  > *"Windows protected your PC — Microsoft Defender SmartScreen prevented an unrecognized app from starting. Running this app might put your PC at risk. Publisher: Unknown Publisher"*
- **Publishing Requirement:** Production release requires acquiring an EV (Extended Validation) or OV code-signing certificate (or integrating Azure Trusted Signing via `signCommand`) with an RFC 3161 timestamp authority (`http://timestamp.digicert.com`).

---

### 3.7 Auto-Updater Infrastructure

- **Direct Observation:**
  1. `desktop/src-tauri/Cargo.toml` dependencies: `tauri = { version = "2", features = [] }`. `tauri-plugin-updater` is completely absent.
  2. `tauri.conf.json` contains no `"plugins"` block and no `"updater"` endpoint or ed25519 signing public key.
- **Consequence:** Once installed on user machines, the application has no mechanism to detect updates, download patch payloads, or perform in-app updates. Every update would require manual uninstallation and re-downloading from a web browser.

---

## 4. Comprehensive Desktop Codebase Audit

### 4.1 Runtime Crash Blocker: Relative SQLite Database Path

- **Vulnerable Code Location:** `desktop/src-tauri/src/main.rs:24`
```rust
fn main() {
    println!("[YNAB Desktop] Initializing database...");
    let conn = Connection::open("ynab_desktop.sqlite").expect("Failed to open SQLite database");
    schema::init_database(&conn).expect("Failed to initialize database schema");
```
- **Root Cause & Failure Mechanism:**
  1. `Connection::open("ynab_desktop.sqlite")` passes a bare relative filename. Rusqlite opens the database in the *current working directory* of the launching process.
  2. In development (`cargo run`), the working directory is `desktop/src-tauri/`.
  3. In a production Windows per-machine installation (`InstallScope="perMachine"`), the application binary is located at `C:\Program Files\YNAB Desktop\ynab-desktop.exe`.
  4. When the user launches the application via the Start Menu or desktop shortcut, the process working directory is `C:\Program Files\YNAB Desktop\`.
  5. Windows UAC security strictly forbids standard users from creating or writing files in `C:\Program Files\`.
  6. Rusqlite returns `sqlite3_open_v2` error: `Permission denied (os error 5)`.
  7. `.expect("Failed to open SQLite database")` triggers an immediate Rust thread panic, terminating the application before the window opens.
  8. If launched from different shortcuts or PowerShell prompts, multiple disconnected SQLite databases are spawned across the user's filesystem.
- **Remediation:** Move database initialization into Tauri's `setup` hook using the OS standard application data directory (`%APPDATA%\com.ynabx.desktop\ynab_desktop.sqlite`):
```rust
tauri::Builder::default()
    .setup(|app| {
        let app_dir = app.path().app_data_dir()
            .expect("Failed to resolve AppData directory");
        std::fs::create_dir_all(&app_dir)
            .expect("Failed to create AppData directory");
        let db_path = app_dir.join("ynab_desktop.sqlite");
        let conn = Connection::open(&db_path)
            .expect("Failed to open SQLite database in AppData");
        schema::init_database(&conn)
            .expect("Failed to initialize schema");
        seed::seed_new_budget_if_needed(&conn, seed::DEFAULT_BUDGET_ID, "My Plan")
            .expect("Failed to seed default budget");
        app.manage(AppState { db: Mutex::new(conn) });
        Ok(())
    })
```

---

### 4.2 Data Integrity Blocker: Perpetual Startup Seeding Duplication

- **Vulnerable Code Location:** `desktop/src-tauri/src/main.rs:26-27` and `desktop/src-tauri/src/seed.rs:23-152`
```rust
// main.rs:26-27
seed::seed_new_budget(&conn, seed::DEFAULT_BUDGET_ID, "My Plan")
    .expect("Failed to seed default budget");

// seed.rs:134-149
for (group_name, subcats) in default_groups {
    let mid = Uuid::new_v4().to_string(); // Fresh random UUID generated every launch!
    conn.execute(
        r#"INSERT OR IGNORE INTO be_master_categories (id, budget_id, internal_name, deletable, sortable_index, name)
           VALUES (?1, ?2, NULL, 1, ?3, ?4)"#,
        params![mid, budget_id, m_idx, group_name],
    )?;
    for (s_idx, cat_name) in subcats.iter().enumerate() {
        let cid = Uuid::new_v4().to_string(); // Fresh random UUID generated every launch!
        conn.execute(
            r#"INSERT OR IGNORE INTO be_subcategories (id, budget_id, entities_master_category_id, internal_name, sortable_index, name, type)
               VALUES (?1, ?2, ?3, NULL, ?4, ?5, 'DFT')"#,
            params![cid, budget_id, mid, s_idx, cat_name],
        )?;
    }
}
```
- **Root Cause & Failure Mechanism:**
  1. `seed_new_budget` executes on every startup without checking if budget data already exists.
  2. For every launch, `seed.rs` generates fresh random UUIDs (`Uuid::new_v4()`) for master category groups, subcategories, and system payees.
  3. In `schema.rs:90-129`, `be_master_categories` and `be_subcategories` define unique constraints *only* on the primary key `id`. There is no unique constraint on `(budget_id, name)` or `(budget_id, internal_name)`.
  4. Because the UUIDs are randomly generated on each launch, `INSERT OR IGNORE` never triggers a conflict on `id`.
  5. As a result, every restart injects 4 new master category groups ("Immediate Obligations", "True Expenses", "Debt Payments", "Quality of Life"), 15 subcategories, and 3 system payees. After 10 restarts, the user's budget contains 40 category groups and 150 duplicate envelopes.
- **Remediation:**
  1. Guard seeding with an existence check: `SELECT 1 FROM be_budgets WHERE id = ?1`. If the default budget exists, skip seeding entirely.
  2. Add unique constraint: `UNIQUE (budget_id, internal_name)` and `UNIQUE (budget_id, name)` on categories.

---

### 4.3 Data Destruction Blocker: Category Hide Deletes SQLite Envelopes

- **Vulnerable Code Location:** `desktop/src/components/budget/BudgetWorkspace.tsx:561-567`
```typescript
const handleHideCategory = async (id: string, isMaster?: boolean) => {
  setCategoryGroups((prev) => { ... });
  setSelectedCategoryIds((prev) => prev.filter((catId) => catId !== id));
  try {
    await deleteCategory(id, !!isMaster); // Critical bug: deletes category instead of hiding!
  } catch (err) {
    console.error('Failed to hide category in Tauri:', err);
  }
};
```
- **Root Cause & Failure Mechanism:**
  - When the user selects "Hide Category" from the context menu, `handleHideCategory` invokes `deleteCategory(id, !!isMaster)`.
  - In `tauriBridge.ts:251` and `commands.rs:528-560`, `delete_category` removes the record from SQLite or marks it permanently deleted.
  - When the user subsequently clicks "Unhide Category" (`handleUnhideCategory:571-585`), the code only mutates React state (`isHidden: false`), but the underlying category row and its historical monthly allocations have been erased from the SQLite database.
- **Remediation:** Add a dedicated `hide_category` IPC command that updates `is_hidden = 1` in `be_subcategories` without deleting the row.

---

### 4.4 Data Destruction Blocker: Account Close Permanently Deletes Records

- **Vulnerable Code Location:** `desktop/src/App.tsx:449-453`
```tsx
<CloseAccountModal
  isOpen={activeModal === 'closeAccount'}
  onClose={() => { setActiveModal('editAccount'); }}
  account={editingAccount}
  onConfirmClose={(acc) => {
    handleDeleteAccount(acc.entityId); // Critical bug: deletes account instead of closing!
    setActiveModal(null);
    setEditingAccount(null);
  }}
/>
```
- **Root Cause & Failure Mechanism:**
  - `CloseAccountModal` promises the user: *"An adjustment transaction will be created automatically and the account will be moved to Closed Accounts."*
  - However, `onConfirmClose` delegates directly to `handleDeleteAccount()`, which calls `deleteAccount(accId)` via Tauri IPC.
  - In `commands.rs:388-410`, `delete_account` permanently deletes the account and all transactions assigned to it.
  - Historical spending records, payee histories, and net worth ledger balances are erased.
  - `closeAccount(id)` is already implemented in `tauriBridge.ts:285` but is never called.
- **Remediation:** Wire `onConfirmClose` to invoke `await closeAccount(acc.entityId)` and create a zero-out reconciliation adjustment transaction.

---

### 4.5 Workflow Blocker: Categorization Blocked by Empty Category Groups

- **Vulnerable Code Location:** `desktop/src/components/budget/budgetData.ts:28` and `desktop/src/App.tsx:308, 471`
```typescript
// budgetData.ts:28
export const INITIAL_CATEGORY_GROUPS: MasterCategoryGroup[] = [];

// App.tsx:308 & 471
<AccountsWorkspace
  selectedAccountId={null}
  accounts={allAccounts}
  categoryGroups={INITIAL_CATEGORY_GROUPS} // Hardcoded empty array []
  onOpenEditAccount={...}
/>
```
- **Root Cause & Failure Mechanism:**
  - In `App.tsx`, `AccountsWorkspace` receives `categoryGroups={INITIAL_CATEGORY_GROUPS}` (`[]`).
  - `App.tsx` never fetches category groups from SQLite; categories are only loaded inside `BudgetWorkspace`.
  - In `RegisterGridEditRow.tsx:135-140` and `CategoryPickerPopover.tsx:57-73`, the category dropdown picker populates its envelope list exclusively from the `categoryGroups` prop.
  - Because `categoryGroups` is empty, the category selection popover displays 0 categories. Users cannot assign a category to any transaction in the register.
- **Remediation:** Lift category group loading to `App.tsx` (via `getPlanSummary`) and pass the live category groups into `AccountsWorkspace`.

---

### 4.6 High-Severity Broken Workflows & Logic Flaws

#### H-01: Transfer Target Account ID Dropped in Register Edit Row
- **File:** `desktop/src/components/accounts/RegisterGridEditRow.tsx:933-941, 202-228`
- **Flaw:** In `onSelectPayee`, `targetAccId` is provided by `PayeePickerPopover` when a user selects a transfer payee (e.g. "Transfer : Checking"), but `targetAccId` is dropped and never stored in component state. In `buildTransaction()`, `transferAccountId` is omitted.
- **Impact:** `saveTransaction` sends `transfer_account_id: undefined`. The transaction is saved as a regular payee without creating the paired transfer transaction in the target account.

#### H-02: Reconciliation Never Persisted to SQLite
- **File:** `desktop/src/components/accounts/AccountsWorkspace.tsx:624-653`
- **Flaw:** `handleFinishReconcile` imports `reconcileAccount` on line 9, but never calls it. It updates local React state (`cleared: 'reconciled'`), generates a temporary adjustment object `tx-adj-...`, but never invokes Tauri IPC.
- **Impact:** When the user refreshes or reopens the app, the account's cleared/reconciled balance and the adjustment transaction vanish completely.

#### H-03: Action Bar Bulk Operations Are Ephemeral
- **File:** `desktop/src/components/accounts/AccountsWorkspace.tsx:706-725, 1090-1095, 1176-1186`
- **Flaw:** Bulk operations in the transaction register (`handleBulkClear`, `handleBulkUnclear`, `handleBulkSelectFlag`, `onMoveToAccount`, `onSelectCategory`) mutate React state array `transactions` only.
- **Impact:** None of the bulk actions call Tauri IPC. Navigating to another account or restarting the app reverts all bulk updates.

#### H-04: Credit Card Account Type Mismatch in Register UI
- **File:** `desktop/src/components/accounts/AccountsHeader.tsx:36` & `AccountsToolbar.tsx:39`
- **Flaw:** The header and toolbar test `selectedAccount?.accountType === 'credit'`. However, `tauriBridge.ts:36` normalizes credit card types to `'creditCard'`.
- **Impact:** Because `'creditCard' === 'credit'` is false, the Credit Card Payment Available banner and the "Record Payment" button never render for credit card accounts.

#### H-05: Credit Card Ledger Calculation Case-Sensitivity Bug
- **File:** `desktop/src-tauri/src/ledger/transfers.rs:32-38`
- **Flaw:** `determine_cash_credit_amounts` tests `if account_type == "CreditCard" || account_type == "LineOfCredit"`. However, the frontend and `commands.rs` store `"creditCard"` and `"lineOfCredit"` (camelCase).
- **Impact:** Case-sensitive string comparison fails. Credit card transactions are misclassified as cash transactions: `cash_amount = amount` and `credit_amount = 0`. This corrupts the credit card payment calculation engine.

#### H-06: Transfer Unlink Leaves Orphaned Peer Transactions
- **File:** `desktop/src-tauri/src/ledger/transfers.rs:197-220`
- **Flaw:** When an existing transfer transaction is edited into a regular non-transfer, `transfers.rs` clears `transfer_account_id = NULL` and `transfer_transaction_id = NULL` on the source transaction, but leaves the paired peer transaction untouched in the destination account.
- **Impact:** An orphaned ghost transaction remains in the peer account, corrupting its cleared and uncleared ledger balances.

#### H-07: Stubbed Historical Quick Budget Metrics
- **File:** `desktop/src-tauri/src/commands.rs:1079-1084` & `BudgetInspector.tsx:553-595`
- **Flaw:** In `commands.rs`, historical fields (`budgeted_last_month`, `spent_last_month`, `average_budgeted`, `average_spent`) are hardcoded to `0`. In `BudgetInspector.tsx`, the Quick Budget buttons display hardcoded `$0.00` and have no `onClick` handlers.
- **Impact:** Quick budgeting (Assigned Last Month, Spent Last Month, Average Assigned, Average Spent) sets all category assigned amounts to `$0.00`.

#### H-14: Reports Use 100% Static Hardcoded Fixtures
- **File:** `desktop/src/components/reflect/reflectDataEngine.ts:261-300` & `ReflectWorkspace.tsx:37`
- **Flaw:** `REFLECT_NET_WORTH_FULL_HISTORY` contains 24 months of static hardcoded data (Jan 2025 to Nov 2026). `REFLECT_AOM_FULL_HISTORY` contains mock Age of Money numbers. `INITIAL_ACCOUNTS` in `ReflectWorkspace.tsx` is an empty array (`[]`).
- **Impact:** The Net Worth and Age of Money charts in the Reflect tab display fake static graphs that never reflect user accounts, actual transactions, or balance history.

---

### 4.7 Medium & Low Severity Codebase Deficiencies

1. **M-01: Starting Balance Payee Internal Name Mismatch (`seed.rs:19` vs `commands.rs:341`):** `seed.rs` creates `'StartingBalancePayee'`, but `commands.rs` queries `'Payee/__StartingBalance__'`. Starting balance transactions are inserted with `entities_payee_id = NULL`.
2. **M-02: Date Parsing Index Panic Risk (`commands.rs:1575-1580`):** `parse_year_month` does `parts[1]` without checking `parts.len() >= 2`. A malformed month string panics the thread and poisons the SQLite Mutex.
3. **M-03: Activity Popover Never Loads Transactions (`BudgetWorkspace.tsx:966-972`):** `ActivityTransactionsPopover` is rendered without passing the `transactions` prop. It always displays "No transactions recorded for this category in this month".
4. **M-04: Edit Account Balance Modal Ignores Balance (`EditAccountModal.tsx:116-143` & `App.tsx:131-140`):** The modal claims an adjustment transaction will be created, but `handleSaveAccount` only passes the account name to `updateAccount`. `balance` is ignored.
5. **M-05: Payee Management Modal Uses Static Dummy Data (`ManagePayeesModal.tsx:12-18` & `App.tsx:396-399`):** Uses 5 hardcoded dummy payees. `App.tsx` passes no `onSave` prop. Edits are never saved to SQLite.
6. **M-06: Simulated Delays and Fake Modal Logic (`ExportPlanModal.tsx:30-37` & `FreshStartModal.tsx:31-36`):** `ExportPlanModal` uses a fake `setTimeout(..., 600)` without CSV generation. `FreshStartModal` only renames the React state string without resetting registers.
7. **M-07: Display Options Theme Not Applied (`DisplayOptionsModal.tsx:21-28` & `App.tsx:401-404`):** Theme and progress bar options have no `onSave` handler in `App.tsx` and are never saved to `localStorage` or applied to the DOM.
8. **M-08: Hide Amounts Setting Not Wired (`App.tsx:102, 347-348`):** `isHideAmountsEnabled` is toggled in menu state but never passed to budget, accounts, or sidebar views.
9. **M-09: Debug Story Matrix Tool Rendered in Production (`App.tsx:284-293`):** "Story Matrix (21)" debug button with `zIndex: 9999` is visible in production on `/reflect`.
10. **M-10: Account and Category Reordering Ephemeral (`App.tsx:156-173` & `BudgetWorkspace.tsx:191-224`):** Drag-and-drop sort orders update React state only. On reload, items revert to default SQLite insertion order.
11. **M-11: Object URL Memory Leak (`reflectDataEngine.ts:397-404` & `AccountsWorkspace.tsx:1129-1134`):** `URL.createObjectURL(blob)` is created without calling `URL.revokeObjectURL(url)`.
12. **M-12: Account Name Blank in "All Accounts" Register (`tauriBridge.ts:178`):** `accountName: ''` is hardcoded for all transactions in `getTransactions()`, leaving the account column blank in "All Accounts" view.
13. **M-13: Division by Zero Math Bug in Calculator (`calculator.ts:24`):** `case '/': return r === 0 ? parseFloat(`${l}${r}`) : l / r;` evaluates `10 / 0` to `100`.
14. **M-14: Window Configuration Quality Deficiencies (`tauri.conf.json:12-24`):** Missing `"label": "main"`, `"center": true`, and initial hidden state (`"visible": false`).
15. **L-01: Missing Application Metadata (`tauri.conf.json:1-6, 29-35`):** Missing `publisher`, `copyright`, `shortDescription`, `longDescription`, and `category`.
16. **L-02: Rust Dead Code Warnings (`src-tauri/src/`):** 12 compiler warnings for unused structs and functions.
17. **L-03: Hardcoded Default Budget ID & User Email (`App.tsx:483-484` & `tauriBridge.ts:13`):** Hardcoded default budget ID `'00000000-0000-0000-0000-000000000001'` and email `'local@user.me'`.
18. **L-04: Missing Desktop Targets in Root Makefile (`c:\Users\hoang\Desktop\ynabx\Makefile`):** Root `Makefile` omits desktop targets (`build-desktop`, `test-desktop`, `lint-desktop`, `typecheck-desktop`); `make check` completely ignores `desktop/`.
19. **L-05: Stubbed Alerts and Unsanitized External URL (`App.tsx:247, 349-354` & `AccountsToolbar.tsx:77`):** Stubbed `alert()` calls; unsanitized `window.open` used without `@tauri-apps/plugin-opener`.
20. **L-06: Hardcoded Default Date & Reconciled Text (`BudgetWorkspace.tsx:42` & `AccountsHeader.tsx:88`):** Default budget month hardcoded to November 2026; "Reconciled today" text hardcoded.

---

## 5. Comprehensive Itemized Findings Table

The complete catalog of all 42 findings identified across frontend, native backend, configuration, and build infrastructure is presented below:

| ID | Category | Severity | File Path & Line Numbers | Flaw / Gap Description | Specific Actionable Remediation Steps |
|:---|:---|:---:|:---|:---|:---|
| **B-01** | Runtime Crash | **BLOCKER** | `desktop/src-tauri/src/main.rs:24` | Hardcoded relative path `Connection::open("ynab_desktop.sqlite")` crashes with `Access is denied (os error 5)` on startup when installed to `C:\Program Files\`. Causes fragmented DBs when run from different paths. | In `setup` hook, resolve database path via `app.path().app_data_dir()`, call `create_dir_all(&dir)`, and open `dir.join("ynab_desktop.sqlite")`. |
| **B-02** | Data Integrity | **BLOCKER** | `desktop/src-tauri/src/main.rs:26-27`<br>`desktop/src-tauri/src/seed.rs:23-152` | `seed_new_budget` runs unconditionally every startup, generating fresh random UUIDs on tables lacking unique constraints. Duplicates all categories and payees permanently on every launch. | Check if budget exists before seeding (`SELECT 1 FROM be_budgets WHERE id = ?1`). Add `UNIQUE (budget_id, internal_name)` to `be_master_categories` and `be_subcategories`. |
| **B-03** | Tauri Security | **BLOCKER** | `desktop/src-tauri/capabilities/` (missing) | `capabilities/` directory does not exist. No capability JSON file defined. In Tauri v2, webviews without explicit ACL capabilities cannot access core commands or plugin APIs. | Create `desktop/src-tauri/capabilities/default.json` with `$schema`, `"windows": ["main"]`, and grant `"permissions": ["core:default"]`. |
| **B-04** | Quality Gate | **BLOCKER** | `desktop/package.json:12` | `npm run lint` fails with exit code 1 (`'eslint' is not recognized`). `eslint` missing from `devDependencies`, no `eslint.config.js` exists, and script uses obsolete `--ext` flags. | Add `eslint`, `@eslint/js`, `typescript-eslint` to `devDependencies`, create `eslint.config.js`, and update script to `"eslint ."`. |
| **B-05** | Test Suite | **BLOCKER** | `desktop/package.json:10`<br>`desktop/src/` | `npm run test` fails with exit code 1 (`No test files found`). Zero test files exist in `desktop/src/`. Script uses `"vitest"` instead of `"vitest run"`. | Change script to `"vitest run"`. Add initial unit tests (`calculator.test.ts`, `popoverPosition.test.ts`), and set `passWithNoTests: true` in vitest config. |
| **B-06** | Data Loss | **BLOCKER** | `desktop/src/components/budget/BudgetWorkspace.tsx:561-567` | Hiding a category invokes `await deleteCategory(id, !!isMaster)` via Tauri IPC, permanently destroying the user's category envelope and allocations in SQLite. | Add `hideCategory` IPC command updating `is_hidden = 1` in SQLite and invoke it instead of `deleteCategory`. |
| **B-07** | Data Loss | **BLOCKER** | `desktop/src/App.tsx:449-453` | Closing an account calls `handleDeleteAccount(acc.entityId)`, which invokes `deleteAccount()` and erases the account and all historical transactions. | Invoke `await closeAccount(acc.entityId)` (already in `tauriBridge.ts:285`), create zero-out adjustment, and preserve in Closed Accounts. |
| **B-08** | Workflow Block | **BLOCKER** | `desktop/src/App.tsx:308, 471`<br>`desktop/src/components/budget/budgetData.ts:28` | Hardcoded empty array `INITIAL_CATEGORY_GROUPS = []` passed to `AccountsWorkspace`. Categories never loaded into register, blocking transaction categorization. | Fetch category groups in `App.tsx` and pass live categories to `AccountsWorkspace`. |
| **H-01** | Account Register | **HIGH** | `desktop/src/components/accounts/RegisterGridEditRow.tsx:933-941, 202-228` | Transfer `targetAccId` dropped in `onSelectPayee`; `transferAccountId` missing from saved transaction. No paired transfer transaction is created in target account. | Store `targetAccId` in state and include `transferAccountId` in `buildTransaction()`. |
| **H-02** | Account Register | **HIGH** | `desktop/src/components/accounts/AccountsWorkspace.tsx:624-653` | `handleFinishReconcile` mutates React state only and never invokes `reconcileAccount`. Reconciled status and balance adjustments vanish on reload. | Call `await reconcileAccount(...)` via Tauri IPC and re-fetch transactions and balances. |
| **H-03** | Account Register | **HIGH** | `desktop/src/components/accounts/AccountsWorkspace.tsx:706-725, 1090-1095, 1176-1186` | Action bar bulk actions (Clear, Unclear, Flag, Move Account, Categorize) mutate local React state only without backend IPC calls. | Call batch update IPC command for selected transaction IDs and reload data from SQLite. |
| **H-04** | UI Defect | **HIGH** | `desktop/src/components/accounts/AccountsHeader.tsx:36`<br>`AccountsToolbar.tsx:39` | Checks `accountType === 'credit'` instead of `'creditCard'`, preventing Credit Card Payment Available banner and Record Payment button from ever rendering. | Update check to `accountType === 'creditCard' \|\| accountType === 'credit' \|\| accountType === 'lineOfCredit'`. |
| **H-05** | Calculation Bug | **HIGH** | `desktop/src-tauri/src/ledger/transfers.rs:32-38` | `determine_cash_credit_amounts` tests `"CreditCard"`, but frontend and commands send camelCase `"creditCard"`. CC transactions are misclassified as cash. | Update check to case-insensitive: `account_type.eq_ignore_ascii_case("creditCard") \|\| account_type.eq_ignore_ascii_case("lineOfCredit")`. |
| **H-06** | Ledger Integrity | **HIGH** | `desktop/src-tauri/src/ledger/transfers.rs:197-220` | Converting an existing transfer into a regular non-transfer clears transfer IDs on source transaction but leaves orphaned peer transactions in target account. | Query whether `transfer_transaction_id` exists before updating; if found, soft-delete (`is_tombstone = 1`) peer transaction and recompute peer balance. |
| **H-07** | Budget Workflow | **HIGH** | `desktop/src-tauri/src/commands.rs:1079-1084`<br>`BudgetInspector.tsx:553-595` | Historical Quick Budget metrics hardcoded to 0 in `commands.rs`. Quick Budget inspector buttons have hardcoded `$0.00` and no click handlers. | Query `be_monthly_subcategory_budgets` and `be_transactions` over past 1–12 months to compute actual averages; wire inspector buttons to IPC. |
| **H-08** | Windows Release | **HIGH** | `desktop/src-tauri/tauri.conf.json:29-35` | Windows Authenticode code signing not configured. Unsigned `.msi` and `.exe` installers trigger Microsoft Defender SmartScreen blocker warnings on Windows 10/11. | Configure Windows code signing (EV/OV certificate, Azure Trusted Signing, or signtool in CI) and configure `bundle.windows.certificateThumbprint`. |
| **H-09** | App Security | **HIGH** | `desktop/src-tauri/tauri.conf.json:25-27` | Content Security Policy explicitly disabled (`"csp": null`), leaving WebView exposed to XSS and arbitrary script execution risks. | Configure strict CSP in `tauri.conf.json` allowing only `'self'`, local asset protocols, and necessary inline styles. |
| **H-10** | Packaging Assets | **HIGH** | `desktop/src-tauri/icons/` | Missing standard Windows icon PNG sizes (`32x32.png`, `128x128.png`, `512x512.png`, and all `Square*Logo.png`). Only `icon.ico` is present. | Run `npx tauri icon <source-png>` to generate all platform icons into `desktop/src-tauri/icons/`, and register them in `tauri.conf.json:bundle.icon`. |
| **H-11** | Installer Config | **HIGH** | `desktop/src-tauri/tauri.conf.json:29-35` | Missing WiX `upgradeCode` GUID (breaks MSI upgrades across releases) and NSIS `installMode` settings (defaults to requiring per-machine UAC elevation). | Add fixed `bundle.windows.wix.upgradeCode` GUID. Configure `bundle.windows.nsis.installMode = "currentUser"`. |
| **H-12** | Release Lifecycle | **HIGH** | `desktop/src-tauri/tauri.conf.json`<br>`desktop/src-tauri/Cargo.toml` | `tauri-plugin-updater` missing from `Cargo.toml`. `tauri.conf.json` lacks `"plugins": { "updater": { ... } }` and ed25519 signing public key. In-app update is non-functional. | Add `tauri-plugin-updater` to `Cargo.toml`. Generate keypair with `npx tauri signer generate`. Add updater endpoints and `pubkey` to `tauri.conf.json`. |
| **H-13** | Runtime Assets | **HIGH** | `desktop/public/`<br>`desktop/src/ynab_original_bundled.css:18:107050` | 40+ referenced static assets (`/images/admin/*`, `/images/avatar/*`, fonts `WishFarm-*`, `xxii-*`) missing from `public/`, causing 404s. CSS has `align-itmes` syntax typo. | Copy missing SVG/PNG/WebP assets and fonts into `desktop/public/images/` and `fonts/`. Fix `align-items` typo in stylesheet. |
| **H-14** | Reports Engine | **HIGH** | `desktop/src/components/reflect/reflectDataEngine.ts:261-300`<br>`ReflectWorkspace.tsx:37` | Net Worth and Age of Money reports use 100% static hardcoded fixtures from 2024-2026. `INITIAL_ACCOUNTS` is empty array `[]`. | Compute net worth from monthly account ledger balances and Age of Money via 10-transaction FIFO queue from real SQLite transactions. |
| **M-01** | Backend Bug | **MEDIUM** | `desktop/src-tauri/src/commands.rs:341`<br>`desktop/src-tauri/src/seed.rs:19` | `seed.rs` creates `'StartingBalancePayee'`, but `commands.rs` queries `'Payee/__StartingBalance__'`. Starting balance transactions created with `entities_payee_id = NULL`. | Change `commands.rs:341` to query `crate::seed::PAYEE_STARTING_BALANCE`. |
| **M-02** | Robustness | **MEDIUM** | `desktop/src-tauri/src/commands.rs:1575-1580` | `parse_year_month` does `parts[1]` without length verification. Malformed date string panics the thread and poisons the SQLite Mutex. | Safely parse using `chrono::NaiveDate::parse_from_str` or check `parts.len() >= 2` before indexing. |
| **M-03** | UI Defect | **MEDIUM** | `desktop/src/components/budget/BudgetWorkspace.tsx:966-972` | `ActivityTransactionsPopover` rendered without `transactions` prop, always displaying empty state. | Filter and pass monthly transactions for the category to `ActivityTransactionsPopover`. |
| **M-04** | UI Defect | **MEDIUM** | `desktop/src/components/modals/EditAccountModal.tsx:116-143`<br>`App.tsx:131-140` | Editing working balance claims adjustment will be created, but balance is ignored and no adjustment created. | Calculate balance difference, create adjustment transaction via `saveTransaction`, and update balance in DB. |
| **M-05** | UI Defect | **MEDIUM** | `desktop/src/components/modals/ManagePayeesModal.tsx:12-18, 37`<br>`App.tsx:396-399` | Uses hardcoded `DEFAULT_PAYEES`; `App.tsx` provides no `onSave`; payee edits lost on close. | Connect `ManagePayeesModal` to SQLite payee table via Tauri IPC (`getPayees`, `updatePayee`, `deletePayee`). |
| **M-06** | Incomplete Modal | **MEDIUM** | `desktop/src/components/modals/ExportPlanModal.tsx:30-37`<br>`FreshStartModal.tsx:31-36` | Fake `setTimeout(..., 600)` in ExportPlanModal; FreshStartModal only renames budget string in React without archiving or resetting registers. | Implement true CSV budget export in ExportPlanModal; invoke `make_fresh_start` IPC command in FreshStartModal. |
| **M-07** | UI Defect | **MEDIUM** | `desktop/src/components/modals/DisplayOptionsModal.tsx:21-28`<br>`App.tsx:401-404` | No `onSave` passed in `App.tsx`; theme and progress bar options never saved or applied to DOM. | Pass `onSave`, persist display preferences in `localStorage`, and toggle theme classes on `document.documentElement`. |
| **M-08** | UI Defect | **MEDIUM** | `desktop/src/App.tsx:102, 347-348` | `isHideAmountsEnabled` toggled in menu state but never passed to budget, accounts, or sidebar views. | Implement amount masking (`••••••`) in currency components when `isHideAmountsEnabled` is active. |
| **M-09** | UI Polish | **MEDIUM** | `desktop/src/App.tsx:284-293` | "Story Matrix (21)" debug matrix tool rendered in production UI with `zIndex: 9999`. | Remove debug button or gate behind `import.meta.env.DEV`. |
| **M-10** | Persistence | **MEDIUM** | `desktop/src/App.tsx:156-173`<br>`BudgetWorkspace.tsx:191-224` | Reordering accounts and categories updates React state only; sort orders reset on reload. | Add `reorder_accounts` and `reorder_categories` IPC persistence using sparse sortable index values. |
| **M-11** | Memory Leak | **MEDIUM** | `desktop/src/components/reflect/reflectDataEngine.ts:397-404`<br>`AccountsWorkspace.tsx:1129-1134` | Memory leak: `URL.createObjectURL(blob)` created without calling `URL.revokeObjectURL(url)`. | Call `URL.revokeObjectURL(url)` after triggering anchor download. |
| **M-12** | UI Defect | **MEDIUM** | `desktop/src/api/tauriBridge.ts:178` | `accountName: ''` hardcoded in `getTransactions()`, leaving account column blank in "All Accounts" view. | Join or lookup `account_id` against accounts list to set `accountName`. |
| **M-13** | Math Bug | **MEDIUM** | `desktop/src/utils/calculator.ts:24` | `case '/': return r === 0 ? parseFloat(`${l}${r}`) : l / r;` returns `100` on `10 / 0`. | Return `null` or `0` on division by zero instead of concatenating strings. |
| **M-14** | Window Config | **MEDIUM** | `desktop/src-tauri/tauri.conf.json:12-24` | Missing `"label": "main"`, missing `"center": true`, and missing initial hidden state (`"visible": false`). | Add `"label": "main"`, `"center": true`, and `"visible": false`; show window after mount. |
| **L-01** | Metadata | **LOW** | `desktop/src-tauri/tauri.conf.json:1-6, 29-35` | Missing `publisher`, `copyright`, `shortDescription`, `longDescription`, and `category`. App appears as "Unknown Publisher" in Windows Settings. | Populate `publisher`, `copyright`, `category: "Finance"`, and description fields in `tauri.conf.json`. |
| **L-02** | Code Hygiene | **LOW** | `desktop/src-tauri/src/` | 12 Rust compiler warnings for unused structs (`GoalPeriod`), unused functions, and unread struct fields. | Remove unused code or annotate with `#[allow(dead_code)]` / use fields where appropriate. |
| **L-03** | Auth / Hardcoding | **LOW** | `desktop/src/App.tsx:483-484`<br>`desktop/src/api/tauriBridge.ts:13` | Hardcoded default budget ID `'00000000-0000-0000-0000-000000000001'` and email `'local@user.me'`. | Provide dynamic budget switching and local user profile configuration. |
| **L-04** | Build Infra | **LOW** | `c:\Users\hoang\Desktop\ynabx\Makefile:21-127` | Root `Makefile` omits desktop targets (`build-desktop`, `test-desktop`, `lint-desktop`, `typecheck-desktop`); `make check` ignores `desktop/`. | Add desktop targets to `Makefile` and include them in aggregate `make check`, `make test`, and `make lint`. |
| **L-05** | UI Polish | **LOW** | `desktop/src/App.tsx:247, 349-354`<br>`AccountsToolbar.tsx:77` | Stubbed `alert()` and `console.log()` calls; `window.open` used without `@tauri-apps/plugin-opener`. | Replace alerts with toast notifications; use `@tauri-apps/plugin-opener` for external URLs. |
| **L-06** | UI Polish | **LOW** | `desktop/src/components/budget/BudgetWorkspace.tsx:42`<br>`AccountsHeader.tsx:88` | Default budget month hardcoded to Nov 2026 (`new Date(2026, 10, 1)`); "Reconciled today" text hardcoded. | Default to `new Date()`; display actual formatted `last_reconciled_at` timestamp. |

---

## 6. Prioritized Windows Release Readiness Checklist

To transition the `desktop/` application from its current pre-release state into an enterprise-grade, shippable Windows product, remediation work should be executed across four structured sequential phases:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   WINDOWS RELEASE REMEDIATION PHASES                   │
├────────────────────────────────────────────────────────────────────────┤
│  PHASE 1: CRITICAL RELEASE BLOCKERS                                    │
│  - Resolve SQLite AppData crash (B-01)                                 │
│  - Prevent startup seeding duplication (B-02)                          │
│  - Define Tauri v2 ACL capabilities (B-03)                             │
│  - Fix verification quality gates: ESLint (B-04) and Vitest (B-05)     │
│  - Halt category/account deletion on hide/close (B-06, B-07)           │
│  - Wire live category groups into account register (B-08)              │
├────────────────────────────────────────────────────────────────────────┤
│  PHASE 2: DATA INTEGRITY & CORE WORKFLOW REMEDIATIONS                  │
│  - Preserve transfer target account ID and paired transfer (H-01)      │
│  - Implement reconciliation IPC persistence (H-02)                     │
│  - Implement batch persistence for action bar bulk operations (H-03)   │
│  - Fix credit card account type mismatch in UI (H-04)                  │
│  - Fix credit card case-sensitivity in transfer ledger math (H-05)     │
│  - Tombstone peer transactions when transfer is unlinked (H-06)        │
│  - Query real historical metrics for quick budget (H-07)               │
│  - Calculate real Net Worth & Age of Money from SQLite ledger (H-14)   │
│  - Align starting balance payee internal name (M-01)                   │
├────────────────────────────────────────────────────────────────────────┤
│  PHASE 3: WINDOWS PACKAGING, SECURITY & PUBLISHING                     │
│  - Configure Windows Authenticode code signing & SmartScreen (H-08)    │
│  - Enforce strict Content Security Policy (H-09)                       │
│  - Generate and package complete Windows icon PNG set (H-10)           │
│  - Set fixed WiX UpgradeCode GUID and NSIS currentUser mode (H-11)     │
│  - Implement auto-updater via tauri-plugin-updater (H-12)              │
│  - Populate publisher, copyright, and finance app metadata (L-01)      │
│  - Configure window centering and visible: false startup guard (M-14)  │
├────────────────────────────────────────────────────────────────────────┤
│  PHASE 4: FRONTEND POLISH, FEATURE GAPS & BUILD PIPELINE INTEGRATION   │
│  - Clean missing assets and fix CSS align-items syntax typo (H-13)     │
│  - Wire transactions prop into ActivityTransactionsPopover (M-03)      │
│  - Implement balance adjustment on account balance edit (M-04)         │
│  - Wire SQLite payee management in ManagePayeesModal (M-05)            │
│  - Implement real CSV export and SQLite fresh start (M-06)             │
│  - Save and apply theme preferences to documentElement (M-07)          │
│  - Wire amount masking for isHideAmountsEnabled (M-08)                 │
│  - Remove Story Matrix debug button from production build (M-09)       │
│  - Add drag-and-drop sort order IPC persistence (M-10)                 │
│  - Revoke object URLs to prevent memory leaks (M-11)                   │
│  - Populate accountName in register transactions (M-12)                │
│  - Fix calculator division by zero bug (M-13)                          │
│  - Eliminate 12 Rust compiler warnings (L-02)                          │
│  - Integrate desktop build/test/lint targets into root Makefile (L-04) │
│  - Default currentDate to current month (L-06)                         │
└────────────────────────────────────────────────────────────────────────┘
```

### Phase 1: Critical Release Blockers Checklist
- [ ] **B-01**: Refactor `desktop/src-tauri/src/main.rs` to initialize SQLite inside Tauri's `.setup()` hook using `app.path().app_data_dir().join("ynab_desktop.sqlite")`.
- [ ] **B-02**: Add an existence check in `seed.rs` (`SELECT 1 FROM be_budgets WHERE id = ?1`) before seeding, and add unique constraints on `be_master_categories(budget_id, name)`.
- [ ] **B-03**: Create `desktop/src-tauri/capabilities/default.json` and declare `"windows": ["main"]` with `"permissions": ["core:default"]`.
- [ ] **B-04**: Install `eslint`, `@eslint/js`, and `typescript-eslint` into `desktop/devDependencies`, create `desktop/eslint.config.js`, and update package script to `"eslint ."`.
- [ ] **B-05**: Update `desktop/package.json` to `"test": "vitest run"`, configure `passWithNoTests: true`, and add initial unit tests for `src/utils/calculator.ts` and `src/utils/popoverPosition.ts`.
- [ ] **B-06**: Replace `deleteCategory()` call in `BudgetWorkspace.tsx:564` with a new `hideCategory()` IPC invocation.
- [ ] **B-07**: Replace `handleDeleteAccount()` call in `App.tsx:450` with `closeAccount()` and generate a zero-out adjustment transaction.
- [ ] **B-08**: Lift category group loading to `App.tsx` and pass the live array into `AccountsWorkspace.tsx`.

### Phase 2: Data Integrity & Core Workflows Checklist
- [ ] **H-01**: Update `RegisterGridEditRow.tsx` to store `targetAccId` and include `transferAccountId` in `buildTransaction()`.
- [ ] **H-02**: Update `AccountsWorkspace.tsx:624` to call `await reconcileAccount(...)` and re-fetch transactions and balances.
- [ ] **H-03**: Implement batch IPC command `bulk_update_transactions` in `commands.rs` and wire `AccountsWorkspace.tsx` bulk actions to call it.
- [ ] **H-04**: Update `AccountsHeader.tsx:36` and `AccountsToolbar.tsx:39` to match both `'creditCard'` and `'credit'`.
- [ ] **H-05**: Update `transfers.rs:33` to use case-insensitive string equality (`account_type.eq_ignore_ascii_case("creditCard")`).
- [ ] **H-06**: In `transfers.rs:197-220`, query whether `transfer_transaction_id` exists before saving a non-transfer; soft-delete the counterpart transaction if found.
- [ ] **H-07**: Implement SQL queries in `commands.rs:apply_quick_budget` for historical averages; wire `BudgetInspector.tsx` buttons to call `applyQuickBudget`.
- [ ] **H-14**: Replace static fixtures in `reflectDataEngine.ts` with real aggregation queries over SQLite accounts and transactions.
- [ ] **M-01**: Align starting balance payee internal name in `commands.rs:341` with `seed.rs:19` (`PAYEE_STARTING_BALANCE`).
- [ ] **M-02**: Add length check in `commands.rs:parse_year_month` before accessing `parts[1]`.

### Phase 3: Windows Packaging, Security & Publishing Configuration Checklist
- [ ] **H-08**: Procure code signing certificate (or Azure Trusted Signing) and configure `bundle.windows.certificateThumbprint` and timestamp URL in `tauri.conf.json`.
- [ ] **H-09**: Configure strict Content Security Policy in `tauri.conf.json:app.security.csp`.
- [ ] **H-10**: Generate complete icon set (`32x32.png`, `128x128.png`, `512x512.png`, and `Square*Logo.png`) using `npx tauri icon` and register in `tauri.conf.json`.
- [ ] **H-11**: Set fixed WiX `upgradeCode` GUID and configure NSIS `installMode: "currentUser"` in `tauri.conf.json`.
- [ ] **H-12**: Add `tauri-plugin-updater = "2"` to `Cargo.toml`, generate ed25519 signing keypair, and configure updater endpoint in `tauri.conf.json`.
- [ ] **M-14**: Update window settings in `tauri.conf.json` with `"label": "main"`, `"center": true`, and `"visible": false`; show window after React mounts.
- [ ] **L-01**: Populate `publisher`, `copyright`, `category: "Finance"`, and app description in `tauri.conf.json`.

### Phase 4: Frontend Polish, Remaining Features & Build Pipeline Integration Checklist
- [ ] **H-13**: Copy missing SVG/font assets into `desktop/public/` and fix `align-itmes` typo in `ynab_original_bundled.css`.
- [ ] **M-03**: Pass monthly category transactions to `ActivityTransactionsPopover` in `BudgetWorkspace.tsx:966`.
- [ ] **M-04**: In `EditAccountModal.tsx` and `App.tsx:131`, compute balance delta, create adjustment transaction, and update account balance.
- [ ] **M-05**: Connect `ManagePayeesModal.tsx` to SQLite payee table via Tauri IPC (`getPayees`, `updatePayee`, `deletePayee`).
- [ ] **M-06**: Implement real CSV file generation in `ExportPlanModal.tsx` and true SQLite budget reset in `FreshStartModal.tsx`.
- [ ] **M-07**: Pass `onSave` in `App.tsx` for `DisplayOptionsModal.tsx`, save settings to `localStorage`, and apply theme classes to `document.documentElement`.
- [ ] **M-08**: Wire `isHideAmountsEnabled` to currency formatting components in budget, accounts, and sidebar.
- [ ] **M-09**: Gate "Story Matrix (21)" debug button in `App.tsx:284` behind `import.meta.env.DEV`.
- [ ] **M-10**: Add IPC persistence for account and category drag-and-drop reordering.
- [ ] **M-11**: Add `URL.revokeObjectURL(url)` in `reflectDataEngine.ts` and `AccountsWorkspace.tsx`.
- [ ] **M-12**: Set `accountName` in `tauriBridge.ts:178` by mapping `account_id` against active accounts.
- [ ] **M-13**: Fix `calculator.ts:24` to return `null` on division by zero instead of string concatenation.
- [ ] **L-02**: Eliminate 12 Rust compiler warnings in `desktop/src-tauri/`.
- [ ] **L-04**: Add `build-desktop`, `test-desktop`, `lint-desktop`, and `typecheck-desktop` targets to root `Makefile` and include in `make check`.
- [ ] **L-05**: Replace stubbed alerts with non-blocking toast notifications and use `@tauri-apps/plugin-opener` for external links.
- [ ] **L-06**: Change default budget month from hardcoded Nov 2026 to current date, and display actual `last_reconciled_at` timestamp.

---

## 7. Verification Method

To independently reproduce and verify all quality check executions, compiler results, and packaging findings documented in this report, execute the following commands from `c:\Users\hoang\Desktop\ynabx\desktop`:

```powershell
# 1. Verify TypeScript typechecking passes with zero errors (Exit code 0):
cd desktop
npm run typecheck

# 2. Verify ESLint failure due to missing package and config (Exit code 1):
npm run lint

# 3. Verify Vitest failure due to zero test files in desktop/src/ (Exit code 1):
npx vitest run

# 4. Verify production frontend build succeeds with missing asset and CSS typo warnings:
npm run build

# 5. Verify Rust backend tests pass (10 tests pass, 12 compiler warnings):
cd src-tauri
cargo test
cd ..

# 6. Verify Tauri system diagnostics and missing MSVC notice:
npx tauri info

# 7. Verify Windows installer generation produces unsigned .msi and .exe:
npx tauri bundle

# 8. Verify missing capabilities directory:
Test-Path src-tauri\capabilities

# 9. Verify single icon file in icons directory:
Get-ChildItem src-tauri\icons
```

---
*Report Author:* Teamwork Lead Audit Worker (`worker_1`)  
*Deliverable Paths:*  
- Primary Repository Document: `docs/DESKTOP_RELEASE_AUDIT.md`  
- Desktop Canonical In-Module Reference: `desktop/AUDIT_REPORT.md`
