/*! For license information please see application-85d5583dd35ee3589d90.js.LICENSE.txt */
(self.webpackChunkynab_api = self.webpackChunkynab_api || []).push([
    [543], {
        8325: function(t, e, r) {
            "use strict";
            var n = r(1036),
                o = r(2891),
                i = r(6953);

            function a(t, e) {
                for (var r = 0; r < e.length; r++) {
                    var n = e[r];
                    n.enumerable = n.enumerable || !1, n.configurable = !0, "value" in n && (n.writable = !0), Object.defineProperty(t, u(n.key), n)
                }
            }

            function u(t) {
                var e = function(t, e) {
                    if ("object" != typeof t || !t) return t;
                    var r = t[Symbol.toPrimitive];
                    if (void 0 !== r) {
                        var n = r.call(t, e || "default");
                        if ("object" != typeof n) return n;
                        throw new TypeError("@@toPrimitive must return a primitive value.")
                    }
                    return ("string" === e ? String : Number)(t)
                }(t, "string");
                return "symbol" == typeof e ? e : e + ""
            }

            function c(t, e, r) {
                return e = l(e),
                    function(t, e) {
                        if (e && ("object" == typeof e || "function" == typeof e)) return e;
                        if (void 0 !== e) throw new TypeError("Derived constructors may only return object or undefined");
                        return function(t) {
                            if (void 0 === t) throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
                            return t
                        }(t)
                    }(t, s() ? Reflect.construct(e, r || [], l(t).constructor) : e.apply(t, r))
            }

            function s() {
                try {
                    var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], (function() {})))
                } catch (t) {}
                return (s = function() {
                    return !!t
                })()
            }

            function l(t) {
                return l = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function(t) {
                    return t.__proto__ || Object.getPrototypeOf(t)
                }, l(t)
            }

            function f(t, e) {
                return f = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function(t, e) {
                    return t.__proto__ = e, t
                }, f(t, e)
            }
            var d = function(t) {
                function e() {
                    var t;
                    ! function(t, e) {
                        if (!(t instanceof e)) throw new TypeError("Cannot call a class as a function")
                    }(this, e);
                    for (var r = arguments.length, n = new Array(r), o = 0; o < r; o++) n[o] = arguments[o];
                    return (t = c(this, e, [].concat(n))).resetTimeout = void 0, t
                }
                var r, n, o;
                return function(t, e) {
                    if ("function" != typeof e && null !== e) throw new TypeError("Super expression must either be null or a function");
                    t.prototype = Object.create(e && e.prototype, {
                        constructor: {
                            value: t,
                            writable: !0,
                            configurable: !0
                        }
                    }), Object.defineProperty(t, "prototype", {
                        writable: !1
                    }), e && f(t, e)
                }(e, t), r = e, n = [{
                    key: "copy",
                    value: function() {
                        var t, e = this;
                        if (this.buttonTarget.textContent !== this.copiedLabelValue) {
                            var r, n, o;
                            this.linkTarget.select(), YNAB.copyTextToClipboard(this.linkTarget), null === (t = YNABAnalytics) || void 0 === t || t.trackEvent(i.oA.Social_SentReferralInvite, (r = {}, n = i.I_.ReferralMethod, o = "Link", (n = u(n)) in r ? Object.defineProperty(r, n, {
                                value: o,
                                enumerable: !0,
                                configurable: !0,
                                writable: !0
                            }) : r[n] = o, r));
                            var a = this.buttonTarget.textContent;
                            this.buttonTarget.textContent = this.copiedLabelValue, this.resetTimeout = setTimeout((function() {
                                e.buttonTarget.textContent = a
                            }), 3e3)
                        }
                    }
                }, {
                    key: "disconnect",
                    value: function() {
                        clearTimeout(this.resetTimeout)
                    }
                }], n && a(r.prototype, n), o && a(r, o), Object.defineProperty(r, "prototype", {
                    writable: !1
                }), e
            }(o.xI);
            d.targets = ["link", "button"], d.values = {
                copiedLabel: String
            };
            var h = r(2335);

            function p(t, e) {
                for (var r = 0; r < e.length; r++) {
                    var n = e[r];
                    n.enumerable = n.enumerable || !1, n.configurable = !0, "value" in n && (n.writable = !0), Object.defineProperty(t, y(n.key), n)
                }
            }

            function y(t) {
                var e = function(t, e) {
                    if ("object" != typeof t || !t) return t;
                    var r = t[Symbol.toPrimitive];
                    if (void 0 !== r) {
                        var n = r.call(t, e || "default");
                        if ("object" != typeof n) return n;
                        throw new TypeError("@@toPrimitive must return a primitive value.")
                    }
                    return ("string" === e ? String : Number)(t)
                }(t, "string");
                return "symbol" == typeof e ? e : e + ""
            }

            function v(t, e, r) {
                return e = g(e),
                    function(t, e) {
                        if (e && ("object" == typeof e || "function" == typeof e)) return e;
                        if (void 0 !== e) throw new TypeError("Derived constructors may only return object or undefined");
                        return function(t) {
                            if (void 0 === t) throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
                            return t
                        }(t)
                    }(t, m() ? Reflect.construct(e, r || [], g(t).constructor) : e.apply(t, r))
            }

            function m() {
                try {
                    var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], (function() {})))
                } catch (t) {}
                return (m = function() {
                    return !!t
                })()
            }

            function g(t) {
                return g = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function(t) {
                    return t.__proto__ || Object.getPrototypeOf(t)
                }, g(t)
            }

            function b(t, e) {
                return b = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function(t, e) {
                    return t.__proto__ = e, t
                }, b(t, e)
            }
            var w = function(t) {
                function e() {
                    return function(t, e) {
                        if (!(t instanceof e)) throw new TypeError("Cannot call a class as a function")
                    }(this, e), v(this, e, arguments)
                }
                var r, n, o;
                return function(t, e) {
                    if ("function" != typeof e && null !== e) throw new TypeError("Super expression must either be null or a function");
                    t.prototype = Object.create(e && e.prototype, {
                        constructor: {
                            value: t,
                            writable: !0,
                            configurable: !0
                        }
                    }), Object.defineProperty(t, "prototype", {
                        writable: !1
                    }), e && b(t, e)
                }(e, t), r = e, (n = [{
                    key: "destroyFormTargetConnected",
                    value: function(t) {
                        $(t).validate()
                    }
                }, {
                    key: "otpFormOutletConnected",
                    value: function(t, e) {
                        t.show(), t.onShowBackupHook = this.onShowOTPBackup.bind(this)
                    }
                }, {
                    key: "onShowOTPBackup",
                    value: function() {
                        this.otpFormOutlet.labelTarget.insertAdjacentHTML("afterend", "<label>(This code was given to you when you first enabled two-step verification.)</label>");
                        var t = $(this.destroyFormTarget);
                        this.otpFormOutlet.backupCodeOnStart || (0, h.qc)(t)
                    }
                }]) && p(r.prototype, n), o && p(r, o), Object.defineProperty(r, "prototype", {
                    writable: !1
                }), e
            }(o.xI);
            w.targets = ["destroyForm"], w.outlets = ["otp-form"];
            var k = r(4692),
                O = r.n(k);

            function E() {
                E = function() {
                    return e
                };
                var t, e = {},
                    r = Object.prototype,
                    n = r.hasOwnProperty,
                    o = Object.defineProperty || function(t, e, r) {
                        t[e] = r.value
                    },
                    i = "function" == typeof Symbol ? Symbol : {},
                    a = i.iterator || "@@iterator",
                    u = i.asyncIterator || "@@asyncIterator",
                    c = i.toStringTag || "@@toStringTag";

                function s(t, e, r) {
                    return Object.defineProperty(t, e, {
                        value: r,
                        enumerable: !0,
                        configurable: !0,
                        writable: !0
                    }), t[e]
                }
                try {
                    s({}, "")
                } catch (t) {
                    s = function(t, e, r) {
                        return t[e] = r
                    }
                }

                function l(t, e, r, n) {
                    var i = e && e.prototype instanceof m ? e : m,
                        a = Object.create(i.prototype),
                        u = new C(n || []);
                    return o(a, "_invoke", {
                        value: j(t, r, u)
                    }), a
                }

                function f(t, e, r) {
                    try {
                        return {
                            type: "normal",
                            arg: t.call(e, r)
                        }
                    } catch (t) {
                        return {
                            type: "throw",
                            arg: t
                        }
                    }
                }
                e.wrap = l;
                var d = "suspendedStart",
                    h = "suspendedYield",
                    p = "executing",
                    y = "completed",
                    v = {};

                function m() {}

                function g() {}

                function b() {}
                var w = {};
                s(w, a, (function() {
                    return this
                }));
                var k = Object.getPrototypeOf,
                    O = k && k(k(A([])));
                O && O !== r && n.call(O, a) && (w = O);
                var T = b.prototype = m.prototype = Object.create(w);

                function S(t) {
                    ["next", "throw", "return"].forEach((function(e) {
                        s(t, e, (function(t) {
                            return this._invoke(e, t)
                        }))
                    }))
                }

                function _(t, e) {
                    function r(o, i, a, u) {
                        var c = f(t[o], t, i);
                        if ("throw" !== c.type) {
                            var s = c.arg,
                                l = s.value;
                            return l && "object" == typeof l && n.call(l, "__await") ? e.resolve(l.__await).then((function(t) {
                                r("next", t, a, u)
                            }), (function(t) {
                                r("throw", t, a, u)
                            })) : e.resolve(l).then((function(t) {
                                s.value = t, a(s)
                            }), (function(t) {
                                return r("throw", t, a, u)
                            }))
                        }
                        u(c.arg)
                    }
                    var i;
                    o(this, "_invoke", {
                        value: function(t, n) {
                            function o() {
                                return new e((function(e, o) {
                                    r(t, n, e, o)
                                }))
                            }
                            return i = i ? i.then(o, o) : o()
                        }
                    })
                }

                function j(e, r, n) {
                    var o = d;
                    return function(i, a) {
                        if (o === p) throw Error("Generator is already running");
                        if (o === y) {
                            if ("throw" === i) throw a;
                            return {
                                value: t,
                                done: !0
                            }
                        }
                        for (n.method = i, n.arg = a;;) {
                            var u = n.delegate;
                            if (u) {
                                var c = x(u, n);
                                if (c) {
                                    if (c === v) continue;
                                    return c
                                }
                            }
                            if ("next" === n.method) n.sent = n._sent = n.arg;
                            else if ("throw" === n.method) {
                                if (o === d) throw o = y, n.arg;
                                n.dispatchException(n.arg)
                            } else "return" === n.method && n.abrupt("return", n.arg);
                            o = p;
                            var s = f(e, r, n);
                            if ("normal" === s.type) {
                                if (o = n.done ? y : h, s.arg === v) continue;
                                return {
                                    value: s.arg,
                                    done: n.done
                                }
                            }
                            "throw" === s.type && (o = y, n.method = "throw", n.arg = s.arg)
                        }
                    }
                }

                function x(e, r) {
                    var n = r.method,
                        o = e.iterator[n];
                    if (o === t) return r.delegate = null, "throw" === n && e.iterator.return && (r.method = "return", r.arg = t, x(e, r), "throw" === r.method) || "return" !== n && (r.method = "throw", r.arg = new TypeError("The iterator does not provide a '" + n + "' method")), v;
                    var i = f(o, e.iterator, r.arg);
                    if ("throw" === i.type) return r.method = "throw", r.arg = i.arg, r.delegate = null, v;
                    var a = i.arg;
                    return a ? a.done ? (r[e.resultName] = a.value, r.next = e.nextLoc, "return" !== r.method && (r.method = "next", r.arg = t), r.delegate = null, v) : a : (r.method = "throw", r.arg = new TypeError("iterator result is not an object"), r.delegate = null, v)
                }

                function P(t) {
                    var e = {
                        tryLoc: t[0]
                    };
                    1 in t && (e.catchLoc = t[1]), 2 in t && (e.finallyLoc = t[2], e.afterLoc = t[3]), this.tryEntries.push(e)
                }

                function L(t) {
                    var e = t.completion || {};
                    e.type = "normal", delete e.arg, t.completion = e
                }

                function C(t) {
                    this.tryEntries = [{
                        tryLoc: "root"
                    }], t.forEach(P, this), this.reset(!0)
                }

                function A(e) {
                    if (e || "" === e) {
                        var r = e[a];
                        if (r) return r.call(e);
                        if ("function" == typeof e.next) return e;
                        if (!isNaN(e.length)) {
                            var o = -1,
                                i = function r() {
                                    for (; ++o < e.length;)
                                        if (n.call(e, o)) return r.value = e[o], r.done = !1, r;
                                    return r.value = t, r.done = !0, r
                                };
                            return i.next = i
                        }
                    }
                    throw new TypeError(typeof e + " is not iterable")
                }
                return g.prototype = b, o(T, "constructor", {
                    value: b,
                    configurable: !0
                }), o(b, "constructor", {
                    value: g,
                    configurable: !0
                }), g.displayName = s(b, c, "GeneratorFunction"), e.isGeneratorFunction = function(t) {
                    var e = "function" == typeof t && t.constructor;
                    return !!e && (e === g || "GeneratorFunction" === (e.displayName || e.name))
                }, e.mark = function(t) {
                    return Object.setPrototypeOf ? Object.setPrototypeOf(t, b) : (t.__proto__ = b, s(t, c, "GeneratorFunction")), t.prototype = Object.create(T), t
                }, e.awrap = function(t) {
                    return {
                        __await: t
                    }
                }, S(_.prototype), s(_.prototype, u, (function() {
                    return this
                })), e.AsyncIterator = _, e.async = function(t, r, n, o, i) {
                    void 0 === i && (i = Promise);
                    var a = new _(l(t, r, n, o), i);
                    return e.isGeneratorFunction(r) ? a : a.next().then((function(t) {
                        return t.done ? t.value : a.next()
                    }))
                }, S(T), s(T, c, "Generator"), s(T, a, (function() {
                    return this
                })), s(T, "toString", (function() {
                    return "[object Generator]"
                })), e.keys = function(t) {
                    var e = Object(t),
                        r = [];
                    for (var n in e) r.push(n);
                    return r.reverse(),
                        function t() {
                            for (; r.length;) {
                                var n = r.pop();
                                if (n in e) return t.value = n, t.done = !1, t
                            }
                            return t.done = !0, t
                        }
                }, e.values = A, C.prototype = {
                    constructor: C,
                    reset: function(e) {
                        if (this.prev = 0, this.next = 0, this.sent = this._sent = t, this.done = !1, this.delegate = null, this.method = "next", this.arg = t, this.tryEntries.forEach(L), !e)
                            for (var r in this) "t" === r.charAt(0) && n.call(this, r) && !isNaN(+r.slice(1)) && (this[r] = t)
                    },
                    stop: function() {
                        this.done = !0;
                        var t = this.tryEntries[0].completion;
                        if ("throw" === t.type) throw t.arg;
                        return this.rval
                    },
                    dispatchException: function(e) {
                        if (this.done) throw e;
                        var r = this;

                        function o(n, o) {
                            return u.type = "throw", u.arg = e, r.next = n, o && (r.method = "next", r.arg = t), !!o
                        }
                        for (var i = this.tryEntries.length - 1; i >= 0; --i) {
                            var a = this.tryEntries[i],
                                u = a.completion;
                            if ("root" === a.tryLoc) return o("end");
                            if (a.tryLoc <= this.prev) {
                                var c = n.call(a, "catchLoc"),
                                    s = n.call(a, "finallyLoc");
                                if (c && s) {
                                    if (this.prev < a.catchLoc) return o(a.catchLoc, !0);
                                    if (this.prev < a.finallyLoc) return o(a.finallyLoc)
                                } else if (c) {
                                    if (this.prev < a.catchLoc) return o(a.catchLoc, !0)
                                } else {
                                    if (!s) throw Error("try statement without catch or finally");
                                    if (this.prev < a.finallyLoc) return o(a.finallyLoc)
                                }
                            }
                        }
                    },
                    abrupt: function(t, e) {
                        for (var r = this.tryEntries.length - 1; r >= 0; --r) {
                            var o = this.tryEntries[r];
                            if (o.tryLoc <= this.prev && n.call(o, "finallyLoc") && this.prev < o.finallyLoc) {
                                var i = o;
                                break
                            }
                        }
                        i && ("break" === t || "continue" === t) && i.tryLoc <= e && e <= i.finallyLoc && (i = null);
                        var a = i ? i.completion : {};
                        return a.type = t, a.arg = e, i ? (this.method = "next", this.next = i.finallyLoc, v) : this.complete(a)
                    },
                    complete: function(t, e) {
                        if ("throw" === t.type) throw t.arg;
                        return "break" === t.type || "continue" === t.type ? this.next = t.arg : "return" === t.type ? (this.rval = this.arg = t.arg, this.method = "return", this.next = "end") : "normal" === t.type && e && (this.next = e), v
                    },
                    finish: function(t) {
                        for (var e = this.tryEntries.length - 1; e >= 0; --e) {
                            var r = this.tryEntries[e];
                            if (r.finallyLoc === t) return this.complete(r.completion, r.afterLoc), L(r), v
                        }
                    },
                    catch: function(t) {
                        for (var e = this.tryEntries.length - 1; e >= 0; --e) {
                            var r = this.tryEntries[e];
                            if (r.tryLoc === t) {
                                var n = r.completion;
                                if ("throw" === n.type) {
                                    var o = n.arg;
                                    L(r)
                                }
                                return o
                            }
                        }
                        throw Error("illegal catch attempt")
                    },
                    delegateYield: function(e, r, n) {
                        return this.delegate = {
                            iterator: A(e),
                            resultName: r,
                            nextLoc: n
                        }, "next" === this.method && (this.arg = t), v
                    }
                }, e
            }

            function T(t, e, r, n, o, i, a) {
                try {
                    var u = t[i](a),
                        c = u.value
                } catch (t) {
                    return void r(t)
                }
                u.done ? e(c) : Promise.resolve(c).then(n, o)
            }

            function S(t) {
                return function() {
                    var e = this,
                        r = arguments;
                    return new Promise((function(n, o) {
                        var i = t.apply(e, r);

                        function a(t) {
                            T(i, n, o, a, u, "next", t)
                        }

                        function u(t) {
                            T(i, n, o, a, u, "throw", t)
                        }
                        a(void 0)
                    }))
                }
            }

            function _(t, e) {
                for (var r = 0; r < e.length; r++) {
                    var n = e[r];
                    n.enumerable = n.enumerable || !1, n.configurable = !0, "value" in n && (n.writable = !0), Object.defineProperty(t, j(n.key), n)
                }
            }

            function j(t) {
                var e = function(t, e) {
                    if ("object" != typeof t || !t) return t;
                    var r = t[Symbol.toPrimitive];
                    if (void 0 !== r) {
                        var n = r.call(t, e || "default");
                        if ("object" != typeof n) return n;
                        throw new TypeError("@@toPrimitive must return a primitive value.")
                    }
                    return ("string" === e ? String : Number)(t)
                }(t, "string");
                return "symbol" == typeof e ? e : e + ""
            }

            function x(t, e, r) {
                return e = L(e),
                    function(t, e) {
                        if (e && ("object" == typeof e || "function" == typeof e)) return e;
                        if (void 0 !== e) throw new TypeError("Derived constructors may only return object or undefined");
                        return function(t) {
                            if (void 0 === t) throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
                            return t
                        }(t)
                    }(t, P() ? Reflect.construct(e, r || [], L(t).constructor) : e.apply(t, r))
            }

            function P() {
                try {
                    var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], (function() {})))
                } catch (t) {}
                return (P = function() {
                    return !!t
                })()
            }

            function L(t) {
                return L = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function(t) {
                    return t.__proto__ || Object.getPrototypeOf(t)
                }, L(t)
            }

            function C(t, e) {
                return C = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function(t, e) {
                    return t.__proto__ = e, t
                }, C(t, e)
            }
            var A = function(t) {
                function e() {
                    return function(t, e) {
                        if (!(t instanceof e)) throw new TypeError("Cannot call a class as a function")
                    }(this, e), x(this, e, arguments)
                }
                var r, n, o, i, a, u;
                return function(t, e) {
                    if ("function" != typeof e && null !== e) throw new TypeError("Super expression must either be null or a function");
                    t.prototype = Object.create(e && e.prototype, {
                        constructor: {
                            value: t,
                            writable: !0,
                            configurable: !0
                        }
                    }), Object.defineProperty(t, "prototype", {
                        writable: !1
                    }), e && C(t, e)
                }(e, t), r = e, n = [{
                    key: "connect",
                    value: function() {
                        var t = this.element.querySelector("input");
                        t && t.focus()
                    }
                }, {
                    key: "updateSubmitState",
                    value: function() {
                        var t = !this.hasPasswordValue,
                            e = this.signInWithAppleEmailValue,
                            r = this.hasEmailInputTarget ? this.emailInputTarget.value : "",
                            n = this.hasNewPasswordInputTarget ? this.newPasswordInputTarget.value : "",
                            o = this.hasCurrentPasswordInputTarget ? this.currentPasswordInputTarget.value : "",
                            i = e && !r || t && !n || e && this.hasPasswordValue && !o;
                        this.submitButtonTarget.disabled = i
                    }
                }, {
                    key: "onSubmit",
                    value: (u = S(E().mark((function t(e) {
                        var r, n, o;
                        return E().wrap((function(t) {
                            for (;;) switch (t.prev = t.next) {
                                case 0:
                                    if (e.preventDefault(), this.hideErrors(), r = !this.hasPasswordValue, n = this.signInWithAppleEmailValue, t.prev = 4, !r || !n) {
                                        t.next = 10;
                                        break
                                    }
                                    return t.next = 8, this.updateUserSettings(this.setEmailAndPasswordPathValue, {
                                        user: {
                                            email: this.emailInputTarget.value,
                                            password: this.newPasswordInputTarget.value
                                        },
                                        authenticity_token: this.formTokenValue
                                    });
                                case 8:
                                    t.next = 18;
                                    break;
                                case 10:
                                    if (!r) {
                                        t.next = 15;
                                        break
                                    }
                                    return t.next = 13, this.updateUserSettings(this.setPasswordPathValue, {
                                        user: {
                                            password: this.newPasswordInputTarget.value
                                        },
                                        authenticity_token: this.formTokenValue
                                    });
                                case 13:
                                    t.next = 18;
                                    break;
                                case 15:
                                    if (!n) {
                                        t.next = 18;
                                        break
                                    }
                                    return t.next = 18, this.updateUserSettings(this.setEmailPathValue, {
                                        user: {
                                            email: this.emailInputTarget.value,
                                            current_password: this.currentPasswordInputTarget.value
                                        },
                                        authenticity_token: this.formTokenValue
                                    });
                                case 18:
                                    return t.next = 20, this.deleteCredential();
                                case 20:
                                    window.location.href = this.accountSettingsUrlValue, t.next = 26;
                                    break;
                                case 23:
                                    t.prev = 23, t.t0 = t.catch(4), 422 === t.t0.status ? this.showErrors(null === (o = t.t0.responseJSON) || void 0 === o ? void 0 : o.errors) : this.reportError(t.t0);
                                case 26:
                                case "end":
                                    return t.stop()
                            }
                        }), t, this, [
                            [4, 23]
                        ])
                    }))), function(t) {
                        return u.apply(this, arguments)
                    })
                }, {
                    key: "updateUserSettings",
                    value: (a = S(E().mark((function t(e, r) {
                        return E().wrap((function(t) {
                            for (;;) switch (t.prev = t.next) {
                                case 0:
                                    return t.next = 2, O().ajax(e, {
                                        data: r,
                                        method: "put",
                                        dataType: "json"
                                    });
                                case 2:
                                    return t.abrupt("return", t.sent);
                                case 3:
                                case "end":
                                    return t.stop()
                            }
                        }), t)
                    }))), function(t, e) {
                        return a.apply(this, arguments)
                    })
                }, {
                    key: "deleteCredential",
                    value: (i = S(E().mark((function t() {
                        return E().wrap((function(t) {
                            for (;;) switch (t.prev = t.next) {
                                case 0:
                                    return t.next = 2, O().ajax(this.disconnectPathValue, {
                                        method: "post",
                                        dataType: "json",
                                        data: {
                                            authenticity_token: this.formTokenValue,
                                            _method: "delete"
                                        }
                                    });
                                case 2:
                                    return t.abrupt("return", t.sent);
                                case 3:
                                case "end":
                                    return t.stop()
                            }
                        }), t, this)
                    }))), function() {
                        return i.apply(this, arguments)
                    })
                }, {
                    key: "hideErrors",
                    value: function() {
                        this.hasEmailErrorTarget && (this.emailErrorTarget.hidden = !0), this.hasCurrentPasswordErrorTarget && (this.currentPasswordErrorTarget.hidden = !0), this.hasPasswordErrorTarget && (this.passwordErrorTarget.hidden = !0)
                    }
                }, {
                    key: "showErrors",
                    value: function(t) {
                        var e, r, n;
                        (null === t || void 0 === t || null === (e = t.email) || void 0 === e ? void 0 : e.length) > 0 && this.hasEmailErrorTarget && (this.emailErrorTarget.textContent = t.email.join(" "), this.emailErrorTarget.hidden = !1), (null === t || void 0 === t || null === (r = t.current_password) || void 0 === r ? void 0 : r.length) > 0 && this.hasCurrentPasswordErrorTarget && (this.currentPasswordErrorTarget.textContent = t.current_password.join(" "), this.currentPasswordErrorTarget.hidden = !1), (null === t || void 0 === t || null === (n = t.password) || void 0 === n ? void 0 : n.length) > 0 && this.hasPasswordErrorTarget && (this.passwordErrorTarget.textContent = t.password.join(" "), this.passwordErrorTarget.hidden = !1)
                    }
                }, {
                    key: "reportError",
                    value: function(t) {
                        var e;
                        null === (e = window.DD_RUM) || void 0 === e || e.addError(t, {
                            message: "Error disconnecting SSO credential",
                            report_level: "warning"
                        })
                    }
                }], n && _(r.prototype, n), o && _(r, o), Object.defineProperty(r, "prototype", {
                    writable: !1
                }), e
            }(o.xI);

            function B(t, e) {
                return function(t) {
                    if (Array.isArray(t)) return t
                }(t) || function(t, e) {
                    var r = null == t ? null : "undefined" != typeof Symbol && t[Symbol.iterator] || t["@@iterator"];
                    if (null != r) {
                        var n, o, i, a, u = [],
                            c = !0,
                            s = !1;
                        try {
                            if (i = (r = r.call(t)).next, 0 === e) {
                                if (Object(r) !== r) return;
                                c = !1
                            } else
                                for (; !(c = (n = i.call(r)).done) && (u.push(n.value), u.length !== e); c = !0);
                        } catch (t) {
                            s = !0, o = t
                        } finally {
                            try {
                                if (!c && null != r.return && (a = r.return(), Object(a) !== a)) return
                            } finally {
                                if (s) throw o
                            }
                        }
                        return u
                    }
                }(t, e) || function(t, e) {
                    if (t) {
                        if ("string" == typeof t) return I(t, e);
                        var r = {}.toString.call(t).slice(8, -1);
                        return "Object" === r && t.constructor && (r = t.constructor.name), "Map" === r || "Set" === r ? Array.from(t) : "Arguments" === r || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r) ? I(t, e) : void 0
                    }
                }(t, e) || function() {
                    throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")
                }()
            }

            function I(t, e) {
                (null == e || e > t.length) && (e = t.length);
                for (var r = 0, n = Array(e); r < e; r++) n[r] = t[r];
                return n
            }

            function F(t, e) {
                for (var r = 0; r < e.length; r++) {
                    var n = e[r];
                    n.enumerable = n.enumerable || !1, n.configurable = !0, "value" in n && (n.writable = !0), Object.defineProperty(t, N(n.key), n)
                }
            }

            function N(t) {
                var e = function(t, e) {
                    if ("object" != typeof t || !t) return t;
                    var r = t[Symbol.toPrimitive];
                    if (void 0 !== r) {
                        var n = r.call(t, e || "default");
                        if ("object" != typeof n) return n;
                        throw new TypeError("@@toPrimitive must return a primitive value.")
                    }
                    return ("string" === e ? String : Number)(t)
                }(t, "string");
                return "symbol" == typeof e ? e : e + ""
            }

            function R(t, e, r) {
                return e = G(e),
                    function(t, e) {
                        if (e && ("object" == typeof e || "function" == typeof e)) return e;
                        if (void 0 !== e) throw new TypeError("Derived constructors may only return object or undefined");
                        return function(t) {
                            if (void 0 === t) throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
                            return t
                        }(t)
                    }(t, D() ? Reflect.construct(e, r || [], G(t).constructor) : e.apply(t, r))
            }

            function D() {
                try {
                    var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], (function() {})))
                } catch (t) {}
                return (D = function() {
                    return !!t
                })()
            }

            function G(t) {
                return G = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function(t) {
                    return t.__proto__ || Object.getPrototypeOf(t)
                }, G(t)
            }

            function M(t, e) {
                return M = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function(t, e) {
                    return t.__proto__ = e, t
                }, M(t, e)
            }
            A.values = {
                hasPassword: Boolean,
                signInWithAppleEmail: Boolean,
                setPasswordPath: String,
                setEmailPath: String,
                setEmailAndPasswordPath: String,
                disconnectPath: String,
                accountSettingsUrl: String,
                formToken: String
            }, A.targets = ["submitButton", "emailInput", "currentPasswordInput", "newPasswordInput", "emailError", "currentPasswordError", "passwordError"];
            var Y = function(t) {
                function e() {
                    return function(t, e) {
                        if (!(t instanceof e)) throw new TypeError("Cannot call a class as a function")
                    }(this, e), R(this, e, arguments)
                }
                var r, n, o;
                return function(t, e) {
                    if ("function" != typeof e && null !== e) throw new TypeError("Super expression must either be null or a function");
                    t.prototype = Object.create(e && e.prototype, {
                        constructor: {
                            value: t,
                            writable: !0,
                            configurable: !0
                        }
                    }), Object.defineProperty(t, "prototype", {
                        writable: !1
                    }), e && M(t, e)
                }(e, t), r = e, (n = [{
                    key: "resetFormTargetConnected",
                    value: function(t) {
                        $(t).validate()
                    }
                }, {
                    key: "handleResetSuccess",
                    value: function(t) {
                        this.hasOtpFormOutlet && this.otpFormOutlet.hide(), this.resetPasswordContainerTarget.hidden = !0, this.resetSuccessContainerTarget.hidden = !1, this.otpFormOutlet.usingBackupCode ? this.resetAndDisabledContainerTarget.hidden = !1 : this.nonOTPSuccessContainerTarget.hidden = !1
                    }
                }, {
                    key: "handleResetError",
                    value: function(t) {
                        var e = $(this.resetFormTarget);
                        if ((0, h.qc)(e), !(this.hasOtpFormOutlet && this.otpFormOutlet.visible && this.otpFormOutlet.handleOTPError(t, e))) {
                            var r = B(t.detail, 3),
                                n = r[0],
                                o = (r[1], r[2]),
                                i = null === n || void 0 === n ? void 0 : n.error;
                            if (401 !== o.status && 422 !== o.status) return (0, h.Rx)(e, o);
                            i ? "user_otp_required" === i.id ? this.showOTP() : (0, h.PB)(e, ".js-form-password", i.message) : (0, h.PB)(e, ".js-form-password", h.Gq)
                        }
                    }
                }, {
                    key: "showOTP",
                    value: function() {
                        this.resetSubmitButtonTarget.hidden = !0, this.otpFormOutlet.show()
                    }
                }]) && F(r.prototype, n), o && F(r, o), Object.defineProperty(r, "prototype", {
                    writable: !1
                }), e
            }(o.xI);

            function q() {
                q = function() {
                    return e
                };
                var t, e = {},
                    r = Object.prototype,
                    n = r.hasOwnProperty,
                    o = Object.defineProperty || function(t, e, r) {
                        t[e] = r.value
                    },
                    i = "function" == typeof Symbol ? Symbol : {},
                    a = i.iterator || "@@iterator",
                    u = i.asyncIterator || "@@asyncIterator",
                    c = i.toStringTag || "@@toStringTag";

                function s(t, e, r) {
                    return Object.defineProperty(t, e, {
                        value: r,
                        enumerable: !0,
                        configurable: !0,
                        writable: !0
                    }), t[e]
                }
                try {
                    s({}, "")
                } catch (t) {
                    s = function(t, e, r) {
                        return t[e] = r
                    }
                }

                function l(t, e, r, n) {
                    var i = e && e.prototype instanceof m ? e : m,
                        a = Object.create(i.prototype),
                        u = new L(n || []);
                    return o(a, "_invoke", {
                        value: _(t, r, u)
                    }), a
                }

                function f(t, e, r) {
                    try {
                        return {
                            type: "normal",
                            arg: t.call(e, r)
                        }
                    } catch (t) {
                        return {
                            type: "throw",
                            arg: t
                        }
                    }
                }
                e.wrap = l;
                var d = "suspendedStart",
                    h = "suspendedYield",
                    p = "executing",
                    y = "completed",
                    v = {};

                function m() {}

                function g() {}

                function b() {}
                var w = {};
                s(w, a, (function() {
                    return this
                }));
                var k = Object.getPrototypeOf,
                    O = k && k(k(C([])));
                O && O !== r && n.call(O, a) && (w = O);
                var E = b.prototype = m.prototype = Object.create(w);

                function T(t) {
                    ["next", "throw", "return"].forEach((function(e) {
                        s(t, e, (function(t) {
                            return this._invoke(e, t)
                        }))
                    }))
                }

                function S(t, e) {
                    function r(o, i, a, u) {
                        var c = f(t[o], t, i);
                        if ("throw" !== c.type) {
                            var s = c.arg,
                                l = s.value;
                            return l && "object" == typeof l && n.call(l, "__await") ? e.resolve(l.__await).then((function(t) {
                                r("next", t, a, u)
                            }), (function(t) {
                                r("throw", t, a, u)
                            })) : e.resolve(l).then((function(t) {
                                s.value = t, a(s)
                            }), (function(t) {
                                return r("throw", t, a, u)
                            }))
                        }
                        u(c.arg)
                    }
                    var i;
                    o(this, "_invoke", {
                        value: function(t, n) {
                            function o() {
                                return new e((function(e, o) {
                                    r(t, n, e, o)
                                }))
                            }
                            return i = i ? i.then(o, o) : o()
                        }
                    })
                }

                function _(e, r, n) {
                    var o = d;
                    return function(i, a) {
                        if (o === p) throw Error("Generator is already running");
                        if (o === y) {
                            if ("throw" === i) throw a;
                            return {
                                value: t,
                                done: !0
                            }
                        }
                        for (n.method = i, n.arg = a;;) {
                            var u = n.delegate;
                            if (u) {
                                var c = j(u, n);
                                if (c) {
                                    if (c === v) continue;
                                    return c
                                }
                            }
                            if ("next" === n.method) n.sent = n._sent = n.arg;
                            else if ("throw" === n.method) {
                                if (o === d) throw o = y, n.arg;
                                n.dispatchException(n.arg)
                            } else "return" === n.method && n.abrupt("return", n.arg);
                            o = p;
                            var s = f(e, r, n);
                            if ("normal" === s.type) {
                                if (o = n.done ? y : h, s.arg === v) continue;
                                return {
                                    value: s.arg,
                                    done: n.done
                                }
                            }
                            "throw" === s.type && (o = y, n.method = "throw", n.arg = s.arg)
                        }
                    }
                }

                function j(e, r) {
                    var n = r.method,
                        o = e.iterator[n];
                    if (o === t) return r.delegate = null, "throw" === n && e.iterator.return && (r.method = "return", r.arg = t, j(e, r), "throw" === r.method) || "return" !== n && (r.method = "throw", r.arg = new TypeError("The iterator does not provide a '" + n + "' method")), v;
                    var i = f(o, e.iterator, r.arg);
                    if ("throw" === i.type) return r.method = "throw", r.arg = i.arg, r.delegate = null, v;
                    var a = i.arg;
                    return a ? a.done ? (r[e.resultName] = a.value, r.next = e.nextLoc, "return" !== r.method && (r.method = "next", r.arg = t), r.delegate = null, v) : a : (r.method = "throw", r.arg = new TypeError("iterator result is not an object"), r.delegate = null, v)
                }

                function x(t) {
                    var e = {
                        tryLoc: t[0]
                    };
                    1 in t && (e.catchLoc = t[1]), 2 in t && (e.finallyLoc = t[2], e.afterLoc = t[3]), this.tryEntries.push(e)
                }

                function P(t) {
                    var e = t.completion || {};
                    e.type = "normal", delete e.arg, t.completion = e
                }

                function L(t) {
                    this.tryEntries = [{
                        tryLoc: "root"
                    }], t.forEach(x, this), this.reset(!0)
                }

                function C(e) {
                    if (e || "" === e) {
                        var r = e[a];
                        if (r) return r.call(e);
                        if ("function" == typeof e.next) return e;
                        if (!isNaN(e.length)) {
                            var o = -1,
                                i = function r() {
                                    for (; ++o < e.length;)
                                        if (n.call(e, o)) return r.value = e[o], r.done = !1, r;
                                    return r.value = t, r.done = !0, r
                                };
                            return i.next = i
                        }
                    }
                    throw new TypeError(typeof e + " is not iterable")
                }
                return g.prototype = b, o(E, "constructor", {
                    value: b,
                    configurable: !0
                }), o(b, "constructor", {
                    value: g,
                    configurable: !0
                }), g.displayName = s(b, c, "GeneratorFunction"), e.isGeneratorFunction = function(t) {
                    var e = "function" == typeof t && t.constructor;
                    return !!e && (e === g || "GeneratorFunction" === (e.displayName || e.name))
                }, e.mark = function(t) {
                    return Object.setPrototypeOf ? Object.setPrototypeOf(t, b) : (t.__proto__ = b, s(t, c, "GeneratorFunction")), t.prototype = Object.create(E), t
                }, e.awrap = function(t) {
                    return {
                        __await: t
                    }
                }, T(S.prototype), s(S.prototype, u, (function() {
                    return this
                })), e.AsyncIterator = S, e.async = function(t, r, n, o, i) {
                    void 0 === i && (i = Promise);
                    var a = new S(l(t, r, n, o), i);
                    return e.isGeneratorFunction(r) ? a : a.next().then((function(t) {
                        return t.done ? t.value : a.next()
                    }))
                }, T(E), s(E, c, "Generator"), s(E, a, (function() {
                    return this
                })), s(E, "toString", (function() {
                    return "[object Generator]"
                })), e.keys = function(t) {
                    var e = Object(t),
                        r = [];
                    for (var n in e) r.push(n);
                    return r.reverse(),
                        function t() {
                            for (; r.length;) {
                                var n = r.pop();
                                if (n in e) return t.value = n, t.done = !1, t
                            }
                            return t.done = !0, t
                        }
                }, e.values = C, L.prototype = {
                    constructor: L,
                    reset: function(e) {
                        if (this.prev = 0, this.next = 0, this.sent = this._sent = t, this.done = !1, this.delegate = null, this.method = "next", this.arg = t, this.tryEntries.forEach(P), !e)
                            for (var r in this) "t" === r.charAt(0) && n.call(this, r) && !isNaN(+r.slice(1)) && (this[r] = t)
                    },
                    stop: function() {
                        this.done = !0;
                        var t = this.tryEntries[0].completion;
                        if ("throw" === t.type) throw t.arg;
                        return this.rval
                    },
                    dispatchException: function(e) {
                        if (this.done) throw e;
                        var r = this;

                        function o(n, o) {
                            return u.type = "throw", u.arg = e, r.next = n, o && (r.method = "next", r.arg = t), !!o
                        }
                        for (var i = this.tryEntries.length - 1; i >= 0; --i) {
                            var a = this.tryEntries[i],
                                u = a.completion;
                            if ("root" === a.tryLoc) return o("end");
                            if (a.tryLoc <= this.prev) {
                                var c = n.call(a, "catchLoc"),
                                    s = n.call(a, "finallyLoc");
                                if (c && s) {
                                    if (this.prev < a.catchLoc) return o(a.catchLoc, !0);
                                    if (this.prev < a.finallyLoc) return o(a.finallyLoc)
                                } else if (c) {
                                    if (this.prev < a.catchLoc) return o(a.catchLoc, !0)
                                } else {
                                    if (!s) throw Error("try statement without catch or finally");
                                    if (this.prev < a.finallyLoc) return o(a.finallyLoc)
                                }
                            }
                        }
                    },
                    abrupt: function(t, e) {
                        for (var r = this.tryEntries.length - 1; r >= 0; --r) {
                            var o = this.tryEntries[r];
                            if (o.tryLoc <= this.prev && n.call(o, "finallyLoc") && this.prev < o.finallyLoc) {
                                var i = o;
                                break
                            }
                        }
                        i && ("break" === t || "continue" === t) && i.tryLoc <= e && e <= i.finallyLoc && (i = null);
                        var a = i ? i.completion : {};
                        return a.type = t, a.arg = e, i ? (this.method = "next", this.next = i.finallyLoc, v) : this.complete(a)
                    },
                    complete: function(t, e) {
                        if ("throw" === t.type) throw t.arg;
                        return "break" === t.type || "continue" === t.type ? this.next = t.arg : "return" === t.type ? (this.rval = this.arg = t.arg, this.method = "return", this.next = "end") : "normal" === t.type && e && (this.next = e), v
                    },
                    finish: function(t) {
                        for (var e = this.tryEntries.length - 1; e >= 0; --e) {
                            var r = this.tryEntries[e];
                            if (r.finallyLoc === t) return this.complete(r.completion, r.afterLoc), P(r), v
                        }
                    },
                    catch: function(t) {
                        for (var e = this.tryEntries.length - 1; e >= 0; --e) {
                            var r = this.tryEntries[e];
                            if (r.tryLoc === t) {
                                var n = r.completion;
                                if ("throw" === n.type) {
                                    var o = n.arg;
                                    P(r)
                                }
                                return o
                            }
                        }
                        throw Error("illegal catch attempt")
                    },
                    delegateYield: function(e, r, n) {
                        return this.delegate = {
                            iterator: C(e),
                            resultName: r,
                            nextLoc: n
                        }, "next" === this.method && (this.arg = t), v
                    }
                }, e
            }

            function U(t, e, r, n, o, i, a) {
                try {
                    var u = t[i](a),
                        c = u.value
                } catch (t) {
                    return void r(t)
                }
                u.done ? e(c) : Promise.resolve(c).then(n, o)
            }

            function V(t, e) {
                for (var r = 0; r < e.length; r++) {
                    var n = e[r];
                    n.enumerable = n.enumerable || !1, n.configurable = !0, "value" in n && (n.writable = !0), Object.defineProperty(t, z(n.key), n)
                }
            }

            function z(t) {
                var e = function(t, e) {
                    if ("object" != typeof t || !t) return t;
                    var r = t[Symbol.toPrimitive];
                    if (void 0 !== r) {
                        var n = r.call(t, e || "default");
                        if ("object" != typeof n) return n;
                        throw new TypeError("@@toPrimitive must return a primitive value.")
                    }
                    return ("string" === e ? String : Number)(t)
                }(t, "string");
                return "symbol" == typeof e ? e : e + ""
            }

            function H(t, e, r) {
                return e = W(e),
                    function(t, e) {
                        if (e && ("object" == typeof e || "function" == typeof e)) return e;
                        if (void 0 !== e) throw new TypeError("Derived constructors may only return object or undefined");
                        return function(t) {
                            if (void 0 === t) throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
                            return t
                        }(t)
                    }(t, K() ? Reflect.construct(e, r || [], W(t).constructor) : e.apply(t, r))
            }

            function K() {
                try {
                    var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], (function() {})))
                } catch (t) {}
                return (K = function() {
                    return !!t
                })()
            }

            function W(t) {
                return W = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function(t) {
                    return t.__proto__ || Object.getPrototypeOf(t)
                }, W(t)
            }

            function X(t, e) {
                return X = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function(t, e) {
                    return t.__proto__ = e, t
                }, X(t, e)
            }
            Y.targets = ["resetForm", "resetPasswordContainer", "resetSuccessContainer", "resetAndDisabledContainer", "nonOTPSuccessContainer", "resetSubmitButton"], Y.outlets = ["otp-form"];
            var J = function(t) {
                function e() {
                    var t;
                    ! function(t, e) {
                        if (!(t instanceof e)) throw new TypeError("Cannot call a class as a function")
                    }(this, e);
                    for (var r = arguments.length, n = new Array(r), o = 0; o < r; o++) n[o] = arguments[o];
                    return (t = H(this, e, [].concat(n))).remaining = 0, t.sentRemaining = 0, t.interval = void 0, t.pollInterval = void 0, t.pollTimeout = void 0, t.checkConfirmed = function() {
                        document.hidden || t.redirectIfConfirmed()
                    }, t
                }
                var r, n, o, i, a;
                return function(t, e) {
                    if ("function" != typeof e && null !== e) throw new TypeError("Super expression must either be null or a function");
                    t.prototype = Object.create(e && e.prototype, {
                        constructor: {
                            value: t,
                            writable: !0,
                            configurable: !0
                        }
                    }), Object.defineProperty(t, "prototype", {
                        writable: !1
                    }), e && X(t, e)
                }(e, t), r = e, n = [{
                    key: "connect",
                    value: function() {
                        var t = this;
                        this.moveCursorAfterPrefilledCode(), this.codeChanged(), this.startPolling(), this.remaining = this.secondsValue, this.sentRemaining = this.sentSecondsValue, this.limitedValue ? this.sentRemaining > 0 && (this.interval = setInterval((function() {
                            return t.tickLimited()
                        }), 1e3)) : this.remaining <= 0 ? this.enable() : (this.sentRemaining <= 0 && this.showCountdown(), this.interval = setInterval((function() {
                            return t.tick()
                        }), 1e3))
                    }
                }, {
                    key: "disconnect",
                    value: function() {
                        clearInterval(this.interval), this.stopPolling()
                    }
                }, {
                    key: "codeChanged",
                    value: function() {
                        this.hasSubmitTarget && this.hasCodeTarget && (this.submitTarget.disabled = 0 === this.codeTarget.value.trim().length)
                    }
                }, {
                    key: "startPolling",
                    value: function() {
                        var t = this;
                        this.statusUrlValue && (this.pollInterval = setInterval(this.checkConfirmed, 1e4), this.pollTimeout = setTimeout((function() {
                            return clearInterval(t.pollInterval)
                        }), 3e5), document.addEventListener("visibilitychange", this.checkConfirmed))
                    }
                }, {
                    key: "stopPolling",
                    value: function() {
                        clearInterval(this.pollInterval), clearTimeout(this.pollTimeout), document.removeEventListener("visibilitychange", this.checkConfirmed)
                    }
                }, {
                    key: "redirectIfConfirmed",
                    value: (i = q().mark((function t() {
                        var e;
                        return q().wrap((function(t) {
                            for (;;) switch (t.prev = t.next) {
                                case 0:
                                    return t.prev = 0, t.next = 3, fetch(this.statusUrlValue, {
                                        headers: {
                                            Accept: "application/json"
                                        }
                                    });
                                case 3:
                                    if (!(e = t.sent).redirected) {
                                        t.next = 7;
                                        break
                                    }
                                    return this.stopPolling(), t.abrupt("return");
                                case 7:
                                    if (e.ok) {
                                        t.next = 9;
                                        break
                                    }
                                    return t.abrupt("return");
                                case 9:
                                    return t.next = 11, e.json();
                                case 11:
                                    t.sent.confirmed && (this.stopPolling(), window.location.assign(this.pageUrlValue)), t.next = 18;
                                    break;
                                case 16:
                                    t.prev = 16, t.t0 = t.catch(0);
                                case 18:
                                case "end":
                                    return t.stop()
                            }
                        }), t, this, [
                            [0, 16]
                        ])
                    })), a = function() {
                        var t = this,
                            e = arguments;
                        return new Promise((function(r, n) {
                            var o = i.apply(t, e);

                            function a(t) {
                                U(o, r, n, a, u, "next", t)
                            }

                            function u(t) {
                                U(o, r, n, a, u, "throw", t)
                            }
                            a(void 0)
                        }))
                    }, function() {
                        return a.apply(this, arguments)
                    })
                }, {
                    key: "moveCursorAfterPrefilledCode",
                    value: function() {
                        if (this.hasCodeTarget && this.codeTarget.value) {
                            var t = this.codeTarget.value.length;
                            this.codeTarget.setSelectionRange(t, t)
                        }
                    }
                }, {
                    key: "tick",
                    value: function() {
                        this.remaining -= 1, this.sentRemaining > 0 && (this.sentRemaining -= 1), this.remaining <= 0 ? this.enable() : this.sentRemaining <= 0 && this.showCountdown()
                    }
                }, {
                    key: "tickLimited",
                    value: function() {
                        this.sentRemaining -= 1, this.sentRemaining <= 0 && (clearInterval(this.interval), this.hasMessageTarget && (this.messageTarget.hidden = !0), this.limitTarget.hidden = !1)
                    }
                }, {
                    key: "showCountdown",
                    value: function() {
                        this.revealButton(), this.buttonTarget.disabled = !0, this.buttonTarget.textContent = this.countingLabelValue.replace("%{seconds}", String(this.remaining))
                    }
                }, {
                    key: "enable",
                    value: function() {
                        clearInterval(this.interval), this.revealButton(), this.buttonTarget.disabled = !1, this.buttonTarget.textContent = this.labelValue
                    }
                }, {
                    key: "revealButton",
                    value: function() {
                        var t;
                        this.hasMessageTarget && (this.messageTarget.hidden = !0), null === (t = this.buttonTarget.form) || void 0 === t || t.removeAttribute("hidden")
                    }
                }], n && V(r.prototype, n), o && V(r, o), Object.defineProperty(r, "prototype", {
                    writable: !1
                }), e
            }(o.xI);

            function Z(t, e) {
                for (var r = 0; r < e.length; r++) {
                    var n = e[r];
                    n.enumerable = n.enumerable || !1, n.configurable = !0, "value" in n && (n.writable = !0), Object.defineProperty(t, Q(n.key), n)
                }
            }

            function Q(t) {
                var e = function(t, e) {
                    if ("object" != typeof t || !t) return t;
                    var r = t[Symbol.toPrimitive];
                    if (void 0 !== r) {
                        var n = r.call(t, e || "default");
                        if ("object" != typeof n) return n;
                        throw new TypeError("@@toPrimitive must return a primitive value.")
                    }
                    return ("string" === e ? String : Number)(t)
                }(t, "string");
                return "symbol" == typeof e ? e : e + ""
            }

            function tt(t, e, r) {
                return e = rt(e),
                    function(t, e) {
                        if (e && ("object" == typeof e || "function" == typeof e)) return e;
                        if (void 0 !== e) throw new TypeError("Derived constructors may only return object or undefined");
                        return function(t) {
                            if (void 0 === t) throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
                            return t
                        }(t)
                    }(t, et() ? Reflect.construct(e, r || [], rt(t).constructor) : e.apply(t, r))
            }

            function et() {
                try {
                    var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], (function() {})))
                } catch (t) {}
                return (et = function() {
                    return !!t
                })()
            }

            function rt(t) {
                return rt = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function(t) {
                    return t.__proto__ || Object.getPrototypeOf(t)
                }, rt(t)
            }

            function nt(t, e) {
                return nt = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function(t, e) {
                    return t.__proto__ = e, t
                }, nt(t, e)
            }
            J.targets = ["button", "code", "limit", "message", "submit"], J.values = {
                seconds: Number,
                sentSeconds: Number,
                label: String,
                countingLabel: String,
                limited: Boolean,
                statusUrl: String,
                pageUrl: String
            };
            var ot = function(t) {
                function e() {
                    return function(t, e) {
                        if (!(t instanceof e)) throw new TypeError("Cannot call a class as a function")
                    }(this, e), tt(this, e, arguments)
                }
                var r, n, o;
                return function(t, e) {
                    if ("function" != typeof e && null !== e) throw new TypeError("Super expression must either be null or a function");
                    t.prototype = Object.create(e && e.prototype, {
                        constructor: {
                            value: t,
                            writable: !0,
                            configurable: !0
                        }
                    }), Object.defineProperty(t, "prototype", {
                        writable: !1
                    }), e && nt(t, e)
                }(e, t), r = e, (n = [{
                    key: "connect",
                    value: function() {
                        this.originalValue = this.inputTarget.value.trim(), this.toggleButtonState()
                    }
                }, {
                    key: "inputChanged",
                    value: function() {
                        this.hideSuccessMessage(), this.toggleButtonState()
                    }
                }, {
                    key: "validateOnBlur",
                    value: function() {
                        this.toggleButtonState()
                    }
                }, {
                    key: "handleSuccess",
                    value: function() {
                        var t = this;
                        this.originalValue = this.inputTarget.value.trim(), this.showSuccessMessage(), requestAnimationFrame((function() {
                            t.toggleButtonState()
                        }))
                    }
                }, {
                    key: "validateField",
                    value: function() {
                        return this.inputTarget.value.trim().length > 0
                    }
                }, {
                    key: "toggleButtonState",
                    value: function() {
                        var t = this.inputTarget.value.trim() !== this.originalValue,
                            e = this.validateField();
                        this.submitButtonTarget.disabled = !t || !e
                    }
                }, {
                    key: "showSuccessMessage",
                    value: function() {
                        this.successMessageTarget.style.display = "block"
                    }
                }, {
                    key: "hideSuccessMessage",
                    value: function() {
                        this.successMessageTarget.style.display = "none"
                    }
                }]) && Z(r.prototype, n), o && Z(r, o), Object.defineProperty(r, "prototype", {
                    writable: !1
                }), e
            }(o.xI);

            function it(t, e) {
                for (var r = 0; r < e.length; r++) {
                    var n = e[r];
                    n.enumerable = n.enumerable || !1, n.configurable = !0, "value" in n && (n.writable = !0), Object.defineProperty(t, at(n.key), n)
                }
            }

            function at(t) {
                var e = function(t, e) {
                    if ("object" != typeof t || !t) return t;
                    var r = t[Symbol.toPrimitive];
                    if (void 0 !== r) {
                        var n = r.call(t, e || "default");
                        if ("object" != typeof n) return n;
                        throw new TypeError("@@toPrimitive must return a primitive value.")
                    }
                    return ("string" === e ? String : Number)(t)
                }(t, "string");
                return "symbol" == typeof e ? e : e + ""
            }

            function ut(t, e, r) {
                return e = st(e),
                    function(t, e) {
                        if (e && ("object" == typeof e || "function" == typeof e)) return e;
                        if (void 0 !== e) throw new TypeError("Derived constructors may only return object or undefined");
                        return function(t) {
                            if (void 0 === t) throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
                            return t
                        }(t)
                    }(t, ct() ? Reflect.construct(e, r || [], st(t).constructor) : e.apply(t, r))
            }

            function ct() {
                try {
                    var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], (function() {})))
                } catch (t) {}
                return (ct = function() {
                    return !!t
                })()
            }

            function st(t) {
                return st = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function(t) {
                    return t.__proto__ || Object.getPrototypeOf(t)
                }, st(t)
            }

            function lt(t, e) {
                return lt = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function(t, e) {
                    return t.__proto__ = e, t
                }, lt(t, e)
            }
            ot.targets = ["input", "submitButton", "successMessage"];
            var ft = "gift-purchase:channel-listing-id",
                dt = function(t) {
                    function e() {
                        return function(t, e) {
                            if (!(t instanceof e)) throw new TypeError("Cannot call a class as a function")
                        }(this, e), ut(this, e, arguments)
                    }
                    var r, n, o;
                    return function(t, e) {
                        if ("function" != typeof e && null !== e) throw new TypeError("Super expression must either be null or a function");
                        t.prototype = Object.create(e && e.prototype, {
                            constructor: {
                                value: t,
                                writable: !0,
                                configurable: !0
                            }
                        }), Object.defineProperty(t, "prototype", {
                            writable: !1
                        }), e && lt(t, e)
                    }(e, t), r = e, (n = [{
                        key: "connect",
                        value: function() {
                            this.restoreSelection(), this.syncDeliveryOptionsToTheme(), this.signedInValue ? this.revealFullForm() : this.showLoginPrompt()
                        }
                    }, {
                        key: "selectTheme",
                        value: function() {
                            var t, e = this.selectedThemeRadio;
                            null !== e && void 0 !== e && e.dataset.imagePath && (this.themePreviewTarget.src = e.dataset.imagePath, this.themePreviewTarget.alt = null !== (t = e.dataset.imageAlt) && void 0 !== t ? t : ""), this.syncDeliveryOptionsToTheme()
                        }
                    }, {
                        key: "selectedThemeRadio",
                        get: function() {
                            return this.themeRadioTargets.find((function(t) {
                                return t.checked
                            }))
                        }
                    }, {
                        key: "syncDeliveryOptionsToTheme",
                        value: function() {
                            var t, e = "true" === (null === (t = this.selectedThemeRadio) || void 0 === t ? void 0 : t.dataset.themed);
                            e && this.scheduledRadioTarget.checked && (this.immediateRadioTarget.checked = !0, this.immediateRadioTarget.dispatchEvent(new Event("change", {
                                bubbles: !0
                            }))), this.scheduledRadioTarget.disabled = e, this.schedulingUnavailableMessageTargets.forEach((function(t) {
                                return t.hidden = !e
                            }))
                        }
                    }, {
                        key: "continueAsGuest",
                        value: function() {
                            this.revealFullForm(), this.promoBannerTarget.hidden = !0, this.firstFieldTarget.focus()
                        }
                    }, {
                        key: "persistSelection",
                        value: function(t) {
                            var e = t.target;
                            if (null !== e && void 0 !== e && e.checked) try {
                                window.sessionStorage.setItem(ft, e.value)
                            } catch (r) {}
                        }
                    }, {
                        key: "restoreSelection",
                        value: function() {
                            var t;
                            try {
                                t = window.sessionStorage.getItem(ft)
                            } catch (r) {
                                return
                            }
                            if (t) {
                                var e = this.radioTargets.find((function(e) {
                                    return e.value === t
                                }));
                                e && (e.checked = !0, e.dispatchEvent(new Event("change", {
                                    bubbles: !0
                                })))
                            }
                        }
                    }, {
                        key: "revealFullForm",
                        value: function() {
                            this.loginPromptTarget.hidden = !0, this.fullFormTarget.hidden = !1
                        }
                    }, {
                        key: "showLoginPrompt",
                        value: function() {
                            this.loginPromptTarget.hidden = !1, this.fullFormTarget.hidden = !0
                        }
                    }]) && it(r.prototype, n), o && it(r, o), Object.defineProperty(r, "prototype", {
                        writable: !1
                    }), e
                }(o.xI);
            dt.targets = ["loginPrompt", "fullForm", "firstField", "radio", "promoBanner", "themePreview", "themeRadio", "immediateRadio", "scheduledRadio", "schedulingUnavailableMessage"], dt.values = {
                signedIn: Boolean
            };
            var ht = r(6519),
                pt = r(8750),
                yt = r(1232),
                vt = null;

            function mt() {
                var t;
                return !(null === (t = window.YNAB_CLIENT_CONSTANTS) || void 0 === t || !t.CASTLE_PUBLISHABLE_KEY) && "undefined" !== typeof window.Castle
            }

            function gt(t) {
                kt(t, vt), bt()
            }

            function bt() {
                wt().then((function(t) {
                    vt = t
                }))
            }

            function wt() {
                return mt() ? window.Castle.createRequestToken() : Promise.resolve(null)
            }

            function kt(t, e) {
                mt() && e && !t.__castleRequestTokenSet && 1 === t.readyState && (t.setRequestHeader("X-Castle-Request-Token", e), t.__castleRequestTokenSet = !0)
            }

            function Ot(t, e) {
                return function(t) {
                    if (Array.isArray(t)) return t
                }(t) || function(t, e) {
                    var r = null == t ? null : "undefined" != typeof Symbol && t[Symbol.iterator] || t["@@iterator"];
                    if (null != r) {
                        var n, o, i, a, u = [],
                            c = !0,
                            s = !1;
                        try {
                            if (i = (r = r.call(t)).next, 0 === e) {
                                if (Object(r) !== r) return;
                                c = !1
                            } else
                                for (; !(c = (n = i.call(r)).done) && (u.push(n.value), u.length !== e); c = !0);
                        } catch (t) {
                            s = !0, o = t
                        } finally {
                            try {
                                if (!c && null != r.return && (a = r.return(), Object(a) !== a)) return
                            } finally {
                                if (s) throw o
                            }
                        }
                        return u
                    }
                }(t, e) || function(t, e) {
                    if (t) {
                        if ("string" == typeof t) return Et(t, e);
                        var r = {}.toString.call(t).slice(8, -1);
                        return "Object" === r && t.constructor && (r = t.constructor.name), "Map" === r || "Set" === r ? Array.from(t) : "Arguments" === r || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r) ? Et(t, e) : void 0
                    }
                }(t, e) || function() {
                    throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")
                }()
            }

            function Et(t, e) {
                (null == e || e > t.length) && (e = t.length);
                for (var r = 0, n = Array(e); r < e; r++) n[r] = t[r];
                return n
            }

            function Tt(t, e) {
                for (var r = 0; r < e.length; r++) {
                    var n = e[r];
                    n.enumerable = n.enumerable || !1, n.configurable = !0, "value" in n && (n.writable = !0), Object.defineProperty(t, St(n.key), n)
                }
            }

            function St(t) {
                var e = function(t, e) {
                    if ("object" != typeof t || !t) return t;
                    var r = t[Symbol.toPrimitive];
                    if (void 0 !== r) {
                        var n = r.call(t, e || "default");
                        if ("object" != typeof n) return n;
                        throw new TypeError("@@toPrimitive must return a primitive value.")
                    }
                    return ("string" === e ? String : Number)(t)
                }(t, "string");
                return "symbol" == typeof e ? e : e + ""
            }

            function _t(t, e, r) {
                return e = xt(e),
                    function(t, e) {
                        if (e && ("object" == typeof e || "function" == typeof e)) return e;
                        if (void 0 !== e) throw new TypeError("Derived constructors may only return object or undefined");
                        return function(t) {
                            if (void 0 === t) throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
                            return t
                        }(t)
                    }(t, jt() ? Reflect.construct(e, r || [], xt(t).constructor) : e.apply(t, r))
            }

            function jt() {
                try {
                    var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], (function() {})))
                } catch (t) {}
                return (jt = function() {
                    return !!t
                })()
            }

            function xt(t) {
                return xt = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function(t) {
                    return t.__proto__ || Object.getPrototypeOf(t)
                }, xt(t)
            }

            function Pt(t, e) {
                return Pt = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function(t, e) {
                    return t.__proto__ = e, t
                }, Pt(t, e)
            }(0, n.G)((function() {
                mt() && (bt(), $("form[data-castle-inject-token]").on("submit", (function(t) {
                    window.Castle.injectTokenOnSubmit(t)
                })), $(document).ajaxSend((function(t, e) {
                    gt(e)
                })), document.body.addEventListener("ajax:beforeSend", (function(t) {
                    gt(t.detail[0])
                })))
            }));
            var Lt = function(t) {
                function e() {
                    var t;
                    ! function(t, e) {
                        if (!(t instanceof e)) throw new TypeError("Cannot call a class as a function")
                    }(this, e);
                    for (var r = arguments.length, n = new Array(r), o = 0; o < r; o++) n[o] = arguments[o];
                    return (t = _t(this, e, [].concat(n))).emailAuthParams = void 0, t.ssoAuthParams = void 0, t.onSSOSuccess = function(e, r) {
                        O()(r).prop("disabled", !0), t.ssoAuthParams = e;
                        var n = {
                            request_data: e
                        };
                        wt().then((function(o) {
                            O().ajax(t.formTarget.getAttribute("action"), {
                                data: n,
                                dataType: "json",
                                method: "POST",
                                beforeSend: function(t) {
                                    kt(t, o)
                                }
                            }).then((function(r, n, o) {
                                t.trackLogin(e.provider, r), t.redirect()
                            })).fail((function(n) {
                                O()(r).prop("disabled", !1), t.handleSSOAuthFailure(e.provider, n)
                            }))
                        }))
                    }, t
                }
                var r, n, o;
                return function(t, e) {
                    if ("function" != typeof e && null !== e) throw new TypeError("Super expression must either be null or a function");
                    t.prototype = Object.create(e && e.prototype, {
                        constructor: {
                            value: t,
                            writable: !0,
                            configurable: !0
                        }
                    }), Object.defineProperty(t, "prototype", {
                        writable: !1
                    }), e && Pt(t, e)
                }(e, t), r = e, (n = [{
                    key: "appleButtonTargetConnected",
                    value: function(t) {
                        (0, h.Zh)(t, this.onSSOSuccess)
                    }
                }, {
                    key: "googleButtonTargetConnected",
                    value: function(t) {
                        (0, h.ky)(t, this.onSSOSuccess)
                    }
                }, {
                    key: "formTargetConnected",
                    value: function(t) {
                        O()(t).validate()
                    }
                }, {
                    key: "otpFormOutletConnected",
                    value: function(t, e) {
                        t.onShowBackupHook = this.onShowOTPBackup.bind(this)
                    }
                }, {
                    key: "onShowOTPBackup",
                    value: function() {
                        (0, h.qc)(O()(this.formTarget)), this.loginHeaderTarget.hidden = !0, this.backupCodeHeaderTarget.hidden = !1
                    }
                }, {
                    key: "beforeSend",
                    value: function(t) {
                        (0, h.qc)(O()(this.formTarget)), this.ssoAuthParams && this.hasOtpFormOutlet && this.otpFormOutlet.visible ? t.detail[1].data = this.addSSOCredentialsToForm(t) : this.storeEmailCredentials()
                    }
                }, {
                    key: "storeEmailCredentials",
                    value: function() {
                        this.emailAuthParams = {
                            email: this.emailInputTarget.value,
                            password: this.passwordInputTarget.value,
                            remember_me: this.rememberMeInputTarget.checked
                        }
                    }
                }, {
                    key: "addSSOCredentialsToForm",
                    value: function(t) {
                        var e = decodeURI(t.detail[1].data),
                            r = new URLSearchParams(e);
                        return r.set("request_data[provider]", this.ssoAuthParams.provider), r.set("request_data[provider_token]", this.ssoAuthParams.provider_token), r.toString()
                    }
                }, {
                    key: "handleError",
                    value: function(t) {
                        var e = O()(this.formTarget);
                        if ((0, h.qc)(e), !(this.hasOtpFormOutlet && this.otpFormOutlet.visible && this.otpFormOutlet.handleOTPError(t, e))) {
                            var r = Ot(t.detail, 3),
                                n = r[0],
                                o = (r[1], r[2]);
                            if (401 !== o.status && 422 !== o.status) return (0, h.Rx)(e, o);
                            var i = null === n || void 0 === n ? void 0 : n.error;
                            if (i) switch (i.id) {
                                case "user_otp_required":
                                    this.showOTP();
                                    break;
                                case "user_not_found":
                                    return (0, h.PB)(e, ".js-form-password", "We weren't able to log you in. Please check that your email and password are correct.");
                                default:
                                    return /^password_/.test(i.id) ? (0, h.PB)(e, ".js-form-password", i.message) : (0, h.PB)(e, ".js-form-email", i.message)
                            }
                        }
                    }
                }, {
                    key: "handleSuccess",
                    value: function(t) {
                        var e = this,
                            r = t.detail[0];
                        this.emailAuthParams ? this.trackLogin(yt.s.Email, r) : this.ssoAuthParams && this.trackLogin(this.ssoAuthParams.provider, r), requestAnimationFrame((function() {
                            ht.A.disableElement(e.formTarget)
                        }));
                        var n = null;
                        this.otpFormOutlet.usingBackupCode ? n = this.formTarget.dataset.disabledOtpUrl : this.formTarget.dataset.redirectUrl && (n = this.formTarget.dataset.redirectUrl), this.redirect(n)
                    }
                }, {
                    key: "handleSSOAuthFailure",
                    value: function(t, e) {
                        var r = null != e.responseJSON ? e.responseJSON.error : void 0;
                        if (401 !== e.status && 422 !== e.status || !r) return (0, h.df)(t, h.Gq);
                        var n = t.toLowerCase().replace(/(?:^|\s|-)\S/g, (function(t) {
                            return t.toUpperCase()
                        }));
                        switch (r.id) {
                            case "user_otp_required":
                                this.showOTP();
                                break;
                            case "user_not_found":
                                var o = "\n                        Your ".concat(n, ' account is not linked to a YNAB account.\n                        Please try a different login method if you have an account, or create a new account by <a href="/users/sign_up">signing up</a>.\n                    ');
                                return (0, h.df)(t, o);
                            default:
                                return (0, h.df)(t, r.message)
                        }
                    }
                }, {
                    key: "trackClickedSignUp",
                    value: function() {
                        var t;
                        null === (t = YNABAnalytics) || void 0 === t || t.trackEvent(i.oA.SignUp_ClickedSignUp)
                    }
                }, {
                    key: "trackLogin",
                    value: function(t, e) {
                        var r, n = null === e || void 0 === e || null === (r = e.user) || void 0 === r ? void 0 : r.id;
                        n ? null != window.YNABAnalytics && YNABAnalytics.trackLogin(t, n) : pt.L.addError(new Error("trackLogin: login response missing a user id"), {
                            provider: t
                        })
                    }
                }, {
                    key: "redirect",
                    value: function(t) {
                        var e, r = null !== (e = null !== t && void 0 !== t ? t : this.formTarget.dataset.redirectUrl) && void 0 !== e ? e : "";
                        YNAB.redirectWithDelay(r)
                    }
                }, {
                    key: "showOTP",
                    value: function() {
                        this.identityContainerTarget.hidden = !0, this.loginSubheaderTarget.hidden = !0, this.ssoButtonsTarget.hidden = !0, this.otpFormOutlet.show()
                    }
                }]) && Tt(r.prototype, n), o && Tt(r, o), Object.defineProperty(r, "prototype", {
                    writable: !1
                }), e
            }(o.xI);

            function Ct(t, e) {
                return function(t) {
                    if (Array.isArray(t)) return t
                }(t) || function(t, e) {
                    var r = null == t ? null : "undefined" != typeof Symbol && t[Symbol.iterator] || t["@@iterator"];
                    if (null != r) {
                        var n, o, i, a, u = [],
                            c = !0,
                            s = !1;
                        try {
                            if (i = (r = r.call(t)).next, 0 === e) {
                                if (Object(r) !== r) return;
                                c = !1
                            } else
                                for (; !(c = (n = i.call(r)).done) && (u.push(n.value), u.length !== e); c = !0);
                        } catch (t) {
                            s = !0, o = t
                        } finally {
                            try {
                                if (!c && null != r.return && (a = r.return(), Object(a) !== a)) return
                            } finally {
                                if (s) throw o
                            }
                        }
                        return u
                    }
                }(t, e) || function(t, e) {
                    if (t) {
                        if ("string" == typeof t) return At(t, e);
                        var r = {}.toString.call(t).slice(8, -1);
                        return "Object" === r && t.constructor && (r = t.constructor.name), "Map" === r || "Set" === r ? Array.from(t) : "Arguments" === r || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r) ? At(t, e) : void 0
                    }
                }(t, e) || function() {
                    throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")
                }()
            }

            function At(t, e) {
                (null == e || e > t.length) && (e = t.length);
                for (var r = 0, n = Array(e); r < e; r++) n[r] = t[r];
                return n
            }

            function Bt(t, e) {
                for (var r = 0; r < e.length; r++) {
                    var n = e[r];
                    n.enumerable = n.enumerable || !1, n.configurable = !0, "value" in n && (n.writable = !0), Object.defineProperty(t, It(n.key), n)
                }
            }

            function It(t) {
                var e = function(t, e) {
                    if ("object" != typeof t || !t) return t;
                    var r = t[Symbol.toPrimitive];
                    if (void 0 !== r) {
                        var n = r.call(t, e || "default");
                        if ("object" != typeof n) return n;
                        throw new TypeError("@@toPrimitive must return a primitive value.")
                    }
                    return ("string" === e ? String : Number)(t)
                }(t, "string");
                return "symbol" == typeof e ? e : e + ""
            }

            function Ft(t, e, r) {
                return e = Rt(e),
                    function(t, e) {
                        if (e && ("object" == typeof e || "function" == typeof e)) return e;
                        if (void 0 !== e) throw new TypeError("Derived constructors may only return object or undefined");
                        return function(t) {
                            if (void 0 === t) throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
                            return t
                        }(t)
                    }(t, Nt() ? Reflect.construct(e, r || [], Rt(t).constructor) : e.apply(t, r))
            }

            function Nt() {
                try {
                    var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], (function() {})))
                } catch (t) {}
                return (Nt = function() {
                    return !!t
                })()
            }

            function Rt(t) {
                return Rt = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function(t) {
                    return t.__proto__ || Object.getPrototypeOf(t)
                }, Rt(t)
            }

            function Dt(t, e) {
                return Dt = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function(t, e) {
                    return t.__proto__ = e, t
                }, Dt(t, e)
            }
            Lt.targets = ["form", "emailInput", "passwordInput", "rememberMeInput", "identityContainer", "appleButton", "googleButton", "backupCodeHeader", "loginHeader", "loginSubheader", "ssoButtons"], Lt.outlets = ["otp-form"];
            var Gt = function(t) {
                function e() {
                    return function(t, e) {
                        if (!(t instanceof e)) throw new TypeError("Cannot call a class as a function")
                    }(this, e), Ft(this, e, arguments)
                }
                var r, n, o;
                return function(t, e) {
                    if ("function" != typeof e && null !== e) throw new TypeError("Super expression must either be null or a function");
                    t.prototype = Object.create(e && e.prototype, {
                        constructor: {
                            value: t,
                            writable: !0,
                            configurable: !0
                        }
                    }), Object.defineProperty(t, "prototype", {
                        writable: !1
                    }), e && Dt(t, e)
                }(e, t), r = e, (n = [{
                    key: "connect",
                    value: function() {
                        YNABAnalytics.trackEvent(i.oA.General_ClickedForgotPassword)
                    }
                }, {
                    key: "initiateFormTargetConnected",
                    value: function(t) {
                        $(t).validate()
                    }
                }, {
                    key: "handleInitiateSuccess",
                    value: function(t) {
                        var e = this;
                        requestAnimationFrame((function() {
                            Rails.disableElement(e.initiateFormTarget)
                        })), $(this.passwordsContainerTarget).fadeOut("fast", (function() {
                            $(e.passwordsSuccessContainerTarget).fadeIn("fast")
                        })), YNABAnalytics.trackEvent(i.oA.General_SubmittedSendResetInstructions)
                    }
                }, {
                    key: "handleInitiateError",
                    value: function(t) {
                        var e = $(this.initiateFormTarget),
                            r = Ct(t.detail, 3),
                            n = r[0],
                            o = (r[1], r[2]);
                        (0, h.qc)(e), YNABAnalytics.trackEvent(i.oA.General_SubmittedSendResetInstructions);
                        var a = null === n || void 0 === n ? void 0 : n.error;
                        if (401 !== o.status && 422 !== o.status) return (0, h.Rx)(e, o);
                        a ? (0, h.PB)(e, ".js-form-email", a.message) : (0, h.PB)(e, ".js-form-email", h.Gq)
                    }
                }]) && Bt(r.prototype, n), o && Bt(r, o), Object.defineProperty(r, "prototype", {
                    writable: !1
                }), e
            }(o.xI);

            function Mt(t, e) {
                for (var r = 0; r < e.length; r++) {
                    var n = e[r];
                    n.enumerable = n.enumerable || !1, n.configurable = !0, "value" in n && (n.writable = !0), Object.defineProperty(t, Yt(n.key), n)
                }
            }

            function Yt(t) {
                var e = function(t, e) {
                    if ("object" != typeof t || !t) return t;
                    var r = t[Symbol.toPrimitive];
                    if (void 0 !== r) {
                        var n = r.call(t, e || "default");
                        if ("object" != typeof n) return n;
                        throw new TypeError("@@toPrimitive must return a primitive value.")
                    }
                    return ("string" === e ? String : Number)(t)
                }(t, "string");
                return "symbol" == typeof e ? e : e + ""
            }

            function qt(t, e, r) {
                return e = Vt(e),
                    function(t, e) {
                        if (e && ("object" == typeof e || "function" == typeof e)) return e;
                        if (void 0 !== e) throw new TypeError("Derived constructors may only return object or undefined");
                        return function(t) {
                            if (void 0 === t) throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
                            return t
                        }(t)
                    }(t, Ut() ? Reflect.construct(e, r || [], Vt(t).constructor) : e.apply(t, r))
            }

            function Ut() {
                try {
                    var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], (function() {})))
                } catch (t) {}
                return (Ut = function() {
                    return !!t
                })()
            }

            function Vt(t) {
                return Vt = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function(t) {
                    return t.__proto__ || Object.getPrototypeOf(t)
                }, Vt(t)
            }

            function zt(t, e) {
                return zt = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function(t, e) {
                    return t.__proto__ = e, t
                }, zt(t, e)
            }
            Gt.targets = ["initiateForm", "passwordsContainer", "passwordsSuccessContainer", "emailInput"];
            var Ht = function(t) {
                function e() {
                    return function(t, e) {
                        if (!(t instanceof e)) throw new TypeError("Cannot call a class as a function")
                    }(this, e), qt(this, e, arguments)
                }
                var r, n, o;
                return function(t, e) {
                    if ("function" != typeof e && null !== e) throw new TypeError("Super expression must either be null or a function");
                    t.prototype = Object.create(e && e.prototype, {
                        constructor: {
                            value: t,
                            writable: !0,
                            configurable: !0
                        }
                    }), Object.defineProperty(t, "prototype", {
                        writable: !1
                    }), e && zt(t, e)
                }(e, t), r = e, (n = [{
                    key: "connect",
                    value: function() {
                        this.update()
                    }
                }, {
                    key: "update",
                    value: function() {
                        this.submitTarget.disabled = !this.optionTargets.some((function(t) {
                            return t.checked
                        }))
                    }
                }]) && Mt(r.prototype, n), o && Mt(r, o), Object.defineProperty(r, "prototype", {
                    writable: !1
                }), e
            }(o.xI);

            function Kt(t, e) {
                return function(t) {
                    if (Array.isArray(t)) return t
                }(t) || function(t, e) {
                    var r = null == t ? null : "undefined" != typeof Symbol && t[Symbol.iterator] || t["@@iterator"];
                    if (null != r) {
                        var n, o, i, a, u = [],
                            c = !0,
                            s = !1;
                        try {
                            if (i = (r = r.call(t)).next, 0 === e) {
                                if (Object(r) !== r) return;
                                c = !1
                            } else
                                for (; !(c = (n = i.call(r)).done) && (u.push(n.value), u.length !== e); c = !0);
                        } catch (t) {
                            s = !0, o = t
                        } finally {
                            try {
                                if (!c && null != r.return && (a = r.return(), Object(a) !== a)) return
                            } finally {
                                if (s) throw o
                            }
                        }
                        return u
                    }
                }(t, e) || function(t, e) {
                    if (t) {
                        if ("string" == typeof t) return $t(t, e);
                        var r = {}.toString.call(t).slice(8, -1);
                        return "Object" === r && t.constructor && (r = t.constructor.name), "Map" === r || "Set" === r ? Array.from(t) : "Arguments" === r || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r) ? $t(t, e) : void 0
                    }
                }(t, e) || function() {
                    throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")
                }()
            }

            function $t(t, e) {
                (null == e || e > t.length) && (e = t.length);
                for (var r = 0, n = Array(e); r < e; r++) n[r] = t[r];
                return n
            }

            function Wt(t, e) {
                for (var r = 0; r < e.length; r++) {
                    var n = e[r];
                    n.enumerable = n.enumerable || !1, n.configurable = !0, "value" in n && (n.writable = !0), Object.defineProperty(t, Xt(n.key), n)
                }
            }

            function Xt(t) {
                var e = function(t, e) {
                    if ("object" != typeof t || !t) return t;
                    var r = t[Symbol.toPrimitive];
                    if (void 0 !== r) {
                        var n = r.call(t, e || "default");
                        if ("object" != typeof n) return n;
                        throw new TypeError("@@toPrimitive must return a primitive value.")
                    }
                    return ("string" === e ? String : Number)(t)
                }(t, "string");
                return "symbol" == typeof e ? e : e + ""
            }

            function Jt(t, e, r) {
                return e = Qt(e),
                    function(t, e) {
                        if (e && ("object" == typeof e || "function" == typeof e)) return e;
                        if (void 0 !== e) throw new TypeError("Derived constructors may only return object or undefined");
                        return function(t) {
                            if (void 0 === t) throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
                            return t
                        }(t)
                    }(t, Zt() ? Reflect.construct(e, r || [], Qt(t).constructor) : e.apply(t, r))
            }

            function Zt() {
                try {
                    var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], (function() {})))
                } catch (t) {}
                return (Zt = function() {
                    return !!t
                })()
            }

            function Qt(t) {
                return Qt = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function(t) {
                    return t.__proto__ || Object.getPrototypeOf(t)
                }, Qt(t)
            }

            function te(t, e) {
                return te = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function(t, e) {
                    return t.__proto__ = e, t
                }, te(t, e)
            }
            Ht.targets = ["option", "submit"];
            var ee = function(t) {
                function e() {
                    var t;
                    ! function(t, e) {
                        if (!(t instanceof e)) throw new TypeError("Cannot call a class as a function")
                    }(this, e);
                    for (var r = arguments.length, n = new Array(r), o = 0; o < r; o++) n[o] = arguments[o];
                    return (t = Jt(this, e, [].concat(n))).onShowBackupHook = void 0, t
                }
                var r, n, o;
                return function(t, e) {
                    if ("function" != typeof e && null !== e) throw new TypeError("Super expression must either be null or a function");
                    t.prototype = Object.create(e && e.prototype, {
                        constructor: {
                            value: t,
                            writable: !0,
                            configurable: !0
                        }
                    }), Object.defineProperty(t, "prototype", {
                        writable: !1
                    }), e && te(t, e)
                }(e, t), r = e, (n = [{
                    key: "connect",
                    value: function() {
                        this.backupCodeOnStart && this.showBackup()
                    }
                }, {
                    key: "backupCodeOnStart",
                    get: function() {
                        return "true" === this.usingBackupCodeValue
                    }
                }, {
                    key: "usingBackupCode",
                    get: function() {
                        return !0 === this.showBackupLinkTarget.hidden
                    }
                }, {
                    key: "show",
                    value: function() {
                        this.otpContainerTarget.hidden = !1, this.inputTarget.required = !0, this.inputTarget.focus()
                    }
                }, {
                    key: "hide",
                    value: function() {
                        this.otpContainerTarget.hidden = !0
                    }
                }, {
                    key: "visible",
                    get: function() {
                        return !1 === this.otpContainerTarget.hidden
                    }
                }, {
                    key: "handleOTPError",
                    value: function(t, e) {
                        var r = Kt(t.detail, 3),
                            n = r[0],
                            o = (r[1], r[2]);
                        if (401 === o.status || 422 === o.status) {
                            var i = null === n || void 0 === n ? void 0 : n.error;
                            if ("user_otp_invalid" === (null === i || void 0 === i ? void 0 : i.id)) {
                                var a = this.usingBackupCode ? "The backup code is incorrect." : i.message;
                                return (0, h.PB)(e, ".js-form-otp", a), !0
                            }
                            return !1
                        }
                        return !1
                    }
                }, {
                    key: "showBackup",
                    value: function() {
                        this.inputTarget.value = "", this.showBackupLinkTarget.hidden = !0, this.troubleshootLinkTarget.hidden = !1, this.labelTarget.textContent = "Enter your emergency backup code.", Object.assign(this.inputTarget, {
                            placeholder: "xxxx-xxxx-xxxx",
                            size: 14,
                            maxLength: 14
                        }), this.addFromBackupCodeHiddenInput(), this.onShowBackupHook && this.onShowBackupHook(), this.inputTarget.focus()
                    }
                }, {
                    key: "addFromBackupCodeHiddenInput",
                    value: function() {
                        var t = document.createElement("input");
                        t.type = "hidden", t.name = "user[submitted_from_backup_code_form]", t.id = "user_submitted_from_backup_code_form", t.value = "true", t.autocomplete = "off", this.otpContainerTarget.prepend(t)
                    }
                }]) && Wt(r.prototype, n), o && Wt(r, o), Object.defineProperty(r, "prototype", {
                    writable: !1
                }), e
            }(o.xI);

            function re() {
                re = function() {
                    return e
                };
                var t, e = {},
                    r = Object.prototype,
                    n = r.hasOwnProperty,
                    o = Object.defineProperty || function(t, e, r) {
                        t[e] = r.value
                    },
                    i = "function" == typeof Symbol ? Symbol : {},
                    a = i.iterator || "@@iterator",
                    u = i.asyncIterator || "@@asyncIterator",
                    c = i.toStringTag || "@@toStringTag";

                function s(t, e, r) {
                    return Object.defineProperty(t, e, {
                        value: r,
                        enumerable: !0,
                        configurable: !0,
                        writable: !0
                    }), t[e]
                }
                try {
                    s({}, "")
                } catch (t) {
                    s = function(t, e, r) {
                        return t[e] = r
                    }
                }

                function l(t, e, r, n) {
                    var i = e && e.prototype instanceof m ? e : m,
                        a = Object.create(i.prototype),
                        u = new L(n || []);
                    return o(a, "_invoke", {
                        value: _(t, r, u)
                    }), a
                }

                function f(t, e, r) {
                    try {
                        return {
                            type: "normal",
                            arg: t.call(e, r)
                        }
                    } catch (t) {
                        return {
                            type: "throw",
                            arg: t
                        }
                    }
                }
                e.wrap = l;
                var d = "suspendedStart",
                    h = "suspendedYield",
                    p = "executing",
                    y = "completed",
                    v = {};

                function m() {}

                function g() {}

                function b() {}
                var w = {};
                s(w, a, (function() {
                    return this
                }));
                var k = Object.getPrototypeOf,
                    O = k && k(k(C([])));
                O && O !== r && n.call(O, a) && (w = O);
                var E = b.prototype = m.prototype = Object.create(w);

                function T(t) {
                    ["next", "throw", "return"].forEach((function(e) {
                        s(t, e, (function(t) {
                            return this._invoke(e, t)
                        }))
                    }))
                }

                function S(t, e) {
                    function r(o, i, a, u) {
                        var c = f(t[o], t, i);
                        if ("throw" !== c.type) {
                            var s = c.arg,
                                l = s.value;
                            return l && "object" == typeof l && n.call(l, "__await") ? e.resolve(l.__await).then((function(t) {
                                r("next", t, a, u)
                            }), (function(t) {
                                r("throw", t, a, u)
                            })) : e.resolve(l).then((function(t) {
                                s.value = t, a(s)
                            }), (function(t) {
                                return r("throw", t, a, u)
                            }))
                        }
                        u(c.arg)
                    }
                    var i;
                    o(this, "_invoke", {
                        value: function(t, n) {
                            function o() {
                                return new e((function(e, o) {
                                    r(t, n, e, o)
                                }))
                            }
                            return i = i ? i.then(o, o) : o()
                        }
                    })
                }

                function _(e, r, n) {
                    var o = d;
                    return function(i, a) {
                        if (o === p) throw Error("Generator is already running");
                        if (o === y) {
                            if ("throw" === i) throw a;
                            return {
                                value: t,
                                done: !0
                            }
                        }
                        for (n.method = i, n.arg = a;;) {
                            var u = n.delegate;
                            if (u) {
                                var c = j(u, n);
                                if (c) {
                                    if (c === v) continue;
                                    return c
                                }
                            }
                            if ("next" === n.method) n.sent = n._sent = n.arg;
                            else if ("throw" === n.method) {
                                if (o === d) throw o = y, n.arg;
                                n.dispatchException(n.arg)
                            } else "return" === n.method && n.abrupt("return", n.arg);
                            o = p;
                            var s = f(e, r, n);
                            if ("normal" === s.type) {
                                if (o = n.done ? y : h, s.arg === v) continue;
                                return {
                                    value: s.arg,
                                    done: n.done
                                }
                            }
                            "throw" === s.type && (o = y, n.method = "throw", n.arg = s.arg)
                        }
                    }
                }

                function j(e, r) {
                    var n = r.method,
                        o = e.iterator[n];
                    if (o === t) return r.delegate = null, "throw" === n && e.iterator.return && (r.method = "return", r.arg = t, j(e, r), "throw" === r.method) || "return" !== n && (r.method = "throw", r.arg = new TypeError("The iterator does not provide a '" + n + "' method")), v;
                    var i = f(o, e.iterator, r.arg);
                    if ("throw" === i.type) return r.method = "throw", r.arg = i.arg, r.delegate = null, v;
                    var a = i.arg;
                    return a ? a.done ? (r[e.resultName] = a.value, r.next = e.nextLoc, "return" !== r.method && (r.method = "next", r.arg = t), r.delegate = null, v) : a : (r.method = "throw", r.arg = new TypeError("iterator result is not an object"), r.delegate = null, v)
                }

                function x(t) {
                    var e = {
                        tryLoc: t[0]
                    };
                    1 in t && (e.catchLoc = t[1]), 2 in t && (e.finallyLoc = t[2], e.afterLoc = t[3]), this.tryEntries.push(e)
                }

                function P(t) {
                    var e = t.completion || {};
                    e.type = "normal", delete e.arg, t.completion = e
                }

                function L(t) {
                    this.tryEntries = [{
                        tryLoc: "root"
                    }], t.forEach(x, this), this.reset(!0)
                }

                function C(e) {
                    if (e || "" === e) {
                        var r = e[a];
                        if (r) return r.call(e);
                        if ("function" == typeof e.next) return e;
                        if (!isNaN(e.length)) {
                            var o = -1,
                                i = function r() {
                                    for (; ++o < e.length;)
                                        if (n.call(e, o)) return r.value = e[o], r.done = !1, r;
                                    return r.value = t, r.done = !0, r
                                };
                            return i.next = i
                        }
                    }
                    throw new TypeError(typeof e + " is not iterable")
                }
                return g.prototype = b, o(E, "constructor", {
                    value: b,
                    configurable: !0
                }), o(b, "constructor", {
                    value: g,
                    configurable: !0
                }), g.displayName = s(b, c, "GeneratorFunction"), e.isGeneratorFunction = function(t) {
                    var e = "function" == typeof t && t.constructor;
                    return !!e && (e === g || "GeneratorFunction" === (e.displayName || e.name))
                }, e.mark = function(t) {
                    return Object.setPrototypeOf ? Object.setPrototypeOf(t, b) : (t.__proto__ = b, s(t, c, "GeneratorFunction")), t.prototype = Object.create(E), t
                }, e.awrap = function(t) {
                    return {
                        __await: t
                    }
                }, T(S.prototype), s(S.prototype, u, (function() {
                    return this
                })), e.AsyncIterator = S, e.async = function(t, r, n, o, i) {
                    void 0 === i && (i = Promise);
                    var a = new S(l(t, r, n, o), i);
                    return e.isGeneratorFunction(r) ? a : a.next().then((function(t) {
                        return t.done ? t.value : a.next()
                    }))
                }, T(E), s(E, c, "Generator"), s(E, a, (function() {
                    return this
                })), s(E, "toString", (function() {
                    return "[object Generator]"
                })), e.keys = function(t) {
                    var e = Object(t),
                        r = [];
                    for (var n in e) r.push(n);
                    return r.reverse(),
                        function t() {
                            for (; r.length;) {
                                var n = r.pop();
                                if (n in e) return t.value = n, t.done = !1, t
                            }
                            return t.done = !0, t
                        }
                }, e.values = C, L.prototype = {
                    constructor: L,
                    reset: function(e) {
                        if (this.prev = 0, this.next = 0, this.sent = this._sent = t, this.done = !1, this.delegate = null, this.method = "next", this.arg = t, this.tryEntries.forEach(P), !e)
                            for (var r in this) "t" === r.charAt(0) && n.call(this, r) && !isNaN(+r.slice(1)) && (this[r] = t)
                    },
                    stop: function() {
                        this.done = !0;
                        var t = this.tryEntries[0].completion;
                        if ("throw" === t.type) throw t.arg;
                        return this.rval
                    },
                    dispatchException: function(e) {
                        if (this.done) throw e;
                        var r = this;

                        function o(n, o) {
                            return u.type = "throw", u.arg = e, r.next = n, o && (r.method = "next", r.arg = t), !!o
                        }
                        for (var i = this.tryEntries.length - 1; i >= 0; --i) {
                            var a = this.tryEntries[i],
                                u = a.completion;
                            if ("root" === a.tryLoc) return o("end");
                            if (a.tryLoc <= this.prev) {
                                var c = n.call(a, "catchLoc"),
                                    s = n.call(a, "finallyLoc");
                                if (c && s) {
                                    if (this.prev < a.catchLoc) return o(a.catchLoc, !0);
                                    if (this.prev < a.finallyLoc) return o(a.finallyLoc)
                                } else if (c) {
                                    if (this.prev < a.catchLoc) return o(a.catchLoc, !0)
                                } else {
                                    if (!s) throw Error("try statement without catch or finally");
                                    if (this.prev < a.finallyLoc) return o(a.finallyLoc)
                                }
                            }
                        }
                    },
                    abrupt: function(t, e) {
                        for (var r = this.tryEntries.length - 1; r >= 0; --r) {
                            var o = this.tryEntries[r];
                            if (o.tryLoc <= this.prev && n.call(o, "finallyLoc") && this.prev < o.finallyLoc) {
                                var i = o;
                                break
                            }
                        }
                        i && ("break" === t || "continue" === t) && i.tryLoc <= e && e <= i.finallyLoc && (i = null);
                        var a = i ? i.completion : {};
                        return a.type = t, a.arg = e, i ? (this.method = "next", this.next = i.finallyLoc, v) : this.complete(a)
                    },
                    complete: function(t, e) {
                        if ("throw" === t.type) throw t.arg;
                        return "break" === t.type || "continue" === t.type ? this.next = t.arg : "return" === t.type ? (this.rval = this.arg = t.arg, this.method = "return", this.next = "end") : "normal" === t.type && e && (this.next = e), v
                    },
                    finish: function(t) {
                        for (var e = this.tryEntries.length - 1; e >= 0; --e) {
                            var r = this.tryEntries[e];
                            if (r.finallyLoc === t) return this.complete(r.completion, r.afterLoc), P(r), v
                        }
                    },
                    catch: function(t) {
                        for (var e = this.tryEntries.length - 1; e >= 0; --e) {
                            var r = this.tryEntries[e];
                            if (r.tryLoc === t) {
                                var n = r.completion;
                                if ("throw" === n.type) {
                                    var o = n.arg;
                                    P(r)
                                }
                                return o
                            }
                        }
                        throw Error("illegal catch attempt")
                    },
                    delegateYield: function(e, r, n) {
                        return this.delegate = {
                            iterator: C(e),
                            resultName: r,
                            nextLoc: n
                        }, "next" === this.method && (this.arg = t), v
                    }
                }, e
            }

            function ne(t, e, r, n, o, i, a) {
                try {
                    var u = t[i](a),
                        c = u.value
                } catch (t) {
                    return void r(t)
                }
                u.done ? e(c) : Promise.resolve(c).then(n, o)
            }

            function oe(t, e) {
                for (var r = 0; r < e.length; r++) {
                    var n = e[r];
                    n.enumerable = n.enumerable || !1, n.configurable = !0, "value" in n && (n.writable = !0), Object.defineProperty(t, ie(n.key), n)
                }
            }

            function ie(t) {
                var e = function(t, e) {
                    if ("object" != typeof t || !t) return t;
                    var r = t[Symbol.toPrimitive];
                    if (void 0 !== r) {
                        var n = r.call(t, e || "default");
                        if ("object" != typeof n) return n;
                        throw new TypeError("@@toPrimitive must return a primitive value.")
                    }
                    return ("string" === e ? String : Number)(t)
                }(t, "string");
                return "symbol" == typeof e ? e : e + ""
            }

            function ae(t, e, r) {
                return e = ce(e),
                    function(t, e) {
                        if (e && ("object" == typeof e || "function" == typeof e)) return e;
                        if (void 0 !== e) throw new TypeError("Derived constructors may only return object or undefined");
                        return function(t) {
                            if (void 0 === t) throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
                            return t
                        }(t)
                    }(t, ue() ? Reflect.construct(e, r || [], ce(t).constructor) : e.apply(t, r))
            }

            function ue() {
                try {
                    var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], (function() {})))
                } catch (t) {}
                return (ue = function() {
                    return !!t
                })()
            }

            function ce(t) {
                return ce = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function(t) {
                    return t.__proto__ || Object.getPrototypeOf(t)
                }, ce(t)
            }

            function se(t, e) {
                return se = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function(t, e) {
                    return t.__proto__ = e, t
                }, se(t, e)
            }
            ee.targets = ["otpContainer", "label", "input", "showBackupLink", "troubleshootLink"], ee.values = {
                usingBackupCode: String
            };
            var le = function(t) {
                function e() {
                    return function(t, e) {
                        if (!(t instanceof e)) throw new TypeError("Cannot call a class as a function")
                    }(this, e), ae(this, e, arguments)
                }
                var r, n, o, i, a;
                return function(t, e) {
                    if ("function" != typeof e && null !== e) throw new TypeError("Super expression must either be null or a function");
                    t.prototype = Object.create(e && e.prototype, {
                        constructor: {
                            value: t,
                            writable: !0,
                            configurable: !0
                        }
                    }), Object.defineProperty(t, "prototype", {
                        writable: !1
                    }), e && se(t, e)
                }(e, t), r = e, n = [{
                    key: "sendRecipientEmail",
                    value: (i = re().mark((function t() {
                        var e;
                        return re().wrap((function(t) {
                            for (;;) switch (t.prev = t.next) {
                                case 0:
                                    return e = this.sendRecipientEmailButtonTarget.textContent, this.sendRecipientEmailButtonTarget.setAttribute("disabled", "true"), this.sendRecipientEmailButtonTarget.textContent = "Sending...", t.prev = 3, t.next = 6, fetch(this.sendRecipientEmailFormTarget.action, {
                                        method: this.sendRecipientEmailFormTarget.method,
                                        headers: {
                                            "X-CSRF-Token": this.formAuthenticityToken,
                                            "X-Requested-With": "XMLHttpRequest"
                                        }
                                    });
                                case 6:
                                    if (!t.sent.ok) {
                                        t.next = 12;
                                        break
                                    }
                                    this.element.classList.add(this.emailSentClassValue), this.sendRecipientEmailButtonTarget.textContent = e, t.next = 13;
                                    break;
                                case 12:
                                    throw new Error("Failed to send email");
                                case 13:
                                    t.next = 20;
                                    break;
                                case 15:
                                    t.prev = 15, t.t0 = t.catch(3), console.error("Error sending recipient email:", t.t0), this.sendRecipientEmailButtonTarget.textContent = e, this.sendRecipientEmailButtonTarget.removeAttribute("disabled");
                                case 20:
                                case "end":
                                    return t.stop()
                            }
                        }), t, this, [
                            [3, 15]
                        ])
                    })), a = function() {
                        var t = this,
                            e = arguments;
                        return new Promise((function(r, n) {
                            var o = i.apply(t, e);

                            function a(t) {
                                ne(o, r, n, a, u, "next", t)
                            }

                            function u(t) {
                                ne(o, r, n, a, u, "throw", t)
                            }
                            a(void 0)
                        }))
                    }, function() {
                        return a.apply(this, arguments)
                    })
                }, {
                    key: "formAuthenticityToken",
                    get: function() {
                        var t = document.querySelector("input[name='authenticity_token']");
                        return t ? t.value : ""
                    }
                }], n && oe(r.prototype, n), o && oe(r, o), Object.defineProperty(r, "prototype", {
                    writable: !1
                }), e
            }(o.xI);

            function fe(t, e) {
                return function(t) {
                    if (Array.isArray(t)) return t
                }(t) || function(t, e) {
                    var r = null == t ? null : "undefined" != typeof Symbol && t[Symbol.iterator] || t["@@iterator"];
                    if (null != r) {
                        var n, o, i, a, u = [],
                            c = !0,
                            s = !1;
                        try {
                            if (i = (r = r.call(t)).next, 0 === e) {
                                if (Object(r) !== r) return;
                                c = !1
                            } else
                                for (; !(c = (n = i.call(r)).done) && (u.push(n.value), u.length !== e); c = !0);
                        } catch (t) {
                            s = !0, o = t
                        } finally {
                            try {
                                if (!c && null != r.return && (a = r.return(), Object(a) !== a)) return
                            } finally {
                                if (s) throw o
                            }
                        }
                        return u
                    }
                }(t, e) || function(t, e) {
                    if (t) {
                        if ("string" == typeof t) return de(t, e);
                        var r = {}.toString.call(t).slice(8, -1);
                        return "Object" === r && t.constructor && (r = t.constructor.name), "Map" === r || "Set" === r ? Array.from(t) : "Arguments" === r || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r) ? de(t, e) : void 0
                    }
                }(t, e) || function() {
                    throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")
                }()
            }

            function de(t, e) {
                (null == e || e > t.length) && (e = t.length);
                for (var r = 0, n = Array(e); r < e; r++) n[r] = t[r];
                return n
            }

            function he(t, e) {
                for (var r = 0; r < e.length; r++) {
                    var n = e[r];
                    n.enumerable = n.enumerable || !1, n.configurable = !0, "value" in n && (n.writable = !0), Object.defineProperty(t, pe(n.key), n)
                }
            }

            function pe(t) {
                var e = function(t, e) {
                    if ("object" != typeof t || !t) return t;
                    var r = t[Symbol.toPrimitive];
                    if (void 0 !== r) {
                        var n = r.call(t, e || "default");
                        if ("object" != typeof n) return n;
                        throw new TypeError("@@toPrimitive must return a primitive value.")
                    }
                    return ("string" === e ? String : Number)(t)
                }(t, "string");
                return "symbol" == typeof e ? e : e + ""
            }

            function ye(t, e, r) {
                return e = me(e),
                    function(t, e) {
                        if (e && ("object" == typeof e || "function" == typeof e)) return e;
                        if (void 0 !== e) throw new TypeError("Derived constructors may only return object or undefined");
                        return function(t) {
                            if (void 0 === t) throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
                            return t
                        }(t)
                    }(t, ve() ? Reflect.construct(e, r || [], me(t).constructor) : e.apply(t, r))
            }

            function ve() {
                try {
                    var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], (function() {})))
                } catch (t) {}
                return (ve = function() {
                    return !!t
                })()
            }

            function me(t) {
                return me = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function(t) {
                    return t.__proto__ || Object.getPrototypeOf(t)
                }, me(t)
            }

            function ge(t, e) {
                return ge = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function(t, e) {
                    return t.__proto__ = e, t
                }, ge(t, e)
            }
            le.targets = ["sendRecipientEmailForm", "sendRecipientEmailButton"], le.values = {
                emailSentClass: String
            };
            var be = function(t) {
                function e() {
                    return function(t, e) {
                        if (!(t instanceof e)) throw new TypeError("Cannot call a class as a function")
                    }(this, e), ye(this, e, arguments)
                }
                var r, n, o;
                return function(t, e) {
                    if ("function" != typeof e && null !== e) throw new TypeError("Super expression must either be null or a function");
                    t.prototype = Object.create(e && e.prototype, {
                        constructor: {
                            value: t,
                            writable: !0,
                            configurable: !0
                        }
                    }), Object.defineProperty(t, "prototype", {
                        writable: !1
                    }), e && ge(t, e)
                }(e, t), r = e, (n = [{
                    key: "resetFormTargetConnected",
                    value: function(t) {
                        $(t).validate()
                    }
                }, {
                    key: "handleResetSuccess",
                    value: function(t) {
                        window.location.href = "/group"
                    }
                }, {
                    key: "handleResetError",
                    value: function(t) {
                        var e = $(this.resetFormTarget);
                        (0, h.qc)(e);
                        var r = fe(t.detail, 3),
                            n = r[0],
                            o = (r[1], r[2]),
                            i = null === n || void 0 === n ? void 0 : n.error;
                        if (401 !== o.status && 422 !== o.status) return (0, h.Rx)(e, o);
                        i ? (0, h.PB)(e, ".js-form-password", i.message) : (0, h.PB)(e, ".js-form-password", h.Gq)
                    }
                }]) && he(r.prototype, n), o && he(r, o), Object.defineProperty(r, "prototype", {
                    writable: !1
                }), e
            }(o.xI);
            be.targets = ["resetForm", "resetPasswordContainer", "resetSubmitButton"];
            var we = r(9221);

            function ke(t, e) {
                return function(t) {
                    if (Array.isArray(t)) return t
                }(t) || function(t, e) {
                    var r = null == t ? null : "undefined" != typeof Symbol && t[Symbol.iterator] || t["@@iterator"];
                    if (null != r) {
                        var n, o, i, a, u = [],
                            c = !0,
                            s = !1;
                        try {
                            if (i = (r = r.call(t)).next, 0 === e) {
                                if (Object(r) !== r) return;
                                c = !1
                            } else
                                for (; !(c = (n = i.call(r)).done) && (u.push(n.value), u.length !== e); c = !0);
                        } catch (t) {
                            s = !0, o = t
                        } finally {
                            try {
                                if (!c && null != r.return && (a = r.return(), Object(a) !== a)) return
                            } finally {
                                if (s) throw o
                            }
                        }
                        return u
                    }
                }(t, e) || Oe(t, e) || function() {
                    throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")
                }()
            }

            function Oe(t, e) {
                if (t) {
                    if ("string" == typeof t) return Ee(t, e);
                    var r = {}.toString.call(t).slice(8, -1);
                    return "Object" === r && t.constructor && (r = t.constructor.name), "Map" === r || "Set" === r ? Array.from(t) : "Arguments" === r || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r) ? Ee(t, e) : void 0
                }
            }

            function Ee(t, e) {
                (null == e || e > t.length) && (e = t.length);
                for (var r = 0, n = Array(e); r < e; r++) n[r] = t[r];
                return n
            }

            function Te(t, e) {
                for (var r = 0; r < e.length; r++) {
                    var n = e[r];
                    n.enumerable = n.enumerable || !1, n.configurable = !0, "value" in n && (n.writable = !0), Object.defineProperty(t, Se(n.key), n)
                }
            }

            function Se(t) {
                var e = function(t, e) {
                    if ("object" != typeof t || !t) return t;
                    var r = t[Symbol.toPrimitive];
                    if (void 0 !== r) {
                        var n = r.call(t, e || "default");
                        if ("object" != typeof n) return n;
                        throw new TypeError("@@toPrimitive must return a primitive value.")
                    }
                    return ("string" === e ? String : Number)(t)
                }(t, "string");
                return "symbol" == typeof e ? e : e + ""
            }

            function _e(t, e, r) {
                return e = xe(e),
                    function(t, e) {
                        if (e && ("object" == typeof e || "function" == typeof e)) return e;
                        if (void 0 !== e) throw new TypeError("Derived constructors may only return object or undefined");
                        return function(t) {
                            if (void 0 === t) throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
                            return t
                        }(t)
                    }(t, je() ? Reflect.construct(e, r || [], xe(t).constructor) : e.apply(t, r))
            }

            function je() {
                try {
                    var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], (function() {})))
                } catch (t) {}
                return (je = function() {
                    return !!t
                })()
            }

            function xe(t) {
                return xe = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function(t) {
                    return t.__proto__ || Object.getPrototypeOf(t)
                }, xe(t)
            }

            function Pe(t, e) {
                return Pe = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function(t, e) {
                    return t.__proto__ = e, t
                }, Pe(t, e)
            }
            var Le = function(t) {
                function e() {
                    var t;
                    ! function(t, e) {
                        if (!(t instanceof e)) throw new TypeError("Cannot call a class as a function")
                    }(this, e);
                    for (var r = arguments.length, n = new Array(r), o = 0; o < r; o++) n[o] = arguments[o];
                    return (t = _e(this, e, [].concat(n))).onSSOSuccess = function(e, r) {
                        var n = {
                                request_data: e
                            },
                            o = t.attachSignUpAdditionalFormData(n);
                        O()(r).prop("disabled", !0), wt().then((function(n) {
                            var i = {
                                url: t.formTarget.getAttribute("action"),
                                data: o,
                                dataType: "json",
                                method: "POST",
                                beforeSend: function(t) {
                                    kt(t, n)
                                }
                            };
                            O().ajax(i).then((function(r) {
                                t.trackSignup(e.provider, r), t.redirect()
                            })).fail((function(n) {
                                O()(r).prop("disabled", !1), t.handleSSOAuthFailure(e.provider, n)
                            }))
                        }))
                    }, t
                }
                var r, n, o;
                return function(t, e) {
                    if ("function" != typeof e && null !== e) throw new TypeError("Super expression must either be null or a function");
                    t.prototype = Object.create(e && e.prototype, {
                        constructor: {
                            value: t,
                            writable: !0,
                            configurable: !0
                        }
                    }), Object.defineProperty(t, "prototype", {
                        writable: !1
                    }), e && Pe(t, e)
                }(e, t), r = e, n = [{
                    key: "connect",
                    value: function() {
                        var t = this;
                        setTimeout((function() {
                            return t.toggleFormControls()
                        }), 10), this.setupSubmitButtonHandler()
                    }
                }, {
                    key: "appleButtonTargetConnected",
                    value: function(t) {
                        (0, h.Zh)(t, this.onSSOSuccess)
                    }
                }, {
                    key: "googleButtonTargetConnected",
                    value: function(t) {
                        (0, h.ky)(t, this.onSSOSuccess)
                    }
                }, {
                    key: "formTargetConnected",
                    value: function(t) {
                        O()(t).validate()
                    }
                }, {
                    key: "beforeSend",
                    value: function(t) {
                        (0, h.Jd)()
                    }
                }, {
                    key: "handleSuccess",
                    value: function(t) {
                        var e = this;
                        requestAnimationFrame((function() {
                            return ht.A.disableElement(e.formTarget)
                        })), this.trackSignup(yt.s.Email, t.detail[0]), this.redirect()
                    }
                }, {
                    key: "handleError",
                    value: function(t) {
                        var e = O()(this.formTarget),
                            r = ke(t.detail, 3),
                            n = r[0],
                            o = (r[1], r[2]);
                        if ((0, h.qc)(e), 401 === o.status || 422 === o.status) {
                            var i = null === n || void 0 === n ? void 0 : n.error;
                            return i && i.message ? /^password_/.test(i.id) ? (0, h.PB)(e, ".js-form-password", i.message) : (0, h.PB)(e, ".js-form-email", i.message) : (0, h.PB)(e, ".js-form-email", h.Gq)
                        }
                        return (0, h.Rx)(e, o)
                    }
                }, {
                    key: "toggleFormControls",
                    value: function() {
                        this.submitButtonTarget && this.agreementCheckboxTarget && (this.agreementCheckboxTarget.checked ? this.submitButtonTarget.classList.remove(we.Y4) : this.submitButtonTarget.classList.add(we.Y4)), (0, we.md)(this.canEnableSSO(), this.formTarget)
                    }
                }, {
                    key: "setupSubmitButtonHandler",
                    value: function() {
                        var t = this;
                        this.submitButtonTarget && this.submitButtonTarget.addEventListener("click", (function(e) {
                            t.submitButtonTarget.classList.contains(we.Y4) && (e.preventDefault(), t.formTarget.reportValidity())
                        }))
                    }
                }, {
                    key: "canEnableSSO",
                    value: function() {
                        return this.agreementCheckboxTarget.checked
                    }
                }, {
                    key: "attachSignUpAdditionalFormData",
                    value: function(t) {
                        var e, r = O().extend({}, t),
                            n = function(t, e) {
                                var r = "undefined" != typeof Symbol && t[Symbol.iterator] || t["@@iterator"];
                                if (!r) {
                                    if (Array.isArray(t) || (r = Oe(t)) || e && t && "number" == typeof t.length) {
                                        r && (t = r);
                                        var n = 0,
                                            o = function() {};
                                        return {
                                            s: o,
                                            n: function() {
                                                return n >= t.length ? {
                                                    done: !0
                                                } : {
                                                    done: !1,
                                                    value: t[n++]
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
                                        r = r.call(t)
                                    },
                                    n: function() {
                                        var t = r.next();
                                        return a = t.done, t
                                    },
                                    e: function(t) {
                                        u = !0, i = t
                                    },
                                    f: function() {
                                        try {
                                            a || null == r.return || r.return()
                                        } finally {
                                            if (u) throw i
                                        }
                                    }
                                }
                            }(O()(this.formTarget).find("input[type=hidden][name^=request_data]").serializeArray());
                        try {
                            for (n.s(); !(e = n.n()).done;) {
                                var o = e.value;
                                r[o.name] = o.value
                            }
                        } catch (i) {
                            n.e(i)
                        } finally {
                            n.f()
                        }
                        return r
                    }
                }, {
                    key: "handleSSOAuthFailure",
                    value: function(t, e) {
                        var r = null != e.responseJSON ? e.responseJSON.error : void 0;
                        if (401 !== e.status && 422 !== e.status || !r) return (0, h.df)(t, h.Gq);
                        switch (r.id) {
                            case "email_blank":
                                t === yt.s.Apple && (0, h.df)(yt.s.Apple, "Unfortunately we didn't receive an email from Apple. You'll need to disconnect YNAB from your Apple ID before trying again");
                                break;
                            case "base_credential_connected":
                            case "email_taken":
                                var n = "".concat(r.message, ' <a href="/users/sign_in">Log in</a>?');
                                return (0, h.df)(t, n);
                            default:
                                return (0, h.df)(t, r.message)
                        }
                    }
                }, {
                    key: "trackSignup",
                    value: function(t, e) {
                        null != window.YNABAnalytics && window.YNABAnalytics.trackSignup(t, e.id)
                    }
                }, {
                    key: "redirect",
                    value: function() {
                        var t, e = null !== (t = this.formTarget.dataset.redirectUrl) && void 0 !== t ? t : "";
                        YNAB.redirectWithDelay(e)
                    }
                }], n && Te(r.prototype, n), o && Te(r, o), Object.defineProperty(r, "prototype", {
                    writable: !1
                }), e
            }(o.xI);
            Le.targets = ["form", "appleButton", "googleButton", "submitButton", "agreementCheckbox"];
            var Ce = r(4504);

            function Ae(t, e) {
                var r = Object.keys(t);
                if (Object.getOwnPropertySymbols) {
                    var n = Object.getOwnPropertySymbols(t);
                    e && (n = n.filter((function(e) {
                        return Object.getOwnPropertyDescriptor(t, e).enumerable
                    }))), r.push.apply(r, n)
                }
                return r
            }

            function Be(t) {
                for (var e = 1; e < arguments.length; e++) {
                    var r = null != arguments[e] ? arguments[e] : {};
                    e % 2 ? Ae(Object(r), !0).forEach((function(e) {
                        Ie(t, e, r[e])
                    })) : Object.getOwnPropertyDescriptors ? Object.defineProperties(t, Object.getOwnPropertyDescriptors(r)) : Ae(Object(r)).forEach((function(e) {
                        Object.defineProperty(t, e, Object.getOwnPropertyDescriptor(r, e))
                    }))
                }
                return t
            }

            function Ie(t, e, r) {
                return (e = Ne(e)) in t ? Object.defineProperty(t, e, {
                    value: r,
                    enumerable: !0,
                    configurable: !0,
                    writable: !0
                }) : t[e] = r, t
            }

            function Fe(t, e) {
                for (var r = 0; r < e.length; r++) {
                    var n = e[r];
                    n.enumerable = n.enumerable || !1, n.configurable = !0, "value" in n && (n.writable = !0), Object.defineProperty(t, Ne(n.key), n)
                }
            }

            function Ne(t) {
                var e = function(t, e) {
                    if ("object" != typeof t || !t) return t;
                    var r = t[Symbol.toPrimitive];
                    if (void 0 !== r) {
                        var n = r.call(t, e || "default");
                        if ("object" != typeof n) return n;
                        throw new TypeError("@@toPrimitive must return a primitive value.")
                    }
                    return ("string" === e ? String : Number)(t)
                }(t, "string");
                return "symbol" == typeof e ? e : e + ""
            }

            function Re(t, e, r) {
                return e = Ge(e),
                    function(t, e) {
                        if (e && ("object" == typeof e || "function" == typeof e)) return e;
                        if (void 0 !== e) throw new TypeError("Derived constructors may only return object or undefined");
                        return function(t) {
                            if (void 0 === t) throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
                            return t
                        }(t)
                    }(t, De() ? Reflect.construct(e, r || [], Ge(t).constructor) : e.apply(t, r))
            }

            function De() {
                try {
                    var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], (function() {})))
                } catch (t) {}
                return (De = function() {
                    return !!t
                })()
            }

            function Ge(t) {
                return Ge = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function(t) {
                    return t.__proto__ || Object.getPrototypeOf(t)
                }, Ge(t)
            }

            function Me(t, e) {
                return Me = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function(t, e) {
                    return t.__proto__ = e, t
                }, Me(t, e)
            }
            var Ye = function(t) {
                function e() {
                    var t;
                    ! function(t, e) {
                        if (!(t instanceof e)) throw new TypeError("Cannot call a class as a function")
                    }(this, e);
                    for (var r = arguments.length, n = new Array(r), o = 0; o < r; o++) n[o] = arguments[o];
                    return (t = Re(this, e, [].concat(n))).tippyInstance = null, t.content = void 0, t
                }
                var r, n, o;
                return function(t, e) {
                    if ("function" != typeof e && null !== e) throw new TypeError("Super expression must either be null or a function");
                    t.prototype = Object.create(e && e.prototype, {
                        constructor: {
                            value: t,
                            writable: !0,
                            configurable: !0
                        }
                    }), Object.defineProperty(t, "prototype", {
                        writable: !1
                    }), e && Me(t, e)
                }(e, t), r = e, (n = [{
                    key: "connect",
                    value: function() {
                        this.content = this.element.getAttribute("title") || this.element.getAttribute("aria-label") || "", this.content && (this.tippyInstance = (0, Ce.Ay)(this.element, Be(Be({
                            content: this.content,
                            hideOnClick: !this.isFocusable
                        }, this.hasPlacementValue ? {
                            placement: this.placementValue
                        } : {}), this.hasMaxWidthValue ? {
                            maxWidth: this.maxWidthValue
                        } : {})))
                    }
                }, {
                    key: "isFocusable",
                    get: function() {
                        var t = this.element;
                        return (t instanceof HTMLElement || t instanceof SVGElement) && t.tabIndex >= 0
                    }
                }, {
                    key: "disconnect",
                    value: function() {
                        this.tippyInstance && (this.tippyInstance.destroy(), this.tippyInstance = null)
                    }
                }]) && Fe(r.prototype, n), o && Fe(r, o), Object.defineProperty(r, "prototype", {
                    writable: !1
                }), e
            }(o.xI);

            function qe(t, e) {
                for (var r = 0; r < e.length; r++) {
                    var n = e[r];
                    n.enumerable = n.enumerable || !1, n.configurable = !0, "value" in n && (n.writable = !0), Object.defineProperty(t, Ue(n.key), n)
                }
            }

            function Ue(t) {
                var e = function(t, e) {
                    if ("object" != typeof t || !t) return t;
                    var r = t[Symbol.toPrimitive];
                    if (void 0 !== r) {
                        var n = r.call(t, e || "default");
                        if ("object" != typeof n) return n;
                        throw new TypeError("@@toPrimitive must return a primitive value.")
                    }
                    return ("string" === e ? String : Number)(t)
                }(t, "string");
                return "symbol" == typeof e ? e : e + ""
            }

            function Ve(t, e, r) {
                return e = He(e),
                    function(t, e) {
                        if (e && ("object" == typeof e || "function" == typeof e)) return e;
                        if (void 0 !== e) throw new TypeError("Derived constructors may only return object or undefined");
                        return function(t) {
                            if (void 0 === t) throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
                            return t
                        }(t)
                    }(t, ze() ? Reflect.construct(e, r || [], He(t).constructor) : e.apply(t, r))
            }

            function ze() {
                try {
                    var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], (function() {})))
                } catch (t) {}
                return (ze = function() {
                    return !!t
                })()
            }

            function He(t) {
                return He = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function(t) {
                    return t.__proto__ || Object.getPrototypeOf(t)
                }, He(t)
            }

            function Ke(t, e) {
                return Ke = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function(t, e) {
                    return t.__proto__ = e, t
                }, Ke(t, e)
            }
            Ye.values = {
                placement: String,
                maxWidth: Number
            };
            var $e = function(t) {
                function e() {
                    return function(t, e) {
                        if (!(t instanceof e)) throw new TypeError("Cannot call a class as a function")
                    }(this, e), Ve(this, e, arguments)
                }
                var r, n, o;
                return function(t, e) {
                    if ("function" != typeof e && null !== e) throw new TypeError("Super expression must either be null or a function");
                    t.prototype = Object.create(e && e.prototype, {
                        constructor: {
                            value: t,
                            writable: !0,
                            configurable: !0
                        }
                    }), Object.defineProperty(t, "prototype", {
                        writable: !1
                    }), e && Ke(t, e)
                }(e, t), r = e, n = [{
                    key: "connect",
                    value: function() {
                        this.setupLogoutLink(), this.setupUserOptionsForm(), this.setupPasswordResetForm(), this.setupSSOErrorHandling()
                    }
                }, {
                    key: "referAFriend",
                    value: function(t) {
                        var e = this;
                        t.preventDefault(), this.referAFriendLinkTarget.setAttribute("disabled", "true"), YNABAnalytics.trackEvent(i.oA.General_ClickedReferralProgramButton, function(t, e, r) {
                            return (e = Ue(e)) in t ? Object.defineProperty(t, e, {
                                value: r,
                                enumerable: !0,
                                configurable: !0,
                                writable: !0
                            }) : t[e] = r, t
                        }({}, i.I_.Location, i.gB.SettingsPage)), setTimeout((function() {
                            window.location.href = e.referAFriendLinkTarget.dataset.url
                        }), 300)
                    }
                }, {
                    key: "setupLogoutLink",
                    value: function() {
                        O()(".js-logout-link").on("click", (function(t) {
                            var e = O()(t.target);
                            if (e.data("ujs:disabled")) return ht.A.stopEverything(t);
                            var r = e.data("logout-url"),
                                n = e.data("redirect-url");
                            O().ajax(r, {
                                method: "POST",
                                headers: {
                                    "X-Session-Token": YNAB.getSessionToken()
                                }
                            }).then((function() {
                                YNABAnalytics.trackLogout(), YNABAnalytics.logoutOfChatWidgetProviders(), YNAB.redirectWithDelay(n)
                            }))
                        }))
                    }
                }, {
                    key: "setupUserOptionsForm",
                    value: function() {
                        var t = this;
                        O()("#change_user_options_form").on("change", "input[type=checkbox]", (function() {
                            ht.A.fire(this.form, "submit")
                        })).on("ajax:success", (function(e) {
                            var r = e.detail[2],
                                n = e.target;
                            O()(n).replaceWith(r.responseText), t.setupUserOptionsForm()
                        }))
                    }
                }, {
                    key: "setupPasswordResetForm",
                    value: function() {
                        O()(".set-password-form").each((function() {
                            var t = O()(this);
                            t.validate(), new YNAB.FormDirtyTrackingAllFieldsPresent(t), t.parent().on("ajax:error", ".set-password-form", (function(e) {
                                var r = e.detail[2];
                                if (422 == r.status) {
                                    var n = O()(r.responseText);
                                    t.replaceWith(n), (t = n).validate(), new YNAB.FormDirtyTrackingAllFieldsPresent(t)
                                } else window.alert("There was an unexpected error.")
                            })).on("ajax:success", ".set-password-form", (function(e) {
                                try {
                                    var n = e.detail[2].getResponseHeader("X-Session-Token");
                                    if (!n) throw new Error("No session token found in Set Password Form response");
                                    YNABMobile.sessionTokenChanged(n)
                                } catch (r) {
                                    YNABAnalytics.reportError(r)
                                }
                                requestAnimationFrame((function() {
                                    ht.A.disableElement(t.get(0))
                                })), window.location.reload()
                            }))
                        }))
                    }
                }, {
                    key: "$ssoCredentialForm",
                    get: function() {
                        return O()("#create_sso_credential_form")
                    }
                }, {
                    key: "setupSSOErrorHandling",
                    value: function() {
                        var t = this;
                        if (this.$ssoCredentialForm.length) {
                            (0, we.u0)().on("click", (function() {
                                return t.hideSSOError()
                            })).on("googleIdentified:success", (function(e, r) {
                                t.submitSSOCredentialForm(yt.s.Google, r.token)
                            })).on("googleIdentified:error", (function(e, r) {
                                t.showSSOError(r)
                            })), (0, we.wM)();
                            var e = (0, we.ls)();
                            e.on("apple:ready", (function(r, n) {
                                n.error ? t.showSSOError(n.errorMessage) : n.token && ((0, we.qD)(e.get(0)), (0, we.$S)(e.get(0), "Connecting..."), t.submitSSOCredentialForm(yt.s.Apple, n.token, n.name))
                            })), (0, we.R7)()
                        }
                    }
                }, {
                    key: "submitSSOCredentialForm",
                    value: function(t, e) {
                        var r = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : "",
                            n = this.$ssoCredentialForm;
                        n.find("#sso_credential_provider").val(t), n.find("#sso_credential_token").val(e), n.find("#sso_credential_name").val(r), n.trigger("submit")
                    }
                }, {
                    key: "showSSOError",
                    value: function(t) {
                        O()("#sso-error").text(t).show()
                    }
                }, {
                    key: "hideSSOError",
                    value: function() {
                        O()("#sso-error").hide()
                    }
                }], n && qe(r.prototype, n), o && qe(r, o), Object.defineProperty(r, "prototype", {
                    writable: !1
                }), e
            }(o.xI);
            $e.targets = ["referAFriendLink"];
            r(6609), r(960);
            var We = r(8421),
                Xe = r(2587),
                Je = {
                    onIdentityServicesInitialized: or,
                    onUserIdentified: function(t) {
                        Qe ? t(Qe) : rr.push(t)
                    },
                    renderButton: function(t, e) {
                        or((function() {
                            window.google.accounts.id.renderButton(t, {
                                type: "standard",
                                theme: "outline",
                                size: "large",
                                text: "continue_with",
                                shape: "rectangular",
                                logo_alignment: "center",
                                width: e.width
                            })
                        }))
                    },
                    oneTapPrompt: function() {
                        or((function() {
                            return window.google.accounts.id.prompt()
                        }))
                    }
                };
            window.GoogleIdentity = Je;
            var Ze, Qe, tr = !1,
                er = [],
                rr = [];

            function nr(t) {
                er.forEach((function(e) {
                    return e(t)
                }))
            }

            function or(t) {
                tr ? t(Ze) : er.push(t)
            }

            function ir() {
                return "IdentityCredential" in window
            }
            var ar = (0, Xe.t)();
            window.YNAB_CLIENT_CONSTANTS = ar, window.PRODUCTION = ar.PRODUCTION, (0, We.nt)(ar), window.YNAB_CLIENT_CONSTANTS.GOOGLE_CLIENT_ID && function(t) {
                if (!window.onGoogleLibraryLoad) {
                    var e, r, n, o, i = setTimeout((function() {
                        i = void 0, tr || nr(Ze = "Timed out")
                    }), 1e4);
                    window.onGoogleLibraryLoad = function() {
                        if (i) {
                            clearTimeout(i), i = void 0;
                            try {
                                tr = !0, window.google.accounts.id.initialize({
                                    ux_mode: "popup",
                                    client_id: t.googleClientId,
                                    prompt_parent_id: t.promptParentId,
                                    use_fedcm_for_prompt: ir(),
                                    use_fedcm_for_button: ir(),
                                    callback: function(t) {
                                        var e;
                                        e = t.credential, Qe = e, rr.forEach((function(t) {
                                            return t(e)
                                        }))
                                    }
                                }), nr()
                            } catch (e) {
                                nr(Ze = e.message)
                            }
                        }
                    }, r = "script", n = (e = document).getElementsByTagName(r)[0], (o = e.createElement(r)).async = 1, o.defer = 1, o.src = "https://accounts.google.com/gsi/client", n.parentNode.insertBefore(o, n)
                }
            }({
                googleClientId: window.YNAB_CLIENT_CONSTANTS.GOOGLE_CLIENT_ID
            });
            r(1175), r(4354), r(2726);

            function ur() {
                ur = function() {
                    return e
                };
                var t, e = {},
                    r = Object.prototype,
                    n = r.hasOwnProperty,
                    o = Object.defineProperty || function(t, e, r) {
                        t[e] = r.value
                    },
                    i = "function" == typeof Symbol ? Symbol : {},
                    a = i.iterator || "@@iterator",
                    u = i.asyncIterator || "@@asyncIterator",
                    c = i.toStringTag || "@@toStringTag";

                function s(t, e, r) {
                    return Object.defineProperty(t, e, {
                        value: r,
                        enumerable: !0,
                        configurable: !0,
                        writable: !0
                    }), t[e]
                }
                try {
                    s({}, "")
                } catch (t) {
                    s = function(t, e, r) {
                        return t[e] = r
                    }
                }

                function l(t, e, r, n) {
                    var i = e && e.prototype instanceof m ? e : m,
                        a = Object.create(i.prototype),
                        u = new L(n || []);
                    return o(a, "_invoke", {
                        value: _(t, r, u)
                    }), a
                }

                function f(t, e, r) {
                    try {
                        return {
                            type: "normal",
                            arg: t.call(e, r)
                        }
                    } catch (t) {
                        return {
                            type: "throw",
                            arg: t
                        }
                    }
                }
                e.wrap = l;
                var d = "suspendedStart",
                    h = "suspendedYield",
                    p = "executing",
                    y = "completed",
                    v = {};

                function m() {}

                function g() {}

                function b() {}
                var w = {};
                s(w, a, (function() {
                    return this
                }));
                var k = Object.getPrototypeOf,
                    O = k && k(k(C([])));
                O && O !== r && n.call(O, a) && (w = O);
                var E = b.prototype = m.prototype = Object.create(w);

                function T(t) {
                    ["next", "throw", "return"].forEach((function(e) {
                        s(t, e, (function(t) {
                            return this._invoke(e, t)
                        }))
                    }))
                }

                function S(t, e) {
                    function r(o, i, a, u) {
                        var c = f(t[o], t, i);
                        if ("throw" !== c.type) {
                            var s = c.arg,
                                l = s.value;
                            return l && "object" == typeof l && n.call(l, "__await") ? e.resolve(l.__await).then((function(t) {
                                r("next", t, a, u)
                            }), (function(t) {
                                r("throw", t, a, u)
                            })) : e.resolve(l).then((function(t) {
                                s.value = t, a(s)
                            }), (function(t) {
                                return r("throw", t, a, u)
                            }))
                        }
                        u(c.arg)
                    }
                    var i;
                    o(this, "_invoke", {
                        value: function(t, n) {
                            function o() {
                                return new e((function(e, o) {
                                    r(t, n, e, o)
                                }))
                            }
                            return i = i ? i.then(o, o) : o()
                        }
                    })
                }

                function _(e, r, n) {
                    var o = d;
                    return function(i, a) {
                        if (o === p) throw Error("Generator is already running");
                        if (o === y) {
                            if ("throw" === i) throw a;
                            return {
                                value: t,
                                done: !0
                            }
                        }
                        for (n.method = i, n.arg = a;;) {
                            var u = n.delegate;
                            if (u) {
                                var c = j(u, n);
                                if (c) {
                                    if (c === v) continue;
                                    return c
                                }
                            }
                            if ("next" === n.method) n.sent = n._sent = n.arg;
                            else if ("throw" === n.method) {
                                if (o === d) throw o = y, n.arg;
                                n.dispatchException(n.arg)
                            } else "return" === n.method && n.abrupt("return", n.arg);
                            o = p;
                            var s = f(e, r, n);
                            if ("normal" === s.type) {
                                if (o = n.done ? y : h, s.arg === v) continue;
                                return {
                                    value: s.arg,
                                    done: n.done
                                }
                            }
                            "throw" === s.type && (o = y, n.method = "throw", n.arg = s.arg)
                        }
                    }
                }

                function j(e, r) {
                    var n = r.method,
                        o = e.iterator[n];
                    if (o === t) return r.delegate = null, "throw" === n && e.iterator.return && (r.method = "return", r.arg = t, j(e, r), "throw" === r.method) || "return" !== n && (r.method = "throw", r.arg = new TypeError("The iterator does not provide a '" + n + "' method")), v;
                    var i = f(o, e.iterator, r.arg);
                    if ("throw" === i.type) return r.method = "throw", r.arg = i.arg, r.delegate = null, v;
                    var a = i.arg;
                    return a ? a.done ? (r[e.resultName] = a.value, r.next = e.nextLoc, "return" !== r.method && (r.method = "next", r.arg = t), r.delegate = null, v) : a : (r.method = "throw", r.arg = new TypeError("iterator result is not an object"), r.delegate = null, v)
                }

                function x(t) {
                    var e = {
                        tryLoc: t[0]
                    };
                    1 in t && (e.catchLoc = t[1]), 2 in t && (e.finallyLoc = t[2], e.afterLoc = t[3]), this.tryEntries.push(e)
                }

                function P(t) {
                    var e = t.completion || {};
                    e.type = "normal", delete e.arg, t.completion = e
                }

                function L(t) {
                    this.tryEntries = [{
                        tryLoc: "root"
                    }], t.forEach(x, this), this.reset(!0)
                }

                function C(e) {
                    if (e || "" === e) {
                        var r = e[a];
                        if (r) return r.call(e);
                        if ("function" == typeof e.next) return e;
                        if (!isNaN(e.length)) {
                            var o = -1,
                                i = function r() {
                                    for (; ++o < e.length;)
                                        if (n.call(e, o)) return r.value = e[o], r.done = !1, r;
                                    return r.value = t, r.done = !0, r
                                };
                            return i.next = i
                        }
                    }
                    throw new TypeError(typeof e + " is not iterable")
                }
                return g.prototype = b, o(E, "constructor", {
                    value: b,
                    configurable: !0
                }), o(b, "constructor", {
                    value: g,
                    configurable: !0
                }), g.displayName = s(b, c, "GeneratorFunction"), e.isGeneratorFunction = function(t) {
                    var e = "function" == typeof t && t.constructor;
                    return !!e && (e === g || "GeneratorFunction" === (e.displayName || e.name))
                }, e.mark = function(t) {
                    return Object.setPrototypeOf ? Object.setPrototypeOf(t, b) : (t.__proto__ = b, s(t, c, "GeneratorFunction")), t.prototype = Object.create(E), t
                }, e.awrap = function(t) {
                    return {
                        __await: t
                    }
                }, T(S.prototype), s(S.prototype, u, (function() {
                    return this
                })), e.AsyncIterator = S, e.async = function(t, r, n, o, i) {
                    void 0 === i && (i = Promise);
                    var a = new S(l(t, r, n, o), i);
                    return e.isGeneratorFunction(r) ? a : a.next().then((function(t) {
                        return t.done ? t.value : a.next()
                    }))
                }, T(E), s(E, c, "Generator"), s(E, a, (function() {
                    return this
                })), s(E, "toString", (function() {
                    return "[object Generator]"
                })), e.keys = function(t) {
                    var e = Object(t),
                        r = [];
                    for (var n in e) r.push(n);
                    return r.reverse(),
                        function t() {
                            for (; r.length;) {
                                var n = r.pop();
                                if (n in e) return t.value = n, t.done = !1, t
                            }
                            return t.done = !0, t
                        }
                }, e.values = C, L.prototype = {
                    constructor: L,
                    reset: function(e) {
                        if (this.prev = 0, this.next = 0, this.sent = this._sent = t, this.done = !1, this.delegate = null, this.method = "next", this.arg = t, this.tryEntries.forEach(P), !e)
                            for (var r in this) "t" === r.charAt(0) && n.call(this, r) && !isNaN(+r.slice(1)) && (this[r] = t)
                    },
                    stop: function() {
                        this.done = !0;
                        var t = this.tryEntries[0].completion;
                        if ("throw" === t.type) throw t.arg;
                        return this.rval
                    },
                    dispatchException: function(e) {
                        if (this.done) throw e;
                        var r = this;

                        function o(n, o) {
                            return u.type = "throw", u.arg = e, r.next = n, o && (r.method = "next", r.arg = t), !!o
                        }
                        for (var i = this.tryEntries.length - 1; i >= 0; --i) {
                            var a = this.tryEntries[i],
                                u = a.completion;
                            if ("root" === a.tryLoc) return o("end");
                            if (a.tryLoc <= this.prev) {
                                var c = n.call(a, "catchLoc"),
                                    s = n.call(a, "finallyLoc");
                                if (c && s) {
                                    if (this.prev < a.catchLoc) return o(a.catchLoc, !0);
                                    if (this.prev < a.finallyLoc) return o(a.finallyLoc)
                                } else if (c) {
                                    if (this.prev < a.catchLoc) return o(a.catchLoc, !0)
                                } else {
                                    if (!s) throw Error("try statement without catch or finally");
                                    if (this.prev < a.finallyLoc) return o(a.finallyLoc)
                                }
                            }
                        }
                    },
                    abrupt: function(t, e) {
                        for (var r = this.tryEntries.length - 1; r >= 0; --r) {
                            var o = this.tryEntries[r];
                            if (o.tryLoc <= this.prev && n.call(o, "finallyLoc") && this.prev < o.finallyLoc) {
                                var i = o;
                                break
                            }
                        }
                        i && ("break" === t || "continue" === t) && i.tryLoc <= e && e <= i.finallyLoc && (i = null);
                        var a = i ? i.completion : {};
                        return a.type = t, a.arg = e, i ? (this.method = "next", this.next = i.finallyLoc, v) : this.complete(a)
                    },
                    complete: function(t, e) {
                        if ("throw" === t.type) throw t.arg;
                        return "break" === t.type || "continue" === t.type ? this.next = t.arg : "return" === t.type ? (this.rval = this.arg = t.arg, this.method = "return", this.next = "end") : "normal" === t.type && e && (this.next = e), v
                    },
                    finish: function(t) {
                        for (var e = this.tryEntries.length - 1; e >= 0; --e) {
                            var r = this.tryEntries[e];
                            if (r.finallyLoc === t) return this.complete(r.completion, r.afterLoc), P(r), v
                        }
                    },
                    catch: function(t) {
                        for (var e = this.tryEntries.length - 1; e >= 0; --e) {
                            var r = this.tryEntries[e];
                            if (r.tryLoc === t) {
                                var n = r.completion;
                                if ("throw" === n.type) {
                                    var o = n.arg;
                                    P(r)
                                }
                                return o
                            }
                        }
                        throw Error("illegal catch attempt")
                    },
                    delegateYield: function(e, r, n) {
                        return this.delegate = {
                            iterator: C(e),
                            resultName: r,
                            nextLoc: n
                        }, "next" === this.method && (this.arg = t), v
                    }
                }, e
            }

            function cr(t, e, r, n, o, i, a) {
                try {
                    var u = t[i](a),
                        c = u.value
                } catch (t) {
                    return void r(t)
                }
                u.done ? e(c) : Promise.resolve(c).then(n, o)
            }

            function sr(t, e) {
                return function(t) {
                    if (Array.isArray(t)) return t
                }(t) || function(t, e) {
                    var r = null == t ? null : "undefined" != typeof Symbol && t[Symbol.iterator] || t["@@iterator"];
                    if (null != r) {
                        var n, o, i, a, u = [],
                            c = !0,
                            s = !1;
                        try {
                            if (i = (r = r.call(t)).next, 0 === e) {
                                if (Object(r) !== r) return;
                                c = !1
                            } else
                                for (; !(c = (n = i.call(r)).done) && (u.push(n.value), u.length !== e); c = !0);
                        } catch (t) {
                            s = !0, o = t
                        } finally {
                            try {
                                if (!c && null != r.return && (a = r.return(), Object(a) !== a)) return
                            } finally {
                                if (s) throw o
                            }
                        }
                        return u
                    }
                }(t, e) || function(t, e) {
                    if (t) {
                        if ("string" == typeof t) return lr(t, e);
                        var r = {}.toString.call(t).slice(8, -1);
                        return "Object" === r && t.constructor && (r = t.constructor.name), "Map" === r || "Set" === r ? Array.from(t) : "Arguments" === r || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r) ? lr(t, e) : void 0
                    }
                }(t, e) || function() {
                    throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")
                }()
            }

            function lr(t, e) {
                (null == e || e > t.length) && (e = t.length);
                for (var r = 0, n = Array(e); r < e; r++) n[r] = t[r];
                return n
            }

            function fr(t, e) {
                for (var r = 0; r < e.length; r++) {
                    var n = e[r];
                    n.enumerable = n.enumerable || !1, n.configurable = !0, "value" in n && (n.writable = !0), Object.defineProperty(t, dr(n.key), n)
                }
            }

            function dr(t) {
                var e = function(t, e) {
                    if ("object" != typeof t || !t) return t;
                    var r = t[Symbol.toPrimitive];
                    if (void 0 !== r) {
                        var n = r.call(t, e || "default");
                        if ("object" != typeof n) return n;
                        throw new TypeError("@@toPrimitive must return a primitive value.")
                    }
                    return ("string" === e ? String : Number)(t)
                }(t, "string");
                return "symbol" == typeof e ? e : e + ""
            }
            var hr = function() {
                function t(e) {
                    ! function(t, e) {
                        if (!(t instanceof e)) throw new TypeError("Cannot call a class as a function")
                    }(this, t), this.paymentErrorBlock = void 0, this.form = void 0, this.formElement = void 0, this.isEditingSubscription = void 0, 0 !== e.length && (this.form = e, this.formElement = e[0], this.paymentErrorBlock = this.form.find(".js-payment-error"), this.configureRecurly(), this.addEventListeners(), this.isEditingSubscription = "put" == this.form.find("input[name=_method]").val())
                }
                var e, r, n, o, i;
                return e = t, r = [{
                    key: "addEventListeners",
                    value: function() {
                        var t = this;
                        this.form.on("ajax:error", (function(e) {
                            var r = sr(e.detail, 3),
                                n = r[0],
                                o = (r[1], r[2]);
                            if (o.status >= 500) t.showPaymentError("There was a problem with the server, please try again later or contact support.");
                            else if (422 == o.status && n && n.three_d_secure_token_id) {
                                var i = n.three_d_secure_token_id;
                                t.process3DSecureToken(i, e)
                            } else t.showPaymentError(o.responseText || "There was an error with your request, please try again later or contact support.")
                        })), this.form.on("ajax:success", (function(e) {
                            var r = sr(e.detail, 3),
                                n = (r[0], r[1], r[2]);
                            t.updatePage(n.responseText), t.isEditingSubscription || t.trackConversion()
                        })), this.form.on("input", "[data-recurly=full_name]", (function(t) {
                            var e = O()(t.target);
                            e.val().toString().length && e.removeClass("error").siblings("label.error").hide()
                        })), this.form.on("input", "[data-recurly=postal_code]", (function() {
                            t.hideErrorForField("postal_code")
                        })), this.form.on("change", "[data-recurly=postal_code], [data-recurly=country]", (function(e) {
                            t.resetSubscriptionTax()
                        })), this.form.on("submit", (function(e) {
                            return e.preventDefault(), t.hideErrors(), t.submitForm(e)
                        }))
                    }
                }, {
                    key: "configureRecurly",
                    value: function() {
                        var t, e = this,
                            r = this.form.find("[data-recurly=full_name]").css(["fontFamily", "fontSize", "color"]),
                            n = {
                                all: {
                                    style: {
                                        fontColor: r.color,
                                        fontFamily: r.fontFamily.toString().split(",")[0].trim(),
                                        fontSize: r.fontSize,
                                        padding: "0 0 0 6px"
                                    }
                                },
                                number: {
                                    style: {
                                        title: "Card number"
                                    }
                                },
                                month: {
                                    style: {
                                        placeholder: {
                                            content: "mm"
                                        },
                                        title: "Expiration month"
                                    }
                                },
                                year: {
                                    style: {
                                        placeholder: {
                                            content: "yyyy"
                                        },
                                        title: "Expiration year"
                                    }
                                },
                                cvv: {
                                    style: {
                                        title: "Security code"
                                    }
                                }
                            };
                        "undefined" == typeof recurly ? (this.setElementVisible(".js-no-recurly", !0), this.setElementVisible(".js-yes-recurly", !1), null === (t = window.DD_RUM) || void 0 === t || t.addError(new Error("Recurly was either blocked or failed to load"))) : (recurly.on("ready", (function() {
                            e.form.addClass("recurly-ready")
                        })), recurly.configure({
                            cors: !0,
                            publicKey: O()("meta[name=recurly-public-key]").attr("content"),
                            required: ["cvv", "country", "zip"],
                            fields: n
                        }))
                    }
                }, {
                    key: "displayErrorForField",
                    value: function(e) {
                        var r = t.ERROR_LABEL_HOOKS[e];
                        if (!r) return !1;
                        var n = this.form.find(r).show();
                        return this.markRecurlyFieldsWithError(e), n.length > 0
                    }
                }, {
                    key: "hideErrorForField",
                    value: function(e) {
                        var r = t.ERROR_LABEL_HOOKS[e];
                        r && this.form.find(r).hide()
                    }
                }, {
                    key: "markRecurlyFieldsWithError",
                    value: function(t) {
                        ["first_name", "last_name", "full_name"].indexOf(t) >= 0 ? this.form.find('[data-recurly="full_name"]').addClass("error") : ["month", "year"].indexOf(t) >= 0 ? this.form.find('[data-recurly="month"], [data-recurly="year"]').children(".recurly-hosted-field").addClass("error") : this.form.find('[data-recurly="'.concat(t, '"]')).children(".recurly-hosted-field").addClass("error")
                    }
                }, {
                    key: "formatPrice",
                    value: function(t) {
                        return "$".concat(t.toFixed(2))
                    }
                }, {
                    key: "hideErrors",
                    value: function() {
                        this.form.find(".js-payment-error").hide(), this.form.find("label.error").hide(), this.form.find(".recurly-hosted-field, input.error").removeClass("error")
                    }
                }, {
                    key: "showPaymentError",
                    value: function(t) {
                        this.paymentErrorBlock.find(".js-payment-error-message").text(t), this.paymentErrorBlock.fadeIn("fast")
                    }
                }, {
                    key: "previewSubscriptionTax",
                    value: function(t) {
                        var e = function(t) {
                            return t.data("subscription-tax-original-text", t.text()), t
                        };
                        e(this.form.find("[data-subscription-tax-description")).text(t.tax_description), e(this.form.find("[data-subscription-tax-amount]")).text(this.formatPrice(t.tax_amount)), e(this.form.find("[data-subscription-total]")).text(this.formatPrice(t.subscription_total)), e(this.form.find("[data-subscription-next-billing-price]")).text(this.formatPrice(t.subscription_total)), this.form.find("[data-subscription-calculate-tax], [data-subscription-tax-addendum]").hide(), this.form.find("[data-subscription-tax-amount]").show()
                    }
                }, {
                    key: "resetSubscriptionTax",
                    value: function() {
                        if (!this.form.find("[data-subscription-calculate-tax]").is(":visible")) {
                            var t = function(t) {
                                return t.text(t.data("subscription-tax-original-text")), t
                            };
                            t(this.form.find("[data-subscription-tax-description")), t(this.form.find("[data-subscription-tax-amount]")), t(this.form.find("[data-subscription-total]")), this.form.find("[data-subscription-calculate-tax], [data-subscription-tax-addendum]").show(), this.form.find("[data-subscription-tax-amount]").hide()
                        }
                    }
                }, {
                    key: "process3DSecureToken",
                    value: function(t, e) {
                        var r = this,
                            n = function(t) {
                                r.setElementVisible(".js-payment-fields", !t), r.setElementVisible(".js-subscription-purchase-total", !t), r.setElementVisible(".js-three-d-secure-challenge", t)
                            },
                            o = function(t) {
                                r.setElementVisible(".js-three-d-secure-challenge-loading-message", t)
                            },
                            i = recurly.Risk().ThreeDSecure({
                                actionTokenId: t
                            });
                        i.on("ready", (function(t) {
                            o(!1)
                        })), i.on("error", (function(t) {
                            n(!1), r.showPaymentError(t)
                        })), i.on("token", (function(t) {
                            n(!1), document.querySelector("input.js-three-d-secure-challenge-result-token").value = t.id;
                            var o = r.form.get(0);
                            ht.A.disableElement(o), ht.A.handleRemote.call(o, e)
                        })), o(!0), n(!0);
                        var a = document.querySelector(".js-three-d-secure-challenge-3rd-party-content");
                        a.innerHTML = "", i.attach(a)
                    }
                }, {
                    key: "previewTax",
                    value: (o = ur().mark((function t(e) {
                        var r, n, o, i;
                        return ur().wrap((function(t) {
                            for (;;) switch (t.prev = t.next) {
                                case 0:
                                    return e.prop("disabled", !0), r = e.data("url") || e.attr("formaction"), t.next = 4, fetch(r, {
                                        method: "POST",
                                        headers: {
                                            "X-CSRF-Token": this.formAuthenticityToken,
                                            "X-Requested-With": "XMLHttpRequest"
                                        },
                                        body: new FormData(this.form.get(0))
                                    });
                                case 4:
                                    if (!(n = t.sent).ok) {
                                        t.next = 12;
                                        break
                                    }
                                    return t.next = 8, n.json();
                                case 8:
                                    o = t.sent, this.previewSubscriptionTax(o), t.next = 16;
                                    break;
                                case 12:
                                    return t.next = 14, n.text();
                                case 14:
                                    i = t.sent, this.showPaymentError(i);
                                case 16:
                                case "end":
                                    return t.stop()
                            }
                        }), t, this)
                    })), i = function() {
                        var t = this,
                            e = arguments;
                        return new Promise((function(r, n) {
                            var i = o.apply(t, e);

                            function a(t) {
                                cr(i, r, n, a, u, "next", t)
                            }

                            function u(t) {
                                cr(i, r, n, a, u, "throw", t)
                            }
                            a(void 0)
                        }))
                    }, function(t) {
                        return i.apply(this, arguments)
                    })
                }, {
                    key: "submitForm",
                    value: function(t) {
                        throw Error("RecurlySubscriptionForm.submitForm() should be implemented by concrete subclasses")
                    }
                }, {
                    key: "submitFormHandler",
                    value: function(t) {
                        var e = this;
                        if (this.isAutomatedTestSkippingRecurly()) return !0;
                        var r = this.form.get(0);
                        ht.A.disableElement(r);
                        var n = O().trim(this.form.find("[data-recurly=full_name]").val()).split(" ");
                        return this.form.find("[data-recurly=first_name]").val(n.slice(0, -1).join(" ")), this.form.find("[data-recurly=last_name]").val(n.slice(-1).join(" ")), recurly.token(this.form, (function(n, o) {
                            if (n) {
                                var i, a, u = !1;
                                null !== (i = n.fields) && void 0 !== i && i.length && (u = n.fields.map((function(t) {
                                    return e.displayErrorForField(t)
                                })).every((function(t) {
                                    return t
                                }))), u || (e.showPaymentError("There was an error processing your payment. Please try again later or contact support."), null === (a = window.DD_RUM) || void 0 === a || a.addError(n, {
                                    message: "Subscription Error: ".concat(n.message),
                                    report_level: "warning"
                                })), ht.A.enableElement(r)
                            } else ht.A.handleRemote.call(r, t)
                        })), !1
                    }
                }, {
                    key: "isAutomatedTestSkippingRecurly",
                    value: function() {
                        var t = this.form.find('input[data-recurly="token"]'),
                            e = t.length > 0 && !!t.val(),
                            r = this.form.find('input[name="is_automated_test_env"]'),
                            n = r.length > 0 && "true" === r.val();
                        return e && n
                    }
                }, {
                    key: "trackConversion",
                    value: function() {
                        if (window.gtmEvent) {
                            var t = this.form.find("input[name='subscription[plan_code]']:checked").val(),
                                e = this.form.find("input[name='trial_days_remaining']").val();
                            window.gtmEvent("Purchased Initial Subscription", {
                                subscriptionPlan: t,
                                trialDaysRemaining: e
                            })
                        }
                    }
                }, {
                    key: "updatePage",
                    value: function(t) {
                        O()(".page-main").hide().html(t).fadeIn()
                    }
                }, {
                    key: "setElementVisible",
                    value: function(t, e) {
                        var r = document.querySelector(t);
                        r && (r.style.display = e ? "block" : "none")
                    }
                }, {
                    key: "formAuthenticityToken",
                    get: function() {
                        var t = document.querySelector("[name='csrf-token']");
                        return t ? t.content : ""
                    }
                }], r && fr(e.prototype, r), n && fr(e, n), Object.defineProperty(e, "prototype", {
                    writable: !1
                }), t
            }();

            function pr(t, e) {
                return function(t) {
                    if (Array.isArray(t)) return t
                }(t) || function(t, e) {
                    var r = null == t ? null : "undefined" != typeof Symbol && t[Symbol.iterator] || t["@@iterator"];
                    if (null != r) {
                        var n, o, i, a, u = [],
                            c = !0,
                            s = !1;
                        try {
                            if (i = (r = r.call(t)).next, 0 === e) {
                                if (Object(r) !== r) return;
                                c = !1
                            } else
                                for (; !(c = (n = i.call(r)).done) && (u.push(n.value), u.length !== e); c = !0);
                        } catch (t) {
                            s = !0, o = t
                        } finally {
                            try {
                                if (!c && null != r.return && (a = r.return(), Object(a) !== a)) return
                            } finally {
                                if (s) throw o
                            }
                        }
                        return u
                    }
                }(t, e) || function(t, e) {
                    if (t) {
                        if ("string" == typeof t) return yr(t, e);
                        var r = {}.toString.call(t).slice(8, -1);
                        return "Object" === r && t.constructor && (r = t.constructor.name), "Map" === r || "Set" === r ? Array.from(t) : "Arguments" === r || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r) ? yr(t, e) : void 0
                    }
                }(t, e) || function() {
                    throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")
                }()
            }

            function yr(t, e) {
                (null == e || e > t.length) && (e = t.length);
                for (var r = 0, n = Array(e); r < e; r++) n[r] = t[r];
                return n
            }

            function vr(t, e) {
                for (var r = 0; r < e.length; r++) {
                    var n = e[r];
                    n.enumerable = n.enumerable || !1, n.configurable = !0, "value" in n && (n.writable = !0), Object.defineProperty(t, mr(n.key), n)
                }
            }

            function mr(t) {
                var e = function(t, e) {
                    if ("object" != typeof t || !t) return t;
                    var r = t[Symbol.toPrimitive];
                    if (void 0 !== r) {
                        var n = r.call(t, e || "default");
                        if ("object" != typeof n) return n;
                        throw new TypeError("@@toPrimitive must return a primitive value.")
                    }
                    return ("string" === e ? String : Number)(t)
                }(t, "string");
                return "symbol" == typeof e ? e : e + ""
            }
            hr.ERROR_LABEL_HOOKS = {
                first_name: ".js-error-name",
                last_name: ".js-error-name",
                full_name: ".js-error-name",
                number: ".js-error-card-number",
                month: ".js-error-expiry",
                year: ".js-error-expiry",
                cvv: ".js-error-cvv",
                postal_code: ".js-error-postal-code"
            };
            var gr = function() {
                function t() {
                    var e = this;
                    ! function(t, e) {
                        if (!(t instanceof e)) throw new TypeError("Cannot call a class as a function")
                    }(this, t), this.fieldValidity = null, "undefined" !== typeof recurly && recurly.on("change", (function(t) {
                        e.fieldValidity = {};
                        for (var r = 0, n = Object.entries(t.fields); r < n.length; r++) {
                            var o = pr(n[r], 2),
                                i = o[0],
                                a = o[1];
                            e.fieldValidity[i] = a.valid
                        }
                    }))
                }
                var e, r, n;
                return e = t, (r = [{
                    key: "invalidFields",
                    value: function() {
                        var t = this;
                        return this.fieldValidity ? Object.keys(this.fieldValidity).filter((function(e) {
                            return !t.fieldValidity[e]
                        })) : []
                    }
                }]) && vr(e.prototype, r), n && vr(e, n), Object.defineProperty(e, "prototype", {
                    writable: !1
                }), t
            }();

            function br(t, e) {
                var r = "undefined" != typeof Symbol && t[Symbol.iterator] || t["@@iterator"];
                if (!r) {
                    if (Array.isArray(t) || (r = jr(t)) || e && t && "number" == typeof t.length) {
                        r && (t = r);
                        var n = 0,
                            o = function() {};
                        return {
                            s: o,
                            n: function() {
                                return n >= t.length ? {
                                    done: !0
                                } : {
                                    done: !1,
                                    value: t[n++]
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
                        r = r.call(t)
                    },
                    n: function() {
                        var t = r.next();
                        return a = t.done, t
                    },
                    e: function(t) {
                        u = !0, i = t
                    },
                    f: function() {
                        try {
                            a || null == r.return || r.return()
                        } finally {
                            if (u) throw i
                        }
                    }
                }
            }

            function wr() {
                return wr = "undefined" != typeof Reflect && Reflect.get ? Reflect.get.bind() : function(t, e, r) {
                    var n = function(t, e) {
                        for (; !{}.hasOwnProperty.call(t, e) && null !== (t = Er(t)););
                        return t
                    }(t, e);
                    if (n) {
                        var o = Object.getOwnPropertyDescriptor(n, e);
                        return o.get ? o.get.call(arguments.length < 3 ? t : r) : o.value
                    }
                }, wr.apply(null, arguments)
            }

            function kr(t, e, r) {
                return e = Er(e),
                    function(t, e) {
                        if (e && ("object" == typeof e || "function" == typeof e)) return e;
                        if (void 0 !== e) throw new TypeError("Derived constructors may only return object or undefined");
                        return function(t) {
                            if (void 0 === t) throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
                            return t
                        }(t)
                    }(t, Or() ? Reflect.construct(e, r || [], Er(t).constructor) : e.apply(t, r))
            }

            function Or() {
                try {
                    var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], (function() {})))
                } catch (t) {}
                return (Or = function() {
                    return !!t
                })()
            }

            function Er(t) {
                return Er = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function(t) {
                    return t.__proto__ || Object.getPrototypeOf(t)
                }, Er(t)
            }

            function Tr(t, e) {
                if ("function" != typeof e && null !== e) throw new TypeError("Super expression must either be null or a function");
                t.prototype = Object.create(e && e.prototype, {
                    constructor: {
                        value: t,
                        writable: !0,
                        configurable: !0
                    }
                }), Object.defineProperty(t, "prototype", {
                    writable: !1
                }), e && Sr(t, e)
            }

            function Sr(t, e) {
                return Sr = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function(t, e) {
                    return t.__proto__ = e, t
                }, Sr(t, e)
            }

            function _r(t, e) {
                return function(t) {
                    if (Array.isArray(t)) return t
                }(t) || function(t, e) {
                    var r = null == t ? null : "undefined" != typeof Symbol && t[Symbol.iterator] || t["@@iterator"];
                    if (null != r) {
                        var n, o, i, a, u = [],
                            c = !0,
                            s = !1;
                        try {
                            if (i = (r = r.call(t)).next, 0 === e) {
                                if (Object(r) !== r) return;
                                c = !1
                            } else
                                for (; !(c = (n = i.call(r)).done) && (u.push(n.value), u.length !== e); c = !0);
                        } catch (t) {
                            s = !0, o = t
                        } finally {
                            try {
                                if (!c && null != r.return && (a = r.return(), Object(a) !== a)) return
                            } finally {
                                if (s) throw o
                            }
                        }
                        return u
                    }
                }(t, e) || jr(t, e) || function() {
                    throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")
                }()
            }

            function jr(t, e) {
                if (t) {
                    if ("string" == typeof t) return xr(t, e);
                    var r = {}.toString.call(t).slice(8, -1);
                    return "Object" === r && t.constructor && (r = t.constructor.name), "Map" === r || "Set" === r ? Array.from(t) : "Arguments" === r || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r) ? xr(t, e) : void 0
                }
            }

            function xr(t, e) {
                (null == e || e > t.length) && (e = t.length);
                for (var r = 0, n = Array(e); r < e; r++) n[r] = t[r];
                return n
            }

            function Pr(t, e) {
                if (!(t instanceof e)) throw new TypeError("Cannot call a class as a function")
            }

            function Lr(t, e) {
                for (var r = 0; r < e.length; r++) {
                    var n = e[r];
                    n.enumerable = n.enumerable || !1, n.configurable = !0, "value" in n && (n.writable = !0), Object.defineProperty(t, Ar(n.key), n)
                }
            }

            function Cr(t, e, r) {
                return e && Lr(t.prototype, e), r && Lr(t, r), Object.defineProperty(t, "prototype", {
                    writable: !1
                }), t
            }

            function Ar(t) {
                var e = function(t, e) {
                    if ("object" != typeof t || !t) return t;
                    var r = t[Symbol.toPrimitive];
                    if (void 0 !== r) {
                        var n = r.call(t, e || "default");
                        if ("object" != typeof n) return n;
                        throw new TypeError("@@toPrimitive must return a primitive value.")
                    }
                    return ("string" === e ? String : Number)(t)
                }(t, "string");
                return "symbol" == typeof e ? e : e + ""
            }
            var Br = function() {
                    function t(e) {
                        if (Pr(this, t), this.form = void 0, this.changes = void 0, this.dirty = void 0, this.pickInputs = void 0, this.textInputs = void 0, this.agreementCheckbox = void 0, this.railsManagedFields = void 0, this.recurlyManagedFields = void 0, this.submit = void 0, e.length) {
                            this.form = e, this.changes = {}, this.dirty = !1, this.pickInputs = "input[type=radio]", this.textInputs = "input[type=text]", this.agreementCheckbox = "[data-subscription-agreement-checkbox]";
                            var r = this.form.find("".concat(this.textInputs, ",").concat(this.pickInputs, ",").concat(this.agreementCheckbox)),
                                n = this.form.find(".recurly-hosted-field > input");
                            this.railsManagedFields = r.not(n), this.recurlyManagedFields = ["number", "month", "year", "cvv"], this.submit = this.form.find("button[type=submit]"), this.addEventListeners(), this.initializeChanges()
                        }
                    }
                    return Cr(t, [{
                        key: "addEventListeners",
                        value: function() {
                            this.form.on("change", this.pickInputs, this.railsManagedElementChanged.bind(this)), this.form.on("change keyup", this.textInputs, this.railsManagedElementChanged.bind(this)), this.form.on("change", this.agreementCheckbox, this.railsManagedElementChanged.bind(this)), "undefined" !== typeof recurly && recurly.on("change", this.recurlyManagedElementChanged.bind(this))
                        }
                    }, {
                        key: "billingInfoDidNotChange",
                        value: function() {
                            return !(Object.prototype.hasOwnProperty.call(this.changes, "number") || Object.prototype.hasOwnProperty.call(this.changes, "month") || Object.prototype.hasOwnProperty.call(this.changes, "year") || Object.prototype.hasOwnProperty.call(this.changes, "cvv") || Object.prototype.hasOwnProperty.call(this.changes, "country") || Object.prototype.hasOwnProperty.call(this.changes, "zip"))
                        }
                    }, {
                        key: "checkDirtyChanged",
                        value: function() {
                            var t = arguments.length > 0 && void 0 !== arguments[0] && arguments[0],
                                e = this.formChanged(),
                                r = this.errorsArePresent();
                            !t && e == this.dirty || r || (this.dirty = e || r, this.dirtyChanged())
                        }
                    }, {
                        key: "dirtyChanged",
                        value: function() {
                            this.submit.prop("disabled", !this.dirty)
                        }
                    }, {
                        key: "errorsArePresent",
                        value: function() {
                            return $("label.error").is(":visible")
                        }
                    }, {
                        key: "inputKey",
                        value: function(t) {
                            return t.name || t.id
                        }
                    }, {
                        key: "initializeChanges",
                        value: function() {
                            this.checkDirtyChanged(!0)
                        }
                    }, {
                        key: "railsManagedElementChanged",
                        value: function(t) {
                            this.trackRailsManagedInputChanges(t.currentTarget), this.checkDirtyChanged()
                        }
                    }, {
                        key: "recurlyManagedElementChanged",
                        value: function(t) {
                            var e = $(document.activeElement).parent(),
                                r = e.parent().siblings("label.error");
                            r.is(":visible") && setTimeout((function() {
                                e.addClass("error")
                            }), 1);
                            for (var n = 0, o = Object.entries(t.fields); n < o.length; n++) {
                                var i = _r(o[n], 2),
                                    a = i[0],
                                    u = i[1];
                                u.empty ? delete this.changes[a] : (u.focus && u.length && u.length != this.changes[a] && (setTimeout((function() {
                                    e.removeClass("error")
                                }), 1), r.hide()), this.changes[a] = u.length)
                            }
                            this.checkDirtyChanged()
                        }
                    }, {
                        key: "railsManagedFieldChanged",
                        value: function(t) {
                            return !1
                        }
                    }, {
                        key: "trackRailsManagedInputChanges",
                        value: function(t) {
                            var e = this.inputKey(t);
                            this.railsManagedFieldChanged(t) ? this.changes[e] = "changed" : delete this.changes[e]
                        }
                    }, {
                        key: "formChanged",
                        value: function() {
                            return !1
                        }
                    }]), t
                }(),
                Ir = function(t) {
                    function e() {
                        return Pr(this, e), kr(this, e, arguments)
                    }
                    return Tr(e, t), Cr(e, [{
                        key: "formChanged",
                        value: function() {
                            return !$.isEmptyObject(this.changes)
                        }
                    }, {
                        key: "railsManagedFieldChanged",
                        value: function(t) {
                            switch (t.type) {
                                case "text":
                                    return t.value != t.defaultValue;
                                case "radio":
                                case "checkbox":
                                    return t.checked != t.defaultChecked
                            }
                        }
                    }]), e
                }(Br),
                Fr = function(t) {
                    function e() {
                        return Pr(this, e), kr(this, e, arguments)
                    }
                    return Tr(e, t), Cr(e, [{
                        key: "initializeChanges",
                        value: function() {
                            var t = this;
                            this.railsManagedFields.each((function(e, r) {
                                t.trackRailsManagedInputChanges(r)
                            })), wr(Er(e.prototype), "initializeChanges", this).call(this)
                        }
                    }, {
                        key: "formChanged",
                        value: function() {
                            return this.numberOfDifferentFields() <= this.numberOfChanges()
                        }
                    }, {
                        key: "numberOfChanges",
                        value: function() {
                            return this.objectSize(this.changes)
                        }
                    }, {
                        key: "numberOfDifferentFields",
                        value: function() {
                            var t, e = {},
                                r = br(this.railsManagedFields);
                            try {
                                for (r.s(); !(t = r.n()).done;) {
                                    var n = t.value;
                                    e[this.inputKey(n)] = !0
                                }
                            } catch (a) {
                                r.e(a)
                            } finally {
                                r.f()
                            }
                            var o, i = br(this.recurlyManagedFields);
                            try {
                                for (i.s(); !(o = i.n()).done;) {
                                    e[o.value] = !0
                                }
                            } catch (a) {
                                i.e(a)
                            } finally {
                                i.f()
                            }
                            return this.objectSize(e)
                        }
                    }, {
                        key: "objectSize",
                        value: function(t) {
                            return Object.keys(t).length
                        }
                    }, {
                        key: "railsManagedFieldChanged",
                        value: function(t) {
                            return "checkbox" === t.type ? t.checked !== t.defaultChecked : !!$.trim($(t).val().toString())
                        }
                    }]), e
                }(Br);

            function Nr(t, e, r) {
                return (e = Vr(e)) in t ? Object.defineProperty(t, e, {
                    value: r,
                    enumerable: !0,
                    configurable: !0,
                    writable: !0
                }) : t[e] = r, t
            }

            function Rr() {
                Rr = function() {
                    return e
                };
                var t, e = {},
                    r = Object.prototype,
                    n = r.hasOwnProperty,
                    o = Object.defineProperty || function(t, e, r) {
                        t[e] = r.value
                    },
                    i = "function" == typeof Symbol ? Symbol : {},
                    a = i.iterator || "@@iterator",
                    u = i.asyncIterator || "@@asyncIterator",
                    c = i.toStringTag || "@@toStringTag";

                function s(t, e, r) {
                    return Object.defineProperty(t, e, {
                        value: r,
                        enumerable: !0,
                        configurable: !0,
                        writable: !0
                    }), t[e]
                }
                try {
                    s({}, "")
                } catch (t) {
                    s = function(t, e, r) {
                        return t[e] = r
                    }
                }

                function l(t, e, r, n) {
                    var i = e && e.prototype instanceof m ? e : m,
                        a = Object.create(i.prototype),
                        u = new L(n || []);
                    return o(a, "_invoke", {
                        value: _(t, r, u)
                    }), a
                }

                function f(t, e, r) {
                    try {
                        return {
                            type: "normal",
                            arg: t.call(e, r)
                        }
                    } catch (t) {
                        return {
                            type: "throw",
                            arg: t
                        }
                    }
                }
                e.wrap = l;
                var d = "suspendedStart",
                    h = "suspendedYield",
                    p = "executing",
                    y = "completed",
                    v = {};

                function m() {}

                function g() {}

                function b() {}
                var w = {};
                s(w, a, (function() {
                    return this
                }));
                var k = Object.getPrototypeOf,
                    O = k && k(k(C([])));
                O && O !== r && n.call(O, a) && (w = O);
                var E = b.prototype = m.prototype = Object.create(w);

                function T(t) {
                    ["next", "throw", "return"].forEach((function(e) {
                        s(t, e, (function(t) {
                            return this._invoke(e, t)
                        }))
                    }))
                }

                function S(t, e) {
                    function r(o, i, a, u) {
                        var c = f(t[o], t, i);
                        if ("throw" !== c.type) {
                            var s = c.arg,
                                l = s.value;
                            return l && "object" == typeof l && n.call(l, "__await") ? e.resolve(l.__await).then((function(t) {
                                r("next", t, a, u)
                            }), (function(t) {
                                r("throw", t, a, u)
                            })) : e.resolve(l).then((function(t) {
                                s.value = t, a(s)
                            }), (function(t) {
                                return r("throw", t, a, u)
                            }))
                        }
                        u(c.arg)
                    }
                    var i;
                    o(this, "_invoke", {
                        value: function(t, n) {
                            function o() {
                                return new e((function(e, o) {
                                    r(t, n, e, o)
                                }))
                            }
                            return i = i ? i.then(o, o) : o()
                        }
                    })
                }

                function _(e, r, n) {
                    var o = d;
                    return function(i, a) {
                        if (o === p) throw Error("Generator is already running");
                        if (o === y) {
                            if ("throw" === i) throw a;
                            return {
                                value: t,
                                done: !0
                            }
                        }
                        for (n.method = i, n.arg = a;;) {
                            var u = n.delegate;
                            if (u) {
                                var c = j(u, n);
                                if (c) {
                                    if (c === v) continue;
                                    return c
                                }
                            }
                            if ("next" === n.method) n.sent = n._sent = n.arg;
                            else if ("throw" === n.method) {
                                if (o === d) throw o = y, n.arg;
                                n.dispatchException(n.arg)
                            } else "return" === n.method && n.abrupt("return", n.arg);
                            o = p;
                            var s = f(e, r, n);
                            if ("normal" === s.type) {
                                if (o = n.done ? y : h, s.arg === v) continue;
                                return {
                                    value: s.arg,
                                    done: n.done
                                }
                            }
                            "throw" === s.type && (o = y, n.method = "throw", n.arg = s.arg)
                        }
                    }
                }

                function j(e, r) {
                    var n = r.method,
                        o = e.iterator[n];
                    if (o === t) return r.delegate = null, "throw" === n && e.iterator.return && (r.method = "return", r.arg = t, j(e, r), "throw" === r.method) || "return" !== n && (r.method = "throw", r.arg = new TypeError("The iterator does not provide a '" + n + "' method")), v;
                    var i = f(o, e.iterator, r.arg);
                    if ("throw" === i.type) return r.method = "throw", r.arg = i.arg, r.delegate = null, v;
                    var a = i.arg;
                    return a ? a.done ? (r[e.resultName] = a.value, r.next = e.nextLoc, "return" !== r.method && (r.method = "next", r.arg = t), r.delegate = null, v) : a : (r.method = "throw", r.arg = new TypeError("iterator result is not an object"), r.delegate = null, v)
                }

                function x(t) {
                    var e = {
                        tryLoc: t[0]
                    };
                    1 in t && (e.catchLoc = t[1]), 2 in t && (e.finallyLoc = t[2], e.afterLoc = t[3]), this.tryEntries.push(e)
                }

                function P(t) {
                    var e = t.completion || {};
                    e.type = "normal", delete e.arg, t.completion = e
                }

                function L(t) {
                    this.tryEntries = [{
                        tryLoc: "root"
                    }], t.forEach(x, this), this.reset(!0)
                }

                function C(e) {
                    if (e || "" === e) {
                        var r = e[a];
                        if (r) return r.call(e);
                        if ("function" == typeof e.next) return e;
                        if (!isNaN(e.length)) {
                            var o = -1,
                                i = function r() {
                                    for (; ++o < e.length;)
                                        if (n.call(e, o)) return r.value = e[o], r.done = !1, r;
                                    return r.value = t, r.done = !0, r
                                };
                            return i.next = i
                        }
                    }
                    throw new TypeError(typeof e + " is not iterable")
                }
                return g.prototype = b, o(E, "constructor", {
                    value: b,
                    configurable: !0
                }), o(b, "constructor", {
                    value: g,
                    configurable: !0
                }), g.displayName = s(b, c, "GeneratorFunction"), e.isGeneratorFunction = function(t) {
                    var e = "function" == typeof t && t.constructor;
                    return !!e && (e === g || "GeneratorFunction" === (e.displayName || e.name))
                }, e.mark = function(t) {
                    return Object.setPrototypeOf ? Object.setPrototypeOf(t, b) : (t.__proto__ = b, s(t, c, "GeneratorFunction")), t.prototype = Object.create(E), t
                }, e.awrap = function(t) {
                    return {
                        __await: t
                    }
                }, T(S.prototype), s(S.prototype, u, (function() {
                    return this
                })), e.AsyncIterator = S, e.async = function(t, r, n, o, i) {
                    void 0 === i && (i = Promise);
                    var a = new S(l(t, r, n, o), i);
                    return e.isGeneratorFunction(r) ? a : a.next().then((function(t) {
                        return t.done ? t.value : a.next()
                    }))
                }, T(E), s(E, c, "Generator"), s(E, a, (function() {
                    return this
                })), s(E, "toString", (function() {
                    return "[object Generator]"
                })), e.keys = function(t) {
                    var e = Object(t),
                        r = [];
                    for (var n in e) r.push(n);
                    return r.reverse(),
                        function t() {
                            for (; r.length;) {
                                var n = r.pop();
                                if (n in e) return t.value = n, t.done = !1, t
                            }
                            return t.done = !0, t
                        }
                }, e.values = C, L.prototype = {
                    constructor: L,
                    reset: function(e) {
                        if (this.prev = 0, this.next = 0, this.sent = this._sent = t, this.done = !1, this.delegate = null, this.method = "next", this.arg = t, this.tryEntries.forEach(P), !e)
                            for (var r in this) "t" === r.charAt(0) && n.call(this, r) && !isNaN(+r.slice(1)) && (this[r] = t)
                    },
                    stop: function() {
                        this.done = !0;
                        var t = this.tryEntries[0].completion;
                        if ("throw" === t.type) throw t.arg;
                        return this.rval
                    },
                    dispatchException: function(e) {
                        if (this.done) throw e;
                        var r = this;

                        function o(n, o) {
                            return u.type = "throw", u.arg = e, r.next = n, o && (r.method = "next", r.arg = t), !!o
                        }
                        for (var i = this.tryEntries.length - 1; i >= 0; --i) {
                            var a = this.tryEntries[i],
                                u = a.completion;
                            if ("root" === a.tryLoc) return o("end");
                            if (a.tryLoc <= this.prev) {
                                var c = n.call(a, "catchLoc"),
                                    s = n.call(a, "finallyLoc");
                                if (c && s) {
                                    if (this.prev < a.catchLoc) return o(a.catchLoc, !0);
                                    if (this.prev < a.finallyLoc) return o(a.finallyLoc)
                                } else if (c) {
                                    if (this.prev < a.catchLoc) return o(a.catchLoc, !0)
                                } else {
                                    if (!s) throw Error("try statement without catch or finally");
                                    if (this.prev < a.finallyLoc) return o(a.finallyLoc)
                                }
                            }
                        }
                    },
                    abrupt: function(t, e) {
                        for (var r = this.tryEntries.length - 1; r >= 0; --r) {
                            var o = this.tryEntries[r];
                            if (o.tryLoc <= this.prev && n.call(o, "finallyLoc") && this.prev < o.finallyLoc) {
                                var i = o;
                                break
                            }
                        }
                        i && ("break" === t || "continue" === t) && i.tryLoc <= e && e <= i.finallyLoc && (i = null);
                        var a = i ? i.completion : {};
                        return a.type = t, a.arg = e, i ? (this.method = "next", this.next = i.finallyLoc, v) : this.complete(a)
                    },
                    complete: function(t, e) {
                        if ("throw" === t.type) throw t.arg;
                        return "break" === t.type || "continue" === t.type ? this.next = t.arg : "return" === t.type ? (this.rval = this.arg = t.arg, this.method = "return", this.next = "end") : "normal" === t.type && e && (this.next = e), v
                    },
                    finish: function(t) {
                        for (var e = this.tryEntries.length - 1; e >= 0; --e) {
                            var r = this.tryEntries[e];
                            if (r.finallyLoc === t) return this.complete(r.completion, r.afterLoc), P(r), v
                        }
                    },
                    catch: function(t) {
                        for (var e = this.tryEntries.length - 1; e >= 0; --e) {
                            var r = this.tryEntries[e];
                            if (r.tryLoc === t) {
                                var n = r.completion;
                                if ("throw" === n.type) {
                                    var o = n.arg;
                                    P(r)
                                }
                                return o
                            }
                        }
                        throw Error("illegal catch attempt")
                    },
                    delegateYield: function(e, r, n) {
                        return this.delegate = {
                            iterator: C(e),
                            resultName: r,
                            nextLoc: n
                        }, "next" === this.method && (this.arg = t), v
                    }
                }, e
            }

            function Dr(t, e, r, n, o, i, a) {
                try {
                    var u = t[i](a),
                        c = u.value
                } catch (t) {
                    return void r(t)
                }
                u.done ? e(c) : Promise.resolve(c).then(n, o)
            }

            function Gr(t) {
                return function() {
                    var e = this,
                        r = arguments;
                    return new Promise((function(n, o) {
                        var i = t.apply(e, r);

                        function a(t) {
                            Dr(i, n, o, a, u, "next", t)
                        }

                        function u(t) {
                            Dr(i, n, o, a, u, "throw", t)
                        }
                        a(void 0)
                    }))
                }
            }

            function Mr() {
                return Mr = "undefined" != typeof Reflect && Reflect.get ? Reflect.get.bind() : function(t, e, r) {
                    var n = function(t, e) {
                        for (; !{}.hasOwnProperty.call(t, e) && null !== (t = $r(t)););
                        return t
                    }(t, e);
                    if (n) {
                        var o = Object.getOwnPropertyDescriptor(n, e);
                        return o.get ? o.get.call(arguments.length < 3 ? t : r) : o.value
                    }
                }, Mr.apply(null, arguments)
            }

            function Yr(t, e) {
                if (!(t instanceof e)) throw new TypeError("Cannot call a class as a function")
            }

            function qr(t, e) {
                for (var r = 0; r < e.length; r++) {
                    var n = e[r];
                    n.enumerable = n.enumerable || !1, n.configurable = !0, "value" in n && (n.writable = !0), Object.defineProperty(t, Vr(n.key), n)
                }
            }

            function Ur(t, e, r) {
                return e && qr(t.prototype, e), r && qr(t, r), Object.defineProperty(t, "prototype", {
                    writable: !1
                }), t
            }

            function Vr(t) {
                var e = function(t, e) {
                    if ("object" != typeof t || !t) return t;
                    var r = t[Symbol.toPrimitive];
                    if (void 0 !== r) {
                        var n = r.call(t, e || "default");
                        if ("object" != typeof n) return n;
                        throw new TypeError("@@toPrimitive must return a primitive value.")
                    }
                    return ("string" === e ? String : Number)(t)
                }(t, "string");
                return "symbol" == typeof e ? e : e + ""
            }

            function zr(t, e, r) {
                return e = $r(e), Hr(t, Kr() ? Reflect.construct(e, r || [], $r(t).constructor) : e.apply(t, r))
            }

            function Hr(t, e) {
                if (e && ("object" == typeof e || "function" == typeof e)) return e;
                if (void 0 !== e) throw new TypeError("Derived constructors may only return object or undefined");
                return function(t) {
                    if (void 0 === t) throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
                    return t
                }(t)
            }

            function Kr() {
                try {
                    var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], (function() {})))
                } catch (t) {}
                return (Kr = function() {
                    return !!t
                })()
            }

            function $r(t) {
                return $r = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function(t) {
                    return t.__proto__ || Object.getPrototypeOf(t)
                }, $r(t)
            }

            function Wr(t, e) {
                if ("function" != typeof e && null !== e) throw new TypeError("Super expression must either be null or a function");
                t.prototype = Object.create(e && e.prototype, {
                    constructor: {
                        value: t,
                        writable: !0,
                        configurable: !0
                    }
                }), Object.defineProperty(t, "prototype", {
                    writable: !1
                }), e && Xr(t, e)
            }

            function Xr(t, e) {
                return Xr = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function(t, e) {
                    return t.__proto__ = e, t
                }, Xr(t, e)
            }
            var Jr = "scheduled",
                Zr = ".js-gift-duration-option",
                Qr = "".concat(Zr, " input"),
                tn = "".concat(Zr, " input[type=radio]:checked"),
                en = function(t) {
                    function e() {
                        return Yr(this, e), zr(this, e, arguments)
                    }
                    return Wr(e, t), Ur(e, [{
                        key: "dirtyChanged",
                        value: function() {}
                    }]), e
                }(Fr),
                rn = function(t) {
                    function e(t) {
                        var r;
                        return Yr(this, e), (r = zr(this, e, [t])).recipientEmails = void 0, r.addOnUnitAmount = void 0, r.dirtyTracking = void 0, r.deliveryTimingRadios = void 0, r.scheduledDeliverySection = void 0, r.userTimezone = void 0, r.taxButton = void 0, r.cardFields = void 0, 0 === t.length ? Hr(r) : (r.initializeFormElements(), r.initializeTracking(), r.setupFormBehavior(), r.setupScheduledDelivery(), r.handleBrowserBackForward(), r)
                    }
                    var r;
                    return Wr(e, t), Ur(e, [{
                        key: "initializeFormElements",
                        value: function() {
                            this.recipientEmails = this.form.find("#gift_purchase_recipient_emails"), this.addOnUnitAmount = this.form.data("add-on-unit-amount"), this.userTimezone = this.detectUserTimezone(), this.deliveryTimingRadios = this.form.find('input[name="gift_purchase[delivery_timing]"]'), this.scheduledDeliverySection = this.form.find(".js-schedule-delivery-section"), this.taxButton = this.form.find("button[type=button][data-subscription-calculate-tax]")
                        }
                    }, {
                        key: "initializeTracking",
                        value: function() {
                            this.dirtyTracking = new en(this.form), this.cardFields = new gr
                        }
                    }, {
                        key: "setupFormBehavior",
                        value: function() {
                            this.configureValidations(), this.chooseGiftOption(), this.updateGiftPurchaseSummary(), this.updateTaxButtonState()
                        }
                    }, {
                        key: "setupScheduledDelivery",
                        value: function() {
                            this.setupDeliveryTimingToggle(), this.setupScheduledDateFieldTracking(), this.updateDatePickerConstraints(), this.applyIosDatePickerWorkaround()
                        }
                    }, {
                        key: "applyIosDatePickerWorkaround",
                        value: function() {
                            (/iP(hone|od|ad)/.test(navigator.userAgent) || navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent)) && this.form.find('input[name="gift_purchase[scheduled_delivery_date]"]').attr("role", "textbox")
                        }
                    }, {
                        key: "detectUserTimezone",
                        value: function() {
                            return Intl.DateTimeFormat().resolvedOptions().timeZone
                        }
                    }, {
                        key: "getLocalDateConstraints",
                        value: function() {
                            var t = new Date;
                            t.setDate(t.getDate() + 1), t.setHours(0, 0, 0, 0);
                            var e = new Date;
                            e.setMonth(e.getMonth() + 3), e.setHours(0, 0, 0, 0);
                            var r = function(t) {
                                var e = t.getFullYear(),
                                    r = "0".concat(t.getMonth() + 1).slice(-2),
                                    n = "0".concat(t.getDate()).slice(-2);
                                return "".concat(e, "-").concat(r, "-").concat(n)
                            };
                            return {
                                minDate: t,
                                maxDate: e,
                                minDateString: r(t),
                                maxDateString: r(e)
                            }
                        }
                    }, {
                        key: "updateDatePickerConstraints",
                        value: function() {
                            var t = this.form.find('input[name="gift_purchase[scheduled_delivery_date]"]'),
                                e = this.getLocalDateConstraints();
                            t.attr("min", e.minDateString), t.attr("max", e.maxDateString)
                        }
                    }, {
                        key: "submitForm",
                        value: function(t) {
                            var e, r = this.form.valid(),
                                n = this.validateCardFields();
                            return r ? n ? "undefined" !== typeof recurly || this.isAutomatedTestSkippingRecurly() ? (this.populateTimezoneField(), this.submitFormHandler(t)) : (null === (e = this.formElement.querySelector(".js-no-recurly")) || void 0 === e || e.scrollIntoView({
                                block: "center",
                                behavior: "smooth"
                            }), !1) : (this.focusFirstCardError(), !1) : (this.form.validator.focusInvalid(), !1)
                        }
                    }, {
                        key: "validateCardFields",
                        value: function() {
                            var t = this;
                            if (this.isAutomatedTestSkippingRecurly()) return !0;
                            var e = this.cardFields.invalidFields();
                            return e.forEach((function(e) {
                                return t.displayErrorForField(e)
                            })), 0 === e.length
                        }
                    }, {
                        key: "focusFirstCardError",
                        value: function() {
                            var t;
                            null === (t = this.formElement.querySelector(".recurly-hosted-field.error")) || void 0 === t || null === (t = t.closest("[data-recurly]")) || void 0 === t || t.scrollIntoView({
                                block: "center",
                                behavior: "smooth"
                            });
                            var e = Array.from(this.formElement.querySelectorAll("label.error")).find((function(t) {
                                return t.offsetParent
                            }));
                            e && (e.setAttribute("tabindex", "-1"), e.focus({
                                preventScroll: !0
                            }), e.addEventListener("blur", (function() {
                                return e.removeAttribute("tabindex")
                            }), {
                                once: !0
                            }))
                        }
                    }, {
                        key: "populateTimezoneField",
                        value: function() {
                            this.form.find('input[name="gift_purchase[user_timezone]"]').val(this.isScheduledDeliveryMode() ? this.userTimezone : "")
                        }
                    }, {
                        key: "configureValidations",
                        value: function() {
                            this.setupEmailValidation(), this.setupDeliveryDateValidation(), this.setupFormValidator(), this.customizeValidatorBehavior()
                        }
                    }, {
                        key: "setupEmailValidation",
                        value: function() {
                            var t = this;
                            O().validator.addMethod("multiEmail", (function(e, r) {
                                return 0 == t.invalidEmailAddresses().length
                            }), (function(e, r) {
                                var n = t.invalidEmailAddresses(),
                                    o = n.map((function(t) {
                                        return "'".concat(escape(t), "'")
                                    })).join(","),
                                    i = "Please enter valid email address";
                                return n.length > 1 && (i += "es"), i += ": ".concat(o, ".")
                            })), O().validator.addMethod("noDuplicateEmails", (function(e, r) {
                                return 0 == t.duplicatedEmailAddresses().length
                            }), (function(e, r) {
                                var n = t.duplicatedEmailAddresses(),
                                    o = n.map((function(t) {
                                        return "'".concat(escape(t), "'")
                                    })).join(","),
                                    i = "Please remove duplicate email address";
                                return n.length > 1 && (i += "es"), i += ": ".concat(o, ".")
                            }))
                        }
                    }, {
                        key: "setupDeliveryDateValidation",
                        value: function() {
                            var t = this;
                            O().validator.addMethod("validDeliveryDate", (function(e, r) {
                                if (!e) return !0;
                                var n = e.split("-"),
                                    o = new Date(parseInt(n[0]), parseInt(n[1]) - 1, parseInt(n[2])),
                                    i = t.getLocalDateConstraints();
                                return o >= i.minDate && o <= i.maxDate
                            }), "Please select a delivery date starting from tomorrow and within the next 3 months."), O().validator.addMethod("requiredForScheduledDelivery", (function(t, e) {
                                var r = O()('input[name="gift_purchase[delivery_timing]"]:checked').val() === Jr;
                                return !r || r && t
                            }), "Please select a delivery date for scheduled delivery.")
                        }
                    }, {
                        key: "setupFormValidator",
                        value: function() {
                            var t = this;
                            this.form.validator = this.form.validate({
                                onsubmit: !1,
                                errorPlacement: function(e, r) {
                                    return t.placeErrorMessage(e[0], r[0])
                                },
                                onfocusout: function(t) {
                                    this.checkable(t) || this.element(t)
                                },
                                rules: {
                                    "gift_purchase[recipient_emails]": {
                                        required: !0,
                                        multiEmail: !0,
                                        noDuplicateEmails: !0
                                    },
                                    "gift_purchase[benefactor]": {
                                        required: !0,
                                        minlength: 2
                                    },
                                    "gift_purchase[email]": {
                                        required: !0,
                                        email: !0
                                    },
                                    "gift_purchase[scheduled_delivery_date]": {
                                        requiredForScheduledDelivery: !0,
                                        validDeliveryDate: !0
                                    },
                                    "gift_purchase[zip]": {
                                        required: !0
                                    }
                                },
                                messages: {
                                    "gift_purchase[benefactor]": {
                                        minlength: "Please provide a name."
                                    }
                                }
                            })
                        }
                    }, {
                        key: "placeErrorMessage",
                        value: function(t, e) {
                            t.classList.add("gift-purchase__field-error"), e.insertAdjacentElement("afterend", t)
                        }
                    }, {
                        key: "customizeValidatorBehavior",
                        value: function() {
                            this.form.validator.hideThese = function(t) {
                                t.not(this.containers).hide()
                            }
                        }
                    }, {
                        key: "splitEmailList",
                        value: function(t) {
                            var e = t.trim().split(/[;, ]+/);
                            return O().map(e, (function(t) {
                                return 0 == (t = t.trim()).length ? null : t
                            }))
                        }
                    }, {
                        key: "parsedRecipientEmails",
                        value: function() {
                            return this.splitEmailList(this.recipientEmails.val())
                        }
                    }, {
                        key: "validEmailAddresses",
                        value: function() {
                            var t = this;
                            return this.parsedRecipientEmails().filter((function(e) {
                                return t.isEmailAddress(e)
                            }))
                        }
                    }, {
                        key: "invalidEmailAddresses",
                        value: function() {
                            var t = this;
                            return this.parsedRecipientEmails().filter((function(e) {
                                return t.isNotEmailAddress(e)
                            }))
                        }
                    }, {
                        key: "duplicatedEmailAddresses",
                        value: function() {
                            return this.parsedRecipientEmails().filter((function(t, e, r) {
                                return r.indexOf(t) == e && e != r.lastIndexOf(t)
                            }))
                        }
                    }, {
                        key: "isEmailAddress",
                        value: function(t) {
                            return /^[^@\s]+@([^@\s]+\.)+[^@\W]+$/.test(t)
                        }
                    }, {
                        key: "isNotEmailAddress",
                        value: function(t) {
                            return !this.isEmailAddress(t)
                        }
                    }, {
                        key: "recipientCount",
                        value: function() {
                            return this.validEmailAddresses().length
                        }
                    }, {
                        key: "chooseGiftOption",
                        value: function() {
                            var t = this.form.find(tn).closest(Zr);
                            this.addOnUnitAmount = parseFloat(t.data("unit-amount")), this.updateGiftPurchaseSummary()
                        }
                    }, {
                        key: "updateGiftPurchaseSummary",
                        value: function() {
                            this.resetSubscriptionTax();
                            var t = this.recipientCount(),
                                e = this.formatPrice(this.addOnUnitAmount * t);
                            this.form.find("[data-gift-subscription-total]").text(e), this.form.find("[data-subscription-total]").text(e), this.form.find("[data-gift-subscription-label]").text(this.selectedGiftLabel()), this.form.find("[data-gift-subscription-count-suffix]").text(t > 1 ? " \xd7 ".concat(t) : "")
                        }
                    }, {
                        key: "selectedGiftLabel",
                        value: function() {
                            var t;
                            return null !== (t = this.form.find(tn).data("gift-label")) && void 0 !== t ? t : ""
                        }
                    }, {
                        key: "checkTaxButtonEnabledConditions",
                        value: function() {
                            var t = "" !== this.recipientEmails.val().toString().trim(),
                                e = "" !== this.form.find('[data-recurly="country"]').val().toString().trim(),
                                r = "" !== this.form.find('[data-recurly="postal_code"]').val().toString().trim();
                            return t && e && r
                        }
                    }, {
                        key: "updateTaxButtonState",
                        value: function() {
                            if (this.taxButton.length > 0) {
                                var t = this.checkTaxButtonEnabledConditions();
                                this.taxButton.prop("disabled", !t)
                            }
                        }
                    }, {
                        key: "submitTaxCalculation",
                        value: (r = Gr(Rr().mark((function t() {
                            return Rr().wrap((function(t) {
                                for (;;) switch (t.prev = t.next) {
                                    case 0:
                                        if (this.checkTaxButtonEnabledConditions()) {
                                            t.next = 2;
                                            break
                                        }
                                        return t.abrupt("return", !1);
                                    case 2:
                                        return this.hideErrors(), t.next = 5, this.previewTax(this.taxButton);
                                    case 5:
                                        return t.abrupt("return", !1);
                                    case 6:
                                    case "end":
                                        return t.stop()
                                }
                            }), t, this)
                        }))), function() {
                            return r.apply(this, arguments)
                        })
                    }, {
                        key: "setupDeliveryTimingToggle",
                        value: function() {
                            var t = this;
                            this.deliveryTimingRadios.on("change input", (function(e) {
                                O()(e.target).val() === Jr ? t.showScheduledDeliverySection() : t.hideScheduledDeliverySection()
                            })), this.initializeDeliverySection()
                        }
                    }, {
                        key: "initializeDeliverySection",
                        value: function() {
                            this.deliveryTimingRadios.filter(":checked").val() === Jr ? this.scheduledDeliverySection.show() : this.scheduledDeliverySection.hide()
                        }
                    }, {
                        key: "handleBrowserBackForward",
                        value: function() {
                            var t = this;
                            O()(window).on("pageshow", (function() {
                                t.initializeDeliverySection()
                            }))
                        }
                    }, {
                        key: "showScheduledDeliverySection",
                        value: function() {
                            var t = this.form.find('input[name="gift_purchase[scheduled_delivery_date]"]');
                            this.scheduledDeliverySection.show(), t.val() && t.data("user-touched", !0), this.validateTouchedDateField(t)
                        }
                    }, {
                        key: "hideScheduledDeliverySection",
                        value: function() {
                            var t = this.form.find('input[name="gift_purchase[scheduled_delivery_date]"]');
                            this.scheduledDeliverySection.hide(), this.clearScheduledDeliveryState(t)
                        }
                    }, {
                        key: "validateTouchedDateField",
                        value: function(t) {
                            t.data("user-touched") && this.form.validator.element(t[0])
                        }
                    }, {
                        key: "clearScheduledDeliveryState",
                        value: function(t) {
                            t.removeClass("error"), t.next("label.error").remove(), t.removeData("user-touched")
                        }
                    }, {
                        key: "setupScheduledDateFieldTracking",
                        value: function() {
                            var t = this,
                                e = this.form.find('input[name="gift_purchase[scheduled_delivery_date]"]');
                            e.on("focus", (function() {
                                return t.handleDateFieldFocus(e)
                            })), e.on("change input", (function() {
                                return t.handleDateFieldChange(e)
                            })), e.on("blur", (function() {
                                return t.handleDateFieldBlur(e)
                            }))
                        }
                    }, {
                        key: "handleDateFieldFocus",
                        value: function(t) {
                            t.data("user-touched", !0)
                        }
                    }, {
                        key: "handleDateFieldChange",
                        value: function(t) {
                            this.isScheduledDeliveryMode() && (t.data("user-touched", !0), this.form.validator.element(t[0]))
                        }
                    }, {
                        key: "handleDateFieldBlur",
                        value: function(t) {
                            this.isScheduledDeliveryMode() && this.form.validator.element(t[0])
                        }
                    }, {
                        key: "isScheduledDeliveryMode",
                        value: function() {
                            var t = O()('input[name="gift_purchase[delivery_timing]"]:checked');
                            return t.length > 0 && t.val() === Jr
                        }
                    }, {
                        key: "addEventListeners",
                        value: function() {
                            var t = this;
                            Mr($r(e.prototype), "addEventListeners", this).call(this), this.form.on("change", "#gift_purchase_recipient_emails", (function(e) {
                                t.form.validator.element("#gift_purchase_recipient_emails") && t.updateGiftPurchaseSummary(), t.updateTaxButtonState()
                            })), this.form.on("change", Qr, (function(e) {
                                t.chooseGiftOption(), t.updateTaxButtonState()
                            })), this.form.on("change keyup", '#gift_purchase_recipient_emails, [data-recurly="country"], [data-recurly="postal_code"]', (function() {
                                t.updateTaxButtonState()
                            })), this.form.on("click", "button[type=button][data-subscription-calculate-tax]", function() {
                                var e = Gr(Rr().mark((function e(r) {
                                    return Rr().wrap((function(e) {
                                        for (;;) switch (e.prev = e.next) {
                                            case 0:
                                                return r.preventDefault(), e.next = 3, t.submitTaxCalculation();
                                            case 3:
                                            case "end":
                                                return e.stop()
                                        }
                                    }), e)
                                })));
                                return function(t) {
                                    return e.apply(this, arguments)
                                }
                            }()), this.form.on("ajax:success", (function(e) {
                                t.trackGiftPurchase(), t.updateTaxButtonState()
                            })), this.form.on("ajax:error", (function(e) {
                                t.updateTaxButtonState()
                            }))
                        }
                    }, {
                        key: "trackGiftPurchase",
                        value: function() {
                            var t = this.deliveryTimingRadios.filter(":checked").val() === Jr,
                                e = this.form.find('input[name="gift_purchase[gift_theme]"]:checked').val();
                            YNABAnalytics.trackEvent(i.oA.Subscription_GiftedSubscription, Nr(Nr({}, i.I_.GiftTheme, e), i.I_.Scheduled, t))
                        }
                    }]), e
                }(hr);

            function nn(t, e) {
                for (var r = 0; r < e.length; r++) {
                    var n = e[r];
                    n.enumerable = n.enumerable || !1, n.configurable = !0, "value" in n && (n.writable = !0), Object.defineProperty(t, on(n.key), n)
                }
            }

            function on(t) {
                var e = function(t, e) {
                    if ("object" != typeof t || !t) return t;
                    var r = t[Symbol.toPrimitive];
                    if (void 0 !== r) {
                        var n = r.call(t, e || "default");
                        if ("object" != typeof n) return n;
                        throw new TypeError("@@toPrimitive must return a primitive value.")
                    }
                    return ("string" === e ? String : Number)(t)
                }(t, "string");
                return "symbol" == typeof e ? e : e + ""
            }

            function an(t, e, r) {
                return e = cn(e),
                    function(t, e) {
                        if (e && ("object" == typeof e || "function" == typeof e)) return e;
                        if (void 0 !== e) throw new TypeError("Derived constructors may only return object or undefined");
                        return function(t) {
                            if (void 0 === t) throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
                            return t
                        }(t)
                    }(t, un() ? Reflect.construct(e, r || [], cn(t).constructor) : e.apply(t, r))
            }

            function un() {
                try {
                    var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], (function() {})))
                } catch (t) {}
                return (un = function() {
                    return !!t
                })()
            }

            function cn(t) {
                return cn = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function(t) {
                    return t.__proto__ || Object.getPrototypeOf(t)
                }, cn(t)
            }

            function sn(t, e) {
                return sn = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function(t, e) {
                    return t.__proto__ = e, t
                }, sn(t, e)
            }
            O()((function() {
                new rn(O()(".gift-purchase-form"))
            }));
            var ln = function(t) {
                function e() {
                    return function(t, e) {
                        if (!(t instanceof e)) throw new TypeError("Cannot call a class as a function")
                    }(this, e), an(this, e, arguments)
                }
                var r, n, o;
                return function(t, e) {
                    if ("function" != typeof e && null !== e) throw new TypeError("Super expression must either be null or a function");
                    t.prototype = Object.create(e && e.prototype, {
                        constructor: {
                            value: t,
                            writable: !0,
                            configurable: !0
                        }
                    }), Object.defineProperty(t, "prototype", {
                        writable: !1
                    }), e && sn(t, e)
                }(e, t), r = e, (n = [{
                    key: "submitForm",
                    value: function(t) {
                        return this.submitFormHandler(t)
                    }
                }]) && nn(r.prototype, n), o && nn(r, o), Object.defineProperty(r, "prototype", {
                    writable: !1
                }), e
            }(hr);

            function fn(t, e, r) {
                return (e = hn(e)) in t ? Object.defineProperty(t, e, {
                    value: r,
                    enumerable: !0,
                    configurable: !0,
                    writable: !0
                }) : t[e] = r, t
            }

            function dn(t, e) {
                for (var r = 0; r < e.length; r++) {
                    var n = e[r];
                    n.enumerable = n.enumerable || !1, n.configurable = !0, "value" in n && (n.writable = !0), Object.defineProperty(t, hn(n.key), n)
                }
            }

            function hn(t) {
                var e = function(t, e) {
                    if ("object" != typeof t || !t) return t;
                    var r = t[Symbol.toPrimitive];
                    if (void 0 !== r) {
                        var n = r.call(t, e || "default");
                        if ("object" != typeof n) return n;
                        throw new TypeError("@@toPrimitive must return a primitive value.")
                    }
                    return ("string" === e ? String : Number)(t)
                }(t, "string");
                return "symbol" == typeof e ? e : e + ""
            }! function(t) {
                t((function() {
                    new ln(t(".group-payment-method-form"))
                }))
            }(O());
            var pn = function() {
                function t(e) {
                    ! function(t, e) {
                        if (!(t instanceof e)) throw new TypeError("Cannot call a class as a function")
                    }(this, t), this.formClass = ".referral-program-invite-form", this.body = void 0, this.form = void 0, this.emailField = void 0, this.messageField = void 0, this.referralShareLinkField = void 0, this.referralShareLinkCopiedMessageTemplate = void 0, this.sponsorNameField = void 0, this.body = e, this.initializeForm(), this.addEventListeners(), YNABAnalytics.trackEvent(i.oA.PageView_ViewedReferralProgram)
                }
                var e, r, n;
                return e = t, (r = [{
                    key: "addEventListeners",
                    value: function() {
                        var t = this;
                        this.body.on("ajax:error", this.formClass, (function(e) {
                            var r = e.detail[2];
                            switch (r.status) {
                                case 422:
                                    t.showInviteError(r.responseText);
                                    break;
                                case 429:
                                    t.showInviteError("Oops, too many attempts. Please wait a moment before trying again.");
                                    break;
                                default:
                                    t.showInviteError("Please try again later or contact support.")
                            }
                        })), this.body.on("ajax:success", this.formClass, (function(e) {
                            var r = e.detail[2];
                            t.showInviteSuccess(r.responseText)
                        })), this.body.on("click", "#referral-share-link", (function(t) {
                            t.target instanceof HTMLInputElement && t.target.select()
                        })), this.body.on("click", "#copy-button", (function(e) {
                            t.selectLinkAndCopyToClipboard()
                        })), this.body.on("click", ".social-share-link", (function(e) {
                            t.trackSocialShare($(e.currentTarget))
                        })), this.sponsorNameField.on("input", (function() {
                            return t.updateReferralUrls()
                        }))
                    }
                }, {
                    key: "initializeForm",
                    value: function() {
                        this.form = this.body.find(this.formClass), new YNAB.FormDirtyTrackingAllFieldsPresent(this.form), this.emailField = this.form.find("input[type=email]"), this.sponsorNameField = this.form.find("#referral_sponsor_name"), this.referralShareLinkField = this.body.find("#referral-share-link");
                        var t = this.body.find(".referral-share-content-link .copied-msg");
                        this.referralShareLinkCopiedMessageTemplate = t.clone().prop("hidden", !1), t.remove()
                    }
                }, {
                    key: "selectLinkAndCopyToClipboard",
                    value: function() {
                        var t = this.body.find("#copy-link-container"),
                            e = document.createElement("textarea");
                        e.value = this.referralShareLinkField.val().toString(), e.setAttribute("aria-hidden", "true"), e.style.position = "absolute", e.style.left = "-9999px", t.append(e), e.select(), YNAB.copyTextToClipboard(e), YNABAnalytics.trackEvent(i.oA.Social_SentReferralInvite, fn({}, i.I_.ReferralMethod, "Link")), jQuery(e).remove();
                        var r = this.referralShareLinkCopiedMessageTemplate.clone();
                        r.attr("role", "alert"), r.attr("aria-live", "polite"), t.find(".referral-share-content-link").append(r), setTimeout((function() {
                            return r.remove()
                        }), 2e3)
                    }
                }, {
                    key: "showInviteError",
                    value: function(t) {
                        this.body.find(".referral-invite-success").hide(), this.body.find(".referral-invite-error").hide().find("span").text(t).end().fadeIn("fast"), this.emailField.focus()
                    }
                }, {
                    key: "showInviteSuccess",
                    value: function(t) {
                        var e = this;
                        setTimeout((function() {
                            e.emailField.val("").trigger("change").focus()
                        }), 25), this.body.find(".referral-invite-error").hide().find("span").empty(), this.body.find(".referral-invite-success").hide().fadeIn("fast"), this.body.find(".referral-section").replaceWith(t), YNABAnalytics.trackEvent(i.oA.Social_SentReferralInvite, fn({}, i.I_.ReferralMethod, "Email"))
                    }
                }, {
                    key: "trackSocialShare",
                    value: function(t) {
                        YNABAnalytics.trackEvent(i.oA.Social_SentReferralInvite, fn({}, i.I_.ReferralMethod, t.data("platform")))
                    }
                }, {
                    key: "updateReferralUrls",
                    value: function() {
                        var t = new URL(this.referralShareLinkField.val().toString()),
                            e = this.sponsorNameField.val().trim();
                        e ? t.searchParams.set("sponsor_name", e) : t.searchParams.delete("sponsor_name"), this.referralShareLinkField.val(t.toString())
                    }
                }]) && dn(e.prototype, r), n && dn(e, n), Object.defineProperty(e, "prototype", {
                    writable: !1
                }), t
            }();

            function yn() {
                yn = function() {
                    return e
                };
                var t, e = {},
                    r = Object.prototype,
                    n = r.hasOwnProperty,
                    o = Object.defineProperty || function(t, e, r) {
                        t[e] = r.value
                    },
                    i = "function" == typeof Symbol ? Symbol : {},
                    a = i.iterator || "@@iterator",
                    u = i.asyncIterator || "@@asyncIterator",
                    c = i.toStringTag || "@@toStringTag";

                function s(t, e, r) {
                    return Object.defineProperty(t, e, {
                        value: r,
                        enumerable: !0,
                        configurable: !0,
                        writable: !0
                    }), t[e]
                }
                try {
                    s({}, "")
                } catch (t) {
                    s = function(t, e, r) {
                        return t[e] = r
                    }
                }

                function l(t, e, r, n) {
                    var i = e && e.prototype instanceof m ? e : m,
                        a = Object.create(i.prototype),
                        u = new L(n || []);
                    return o(a, "_invoke", {
                        value: _(t, r, u)
                    }), a
                }

                function f(t, e, r) {
                    try {
                        return {
                            type: "normal",
                            arg: t.call(e, r)
                        }
                    } catch (t) {
                        return {
                            type: "throw",
                            arg: t
                        }
                    }
                }
                e.wrap = l;
                var d = "suspendedStart",
                    h = "suspendedYield",
                    p = "executing",
                    y = "completed",
                    v = {};

                function m() {}

                function g() {}

                function b() {}
                var w = {};
                s(w, a, (function() {
                    return this
                }));
                var k = Object.getPrototypeOf,
                    O = k && k(k(C([])));
                O && O !== r && n.call(O, a) && (w = O);
                var E = b.prototype = m.prototype = Object.create(w);

                function T(t) {
                    ["next", "throw", "return"].forEach((function(e) {
                        s(t, e, (function(t) {
                            return this._invoke(e, t)
                        }))
                    }))
                }

                function S(t, e) {
                    function r(o, i, a, u) {
                        var c = f(t[o], t, i);
                        if ("throw" !== c.type) {
                            var s = c.arg,
                                l = s.value;
                            return l && "object" == typeof l && n.call(l, "__await") ? e.resolve(l.__await).then((function(t) {
                                r("next", t, a, u)
                            }), (function(t) {
                                r("throw", t, a, u)
                            })) : e.resolve(l).then((function(t) {
                                s.value = t, a(s)
                            }), (function(t) {
                                return r("throw", t, a, u)
                            }))
                        }
                        u(c.arg)
                    }
                    var i;
                    o(this, "_invoke", {
                        value: function(t, n) {
                            function o() {
                                return new e((function(e, o) {
                                    r(t, n, e, o)
                                }))
                            }
                            return i = i ? i.then(o, o) : o()
                        }
                    })
                }

                function _(e, r, n) {
                    var o = d;
                    return function(i, a) {
                        if (o === p) throw Error("Generator is already running");
                        if (o === y) {
                            if ("throw" === i) throw a;
                            return {
                                value: t,
                                done: !0
                            }
                        }
                        for (n.method = i, n.arg = a;;) {
                            var u = n.delegate;
                            if (u) {
                                var c = j(u, n);
                                if (c) {
                                    if (c === v) continue;
                                    return c
                                }
                            }
                            if ("next" === n.method) n.sent = n._sent = n.arg;
                            else if ("throw" === n.method) {
                                if (o === d) throw o = y, n.arg;
                                n.dispatchException(n.arg)
                            } else "return" === n.method && n.abrupt("return", n.arg);
                            o = p;
                            var s = f(e, r, n);
                            if ("normal" === s.type) {
                                if (o = n.done ? y : h, s.arg === v) continue;
                                return {
                                    value: s.arg,
                                    done: n.done
                                }
                            }
                            "throw" === s.type && (o = y, n.method = "throw", n.arg = s.arg)
                        }
                    }
                }

                function j(e, r) {
                    var n = r.method,
                        o = e.iterator[n];
                    if (o === t) return r.delegate = null, "throw" === n && e.iterator.return && (r.method = "return", r.arg = t, j(e, r), "throw" === r.method) || "return" !== n && (r.method = "throw", r.arg = new TypeError("The iterator does not provide a '" + n + "' method")), v;
                    var i = f(o, e.iterator, r.arg);
                    if ("throw" === i.type) return r.method = "throw", r.arg = i.arg, r.delegate = null, v;
                    var a = i.arg;
                    return a ? a.done ? (r[e.resultName] = a.value, r.next = e.nextLoc, "return" !== r.method && (r.method = "next", r.arg = t), r.delegate = null, v) : a : (r.method = "throw", r.arg = new TypeError("iterator result is not an object"), r.delegate = null, v)
                }

                function x(t) {
                    var e = {
                        tryLoc: t[0]
                    };
                    1 in t && (e.catchLoc = t[1]), 2 in t && (e.finallyLoc = t[2], e.afterLoc = t[3]), this.tryEntries.push(e)
                }

                function P(t) {
                    var e = t.completion || {};
                    e.type = "normal", delete e.arg, t.completion = e
                }

                function L(t) {
                    this.tryEntries = [{
                        tryLoc: "root"
                    }], t.forEach(x, this), this.reset(!0)
                }

                function C(e) {
                    if (e || "" === e) {
                        var r = e[a];
                        if (r) return r.call(e);
                        if ("function" == typeof e.next) return e;
                        if (!isNaN(e.length)) {
                            var o = -1,
                                i = function r() {
                                    for (; ++o < e.length;)
                                        if (n.call(e, o)) return r.value = e[o], r.done = !1, r;
                                    return r.value = t, r.done = !0, r
                                };
                            return i.next = i
                        }
                    }
                    throw new TypeError(typeof e + " is not iterable")
                }
                return g.prototype = b, o(E, "constructor", {
                    value: b,
                    configurable: !0
                }), o(b, "constructor", {
                    value: g,
                    configurable: !0
                }), g.displayName = s(b, c, "GeneratorFunction"), e.isGeneratorFunction = function(t) {
                    var e = "function" == typeof t && t.constructor;
                    return !!e && (e === g || "GeneratorFunction" === (e.displayName || e.name))
                }, e.mark = function(t) {
                    return Object.setPrototypeOf ? Object.setPrototypeOf(t, b) : (t.__proto__ = b, s(t, c, "GeneratorFunction")), t.prototype = Object.create(E), t
                }, e.awrap = function(t) {
                    return {
                        __await: t
                    }
                }, T(S.prototype), s(S.prototype, u, (function() {
                    return this
                })), e.AsyncIterator = S, e.async = function(t, r, n, o, i) {
                    void 0 === i && (i = Promise);
                    var a = new S(l(t, r, n, o), i);
                    return e.isGeneratorFunction(r) ? a : a.next().then((function(t) {
                        return t.done ? t.value : a.next()
                    }))
                }, T(E), s(E, c, "Generator"), s(E, a, (function() {
                    return this
                })), s(E, "toString", (function() {
                    return "[object Generator]"
                })), e.keys = function(t) {
                    var e = Object(t),
                        r = [];
                    for (var n in e) r.push(n);
                    return r.reverse(),
                        function t() {
                            for (; r.length;) {
                                var n = r.pop();
                                if (n in e) return t.value = n, t.done = !1, t
                            }
                            return t.done = !0, t
                        }
                }, e.values = C, L.prototype = {
                    constructor: L,
                    reset: function(e) {
                        if (this.prev = 0, this.next = 0, this.sent = this._sent = t, this.done = !1, this.delegate = null, this.method = "next", this.arg = t, this.tryEntries.forEach(P), !e)
                            for (var r in this) "t" === r.charAt(0) && n.call(this, r) && !isNaN(+r.slice(1)) && (this[r] = t)
                    },
                    stop: function() {
                        this.done = !0;
                        var t = this.tryEntries[0].completion;
                        if ("throw" === t.type) throw t.arg;
                        return this.rval
                    },
                    dispatchException: function(e) {
                        if (this.done) throw e;
                        var r = this;

                        function o(n, o) {
                            return u.type = "throw", u.arg = e, r.next = n, o && (r.method = "next", r.arg = t), !!o
                        }
                        for (var i = this.tryEntries.length - 1; i >= 0; --i) {
                            var a = this.tryEntries[i],
                                u = a.completion;
                            if ("root" === a.tryLoc) return o("end");
                            if (a.tryLoc <= this.prev) {
                                var c = n.call(a, "catchLoc"),
                                    s = n.call(a, "finallyLoc");
                                if (c && s) {
                                    if (this.prev < a.catchLoc) return o(a.catchLoc, !0);
                                    if (this.prev < a.finallyLoc) return o(a.finallyLoc)
                                } else if (c) {
                                    if (this.prev < a.catchLoc) return o(a.catchLoc, !0)
                                } else {
                                    if (!s) throw Error("try statement without catch or finally");
                                    if (this.prev < a.finallyLoc) return o(a.finallyLoc)
                                }
                            }
                        }
                    },
                    abrupt: function(t, e) {
                        for (var r = this.tryEntries.length - 1; r >= 0; --r) {
                            var o = this.tryEntries[r];
                            if (o.tryLoc <= this.prev && n.call(o, "finallyLoc") && this.prev < o.finallyLoc) {
                                var i = o;
                                break
                            }
                        }
                        i && ("break" === t || "continue" === t) && i.tryLoc <= e && e <= i.finallyLoc && (i = null);
                        var a = i ? i.completion : {};
                        return a.type = t, a.arg = e, i ? (this.method = "next", this.next = i.finallyLoc, v) : this.complete(a)
                    },
                    complete: function(t, e) {
                        if ("throw" === t.type) throw t.arg;
                        return "break" === t.type || "continue" === t.type ? this.next = t.arg : "return" === t.type ? (this.rval = this.arg = t.arg, this.method = "return", this.next = "end") : "normal" === t.type && e && (this.next = e), v
                    },
                    finish: function(t) {
                        for (var e = this.tryEntries.length - 1; e >= 0; --e) {
                            var r = this.tryEntries[e];
                            if (r.finallyLoc === t) return this.complete(r.completion, r.afterLoc), P(r), v
                        }
                    },
                    catch: function(t) {
                        for (var e = this.tryEntries.length - 1; e >= 0; --e) {
                            var r = this.tryEntries[e];
                            if (r.tryLoc === t) {
                                var n = r.completion;
                                if ("throw" === n.type) {
                                    var o = n.arg;
                                    P(r)
                                }
                                return o
                            }
                        }
                        throw Error("illegal catch attempt")
                    },
                    delegateYield: function(e, r, n) {
                        return this.delegate = {
                            iterator: C(e),
                            resultName: r,
                            nextLoc: n
                        }, "next" === this.method && (this.arg = t), v
                    }
                }, e
            }

            function vn(t, e, r, n, o, i, a) {
                try {
                    var u = t[i](a),
                        c = u.value
                } catch (t) {
                    return void r(t)
                }
                u.done ? e(c) : Promise.resolve(c).then(n, o)
            }

            function mn(t) {
                return function() {
                    var e = this,
                        r = arguments;
                    return new Promise((function(n, o) {
                        var i = t.apply(e, r);

                        function a(t) {
                            vn(i, n, o, a, u, "next", t)
                        }

                        function u(t) {
                            vn(i, n, o, a, u, "throw", t)
                        }
                        a(void 0)
                    }))
                }
            }

            function gn(t, e) {
                for (var r = 0; r < e.length; r++) {
                    var n = e[r];
                    n.enumerable = n.enumerable || !1, n.configurable = !0, "value" in n && (n.writable = !0), Object.defineProperty(t, bn(n.key), n)
                }
            }

            function bn(t) {
                var e = function(t, e) {
                    if ("object" != typeof t || !t) return t;
                    var r = t[Symbol.toPrimitive];
                    if (void 0 !== r) {
                        var n = r.call(t, e || "default");
                        if ("object" != typeof n) return n;
                        throw new TypeError("@@toPrimitive must return a primitive value.")
                    }
                    return ("string" === e ? String : Number)(t)
                }(t, "string");
                return "symbol" == typeof e ? e : e + ""
            }

            function wn(t, e, r) {
                return e = Tn(e), kn(t, On() ? Reflect.construct(e, r || [], Tn(t).constructor) : e.apply(t, r))
            }

            function kn(t, e) {
                if (e && ("object" == typeof e || "function" == typeof e)) return e;
                if (void 0 !== e) throw new TypeError("Derived constructors may only return object or undefined");
                return function(t) {
                    if (void 0 === t) throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
                    return t
                }(t)
            }

            function On() {
                try {
                    var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], (function() {})))
                } catch (t) {}
                return (On = function() {
                    return !!t
                })()
            }

            function En() {
                return En = "undefined" != typeof Reflect && Reflect.get ? Reflect.get.bind() : function(t, e, r) {
                    var n = function(t, e) {
                        for (; !{}.hasOwnProperty.call(t, e) && null !== (t = Tn(t)););
                        return t
                    }(t, e);
                    if (n) {
                        var o = Object.getOwnPropertyDescriptor(n, e);
                        return o.get ? o.get.call(arguments.length < 3 ? t : r) : o.value
                    }
                }, En.apply(null, arguments)
            }

            function Tn(t) {
                return Tn = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function(t) {
                    return t.__proto__ || Object.getPrototypeOf(t)
                }, Tn(t)
            }

            function Sn(t, e) {
                return Sn = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function(t, e) {
                    return t.__proto__ = e, t
                }, Sn(t, e)
            }
            YNAB.route("referral_program#index", (function(t) {
                    new pn(t)
                })),
                function(t) {
                    t((function() {
                        var e = t(".registration-container");
                        0 !== e.length && (e.find(".registration-form").each((function() {
                            var e = t(this);
                            e.validate(), new YNAB.FormDirtyTrackingAllFieldsPresent(e)
                        })), e.on("ajax:success", ".registration-form", (function(e) {
                            var r = e.detail[2],
                                n = e.target;
                            t(n).replaceWith(r.responseText);
                            var o = t("#".concat(n.id));
                            o.find(".error:first").prev("input").focus(), o.validate(), new YNAB.FormDirtyTrackingAllFieldsPresent(o), YNAB.setSessionToken(o.find("meta[name=session-token]").remove().attr("content"))
                        })))
                    }))
                }(O());
            var _n = function(t) {
                function e(t) {
                    var r;
                    return function(t, e) {
                        if (!(t instanceof e)) throw new TypeError("Cannot call a class as a function")
                    }(this, e), (r = wn(this, e, [t])).planTotal = void 0, r.billingAgreement = void 0, r.agreementCheckbox = void 0, r.submitButton = void 0, r.taxButton = void 0, r.dirtyTracking = void 0, r.form ? (r.planTotal = r.form.find("[data-subscription-plan-total]"), r.billingAgreement = r.form.find("[data-subscription-agreement]"), r.agreementCheckbox = r.form.find("[data-subscription-agreement-checkbox-form]"), r.submitButton = r.form.find("[data-subscription-submit-button]"), r.taxButton = r.form.find("[data-subscription-calculate-tax]"), r.initializePlanTotal(), r.toggleSubmitButton(), r.updateTaxButtonState(), r.dirtyTracking = r.buildDirtyTracking(), r.updatePostalCodeLabel(), r) : kn(r)
                }
                var r, n, o, i, a;
                return function(t, e) {
                    if ("function" != typeof e && null !== e) throw new TypeError("Super expression must either be null or a function");
                    t.prototype = Object.create(e && e.prototype, {
                        constructor: {
                            value: t,
                            writable: !0,
                            configurable: !0
                        }
                    }), Object.defineProperty(t, "prototype", {
                        writable: !1
                    }), e && Sn(t, e)
                }(e, t), r = e, n = [{
                    key: "buildDirtyTracking",
                    value: function() {
                        return this.isEditingSubscription ? new Ir(this.form) : new Fr(this.form)
                    }
                }, {
                    key: "addEventListeners",
                    value: function() {
                        var t = this;
                        En(Tn(e.prototype), "addEventListeners", this).call(this), this.form.on("change", "[data-plan]", function() {
                            var e = mn(yn().mark((function e(r) {
                                return yn().wrap((function(e) {
                                    for (;;) switch (e.prev = e.next) {
                                        case 0:
                                            return t.updatePlanTotal(O()(r.target)), t.updateTaxButtonState(), t.updatePlanCodeField(O()(r.target)), e.next = 5, t.autoCalculateTax();
                                        case 5:
                                        case "end":
                                            return e.stop()
                                    }
                                }), e)
                            })));
                            return function(t) {
                                return e.apply(this, arguments)
                            }
                        }()), this.form.on("change", "[data-subscription-agreement-checkbox]", (function() {
                            t.toggleSubmitButton()
                        })), this.form.on("change keyup", '[data-recurly="country"], [data-recurly="postal_code"]', (function() {
                            t.updateTaxButtonState()
                        })), this.form.on("change", '[data-recurly="country"]', mn(yn().mark((function e() {
                            return yn().wrap((function(e) {
                                for (;;) switch (e.prev = e.next) {
                                    case 0:
                                        return t.updatePostalCodeLabel(), e.next = 3, t.autoCalculateTax();
                                    case 3:
                                    case "end":
                                        return e.stop()
                                }
                            }), e)
                        })))), this.form.on("focusout", '[data-recurly="postal_code"]', mn(yn().mark((function e() {
                            return yn().wrap((function(e) {
                                for (;;) switch (e.prev = e.next) {
                                    case 0:
                                        return e.next = 2, t.autoCalculateTax();
                                    case 2:
                                    case "end":
                                        return e.stop()
                                }
                            }), e)
                        })))), this.form.on("click", "button[type=button][data-subscription-calculate-tax]", function() {
                            var e = mn(yn().mark((function e(r) {
                                return yn().wrap((function(e) {
                                    for (;;) switch (e.prev = e.next) {
                                        case 0:
                                            return r.preventDefault(), e.next = 3, t.submitTaxCalculation();
                                        case 3:
                                        case "end":
                                            return e.stop()
                                    }
                                }), e)
                            })));
                            return function(t) {
                                return e.apply(this, arguments)
                            }
                        }())
                    }
                }, {
                    key: "submitForm",
                    value: function(t) {
                        return !(!this.isEditingSubscription || !this.dirtyTracking.billingInfoDidNotChange()) || this.submitFormHandler(t)
                    }
                }, {
                    key: "toggleSubmitButton",
                    value: function() {
                        var t = this.agreementCheckbox.find("[data-subscription-agreement-checkbox]");
                        this.submitButton.length && t.length && this.submitButton.prop("disabled", !t.prop("checked"))
                    }
                }, {
                    key: "initializePlanTotal",
                    value: function() {
                        var t = this.form.find("[data-plan]").filter(":checked");
                        this.updatePlanTotal(t)
                    }
                }, {
                    key: "updatePlanTotal",
                    value: function(t) {
                        var e = this.form.data("current-plan-code"),
                            r = t.data("plan"),
                            n = t.data("denom"),
                            o = t.data("discount-price"),
                            i = t.data("full-price"),
                            a = t.data("price-to-switch") || "$0",
                            u = t.data("next-billing-price"),
                            c = t.data("billing-cycle-unit"),
                            s = t.data("second-charge-date"),
                            l = t.data("plan-name");
                        e != r || o ? o ? this.updatePrices(i, o, n, u, c, s, l) : e ? this.updatePrices("", a, n, u, c, s, l) : this.updatePrices("", i, n, u, c, s, l) : this.updatePrices("", a, "", u, c, s, l)
                    }
                }, {
                    key: "updatePage",
                    value: function(t) {
                        En(Tn(e.prototype), "updatePage", this).call(this, t);
                        var r = O()(".page-header h1");
                        r.text(r.text().replace("Subscribe to YNAB", "Subscribed to YNAB"))
                    }
                }, {
                    key: "updatePrices",
                    value: function(t, e, r, n, o, i, a) {
                        this.resetSubscriptionTax(), this.planTotal.find("[data-subscription-plan-name]").text(a), this.planTotal.find("[data-subscription-full-price]").text(t), this.planTotal.find("[data-subscription-price]").text(e), this.planTotal.find("[data-subscription-denom]").text(r), this.planTotal.find("[data-subscription-total]").text(e), this.billingAgreement.find("[data-subscription-billing-cycle-unit]").text(o), this.billingAgreement.find("[data-subscription-second-charge-date]").text(i), this.billingAgreement.find("[data-subscription-next-billing-price]").text(n), this.agreementCheckbox.find("[data-subscription-billing-cycle-unit]").text(o), this.agreementCheckbox.find("[data-subscription-next-billing-price]").text(n)
                    }
                }, {
                    key: "checkTaxButtonEnabledConditions",
                    value: function() {
                        if (0 === this.taxButton.length) return !1;
                        var t = "" !== this.form.find('[data-recurly="country"]').val().toString().trim(),
                            e = "" !== this.form.find('[data-recurly="postal_code"]').val().toString().trim();
                        return t && e
                    }
                }, {
                    key: "updateTaxButtonState",
                    value: function() {
                        if (this.taxButton.length > 0) {
                            var t = this.checkTaxButtonEnabledConditions();
                            this.taxButton.prop("disabled", !t)
                        }
                    }
                }, {
                    key: "updatePostalCodeLabel",
                    value: function() {
                        var t = this.form.find('[data-recurly="country"]'),
                            e = this.form.find('label[for="subscription_zip"]');
                        if (t.length > 0 && e.length > 0) {
                            var r, n = (null === (r = t.val()) || void 0 === r ? void 0 : r.toString()) || "",
                                o = "US" === n ? "Zip code" : "Postal code";
                            if (e.text(o), this.taxButton && this.taxButton.length > 0) {
                                var i = "US" === n ? "Enter zip code" : "Enter postal code";
                                this.taxButton.text(i)
                            }
                        }
                    }
                }, {
                    key: "submitTaxCalculation",
                    value: (a = mn(yn().mark((function t() {
                        return yn().wrap((function(t) {
                            for (;;) switch (t.prev = t.next) {
                                case 0:
                                    if (this.checkTaxButtonEnabledConditions()) {
                                        t.next = 2;
                                        break
                                    }
                                    return t.abrupt("return", !1);
                                case 2:
                                    return this.hideErrors(), t.next = 5, this.previewTax(this.taxButton);
                                case 5:
                                    return t.abrupt("return", !1);
                                case 6:
                                case "end":
                                    return t.stop()
                            }
                        }), t, this)
                    }))), function() {
                        return a.apply(this, arguments)
                    })
                }, {
                    key: "updatePlanCodeField",
                    value: function(t) {
                        var e = t.data("billing-cycle-unit");
                        if (e) {
                            var r = "year" === e ? "annual" : "monthly",
                                n = this.form.find("input[name='subscription[plan_code]']");
                            n.length > 0 && n.val(r)
                        }
                    }
                }, {
                    key: "autoCalculateTax",
                    value: (i = mn(yn().mark((function t() {
                        return yn().wrap((function(t) {
                            for (;;) switch (t.prev = t.next) {
                                case 0:
                                    if (this.checkTaxButtonEnabledConditions()) {
                                        t.next = 2;
                                        break
                                    }
                                    return t.abrupt("return");
                                case 2:
                                    return this.hideErrors(), t.next = 5, this.previewTax(this.taxButton);
                                case 5:
                                    return t.abrupt("return", !1);
                                case 6:
                                case "end":
                                    return t.stop()
                            }
                        }), t, this)
                    }))), function() {
                        return i.apply(this, arguments)
                    })
                }], n && gn(r.prototype, n), o && gn(r, o), Object.defineProperty(r, "prototype", {
                    writable: !1
                }), e
            }(hr);
            O()((function() {
                new _n(O()(".subscription-form"))
            })), YNAB.route("subscriptions#required", (function() {
                YNABAnalytics.trackEvent(i.oA.Subscription_ViewedExpirationMessage)
            })), YNAB.route("subscriptions#new", "subscriptions#edit", (function() {
                YNABAnalytics.trackEvent(i.oA.PageView_ViewedSubscribe)
            })), (0, n.G)((function() {
                var t, e;
                null === (t = document.querySelector(".js-contact-us")) || void 0 === t || t.addEventListener("click", (function() {
                    window.KustomerChatWidget.openChat()
                }));
                var r = document.querySelectorAll(".js-impersonation-allowed-option"),
                    n = null === (e = Array.from(r).find((function(t) {
                        return t.checked
                    }))) || void 0 === e ? void 0 : e.value;
                r.forEach((function(t) {
                    t.addEventListener("change", (function() {
                        var t = n !== this.value;
                        document.querySelector(".js-button-save").disabled = !t
                    }))
                }))
            }));
            r(1989);
            (0, n.G)((function() {
                var t;
                null === (t = document.getElementById("new-personal-access-token-container")) || void 0 === t || t.addEventListener("click", (function() {
                    this.style.display = "none", document.getElementById("generate-personal-access-token-container").style.display = "block"
                }))
            }));
            r(9117);

            function jn(t, e, r) {
                return (e = function(t) {
                    var e = function(t, e) {
                        if ("object" != typeof t || !t) return t;
                        var r = t[Symbol.toPrimitive];
                        if (void 0 !== r) {
                            var n = r.call(t, e || "default");
                            if ("object" != typeof n) return n;
                            throw new TypeError("@@toPrimitive must return a primitive value.")
                        }
                        return ("string" === e ? String : Number)(t)
                    }(t, "string");
                    return "symbol" == typeof e ? e : e + ""
                }(e)) in t ? Object.defineProperty(t, e, {
                    value: r,
                    enumerable: !0,
                    configurable: !0,
                    writable: !0
                }) : t[e] = r, t
            }

            function xn() {
                xn = function() {
                    return e
                };
                var t, e = {},
                    r = Object.prototype,
                    n = r.hasOwnProperty,
                    o = Object.defineProperty || function(t, e, r) {
                        t[e] = r.value
                    },
                    i = "function" == typeof Symbol ? Symbol : {},
                    a = i.iterator || "@@iterator",
                    u = i.asyncIterator || "@@asyncIterator",
                    c = i.toStringTag || "@@toStringTag";

                function s(t, e, r) {
                    return Object.defineProperty(t, e, {
                        value: r,
                        enumerable: !0,
                        configurable: !0,
                        writable: !0
                    }), t[e]
                }
                try {
                    s({}, "")
                } catch (t) {
                    s = function(t, e, r) {
                        return t[e] = r
                    }
                }

                function l(t, e, r, n) {
                    var i = e && e.prototype instanceof m ? e : m,
                        a = Object.create(i.prototype),
                        u = new L(n || []);
                    return o(a, "_invoke", {
                        value: _(t, r, u)
                    }), a
                }

                function f(t, e, r) {
                    try {
                        return {
                            type: "normal",
                            arg: t.call(e, r)
                        }
                    } catch (t) {
                        return {
                            type: "throw",
                            arg: t
                        }
                    }
                }
                e.wrap = l;
                var d = "suspendedStart",
                    h = "suspendedYield",
                    p = "executing",
                    y = "completed",
                    v = {};

                function m() {}

                function g() {}

                function b() {}
                var w = {};
                s(w, a, (function() {
                    return this
                }));
                var k = Object.getPrototypeOf,
                    O = k && k(k(C([])));
                O && O !== r && n.call(O, a) && (w = O);
                var E = b.prototype = m.prototype = Object.create(w);

                function T(t) {
                    ["next", "throw", "return"].forEach((function(e) {
                        s(t, e, (function(t) {
                            return this._invoke(e, t)
                        }))
                    }))
                }

                function S(t, e) {
                    function r(o, i, a, u) {
                        var c = f(t[o], t, i);
                        if ("throw" !== c.type) {
                            var s = c.arg,
                                l = s.value;
                            return l && "object" == typeof l && n.call(l, "__await") ? e.resolve(l.__await).then((function(t) {
                                r("next", t, a, u)
                            }), (function(t) {
                                r("throw", t, a, u)
                            })) : e.resolve(l).then((function(t) {
                                s.value = t, a(s)
                            }), (function(t) {
                                return r("throw", t, a, u)
                            }))
                        }
                        u(c.arg)
                    }
                    var i;
                    o(this, "_invoke", {
                        value: function(t, n) {
                            function o() {
                                return new e((function(e, o) {
                                    r(t, n, e, o)
                                }))
                            }
                            return i = i ? i.then(o, o) : o()
                        }
                    })
                }

                function _(e, r, n) {
                    var o = d;
                    return function(i, a) {
                        if (o === p) throw Error("Generator is already running");
                        if (o === y) {
                            if ("throw" === i) throw a;
                            return {
                                value: t,
                                done: !0
                            }
                        }
                        for (n.method = i, n.arg = a;;) {
                            var u = n.delegate;
                            if (u) {
                                var c = j(u, n);
                                if (c) {
                                    if (c === v) continue;
                                    return c
                                }
                            }
                            if ("next" === n.method) n.sent = n._sent = n.arg;
                            else if ("throw" === n.method) {
                                if (o === d) throw o = y, n.arg;
                                n.dispatchException(n.arg)
                            } else "return" === n.method && n.abrupt("return", n.arg);
                            o = p;
                            var s = f(e, r, n);
                            if ("normal" === s.type) {
                                if (o = n.done ? y : h, s.arg === v) continue;
                                return {
                                    value: s.arg,
                                    done: n.done
                                }
                            }
                            "throw" === s.type && (o = y, n.method = "throw", n.arg = s.arg)
                        }
                    }
                }

                function j(e, r) {
                    var n = r.method,
                        o = e.iterator[n];
                    if (o === t) return r.delegate = null, "throw" === n && e.iterator.return && (r.method = "return", r.arg = t, j(e, r), "throw" === r.method) || "return" !== n && (r.method = "throw", r.arg = new TypeError("The iterator does not provide a '" + n + "' method")), v;
                    var i = f(o, e.iterator, r.arg);
                    if ("throw" === i.type) return r.method = "throw", r.arg = i.arg, r.delegate = null, v;
                    var a = i.arg;
                    return a ? a.done ? (r[e.resultName] = a.value, r.next = e.nextLoc, "return" !== r.method && (r.method = "next", r.arg = t), r.delegate = null, v) : a : (r.method = "throw", r.arg = new TypeError("iterator result is not an object"), r.delegate = null, v)
                }

                function x(t) {
                    var e = {
                        tryLoc: t[0]
                    };
                    1 in t && (e.catchLoc = t[1]), 2 in t && (e.finallyLoc = t[2], e.afterLoc = t[3]), this.tryEntries.push(e)
                }

                function P(t) {
                    var e = t.completion || {};
                    e.type = "normal", delete e.arg, t.completion = e
                }

                function L(t) {
                    this.tryEntries = [{
                        tryLoc: "root"
                    }], t.forEach(x, this), this.reset(!0)
                }

                function C(e) {
                    if (e || "" === e) {
                        var r = e[a];
                        if (r) return r.call(e);
                        if ("function" == typeof e.next) return e;
                        if (!isNaN(e.length)) {
                            var o = -1,
                                i = function r() {
                                    for (; ++o < e.length;)
                                        if (n.call(e, o)) return r.value = e[o], r.done = !1, r;
                                    return r.value = t, r.done = !0, r
                                };
                            return i.next = i
                        }
                    }
                    throw new TypeError(typeof e + " is not iterable")
                }
                return g.prototype = b, o(E, "constructor", {
                    value: b,
                    configurable: !0
                }), o(b, "constructor", {
                    value: g,
                    configurable: !0
                }), g.displayName = s(b, c, "GeneratorFunction"), e.isGeneratorFunction = function(t) {
                    var e = "function" == typeof t && t.constructor;
                    return !!e && (e === g || "GeneratorFunction" === (e.displayName || e.name))
                }, e.mark = function(t) {
                    return Object.setPrototypeOf ? Object.setPrototypeOf(t, b) : (t.__proto__ = b, s(t, c, "GeneratorFunction")), t.prototype = Object.create(E), t
                }, e.awrap = function(t) {
                    return {
                        __await: t
                    }
                }, T(S.prototype), s(S.prototype, u, (function() {
                    return this
                })), e.AsyncIterator = S, e.async = function(t, r, n, o, i) {
                    void 0 === i && (i = Promise);
                    var a = new S(l(t, r, n, o), i);
                    return e.isGeneratorFunction(r) ? a : a.next().then((function(t) {
                        return t.done ? t.value : a.next()
                    }))
                }, T(E), s(E, c, "Generator"), s(E, a, (function() {
                    return this
                })), s(E, "toString", (function() {
                    return "[object Generator]"
                })), e.keys = function(t) {
                    var e = Object(t),
                        r = [];
                    for (var n in e) r.push(n);
                    return r.reverse(),
                        function t() {
                            for (; r.length;) {
                                var n = r.pop();
                                if (n in e) return t.value = n, t.done = !1, t
                            }
                            return t.done = !0, t
                        }
                }, e.values = C, L.prototype = {
                    constructor: L,
                    reset: function(e) {
                        if (this.prev = 0, this.next = 0, this.sent = this._sent = t, this.done = !1, this.delegate = null, this.method = "next", this.arg = t, this.tryEntries.forEach(P), !e)
                            for (var r in this) "t" === r.charAt(0) && n.call(this, r) && !isNaN(+r.slice(1)) && (this[r] = t)
                    },
                    stop: function() {
                        this.done = !0;
                        var t = this.tryEntries[0].completion;
                        if ("throw" === t.type) throw t.arg;
                        return this.rval
                    },
                    dispatchException: function(e) {
                        if (this.done) throw e;
                        var r = this;

                        function o(n, o) {
                            return u.type = "throw", u.arg = e, r.next = n, o && (r.method = "next", r.arg = t), !!o
                        }
                        for (var i = this.tryEntries.length - 1; i >= 0; --i) {
                            var a = this.tryEntries[i],
                                u = a.completion;
                            if ("root" === a.tryLoc) return o("end");
                            if (a.tryLoc <= this.prev) {
                                var c = n.call(a, "catchLoc"),
                                    s = n.call(a, "finallyLoc");
                                if (c && s) {
                                    if (this.prev < a.catchLoc) return o(a.catchLoc, !0);
                                    if (this.prev < a.finallyLoc) return o(a.finallyLoc)
                                } else if (c) {
                                    if (this.prev < a.catchLoc) return o(a.catchLoc, !0)
                                } else {
                                    if (!s) throw Error("try statement without catch or finally");
                                    if (this.prev < a.finallyLoc) return o(a.finallyLoc)
                                }
                            }
                        }
                    },
                    abrupt: function(t, e) {
                        for (var r = this.tryEntries.length - 1; r >= 0; --r) {
                            var o = this.tryEntries[r];
                            if (o.tryLoc <= this.prev && n.call(o, "finallyLoc") && this.prev < o.finallyLoc) {
                                var i = o;
                                break
                            }
                        }
                        i && ("break" === t || "continue" === t) && i.tryLoc <= e && e <= i.finallyLoc && (i = null);
                        var a = i ? i.completion : {};
                        return a.type = t, a.arg = e, i ? (this.method = "next", this.next = i.finallyLoc, v) : this.complete(a)
                    },
                    complete: function(t, e) {
                        if ("throw" === t.type) throw t.arg;
                        return "break" === t.type || "continue" === t.type ? this.next = t.arg : "return" === t.type ? (this.rval = this.arg = t.arg, this.method = "return", this.next = "end") : "normal" === t.type && e && (this.next = e), v
                    },
                    finish: function(t) {
                        for (var e = this.tryEntries.length - 1; e >= 0; --e) {
                            var r = this.tryEntries[e];
                            if (r.finallyLoc === t) return this.complete(r.completion, r.afterLoc), P(r), v
                        }
                    },
                    catch: function(t) {
                        for (var e = this.tryEntries.length - 1; e >= 0; --e) {
                            var r = this.tryEntries[e];
                            if (r.tryLoc === t) {
                                var n = r.completion;
                                if ("throw" === n.type) {
                                    var o = n.arg;
                                    P(r)
                                }
                                return o
                            }
                        }
                        throw Error("illegal catch attempt")
                    },
                    delegateYield: function(e, r, n) {
                        return this.delegate = {
                            iterator: C(e),
                            resultName: r,
                            nextLoc: n
                        }, "next" === this.method && (this.arg = t), v
                    }
                }, e
            }

            function Pn(t, e, r, n, o, i, a) {
                try {
                    var u = t[i](a),
                        c = u.value
                } catch (t) {
                    return void r(t)
                }
                u.done ? e(c) : Promise.resolve(c).then(n, o)
            }

            function Ln(t) {
                return function() {
                    var e = this,
                        r = arguments;
                    return new Promise((function(n, o) {
                        var i = t.apply(e, r);

                        function a(t) {
                            Pn(i, n, o, a, u, "next", t)
                        }

                        function u(t) {
                            Pn(i, n, o, a, u, "throw", t)
                        }
                        a(void 0)
                    }))
                }
            }(0, n.G)((function() {
                var t = document.querySelector(".exit-survey-container");
                if (null !== t) {
                    var e = t.querySelector(".send-feedback"),
                        r = t.querySelectorAll("input[type=radio]");
                    e.addEventListener("click", (function() {
                        var t = Array.from(r).filter((function(t) {
                            return t.checked
                        })).map((function(t) {
                            return t.value.toLowerCase()
                        }));
                        YNABAnalytics.trackEvent(i.oA.Subscription_SelectedCancellationReason, jn({}, i.I_.ExitSurveyOption, t.join(", ")))
                    })), r.forEach((function(t) {
                        t.addEventListener("change", (function() {
                            Array.from(r).some((function(t) {
                                return t.checked
                            })) ? e.removeAttribute("disabled") : e.setAttribute("disabled", "disabled")
                        }))
                    }))
                }
            })), (0, n.G)((function() {
                document.addEventListener("click", (function(t) {
                    if (t.target instanceof HTMLElement && t.target.hasAttribute("data-password-toggle")) {
                        var e = t.target.parentNode.previousElementSibling;
                        e.setAttribute("type", "text" == e.getAttribute("type") ? "password" : "text"), e.focus()
                    }
                }))
            })),
            function(t) {
                var e = !1,
                    r = "/support_access",
                    n = "/help/verifications",
                    o = "/sign_in",
                    i = "/sign_up";
                window.KustomerChatWidget = {
                    openChat: function() {
                        window.Kustomer && window.Kustomer.open()
                    }
                };
                var a = function() {
                        e || (e = !0, p())
                    },
                    u = function() {
                        var t = Ln(xn().mark((function t(e) {
                            return xn().wrap((function(t) {
                                for (;;) switch (t.prev = t.next) {
                                    case 0:
                                        return t.next = 2, new Promise((function(t, r) {
                                            var n;
                                            n = e, window.Kustomer.addListener("onConversationCreate", (function(t) {
                                                window.Kustomer.describeConversation({
                                                    conversationId: t.conversationId,
                                                    customAttributes: {
                                                        loggedInAsStr: window.YNAB_CLIENT_CONSTANTS.USER.email,
                                                        loggedInAsTokenStr: n,
                                                        platformStr: "App - Web",
                                                        chatLocationStr: window.YNAB_CLIENT_CONSTANTS.CHAT_LOCATION
                                                    }
                                                }, (function(e, r) {
                                                    if (r) throw new Error("Unable to describe Kustomer Conversation: ".concat(t.id))
                                                }))
                                            })), window.Kustomer.isLoggedIn({
                                                email: window.YNAB_CLIENT_CONSTANTS.USER.email
                                            }, (function(n, o) {
                                                n ? t(!0) : window.Kustomer.login({
                                                    jwtToken: e
                                                }, (function(e) {
                                                    e ? t(e) : r(new Error("Unable to log in user"))
                                                }))
                                            }))
                                        }));
                                    case 2:
                                        return t.abrupt("return", t.sent);
                                    case 3:
                                    case "end":
                                        return t.stop()
                                }
                            }), t)
                        })));
                        return function(e) {
                            return t.apply(this, arguments)
                        }
                    }();

                function c() {
                    if (!s()) {
                        var t = window.Kustomer.getUnreadCount();
                        if (t.total > 0) l(Object.keys(t.conversations).filter((function(e) {
                            return t.conversations[e] > 0
                        })).shift())
                    }
                }

                function s() {
                    var t = window.location.pathname;
                    return !![r, o, i, n].find((function(e) {
                        return t.startsWith(e)
                    }))
                }

                function l(t) {
                    window.Kustomer.openConversationById({
                        conversationId: t
                    }, (function(e, r) {
                        r && setTimeout((function() {
                            window.Kustomer.openConversationById({
                                conversationId: t
                            })
                        }), 2e3)
                    }))
                }
                var f = function(t, e) {
                        var r = document.getElementsByClassName("js-badge")[0];
                        if (r && r.classList) {
                            r.classList.toggle(t, e);
                            var n = r.parentElement,
                                o = r.classList.contains("unread") || r.classList.contains("open");
                            n && n.classList && n.classList.toggle("badged", o)
                        }
                    },
                    d = function() {
                        var t = document.createElement("script");
                        t.src = window.YNAB_CLIENT_CONSTANTS.KUSTOMER_CHAT_WEB_API_URL, t.setAttribute("data-kustomer-api-key", window.YNAB_CLIENT_CONSTANTS.KUSTOMER_CHAT_WEB_API_KEY), window.document.body.appendChild(t)
                    },
                    h = function() {
                        var e = Ln(xn().mark((function e() {
                            return xn().wrap((function(e) {
                                for (;;) switch (e.prev = e.next) {
                                    case 0:
                                        return e.next = 2, new Promise((function(e, r) {
                                            t.ajax({
                                                type: "GET",
                                                url: "/api/v2/user/help_token",
                                                headers: {
                                                    "X-Session-Token": YNAB.getSessionToken(),
                                                    "X-YNAB-Device-Id": YNAB.deviceId()
                                                },
                                                success: function(t) {
                                                    e(t)
                                                },
                                                error: function(t) {
                                                    r(t)
                                                }
                                            })
                                        }));
                                    case 2:
                                        return e.abrupt("return", e.sent);
                                    case 3:
                                    case "end":
                                        return e.stop()
                                }
                            }), e)
                        })));
                        return function() {
                            return e.apply(this, arguments)
                        }
                    }(),
                    p = function() {
                        window.Kustomer && window.Kustomer.start({
                            brandId: window.YNAB_CLIENT_CONSTANTS.KUSTOMER_CHAT_WEB_APP_BRAND_ID,
                            hideChatIcon: !0
                        }, (function() {
                            var t;
                            window.YNAB_CLIENT_CONSTANTS.USER ? (window.YNAB_CLIENT_CONSTANTS.HELP_BUTTON_ENABLED && function() {
                                var t = document.createElement("div");
                                t.classList.add("kustomer-chat-widget");
                                var e = document.createElement("button");
                                e.classList.add("ynab-button", "secondary"), e.innerHTML = '<svg id="icon_sprite_question_mark" viewBox="0 0 14 24" height="24" width="14"><path fill-rule="evenodd" clip-rule="evenodd" d="M8.9689 15.4286C8.9689 15.902 8.57716 16.2857 8.09393 16.2857H6.12523C5.642 16.2857 5.25026 15.902 5.25026 15.4286C5.25026 9.73328 10.172 10.27 10.172 6C10.172 4.5798 8.52704 3.42857 6.83624 3.42857C5.14544 3.42857 3.47301 4.5798 3.47301 6C3.46709 6.48781 3.54397 6.97319 3.7005 7.43631C3.85944 7.88111 3.62021 8.3679 3.16616 8.5236C3.07356 8.55536 2.97614 8.57156 2.87803 8.57152H1.10078C0.706142 8.57253 0.359217 8.31568 0.252493 7.94349C0.0781101 7.31 -0.00670757 6.65608 0.000413846 6C0.000413846 2.68629 3.13413 0 7.00021 0C10.8663 0 14 2.6862 14 6C13.9999 11.5002 8.9689 11.2858 8.9689 15.4286ZM7.00021 18.8571C8.44991 18.8571 9.62513 20.0084 9.62513 21.4286C9.62513 22.8487 8.44991 24 7.00021 24C5.55051 24 4.37529 22.8487 4.37529 21.4286C4.37529 20.0084 5.55054 18.8572 7.00021 18.8571Z"/></svg>', e.ariaLabel = "?";
                                var r = document.createElement("div");
                                r.classList.add("js-badge", "badge"), e.appendChild(r), e.addEventListener("click", Ln(xn().mark((function t() {
                                    var e, r;
                                    return xn().wrap((function(t) {
                                        for (;;) switch (t.prev = t.next) {
                                            case 0:
                                                return t.next = 2, h();
                                            case 2:
                                                return e = t.sent, r = e.token, t.next = 6, u(r);
                                            case 6:
                                                window.Kustomer.open();
                                            case 7:
                                            case "end":
                                                return t.stop()
                                        }
                                    }), t)
                                }))), {
                                    passive: !0
                                }), window.Kustomer.addListener("onUnread", (function(t) {
                                    var e = (t.total || 0) > 0;
                                    f("unread", e), e && !s() && l(t.change.conversationId)
                                })), window.Kustomer.addListener("onClose", (function() {
                                    window.Kustomer.getOpenConversations((function(t) {
                                        f("open", (t.length || 0) > 0)
                                    }))
                                })), window.Kustomer.addListener("onLogin", (function(t) {
                                    c()
                                })), t.appendChild(e), window.document.body.appendChild(t), s() && window.Kustomer.close(), window.Kustomer.getOpenConversations((function(t) {
                                    var e = (t.length || 0) > 0;
                                    f("open", e), c()
                                })), u(window.YNAB_CLIENT_CONSTANTS.USER_HELP_ACCESS_INITIAL_JWT)
                            }(), (t = document.getElementsByClassName("js-contact-us")[0]) && (t.removeAttribute("disabled"), t.classList.remove("disabled"))) : window.Kustomer.logout()
                        }))
                    };
                t((function() {
                    !window.YNAB_CLIENT_CONSTANTS.USER || window.Kustomer || e || (d(), window.addEventListener("kustomerLoaded", (function() {
                        a()
                    }), {
                        passive: !0
                    }))
                }))
            }(O()), (0, n.G)((function() {
                var t;
                null === (t = document.querySelector(".js-canceled-apple-sub")) || void 0 === t || t.addEventListener("change", (function() {
                    var t = document.querySelector(".js-canceled-apple-sub-button");
                    this.checked ? (t.removeAttribute("disabled"), t.classList.remove("disabled")) : (t.setAttribute("disabled", "disabled"), t.classList.add("disabled"))
                }))
            })), (0, n.G)((function() {
                var t = document.querySelector(".js-support-access-confirmation-form button");
                t && "true" === t.dataset.enable && (YNABAnalytics.logoutOfChatWidgetProviders(), YNABAnalytics.logoutAnalytics(), t.removeAttribute("disabled"))
            })),
            function(t) {
                t((function() {
                    var e = t(".invoice-form"),
                        r = e.serialize(),
                        n = t("#invoice-address-submit"),
                        o = t("#invoice-address-clear"),
                        i = t(".invoice-form input[type=text]"),
                        a = i.not(".invoice-form input[name=address_two], input[name=company_name]"),
                        u = i.not(".invoice-form input[name=postal_code]"),
                        c = t(".invoice-form input[name=_method]"),
                        s = t("input[name=address_state]").prop("value"),
                        l = t(".invoice-form .error"),
                        f = function() {
                            return a.filter((function(e, r) {
                                return 0 == t.trim(r.value).length
                            }))
                        },
                        d = function() {
                            "true" == s ? o.prop("disabled", !0) : o.prop("disabled", !1)
                        },
                        h = function() {
                            var e = f().length > 0,
                                r = u.filter((function(e, r) {
                                    return t.trim(r.value).length > 100
                                })).length > 0;
                            (e || r) && n.prop("disabled", !0), r ? l.css("display", "inline-block") : l.css("di}splay", "none")
                        };
                    d(), e.on("input", (function(t) {
                        var i = e.serialize();
                        r != i ? n.prop("disabled", !1) : n.prop("disabled", !0), 0 == f().length && o.prop("disabled", !0), d(), h()
                    })), o.on("click", (function(t) {
                        t.preventDefault(), c.val("delete"), e.trigger("submit"), c.val("put")
                    }))
                }))
            }(O()), (0, n.G)((function() {
                var t;
                (t = o.lg.start()).debug = !1, t.register("copy-link", d), t.register("destroy-otp", w), t.register("disconnect-credential", A), t.register("edit-passwords", Y), t.register("email-confirmation", J), t.register("first-name-form", ot), t.register("gift-purchase", dt), t.register("login", Lt), t.register("new-passwords", Gt), t.register("oauth-access-level", Ht), t.register("otp-form", ee), t.register("purchased-gift-tracker-item", le), t.register("set-wellness-passwords", be), t.register("signup", Le), t.register("tooltip", Ye), t.register("user-settings", $e)
            }))
        },
        1232: function(t, e, r) {
            "use strict";
            r.d(e, {
                s: function() {
                    return n
                }
            });
            var n = function(t) {
                return t.Email = "email", t.Google = "google", t.Apple = "apple", t
            }({})
        },
        9221: function(t, e, r) {
            "use strict";
            r.d(e, {
                $S: function() {
                    return k
                },
                R7: function() {
                    return v
                },
                Y4: function() {
                    return a
                },
                ls: function() {
                    return y
                },
                md: function() {
                    return O
                },
                qD: function() {
                    return w
                },
                u0: function() {
                    return m
                },
                wM: function() {
                    return g
                }
            });
            var n, o = r(4692),
                i = r.n(o),
                a = "js-disabled",
                u = "sso-button__inner",
                c = "sso-button__label",
                s = "sso-button__iframe-cover",
                l = "sso-button--apple",
                f = "sso-button--google",
                d = !1,
                h = !1,
                p = !0;

            function y() {
                return i()(".".concat(l))
            }

            function v() {
                var t = y();
                if (t.length > 0) {
                    if (t.find(".".concat(c)).text(t.data("label")), t.data("trigger-action")) {
                        var e = {
                            email: t.data("email"),
                            error: t.data("error"),
                            name: t.data("name"),
                            state: t.data("state"),
                            token: t.data("token"),
                            errorMessage: null
                        };
                        e.errorMessage = "user_cancelled_authorize" == e.error ? "You canceled your request to Sign In with Apple." : e.error, t.trigger("apple:ready", e)
                    }
                    d = !0, T(n)
                }
                return t
            }

            function m() {
                return i()(".".concat(f))
            }

            function g() {
                var t = m();
                return window.GoogleIdentity && (window.GoogleIdentity.onUserIdentified((function(e) {
                    t.trigger("googleIdentified:success", {
                        provider: "google",
                        token: e
                    })
                })), window.GoogleIdentity.onIdentityServicesInitialized((function(e) {
                    var r = t.find(".".concat(f, " .").concat(u));
                    if (e) w(r.get(0)), t.trigger("googleIdentified:error", t.data("loading-error-message"));
                    else {
                        var o = t.data("width"),
                            i = t.parent();
                        window.GoogleIdentity.renderButton(t.get(0), {
                            width: o || "".concat(Math.round(i.outerWidth()), "px")
                        }), o || window.addEventListener("resize", (function() {
                            var t = "".concat(Math.round(i.outerWidth()), "px"),
                                e = m();
                            window.GoogleIdentity.renderButton(e.get(0), {
                                width: t
                            })
                        })), t.trigger("googleIdentified:ready"), h = !0, T(n)
                    }
                }))), t
            }

            function b(t) {
                if (t instanceof HTMLButtonElement) t.disabled = !1;
                else if (t instanceof HTMLElement && (t.classList.remove(a), t.classList.contains(f))) {
                    var e = t.querySelector('[role="button"]');
                    e && e instanceof HTMLElement && e.classList.remove(a)
                }
            }

            function w(t, e) {
                if (t instanceof HTMLButtonElement) t.disabled = !0;
                else if (t instanceof HTMLElement) {
                    t.classList.add(a);
                    var r = function(r) {
                        t.classList.contains(a) && (r.preventDefault(), e && e.reportValidity())
                    };
                    if (t.removeEventListener("click", r), t.addEventListener("click", r), t.classList.contains(f)) {
                        var n = t.querySelector('[role="button"]');
                        n && n instanceof HTMLElement && n.classList.add(a)
                    }
                }
            }

            function k(t, e) {
                i()(t).find(".".concat(c)).text(e)
            }

            function O(t, e) {
                p = t, e && (n = e), T(n)
            }

            function E(t, e) {
                ! function(t, e) {
                    var r = t.querySelector(".".concat(s));
                    r || ((r = document.createElement("div")).className = s, r.addEventListener("click", (function(t) {
                        t.preventDefault(), e && e.reportValidity()
                    })), t.prepend(r))
                }(t, e)
            }

            function T(t) {
                var e = t || n;
                if (d) {
                    var r = y().get(0);
                    r && (p ? b(r) : w(r, e))
                }
                if (h) {
                    var o = m().get(0);
                    o && (E(o, e), p ? b(o) : w(o, e))
                }
            }
        },
        2335: function(t, e, r) {
            "use strict";
            r.d(e, {
                Gq: function() {
                    return s
                },
                Jd: function() {
                    return h
                },
                PB: function() {
                    return u
                },
                Rx: function() {
                    return m
                },
                Zh: function() {
                    return y
                },
                df: function() {
                    return p
                },
                ky: function() {
                    return v
                },
                qc: function() {
                    return c
                }
            });
            var n = r(4692),
                o = r.n(n),
                i = r(1232),
                a = r(9221);

            function u(t, e, r) {
                t.find(e).find(".error").html(r).show().end().find("input").addClass("error")
            }

            function c(t) {
                t.find("input.error").removeClass("error").end().find(".error").hide()
            }
            var s = "There was an error with the server, please try again later.",
                l = "authentications-sso-button__error",
                f = "".concat(l, "--apple"),
                d = "".concat(l, "--google");

            function h() {
                o()(".".concat(f, ", .").concat(d)).hide()
            }

            function p(t, e) {
                var r = "apple" === t ? f : d;
                return o()(".".concat(r)).html(e).fadeIn("fast")
            }

            function y(t, e) {
                o()(t).on("apple:ready", (function(r, n) {
                    n.error ? p(i.s.Apple, n.errorMessage) : e({
                        provider: i.s.Apple,
                        provider_user_name: n.name,
                        provider_token: n.token
                    }, t)
                })), (0, a.R7)()
            }

            function v(t, e) {
                o()(t).on("googleIdentified:success", (function(r, n) {
                    e({
                        provider: i.s.Google,
                        provider_token: n.token
                    }, t)
                })).on("googleIdentified:error", (function(t, e) {
                    p(i.s.Google, e)
                })), (0, a.wM)()
            }

            function m(t, e) {
                if (403 !== e.status) return t.find(".js-form-email").length > 0 ? u(t, ".js-form-email", s) : u(t, ".js-form-password", s);
                window.location.reload()
            }
        },
        2726: function() {
            function t(t, r) {
                var n = "undefined" != typeof Symbol && t[Symbol.iterator] || t["@@iterator"];
                if (!n) {
                    if (Array.isArray(t) || (n = function(t, r) {
                            if (t) {
                                if ("string" == typeof t) return e(t, r);
                                var n = {}.toString.call(t).slice(8, -1);
                                return "Object" === n && t.constructor && (n = t.constructor.name), "Map" === n || "Set" === n ? Array.from(t) : "Arguments" === n || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n) ? e(t, r) : void 0
                            }
                        }(t)) || r && t && "number" == typeof t.length) {
                        n && (t = n);
                        var o = 0,
                            i = function() {};
                        return {
                            s: i,
                            n: function() {
                                return o >= t.length ? {
                                    done: !0
                                } : {
                                    done: !1,
                                    value: t[o++]
                                }
                            },
                            e: function(t) {
                                throw t
                            },
                            f: i
                        }
                    }
                    throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")
                }
                var a, u = !0,
                    c = !1;
                return {
                    s: function() {
                        n = n.call(t)
                    },
                    n: function() {
                        var t = n.next();
                        return u = t.done, t
                    },
                    e: function(t) {
                        c = !0, a = t
                    },
                    f: function() {
                        try {
                            u || null == n.return || n.return()
                        } finally {
                            if (c) throw a
                        }
                    }
                }
            }

            function e(t, e) {
                (null == e || e > t.length) && (e = t.length);
                for (var r = 0, n = Array(e); r < e; r++) n[r] = t[r];
                return n
            }

            function r(t, e) {
                for (var r = 0; r < e.length; r++) {
                    var o = e[r];
                    o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(t, n(o.key), o)
                }
            }

            function n(t) {
                var e = function(t, e) {
                    if ("object" != typeof t || !t) return t;
                    var r = t[Symbol.toPrimitive];
                    if (void 0 !== r) {
                        var n = r.call(t, e || "default");
                        if ("object" != typeof n) return n;
                        throw new TypeError("@@toPrimitive must return a primitive value.")
                    }
                    return ("string" === e ? String : Number)(t)
                }(t, "string");
                return "symbol" == typeof e ? e : e + ""
            }
            YNAB.FormDirtyTrackingAllFieldsPresent = function() {
                function e(t, r) {
                    ! function(t, e) {
                        if (!(t instanceof e)) throw new TypeError("Cannot call a class as a function")
                    }(this, e), this.form = void 0, this.changes = void 0, this.dirty = void 0, this.pickInputs = void 0, this.textInputs = void 0, this.fields = void 0, this.submit = void 0, this.callback = void 0, t.length && (this.form = t, this.callback = r, this.changes = {}, this.dirty = !1, this.pickInputs = "input[type=radio], select", this.textInputs = "input[type=text], input[type=password], input[type=email], textarea", this.fields = this.form.find("".concat(this.textInputs, ", ").concat(this.pickInputs)), this.submit = this.form.find("button[type=submit]"), this.addEventListeners(), this.initializeChanges())
                }
                var n, o, i;
                return n = e, o = [{
                    key: "addEventListeners",
                    value: function() {
                        this.form.on("change", this.pickInputs, this.elementChanged.bind(this)), this.form.on("change keyup", this.textInputs, this.elementChanged.bind(this))
                    }
                }, {
                    key: "checkDirtyChanged",
                    value: function() {
                        var t = arguments.length > 0 && void 0 !== arguments[0] && arguments[0],
                            e = this.formChanged();
                        (t || e != this.dirty) && (this.dirty = e, this.dirtyChanged())
                    }
                }, {
                    key: "dirtyChanged",
                    value: function() {
                        this.submit.prop("disabled", !this.dirty), this.callback && this.callback(this)
                    }
                }, {
                    key: "elementChanged",
                    value: function(t) {
                        this.trackInputChanges(t.currentTarget), this.checkDirtyChanged()
                    }
                }, {
                    key: "markElementChanged",
                    value: function(t) {
                        this.setChanged(this.inputKey(t)), this.checkDirtyChanged()
                    }
                }, {
                    key: "initializeChanges",
                    value: function() {
                        var e, r = t(this.fields);
                        try {
                            for (r.s(); !(e = r.n()).done;) {
                                var n = e.value;
                                this.trackInputChanges(n)
                            }
                        } catch (o) {
                            r.e(o)
                        } finally {
                            r.f()
                        }
                        this.checkDirtyChanged(!0)
                    }
                }, {
                    key: "inputKey",
                    value: function(t) {
                        return t.name || t.id
                    }
                }, {
                    key: "fieldChanged",
                    value: function(t) {
                        return !!$.trim($(t).val().toString())
                    }
                }, {
                    key: "formChanged",
                    value: function() {
                        return this.numberOfFields() == this.numberOfChanges()
                    }
                }, {
                    key: "numberOfChanges",
                    value: function() {
                        return this.objectSize(this.changes)
                    }
                }, {
                    key: "numberOfFields",
                    value: function() {
                        var e, r = {},
                            n = t(this.fields);
                        try {
                            for (n.s(); !(e = n.n()).done;) {
                                var o = e.value;
                                r[this.inputKey(o)] = !0
                            }
                        } catch (i) {
                            n.e(i)
                        } finally {
                            n.f()
                        }
                        return this.objectSize(r)
                    }
                }, {
                    key: "objectSize",
                    value: function(t) {
                        return Object.keys(t).length
                    }
                }, {
                    key: "setChanged",
                    value: function(t) {
                        this.changes[t] = "changed"
                    }
                }, {
                    key: "trackInputChanges",
                    value: function(t) {
                        var e = this.inputKey(t);
                        this.fieldChanged(t) ? this.setChanged(e) : delete this.changes[e]
                    }
                }], o && r(n.prototype, o), i && r(n, i), Object.defineProperty(n, "prototype", {
                    writable: !1
                }), e
            }()
        },
        9117: function() {
            YNAB.route("otps#create", "otps#new", (function(t) {
                var e = document.querySelector("label.error");
                e && e.scrollIntoView();
                var r = null;
                document.querySelectorAll(".copy-button").forEach((function(t) {
                    t.addEventListener("click", (function(t) {
                        if (t.preventDefault(), !r) {
                            var e = this.querySelector("input"),
                                n = this.querySelector("span");
                            if (!e || !n) throw new Error("copy-button must have an input and span tag.");
                            var o = n.dataset.copied,
                                i = n.textContent;
                            e.select(), YNAB.copyTextToClipboard(e), this.classList.add("copied"), n.textContent = o, r = setTimeout(function() {
                                this.classList.remove("copied"), n.textContent = i, r = null
                            }.bind(this), 2e3)
                        }
                    }))
                })), document.querySelectorAll(".collapse-button").forEach((function(t) {
                    var e = t.querySelector("button");
                    null === e || void 0 === e || e.addEventListener("click", (function(e) {
                        e.preventDefault(), t.classList.toggle("expanded")
                    }))
                }))
            }))
        },
        1989: function() {
            ! function(t) {
                t((function() {
                    new YNAB.FormDirtyTrackingAllFieldsPresent(t(".ynab4-upgrade-form"))
                }))
            }(jQuery)
        }
    },
    function(t) {
        t.O(0, [692, 418, 519, 956, 891, 576, 960, 504, 953, 421, 470], (function() {
            return e = 8325, t(t.s = e);
            var e
        }));
        t.O()
    }
]);
//# sourceMappingURL=application-85d5583dd35ee3589d90.js.map