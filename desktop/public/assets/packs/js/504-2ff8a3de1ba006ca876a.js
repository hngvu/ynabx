"use strict";
(self.webpackChunkynab_api = self.webpackChunkynab_api || []).push([
    [504], {
        4504: function(t, e, n) {
            var i = n(1576),
                r = n(6607),
                o = "tippy-content",
                a = "tippy-backdrop",
                s = "tippy-arrow",
                u = "tippy-svg-arrow",
                c = {
                    passive: !0,
                    capture: !0
                },
                p = function() {
                    return document.body
                };

            function f(t, e, n) {
                if (Array.isArray(t)) {
                    var i = t[e];
                    return null == i ? Array.isArray(n) ? n[e] : n : i
                }
                return t
            }

            function d(t, e) {
                var n = {}.toString.call(t);
                return 0 === n.indexOf("[object") && n.indexOf(e + "]") > -1
            }

            function l(t, e) {
                return "function" === typeof t ? t.apply(void 0, e) : t
            }

            function v(t, e) {
                return 0 === e ? t : function(i) {
                    clearTimeout(n), n = setTimeout((function() {
                        t(i)
                    }), e)
                };
                var n
            }

            function m(t) {
                return [].concat(t)
            }

            function b(t, e) {
                -1 === t.indexOf(e) && t.push(e)
            }

            function h(t) {
                return t.split("-")[0]
            }

            function g(t) {
                return [].slice.call(t)
            }

            function y(t) {
                return Object.keys(t).reduce((function(e, n) {
                    return void 0 !== t[n] && (e[n] = t[n]), e
                }), {})
            }

            function w() {
                return document.createElement("div")
            }

            function E(t) {
                return ["Element", "Fragment"].some((function(e) {
                    return d(t, e)
                }))
            }

            function T(t) {
                return d(t, "MouseEvent")
            }

            function A(t) {
                return !(!t || !t._tippy || t._tippy.reference !== t)
            }

            function x(t) {
                return E(t) ? [t] : function(t) {
                    return d(t, "NodeList")
                }(t) ? g(t) : Array.isArray(t) ? t : g(document.querySelectorAll(t))
            }

            function O(t, e) {
                t.forEach((function(t) {
                    t && (t.style.transitionDuration = e + "ms")
                }))
            }

            function C(t, e) {
                t.forEach((function(t) {
                    t && t.setAttribute("data-state", e)
                }))
            }

            function L(t) {
                var e, n = m(t)[0];
                return null != n && null != (e = n.ownerDocument) && e.body ? n.ownerDocument : document
            }

            function D(t, e, n) {
                var i = e + "EventListener";
                ["transitionend", "webkitTransitionEnd"].forEach((function(e) {
                    t[i](e, n)
                }))
            }

            function k(t, e) {
                for (var n = e; n;) {
                    var i;
                    if (t.contains(n)) return !0;
                    n = null == n.getRootNode || null == (i = n.getRootNode()) ? void 0 : i.host
                }
                return !1
            }
            var V = {
                    isTouch: !1
                },
                j = 0;

            function S() {
                V.isTouch || (V.isTouch = !0, window.performance && document.addEventListener("mousemove", I))
            }

            function I() {
                var t = performance.now();
                t - j < 20 && (V.isTouch = !1, document.removeEventListener("mousemove", I)), j = t
            }

            function M() {
                var t = document.activeElement;
                if (A(t)) {
                    var e = t._tippy;
                    t.blur && !e.state.isVisible && t.blur()
                }
            }
            var N = !!("undefined" !== typeof window && "undefined" !== typeof document) && !!window.msCrypto;
            var H = {
                    animateFill: !1,
                    followCursor: !1,
                    inlinePositioning: !1,
                    sticky: !1
                },
                U = Object.assign({
                    appendTo: p,
                    aria: {
                        content: "auto",
                        expanded: "auto"
                    },
                    delay: 0,
                    duration: [300, 250],
                    getReferenceClientRect: null,
                    hideOnClick: !0,
                    ignoreAttributes: !1,
                    interactive: !1,
                    interactiveBorder: 2,
                    interactiveDebounce: 0,
                    moveTransition: "",
                    offset: [0, 10],
                    onAfterUpdate: function() {},
                    onBeforeUpdate: function() {},
                    onCreate: function() {},
                    onDestroy: function() {},
                    onHidden: function() {},
                    onHide: function() {},
                    onMount: function() {},
                    onShow: function() {},
                    onShown: function() {},
                    onTrigger: function() {},
                    onUntrigger: function() {},
                    onClickOutside: function() {},
                    placement: "top",
                    plugins: [],
                    popperOptions: {},
                    render: null,
                    showOnCreate: !1,
                    touch: !0,
                    trigger: "mouseenter focus",
                    triggerTarget: null
                }, H, {
                    allowHTML: !1,
                    animation: "fade",
                    arrow: !0,
                    content: "",
                    inertia: !1,
                    maxWidth: 350,
                    role: "tooltip",
                    theme: "",
                    zIndex: 9999
                }),
                _ = Object.keys(U);

            function R(t) {
                var e = (t.plugins || []).reduce((function(e, n) {
                    var i, r = n.name,
                        o = n.defaultValue;
                    r && (e[r] = void 0 !== t[r] ? t[r] : null != (i = U[r]) ? i : o);
                    return e
                }), {});
                return Object.assign({}, t, e)
            }

            function B(t, e) {
                var n = Object.assign({}, e, {
                    content: l(e.content, [t])
                }, e.ignoreAttributes ? {} : function(t, e) {
                    return (e ? Object.keys(R(Object.assign({}, U, {
                        plugins: e
                    }))) : _).reduce((function(e, n) {
                        var i = (t.getAttribute("data-tippy-" + n) || "").trim();
                        if (!i) return e;
                        if ("content" === n) e[n] = i;
                        else try {
                            e[n] = JSON.parse(i)
                        } catch (r) {
                            e[n] = i
                        }
                        return e
                    }), {})
                }(t, e.plugins));
                return n.aria = Object.assign({}, U.aria, n.aria), n.aria = {
                    expanded: "auto" === n.aria.expanded ? e.interactive : n.aria.expanded,
                    content: "auto" === n.aria.content ? e.interactive ? null : "describedby" : n.aria.content
                }, n
            }
            var P = function() {
                return "innerHTML"
            };

            function W(t, e) {
                t[P()] = e
            }

            function F(t) {
                var e = w();
                return !0 === t ? e.className = s : (e.className = u, E(t) ? e.appendChild(t) : W(e, t)), e
            }

            function $(t, e) {
                E(e.content) ? (W(t, ""), t.appendChild(e.content)) : "function" !== typeof e.content && (e.allowHTML ? W(t, e.content) : t.textContent = e.content)
            }

            function q(t) {
                var e = t.firstElementChild,
                    n = g(e.children);
                return {
                    box: e,
                    content: n.find((function(t) {
                        return t.classList.contains(o)
                    })),
                    arrow: n.find((function(t) {
                        return t.classList.contains(s) || t.classList.contains(u)
                    })),
                    backdrop: n.find((function(t) {
                        return t.classList.contains(a)
                    }))
                }
            }

            function z(t) {
                var e = w(),
                    n = w();
                n.className = "tippy-box", n.setAttribute("data-state", "hidden"), n.setAttribute("tabindex", "-1");
                var i = w();

                function r(n, i) {
                    var r = q(e),
                        o = r.box,
                        a = r.content,
                        s = r.arrow;
                    i.theme ? o.setAttribute("data-theme", i.theme) : o.removeAttribute("data-theme"), "string" === typeof i.animation ? o.setAttribute("data-animation", i.animation) : o.removeAttribute("data-animation"), i.inertia ? o.setAttribute("data-inertia", "") : o.removeAttribute("data-inertia"), o.style.maxWidth = "number" === typeof i.maxWidth ? i.maxWidth + "px" : i.maxWidth, i.role ? o.setAttribute("role", i.role) : o.removeAttribute("role"), n.content === i.content && n.allowHTML === i.allowHTML || $(a, t.props), i.arrow ? s ? n.arrow !== i.arrow && (o.removeChild(s), o.appendChild(F(i.arrow))) : o.appendChild(F(i.arrow)) : s && o.removeChild(s)
                }
                return i.className = o, i.setAttribute("data-state", "hidden"), $(i, t.props), e.appendChild(n), n.appendChild(i), r(t.props, t.props), {
                    popper: e,
                    onUpdate: r
                }
            }
            z.$$tippy = !0;
            var J = 1,
                X = [],
                Y = [];

            function G(t, e) {
                var n, r, o, a, s, u, d, E, A = B(t, Object.assign({}, U, R(y(e)))),
                    x = !1,
                    j = !1,
                    S = !1,
                    I = !1,
                    M = [],
                    H = v(wt, A.interactiveDebounce),
                    _ = J++,
                    P = (E = A.plugins).filter((function(t, e) {
                        return E.indexOf(t) === e
                    })),
                    W = {
                        id: _,
                        reference: t,
                        popper: w(),
                        popperInstance: null,
                        props: A,
                        state: {
                            isEnabled: !0,
                            isVisible: !1,
                            isDestroyed: !1,
                            isMounted: !1,
                            isShown: !1
                        },
                        plugins: P,
                        clearDelayTimeouts: function() {
                            clearTimeout(n), clearTimeout(r), cancelAnimationFrame(o)
                        },
                        setProps: function(e) {
                            0;
                            if (W.state.isDestroyed) return;
                            at("onBeforeUpdate", [W, e]), gt();
                            var n = W.props,
                                i = B(t, Object.assign({}, n, y(e), {
                                    ignoreAttributes: !0
                                }));
                            W.props = i, ht(), n.interactiveDebounce !== i.interactiveDebounce && (ct(), H = v(wt, i.interactiveDebounce));
                            n.triggerTarget && !i.triggerTarget ? m(n.triggerTarget).forEach((function(t) {
                                t.removeAttribute("aria-expanded")
                            })) : i.triggerTarget && t.removeAttribute("aria-expanded");
                            ut(), ot(), z && z(n, i);
                            W.popperInstance && (xt(), Ct().forEach((function(t) {
                                requestAnimationFrame(t._tippy.popperInstance.forceUpdate)
                            })));
                            at("onAfterUpdate", [W, e])
                        },
                        setContent: function(t) {
                            W.setProps({
                                content: t
                            })
                        },
                        show: function() {
                            0;
                            var t = W.state.isVisible,
                                e = W.state.isDestroyed,
                                n = !W.state.isEnabled,
                                i = V.isTouch && !W.props.touch,
                                r = f(W.props.duration, 0, U.duration);
                            if (t || e || n || i) return;
                            if (et().hasAttribute("disabled")) return;
                            if (at("onShow", [W], !1), !1 === W.props.onShow(W)) return;
                            W.state.isVisible = !0, tt() && ($.style.visibility = "visible");
                            ot(), lt(), W.state.isMounted || ($.style.transition = "none");
                            if (tt()) {
                                var o = it();
                                O([o.box, o.content], 0)
                            }
                            u = function() {
                                    var t;
                                    if (W.state.isVisible && !I) {
                                        if (I = !0, $.offsetHeight, $.style.transition = W.props.moveTransition, tt() && W.props.animation) {
                                            var e = it(),
                                                n = e.box,
                                                i = e.content;
                                            O([n, i], r), C([n, i], "visible")
                                        }
                                        st(), ut(), b(Y, W), null == (t = W.popperInstance) || t.forceUpdate(), at("onMount", [W]), W.props.animation && tt() && function(t, e) {
                                            mt(t, e)
                                        }(r, (function() {
                                            W.state.isShown = !0, at("onShown", [W])
                                        }))
                                    }
                                },
                                function() {
                                    var t, e = W.props.appendTo,
                                        n = et();
                                    t = W.props.interactive && e === p || "parent" === e ? n.parentNode : l(e, [n]);
                                    t.contains($) || t.appendChild($);
                                    W.state.isMounted = !0, xt(), !1
                                }()
                        },
                        hide: function() {
                            0;
                            var t = !W.state.isVisible,
                                e = W.state.isDestroyed,
                                n = !W.state.isEnabled,
                                i = f(W.props.duration, 1, U.duration);
                            if (t || e || n) return;
                            if (at("onHide", [W], !1), !1 === W.props.onHide(W)) return;
                            W.state.isVisible = !1, W.state.isShown = !1, I = !1, x = !1, tt() && ($.style.visibility = "hidden");
                            if (ct(), vt(), ot(!0), tt()) {
                                var r = it(),
                                    o = r.box,
                                    a = r.content;
                                W.props.animation && (O([o, a], i), C([o, a], "hidden"))
                            }
                            st(), ut(), W.props.animation ? tt() && function(t, e) {
                                mt(t, (function() {
                                    !W.state.isVisible && $.parentNode && $.parentNode.contains($) && e()
                                }))
                            }(i, W.unmount) : W.unmount()
                        },
                        hideWithInteractivity: function(t) {
                            0;
                            nt().addEventListener("mousemove", H), b(X, H), H(t)
                        },
                        enable: function() {
                            W.state.isEnabled = !0
                        },
                        disable: function() {
                            W.hide(), W.state.isEnabled = !1
                        },
                        unmount: function() {
                            0;
                            W.state.isVisible && W.hide();
                            if (!W.state.isMounted) return;
                            Ot(), Ct().forEach((function(t) {
                                t._tippy.unmount()
                            })), $.parentNode && $.parentNode.removeChild($);
                            Y = Y.filter((function(t) {
                                return t !== W
                            })), W.state.isMounted = !1, at("onHidden", [W])
                        },
                        destroy: function() {
                            0;
                            if (W.state.isDestroyed) return;
                            W.clearDelayTimeouts(), W.unmount(), gt(), delete t._tippy, W.state.isDestroyed = !0, at("onDestroy", [W])
                        }
                    };
                if (!A.render) return W;
                var F = A.render(W),
                    $ = F.popper,
                    z = F.onUpdate;
                $.setAttribute("data-tippy-root", ""), $.id = "tippy-" + W.id, W.popper = $, t._tippy = W, $._tippy = W;
                var G = P.map((function(t) {
                        return t.fn(W)
                    })),
                    K = t.hasAttribute("aria-expanded");
                return ht(), ut(), ot(), at("onCreate", [W]), A.showOnCreate && Lt(), $.addEventListener("mouseenter", (function() {
                    W.props.interactive && W.state.isVisible && W.clearDelayTimeouts()
                })), $.addEventListener("mouseleave", (function() {
                    W.props.interactive && W.props.trigger.indexOf("mouseenter") >= 0 && nt().addEventListener("mousemove", H)
                })), W;

                function Q() {
                    var t = W.props.touch;
                    return Array.isArray(t) ? t : [t, 0]
                }

                function Z() {
                    return "hold" === Q()[0]
                }

                function tt() {
                    var t;
                    return !(null == (t = W.props.render) || !t.$$tippy)
                }

                function et() {
                    return d || t
                }

                function nt() {
                    var t = et().parentNode;
                    return t ? L(t) : document
                }

                function it() {
                    return q($)
                }

                function rt(t) {
                    return W.state.isMounted && !W.state.isVisible || V.isTouch || a && "focus" === a.type ? 0 : f(W.props.delay, t ? 0 : 1, U.delay)
                }

                function ot(t) {
                    void 0 === t && (t = !1), $.style.pointerEvents = W.props.interactive && !t ? "" : "none", $.style.zIndex = "" + W.props.zIndex
                }

                function at(t, e, n) {
                    var i;
                    (void 0 === n && (n = !0), G.forEach((function(n) {
                        n[t] && n[t].apply(n, e)
                    })), n) && (i = W.props)[t].apply(i, e)
                }

                function st() {
                    var e = W.props.aria;
                    if (e.content) {
                        var n = "aria-" + e.content,
                            i = $.id;
                        m(W.props.triggerTarget || t).forEach((function(t) {
                            var e = t.getAttribute(n);
                            if (W.state.isVisible) t.setAttribute(n, e ? e + " " + i : i);
                            else {
                                var r = e && e.replace(i, "").trim();
                                r ? t.setAttribute(n, r) : t.removeAttribute(n)
                            }
                        }))
                    }
                }

                function ut() {
                    !K && W.props.aria.expanded && m(W.props.triggerTarget || t).forEach((function(t) {
                        W.props.interactive ? t.setAttribute("aria-expanded", W.state.isVisible && t === et() ? "true" : "false") : t.removeAttribute("aria-expanded")
                    }))
                }

                function ct() {
                    nt().removeEventListener("mousemove", H), X = X.filter((function(t) {
                        return t !== H
                    }))
                }

                function pt(e) {
                    if (!V.isTouch || !S && "mousedown" !== e.type) {
                        var n = e.composedPath && e.composedPath()[0] || e.target;
                        if (!W.props.interactive || !k($, n)) {
                            if (m(W.props.triggerTarget || t).some((function(t) {
                                    return k(t, n)
                                }))) {
                                if (V.isTouch) return;
                                if (W.state.isVisible && W.props.trigger.indexOf("click") >= 0) return
                            } else at("onClickOutside", [W, e]);
                            !0 === W.props.hideOnClick && (W.clearDelayTimeouts(), W.hide(), j = !0, setTimeout((function() {
                                j = !1
                            })), W.state.isMounted || vt())
                        }
                    }
                }

                function ft() {
                    S = !0
                }

                function dt() {
                    S = !1
                }

                function lt() {
                    var t = nt();
                    t.addEventListener("mousedown", pt, !0), t.addEventListener("touchend", pt, c), t.addEventListener("touchstart", dt, c), t.addEventListener("touchmove", ft, c)
                }

                function vt() {
                    var t = nt();
                    t.removeEventListener("mousedown", pt, !0), t.removeEventListener("touchend", pt, c), t.removeEventListener("touchstart", dt, c), t.removeEventListener("touchmove", ft, c)
                }

                function mt(t, e) {
                    var n = it().box;

                    function i(t) {
                        t.target === n && (D(n, "remove", i), e())
                    }
                    if (0 === t) return e();
                    D(n, "remove", s), D(n, "add", i), s = i
                }

                function bt(e, n, i) {
                    void 0 === i && (i = !1), m(W.props.triggerTarget || t).forEach((function(t) {
                        t.addEventListener(e, n, i), M.push({
                            node: t,
                            eventType: e,
                            handler: n,
                            options: i
                        })
                    }))
                }

                function ht() {
                    var t;
                    Z() && (bt("touchstart", yt, {
                        passive: !0
                    }), bt("touchend", Et, {
                        passive: !0
                    })), (t = W.props.trigger, t.split(/\s+/).filter(Boolean)).forEach((function(t) {
                        if ("manual" !== t) switch (bt(t, yt), t) {
                            case "mouseenter":
                                bt("mouseleave", Et);
                                break;
                            case "focus":
                                bt(N ? "focusout" : "blur", Tt);
                                break;
                            case "focusin":
                                bt("focusout", Tt)
                        }
                    }))
                }

                function gt() {
                    M.forEach((function(t) {
                        var e = t.node,
                            n = t.eventType,
                            i = t.handler,
                            r = t.options;
                        e.removeEventListener(n, i, r)
                    })), M = []
                }

                function yt(t) {
                    var e, n = !1;
                    if (W.state.isEnabled && !At(t) && !j) {
                        var i = "focus" === (null == (e = a) ? void 0 : e.type);
                        a = t, d = t.currentTarget, ut(), !W.state.isVisible && T(t) && X.forEach((function(e) {
                            return e(t)
                        })), "click" === t.type && (W.props.trigger.indexOf("mouseenter") < 0 || x) && !1 !== W.props.hideOnClick && W.state.isVisible ? n = !0 : Lt(t), "click" === t.type && (x = !n), n && !i && Dt(t)
                    }
                }

                function wt(t) {
                    var e = t.target,
                        n = et().contains(e) || $.contains(e);
                    if ("mousemove" !== t.type || !n) {
                        var i = Ct().concat($).map((function(t) {
                            var e, n = null == (e = t._tippy.popperInstance) ? void 0 : e.state;
                            return n ? {
                                popperRect: t.getBoundingClientRect(),
                                popperState: n,
                                props: A
                            } : null
                        })).filter(Boolean);
                        (function(t, e) {
                            var n = e.clientX,
                                i = e.clientY;
                            return t.every((function(t) {
                                var e = t.popperRect,
                                    r = t.popperState,
                                    o = t.props.interactiveBorder,
                                    a = h(r.placement),
                                    s = r.modifiersData.offset;
                                if (!s) return !0;
                                var u = "bottom" === a ? s.top.y : 0,
                                    c = "top" === a ? s.bottom.y : 0,
                                    p = "right" === a ? s.left.x : 0,
                                    f = "left" === a ? s.right.x : 0,
                                    d = e.top - i + u > o,
                                    l = i - e.bottom - c > o,
                                    v = e.left - n + p > o,
                                    m = n - e.right - f > o;
                                return d || l || v || m
                            }))
                        })(i, t) && (ct(), Dt(t))
                    }
                }

                function Et(t) {
                    At(t) || W.props.trigger.indexOf("click") >= 0 && x || (W.props.interactive ? W.hideWithInteractivity(t) : Dt(t))
                }

                function Tt(t) {
                    W.props.trigger.indexOf("focusin") < 0 && t.target !== et() || W.props.interactive && t.relatedTarget && $.contains(t.relatedTarget) || Dt(t)
                }

                function At(t) {
                    return !!V.isTouch && Z() !== t.type.indexOf("touch") >= 0
                }

                function xt() {
                    Ot();
                    var e = W.props,
                        n = e.popperOptions,
                        r = e.placement,
                        o = e.offset,
                        a = e.getReferenceClientRect,
                        s = e.moveTransition,
                        c = tt() ? q($).arrow : null,
                        p = a ? {
                            getBoundingClientRect: a,
                            contextElement: a.contextElement || et()
                        } : t,
                        f = {
                            name: "$$tippy",
                            enabled: !0,
                            phase: "beforeWrite",
                            requires: ["computeStyles"],
                            fn: function(t) {
                                var e = t.state;
                                if (tt()) {
                                    var n = it().box;
                                    ["placement", "reference-hidden", "escaped"].forEach((function(t) {
                                        "placement" === t ? n.setAttribute("data-placement", e.placement) : e.attributes.popper["data-popper-" + t] ? n.setAttribute("data-" + t, "") : n.removeAttribute("data-" + t)
                                    })), e.attributes.popper = {}
                                }
                            }
                        },
                        d = [{
                            name: "offset",
                            options: {
                                offset: o
                            }
                        }, {
                            name: "preventOverflow",
                            options: {
                                padding: {
                                    top: 2,
                                    bottom: 2,
                                    left: 5,
                                    right: 5
                                }
                            }
                        }, {
                            name: "flip",
                            options: {
                                padding: 5
                            }
                        }, {
                            name: "computeStyles",
                            options: {
                                adaptive: !s
                            }
                        }, f];
                    tt() && c && d.push({
                        name: "arrow",
                        options: {
                            element: c,
                            padding: 3
                        }
                    }), d.push.apply(d, (null == n ? void 0 : n.modifiers) || []), W.popperInstance = (0, i.n4)(p, $, Object.assign({}, n, {
                        placement: r,
                        onFirstUpdate: u,
                        modifiers: d
                    }))
                }

                function Ot() {
                    W.popperInstance && (W.popperInstance.destroy(), W.popperInstance = null)
                }

                function Ct() {
                    return g($.querySelectorAll("[data-tippy-root]"))
                }

                function Lt(t) {
                    W.clearDelayTimeouts(), t && at("onTrigger", [W, t]), lt();
                    var e = rt(!0),
                        i = Q(),
                        r = i[0],
                        o = i[1];
                    V.isTouch && "hold" === r && o && (e = o), e ? n = setTimeout((function() {
                        W.show()
                    }), e) : W.show()
                }

                function Dt(t) {
                    if (W.clearDelayTimeouts(), at("onUntrigger", [W, t]), W.state.isVisible) {
                        if (!(W.props.trigger.indexOf("mouseenter") >= 0 && W.props.trigger.indexOf("click") >= 0 && ["mouseleave", "mousemove"].indexOf(t.type) >= 0 && x)) {
                            var e = rt(!1);
                            e ? r = setTimeout((function() {
                                W.state.isVisible && W.hide()
                            }), e) : o = requestAnimationFrame((function() {
                                W.hide()
                            }))
                        }
                    } else vt()
                }
            }

            function K(t, e) {
                void 0 === e && (e = {});
                var n = U.plugins.concat(e.plugins || []);
                document.addEventListener("touchstart", S, c), window.addEventListener("blur", M);
                var i = Object.assign({}, e, {
                        plugins: n
                    }),
                    r = x(t).reduce((function(t, e) {
                        var n = e && G(e, i);
                        return n && t.push(n), t
                    }), []);
                return E(t) ? r[0] : r
            }
            K.defaultProps = U, K.setDefaultProps = function(t) {
                Object.keys(t).forEach((function(e) {
                    U[e] = t[e]
                }))
            }, K.currentInput = V;
            Object.assign({}, r.A, {
                effect: function(t) {
                    var e = t.state,
                        n = {
                            popper: {
                                position: e.options.strategy,
                                left: "0",
                                top: "0",
                                margin: "0"
                            },
                            arrow: {
                                position: "absolute"
                            },
                            reference: {}
                        };
                    Object.assign(e.elements.popper.style, n.popper), e.styles = n, e.elements.arrow && Object.assign(e.elements.arrow.style, n.arrow)
                }
            });
            K.setDefaultProps({
                render: z
            }), e.Ay = K
        }
    }
]);
//# sourceMappingURL=504-2ff8a3de1ba006ca876a.js.map