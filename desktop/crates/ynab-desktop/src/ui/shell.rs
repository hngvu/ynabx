//! Application Layout & Navigation Shell (`TopLayout`, `TopSidebar`, `SidebarNav`, `AccountsList`, `NavAccountGroup`, `NavAccountRow`, `PlanMenuPopover`).
//! Exact 1:1 DOM & CSS parity with YNAB Ember/Glimmer.

#![deny(clippy::float_arithmetic)]

use dioxus::prelude::*;
use std::collections::{HashMap, HashSet};

use crate::interaction::reorder_list_by_gap;
use crate::state::{ActiveModal, ActiveWorkspace, AppStore};
use crate::ui::core::{Icon, MenuHeading, MenuItem, MenuSeparator, YnabButton, YnabMenu};
use ynab_core::repo::{get_setting, set_setting, AccountDto, AccountGroup};

const SIDEBAR_RESIZE_DEFAULT: i32 = 260;
const SIDEBAR_RESIZE_MIN: i32 = 160;
const SIDEBAR_RESIZE_MAX: i32 = 420;
const SIDEBAR_BREAKPOINT_VALUE_COLLAPSED: i32 = 200;
const SIDEBAR_COLLAPSED_WIDTH: i32 = 56;
const SIDEBAR_COLLAPSE_SNAP_WIDTH: i32 = 120;

/// Precomputed metadata for loan accounts shown in the sidebar (`NavAccountGroup`, `NavAccountRow`).
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct LoanSidebarMeta {
    pub original_balance_milliunits: i64,
    pub is_missing_details: bool,
}

fn json_has_entries(raw: Option<&str>) -> bool {
    let Some(s) = raw.map(str::trim) else {
        return false;
    };
    !s.is_empty() && s != "[]" && s != "{}" && s != "null"
}

fn query_loan_sidebar_meta(store: &AppStore) -> HashMap<String, LoanSidebarMeta> {
    let mut map = HashMap::new();
    let budget_id = store.budget_id.read().clone();
    let conn_rc = store.conn.read().clone();
    let conn = conn_rc.borrow();
    let Ok(mut stmt) = conn.prepare(
        "SELECT id, debt_original_balance, debt_interest_rates, debt_minimum_payments, debt_escrow_amounts
         FROM be_accounts
         WHERE budget_id = ?1 AND is_tombstone = 0",
    ) else {
        return map;
    };

    let Ok(rows) = stmt.query_map(rusqlite::params![budget_id], |row| {
        let id: String = row.get(0)?;
        let orig: Option<i64> = row.get(1)?;
        let rates: Option<String> = row.get(2)?;
        let mins: Option<String> = row.get(3)?;
        let escrows: Option<String> = row.get(4)?;
        Ok((id, orig, rates, mins, escrows))
    }) else {
        return map;
    };

    for row in rows.flatten() {
        let (id, orig, rates, mins, escrows) = row;
        let has_rates = json_has_entries(rates.as_deref());
        let has_mins = json_has_entries(mins.as_deref());
        let has_escrows = json_has_entries(escrows.as_deref());
        map.insert(
            id,
            LoanSidebarMeta {
                original_balance_milliunits: orig.unwrap_or(0).abs(),
                is_missing_details: !has_rates && !has_mins && !has_escrows,
            },
        );
    }
    map
}

fn load_persisted_sidebar_width(store: &AppStore) -> i32 {
    let budget_id = store.budget_id.read().clone();
    let conn_rc = store.conn.read().clone();
    let conn = conn_rc.borrow();
    get_setting(&conn, &budget_id, "sidebar_preferred_width")
        .ok()
        .flatten()
        .and_then(|s| s.trim().parse::<i32>().ok())
        .map(|w| w.clamp(SIDEBAR_RESIZE_MIN, SIDEBAR_RESIZE_MAX))
        .unwrap_or(SIDEBAR_RESIZE_DEFAULT)
}

fn save_persisted_sidebar_width(store: &AppStore, width: i32) {
    let budget_id = store.budget_id.read().clone();
    let conn_rc = store.conn.read().clone();
    let conn = conn_rc.borrow();
    let _ = set_setting(
        &conn,
        &budget_id,
        "sidebar_preferred_width",
        &width.to_string(),
    );
}

fn load_collapsed_account_groups(store: &AppStore) -> HashSet<String> {
    let budget_id = store.budget_id.read().clone();
    let conn_rc = store.conn.read().clone();
    let conn = conn_rc.borrow();
    if let Ok(Some(raw)) = get_setting(&conn, &budget_id, "sidebar_collapsed_account_groups") {
        let parsed: HashSet<String> = raw
            .split(',')
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .map(str::to_string)
            .collect();
        return parsed;
    }
    let mut default_set = HashSet::new();
    default_set.insert("closed".to_string());
    default_set
}

fn save_collapsed_account_groups(store: &AppStore, groups: &HashSet<String>) {
    let budget_id = store.budget_id.read().clone();
    let conn_rc = store.conn.read().clone();
    let conn = conn_rc.borrow();
    let mut sorted: Vec<String> = groups.iter().cloned().collect();
    sorted.sort();
    let _ = set_setting(
        &conn,
        &budget_id,
        "sidebar_collapsed_account_groups",
        &sorted.join(","),
    );
}

fn compute_loan_payoff_pct(original_balance_milli: i64, current_balance_milli: i64) -> Option<i64> {
    let orig = original_balance_milli.abs();
    if orig <= 0 {
        return None;
    }
    let remaining = current_balance_milli.abs();
    if remaining >= orig {
        return Some(0);
    }
    let paid = orig.saturating_sub(remaining);
    let pct = (paid as i128 * 100 / orig as i128) as i64;
    Some(pct.clamp(0, 100))
}

fn account_balance_span_class(amount_milli: i64, is_loan: bool) -> &'static str {
    if amount_milli < 0 && !is_loan {
        "user-data currency tabular-nums negative"
    } else if amount_milli == 0 {
        "user-data currency tabular-nums zero"
    } else {
        "user-data currency tabular-nums"
    }
}

fn build_body_class_sync_script(
    theme: &str,
    differentiate_without_color: bool,
    show_progress_bars: bool,
    hide_amounts: bool,
) -> String {
    let theme_json = serde_json::to_string(theme).unwrap_or_else(|_| "\"\"".to_string());
    let mut extra_classes: Vec<&str> = Vec::new();
    if differentiate_without_color {
        extra_classes.push("differentiate-without-color");
    }
    if !show_progress_bars {
        extra_classes.push("no-progress-bars");
    }
    if hide_amounts {
        extra_classes.push("hide-amounts");
    }
    let extra_json =
        serde_json::to_string(&extra_classes.join(" ")).unwrap_or_else(|_| "\"\"".to_string());

    format!(
        r#"(function() {{
  if (typeof document === "undefined") return;
  document.documentElement.className = "no-js mod_flexbox mod_flexwrap";
  var themeVal = {theme_json};
  var extra = {extra_json};
  var resolvedTheme = themeVal;
  if (themeVal === "theme-match-system") {{
    resolvedTheme = (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches)
      ? "theme-dark"
      : "";
  }}
  var classes = ["ember-application"];
  if (resolvedTheme) classes.push(resolvedTheme);
  if (extra) {{
    extra.split(/\s+/).forEach(function(c) {{
      if (c) classes.push(c);
    }});
  }}
  document.body.className = classes.join(" ");
}})();"#
    )
}

/// Top-level application layout syncing `<html>`/`<body>` Ember theme classes and rendering
/// the `.chat-widget` help button, `.layout`, and `.content-layout.user-logged-in` shell.
#[component]
pub fn TopLayout(#[props(default = true)] logged_in: bool, children: Element) -> Element {
    let mut store = use_context::<AppStore>();
    let theme_snapshot = store.theme.read().clone();
    let diff_enabled = *store.differentiate_without_color.read();
    let show_bars = *store.show_progress_bars.read();
    let hide_amounts = *store.hide_amounts.read();

    use_effect(move || {
        let theme = store.theme.read().clone();
        let diff = *store.differentiate_without_color.read();
        let bars = *store.show_progress_bars.read();
        let hide = *store.hide_amounts.read();
        let js = build_body_class_sync_script(&theme, diff, bars, hide);
        let _ = dioxus::document::eval(&js);
    });

    let diff_cls = if diff_enabled {
        "differentiate-without-color"
    } else {
        ""
    };
    let bars_cls = if !show_bars { "no-progress-bars" } else { "" };
    let hide_cls = if hide_amounts { "hide-amounts" } else { "" };
    let theme_fallback_cls = if theme_snapshot == "theme-match-system" {
        ""
    } else {
        theme_snapshot.as_str()
    };
    let layout_cls = ["layout", theme_fallback_cls, diff_cls, bars_cls, hide_cls]
        .into_iter()
        .filter(|s| !s.is_empty())
        .collect::<Vec<_>>()
        .join(" ");
    let content_cls = if logged_in {
        "content-layout user-logged-in"
    } else {
        "content-layout user-logged-out"
    };
    let chat_widget_cls = if logged_in {
        "chat-widget"
    } else {
        "chat-widget is-hidden"
    };

    rsx! {
        div {
            class: "{chat_widget_cls}",
            button {
                class: "ynab-button secondary",
                aria_label: "?",
                title: "Keyboard Shortcuts & Help",
                r#type: "button",
                onclick: move |_| {
                    store.active_modal.set(ActiveModal::KeyboardShortcuts);
                },
                Icon { name: "question_mark", width: 24 }
            }
        }
        div {
            class: "{layout_cls}",
            div {
                class: "{content_cls}",
                a {
                    href: "#start-of-content",
                    class: "skip-to-content",
                    "Skip to content"
                }
                {children}
            }
        }
    }
}

/// Resizable and collapsible navigation sidebar (`nav.ynab-u.sidebar.logged-in`).
#[component]
pub fn TopSidebar() -> Element {
    let mut store = use_context::<AppStore>();
    let is_collapsed = *store.sidebar_collapsed.read();
    let mut preferred_width = use_signal(|| load_persisted_sidebar_width(&store));
    let mut is_resizing = use_signal(|| false);
    let mut drag_start_x = use_signal(|| 0i32);
    let mut drag_start_width = use_signal(|| SIDEBAR_RESIZE_DEFAULT);

    let resizing_now = *is_resizing.read();
    let active_width = (*preferred_width.read()).clamp(SIDEBAR_RESIZE_MIN, SIDEBAR_RESIZE_MAX);
    let current_width = if is_collapsed {
        SIDEBAR_COLLAPSED_WIDTH
    } else {
        active_width
    };

    let breakpoint_cls = if is_collapsed {
        "sidebar-resized-collapsed"
    } else if current_width < SIDEBAR_BREAKPOINT_VALUE_COLLAPSED {
        "sidebar-resized-account-value-and-refer-label-collapsed"
    } else {
        ""
    };
    let resizing_cls = if resizing_now {
        "is-resizing"
    } else {
        "is-transitioning"
    };
    let width_style = format!("width: {current_width}px;");

    rsx! {
        nav {
            class: "ynab-u sidebar logged-in {breakpoint_cls} {resizing_cls}",
            style: "{width_style}",
            role: "navigation",
            div {
                class: "sidebar-left",
                div {
                    class: "sidebar-contents",
                    SidebarNav {}
                }
                div {
                    class: "sidebar-bottom",
                    if is_collapsed {
                        button {
                            class: "sidebar-expand",
                            aria_label: "Expand Sidebar",
                            aria_describedby: "sidebar-expand-tooltip",
                            title: "Expand Sidebar",
                            r#type: "button",
                            onclick: move |_| {
                                store.sidebar_collapsed.set(false);
                            },
                            Icon { name: "sidebar_open", width: 24 }
                        }
                    } else {
                        button {
                            class: "sidebar-collapse",
                            aria_label: "Toggle Sidebar",
                            title: "Collapse Sidebar",
                            r#type: "button",
                            onclick: move |_| {
                                store.sidebar_collapsed.set(true);
                            },
                            Icon { name: "sidebar_close", width: 24 }
                        }
                    }
                }
            }
            if !is_collapsed {
                div {
                    class: "sidebar-resizer",
                    title: "Drag to resize sidebar (double-click to reset)",
                    onmousedown: move |evt| {
                        evt.prevent_default();
                        let start_x = evt.client_coordinates().x as i32;
                        let start_w = *preferred_width.read();
                        drag_start_x.set(start_x);
                        drag_start_width.set(start_w);
                        is_resizing.set(true);
                    },
                    ondoubleclick: move |_| {
                        preferred_width.set(SIDEBAR_RESIZE_DEFAULT);
                        save_persisted_sidebar_width(&store, SIDEBAR_RESIZE_DEFAULT);
                    },
                    div { class: "sidebar-resizer-indicator" }
                }
            }
            if resizing_now {
                div {
                    class: "sidebar-resizer-backdrop",
                    onmousemove: move |evt| {
                        let cur_x = evt.client_coordinates().x as i32;
                        let delta = cur_x - *drag_start_x.read();
                        let raw_w = *drag_start_width.read() + delta;
                        if raw_w < SIDEBAR_COLLAPSE_SNAP_WIDTH {
                            store.sidebar_collapsed.set(true);
                            is_resizing.set(false);
                        } else {
                            let clamped = raw_w.clamp(SIDEBAR_RESIZE_MIN, SIDEBAR_RESIZE_MAX);
                            preferred_width.set(clamped);
                        }
                    },
                    onmouseup: move |_| {
                        is_resizing.set(false);
                        let final_w = (*preferred_width.read()).clamp(SIDEBAR_RESIZE_MIN, SIDEBAR_RESIZE_MAX);
                        save_persisted_sidebar_width(&store, final_w);
                    },
                    onmouseleave: move |_| {
                        is_resizing.set(false);
                        let final_w = (*preferred_width.read()).clamp(SIDEBAR_RESIZE_MIN, SIDEBAR_RESIZE_MAX);
                        save_persisted_sidebar_width(&store, final_w);
                    },
                }
            }
        }
    }
}

/// Primary sidebar navigation (plan switcher button, `ul.nav-main`, `AccountsList`, `PlanMenuPopover`).
#[component]
pub fn SidebarNav() -> Element {
    let mut store = use_context::<AppStore>();
    let budget_name = store.plan_summary.read().name.clone();
    let ws = store.workspace.read().clone();
    let is_budget = matches!(ws, ActiveWorkspace::Budget);
    let is_reflect = matches!(ws, ActiveWorkspace::Reflect);
    let is_all_accounts = matches!(ws, ActiveWorkspace::Accounts(None));

    rsx! {
        div {
            class: "sidebar-nav",
            button {
                class: "sidebar-nav-menu sidebar-nav-menu-budget js-sidebar-nav-menu user-data",
                r#type: "button",
                onclick: move |_| {
                    let curr = *store.plan_menu_open.read();
                    store.plan_menu_open.set(!curr);
                },
                Icon {
                    class: "sidebar-nav-ynab",
                    name: "ynab_logo",
                    width: 24,
                    title: "{budget_name}"
                }
                div {
                    class: "sidebar-nav-budget-email",
                    span {
                        class: "sidebar-nav-budget-email-budget",
                        "{budget_name}"
                    }
                    span {
                        class: "sidebar-nav-budget-email-email button-truncate",
                        "local@ynabx.desktop"
                    }
                }
                Icon {
                    class: "sidebar-nav-arrow",
                    name: "caret_down",
                    width: 12
                }
            }

            ul {
                class: "nav-main",
                li {
                    class: "navlink sidebar-nav-menu-collapsed",
                    button {
                        class: "js-sidebar-nav-menu",
                        r#type: "button",
                        onclick: move |_| {
                            let curr = *store.plan_menu_open.read();
                            store.plan_menu_open.set(!curr);
                        },
                        Icon {
                            name: "ynab_logo",
                            width: 24,
                            title: "{budget_name}"
                        }
                    }
                }
                li {
                    class: if is_budget { "navlink navlink-budget active" } else { "navlink navlink-budget" },
                    a {
                        href: "/budget",
                        onclick: move |evt| {
                            evt.prevent_default();
                            store.navigate_to(ActiveWorkspace::Budget);
                        },
                        Icon { name: "cash_in_envelope", width: 20 }
                        div { class: "navlink-label", "Plan" }
                    }
                }
                li {
                    class: if is_reflect { "navlink navlink-reports active" } else { "navlink navlink-reports" },
                    a {
                        href: "/reflect",
                        onclick: move |evt| {
                            evt.prevent_default();
                            store.navigate_to(ActiveWorkspace::Reflect);
                        },
                        Icon { name: "bar_chart", width: 20 }
                        div { class: "navlink-label", "Reflect" }
                    }
                }
                li {
                    class: if is_all_accounts { "navlink navlink-accounts active" } else { "navlink navlink-accounts" },
                    a {
                        href: "/accounts",
                        onclick: move |evt| {
                            evt.prevent_default();
                            store.navigate_to(ActiveWorkspace::Accounts(None));
                        },
                        Icon { name: "bank", width: 20 }
                        div { class: "navlink-label", "All Accounts" }
                    }
                }
            }

            AccountsList {}
            PlanMenuPopover {}
        }
    }
}

/// Sidebar accounts hierarchy (`div.nav-accounts` + `Add Account` CTA).
#[component]
pub fn AccountsList() -> Element {
    let mut store = use_context::<AppStore>();
    let grouped = store.grouped_accounts();
    let loan_meta_map = query_loan_sidebar_meta(&store);
    let no_accounts = grouped.cash.is_empty()
        && grouped.credit.is_empty()
        && grouped.loan.is_empty()
        && grouped.tracking.is_empty()
        && grouped.closed.is_empty();

    let collapsed_groups = use_signal(|| load_collapsed_account_groups(&store));
    let dragging_account = use_signal(|| None::<(String, usize, String)>);

    rsx! {
        div {
            class: "nav-accounts",
            if !grouped.cash.is_empty() {
                NavAccountGroup {
                    group_type: "cash",
                    group_name: "CASH",
                    accounts: grouped.cash,
                    loan_meta_map: loan_meta_map.clone(),
                    collapsed_groups: collapsed_groups,
                    dragging_account: dragging_account,
                }
            }
            if !grouped.credit.is_empty() {
                NavAccountGroup {
                    group_type: "credit",
                    group_name: "CREDIT",
                    accounts: grouped.credit,
                    loan_meta_map: loan_meta_map.clone(),
                    collapsed_groups: collapsed_groups,
                    dragging_account: dragging_account,
                }
            }
            if !grouped.loan.is_empty() {
                NavAccountGroup {
                    group_type: "loan",
                    group_name: "LOANS",
                    accounts: grouped.loan,
                    loan_meta_map: loan_meta_map.clone(),
                    collapsed_groups: collapsed_groups,
                    dragging_account: dragging_account,
                }
            }
            if !grouped.tracking.is_empty() {
                NavAccountGroup {
                    group_type: "offBudget",
                    group_name: "TRACKING",
                    accounts: grouped.tracking,
                    loan_meta_map: loan_meta_map.clone(),
                    collapsed_groups: collapsed_groups,
                    dragging_account: dragging_account,
                }
            }
            if !grouped.closed.is_empty() {
                NavAccountGroup {
                    group_type: "closed",
                    group_name: "CLOSED",
                    accounts: grouped.closed,
                    loan_meta_map: loan_meta_map,
                    collapsed_groups: collapsed_groups,
                    dragging_account: dragging_account,
                }
            }
        }

        div {
            class: "nav-add-accounts",
            if no_accounts {
                div {
                    class: "nav-accounts-empty-state",
                    h5 { "No Accounts" }
                    p { "You can't plan without adding accounts to YNAB first. How about adding one now?" }
                }
            }
            YnabButton {
                class: "button-sidebar nav-add-account",
                variant: "contrast",
                onclick: move |_| {
                    store.active_modal.set(ActiveModal::AddAccount);
                },
                Icon { name: "plus_circle_fill", width: 12 }
                "Add Account"
            }
        }
    }
}

/// Collapsible sidebar account group (`CASH`, `CREDIT`, `LOANS`, `TRACKING`, `CLOSED`).
#[component]
pub fn NavAccountGroup(
    group_type: String,
    group_name: String,
    accounts: Vec<AccountDto>,
    #[props(default)] loan_meta_map: HashMap<String, LoanSidebarMeta>,
    mut collapsed_groups: Signal<HashSet<String>>,
    dragging_account: Signal<Option<(String, usize, String)>>,
) -> Element {
    let mut store = use_context::<AppStore>();
    let is_closed = group_type == "closed";
    let is_loan_group = group_type == "loan";
    let is_collapsed = collapsed_groups.read().contains(&group_type);
    let total_balance: i64 = accounts.iter().map(|a| a.balance_milliunits).sum();
    let formatted_total = store.format_money(total_balance);
    let total_span_cls = account_balance_span_class(total_balance, is_loan_group);

    let selected_acc_id = match &*store.workspace.read() {
        ActiveWorkspace::Accounts(Some(id)) => Some(id.clone()),
        _ => None,
    };
    let editing_acc_id = match &*store.active_modal.read() {
        ActiveModal::EditAccount(a) => Some(a.id.clone()),
        _ => None,
    };
    let is_group_dragging = dragging_account
        .read()
        .as_ref()
        .is_some_and(|(gt, _, _)| gt == &group_type);

    let aria_label = format!(
        "{} {}",
        if is_collapsed { "open" } else { "collapse" },
        group_name
    );
    let gt_toggle = group_type.clone();
    let all_group_ids: Vec<String> = accounts.iter().map(|a| a.id.clone()).collect();

    let group_cls = [
        "nav-account",
        group_type.as_str(),
        if is_collapsed { "is-collapsed" } else { "" },
        if is_group_dragging {
            "account-is-dragging"
        } else {
            ""
        },
    ]
    .into_iter()
    .filter(|s| !s.is_empty())
    .collect::<Vec<_>>()
    .join(" ");

    rsx! {
        div {
            class: "{group_cls}",
            div {
                class: "nav-account-block",
                onclick: move |_| {
                    {
                        let mut set = collapsed_groups.write();
                        if set.contains(&gt_toggle) {
                            set.remove(&gt_toggle);
                        } else {
                            set.insert(gt_toggle.clone());
                        }
                    }
                    let snapshot = collapsed_groups.read().clone();
                    save_collapsed_account_groups(&store, &snapshot);
                },
                div {
                    class: "nav-account-name",
                    button {
                        class: "nav-account-name-button user-data",
                        aria_label: "{aria_label}",
                        aria_expanded: !is_collapsed,
                        r#type: "button",
                        Icon {
                            class: "nav-account-chevron",
                            name: "chevron_down",
                            width: 8,
                        }
                        div { "{group_name}" }
                    }
                    if !is_closed {
                        button {
                            class: "nav-account-add-account",
                            r#type: "button",
                            title: "Add Account",
                            aria_label: "Add Account to {group_name}",
                            onclick: move |evt| {
                                evt.stop_propagation();
                                store.active_modal.set(ActiveModal::AddAccount);
                            },
                            Icon { name: "plus_circle_fill", width: 10 }
                        }
                    }
                }
                div {
                    class: "nav-account-value nav-account-block-value user-data",
                    if !is_closed {
                        span { class: "{total_span_cls}", "{formatted_total}" }
                    }
                }
                div { class: "nav-account-icons nav-account-icons-right" }
            }

            div {
                class: "nav-account-accordion",
                aria_hidden: is_collapsed,
                div {
                    class: "nav-account-accordion-inner",
                    for (index, acc) in accounts.iter().enumerate() {
                        NavAccountRow {
                            key: "{acc.id}",
                            account: acc.clone(),
                            group_type: group_type.clone(),
                            index: index,
                            all_group_ids: all_group_ids.clone(),
                            is_loan_group: is_loan_group,
                            loan_meta: loan_meta_map.get(&acc.id).cloned(),
                            is_selected: selected_acc_id.as_deref() == Some(acc.id.as_str()),
                            is_editing: editing_acc_id.as_deref() == Some(acc.id.as_str()),
                            dragging_account: dragging_account,
                        }
                    }
                }
            }
        }
    }
}

/// Draggable account link row (`a.nav-account-row`) matching `NavAccountRow.tsx`.
#[component]
pub fn NavAccountRow(
    account: AccountDto,
    group_type: String,
    index: usize,
    all_group_ids: Vec<String>,
    #[props(default = false)] is_loan_group: bool,
    #[props(default)] loan_meta: Option<LoanSidebarMeta>,
    #[props(default = false)] is_selected: bool,
    #[props(default = false)] is_editing: bool,
    mut dragging_account: Signal<Option<(String, usize, String)>>,
) -> Element {
    let mut store = use_context::<AppStore>();
    let acc_id = account.id.clone();
    let acc_id_nav = account.id.clone();
    let acc_id_drag = account.id.clone();
    let acc_edit_ctx = account.clone();
    let acc_edit_btn = account.clone();

    let is_loan = is_loan_group || account.sidebar_group() == AccountGroup::Loan;
    let is_missing_loan_details =
        is_loan && loan_meta.as_ref().is_none_or(|m| m.is_missing_details);
    let loan_payoff_pct = if is_loan {
        loan_meta.as_ref().and_then(|m| {
            compute_loan_payoff_pct(m.original_balance_milliunits, account.balance_milliunits)
        })
    } else {
        None
    };

    let has_uncleared = account.uncleared_balance_milliunits != 0;
    let formatted_bal = store.format_money(account.balance_milliunits);
    let bal_span_cls = account_balance_span_class(account.balance_milliunits, is_loan);

    let gt_drag = group_type.clone();
    let gt_drop = group_type;

    let row_cls = [
        "nav-account-row",
        if is_selected { "is-selected" } else { "" },
        if is_editing {
            "is-editing-this-account"
        } else {
            ""
        },
    ]
    .into_iter()
    .filter(|s| !s.is_empty())
    .collect::<Vec<_>>()
    .join(" ");

    rsx! {
        a {
            class: "{row_cls}",
            draggable: "true",
            href: "/accounts/{acc_id}",
            "data-account-id": "{acc_id}",
            ondragstart: move |_| {
                dragging_account.set(Some((gt_drag.clone(), index, acc_id_drag.clone())));
            },
            ondragover: move |evt| {
                evt.prevent_default();
            },
            ondrop: move |evt| {
                evt.prevent_default();
                let drag_val = dragging_account.read().clone();
                if let Some((from_gt, from_idx, _)) = drag_val {
                    if from_gt == gt_drop && from_idx != index {
                        let reordered = reorder_list_by_gap(&all_group_ids, from_idx, index);
                        store.reorder_accounts(reordered);
                    }
                }
                dragging_account.set(None);
            },
            onclick: move |evt| {
                evt.prevent_default();
                store.navigate_to(ActiveWorkspace::Accounts(Some(acc_id_nav.clone())));
            },
            oncontextmenu: move |evt| {
                evt.prevent_default();
                store.active_modal.set(ActiveModal::EditAccount(acc_edit_ctx.clone()));
            },
            div {
                class: "nav-account-icons nav-account-icons-left js-nav-account-icons-left",
                title: "Edit Account",
                onclick: move |evt| {
                    evt.stop_propagation();
                    evt.prevent_default();
                    store.active_modal.set(ActiveModal::EditAccount(acc_edit_btn.clone()));
                },
                if has_uncleared || is_missing_loan_details {
                    Icon { class: "dot", name: "circle_fill", width: 8 }
                }
                Icon { class: "edit", name: "pencil", width: 12 }
            }
            div {
                class: "nav-account-name user-data",
                title: "{account.name}",
                "{account.name}"
            }
            div {
                class: "nav-account-value user-data",
                span { class: "{bal_span_cls}", "{formatted_bal}" }
            }
            if is_missing_loan_details {
                div {
                    class: "nav-account-icons nav-account-icons-right",
                    title: "Add Loan Account Details",
                    Icon { name: "gear", width: 14 }
                }
            } else if let Some(paid_pct) = loan_payoff_pct {
                div {
                    class: "nav-account-icons nav-account-icons-right badged loan-progress-badge",
                    title: "Loan Debt Payoff Progress: {paid_pct}%",
                    "{paid_pct}%"
                }
            } else if is_loan {
                div {
                    class: "nav-account-icons nav-account-icons-right badged loan-progress-badge",
                    title: "Loan Debt Balance: {formatted_bal}",
                    "Debt"
                }
            } else {
                div { class: "nav-account-icons nav-account-icons-right" }
            }
        }
    }
}

/// Top-left Plan/Budget Settings menu (`div.menu.js-menu.ynab-new-settings-menu`) built with `YnabMenu`.
#[component]
pub fn PlanMenuPopover() -> Element {
    let mut store = use_context::<AppStore>();
    let is_open = *store.plan_menu_open.read();
    if !is_open {
        return rsx! {};
    }

    let budgets = store.available_budgets.read().clone();
    let is_hide_amounts = *store.hide_amounts.read();
    let mut is_submenu_open = use_signal(|| false);

    rsx! {
        div {
            class: "plan-menu-backdrop",
            onclick: move |_| {
                store.plan_menu_open.set(false);
            },
            YnabMenu {
                class: "ynab-new-settings-menu plan-menu-popover",

                MenuItem {
                    class: "modal-select-budget-create",
                    leading_icon: Some("plus_circle_fill".to_string()),
                    onclick: move |_| {
                        store.plan_menu_open.set(false);
                        store.active_modal.set(ActiveModal::PlanSettings { is_create: true });
                    },
                    span { class: "menu-item-label", "New Plan" }
                }

                // 2. Open Plan (container div avoids nesting interactive submenu buttons inside a button)
                div {
                    class: if *is_submenu_open.read() {
                        "menu-item js-menu-item modal-select-budget-open has-submenu is-submenu-visible"
                    } else {
                        "menu-item js-menu-item modal-select-budget-open has-submenu"
                    },
                    role: "menuitem",
                    onmouseenter: move |_| is_submenu_open.set(true),
                    onmouseleave: move |_| is_submenu_open.set(false),
                    onclick: move |_| {
                        let cur = *is_submenu_open.read();
                        is_submenu_open.set(!cur);
                    },
                    Icon { name: "folder", width: 16 }
                    span { class: "menu-item-label", "Open Plan" }
                    Icon { name: "chevron_right", class: "menu-item-disclosure", width: 12 }

                    if *is_submenu_open.read() {
                        YnabMenu {
                            class: "settings-menu-recent-budgets",
                            MenuHeading { "Recent Plans" }
                            for (b_id, b_name) in budgets.iter() {
                                {
                                    let b_id_clone = b_id.clone();
                                    let b_name_clone = b_name.clone();
                                    rsx! {
                                        MenuItem {
                                            key: "{b_id_clone}",
                                            class: "recent-budgets-budget-open",
                                            leading_icon: Some("document".to_string()),
                                            onclick: move |evt: MouseEvent| {
                                                evt.stop_propagation();
                                                store.plan_menu_open.set(false);
                                                store.switch_budget(&b_id_clone);
                                            },
                                            span { class: "menu-item-label", "{b_name_clone}" }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                MenuSeparator {}
                MenuHeading { "Current Plan" }

                MenuItem {
                    class: "modal-select-budget-settings",
                    leading_icon: Some("wrench".to_string()),
                    onclick: move |_| {
                        store.plan_menu_open.set(false);
                        store.active_modal.set(ActiveModal::PlanSettings { is_create: false });
                    },
                    span { class: "menu-item-label", "Plan Settings" }
                }

                MenuItem {
                    class: "modal-select-budget-manage-payees",
                    leading_icon: Some("arrows_circle_fill".to_string()),
                    onclick: move |_| {
                        store.plan_menu_open.set(false);
                        store.active_modal.set(ActiveModal::ManagePayees);
                    },
                    span { class: "menu-item-label", "Manage Payees" }
                }

                MenuItem {
                    class: "modal-select-budget-flag-names",
                    leading_icon: Some("flag_fill".to_string()),
                    onclick: move |_| {
                        store.plan_menu_open.set(false);
                        store.active_modal.set(ActiveModal::EditFlags);
                    },
                    span { class: "menu-item-label", "Edit Flags" }
                }

                MenuItem {
                    class: "modal-select-theme-switcher",
                    leading_icon: Some("paint_roller".to_string()),
                    onclick: move |_| {
                        store.plan_menu_open.set(false);
                        store.active_modal.set(ActiveModal::DisplayOptions);
                    },
                    span { class: "menu-item-label", "Display Options" }
                }

                MenuItem {
                    class: "modal-select-budget-export",
                    leading_icon: Some("document_with_arrow_down".to_string()),
                    onclick: move |_| {
                        store.plan_menu_open.set(false);
                        store.active_modal.set(ActiveModal::ExportPlan);
                    },
                    span { class: "menu-item-label", "Export Plan" }
                }

                MenuItem {
                    class: "modal-select-budget-fresh-start",
                    leading_icon: Some("leaf".to_string()),
                    onclick: move |_| {
                        store.plan_menu_open.set(false);
                        store.active_modal.set(ActiveModal::FreshStart);
                    },
                    span { class: "menu-item-label", "Make a Fresh Start" }
                }

                MenuSeparator {}
                MenuHeading { "View & Accessibility" }

                MenuItem {
                    class: "modal-select-hide-amounts",
                    leading_icon: Some("eye_slash".to_string()),
                    onclick: move |_| {
                        store.toggle_hide_amounts();
                    },
                    span {
                        class: "menu-item-label",
                        if is_hide_amounts { "Show Amounts" } else { "Hide Amounts" }
                    }
                    span { class: "ynab-badge", "New" }
                }

                MenuItem {
                    class: "modal-select-budget-keyboard-shortcuts",
                    leading_icon: Some("keyboard".to_string()),
                    onclick: move |_| {
                        store.plan_menu_open.set(false);
                        store.active_modal.set(ActiveModal::KeyboardShortcuts);
                    },
                    span { class: "menu-item-label", "Keyboard Shortcuts" }
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_build_body_class_sync_script_includes_theme_and_accessibility_flags() {
        let dark_js = build_body_class_sync_script("theme-dark", true, false, true);
        assert!(dark_js.contains("no-js mod_flexbox mod_flexwrap"));
        assert!(dark_js.contains("ember-application"));
        assert!(dark_js.contains("\"theme-dark\""));
        assert!(dark_js.contains("differentiate-without-color"));
        assert!(dark_js.contains("no-progress-bars"));
        assert!(dark_js.contains("hide-amounts"));

        let auto_js = build_body_class_sync_script("theme-match-system", false, true, false);
        assert!(auto_js.contains("prefers-color-scheme: dark"));
    }

    #[test]
    fn test_compute_loan_payoff_pct() {
        assert_eq!(compute_loan_payoff_pct(0, -100_000), None);
        assert_eq!(compute_loan_payoff_pct(-100_000, -100_000), Some(0));
        assert_eq!(compute_loan_payoff_pct(-100_000, -75_000), Some(25));
        assert_eq!(compute_loan_payoff_pct(-100_000, 0), Some(100));
    }
}
