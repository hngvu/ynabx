//! Budget Workspace (`BudgetWorkspace`, `BudgetHeader`, `BudgetViewRow`, `BudgetTable`,
//! `BudgetCategoryGroupSection`, `BudgetSubCategoryRow`, `BudgetInspector`, `TargetConfigurationForm`,
//! and Budget Popovers/Modals: `MoveMoneyModal`, `CoverOverspendingModal`, `ActivityTransactionsModal`,
//! `RtaBreakdownModal`, `MonthPickerModal`, `AddCategoryModal`, `EditCategoryModal`).
//! 100% integer milliunit arithmetic and 1:1 YNAB Ember DOM/CSS parity.

#![deny(clippy::float_arithmetic)]

use chrono::Local;
use dioxus::prelude::*;
use std::collections::HashMap;

use crate::interaction::reorder_list_by_gap;
use crate::state::{
    filter_categories_by_view, filter_category_monthly_transactions, ActiveModal, AppStore,
};
use crate::ui::core::{Icon, YnabButton};
use ynab_core::analytics::MONTH_NAMES;
use ynab_core::calc::calculator::{
    calculate_assigned_expression_milliunits, evaluate_formula_milliunits,
};
use ynab_core::calc::target_status::{
    calculate_category_target_status, CategoryTarget, TargetCadence, TargetType,
};
use ynab_core::repo::{
    get_setting, parse_year_month, set_setting, CategoryDto, CategoryGroupDto, SetGoalPayload,
};

/// Precomputed integer `(cos(2*pi*k/100)*1000, sin(2*pi*k/100)*1000)` for `k = 0..=25`
/// so circular SVG progress donuts require zero floating-point arithmetic.
const CIRCLE_Q1_MILLI: [(i32, i32); 26] = [
    (1000, 0),
    (998, 63),
    (992, 125),
    (982, 187),
    (969, 249),
    (951, 309),
    (930, 368),
    (905, 426),
    (876, 482),
    (844, 536),
    (809, 588),
    (771, 637),
    (729, 685),
    (685, 729),
    (637, 771),
    (588, 809),
    (536, 844),
    (482, 876),
    (426, 905),
    (368, 930),
    (309, 951),
    (249, 969),
    (187, 982),
    (125, 992),
    (63, 998),
    (0, 1000),
];

fn format_milli_coord(v: i32) -> String {
    if v < 0 {
        let a = v.abs();
        format!("-{}.{:03}", a / 1000, a % 1000)
    } else {
        format!("{}.{:03}", v / 1000, v % 1000)
    }
}

fn circle_arc_milli_coords(pct_clamped: i32) -> (String, String, i32) {
    let p = pct_clamped.clamp(0, 100);
    let (x, y) = if p <= 25 {
        CIRCLE_Q1_MILLI[p as usize]
    } else if p <= 50 {
        let (c, s) = CIRCLE_Q1_MILLI[(50 - p) as usize];
        (-c, s)
    } else if p <= 75 {
        let (c, s) = CIRCLE_Q1_MILLI[(p - 50) as usize];
        (-c, -s)
    } else {
        let (c, s) = CIRCLE_Q1_MILLI[(100 - p) as usize];
        (c, -s)
    };
    let large_arc = if p > 50 { 1 } else { 0 };
    (format_milli_coord(x), format_milli_coord(y), large_arc)
}

#[component]
fn IconCircleProgress(
    percentage_complete: i32,
    #[props(default = 13)] width: u32,
    #[props(default = 13)] height: u32,
    unique_id: String,
) -> Element {
    let is_zero = percentage_complete <= 0;
    let is_complete = percentage_complete >= 100;
    let clamped_arc_pct = percentage_complete.clamp(7, 93);
    let (end_x, end_y, large_arc) = circle_arc_milli_coords(clamped_arc_pct);
    let clip_id = format!("icon-circle-progress-clip-{unique_id}");
    let clip_url = format!("url(#{clip_id})");
    let arc_d = format!("M 1 0 A 1 1 0 {large_arc} 1 {end_x} {end_y} L 0 0");
    let cls = format!(
        "icon-circle-progress {} {}",
        if is_zero { "zero" } else { "" },
        if is_complete { "complete" } else { "" }
    );

    rsx! {
        svg {
            width: "{width}",
            height: "{height}",
            view_box: "-1 -1 2 2",
            class: "{cls}",
            defs {
                clipPath {
                    id: "{clip_id}",
                    if is_complete {
                        path {
                            class: "checkmark",
                            transform: "scale(.015) rotate(90) translate(-35, -28)",
                            d: "M62.7217 10.8417L30.1078 58.1502C29.4223 59.1438 28.4948 59.977 27.3909 60.5596C26.2858 61.1429 25.0439 61.454 23.773 61.454C22.5022 61.454 21.2603 61.1429 20.1551 60.5596C19.0513 59.977 18.1247 59.1451 17.4392 58.1515L1.27863 34.7095C0.350892 33.4061 -0.0848857 31.8439 0.0136661 30.2872C0.113302 28.7133 0.756408 27.1933 1.8757 26.0008L1.91649 25.9574L1.95863 25.9151C2.66751 25.2047 3.53559 24.6456 4.50937 24.2916C5.484 23.9373 6.53103 23.8009 7.57331 23.8971C8.61533 23.9933 9.61275 24.3184 10.4957 24.838C11.3768 25.3567 12.1179 26.0535 12.6786 26.8673L23.7732 42.9608L51.3201 3.00222C51.8809 2.18833 52.6235 1.48932 53.5048 0.970699C54.3877 0.451064 55.3851 0.126086 56.4272 0.0299405C57.4695 -0.0662309 58.5165 0.0703119 59.4911 0.424682C60.4648 0.778745 61.3328 1.33782 62.0417 2.04835L62.0837 2.09048L62.1244 2.13382C63.2435 3.32618 63.8866 4.84599 63.9863 6.41967C64.0849 7.97627 63.6493 9.53835 62.7217 10.8417Z",
                        }
                    } else {
                        path { d: "{arc_d}" }
                    }
                }
            }
            circle { r: ".9", cx: "0", cy: "0", stroke_width: ".2", class: "outer" }
            circle { r: ".65", cx: "0", cy: "0", class: "inner", clip_path: "{clip_url}" }
        }
    }
}

fn load_month_note_persisted(store: &AppStore, month_iso: &str) -> String {
    if let Some(in_mem) = store.month_notes.read().get(month_iso) {
        return in_mem.clone();
    }
    let budget_id = store.budget_id.read().clone();
    let conn_rc = store.conn.read().clone();
    let conn = conn_rc.borrow();
    get_setting(&conn, &budget_id, &format!("month_note_{month_iso}"))
        .ok()
        .flatten()
        .unwrap_or_default()
}

fn save_month_note_persisted(store: &mut AppStore, month_iso: &str, value: String) {
    store
        .month_notes
        .write()
        .insert(month_iso.to_string(), value.clone());
    let budget_id = store.budget_id.read().clone();
    let conn_rc = store.conn.read().clone();
    let conn = conn_rc.borrow();
    let _ = set_setting(
        &conn,
        &budget_id,
        &format!("month_note_{month_iso}"),
        &value,
    );
}

fn load_expected_income_persisted(store: &AppStore) -> i64 {
    let budget_id = store.budget_id.read().clone();
    let conn_rc = store.conn.read().clone();
    let conn = conn_rc.borrow();
    get_setting(&conn, &budget_id, "cost_to_be_me_expected_income")
        .ok()
        .flatten()
        .and_then(|v| v.trim().parse::<i64>().ok())
        .unwrap_or(0)
}

fn save_expected_income_persisted(store: &AppStore, amount_milliunits: i64) {
    let budget_id = store.budget_id.read().clone();
    let conn_rc = store.conn.read().clone();
    let conn = conn_rc.borrow();
    let _ = set_setting(
        &conn,
        &budget_id,
        "cost_to_be_me_expected_income",
        &amount_milliunits.to_string(),
    );
}

fn format_month_header_label(month_iso: &str) -> String {
    let (y, m) = parse_year_month(month_iso);
    let idx = (m.saturating_sub(1) as usize).min(11);
    format!("{} {}", MONTH_NAMES[idx], y)
}

fn format_month_full_name(month_iso: &str) -> &'static str {
    let (_, m) = parse_year_month(month_iso);
    match m {
        1 => "January",
        2 => "February",
        3 => "March",
        4 => "April",
        5 => "May",
        6 => "June",
        7 => "July",
        8 => "August",
        9 => "September",
        10 => "October",
        11 => "November",
        _ => "December",
    }
}

fn category_to_target(cat: &CategoryDto) -> Option<CategoryTarget> {
    let target_type = TargetType::from_str_opt(cat.goal_type.as_deref())?;
    let target_amount = cat.goal_target_amount.unwrap_or(0);
    if target_amount <= 0 && target_type != TargetType::DEBT {
        return None;
    }
    let cadence = match cat.goal_cadence {
        Some(2) => Some(TargetCadence::Weekly),
        Some(13) => Some(TargetCadence::Yearly),
        _ => Some(TargetCadence::Monthly),
    };
    Some(CategoryTarget {
        target_amount,
        target_type: Some(target_type),
        cadence,
        day_of_month: cat.goal_day,
        day_of_week: cat.goal_day,
        target_date: cat.goal_target_date.clone(),
        repeat_interval: cat.goal_cadence_frequency,
        repeat_unit: None,
        needs_whole_amount: cat.goal_needs_whole_amount,
    })
}

#[component]
pub fn BudgetWorkspace() -> Element {
    let store = use_context::<AppStore>();
    let month_iso = store.current_month.read().clone();
    let month_summary = store.month_summary.read().clone();
    let active_view = store.active_budget_view.read().clone();
    let show_hidden = *store.show_hidden_categories.read();

    let visible_groups =
        filter_categories_by_view(&month_summary.category_groups, &active_view, show_hidden);

    // Count overspent categories across all non-hidden groups
    let mut overspent_count = 0usize;
    let mut has_cash_overspending = false;
    for g in &month_summary.category_groups {
        for c in &g.categories {
            if !c.hidden && c.available_milliunits < 0 {
                overspent_count += 1;
                if c.cash_overspent_milliunits > 0 || c.credit_overspent_milliunits == 0 {
                    has_cash_overspending = true;
                }
            }
        }
    }

    rsx! {
        div {
            class: "ynab-u content",
            div {
                class: "content-min-break has-budget-views",
                BudgetHeader {}
                BudgetViewRow {
                    overspent_count: overspent_count,
                    has_cash_overspending: has_cash_overspending,
                }
                div {
                    class: "budget-table-and-inspector js-budget-table-and-inspector",
                    BudgetTable {
                        groups: visible_groups,
                        month_iso: month_iso,
                    }
                    BudgetInspector {}
                }
            }
        }
    }
}

#[component]
pub fn BudgetHeader(
    #[props(default)] on_undo: Option<EventHandler<MouseEvent>>,
    #[props(default)] on_redo: Option<EventHandler<MouseEvent>>,
    #[props(default)] on_open_recent_moves: Option<EventHandler<MouseEvent>>,
) -> Element {
    let mut store = use_context::<AppStore>();
    let month_iso = store.current_month.read().clone();
    let month_label = format_month_header_label(&month_iso);
    let current_calendar_month = Local::now().format("%Y-%m-01").to_string();
    let is_not_current_month = month_iso != current_calendar_month;

    let rta = store.month_summary.read().ready_to_assign_milliunits;
    let is_negative = rta < 0;
    let is_zero = rta == 0;
    let is_positive = rta > 0;
    let ur = store.undo_redo.read().clone();

    let rta_label = if is_negative {
        "You assigned more than you have"
    } else if is_zero {
        "All Money Assigned"
    } else {
        "Ready to Assign"
    };

    let button_label = if is_negative {
        Some("Fix This")
    } else if is_zero {
        None
    } else {
        Some("Assign")
    };
    let button_class = if is_zero {
        "to-be-budgeted-icon"
    } else {
        "to-be-budgeted-button"
    };
    let button_icon = if is_negative {
        None
    } else if is_zero {
        Some("check_circle_fill")
    } else {
        Some("caret_down")
    };

    let formatted_rta = store.format_money(rta);
    let note = load_month_note_persisted(&store, &month_iso);
    let mut is_editing_note = use_signal(|| false);
    let mut draft_note = use_signal(|| note.clone());
    let mut synced_note_month = use_signal(|| month_iso.clone());
    if *synced_note_month.read() != month_iso {
        synced_note_month.set(month_iso.clone());
        draft_note.set(note.clone());
        is_editing_note.set(false);
    }

    rsx! {
        header {
            class: if is_negative { "budget-header left-to-budget-is-negative" } else { "budget-header left-to-budget-is-positive" },
            div {
                class: "budget-header-flexbox",
                // 1. Calendar Navigation + "Today" Quick Jump
                div {
                    class: "budget-header-item budget-header-calendar",
                    button {
                        class: "budget-header-calendar-prev",
                        aria_label: "previous month budget",
                        r#type: "button",
                        onclick: move |_| store.prev_month(),
                        Icon { name: "chevron_left_circle", width: 30 }
                    }
                    div {
                        class: "budget-header-calendar-date",
                        button {
                            class: "budget-header-calendar-date-button",
                            r#type: "button",
                            onclick: move |_| {
                                store.active_modal.set(ActiveModal::MonthPicker);
                            },
                            "{month_label}"
                            Icon { name: "caret_down", width: 12 }
                        }
                        if *is_editing_note.read() {
                            input {
                                class: "user-data budget-header-note-input",
                                r#type: "text",
                                value: "{draft_note}",
                                placeholder: "Enter a note...",
                                autofocus: true,
                                oninput: move |e| draft_note.set(e.value()),
                                onblur: move |_| {
                                    let val = draft_note.read().clone();
                                    let m = store.current_month.read().clone();
                                    save_month_note_persisted(&mut store, &m, val);
                                    is_editing_note.set(false);
                                },
                                onkeydown: move |e| {
                                    if e.key() == Key::Enter {
                                        let val = draft_note.read().clone();
                                        let m = store.current_month.read().clone();
                                        save_month_note_persisted(&mut store, &m, val);
                                        is_editing_note.set(false);
                                    } else if e.key() == Key::Escape {
                                        let m = store.current_month.read().clone();
                                        draft_note.set(load_month_note_persisted(&store, &m));
                                        is_editing_note.set(false);
                                    }
                                }
                            }
                        } else {
                            button {
                                class: "budget-header-calendar-note user-data",
                                title: "{note}",
                                r#type: "button",
                                onclick: move |_| {
                                    draft_note.set(note.clone());
                                    is_editing_note.set(true);
                                },
                                if note.is_empty() { "Enter a note..." } else { "{note}" }
                            }
                        }
                    }
                    button {
                        class: "budget-header-calendar-next",
                        aria_label: "next month budget",
                        r#type: "button",
                        onclick: move |_| store.next_month(),
                        Icon { name: "chevron_right_circle", width: 30 }
                    }
                    if is_not_current_month {
                        YnabButton {
                            variant: "secondary".to_string(),
                            class: "button budget-header-go-to-today".to_string(),
                            onclick: move |_| store.set_month(current_calendar_month.clone()),
                            "Today"
                        }
                    }
                }

                // 2. Ready to Assign Banner
                div {
                    class: if is_negative { "budget-header-item budget-header-totals is-negative" } else { "budget-header-item budget-header-totals" },
                    div {
                        class: format!(
                            "to-be-budgeted {} {}",
                            if is_positive { "is-positive" } else { "" },
                            if is_negative { "is-negative" } else { "" }
                        ),
                        div {
                            class: "to-be-budgeted-heading-wrapper",
                            h1 {
                                id: "budget-header-rta-heading",
                                class: "to-be-budgeted-heading",
                                onclick: move |_| {
                                    store.active_modal.set(ActiveModal::RtaBreakdown);
                                },
                                div {
                                    class: "to-be-budgeted-amount",
                                    span {
                                        class: format!(
                                            "user-data currency tabular-nums {}",
                                            if is_zero { "zero" } else if is_positive { "positive" } else { "negative" }
                                        ),
                                        "{formatted_rta}"
                                    }
                                    Icon { name: "info_circle_fill", width: 16 }
                                }
                                div {
                                    class: "to-be-budgeted-label",
                                    "{rta_label}"
                                }
                            }
                            button {
                                class: "to-be-budgeted-view-breakdown",
                                aria_label: "View Ready to Assign Breakdown",
                                r#type: "button",
                                onclick: move |_| {
                                    store.active_modal.set(ActiveModal::RtaBreakdown);
                                }
                            }
                        }
                        button {
                            class: "to-be-budgeted-auto-assign {button_class}",
                            disabled: is_zero,
                            aria_label: button_label.unwrap_or(rta_label),
                            r#type: "button",
                            onclick: move |_| {
                                store.active_modal.set(ActiveModal::MoveMoney {
                                    from_category_id: None,
                                    from_category_name: Some("Ready to Assign".to_string()),
                                    to_category_id: None,
                                    initial_amount_milliunits: rta.max(0),
                                });
                            },
                            if let Some(lbl) = button_label {
                                span { class: "label", "{lbl}" }
                            }
                            if let Some(ic) = button_icon {
                                Icon {
                                    name: "{ic}",
                                    width: if is_zero { 16 } else { 8 },
                                    height: if is_zero { 16 } else { 8 },
                                }
                            }
                        }
                    }
                }

                // 3. Header Actions (Quick Undo/Redo/Recent Moves triggers + Share / Plan Settings)
                div {
                    class: "budget-header-item budget-header-share budget-header-actions",
                    if on_undo.is_some() {
                        button {
                            class: if ur.can_undo {
                                "ynab-button secondary undo-button"
                            } else {
                                "ynab-button secondary undo-button button-disabled"
                            },
                            disabled: !ur.can_undo,
                            title: ur.undo_label.as_deref().unwrap_or("Undo"),
                            r#type: "button",
                            onclick: move |evt| {
                                if let Some(cb) = &on_undo {
                                    cb.call(evt);
                                } else {
                                    store.undo();
                                }
                            },
                            Icon { name: "undo", width: 12, height: 12 }
                        }
                    }
                    if on_redo.is_some() {
                        button {
                            class: if ur.can_redo {
                                "ynab-button secondary redo-button"
                            } else {
                                "ynab-button secondary redo-button button-disabled"
                            },
                            disabled: !ur.can_redo,
                            title: ur.redo_label.as_deref().unwrap_or("Redo"),
                            r#type: "button",
                            onclick: move |evt| {
                                if let Some(cb) = &on_redo {
                                    cb.call(evt);
                                } else {
                                    store.redo();
                                }
                            },
                            Icon { name: "redo", width: 12, height: 12 }
                        }
                    }
                    if let Some(cb_rm) = on_open_recent_moves {
                        button {
                            class: "ynab-button secondary budget-header-recent-moves-button",
                            r#type: "button",
                            title: "Recent Moves",
                            onclick: move |evt| cb_rm.call(evt),
                            Icon { name: "clock_arrow_back", width: 14, height: 14 }
                            "Recent Moves"
                        }
                    }
                    button {
                        class: "ynab-button budget-header-share-button",
                        r#type: "button",
                        onclick: move |_| {
                            store.active_modal.set(ActiveModal::PlanSettings { is_create: false });
                        },
                        Icon { name: "add_user", width: 16 }
                        "Add Member"
                    }
                }
            }
        }
    }
}

#[component]
pub fn BudgetViewRow(overspent_count: usize, has_cash_overspending: bool) -> Element {
    let mut store = use_context::<AppStore>();
    let active_view = store.active_budget_view.read().clone();

    let mut views: Vec<(String, String, Option<String>, String)> =
        vec![("all".to_string(), "All".to_string(), None, String::new())];

    if overspent_count > 0 || active_view == "overspent" {
        let overspent_cls = if has_cash_overspending {
            "view-button-overspent overspent-cash"
        } else {
            "view-button-overspent overspent-credit"
        };
        views.push((
            "overspent".to_string(),
            format!("{overspent_count} Overspent"),
            Some("exclamation_mark_triangle_fill".to_string()),
            overspent_cls.to_string(),
        ));
    }

    views.push((
        "underfunded".to_string(),
        "Underfunded".to_string(),
        None,
        String::new(),
    ));
    views.push((
        "overfunded".to_string(),
        "Overfunded".to_string(),
        None,
        String::new(),
    ));
    views.push((
        "money-available".to_string(),
        "Money Available".to_string(),
        None,
        String::new(),
    ));
    views.push((
        "snoozed".to_string(),
        "Snoozed".to_string(),
        None,
        String::new(),
    ));

    rsx! {
        section {
            class: "budget-view-row",
            ul {
                class: "budget-view-buttons",
                for (idx, (v_id, v_label, v_icon, v_cls)) in views.iter().enumerate() {
                    {
                        let vid = v_id.clone();
                        let is_sel = active_view == *v_id;
                        rsx! {
                            li {
                                key: "{vid}",
                                class: format!(
                                    "view-button-item index-{} condensed {}",
                                    idx,
                                    if is_sel { "selected" } else { "" }
                                ),
                                button {
                                    class: format!(
                                        "view-button {} {}",
                                        v_cls,
                                        if is_sel { "selected" } else { "" }
                                    ),
                                    r#type: "button",
                                    onclick: move |_| {
                                        store.active_budget_view.set(vid.clone());
                                    },
                                    if let Some(icon_name) = v_icon {
                                        Icon {
                                            class: "view-button-icon",
                                            name: "{icon_name}",
                                            width: 13,
                                            height: 13,
                                        }
                                    }
                                    "{v_label}"
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

#[component]
pub fn BudgetTable(
    groups: Vec<CategoryGroupDto>,
    month_iso: String,
    #[props(default)] on_open_recent_moves: Option<EventHandler<MouseEvent>>,
) -> Element {
    let mut store = use_context::<AppStore>();
    let show_bars = *store.show_progress_bars.read();
    let ur = store.undo_redo.read().clone();
    let active_view = store.active_budget_view.read().clone();
    let selected_ids = store.selected_category_ids.read().clone();
    let collapsed_groups = store.collapsed_category_groups.read().clone();

    let all_subcat_ids: Vec<String> = groups
        .iter()
        .flat_map(|g| g.categories.iter().map(|c| c.id.clone()))
        .collect();
    let is_all_checked =
        !all_subcat_ids.is_empty() && all_subcat_ids.iter().all(|id| selected_ids.contains(id));

    let is_empty_view = all_subcat_ids.is_empty() && active_view != "all";
    let dragging_group = use_signal(|| None::<(usize, String)>);
    let dragging_subcat = use_signal(|| None::<(String, usize, String)>);

    // Count hidden categories in full summary
    let hidden_count: usize = store
        .month_summary
        .read()
        .category_groups
        .iter()
        .flat_map(|g| &g.categories)
        .filter(|c| c.hidden)
        .count();
    let show_hidden = *store.show_hidden_categories.read();

    rsx! {
        section {
            class: format!(
                "budget-table-container {} {}",
                if show_bars { "is-expanded" } else { "" },
                if is_empty_view { "zero-visible-categories" } else { "" }
            ),
            div {
                class: "budget-table",
                role: "treegrid",
                // Table Header: Action Toolbar & Column Header Labels
                div {
                    class: "budget-table-header",
                    role: "rowgroup",
                    div {
                        class: "budget-toolbar",
                        role: "row",
                        div {
                            role: "cell",
                            button {
                                class: "ghost-button primary type-body budget-toolbar-add-category",
                                r#type: "button",
                                onclick: move |_| {
                                    store.active_modal.set(ActiveModal::AddMasterCategory);
                                },
                                Icon { name: "plus_circle_fill", width: 16, height: 16 }
                                "Category Group"
                            }
                        }
                        div {
                            role: "cell",
                            span {
                                class: "undo-redo-container js-undo-redo-container",
                                button {
                                    class: if ur.can_undo {
                                        "ghost-button primary type-body undo-button"
                                    } else {
                                        "ghost-button primary type-body undo-button button-disabled"
                                    },
                                    r#type: "button",
                                    disabled: !ur.can_undo,
                                    title: ur.undo_label.as_deref().unwrap_or("Undo"),
                                    onclick: move |_| store.undo(),
                                    Icon { name: "undo", width: 12, height: 12 }
                                    "Undo"
                                }
                                button {
                                    class: if ur.can_redo {
                                        "ghost-button primary type-body redo-button"
                                    } else {
                                        "ghost-button primary type-body redo-button button-disabled"
                                    },
                                    r#type: "button",
                                    disabled: !ur.can_redo,
                                    title: ur.redo_label.as_deref().unwrap_or("Redo"),
                                    onclick: move |_| store.redo(),
                                    Icon { name: "redo", width: 12, height: 12 }
                                    "Redo"
                                }
                            }
                        }
                        div {
                            role: "cell",
                            span {
                                class: "recent-moves-open-modal-container",
                                button {
                                    class: "ghost-button primary type-body budget-toolbar-open-recent-moves",
                                    r#type: "button",
                                    title: "Recent Moves (Last 34 days)",
                                    onclick: move |evt| {
                                        if let Some(cb) = &on_open_recent_moves {
                                            cb.call(evt);
                                        } else {
                                            store.active_modal.set(ActiveModal::RecentMoves);
                                        }
                                    },
                                    Icon { name: "clock_arrow_back", width: 14, height: 14 }
                                    div {
                                        id: "js-recent-moves-title",
                                        "Recent Moves"
                                    }
                                }
                            }
                        }
                        if hidden_count > 0 {
                            div {
                                role: "cell",
                                button {
                                    class: "ghost-button primary type-body",
                                    r#type: "button",
                                    onclick: move |_| {
                                        let cur = *store.show_hidden_categories.read();
                                        store.show_hidden_categories.set(!cur);
                                    },
                                    Icon { name: "eye_slash", width: 14, height: 14 }
                                    if show_hidden {
                                        "Hide Hidden ({hidden_count})"
                                    } else {
                                        "Hidden Categories ({hidden_count})"
                                    }
                                }
                            }
                        }
                        div {
                            class: "budget-toolbar-progress-toggle-cell",
                            role: "cell",
                            div {
                                class: "segmented-control iconOnlyOption progress-bars-toggle",
                                role: "tablist",
                                tabindex: 0,
                                button {
                                    class: if show_bars { "segmented-control-button selected" } else { "segmented-control-button" },
                                    aria_selected: show_bars,
                                    role: "tab",
                                    title: "Progress Bars On",
                                    aria_label: "Progress Bars On",
                                    r#type: "button",
                                    onclick: move |_| store.show_progress_bars.set(true),
                                    Icon { name: "progress_bars_on", width: 12, height: 12 }
                                }
                                button {
                                    class: if !show_bars { "segmented-control-button selected" } else { "segmented-control-button" },
                                    aria_selected: !show_bars,
                                    role: "tab",
                                    title: "Progress Bars Off",
                                    aria_label: "Progress Bars Off",
                                    r#type: "button",
                                    onclick: move |_| store.show_progress_bars.set(false),
                                    Icon { name: "progress_bars_off", width: 12, height: 12 }
                                }
                            }
                        }
                    }

                    // Column Header Labels
                    div {
                        class: "budget-table-header-labels budget-table-row-ul",
                        role: "row",
                        div {
                            class: "budget-table-cell-margin-left budget-table-row-li",
                            aria_hidden: "true",
                            "\u{00a0}"
                        }
                        div {
                            class: "budget-table-cell-collapse budget-table-row-li",
                            role: "columnheader",
                            aria_colindex: 2,
                            button {
                                class: "js-budget-table-cell-collapse",
                                aria_label: "Collapse all",
                                title: "Collapse all",
                                r#type: "button",
                                onclick: move |_| {
                                    let all_grp_ids: Vec<String> = groups.iter().map(|g| g.id.clone()).collect();
                                    let any_expanded = all_grp_ids.iter().any(|id| !collapsed_groups.contains(id));
                                    let mut set = store.collapsed_category_groups.write();
                                    if any_expanded {
                                        for id in all_grp_ids {
                                            set.insert(id);
                                        }
                                    } else {
                                        set.clear();
                                    }
                                },
                                Icon { name: "chevron_down", width: 10, height: 10 }
                            }
                        }
                        div {
                            class: "budget-table-cell-checkbox budget-table-row-li",
                            role: "columnheader",
                            aria_colindex: 1,
                            button {
                                class: if is_all_checked {
                                    "ynab-checkbox ynab-checkbox-button is-checked"
                                } else {
                                    "ynab-checkbox ynab-checkbox-button"
                                },
                                role: "checkbox",
                                aria_checked: is_all_checked,
                                aria_label: "Check all",
                                r#type: "button",
                                onclick: move |_| {
                                    let mut sel = store.selected_category_ids.write();
                                    if is_all_checked {
                                        sel.clear();
                                    } else {
                                        for id in &all_subcat_ids {
                                            sel.insert(id.clone());
                                        }
                                    }
                                },
                                Icon {
                                    class: if is_all_checked { "ynab-checkbox-button-square is-checked" } else { "ynab-checkbox-button-square" },
                                    name: "check",
                                    width: 13,
                                    height: 13,
                                }
                            }
                        }
                        div {
                            class: "budget-table-cell-name budget-table-row-li",
                            role: "columnheader",
                            aria_colindex: 3,
                            "CATEGORY"
                        }
                        div {
                            class: "budget-table-cell-budgeted budget-table-row-li",
                            role: "columnheader",
                            aria_colindex: 4,
                            "ASSIGNED"
                        }
                        div {
                            class: "budget-table-cell-activity budget-table-row-li",
                            role: "columnheader",
                            aria_colindex: 5,
                            "ACTIVITY"
                        }
                        div {
                            class: "budget-table-cell-available budget-table-row-li",
                            role: "columnheader",
                            aria_colindex: 6,
                            strong { "AVAILABLE" }
                        }
                        div {
                            class: "budget-table-cell-margin-right budget-table-row-li",
                            aria_hidden: "true",
                            "\u{00a0}"
                        }
                    }
                }

                // Category Groups or Empty Filter State
                if is_empty_view {
                    div {
                        class: "budget-views-empty-state",
                        div {
                            class: "budget-views-empty-state-content",
                            div {
                                class: "budget-views-empty-state-subheader",
                                div {
                                    class: "type-body-bold budget-views-empty-state-title",
                                    "No categories match this view"
                                }
                                p { "All of your categories for this filter are taken care of!" }
                                YnabButton {
                                    variant: "secondary",
                                    onclick: move |_| store.active_budget_view.set("all".to_string()),
                                    "Back to All"
                                }
                            }
                        }
                    }
                } else {
                    div {
                        class: "budget-table-body",
                        for (g_idx, grp) in groups.iter().enumerate() {
                            BudgetCategoryGroupSection {
                                key: "{grp.id}",
                                group: grp.clone(),
                                group_index: g_idx,
                                all_groups: groups.clone(),
                                dragging_group: dragging_group,
                                dragging_subcat: dragging_subcat,
                            }
                        }
                    }
                }
            }
        }
    }
}

#[component]
fn BudgetCategoryGroupSection(
    group: CategoryGroupDto,
    group_index: usize,
    all_groups: Vec<CategoryGroupDto>,
    mut dragging_group: Signal<Option<(usize, String)>>,
    mut dragging_subcat: Signal<Option<(String, usize, String)>>,
) -> Element {
    let mut store = use_context::<AppStore>();
    let is_collapsed = store.collapsed_category_groups.read().contains(&group.id);
    let selected_ids = store.selected_category_ids.read().clone();
    let show_bars = *store.show_progress_bars.read();

    let is_debt_group = group.is_system
        || group
            .internal_name
            .as_deref()
            .unwrap_or("")
            .contains("Debt Payment")
        || group.name == "Credit Card Payments";

    let group_cat_ids: Vec<String> = group.categories.iter().map(|c| c.id.clone()).collect();
    let is_group_selected =
        !group_cat_ids.is_empty() && group_cat_ids.iter().all(|id| selected_ids.contains(id));

    let total_assigned: i64 = group.categories.iter().map(|c| c.assigned_milliunits).sum();
    let total_activity: i64 = group.categories.iter().map(|c| c.activity_milliunits).sum();
    let total_available: i64 = group
        .categories
        .iter()
        .map(|c| c.available_milliunits)
        .sum();

    let formatted_assigned = store.format_money(total_assigned);
    let formatted_activity = store.format_money(total_activity);
    let formatted_available = store.format_money(total_available);

    let grp_id = group.id.clone();
    let grp_name_ctx = group.name.clone();
    let grp_id_collapse = group.id.clone();
    let grp_id_select = group.id.clone();
    let grp_id_edit = group.id.clone();
    let grp_name_edit = group.name.clone();
    let grp_id_add = group.id.clone();
    let grp_name_add = group.name.clone();
    let grp_id_drag = group.id.clone();

    rsx! {
        div {
            class: "budget-table-row-group",
            // Master Category Row
            div {
                class: format!(
                    "budget-table-row js-budget-table-row budget-table-row-ul is-master-category {} {}",
                    if is_debt_group { "is-debt-payment-category" } else { "" },
                    if is_group_selected { "is-checked" } else { "" }
                ),
                role: "row",
                aria_level: 1,
                aria_expanded: !is_collapsed,
                draggable: if !is_debt_group { "true" } else { "false" },
                ondragstart: move |_| {
                    if !is_debt_group {
                        dragging_group.set(Some((group_index, grp_id_drag.clone())));
                    }
                },
                ondragover: move |evt| {
                    evt.prevent_default();
                },
                ondrop: move |evt| {
                    evt.prevent_default();
                    let grp_drag = dragging_group.read().clone();
                    if let Some((from_idx, _)) = grp_drag {
                        if from_idx != group_index && !(group_index == 0 && is_debt_group) {
                            let all_ids: Vec<String> = all_groups.iter().map(|g| g.id.clone()).collect();
                            let ordered = reorder_list_by_gap(&all_ids, from_idx, group_index);
                            let mut sub_map = HashMap::new();
                            for g in &all_groups {
                                let c_ids: Vec<String> = g.categories.iter().map(|c| c.id.clone()).collect();
                                sub_map.insert(g.id.clone(), c_ids);
                            }
                            if let Ok(json_map) = serde_json::to_value(sub_map) {
                                store.reorder_categories(ordered, json_map);
                            }
                        }
                        dragging_group.set(None);
                    }
                },
                oncontextmenu: move |evt| {
                    evt.prevent_default();
                    store.active_modal.set(ActiveModal::EditCategory {
                        id: grp_id.clone(),
                        name: grp_name_ctx.clone(),
                        is_master: true,
                        can_delete: !is_debt_group,
                        can_rename: !is_debt_group,
                        is_cc_payment: is_debt_group,
                    });
                },
                div {
                    class: "budget-table-cell-margin-left js-budget-table-cell-margin-left budget-table-row-li",
                    aria_hidden: "true",
                    "\u{00a0}"
                }
                div {
                    class: "budget-table-cell-collapse budget-table-row-li",
                    role: "cell",
                    aria_colindex: 2,
                    button {
                        class: "js-budget-table-cell-collapse",
                        r#type: "button",
                        onclick: move |_| {
                            let mut set = store.collapsed_category_groups.write();
                            if set.contains(&grp_id_collapse) {
                                set.remove(&grp_id_collapse);
                            } else {
                                set.insert(grp_id_collapse.clone());
                            }
                        },
                        Icon {
                            name: if is_collapsed { "chevron_right" } else { "chevron_down" },
                            width: 10,
                            height: 10,
                        }
                    }
                }
                div {
                    class: "budget-table-cell-checkbox budget-table-row-li",
                    role: "cell",
                    aria_colindex: 1,
                    button {
                        class: if is_group_selected {
                            "ynab-checkbox ynab-checkbox-button is-checked"
                        } else {
                            "ynab-checkbox ynab-checkbox-button"
                        },
                        role: "checkbox",
                        aria_checked: is_group_selected,
                        r#type: "button",
                        onclick: move |_| {
                            let mut sel = store.selected_category_ids.write();
                            let all_in = group_cat_ids.iter().all(|id| sel.contains(id));
                            if all_in {
                                for id in &group_cat_ids {
                                    sel.remove(id);
                                }
                            } else {
                                for id in &group_cat_ids {
                                    sel.insert(id.clone());
                                }
                            }
                            let _ = &grp_id_select;
                        },
                        Icon {
                            class: if is_group_selected { "ynab-checkbox-button-square is-checked" } else { "ynab-checkbox-button-square" },
                            name: "check",
                            width: 13,
                            height: 13,
                        }
                    }
                }
                div {
                    class: "budget-table-cell-name budget-table-row-li",
                    role: "rowheader",
                    aria_colindex: 3,
                    button {
                        class: "button budget-table-cell-button budget-table-cell-edit-category user-data",
                        title: "{group.name}",
                        r#type: "button",
                        onclick: move |_| {
                            store.active_modal.set(ActiveModal::EditCategory {
                                id: grp_id_edit.clone(),
                                name: grp_name_edit.clone(),
                                is_master: true,
                                can_delete: !is_debt_group,
                                can_rename: !is_debt_group,
                                is_cc_payment: is_debt_group,
                            });
                        },
                        "{group.name}"
                    }
                    if !is_debt_group {
                        button {
                            class: "button budget-table-cell-add-category budget-table-cell-button",
                            aria_label: "Add Category",
                            title: "Add Category",
                            r#type: "button",
                            onclick: move |evt| {
                                evt.stop_propagation();
                                store.active_modal.set(ActiveModal::AddSubCategory {
                                    group_id: grp_id_add.clone(),
                                    group_name: grp_name_add.clone(),
                                });
                            },
                            Icon { name: "plus_circle_fill", width: 14, height: 14 }
                        }
                    }
                }
                div {
                    class: "budget-table-cell-budgeted budget-table-row-li",
                    role: "cell",
                    aria_colindex: 4,
                    button {
                        aria_disabled: "true",
                        tabindex: -1,
                        class: if total_assigned == 0 {
                            "user-data currency tabular-nums zero"
                        } else {
                            "user-data currency tabular-nums"
                        },
                        "{formatted_assigned}"
                    }
                }
                div {
                    class: "budget-table-cell-activity budget-table-cell-flexed budget-table-row-li",
                    role: "cell",
                    aria_colindex: 5,
                    button {
                        class: "budget-number user-data",
                        tabindex: 0,
                        aria_disabled: "true",
                        r#type: "button",
                        span {
                            class: if total_activity == 0 {
                                "user-data currency tabular-nums zero"
                            } else {
                                "user-data currency tabular-nums"
                            },
                            "{formatted_activity}"
                        }
                    }
                }
                div {
                    class: "budget-table-cell-available budget-table-row-li",
                    role: "cell",
                    aria_colindex: 6,
                    if is_debt_group {
                        button {
                            class: "budget-table-cell-available-payment",
                            r#type: "button",
                            Icon { name: "question_mark_circle", width: 12, height: 12 }
                            "\u{00a0}PAYMENT"
                        }
                    }
                    span {
                        class: format!(
                            "ynab-new-budget-available-number js-budget-available-number user-data {}",
                            if total_available == 0 {
                                "zero"
                            } else if total_available > 0 {
                                "positive"
                            } else {
                                "negative"
                            }
                        ),
                        "{formatted_available}"
                    }
                }
                div {
                    class: "budget-table-cell-margin-right budget-table-row-li",
                    aria_hidden: "true",
                    "\u{00a0}"
                }
            }

            // Subcategory Rows
            if !is_collapsed {
                for (c_idx, sub_cat) in group.categories.iter().enumerate() {
                    BudgetSubCategoryRow {
                        key: "{sub_cat.id}",
                        category: sub_cat.clone(),
                        cat_index: c_idx,
                        is_last: c_idx + 1 == group.categories.len(),
                        show_progress_bars: show_bars,
                        all_groups: all_groups.clone(),
                        dragging_subcat: dragging_subcat,
                    }
                }
            }
        }
    }
}

#[component]
fn BudgetSubCategoryRow(
    category: CategoryDto,
    cat_index: usize,
    is_last: bool,
    show_progress_bars: bool,
    all_groups: Vec<CategoryGroupDto>,
    mut dragging_subcat: Signal<Option<(String, usize, String)>>,
) -> Element {
    let mut store = use_context::<AppStore>();
    let is_selected = store.selected_category_ids.read().contains(&category.id);
    let is_debt = category.is_credit_card_payment || category.r#type == "DBT";
    let month_ym = store.current_month.read().clone();
    let hide_amounts = *store.hide_amounts.read();
    let diff_without_color = *store.differentiate_without_color.read();

    let target_opt = category_to_target(&category);
    let target_status = calculate_category_target_status(
        category.assigned_milliunits,
        category.activity_milliunits,
        category.available_milliunits,
        target_opt.as_ref(),
        is_debt,
        Some(month_ym.as_str()),
        category.from_previous_month_milliunits,
    );

    let formatted_assigned = store.format_money(category.assigned_milliunits);
    let formatted_activity = store.format_money(category.activity_milliunits);
    let formatted_available = store.format_money(category.available_milliunits);
    let plain_assigned = store.format_plain_decimal(category.assigned_milliunits);

    let mut is_editing_assigned = use_signal(|| false);
    let mut assigned_input = use_signal(|| plain_assigned.clone());
    let mut is_row_hovered = use_signal(|| false);

    let mut last_synced_assigned = use_signal(|| category.assigned_milliunits);
    if !*is_editing_assigned.read() && *last_synced_assigned.read() != category.assigned_milliunits
    {
        last_synced_assigned.set(category.assigned_milliunits);
        assigned_input.set(plain_assigned.clone());
    }

    let avail = category.available_milliunits;
    let is_credit_overspent = avail < 0
        && category.credit_overspent_milliunits > 0
        && category.cash_overspent_milliunits == 0;
    let avail_pill_class = if category.is_snoozed {
        "zero"
    } else if avail < 0 {
        if category.cash_overspent_milliunits > 0 || category.credit_overspent_milliunits == 0 {
            "negative"
        } else {
            "cautious credit"
        }
    } else {
        target_status.pill_class
    };
    let avail_alt_cls = if diff_without_color {
        "alternative"
    } else {
        ""
    };

    let cat_note = category.note.as_deref().map(str::trim).unwrap_or("");
    let has_note = !cat_note.is_empty();
    let name_tooltip = if has_note {
        format!("{}\n{}", category.name, cat_note)
    } else {
        category.name.clone()
    };

    let cat_id = category.id.clone();
    let cat_id_check = category.id.clone();
    let cat_id_name = category.id.clone();
    let cat_id_note_btn = category.id.clone();
    let cat_id_note_collapsed = category.id.clone();
    let cat_id_assign_blur = category.id.clone();
    let cat_id_assign_key = category.id.clone();
    let cat_id_act = category.id.clone();
    let cat_name_act = category.name.clone();
    let cat_act_val = category.activity_milliunits;
    let cat_id_moves = category.id.clone();
    let cat_name_moves = category.name.clone();
    let cat_id_avail = category.id.clone();
    let cat_name_avail = category.name.clone();
    let cat_id_ctx = category.id.clone();
    let cat_name_ctx = category.name.clone();
    let cat_name_edit = category.name.clone();
    let current_assigned_milli = category.assigned_milliunits;

    let grp_id_drag = category.group_id.clone();
    let cat_id_drag = category.id.clone();
    let grp_id_drop = category.group_id.clone();

    let draft_expr_preview = {
        let raw = assigned_input.read().clone();
        let has_op = raw.chars().any(|c| matches!(c, '+' | '-' | '*' | '/'));
        if has_op {
            calculate_assigned_expression_milliunits(&raw, current_assigned_milli)
        } else {
            None
        }
    };
    let row_hovered = *is_row_hovered.read();

    rsx! {
        div {
            class: format!(
                "budget-table-row js-budget-table-row budget-table-row-ul is-sub-category {} {} {} {}",
                if is_debt { "is-debt-payment-category" } else { "" },
                if is_last { "budget-table-last-row" } else { "" },
                if is_selected { "is-checked" } else { "" },
                if category.is_snoozed { "is-snoozed" } else { "" }
            ),
            role: "row",
            "data-entity-id": "{cat_id}",
            aria_level: 2,
            aria_expanded: "true",
            draggable: "true",
            onmouseenter: move |_| is_row_hovered.set(true),
            onmouseleave: move |_| is_row_hovered.set(false),
            ondragstart: move |_| {
                dragging_subcat.set(Some((grp_id_drag.clone(), cat_index, cat_id_drag.clone())));
            },
            ondragover: move |evt| {
                evt.prevent_default();
            },
            ondrop: move |evt| {
                evt.prevent_default();
                let sub_drag = dragging_subcat.read().clone();
                if let Some((from_grp, from_idx, moved_cat_id)) = sub_drag {
                    let ordered_group_ids: Vec<String> = all_groups.iter().map(|g| g.id.clone()).collect();
                    let mut sub_map: HashMap<String, Vec<String>> = HashMap::new();
                    for g in &all_groups {
                        let mut c_ids: Vec<String> = g.categories.iter().map(|c| c.id.clone()).collect();
                        if g.id == from_grp {
                            c_ids.retain(|id| id != &moved_cat_id);
                        }
                        sub_map.insert(g.id.clone(), c_ids);
                    }
                    if let Some(target_list) = sub_map.get_mut(&grp_id_drop) {
                        let insert_at = if from_grp == grp_id_drop && from_idx < cat_index {
                            cat_index.saturating_sub(1).min(target_list.len())
                        } else {
                            cat_index.min(target_list.len())
                        };
                        target_list.insert(insert_at, moved_cat_id);
                    }
                    if let Ok(json_map) = serde_json::to_value(sub_map) {
                        store.reorder_categories(ordered_group_ids, json_map);
                    }
                    dragging_subcat.set(None);
                }
            },
            oncontextmenu: move |evt| {
                evt.prevent_default();
                store.active_modal.set(ActiveModal::EditCategory {
                    id: cat_id_ctx.clone(),
                    name: cat_name_ctx.clone(),
                    is_master: false,
                    can_delete: !is_debt,
                    can_rename: !is_debt,
                    is_cc_payment: is_debt,
                });
            },

            div {
                class: "budget-table-cell-margin-left js-budget-table-cell-margin-left budget-table-row-li",
                aria_hidden: "true",
                "\u{00a0}"
            }
            div {
                class: "budget-table-cell-collapse budget-table-row-li",
                role: "cell",
                aria_colindex: 2,
                "\u{00a0}"
            }
            div {
                class: "budget-table-cell-checkbox budget-table-row-li",
                role: "cell",
                aria_colindex: 1,
                button {
                    class: if is_selected {
                        "ynab-checkbox ynab-checkbox-button is-checked"
                    } else {
                        "ynab-checkbox ynab-checkbox-button"
                    },
                    role: "checkbox",
                    aria_checked: is_selected,
                    aria_label: "{category.name}",
                    r#type: "button",
                    onclick: move |_| {
                        let mut sel = store.selected_category_ids.write();
                        if sel.contains(&cat_id_check) {
                            sel.remove(&cat_id_check);
                        } else {
                            sel.insert(cat_id_check.clone());
                        }
                    },
                    Icon {
                        class: if is_selected { "ynab-checkbox-button-square is-checked" } else { "ynab-checkbox-button-square" },
                        name: "check",
                        width: 13,
                        height: 13,
                    }
                }
            }

            // Category Name + Note Indicator + Target Status + Striped Progress Bar
            div {
                class: "budget-table-cell-name budget-table-row-li",
                role: "rowheader",
                aria_colindex: 3,
                if show_progress_bars {
                    div {
                        class: "budget-table-cell-button budget-table-cell-edit-category user-data",
                        onclick: move |_| {
                            if is_selected {
                                store.active_modal.set(ActiveModal::EditCategory {
                                    id: cat_id_name.clone(),
                                    name: cat_name_edit.clone(),
                                    is_master: false,
                                    can_delete: !is_debt,
                                    can_rename: !is_debt,
                                    is_cc_payment: is_debt,
                                });
                            } else {
                                let mut sel = store.selected_category_ids.write();
                                sel.clear();
                                sel.insert(cat_id_name.clone());
                            }
                        },
                        div {
                            class: "budget-table-cell-edit-category-label js-budget-table-cell-edit-category-label",
                            div {
                                class: "budget-table-cell-goal-nowrap",
                                button {
                                    title: "{name_tooltip}",
                                    r#type: "button",
                                    "{category.name}"
                                }
                                if has_note {
                                    button {
                                        class: "budget-table-cell-note-indicator",
                                        r#type: "button",
                                        title: "Note: {cat_note}",
                                        aria_label: "View category note",
                                        onclick: move |evt| {
                                            evt.stop_propagation();
                                            let mut sel = store.selected_category_ids.write();
                                            sel.clear();
                                            sel.insert(cat_id_note_btn.clone());
                                        },
                                        Icon { name: "memo", width: 11, height: 11 }
                                    }
                                }
                                if target_status.has_target && !is_debt {
                                    div { class: "budget-table-cell-goal-gap" }
                                    if category.is_snoozed {
                                        div {
                                            class: "budget-table-cell-goal-status budget-table-cell-goal-status-zero-needed budget-table-cell-goal-status-snoozed",
                                            Icon { name: "snooze", width: 11, height: 11 }
                                            "Target Snoozed"
                                        }
                                    } else {
                                        div {
                                            class: "budget-table-cell-goal-status",
                                            "data-redacted": hide_amounts,
                                            if target_status.topline_highlighted {
                                                span {
                                                    class: "goal-status-highlighted",
                                                    "{target_status.topline_text}"
                                                }
                                                if !target_status.topline_suffix.is_empty() {
                                                    span { " {target_status.topline_suffix}" }
                                                }
                                            } else {
                                                span { "{target_status.topline_text}" }
                                            }
                                        }
                                    }
                                }
                            }
                            if target_status.has_target && !is_debt && !category.is_snoozed && !target_status.details_text.is_empty() {
                                div {
                                    class: "budget-table-cell-goal-status-details",
                                    "data-redacted": hide_amounts,
                                    "{target_status.details_text}"
                                }
                            }
                        }
                        if !target_status.bar_sections.is_empty() {
                            figure {
                                class: if category.is_snoozed {
                                    "ynab-new-budget-bar-v2 is-visuals-refresh goal-progress-bar is-snoozed"
                                } else {
                                    "ynab-new-budget-bar-v2 is-visuals-refresh goal-progress-bar"
                                },
                                role: "group",
                                for (sec_idx, sec) in target_status.bar_sections.iter().enumerate() {
                                    if sec.is_over_target_spending_amount_section {
                                        span {
                                            key: "{sec_idx}",
                                            class: "ynab-new-budget-bar-v2-section {sec.class_names}",
                                            style: "{sec.style}",
                                            for (seg_idx, seg) in sec.segments.iter().enumerate() {
                                                div {
                                                    key: "{seg_idx}",
                                                    class: "ynab-new-budget-bar-v2-segment {seg.class_names}",
                                                    style: "{seg.style}",
                                                }
                                            }
                                        }
                                    } else {
                                        div {
                                            key: "{sec_idx}",
                                            class: "ynab-new-budget-bar-v2-section {sec.class_names}",
                                            style: "{sec.style}",
                                            for (seg_idx, seg) in sec.segments.iter().enumerate() {
                                                div {
                                                    key: "{seg_idx}",
                                                    class: "ynab-new-budget-bar-v2-segment {seg.class_names}",
                                                    style: "{seg.style}",
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                } else {
                    div {
                        class: "budget-table-cell-button budget-table-cell-edit-category user-data budget-table-cell-name-compact",
                        button {
                            class: "button budget-table-cell-name-row-label-item budget-table-cell-name-row-label-button",
                            title: "{name_tooltip}",
                            r#type: "button",
                            onclick: move |_| {
                                if is_selected {
                                    store.active_modal.set(ActiveModal::EditCategory {
                                        id: cat_id_name.clone(),
                                        name: cat_name_edit.clone(),
                                        is_master: false,
                                        can_delete: !is_debt,
                                        can_rename: !is_debt,
                                        is_cc_payment: is_debt,
                                    });
                                } else {
                                    let mut sel = store.selected_category_ids.write();
                                    sel.clear();
                                    sel.insert(cat_id_name.clone());
                                }
                            },
                            "{category.name}"
                        }
                        if has_note {
                            button {
                                class: "budget-table-cell-note-indicator",
                                r#type: "button",
                                title: "Note: {cat_note}",
                                aria_label: "View category note",
                                onclick: move |evt| {
                                    evt.stop_propagation();
                                    let mut sel = store.selected_category_ids.write();
                                    sel.clear();
                                    sel.insert(cat_id_note_collapsed.clone());
                                },
                                Icon { name: "memo", width: 11, height: 11 }
                            }
                        }
                        if category.is_snoozed {
                            span {
                                class: "budget-table-cell-snooze-indicator",
                                title: "Target Snoozed",
                                Icon { name: "snooze", width: 11, height: 11 }
                            }
                        }
                    }
                }
            }

            // Assigned Column (with inline Shunting-Yard Calculator + live formula preview)
            div {
                class: "budget-table-cell-budgeted budget-table-row-li",
                role: "cell",
                aria_colindex: 4,
                div {
                    class: if *is_editing_assigned.read() {
                        "ynab-new-currency-input is-editing is-focused"
                    } else {
                        "ynab-new-currency-input"
                    },
                    title: "Click to assign or enter +, -, *, / calculator expression",
                    div {
                        class: "input-wrapper",
                        if *is_editing_assigned.read() {
                            input {
                                class: "ember-text-field ember-view user-data",
                                r#type: "text",
                                value: "{assigned_input}",
                                autofocus: true,
                                oninput: move |e| assigned_input.set(e.value()),
                                onblur: move |_| {
                                    is_editing_assigned.set(false);
                                    let expr = assigned_input.read().clone();
                                    if let Some(new_milli) = calculate_assigned_expression_milliunits(&expr, current_assigned_milli) {
                                        if new_milli != current_assigned_milli {
                                            store.set_category_assigned(&cat_id_assign_blur, new_milli);
                                        }
                                    }
                                },
                                onkeydown: move |e| {
                                    if e.key() == Key::Enter {
                                        is_editing_assigned.set(false);
                                        let expr = assigned_input.read().clone();
                                        if let Some(new_milli) = calculate_assigned_expression_milliunits(&expr, current_assigned_milli) {
                                            if new_milli != current_assigned_milli {
                                                store.set_category_assigned(&cat_id_assign_key, new_milli);
                                            }
                                        }
                                    } else if e.key() == Key::Escape {
                                        assigned_input.set(plain_assigned.clone());
                                        is_editing_assigned.set(false);
                                    }
                                }
                            }
                            if let Some(preview_milli) = draft_expr_preview {
                                div {
                                    class: "budget-calc-preview-popover",
                                    "= {store.format_money(preview_milli)}"
                                }
                            }
                        } else {
                            button {
                                class: if category.assigned_milliunits == 0 {
                                    "user-data currency tabular-nums zero"
                                } else {
                                    "user-data currency tabular-nums"
                                },
                                r#type: "button",
                                onclick: move |_| {
                                    assigned_input.set(plain_assigned.clone());
                                    is_editing_assigned.set(true);
                                },
                                "{formatted_assigned}"
                            }
                        }
                    }
                }
            }

            // Activity Column + Hover Category Moves button
            div {
                class: "budget-table-cell-activity budget-table-cell-flexed budget-table-row-li",
                role: "cell",
                aria_colindex: 5,
                button {
                    class: "budget-table-cell-category-moves js-budget-toolbar-open-category-moves",
                    r#type: "button",
                    aria_hidden: !row_hovered,
                    title: "View recent moves for {category.name}",
                    onclick: move |evt| {
                        evt.stop_propagation();
                        store.active_modal.set(ActiveModal::CategoryMoves {
                            category_id: cat_id_moves.clone(),
                            category_name: cat_name_moves.clone(),
                        });
                    },
                    div {
                        class: "category-moves-moves-icon-wrapper",
                        Icon { name: "clock_arrow_back", width: 14, height: 14 }
                    }
                }
                button {
                    class: "budget-number user-data",
                    r#type: "button",
                    onclick: move |_| {
                        store.active_modal.set(ActiveModal::ActivityTransactions {
                            category_id: cat_id_act.clone(),
                            category_name: cat_name_act.clone(),
                            activity_milliunits: cat_act_val,
                        });
                    },
                    span {
                        class: if category.activity_milliunits == 0 {
                            "user-data currency tabular-nums zero"
                        } else {
                            "user-data currency tabular-nums"
                        },
                        "{formatted_activity}"
                    }
                }
            }

            // Available Column (Ember status icons + click opens Move Money or Cover Overspending)
            div {
                class: "budget-table-cell-available budget-table-row-li",
                role: "cell",
                aria_colindex: 6,
                button {
                    class: "ynab-new-budget-available-number js-budget-available-number user-data {avail_pill_class} {avail_alt_cls}",
                    r#type: "button",
                    onclick: move |_| {
                        if avail < 0 {
                            store.active_modal.set(ActiveModal::CoverOverspending {
                                category_id: cat_id_avail.clone(),
                                category_name: cat_name_avail.clone(),
                                overspent_milliunits: avail.abs(),
                            });
                        } else if avail > 0 {
                            store.active_modal.set(ActiveModal::MoveMoney {
                                from_category_id: Some(cat_id_avail.clone()),
                                from_category_name: Some(cat_name_avail.clone()),
                                to_category_id: None,
                                initial_amount_milliunits: avail,
                            });
                        }
                    },
                    if is_credit_overspent {
                        Icon { class: "icon-credit", name: "credit_card", width: 12, height: 12, title: "Credit overspending" }
                    } else if category.is_snoozed && category.goal_type.is_some() {
                        Icon { class: "icon-snooze", name: "snooze", width: 12, height: 12, title: "Target Snoozed" }
                    } else if target_status.has_target && avail >= 0 && !is_debt {
                        IconCircleProgress {
                            percentage_complete: category.goal_percentage_complete.unwrap_or(target_status.overall_percent),
                            width: 13,
                            height: 13,
                            unique_id: format!("row-{cat_id}"),
                        }
                    }
                    span { "{formatted_available}" }
                }
            }

            div {
                class: "budget-table-cell-margin-right budget-table-row-li",
                aria_hidden: "true",
                "\u{00a0}"
            }
        }
    }
}

#[component]
pub fn BudgetInspector() -> Element {
    let mut store = use_context::<AppStore>();
    let month_iso = store.current_month.read().clone();
    let month_name = format_month_full_name(&month_iso);
    let summary = store.month_summary.read().clone();
    let selected_ids = store.selected_category_ids.read().clone();
    let accounts = store.accounts.read().clone();

    let all_subcats: Vec<CategoryDto> = summary
        .category_groups
        .iter()
        .flat_map(|g| g.categories.iter().cloned())
        .collect();
    let selected_cats: Vec<CategoryDto> = all_subcats
        .iter()
        .filter(|c| selected_ids.contains(&c.id))
        .cloned()
        .collect();

    let is_none_selected = selected_cats.is_empty();
    let is_single = selected_cats.len() == 1;
    let is_multiple = selected_cats.len() > 1;
    let single_cat = if is_single {
        Some(selected_cats[0].clone())
    } else {
        None
    };

    let totals_cats = if is_multiple {
        &selected_cats
    } else {
        &all_subcats
    };
    let total_from_prev: i64 = totals_cats
        .iter()
        .map(|c| c.from_previous_month_milliunits)
        .sum();
    let total_assigned: i64 = totals_cats.iter().map(|c| c.assigned_milliunits).sum();
    let total_activity: i64 = totals_cats.iter().map(|c| c.activity_milliunits).sum();
    let total_available: i64 = totals_cats.iter().map(|c| c.available_milliunits).sum();

    // Cost to Be Me (monthly target sum across non-hidden, non-CC, active-target categories)
    let cost_to_be_me_needed: i64 = all_subcats
        .iter()
        .filter(|c| {
            !c.hidden && !c.is_credit_card_payment && c.goal_type.is_some() && !c.is_snoozed
        })
        .map(|c| {
            c.assigned_milliunits
                .max(0)
                .saturating_add(c.goal_under_funded.unwrap_or(0).max(0))
        })
        .sum();

    let budget_id_now = store.budget_id.read().clone();
    let mut synced_budget_id = use_signal(|| budget_id_now.clone());
    let mut expected_income = use_signal(|| load_expected_income_persisted(&store));
    let mut is_editing_income = use_signal(|| false);
    let mut draft_income_str = use_signal(String::new);
    let mut is_editing_target = use_signal(|| false);
    if *synced_budget_id.read() != budget_id_now {
        synced_budget_id.set(budget_id_now);
        expected_income.set(load_expected_income_persisted(&store));
        is_editing_income.set(false);
        is_editing_target.set(false);
    }

    let expected_income_val = *expected_income.read();
    let has_expected_income = expected_income_val > 0;
    let has_income_deficit = has_expected_income && cost_to_be_me_needed > expected_income_val;
    let max_ctbm_scale = cost_to_be_me_needed.max(expected_income_val).max(1) as i128;
    let needed_bar_pct: i64 = if has_expected_income {
        ((cost_to_be_me_needed.max(0) as i128 * 100 / max_ctbm_scale) as i64).clamp(0, 100)
    } else {
        0
    };
    let income_bar_pct: i64 = if has_expected_income {
        ((expected_income_val.max(0) as i128 * 100 / max_ctbm_scale) as i64).clamp(0, 100)
    } else {
        0
    };

    let quick_cats: Vec<CategoryDto> = if !selected_cats.is_empty() {
        selected_cats.clone()
    } else {
        all_subcats.iter().filter(|c| !c.hidden).cloned().collect()
    };

    let total_underfunded: i64 = quick_cats
        .iter()
        .filter(|c| !c.is_snoozed)
        .map(|c| c.goal_under_funded.unwrap_or(0))
        .sum();
    let total_budgeted_last: i64 = quick_cats.iter().map(|c| c.budgeted_last_month).sum();
    let total_spent_last: i64 = quick_cats.iter().map(|c| c.spent_last_month.abs()).sum();
    let total_avg_budgeted: i64 = quick_cats.iter().map(|c| c.average_budgeted).sum();
    let total_avg_spent: i64 = quick_cats.iter().map(|c| c.average_spent.abs()).sum();

    let quick_cat_ids_opt: Option<Vec<String>> = if selected_cats.is_empty() {
        None
    } else {
        Some(selected_cats.iter().map(|c| c.id.clone()).collect())
    };

    let mut summary_expanded = use_signal(|| true);
    let mut avail_expanded = use_signal(|| true);
    let mut target_expanded = use_signal(|| true);
    let mut auto_assign_expanded = use_signal(|| true);
    let mut future_expanded = use_signal(|| true);
    let mut notes_expanded = use_signal(|| true);

    // Synced draft state for Category Notes (avoids SQLite reload on every keystroke)
    let mut synced_note_cat_id = use_signal(String::new);
    let mut draft_cat_note = use_signal(String::new);
    let mut is_editing_cat_note = use_signal(|| false);
    if let Some(ref sc) = single_cat {
        let server_note = sc.note.clone().unwrap_or_default();
        if *synced_note_cat_id.read() != sc.id {
            synced_note_cat_id.set(sc.id.clone());
            draft_cat_note.set(server_note);
            is_editing_cat_note.set(false);
            is_editing_target.set(false);
        }
    } else if !synced_note_cat_id.read().is_empty() {
        synced_note_cat_id.set(String::new());
        draft_cat_note.set(String::new());
        is_editing_cat_note.set(false);
        is_editing_target.set(false);
    }

    rsx! {
        aside {
            class: "budget-inspector",
            div { class: "budget-inspector-resizer" }
            div {
                class: "budget-inspector-content",
                div {
                    class: "budget-breakdown",

                    // 1. Header or Multiple Selection Banner
                    if let Some(ref sc) = single_cat {
                        {
                            let sc_id = sc.id.clone();
                            let sc_name = sc.name.clone();
                            let sc_debt = sc.is_credit_card_payment;
                            rsx! {
                                div {
                                    class: "budget-inspector-category-header",
                                    div {
                                        class: "budget-inspector-category",
                                        div {
                                            class: "inspector-category-name user-data",
                                            div {
                                                class: "user-entered-text",
                                                h1 { "{sc.name}" }
                                            }
                                        }
                                        button {
                                            class: "inspector-category-edit",
                                            r#type: "button",
                                            onclick: move |_| {
                                                store.active_modal.set(ActiveModal::EditCategory {
                                                    id: sc_id.clone(),
                                                    name: sc_name.clone(),
                                                    is_master: false,
                                                    can_delete: !sc_debt,
                                                    can_rename: !sc_debt,
                                                    is_cc_payment: sc_debt,
                                                });
                                            },
                                            Icon { name: "pencil", width: 16, height: 16, class: "fill-secondary" }
                                        }
                                    }
                                }
                            }
                        }
                    } else if is_multiple {
                        div {
                            class: "budget-breakdown-multiple",
                            h2 { "{selected_cats.len()} Categories Selected" }
                            div {
                                class: "budget-breakdown-multiple-row",
                                div {
                                    class: "budget-breakdown-multiple-list",
                                    "{selected_cats.iter().map(|c| c.name.as_str()).collect::<Vec<_>>().join(\", \")}"
                                }
                                button {
                                    r#type: "button",
                                    class: "button-link budget-breakdown-deselect-btn",
                                    onclick: move |_| {
                                        store.selected_category_ids.write().clear();
                                    },
                                    "Deselect All"
                                }
                            }
                        }
                    }

                    // 2. Summary Card (Credit Card Payment OR Single Category Available Balance OR Month's Summary + Cost to Be Me)
                    if let Some(ref sc) = single_cat {
                        if sc.is_credit_card_payment {
                            {
                                let linked_card_balance = sc.credit_card_account_id.as_ref().and_then(|acc_id| {
                                    accounts.iter().find(|a| &a.id == acc_id).map(|a| a.balance_milliunits)
                                });
                                rsx! {
                                    section {
                                        class: if *avail_expanded.read() {
                                            "card inspector-card budget-inspector-credit-card-available-for-payment"
                                        } else {
                                            "card inspector-card is-collapsed budget-inspector-credit-card-available-for-payment"
                                        },
                                        button {
                                            class: "card-roll-up",
                                            aria_expanded: *avail_expanded.read(),
                                            r#type: "button",
                                            onclick: move |_| {
                                                let cur = *avail_expanded.read();
                                                avail_expanded.set(!cur);
                                            },
                                            h2 {
                                                "Available for Payment"
                                                Icon {
                                                    class: "card-chevron",
                                                    name: if *avail_expanded.read() { "chevron_down" } else { "chevron_right" },
                                                    width: 12,
                                                    height: 12,
                                                }
                                                span {
                                                    class: format!(
                                                        "ynab-new-budget-available-number user-data {}",
                                                        if sc.available_milliunits < 0 {
                                                            "negative"
                                                        } else if sc.available_milliunits > 0 {
                                                            "positive"
                                                        } else {
                                                            "zero"
                                                        }
                                                    ),
                                                    "{store.format_money(sc.available_milliunits)}"
                                                }
                                            }
                                        }
                                        if *avail_expanded.read() {
                                            div {
                                                class: "card-body",
                                                div {
                                                    class: "ynab-breakdown",
                                                    div {
                                                        class: "ynab-breakdown-row",
                                                        div { "Cash Left Over From Last Month" }
                                                        div {
                                                            class: "user-data",
                                                            span {
                                                                class: "user-data currency tabular-nums",
                                                                "{store.format_money(sc.from_previous_month_milliunits)}"
                                                            }
                                                        }
                                                    }
                                                    div {
                                                        class: "this-month",
                                                        "Activity This Month"
                                                    }
                                                    div {
                                                        class: "ynab-breakdown-row",
                                                        div { "Assigned This Month" }
                                                        div {
                                                            class: "user-data",
                                                            span {
                                                                class: "user-data currency tabular-nums",
                                                                "{store.format_money(sc.assigned_milliunits)}"
                                                            }
                                                        }
                                                    }
                                                    div {
                                                        class: "ynab-breakdown-row",
                                                        div { "Card Activity & Payments" }
                                                        div {
                                                            class: "user-data",
                                                            span {
                                                                class: "user-data currency tabular-nums",
                                                                "{store.format_money(sc.activity_milliunits)}"
                                                            }
                                                        }
                                                    }
                                                    if let Some(card_bal) = linked_card_balance {
                                                        div {
                                                            class: "ynab-breakdown-row ynab-breakdown-row-total",
                                                            div { "Credit Card Balance" }
                                                            div {
                                                                class: "user-data",
                                                                span {
                                                                    class: "user-data currency tabular-nums",
                                                                    "{store.format_money(card_bal)}"
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        } else {
                            section {
                                class: if *avail_expanded.read() {
                                    "card inspector-card budget-breakdown-available-balance"
                                } else {
                                    "card inspector-card is-collapsed budget-breakdown-available-balance"
                                },
                                button {
                                    class: "card-roll-up",
                                    aria_expanded: *avail_expanded.read(),
                                    r#type: "button",
                                    onclick: move |_| {
                                        let cur = *avail_expanded.read();
                                        avail_expanded.set(!cur);
                                    },
                                    h2 {
                                        "Available Balance"
                                        Icon {
                                            class: "card-chevron",
                                            name: if *avail_expanded.read() { "chevron_down" } else { "chevron_right" },
                                            width: 12,
                                            height: 12,
                                        }
                                        span {
                                            class: format!(
                                                "ynab-new-budget-available-number user-data {}",
                                                if sc.available_milliunits < 0 {
                                                    "negative"
                                                } else if sc.available_milliunits > 0 {
                                                    "positive"
                                                } else {
                                                    "zero"
                                                }
                                            ),
                                            "{store.format_money(sc.available_milliunits)}"
                                        }
                                    }
                                }
                                if *avail_expanded.read() {
                                    div {
                                        class: "card-body",
                                        div {
                                            class: "ynab-breakdown",
                                            div {
                                                class: "ynab-breakdown-row",
                                                div { "Cash Left Over From Last Month" }
                                                div {
                                                    class: "user-data",
                                                    span {
                                                        class: "user-data currency tabular-nums",
                                                        "{store.format_money(sc.from_previous_month_milliunits)}"
                                                    }
                                                }
                                            }
                                            div {
                                                class: "ynab-breakdown-row",
                                                div { "Assigned This Month" }
                                                div {
                                                    class: "user-data",
                                                    span {
                                                        class: "user-data currency tabular-nums",
                                                        "{store.format_money(sc.assigned_milliunits)}"
                                                    }
                                                }
                                            }
                                            div {
                                                class: "ynab-breakdown-row",
                                                div { "Activity This Month" }
                                                div {
                                                    class: "user-data",
                                                    span {
                                                        class: "user-data currency tabular-nums",
                                                        "{store.format_money(sc.activity_milliunits)}"
                                                    }
                                                }
                                            }
                                            if sc.cash_overspent_milliunits > 0 {
                                                div {
                                                    class: "ynab-breakdown-row ynab-breakdown-row-negative",
                                                    div { "Cash Overspending" }
                                                    div {
                                                        class: "user-data",
                                                        span {
                                                            class: "user-data currency tabular-nums",
                                                            "{store.format_money(sc.cash_overspent_milliunits)}"
                                                        }
                                                    }
                                                }
                                            }
                                            if sc.credit_overspent_milliunits > 0 {
                                                div {
                                                    class: "ynab-breakdown-row ynab-breakdown-row-warning",
                                                    div { "Credit Overspending" }
                                                    div {
                                                        class: "user-data",
                                                        span {
                                                            class: "user-data currency tabular-nums",
                                                            "{store.format_money(sc.credit_overspent_milliunits)}"
                                                        }
                                                    }
                                                }
                                            }
                                            div {
                                                class: "ynab-breakdown-row ynab-breakdown-available ynab-breakdown-row-total",
                                                div {
                                                    span {
                                                        class: "ynab-breakdown-available-heading",
                                                        "Available"
                                                    }
                                                }
                                                div {
                                                    class: "user-data",
                                                    span {
                                                        class: "user-data currency tabular-nums ynab-breakdown-available-value",
                                                        "{store.format_money(sc.available_milliunits)}"
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    } else {
                        section {
                            class: if *summary_expanded.read() {
                                "card inspector-card"
                            } else {
                                "card inspector-card is-collapsed"
                            },
                            button {
                                class: "card-roll-up",
                                aria_expanded: *summary_expanded.read(),
                                r#type: "button",
                                onclick: move |_| {
                                    let cur = *summary_expanded.read();
                                    summary_expanded.set(!cur);
                                },
                                h2 {
                                    if is_multiple {
                                        "{selected_cats.len()} Categories' Summary"
                                    } else {
                                        "{month_name}'s Summary"
                                    }
                                    Icon {
                                        class: "card-chevron",
                                        name: if *summary_expanded.read() { "chevron_down" } else { "chevron_right" },
                                        width: 12,
                                        height: 12,
                                    }
                                }
                            }
                            if *summary_expanded.read() {
                                div {
                                    class: "card-body",
                                    div {
                                        class: "ynab-breakdown",
                                        div {
                                            class: "ynab-breakdown-leftover-prev-month",
                                            div { "Left Over from Last Month" }
                                            div {
                                                class: "user-data",
                                                span {
                                                    class: "user-data currency tabular-nums",
                                                    "{store.format_money(total_from_prev)}"
                                                }
                                            }
                                        }
                                        div {
                                            class: "ynab-breakdown-assigned-in-month",
                                            div { "Assigned in {month_name}" }
                                            div {
                                                class: "user-data",
                                                span {
                                                    class: "user-data currency tabular-nums",
                                                    "{store.format_money(total_assigned)}"
                                                }
                                            }
                                        }
                                        div {
                                            class: "ynab-breakdown-activity",
                                            div { "Activity" }
                                            div {
                                                class: "user-data",
                                                span {
                                                    class: "user-data currency tabular-nums",
                                                    "{store.format_money(total_activity)}"
                                                }
                                            }
                                        }
                                        div {
                                            class: "ynab-breakdown-available",
                                            div {
                                                span { class: "ynab-breakdown-available-heading", "Available" }
                                            }
                                            div {
                                                class: "user-data",
                                                span {
                                                    class: "user-data currency tabular-nums",
                                                    "{store.format_money(total_available)}"
                                                }
                                            }
                                        }
                                    }

                                    // Cost to Be Me (shown when viewing full month summary)
                                    if is_none_selected {
                                        div {
                                            class: "cost-to-be-me-summary",
                                            div {
                                                div { class: "cost-to-be-me-separator" }
                                                div { class: "title", "Cost to Be Me" }
                                                div {
                                                    class: "label",
                                                    span { class: "description", "{month_name}'s Targets" }
                                                    span { class: "amount", "{store.format_money(cost_to_be_me_needed)}" }
                                                }
                                                if has_expected_income {
                                                    div {
                                                        class: if has_income_deficit {
                                                            "progress needed has-deficit"
                                                        } else {
                                                            "progress needed"
                                                        },
                                                        style: "width: {needed_bar_pct}%;",
                                                    }
                                                }
                                            }
                                            div {
                                                if *is_editing_income.read() {
                                                    span { class: "edit-income-description", "Expected Income" }
                                                    div {
                                                        class: "edit-income",
                                                        div {
                                                            class: "ynab-new-currency-input is-editing is-focused",
                                                            input {
                                                                class: "ember-text-field ember-view user-data",
                                                                r#type: "text",
                                                                aria_label: "Expected Income",
                                                                value: "{draft_income_str}",
                                                                autofocus: true,
                                                                oninput: move |e| draft_income_str.set(e.value()),
                                                                onkeydown: move |e| {
                                                                    if e.key() == Key::Enter {
                                                                        let parsed = evaluate_formula_milliunits(&draft_income_str.read()).unwrap_or(0).max(0);
                                                                        expected_income.set(parsed);
                                                                        save_expected_income_persisted(&store, parsed);
                                                                        is_editing_income.set(false);
                                                                    } else if e.key() == Key::Escape {
                                                                        is_editing_income.set(false);
                                                                    }
                                                                },
                                                            }
                                                        }
                                                    }
                                                    div {
                                                        class: "actions",
                                                        YnabButton {
                                                            variant: "secondary",
                                                            onclick: move |_| is_editing_income.set(false),
                                                            "Cancel"
                                                        }
                                                        YnabButton {
                                                            variant: "primary",
                                                            onclick: move |_| {
                                                                let parsed = evaluate_formula_milliunits(&draft_income_str.read()).unwrap_or(0).max(0);
                                                                expected_income.set(parsed);
                                                                save_expected_income_persisted(&store, parsed);
                                                                is_editing_income.set(false);
                                                            },
                                                            "Save"
                                                        }
                                                    }
                                                } else if !has_expected_income {
                                                    YnabButton {
                                                        class: "income-button",
                                                        variant: "secondary",
                                                        onclick: move |_| {
                                                            draft_income_str.set(store.format_plain_decimal(expected_income_val));
                                                            is_editing_income.set(true);
                                                        },
                                                        "Enter Expected Income"
                                                    }
                                                } else {
                                                    div {
                                                        class: "income-progress-wrapper",
                                                        div {
                                                            class: "label",
                                                            span { class: "description", "Expected Income" }
                                                            span {
                                                                class: "amount income-amount-row",
                                                                "{store.format_money(expected_income_val)}"
                                                                button {
                                                                    class: "edit-income-button",
                                                                    r#type: "button",
                                                                    aria_label: "Edit Expected Income",
                                                                    title: "Edit Expected Income",
                                                                    onclick: move |_| {
                                                                        draft_income_str.set(store.format_plain_decimal(expected_income_val));
                                                                        is_editing_income.set(true);
                                                                    },
                                                                    Icon {
                                                                        class: "edit-income-icon",
                                                                        name: "square_and_pencil",
                                                                        width: 12,
                                                                        height: 12,
                                                                    }
                                                                }
                                                            }
                                                        }
                                                        div {
                                                            class: "progress income",
                                                            style: "width: {income_bar_pct}%;",
                                                        }
                                                    }
                                                    div {
                                                        class: "next-month-section ctbm-next-month",
                                                        if has_income_deficit {
                                                            span {
                                                                class: "description ctbm-deficit-warning",
                                                                "Your targets exceed expected income by {store.format_money(cost_to_be_me_needed - expected_income_val)}."
                                                            }
                                                        } else {
                                                            span {
                                                                class: "description",
                                                                "You'll have {store.format_money(expected_income_val - cost_to_be_me_needed)} left over beyond your targets."
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // 3. Target Card (when single non-CC category selected)
                    if let Some(ref sc) = single_cat {
                        if !sc.is_credit_card_payment {
                            {
                                let sc_clone = sc.clone();
                                let sc_id_snooze = sc.id.clone();
                                let sc_snoozed = sc.is_snoozed;
                                let sc_id_fund = sc.id.clone();
                                let sc_assigned = sc.assigned_milliunits;
                                let underfunded = sc.goal_under_funded.unwrap_or(0);
                                let has_goal = sc.goal_type.is_some() && sc.goal_target_amount.unwrap_or(0) > 0;
                                let goal_target = sc.goal_target_amount.unwrap_or(0);
                                let goal_pct = sc.goal_percentage_complete.unwrap_or_else(|| {
                                    if goal_target > 0 {
                                        ((sc_assigned.max(0) as i128 * 100 / goal_target as i128) as i32).clamp(0, 100)
                                    } else {
                                        0
                                    }
                                });

                                rsx! {
                                    section {
                                        class: if *target_expanded.read() {
                                            "card inspector-card target-inspector-card"
                                        } else {
                                            "card inspector-card is-collapsed target-inspector-card"
                                        },
                                        button {
                                            class: "card-roll-up",
                                            aria_expanded: *target_expanded.read(),
                                            r#type: "button",
                                            onclick: move |_| {
                                                let cur = *target_expanded.read();
                                                target_expanded.set(!cur);
                                            },
                                            h2 {
                                                if sc_snoozed && has_goal {
                                                    Icon { class: "header-snooze-icon", name: "snooze", width: 16, height: 16 }
                                                } else if has_goal {
                                                    IconCircleProgress {
                                                        percentage_complete: goal_pct,
                                                        width: 16,
                                                        height: 16,
                                                        unique_id: format!("hdr-{}", sc.id),
                                                    }
                                                } else {
                                                    Icon { name: "target", width: 16, height: 16 }
                                                }
                                                "Target"
                                                Icon {
                                                    class: "card-chevron",
                                                    name: if *target_expanded.read() { "chevron_down" } else { "chevron_right" },
                                                    width: 12,
                                                    height: 12,
                                                }
                                            }
                                        }
                                        if *target_expanded.read() {
                                            div {
                                                class: "card-body",
                                                if *is_editing_target.read() {
                                                    TargetConfigurationForm {
                                                        category: sc_clone,
                                                        onclose: move |_| is_editing_target.set(false),
                                                    }
                                                } else if !has_goal {
                                                    div {
                                                        class: "view-target-empty-state",
                                                        strong {
                                                            class: "target-empty-title",
                                                            "How much do you need for {sc.name}?"
                                                        }
                                                        p {
                                                            class: "target-empty-description",
                                                            "When you create a target, we'll let you know how much money to set aside to stay on track over time."
                                                        }
                                                        YnabButton {
                                                            variant: "secondary",
                                                            class: "budget-inspector-goals-create",
                                                            onclick: move |_| is_editing_target.set(true),
                                                            "Create Target"
                                                        }
                                                    }
                                                } else {
                                                    div {
                                                        class: "target-inspector ynab-new-inspector-goals",
                                                        div {
                                                            class: "target-inspector-header",
                                                            div {
                                                                class: "header-top",
                                                                div {
                                                                    class: "target-behavior target-inspector-type",
                                                                    match sc.goal_type.as_deref() {
                                                                        Some("NEED") => "Needed for Spending",
                                                                        Some("TB") => "Target Balance",
                                                                        Some("TBD") => "Target Balance by Date",
                                                                        _ => "Set Aside Target",
                                                                    }
                                                                }
                                                                button {
                                                                    r#type: "button",
                                                                    class: "button button-link secondary target-edit-button",
                                                                    onclick: move |_| is_editing_target.set(true),
                                                                    "Edit"
                                                                }
                                                            }
                                                            div {
                                                                class: "header-bottom",
                                                                div {
                                                                    class: "target-by-date",
                                                                    if let Some(ref td) = sc.goal_target_date {
                                                                        "By {td}"
                                                                    } else {
                                                                        "Each month"
                                                                    }
                                                                }
                                                            }
                                                        }
                                                        div {
                                                            class: "goal-progress-container",
                                                            div {
                                                                class: "goal-progress-flexbox goal-progress-flexbox-centered",
                                                                div {
                                                                    class: "goal-progress-label-container left",
                                                                    div { class: "label", "Funded" }
                                                                    div { class: "figure", "{store.format_money(sc_assigned)}" }
                                                                }
                                                                div {
                                                                    class: "goal-progress-chart",
                                                                    IconCircleProgress {
                                                                        percentage_complete: goal_pct,
                                                                        width: 72,
                                                                        height: 72,
                                                                        unique_id: format!("insp-{}", sc.id),
                                                                    }
                                                                }
                                                                div {
                                                                    class: "goal-progress-label-container right",
                                                                    div {
                                                                        class: "label",
                                                                        if underfunded > 0 { "Needed" } else { "Target" }
                                                                    }
                                                                    div {
                                                                        class: "figure",
                                                                        if underfunded > 0 {
                                                                            "{store.format_money(underfunded)}"
                                                                        } else {
                                                                            "{store.format_money(goal_target)}"
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        }
                                                        div {
                                                            class: "goal-snooze",
                                                            div {
                                                                class: "ynab-checkbox",
                                                                button {
                                                                    class: if sc_snoozed {
                                                                        "ynab-checkbox ynab-checkbox-button is-checked"
                                                                    } else {
                                                                        "ynab-checkbox ynab-checkbox-button"
                                                                    },
                                                                    role: "checkbox",
                                                                    aria_checked: sc_snoozed,
                                                                    aria_label: "Snooze target for this month",
                                                                    r#type: "button",
                                                                    onclick: move |_| {
                                                                        store.toggle_snooze_goal(&sc_id_snooze, sc_snoozed);
                                                                    },
                                                                    Icon {
                                                                        class: if sc_snoozed {
                                                                            "ynab-checkbox-button-square is-checked"
                                                                        } else {
                                                                            "ynab-checkbox-button-square"
                                                                        },
                                                                        name: "check",
                                                                        width: 13,
                                                                        height: 13,
                                                                    }
                                                                    div {
                                                                        class: "label-checkbox goal-snooze-label",
                                                                        Icon { name: "snooze", width: 14, height: 14 }
                                                                        "Snooze target for this month"
                                                                    }
                                                                }
                                                            }
                                                            span {
                                                                class: "info-icon-tooltip",
                                                                title: "Pause funding reminders for this category for the current month.",
                                                                Icon { name: "question_mark_circle", width: 16, height: 16 }
                                                            }
                                                        }
                                                        if sc_snoozed {
                                                            div {
                                                                class: "impact-message snoozed target-impact-snoozed",
                                                                div {
                                                                    class: "impact-message-content",
                                                                    "This target is snoozed for this month."
                                                                }
                                                            }
                                                        } else if underfunded > 0 {
                                                            div {
                                                                class: "impact-message warning",
                                                                div {
                                                                    class: "impact-message-content",
                                                                    "Assign {store.format_money(underfunded)} more to fund this target."
                                                                }
                                                                YnabButton {
                                                                    variant: "primary",
                                                                    onclick: move |_| {
                                                                        store.set_category_assigned(&sc_id_fund, sc_assigned + underfunded);
                                                                    },
                                                                    "Assign"
                                                                }
                                                            }
                                                        } else {
                                                            div {
                                                                class: "impact-message positive",
                                                                div {
                                                                    class: "impact-message-content",
                                                                    "This target is funded for this month!"
                                                                }
                                                            }
                                                        }
                                                        div {
                                                            class: "target-breakdown",
                                                            div {
                                                                class: "target-breakdown-item",
                                                                div { class: "target-breakdown-item-label", "Target:" }
                                                                div { class: "target-breakdown-item-value user-data tabular-nums", "{store.format_money(goal_target)}" }
                                                            }
                                                            div {
                                                                class: "target-breakdown-item",
                                                                div { class: "target-breakdown-item-label", "Assigned:" }
                                                                div { class: "target-breakdown-item-value user-data tabular-nums", "{store.format_money(sc_assigned)}" }
                                                            }
                                                            hr {}
                                                            div {
                                                                class: "target-breakdown-item target-breakdown-item-total",
                                                                div {
                                                                    class: "target-breakdown-item-label",
                                                                    if underfunded > 0 { "Needed this month:" } else { "Funded:" }
                                                                }
                                                                div { class: "target-breakdown-item-value user-data tabular-nums", "{store.format_money(underfunded)}" }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // 4. Auto-Assign / Quick Budget Card (All 7 YNAB Quick Budget actions)
                    section {
                        class: if *auto_assign_expanded.read() {
                            "card inspector-card budget-breakdown-auto-assign"
                        } else {
                            "card inspector-card budget-breakdown-auto-assign is-collapsed"
                        },
                        button {
                            class: "card-roll-up",
                            aria_expanded: *auto_assign_expanded.read(),
                            r#type: "button",
                            onclick: move |_| {
                                let cur = *auto_assign_expanded.read();
                                auto_assign_expanded.set(!cur);
                            },
                            h2 {
                                Icon { name: "lightning", width: 16, height: 16 }
                                "Auto-Assign"
                                Icon {
                                    class: "card-chevron",
                                    name: if *auto_assign_expanded.read() { "chevron_down" } else { "chevron_right" },
                                    width: 12,
                                    height: 12,
                                }
                            }
                        }
                        if *auto_assign_expanded.read() {
                            {
                                let qb_ids_1 = quick_cat_ids_opt.clone();
                                let qb_ids_2 = quick_cat_ids_opt.clone();
                                let qb_ids_3 = quick_cat_ids_opt.clone();
                                let qb_ids_4 = quick_cat_ids_opt.clone();
                                let qb_ids_5 = quick_cat_ids_opt.clone();
                                let qb_ids_6 = quick_cat_ids_opt.clone();
                                let qb_ids_7 = quick_cat_ids_opt.clone();

                                rsx! {
                                    div {
                                        class: "card-body",
                                        div {
                                            class: "inspector-quick-budget",
                                            div {
                                                class: "option-groups",
                                                div {
                                                    button {
                                                        class: "budget-inspector-button js-focus-on-start underfunded",
                                                        r#type: "button",
                                                        onclick: move |_| {
                                                            store.apply_quick_budget("Underfunded", qb_ids_1.clone());
                                                        },
                                                        div { "Underfunded" }
                                                        div {
                                                            strong {
                                                                class: "user-data",
                                                                span {
                                                                    class: "user-data currency tabular-nums",
                                                                    "{store.format_money(total_underfunded)}"
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                                div {
                                                    button {
                                                        class: "budget-inspector-button assigned-last-month",
                                                        r#type: "button",
                                                        onclick: move |_| {
                                                            store.apply_quick_budget("BudgetedLastMonth", qb_ids_2.clone());
                                                        },
                                                        div { "Assigned Last Month" }
                                                        div {
                                                            strong {
                                                                class: "user-data",
                                                                span {
                                                                    class: "user-data currency tabular-nums",
                                                                    "{store.format_money(total_budgeted_last)}"
                                                                }
                                                            }
                                                        }
                                                    }
                                                    button {
                                                        class: "budget-inspector-button spent-last-month",
                                                        r#type: "button",
                                                        onclick: move |_| {
                                                            store.apply_quick_budget("SpentLastMonth", qb_ids_3.clone());
                                                        },
                                                        div { "Spent Last Month" }
                                                        div {
                                                            strong {
                                                                class: "user-data",
                                                                span {
                                                                    class: "user-data currency tabular-nums",
                                                                    "{store.format_money(total_spent_last)}"
                                                                }
                                                            }
                                                        }
                                                    }
                                                    button {
                                                        class: "budget-inspector-button average-assigned",
                                                        r#type: "button",
                                                        onclick: move |_| {
                                                            store.apply_quick_budget("AverageBudgeted", qb_ids_4.clone());
                                                        },
                                                        div { "Average Assigned" }
                                                        div {
                                                            strong {
                                                                class: "user-data",
                                                                span {
                                                                    class: "user-data currency tabular-nums",
                                                                    "{store.format_money(total_avg_budgeted)}"
                                                                }
                                                            }
                                                        }
                                                    }
                                                    button {
                                                        class: "budget-inspector-button average-spent",
                                                        r#type: "button",
                                                        onclick: move |_| {
                                                            store.apply_quick_budget("AverageSpent", qb_ids_5.clone());
                                                        },
                                                        div { "Average Spent" }
                                                        div {
                                                            strong {
                                                                class: "user-data",
                                                                span {
                                                                    class: "user-data currency tabular-nums",
                                                                    "{store.format_money(total_avg_spent)}"
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                                div {
                                                    button {
                                                        class: "budget-inspector-button set-available-amount-to-zero",
                                                        r#type: "button",
                                                        onclick: move |_| {
                                                            store.apply_quick_budget("SetAvailableAmountToZero", qb_ids_6.clone());
                                                        },
                                                        div { "Reset Available Amounts" }
                                                        div {
                                                            strong {
                                                                class: "user-data",
                                                                span {
                                                                    class: "user-data currency tabular-nums zero",
                                                                    "{store.format_money(0)}"
                                                                }
                                                            }
                                                        }
                                                    }
                                                    button {
                                                        class: "budget-inspector-button reset-assigned-amount",
                                                        r#type: "button",
                                                        onclick: move |_| {
                                                            store.apply_quick_budget("ResetBudgetedAmounts", qb_ids_7.clone());
                                                        },
                                                        div { "Reset Assigned Amounts" }
                                                        div {
                                                            strong {
                                                                class: "user-data",
                                                                span {
                                                                    class: "user-data currency tabular-nums zero",
                                                                    "{store.format_money(0)}"
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // 5. Assigned in Future Months (when 0 categories selected)
                    if is_none_selected {
                        section {
                            class: if *future_expanded.read() {
                                "card inspector-card budget-breakdown-future-totals future-assignments-update"
                            } else {
                                "card inspector-card is-collapsed budget-breakdown-future-totals future-assignments-update"
                            },
                            button {
                                class: "card-roll-up",
                                aria_expanded: *future_expanded.read(),
                                r#type: "button",
                                onclick: move |_| {
                                    let cur = *future_expanded.read();
                                    future_expanded.set(!cur);
                                },
                                h2 {
                                    span { "Assigned in Future Months" }
                                    Icon {
                                        class: "card-chevron",
                                        name: if *future_expanded.read() { "chevron_down" } else { "chevron_right" },
                                        width: 12,
                                        height: 12,
                                    }
                                    span {
                                        class: "user-data currency tabular-nums",
                                        "{store.format_money(summary.funded_in_future_milliunits)}"
                                    }
                                }
                            }
                            if *future_expanded.read() {
                                div {
                                    class: "card-body",
                                    div {
                                        class: "ynab-breakdown",
                                        div {
                                            div { "Total Assigned Ahead" }
                                            div {
                                                class: "user-data",
                                                span {
                                                    class: "user-data currency tabular-nums",
                                                    "{store.format_money(summary.funded_in_future_milliunits)}"
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // 6. Editable Category Notes Card (click-to-edit + Enter/blur/Save persistence)
                    if let Some(ref sc) = single_cat {
                        {
                            let sc_id_save_blur = sc.id.clone();
                            let sc_id_save_btn = sc.id.clone();
                            let sc_id_save_key = sc.id.clone();
                            let saved_note = sc.note.clone().unwrap_or_default();
                            let saved_note_esc = saved_note.clone();
                            let saved_note_cancel = saved_note.clone();
                            let saved_note_click = saved_note.clone();
                            let saved_note_blur = saved_note.clone();
                            let saved_note_key = saved_note.clone();
                            let saved_note_btn = saved_note.clone();
                            let editing_note = *is_editing_cat_note.read();

                            rsx! {
                                section {
                                    class: if *notes_expanded.read() {
                                        "card inspector-card budget-inspector-category-notes"
                                    } else {
                                        "card inspector-card is-collapsed budget-inspector-category-notes"
                                    },
                                    button {
                                        class: "card-roll-up",
                                        aria_expanded: *notes_expanded.read(),
                                        r#type: "button",
                                        onclick: move |_| {
                                            let cur = *notes_expanded.read();
                                            notes_expanded.set(!cur);
                                        },
                                        h2 {
                                            Icon { name: "memo", width: 16, height: 16 }
                                            "Notes"
                                            Icon {
                                                class: "card-chevron",
                                                name: if *notes_expanded.read() { "chevron_down" } else { "chevron_right" },
                                                width: 12,
                                                height: 12,
                                            }
                                        }
                                    }
                                    if *notes_expanded.read() {
                                        div {
                                            class: "card-body",
                                            div {
                                                class: if editing_note {
                                                    "inspector-notes is-editing"
                                                } else {
                                                    "inspector-notes"
                                                },
                                                if editing_note {
                                                    div {
                                                        class: "inspector-category-note user-data inspector-category-note-editor",
                                                        textarea {
                                                            class: "user-data inspector-notes-textarea",
                                                            placeholder: "Enter a note...",
                                                            rows: 3,
                                                            autofocus: true,
                                                            value: "{draft_cat_note}",
                                                            oninput: move |e| draft_cat_note.set(e.value()),
                                                            onblur: move |_| {
                                                                let next_val = draft_cat_note.read().trim().to_string();
                                                                if next_val != saved_note_blur.trim() {
                                                                    store.update_category_note(&sc_id_save_blur, &next_val);
                                                                }
                                                                is_editing_cat_note.set(false);
                                                            },
                                                            onkeydown: move |e| {
                                                                if e.key() == Key::Enter && !e.modifiers().shift() {
                                                                    e.prevent_default();
                                                                    let next_val = draft_cat_note.read().trim().to_string();
                                                                    if next_val != saved_note_key.trim() {
                                                                        store.update_category_note(&sc_id_save_key, &next_val);
                                                                    }
                                                                    is_editing_cat_note.set(false);
                                                                } else if e.key() == Key::Escape {
                                                                    draft_cat_note.set(saved_note_esc.clone());
                                                                    is_editing_cat_note.set(false);
                                                                }
                                                            }
                                                        }
                                                        div {
                                                            class: "inspector-notes-actions",
                                                            button {
                                                                class: "ynab-button secondary",
                                                                r#type: "button",
                                                                onmousedown: move |evt| evt.prevent_default(),
                                                                onclick: move |_| {
                                                                    draft_cat_note.set(saved_note_cancel.clone());
                                                                    is_editing_cat_note.set(false);
                                                                },
                                                                "Cancel"
                                                            }
                                                            button {
                                                                class: "ynab-button primary",
                                                                r#type: "button",
                                                                onmousedown: move |evt| evt.prevent_default(),
                                                                onclick: move |_| {
                                                                    let next_val = draft_cat_note.read().trim().to_string();
                                                                    if next_val != saved_note_btn.trim() {
                                                                        store.update_category_note(&sc_id_save_btn, &next_val);
                                                                    }
                                                                    is_editing_cat_note.set(false);
                                                                },
                                                                "Save"
                                                            }
                                                        }
                                                    }
                                                } else {
                                                    p {
                                                        class: "inspector-category-note user-data inspector-category-note-readonly",
                                                        title: "Click to edit category note",
                                                        onclick: move |_| {
                                                            draft_cat_note.set(saved_note_click.clone());
                                                            is_editing_cat_note.set(true);
                                                        },
                                                        if saved_note.trim().is_empty() {
                                                            "Enter a note..."
                                                        } else {
                                                            "{saved_note}"
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

#[component]
fn TargetConfigurationForm(category: CategoryDto, onclose: EventHandler<MouseEvent>) -> Element {
    let mut store = use_context::<AppStore>();
    let init_amount = store.format_plain_decimal(category.goal_target_amount.unwrap_or(100_000));
    let mut amount_str = use_signal(|| init_amount);
    let mut goal_type = use_signal(|| {
        category
            .goal_type
            .clone()
            .unwrap_or_else(|| "NEED".to_string())
    });
    let mut target_date = use_signal(|| {
        category
            .goal_target_date
            .clone()
            .unwrap_or_else(|| "2026-12-01".to_string())
    });
    let mut cadence = use_signal(|| category.goal_cadence.unwrap_or(1));
    let mut cadence_freq = use_signal(|| category.goal_cadence_frequency.unwrap_or(1));
    let mut day_of_week = use_signal(|| category.goal_day.unwrap_or(5)); // 5 = Friday
    let mut needs_whole = use_signal(|| category.goal_needs_whole_amount.unwrap_or(false));

    let cat_id_save = category.id.clone();
    let cat_id_del = category.id.clone();

    rsx! {
        div {
            class: "ynab-new-inspector-goals target-configuration-form",
            div {
                class: "ynab-new-inspector-goals-edit-goal",
                div {
                    class: "budget-inspector-goals-edit-section",
                    div {
                        class: "goal-body",
                        dl {
                            dt { class: "goal-form-label", "Target Type" }
                            dd {
                                class: "x-select-container",
                                select {
                                    class: "js-x-select goal-form-select",
                                    value: "{goal_type}",
                                    onchange: move |e| goal_type.set(e.value()),
                                    option { value: "NEED", "Needed for Spending" }
                                    option { value: "MF", "Monthly Savings Builder (Set Aside)" }
                                    option { value: "TB", "Target Savings Balance" }
                                    option { value: "TBD", "Target Balance by Date" }
                                }
                            }
                            dt { class: "goal-form-label", "I need" }
                            dd {
                                class: "user-data",
                                input {
                                    class: "ember-text-field ember-view user-data goal-form-input",
                                    r#type: "text",
                                    value: "{amount_str}",
                                    oninput: move |e| amount_str.set(e.value()),
                                }
                            }
                            if *goal_type.read() == "NEED" {
                                dt { class: "goal-form-label", "Frequency" }
                                dd {
                                    class: "x-select-container",
                                    select {
                                        class: "js-x-select goal-form-select",
                                        value: "{cadence}",
                                        onchange: move |e| {
                                            if let Ok(v) = e.value().parse::<i32>() {
                                                cadence.set(v);
                                            }
                                        },
                                        option { value: "1", "Monthly" }
                                        option { value: "2", "Weekly" }
                                        option { value: "13", "Yearly" }
                                    }
                                }
                                if *cadence.read() == 2 {
                                    dt { class: "goal-form-label", "Every" }
                                    dd {
                                        class: "ynab-new-inspector-goals-day-of-week goal-options-select user-data x-select-container",
                                        select {
                                            class: "js-x-select goal-form-select",
                                            value: "{day_of_week}",
                                            onchange: move |e| {
                                                if let Ok(v) = e.value().parse::<i32>() {
                                                    day_of_week.set(v);
                                                }
                                            },
                                            option { value: "0", "Sunday" }
                                            option { value: "1", "Monday" }
                                            option { value: "2", "Tuesday" }
                                            option { value: "3", "Wednesday" }
                                            option { value: "4", "Thursday" }
                                            option { value: "5", "Friday" }
                                            option { value: "6", "Saturday" }
                                        }
                                    }
                                } else if *cadence.read() == 1 {
                                    dt { class: "goal-form-label", "Repeat Every N Months" }
                                    dd {
                                        class: "user-data",
                                        input {
                                            class: "goal-form-input",
                                            r#type: "number",
                                            min: "1",
                                            max: "36",
                                            value: "{cadence_freq}",
                                            oninput: move |e| {
                                                if let Ok(v) = e.value().parse::<i32>() {
                                                    cadence_freq.set(v.max(1));
                                                }
                                            },
                                        }
                                    }
                                }
                                dt { class: "goal-form-label", "Next month I want to" }
                                dd {
                                    class: "x-select-container",
                                    select {
                                        class: "js-x-select goal-form-select",
                                        value: if *needs_whole.read() { "set-aside" } else { "refill" },
                                        onchange: move |e| needs_whole.set(e.value() == "set-aside"),
                                        option { value: "refill", "Refill up to target amount" }
                                        option { value: "set-aside", "Set aside another target amount" }
                                    }
                                }
                            }
                            if *goal_type.read() == "TBD" {
                                dt { class: "goal-form-label", "Target Date (YYYY-MM-DD)" }
                                dd {
                                    class: "ynab-new-inspector-goals-calendar user-data",
                                    input {
                                        class: "goal-form-input",
                                        r#type: "text",
                                        value: "{target_date}",
                                        oninput: move |e| target_date.set(e.value()),
                                    }
                                }
                            }
                        }
                    }
                    div {
                        class: "goal-actions",
                        div {
                            class: "actions",
                            div {
                                class: "actions-left",
                                if category.goal_type.is_some() {
                                    YnabButton {
                                        variant: "destructive",
                                        onclick: move |evt| {
                                            let b_id = store.budget_id.read().clone();
                                            store.save_category_goal(SetGoalPayload {
                                                budget_id: Some(b_id),
                                                category_id: cat_id_del.clone(),
                                                goal_type: None,
                                                target_amount: 0,
                                                target_date: None,
                                                cadence: None,
                                                cadence_frequency: None,
                                                day_of_week: None,
                                                needs_whole_amount: None,
                                            });
                                            onclose.call(evt);
                                        },
                                        "Delete"
                                    }
                                }
                            }
                            div {
                                class: "actions-right",
                                YnabButton {
                                    variant: "secondary",
                                    onclick: move |evt| onclose.call(evt),
                                    "Cancel"
                                }
                                YnabButton {
                                    variant: "primary",
                                    onclick: move |evt| {
                                        let b_id = store.budget_id.read().clone();
                                        let raw_amt = amount_str.read().clone();
                                        let milli = evaluate_formula_milliunits(&raw_amt).unwrap_or(0).max(0);
                                        let gt = goal_type.read().clone();
                                        let cad = *cadence.read();
                                        let td = if gt == "TBD" {
                                            Some(target_date.read().clone())
                                        } else {
                                            None
                                        };
                                        let dow = if gt == "NEED" && cad == 2 {
                                            Some(*day_of_week.read())
                                        } else {
                                            None
                                        };
                                        let freq = if gt == "NEED" && cad == 1 {
                                            *cadence_freq.read()
                                        } else {
                                            1
                                        };
                                        let whole = if gt == "NEED" {
                                            *needs_whole.read()
                                        } else {
                                            true
                                        };
                                        store.save_category_goal(SetGoalPayload {
                                            budget_id: Some(b_id),
                                            category_id: cat_id_save.clone(),
                                            goal_type: Some(gt),
                                            target_amount: milli,
                                            target_date: td,
                                            cadence: Some(cad),
                                            cadence_frequency: Some(freq),
                                            day_of_week: dow,
                                            needs_whole_amount: Some(whole),
                                        });
                                        onclose.call(evt);
                                    },
                                    "Save Target"
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

// =============================================================
// Budget Workspace Popover Modals
// =============================================================

#[component]
pub fn MoveMoneyModalView(
    from_category_id: Option<String>,
    from_category_name: Option<String>,
    to_category_id: Option<String>,
    initial_amount_milliunits: i64,
) -> Element {
    let mut store = use_context::<AppStore>();
    let groups = store.month_summary.read().category_groups.clone();
    let flat_cats: Vec<(String, String)> = groups
        .iter()
        .flat_map(|g| {
            g.categories
                .iter()
                .map(move |c| (c.id.clone(), format!("{} > {}", g.name, c.name)))
        })
        .collect();

    let default_to = to_category_id
        .clone()
        .or_else(|| flat_cats.first().map(|(id, _)| id.clone()))
        .unwrap_or_default();

    let init_str = store.format_plain_decimal(initial_amount_milliunits.max(0));
    let mut amount_str = use_signal(|| init_str);
    let mut target_id = use_signal(|| default_to);

    let title = match &from_category_name {
        Some(name) => format!("Move Money from {name}"),
        None => "Assign Money".to_string(),
    };

    let from_submit_btn = from_category_id.clone();
    let from_submit_key = from_category_id;

    rsx! {
        div {
            class: "modal-overlay active ynab-u modal-popup modal-budget modal-budget-move-money budget-popover-overlay",
            onclick: move |_| store.active_modal.set(ActiveModal::None),
            div {
                class: "modal budget-popover-modal",
                role: "dialog",
                aria_modal: "true",
                aria_label: "{title}",
                onclick: move |e| e.stop_propagation(),
                div {
                    class: "modal-header budget-popover-header",
                    h2 { class: "modal-title budget-popover-title", "{title}" }
                    button {
                        class: "modal-fresh-close budget-popover-close",
                        r#type: "button",
                        aria_label: "Close",
                        onclick: move |_| store.active_modal.set(ActiveModal::None),
                        Icon { name: "close", width: 12, height: 12 }
                    }
                }
                div {
                    class: "modal-content budget-popover-content",
                    div {
                        class: "fieldset budget-popover-fieldset",
                        label {
                            class: "budget-popover-label",
                            "Move Amount"
                        }
                        input {
                            class: "user-data budget-popover-input",
                            r#type: "text",
                            autofocus: true,
                            value: "{amount_str}",
                            oninput: move |e| amount_str.set(e.value()),
                            onkeydown: move |e| {
                                if e.key() == Key::Enter {
                                    let raw = amount_str.read().clone();
                                    let to_cat = target_id.read().clone();
                                    if let Some(milli) = evaluate_formula_milliunits(&raw) {
                                        if milli > 0 && !to_cat.is_empty() {
                                            store.move_money(from_submit_key.as_deref(), &to_cat, milli);
                                        }
                                    }
                                    store.active_modal.set(ActiveModal::None);
                                } else if e.key() == Key::Escape {
                                    store.active_modal.set(ActiveModal::None);
                                }
                            },
                        }
                    }
                    div {
                        class: "fieldset budget-popover-fieldset",
                        label {
                            class: "budget-popover-label",
                            "To Category"
                        }
                        select {
                            class: "user-data budget-popover-select",
                            value: "{target_id}",
                            onchange: move |e| target_id.set(e.value()),
                            for (c_id, c_label) in flat_cats.iter() {
                                option { key: "{c_id}", value: "{c_id}", "{c_label}" }
                            }
                        }
                    }
                }
                div {
                    class: "modal-actions budget-popover-actions",
                    YnabButton {
                        variant: "secondary",
                        onclick: move |_| store.active_modal.set(ActiveModal::None),
                        "Cancel"
                    }
                    YnabButton {
                        variant: "primary",
                        onclick: move |_| {
                            let raw = amount_str.read().clone();
                            let to_cat = target_id.read().clone();
                            if let Some(milli) = evaluate_formula_milliunits(&raw) {
                                if milli > 0 && !to_cat.is_empty() {
                                    store.move_money(from_submit_btn.as_deref(), &to_cat, milli);
                                }
                            }
                            store.active_modal.set(ActiveModal::None);
                        },
                        "OK"
                    }
                }
                svg {
                    class: "modal-arrow budget-popover-arrow",
                    view_box: "0 0 100 100",
                    preserve_aspect_ratio: "none",
                    path { d: "M 0 100 L 50 0 L 100 100 L 0 100 Z" }
                }
            }
        }
    }
}

#[component]
pub fn CoverOverspendingModalView(
    category_id: String,
    category_name: String,
    overspent_milliunits: i64,
) -> Element {
    let mut store = use_context::<AppStore>();
    let summary = store.month_summary.read().clone();
    let rta = summary.ready_to_assign_milliunits;

    let positive_cats: Vec<(String, String, i64)> = summary
        .category_groups
        .iter()
        .flat_map(|g| {
            g.categories
                .iter()
                .filter(|c| c.available_milliunits > 0 && c.id != category_id)
                .map(|c| (c.id.clone(), c.name.clone(), c.available_milliunits))
        })
        .collect();

    let default_src = if rta > 0 {
        "rta".to_string()
    } else {
        positive_cats
            .first()
            .map(|(id, _, _)| id.clone())
            .unwrap_or_else(|| "rta".to_string())
    };

    let init_amt = store.format_plain_decimal(overspent_milliunits);
    let mut amount_str = use_signal(|| init_amt);
    let mut source_id = use_signal(|| default_src);
    let cat_id_btn = category_id.clone();
    let cat_id_key = category_id;

    rsx! {
        div {
            class: "modal-overlay active ynab-u modal-popup modal-budget modal-budget-overspending budget-popover-overlay",
            onclick: move |_| store.active_modal.set(ActiveModal::None),
            div {
                class: "modal budget-popover-modal",
                role: "dialog",
                aria_modal: "true",
                aria_label: "Cover Overspending in {category_name}",
                onclick: move |e| e.stop_propagation(),
                div {
                    class: "modal-header budget-popover-header",
                    h2 { class: "modal-title budget-popover-title", "Cover Overspending in {category_name}" }
                    button {
                        class: "modal-fresh-close budget-popover-close",
                        r#type: "button",
                        aria_label: "Close",
                        onclick: move |_| store.active_modal.set(ActiveModal::None),
                        Icon { name: "close", width: 12, height: 12 }
                    }
                }
                div {
                    class: "modal-content budget-popover-content",
                    div {
                        class: "fieldset budget-popover-fieldset",
                        label {
                            class: "budget-popover-label",
                            "Cover Amount"
                        }
                        input {
                            class: "user-data budget-popover-input",
                            r#type: "text",
                            autofocus: true,
                            value: "{amount_str}",
                            oninput: move |e| amount_str.set(e.value()),
                            onkeydown: move |e| {
                                if e.key() == Key::Enter {
                                    let raw = amount_str.read().clone();
                                    let src = source_id.read().clone();
                                    if let Some(milli) = evaluate_formula_milliunits(&raw) {
                                        if milli > 0 {
                                            let from_opt = if src == "rta" { None } else { Some(src.as_str()) };
                                            store.move_money(from_opt, &cat_id_key, milli);
                                        }
                                    }
                                    store.active_modal.set(ActiveModal::None);
                                } else if e.key() == Key::Escape {
                                    store.active_modal.set(ActiveModal::None);
                                }
                            },
                        }
                    }
                    div {
                        class: "fieldset cover-with-container budget-popover-fieldset",
                        label {
                            class: "budget-popover-label",
                            "Cover this overspending with:"
                        }
                        select {
                            class: "budget-popover-select",
                            value: "{source_id}",
                            onchange: move |e| source_id.set(e.value()),
                            option {
                                value: "rta",
                                "Ready to Assign ({store.format_money(rta)})"
                            }
                            for (cid, cname, cavail) in positive_cats.iter() {
                                option {
                                    key: "{cid}",
                                    value: "{cid}",
                                    "{cname} ({store.format_money(*cavail)})"
                                }
                            }
                        }
                    }
                }
                div {
                    class: "modal-actions budget-popover-actions",
                    YnabButton {
                        variant: "secondary",
                        onclick: move |_| store.active_modal.set(ActiveModal::None),
                        "Cancel"
                    }
                    YnabButton {
                        variant: "primary",
                        onclick: move |_| {
                            let raw = amount_str.read().clone();
                            let src = source_id.read().clone();
                            if let Some(milli) = evaluate_formula_milliunits(&raw) {
                                if milli > 0 {
                                    let from_opt = if src == "rta" { None } else { Some(src.as_str()) };
                                    store.move_money(from_opt, &cat_id_btn, milli);
                                }
                            }
                            store.active_modal.set(ActiveModal::None);
                        },
                        "Cover Overspending"
                    }
                }
                svg {
                    class: "modal-arrow budget-popover-arrow",
                    view_box: "0 0 100 100",
                    preserve_aspect_ratio: "none",
                    path { d: "M 0 100 L 50 0 L 100 100 L 0 100 Z" }
                }
            }
        }
    }
}

#[component]
pub fn ActivityTransactionsModalView(
    category_id: String,
    category_name: String,
    activity_milliunits: i64,
) -> Element {
    let mut store = use_context::<AppStore>();
    let month_iso = store.current_month.read().clone();
    let all_txs = store.transactions.read().clone();
    let filtered = filter_category_monthly_transactions(&all_txs, &category_id, &month_iso);

    rsx! {
        div {
            class: "modal-overlay active ynab-u modal-popup modal-budget-activity budget-popover-overlay",
            onclick: move |_| store.active_modal.set(ActiveModal::None),
            div {
                class: "modal budget-popover-modal budget-activity-modal",
                role: "dialog",
                aria_modal: "true",
                aria_label: "Activity: {category_name}",
                onclick: move |e| e.stop_propagation(),
                div {
                    class: "modal-header budget-popover-header",
                    h2 {
                        class: "activity-header modal-title budget-popover-title",
                        "Activity: {category_name} ({store.format_money(activity_milliunits)})"
                    }
                    button {
                        class: "modal-fresh-close budget-popover-close",
                        r#type: "button",
                        aria_label: "Close",
                        onclick: move |_| store.active_modal.set(ActiveModal::None),
                        Icon { name: "close", width: 12, height: 12 }
                    }
                }
                div {
                    class: "modal-content",
                    if filtered.is_empty() {
                        div {
                            class: "budget-activity-empty",
                            "No transactions recorded for this category in this month."
                        }
                    } else {
                        table {
                            class: "ynab-table activity-transaction-list budget-activity-table",
                            thead {
                                tr {
                                    class: "budget-activity-thead-row",
                                    th { class: "budget-activity-th", "Account" }
                                    th { class: "budget-activity-th", "Date" }
                                    th { class: "budget-activity-th", "Payee" }
                                    th { class: "budget-activity-th", "Memo" }
                                    th { class: "budget-activity-th amount-column", "Amount" }
                                }
                            }
                            tbody {
                                for tx in filtered.iter() {
                                    tr {
                                        key: "{tx.id}",
                                        class: "ynab-table-row budget-activity-row",
                                        td { class: "budget-activity-td", "{tx.account_name.as_deref().unwrap_or(\"Account\")}" }
                                        td { class: "budget-activity-td", "{store.format_date(&tx.date)}" }
                                        td { class: "budget-activity-td", "{tx.payee_name.as_deref().unwrap_or(\"\")}" }
                                        td { class: "budget-activity-td", "{tx.memo.as_deref().unwrap_or(\"\")}" }
                                        td {
                                            class: "budget-activity-td amount-column user-data tabular-nums budget-activity-amount-cell",
                                            "{store.format_money(tx.amount_milliunits)}"
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                div {
                    class: "modal-actions budget-popover-actions",
                    YnabButton {
                        variant: "primary",
                        onclick: move |_| store.active_modal.set(ActiveModal::None),
                        "Done"
                    }
                }
                svg {
                    class: "modal-arrow budget-popover-arrow",
                    view_box: "0 0 100 100",
                    preserve_aspect_ratio: "none",
                    path { d: "M 0 100 L 50 0 L 100 100 L 0 100 Z" }
                }
            }
        }
    }
}

#[component]
pub fn RtaBreakdownModalView() -> Element {
    let mut store = use_context::<AppStore>();
    let month_iso = store.current_month.read().clone();
    let month_name = format_month_full_name(&month_iso);
    let summary = store.month_summary.read().clone();

    rsx! {
        div {
            class: "budget-breakdown-to-be-budgeted",
            div {
                class: "modal-overlay active ynab-u modal-popup modal-budget-breakdown-to-be-budgeted budget-popover-overlay",
                onclick: move |_| store.active_modal.set(ActiveModal::None),
                div {
                    class: "modal budget-popover-modal",
                    role: "dialog",
                    aria_modal: "true",
                    aria_label: "Ready to Assign Breakdown",
                    onclick: move |e| e.stop_propagation(),
                    div {
                        class: "modal-header budget-popover-header",
                        h2 { class: "modal-title budget-popover-title", "Ready to Assign Breakdown" }
                        button {
                            class: "modal-fresh-close budget-popover-close",
                            r#type: "button",
                            aria_label: "Close",
                            onclick: move |_| store.active_modal.set(ActiveModal::None),
                            Icon { name: "close", width: 12, height: 12 }
                        }
                    }
                    div {
                        class: "modal-content budget-popover-content",
                        div {
                            class: "budget-breakdown-to-be-budgeted-breakdown ynab-breakdown budget-rta-breakdown-list",
                            div {
                                class: "ynab-breakdown-row",
                                div { "Inflow: Ready to Assign in {month_name}" }
                                div { class: "user-data tabular-nums", "{store.format_money(summary.immediate_income_milliunits)}" }
                            }
                            div {
                                class: "ynab-breakdown-row",
                                div { "Assigned in {month_name}" }
                                div { class: "user-data tabular-nums", "-{store.format_money(summary.total_assigned_milliunits)}" }
                            }
                            div {
                                class: "ynab-breakdown-row",
                                div { "Cash Overspending from Prior Month" }
                                div { class: "user-data tabular-nums", "-{store.format_money(summary.prior_month_overspent_milliunits)}" }
                            }
                            div {
                                class: "ynab-breakdown-row",
                                div { "Assigned in Future Months" }
                                div { class: "user-data tabular-nums", "-{store.format_money(summary.funded_in_future_milliunits)}" }
                            }
                            hr { class: "budget-popover-divider" }
                            div {
                                class: "ynab-breakdown-row budget-breakdown-to-be-budgeted-total-tbb",
                                div { "= Ready to Assign" }
                                div { class: "user-data tabular-nums", "{store.format_money(summary.ready_to_assign_milliunits)}" }
                            }
                        }
                    }
                    div {
                        class: "modal-actions budget-popover-actions budget-rta-popover-actions",
                        YnabButton {
                            variant: "primary",
                            onclick: move |_| store.active_modal.set(ActiveModal::None),
                            "OK"
                        }
                    }
                    svg {
                        class: "modal-arrow budget-popover-arrow",
                        view_box: "0 0 100 100",
                        preserve_aspect_ratio: "none",
                        path { d: "M 0 100 L 50 0 L 100 100 L 0 100 Z" }
                    }
                }
            }
        }
    }
}

#[component]
pub fn MonthPickerModalView() -> Element {
    let mut store = use_context::<AppStore>();
    let curr_iso = store.current_month.read().clone();
    let (init_year, active_m) = parse_year_month(&curr_iso);
    let mut picker_year = use_signal(|| init_year);

    rsx! {
        div {
            class: "modal-overlay active ynab-u modal-popup modal-calendar budget-popover-overlay",
            onclick: move |_| store.active_modal.set(ActiveModal::None),
            div {
                class: "modal budget-popover-modal budget-month-picker-modal",
                role: "dialog",
                aria_modal: "true",
                aria_label: "Select Budget Month",
                onclick: move |e| e.stop_propagation(),
                div {
                    class: "ynab-calendar",
                    div {
                        class: "month-picker",
                        ul {
                            class: "month-picker-years",
                            li {
                                class: "month-picker-years-item",
                                button {
                                    class: "button budget-month-picker-year-btn",
                                    r#type: "button",
                                    aria_label: "Previous Year",
                                    onclick: move |_| {
                                        let y = *picker_year.read();
                                        picker_year.set(y - 1);
                                    },
                                    Icon { name: "chevron_left", width: 14, height: 14 }
                                }
                            }
                            li {
                                class: "month-picker-years-item month-picker-selected-year",
                                "{picker_year}"
                            }
                            li {
                                class: "month-picker-years-item",
                                button {
                                    class: "button budget-month-picker-year-btn",
                                    r#type: "button",
                                    aria_label: "Next Year",
                                    onclick: move |_| {
                                        let y = *picker_year.read();
                                        picker_year.set(y + 1);
                                    },
                                    Icon { name: "chevron_right", width: 14, height: 14 }
                                }
                            }
                        }
                        ul {
                            class: "month-picker-months",
                            for (idx, m_name) in MONTH_NAMES.iter().enumerate() {
                                {
                                    let m_num = (idx as u32) + 1;
                                    let y_val = *picker_year.read();
                                    let is_active = y_val == init_year && m_num == active_m;
                                    rsx! {
                                        li {
                                            key: "{m_num}",
                                            button {
                                                class: if is_active {
                                                    "month-picker-months-item is-selected"
                                                } else {
                                                    "month-picker-months-item"
                                                },
                                                r#type: "button",
                                                onclick: move |_| {
                                                    let iso = format!("{:04}-{:02}-01", *picker_year.read(), m_num);
                                                    store.set_month(iso);
                                                    store.active_modal.set(ActiveModal::None);
                                                },
                                                "{m_name}"
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                svg {
                    class: "modal-arrow budget-popover-arrow",
                    view_box: "0 0 100 100",
                    preserve_aspect_ratio: "none",
                    path { d: "M 0 100 L 50 0 L 100 100 L 0 100 Z" }
                }
            }
        }
    }
}

#[component]
pub fn AddMasterCategoryModalView() -> Element {
    let mut store = use_context::<AppStore>();
    let mut name = use_signal(String::new);

    rsx! {
        div {
            class: "modal-overlay active ynab-u modal-popup modal-add-master-category budget-popover-overlay",
            onclick: move |_| store.active_modal.set(ActiveModal::None),
            div {
                class: "modal budget-popover-modal",
                role: "dialog",
                aria_modal: "true",
                aria_label: "New Category Group",
                onclick: move |e| e.stop_propagation(),
                div {
                    class: "modal-header budget-popover-header",
                    h2 { class: "modal-title budget-popover-title", "New Category Group" }
                    button {
                        class: "modal-fresh-close budget-popover-close",
                        r#type: "button",
                        aria_label: "Close",
                        onclick: move |_| store.active_modal.set(ActiveModal::None),
                        Icon { name: "close", width: 12, height: 12 }
                    }
                }
                div {
                    class: "modal-content budget-popover-content",
                    div {
                        class: "fieldset budget-popover-fieldset",
                        input {
                            class: "user-data budget-popover-input",
                            r#type: "text",
                            placeholder: "New Category Group",
                            autofocus: true,
                            value: "{name}",
                            oninput: move |e| name.set(e.value()),
                            onkeydown: move |e| {
                                if e.key() == Key::Enter {
                                    let val = name.read().clone();
                                    if !val.trim().is_empty() {
                                        store.create_category_group(&val);
                                    }
                                    store.active_modal.set(ActiveModal::None);
                                } else if e.key() == Key::Escape {
                                    store.active_modal.set(ActiveModal::None);
                                }
                            },
                        }
                    }
                }
                div {
                    class: "modal-actions budget-popover-actions",
                    YnabButton {
                        variant: "secondary",
                        onclick: move |_| store.active_modal.set(ActiveModal::None),
                        "Cancel"
                    }
                    YnabButton {
                        variant: "primary",
                        onclick: move |_| {
                            let val = name.read().clone();
                            if !val.trim().is_empty() {
                                store.create_category_group(&val);
                            }
                            store.active_modal.set(ActiveModal::None);
                        },
                        "OK"
                    }
                }
                svg {
                    class: "modal-arrow budget-popover-arrow",
                    view_box: "0 0 100 100",
                    preserve_aspect_ratio: "none",
                    path { d: "M 0 100 L 50 0 L 100 100 L 0 100 Z" }
                }
            }
        }
    }
}

#[component]
pub fn AddSubCategoryModalView(group_id: String, group_name: String) -> Element {
    let mut store = use_context::<AppStore>();
    let mut name = use_signal(String::new);
    let grp_id_btn = group_id.clone();
    let grp_id_key = group_id;

    rsx! {
        div {
            class: "modal-overlay active ynab-u modal-popup modal-add-sub-category budget-popover-overlay",
            onclick: move |_| store.active_modal.set(ActiveModal::None),
            div {
                class: "modal budget-popover-modal",
                role: "dialog",
                aria_modal: "true",
                aria_label: "Add Category to {group_name}",
                onclick: move |e| e.stop_propagation(),
                div {
                    class: "modal-header budget-popover-header",
                    h2 { class: "modal-title budget-popover-title", "Add Category to {group_name}" }
                    button {
                        class: "modal-fresh-close budget-popover-close",
                        r#type: "button",
                        aria_label: "Close",
                        onclick: move |_| store.active_modal.set(ActiveModal::None),
                        Icon { name: "close", width: 12, height: 12 }
                    }
                }
                div {
                    class: "modal-content budget-popover-content",
                    div {
                        class: "fieldset budget-popover-fieldset",
                        input {
                            class: "user-data budget-popover-input",
                            r#type: "text",
                            placeholder: "New Category",
                            autofocus: true,
                            value: "{name}",
                            oninput: move |e| name.set(e.value()),
                            onkeydown: move |e| {
                                if e.key() == Key::Enter {
                                    let val = name.read().clone();
                                    if !val.trim().is_empty() {
                                        store.create_subcategory(&grp_id_key, &val);
                                    }
                                    store.active_modal.set(ActiveModal::None);
                                } else if e.key() == Key::Escape {
                                    store.active_modal.set(ActiveModal::None);
                                }
                            },
                        }
                    }
                }
                div {
                    class: "modal-actions budget-popover-actions",
                    YnabButton {
                        variant: "secondary",
                        onclick: move |_| store.active_modal.set(ActiveModal::None),
                        "Cancel"
                    }
                    YnabButton {
                        variant: "primary",
                        onclick: move |_| {
                            let val = name.read().clone();
                            if !val.trim().is_empty() {
                                store.create_subcategory(&grp_id_btn, &val);
                            }
                            store.active_modal.set(ActiveModal::None);
                        },
                        "OK"
                    }
                }
                svg {
                    class: "modal-arrow budget-popover-arrow",
                    view_box: "0 0 100 100",
                    preserve_aspect_ratio: "none",
                    path { d: "M 0 100 L 50 0 L 100 100 L 0 100 Z" }
                }
            }
        }
    }
}

#[component]
pub fn EditCategoryModalView(
    id: String,
    name: String,
    is_master: bool,
    can_delete: bool,
    can_rename: bool,
    is_cc_payment: bool,
) -> Element {
    let mut store = use_context::<AppStore>();
    let mut draft_name = use_signal(|| name.clone());
    let id_hide = id.clone();
    let id_del = id.clone();
    let id_save_btn = id.clone();
    let id_save_key = id;
    let modal_title = if is_master {
        "Edit Category Group"
    } else {
        "Edit Category"
    };

    rsx! {
        div {
            class: "modal-overlay active ynab-u modal-popup modal-budget-edit-category budget-popover-overlay",
            onclick: move |_| store.active_modal.set(ActiveModal::None),
            div {
                class: "modal budget-popover-modal",
                role: "dialog",
                aria_modal: "true",
                aria_label: "{modal_title}",
                onclick: move |e| e.stop_propagation(),
                div {
                    class: "modal-header budget-popover-header",
                    h2 { class: "modal-title budget-popover-title", "{modal_title}" }
                    button {
                        class: "modal-fresh-close budget-popover-close",
                        r#type: "button",
                        aria_label: "Close",
                        onclick: move |_| store.active_modal.set(ActiveModal::None),
                        Icon { name: "close", width: 12, height: 12 }
                    }
                }
                div {
                    class: "modal-content budget-popover-content",
                    div {
                        class: "fieldset budget-popover-fieldset",
                        if can_rename {
                            input {
                                class: "modal-budget-edit-category-name user-data budget-popover-input",
                                r#type: "text",
                                value: "{draft_name}",
                                autofocus: true,
                                oninput: move |e| draft_name.set(e.value()),
                                onkeydown: move |e| {
                                    if e.key() == Key::Enter {
                                        let val = draft_name.read().clone();
                                        store.rename_category(&id_save_key, &val, is_master);
                                        store.active_modal.set(ActiveModal::None);
                                    } else if e.key() == Key::Escape {
                                        store.active_modal.set(ActiveModal::None);
                                    }
                                },
                            }
                        } else {
                            span {
                                class: "modal-budget-edit-category-label user-data",
                                "{name}"
                            }
                        }
                    }
                }
                div {
                    class: "modal-actions budget-edit-category-actions",
                    div {
                        class: "modal-actions-left",
                        if !is_cc_payment {
                            YnabButton {
                                variant: "secondary",
                                class: "button-hide",
                                onclick: move |_| {
                                    store.hide_category(&id_hide, is_master, true);
                                    store.active_modal.set(ActiveModal::None);
                                },
                                "Hide"
                            }
                        }
                        if can_delete {
                            YnabButton {
                                variant: "destructive",
                                class: "button-delete",
                                onclick: move |_| {
                                    store.delete_category(&id_del, is_master);
                                    store.active_modal.set(ActiveModal::None);
                                },
                                "Delete"
                            }
                        }
                    }
                    div {
                        class: "modal-actions-right",
                        if !is_cc_payment {
                            YnabButton {
                                variant: "secondary",
                                class: "button-cancel",
                                onclick: move |_| store.active_modal.set(ActiveModal::None),
                                "Cancel"
                            }
                        }
                        YnabButton {
                            variant: "primary",
                            onclick: move |_| {
                                if can_rename {
                                    let val = draft_name.read().clone();
                                    store.rename_category(&id_save_btn, &val, is_master);
                                }
                                store.active_modal.set(ActiveModal::None);
                            },
                            "OK"
                        }
                    }
                }
                svg {
                    class: "modal-arrow budget-popover-arrow",
                    view_box: "0 0 100 100",
                    preserve_aspect_ratio: "none",
                    path { d: "M 0 100 L 50 0 L 100 100 L 0 100 Z" }
                }
            }
        }
    }
}
