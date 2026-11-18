//! Bank File Import (OFX/QFX, QIF, CSV/TSV), Payee Rename Rules, and 2-Way Heuristic Matching
//! matching YNAB SLIK/Ember (`wrapper.renamed.js:10954–11315`, `23711–23900`, `24390–24430`, `40818–40908`).
//!
//! 100% Pure Integer Milliunits (`#![deny(clippy::float_arithmetic)]`).

#![deny(clippy::float_arithmetic)]

use chrono::{Datelike, Local, NaiveDate};
use rusqlite::{params, Connection, OptionalExtension, Result as SqlResult};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use uuid::Uuid;

use crate::changeset::ChangeSetRecorder;
use crate::ledger::transfers::{determine_cash_credit_amounts, update_account_balances};
use crate::seed::CAT_IMMEDIATE_INCOME;

/// Maximum calendar days apart for two transactions to be considered match candidates (YNAB `MATCH_MAX_DAYS_APART`).
pub const MATCH_MAX_DAYS_APART: i64 = 10;

/// Supported bank import file formats.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ImportFileFormat {
    Ofx,
    Qfx,
    Qif,
    Csv,
    Tsv,
}

impl ImportFileFormat {
    /// Detects the file format from an optional filename extension and/or file contents.
    pub fn detect(filename: Option<&str>, content: &str) -> Self {
        if let Some(name) = filename {
            let lower = name.trim().to_ascii_lowercase();
            if lower.ends_with(".ofx") {
                return Self::Ofx;
            }
            if lower.ends_with(".qfx") {
                return Self::Qfx;
            }
            if lower.ends_with(".qif") {
                return Self::Qif;
            }
            if lower.ends_with(".tsv") {
                return Self::Tsv;
            }
            if lower.ends_with(".csv") {
                return Self::Csv;
            }
        }

        let trimmed = content.trim_start_matches('\u{FEFF}').trim_start();
        let upper_head: String = trimmed
            .chars()
            .take(512)
            .collect::<String>()
            .to_ascii_uppercase();
        if upper_head.contains("OFXHEADER:")
            || upper_head.contains("<OFX>")
            || upper_head.contains("<OFX ")
            || upper_head.contains("<STMTTRN>")
        {
            return Self::Ofx;
        }
        if upper_head.starts_with("!TYPE:") || upper_head.starts_with("!ACCOUNT") {
            return Self::Qif;
        }
        if let Some(first_line) = trimmed.lines().next() {
            if first_line.contains('\t') && !first_line.contains(',') && !first_line.contains(';') {
                return Self::Tsv;
            }
        }
        Self::Csv
    }
}

/// Hint for resolving ambiguous numeric dates like `03/04/2026`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
pub enum DateOrderHint {
    #[default]
    Auto,
    MonthFirst,
    DayFirst,
    YearFirst,
}

/// Payee auto-rename matching operator matching YNAB `Ls` (`wrapper.renamed.js:23466`).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum RenameOperator {
    Is,
    Contains,
    StartsWith,
    EndsWith,
}

impl RenameOperator {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Is => "Is",
            Self::Contains => "Contains",
            Self::StartsWith => "StartsWith",
            Self::EndsWith => "EndsWith",
        }
    }

    pub fn from_str_loose(raw: &str) -> Self {
        match raw.trim().to_ascii_lowercase().as_str() {
            "is" | "exact" => Self::Is,
            "contains" => Self::Contains,
            "startswith" | "starts_with" => Self::StartsWith,
            "endswith" | "ends_with" => Self::EndsWith,
            _ => Self::Contains,
        }
    }
}

/// A persisted row from `be_payee_rename_conditions`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PayeeRenameCondition {
    pub id: String,
    pub budget_id: String,
    pub payee_id: String,
    pub operator: RenameOperator,
    pub operand: String,
}

/// Single parsed transaction record prior to enrichment or database commit.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ParsedImportTransaction {
    pub row_index: usize,
    pub date: String,
    pub raw_date: String,
    pub amount_milliunits: i64,
    pub payee_name: String,
    pub memo: Option<String>,
    pub check_number: Option<String>,
    pub category_name: Option<String>,
    pub cleared: String,
    pub fit_id: Option<String>,
    pub import_id: String,
    pub account_hint: Option<String>,
}

/// Result of parsing a bank file (OFX, QFX, QIF, CSV, or TSV).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ParsedImportFile {
    pub format: ImportFileFormat,
    pub detected_delimiter: Option<char>,
    pub account_id_hint: Option<String>,
    pub account_type_hint: Option<String>,
    pub transactions: Vec<ParsedImportTransaction>,
    pub warnings: Vec<String>,
}

/// Options controlling import parsing, column sign handling, and heuristic matching.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ImportOptions {
    pub swap_inflow_outflow: bool,
    pub swap_memo_with_payee: bool,
    pub import_memos: bool,
    pub auto_match: bool,
    pub date_order: DateOrderHint,
    pub format_override: Option<ImportFileFormat>,
}

impl Default for ImportOptions {
    fn default() -> Self {
        Self {
            swap_inflow_outflow: false,
            swap_memo_with_payee: false,
            import_memos: true,
            auto_match: true,
            date_order: DateOrderHint::Auto,
            format_override: None,
        }
    }
}

/// Classification of an import preview row against existing ledger transactions.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ImportRowStatus {
    New,
    AutoMatched,
    Duplicate,
}

/// Enriched preview row returned by `preview_import` for UI review before committing.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ImportPreviewRow {
    pub row_index: usize,
    pub date: String,
    pub amount_milliunits: i64,
    pub imported_payee: String,
    pub resolved_payee_id: Option<String>,
    pub resolved_payee_name: String,
    pub resolved_category_id: Option<String>,
    pub resolved_category_name: Option<String>,
    pub memo: Option<String>,
    pub check_number: Option<String>,
    pub import_id: String,
    pub status: ImportRowStatus,
    pub matched_transaction_id: Option<String>,
    pub matched_transaction_date: Option<String>,
    pub matched_transaction_payee: Option<String>,
}

/// Complete preview summary returned by `preview_import`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ImportPreviewResult {
    pub format: ImportFileFormat,
    pub account_id: String,
    pub total_parsed: usize,
    pub new_count: usize,
    pub matched_count: usize,
    pub duplicate_count: usize,
    pub rows: Vec<ImportPreviewRow>,
    pub warnings: Vec<String>,
}

/// Commit summary returned by `commit_import`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ImportCommitResult {
    pub account_id: String,
    pub imported_count: usize,
    pub matched_count: usize,
    pub skipped_duplicate_count: usize,
    pub created_payee_count: usize,
    pub imported_transaction_ids: Vec<String>,
    pub matched_transaction_ids: Vec<String>,
}

// -----------------------------------------------------------------------------
// Pure Integer Money & Date Parsing
// -----------------------------------------------------------------------------

/// Parses a monetary string into exact `i64` milliunits using integer-only math.
///
/// Supports `$1,234.56`, `-54.32`, `(54.32)`, `54.32-`, `1.234,56`, `12,50`,
/// Swiss `1'234.56`, 3-decimal currencies (`12.345`), and half-up rounding from 4+ decimals.
pub fn parse_money_milliunits(raw: &str) -> Option<i64> {
    let mut s = raw.trim().trim_matches('"').trim();
    if s.is_empty() {
        return None;
    }

    let mut is_neg = false;
    if s.starts_with('(') && s.ends_with(')') && s.len() >= 2 {
        is_neg = true;
        s = s[1..s.len() - 1].trim();
    }

    // Check trailing '-' (common in QIF / bank exports like "50.00-")
    if let Some(stripped) = s.strip_suffix('-') {
        is_neg = true;
        s = stripped.trim();
    }

    // Scan characters for sign and numeric/separator tokens
    let mut cleaned = String::with_capacity(s.len());
    let mut seen_digit = false;
    for ch in s.chars() {
        if ch == '-' && !seen_digit {
            is_neg = !is_neg;
        } else if ch == '+' && !seen_digit {
            // explicit positive prefix
        } else if ch.is_ascii_digit() {
            seen_digit = true;
            cleaned.push(ch);
        } else if ch == '.' || ch == ',' {
            cleaned.push(ch);
        }
    }

    if !seen_digit {
        return None;
    }

    let dot_count = cleaned.chars().filter(|&c| c == '.').count();
    let comma_count = cleaned.chars().filter(|&c| c == ',').count();

    let decimal_sep: Option<char> = if dot_count > 0 && comma_count > 0 {
        let last_dot = cleaned.rfind('.');
        let last_comma = cleaned.rfind(',');
        if last_dot > last_comma {
            Some('.')
        } else {
            Some(',')
        }
    } else if dot_count > 1 {
        None // multiple dots are thousands separators (e.g. "1.234.567")
    } else if dot_count == 1 {
        Some('.')
    } else if comma_count > 1 {
        None // multiple commas are thousands separators (e.g. "1,234,567")
    } else if comma_count == 1 {
        let idx = cleaned.find(',').unwrap_or(0);
        let before = &cleaned[..idx];
        let after = &cleaned[idx + 1..];
        let after_digits = after.chars().filter(|c| c.is_ascii_digit()).count();
        let before_digits: String = before.chars().filter(|c| c.is_ascii_digit()).collect();
        // Treat "1,250" (3 trailing digits, non-zero integer part) as thousands separator,
        // while "12,50", "12,5", or "0,125" uses ',' as decimal separator.
        if after_digits == 3 && !before_digits.is_empty() && before_digits != "0" {
            None
        } else {
            Some(',')
        }
    } else {
        None
    };

    let (whole_digits, frac_digits) = if let Some(sep) = decimal_sep {
        let pos = cleaned.rfind(sep)?;
        let whole_part: String = cleaned[..pos]
            .chars()
            .filter(|c| c.is_ascii_digit())
            .collect();
        let frac_part: String = cleaned[pos + 1..]
            .chars()
            .filter(|c| c.is_ascii_digit())
            .collect();
        (whole_part, frac_part)
    } else {
        let whole_part: String = cleaned.chars().filter(|c| c.is_ascii_digit()).collect();
        (whole_part, String::new())
    };

    let whole: i128 = if whole_digits.is_empty() {
        0
    } else {
        whole_digits.parse::<i128>().ok()?
    };

    let frac_milli: i128 = if frac_digits.is_empty() {
        0
    } else {
        let mut padded = String::with_capacity(4);
        for c in frac_digits.chars().take(4) {
            padded.push(c);
        }
        while padded.len() < 4 {
            padded.push('0');
        }
        let ten_thousandths = padded.parse::<i128>().ok()?;
        (ten_thousandths + 5) / 10
    };

    let magnitude = whole.checked_mul(1000)?.checked_add(frac_milli)?;
    let signed = if is_neg && magnitude != 0 {
        -magnitude
    } else {
        magnitude
    };
    i64::try_from(signed).ok()
}

fn expand_two_digit_year(yy: i32) -> i32 {
    if yy >= 70 {
        1900 + yy
    } else {
        2000 + yy
    }
}

/// Normalizes a date string from OFX, QIF, or CSV formats into ISO `"YYYY-MM-DD"`.
pub fn normalize_import_date(raw: &str, hint: DateOrderHint) -> Option<String> {
    let trimmed = raw.trim().trim_matches('"').trim();
    if trimmed.is_empty() {
        return None;
    }

    // 1. OFX compact format: YYYYMMDD or YYYYMMDDHHMMSS...
    let leading_digits: String = trimmed.chars().take_while(|c| c.is_ascii_digit()).collect();
    if leading_digits.len() >= 8 {
        let y: i32 = leading_digits[0..4].parse().ok()?;
        let m: u32 = leading_digits[4..6].parse().ok()?;
        let d: u32 = leading_digits[6..8].parse().ok()?;
        let date = NaiveDate::from_ymd_opt(y, m, d)?;
        return Some(date.format("%Y-%m-%d").to_string());
    }

    // Strip optional ISO time portion ("2026-11-18T12:30:00Z" or "2026-11-18 12:30:00")
    let date_only = trimmed.split(['T', ' ']).next().unwrap_or(trimmed).trim();

    // 2. QIF apostrophe format: MM/DD'YY or MM/DD'YYYY (e.g. "11/16'26" or "1/5'2026")
    if date_only.contains('\'') && date_only.contains('/') {
        let mut apostrophe_parts = date_only.split('\'');
        let md = apostrophe_parts.next()?.trim();
        let y_str = apostrophe_parts.next()?.trim();
        let md_parts: Vec<&str> = md.split('/').collect();
        if md_parts.len() == 2 {
            let p1: u32 = md_parts[0].trim().parse().ok()?;
            let p2: u32 = md_parts[1].trim().parse().ok()?;
            let raw_y: i32 = y_str.parse().ok()?;
            let y = if y_str.len() <= 2 {
                expand_two_digit_year(raw_y)
            } else {
                raw_y
            };
            let (m, d) = if hint == DateOrderHint::DayFirst || (p1 > 12 && p2 <= 12) {
                (p2, p1)
            } else {
                (p1, p2)
            };
            let date = NaiveDate::from_ymd_opt(y, m, d)?;
            return Some(date.format("%Y-%m-%d").to_string());
        }
    }

    // 3. Separated 3-part or 2-part dates using '/', '-', or '.'
    let sep = if date_only.contains('-') {
        '-'
    } else if date_only.contains('/') {
        '/'
    } else if date_only.contains('.') {
        '.'
    } else {
        return None;
    };

    let parts: Vec<&str> = date_only.split(sep).map(str::trim).collect();
    if parts.len() == 2 && sep == '/' {
        // Yearless MM/DD (assume current year)
        let p1: u32 = parts[0].parse().ok()?;
        let p2: u32 = parts[1].parse().ok()?;
        let year = Local::now().date_naive().year();
        let (m, d) = if hint == DateOrderHint::DayFirst || (p1 > 12 && p2 <= 12) {
            (p2, p1)
        } else {
            (p1, p2)
        };
        let date = NaiveDate::from_ymd_opt(year, m, d)?;
        return Some(date.format("%Y-%m-%d").to_string());
    }

    if parts.len() != 3 {
        return None;
    }

    // Year-first: YYYY-MM-DD / YYYY/MM/DD / YYYY.MM.DD
    if parts[0].len() == 4 {
        let y: i32 = parts[0].parse().ok()?;
        let m: u32 = parts[1].parse().ok()?;
        let d: u32 = parts[2].parse().ok()?;
        let date = NaiveDate::from_ymd_opt(y, m, d)?;
        return Some(date.format("%Y-%m-%d").to_string());
    }

    // Day/Month first with 2 or 4 digit year at end
    let p1: u32 = parts[0].parse().ok()?;
    let p2: u32 = parts[1].parse().ok()?;
    let raw_y: i32 = parts[2].parse().ok()?;
    let y = if parts[2].len() <= 2 {
        expand_two_digit_year(raw_y)
    } else {
        raw_y
    };

    let (m, d) = if p1 > 12 && p2 <= 12 {
        (p2, p1)
    } else if p2 > 12 && p1 <= 12 {
        (p1, p2)
    } else {
        match hint {
            DateOrderHint::DayFirst => (p2, p1),
            DateOrderHint::Auto if sep == '.' => (p2, p1), // DD.MM.YYYY convention
            _ => (p1, p2),
        }
    };

    let date = NaiveDate::from_ymd_opt(y, m, d)?;
    Some(date.format("%Y-%m-%d").to_string())
}

/// Generates a deterministic YNAB import ID (`YNAB:{amount_milliunits}:{iso_date}:{occurrence}`).
pub fn generate_import_id(amount_milliunits: i64, iso_date: &str, occurrence: u32) -> String {
    format!("YNAB:{}:{}:{}", amount_milliunits, iso_date, occurrence)
}

fn assign_deterministic_import_ids(txs: &mut [ParsedImportTransaction]) {
    let mut counts: HashMap<(i64, String), u32> = HashMap::new();
    for tx in txs.iter_mut() {
        let key = (tx.amount_milliunits, tx.date.clone());
        let occ = counts.entry(key).or_insert(0);
        *occ += 1;
        tx.import_id = generate_import_id(tx.amount_milliunits, &tx.date, *occ);
    }
}

fn squish_whitespace(raw: &str) -> String {
    raw.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn decode_xml_entities(raw: &str) -> String {
    raw.replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&apos;", "'")
        .replace("&nbsp;", " ")
        .replace("&#39;", "'")
}

// -----------------------------------------------------------------------------
// OFX / QFX Parser (SGML tag-soup & XML)
// -----------------------------------------------------------------------------

/// Parses OFX/QFX transaction data supporting both SGML tag-soup and XML `<STMTTRN>` formats.
pub fn parse_ofx(content: &str) -> Result<ParsedImportFile, String> {
    let mut cleaned = content.trim_start_matches('\u{FEFF}').to_string();
    // Strip CDATA wrappers if present
    while let Some(start) = cleaned.find("<![CDATA[") {
        if let Some(rel_end) = cleaned[start + 9..].find("]]>") {
            let end = start + 9 + rel_end;
            let inner = cleaned[start + 9..end].to_string();
            cleaned.replace_range(start..end + 3, &inner);
        } else {
            break;
        }
    }

    let upper_check = cleaned.to_ascii_uppercase();
    if !upper_check.contains("<OFX") && !upper_check.contains("<STMTTRN") {
        return Err("Malformed OFX/QFX file: missing <OFX> or <STMTTRN> tags".to_string());
    }

    // Tokenize into (UPPER_TAG_NAME, text_value_until_next_tag)
    let mut tokens: Vec<(String, String)> = Vec::new();
    let mut cursor = 0;
    let bytes = cleaned.as_bytes();
    while cursor < bytes.len() {
        if let Some(rel_open) = cleaned[cursor..].find('<') {
            let open = cursor + rel_open;
            if let Some(rel_close) = cleaned[open + 1..].find('>') {
                let close = open + 1 + rel_close;
                let tag_raw = cleaned[open + 1..close].trim();
                let next_open = cleaned[close + 1..]
                    .find('<')
                    .map(|p| close + 1 + p)
                    .unwrap_or(cleaned.len());
                let val_raw = cleaned[close + 1..next_open].trim();

                // Skip processing instructions like <?xml ... ?> or <?OFX ... ?>
                if !tag_raw.starts_with('?') && !tag_raw.starts_with('!') {
                    let tag_name = tag_raw
                        .split_whitespace()
                        .next()
                        .unwrap_or("")
                        .trim_end_matches('/')
                        .to_ascii_uppercase();
                    let val = decode_xml_entities(val_raw);
                    tokens.push((tag_name, squish_whitespace(&val)));
                }
                cursor = next_open;
            } else {
                return Err("Malformed OFX/QFX file: unclosed '<' tag".to_string());
            }
        } else {
            break;
        }
    }

    let mut account_id_hint: Option<String> = None;
    let mut account_type_hint: Option<String> = None;
    let mut transactions: Vec<ParsedImportTransaction> = Vec::new();
    let mut warnings: Vec<String> = Vec::new();

    #[derive(Default)]
    struct OfxTxBuilder {
        in_trn: bool,
        trntype: Option<String>,
        dtposted: Option<String>,
        dtuser: Option<String>,
        trnamt: Option<String>,
        fitid: Option<String>,
        name: Option<String>,
        payee: Option<String>,
        memo: Option<String>,
        checknum: Option<String>,
        refnum: Option<String>,
    }

    impl OfxTxBuilder {
        fn flush(
            &mut self,
            row_index: usize,
            account_hint: &Option<String>,
            out: &mut Vec<ParsedImportTransaction>,
            warnings: &mut Vec<String>,
        ) {
            if !self.in_trn {
                return;
            }
            self.in_trn = false;

            let raw_date = self
                .dtposted
                .take()
                .or_else(|| self.dtuser.take())
                .unwrap_or_default();
            let Some(iso_date) = normalize_import_date(&raw_date, DateOrderHint::YearFirst) else {
                if !raw_date.is_empty() {
                    warnings.push(format!(
                        "Row {}: invalid OFX date '{}'",
                        row_index, raw_date
                    ));
                }
                *self = Self::default();
                return;
            };

            let raw_amt = self.trnamt.take().unwrap_or_default();
            let Some(amount) = parse_money_milliunits(&raw_amt) else {
                warnings.push(format!(
                    "Row {}: invalid OFX amount '{}'",
                    row_index, raw_amt
                ));
                *self = Self::default();
                return;
            };

            if amount == 0 {
                *self = Self::default();
                return;
            }

            let payee_name = self
                .name
                .take()
                .filter(|s| !s.is_empty())
                .or_else(|| self.payee.take().filter(|s| !s.is_empty()))
                .unwrap_or_default();

            let check_number = match self.checknum.take().filter(|s| !s.is_empty() && s != "0") {
                Some(chk) => Some(chk),
                None => {
                    let is_check = self
                        .trntype
                        .as_deref()
                        .map(|t| t.eq_ignore_ascii_case("CHECK"))
                        .unwrap_or(false);
                    if is_check {
                        self.refnum.take().filter(|s| !s.is_empty())
                    } else {
                        None
                    }
                }
            };

            let memo = self.memo.take().filter(|s| !s.is_empty());
            let fit_id = self.fitid.take().filter(|s| !s.is_empty());

            out.push(ParsedImportTransaction {
                row_index,
                date: iso_date,
                raw_date,
                amount_milliunits: amount,
                payee_name,
                memo,
                check_number,
                category_name: None,
                cleared: "Cleared".to_string(),
                fit_id,
                import_id: String::new(),
                account_hint: account_hint.clone(),
            });
            *self = Self::default();
        }
    }

    let mut cur = OfxTxBuilder::default();
    let mut row_counter = 0usize;

    for (tag, val) in tokens {
        match tag.as_str() {
            "STMTTRN" => {
                if cur.in_trn {
                    row_counter += 1;
                    cur.flush(
                        row_counter,
                        &account_id_hint,
                        &mut transactions,
                        &mut warnings,
                    );
                }
                cur = OfxTxBuilder {
                    in_trn: true,
                    ..Default::default()
                };
            }
            "/STMTTRN" => {
                if cur.in_trn {
                    row_counter += 1;
                    cur.flush(
                        row_counter,
                        &account_id_hint,
                        &mut transactions,
                        &mut warnings,
                    );
                }
            }
            "ACCTID" if !cur.in_trn && !val.is_empty() => {
                account_id_hint = Some(val);
            }
            "ACCTTYPE" if !cur.in_trn && !val.is_empty() => {
                account_type_hint = Some(val);
            }
            "TRNTYPE" if cur.in_trn => cur.trntype = Some(val),
            "DTPOSTED" if cur.in_trn => cur.dtposted = Some(val),
            "DTUSER" if cur.in_trn => cur.dtuser = Some(val),
            "TRNAMT" if cur.in_trn => cur.trnamt = Some(val),
            "FITID" if cur.in_trn => cur.fitid = Some(val),
            "NAME" if cur.in_trn => cur.name = Some(val),
            "PAYEE" if cur.in_trn => cur.payee = Some(val),
            "MEMO" if cur.in_trn => cur.memo = Some(val),
            "CHECKNUM" if cur.in_trn => cur.checknum = Some(val),
            "REFNUM" if cur.in_trn => cur.refnum = Some(val),
            _ => {}
        }
    }

    if cur.in_trn {
        row_counter += 1;
        cur.flush(
            row_counter,
            &account_id_hint,
            &mut transactions,
            &mut warnings,
        );
    }

    assign_deterministic_import_ids(&mut transactions);

    Ok(ParsedImportFile {
        format: ImportFileFormat::Ofx,
        detected_delimiter: None,
        account_id_hint,
        account_type_hint,
        transactions,
        warnings,
    })
}

// -----------------------------------------------------------------------------
// QIF Parser (`D`, `T`, `P`, `M`, `N`, `C`, `^`)
// -----------------------------------------------------------------------------

fn split_lines_universal(content: &str) -> Vec<&str> {
    let stripped = content.trim_start_matches('\u{FEFF}');
    if stripped.contains('\n') {
        stripped.lines().map(|l| l.trim_end_matches('\r')).collect()
    } else {
        stripped.split('\r').collect()
    }
}

/// Parses QIF transaction files (`!Type:Bank`, `!Type:CCard`, `D`, `T`, `P`, `M`, `N`, `C`, `^`).
pub fn parse_qif(content: &str, date_hint: DateOrderHint) -> Result<ParsedImportFile, String> {
    let lines = split_lines_universal(content);
    if lines.is_empty() {
        return Err("Empty QIF file".to_string());
    }

    #[derive(Default)]
    struct QifRecord {
        has_fields: bool,
        raw_date: Option<String>,
        raw_amount: Option<String>,
        payee: Option<String>,
        memo: Option<String>,
        check_number: Option<String>,
        cleared: Option<String>,
        category: Option<String>,
    }

    impl QifRecord {
        fn flush(
            &mut self,
            row_index: usize,
            date_hint: DateOrderHint,
            account_hint: &Option<String>,
            out: &mut Vec<ParsedImportTransaction>,
            warnings: &mut Vec<String>,
        ) {
            if !self.has_fields {
                return;
            }
            let raw_date = self.raw_date.take().unwrap_or_default();
            let raw_amt = self.raw_amount.take().unwrap_or_default();
            let payee = self.payee.take().unwrap_or_default();
            let memo = self.memo.take().filter(|s| !s.is_empty());
            let check_number = self.check_number.take().filter(|s| !s.is_empty());
            let category = self.category.take().filter(|s| !s.is_empty());
            let cleared_flag = self.cleared.take().unwrap_or_default();
            *self = Self::default();

            let Some(iso_date) = normalize_import_date(&raw_date, date_hint) else {
                if !raw_date.is_empty() {
                    warnings.push(format!(
                        "Row {}: invalid QIF date '{}'",
                        row_index, raw_date
                    ));
                }
                return;
            };
            let Some(amount) = parse_money_milliunits(&raw_amt) else {
                if !raw_amt.is_empty() {
                    warnings.push(format!(
                        "Row {}: invalid QIF amount '{}'",
                        row_index, raw_amt
                    ));
                }
                return;
            };
            if amount == 0 {
                return;
            }

            let cleared = match cleared_flag.trim().to_ascii_lowercase().as_str() {
                "r" | "x" | "c" | "*" | "" => "Cleared".to_string(),
                _ => "Uncleared".to_string(),
            };

            out.push(ParsedImportTransaction {
                row_index,
                date: iso_date,
                raw_date,
                amount_milliunits: amount,
                payee_name: squish_whitespace(&payee),
                memo: memo.map(|m| squish_whitespace(&m)),
                check_number,
                category_name: category,
                cleared,
                fit_id: None,
                import_id: String::new(),
                account_hint: account_hint.clone(),
            });
        }
    }

    let mut in_account_header = false;
    let mut account_id_hint: Option<String> = None;
    let mut account_type_hint: Option<String> = None;
    let mut rec = QifRecord::default();
    let mut transactions: Vec<ParsedImportTransaction> = Vec::new();
    let mut warnings: Vec<String> = Vec::new();
    let mut row_counter = 0usize;

    for raw_line in lines {
        let line = raw_line.trim();
        if line.is_empty() {
            continue;
        }
        if let Some(rest) = line.strip_prefix('!') {
            let upper = rest.trim().to_ascii_lowercase();
            if upper.starts_with("account") {
                in_account_header = true;
            } else if let Some(type_val) = rest.trim().strip_prefix("Type:").or_else(|| {
                if upper.starts_with("type:") {
                    Some(&rest.trim()[5..])
                } else {
                    None
                }
            }) {
                in_account_header = false;
                account_type_hint = Some(type_val.trim().to_string());
            } else {
                in_account_header = false;
            }
            continue;
        }

        let code = line.chars().next().unwrap_or(' ');
        let body = line[code.len_utf8()..].trim();

        if in_account_header {
            if code == 'N' && !body.is_empty() {
                account_id_hint = Some(body.to_string());
            } else if code == '^' {
                in_account_header = false;
            }
            continue;
        }

        match code {
            'D' => {
                rec.has_fields = true;
                rec.raw_date = Some(body.to_string());
            }
            'T' => {
                rec.has_fields = true;
                rec.raw_amount = Some(body.to_string());
            }
            'U' if rec.raw_amount.is_none() => {
                rec.has_fields = true;
                rec.raw_amount = Some(body.to_string());
            }
            'P' => {
                rec.has_fields = true;
                rec.payee = Some(body.to_string());
            }
            'M' => {
                rec.has_fields = true;
                rec.memo = Some(body.to_string());
            }
            'N' => {
                rec.has_fields = true;
                rec.check_number = Some(body.to_string());
            }
            'C' => {
                rec.has_fields = true;
                rec.cleared = Some(body.to_string());
            }
            'L' => {
                rec.has_fields = true;
                rec.category = Some(body.to_string());
            }
            '^' if rec.has_fields => {
                row_counter += 1;
                rec.flush(
                    row_counter,
                    date_hint,
                    &account_id_hint,
                    &mut transactions,
                    &mut warnings,
                );
            }
            _ => {}
        }
    }

    if rec.has_fields {
        row_counter += 1;
        rec.flush(
            row_counter,
            date_hint,
            &account_id_hint,
            &mut transactions,
            &mut warnings,
        );
    }

    assign_deterministic_import_ids(&mut transactions);

    Ok(ParsedImportFile {
        format: ImportFileFormat::Qif,
        detected_delimiter: None,
        account_id_hint,
        account_type_hint,
        transactions,
        warnings,
    })
}

// -----------------------------------------------------------------------------
// CSV / TSV RFC4180 Parser & Auto-Delimiter Detection
// -----------------------------------------------------------------------------

fn parse_rfc4180_records(input: &str, delimiter: char) -> Result<Vec<Vec<String>>, String> {
    let text = input.trim_start_matches('\u{FEFF}');
    let mut rows: Vec<Vec<String>> = Vec::new();
    let mut current_row: Vec<String> = Vec::new();
    let mut current_field = String::new();
    let mut in_quotes = false;
    let mut at_field_start = true;
    let mut chars = text.chars().peekable();

    while let Some(ch) = chars.next() {
        if in_quotes {
            if ch == '"' {
                if chars.peek() == Some(&'"') {
                    chars.next();
                    current_field.push('"');
                } else {
                    in_quotes = false;
                }
            } else {
                current_field.push(ch);
            }
        } else if at_field_start && ch == '"' {
            in_quotes = true;
            at_field_start = false;
        } else if ch == delimiter {
            current_row.push(std::mem::take(&mut current_field));
            at_field_start = true;
        } else if ch == '\r' {
            if chars.peek() == Some(&'\n') {
                chars.next();
            }
            current_row.push(std::mem::take(&mut current_field));
            rows.push(std::mem::take(&mut current_row));
            at_field_start = true;
        } else if ch == '\n' {
            current_row.push(std::mem::take(&mut current_field));
            rows.push(std::mem::take(&mut current_row));
            at_field_start = true;
        } else {
            current_field.push(ch);
            at_field_start = false;
        }
    }

    if in_quotes {
        return Err("Malformed CSV: unterminated quoted field".to_string());
    }

    if !current_field.is_empty() || !current_row.is_empty() {
        current_row.push(current_field);
        rows.push(current_row);
    }

    // Filter out completely empty trailing/blank lines
    rows.retain(|r| !(r.len() == 1 && r[0].trim().is_empty()) && !r.is_empty());
    Ok(rows)
}

fn detect_csv_delimiter(content: &str) -> char {
    let sample: String = content
        .trim_start_matches('\u{FEFF}')
        .lines()
        .take(5)
        .collect::<Vec<_>>()
        .join("\n");

    let mut best_delim = ',';
    let mut best_score = 0usize;

    for delim in ['\t', ';', ','] {
        if let Ok(rows) = parse_rfc4180_records(&sample, delim) {
            if let Some(header) = rows.first() {
                if header.len() >= 2 {
                    let consistent_rows = rows
                        .iter()
                        .skip(1)
                        .filter(|r| r.len() == header.len())
                        .count();
                    let score = header.len() * 10 + consistent_rows * 20;
                    if score > best_score {
                        best_score = score;
                        best_delim = delim;
                    }
                }
            }
        }
    }
    best_delim
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum CsvColKind {
    Date,
    Payee,
    Category,
    Memo,
    Outflow,
    Inflow,
    Amount,
    Account,
    CheckNumber,
    Cleared,
}

fn classify_csv_header(raw: &str) -> Option<CsvColKind> {
    let normalized: String = raw
        .trim()
        .to_ascii_lowercase()
        .chars()
        .filter(|c| c.is_ascii_alphanumeric())
        .collect();

    match normalized.as_str() {
        "date" | "transactiondate" | "posteddate" | "valuedate" => Some(CsvColKind::Date),
        "payee" | "payeename" | "description" | "merchant" | "name" => Some(CsvColKind::Payee),
        "category" | "categorygroupcategory" | "subcategory" => Some(CsvColKind::Category),
        "memo" | "note" | "notes" | "details" | "reference" => Some(CsvColKind::Memo),
        "outflow" | "moneyout" | "debit" | "withdrawal" => Some(CsvColKind::Outflow),
        "inflow" | "moneyin" | "credit" | "deposit" => Some(CsvColKind::Inflow),
        "amount" | "value" | "netamount" => Some(CsvColKind::Amount),
        "account" | "accountname" | "sourceaccountname" => Some(CsvColKind::Account),
        "check" | "checknumber" | "checkno" => Some(CsvColKind::CheckNumber),
        "cleared" | "c" | "status" => Some(CsvColKind::Cleared),
        _ => None,
    }
}

/// Parses CSV or TSV files with auto-detected delimiter (`,`, `;`, `\t`) and RFC4180 quoting.
///
/// Supports both `Date,Payee,Category,Memo,Outflow,Inflow` and `Date,Payee,Memo,Amount` layouts,
/// plus `swap_inflow_outflow`, `swap_memo_with_payee`, and `import_memos`.
pub fn parse_csv(content: &str, options: &ImportOptions) -> Result<ParsedImportFile, String> {
    let delimiter = match options.format_override {
        Some(ImportFileFormat::Tsv) => '\t',
        _ => detect_csv_delimiter(content),
    };

    let rows = parse_rfc4180_records(content, delimiter)?;
    if rows.len() < 2 {
        return Err("CSV/TSV file must include a header row and at least one data row".to_string());
    }

    let headers = &rows[0];
    let col_kinds: Vec<Option<CsvColKind>> =
        headers.iter().map(|h| classify_csv_header(h)).collect();

    let has_date = col_kinds.contains(&Some(CsvColKind::Date));
    let has_money = col_kinds.contains(&Some(CsvColKind::Amount))
        || col_kinds.contains(&Some(CsvColKind::Outflow))
        || col_kinds.contains(&Some(CsvColKind::Inflow));

    if !has_date || !has_money {
        return Err(
            "CSV/TSV header missing required columns (need Date and Amount or Outflow/Inflow)"
                .to_string(),
        );
    }

    let mut transactions: Vec<ParsedImportTransaction> = Vec::new();
    let mut warnings: Vec<String> = Vec::new();
    let mut account_id_hint: Option<String> = None;

    for (idx, row) in rows.iter().skip(1).enumerate() {
        let row_index = idx + 1;
        let mut raw_date = String::new();
        let mut payee = String::new();
        let mut category: Option<String> = None;
        let mut memo: Option<String> = None;
        let mut check_number: Option<String> = None;
        let mut cleared = "Cleared".to_string();
        let mut account_hint: Option<String> = None;
        let mut outflow_raw: Option<&str> = None;
        let mut inflow_raw: Option<&str> = None;
        let mut amount_raw: Option<&str> = None;

        for (col_idx, kind_opt) in col_kinds.iter().enumerate() {
            let cell = row.get(col_idx).map(String::as_str).unwrap_or("").trim();
            let Some(kind) = kind_opt else { continue };
            match kind {
                CsvColKind::Date => raw_date = cell.to_string(),
                CsvColKind::Payee => payee = squish_whitespace(cell),
                CsvColKind::Category => {
                    if !cell.is_empty() {
                        category = Some(squish_whitespace(cell));
                    }
                }
                CsvColKind::Memo => {
                    if !cell.is_empty() && cell != "null" {
                        memo = Some(squish_whitespace(cell));
                    }
                }
                CsvColKind::Outflow => {
                    if !cell.is_empty() {
                        outflow_raw = Some(cell);
                    }
                }
                CsvColKind::Inflow => {
                    if !cell.is_empty() {
                        inflow_raw = Some(cell);
                    }
                }
                CsvColKind::Amount => {
                    if !cell.is_empty() {
                        amount_raw = Some(cell);
                    }
                }
                CsvColKind::Account => {
                    if !cell.is_empty() {
                        account_hint = Some(squish_whitespace(cell));
                        if account_id_hint.is_none() {
                            account_id_hint = account_hint.clone();
                        }
                    }
                }
                CsvColKind::CheckNumber => {
                    if !cell.is_empty() && cell != "null" {
                        check_number = Some(cell.to_string());
                    }
                }
                CsvColKind::Cleared => {
                    if cell.eq_ignore_ascii_case("uncleared") || cell.eq_ignore_ascii_case("u") {
                        cleared = "Uncleared".to_string();
                    } else if cell.eq_ignore_ascii_case("reconciled")
                        || cell.eq_ignore_ascii_case("r")
                    {
                        cleared = "Reconciled".to_string();
                    }
                }
            }
        }

        let Some(iso_date) = normalize_import_date(&raw_date, options.date_order) else {
            if !raw_date.is_empty() {
                warnings.push(format!(
                    "Row {}: invalid CSV date '{}'",
                    row_index, raw_date
                ));
            }
            continue;
        };

        let mut amount_milliunits = if outflow_raw.is_some() || inflow_raw.is_some() {
            let out_val = match outflow_raw {
                Some(raw) => match parse_money_milliunits(raw) {
                    Some(v) => v.abs(),
                    None => {
                        warnings.push(format!(
                            "Row {}: invalid Outflow amount '{}'",
                            row_index, raw
                        ));
                        continue;
                    }
                },
                None => 0,
            };
            let in_val = match inflow_raw {
                Some(raw) => match parse_money_milliunits(raw) {
                    Some(v) => v.abs(),
                    None => {
                        warnings.push(format!(
                            "Row {}: invalid Inflow amount '{}'",
                            row_index, raw
                        ));
                        continue;
                    }
                },
                None => 0,
            };
            in_val - out_val
        } else if let Some(raw) = amount_raw {
            match parse_money_milliunits(raw) {
                Some(v) => v,
                None => {
                    warnings.push(format!("Row {}: invalid Amount '{}'", row_index, raw));
                    continue;
                }
            }
        } else {
            continue;
        };

        if amount_milliunits == 0 {
            continue;
        }

        if options.swap_inflow_outflow {
            amount_milliunits = -amount_milliunits;
        }

        let mut final_payee = payee;
        let mut final_memo = memo;
        if options.swap_memo_with_payee {
            let old_payee = final_payee;
            final_payee = final_memo.unwrap_or_default();
            final_memo = if old_payee.is_empty() {
                None
            } else {
                Some(old_payee)
            };
        }

        if !options.import_memos {
            final_memo = None;
        }

        transactions.push(ParsedImportTransaction {
            row_index,
            date: iso_date,
            raw_date,
            amount_milliunits,
            payee_name: final_payee,
            memo: final_memo,
            check_number,
            category_name: category,
            cleared,
            fit_id: None,
            import_id: String::new(),
            account_hint,
        });
    }

    assign_deterministic_import_ids(&mut transactions);

    let format = if delimiter == '\t' {
        ImportFileFormat::Tsv
    } else {
        ImportFileFormat::Csv
    };

    Ok(ParsedImportFile {
        format,
        detected_delimiter: Some(delimiter),
        account_id_hint,
        account_type_hint: None,
        transactions,
        warnings,
    })
}

/// Auto-detects format (or uses `options.format_override`) and parses OFX/QFX/QIF/CSV/TSV.
pub fn parse_import_file(
    filename: Option<&str>,
    content: &str,
    options: &ImportOptions,
) -> Result<ParsedImportFile, String> {
    let format = options
        .format_override
        .unwrap_or_else(|| ImportFileFormat::detect(filename, content));

    let mut parsed = match format {
        ImportFileFormat::Ofx => parse_ofx(content)?,
        ImportFileFormat::Qfx => {
            let mut res = parse_ofx(content)?;
            res.format = ImportFileFormat::Qfx;
            res
        }
        ImportFileFormat::Qif => parse_qif(content, options.date_order)?,
        ImportFileFormat::Csv | ImportFileFormat::Tsv => parse_csv(content, options)?,
    };

    // Apply `swap_inflow_outflow` consistently if someone requests it for non-CSV formats too
    if matches!(
        format,
        ImportFileFormat::Ofx | ImportFileFormat::Qfx | ImportFileFormat::Qif
    ) {
        if options.swap_inflow_outflow {
            for tx in &mut parsed.transactions {
                tx.amount_milliunits = -tx.amount_milliunits;
            }
            assign_deterministic_import_ids(&mut parsed.transactions);
        }
        if options.swap_memo_with_payee {
            for tx in &mut parsed.transactions {
                let old_payee = std::mem::take(&mut tx.payee_name);
                tx.payee_name = tx.memo.take().unwrap_or_default();
                tx.memo = if old_payee.is_empty() {
                    None
                } else {
                    Some(old_payee)
                };
            }
        }
        if !options.import_memos {
            for tx in &mut parsed.transactions {
                tx.memo = None;
            }
        }
    }

    Ok(parsed)
}

// -----------------------------------------------------------------------------
// Payee Rename Conditions (`be_payee_rename_conditions`)
// -----------------------------------------------------------------------------

/// Evaluates payee rename conditions with YNAB's exact precedence:
/// `Is` -> `Contains` -> `StartsWith` -> `EndsWith` (case-insensitive).
pub fn match_payee_rename_rules<'a>(
    conditions: &'a [PayeeRenameCondition],
    imported_payee: &str,
) -> Option<&'a PayeeRenameCondition> {
    let needle = imported_payee.trim().to_ascii_lowercase();
    if needle.is_empty() {
        return None;
    }

    for op in [
        RenameOperator::Is,
        RenameOperator::Contains,
        RenameOperator::StartsWith,
        RenameOperator::EndsWith,
    ] {
        if let Some(found) = conditions.iter().find(|cond| {
            if cond.operator != op {
                return false;
            }
            let operand = cond.operand.trim().to_ascii_lowercase();
            if operand.is_empty() {
                return false;
            }
            match op {
                RenameOperator::Is => needle == operand,
                RenameOperator::Contains => needle.contains(&operand),
                RenameOperator::StartsWith => needle.starts_with(&operand),
                RenameOperator::EndsWith => needle.ends_with(&operand),
            }
        }) {
            return Some(found);
        }
    }
    None
}

/// Inserts a new active rule into `be_payee_rename_conditions` (idempotent on identical rule).
pub fn add_payee_rename_condition(
    conn: &Connection,
    budget_id: &str,
    payee_id: &str,
    operator: RenameOperator,
    operand: &str,
) -> SqlResult<String> {
    let trimmed = operand.trim();
    if let Some(existing_id) = conn
        .query_row(
            r#"SELECT id FROM be_payee_rename_conditions
               WHERE budget_id = ?1 AND entities_payee_id = ?2
                 AND lower(operator) = lower(?3) AND lower(operand) = lower(?4)
                 AND is_tombstone = 0
               LIMIT 1"#,
            params![budget_id, payee_id, operator.as_str(), trimmed],
            |r| r.get::<_, String>(0),
        )
        .optional()?
    {
        return Ok(existing_id);
    }

    let id = Uuid::new_v4().to_string();
    conn.execute(
        r#"INSERT INTO be_payee_rename_conditions (
               id, budget_id, entities_payee_id, is_tombstone, operator, operand
           ) VALUES (?1, ?2, ?3, 0, ?4, ?5)"#,
        params![id, budget_id, payee_id, operator.as_str(), trimmed],
    )?;
    Ok(id)
}

/// Lists all active `be_payee_rename_conditions` for a budget whose target payee is non-tombstoned.
pub fn list_payee_rename_conditions(
    conn: &Connection,
    budget_id: &str,
) -> SqlResult<Vec<PayeeRenameCondition>> {
    let mut stmt = conn.prepare(
        r#"SELECT rc.id, rc.budget_id, rc.entities_payee_id, rc.operator, rc.operand
           FROM be_payee_rename_conditions rc
           JOIN be_payees p ON rc.entities_payee_id = p.id
           WHERE rc.budget_id = ?1 AND rc.is_tombstone = 0 AND p.is_tombstone = 0
           ORDER BY rc.created_at ASC, rc.id ASC"#,
    )?;
    let rows = stmt
        .query_map(params![budget_id], |r| {
            let op_str: String = r.get(3)?;
            Ok(PayeeRenameCondition {
                id: r.get(0)?,
                budget_id: r.get(1)?,
                payee_id: r.get(2)?,
                operator: RenameOperator::from_str_loose(&op_str),
                operand: r.get(4)?,
            })
        })?
        .filter_map(SqlResult::ok)
        .collect();
    Ok(rows)
}

/// Lists active `be_payee_rename_conditions` for a specific payee.
pub fn list_payee_rename_conditions_for_payee(
    conn: &Connection,
    payee_id: &str,
) -> SqlResult<Vec<PayeeRenameCondition>> {
    let mut stmt = conn.prepare(
        r#"SELECT id, budget_id, entities_payee_id, operator, operand
           FROM be_payee_rename_conditions
           WHERE entities_payee_id = ?1 AND is_tombstone = 0
           ORDER BY created_at ASC, id ASC"#,
    )?;
    let rows = stmt
        .query_map(params![payee_id], |r| {
            let op_str: String = r.get(3)?;
            Ok(PayeeRenameCondition {
                id: r.get(0)?,
                budget_id: r.get(1)?,
                payee_id: r.get(2)?,
                operator: RenameOperator::from_str_loose(&op_str),
                operand: r.get(4)?,
            })
        })?
        .filter_map(SqlResult::ok)
        .collect();
    Ok(rows)
}

/// Tombstones a payee rename condition (`is_tombstone = 1`).
pub fn delete_payee_rename_condition(conn: &Connection, rule_id: &str) -> SqlResult<()> {
    conn.execute(
        "UPDATE be_payee_rename_conditions SET is_tombstone = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?1",
        params![rule_id],
    )?;
    Ok(())
}

// -----------------------------------------------------------------------------
// 2-Way Heuristic Transaction Matcher (`MATCH_MAX_DAYS_APART = 10`)
// -----------------------------------------------------------------------------

#[derive(Debug, Clone)]
struct MatchCandidateRow {
    id: String,
    date: NaiveDate,
    date_str: String,
    amount: i64,
    payee_name: Option<String>,
}

/// 1-to-1 closest-date heuristic matcher mirroring `wrapper.renamed.js:23835-23855`.
/// Returns a map from imported `row_index` -> matched `MatchCandidateRow`.
fn compute_heuristic_matches(
    imported_rows: &[&ParsedImportTransaction],
    candidates: &[MatchCandidateRow],
) -> HashMap<usize, MatchCandidateRow> {
    let mut by_amount: HashMap<i64, Vec<usize>> = HashMap::new();
    for (idx, c) in candidates.iter().enumerate() {
        by_amount.entry(c.amount).or_default().push(idx);
    }

    // candidate_idx -> (imported_idx_in_slice, days_apart)
    let mut cand_to_imp: HashMap<usize, (usize, i64)> = HashMap::new();
    let mut pending: Vec<usize> = (0..imported_rows.len()).collect();

    while !pending.is_empty() {
        let mut displaced: Vec<usize> = Vec::new();
        for imp_pos in pending {
            let imp = imported_rows[imp_pos];
            let Ok(imp_date) = NaiveDate::parse_from_str(&imp.date, "%Y-%m-%d") else {
                continue;
            };
            let Some(cand_indices) = by_amount.get(&imp.amount_milliunits) else {
                continue;
            };

            let mut best_cand: Option<(usize, i64)> = None;
            for &c_idx in cand_indices {
                let c = &candidates[c_idx];
                let days_apart = (c.date - imp_date).num_days().abs();
                if days_apart > MATCH_MAX_DAYS_APART {
                    continue;
                }
                if let Some((_, best_days)) = best_cand {
                    if days_apart >= best_days {
                        continue;
                    }
                }
                if let Some(&(_, prev_days)) = cand_to_imp.get(&c_idx) {
                    if days_apart >= prev_days {
                        continue;
                    }
                }
                best_cand = Some((c_idx, days_apart));
                if days_apart == 0 {
                    break;
                }
            }

            if let Some((chosen_cand, days)) = best_cand {
                if let Some((old_imp_pos, _)) = cand_to_imp.insert(chosen_cand, (imp_pos, days)) {
                    displaced.push(old_imp_pos);
                }
            }
        }
        pending = displaced;
    }

    let mut result = HashMap::new();
    for (c_idx, (imp_pos, _)) in cand_to_imp {
        let imp = imported_rows[imp_pos];
        result.insert(imp.row_index, candidates[c_idx].clone());
    }
    result
}

fn query_tx_snapshot_json(conn: &Connection, id: &str) -> Option<String> {
    conn.query_row(
        r#"SELECT is_tombstone, amount, cash_amount, credit_amount, date,
                  entities_payee_id, entities_subcategory_id, memo, cleared, flag,
                  accepted, matched_transaction_id, source, import_id, ynab_id,
                  imported_payee, original_imported_payee, imported_date
           FROM be_transactions
           WHERE id = ?1"#,
        params![id],
        |r| {
            Ok(serde_json::json!({
                "is_tombstone": r.get::<_, i32>(0)?,
                "amount": r.get::<_, i64>(1)?,
                "cash_amount": r.get::<_, i64>(2)?,
                "credit_amount": r.get::<_, i64>(3)?,
                "date": r.get::<_, String>(4)?,
                "entities_payee_id": r.get::<_, Option<String>>(5)?,
                "entities_subcategory_id": r.get::<_, Option<String>>(6)?,
                "memo": r.get::<_, Option<String>>(7)?,
                "cleared": r.get::<_, String>(8)?,
                "flag": r.get::<_, Option<String>>(9)?,
                "accepted": r.get::<_, i32>(10)?,
                "matched_transaction_id": r.get::<_, Option<String>>(11)?,
                "source": r.get::<_, Option<String>>(12)?,
                "import_id": r.get::<_, Option<String>>(13)?,
                "ynab_id": r.get::<_, Option<String>>(14)?,
                "imported_payee": r.get::<_, Option<String>>(15)?,
                "original_imported_payee": r.get::<_, Option<String>>(16)?,
                "imported_date": r.get::<_, Option<String>>(17)?,
            })
            .to_string())
        },
    )
    .ok()
}

/// Matches a manual transaction with an imported transaction inside a SQLite SAVEPOINT + ChangeSetRecorder:
/// - Keeps the manual transaction's date, payee, and category
/// - Sets manual transaction's `cleared = "Cleared"` (unless already `"Reconciled"`)
/// - Saves `matched_transaction_id`, `imported_payee`, `import_id`, `imported_date`, and `source = "Matched"`
/// - Tombstones the duplicate imported transaction (preserving its payload for `unmatch_transaction`)
pub fn match_transactions(
    conn: &mut Connection,
    manual_tx_id: &str,
    imported_tx_id: &str,
) -> Result<(), String> {
    match_transactions_impl(conn, manual_tx_id, imported_tx_id, None)
}

fn match_transactions_impl(
    conn: &Connection,
    manual_tx_id: &str,
    imported_tx_id: &str,
    mut external_recorder: Option<&mut ChangeSetRecorder<'_>>,
) -> Result<(), String> {
    if manual_tx_id == imported_tx_id {
        return Err("Cannot match a transaction with itself".to_string());
    }

    #[allow(clippy::type_complexity)]
    let (m_budget, m_acc, m_amt, m_cleared, m_source, m_transfer_acc, m_transfer_tx, m_matched): (
        String,
        String,
        i64,
        String,
        Option<String>,
        Option<String>,
        Option<String>,
        Option<String>,
    ) = conn
        .query_row(
            r#"SELECT budget_id, entities_account_id, amount, cleared, source,
                      transfer_account_id, transfer_transaction_id, matched_transaction_id
               FROM be_transactions
               WHERE id = ?1 AND is_tombstone = 0"#,
            params![manual_tx_id],
            |r| {
                Ok((
                    r.get(0)?,
                    r.get(1)?,
                    r.get(2)?,
                    r.get(3)?,
                    r.get(4)?,
                    r.get(5)?,
                    r.get(6)?,
                    r.get(7)?,
                ))
            },
        )
        .map_err(|e| format!("Manual transaction '{}' not found: {}", manual_tx_id, e))?;

    #[allow(clippy::type_complexity)]
    let (
        i_budget,
        i_acc,
        i_amt,
        i_date,
        i_cleared,
        i_import_id,
        i_ynab_id,
        i_imported_payee,
        i_payee_name,
        i_source,
        i_transfer_acc,
        i_transfer_tx,
        i_matched,
    ): (
        String,
        String,
        i64,
        String,
        String,
        Option<String>,
        Option<String>,
        Option<String>,
        Option<String>,
        Option<String>,
        Option<String>,
        Option<String>,
        Option<String>,
    ) = conn
        .query_row(
            r#"SELECT t.budget_id, t.entities_account_id, t.amount, t.date, t.cleared,
                      t.import_id, t.ynab_id, t.imported_payee, p.name, t.source,
                      t.transfer_account_id, t.transfer_transaction_id, t.matched_transaction_id
               FROM be_transactions t
               LEFT JOIN be_payees p ON t.entities_payee_id = p.id
               WHERE t.id = ?1 AND t.is_tombstone = 0"#,
            params![imported_tx_id],
            |r| {
                Ok((
                    r.get(0)?,
                    r.get(1)?,
                    r.get(2)?,
                    r.get(3)?,
                    r.get(4)?,
                    r.get(5)?,
                    r.get(6)?,
                    r.get(7)?,
                    r.get(8)?,
                    r.get(9)?,
                    r.get(10)?,
                    r.get(11)?,
                    r.get(12)?,
                ))
            },
        )
        .map_err(|e| format!("Imported transaction '{}' not found: {}", imported_tx_id, e))?;

    if m_budget != i_budget || m_acc != i_acc {
        return Err("Transactions must belong to the same budget and account to match".to_string());
    }
    if m_amt != i_amt {
        return Err(format!(
            "Cannot match transactions with different amounts ({} vs {})",
            m_amt, i_amt
        ));
    }
    if m_transfer_acc.is_some()
        || m_transfer_tx.is_some()
        || i_transfer_acc.is_some()
        || i_transfer_tx.is_some()
    {
        return Err("Transfer transactions cannot be matched by the import matcher".to_string());
    }
    if m_matched.is_some() || i_matched.is_some() {
        return Err("One of the transactions is already matched".to_string());
    }
    if m_cleared == "Reconciled" || i_cleared == "Reconciled" {
        return Err(
            "Reconciled (LOCKED) transaction cannot be matched without explicit unlock".to_string(),
        );
    }

    let before_manual = query_tx_snapshot_json(conn, manual_tx_id);
    let before_imported = query_tx_snapshot_json(conn, imported_tx_id);

    let effective_imported_payee = i_imported_payee
        .clone()
        .or(i_payee_name)
        .unwrap_or_default();
    let effective_import_id = i_import_id.or(i_ynab_id);
    let new_cleared = "Cleared".to_string();

    // Store restoration metadata on the tombstoned imported record so unmatch restores exact state
    let restore_meta = serde_json::json!({
        "prev_cleared": m_cleared,
        "prev_source": m_source,
        "prev_imported_source": i_source.clone().unwrap_or_else(|| "Imported".to_string()),
        "orig_imported_payee": effective_imported_payee,
    })
    .to_string();

    conn.execute_batch("SAVEPOINT sp_match_tx;")
        .map_err(|e| e.to_string())?;

    let work = (|| -> Result<(), String> {
        conn.execute(
            r#"UPDATE be_transactions
               SET cleared = ?1,
                   matched_transaction_id = ?2,
                   imported_payee = ?3,
                   import_id = COALESCE(import_id, ?4),
                   ynab_id = COALESCE(ynab_id, ?4),
                   imported_date = COALESCE(imported_date, ?5),
                   source = 'Matched',
                   updated_at = CURRENT_TIMESTAMP
               WHERE id = ?6"#,
            params![
                new_cleared,
                imported_tx_id,
                effective_imported_payee,
                effective_import_id,
                i_date,
                manual_tx_id,
            ],
        )
        .map_err(|e| e.to_string())?;

        conn.execute(
            r#"UPDATE be_transactions
               SET is_tombstone = 1,
                   matched_transaction_id = ?1,
                   original_imported_payee = ?2,
                   source = 'matched_import',
                   updated_at = CURRENT_TIMESTAMP
               WHERE id = ?3"#,
            params![manual_tx_id, restore_meta, imported_tx_id],
        )
        .map_err(|e| e.to_string())?;

        let after_manual = query_tx_snapshot_json(conn, manual_tx_id);
        let after_imported = query_tx_snapshot_json(conn, imported_tx_id);
        if let Some(ext) = external_recorder.as_deref_mut() {
            if let Some(after_m) = after_manual.as_deref() {
                ext.record_change(
                    "be_transactions",
                    manual_tx_id,
                    "update",
                    before_manual.as_deref(),
                    after_m,
                );
            }
            if let Some(after_i) = after_imported.as_deref() {
                ext.record_change(
                    "be_transactions",
                    imported_tx_id,
                    "update",
                    before_imported.as_deref(),
                    after_i,
                );
            }
        } else {
            let mut recorder = ChangeSetRecorder::new(conn, &m_budget, "Match Transactions");
            if let Some(after_m) = after_manual.as_deref() {
                recorder.record_change(
                    "be_transactions",
                    manual_tx_id,
                    "update",
                    before_manual.as_deref(),
                    after_m,
                );
            }
            if let Some(after_i) = after_imported.as_deref() {
                recorder.record_change(
                    "be_transactions",
                    imported_tx_id,
                    "update",
                    before_imported.as_deref(),
                    after_i,
                );
            }
            recorder.commit().map_err(|e| e.to_string())?;
        }
        update_account_balances(conn, &m_acc).map_err(|e| e.to_string())?;
        Ok(())
    })();

    match work {
        Ok(()) => {
            conn.execute_batch("RELEASE SAVEPOINT sp_match_tx;")
                .map_err(|e| e.to_string())?;
            Ok(())
        }
        Err(err) => {
            let _ = conn
                .execute_batch("ROLLBACK TO SAVEPOINT sp_match_tx; RELEASE SAVEPOINT sp_match_tx;");
            Err(err)
        }
    }
}

/// Unmatches a matched transaction pair, restoring the tombstoned imported transaction
/// and resetting the manual transaction's match/cleared metadata.
/// Returns `Err` if either side is `Reconciled` (LOCKED).
/// Returns the ID of the restored imported transaction.
pub fn unmatch_transaction(conn: &mut Connection, tx_id: &str) -> Result<String, String> {
    unmatch_transaction_with_options(conn, tx_id, false)
}

/// Unmatches a matched transaction pair with explicit reconciled-unlock control.
/// When `allow_reconciled` is false, any `'Reconciled'` transaction is rejected (`INVARIANTS.md`).
/// When `allow_reconciled` is true, a reconciled manual transaction remains `'Reconciled'` and the
/// resurrected imported copy is marked `'Uncleared'` so `cleared_balance` stays invariant.
pub fn unmatch_transaction_with_options(
    conn: &mut Connection,
    tx_id: &str,
    allow_reconciled: bool,
) -> Result<String, String> {
    let (budget_id, account_id, cleared, source, matched_id): (
        String,
        String,
        String,
        Option<String>,
        Option<String>,
    ) = conn
        .query_row(
            r#"SELECT budget_id, entities_account_id, cleared, source, matched_transaction_id
               FROM be_transactions
               WHERE id = ?1"#,
            params![tx_id],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?)),
        )
        .map_err(|e| format!("Transaction '{}' not found: {}", tx_id, e))?;

    let other_id = matched_id.ok_or_else(|| format!("Transaction '{}' is not matched", tx_id))?;

    let (manual_id, imported_id) = if source.as_deref() == Some("matched_import")
        || source.as_deref() == Some("MatchedImport")
    {
        (other_id, tx_id.to_string())
    } else {
        (tx_id.to_string(), other_id)
    };

    let m_cleared: String = if manual_id == tx_id {
        cleared.clone()
    } else {
        conn.query_row(
            "SELECT cleared FROM be_transactions WHERE id = ?1",
            params![manual_id],
            |r| r.get(0),
        )
        .map_err(|e| format!("Manual transaction '{}' not found: {}", manual_id, e))?
    };

    let (i_cleared, orig_meta): (String, Option<String>) = if imported_id == tx_id {
        let orig: Option<String> = conn
            .query_row(
                "SELECT original_imported_payee FROM be_transactions WHERE id = ?1",
                params![imported_id],
                |r| r.get(0),
            )
            .ok()
            .flatten();
        (cleared, orig)
    } else {
        conn.query_row(
            "SELECT cleared, original_imported_payee FROM be_transactions WHERE id = ?1",
            params![imported_id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .map_err(|e| format!("Imported transaction '{}' not found: {}", imported_id, e))?
    };

    if !allow_reconciled && (m_cleared == "Reconciled" || i_cleared == "Reconciled") {
        return Err(
            "Reconciled (LOCKED) transaction cannot be unmatched without explicit unlock"
                .to_string(),
        );
    }

    let (prev_cleared, prev_source, prev_imported_source): (String, Option<String>, String) =
        if let Some(meta_str) = orig_meta.as_deref() {
            if let Ok(v) = serde_json::from_str::<serde_json::Value>(meta_str) {
                let pc = v
                    .get("prev_cleared")
                    .and_then(|s| s.as_str())
                    .unwrap_or("Uncleared")
                    .to_string();
                let ps = v
                    .get("prev_source")
                    .and_then(|s| s.as_str())
                    .map(|s| s.to_string());
                let pis = v
                    .get("prev_imported_source")
                    .and_then(|s| s.as_str())
                    .unwrap_or("Imported")
                    .to_string();
                (pc, ps, pis)
            } else {
                ("Uncleared".to_string(), None, "Imported".to_string())
            }
        } else {
            ("Uncleared".to_string(), None, "Imported".to_string())
        };

    let final_manual_cleared = if m_cleared == "Reconciled" {
        "Reconciled".to_string()
    } else {
        prev_cleared
    };
    let final_imported_cleared = if i_cleared == "Reconciled" {
        "Reconciled".to_string()
    } else if m_cleared == "Reconciled" {
        // Manual side stays Reconciled & cleared; keep resurrected duplicate Uncleared to avoid changing cleared_balance
        "Uncleared".to_string()
    } else {
        "Cleared".to_string()
    };

    let before_manual = query_tx_snapshot_json(conn, &manual_id);
    let before_imported = query_tx_snapshot_json(conn, &imported_id);

    conn.execute_batch("SAVEPOINT sp_unmatch_tx;")
        .map_err(|e| e.to_string())?;

    let work = (|| -> Result<(), String> {
        conn.execute(
            r#"UPDATE be_transactions
               SET cleared = ?1,
                   matched_transaction_id = NULL,
                   imported_payee = NULL,
                   import_id = NULL,
                   ynab_id = NULL,
                   imported_date = NULL,
                   source = ?2,
                   updated_at = CURRENT_TIMESTAMP
               WHERE id = ?3"#,
            params![final_manual_cleared, prev_source, manual_id],
        )
        .map_err(|e| e.to_string())?;

        conn.execute(
            r#"UPDATE be_transactions
               SET is_tombstone = 0,
                   matched_transaction_id = NULL,
                   source = ?1,
                   cleared = ?2,
                   updated_at = CURRENT_TIMESTAMP
               WHERE id = ?3"#,
            params![prev_imported_source, final_imported_cleared, imported_id],
        )
        .map_err(|e| e.to_string())?;

        let mut recorder = ChangeSetRecorder::new(conn, &budget_id, "Unmatch Transaction");
        if let Some(after_manual) = query_tx_snapshot_json(conn, &manual_id) {
            recorder.record_change(
                "be_transactions",
                &manual_id,
                "update",
                before_manual.as_deref(),
                &after_manual,
            );
        }
        if let Some(after_imported) = query_tx_snapshot_json(conn, &imported_id) {
            recorder.record_change(
                "be_transactions",
                &imported_id,
                "update",
                before_imported.as_deref(),
                &after_imported,
            );
        }
        recorder.commit().map_err(|e| e.to_string())?;
        update_account_balances(conn, &account_id).map_err(|e| e.to_string())?;
        Ok(())
    })();

    match work {
        Ok(()) => {
            conn.execute_batch("RELEASE SAVEPOINT sp_unmatch_tx;")
                .map_err(|e| e.to_string())?;
            Ok(imported_id)
        }
        Err(err) => {
            let _ = conn.execute_batch(
                "ROLLBACK TO SAVEPOINT sp_unmatch_tx; RELEASE SAVEPOINT sp_unmatch_tx;",
            );
            Err(err)
        }
    }
}

// -----------------------------------------------------------------------------
// Import Preview & Commit Pipeline
// -----------------------------------------------------------------------------

#[derive(Debug, Clone)]
struct PayeeLookup {
    id: String,
    name: String,
    auto_fill_cat_id: Option<String>,
}

struct PayeesLookup {
    by_id: HashMap<String, PayeeLookup>,
    by_lower_name: HashMap<String, PayeeLookup>,
}

struct CategoriesLookup {
    id_to_name: HashMap<String, String>,
    lower_name_to_id: HashMap<String, String>,
    immediate_income_id: Option<String>,
}

fn load_payees_lookup(conn: &Connection, budget_id: &str) -> Result<PayeesLookup, String> {
    let mut by_id = HashMap::new();
    let mut by_lower_name = HashMap::new();

    let mut stmt = conn
        .prepare(
            r#"SELECT id, name, auto_fill_subcategory_enabled,
                      COALESCE(auto_fill_user_defined_subcategory_id, auto_fill_subcategory_id)
               FROM be_payees
               WHERE budget_id = ?1 AND is_tombstone = 0"#,
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![budget_id], |r| {
            let enabled: i32 = r.get(2)?;
            let cat: Option<String> = r.get(3)?;
            Ok(PayeeLookup {
                id: r.get(0)?,
                name: r.get(1)?,
                auto_fill_cat_id: if enabled != 0 { cat } else { None },
            })
        })
        .map_err(|e| e.to_string())?;

    for p in rows.flatten() {
        by_lower_name.insert(p.name.trim().to_ascii_lowercase(), p.clone());
        by_id.insert(p.id.clone(), p);
    }

    Ok(PayeesLookup {
        by_id,
        by_lower_name,
    })
}

fn load_categories_lookup(conn: &Connection, budget_id: &str) -> Result<CategoriesLookup, String> {
    let mut id_to_name = HashMap::new();
    let mut lower_name_to_id = HashMap::new();
    let mut immediate_income_id = None;

    let mut stmt = conn
        .prepare(
            r#"SELECT id, name, internal_name
               FROM be_subcategories
               WHERE budget_id = ?1 AND is_tombstone = 0"#,
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![budget_id], |r| {
            Ok((
                r.get::<_, String>(0)?,
                r.get::<_, String>(1)?,
                r.get::<_, Option<String>>(2)?,
            ))
        })
        .map_err(|e| e.to_string())?;

    for (id, name, internal_name) in rows.flatten() {
        if internal_name.as_deref() == Some(CAT_IMMEDIATE_INCOME) {
            immediate_income_id = Some(id.clone());
        }
        lower_name_to_id.insert(name.trim().to_ascii_lowercase(), id.clone());
        id_to_name.insert(id, name);
    }

    Ok(CategoriesLookup {
        id_to_name,
        lower_name_to_id,
        immediate_income_id,
    })
}

fn load_existing_import_ids(
    conn: &Connection,
    account_id: &str,
) -> Result<HashSet<String>, String> {
    let mut set = HashSet::new();
    let mut stmt = conn
        .prepare(
            r#"SELECT import_id, ynab_id
               FROM be_transactions
               WHERE entities_account_id = ?1
                 AND is_tombstone = 0
                 AND (import_id IS NOT NULL OR ynab_id IS NOT NULL)"#,
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![account_id], |r| {
            Ok((
                r.get::<_, Option<String>>(0)?,
                r.get::<_, Option<String>>(1)?,
            ))
        })
        .map_err(|e| e.to_string())?;

    for (iid, yid) in rows.flatten() {
        if let Some(s) = iid.filter(|v| !v.is_empty()) {
            set.insert(s);
        }
        if let Some(s) = yid.filter(|v| !v.is_empty()) {
            set.insert(s);
        }
    }
    Ok(set)
}

fn load_match_candidates(
    conn: &Connection,
    account_id: &str,
) -> Result<Vec<MatchCandidateRow>, String> {
    let mut stmt = conn
        .prepare(
            r#"SELECT t.id, t.date, t.amount, p.name
               FROM be_transactions t
               LEFT JOIN be_payees p ON t.entities_payee_id = p.id
               WHERE t.entities_account_id = ?1
                 AND t.is_tombstone = 0
                 AND t.matched_transaction_id IS NULL
                 AND t.cleared != 'Reconciled'
                 AND t.transfer_account_id IS NULL
                 AND t.transfer_transaction_id IS NULL
                 AND (t.source IS NULL OR t.source = '' OR t.source = 'Scheduler' OR t.source = 'Pending')
               ORDER BY t.date ASC, t.id ASC"#,
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![account_id], |r| {
            let date_str: String = r.get(1)?;
            let parsed = NaiveDate::parse_from_str(&date_str, "%Y-%m-%d").ok();
            Ok(parsed.map(|d| MatchCandidateRow {
                id: r.get(0).unwrap_or_default(),
                date: d,
                date_str,
                amount: r.get(2).unwrap_or(0),
                payee_name: r.get(3).unwrap_or(None),
            }))
        })
        .map_err(|e| e.to_string())?;

    Ok(rows.flatten().flatten().collect())
}

/// Previews a bank file import against the specified account without mutating the database:
/// - Parses OFX/QFX/QIF/CSV/TSV
/// - Deduplicates against `be_transactions.import_id`
/// - Enriches payees via `be_payee_rename_conditions` + autofill categories
/// - Runs the 10-day exact-amount heuristic matcher
pub fn preview_import(
    conn: &Connection,
    budget_id: &str,
    account_id: &str,
    filename: Option<&str>,
    content: &str,
    options: &ImportOptions,
) -> Result<ImportPreviewResult, String> {
    let (on_budget, acc_type): (i32, String) = conn
        .query_row(
            "SELECT on_budget, account_type FROM be_accounts WHERE id = ?1 AND budget_id = ?2 AND is_tombstone = 0",
            params![account_id, budget_id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .map_err(|e| format!("Account '{}' not found: {}", account_id, e))?;

    let parsed = parse_import_file(filename, content, options)?;
    let existing_import_ids = load_existing_import_ids(conn, account_id)?;
    let rename_rules = list_payee_rename_conditions(conn, budget_id).map_err(|e| e.to_string())?;
    let payees_lookup = load_payees_lookup(conn, budget_id)?;
    let categories_lookup = load_categories_lookup(conn, budget_id)?;

    let non_dup_refs: Vec<&ParsedImportTransaction> = parsed
        .transactions
        .iter()
        .filter(|t| !existing_import_ids.contains(&t.import_id))
        .collect();

    let match_map = if options.auto_match && !non_dup_refs.is_empty() {
        let candidates = load_match_candidates(conn, account_id)?;
        compute_heuristic_matches(&non_dup_refs, &candidates)
    } else {
        HashMap::new()
    };

    let is_cash_on_budget = on_budget != 0
        && matches!(
            acc_type.to_ascii_lowercase().as_str(),
            "checking" | "savings" | "cash"
        );

    let mut rows = Vec::with_capacity(parsed.transactions.len());
    let mut new_count = 0usize;
    let mut matched_count = 0usize;
    let mut duplicate_count = 0usize;

    for tx in &parsed.transactions {
        let is_dup = existing_import_ids.contains(&tx.import_id);

        // Payee enrichment: rename condition -> exact payee name -> raw imported payee
        let matched_payee: Option<&PayeeLookup> =
            if let Some(rule) = match_payee_rename_rules(&rename_rules, &tx.payee_name) {
                payees_lookup.by_id.get(&rule.payee_id)
            } else {
                payees_lookup
                    .by_lower_name
                    .get(&tx.payee_name.trim().to_ascii_lowercase())
            };

        let (resolved_payee_id, resolved_payee_name, autofill_cat_id) = match matched_payee {
            Some(p) => (
                Some(p.id.clone()),
                p.name.clone(),
                p.auto_fill_cat_id.clone(),
            ),
            None => (None, tx.payee_name.clone(), None),
        };

        // Category enrichment: payee autofill -> CSV/QIF category name -> Inflow: Ready to Assign
        let resolved_cat_id = if let Some(cid) = autofill_cat_id {
            Some(cid)
        } else if let Some(cat_hint) = tx.category_name.as_deref() {
            categories_lookup
                .lower_name_to_id
                .get(&cat_hint.trim().to_ascii_lowercase())
                .cloned()
        } else if tx.amount_milliunits > 0 && is_cash_on_budget {
            categories_lookup.immediate_income_id.clone()
        } else {
            None
        };
        let resolved_cat_name = resolved_cat_id
            .as_ref()
            .and_then(|cid| categories_lookup.id_to_name.get(cid).cloned());

        let (status, matched_tx_id, matched_tx_date, matched_tx_payee) = if is_dup {
            duplicate_count += 1;
            (ImportRowStatus::Duplicate, None, None, None)
        } else if let Some(cand) = match_map.get(&tx.row_index) {
            matched_count += 1;
            (
                ImportRowStatus::AutoMatched,
                Some(cand.id.clone()),
                Some(cand.date_str.clone()),
                cand.payee_name.clone(),
            )
        } else {
            new_count += 1;
            (ImportRowStatus::New, None, None, None)
        };

        rows.push(ImportPreviewRow {
            row_index: tx.row_index,
            date: tx.date.clone(),
            amount_milliunits: tx.amount_milliunits,
            imported_payee: tx.payee_name.clone(),
            resolved_payee_id,
            resolved_payee_name,
            resolved_category_id: resolved_cat_id,
            resolved_category_name: resolved_cat_name,
            memo: tx.memo.clone(),
            check_number: tx.check_number.clone(),
            import_id: tx.import_id.clone(),
            status,
            matched_transaction_id: matched_tx_id,
            matched_transaction_date: matched_tx_date,
            matched_transaction_payee: matched_tx_payee,
        });
    }

    Ok(ImportPreviewResult {
        format: parsed.format,
        account_id: account_id.to_string(),
        total_parsed: parsed.transactions.len(),
        new_count,
        matched_count,
        duplicate_count,
        rows,
        warnings: parsed.warnings,
    })
}

/// Commits an import file into SQLite atomically inside a SAVEPOINT and `ChangeSetRecorder`:
/// - Skips duplicates matching `be_transactions.import_id`
/// - Creates missing payees as needed
/// - Inserts `New` rows with `source = 'Imported'` and `accepted = 0`
/// - Auto-matches `AutoMatched` rows with their paired manual transaction (keeping manual metadata,
///   setting `cleared = 'Cleared'`, tombstoning the duplicate imported row, and updating account balances)
pub fn commit_import(
    conn: &mut Connection,
    budget_id: &str,
    account_id: &str,
    filename: Option<&str>,
    content: &str,
    options: &ImportOptions,
) -> Result<ImportCommitResult, String> {
    let preview = preview_import(conn, budget_id, account_id, filename, content, options)?;
    let acc_type: String = conn
        .query_row(
            "SELECT account_type FROM be_accounts WHERE id = ?1",
            params![account_id],
            |r| r.get(0),
        )
        .map_err(|e| format!("Account '{}' not found: {}", account_id, e))?;

    let mut parsed_by_row: HashMap<usize, ParsedImportTransaction> = HashMap::new();
    let parsed = parse_import_file(filename, content, options)?;
    for p in parsed.transactions {
        parsed_by_row.insert(p.row_index, p);
    }

    let mut created_payees_cache: HashMap<String, String> = HashMap::new();
    let mut imported_count = 0usize;
    let mut matched_count = 0usize;
    let mut skipped_duplicate_count = 0usize;
    let mut created_payee_count = 0usize;
    let mut imported_transaction_ids = Vec::new();
    let mut matched_transaction_ids = Vec::new();
    let mut pending_matches: Vec<(String, String)> = Vec::new();

    conn.execute_batch("SAVEPOINT sp_commit_import;")
        .map_err(|e| e.to_string())?;

    let db: &Connection = conn;
    let work = (|| -> Result<(), String> {
        let mut recorder = ChangeSetRecorder::new(db, budget_id, "File Import");

        for row in &preview.rows {
            if row.status == ImportRowStatus::Duplicate {
                skipped_duplicate_count += 1;
                continue;
            }

            let cleared = parsed_by_row
                .get(&row.row_index)
                .map(|p| p.cleared.as_str())
                .unwrap_or("Cleared");

            let payee_id: Option<String> = if let Some(pid) = &row.resolved_payee_id {
                Some(pid.clone())
            } else {
                let pname = row.resolved_payee_name.trim();
                if pname.is_empty() || pname.starts_with("Transfer : ") {
                    None
                } else {
                    let lower = pname.to_ascii_lowercase();
                    if let Some(cached) = created_payees_cache.get(&lower) {
                        Some(cached.clone())
                    } else if let Ok(existing) = db.query_row(
                        "SELECT id FROM be_payees WHERE budget_id = ?1 AND lower(name) = ?2 AND is_tombstone = 0 LIMIT 1",
                        params![budget_id, lower],
                        |r| r.get::<_, String>(0),
                    ) {
                        created_payees_cache.insert(lower, existing.clone());
                        Some(existing)
                    } else {
                        let new_pid = Uuid::new_v4().to_string();
                        db.execute(
                            "INSERT INTO be_payees (id, budget_id, name, enabled) VALUES (?1, ?2, ?3, 1)",
                            params![new_pid, budget_id, pname],
                        )
                        .map_err(|e| e.to_string())?;
                        let after_payee = serde_json::json!({
                            "name": pname,
                            "is_tombstone": 0
                        })
                        .to_string();
                        recorder.record_change("be_payees", &new_pid, "insert", None, &after_payee);
                        created_payees_cache.insert(lower, new_pid.clone());
                        created_payee_count += 1;
                        Some(new_pid)
                    }
                }
            };

            let tx_id = Uuid::new_v4().to_string();
            let (cash_amt, credit_amt) =
                determine_cash_credit_amounts(&acc_type, row.amount_milliunits);

            db.execute(
                r#"INSERT INTO be_transactions (
                       id, budget_id, entities_account_id, entities_payee_id, entities_subcategory_id,
                       date, imported_date, amount, cash_amount, credit_amount, memo, cleared,
                       accepted, check_number, import_id, ynab_id, imported_payee,
                       original_imported_payee, source
                   ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6, ?7, ?8, ?9, ?10, ?11, 0, ?12, ?13, ?13, ?14, ?14, 'Imported')"#,
                params![
                    tx_id,
                    budget_id,
                    account_id,
                    payee_id,
                    row.resolved_category_id,
                    row.date,
                    row.amount_milliunits,
                    cash_amt,
                    credit_amt,
                    row.memo,
                    cleared,
                    row.check_number,
                    row.import_id,
                    row.imported_payee,
                ],
            )
            .map_err(|e| e.to_string())?;

            if let Some(after_tx) = query_tx_snapshot_json(db, &tx_id) {
                recorder.record_change("be_transactions", &tx_id, "insert", None, &after_tx);
            }

            if row.status == ImportRowStatus::AutoMatched {
                if let Some(manual_id) = &row.matched_transaction_id {
                    pending_matches.push((manual_id.clone(), tx_id.clone()));
                }
            } else {
                imported_count += 1;
                imported_transaction_ids.push(tx_id);
            }
        }

        for (manual_id, imported_id) in &pending_matches {
            match_transactions_impl(db, manual_id, imported_id, Some(&mut recorder))?;
            matched_count += 1;
            matched_transaction_ids.push(manual_id.clone());
        }

        recorder.commit().map_err(|e| e.to_string())?;
        Ok(())
    })();

    if let Err(err) = work {
        let _ = conn.execute_batch(
            "ROLLBACK TO SAVEPOINT sp_commit_import; RELEASE SAVEPOINT sp_commit_import;",
        );
        return Err(err);
    }

    update_account_balances(conn, account_id).map_err(|e| e.to_string())?;
    conn.execute_batch("RELEASE SAVEPOINT sp_commit_import;")
        .map_err(|e| e.to_string())?;

    Ok(ImportCommitResult {
        account_id: account_id.to_string(),
        imported_count,
        matched_count,
        skipped_duplicate_count,
        created_payee_count,
        imported_transaction_ids,
        matched_transaction_ids,
    })
}
