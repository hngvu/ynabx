//! Category Target Status & Progress Bar Calculator (100% integer math — zero floating point)
//! Exact port of `categoryTargetStatus.ts` (`wrapper-DkFKwf1z.js` class `yf` & `components/budget-bar-v2`).

#![deny(clippy::float_arithmetic)]

use serde::{Deserialize, Serialize};

use crate::calc::goals_calc::months_between;
use crate::format::format_usd_milliunits;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum TargetType {
    NEED,
    MF,
    TB,
    TBD,
    DEBT,
}

impl TargetType {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::NEED => "NEED",
            Self::MF => "MF",
            Self::TB => "TB",
            Self::TBD => "TBD",
            Self::DEBT => "DEBT",
        }
    }

    pub fn from_str_opt(s: Option<&str>) -> Option<Self> {
        match s {
            Some("NEED") => Some(Self::NEED),
            Some("MF") => Some(Self::MF),
            Some("TB") => Some(Self::TB),
            Some("TBD") => Some(Self::TBD),
            Some("DEBT") => Some(Self::DEBT),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum TargetCadence {
    Monthly,
    Weekly,
    Yearly,
    Custom,
}

impl TargetCadence {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Monthly => "monthly",
            Self::Weekly => "weekly",
            Self::Yearly => "yearly",
            Self::Custom => "custom",
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CategoryTarget {
    pub target_amount: i64, // milliunits
    pub target_type: Option<TargetType>,
    pub cadence: Option<TargetCadence>,
    pub day_of_month: Option<i32>,   // 1-31 (or 0 for end of month)
    pub day_of_week: Option<i32>,    // 0 (Sun) - 6 (Sat)
    pub target_date: Option<String>, // YYYY-MM-DD
    pub repeat_interval: Option<i32>,
    pub repeat_unit: Option<String>, // "months" | "years"
    pub needs_whole_amount: Option<bool>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct BudgetBarSegment {
    pub class_names: String,
    pub style: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct BudgetBarSection {
    pub class_names: String,
    pub style: String,
    pub segments: Vec<BudgetBarSegment>,
    pub is_over_target_spending_amount_section: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TargetStatusResult {
    pub has_target: bool,
    pub topline_text: String,
    pub topline_highlighted: bool,
    pub topline_suffix: String,
    pub details_text: String,
    pub bar_sections: Vec<BudgetBarSection>,
    pub overall_percent: i32, // 0..=100
    pub is_fully_funded: bool,
    pub pill_class: &'static str,
}

pub fn format_currency(milliunits: i64, hide_amounts: bool) -> String {
    if hide_amounts {
        return "••••••".to_string();
    }
    format_usd_milliunits(milliunits.abs(), false)
}

fn format_tenths_percent(ratio_tenths: i64) -> String {
    let clamped = ratio_tenths.clamp(0, 1000);
    format!("width: {}.{}%;", clamped / 10, clamped % 10)
}

/// Exact integer port of `calculateCategoryTargetStatus`
pub fn calculate_category_target_status(
    assigned: i64,
    activity: i64,
    available: i64,
    target: Option<&CategoryTarget>,
    is_debt_payment_category: bool,
    current_month_ym: Option<&str>,
    from_previous_month: i64,
) -> TargetStatusResult {
    if target.is_none() && !is_debt_payment_category {
        let default_pill = if available > 0 {
            "positive"
        } else if available < 0 {
            "negative"
        } else {
            "zero"
        };
        return TargetStatusResult {
            has_target: false,
            topline_text: String::new(),
            topline_highlighted: false,
            topline_suffix: String::new(),
            details_text: String::new(),
            bar_sections: Vec::new(),
            overall_percent: 0,
            is_fully_funded: false,
            pill_class: default_pill,
        };
    }

    if is_debt_payment_category && target.is_none() {
        let cc_pill = if available > 0 {
            "positive"
        } else if available < 0 {
            "cautious credit"
        } else {
            "zero"
        };
        return TargetStatusResult {
            has_target: false,
            topline_text: String::new(),
            topline_highlighted: false,
            topline_suffix: String::new(),
            details_text: String::new(),
            bar_sections: vec![BudgetBarSection {
                class_names: "ynab-new-budget-bar-v2-section-funded".to_string(),
                style: "flex-basis: 100%;".to_string(),
                segments: vec![BudgetBarSegment {
                    class_names: "is-fully-funded".to_string(),
                    style: "width: 100%;".to_string(),
                }],
                is_over_target_spending_amount_section: false,
            }],
            overall_percent: 100,
            is_fully_funded: true,
            pill_class: cc_pill,
        };
    }

    let tgt = target.unwrap();
    let spending = (-activity.min(0)).max(0);
    let target_amount = tgt.target_amount.max(0);
    let is_overspent = available < 0;

    if is_overspent {
        let formatted_spent = format_currency(spending, false);
        let formatted_target = format_currency(target_amount, false);
        let details = if target_amount > 0 {
            format!(". {} of {}", formatted_spent, formatted_target)
        } else {
            String::new()
        };
        return TargetStatusResult {
            has_target: true,
            topline_text: "Overspent".to_string(),
            topline_highlighted: true,
            topline_suffix: String::new(),
            details_text: details,
            bar_sections: vec![BudgetBarSection {
                class_names: "ynab-new-budget-bar-v2-section-funded".to_string(),
                style: "flex-basis: 100%;".to_string(),
                segments: vec![BudgetBarSegment {
                    class_names: "is-overspent".to_string(),
                    style: "width: 100%;".to_string(),
                }],
                is_over_target_spending_amount_section: false,
            }],
            overall_percent: 100,
            is_fully_funded: false,
            pill_class: "negative",
        };
    }

    let needed = match tgt.target_type {
        Some(TargetType::TBD) => {
            if let (Some(t_date), Some(cur_ym)) = (tgt.target_date.as_deref(), current_month_ym) {
                let months_left = (months_between(cur_ym, t_date) + 1).max(1) as i64;
                let remaining_to_target = (target_amount - from_previous_month).max(0);
                let monthly_needed = (remaining_to_target + months_left - 1) / months_left;
                (monthly_needed - assigned).max(0)
            } else {
                (target_amount - assigned).max(0)
            }
        }
        Some(TargetType::TB) => (target_amount - available).max(0),
        _ => (target_amount - assigned).max(0),
    };

    let is_fully_funded = needed <= 0;

    // Tenths of a percent (0..=1000)
    let percent_funded_tenths = if target_amount > 0 {
        ((assigned.max(0) * 1000 + target_amount / 2) / target_amount).clamp(0, 1000)
    } else {
        1000
    };

    let spent_tenths = if target_amount > 0 {
        let raw_spent = (spending * 1000 + target_amount / 2) / target_amount;
        raw_spent.min(percent_funded_tenths).max(0)
    } else {
        0
    };

    let funded_available_tenths = (percent_funded_tenths - spent_tenths).max(0);

    let mut segments = Vec::new();
    if spent_tenths > 0 {
        segments.push(BudgetBarSegment {
            class_names: if is_fully_funded {
                "is-fully-funded-spending".to_string()
            } else {
                "is-partially-funded-spending".to_string()
            },
            style: format_tenths_percent(spent_tenths),
        });
    }
    if funded_available_tenths > 0 {
        segments.push(BudgetBarSegment {
            class_names: if is_fully_funded {
                "is-fully-funded".to_string()
            } else {
                "is-partially-funded".to_string()
            },
            style: format_tenths_percent(funded_available_tenths),
        });
    }

    let formatted_spending = format_currency(spending, false);
    let formatted_target = format_currency(target_amount, false);
    let formatted_needed = format_currency(needed, false);

    let (topline_text, topline_suffix, details_text) = if is_fully_funded {
        if spending >= target_amount && available == 0 {
            ("Fully Spent".to_string(), String::new(), String::new())
        } else if spending > 0 {
            (
                "Funded".to_string(),
                String::new(),
                format!(". Spent {} of {}", formatted_spending, formatted_target),
            )
        } else {
            ("Funded".to_string(), String::new(), String::new())
        }
    } else {
        let suffix = if assigned > 0 {
            "more needed".to_string()
        } else {
            "needed".to_string()
        };
        let details = if let Some(dom) = tgt.day_of_month.filter(|&d| d > 0) {
            format!(" by the {}th", dom)
        } else {
            " this month".to_string()
        };
        (formatted_needed, suffix, details)
    };

    let pill_class = if available > 0 {
        if needed > 0 && !is_debt_payment_category {
            "cautious goal"
        } else {
            "positive"
        }
    } else if available < 0 {
        if is_debt_payment_category {
            "cautious credit"
        } else {
            "negative"
        }
    } else {
        "zero"
    };

    TargetStatusResult {
        has_target: true,
        topline_text,
        topline_highlighted: true,
        topline_suffix,
        details_text,
        bar_sections: vec![BudgetBarSection {
            class_names: "ynab-new-budget-bar-v2-section-funded".to_string(),
            style: "flex-basis: 100%;".to_string(),
            segments,
            is_over_target_spending_amount_section: false,
        }],
        overall_percent: ((percent_funded_tenths + 5) / 10) as i32,
        is_fully_funded,
        pill_class,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_format_currency_masking_and_standard() {
        assert_eq!(format_currency(1234567, true), "••••••");
        assert_eq!(format_currency(0, true), "••••••");
        assert_eq!(format_currency(-50000, true), "••••••");

        assert_eq!(format_currency(1234567, false), "$1,234.57");
        assert_eq!(format_currency(0, false), "$0.00");
        assert_eq!(format_currency(-50000, false), "$50.00");
    }

    #[test]
    fn test_target_status_underfunded_and_funded() {
        let target = CategoryTarget {
            target_amount: 200_000,
            target_type: Some(TargetType::NEED),
            cadence: Some(TargetCadence::Monthly),
            day_of_month: None,
            day_of_week: None,
            target_date: None,
            repeat_interval: None,
            repeat_unit: None,
            needs_whole_amount: Some(false),
        };

        let status = calculate_category_target_status(
            50_000,
            -20_000,
            30_000,
            Some(&target),
            false,
            Some("2026-11"),
            0,
        );
        assert!(status.has_target);
        assert!(!status.is_fully_funded);
        assert_eq!(status.topline_text, "$150.00");
        assert_eq!(status.topline_suffix, "more needed");
        assert_eq!(status.pill_class, "cautious goal");

        let funded = calculate_category_target_status(
            200_000,
            -50_000,
            150_000,
            Some(&target),
            false,
            Some("2026-11"),
            0,
        );
        assert!(funded.is_fully_funded);
        assert_eq!(funded.topline_text, "Funded");
        assert_eq!(funded.pill_class, "positive");
    }
}
