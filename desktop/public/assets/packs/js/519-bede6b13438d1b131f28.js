"use strict";
(self.webpackChunkynab_api = self.webpackChunkynab_api || []).push([
    [519], {
        6519: function(t, e, n) {
            n.d(e, {
                A: function() {
                    return Z
                }
            });
            const a = "a[data-confirm], a[data-method], a[data-remote]:not([disabled]), a[data-disable-with], a[data-disable]",
                o = {
                    selector: "button[data-remote]:not([form]), button[data-confirm]:not([form])",
                    exclude: "form button"
                },
                r = "select[data-remote], input[data-remote], textarea[data-remote]",
                i = "form:not([data-turbo=true])",
                u = "form:not([data-turbo=true]) input[type=submit], form:not([data-turbo=true]) input[type=image], form:not([data-turbo=true]) button[type=submit], form:not([data-turbo=true]) button:not([type]), input[type=submit][form], input[type=image][form], button[type=submit][form], button[form]:not([type])",
                c = "input[data-disable-with]:enabled, button[data-disable-with]:enabled, textarea[data-disable-with]:enabled, input[data-disable]:enabled, button[data-disable]:enabled, textarea[data-disable]:enabled",
                s = "input[data-disable-with]:disabled, button[data-disable-with]:disabled, textarea[data-disable-with]:disabled, input[data-disable]:disabled, button[data-disable]:disabled, textarea[data-disable]:disabled",
                l = "a[data-disable-with], a[data-disable]",
                d = "button[data-remote][data-disable-with], button[data-remote][data-disable]";
            let m = null;
            const p = () => {
                    const t = document.querySelector("meta[name=csp-nonce]");
                    return m = t && t.content
                },
                f = () => m || p(),
                b = Element.prototype.matches || Element.prototype.matchesSelector || Element.prototype.mozMatchesSelector || Element.prototype.msMatchesSelector || Element.prototype.oMatchesSelector || Element.prototype.webkitMatchesSelector,
                h = function(t, e) {
                    return e.exclude ? b.call(t, e.selector) && !b.call(t, e.exclude) : b.call(t, e)
                },
                y = "_ujsData",
                j = (t, e) => t[y] ? t[y][e] : void 0,
                v = function(t, e, n) {
                    return t[y] || (t[y] = {}), t[y][e] = n
                },
                E = t => Array.prototype.slice.call(document.querySelectorAll(t)),
                g = function(t) {
                    var e = !1;
                    do {
                        if (t.isContentEditable) {
                            e = !0;
                            break
                        }
                        t = t.parentElement
                    } while (t);
                    return e
                },
                w = () => {
                    const t = document.querySelector("meta[name=csrf-token]");
                    return t && t.content
                },
                x = () => {
                    const t = document.querySelector("meta[name=csrf-param]");
                    return t && t.content
                },
                k = t => {
                    const e = w();
                    if (e) return t.setRequestHeader("X-CSRF-Token", e)
                },
                S = () => {
                    const t = w(),
                        e = x();
                    if (t && e) return E('form input[name="' + e + '"]').forEach((e => e.value = t))
                },
                C = {
                    "*": "*/*",
                    text: "text/plain",
                    html: "text/html",
                    xml: "application/xml, text/xml",
                    json: "application/json, text/javascript",
                    script: "text/javascript, application/javascript, application/ecmascript, application/x-ecmascript"
                },
                T = t => {
                    t = A(t);
                    var e = D(t, (function() {
                        const n = M(null != e.response ? e.response : e.responseText, e.getResponseHeader("Content-Type"));
                        return 2 === Math.floor(e.status / 100) ? "function" === typeof t.success && t.success(n, e.statusText, e) : "function" === typeof t.error && t.error(n, e.statusText, e), "function" === typeof t.complete ? t.complete(e, e.statusText) : void 0
                    }));
                    return !(t.beforeSend && !t.beforeSend(e, t)) && (e.readyState === XMLHttpRequest.OPENED ? e.send(t.data) : void 0)
                };
            var A = function(t) {
                    return t.url = t.url || location.href, t.type = t.type.toUpperCase(), "GET" === t.type && t.data && (t.url.indexOf("?") < 0 ? t.url += "?" + t.data : t.url += "&" + t.data), t.dataType in C || (t.dataType = "*"), t.accept = C[t.dataType], "*" !== t.dataType && (t.accept += ", */*; q=0.01"), t
                },
                D = function(t, e) {
                    const n = new XMLHttpRequest;
                    return n.open(t.type, t.url, !0), n.setRequestHeader("Accept", t.accept), "string" === typeof t.data && n.setRequestHeader("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8"), t.crossDomain || (n.setRequestHeader("X-Requested-With", "XMLHttpRequest"), k(n)), n.withCredentials = !!t.withCredentials, n.onreadystatechange = function() {
                        if (n.readyState === XMLHttpRequest.DONE) return e(n)
                    }, n
                },
                M = function(t, e) {
                    if ("string" === typeof t && "string" === typeof e)
                        if (e.match(/\bjson\b/)) try {
                            t = JSON.parse(t)
                        } catch (n) {} else if (e.match(/\b(?:java|ecma)script\b/)) {
                            const e = document.createElement("script");
                            e.setAttribute("nonce", f()), e.text = t, document.head.appendChild(e).parentNode.removeChild(e)
                        } else if (e.match(/\b(xml|html|svg)\b/)) {
                        const n = new DOMParser;
                        e = e.replace(/;.+/, "");
                        try {
                            t = n.parseFromString(t, e)
                        } catch (a) {}
                    }
                    return t
                };
            const L = function(t) {
                const e = document.createElement("a");
                e.href = location.href;
                const n = document.createElement("a");
                try {
                    return n.href = t, !((!n.protocol || ":" === n.protocol) && !n.host || e.protocol + "//" + e.host === n.protocol + "//" + n.host)
                } catch (a) {
                    return !0
                }
            };
            let R, {
                CustomEvent: q
            } = window;
            "function" !== typeof q && (q = function(t, e) {
                const n = document.createEvent("CustomEvent");
                return n.initCustomEvent(t, e.bubbles, e.cancelable, e.detail), n
            }, q.prototype = window.Event.prototype, ({
                preventDefault: R
            } = q.prototype), q.prototype.preventDefault = function() {
                const t = R.call(this);
                return this.cancelable && !this.defaultPrevented && Object.defineProperty(this, "defaultPrevented", {
                    get() {
                        return !0
                    }
                }), t
            });
            const H = (t, e, n) => {
                    const a = new q(e, {
                        bubbles: !0,
                        cancelable: !0,
                        detail: n
                    });
                    return t.dispatchEvent(a), !a.defaultPrevented
                },
                P = t => {
                    H(t.target, "ujs:everythingStopped"), t.preventDefault(), t.stopPropagation(), t.stopImmediatePropagation()
                },
                O = (t, e, n, a) => t.addEventListener(n, (function(t) {
                    let {
                        target: n
                    } = t;
                    for (; n instanceof Element && !h(n, e);) n = n.parentNode;
                    n instanceof Element && !1 === a.call(n, t) && (t.preventDefault(), t.stopPropagation())
                })),
                _ = t => Array.prototype.slice.call(t),
                I = (t, e) => {
                    let n = [t];
                    h(t, "form") && (n = _(t.elements));
                    const a = [];
                    return n.forEach((function(t) {
                        t.name && !t.disabled && (h(t, "fieldset[disabled] *") || (h(t, "select") ? _(t.options).forEach((function(e) {
                            e.selected && a.push({
                                name: t.name,
                                value: e.value
                            })
                        })) : (t.checked || -1 === ["radio", "checkbox", "submit"].indexOf(t.type)) && a.push({
                            name: t.name,
                            value: t.value
                        })))
                    })), e && a.push(e), a.map((function(t) {
                        return t.name ? `${encodeURIComponent(t.name)}=${encodeURIComponent(t.value)}` : t
                    })).join("&")
                },
                N = (t, e) => h(t, "form") ? _(t.elements).filter((t => h(t, e))) : _(t.querySelectorAll(e));
            var X = function(t, e) {
                let n;
                const a = t.getAttribute("data-confirm");
                if (!a) return !0;
                let o = !1;
                if (H(t, "confirm")) {
                    try {
                        o = e.confirm(a, t)
                    } catch (r) {}
                    n = H(t, "confirm:complete", [o])
                }
                return o && n
            };
            const $ = function(t) {
                    this.disabled && P(t)
                },
                F = t => {
                    let e;
                    if (t instanceof Event) {
                        if (V(t)) return;
                        e = t.target
                    } else e = t;
                    if (!g(e)) return h(e, l) ? G(e) : h(e, d) || h(e, s) ? J(e) : h(e, i) ? B(e) : void 0
                },
                Q = t => {
                    const e = t instanceof Event ? t.target : t;
                    if (!g(e)) return h(e, l) ? U(e) : h(e, d) || h(e, c) ? K(e) : h(e, i) ? z(e) : void 0
                };
            var U = function(t) {
                    if (j(t, "ujs:disabled")) return;
                    const e = t.getAttribute("data-disable-with");
                    return null != e && (v(t, "ujs:enable-with", t.innerHTML), t.innerHTML = e), t.addEventListener("click", P), v(t, "ujs:disabled", !0)
                },
                G = function(t) {
                    const e = j(t, "ujs:enable-with");
                    return null != e && (t.innerHTML = e, v(t, "ujs:enable-with", null)), t.removeEventListener("click", P), v(t, "ujs:disabled", null)
                },
                z = t => N(t, c).forEach(K),
                K = function(t) {
                    if (j(t, "ujs:disabled")) return;
                    const e = t.getAttribute("data-disable-with");
                    return null != e && (h(t, "button") ? (v(t, "ujs:enable-with", t.innerHTML), t.innerHTML = e) : (v(t, "ujs:enable-with", t.value), t.value = e)), t.disabled = !0, v(t, "ujs:disabled", !0)
                },
                B = t => N(t, s).forEach((t => J(t))),
                J = function(t) {
                    const e = j(t, "ujs:enable-with");
                    return null != e && (h(t, "button") ? t.innerHTML = e : t.value = e, v(t, "ujs:enable-with", null)), t.disabled = !1, v(t, "ujs:disabled", null)
                },
                V = function(t) {
                    const e = t.detail ? t.detail[0] : void 0;
                    return e && e.getResponseHeader("X-Xhr-Redirect")
                };
            const W = function(t) {
                    const e = this,
                        {
                            form: n
                        } = e;
                    if (n) return e.name && v(n, "ujs:submit-button", {
                        name: e.name,
                        value: e.value
                    }), v(n, "ujs:formnovalidate-button", e.formNoValidate), v(n, "ujs:submit-button-formaction", e.getAttribute("formaction")), v(n, "ujs:submit-button-formmethod", e.getAttribute("formmethod"))
                },
                Y = function(t) {
                    const e = (this.getAttribute("data-method") || "GET").toUpperCase(),
                        n = this.getAttribute("data-params"),
                        a = (t.metaKey || t.ctrlKey) && "GET" === e && !n;
                    (null != t.button && 0 !== t.button || a) && t.stopImmediatePropagation()
                },
                Z = {
                    $: E,
                    ajax: T,
                    buttonClickSelector: o,
                    buttonDisableSelector: d,
                    confirm: (t, e) => window.confirm(t),
                    cspNonce: f,
                    csrfToken: w,
                    csrfParam: x,
                    CSRFProtection: k,
                    delegate: O,
                    disableElement: Q,
                    enableElement: F,
                    fileInputSelector: "input[name][type=file]:not([disabled])",
                    fire: H,
                    formElements: N,
                    formEnableSelector: s,
                    formDisableSelector: c,
                    formInputClickSelector: u,
                    formSubmitButtonClick: W,
                    formSubmitSelector: i,
                    getData: j,
                    handleDisabledElement: $,
                    href: t => t.href,
                    inputChangeSelector: r,
                    isCrossDomain: L,
                    linkClickSelector: a,
                    linkDisableSelector: l,
                    loadCSPNonce: p,
                    matches: h,
                    preventInsignificantClick: Y,
                    refreshCSRFTokens: S,
                    serializeElement: I,
                    setData: v,
                    stopEverything: P
                },
                tt = (et = Z, function(t) {
                    X(this, et) || P(t)
                });
            var et;
            Z.handleConfirm = tt;
            const nt = (t => function(e) {
                const n = this,
                    a = n.getAttribute("data-method");
                if (!a) return;
                if (g(this)) return;
                const o = t.href(n),
                    r = w(),
                    i = x(),
                    u = document.createElement("form");
                let c = `<input name='_method' value='${a}' type='hidden' />`;
                i && r && !L(o) && (c += `<input name='${i}' value='${r}' type='hidden' />`), c += '<input type="submit" />', u.method = "post", u.action = o, u.target = n.target, u.innerHTML = c, u.style.display = "none", document.body.appendChild(u), u.querySelector('[type="submit"]').click(), P(e)
            })(Z);
            Z.handleMethod = nt;
            const at = (t => function(e) {
                let n, a, u;
                const c = this;
                if (! function(t) {
                        const e = t.getAttribute("data-remote");
                        return null != e && "false" !== e
                    }(c)) return !0;
                if (!H(c, "ajax:before")) return H(c, "ajax:stopped"), !1;
                if (g(c)) return H(c, "ajax:stopped"), !1;
                const s = c.getAttribute("data-with-credentials"),
                    l = c.getAttribute("data-type") || "script";
                if (h(c, i)) {
                    const t = j(c, "ujs:submit-button");
                    a = j(c, "ujs:submit-button-formmethod") || c.getAttribute("method") || "get", u = j(c, "ujs:submit-button-formaction") || c.getAttribute("action") || location.href, "GET" === a.toUpperCase() && (u = u.replace(/\?.*$/, "")), "multipart/form-data" === c.enctype ? (n = new FormData(c), null != t && n.append(t.name, t.value)) : n = I(c, t), v(c, "ujs:submit-button", null), v(c, "ujs:submit-button-formmethod", null), v(c, "ujs:submit-button-formaction", null)
                } else h(c, o) || h(c, r) ? (a = c.getAttribute("data-method"), u = c.getAttribute("data-url"), n = I(c, c.getAttribute("data-params"))) : (a = c.getAttribute("data-method"), u = t.href(c), n = c.getAttribute("data-params"));
                T({
                    type: a || "GET",
                    url: u,
                    data: n,
                    dataType: l,
                    beforeSend(t, e) {
                        return H(c, "ajax:beforeSend", [t, e]) ? H(c, "ajax:send", [t]) : (H(c, "ajax:stopped"), !1)
                    },
                    success(...t) {
                        return H(c, "ajax:success", t)
                    },
                    error(...t) {
                        return H(c, "ajax:error", t)
                    },
                    complete(...t) {
                        return H(c, "ajax:complete", t)
                    },
                    crossDomain: L(u),
                    withCredentials: null != s && "false" !== s
                }), P(e)
            })(Z);
            Z.handleRemote = at;
            if (Z.start = function() {
                    if (window._rails_loaded) throw new Error("rails-ujs has already been loaded!");
                    return window.addEventListener("pageshow", (function() {
                        E(s).forEach((function(t) {
                            j(t, "ujs:disabled") && F(t)
                        })), E(l).forEach((function(t) {
                            j(t, "ujs:disabled") && F(t)
                        }))
                    })), O(document, l, "ajax:complete", F), O(document, l, "ajax:stopped", F), O(document, d, "ajax:complete", F), O(document, d, "ajax:stopped", F), O(document, a, "click", Y), O(document, a, "click", $), O(document, a, "click", tt), O(document, a, "click", Q), O(document, a, "click", at), O(document, a, "click", nt), O(document, o, "click", Y), O(document, o, "click", $), O(document, o, "click", tt), O(document, o, "click", Q), O(document, o, "click", at), O(document, r, "change", $), O(document, r, "change", tt), O(document, r, "change", at), O(document, i, "submit", $), O(document, i, "submit", tt), O(document, i, "submit", at), O(document, i, "submit", (t => setTimeout((() => Q(t)), 13))), O(document, i, "ajax:send", Q), O(document, i, "ajax:complete", F), O(document, u, "click", Y), O(document, u, "click", $), O(document, u, "click", tt), O(document, u, "click", W), document.addEventListener("DOMContentLoaded", S), document.addEventListener("DOMContentLoaded", p), window._rails_loaded = !0
                }, "undefined" !== typeof jQuery && jQuery && jQuery.ajax) {
                if (jQuery.rails) throw new Error("If you load both jquery_ujs and rails-ujs, use rails-ujs only.");
                jQuery.rails = Z, jQuery.ajaxPrefilter((function(t, e, n) {
                    if (!t.crossDomain) return k(n)
                }))
            }
        }
    }
]);
//# sourceMappingURL=519-bede6b13438d1b131f28.js.map