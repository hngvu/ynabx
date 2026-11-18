//! Embedded HTML `<head>` stylesheet & offline font/illustration asset builder for `ynab-desktop`.
//! Preserves exact CSS cascade order so offline Figtree font, YNAB SVG illustrations (`--cdn_url_*`),
//! bundled Ember CSS, Accounts CSS, Billboard CSS, and Glimmer component CSS load with zero network access.

#![deny(clippy::float_arithmetic)]

use base64::{engine::general_purpose::STANDARD as BASE64_STANDARD, Engine as _};

const YNAB_BUNDLED_CSS: &str = include_str!("../assets/ynab_original_bundled.css");
const ACCOUNTS_CSS: &str = include_str!("../assets/accounts.css");
const BILLBOARD_CSS: &str = include_str!("../assets/billboard.css");
const EMBER_GLIMMER_COMPONENTS_CSS: &str = include_str!("../assets/ember_glimmer_components.css");
const FIGTREE_WOFF2: &[u8] = include_bytes!("../assets/Figtree.woff2");
const ICON_SPRITE_SVG: &str = include_str!("../assets/icon_sprite.svg");

const IMG_DASHBOARD_BLUE_SQUIGGLE_SVG: &[u8] =
    include_bytes!("../assets/images/dashboard/blue-squiggle.svg");
const IMG_DASHBOARD_BOOKS_SVG: &[u8] = include_bytes!("../assets/images/dashboard/books.svg");
const IMG_DASHBOARD_MIC_SVG: &[u8] = include_bytes!("../assets/images/dashboard/mic.svg");
const IMG_DASHBOARD_TV_SVG: &[u8] = include_bytes!("../assets/images/dashboard/tv.svg");
const IMG_SUNSHINE_OUTLINE_SVG: &[u8] =
    include_bytes!("../assets/images/for-you-feed-card/sunshine-outline.svg");

const YNAB_PRIMARY_LOGO_SVG: &str = r##"<svg xmlns="http://www.w3.org/2000/svg" width="977" height="235" fill="none" viewBox="0 0 977 235"><path fill="#3B5EDA" d="M899.6 196.2a38.6 38.6 0 1 1 77.3-.1 38.6 38.6 0 0 1-77.3 0"/><path fill="#091D42" d="M153 149.2v84.6H82v-84.6L0 0h81.5l37.3 71.5c12.4-23.1 24.9-49 36.6-71.5h78zm222.5 84.6-66.7-109.1v109.1h-67.3V0h60.8l66.6 107.4V0h67v233.8zm229.7-41.4h-68.8l-13.8 41.4h-76L532.3 0h81.9l83.5 233.8h-79zM571 85.4l-18 53.4h36zm232.4 148.4h-95.3V0h90.5c53.5 0 84.6 22.8 84.6 64.2 0 20.8-10.7 37.7-28.3 50.5a61 61 0 0 1 29.7 52.1c0 43.2-30.4 67-81.2 67m-10-179.2h-17.2v38h18.3c9 0 16.9-7.3 16.9-20 0-10-6.6-18-18-18m-1.4 86h-15.8v39H791c14.9 0 22.8-7.3 22.8-19 0-12.4-6.2-20-21.8-20"/></svg>"##;

const YNAB_PRIMARY_LOGO_DARK_SVG: &str = r##"<svg xmlns="http://www.w3.org/2000/svg" width="977" height="235" fill="none" viewBox="0 0 977 235"><path fill="#7583FF" d="M899.6 196.2a38.6 38.6 0 1 1 77.3-.1 38.6 38.6 0 0 1-77.3 0"/><path fill="#FFFFFF" d="M153 149.2v84.6H82v-84.6L0 0h81.5l37.3 71.5c12.4-23.1 24.9-49 36.6-71.5h78zm222.5 84.6-66.7-109.1v109.1h-67.3V0h60.8l66.6 107.4V0h67v233.8zm229.7-41.4h-68.8l-13.8 41.4h-76L532.3 0h81.9l83.5 233.8h-79zM571 85.4l-18 53.4h36zm232.4 148.4h-95.3V0h90.5c53.5 0 84.6 22.8 84.6 64.2 0 20.8-10.7 37.7-28.3 50.5a61 61 0 0 1 29.7 52.1c0 43.2-30.4 67-81.2 67m-10-179.2h-17.2v38h18.3c9 0 16.9-7.3 16.9-20 0-10-6.6-18-18-18m-1.4 86h-15.8v39H791c14.9 0 22.8-7.3 22.8-19 0-12.4-6.2-20-21.8-20"/></svg>"##;

const FTUE_OPENING_QUOTE_SVG: &str = r##"<svg xmlns="http://www.w3.org/2000/svg" width="28" height="24" viewBox="0 0 28 24" fill="none"><path d="M11.6 0C5.2 2.4 0.8 8.3 0.8 15.3C0.8 20.4 4.1 24 8.5 24C12.2 24 14.9 21.3 14.9 17.7C14.9 14.2 12.4 11.7 9.1 11.7C8.2 11.7 7.3 11.9 6.6 12.3C7.2 8.7 9.6 5.6 13.1 4.1L11.6 0ZM25.2 0C18.8 2.4 14.4 8.3 14.4 15.3C14.4 20.4 17.7 24 22.1 24C25.8 24 28.5 21.3 28.5 17.7C28.5 14.2 26 11.7 22.7 11.7C21.8 11.7 20.9 11.9 20.2 12.3C20.8 8.7 23.2 5.6 26.7 4.1L25.2 0Z" fill="#7583FF"/></svg>"##;

const FTUE_BG_BLURPLE_BOTTOM_SVG: &str = r##"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 300" fill="none"><path d="M0 140C180 70 360 220 560 150C670 110 740 80 800 110V300H0V140Z" fill="#545BFE" fill-opacity="0.35"/></svg>"##;

const FTUE_BG_BLURPLE_TOP_BOTTOM_SVG: &str = r##"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 400" fill="none"><path d="M0 0H800V95C620 145 410 40 210 95C120 120 50 105 0 80V0Z" fill="#7583FF" fill-opacity="0.28"/><path d="M0 280C200 220 420 340 620 270C710 240 760 225 800 245V400H0V280Z" fill="#545BFE" fill-opacity="0.35"/></svg>"##;

const FTUE_BG_MEADOW_BOTTOM_SVG: &str = r##"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 300" fill="none"><path d="M0 155C190 85 390 215 600 145C700 110 755 95 800 120V300H0V155Z" fill="#02BC79" fill-opacity="0.25"/></svg>"##;

const GROUP_HEADER_LARGE_SVG: &str = r##"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 210" fill="none"><rect width="1200" height="210" fill="#292C6C"/><circle cx="1040" cy="40" r="140" fill="#545BFE" fill-opacity="0.35"/><circle cx="1140" cy="175" r="95" fill="#41D298" fill-opacity="0.25"/></svg>"##;

const GROUP_SUBPAGE_HEADER_BG_SVG: &str = r##"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 160" fill="none"><rect width="1200" height="160" fill="#1C1F58"/><path d="M0 120C280 55 580 155 900 95C1030 70 1125 60 1200 80V160H0V120Z" fill="#545BFE" fill-opacity="0.3"/></svg>"##;

const CATEGORY_SET_WIZARD_TEXTURE_SVG: &str = r##"<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80" fill="none"><circle cx="20" cy="20" r="3" fill="#FFFFFF" fill-opacity="0.14"/><circle cx="60" cy="60" r="3" fill="#FFFFFF" fill-opacity="0.14"/></svg>"##;

const CATEGORY_TEMPLATE_MODAL_BG_SVG: &str = r##"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 380" fill="none"><circle cx="690" cy="90" r="130" fill="#7583FF" fill-opacity="0.25"/><circle cx="110" cy="310" r="110" fill="#AEE865" fill-opacity="0.18"/></svg>"##;

const EMPTY_STATE_MUG_SVG: &str = r##"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none"><rect x="14" y="22" width="28" height="26" rx="6" fill="#D4D5FF" stroke="#545BFE" stroke-width="2.5"/><path d="M42 27H47C50.3 27 53 29.7 53 33C53 36.3 50.3 39 47 39H42" stroke="#545BFE" stroke-width="2.5" stroke-linecap="round"/><path d="M22 15C22 12 24 11 24 8M29 15C29 12 31 11 31 8M36 15C36 12 38 11 38 8" stroke="#7583FF" stroke-width="2.5" stroke-linecap="round"/></svg>"##;

const EMPTY_STATE_GLOVE_SVG: &str = r##"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none"><circle cx="32" cy="32" r="22" fill="#EDFAF4" stroke="#02BC79" stroke-width="2.5"/><path d="M23 33L29 39L42 25" stroke="#029864" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>"##;

const LOAN_GET_STARTED_SVG: &str = r##"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 96" fill="none"><rect x="12" y="16" width="96" height="64" rx="10" fill="#F1F1FF" stroke="#545BFE" stroke-width="2.5"/><path d="M26 58L44 42L58 50L82 28L94 34" stroke="#545BFE" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="82" cy="28" r="4" fill="#93D53E"/></svg>"##;

const LOAN_RECONCILIATION_DOODLE_SVG: &str = r##"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 64" fill="none"><path d="M8 46C24 22 46 50 64 26C72 15 82 14 88 18" stroke="#93D53E" stroke-width="4" stroke-linecap="round"/><circle cx="88" cy="18" r="4" fill="#545BFE"/></svg>"##;

const REGISTER_PARTY_HAT_SVG: &str = r##"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none"><path d="M18 50L32 14L46 50H18Z" fill="#A3ACFF" stroke="#545BFE" stroke-width="2.5" stroke-linejoin="round"/><circle cx="32" cy="12" r="4" fill="#F6C91D"/><circle cx="50" cy="22" r="6" fill="#93D53E"/></svg>"##;

fn svg_data_uri(bytes: &[u8]) -> String {
    let encoded = BASE64_STANDARD.encode(bytes);
    format!(r#"url("data:image/svg+xml;base64,{encoded}")"#)
}

fn extract_sprite_symbol_svg(symbol_id: &str, fill_hex: &str) -> String {
    let needle = format!(r#"id="icon_sprite_{symbol_id}""#);
    let Some(start_idx) = ICON_SPRITE_SVG.find(&needle) else {
        return format!(
            r#"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" fill="{fill_hex}"/></svg>"#
        );
    };
    let rest = &ICON_SPRITE_SVG[start_idx..];
    let Some(gt_offset) = rest.find('>') else {
        return String::new();
    };
    let open_tag_attrs = &rest[..gt_offset];
    let view_box = open_tag_attrs
        .split("viewBox=\"")
        .nth(1)
        .and_then(|s| s.split('"').next())
        .unwrap_or("0 0 24 24");
    let body_start = &rest[gt_offset + 1..];
    let Some(end_offset) = body_start.find("</symbol>") else {
        return String::new();
    };
    let inner = body_start[..end_offset].replace("currentColor", fill_hex);
    format!(
        r#"<svg xmlns="http://www.w3.org/2000/svg" viewBox="{view_box}" fill="none">{inner}</svg>"#
    )
}

fn build_cdn_url_root_vars() -> String {
    let tree_logo = extract_sprite_symbol_svg("ynab_logo", "#000000");
    let inspector_calendar = extract_sprite_symbol_svg("calendar", "#545BFE");
    let reconcile_checkmark = extract_sprite_symbol_svg("checkmark_seal", "#508316");
    let paper_airplane = extract_sprite_symbol_svg("paper_plane", "#545BFE");
    let privacy_lock = extract_sprite_symbol_svg("lock", "#545BFE");
    let default_bank = extract_sprite_symbol_svg("bank", "#545BFE");
    let coffee_mug = extract_sprite_symbol_svg("checkmark_inbox", "#545BFE");

    let pairs: [(&str, String); 27] = [
        (
            "--cdn_url_dashboard_blue-squiggle_svg",
            svg_data_uri(IMG_DASHBOARD_BLUE_SQUIGGLE_SVG),
        ),
        (
            "--cdn_url_dashboard_books_svg",
            svg_data_uri(IMG_DASHBOARD_BOOKS_SVG),
        ),
        (
            "--cdn_url_dashboard_mic_svg",
            svg_data_uri(IMG_DASHBOARD_MIC_SVG),
        ),
        (
            "--cdn_url_dashboard_tv_svg",
            svg_data_uri(IMG_DASHBOARD_TV_SVG),
        ),
        (
            "--cdn_url_for-you-feed-card_sunshine-outline_svg",
            svg_data_uri(IMG_SUNSHINE_OUTLINE_SVG),
        ),
        (
            "--cdn_url_ynab-primary-logo_svg",
            svg_data_uri(YNAB_PRIMARY_LOGO_SVG.as_bytes()),
        ),
        (
            "--cdn_url_ynab-primary-logo-dark_svg",
            svg_data_uri(YNAB_PRIMARY_LOGO_DARK_SVG.as_bytes()),
        ),
        (
            "--cdn_url_ynab-tree-logo_svg",
            svg_data_uri(tree_logo.as_bytes()),
        ),
        (
            "--cdn_url_reconcile_checkmark_svg",
            svg_data_uri(reconcile_checkmark.as_bytes()),
        ),
        (
            "--cdn_url_inspector_calendar_svg",
            svg_data_uri(inspector_calendar.as_bytes()),
        ),
        (
            "--cdn_url_paper-airplane_svg",
            svg_data_uri(paper_airplane.as_bytes()),
        ),
        (
            "--cdn_url_privacy-policy_lock_svg",
            svg_data_uri(privacy_lock.as_bytes()),
        ),
        (
            "--cdn_url_direct-import_default-bank-icon_svg",
            svg_data_uri(default_bank.as_bytes()),
        ),
        (
            "--cdn_url_register_coffee-mug_svg",
            svg_data_uri(coffee_mug.as_bytes()),
        ),
        (
            "--cdn_url_register_party-hat-and-balloon_svg",
            svg_data_uri(REGISTER_PARTY_HAT_SVG.as_bytes()),
        ),
        (
            "--cdn_url_budget-views_empty-state-mug_svg",
            svg_data_uri(EMPTY_STATE_MUG_SVG.as_bytes()),
        ),
        (
            "--cdn_url_budget-views_boxing-glove-empty-state_svg",
            svg_data_uri(EMPTY_STATE_GLOVE_SVG.as_bytes()),
        ),
        (
            "--cdn_url_loan-account_get-started_svg",
            svg_data_uri(LOAN_GET_STARTED_SVG.as_bytes()),
        ),
        (
            "--cdn_url_loan-account_reconciliation-end-doodle_svg",
            svg_data_uri(LOAN_RECONCILIATION_DOODLE_SVG.as_bytes()),
        ),
        (
            "--cdn_url_ftue_outro_opening-quote_svg",
            svg_data_uri(FTUE_OPENING_QUOTE_SVG.as_bytes()),
        ),
        (
            "--cdn_url_ftue_background-blurple-bottom_svg",
            svg_data_uri(FTUE_BG_BLURPLE_BOTTOM_SVG.as_bytes()),
        ),
        (
            "--cdn_url_ftue_background-blurple-top-bottom_svg",
            svg_data_uri(FTUE_BG_BLURPLE_TOP_BOTTOM_SVG.as_bytes()),
        ),
        (
            "--cdn_url_ftue_background-meadow-bottom_svg",
            svg_data_uri(FTUE_BG_MEADOW_BOTTOM_SVG.as_bytes()),
        ),
        (
            "--cdn_url_group_header_large_svg",
            svg_data_uri(GROUP_HEADER_LARGE_SVG.as_bytes()),
        ),
        (
            "--cdn_url_group_subpage_header_bg_svg",
            svg_data_uri(GROUP_SUBPAGE_HEADER_BG_SVG.as_bytes()),
        ),
        (
            "--cdn_url_category-set-wizard_texture_svg",
            svg_data_uri(CATEGORY_SET_WIZARD_TEXTURE_SVG.as_bytes()),
        ),
        (
            "--cdn_url_category-template_modal-background_svg",
            svg_data_uri(CATEGORY_TEMPLATE_MODAL_BG_SVG.as_bytes()),
        ),
    ];

    let mut out = String::from(":root {\n");
    for (name, val) in pairs {
        out.push_str("    ");
        out.push_str(name);
        out.push_str(": ");
        out.push_str(&val);
        out.push_str(";\n");
    }
    out.push('}');
    out
}

/// Builds the custom HTML `<head>` containing the offline base64 `@font-face` for `Figtree.woff2`,
/// offline `:root` `--cdn_url_*` SVG data URLs, and all YNAB Ember & Glimmer CSS stylesheets
/// in exact cascade order.
pub fn build_embedded_head_html() -> String {
    let font_b64 = BASE64_STANDARD.encode(FIGTREE_WOFF2);
    let figtree_font_face = format!(
        r#"@font-face {{
    font-family: "Figtree";
    font-style: normal;
    font-weight: 100 900;
    font-display: swap;
    src: url("data:font/woff2;base64,{font_b64}") format("woff2");
}}"#
    );
    let cdn_root_vars = build_cdn_url_root_vars();

    format!(
        r#"<style>
{figtree_font_face}
{cdn_root_vars}

{YNAB_BUNDLED_CSS}
{ACCOUNTS_CSS}
{BILLBOARD_CSS}
{EMBER_GLIMMER_COMPONENTS_CSS}

/* Authoritative Offline Cascade Overrides (must appear LAST after normalize.css & Inline Style 2) */
{figtree_font_face}
{cdn_root_vars}
html, body, #main {{
    margin: 0 !important;
    padding: 0 !important;
    width: 100%;
    height: 100%;
    overflow: hidden !important;
    font-family: "Figtree", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
}}
button, input, select, textarea {{
    font-family: "Figtree", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
}}
.layout {{
    height: 100vh !important;
    max-height: 100vh !important;
    margin-top: 0 !important;
}}
</style>"#
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_head_assets_embeds_font_cdn_urls_and_cascade_order() {
        let head = build_embedded_head_html();
        assert!(head.contains("@font-face"));
        assert!(head.contains("data:font/woff2;base64,"));
        assert!(head.contains("--cdn_url_dashboard_books_svg: url(\"data:image/svg+xml;base64,"));
        assert!(head.contains("--cdn_url_ynab-tree-logo_svg: url(\"data:image/svg+xml;base64,"));
        assert!(head.contains("--cdn_url_ynab-primary-logo_svg: url(\"data:image/svg+xml;base64,"));
        assert!(
            head.contains("--cdn_url_reconcile_checkmark_svg: url(\"data:image/svg+xml;base64,")
        );
        assert!(head.contains("--cdn_url_inspector_calendar_svg: url(\"data:image/svg+xml;base64,"));

        let bundled_pos = head.find(".budget-header").expect("bundled css");
        let accounts_pos = head
            .find("/* YNAB Accounts Register Styling matching Ember port 4200 */")
            .expect("accounts css");
        let billboard_pos = head
            .find("billboard.js project is licensed under the MIT license")
            .expect("billboard css");
        let glimmer_pos = head
            .find(".ynab-new-settings-menu.plan-menu-popover")
            .expect("glimmer css");
        let override_pos = head
            .rfind("height: 100vh !important;")
            .expect("authoritative layout override");

        assert!(bundled_pos < accounts_pos);
        assert!(accounts_pos < billboard_pos);
        assert!(billboard_pos < glimmer_pos);
        assert!(glimmer_pos < override_pos);
    }
}
