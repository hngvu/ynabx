//! Pure Integer Milliunit Currency & Date Formatting and CSV/TSV Exporter (`#![deny(clippy::float_arithmetic)]`).
//! Zero floating-point division (`/ 1000.0` is strictly forbidden).

#![deny(clippy::float_arithmetic)]

use serde::{Deserialize, Serialize};

pub const CURRENCIES_EXACT_JSON: &str = include_str!("../../assets/currencies_exact.json");
pub const LOCALES_EXACT_JSON: &str = include_str!("../../assets/locales_exact.json");

pub const DATE_FORMAT_PATTERNS: [&str; 7] = [
    "YYYY/MM/DD",
    "YYYY-MM-DD",
    "DD-MM-YYYY",
    "DD/MM/YYYY",
    "DD.MM.YYYY",
    "MM/DD/YYYY",
    "YYYY.MM.DD",
];

pub const NUMBER_FORMATS: [(&str, u8); 12] = [
    ("123,456.78", 2),
    ("123.456,78", 2),
    ("123,456.789", 3),
    ("123 456.78", 2),
    ("123'456.78", 2),
    ("123.456", 0),
    ("123,456", 0),
    ("123 456-78", 2),
    ("123 456,78", 2),
    ("123,456/78", 2),
    ("123 456", 0),
    ("1,23,456.78", 2),
];

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CurrencyFormatConfig {
    #[serde(default = "default_iso_code")]
    pub iso_code: String,
    #[serde(default = "default_example_format")]
    pub example_format: String,
    #[serde(default = "default_decimal_digits")]
    pub decimal_digits: u8,
    #[serde(default = "default_decimal_separator")]
    pub decimal_separator: String,
    #[serde(default = "default_symbol_first")]
    pub symbol_first: bool,
    #[serde(default = "default_group_separator")]
    pub group_separator: String,
    #[serde(default = "default_currency_symbol")]
    pub currency_symbol: String,
    #[serde(default = "default_display_symbol")]
    pub display_symbol: bool,
}

fn default_iso_code() -> String {
    "USD".to_string()
}
fn default_example_format() -> String {
    "1,234.56".to_string()
}
fn default_decimal_digits() -> u8 {
    2
}
fn default_decimal_separator() -> String {
    ".".to_string()
}
fn default_symbol_first() -> bool {
    true
}
fn default_group_separator() -> String {
    ",".to_string()
}
fn default_currency_symbol() -> String {
    "$".to_string()
}
fn default_display_symbol() -> bool {
    true
}

impl Default for CurrencyFormatConfig {
    fn default() -> Self {
        Self {
            iso_code: default_iso_code(),
            example_format: default_example_format(),
            decimal_digits: default_decimal_digits(),
            decimal_separator: default_decimal_separator(),
            symbol_first: default_symbol_first(),
            group_separator: default_group_separator(),
            currency_symbol: default_currency_symbol(),
            display_symbol: default_display_symbol(),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DateFormatConfig {
    #[serde(default = "default_date_format")]
    pub format: String,
}

fn default_date_format() -> String {
    "YYYY-MM-DD".to_string()
}

impl Default for DateFormatConfig {
    fn default() -> Self {
        Self {
            format: default_date_format(),
        }
    }
}

/// Format integer digits with thousands group separator
fn group_integer_str(num: u64, group_sep: &str) -> String {
    let raw = num.to_string();
    if group_sep.is_empty() || raw.len() <= 3 {
        return raw;
    }
    let mut out = String::with_capacity(raw.len() + raw.len() / 3);
    for (idx, ch) in raw.chars().enumerate() {
        if idx > 0 && (raw.len() - idx).is_multiple_of(3) {
            out.push_str(group_sep);
        }
        out.push(ch);
    }
    out
}

/// Formats `milliunits` into a localized currency string using 100% integer arithmetic.
/// `1000` milliunits = `1.00`. Half-up rounding is applied when `decimal_digits < 3`.
pub fn format_milliunits_with_config(
    milliunits: i64,
    config: &CurrencyFormatConfig,
    show_plus_sign: bool,
    hide_amounts: bool,
) -> String {
    if hide_amounts {
        return "••••••".to_string();
    }

    let is_neg = milliunits < 0;
    let abs_milli = milliunits.unsigned_abs();

    let (whole, frac_str) = match config.decimal_digits {
        0 => {
            let rounded = (abs_milli + 500) / 1000;
            (rounded, String::new())
        }
        1 => {
            let tenths = (abs_milli + 50) / 100;
            (tenths / 10, format!("{:01}", tenths % 10))
        }
        3 => (abs_milli / 1000, format!("{:03}", abs_milli % 1000)),
        _ => {
            // Default 2 decimal digits: half-up rounding from milliunits to cents
            let cents = (abs_milli + 5) / 10;
            (cents / 100, format!("{:02}", cents % 100))
        }
    };

    let grouped_whole = group_integer_str(whole, &config.group_separator);
    let number_part = if frac_str.is_empty() {
        grouped_whole
    } else {
        format!("{}{}{}", grouped_whole, config.decimal_separator, frac_str)
    };

    let sign_prefix = if is_neg {
        "-"
    } else if show_plus_sign && milliunits > 0 {
        "+"
    } else {
        ""
    };

    if !config.display_symbol || config.currency_symbol.is_empty() {
        format!("{}{}", sign_prefix, number_part)
    } else if config.symbol_first {
        format!("{}{}{}", sign_prefix, config.currency_symbol, number_part)
    } else {
        format!("{}{} {}", sign_prefix, number_part, config.currency_symbol)
    }
}

/// Standard USD formatter (`$1,234.56` or `-$1,234.56`)
pub fn format_usd_milliunits(milliunits: i64, show_plus_sign: bool) -> String {
    let cfg = CurrencyFormatConfig::default();
    format_milliunits_with_config(milliunits, &cfg, show_plus_sign, false)
}

/// Plain decimal string without currency symbol or thousands separator (`"1500.00"`, `"-450.00"`) for CSV export and inputs.
pub fn format_plain_decimal_milliunits(milliunits: i64) -> String {
    let is_neg = milliunits < 0;
    let abs_milli = milliunits.unsigned_abs();
    let cents = (abs_milli + 5) / 10;
    let whole = cents / 100;
    let rem = cents % 100;
    if is_neg {
        format!("-{}.{:02}", whole, rem)
    } else {
        format!("{}.{:02}", whole, rem)
    }
}

/// Format an ISO date `"YYYY-MM-DD"` according to the user's configured date format
pub fn format_date_with_pattern(iso_date: &str, pattern: &str) -> String {
    let parts: Vec<&str> = iso_date.split('-').collect();
    if parts.len() < 3 {
        return iso_date.to_string();
    }
    let y = parts[0];
    let m = parts[1];
    let d = parts[2].split('T').next().unwrap_or(parts[2]);

    match pattern {
        "MM/DD/YYYY" => format!("{}/{}/{}", m, d, y),
        "DD/MM/YYYY" => format!("{}/{}/{}", d, m, y),
        "DD.MM.YYYY" => format!("{}.{}.{}", d, m, y),
        "DD-MM-YYYY" => format!("{}-{}-{}", d, m, y),
        "YYYY/MM/DD" => format!("{}/{}/{}", y, m, d),
        "YYYY.MM.DD" => format!("{}.{}.{}", y, m, d),
        _ => format!("{}-{}-{}", y, m, d),
    }
}

/// Escape a single CSV cell per RFC 4180 (wrapping in double quotes and doubling internal quotes)
pub fn escape_csv_cell(val: &str) -> String {
    format!("\"{}\"", val.replace('"', "\"\""))
}

#[derive(Debug, Clone)]
pub struct ExportBudgetCategoryRow {
    pub group_name: String,
    pub category_name: String,
    pub assigned_milliunits: i64,
    pub activity_milliunits: i64,
    pub available_milliunits: i64,
}

/// Generates CSV rows matching `ExportPlanModal.generateBudgetPlanCsvRows`
pub fn generate_budget_plan_csv_rows(rows: &[ExportBudgetCategoryRow]) -> Vec<Vec<String>> {
    let mut out = Vec::with_capacity(rows.len() + 1);
    out.push(vec![
        "Category Group".to_string(),
        "Category".to_string(),
        "Budgeted".to_string(),
        "Activity".to_string(),
        "Available".to_string(),
    ]);
    for r in rows {
        out.push(vec![
            r.group_name.clone(),
            r.category_name.clone(),
            format_plain_decimal_milliunits(r.assigned_milliunits),
            format_plain_decimal_milliunits(r.activity_milliunits),
            format_plain_decimal_milliunits(r.available_milliunits),
        ]);
    }
    out
}

pub fn serialize_csv_rows(rows: &[Vec<String>]) -> String {
    rows.iter()
        .map(|row| {
            row.iter()
                .map(|cell| escape_csv_cell(cell))
                .collect::<Vec<_>>()
                .join(",")
        })
        .collect::<Vec<_>>()
        .join("\r\n")
}

pub fn export_to_csv_string(rows: &[Vec<String>]) -> String {
    serialize_csv_rows(rows)
}

#[derive(Debug, Clone)]
pub struct ExportRegisterRow {
    pub date: String,
    pub account_name: String,
    pub payee_name: String,
    pub category_name: String,
    pub memo: String,
    pub amount_milliunits: i64,
}

/// Generates Register CSV string matching `exportTransactionsToCsv` in `AccountsWorkspace.tsx`
pub fn export_transactions_to_csv(transactions: &[ExportRegisterRow]) -> String {
    let mut lines = Vec::with_capacity(transactions.len() + 1);
    lines.push("Date,Account,Payee,Category,Memo,Amount".to_string());
    for tx in transactions {
        let row = [
            escape_csv_cell(&tx.date),
            escape_csv_cell(&tx.account_name),
            escape_csv_cell(&tx.payee_name),
            escape_csv_cell(&tx.category_name),
            escape_csv_cell(&tx.memo),
            escape_csv_cell(&tx.amount_milliunits.to_string()),
        ];
        lines.push(row.join(","));
    }
    lines.join("\n")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_format_usd_milliunits() {
        assert_eq!(format_usd_milliunits(0, false), "$0.00");
        assert_eq!(format_usd_milliunits(1234560, false), "$1,234.56");
        assert_eq!(format_usd_milliunits(-54000, false), "-$54.00");
        assert_eq!(format_usd_milliunits(45000, true), "+$45.00");
    }

    #[test]
    fn test_csv_export_escaping_and_formatting() {
        let sample = vec![
            ExportRegisterRow {
                date: "2026-11-16".to_string(),
                account_name: "Checking".to_string(),
                payee_name: "Trader Joe's, Inc.".to_string(),
                category_name: "Groceries, Household".to_string(),
                memo: "Dinner \"party\" supplies, snacks".to_string(),
                amount_milliunits: -54000,
            },
            ExportRegisterRow {
                date: "2026-11-17".to_string(),
                account_name: "Savings".to_string(),
                payee_name: "Bank Interest".to_string(),
                category_name: "Income".to_string(),
                memo: "Monthly interest".to_string(),
                amount_milliunits: 2500,
            },
        ];

        let csv = export_transactions_to_csv(&sample);
        let lines: Vec<&str> = csv.split('\n').collect();
        assert_eq!(lines[0], "Date,Account,Payee,Category,Memo,Amount");
        assert_eq!(
            lines[1],
            "\"2026-11-16\",\"Checking\",\"Trader Joe's, Inc.\",\"Groceries, Household\",\"Dinner \"\"party\"\" supplies, snacks\",\"-54000\""
        );
        assert_eq!(
            lines[2],
            "\"2026-11-17\",\"Savings\",\"Bank Interest\",\"Income\",\"Monthly interest\",\"2500\""
        );
    }

    #[test]
    fn test_generate_budget_plan_csv_rows() {
        let rows = vec![
            ExportBudgetCategoryRow {
                group_name: "Immediate Obligations".to_string(),
                category_name: "Rent/Mortgage".to_string(),
                assigned_milliunits: 1_500_000,
                activity_milliunits: -1_500_000,
                available_milliunits: 0,
            },
            ExportBudgetCategoryRow {
                group_name: "Immediate Obligations".to_string(),
                category_name: "Groceries".to_string(),
                assigned_milliunits: 600_000,
                activity_milliunits: -450_000,
                available_milliunits: 150_000,
            },
        ];

        let csv_rows = generate_budget_plan_csv_rows(&rows);
        assert_eq!(csv_rows.len(), 3);
        assert_eq!(
            csv_rows[0],
            vec![
                "Category Group",
                "Category",
                "Budgeted",
                "Activity",
                "Available"
            ]
        );
        assert_eq!(
            csv_rows[1],
            vec![
                "Immediate Obligations",
                "Rent/Mortgage",
                "1500.00",
                "-1500.00",
                "0.00"
            ]
        );
        assert_eq!(
            csv_rows[2],
            vec![
                "Immediate Obligations",
                "Groceries",
                "600.00",
                "-450.00",
                "150.00"
            ]
        );
    }
}
