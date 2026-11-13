"use strict";
(self.webpackChunkynab_api = self.webpackChunkynab_api || []).push([
    [576], {
        711: function(t, e, n) {
            n.d(e, {
                n4: function() {
                    return x
                },
                UD: function() {
                    return y
                }
            });
            var r = n(6354),
                o = n(222),
                i = n(8979),
                a = n(5581);
            var f = n(7604),
                u = n(793),
                s = n(9760),
                c = n(134),
                p = n(6906);

            function d(t, e, n) {
                void 0 === n && (n = !1);
                var d, l, v = (0, a.sb)(e),
                    h = (0, a.sb)(e) && function(t) {
                        var e = t.getBoundingClientRect(),
                            n = (0, p.LI)(e.width) / t.offsetWidth || 1,
                            r = (0, p.LI)(e.height) / t.offsetHeight || 1;
                        return 1 !== n || 1 !== r
                    }(e),
                    m = (0, s.A)(e),
                    A = (0, r.A)(t, h, n),
                    b = {
                        scrollLeft: 0,
                        scrollTop: 0
                    },
                    g = {
                        x: 0,
                        y: 0
                    };
                return (v || !v && !n) && (("body" !== (0, f.A)(e) || (0, c.A)(m)) && (b = (d = e) !== (0, i.A)(d) && (0, a.sb)(d) ? {
                    scrollLeft: (l = d).scrollLeft,
                    scrollTop: l.scrollTop
                } : (0, o.A)(d)), (0, a.sb)(e) ? ((g = (0, r.A)(e, !0)).x += e.clientLeft, g.y += e.clientTop) : m && (g.x = (0, u.A)(m))), {
                    x: A.left + b.scrollLeft - g.x,
                    y: A.top + b.scrollTop - g.y,
                    width: A.width,
                    height: A.height
                }
            }
            var l = n(6979),
                v = n(5867),
                h = n(8579),
                m = n(4278);

            function A(t) {
                var e = new Map,
                    n = new Set,
                    r = [];

                function o(t) {
                    n.add(t.name), [].concat(t.requires || [], t.requiresIfExists || []).forEach((function(t) {
                        if (!n.has(t)) {
                            var r = e.get(t);
                            r && o(r)
                        }
                    })), r.push(t)
                }
                return t.forEach((function(t) {
                    e.set(t.name, t)
                })), t.forEach((function(t) {
                    n.has(t.name) || o(t)
                })), r
            }
            var b = {
                placement: "bottom",
                modifiers: [],
                strategy: "absolute"
            };

            function g() {
                for (var t = arguments.length, e = new Array(t), n = 0; n < t; n++) e[n] = arguments[n];
                return !e.some((function(t) {
                    return !(t && "function" === typeof t.getBoundingClientRect)
                }))
            }

            function y(t) {
                void 0 === t && (t = {});
                var e = t,
                    n = e.defaultModifiers,
                    r = void 0 === n ? [] : n,
                    o = e.defaultOptions,
                    i = void 0 === o ? b : o;
                return function(t, e, n) {
                    void 0 === n && (n = i);
                    var o, f, u = {
                            placement: "bottom",
                            orderedModifiers: [],
                            options: Object.assign({}, b, i),
                            modifiersData: {},
                            elements: {
                                reference: t,
                                popper: e
                            },
                            attributes: {},
                            styles: {}
                        },
                        s = [],
                        c = !1,
                        p = {
                            state: u,
                            setOptions: function(n) {
                                var o = "function" === typeof n ? n(u.options) : n;
                                y(), u.options = Object.assign({}, i, u.options, o), u.scrollParents = {
                                    reference: (0, a.vq)(t) ? (0, v.A)(t) : t.contextElement ? (0, v.A)(t.contextElement) : [],
                                    popper: (0, v.A)(e)
                                };
                                var f, c, d = function(t) {
                                    var e = A(t);
                                    return m.GM.reduce((function(t, n) {
                                        return t.concat(e.filter((function(t) {
                                            return t.phase === n
                                        })))
                                    }), [])
                                }((f = [].concat(r, u.options.modifiers), c = f.reduce((function(t, e) {
                                    var n = t[e.name];
                                    return t[e.name] = n ? Object.assign({}, n, e, {
                                        options: Object.assign({}, n.options, e.options),
                                        data: Object.assign({}, n.data, e.data)
                                    }) : e, t
                                }), {}), Object.keys(c).map((function(t) {
                                    return c[t]
                                }))));
                                return u.orderedModifiers = d.filter((function(t) {
                                    return t.enabled
                                })), u.orderedModifiers.forEach((function(t) {
                                    var e = t.name,
                                        n = t.options,
                                        r = void 0 === n ? {} : n,
                                        o = t.effect;
                                    if ("function" === typeof o) {
                                        var i = o({
                                                state: u,
                                                name: e,
                                                instance: p,
                                                options: r
                                            }),
                                            a = function() {};
                                        s.push(i || a)
                                    }
                                })), p.update()
                            },
                            forceUpdate: function() {
                                if (!c) {
                                    var t = u.elements,
                                        e = t.reference,
                                        n = t.popper;
                                    if (g(e, n)) {
                                        u.rects = {
                                            reference: d(e, (0, h.A)(n), "fixed" === u.options.strategy),
                                            popper: (0, l.A)(n)
                                        }, u.reset = !1, u.placement = u.options.placement, u.orderedModifiers.forEach((function(t) {
                                            return u.modifiersData[t.name] = Object.assign({}, t.data)
                                        }));
                                        for (var r = 0; r < u.orderedModifiers.length; r++)
                                            if (!0 !== u.reset) {
                                                var o = u.orderedModifiers[r],
                                                    i = o.fn,
                                                    a = o.options,
                                                    f = void 0 === a ? {} : a,
                                                    s = o.name;
                                                "function" === typeof i && (u = i({
                                                    state: u,
                                                    options: f,
                                                    name: s,
                                                    instance: p
                                                }) || u)
                                            } else u.reset = !1, r = -1
                                    }
                                }
                            },
                            update: (o = function() {
                                return new Promise((function(t) {
                                    p.forceUpdate(), t(u)
                                }))
                            }, function() {
                                return f || (f = new Promise((function(t) {
                                    Promise.resolve().then((function() {
                                        f = void 0, t(o())
                                    }))
                                }))), f
                            }),
                            destroy: function() {
                                y(), c = !0
                            }
                        };
                    if (!g(t, e)) return p;

                    function y() {
                        s.forEach((function(t) {
                            return t()
                        })), s = []
                    }
                    return p.setOptions(n).then((function(t) {
                        !c && n.onFirstUpdate && n.onFirstUpdate(t)
                    })), p
                }
            }
            var x = y()
        },
        5446: function(t, e, n) {
            n.d(e, {
                A: function() {
                    return o
                }
            });
            var r = n(5581);

            function o(t, e) {
                var n = e.getRootNode && e.getRootNode();
                if (t.contains(e)) return !0;
                if (n && (0, r.Ng)(n)) {
                    var o = e;
                    do {
                        if (o && t.isSameNode(o)) return !0;
                        o = o.parentNode || o.host
                    } while (o)
                }
                return !1
            }
        },
        6354: function(t, e, n) {
            n.d(e, {
                A: function() {
                    return f
                }
            });
            var r = n(5581),
                o = n(6906),
                i = n(8979),
                a = n(2283);

            function f(t, e, n) {
                void 0 === e && (e = !1), void 0 === n && (n = !1);
                var f = t.getBoundingClientRect(),
                    u = 1,
                    s = 1;
                e && (0, r.sb)(t) && (u = t.offsetWidth > 0 && (0, o.LI)(f.width) / t.offsetWidth || 1, s = t.offsetHeight > 0 && (0, o.LI)(f.height) / t.offsetHeight || 1);
                var c = ((0, r.vq)(t) ? (0, i.A)(t) : window).visualViewport,
                    p = !(0, a.A)() && n,
                    d = (f.left + (p && c ? c.offsetLeft : 0)) / u,
                    l = (f.top + (p && c ? c.offsetTop : 0)) / s,
                    v = f.width / u,
                    h = f.height / s;
                return {
                    width: v,
                    height: h,
                    top: l,
                    right: d + v,
                    bottom: l + h,
                    left: d,
                    x: d,
                    y: l
                }
            }
        },
        271: function(t, e, n) {
            n.d(e, {
                A: function() {
                    return o
                }
            });
            var r = n(8979);

            function o(t) {
                return (0, r.A)(t).getComputedStyle(t)
            }
        },
        9760: function(t, e, n) {
            n.d(e, {
                A: function() {
                    return o
                }
            });
            var r = n(5581);

            function o(t) {
                return (((0, r.vq)(t) ? t.ownerDocument : t.document) || window.document).documentElement
            }
        },
        6979: function(t, e, n) {
            n.d(e, {
                A: function() {
                    return o
                }
            });
            var r = n(6354);

            function o(t) {
                var e = (0, r.A)(t),
                    n = t.offsetWidth,
                    o = t.offsetHeight;
                return Math.abs(e.width - n) <= 1 && (n = e.width), Math.abs(e.height - o) <= 1 && (o = e.height), {
                    x: t.offsetLeft,
                    y: t.offsetTop,
                    width: n,
                    height: o
                }
            }
        },
        7604: function(t, e, n) {
            function r(t) {
                return t ? (t.nodeName || "").toLowerCase() : null
            }
            n.d(e, {
                A: function() {
                    return r
                }
            })
        },
        8579: function(t, e, n) {
            n.d(e, {
                A: function() {
                    return p
                }
            });
            var r = n(8979),
                o = n(7604),
                i = n(271),
                a = n(5581);

            function f(t) {
                return ["table", "td", "th"].indexOf((0, o.A)(t)) >= 0
            }
            var u = n(2083),
                s = n(2398);

            function c(t) {
                return (0, a.sb)(t) && "fixed" !== (0, i.A)(t).position ? t.offsetParent : null
            }

            function p(t) {
                for (var e = (0, r.A)(t), n = c(t); n && f(n) && "static" === (0, i.A)(n).position;) n = c(n);
                return n && ("html" === (0, o.A)(n) || "body" === (0, o.A)(n) && "static" === (0, i.A)(n).position) ? e : n || function(t) {
                    var e = /firefox/i.test((0, s.A)());
                    if (/Trident/i.test((0, s.A)()) && (0, a.sb)(t) && "fixed" === (0, i.A)(t).position) return null;
                    var n = (0, u.A)(t);
                    for ((0, a.Ng)(n) && (n = n.host);
                        (0, a.sb)(n) && ["html", "body"].indexOf((0, o.A)(n)) < 0;) {
                        var r = (0, i.A)(n);
                        if ("none" !== r.transform || "none" !== r.perspective || "paint" === r.contain || -1 !== ["transform", "perspective"].indexOf(r.willChange) || e && "filter" === r.willChange || e && r.filter && "none" !== r.filter) return n;
                        n = n.parentNode
                    }
                    return null
                }(t) || e
            }
        },
        2083: function(t, e, n) {
            n.d(e, {
                A: function() {
                    return a
                }
            });
            var r = n(7604),
                o = n(9760),
                i = n(5581);

            function a(t) {
                return "html" === (0, r.A)(t) ? t : t.assignedSlot || t.parentNode || ((0, i.Ng)(t) ? t.host : null) || (0, o.A)(t)
            }
        },
        8979: function(t, e, n) {
            function r(t) {
                if (null == t) return window;
                if ("[object Window]" !== t.toString()) {
                    var e = t.ownerDocument;
                    return e && e.defaultView || window
                }
                return t
            }
            n.d(e, {
                A: function() {
                    return r
                }
            })
        },
        222: function(t, e, n) {
            n.d(e, {
                A: function() {
                    return o
                }
            });
            var r = n(8979);

            function o(t) {
                var e = (0, r.A)(t);
                return {
                    scrollLeft: e.pageXOffset,
                    scrollTop: e.pageYOffset
                }
            }
        },
        793: function(t, e, n) {
            n.d(e, {
                A: function() {
                    return a
                }
            });
            var r = n(6354),
                o = n(9760),
                i = n(222);

            function a(t) {
                return (0, r.A)((0, o.A)(t)).left + (0, i.A)(t).scrollLeft
            }
        },
        5581: function(t, e, n) {
            n.d(e, {
                Ng: function() {
                    return a
                },
                sb: function() {
                    return i
                },
                vq: function() {
                    return o
                }
            });
            var r = n(8979);

            function o(t) {
                return t instanceof(0, r.A)(t).Element || t instanceof Element
            }

            function i(t) {
                return t instanceof(0, r.A)(t).HTMLElement || t instanceof HTMLElement
            }

            function a(t) {
                return "undefined" !== typeof ShadowRoot && (t instanceof(0, r.A)(t).ShadowRoot || t instanceof ShadowRoot)
            }
        },
        2283: function(t, e, n) {
            n.d(e, {
                A: function() {
                    return o
                }
            });
            var r = n(2398);

            function o() {
                return !/^((?!chrome|android).)*safari/i.test((0, r.A)())
            }
        },
        134: function(t, e, n) {
            n.d(e, {
                A: function() {
                    return o
                }
            });
            var r = n(271);

            function o(t) {
                var e = (0, r.A)(t),
                    n = e.overflow,
                    o = e.overflowX,
                    i = e.overflowY;
                return /auto|scroll|overlay|hidden/.test(n + i + o)
            }
        },
        5867: function(t, e, n) {
            n.d(e, {
                A: function() {
                    return s
                }
            });
            var r = n(2083),
                o = n(134),
                i = n(7604),
                a = n(5581);

            function f(t) {
                return ["html", "body", "#document"].indexOf((0, i.A)(t)) >= 0 ? t.ownerDocument.body : (0, a.sb)(t) && (0, o.A)(t) ? t : f((0, r.A)(t))
            }
            var u = n(8979);

            function s(t, e) {
                var n;
                void 0 === e && (e = []);
                var i = f(t),
                    a = i === (null == (n = t.ownerDocument) ? void 0 : n.body),
                    c = (0, u.A)(i),
                    p = a ? [c].concat(c.visualViewport || [], (0, o.A)(i) ? i : []) : i,
                    d = e.concat(p);
                return a ? d : d.concat(s((0, r.A)(p)))
            }
        },
        4278: function(t, e, n) {
            n.d(e, {
                DD: function() {
                    return m
                },
                EP: function() {
                    return w
                },
                GM: function() {
                    return M
                },
                LF: function() {
                    return b
                },
                LG: function() {
                    return y
                },
                M9: function() {
                    return k
                },
                Mn: function() {
                    return r
                },
                OM: function() {
                    return u
                },
                Ol: function() {
                    return h
                },
                R9: function() {
                    return d
                },
                SE: function() {
                    return j
                },
                WY: function() {
                    return p
                },
                _N: function() {
                    return c
                },
                ci: function() {
                    return A
                },
                iW: function() {
                    return x
                },
                ir: function() {
                    return v
                },
                kb: function() {
                    return a
                },
                ni: function() {
                    return s
                },
                pA: function() {
                    return O
                },
                pG: function() {
                    return i
                },
                qZ: function() {
                    return f
                },
                sQ: function() {
                    return o
                },
                v5: function() {
                    return g
                },
                xf: function() {
                    return l
                }
            });
            var r = "top",
                o = "bottom",
                i = "right",
                a = "left",
                f = "auto",
                u = [r, o, i, a],
                s = "start",
                c = "end",
                p = "clippingParents",
                d = "viewport",
                l = "popper",
                v = "reference",
                h = u.reduce((function(t, e) {
                    return t.concat([e + "-" + s, e + "-" + c])
                }), []),
                m = [].concat(u, [f]).reduce((function(t, e) {
                    return t.concat([e, e + "-" + s, e + "-" + c])
                }), []),
                A = "beforeRead",
                b = "read",
                g = "afterRead",
                y = "beforeMain",
                x = "main",
                w = "afterMain",
                O = "beforeWrite",
                k = "write",
                j = "afterWrite",
                M = [A, b, g, y, x, w, O, k, j]
        },
        6607: function(t, e, n) {
            var r = n(7604),
                o = n(5581);
            e.A = {
                name: "applyStyles",
                enabled: !0,
                phase: "write",
                fn: function(t) {
                    var e = t.state;
                    Object.keys(e.elements).forEach((function(t) {
                        var n = e.styles[t] || {},
                            i = e.attributes[t] || {},
                            a = e.elements[t];
                        (0, o.sb)(a) && (0, r.A)(a) && (Object.assign(a.style, n), Object.keys(i).forEach((function(t) {
                            var e = i[t];
                            !1 === e ? a.removeAttribute(t) : a.setAttribute(t, !0 === e ? "" : e)
                        })))
                    }))
                },
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
                    return Object.assign(e.elements.popper.style, n.popper), e.styles = n, e.elements.arrow && Object.assign(e.elements.arrow.style, n.arrow),
                        function() {
                            Object.keys(e.elements).forEach((function(t) {
                                var i = e.elements[t],
                                    a = e.attributes[t] || {},
                                    f = Object.keys(e.styles.hasOwnProperty(t) ? e.styles[t] : n[t]).reduce((function(t, e) {
                                        return t[e] = "", t
                                    }), {});
                                (0, o.sb)(i) && (0, r.A)(i) && (Object.assign(i.style, f), Object.keys(a).forEach((function(t) {
                                    i.removeAttribute(t)
                                })))
                            }))
                        }
                },
                requires: ["computeStyles"]
            }
        },
        8256: function(t, e, n) {
            var r = n(2632),
                o = n(6979),
                i = n(5446),
                a = n(8579),
                f = n(9703),
                u = n(6523),
                s = n(4318),
                c = n(1007),
                p = n(4278);
            e.A = {
                name: "arrow",
                enabled: !0,
                phase: "main",
                fn: function(t) {
                    var e, n = t.state,
                        i = t.name,
                        d = t.options,
                        l = n.elements.arrow,
                        v = n.modifiersData.popperOffsets,
                        h = (0, r.A)(n.placement),
                        m = (0, f.A)(h),
                        A = [p.kb, p.pG].indexOf(h) >= 0 ? "height" : "width";
                    if (l && v) {
                        var b = function(t, e) {
                                return t = "function" === typeof t ? t(Object.assign({}, e.rects, {
                                    placement: e.placement
                                })) : t, (0, s.A)("number" !== typeof t ? t : (0, c.A)(t, p.OM))
                            }(d.padding, n),
                            g = (0, o.A)(l),
                            y = "y" === m ? p.Mn : p.kb,
                            x = "y" === m ? p.sQ : p.pG,
                            w = n.rects.reference[A] + n.rects.reference[m] - v[m] - n.rects.popper[A],
                            O = v[m] - n.rects.reference[m],
                            k = (0, a.A)(l),
                            j = k ? "y" === m ? k.clientHeight || 0 : k.clientWidth || 0 : 0,
                            M = w / 2 - O / 2,
                            D = b[y],
                            E = j - g[A] - b[x],
                            L = j / 2 - g[A] / 2 + M,
                            T = (0, u.u)(D, L, E),
                            W = m;
                        n.modifiersData[i] = ((e = {})[W] = T, e.centerOffset = T - L, e)
                    }
                },
                effect: function(t) {
                    var e = t.state,
                        n = t.options.element,
                        r = void 0 === n ? "[data-popper-arrow]" : n;
                    null != r && ("string" !== typeof r || (r = e.elements.popper.querySelector(r))) && (0, i.A)(e.elements.popper, r) && (e.elements.arrow = r)
                },
                requires: ["popperOffsets"],
                requiresIfExists: ["preventOverflow"]
            }
        },
        1262: function(t, e, n) {
            var r = n(4278),
                o = n(8579),
                i = n(8979),
                a = n(9760),
                f = n(271),
                u = n(2632),
                s = n(8101),
                c = n(6906),
                p = {
                    top: "auto",
                    right: "auto",
                    bottom: "auto",
                    left: "auto"
                };

            function d(t) {
                var e, n = t.popper,
                    u = t.popperRect,
                    s = t.placement,
                    d = t.variation,
                    l = t.offsets,
                    v = t.position,
                    h = t.gpuAcceleration,
                    m = t.adaptive,
                    A = t.roundOffsets,
                    b = t.isFixed,
                    g = l.x,
                    y = void 0 === g ? 0 : g,
                    x = l.y,
                    w = void 0 === x ? 0 : x,
                    O = "function" === typeof A ? A({
                        x: y,
                        y: w
                    }) : {
                        x: y,
                        y: w
                    };
                y = O.x, w = O.y;
                var k = l.hasOwnProperty("x"),
                    j = l.hasOwnProperty("y"),
                    M = r.kb,
                    D = r.Mn,
                    E = window;
                if (m) {
                    var L = (0, o.A)(n),
                        T = "clientHeight",
                        W = "clientWidth";
                    if (L === (0, i.A)(n) && (L = (0, a.A)(n), "static" !== (0, f.A)(L).position && "absolute" === v && (T = "scrollHeight", W = "scrollWidth")), s === r.Mn || (s === r.kb || s === r.pG) && d === r._N) D = r.sQ, w -= (b && L === E && E.visualViewport ? E.visualViewport.height : L[T]) - u.height, w *= h ? 1 : -1;
                    if (s === r.kb || (s === r.Mn || s === r.sQ) && d === r._N) M = r.pG, y -= (b && L === E && E.visualViewport ? E.visualViewport.width : L[W]) - u.width, y *= h ? 1 : -1
                }
                var P, q = Object.assign({
                        position: v
                    }, m && p),
                    R = !0 === A ? function(t, e) {
                        var n = t.x,
                            r = t.y,
                            o = e.devicePixelRatio || 1;
                        return {
                            x: (0, c.LI)(n * o) / o || 0,
                            y: (0, c.LI)(r * o) / o || 0
                        }
                    }({
                        x: y,
                        y: w
                    }, (0, i.A)(n)) : {
                        x: y,
                        y: w
                    };
                return y = R.x, w = R.y, h ? Object.assign({}, q, ((P = {})[D] = j ? "0" : "", P[M] = k ? "0" : "", P.transform = (E.devicePixelRatio || 1) <= 1 ? "translate(" + y + "px, " + w + "px)" : "translate3d(" + y + "px, " + w + "px, 0)", P)) : Object.assign({}, q, ((e = {})[D] = j ? w + "px" : "", e[M] = k ? y + "px" : "", e.transform = "", e))
            }
            e.A = {
                name: "computeStyles",
                enabled: !0,
                phase: "beforeWrite",
                fn: function(t) {
                    var e = t.state,
                        n = t.options,
                        r = n.gpuAcceleration,
                        o = void 0 === r || r,
                        i = n.adaptive,
                        a = void 0 === i || i,
                        f = n.roundOffsets,
                        c = void 0 === f || f,
                        p = {
                            placement: (0, u.A)(e.placement),
                            variation: (0, s.A)(e.placement),
                            popper: e.elements.popper,
                            popperRect: e.rects.popper,
                            gpuAcceleration: o,
                            isFixed: "fixed" === e.options.strategy
                        };
                    null != e.modifiersData.popperOffsets && (e.styles.popper = Object.assign({}, e.styles.popper, d(Object.assign({}, p, {
                        offsets: e.modifiersData.popperOffsets,
                        position: e.options.strategy,
                        adaptive: a,
                        roundOffsets: c
                    })))), null != e.modifiersData.arrow && (e.styles.arrow = Object.assign({}, e.styles.arrow, d(Object.assign({}, p, {
                        offsets: e.modifiersData.arrow,
                        position: "absolute",
                        adaptive: !1,
                        roundOffsets: c
                    })))), e.attributes.popper = Object.assign({}, e.attributes.popper, {
                        "data-popper-placement": e.placement
                    })
                },
                data: {}
            }
        },
        9068: function(t, e, n) {
            var r = n(8979),
                o = {
                    passive: !0
                };
            e.A = {
                name: "eventListeners",
                enabled: !0,
                phase: "write",
                fn: function() {},
                effect: function(t) {
                    var e = t.state,
                        n = t.instance,
                        i = t.options,
                        a = i.scroll,
                        f = void 0 === a || a,
                        u = i.resize,
                        s = void 0 === u || u,
                        c = (0, r.A)(e.elements.popper),
                        p = [].concat(e.scrollParents.reference, e.scrollParents.popper);
                    return f && p.forEach((function(t) {
                            t.addEventListener("scroll", n.update, o)
                        })), s && c.addEventListener("resize", n.update, o),
                        function() {
                            f && p.forEach((function(t) {
                                t.removeEventListener("scroll", n.update, o)
                            })), s && c.removeEventListener("resize", n.update, o)
                        }
                },
                data: {}
            }
        },
        644: function(t, e, n) {
            n.d(e, {
                A: function() {
                    return p
                }
            });
            var r = {
                left: "right",
                right: "left",
                bottom: "top",
                top: "bottom"
            };

            function o(t) {
                return t.replace(/left|right|bottom|top/g, (function(t) {
                    return r[t]
                }))
            }
            var i = n(2632),
                a = {
                    start: "end",
                    end: "start"
                };

            function f(t) {
                return t.replace(/start|end/g, (function(t) {
                    return a[t]
                }))
            }
            var u = n(6397),
                s = n(8101),
                c = n(4278);
            var p = {
                name: "flip",
                enabled: !0,
                phase: "main",
                fn: function(t) {
                    var e = t.state,
                        n = t.options,
                        r = t.name;
                    if (!e.modifiersData[r]._skip) {
                        for (var a = n.mainAxis, p = void 0 === a || a, d = n.altAxis, l = void 0 === d || d, v = n.fallbackPlacements, h = n.padding, m = n.boundary, A = n.rootBoundary, b = n.altBoundary, g = n.flipVariations, y = void 0 === g || g, x = n.allowedAutoPlacements, w = e.options.placement, O = (0, i.A)(w), k = v || (O === w || !y ? [o(w)] : function(t) {
                                if ((0, i.A)(t) === c.qZ) return [];
                                var e = o(t);
                                return [f(t), e, f(e)]
                            }(w)), j = [w].concat(k).reduce((function(t, n) {
                                return t.concat((0, i.A)(n) === c.qZ ? function(t, e) {
                                    void 0 === e && (e = {});
                                    var n = e,
                                        r = n.placement,
                                        o = n.boundary,
                                        a = n.rootBoundary,
                                        f = n.padding,
                                        p = n.flipVariations,
                                        d = n.allowedAutoPlacements,
                                        l = void 0 === d ? c.DD : d,
                                        v = (0, s.A)(r),
                                        h = v ? p ? c.Ol : c.Ol.filter((function(t) {
                                            return (0, s.A)(t) === v
                                        })) : c.OM,
                                        m = h.filter((function(t) {
                                            return l.indexOf(t) >= 0
                                        }));
                                    0 === m.length && (m = h);
                                    var A = m.reduce((function(e, n) {
                                        return e[n] = (0, u.A)(t, {
                                            placement: n,
                                            boundary: o,
                                            rootBoundary: a,
                                            padding: f
                                        })[(0, i.A)(n)], e
                                    }), {});
                                    return Object.keys(A).sort((function(t, e) {
                                        return A[t] - A[e]
                                    }))
                                }(e, {
                                    placement: n,
                                    boundary: m,
                                    rootBoundary: A,
                                    padding: h,
                                    flipVariations: y,
                                    allowedAutoPlacements: x
                                }) : n)
                            }), []), M = e.rects.reference, D = e.rects.popper, E = new Map, L = !0, T = j[0], W = 0; W < j.length; W++) {
                            var P = j[W],
                                q = (0, i.A)(P),
                                R = (0, s.A)(P) === c.ni,
                                B = [c.Mn, c.sQ].indexOf(q) >= 0,
                                H = B ? "width" : "height",
                                G = (0, u.A)(e, {
                                    placement: P,
                                    boundary: m,
                                    rootBoundary: A,
                                    altBoundary: b,
                                    padding: h
                                }),
                                N = B ? R ? c.pG : c.kb : R ? c.sQ : c.Mn;
                            M[H] > D[H] && (N = o(N));
                            var S = o(N),
                                C = [];
                            if (p && C.push(G[q] <= 0), l && C.push(G[N] <= 0, G[S] <= 0), C.every((function(t) {
                                    return t
                                }))) {
                                T = P, L = !1;
                                break
                            }
                            E.set(P, C)
                        }
                        if (L)
                            for (var I = function(t) {
                                    var e = j.find((function(e) {
                                        var n = E.get(e);
                                        if (n) return n.slice(0, t).every((function(t) {
                                            return t
                                        }))
                                    }));
                                    if (e) return T = e, "break"
                                }, Q = y ? 3 : 1; Q > 0; Q--) {
                                if ("break" === I(Q)) break
                            }
                        e.placement !== T && (e.modifiersData[r]._skip = !0, e.placement = T, e.reset = !0)
                    }
                },
                requiresIfExists: ["offset"],
                data: {
                    _skip: !1
                }
            }
        },
        9081: function(t, e, n) {
            var r = n(4278),
                o = n(6397);

            function i(t, e, n) {
                return void 0 === n && (n = {
                    x: 0,
                    y: 0
                }), {
                    top: t.top - e.height - n.y,
                    right: t.right - e.width + n.x,
                    bottom: t.bottom - e.height + n.y,
                    left: t.left - e.width - n.x
                }
            }

            function a(t) {
                return [r.Mn, r.pG, r.sQ, r.kb].some((function(e) {
                    return t[e] >= 0
                }))
            }
            e.A = {
                name: "hide",
                enabled: !0,
                phase: "main",
                requiresIfExists: ["preventOverflow"],
                fn: function(t) {
                    var e = t.state,
                        n = t.name,
                        r = e.rects.reference,
                        f = e.rects.popper,
                        u = e.modifiersData.preventOverflow,
                        s = (0, o.A)(e, {
                            elementContext: "reference"
                        }),
                        c = (0, o.A)(e, {
                            altBoundary: !0
                        }),
                        p = i(s, r),
                        d = i(c, f, u),
                        l = a(p),
                        v = a(d);
                    e.modifiersData[n] = {
                        referenceClippingOffsets: p,
                        popperEscapeOffsets: d,
                        isReferenceHidden: l,
                        hasPopperEscaped: v
                    }, e.attributes.popper = Object.assign({}, e.attributes.popper, {
                        "data-popper-reference-hidden": l,
                        "data-popper-escaped": v
                    })
                }
            }
        },
        8490: function(t, e, n) {
            var r = n(2632),
                o = n(4278);
            e.A = {
                name: "offset",
                enabled: !0,
                phase: "main",
                requires: ["popperOffsets"],
                fn: function(t) {
                    var e = t.state,
                        n = t.options,
                        i = t.name,
                        a = n.offset,
                        f = void 0 === a ? [0, 0] : a,
                        u = o.DD.reduce((function(t, n) {
                            return t[n] = function(t, e, n) {
                                var i = (0, r.A)(t),
                                    a = [o.kb, o.Mn].indexOf(i) >= 0 ? -1 : 1,
                                    f = "function" === typeof n ? n(Object.assign({}, e, {
                                        placement: t
                                    })) : n,
                                    u = f[0],
                                    s = f[1];
                                return u = u || 0, s = (s || 0) * a, [o.kb, o.pG].indexOf(i) >= 0 ? {
                                    x: s,
                                    y: u
                                } : {
                                    x: u,
                                    y: s
                                }
                            }(n, e.rects, f), t
                        }), {}),
                        s = u[e.placement],
                        c = s.x,
                        p = s.y;
                    null != e.modifiersData.popperOffsets && (e.modifiersData.popperOffsets.x += c, e.modifiersData.popperOffsets.y += p), e.modifiersData[i] = u
                }
            }
        },
        5059: function(t, e, n) {
            var r = n(1815);
            e.A = {
                name: "popperOffsets",
                enabled: !0,
                phase: "read",
                fn: function(t) {
                    var e = t.state,
                        n = t.name;
                    e.modifiersData[n] = (0, r.A)({
                        reference: e.rects.reference,
                        element: e.rects.popper,
                        strategy: "absolute",
                        placement: e.placement
                    })
                },
                data: {}
            }
        },
        192: function(t, e, n) {
            n.d(e, {
                A: function() {
                    return l
                }
            });
            var r = n(4278),
                o = n(2632),
                i = n(9703);
            var a = n(6523),
                f = n(6979),
                u = n(8579),
                s = n(6397),
                c = n(8101),
                p = n(7364),
                d = n(6906);
            var l = {
                name: "preventOverflow",
                enabled: !0,
                phase: "main",
                fn: function(t) {
                    var e = t.state,
                        n = t.options,
                        l = t.name,
                        v = n.mainAxis,
                        h = void 0 === v || v,
                        m = n.altAxis,
                        A = void 0 !== m && m,
                        b = n.boundary,
                        g = n.rootBoundary,
                        y = n.altBoundary,
                        x = n.padding,
                        w = n.tether,
                        O = void 0 === w || w,
                        k = n.tetherOffset,
                        j = void 0 === k ? 0 : k,
                        M = (0, s.A)(e, {
                            boundary: b,
                            rootBoundary: g,
                            padding: x,
                            altBoundary: y
                        }),
                        D = (0, o.A)(e.placement),
                        E = (0, c.A)(e.placement),
                        L = !E,
                        T = (0, i.A)(D),
                        W = "x" === T ? "y" : "x",
                        P = e.modifiersData.popperOffsets,
                        q = e.rects.reference,
                        R = e.rects.popper,
                        B = "function" === typeof j ? j(Object.assign({}, e.rects, {
                            placement: e.placement
                        })) : j,
                        H = "number" === typeof B ? {
                            mainAxis: B,
                            altAxis: B
                        } : Object.assign({
                            mainAxis: 0,
                            altAxis: 0
                        }, B),
                        G = e.modifiersData.offset ? e.modifiersData.offset[e.placement] : null,
                        N = {
                            x: 0,
                            y: 0
                        };
                    if (P) {
                        if (h) {
                            var S, C = "y" === T ? r.Mn : r.kb,
                                I = "y" === T ? r.sQ : r.pG,
                                Q = "y" === T ? "height" : "width",
                                V = P[T],
                                _ = V + M[C],
                                U = V - M[I],
                                F = O ? -R[Q] / 2 : 0,
                                Y = E === r.ni ? q[Q] : R[Q],
                                z = E === r.ni ? -R[Q] : -q[Q],
                                Z = e.elements.arrow,
                                X = O && Z ? (0, f.A)(Z) : {
                                    width: 0,
                                    height: 0
                                },
                                J = e.modifiersData["arrow#persistent"] ? e.modifiersData["arrow#persistent"].padding : (0, p.A)(),
                                K = J[C],
                                $ = J[I],
                                tt = (0, a.u)(0, q[Q], X[Q]),
                                et = L ? q[Q] / 2 - F - tt - K - H.mainAxis : Y - tt - K - H.mainAxis,
                                nt = L ? -q[Q] / 2 + F + tt + $ + H.mainAxis : z + tt + $ + H.mainAxis,
                                rt = e.elements.arrow && (0, u.A)(e.elements.arrow),
                                ot = rt ? "y" === T ? rt.clientTop || 0 : rt.clientLeft || 0 : 0,
                                it = null != (S = null == G ? void 0 : G[T]) ? S : 0,
                                at = V + et - it - ot,
                                ft = V + nt - it,
                                ut = (0, a.u)(O ? (0, d.jk)(_, at) : _, V, O ? (0, d.T9)(U, ft) : U);
                            P[T] = ut, N[T] = ut - V
                        }
                        if (A) {
                            var st, ct = "x" === T ? r.Mn : r.kb,
                                pt = "x" === T ? r.sQ : r.pG,
                                dt = P[W],
                                lt = "y" === W ? "height" : "width",
                                vt = dt + M[ct],
                                ht = dt - M[pt],
                                mt = -1 !== [r.Mn, r.kb].indexOf(D),
                                At = null != (st = null == G ? void 0 : G[W]) ? st : 0,
                                bt = mt ? vt : dt - q[lt] - R[lt] - At + H.altAxis,
                                gt = mt ? dt + q[lt] + R[lt] - At - H.altAxis : ht,
                                yt = O && mt ? (0, a.P)(bt, dt, gt) : (0, a.u)(O ? bt : vt, dt, O ? gt : ht);
                            P[W] = yt, N[W] = yt - dt
                        }
                        e.modifiersData[l] = N
                    }
                },
                requiresIfExists: ["offset"]
            }
        },
        1576: function(t, e, n) {
            n.d(e, {
                n4: function() {
                    return v
                }
            });
            var r = n(711),
                o = n(9068),
                i = n(5059),
                a = n(1262),
                f = n(6607),
                u = n(8490),
                s = n(644),
                c = n(192),
                p = n(8256),
                d = n(9081),
                l = [o.A, i.A, a.A, f.A, u.A, s.A, c.A, p.A, d.A],
                v = (0, r.UD)({
                    defaultModifiers: l
                })
        },
        1815: function(t, e, n) {
            n.d(e, {
                A: function() {
                    return f
                }
            });
            var r = n(2632),
                o = n(8101),
                i = n(9703),
                a = n(4278);

            function f(t) {
                var e, n = t.reference,
                    f = t.element,
                    u = t.placement,
                    s = u ? (0, r.A)(u) : null,
                    c = u ? (0, o.A)(u) : null,
                    p = n.x + n.width / 2 - f.width / 2,
                    d = n.y + n.height / 2 - f.height / 2;
                switch (s) {
                    case a.Mn:
                        e = {
                            x: p,
                            y: n.y - f.height
                        };
                        break;
                    case a.sQ:
                        e = {
                            x: p,
                            y: n.y + n.height
                        };
                        break;
                    case a.pG:
                        e = {
                            x: n.x + n.width,
                            y: d
                        };
                        break;
                    case a.kb:
                        e = {
                            x: n.x - f.width,
                            y: d
                        };
                        break;
                    default:
                        e = {
                            x: n.x,
                            y: n.y
                        }
                }
                var l = s ? (0, i.A)(s) : null;
                if (null != l) {
                    var v = "y" === l ? "height" : "width";
                    switch (c) {
                        case a.ni:
                            e[l] = e[l] - (n[v] / 2 - f[v] / 2);
                            break;
                        case a._N:
                            e[l] = e[l] + (n[v] / 2 - f[v] / 2)
                    }
                }
                return e
            }
        },
        6397: function(t, e, n) {
            n.d(e, {
                A: function() {
                    return k
                }
            });
            var r = n(4278),
                o = n(8979),
                i = n(9760),
                a = n(793),
                f = n(2283);
            var u = n(271),
                s = n(222),
                c = n(6906);
            var p = n(5867),
                d = n(8579),
                l = n(5581),
                v = n(6354),
                h = n(2083),
                m = n(5446),
                A = n(7604);

            function b(t) {
                return Object.assign({}, t, {
                    left: t.x,
                    top: t.y,
                    right: t.x + t.width,
                    bottom: t.y + t.height
                })
            }

            function g(t, e, n) {
                return e === r.R9 ? b(function(t, e) {
                    var n = (0, o.A)(t),
                        r = (0, i.A)(t),
                        u = n.visualViewport,
                        s = r.clientWidth,
                        c = r.clientHeight,
                        p = 0,
                        d = 0;
                    if (u) {
                        s = u.width, c = u.height;
                        var l = (0, f.A)();
                        (l || !l && "fixed" === e) && (p = u.offsetLeft, d = u.offsetTop)
                    }
                    return {
                        width: s,
                        height: c,
                        x: p + (0, a.A)(t),
                        y: d
                    }
                }(t, n)) : (0, l.vq)(e) ? function(t, e) {
                    var n = (0, v.A)(t, !1, "fixed" === e);
                    return n.top = n.top + t.clientTop, n.left = n.left + t.clientLeft, n.bottom = n.top + t.clientHeight, n.right = n.left + t.clientWidth, n.width = t.clientWidth, n.height = t.clientHeight, n.x = n.left, n.y = n.top, n
                }(e, n) : b(function(t) {
                    var e, n = (0, i.A)(t),
                        r = (0, s.A)(t),
                        o = null == (e = t.ownerDocument) ? void 0 : e.body,
                        f = (0, c.T9)(n.scrollWidth, n.clientWidth, o ? o.scrollWidth : 0, o ? o.clientWidth : 0),
                        p = (0, c.T9)(n.scrollHeight, n.clientHeight, o ? o.scrollHeight : 0, o ? o.clientHeight : 0),
                        d = -r.scrollLeft + (0, a.A)(t),
                        l = -r.scrollTop;
                    return "rtl" === (0, u.A)(o || n).direction && (d += (0, c.T9)(n.clientWidth, o ? o.clientWidth : 0) - f), {
                        width: f,
                        height: p,
                        x: d,
                        y: l
                    }
                }((0, i.A)(t)))
            }

            function y(t, e, n, r) {
                var o = "clippingParents" === e ? function(t) {
                        var e = (0, p.A)((0, h.A)(t)),
                            n = ["absolute", "fixed"].indexOf((0, u.A)(t).position) >= 0 && (0, l.sb)(t) ? (0, d.A)(t) : t;
                        return (0, l.vq)(n) ? e.filter((function(t) {
                            return (0, l.vq)(t) && (0, m.A)(t, n) && "body" !== (0, A.A)(t)
                        })) : []
                    }(t) : [].concat(e),
                    i = [].concat(o, [n]),
                    a = i[0],
                    f = i.reduce((function(e, n) {
                        var o = g(t, n, r);
                        return e.top = (0, c.T9)(o.top, e.top), e.right = (0, c.jk)(o.right, e.right), e.bottom = (0, c.jk)(o.bottom, e.bottom), e.left = (0, c.T9)(o.left, e.left), e
                    }), g(t, a, r));
                return f.width = f.right - f.left, f.height = f.bottom - f.top, f.x = f.left, f.y = f.top, f
            }
            var x = n(1815),
                w = n(4318),
                O = n(1007);

            function k(t, e) {
                void 0 === e && (e = {});
                var n = e,
                    o = n.placement,
                    a = void 0 === o ? t.placement : o,
                    f = n.strategy,
                    u = void 0 === f ? t.strategy : f,
                    s = n.boundary,
                    c = void 0 === s ? r.WY : s,
                    p = n.rootBoundary,
                    d = void 0 === p ? r.R9 : p,
                    h = n.elementContext,
                    m = void 0 === h ? r.xf : h,
                    A = n.altBoundary,
                    g = void 0 !== A && A,
                    k = n.padding,
                    j = void 0 === k ? 0 : k,
                    M = (0, w.A)("number" !== typeof j ? j : (0, O.A)(j, r.OM)),
                    D = m === r.xf ? r.ir : r.xf,
                    E = t.rects.popper,
                    L = t.elements[g ? D : m],
                    T = y((0, l.vq)(L) ? L : L.contextElement || (0, i.A)(t.elements.popper), c, d, u),
                    W = (0, v.A)(t.elements.reference),
                    P = (0, x.A)({
                        reference: W,
                        element: E,
                        strategy: "absolute",
                        placement: a
                    }),
                    q = b(Object.assign({}, E, P)),
                    R = m === r.xf ? q : W,
                    B = {
                        top: T.top - R.top + M.top,
                        bottom: R.bottom - T.bottom + M.bottom,
                        left: T.left - R.left + M.left,
                        right: R.right - T.right + M.right
                    },
                    H = t.modifiersData.offset;
                if (m === r.xf && H) {
                    var G = H[a];
                    Object.keys(B).forEach((function(t) {
                        var e = [r.pG, r.sQ].indexOf(t) >= 0 ? 1 : -1,
                            n = [r.Mn, r.sQ].indexOf(t) >= 0 ? "y" : "x";
                        B[t] += G[n] * e
                    }))
                }
                return B
            }
        },
        1007: function(t, e, n) {
            function r(t, e) {
                return e.reduce((function(e, n) {
                    return e[n] = t, e
                }), {})
            }
            n.d(e, {
                A: function() {
                    return r
                }
            })
        },
        2632: function(t, e, n) {
            function r(t) {
                return t.split("-")[0]
            }
            n.d(e, {
                A: function() {
                    return r
                }
            })
        },
        7364: function(t, e, n) {
            function r() {
                return {
                    top: 0,
                    right: 0,
                    bottom: 0,
                    left: 0
                }
            }
            n.d(e, {
                A: function() {
                    return r
                }
            })
        },
        9703: function(t, e, n) {
            function r(t) {
                return ["top", "bottom"].indexOf(t) >= 0 ? "x" : "y"
            }
            n.d(e, {
                A: function() {
                    return r
                }
            })
        },
        8101: function(t, e, n) {
            function r(t) {
                return t.split("-")[1]
            }
            n.d(e, {
                A: function() {
                    return r
                }
            })
        },
        6906: function(t, e, n) {
            n.d(e, {
                LI: function() {
                    return i
                },
                T9: function() {
                    return r
                },
                jk: function() {
                    return o
                }
            });
            var r = Math.max,
                o = Math.min,
                i = Math.round
        },
        4318: function(t, e, n) {
            n.d(e, {
                A: function() {
                    return o
                }
            });
            var r = n(7364);

            function o(t) {
                return Object.assign({}, (0, r.A)(), t)
            }
        },
        2398: function(t, e, n) {
            function r() {
                var t = navigator.userAgentData;
                return null != t && t.brands && Array.isArray(t.brands) ? t.brands.map((function(t) {
                    return t.brand + "/" + t.version
                })).join(" ") : navigator.userAgent
            }
            n.d(e, {
                A: function() {
                    return r
                }
            })
        },
        6523: function(t, e, n) {
            n.d(e, {
                P: function() {
                    return i
                },
                u: function() {
                    return o
                }
            });
            var r = n(6906);

            function o(t, e, n) {
                return (0, r.T9)(t, (0, r.jk)(e, n))
            }

            function i(t, e, n) {
                var r = o(t, e, n);
                return r > n ? n : r
            }
        }
    }
]);
//# sourceMappingURL=576-1f9708e509b8fc9ce887.js.map