/*! For license information please see 470-8eb310aa5c71741b7fb9.js.LICENSE.txt */
(self.webpackChunkynab_api = self.webpackChunkynab_api || []).push([
    [470], {
        4354: function(t, e, n) {
            "use strict";
            var r = n(5836);

            function o(t, e) {
                for (var n = 0; n < e.length; n++) {
                    var r = e[n];
                    r.enumerable = r.enumerable || !1, r.configurable = !0, "value" in r && (r.writable = !0), Object.defineProperty(t, i(r.key), r)
                }
            }

            function i(t) {
                var e = function(t, e) {
                    if ("object" != typeof t || !t) return t;
                    var n = t[Symbol.toPrimitive];
                    if (void 0 !== n) {
                        var r = n.call(t, e || "default");
                        if ("object" != typeof r) return r;
                        throw new TypeError("@@toPrimitive must return a primitive value.")
                    }
                    return ("string" === e ? String : Number)(t)
                }(t, "string");
                return "symbol" == typeof e ? e : e + ""
            }
            var a = function() {
                function t(e, n, r, o) {
                    var i = arguments.length > 4 && void 0 !== arguments[4] ? arguments[4] : 0;
                    ! function(t, e) {
                        if (!(t instanceof e)) throw new TypeError("Cannot call a class as a function")
                    }(this, t), this._listener = void 0, this._isOnce = void 0, this.context = void 0, this._signal = void 0, this.priority = void 0, this.active = !0, this._listener = n, this._isOnce = r, this.context = o, this._signal = e, this.priority = i || 0
                }
                var e, n, r;
                return e = t, (n = [{
                    key: "execute",
                    value: function(t) {
                        var e;
                        return this.active && this._listener && (e = this._listener.apply(this.context, t), this._isOnce && this.detach()), e
                    }
                }, {
                    key: "detach",
                    value: function() {
                        return this._signal && this._listener ? this._signal.removeHandler(this._listener, this.context) : null
                    }
                }, {
                    key: "isOnce",
                    value: function() {
                        return this._isOnce
                    }
                }, {
                    key: "getListener",
                    value: function() {
                        return this._listener
                    }
                }, {
                    key: "destroy",
                    value: function() {
                        this._signal = null, this._listener = null, this.context = null
                    }
                }]) && o(e.prototype, n), r && o(e, r), Object.defineProperty(e, "prototype", {
                    writable: !1
                }), t
            }();

            function u(t, e) {
                var n = "undefined" != typeof Symbol && t[Symbol.iterator] || t["@@iterator"];
                if (!n) {
                    if (Array.isArray(t) || (n = function(t, e) {
                            if (t) {
                                if ("string" == typeof t) return c(t, e);
                                var n = {}.toString.call(t).slice(8, -1);
                                return "Object" === n && t.constructor && (n = t.constructor.name), "Map" === n || "Set" === n ? Array.from(t) : "Arguments" === n || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n) ? c(t, e) : void 0
                            }
                        }(t)) || e && t && "number" == typeof t.length) {
                        n && (t = n);
                        var r = 0,
                            o = function() {};
                        return {
                            s: o,
                            n: function() {
                                return r >= t.length ? {
                                    done: !0
                                } : {
                                    done: !1,
                                    value: t[r++]
                                }
                            },
                            e: function(t) {
                                throw t
                            },
                            f: o
                        }
                    }
                    throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")
                }
                var i, a = !0,
                    u = !1;
                return {
                    s: function() {
                        n = n.call(t)
                    },
                    n: function() {
                        var t = n.next();
                        return a = t.done, t
                    },
                    e: function(t) {
                        u = !0, i = t
                    },
                    f: function() {
                        try {
                            a || null == n.return || n.return()
                        } finally {
                            if (u) throw i
                        }
                    }
                }
            }

            function c(t, e) {
                (null == e || e > t.length) && (e = t.length);
                for (var n = 0, r = Array(e); n < e; n++) r[n] = t[n];
                return r
            }

            function l(t, e) {
                for (var n = 0; n < e.length; n++) {
                    var r = e[n];
                    r.enumerable = r.enumerable || !1, r.configurable = !0, "value" in r && (r.writable = !0), Object.defineProperty(t, s(r.key), r)
                }
            }

            function s(t) {
                var e = function(t, e) {
                    if ("object" != typeof t || !t) return t;
                    var n = t[Symbol.toPrimitive];
                    if (void 0 !== n) {
                        var r = n.call(t, e || "default");
                        if ("object" != typeof r) return r;
                        throw new TypeError("@@toPrimitive must return a primitive value.")
                    }
                    return ("string" === e ? String : Number)(t)
                }(t, "string");
                return "symbol" == typeof e ? e : e + ""
            }
            var f, h = function() {
                function t() {
                    ! function(t, e) {
                        if (!(t instanceof e)) throw new TypeError("Cannot call a class as a function")
                    }(this, t), this._bindings = [], this._prevParams = null, this.memorize = !1, this._shouldPropagate = !0, this.active = !0
                }
                var e, n, r;
                return e = t, n = [{
                    key: "_registerListener",
                    value: function(t, e, n, r) {
                        var o, i = this._indexOfListener(t, n);
                        if (-1 !== i) {
                            if ((o = this._bindings[i]).isOnce() !== e) throw new Error("You cannot add".concat(e ? "" : "Once", "() then add").concat(e ? "Once" : "", "() the same listener without removing the relationship first."))
                        } else o = new a(this, t, e, n, r), this._addBinding(o);
                        return this.memorize && this._prevParams && o.execute(this._prevParams), o
                    }
                }, {
                    key: "_addBinding",
                    value: function(t) {
                        var e = this._bindings.length;
                        do {
                            --e
                        } while (this._bindings[e] && t.priority <= this._bindings[e].priority);
                        this._bindings.splice(e + 1, 0, t)
                    }
                }, {
                    key: "_indexOfListener",
                    value: function(t, e) {
                        for (var n, r = this._bindings.length; r--;)
                            if ((n = this._bindings[r]).getListener() === t && n.context === e) return r;
                        return -1
                    }
                }, {
                    key: "has",
                    value: function(t) {
                        var e = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : null;
                        return -1 !== this._indexOfListener(t, e)
                    }
                }, {
                    key: "addHandler",
                    value: function(t) {
                        var e = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : null,
                            n = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : 0;
                        return this._registerListener(t, !1, e, n)
                    }
                }, {
                    key: "addOnceHandler",
                    value: function(t) {
                        var e = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : null,
                            n = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : 0;
                        return this._registerListener(t, !0, e, n)
                    }
                }, {
                    key: "removeHandler",
                    value: function(t) {
                        var e = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : null;
                        return this._internalRemove(t, e)
                    }
                }, {
                    key: "_internalRemove",
                    value: function(t) {
                        var e = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : null,
                            n = this._indexOfListener(t, e);
                        return -1 !== n && (this._bindings[n].destroy(), this._bindings.splice(n, 1)), t
                    }
                }, {
                    key: "removeAll",
                    value: function() {
                        var t, e = u(this._bindings);
                        try {
                            for (e.s(); !(t = e.n()).done;) t.value.destroy()
                        } catch (n) {
                            e.e(n)
                        } finally {
                            e.f()
                        }
                        this._bindings = []
                    }
                }, {
                    key: "getNumListeners",
                    value: function() {
                        return this._bindings.length
                    }
                }, {
                    key: "halt",
                    value: function() {
                        this._shouldPropagate = !1
                    }
                }, {
                    key: "dispatch",
                    value: function() {
                        if (this.active) {
                            for (var t = this._bindings.length, e = arguments.length, n = new Array(e), r = 0; r < e; r++) n[r] = arguments[r];
                            if (this.memorize && (this._prevParams = n), t) {
                                var o = this._bindings.slice(0);
                                this._shouldPropagate = !0;
                                do {
                                    t--
                                } while (o[t] && this._shouldPropagate && !1 !== o[t].execute(n))
                            }
                        }
                    }
                }, {
                    key: "forget",
                    value: function() {
                        this._prevParams = null
                    }
                }, {
                    key: "dispose",
                    value: function() {
                        this.removeAll(), this._bindings = [], this._prevParams = null
                    }
                }, {
                    key: "toString",
                    value: function() {
                        return "[Signal active:".concat(this.active, " numListeners:").concat(this.getNumListeners(), "]")
                    }
                }], n && l(e.prototype, n), r && l(e, r), Object.defineProperty(e, "prototype", {
                    writable: !1
                }), t
            }();

            function v(t, e) {
                for (var n = 0; n < e.length; n++) {
                    var r = e[n];
                    r.enumerable = r.enumerable || !1, r.configurable = !0, "value" in r && (r.writable = !0), Object.defineProperty(t, y(r.key), r)
                }
            }

            function y(t) {
                var e = function(t, e) {
                    if ("object" != typeof t || !t) return t;
                    var n = t[Symbol.toPrimitive];
                    if (void 0 !== n) {
                        var r = n.call(t, e || "default");
                        if ("object" != typeof r) return r;
                        throw new TypeError("@@toPrimitive must return a primitive value.")
                    }
                    return ("string" === e ? String : Number)(t)
                }(t, "string");
                return "symbol" == typeof e ? e : e + ""
            }
            h.VERSION = "1.0.0",
                function(t) {
                    var e = function(t) {
                        return t[t.Error = 0] = "Error", t[t.Warning = 1] = "Warning", t[t.Info = 2] = "Info", t[t.Debug = 3] = "Debug", t[t.Trace = 4] = "Trace", t
                    }({});
                    t.LogLevels = e;
                    var n = !1,
                        r = !1,
                        o = e.Error;

                    function i() {
                        return o
                    }

                    function a(t) {
                        for (var n = arguments.length, r = new Array(n > 1 ? n - 1 : 0), o = 1; o < n; o++) r[o - 1] = arguments[o];
                        s.apply(void 0, [e.Debug, console.debug, "color:black", t].concat(r))
                    }
                    t.mute = function() {
                        r = !0
                    }, t.unMute = function() {
                        r = !1
                    }, t.getLogLevel = i, t.setLogLevel = function(t) {
                        o = t
                    }, t.error = function(t) {
                        for (var n = arguments.length, r = new Array(n > 1 ? n - 1 : 0), o = 1; o < n; o++) r[o - 1] = arguments[o];
                        s.apply(void 0, [e.Error, console.error, "color:red", t].concat(r))
                    }, t.warning = function(t) {
                        for (var n = arguments.length, r = new Array(n > 1 ? n - 1 : 0), o = 1; o < n; o++) r[o - 1] = arguments[o];
                        s.apply(void 0, [e.Warning, console.warn, "color:orange", t].concat(r))
                    }, t.info = function(t) {
                        for (var n = arguments.length, r = new Array(n > 1 ? n - 1 : 0), o = 1; o < n; o++) r[o - 1] = arguments[o];
                        s.apply(void 0, [e.Info, console.info, "color:green", t].concat(r))
                    }, t.debug = a, t.trace = function(t) {
                        for (var n = arguments.length, r = new Array(n > 1 ? n - 1 : 0), o = 1; o < n; o++) r[o - 1] = arguments[o];
                        s.apply(void 0, [e.Trace, console.trace, "color:black", t].concat(r))
                    };
                    var u = {};

                    function c() {
                        var t, e;
                        return null !== (t = null === (e = globalThis.performance) || void 0 === e ? void 0 : e.now()) && void 0 !== t ? t : Date.now()
                    }

                    function l(t, e) {
                        var n = u[t];
                        if (n) {
                            var r = c(),
                                o = "".concat((r - n.last).toFixed(1), "ms");
                            n.last != n.start && (o += ", ".concat((r - n.start).toFixed(1), "ms total")), a("[BENCH] ".concat(n.name, " [").concat(o, "] ").concat(e), n.context), n.last = r
                        }
                    }

                    function s(t, e, o, a) {
                        if (!(1 == r || i() < t)) {
                            var u = !1;
                            e || (e = console.log, u = !0);
                            for (var c = arguments.length, l = new Array(c > 4 ? c - 4 : 0), s = 4; s < c; s++) l[s - 4] = arguments[s];
                            if (a instanceof Error) e.apply(console, [a].concat(l));
                            else {
                                var f = "";
                                f = "function" == typeof a ? a() : a;
                                var h = "";
                                u && (h += "%c ", l.unshift(o)), n && (h += "[".concat((new Date).toISOString(), "] ")), e.apply(console, ["".concat(h, " ").concat(f)].concat(l))
                            }
                        }
                    }
                    t.benchStart = function(t, e) {
                        var n = !(arguments.length > 2 && void 0 !== arguments[2]) || arguments[2],
                            r = c();
                        u[t] = {
                            name: t,
                            start: r,
                            last: r,
                            context: e
                        }, n && a("[BENCH] ".concat(t, " started"), e)
                    }, t.bench = l, t.benchEnd = function(t, e) {
                        l(t, null !== e && void 0 !== e ? e : ""), delete u[t]
                    }, t.isError = function() {
                        return i() >= e.Error
                    }, t.isWarning = function() {
                        return i() >= e.Warning
                    }, t.isInfo = function() {
                        return i() >= e.Info
                    }, t.isDebug = function() {
                        return i() >= e.Debug
                    }, t.isTrace = function() {
                        return i() >= e.Trace
                    }
                }(f || (f = {}));
            var d = function() {
                function t() {
                    ! function(t, e) {
                        if (!(t instanceof e)) throw new TypeError("Cannot call a class as a function")
                    }(this, t)
                }
                var e, n, o;
                return e = t, o = [{
                    key: "setIsImpersonating",
                    value: function(t) {
                        this._isImpersonating = t
                    }
                }, {
                    key: "transformEventProperties",
                    value: function(t) {
                        var e = {};
                        if (!t) return e;
                        for (var n = 0, o = Object.keys(t); n < o.length; n++) {
                            var i = o[n],
                                a = t[i];
                            "boolean" === typeof a && (a = a ? r.gB.True : r.gB.False), "string" !== typeof a && "number" !== typeof a && "boolean" !== typeof a || (e[i] = a)
                        }
                        return e
                    }
                }, {
                    key: "trackEvent",
                    value: function(e, n) {
                        var r = this.transformEventProperties(n);
                        f.info("Analytics Event:", e.toString(), r), t.dispatchEvent(e.toString(), r)
                    }
                }, {
                    key: "dispatchEvent",
                    value: function(t, e) {
                        this._isImpersonating || this.eventSignal.dispatch({
                            name: t,
                            properties: e
                        })
                    }
                }], (n = null) && v(e.prototype, n), o && v(e, o), Object.defineProperty(e, "prototype", {
                    writable: !1
                }), t
            }();
            d._isImpersonating = !1, d.eventSignal = new h;
            var p = n(5971);

            function g() {
                g = function() {
                    return e
                };
                var t, e = {},
                    n = Object.prototype,
                    r = n.hasOwnProperty,
                    o = Object.defineProperty || function(t, e, n) {
                        t[e] = n.value
                    },
                    i = "function" == typeof Symbol ? Symbol : {},
                    a = i.iterator || "@@iterator",
                    u = i.asyncIterator || "@@asyncIterator",
                    c = i.toStringTag || "@@toStringTag";

                function l(t, e, n) {
                    return Object.defineProperty(t, e, {
                        value: n,
                        enumerable: !0,
                        configurable: !0,
                        writable: !0
                    }), t[e]
                }
                try {
                    l({}, "")
                } catch (t) {
                    l = function(t, e, n) {
                        return t[e] = n
                    }
                }

                function s(t, e, n, r) {
                    var i = e && e.prototype instanceof m ? e : m,
                        a = Object.create(i.prototype),
                        u = new N(r || []);
                    return o(a, "_invoke", {
                        value: P(t, n, u)
                    }), a
                }

                function f(t, e, n) {
                    try {
                        return {
                            type: "normal",
                            arg: t.call(e, n)
                        }
                    } catch (t) {
                        return {
                            type: "throw",
                            arg: t
                        }
                    }
                }
                e.wrap = s;
                var h = "suspendedStart",
                    v = "suspendedYield",
                    y = "executing",
                    d = "completed",
                    p = {};

                function m() {}

                function w() {}

                function b() {}
                var _ = {};
                l(_, a, (function() {
                    return this
                }));
                var E = Object.getPrototypeOf,
                    k = E && E(E(T([])));
                k && k !== n && r.call(k, a) && (_ = k);
                var L = b.prototype = m.prototype = Object.create(_);

                function x(t) {
                    ["next", "throw", "return"].forEach((function(e) {
                        l(t, e, (function(t) {
                            return this._invoke(e, t)
                        }))
                    }))
                }

                function O(t, e) {
                    function n(o, i, a, u) {
                        var c = f(t[o], t, i);
                        if ("throw" !== c.type) {
                            var l = c.arg,
                                s = l.value;
                            return s && "object" == typeof s && r.call(s, "__await") ? e.resolve(s.__await).then((function(t) {
                                n("next", t, a, u)
                            }), (function(t) {
                                n("throw", t, a, u)
                            })) : e.resolve(s).then((function(t) {
                                l.value = t, a(l)
                            }), (function(t) {
                                return n("throw", t, a, u)
                            }))
                        }
                        u(c.arg)
                    }
                    var i;
                    o(this, "_invoke", {
                        value: function(t, r) {
                            function o() {
                                return new e((function(e, o) {
                                    n(t, r, e, o)
                                }))
                            }
                            return i = i ? i.then(o, o) : o()
                        }
                    })
                }

                function P(e, n, r) {
                    var o = h;
                    return function(i, a) {
                        if (o === y) throw Error("Generator is already running");
                        if (o === d) {
                            if ("throw" === i) throw a;
                            return {
                                value: t,
                                done: !0
                            }
                        }
                        for (r.method = i, r.arg = a;;) {
                            var u = r.delegate;
                            if (u) {
                                var c = A(u, r);
                                if (c) {
                                    if (c === p) continue;
                                    return c
                                }
                            }
                            if ("next" === r.method) r.sent = r._sent = r.arg;
                            else if ("throw" === r.method) {
                                if (o === h) throw o = d, r.arg;
                                r.dispatchException(r.arg)
                            } else "return" === r.method && r.abrupt("return", r.arg);
                            o = y;
                            var l = f(e, n, r);
                            if ("normal" === l.type) {
                                if (o = r.done ? d : v, l.arg === p) continue;
                                return {
                                    value: l.arg,
                                    done: r.done
                                }
                            }
                            "throw" === l.type && (o = d, r.method = "throw", r.arg = l.arg)
                        }
                    }
                }

                function A(e, n) {
                    var r = n.method,
                        o = e.iterator[r];
                    if (o === t) return n.delegate = null, "throw" === r && e.iterator.return && (n.method = "return", n.arg = t, A(e, n), "throw" === n.method) || "return" !== r && (n.method = "throw", n.arg = new TypeError("The iterator does not provide a '" + r + "' method")), p;
                    var i = f(o, e.iterator, n.arg);
                    if ("throw" === i.type) return n.method = "throw", n.arg = i.arg, n.delegate = null, p;
                    var a = i.arg;
                    return a ? a.done ? (n[e.resultName] = a.value, n.next = e.nextLoc, "return" !== n.method && (n.method = "next", n.arg = t), n.delegate = null, p) : a : (n.method = "throw", n.arg = new TypeError("iterator result is not an object"), n.delegate = null, p)
                }

                function S(t) {
                    var e = {
                        tryLoc: t[0]
                    };
                    1 in t && (e.catchLoc = t[1]), 2 in t && (e.finallyLoc = t[2], e.afterLoc = t[3]), this.tryEntries.push(e)
                }

                function j(t) {
                    var e = t.completion || {};
                    e.type = "normal", delete e.arg, t.completion = e
                }

                function N(t) {
                    this.tryEntries = [{
                        tryLoc: "root"
                    }], t.forEach(S, this), this.reset(!0)
                }

                function T(e) {
                    if (e || "" === e) {
                        var n = e[a];
                        if (n) return n.call(e);
                        if ("function" == typeof e.next) return e;
                        if (!isNaN(e.length)) {
                            var o = -1,
                                i = function n() {
                                    for (; ++o < e.length;)
                                        if (r.call(e, o)) return n.value = e[o], n.done = !1, n;
                                    return n.value = t, n.done = !0, n
                                };
                            return i.next = i
                        }
                    }
                    throw new TypeError(typeof e + " is not iterable")
                }
                return w.prototype = b, o(L, "constructor", {
                    value: b,
                    configurable: !0
                }), o(b, "constructor", {
                    value: w,
                    configurable: !0
                }), w.displayName = l(b, c, "GeneratorFunction"), e.isGeneratorFunction = function(t) {
                    var e = "function" == typeof t && t.constructor;
                    return !!e && (e === w || "GeneratorFunction" === (e.displayName || e.name))
                }, e.mark = function(t) {
                    return Object.setPrototypeOf ? Object.setPrototypeOf(t, b) : (t.__proto__ = b, l(t, c, "GeneratorFunction")), t.prototype = Object.create(L), t
                }, e.awrap = function(t) {
                    return {
                        __await: t
                    }
                }, x(O.prototype), l(O.prototype, u, (function() {
                    return this
                })), e.AsyncIterator = O, e.async = function(t, n, r, o, i) {
                    void 0 === i && (i = Promise);
                    var a = new O(s(t, n, r, o), i);
                    return e.isGeneratorFunction(n) ? a : a.next().then((function(t) {
                        return t.done ? t.value : a.next()
                    }))
                }, x(L), l(L, c, "Generator"), l(L, a, (function() {
                    return this
                })), l(L, "toString", (function() {
                    return "[object Generator]"
                })), e.keys = function(t) {
                    var e = Object(t),
                        n = [];
                    for (var r in e) n.push(r);
                    return n.reverse(),
                        function t() {
                            for (; n.length;) {
                                var r = n.pop();
                                if (r in e) return t.value = r, t.done = !1, t
                            }
                            return t.done = !0, t
                        }
                }, e.values = T, N.prototype = {
                    constructor: N,
                    reset: function(e) {
                        if (this.prev = 0, this.next = 0, this.sent = this._sent = t, this.done = !1, this.delegate = null, this.method = "next", this.arg = t, this.tryEntries.forEach(j), !e)
                            for (var n in this) "t" === n.charAt(0) && r.call(this, n) && !isNaN(+n.slice(1)) && (this[n] = t)
                    },
                    stop: function() {
                        this.done = !0;
                        var t = this.tryEntries[0].completion;
                        if ("throw" === t.type) throw t.arg;
                        return this.rval
                    },
                    dispatchException: function(e) {
                        if (this.done) throw e;
                        var n = this;

                        function o(r, o) {
                            return u.type = "throw", u.arg = e, n.next = r, o && (n.method = "next", n.arg = t), !!o
                        }
                        for (var i = this.tryEntries.length - 1; i >= 0; --i) {
                            var a = this.tryEntries[i],
                                u = a.completion;
                            if ("root" === a.tryLoc) return o("end");
                            if (a.tryLoc <= this.prev) {
                                var c = r.call(a, "catchLoc"),
                                    l = r.call(a, "finallyLoc");
                                if (c && l) {
                                    if (this.prev < a.catchLoc) return o(a.catchLoc, !0);
                                    if (this.prev < a.finallyLoc) return o(a.finallyLoc)
                                } else if (c) {
                                    if (this.prev < a.catchLoc) return o(a.catchLoc, !0)
                                } else {
                                    if (!l) throw Error("try statement without catch or finally");
                                    if (this.prev < a.finallyLoc) return o(a.finallyLoc)
                                }
                            }
                        }
                    },
                    abrupt: function(t, e) {
                        for (var n = this.tryEntries.length - 1; n >= 0; --n) {
                            var o = this.tryEntries[n];
                            if (o.tryLoc <= this.prev && r.call(o, "finallyLoc") && this.prev < o.finallyLoc) {
                                var i = o;
                                break
                            }
                        }
                        i && ("break" === t || "continue" === t) && i.tryLoc <= e && e <= i.finallyLoc && (i = null);
                        var a = i ? i.completion : {};
                        return a.type = t, a.arg = e, i ? (this.method = "next", this.next = i.finallyLoc, p) : this.complete(a)
                    },
                    complete: function(t, e) {
                        if ("throw" === t.type) throw t.arg;
                        return "break" === t.type || "continue" === t.type ? this.next = t.arg : "return" === t.type ? (this.rval = this.arg = t.arg, this.method = "return", this.next = "end") : "normal" === t.type && e && (this.next = e), p
                    },
                    finish: function(t) {
                        for (var e = this.tryEntries.length - 1; e >= 0; --e) {
                            var n = this.tryEntries[e];
                            if (n.finallyLoc === t) return this.complete(n.completion, n.afterLoc), j(n), p
                        }
                    },
                    catch: function(t) {
                        for (var e = this.tryEntries.length - 1; e >= 0; --e) {
                            var n = this.tryEntries[e];
                            if (n.tryLoc === t) {
                                var r = n.completion;
                                if ("throw" === r.type) {
                                    var o = r.arg;
                                    j(n)
                                }
                                return o
                            }
                        }
                        throw Error("illegal catch attempt")
                    },
                    delegateYield: function(e, n, r) {
                        return this.delegate = {
                            iterator: T(e),
                            resultName: n,
                            nextLoc: r
                        }, "next" === this.method && (this.arg = t), p
                    }
                }, e
            }

            function m(t, e, n, r, o, i, a) {
                try {
                    var u = t[i](a),
                        c = u.value
                } catch (t) {
                    return void n(t)
                }
                u.done ? e(c) : Promise.resolve(c).then(r, o)
            }

            function w(t, e) {
                for (var n = 0; n < e.length; n++) {
                    var r = e[n];
                    r.enumerable = r.enumerable || !1, r.configurable = !0, "value" in r && (r.writable = !0), Object.defineProperty(t, b(r.key), r)
                }
            }

            function b(t) {
                var e = function(t, e) {
                    if ("object" != typeof t || !t) return t;
                    var n = t[Symbol.toPrimitive];
                    if (void 0 !== n) {
                        var r = n.call(t, e || "default");
                        if ("object" != typeof r) return r;
                        throw new TypeError("@@toPrimitive must return a primitive value.")
                    }
                    return ("string" === e ? String : Number)(t)
                }(t, "string");
                return "symbol" == typeof e ? e : e + ""
            }
            var _ = function() {
                function t() {
                    ! function(t, e) {
                        if (!(t instanceof e)) throw new TypeError("Cannot call a class as a function")
                    }(this, t), this.destinationName = "amplitude"
                }
                var e, n, r, o, i;
                return e = t, n = [{
                    key: "track",
                    value: function(t, e) {
                        p.w.track(t, e)
                    }
                }, {
                    key: "identify",
                    value: function(t) {
                        p.w.identify(t)
                    }
                }, {
                    key: "setUserId",
                    value: function(t) {
                        p.w.setUserId(t)
                    }
                }, {
                    key: "reset",
                    value: function() {
                        p.w.reset()
                    }
                }, {
                    key: "flush",
                    value: (o = g().mark((function t() {
                        return g().wrap((function(t) {
                            for (;;) switch (t.prev = t.next) {
                                case 0:
                                    return t.next = 2, p.w.flush();
                                case 2:
                                case "end":
                                    return t.stop()
                            }
                        }), t)
                    })), i = function() {
                        var t = this,
                            e = arguments;
                        return new Promise((function(n, r) {
                            var i = o.apply(t, e);

                            function a(t) {
                                m(i, n, r, a, u, "next", t)
                            }

                            function u(t) {
                                m(i, n, r, a, u, "throw", t)
                            }
                            a(void 0)
                        }))
                    }, function() {
                        return i.apply(this, arguments)
                    })
                }], n && w(e.prototype, n), r && w(e, r), Object.defineProperty(e, "prototype", {
                    writable: !1
                }), t
            }();

            function E() {
                E = function() {
                    return e
                };
                var t, e = {},
                    n = Object.prototype,
                    r = n.hasOwnProperty,
                    o = Object.defineProperty || function(t, e, n) {
                        t[e] = n.value
                    },
                    i = "function" == typeof Symbol ? Symbol : {},
                    a = i.iterator || "@@iterator",
                    u = i.asyncIterator || "@@asyncIterator",
                    c = i.toStringTag || "@@toStringTag";

                function l(t, e, n) {
                    return Object.defineProperty(t, e, {
                        value: n,
                        enumerable: !0,
                        configurable: !0,
                        writable: !0
                    }), t[e]
                }
                try {
                    l({}, "")
                } catch (t) {
                    l = function(t, e, n) {
                        return t[e] = n
                    }
                }

                function s(t, e, n, r) {
                    var i = e && e.prototype instanceof g ? e : g,
                        a = Object.create(i.prototype),
                        u = new N(r || []);
                    return o(a, "_invoke", {
                        value: P(t, n, u)
                    }), a
                }

                function f(t, e, n) {
                    try {
                        return {
                            type: "normal",
                            arg: t.call(e, n)
                        }
                    } catch (t) {
                        return {
                            type: "throw",
                            arg: t
                        }
                    }
                }
                e.wrap = s;
                var h = "suspendedStart",
                    v = "suspendedYield",
                    y = "executing",
                    d = "completed",
                    p = {};

                function g() {}

                function m() {}

                function w() {}
                var b = {};
                l(b, a, (function() {
                    return this
                }));
                var _ = Object.getPrototypeOf,
                    k = _ && _(_(T([])));
                k && k !== n && r.call(k, a) && (b = k);
                var L = w.prototype = g.prototype = Object.create(b);

                function x(t) {
                    ["next", "throw", "return"].forEach((function(e) {
                        l(t, e, (function(t) {
                            return this._invoke(e, t)
                        }))
                    }))
                }

                function O(t, e) {
                    function n(o, i, a, u) {
                        var c = f(t[o], t, i);
                        if ("throw" !== c.type) {
                            var l = c.arg,
                                s = l.value;
                            return s && "object" == typeof s && r.call(s, "__await") ? e.resolve(s.__await).then((function(t) {
                                n("next", t, a, u)
                            }), (function(t) {
                                n("throw", t, a, u)
                            })) : e.resolve(s).then((function(t) {
                                l.value = t, a(l)
                            }), (function(t) {
                                return n("throw", t, a, u)
                            }))
                        }
                        u(c.arg)
                    }
                    var i;
                    o(this, "_invoke", {
                        value: function(t, r) {
                            function o() {
                                return new e((function(e, o) {
                                    n(t, r, e, o)
                                }))
                            }
                            return i = i ? i.then(o, o) : o()
                        }
                    })
                }

                function P(e, n, r) {
                    var o = h;
                    return function(i, a) {
                        if (o === y) throw Error("Generator is already running");
                        if (o === d) {
                            if ("throw" === i) throw a;
                            return {
                                value: t,
                                done: !0
                            }
                        }
                        for (r.method = i, r.arg = a;;) {
                            var u = r.delegate;
                            if (u) {
                                var c = A(u, r);
                                if (c) {
                                    if (c === p) continue;
                                    return c
                                }
                            }
                            if ("next" === r.method) r.sent = r._sent = r.arg;
                            else if ("throw" === r.method) {
                                if (o === h) throw o = d, r.arg;
                                r.dispatchException(r.arg)
                            } else "return" === r.method && r.abrupt("return", r.arg);
                            o = y;
                            var l = f(e, n, r);
                            if ("normal" === l.type) {
                                if (o = r.done ? d : v, l.arg === p) continue;
                                return {
                                    value: l.arg,
                                    done: r.done
                                }
                            }
                            "throw" === l.type && (o = d, r.method = "throw", r.arg = l.arg)
                        }
                    }
                }

                function A(e, n) {
                    var r = n.method,
                        o = e.iterator[r];
                    if (o === t) return n.delegate = null, "throw" === r && e.iterator.return && (n.method = "return", n.arg = t, A(e, n), "throw" === n.method) || "return" !== r && (n.method = "throw", n.arg = new TypeError("The iterator does not provide a '" + r + "' method")), p;
                    var i = f(o, e.iterator, n.arg);
                    if ("throw" === i.type) return n.method = "throw", n.arg = i.arg, n.delegate = null, p;
                    var a = i.arg;
                    return a ? a.done ? (n[e.resultName] = a.value, n.next = e.nextLoc, "return" !== n.method && (n.method = "next", n.arg = t), n.delegate = null, p) : a : (n.method = "throw", n.arg = new TypeError("iterator result is not an object"), n.delegate = null, p)
                }

                function S(t) {
                    var e = {
                        tryLoc: t[0]
                    };
                    1 in t && (e.catchLoc = t[1]), 2 in t && (e.finallyLoc = t[2], e.afterLoc = t[3]), this.tryEntries.push(e)
                }

                function j(t) {
                    var e = t.completion || {};
                    e.type = "normal", delete e.arg, t.completion = e
                }

                function N(t) {
                    this.tryEntries = [{
                        tryLoc: "root"
                    }], t.forEach(S, this), this.reset(!0)
                }

                function T(e) {
                    if (e || "" === e) {
                        var n = e[a];
                        if (n) return n.call(e);
                        if ("function" == typeof e.next) return e;
                        if (!isNaN(e.length)) {
                            var o = -1,
                                i = function n() {
                                    for (; ++o < e.length;)
                                        if (r.call(e, o)) return n.value = e[o], n.done = !1, n;
                                    return n.value = t, n.done = !0, n
                                };
                            return i.next = i
                        }
                    }
                    throw new TypeError(typeof e + " is not iterable")
                }
                return m.prototype = w, o(L, "constructor", {
                    value: w,
                    configurable: !0
                }), o(w, "constructor", {
                    value: m,
                    configurable: !0
                }), m.displayName = l(w, c, "GeneratorFunction"), e.isGeneratorFunction = function(t) {
                    var e = "function" == typeof t && t.constructor;
                    return !!e && (e === m || "GeneratorFunction" === (e.displayName || e.name))
                }, e.mark = function(t) {
                    return Object.setPrototypeOf ? Object.setPrototypeOf(t, w) : (t.__proto__ = w, l(t, c, "GeneratorFunction")), t.prototype = Object.create(L), t
                }, e.awrap = function(t) {
                    return {
                        __await: t
                    }
                }, x(O.prototype), l(O.prototype, u, (function() {
                    return this
                })), e.AsyncIterator = O, e.async = function(t, n, r, o, i) {
                    void 0 === i && (i = Promise);
                    var a = new O(s(t, n, r, o), i);
                    return e.isGeneratorFunction(n) ? a : a.next().then((function(t) {
                        return t.done ? t.value : a.next()
                    }))
                }, x(L), l(L, c, "Generator"), l(L, a, (function() {
                    return this
                })), l(L, "toString", (function() {
                    return "[object Generator]"
                })), e.keys = function(t) {
                    var e = Object(t),
                        n = [];
                    for (var r in e) n.push(r);
                    return n.reverse(),
                        function t() {
                            for (; n.length;) {
                                var r = n.pop();
                                if (r in e) return t.value = r, t.done = !1, t
                            }
                            return t.done = !0, t
                        }
                }, e.values = T, N.prototype = {
                    constructor: N,
                    reset: function(e) {
                        if (this.prev = 0, this.next = 0, this.sent = this._sent = t, this.done = !1, this.delegate = null, this.method = "next", this.arg = t, this.tryEntries.forEach(j), !e)
                            for (var n in this) "t" === n.charAt(0) && r.call(this, n) && !isNaN(+n.slice(1)) && (this[n] = t)
                    },
                    stop: function() {
                        this.done = !0;
                        var t = this.tryEntries[0].completion;
                        if ("throw" === t.type) throw t.arg;
                        return this.rval
                    },
                    dispatchException: function(e) {
                        if (this.done) throw e;
                        var n = this;

                        function o(r, o) {
                            return u.type = "throw", u.arg = e, n.next = r, o && (n.method = "next", n.arg = t), !!o
                        }
                        for (var i = this.tryEntries.length - 1; i >= 0; --i) {
                            var a = this.tryEntries[i],
                                u = a.completion;
                            if ("root" === a.tryLoc) return o("end");
                            if (a.tryLoc <= this.prev) {
                                var c = r.call(a, "catchLoc"),
                                    l = r.call(a, "finallyLoc");
                                if (c && l) {
                                    if (this.prev < a.catchLoc) return o(a.catchLoc, !0);
                                    if (this.prev < a.finallyLoc) return o(a.finallyLoc)
                                } else if (c) {
                                    if (this.prev < a.catchLoc) return o(a.catchLoc, !0)
                                } else {
                                    if (!l) throw Error("try statement without catch or finally");
                                    if (this.prev < a.finallyLoc) return o(a.finallyLoc)
                                }
                            }
                        }
                    },
                    abrupt: function(t, e) {
                        for (var n = this.tryEntries.length - 1; n >= 0; --n) {
                            var o = this.tryEntries[n];
                            if (o.tryLoc <= this.prev && r.call(o, "finallyLoc") && this.prev < o.finallyLoc) {
                                var i = o;
                                break
                            }
                        }
                        i && ("break" === t || "continue" === t) && i.tryLoc <= e && e <= i.finallyLoc && (i = null);
                        var a = i ? i.completion : {};
                        return a.type = t, a.arg = e, i ? (this.method = "next", this.next = i.finallyLoc, p) : this.complete(a)
                    },
                    complete: function(t, e) {
                        if ("throw" === t.type) throw t.arg;
                        return "break" === t.type || "continue" === t.type ? this.next = t.arg : "return" === t.type ? (this.rval = this.arg = t.arg, this.method = "return", this.next = "end") : "normal" === t.type && e && (this.next = e), p
                    },
                    finish: function(t) {
                        for (var e = this.tryEntries.length - 1; e >= 0; --e) {
                            var n = this.tryEntries[e];
                            if (n.finallyLoc === t) return this.complete(n.completion, n.afterLoc), j(n), p
                        }
                    },
                    catch: function(t) {
                        for (var e = this.tryEntries.length - 1; e >= 0; --e) {
                            var n = this.tryEntries[e];
                            if (n.tryLoc === t) {
                                var r = n.completion;
                                if ("throw" === r.type) {
                                    var o = r.arg;
                                    j(n)
                                }
                                return o
                            }
                        }
                        throw Error("illegal catch attempt")
                    },
                    delegateYield: function(e, n, r) {
                        return this.delegate = {
                            iterator: T(e),
                            resultName: n,
                            nextLoc: r
                        }, "next" === this.method && (this.arg = t), p
                    }
                }, e
            }

            function k(t, e, n, r, o, i, a) {
                try {
                    var u = t[i](a),
                        c = u.value
                } catch (t) {
                    return void n(t)
                }
                u.done ? e(c) : Promise.resolve(c).then(r, o)
            }

            function L(t) {
                return function() {
                    var e = this,
                        n = arguments;
                    return new Promise((function(r, o) {
                        var i = t.apply(e, n);

                        function a(t) {
                            k(i, r, o, a, u, "next", t)
                        }

                        function u(t) {
                            k(i, r, o, a, u, "throw", t)
                        }
                        a(void 0)
                    }))
                }
            }

            function x(t, e) {
                var n = "undefined" != typeof Symbol && t[Symbol.iterator] || t["@@iterator"];
                if (!n) {
                    if (Array.isArray(t) || (n = function(t, e) {
                            if (t) {
                                if ("string" == typeof t) return O(t, e);
                                var n = {}.toString.call(t).slice(8, -1);
                                return "Object" === n && t.constructor && (n = t.constructor.name), "Map" === n || "Set" === n ? Array.from(t) : "Arguments" === n || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n) ? O(t, e) : void 0
                            }
                        }(t)) || e && t && "number" == typeof t.length) {
                        n && (t = n);
                        var r = 0,
                            o = function() {};
                        return {
                            s: o,
                            n: function() {
                                return r >= t.length ? {
                                    done: !0
                                } : {
                                    done: !1,
                                    value: t[r++]
                                }
                            },
                            e: function(t) {
                                throw t
                            },
                            f: o
                        }
                    }
                    throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")
                }
                var i, a = !0,
                    u = !1;
                return {
                    s: function() {
                        n = n.call(t)
                    },
                    n: function() {
                        var t = n.next();
                        return a = t.done, t
                    },
                    e: function(t) {
                        u = !0, i = t
                    },
                    f: function() {
                        try {
                            a || null == n.return || n.return()
                        } finally {
                            if (u) throw i
                        }
                    }
                }
            }

            function O(t, e) {
                (null == e || e > t.length) && (e = t.length);
                for (var n = 0, r = Array(e); n < e; n++) r[n] = t[n];
                return r
            }

            function P(t, e) {
                for (var n = 0; n < e.length; n++) {
                    var r = e[n];
                    r.enumerable = r.enumerable || !1, r.configurable = !0, "value" in r && (r.writable = !0), Object.defineProperty(t, A(r.key), r)
                }
            }

            function A(t) {
                var e = function(t, e) {
                    if ("object" != typeof t || !t) return t;
                    var n = t[Symbol.toPrimitive];
                    if (void 0 !== n) {
                        var r = n.call(t, e || "default");
                        if ("object" != typeof r) return r;
                        throw new TypeError("@@toPrimitive must return a primitive value.")
                    }
                    return ("string" === e ? String : Number)(t)
                }(t, "string");
                return "symbol" == typeof e ? e : e + ""
            }
            var S = function() {
                    function t() {
                        ! function(t, e) {
                            if (!(t instanceof e)) throw new TypeError("Cannot call a class as a function")
                        }(this, t), this.destinations = []
                    }
                    var e, n, r, o;
                    return e = t, n = [{
                        key: "registerDestination",
                        value: function(t) {
                            this.destinations.push(t)
                        }
                    }, {
                        key: "unregisterDestination",
                        value: function(t) {
                            this.destinations = this.destinations.filter((function(e) {
                                return e !== t
                            }))
                        }
                    }, {
                        key: "logEvent",
                        value: function(t, e, n) {
                            var r = d.transformEventProperties(e);
                            f.info("Analytics Event:", t.toString(), r), this.logEventWithoutValidating(t.toString(), r, n)
                        }
                    }, {
                        key: "logEventWithoutValidating",
                        value: function(t, e, n) {
                            f.debug("Analytics Event:", t, e);
                            var r, o = x(this.destinations);
                            try {
                                for (o.s(); !(r = o.n()).done;) r.value.track(t, e)
                            } catch (i) {
                                o.e(i)
                            } finally {
                                o.f()
                            }
                            null !== n && void 0 !== n && n.flush && this.flush()
                        }
                    }, {
                        key: "setUserProperties",
                        value: function(t) {
                            this.destinations.forEach((function(e) {
                                var n;
                                return null === (n = e.identify) || void 0 === n ? void 0 : n.call(e, t)
                            }))
                        }
                    }, {
                        key: "login",
                        value: function(t) {
                            this.destinations.forEach((function(e) {
                                var n;
                                return null === (n = e.setUserId) || void 0 === n ? void 0 : n.call(e, t)
                            }))
                        }
                    }, {
                        key: "logout",
                        value: function() {
                            this.destinations.forEach((function(t) {
                                var e;
                                return null === (e = t.reset) || void 0 === e ? void 0 : e.call(t)
                            }))
                        }
                    }, {
                        key: "flush",
                        value: (o = L(E().mark((function t() {
                            return E().wrap((function(t) {
                                for (;;) switch (t.prev = t.next) {
                                    case 0:
                                        return t.next = 2, Promise.all(this.destinations.map(function() {
                                            var t = L(E().mark((function t(e) {
                                                var n;
                                                return E().wrap((function(t) {
                                                    for (;;) switch (t.prev = t.next) {
                                                        case 0:
                                                            return t.next = 2, null === (n = e.flush) || void 0 === n ? void 0 : n.call(e);
                                                        case 2:
                                                        case "end":
                                                            return t.stop()
                                                    }
                                                }), t)
                                            })));
                                            return function(e) {
                                                return t.apply(this, arguments)
                                            }
                                        }()));
                                    case 2:
                                    case "end":
                                        return t.stop()
                                }
                            }), t, this)
                        }))), function() {
                            return o.apply(this, arguments)
                        })
                    }], n && P(e.prototype, n), r && P(e, r), Object.defineProperty(e, "prototype", {
                        writable: !1
                    }), t
                }(),
                j = new S;
            j.registerDestination(new _);
            var N = n(6953);

            function T(t, e) {
                for (var n = 0; n < e.length; n++) {
                    var r = e[n];
                    r.enumerable = r.enumerable || !1, r.configurable = !0, "value" in r && (r.writable = !0), Object.defineProperty(t, I(r.key), r)
                }
            }

            function I(t) {
                var e = function(t, e) {
                    if ("object" != typeof t || !t) return t;
                    var n = t[Symbol.toPrimitive];
                    if (void 0 !== n) {
                        var r = n.call(t, e || "default");
                        if ("object" != typeof r) return r;
                        throw new TypeError("@@toPrimitive must return a primitive value.")
                    }
                    return ("string" === e ? String : Number)(t)
                }(t, "string");
                return "symbol" == typeof e ? e : e + ""
            }! function() {
                var t = function() {
                    function t() {
                        ! function(t, e) {
                            if (!(t instanceof e)) throw new TypeError("Cannot call a class as a function")
                        }(this, t)
                    }
                    var e, n, r;
                    return e = t, n = [{
                        key: "retryWithDelay",
                        value: function(t) {
                            return window.setTimeout((function() {
                                t()
                            }), 100)
                        }
                    }, {
                        key: "reportError",
                        value: function(t) {
                            var e;
                            null === (e = window.DD_RUM) || void 0 === e || e.addError(t)
                        }
                    }, {
                        key: "trackEvent",
                        value: function(t) {
                            var e = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {},
                                n = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : {
                                    flush: !1
                                };
                            this._isImpersonating() || j.logEvent(t, e, n)
                        }
                    }, {
                        key: "initMobile",
                        value: function() {
                            this.trackEvent = this.trackEventMobile
                        }
                    }, {
                        key: "trackEventMobile",
                        value: function(t) {
                            var e = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {};
                            if (!this._isImpersonating()) {
                                var n = d.transformEventProperties(e);
                                YNABMobile.trackEvent(t, n)
                            }
                        }
                    }, {
                        key: "trackLogin",
                        value: function(t, e) {
                            var n, r, o;
                            j.login(e), this.trackEvent(N.oA.General_LoggedIn, (n = {}, r = N.I_.LogInMethod, o = this._authenticationMethod(t), (r = I(r)) in n ? Object.defineProperty(n, r, {
                                value: o,
                                enumerable: !0,
                                configurable: !0,
                                writable: !0
                            }) : n[r] = o, n), {
                                flush: !0
                            })
                        }
                    }, {
                        key: "trackLogout",
                        value: function() {
                            this.trackEvent(N.oA.General_LoggedOut, {}, {
                                flush: !0
                            })
                        }
                    }, {
                        key: "logoutAnalytics",
                        value: function() {
                            j.logout()
                        }
                    }, {
                        key: "logoutOfChatWidgetProviders",
                        value: function() {
                            if (window.YNAB_CLIENT_CONSTANTS) return YNAB.logoutOfChatWidgetProviders()
                        }
                    }, {
                        key: "trackSignup",
                        value: function(t, e) {
                            this._isImpersonating() || (window.gtmEvent && window.gtmEvent("Completed Sign Up", {
                                signUpMethod: this._authenticationMethod(t),
                                userId: e,
                                hostname: window.location.hostname
                            }), j.login(e))
                        }
                    }, {
                        key: "_authenticationMethod",
                        value: function(t) {
                            return "apple" == t ? "Apple" : "google" == t ? "Google" : "Email"
                        }
                    }, {
                        key: "_isImpersonating",
                        value: function() {
                            var t;
                            return null != (null === (t = window.YNAB_CLIENT_CONSTANTS) || void 0 === t ? void 0 : t.IMPERSONATION_EXPIRES_AT)
                        }
                    }], n && T(e.prototype, n), r && T(e, r), Object.defineProperty(e, "prototype", {
                        writable: !1
                    }), t
                }();
                window.YNABAnalytics = new t
            }()
        },
        6609: function(t, e, n) {
            "use strict";
            var r = n(4692),
                o = n.n(r),
                i = n(6519);
            window.$ = window.jQuery = o(), window.Rails = i.A, i.A.start()
        },
        1175: function() {
            this.l = {
                    getSessionToken: function() {
                        var t;
                        return null === (t = (arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : window.document).querySelector("meta[name='session-token']")) || void 0 === t ? void 0 : t.getAttribute("content")
                    },
                    setSessionToken: function(t) {
                        t && ($("meta[name=session-token]").attr("content", t), YNABMobile.sessionTokenChanged(t))
                    },
                    redirect: function(t) {
                        window.location.href = t
                    },
                    redirectWithDelay: function(t) {
                        return setTimeout((function() {
                            return YNAB.redirect(t)
                        }), YNAB.testing ? 10 : 1e3)
                    },
                    _routes: {},
                    route: function() {
                        for (var t = arguments.length, e = new Array(t), n = 0; n < t; n++) e[n] = arguments[n];
                        for (var r = e.pop(), o = 0, i = e; o < i.length; o++) {
                            var a = i[o];
                            this._routes[a] = r
                        }
                    },
                    dispatch: function(t) {
                        var e = t && t.data("page"),
                            n = e && this._routes[e];
                        if (n) return n(t)
                    },
                    initMobile: function(t) {
                        0 != t.length && (t.on("click", ".launch_app_button", (function() {
                            if (YNABMobile.closeWebView) return YNABMobile.closeWebView(), !1
                        })), t.on("click", "[data-mobile-subscription-plan-change]", (function() {
                            return YNABMobile.openSubscriptionPlanChange(), !1
                        })), YNABMobile.trackEvent && YNABAnalytics.initMobile())
                    },
                    copyTextToClipboard: function(t) {
                        try {
                            var e = t.contentEditable,
                                n = t.readOnly,
                                r = document.createRange();
                            t.contenteditable = !0, t.readonly = !1, r.selectNodeContents(t);
                            var o = window.getSelection();
                            return o.removeAllRanges(), o.addRange(r), t.setSelectionRange(0, 500), t.contentEditable = e, t.readOnly = n, document.execCommand("copy"), !0
                        } catch (i) {
                            return console.log("Copy to clipboard not available. Please use Ctrl/Cmd+C to copy."), !1
                        }
                    },
                    logoutOfChatWidgetProviders: function() {
                        try {
                            var t, e;
                            null === (t = window.Kustomer) || void 0 === t || t.close(), null === (e = window.Kustomer) || void 0 === e || e.logout((function() {
                                var t;
                                return null === (t = window.Kustomer) || void 0 === t ? void 0 : t.stop()
                            }))
                        } catch (r) {
                            var n;
                            null === (n = window.DD_RUM) || void 0 === n || n.addError(r)
                        }
                    },
                    deviceId: function() {
                        return $("meta[name=kustomer-chat-widget-device-id]").attr("content")
                    }
                }, this.f = this.f || {
                    sessionTokenChanged: function(t) {},
                    accountDeleted: function() {},
                    closeWebView: function() {},
                    openSubscriptionPlanChange: function() {},
                    trackEvent: function(t, e) {}
                }, "undefined" !== typeof window && (window.YNAB = window.YNAB || this.l, window.YNABMobile = window.YNABMobile || this.f),
                function(t) {
                    t((function() {
                        YNAB.dispatch(t("body")), YNAB.initMobile(t('[data-ynab-device="ios"], [data-ynab-device="android"]'))
                    }))
                }(jQuery)
        }
    }
]);
//# sourceMappingURL=470-8eb310aa5c71741b7fb9.js.map