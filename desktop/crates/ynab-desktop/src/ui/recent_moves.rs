//! Recent Moves Modal (`RecentMovesModal`, `RecentMoveEntryVm`, `RecentMoveTab`).
//! Exact 1:1 YNAB Ember 34-day Recent Moves drawer/modal DOM & CSS parity,
//! using 100% integer milliunit arithmetic (`#![deny(clippy::float_arithmetic)]`).

#![deny(clippy::float_arithmetic)]

use chrono::{Local, NaiveDate};
use dioxus::prelude::*;
use std::collections::{BTreeMap, BTreeSet};

use crate::state::AppStore;
use crate::ui::core::{Icon, YnabButton};
use ynab_core::format::{
    format_date_with_pattern, format_milliunits_with_config, CurrencyFormatConfig,
};

/// 34-day Recent Moves tracking window matching YNAB Ember `RECENT_MOVES_DAYS_TO_TRACK`.
pub const RECENT_MOVES_WINDOW_DAYS: usize = 34;

/// Pure-UI view-model representing a single assignment or category-to-category movement.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RecentMoveEntryVm {
    pub id: String,
    pub moved_at: String,
    pub from_category_name: String,
    pub to_category_name: String,
    pub amount_milliunits: i64,
    pub is_assignment: bool,
}

/// Filter tabs for the Recent Moves segmented control.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum RecentMoveTab {
    #[default]
    All,
    Assigned,
    Moved,
}

fn extract_iso_date(moved_at: &str) -> &str {
    let bytes = moved_at.as_bytes();
    if moved_at.len() >= 10 && bytes[4] == b'-' && bytes[7] == b'-' {
        &moved_at[..10]
    } else {
        moved_at
    }
}

fn extract_time_hhmm(moved_at: &str) -> Option<&str> {
    let bytes = moved_at.as_bytes();
    if moved_at.len() >= 16 && (bytes[10] == b'T' || bytes[10] == b' ') && bytes[13] == b':' {
        Some(&moved_at[11..16])
    } else {
        None
    }
}

fn extract_month_short(moved_at: &str) -> Option<&'static str> {
    if moved_at.len() < 7 {
        return None;
    }
    match &moved_at[5..7] {
        "01" => Some("JAN"),
        "02" => Some("FEB"),
        "03" => Some("MAR"),
        "04" => Some("APR"),
        "05" => Some("MAY"),
        "06" => Some("JUN"),
        "07" => Some("JUL"),
        "08" => Some("AUG"),
        "09" => Some("SEP"),
        "10" => Some("OCT"),
        "11" => Some("NOV"),
        "12" => Some("DEC"),
        _ => None,
    }
}

fn format_day_heading(date_key: &str, date_pattern: &str, today: NaiveDate) -> (String, String) {
    if let Ok(parsed) = NaiveDate::parse_from_str(date_key, "%Y-%m-%d") {
        let formatted = format_date_with_pattern(date_key, date_pattern);
        if parsed == today {
            ("Today".to_string(), formatted)
        } else if today.pred_opt() == Some(parsed) {
            ("Yesterday".to_string(), formatted)
        } else {
            (formatted, date_key.to_string())
        }
    } else {
        (date_key.to_string(), String::new())
    }
}

fn normalize_category_label(raw: &str) -> &str {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        "Ready to Assign"
    } else {
        trimmed
    }
}

fn is_ready_to_assign_label(label: &str) -> bool {
    let lower = label.trim().to_ascii_lowercase();
    lower.is_empty() || lower == "ready to assign" || lower == "to be budgeted"
}

/// Renders YNAB Ember's 34-day Recent Moves modal/drawer with `All` / `Assigned` / `Moved`
/// tabs, category dropdown filter + search, grouped date headers, and `From -> To` badges.
#[component]
pub fn RecentMovesModal(
    entries: Vec<RecentMoveEntryVm>,
    #[props(default)] initial_tab: RecentMoveTab,
    #[props(default)] initial_category_filter: Option<String>,
    onclose: EventHandler<MouseEvent>,
    #[props(default)] on_select_category: Option<EventHandler<String>>,
) -> Element {
    let store_opt = try_consume_context::<AppStore>();
    let (currency_cfg, date_pattern, hide_amounts) = match &store_opt {
        Some(store) => (
            store.currency_config(),
            store.plan_summary.read().date_format.clone(),
            *store.hide_amounts.read(),
        ),
        None => (
            CurrencyFormatConfig::default(),
            "MM/DD/YYYY".to_string(),
            false,
        ),
    };

    let mut active_tab = use_signal(|| initial_tab);
    let mut selected_category = use_signal(|| initial_category_filter.unwrap_or_default());
    let mut search_query = use_signal(String::new);

    let tab_val = *active_tab.read();
    let cat_filter = selected_category.read().clone();
    let query_lower = search_query.read().trim().to_ascii_lowercase();

    // Collect sorted distinct category names for the category filter dropdown
    let mut category_options: BTreeSet<String> = BTreeSet::new();
    for entry in &entries {
        let from_lbl = normalize_category_label(&entry.from_category_name);
        let to_lbl = normalize_category_label(&entry.to_category_name);
        if !from_lbl.is_empty() {
            category_options.insert(from_lbl.to_string());
        }
        if !to_lbl.is_empty() {
            category_options.insert(to_lbl.to_string());
        }
    }

    // Apply tab, dropdown, and text search filters
    let mut filtered: Vec<RecentMoveEntryVm> = entries
        .iter()
        .filter(|entry| match tab_val {
            RecentMoveTab::All => true,
            RecentMoveTab::Assigned => entry.is_assignment,
            RecentMoveTab::Moved => !entry.is_assignment,
        })
        .filter(|entry| {
            if cat_filter.is_empty() {
                true
            } else {
                let from_lbl = normalize_category_label(&entry.from_category_name);
                let to_lbl = normalize_category_label(&entry.to_category_name);
                from_lbl == cat_filter || to_lbl == cat_filter
            }
        })
        .filter(|entry| {
            if query_lower.is_empty() {
                true
            } else {
                let from_lbl =
                    normalize_category_label(&entry.from_category_name).to_ascii_lowercase();
                let to_lbl = normalize_category_label(&entry.to_category_name).to_ascii_lowercase();
                from_lbl.contains(&query_lower)
                    || to_lbl.contains(&query_lower)
                    || entry.moved_at.to_ascii_lowercase().contains(&query_lower)
            }
        })
        .cloned()
        .collect();

    // Sort newest timestamp first before grouping into descending day sections
    filtered.sort_by(|a, b| b.moved_at.cmp(&a.moved_at).then_with(|| b.id.cmp(&a.id)));

    let mut day_groups: BTreeMap<String, Vec<RecentMoveEntryVm>> = BTreeMap::new();
    for entry in filtered.iter().cloned() {
        let date_key = extract_iso_date(&entry.moved_at).to_string();
        day_groups.entry(date_key).or_default().push(entry);
    }

    let total_count = entries.len();
    let filtered_count = filtered.len();
    let has_active_filters =
        tab_val != RecentMoveTab::All || !cat_filter.is_empty() || !query_lower.is_empty();
    let today = Local::now().date_naive();

    let modal_body_cls = if total_count == 0 {
        "recent-moves-refreshed recent-moves-full-zero-state"
    } else {
        "recent-moves-refreshed"
    };

    rsx! {
        div {
            class: "modal-recent-moves refreshed",
            div {
                class: "modal-overlay active ynab-u modal-popup budget-popover-overlay",
                onclick: move |evt| onclose.call(evt),
                div {
                    class: "modal recent-moves-modal",
                    role: "dialog",
                    aria_modal: "true",
                    aria_label: "Recent Moves",
                    onclick: move |e| e.stop_propagation(),
                    div {
                        class: "modal-header modal-recent-moves-header",
                        h2 {
                            class: "modal-title recent-moves-modal-title",
                            "Recent Moves"
                        }
                        button {
                            class: "modal-fresh-close recent-moves-close-button",
                            r#type: "button",
                            aria_label: "Close Recent Moves",
                            onclick: move |evt| onclose.call(evt),
                            Icon { name: "close", width: 14, height: 14 }
                        }
                    }
                    div {
                        class: "modal-content",
                        div {
                            class: "{modal_body_cls}",

                            // Header with Ember segmented filter tabs (`All` / `Assigned` / `Moved`)
                            div {
                                class: "recent-moves-header",
                                div {
                                    class: "segmented-control textOnlyOption refreshed-recent-moves-filter-options",
                                    role: "tablist",
                                    aria_label: "Filter Recent Moves",
                                    button {
                                        class: if tab_val == RecentMoveTab::All {
                                            "segmented-control-button selected"
                                        } else {
                                            "segmented-control-button"
                                        },
                                        role: "tab",
                                        aria_selected: tab_val == RecentMoveTab::All,
                                        r#type: "button",
                                        onclick: move |_| active_tab.set(RecentMoveTab::All),
                                        "All"
                                    }
                                    button {
                                        class: if tab_val == RecentMoveTab::Assigned {
                                            "segmented-control-button selected"
                                        } else {
                                            "segmented-control-button"
                                        },
                                        role: "tab",
                                        aria_selected: tab_val == RecentMoveTab::Assigned,
                                        r#type: "button",
                                        onclick: move |_| active_tab.set(RecentMoveTab::Assigned),
                                        "Assigned"
                                    }
                                    button {
                                        class: if tab_val == RecentMoveTab::Moved {
                                            "segmented-control-button selected"
                                        } else {
                                            "segmented-control-button"
                                        },
                                        role: "tab",
                                        aria_selected: tab_val == RecentMoveTab::Moved,
                                        r#type: "button",
                                        onclick: move |_| active_tab.set(RecentMoveTab::Moved),
                                        "Moved"
                                    }
                                }
                                span {
                                    class: "recent-moves-window-label",
                                    "Last {RECENT_MOVES_WINDOW_DAYS} days"
                                }
                            }

                            // Category dropdown & search filter toolbar
                            if total_count > 0 {
                                div {
                                    class: "recent-moves-toolbar",
                                    div {
                                        class: "recent-moves-search-wrap",
                                        Icon {
                                            name: "search",
                                            width: 13,
                                            height: 13,
                                            class: "recent-moves-search-icon",
                                        }
                                        input {
                                            class: "user-data recent-moves-search-input",
                                            r#type: "text",
                                            placeholder: "Search categories...",
                                            aria_label: "Search recent moves",
                                            value: "{search_query}",
                                            oninput: move |e| search_query.set(e.value()),
                                        }
                                    }
                                    select {
                                        class: "recent-moves-category-select",
                                        aria_label: "Filter by category",
                                        value: "{cat_filter}",
                                        onchange: move |e| selected_category.set(e.value()),
                                        option { value: "", "All Categories" }
                                        for cat_opt in category_options.iter() {
                                            option {
                                                key: "{cat_opt}",
                                                value: "{cat_opt}",
                                                "{cat_opt}"
                                            }
                                        }
                                    }
                                    if has_active_filters {
                                        button {
                                            class: "button-link recent-moves-reset-button",
                                            r#type: "button",
                                            title: "Clear filters",
                                            onclick: move |_| {
                                                active_tab.set(RecentMoveTab::All);
                                                selected_category.set(String::new());
                                                search_query.set(String::new());
                                            },
                                            "Reset"
                                        }
                                    }
                                }
                            }

                            // Day sections or empty states
                            if total_count == 0 {
                                div {
                                    class: "recent-moves-zero-state",
                                    div {
                                        class: "recent-moves-filtered-zero-state",
                                        Icon {
                                            name: "clock_arrow_back",
                                            width: 32,
                                            height: 32,
                                            class: "recent-moves-zero-state-icon",
                                        }
                                        p {
                                            class: "recent-moves-filtered-zero-state-description",
                                            "No Recent Moves Yet"
                                        }
                                        p {
                                            class: "recent-moves-zero-state-description",
                                            "When you assign money or move funds between categories, your activity from the last {RECENT_MOVES_WINDOW_DAYS} days will appear here."
                                        }
                                    }
                                }
                            } else if filtered.is_empty() {
                                div {
                                    class: "recent-moves-zero-state",
                                    div {
                                        class: "recent-moves-filtered-zero-state",
                                        p {
                                            class: "recent-moves-filtered-zero-state-description",
                                            "No Matching Moves"
                                        }
                                        p {
                                            class: "recent-moves-filtered-zero-state-subtitle",
                                            "Try switching tabs or clearing your category search filter."
                                        }
                                        YnabButton {
                                            variant: "secondary",
                                            onclick: move |_| {
                                                active_tab.set(RecentMoveTab::All);
                                                selected_category.set(String::new());
                                                search_query.set(String::new());
                                            },
                                            "Show All Moves"
                                        }
                                    }
                                }
                            } else {
                                div {
                                    id: "js-recent-moves-day-sections",
                                    class: "recent-moves-day-sections",
                                    for (date_key, day_entries) in day_groups.iter().rev() {
                                        {
                                            let (heading_main, heading_sub) = format_day_heading(date_key, &date_pattern, today);
                                            let move_word = if day_entries.len() == 1 { "move" } else { "moves" };
                                            rsx! {
                                                div {
                                                    key: "{date_key}",
                                                    class: "recent-moves-day-section recent-moves-day-section-refreshed",
                                                    div {
                                                        class: "recent-moves-date-wrapper",
                                                        span {
                                                            class: "recent-moves-date",
                                                            "{heading_main}"
                                                        }
                                                        span {
                                                            class: "recent-moves-date-label",
                                                            if heading_sub.is_empty() {
                                                                "{day_entries.len()} {move_word}"
                                                            } else {
                                                                "{heading_sub} · {day_entries.len()} {move_word}"
                                                            }
                                                        }
                                                    }

                                                    for entry in day_entries.iter() {
                                                        {
                                                            let entry_id = entry.id.clone();
                                                            let is_assign = entry.is_assignment;
                                                            let is_negative_assign = is_assign && entry.amount_milliunits < 0;
                                                            let icon_name = if !is_assign {
                                                                "arrows_horizontal"
                                                            } else if is_negative_assign {
                                                                "subtract_circle_fill"
                                                            } else {
                                                                "plus_circle_fill"
                                                            };
                                                            let formatted_amount = format_milliunits_with_config(
                                                                entry.amount_milliunits.abs(),
                                                                &currency_cfg,
                                                                false,
                                                                hide_amounts,
                                                            );
                                                            let type_badge_text = if is_assign { "Assigned" } else { "Moved" };
                                                            let type_badge_cls = if is_assign {
                                                                "type-footnote recent-moves-type-badge is-assigned"
                                                            } else {
                                                                "type-footnote recent-moves-type-badge is-moved"
                                                            };
                                                            let from_lbl = normalize_category_label(&entry.from_category_name).to_string();
                                                            let to_lbl = normalize_category_label(&entry.to_category_name).to_string();
                                                            let from_is_rta = is_ready_to_assign_label(&from_lbl);
                                                            let to_is_rta = is_ready_to_assign_label(&to_lbl);
                                                            let month_badge = extract_month_short(&entry.moved_at);
                                                            let time_badge = extract_time_hhmm(&entry.moved_at).map(str::to_string);

                                                            let from_click = from_lbl.clone();
                                                            let to_click = to_lbl.clone();
                                                            let cb_from = on_select_category;
                                                            let cb_to = on_select_category;

                                                            rsx! {
                                                                div {
                                                                    key: "{entry_id}",
                                                                    class: "refreshed-recent-moves-row-wrapper",
                                                                    div {
                                                                        class: "recent-moves-row-icon",
                                                                        Icon { name: "{icon_name}", width: 16, height: 16 }
                                                                    }
                                                                    div {
                                                                        class: "recent-moves-row-content",
                                                                        div {
                                                                            class: "recent-moves-row-header",
                                                                            strong {
                                                                                class: "user-data currency tabular-nums",
                                                                                if is_negative_assign {
                                                                                    "-{formatted_amount}"
                                                                                } else {
                                                                                    "{formatted_amount}"
                                                                                }
                                                                            }
                                                                            span {
                                                                                class: "{type_badge_cls}",
                                                                                "{type_badge_text}"
                                                                            }
                                                                            if let Some(ref hhmm) = time_badge {
                                                                                span {
                                                                                    class: "recent-moves-assign-method recent-moves-time-badge",
                                                                                    "{hhmm}"
                                                                                }
                                                                            }
                                                                        }
                                                                        div {
                                                                            class: "recent-moves-row-path",
                                                                            span {
                                                                                class: "money-movement-direction-label",
                                                                                "From"
                                                                            }
                                                                            if from_is_rta {
                                                                                span {
                                                                                    class: "recent-moves-category-button is-static",
                                                                                    span {
                                                                                        class: "category-label-name",
                                                                                        "{from_lbl}"
                                                                                    }
                                                                                }
                                                                            } else {
                                                                                button {
                                                                                    class: "recent-moves-category-button",
                                                                                    r#type: "button",
                                                                                    title: "Filter or focus {from_lbl}",
                                                                                    onclick: move |_| {
                                                                                        if let Some(cb) = &cb_from {
                                                                                            cb.call(from_click.clone());
                                                                                        } else {
                                                                                            selected_category.set(from_click.clone());
                                                                                        }
                                                                                    },
                                                                                    span {
                                                                                        class: "category-label-name",
                                                                                        "{from_lbl}"
                                                                                    }
                                                                                    if let Some(m_lbl) = month_badge {
                                                                                        span {
                                                                                            class: "category-label-month",
                                                                                            "{m_lbl}"
                                                                                        }
                                                                                    }
                                                                                }
                                                                            }
                                                                            span {
                                                                                class: "money-movement-direction-label",
                                                                                "\u{2192} To"
                                                                            }
                                                                            if to_is_rta {
                                                                                span {
                                                                                    class: "recent-moves-category-button is-static",
                                                                                    span {
                                                                                        class: "category-label-name",
                                                                                        "{to_lbl}"
                                                                                    }
                                                                                }
                                                                            } else {
                                                                                button {
                                                                                    class: "recent-moves-category-button",
                                                                                    r#type: "button",
                                                                                    title: "Filter or focus {to_lbl}",
                                                                                    onclick: move |_| {
                                                                                        if let Some(cb) = &cb_to {
                                                                                            cb.call(to_click.clone());
                                                                                        } else {
                                                                                            selected_category.set(to_click.clone());
                                                                                        }
                                                                                    },
                                                                                    span {
                                                                                        class: "category-label-name",
                                                                                        "{to_lbl}"
                                                                                    }
                                                                                    if let Some(m_lbl) = month_badge {
                                                                                        span {
                                                                                            class: "category-label-month",
                                                                                            "{m_lbl}"
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
                            }
                        }
                    }
                    div {
                        class: "modal-actions modal-recent-moves-footer",
                        span {
                            class: "recent-moves-footer-count",
                            "Showing last {RECENT_MOVES_WINDOW_DAYS} days ({filtered_count} of {total_count})"
                        }
                        YnabButton {
                            variant: "primary",
                            onclick: move |evt| onclose.call(evt),
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
}
