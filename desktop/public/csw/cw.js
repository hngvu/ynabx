(() => {
    var r = {
        e: "BdA=46SpcKItaBeUyPpsbPyo02rbn7y/fZ5huW8v6K6Dc8Ji9N41rGYvTeNaOios+heTjjtKjbu8a/AL/Pda/5b438qVP+p68EEqViOOYXP6wv6K6DczHoyBbe4d0lIvnCGf3xj0ZAuCGWvoPOKLrof9bXxC+8DYWA12YjHHaC5sRjjvSyJianYJ/rsbkZJDsbmgnxHrW569RyXoLDCejkR9p5PRxDyH38dE801GQLhx17RsZunuPHXgFp+a",
        t: {
            0: {
                0: {
                    0: {
                        0: "b",
                        1: "f"
                    },
                    1: {
                        0: {
                            0: "R",
                            1: {
                                0: "u",
                                1: "c"
                            }
                        },
                        1: {
                            0: {
                                0: "I",
                                1: "N"
                            },
                            1: {
                                0: "Q",
                                1: "E"
                            }
                        }
                    }
                },
                1: {
                    0: {
                        0: {
                            0: {
                                0: {
                                    0: "o",
                                    1: "S"
                                },
                                1: {
                                    0: "B",
                                    1: "_"
                                }
                            },
                            1: {
                                0: {
                                    0: {
                                        0: "4",
                                        1: "6"
                                    },
                                    1: {
                                        0: "U",
                                        1: "J"
                                    }
                                },
                                1: {
                                    0: {
                                        0: "O",
                                        1: "T"
                                    },
                                    1: {
                                        0: "Y",
                                        1: "H"
                                    }
                                }
                            }
                        },
                        1: "a"
                    },
                    1: "r"
                }
            },
            1: {
                0: {
                    0: {
                        0: "n",
                        1: {
                            0: "v",
                            1: "h"
                        }
                    },
                    1: {
                        0: "g",
                        1: {
                            0: {
                                0: "%",
                                1: "<"
                            },
                            1: {
                                0: "q",
                                1: "`"
                            }
                        }
                    }
                },
                1: {
                    0: {
                        0: {
                            0: {
                                0: "~",
                                1: "@"
                            },
                            1: {
                                0: {
                                    0: {
                                        0: "F",
                                        1: "X"
                                    },
                                    1: "l"
                                },
                                1: "z"
                            }
                        },
                        1: "e"
                    },
                    1: {
                        0: {
                            0: "t",
                            1: {
                                0: "s",
                                1: {
                                    0: "Z",
                                    1: "j"
                                }
                            }
                        },
                        1: {
                            0: {
                                0: {
                                    0: "P",
                                    1: "k"
                                },
                                1: {
                                    0: "A",
                                    1: {
                                        0: "C",
                                        1: "i"
                                    }
                                }
                            },
                            1: {
                                0: "y",
                                1: "p"
                            }
                        }
                    }
                }
            }
        }
    };

    function f(r, n) {
        var e = r.charCodeAt();
        return e >= 65 && e <= 90 ? String.fromCharCode((e - 65 + n) % 26 + 65) : e >= 97 && e <= 122 ? String.fromCharCode((e - 97 + n) % 26 + 97) : 32 === e ? String.fromCharCode(e + 1) : 33 === e ? String.fromCharCode(e - 1) : r
    }

    function n(r, n) {
        for (var e = "", t = n % 26, s = 0; s < r.length; s++) e +=
            f(r.charAt(s), t);
        return e
    }

    function e(r, n) {
        for (var e = "", t = n, s = 0; s < r.length; s++) t = t[r.charAt(s)], "string" === typeof t && (e += t, t = n);
        return e
    }

    function o(r) {
        var n, e = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",
            t = "",
            s = r.length;
        for (r = r.replace(/=+$/, ""), n = 0; n < s; n += 4) {
            var f = e.indexOf(r.charAt(n)) << 18,
                o = e.indexOf(r.charAt(n + 1)) << 12,
                c = e.indexOf(r.charAt(n + 2)) << 6,
                i = e.indexOf(r.charAt(n + 3)),
                f = f | o | (c < 0 ? 0 : c) | (i < 0 ? 0 : i);
            t += String.fromCharCode(f >> 16 & 255), c >= 0 && (t += String.fromCharCode(f >> 8 & 255)),
                i >= 0 && (t += String.fromCharCode(255 & f))
        }
        return t
    }

    function t(r) {
        for (var n = "", e = o(r.substr(0, 4)), e = e.charCodeAt(0) << 8 | e.charCodeAt(1), t = o(r.substr(4)), s = 0; s < t.length; s++) {
            var f = t.charCodeAt(s).toString(2);
            while (f.length < 8) f = "0" + f;
            n += f
        }
        return n.slice(0, e)
    }
    var s = e(t(r.e), r.t).split(/[@%<`~]/);

    function c(r) {
        return n(s[r], 13)
    }
    const i = 0,
        a = 1,
        u = 2,
        l = 3,
        v = 4,
        y = 5,
        g = 6,
        b = 7,
        S = 8,
        j = 9,
        A = 2,
        P = 2,
        h = 0,
        w = void h,
        p = null,
        B = 255,
        D = c(0),
        E = (r, n, e) => {
            try {
                if (r)
                    if (D in r) {
                        const t = r[D](n);
                        t.then(r => {
                            e(r)
                        }, r => {
                            e(w)
                        })
                    } else e(p);
                else e(p),
                    void 0
            } catch (r) {
                e(w)
            }
        },
        H = r => r || w,
        d = r => r.navigator,
        G = r => r.toUpperCase(),
        L = c(1),
        W = (r, n) => r[L](n),
        k = r => G(W(r, h)) + r.slice(1),
        x = (r, n) => r + k(n),
        q = (r, n) => r.indexOf(n) > -1,
        I = r => {
            const n = (r & B).toString(16);
            return ("0" + n).slice(-2)
        },
        N = r => (new Date(r, 1, 1, h, h, 1)).toUTCString(),
        T = c(2),
        m = c(3),
        z = c(4),
        F = c(5),
        C = c(6),
        Q = c(7),
        U = c(8),
        V = c(9),
        M = c(10),
        $ = c(11),
        r1 = c(12),
        n1 = c(13),
        e1 = r => d(r)[m],
        R = r => d(r)[z],
        t1 = r => {
            const n = d(r);
            return n[C] || n[x("user", C)] || n[x("browser", C)] || n[x("system", C)]
        },
        s1 = r => H(d(r)[Q]),
        f1 = r => H(d(r)[T]),
        o1 =
        r => d(r)[F],
        c1 = r => d(r)[C + "s"] || [],
        i1 = (Array(1024).join("x"), c(14)),
        a1 = (N(1970), I(13), c(15)),
        Y = c(16),
        u1 = c(17),
        l1 = 1,
        v1 = 3,
        y1 = 5,
        J = c(18),
        K = c(19),
        g1 = c(20),
        O = c(21),
        X = c(22),
        Z = 256,
        b1 = c(23),
        _ = c(24),
        S1 = c(25);
    self[u1] = async r => {
        try {
            const n = new Array(10);
            n[i] = l1, n[a] = !0, n[u] = R(self), n[l] = e1(self), n[v] = f1(self), n[y] = s1(self), n[g] = t1(self), n[b] = c1(self);
            try {
                const e = new self[a1](Z, Z),
                    t = e[S1](J.toLowerCase());
                if (t)
                    if (q(R(self), i1)) {
                        const s = t[_](t[X]),
                            f = t[_](t[O]);
                        n[S] = f, n[j] = s
                    } else {
                        const o = t[b1](J + "_" + g1);
                        o && (n[S] =
                            t[_](o[K + "_" + O + "_" + J]), n[j] = t[_](o[K + "_" + X + "_" + J]))
                    }
            } catch (r) {}
            self[Y](n), E(o1(self), [U, V, M, $, r1, n1], r => {
                const n = new Array(3);
                n[i] = v1, n[a] = !1, n[A] = r, self[Y](n)
            })
        } catch (r) {
            const c = new Array(3);
            c[i] = y1, c[a] = !1, c[P] = r, self[Y](c)
        }
    }
})();