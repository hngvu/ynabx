//! Core UI Primitives for `ynab-desktop` (`SvgIconSprite`, `Icon`, `YnabButton`, `GhostButton`,
//! `YnabCheckbox`, `YnabModal`, `YnabDialog`, `ModalDialog`, `FieldWithError`, `ShortcutKeys`, `YnabMenu`).
//! Mirrors the exact YNAB Glimmer/Ember DOM structure and CSS tokens with zero hardcoded slate hexes.

#![deny(clippy::float_arithmetic)]

use dioxus::prelude::*;

use crate::interaction::SHORTCUT_DEFINITIONS;
use crate::state::AppStore;

const ICON_SPRITE_SVG: &str = include_str!("../../assets/icon_sprite.svg");

/// Maps legacy/React icon names to verified symbol IDs inside `assets/icon_sprite.svg`.
pub fn resolve_sprite_icon_name(name: &str) -> &str {
    match name {
        "arrow_right_arrow_left" | "arrow_left_arrow_right" | "swap" | "transfer" => {
            "arrows_horizontal"
        }
        "notes" | "note" => "memo",
        "edit" => "pencil",
        "dot" => "circle_small_fill",
        "ellipsis_horizontal" => "more_horizontal",
        "star_fill" => "star",
        "exclamation_triangle" | "warning" => "exclamation_mark_triangle_fill",
        "exclamation_circle" | "exclamation_mark" => "exclamation_mark_circle_fill",
        "arrows_rotate" | "sync" => "refresh",
        "checkmark" | "check_mark" => "check",
        "minus" => "subtract",
        "x" => "close",
        other => other,
    }
}

fn parse_width_px_approx(raw: &str) -> Option<i64> {
    let s = raw.trim();
    if let Some(px) = s.strip_suffix("px") {
        let int_part = px.trim().split('.').next().unwrap_or("");
        return int_part.parse::<i64>().ok();
    }
    if let Some(rem) = s.strip_suffix("rem") {
        let mut parts = rem.trim().split('.');
        let whole = parts.next().unwrap_or("0").parse::<i64>().ok()?;
        let frac_raw = parts.next().unwrap_or("0");
        let frac_2 = format!("{frac_raw:0<2}");
        let hundredths = frac_2
            .get(..2)
            .and_then(|d| d.parse::<i64>().ok())
            .unwrap_or(0);
        return Some(whole.saturating_mul(16) + hundredths.saturating_mul(16) / 100);
    }
    s.parse::<i64>().ok()
}

fn dialog_size_class(width: &str) -> &'static str {
    match parse_width_px_approx(width) {
        Some(px) if px > 860 => "xx-large",
        Some(px) if px > 680 => "x-large",
        Some(px) if px > 520 => "large",
        _ => "regular",
    }
}

fn normalize_classes(parts: &[&str]) -> String {
    parts
        .iter()
        .flat_map(|p| p.split_whitespace())
        .collect::<Vec<_>>()
        .join(" ")
}

/// Injects the 178-symbol SVG icon sprite directly into the application DOM (`#icon_sprite`).
#[component]
pub fn SvgIconSprite() -> Element {
    rsx! {
        div {
            id: "icon_sprite",
            aria_hidden: "true",
            tabindex: "-1",
            style: "display:block;width:0;height:0;position:absolute;top:0;right:0;overflow:hidden",
            dangerous_inner_html: "{ICON_SPRITE_SVG}",
        }
    }
}

/// Renders an SVG icon referencing `#icon_sprite_<resolved_name>` from the embedded YNAB icon sprite.
#[component]
pub fn Icon(
    name: String,
    #[props(default = 16)] width: u32,
    #[props(default = 0)] height: u32,
    #[props(default = String::new())] class: String,
    #[props(default = String::new())] style: String,
    #[props(default = String::new())] title: String,
    #[props(default)] role: Option<String>,
    #[props(default)] aria_label: Option<String>,
    #[props(default)] aria_hidden: Option<bool>,
    #[props(default)] children: Option<Element>,
) -> Element {
    let h = if height == 0 { width } else { height };
    let cls = if class.is_empty() {
        "ynab-new-icon".to_string()
    } else {
        format!("ynab-new-icon {class}")
    };
    let resolved = resolve_sprite_icon_name(&name);
    let href = format!("#icon_sprite_{resolved}");
    let hidden_attr = aria_hidden.map(|b| if b { "true" } else { "false" });

    rsx! {
        svg {
            class: "{cls}",
            width: "{width}",
            height: "{h}",
            style: if !style.is_empty() { "{style}" } else { "" },
            role: role,
            "aria-label": aria_label,
            "aria-hidden": hidden_attr,
            if !title.is_empty() {
                title { "{title}" }
            }
            r#use { href: "{href}" }
            if let Some(extra) = children {
                {extra}
            }
        }
    }
}

/// Renders a YNAB Glimmer button (`ynab-button primary | secondary | destructive | transparent | contrast`).
#[component]
pub fn YnabButton(
    #[props(default = "primary".to_string())] variant: String,
    #[props(default = String::new())] class: String,
    #[props(default = false)] disabled: bool,
    #[props(default = false)] is_large: bool,
    #[props(default = false)] is_icon_only: bool,
    #[props(default = "button".to_string())] r#type: String,
    #[props(default = String::new())] title: String,
    #[props(default = String::new())] style: String,
    #[props(default)] aria_label: Option<String>,
    #[props(default)] href: Option<String>,
    onclick: Option<EventHandler<MouseEvent>>,
    children: Element,
) -> Element {
    let full_cls = normalize_classes(&[
        "ynab-button",
        &variant,
        if is_large { "is-large" } else { "" },
        if is_icon_only { "is-icon-only" } else { "" },
        &class,
    ]);

    if let Some(url) = href {
        return rsx! {
            a {
                class: "{full_cls}",
                href: "{url}",
                aria_disabled: disabled,
                aria_label: aria_label,
                title: if !title.is_empty() { "{title}" } else { "" },
                style: if !style.is_empty() { "{style}" } else { "" },
                onclick: move |evt| {
                    if disabled {
                        evt.prevent_default();
                        return;
                    }
                    if let Some(handler) = &onclick {
                        handler.call(evt);
                    }
                },
                {children}
            }
        };
    }

    rsx! {
        button {
            class: "{full_cls}",
            r#type: "{r#type}",
            disabled: disabled,
            aria_label: aria_label,
            title: if !title.is_empty() { "{title}" } else { "" },
            style: if !style.is_empty() { "{style}" } else { "" },
            onclick: move |evt| {
                if let Some(handler) = &onclick {
                    handler.call(evt);
                }
            },
            {children}
        }
    }
}

/// Renders a YNAB Glimmer ghost button (`ghost-button primary | secondary | destructive | transparent`).
#[component]
pub fn GhostButton(
    #[props(default = "secondary".to_string())] variant: String,
    #[props(default = "body".to_string())] type_size: String,
    #[props(default = false)] disabled: bool,
    #[props(default = false)] is_icon_only: bool,
    #[props(default = false)] is_dropdown: bool,
    #[props(default = "button".to_string())] r#type: String,
    #[props(default = String::new())] class: String,
    #[props(default = String::new())] title: String,
    #[props(default = String::new())] style: String,
    #[props(default)] aria_label: Option<String>,
    #[props(default)] href: Option<String>,
    #[props(default)] onclick: Option<EventHandler<MouseEvent>>,
    children: Element,
) -> Element {
    let size_cls = if type_size == "body" {
        "type-body"
    } else {
        "type-body-large"
    };
    let full_cls = normalize_classes(&[
        "ghost-button",
        &variant,
        if is_icon_only { "is-icon-only" } else { "" },
        if is_dropdown { "is-dropdown" } else { "" },
        size_cls,
        &class,
    ]);

    if let Some(url) = href {
        return rsx! {
            a {
                class: "{full_cls}",
                href: "{url}",
                aria_disabled: disabled,
                aria_label: aria_label,
                title: if !title.is_empty() { "{title}" } else { "" },
                style: if !style.is_empty() { "{style}" } else { "" },
                onclick: move |evt| {
                    if disabled {
                        evt.prevent_default();
                        return;
                    }
                    if let Some(handler) = &onclick {
                        handler.call(evt);
                    }
                },
                {children}
            }
        };
    }

    rsx! {
        button {
            class: "{full_cls}",
            r#type: "{r#type}",
            disabled: disabled,
            aria_label: aria_label,
            title: if !title.is_empty() { "{title}" } else { "" },
            style: if !style.is_empty() { "{style}" } else { "" },
            onclick: move |evt| {
                if let Some(handler) = &onclick {
                    handler.call(evt);
                }
            },
            {children}
        }
    }
}

/// Renders an authentic YNAB Glimmer checkbox (`button.ynab-checkbox.ynab-checkbox-button`).
#[component]
pub fn YnabCheckbox(
    #[props(default = false)] is_checked: bool,
    #[props(default = false)] is_partially_checked: bool,
    #[props(default = false)] disabled: bool,
    #[props(default = String::new())] title: String,
    #[props(default = String::new())] class: String,
    #[props(default)] aria_label: Option<String>,
    #[props(default)] onchange: Option<EventHandler<bool>>,
    #[props(default)] onclick: Option<EventHandler<MouseEvent>>,
    #[props(default)] children: Option<Element>,
) -> Element {
    let checked_state = if is_checked {
        if is_partially_checked {
            "mixed"
        } else {
            "true"
        }
    } else {
        "false"
    };
    let cls = normalize_classes(&[
        "ynab-checkbox ynab-checkbox-button",
        if disabled { "is-disabled" } else { "" },
        if is_checked { "is-checked" } else { "" },
        &class,
    ]);
    let square_cls = normalize_classes(&[
        "ynab-checkbox-button-square",
        if is_checked { "is-checked" } else { "" },
        if is_partially_checked {
            "is-partial"
        } else {
            ""
        },
    ]);

    rsx! {
        button {
            class: "{cls}",
            role: "checkbox",
            aria_checked: "{checked_state}",
            aria_label: aria_label,
            r#type: "button",
            disabled: disabled,
            onclick: move |evt| {
                if disabled {
                    return;
                }
                if let Some(handler) = &onchange {
                    handler.call(!is_checked);
                }
                if let Some(handler) = &onclick {
                    handler.call(evt);
                }
            },
            Icon {
                class: "{square_cls}",
                name: if is_partially_checked { "subtract" } else { "check" },
                width: 13,
            }
            if let Some(label_el) = children {
                div {
                    class: "label-checkbox",
                    title: if !title.is_empty() { "{title}" } else { "" },
                    {label_el}
                }
            }
        }
    }
}

/// Modal header primitive matching `Modal.Header` (`.modal-fresh-header`).
#[component]
pub fn ModalHeader(
    #[props(default = String::new())] class: String,
    #[props(default = false)] undismissable: bool,
    #[props(default)] onclose: Option<EventHandler<MouseEvent>>,
    children: Element,
) -> Element {
    let cls = normalize_classes(&["modal-fresh-header", &class]);
    rsx! {
        div {
            class: "{cls}",
            div { class: "modal-fresh-title", {children} }
            if !undismissable {
                button {
                    class: "modal-fresh-close",
                    aria_label: "Close",
                    title: "Close",
                    r#type: "button",
                    onclick: move |evt| {
                        if let Some(handler) = &onclose {
                            handler.call(evt);
                        }
                    },
                    Icon { name: "close", width: 14 }
                }
            }
        }
    }
}

/// Modal hero primitive matching `Modal.Hero` (`.modal-fresh-hero`).
#[component]
pub fn ModalHero(#[props(default = String::new())] class: String, children: Element) -> Element {
    let cls = normalize_classes(&["modal-fresh-hero", &class]);
    rsx! {
        div { class: "{cls}", {children} }
    }
}

/// Modal body primitive matching `Modal.Body` (`.modal-fresh-body`).
#[component]
pub fn ModalBody(
    #[props(default = String::new())] class: String,
    #[props(default = false)] scrollable: bool,
    children: Element,
) -> Element {
    let cls = normalize_classes(&[
        "modal-fresh-body",
        if scrollable { "scrollable" } else { "" },
        &class,
    ]);
    rsx! {
        div { class: "{cls}", {children} }
    }
}

/// Modal footer primitive matching `Modal.Footer` (`.modal-fresh-footer`).
#[component]
pub fn ModalFooter(
    #[props(default = String::new())] class: String,
    #[props(default = false)] with_top_border: bool,
    children: Element,
) -> Element {
    let cls = normalize_classes(&[
        "modal-fresh-footer",
        if with_top_border {
            "with-top-border"
        } else {
            ""
        },
        &class,
    ]);
    rsx! {
        div { class: "{cls}", {children} }
    }
}

/// Renders a YNAB Glimmer popover/fresh modal (`.modal-overlay.active > .modal` with optional `svg.modal-arrow`).
#[component]
pub fn YnabModal(
    #[props(default)] id: Option<String>,
    #[props(default = String::new())] class: String,
    #[props(default = true)] active: bool,
    #[props(default = "none".to_string())] arrow: String,
    #[props(default)] arrow_transform: Option<String>,
    #[props(default = String::new())] modal_style: String,
    #[props(default)] onclose: Option<EventHandler<MouseEvent>>,
    children: Element,
) -> Element {
    let overlay_cls =
        normalize_classes(&["modal-overlay", if active { "active" } else { "" }, &class]);
    let show_arrow = arrow != "none" && !arrow.is_empty();

    rsx! {
        div {
            id: id,
            class: "{overlay_cls}",
            onclick: move |evt| {
                if let Some(handler) = &onclose {
                    handler.call(evt);
                }
            },
            div {
                class: "modal",
                role: "dialog",
                aria_modal: "true",
                style: if !modal_style.is_empty() { "{modal_style}" } else { "" },
                onclick: move |evt| evt.stop_propagation(),
                {children}
                if show_arrow {
                    svg {
                        class: "modal-arrow",
                        view_box: "0 0 100 100",
                        preserve_aspect_ratio: "none",
                        path {
                            d: "M 0 100 L 50 0 L 100 100 L 0 100 Z",
                            transform: arrow_transform,
                        }
                    }
                }
            }
        }
    }
}

/// Dialog header primitive matching `Dialog.Header` (`.dialog-header`).
#[component]
pub fn DialogHeader(
    #[props(default = String::new())] class: String,
    #[props(default = false)] undismissable: bool,
    #[props(default)] onclose: Option<EventHandler<MouseEvent>>,
    children: Element,
) -> Element {
    let cls = normalize_classes(&["dialog-header", &class]);
    rsx! {
        div {
            class: "{cls}",
            div { class: "dialog-title", {children} }
            if !undismissable {
                button {
                    class: "dialog-close",
                    aria_label: "Close",
                    title: "Close",
                    r#type: "button",
                    onclick: move |evt| {
                        if let Some(handler) = &onclose {
                            handler.call(evt);
                        }
                    },
                    Icon { name: "close", width: 14 }
                }
            }
        }
    }
}

/// Dialog hero primitive matching `Dialog.Hero` (`.dialog-hero`).
#[component]
pub fn DialogHero(#[props(default = String::new())] class: String, children: Element) -> Element {
    let cls = normalize_classes(&["dialog-hero", &class]);
    rsx! {
        div { class: "{cls}", {children} }
    }
}

/// Dialog body primitive matching `Dialog.Body` (`.dialog-body`).
#[component]
pub fn DialogBody(#[props(default = String::new())] class: String, children: Element) -> Element {
    let cls = normalize_classes(&["dialog-body", &class]);
    rsx! {
        div { class: "{cls}", {children} }
    }
}

/// Dialog footer primitive matching `Dialog.Footer` (`.dialog-footer`).
#[component]
pub fn DialogFooter(
    #[props(default = String::new())] class: String,
    #[props(default = false)] footer_border: bool,
    children: Element,
) -> Element {
    let cls = normalize_classes(&[
        "dialog-footer",
        if footer_border { "footer-border" } else { "" },
        &class,
    ]);
    rsx! {
        div { class: "{cls}", {children} }
    }
}

/// Renders an authentic YNAB Glimmer dialog (`.dialog-overlay.active > .dialog.{size}`).
#[component]
pub fn YnabDialog(
    #[props(default)] id: Option<String>,
    #[props(default = String::new())] class: String,
    #[props(default = true)] active: bool,
    #[props(default = "regular".to_string())] size: String,
    #[props(default = false)] undismissable: bool,
    #[props(default = String::new())] dialog_style: String,
    #[props(default)] onclose: Option<EventHandler<MouseEvent>>,
    children: Element,
) -> Element {
    let overlay_cls =
        normalize_classes(&["dialog-overlay", if active { "active" } else { "" }, &class]);
    let dialog_cls = normalize_classes(&["dialog", &size]);

    rsx! {
        div {
            id: id,
            class: "{overlay_cls}",
            onclick: move |evt| {
                if !undismissable {
                    if let Some(handler) = &onclose {
                        handler.call(evt);
                    }
                }
            },
            div {
                class: "{dialog_cls}",
                role: "dialog",
                aria_modal: "true",
                style: if !dialog_style.is_empty() { "{dialog_style}" } else { "" },
                onclick: move |evt| evt.stop_propagation(),
                {children}
            }
        }
    }
}

/// Renders an authentic YNAB Dialog (`dialog-overlay active > dialog`) with backwards-compatible props.
#[component]
pub fn ModalDialog(
    title: String,
    #[props(default = String::new())] class: String,
    #[props(default = "480px".to_string())] width: String,
    onclose: EventHandler<MouseEvent>,
    children: Element,
    footer: Option<Element>,
) -> Element {
    let size_cls = dialog_size_class(&width);
    let overlay_cls = normalize_classes(&["dialog-overlay active ynab-u", &class]);
    let dialog_cls = normalize_classes(&["dialog", size_cls]);
    let custom_width_style = if width.trim().is_empty() || width.trim() == "480px" {
        String::new()
    } else {
        format!("width: {width}; max-width: min({width}, 94vw);")
    };

    rsx! {
        div {
            class: "{overlay_cls}",
            onclick: move |evt| onclose.call(evt),
            div {
                class: "{dialog_cls}",
                role: "dialog",
                aria_modal: "true",
                style: if !custom_width_style.is_empty() { "{custom_width_style}" } else { "" },
                onclick: move |evt| evt.stop_propagation(),
                div {
                    class: "dialog-header",
                    div {
                        class: "dialog-title",
                        h2 { "{title}" }
                    }
                    button {
                        class: "dialog-close",
                        r#type: "button",
                        aria_label: "Close Modal",
                        title: "Close",
                        onclick: move |evt| onclose.call(evt),
                        Icon { name: "close", width: 14 }
                    }
                }
                div {
                    class: "scroll-content",
                    div {
                        class: "dialog-body",
                        {children}
                    }
                }
                if let Some(footer_el) = footer {
                    div {
                        class: "dialog-footer",
                        {footer_el}
                    }
                }
            }
        }
    }
}

/// Renders field validation errors and warnings matching `components/field-with-error.hbs`.
#[component]
pub fn FieldWithError(
    #[props(default = Vec::new())] errors: Vec<String>,
    #[props(default = Vec::new())] warnings: Vec<String>,
    #[props(default = "formField".to_string())] style_type: String,
    #[props(default)] errors_id: Option<String>,
    #[props(default = String::new())] class: String,
    children: Element,
) -> Element {
    let has_errors = !errors.is_empty();
    let has_warnings = !warnings.is_empty();
    let base_error = style_type == "base";
    let full_cls = normalize_classes(&[
        "field-with-error",
        if has_errors { "has-errors" } else { "" },
        if has_warnings { "has-warnings" } else { "" },
        if base_error { "base-error" } else { "" },
        &class,
    ]);

    rsx! {
        div {
            class: "{full_cls}",
            div { {children} }
            if has_errors {
                ul {
                    class: "errors",
                    id: errors_id,
                    for (idx, msg) in errors.iter().enumerate() {
                        li { key: "{idx}", "{msg}" }
                    }
                }
            }
            if has_warnings {
                ul {
                    class: "warnings",
                    for (idx, msg) in warnings.iter().enumerate() {
                        li { key: "{idx}", "{msg}" }
                    }
                }
            }
        }
    }
}

/// Renders keyboard shortcut keycaps matching `components/keyboard-shortcuts/shortcut-keys`.
#[component]
pub fn ShortcutKeys(
    shortcut: String,
    #[props(default = false)] always_show: bool,
    #[props(default = String::new())] class: String,
) -> Element {
    if !always_show {
        if let Some(store) = try_use_context::<AppStore>() {
            if *store.shortcuts_disabled.read() {
                return rsx! {};
            }
        }
    }

    let label = SHORTCUT_DEFINITIONS
        .iter()
        .find(|def| def.id == shortcut)
        .map(|def| def.keys_label)
        .unwrap_or(shortcut.as_str());

    let keys: Vec<String> = label
        .split('+')
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(str::to_string)
        .collect();

    if keys.is_empty() {
        return rsx! {};
    }

    let cls = normalize_classes(&["shortcut-keys", &class]);
    rsx! {
        div {
            class: "{cls}",
            for (idx, key_text) in keys.into_iter().enumerate() {
                span {
                    key: "{idx}",
                    class: if key_text.eq_ignore_ascii_case("then") {
                        "shortcut-key shortcut-then-key"
                    } else {
                        "shortcut-key"
                    },
                    "{key_text}"
                }
            }
        }
    }
}

/// Renders a YNAB Glimmer menu container (`div.menu.js-menu`).
#[component]
pub fn YnabMenu(
    #[props(default)] id: Option<String>,
    #[props(default = String::new())] class: String,
    #[props(default = String::new())] style: String,
    children: Element,
) -> Element {
    let cls = normalize_classes(&["menu js-menu", &class]);
    rsx! {
        div {
            id: id,
            class: "{cls}",
            role: "menu",
            style: if !style.is_empty() { "{style}" } else { "" },
            onclick: move |evt| evt.stop_propagation(),
            {children}
        }
    }
}

/// Renders a YNAB Glimmer menu item (`button.menu-item.js-menu-item` or `a.menu-item.js-menu-item`).
#[component]
pub fn MenuItem(
    #[props(default)] id: Option<String>,
    #[props(default = String::new())] class: String,
    #[props(default)] href: Option<String>,
    #[props(default = false)] disabled: bool,
    #[props(default)] leading_icon: Option<String>,
    #[props(default)] subtext: Option<String>,
    #[props(default = false)] disclosure: bool,
    #[props(default)] target: Option<String>,
    #[props(default)] rel: Option<String>,
    #[props(default)] onclick: Option<EventHandler<MouseEvent>>,
    children: Element,
) -> Element {
    let cls = normalize_classes(&["menu-item js-menu-item", &class]);

    if let Some(url) = href {
        return rsx! {
            a {
                id: id,
                href: "{url}",
                target: target,
                rel: rel,
                class: "{cls}",
                role: "menuitem",
                aria_disabled: disabled,
                onclick: move |evt| {
                    if disabled {
                        evt.prevent_default();
                        return;
                    }
                    if let Some(handler) = &onclick {
                        handler.call(evt);
                    }
                },
                if let Some(icon_name) = leading_icon {
                    Icon { name: "{icon_name}", width: 16 }
                }
                if let Some(sub) = subtext {
                    div {
                        class: "menu-item-subtext",
                        div { {children} }
                        div { "{sub}" }
                    }
                } else {
                    {children}
                }
                if disclosure {
                    Icon { name: "chevron_right", class: "menu-item-disclosure", width: 12 }
                }
            }
        };
    }

    rsx! {
        button {
            id: id,
            r#type: "button",
            class: "{cls}",
            role: "menuitem",
            disabled: disabled,
            onclick: move |evt| {
                if let Some(handler) = &onclick {
                    handler.call(evt);
                }
            },
            if let Some(icon_name) = leading_icon {
                Icon { name: "{icon_name}", width: 16 }
            }
            if let Some(sub) = subtext {
                div {
                    class: "menu-item-subtext",
                    div { {children} }
                    div { "{sub}" }
                }
            } else {
                {children}
            }
            if disclosure {
                Icon { name: "chevron_right", class: "menu-item-disclosure", width: 12 }
            }
        }
    }
}

/// Renders a YNAB Glimmer menu section heading (`div.menu-heading`).
#[component]
pub fn MenuHeading(children: Element) -> Element {
    rsx! {
        div { class: "menu-heading", {children} }
    }
}

/// Renders a YNAB Glimmer menu separator (`div.menu-separator`).
#[component]
pub fn MenuSeparator() -> Element {
    rsx! {
        div { class: "menu-separator", role: "separator" }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_resolve_sprite_icon_name_maps_aliases_to_real_symbols() {
        for alias in [
            "arrow_right_arrow_left",
            "arrow_left_arrow_right",
            "notes",
            "edit",
            "dot",
            "ellipsis_horizontal",
            "star_fill",
            "exclamation_triangle",
            "exclamation_circle",
            "arrows_rotate",
        ] {
            let resolved = resolve_sprite_icon_name(alias);
            let needle = format!(r#"id="icon_sprite_{resolved}""#);
            assert!(
                ICON_SPRITE_SVG.contains(&needle),
                "resolved icon `{resolved}` for alias `{alias}` must exist in icon_sprite.svg"
            );
        }
        assert_eq!(resolve_sprite_icon_name("pencil"), "pencil");
    }

    #[test]
    fn test_dialog_size_class_buckets() {
        assert_eq!(dialog_size_class("480px"), "regular");
        assert_eq!(dialog_size_class("27.4375rem"), "regular");
        assert_eq!(dialog_size_class("600px"), "large");
        assert_eq!(dialog_size_class("760px"), "x-large");
        assert_eq!(dialog_size_class("960px"), "xx-large");
    }
}
