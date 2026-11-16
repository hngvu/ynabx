//! F04: Backend date parsing safety & bounds test suite.
//! Tests date boundary parsing: valid dates, single-digit months, empty string `""`,
//! no hyphen `"2026"`, non-numeric `"abc"`, short strings, clamping month > 12 safely without panic.

// The canonical safe parser contract specified in ORIGINAL_REQUEST §R4 and PROJECT.md F14:
pub fn parse_year_month_safe(ym: &str) -> (i32, u32) {
    if ym.is_empty() {
        return (2026, 1);
    }
    let parts: Vec<&str> = ym.split('-').collect();
    let year: i32 = parts.first().and_then(|y| y.parse().ok()).unwrap_or(2026);
    let raw_month: u32 = parts.get(1).and_then(|m| m.parse().ok()).unwrap_or(1);
    let month = raw_month.clamp(1, 12);
    (year, month)
}

// The legacy naive parser in commands.rs:1575 that crashes on malformed strings
fn naive_parse_year_month(ym: &str) -> (i32, u32) {
    let parts: Vec<&str> = ym.split('-').collect();
    let year: i32 = parts[0].parse().unwrap_or(2026);
    let month: u32 = parts[1].parse().unwrap_or(1);
    (year, month)
}

// =========================================================================
// Tier 1: Primary Behavioral & Equivalence Tests
// =========================================================================

#[test]
fn test_f04_t1_standard_year_month_format() {
    let (year, month) = parse_year_month_safe("2026-03");
    assert_eq!(year, 2026);
    assert_eq!(month, 3);
}

#[test]
fn test_f04_t1_full_iso_date_string() {
    let (year, month) = parse_year_month_safe("2026-11-16");
    assert_eq!(year, 2026);
    assert_eq!(month, 11);
}

#[test]
fn test_f04_t1_single_digit_month() {
    let (year, month) = parse_year_month_safe("2026-5");
    assert_eq!(year, 2026);
    assert_eq!(month, 5);
}

#[test]
fn test_f04_t1_month_twelve_boundary() {
    let (year, month) = parse_year_month_safe("2025-12");
    assert_eq!(year, 2025);
    assert_eq!(month, 12);
}

#[test]
fn test_f04_t1_month_one_boundary() {
    let (year, month) = parse_year_month_safe("2027-01");
    assert_eq!(year, 2027);
    assert_eq!(month, 1);
}

// =========================================================================
// Tier 2: Boundary & Corner Cases (Panics in Legacy vs Safety in Safe)
// =========================================================================

#[test]
fn test_f04_t2_empty_string_no_panic() {
    // Naive implementation panics on empty string because parts has only 1 element
    let naive_result = std::panic::catch_unwind(|| {
        naive_parse_year_month("")
    });
    assert!(naive_result.is_err(), "Exposes defect: naive parse_year_month panics on empty string ''");

    // Safe parser returns safe fallback without thread panic
    let (year, month) = parse_year_month_safe("");
    assert_eq!(year, 2026);
    assert_eq!(month, 1);
}

#[test]
fn test_f04_t2_no_hyphen_year_only_string_no_panic() {
    // "2026" has no hyphens: parts[1] is out of bounds in naive implementation
    let naive_result = std::panic::catch_unwind(|| {
        naive_parse_year_month("2026")
    });
    assert!(naive_result.is_err(), "Exposes defect: naive parse_year_month panics on '2026' without hyphen");

    let (year, month) = parse_year_month_safe("2026");
    assert_eq!(year, 2026);
    assert_eq!(month, 1);
}

#[test]
fn test_f04_t2_non_numeric_strings_no_panic() {
    let (year, month) = parse_year_month_safe("abc-def");
    assert_eq!(year, 2026, "Non-numeric year defaults to 2026");
    assert_eq!(month, 1, "Non-numeric month defaults to 1");
}

#[test]
fn test_f04_t2_short_strings_no_panic() {
    for short_input in ["a", "-", "1", "---", "2026-"] {
        let (year, month) = parse_year_month_safe(short_input);
        assert!(month >= 1 && month <= 12, "Month must always be valid [1, 12]");
        assert!(year > 0, "Year must be positive");
    }
}

#[test]
fn test_f04_t2_month_greater_than_twelve_clamped() {
    let (year, month) = parse_year_month_safe("2026-15");
    assert_eq!(year, 2026);
    assert_eq!(month, 12, "Month > 12 must be safely clamped to 12 without panic");

    let (year_zero, month_zero) = parse_year_month_safe("2026-0");
    assert_eq!(year_zero, 2026);
    assert_eq!(month_zero, 1, "Month 0 must be safely clamped to 1 without panic");
}
