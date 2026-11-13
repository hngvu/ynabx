const __vite__mapDeps = (
  i,
  m = __vite__mapDeps,
  d = m.f ||
    (m.f = [
      "assets/push-manager-factory-CQp_9BCr.js",
      "assets/rolldown-runtime-DEpHKc_W.js",
      "assets/refresh-feature-flags-Bz6iwnyb.js",
    ])
) => i.map((i) => d[i]);
import { n as t } from "./rolldown-runtime-DEpHKc_W.js";
import { n as e, t as s } from "./preload-helper-CEmPa-0p.js";
var i,
  n,
  r,
  o,
  a,
  u,
  l,
  h,
  c,
  d,
  f,
  g,
  p,
  m,
  b,
  v,
  y,
  E,
  w,
  C,
  S,
  O,
  _,
  T,
  N,
  A,
  I,
  k,
  B,
  D,
  x,
  R,
  P,
  L,
  $,
  U,
  F,
  M,
  j,
  z,
  q,
  J,
  H,
  V,
  G,
  X,
  K,
  W,
  Q,
  Z,
  Y,
  tt,
  et,
  st,
  it,
  nt,
  rt,
  ot,
  at,
  ut,
  lt,
  ht,
  ct,
  dt,
  ft,
  gt,
  pt,
  mt,
  bt,
  vt,
  yt,
  Et,
  wt,
  Ct,
  St,
  Ot,
  _t,
  Tt,
  Nt,
  At,
  It,
  kt,
  Bt,
  Dt,
  xt,
  Rt,
  Pt,
  Lt,
  $t,
  Ut;
function Ft() {
  return (Ft = t(() => {
    i = {
      init: function (t) {
        (void 0 === t && void 0 !== i.zg) || (i.zg = !!t), i.l || (i.l = !0);
      },
      destroy: function () {
        (i.l = !1), (i.zg = void 0), (i.vd = void 0);
      },
      setLogger: function (t) {
        "function" == typeof t
          ? (i.init(), (i.vd = t))
          : i.info("Ignoring setLogger call since logger is not a function");
      },
      toggleLogging: function () {
        i.init(),
          i.zg
            ? (console.log("Disabling Braze logging"), (i.zg = !1))
            : (console.log("Enabled Braze logging"), (i.zg = !0));
      },
      info: function (t) {
        if (i.zg) {
          const e = "Braze: " + t;
          null != i.vd ? i.vd(e) : console.log(e);
        }
      },
      warn: function (t) {
        if (i.zg) {
          const e = "Braze SDK Warning: " + t + " (v5.9.0)";
          null != i.vd ? i.vd(e) : console.warn(e);
        }
      },
      error: function (t) {
        if (i.zg) {
          const e = "Braze SDK Error: " + t + " (v5.9.0)";
          null != i.vd ? i.vd(e) : console.error(e);
        }
      },
    };
  }))();
}
function Mt() {
  return (Mt = t(() => {
    (n = {
      CustomEvent: "ce",
      Pr: "p",
      bc: "pc",
      Ac: "ca",
      Su: "i",
      qu: "ie",
      ts: "cci",
      rs: "ccic",
      Mt: "ccc",
      Wt: "ccd",
      Fl: "ss",
      Dl: "se",
      Ki: "si",
      Li: "sc",
      Qi: "sbc",
      Mc: "sfe",
      Do: "iec",
      vc: "lr",
      fc: "uae",
      ss: "ci",
      Ot: "cc",
      yc: "lcaa",
      kc: "lcar",
      Hn: "inc",
      On: "add",
      Gn: "rem",
      $n: "set",
      Bn: "ncam",
      jc: "sgu",
      yr: "ffi",
      ro: "bi",
      ct: "bc",
    }),
      (r = { Fr: "feed_displayed", Sc: "content_cards_displayed" });
  }))();
}
function jt() {
  return (jt = t(() => {
    o = {
      ce: function () {
        const t = (t = !1) => {
          const e = (Math.random().toString(16) + "000000000").substr(2, 8);
          return t ? "-" + e.substr(0, 4) + "-" + e.substr(4, 4) : e;
        };
        return t() + t(!0) + t(!0) + t();
      },
    };
  }))();
}
function zt() {
  return (zt = t(() => {
    (a = class {
      constructor(t, e) {
        (this.database = t),
          (this.vd = e),
          (this.parent = "undefined" == typeof window ? self : window),
          (this.database = t),
          (this.vd = e);
      }
      Dd() {
        if ("indexedDB" in this.parent) return this.parent.indexedDB;
      }
      isSupported() {
        var t;
        try {
          if (null == this.Dd()) return !1;
          {
            const e =
              null === (t = this.Dd()) || void 0 === t
                ? void 0
                : t.open("Braze IndexedDB Support Test");
            if (
              (e &&
                ((e.onupgradeneeded = () => e.result.close()),
                (e.onsuccess = () => e.result.close())),
              "undefined" != typeof window)
            ) {
              const t = window,
                e = t.chrome || t.browser || t.pd;
              if (e && e.runtime && e.runtime.id)
                return (
                  this.vd.info(
                    "Not using IndexedDB for storage because we are running inside an extension"
                  ),
                  !1
                );
            }
            return !0;
          }
        } catch (t) {
          return (
            this.vd.info(
              "Not using IndexedDB for storage due to following error: " + t
            ),
            !1
          );
        }
      }
      Bd(t, e) {
        var s;
        const i =
          null === (s = this.Dd()) || void 0 === s
            ? void 0
            : s.open(this.database.Sd, this.database.VERSION);
        if (null == i) return "function" == typeof e && e(), !1;
        const n = this;
        return (
          (i.onupgradeneeded = (t) => {
            var e;
            n.vd.info(
              "Upgrading indexedDB " +
                n.database.Sd +
                " to v" +
                n.database.VERSION +
                "..."
            );
            const s =
              null === (e = t.target) || void 0 === e ? void 0 : e.result;
            for (const i in n.database.Ms) {
              const t = i;
              n.database.Ms.hasOwnProperty(i) &&
                !s.objectStoreNames.contains(n.database.Ms[t]) &&
                s.createObjectStore(n.database.Ms[t]);
            }
          }),
          (i.onsuccess = (s) => {
            var i;
            const r =
              null === (i = s.target) || void 0 === i ? void 0 : i.result;
            (r.onversionchange = () => {
              r.close(),
                "function" == typeof e && e(),
                n.vd.error(
                  "Needed to close the database unexpectedly because of an upgrade in another tab"
                );
            }),
              t(r);
          }),
          (i.onerror = (t) => {
            var s;
            const i = t;
            return (
              n.vd.info(
                "Could not open indexedDB " +
                  n.database.Sd +
                  " v" +
                  n.database.VERSION +
                  ": " +
                  (null === (s = i.target) || void 0 === s
                    ? void 0
                    : s.errorCode)
              ),
              "function" == typeof e && e(),
              !0
            );
          }),
          !0
        );
      }
      setItem(t, e, s, i, n) {
        if (!this.isSupported()) return "function" == typeof n && n(), !1;
        const r = this;
        return this.Bd((o) => {
          if (!o.objectStoreNames.contains(t))
            return (
              r.vd.error(
                "Could not store object " +
                  e +
                  " in " +
                  t +
                  " on indexedDB " +
                  r.database.Sd +
                  " - " +
                  t +
                  " is not a valid objectStore"
              ),
              "function" == typeof n && n(),
              void o.close()
            );
          const a = o.transaction([t], "readwrite");
          a.oncomplete = () => o.close();
          const u = a.objectStore(t).put(s, e);
          (u.onerror = () => {
            r.vd.error(
              "Could not store object " +
                e +
                " in " +
                t +
                " on indexedDB " +
                r.database.Sd
            ),
              "function" == typeof n && n();
          }),
            (u.onsuccess = () => {
              "function" == typeof i && i();
            });
        }, n);
      }
      getItem(t, e, s) {
        if (!this.isSupported()) return !1;
        const i = this;
        return this.Bd((n) => {
          if (!n.objectStoreNames.contains(t))
            return (
              i.vd.error(
                "Could not retrieve object " +
                  e +
                  " in " +
                  t +
                  " on indexedDB " +
                  i.database.Sd +
                  " - " +
                  t +
                  " is not a valid objectStore"
              ),
              void n.close()
            );
          const r = n.transaction([t], "readonly");
          r.oncomplete = () => n.close();
          const o = r.objectStore(t).get(e);
          (o.onerror = () => {
            i.vd.error(
              "Could not retrieve object " +
                e +
                " in " +
                t +
                " on indexedDB " +
                i.database.Sd
            );
          }),
            (o.onsuccess = (t) => {
              var e;
              const i =
                null === (e = t.target) || void 0 === e ? void 0 : e.result;
              null != i && s(i);
            });
        });
      }
      cr(t, e, s) {
        if (!this.isSupported()) return "function" == typeof s && s(), !1;
        const i = this;
        return this.Bd((n) => {
          if (!n.objectStoreNames.contains(t))
            return (
              i.vd.error(
                "Could not retrieve last record from " +
                  t +
                  " on indexedDB " +
                  i.database.Sd +
                  " - " +
                  t +
                  " is not a valid objectStore"
              ),
              "function" == typeof s && s(),
              void n.close()
            );
          const r = n.transaction([t], "readonly");
          r.oncomplete = () => n.close();
          const o = r.objectStore(t).openCursor(null, "prev");
          (o.onerror = () => {
            i.vd.error(
              "Could not open cursor for " +
                t +
                " on indexedDB " +
                i.database.Sd
            ),
              "function" == typeof s && s();
          }),
            (o.onsuccess = (t) => {
              var i;
              const n =
                null === (i = t.target) || void 0 === i ? void 0 : i.result;
              null != n && null != n.value && null != n.key
                ? e(n.key, n.value)
                : "function" == typeof s && s();
            });
        }, s);
      }
      ge(t, e) {
        if (!this.isSupported()) return !1;
        const s = this;
        return this.Bd((i) => {
          if (!i.objectStoreNames.contains(t))
            return (
              s.vd.error(
                "Could not delete record " +
                  e +
                  " from " +
                  t +
                  " on indexedDB " +
                  s.database.Sd +
                  " - " +
                  t +
                  " is not a valid objectStore"
              ),
              void i.close()
            );
          const n = i.transaction([t], "readwrite");
          (n.oncomplete = () => i.close()),
            (n.objectStore(t).delete(e).onerror = () => {
              s.vd.error(
                "Could not delete record " +
                  e +
                  " from " +
                  t +
                  " on indexedDB " +
                  s.database.Sd
              );
            });
        });
      }
      Ns(t, e) {
        if (!this.isSupported()) return !1;
        const s = this;
        return this.Bd((i) => {
          if (!i.objectStoreNames.contains(t))
            return (
              s.vd.error(
                "Could not retrieve objects from " +
                  t +
                  " on indexedDB " +
                  s.database.Sd +
                  " - " +
                  t +
                  " is not a valid objectStore"
              ),
              void i.close()
            );
          const n = i.transaction([t], "readwrite");
          n.oncomplete = () => i.close();
          const r = n.objectStore(t),
            o = r.openCursor(),
            a = [];
          (o.onerror = () => {
            a.length > 0
              ? (s.vd.info(
                  "Cursor closed midway through for " +
                    t +
                    " on indexedDB " +
                    s.database.Sd
                ),
                e(a))
              : s.vd.error(
                  "Could not open cursor for " +
                    t +
                    " on indexedDB " +
                    s.database.Sd
                );
          }),
            (o.onsuccess = (t) => {
              var s;
              const i =
                null === (s = t.target) || void 0 === s ? void 0 : s.result;
              null != i
                ? (null != i.value &&
                    null != i.key &&
                    (r.delete(i.key).onsuccess = () => {
                      a.push(i.value);
                    }),
                  "function" == typeof i.continue && i.continue())
                : a.length > 0 && e(a);
            });
        });
      }
      clearData() {
        if (!this.isSupported()) return !1;
        const t = [];
        for (const s in this.database.Ms) {
          const e = s;
          this.database.Ms.hasOwnProperty(s) &&
            this.database.Ms[e] !== this.database.Ms.pe &&
            t.push(this.database.Ms[e]);
        }
        const e = this;
        return this.Bd(function (s) {
          const i = s.transaction(t, "readwrite");
          i.oncomplete = () => s.close();
          for (let n = 0; n < t.length; n++) {
            const s = t[n];
            i.objectStore(s).clear().onerror = function () {
              e.vd.error(
                "Could not clear " +
                  this.source.name +
                  " on indexedDB " +
                  e.database.Sd
              );
            };
          }
          i.onerror = function () {
            e.vd.error(
              "Could not clear object stores on indexedDB " + e.database.Sd
            );
          };
        });
      }
    }),
      (a.Ls = {
        Fs: {
          Sd: "AppboyServiceWorkerAsyncStorage",
          VERSION: 6,
          Ms: {
            Nu: "data",
            jr: "pushClicks",
            cu: "pushSubscribed",
            Cd: "fallbackDevice",
            Js: "cardUpdates",
            pe: "optOut",
            kr: "pendingData",
            yh: "sdkAuthenticationSignature",
          },
          be: 1,
        },
      });
  }))();
}
function qt() {
  return (qt = t(() => {
    u = {
      Yo: "allowCrawlerActivity",
      Zo: "baseUrl",
      Wh: "noCookies",
      Vh: "devicePropertyAllowlist",
      Da: "disablePushTokenMaintenance",
      $h: "enableLogging",
      Yh: "enableSdkAuthentication",
      Ca: "manageServiceWorkerExternally",
      Xh: "minimumIntervalBetweenTriggerActionsInSeconds",
      Zh: "sessionTimeoutInSeconds",
      Qh: "appVersion",
      Ea: "appVersionNumber",
      _a: "serviceWorkerLocation",
      Ba: "safariWebsitePushId",
      Zn: "localization",
      er: "contentSecurityNonce",
      re: "allowUserSuppliedJavascript",
      Go: "inAppMessageZIndex",
      Ko: "openInAppMessagesInNewTab",
      en: "openNewsFeedCardsInNewTab",
      mh: "requireExplicitInAppMessageDismissal",
      Ia: "doNotLoadFontAwesome",
      Na: "deviceId",
      Aa: "serviceWorkerScope",
      Oa: "sdkFlavor",
      tn: "openCardsInNewTab",
    };
  }))();
}
function Jt(t) {
  const e = [];
  let s;
  for (const i in t)
    (s = i),
      Object.prototype.hasOwnProperty.call(t, s) &&
        void 0 !== t[s] &&
        e.push(t[s]);
  return e;
}
function Ht(t, e, s, n) {
  const r = Jt(t);
  return (
    -1 !== r.indexOf(e) ||
    (i.error(`${s} Valid values from ${n} are "${r.join('"/"')}".`), !1)
  );
}
function Vt(t) {
  return Array.isArray
    ? Array.isArray(t)
    : "[object Array]" === Object.prototype.toString.call(t);
}
function Gt(t) {
  return "[object Date]" === Object.prototype.toString.call(t);
}
function Xt(t) {
  return "[object Object]" === Object.prototype.toString.call(t);
}
function Kt(t) {
  t ??= [];
  const e = [],
    s = arguments.length;
  for (let i = 0, n = t.length; i < n; i++) {
    const n = t[i];
    if (-1 !== e.indexOf(n)) continue;
    let r = 1;
    for (r = 1; r < s && -1 !== arguments[r].indexOf(n); r++);
    r === s && e.push(n);
  }
  return e;
}
function Wt(t) {
  const e = [];
  for (const s in t) Object.prototype.hasOwnProperty.call(t, s) && e.push(s);
  return e;
}
function Qt(t, e) {
  if (t === e) return 0 !== t || 1 / t == 1 / e;
  if (null == t || null == e) return t === e;
  const s = t.toString();
  if (s !== e.toString()) return !1;
  switch (s) {
    case "[object RegExp]":
    case "[object String]":
      return "" + t == "" + e;
    case "[object Number]":
      return +t != +t ? +e != +e : 0 == +t ? 1 / +t == 1 / e : +t == +e;
    case "[object Date]":
    case "[object Boolean]":
      return +t == +e;
  }
  const i = "[object Array]" === s;
  if (!i) {
    if ("object" != typeof t || "object" != typeof e) return !1;
    const s = t.constructor,
      i = e.constructor;
    if (
      s !== i &&
      !(
        "function" == typeof s &&
        s instanceof s &&
        "function" == typeof i &&
        i instanceof i
      ) &&
      "constructor" in t &&
      "constructor" in e
    )
      return !1;
  }
  const n = [],
    r = [];
  let o = n.length;
  for (; o--; ) if (n[o] === t) return r[o] === e;
  if ((n.push(t), r.push(e), i)) {
    if (((o = t.length), o !== e.length)) return !1;
    for (; o--; ) if (!Qt(t[o], e[o])) return !1;
  } else {
    const s = Wt(t);
    let i;
    if (((o = s.length), Wt(e).length !== o)) return !1;
    for (; o--; )
      if (
        ((i = s[o]),
        !Object.prototype.hasOwnProperty.call(e, i) || !Qt(t[i], e[i]))
      )
        return !1;
  }
  return n.pop(), r.pop(), !0;
}
function Zt() {
  return (Zt = t(() => {
    Ft();
  }))();
}
function Yt(t, e = !1) {
  let s = t / 1e3;
  return e && (s = Math.floor(s)), s;
}
function te(t) {
  return 1e3 * t;
}
function ee(t) {
  if (null == t) return null;
  const e = parseInt(t.toString());
  return isNaN(e) ? null : new Date(1e3 * e);
}
function se(t) {
  return null != t && Gt(t) ? t.toISOString().replace(/\.[0-9]{3}Z$/, "") : t;
}
function ie(t) {
  return null == t || "" === t ? null : new Date(t);
}
function ne(t) {
  return (new Date().valueOf() - t.valueOf()) / 1e3;
}
function re(t) {
  return (t.valueOf() - new Date().valueOf()) / 1e3;
}
function oe() {
  return (oe = t(() => {
    Zt();
  }))();
}
function ae() {
  return (ae = t(() => {
    (l = "inAppMessage must be an InAppMessage object"),
      (h = "must be a Card object"),
      (c = "logCustomEvent"),
      (d = "setCustomUserAttribute"),
      (f = "Braze must be initialized before calling methods."),
      (g = 72e5),
      (p = "data-update-subscription-id"),
      (m =
        "Banners are disabled. Make sure you have at least one campaign and relaunch the app.");
  }))();
}
function ue() {
  return (ue = t(() => {
    jt(),
      (b = class {
        constructor() {
          this.Mi = {};
        }
        Dt(t) {
          if ("function" != typeof t) return null;
          const e = o.ce();
          return (this.Mi[e] = t), e;
        }
        removeSubscription(t) {
          delete this.Mi[t];
        }
        removeAllSubscriptions() {
          this.Mi = {};
        }
        hc() {
          return Object.keys(this.Mi).length;
        }
        X(t) {
          const e = [];
          for (const s in this.Mi) {
            const i = this.Mi[s];
            e.push(i(t));
          }
          return e;
        }
      });
  }))();
}
function le(t) {
  const e = null == t ? void 0 : t.ft(U.gt._E);
  let s;
  return e && (s = { label: e.l, name: e.a }), s;
}
function he() {
  return (he = t(() => {
    $e();
  }))();
}
function ce() {
  return (ce = t(() => {
    Xs(),
      he(),
      Zt(),
      oe(),
      (v = class t {
        constructor(t, e, s, i, n) {
          (this.userId = t),
            (this.type = e),
            (this.time = s),
            (this.sessionId = i),
            (this.data = n),
            (this.userId = t),
            (this.type = e),
            (this.time = (function (t) {
              return null == t || "" === t ? new Date().valueOf() : t;
            })(s)),
            (this.sessionId = i),
            (this.data = n);
        }
        Nr() {
          var t;
          const e = {
            name: this.type,
            time: Yt(this.time),
            data: this.data || {},
            session_id: this.sessionId,
          };
          null != this.userId && (e.user_id = this.userId);
          const s =
            (null === (t = $t.Sr()) || void 0 === t ? void 0 : t.jh()) || !1;
          if (!e.user_id && !s) {
            const t = le($t.j());
            t && (e.alias = t);
          }
          return e;
        }
        bt() {
          return {
            u: this.userId,
            t: this.type,
            ts: this.time,
            s: this.sessionId,
            d: this.data,
          };
        }
        static fromJson(e) {
          return new t(e.user_id, e.name, e.time, e.session_id, e.data);
        }
        static RE(t) {
          return null != t && Xt(t) && null != t.t && "" !== t.t;
        }
        static Rn(e) {
          return new t(e.u, e.t, e.ts, e.s, e.d);
        }
      });
  }))();
}
function de() {
  return (de = t(() => {
    y = (t) => (t instanceof Error ? t.message : String(t));
  }))();
}
function fe() {
  return (fe = t(() => {
    jt(),
      Ft(),
      Zt(),
      de(),
      (E = class t {
        constructor(t, e, s) {
          (this.eu = t),
            (t ??= o.ce()),
            !s || isNaN(s) ? (this.Gl = new Date().valueOf()) : (this.Gl = s),
            (this.eu = t),
            (this.ql = new Date().valueOf()),
            (this.kl = e);
        }
        bt() {
          return `g:${encodeURIComponent(this.eu)}|e:${this.kl}|c:${
            this.Gl
          }|l:${this.ql}`;
        }
        static hE(t) {
          if ("string" != typeof t) return null;
          const e = t.lastIndexOf("|e:"),
            s = t.substring(0, e),
            i = s.split("g:")[1];
          let n;
          return (
            (n = /[|:]/.test(i) ? encodeURIComponent(i) : i),
            t.replace(s, `g:${n}`)
          );
        }
        static Rn(e) {
          let s;
          if ("string" == typeof e)
            try {
              const i = e.split("|");
              if (!Vt(i) || 4 !== i.length) return null;
              const n = (t) => t.split(":")[1],
                r = (t) => {
                  const e = parseInt(n(t));
                  if (!isNaN(e)) return e;
                };
              (s = new t(decodeURIComponent(n(i[0])), r(i[1]), r(i[2]))),
                (s.ql = r(i[3]));
            } catch (s) {
              i.info(
                `Unable to parse cookie string ${e}, failed with error: ${y(s)}`
              );
            }
          else {
            if (null == e || null == e.g) return null;
            (s = new t(e.g, e.e, e.c)), (s.ql = e.l);
          }
          return s;
        }
      });
  }))();
}
function ge(t) {
  let e = t.length;
  for (let s = t.length - 1; s >= 0; s--) {
    const i = t.charCodeAt(s);
    i > 127 && i <= 2047 ? e++ : i > 2047 && i <= 65535 && (e += 2),
      i >= 56320 && i <= 57343 && s--;
  }
  return e;
}
function pe() {
  return (pe = t(() => {
    Ft();
  }))();
}
function me(t) {
  try {
    const e = t.match(A),
      s = e ? e[0].length : null,
      n = s ? t.substring(s) : null;
    if (null == s || s > t.length - 1 || !n)
      return void i.error(
        `Did not find base64 encoded brazeAction in url to process : ${t}`
      );
    const r = (function (t) {
      try {
        t = t.replace(/-/g, "+").replace(/_/g, "/");
        const e = window.atob(t),
          s = new Uint8Array(e.length);
        for (let t = 0; t < e.length; t++) s[t] = e.charCodeAt(t);
        const i = new Uint16Array(s.buffer);
        return String.fromCharCode(...i);
      } catch (t) {
        return i.error("Unable to decode Base64: " + t), null;
      }
    })(n);
    return r
      ? JSON.parse(r)
      : void i.error(`Failed to decode base64 encoded brazeAction: ${n}`);
  } catch (e) {
    return void i.error(`Failed to process brazeAction URL ${t} : ${y(e)}`);
  }
}
function be(t, e) {
  let s = !1;
  if (e) for (const i of e) if (((s = s || t(i)), s)) return !0;
  return !1;
}
function ve(t) {
  const e = w.properties.type,
    s = w.properties.eo;
  try {
    if (null == t) return !0;
    const i = t[e];
    return i === w.types.io
      ? be(ve, t[s])
      : !(function (t) {
          let e = !1;
          return (
            Object.keys(w.types).forEach((s) => {
              w.types[s] !== t.toString() || (e = !0);
            }),
            e
          );
        })(i);
  } catch (t) {
    return !0;
  }
}
function ye(t) {
  if (!t || !Ae(t)) return !1;
  const e = w.properties.type,
    s = w.properties.eo,
    i = t[e];
  return i === w.types.io ? be(ye, t[s]) : i === w.types.requestPushPermission;
}
function Ee() {
  return (Ee = t(() => {
    Ft(),
      de(),
      pe(),
      ke(),
      (w = {
        types: {
          io: "container",
          logCustomEvent: "logCustomEvent",
          setEmailNotificationSubscriptionType:
            "setEmailNotificationSubscriptionType",
          setPushNotificationSubscriptionType:
            "setPushNotificationSubscriptionType",
          setCustomUserAttribute: "setCustomUserAttribute",
          requestPushPermission: "requestPushPermission",
          addToSubscriptionGroup: "addToSubscriptionGroup",
          removeFromSubscriptionGroup: "removeFromSubscriptionGroup",
          addToCustomAttributeArray: "addToCustomAttributeArray",
          removeFromCustomAttributeArray: "removeFromCustomAttributeArray",
          co: "openLink",
          mo: "openLinkInWebView",
        },
        properties: { type: "type", eo: "steps", so: "args" },
      }),
      (C = { Mr: "unknownBrazeAction", wr: "noPushPrompt" }),
      (S = (t, e) => {
        switch (t) {
          case C.Mr:
            return `${e} contains an unknown braze action type and will not be displayed.`;
          case C.wr:
            return `${e} contains a push prompt braze action, but is not eligible for a push prompt. Ignoring.`;
          default:
            return "";
        }
      });
  }))();
}
function we(t, e, s) {
  const n =
    null != t && "string" == typeof t && ("" === t || null != t.match(O));
  return n || i.error(`Cannot ${e} because ${s} "${t}" is invalid.`), n;
}
function Ce(t) {
  return (
    null != t &&
      t.match(_) &&
      -1 === T.indexOf(t) &&
      i.warn("Custom attribute keys cannot contain '$' or '.'"),
    we(t, "set custom user attribute", "the given key")
  );
}
function Se(t) {
  const e = typeof t;
  return (
    null == t || "number" === e || "boolean" === e || Gt(t) || "string" === e
  );
}
function Oe(t, e, s) {
  const n = -1 !== s;
  if (n && s > 50)
    return i.error("Nested attributes cannot be more than 50 levels deep."), !1;
  const r = n ? s + 1 : -1;
  if (Vt(t) && Vt(e)) {
    for (let i = 0; i < t.length && i < e.length; i++)
      if ((Gt(t[i]) && (e[i] = se(t[i])), !Oe(t[i], e[i], r))) return !1;
  } else {
    if (!Xt(t)) return Se(t);
    for (const s of Wt(t)) {
      const i = t[s];
      if (n && !Ce(s)) return !1;
      if ((Gt(i) && (e[s] = se(i)), !Oe(i, e[s], r))) return !1;
    }
  }
  return !0;
}
function _e(t, e, s, n, r) {
  let o;
  return (
    (o = Xt(t) || Vt(t) ? Oe(t, e, r ? 1 : -1) : Se(t)),
    o || i.error(`Cannot ${s} because ${n} "${t}" is invalid.`),
    o
  );
}
function Te(t, e, s, n = !1) {
  const r = "string" == typeof t || (null === t && n);
  return r || i.error(`Cannot ${e} because ${s} "${t}" is invalid.`), r;
}
function Ne(t, e, s, n, r) {
  if (((t ??= {}), "object" != typeof t || Vt(t)))
    return (
      i.error(`${e} requires that ${s} be an object. Ignoring ${r}.`),
      [!1, null]
    );
  let o, a;
  "setCustomUserAttribute" === e
    ? ((o = 76800), (a = "75KB"))
    : ((o = 51200), (a = "50KB"));
  const u = JSON.stringify(t);
  if (ge(u) > o)
    return (
      i.error(
        `Could not ${n} because ${s} was greater than the max size of ${a}.`
      ),
      [!1, null]
    );
  let l;
  try {
    l = JSON.parse(u);
  } catch (t) {
    return (
      i.error(`Could not ${n} because ${s} did not contain valid JSON.`),
      [!1, null]
    );
  }
  for (const i in t) {
    if ("setCustomUserAttribute" === e && !Ce(i)) return [!1, null];
    if (!we(i, n, `the ${r} property name`)) return [!1, null];
    const s = t[i];
    if ("setCustomUserAttribute" === e || null != s) {
      if (
        (Gt(s) && (l[i] = se(s)),
        !_e(
          s,
          l[i],
          n,
          `the ${r} property "${i}"`,
          "setCustomUserAttribute" === e
        ))
      )
        return [!1, null];
    } else delete t[i], delete l[i];
  }
  return [!0, l];
}
function Ae(t) {
  if (!(w.properties.type in t)) return !1;
  switch (t[w.properties.type]) {
    case w.types.io:
      if (w.properties.eo in t) return !0;
      break;
    case w.types.logCustomEvent:
    case w.types.setEmailNotificationSubscriptionType:
    case w.types.setPushNotificationSubscriptionType:
    case w.types.setCustomUserAttribute:
    case w.types.addToSubscriptionGroup:
    case w.types.removeFromSubscriptionGroup:
    case w.types.addToCustomAttributeArray:
    case w.types.removeFromCustomAttributeArray:
    case w.types.co:
    case w.types.mo:
      if (w.properties.so in t) return !0;
      break;
    case w.types.requestPushPermission:
      return !0;
    default:
      return !1;
  }
  return !1;
}
function Ie(t) {
  return I.test(t);
}
function ke() {
  return (ke = t(() => {
    Zt(),
      pe(),
      Ft(),
      oe(),
      Ee(),
      ae(),
      (O = /^[^\x00-\x1F\x22]+$/),
      (_ = /[$.]/),
      (T = [
        "$add",
        "$update",
        "$remove",
        "$identifier_key",
        "$identifier_value",
        "$new_object",
        "$time",
        "$google_ad_personalization",
        "$google_ad_user_data",
      ]),
      (N = new RegExp(/^.+@.+\..+$/)),
      (A = /^brazeActions:\/\/v\d+\//),
      (I = /^[^\s]+$/);
  }))();
}
function Be() {
  return (Be = t(() => {
    Zt(),
      Ft(),
      Mt(),
      ke(),
      ae(),
      oe(),
      (k = class t {
        constructor(t, e) {
          (this.Cs = t), (this.Fi = e), (this.Cs = t), (this.Fi = e);
        }
        getUserId(t) {
          const e = this.Cs.getUserId();
          if ("function" != typeof t) return e;
          i.warn(
            "The callback for getUserId is deprecated. You can access its return value directly instead (e.g. `const id = braze.getUser().getUserId()`)"
          ),
            t(e);
        }
        addAlias(t, e) {
          return !Te(t, "add alias", "the alias", !1) || t.length <= 0
            ? (i.error("addAlias requires a non-empty alias"), !1)
            : !Te(e, "add alias", "the label", !1) || e.length <= 0
            ? (i.error("addAlias requires a non-empty label"), !1)
            : this.Fi.Cn(t, e).tt;
        }
        setFirstName(t) {
          return (
            !!Te(t, "set first name", "the firstName", !0) &&
            this.Cs.nu("first_name", t)
          );
        }
        setLastName(t) {
          return (
            !!Te(t, "set last name", "the lastName", !0) &&
            this.Cs.nu("last_name", t)
          );
        }
        setEmail(t) {
          return null === t ||
            (function (t) {
              return "string" == typeof t && null != t.toLowerCase().match(N);
            })(t)
            ? this.Cs.nu("email", t)
            : (i.error(
                `Cannot set email address - "${t}" did not pass RFC-5322 validation.`
              ),
              !1);
        }
        setGender(e) {
          return (
            "string" == typeof e && (e = e.toLowerCase()),
            !(
              null !== e &&
              !Ht(
                t.Genders,
                e,
                `Gender "${e}" is not a valid gender.`,
                "User.Genders"
              )
            ) && this.Cs.nu("gender", e)
          );
        }
        setDateOfBirth(t, e, s) {
          return null === t && null === e && null === s
            ? this.Cs.nu("dob", null)
            : ((t = null != t ? parseInt(t.toString()) : null),
              (e = null != e ? parseInt(e.toString()) : null),
              (s = null != s ? parseInt(s.toString()) : null),
              null == t ||
              null == e ||
              null == s ||
              isNaN(t) ||
              isNaN(e) ||
              isNaN(s) ||
              e > 12 ||
              e < 1 ||
              s > 31 ||
              s < 1
                ? (i.error(
                    "Cannot set date of birth - parameters should comprise a valid date e.g. setDateOfBirth(1776, 7, 4);"
                  ),
                  !1)
                : this.Cs.nu("dob", `${t}-${e}-${s}`));
        }
        setCountry(t) {
          return (
            !!Te(t, "set country", "the country", !0) &&
            this.Cs.nu("country", t)
          );
        }
        setHomeCity(t) {
          return (
            !!Te(t, "set home city", "the homeCity", !0) &&
            this.Cs.nu("home_city", t)
          );
        }
        setLanguage(t) {
          return (
            !!Te(t, "set language", "the language", !0) &&
            this.Cs.nu("language", t)
          );
        }
        setEmailNotificationSubscriptionType(e) {
          return (
            !!Ht(
              t.NotificationSubscriptionTypes,
              e,
              `Email notification setting "${e}" is not a valid subscription type.`,
              "User.NotificationSubscriptionTypes"
            ) && this.Cs.nu("email_subscribe", e)
          );
        }
        setPushNotificationSubscriptionType(e) {
          return (
            !!Ht(
              t.NotificationSubscriptionTypes,
              e,
              `Push notification setting "${e}" is not a valid subscription type.`,
              "User.NotificationSubscriptionTypes"
            ) && this.Cs.nu("push_subscribe", e)
          );
        }
        setPhoneNumber(e) {
          return (
            !!Te(e, "set phone number", "the phoneNumber", !0) &&
            (null === e || e.match(t.Fn)
              ? this.Cs.nu("phone", e)
              : (i.error(
                  `Cannot set phone number - "${e}" did not pass validation.`
                ),
                !1))
          );
        }
        setLastKnownLocation(t, e, s, n, r) {
          return null == t || null == e
            ? (i.error(
                "Cannot set last-known location - latitude and longitude are required."
              ),
              !1)
            : ((t = parseFloat(t.toString())),
              (e = parseFloat(e.toString())),
              null != s && (s = parseFloat(s.toString())),
              null != n && (n = parseFloat(n.toString())),
              null != r && (r = parseFloat(r.toString())),
              isNaN(t) ||
              isNaN(e) ||
              (null != s && isNaN(s)) ||
              (null != n && isNaN(n)) ||
              (null != r && isNaN(r))
                ? (i.error(
                    "Cannot set last-known location - all supplied parameters must be numeric."
                  ),
                  !1)
                : t > 90 || t < -90 || e > 180 || e < -180
                ? (i.error(
                    "Cannot set last-known location - latitude and longitude are bounded by ±90 and ±180 respectively."
                  ),
                  !1)
                : (null != s && s < 0) || (null != r && r < 0)
                ? (i.error(
                    "Cannot set last-known location - accuracy and altitudeAccuracy may not be negative."
                  ),
                  !1)
                : this.Fi.setLastKnownLocation(
                    this.Cs.getUserId(),
                    t,
                    e,
                    n,
                    s,
                    r
                  ).tt);
        }
        setCustomUserAttribute(t, e, s) {
          if (!Ce(t)) return !1;
          const r = (e) => {
            const [s] = Ne(
              e,
              d,
              "attribute value",
              `set custom user attribute "${t}"`,
              "custom user attribute"
            );
            return s;
          };
          if (Vt(e)) {
            const [s, o] = (function (t, e) {
              let s = !1,
                n = !1;
              const r = () => {
                i.error(
                  "Custom attribute arrays must be either string arrays or object arrays."
                );
              };
              for (const i of e)
                if ("string" == typeof i) {
                  if (n) return r(), [!1, !1];
                  if (
                    !we(
                      i,
                      `set custom user attribute "${t}"`,
                      "the element in the given array"
                    )
                  )
                    return [!1, !1];
                  s = !0;
                } else {
                  if (!Xt(i)) return r(), [!1, !1];
                  if (s) return r(), [!1, !1];
                  if (
                    !Ne(
                      i,
                      "setCustomUserAttribute",
                      "attribute value",
                      `set custom user attribute "${t}"`,
                      "custom user attribute"
                    )
                  )
                    return [!1, !1];
                  n = !0;
                }
              return [s, n];
            })(t, e);
            if (!s && !o && 0 !== e.length) return !1;
            if (s || 0 === e.length) return this.Fi.Ln(n.$n, t, e).tt;
            for (const t of e) if (!r(t)) return !1;
          } else if (Xt(e)) {
            if (!r(e)) return !1;
            if (s) return this.Fi.Ln(n.Bn, t, e).tt;
          } else {
            if (void 0 === e || !Se(e)) return !1;
            if (
              (Gt(e) && (e = se(e)),
              "string" == typeof e &&
                !we(
                  e,
                  `set custom user attribute "${t}"`,
                  "the element in the given array"
                ))
            )
              return !1;
          }
          return this.Cs.setCustomUserAttribute(t, e);
        }
        addToCustomAttributeArray(t, e) {
          return (
            !!we(t, "add to custom user attribute array", "the given key") &&
            !(
              null != e &&
              !we(e, "add to custom user attribute array", "the given value")
            ) &&
            this.Fi.Ln(n.On, t, e).tt
          );
        }
        removeFromCustomAttributeArray(t, e) {
          return (
            !!we(
              t,
              "remove from custom user attribute array",
              "the given key"
            ) &&
            !(
              null != e &&
              !we(
                e,
                "remove from custom user attribute array",
                "the given value"
              )
            ) &&
            this.Fi.Ln(n.Gn, t, e).tt
          );
        }
        incrementCustomUserAttribute(t, e) {
          if (!we(t, "increment custom user attribute", "the given key"))
            return !1;
          e ??= 1;
          const s = parseInt(e.toString());
          return isNaN(s) || s !== parseFloat(e.toString())
            ? (i.error(
                `Cannot increment custom user attribute because the given incrementValue "${e}" is not an integer.`
              ),
              !1)
            : this.Fi.Ln(n.Hn, t, s).tt;
        }
        setCustomLocationAttribute(t, e, s) {
          return (
            !!we(t, "set custom location attribute", "the given key") &&
            ((null !== e || null !== s) &&
            ((e = null != e ? parseFloat(e.toString()) : null),
            (s = null != s ? parseFloat(s.toString()) : null),
            (null == e && null != s) ||
              (null != e && null == s) ||
              (null != e && (isNaN(e) || e > 90 || e < -90)) ||
              (null != s && (isNaN(s) || s > 180 || s < -180)))
              ? (i.error(
                  "Received invalid values for latitude and/or longitude. Latitude and longitude are bounded by ±90 and ±180 respectively, or must both be null for removal."
                ),
                !1)
              : this.Fi.Kn(t, e, s).tt)
          );
        }
        addToSubscriptionGroup(e) {
          return !Te(
            e,
            "add user to subscription group",
            "subscription group ID",
            !1
          ) || e.length <= 0
            ? (i.error(
                "addToSubscriptionGroup requires a non-empty subscription group ID"
              ),
              !1)
            : this.Fi.Mn(e, t.Yn.SUBSCRIBED).tt;
        }
        removeFromSubscriptionGroup(e) {
          return !Te(
            e,
            "remove user from subscription group",
            "subscription group ID",
            !1
          ) || e.length <= 0
            ? (i.error(
                "removeFromSubscriptionGroup requires a non-empty subscription group ID"
              ),
              !1)
            : this.Fi.Mn(e, t.Yn.UNSUBSCRIBED).tt;
        }
        setLineId(e) {
          return Te(e, "set LINE user ID", "the ID", !0) &&
            0 !== (null == e ? void 0 : e.length)
            ? e && e.length > t.Jn
              ? (i.error(
                  `Rejected LINE user ID ${e} because it is longer than ${t.Jn} characters.`
                ),
                !1)
              : this.Cs.nu("native_line_id", e)
            : (i.error("setLineId requires a non-empty ID"), !1);
        }
        An(t, e, s, i, n) {
          this.Cs.An(t, e, s, i, n), this.Fi.Qn();
        }
        xn(t) {
          this.Cs.xn(t);
        }
      }),
      (k.Genders = {
        MALE: "m",
        FEMALE: "f",
        OTHER: "o",
        UNKNOWN: "u",
        NOT_APPLICABLE: "n",
        PREFER_NOT_TO_SAY: "p",
      }),
      (k.NotificationSubscriptionTypes = {
        OPTED_IN: "opted_in",
        SUBSCRIBED: "subscribed",
        UNSUBSCRIBED: "unsubscribed",
      }),
      (k.Fn = /^[0-9 .\\(\\)\\+\\-]+$/),
      (k.Yn = { SUBSCRIBED: "subscribed", UNSUBSCRIBED: "unsubscribed" }),
      (k.Xn = "user_id"),
      (k.lu = "custom"),
      (k.ur = 997),
      (k.Jn = 33);
  }))();
}
function De() {
  return (De = t(() => {
    Zt(),
      (B = class {
        constructor() {}
        ef() {}
        ff() {}
        ec(t) {}
        static nf(t, e) {
          if (t && e)
            if (((t = t.toLowerCase()), Vt(e.cf))) {
              for (let s = 0; s < e.cf.length; s++)
                if (-1 !== t.indexOf(e.cf[s].toLowerCase())) return e.identity;
            } else if (-1 !== t.indexOf(e.cf.toLowerCase())) return e.identity;
        }
      });
  }))();
}
function xe() {
  return (xe = t(() => {
    (D = {
      rO: "Chrome",
      eO: "Edge",
      oO: "Opera",
      Bg: "Safari",
      OO: "Firefox",
    }),
      (x = { xg: "Android", ao: "iOS", Pg: "Mac", Og: "Windows" });
  }))();
}
function Re() {
  return (Re = t(() => {
    De(),
      xe(),
      (R = class t extends B {
        constructor() {
          if (
            (super(),
            (this.userAgentData = navigator.userAgentData),
            (this.browser = null),
            (this.version = null),
            this.userAgentData)
          ) {
            const t = this.Bc();
            (this.browser = t.browser || "Unknown Browser"),
              (this.version = t.version || "Unknown Version");
          }
          this.OS = null;
        }
        ef() {
          return this.browser;
        }
        ff() {
          return this.version;
        }
        ec(e) {
          if (this.OS) return Promise.resolve(this.OS);
          const s = (s) => {
            for (let i = 0; i < e.length; i++) {
              const n = t.nf(s, e[i]);
              if (n) return (this.OS = n), this.OS;
            }
            return s;
          };
          return this.userAgentData.platform
            ? Promise.resolve(s(this.userAgentData.platform))
            : this.getHighEntropyValues()
                .then((t) => (t.platform ? s(t.platform) : navigator.platform))
                .catch(() => navigator.platform);
        }
        Bc() {
          const t = {},
            e = this.userAgentData.brands;
          if (e && e.length)
            for (const s of e) {
              const e = this.Vc(D),
                i = s.brand.match(e);
              if (i && i.length > 0) {
                (t.browser = i[0]), (t.version = s.version);
                break;
              }
            }
          return t;
        }
        Vc(t) {
          const e = [];
          for (const s in t) {
            const i = s;
            e.push(t[i]);
          }
          return new RegExp("(" + e.join("|") + ")", "i");
        }
        getHighEntropyValues() {
          return this.userAgentData.getHighEntropyValues
            ? this.userAgentData.getHighEntropyValues(["platform"])
            : Promise.reject();
        }
      });
  }))();
}
function Pe() {
  return (Pe = t(() => {
    De(),
      xe(),
      (P = class t extends B {
        constructor() {
          super(), (this.fd = t.Bc(navigator.userAgent || ""));
        }
        ef() {
          return this.fd[0] || "Unknown Browser";
        }
        ff() {
          return this.fd[1] || "Unknown Version";
        }
        ec(e) {
          for (let s = 0; s < e.length; s++) {
            const i = e[s].string;
            let n = t.nf(i, e[s]);
            if (n)
              return (
                n === x.Pg && navigator.maxTouchPoints > 1 && (n = x.ao),
                Promise.resolve(n)
              );
          }
          return Promise.resolve(navigator.platform);
        }
        static Bc(t) {
          let e,
            s =
              t.match(
                /(samsungbrowser|tizen|roku|konqueror|icab|crios|opera|ucbrowser|chrome|safari|firefox|camino|msie|trident(?=\/))\/?\s*(\.?\d+(\.\d+)*)/i
              ) || [];
          if (-1 !== t.indexOf("(Web0S; Linux/SmartTV)"))
            return ["LG Smart TV", null];
          if (-1 !== t.indexOf("CrKey")) return ["Chromecast", null];
          if (
            -1 !== t.indexOf("BRAVIA") ||
            -1 !== t.indexOf("SonyCEBrowser") ||
            -1 !== t.indexOf("SonyDTV")
          )
            return ["Sony Smart TV", null];
          if (-1 !== t.indexOf("PhilipsTV")) return ["Philips Smart TV", null];
          if (t.match(/\b(Roku)\b/)) return ["Roku", null];
          if (t.match(/\bAFTM\b/)) return ["Amazon Fire Stick", null];
          if (
            s[1] === D.rO &&
            ((e = t.match(/\b(OPR|Edge|EdgA|Edg|UCBrowser)\/(\.?\d+(\.\d+)*)/)),
            null != e)
          )
            return (
              (e = e.slice(1)),
              (e[0] = e[0].replace("OPR", D.oO)),
              (e[0] = e[0].replace("EdgA", D.eO)),
              "Edg" === e[0] && (e[0] = D.eO),
              [e[0], e[1]]
            );
          if (
            s[1] === D.Bg &&
            ((e = t.match(/\b(EdgiOS)\/(\.?\d+(\.\d+)*)/)), null != e)
          )
            return (
              (e = e.slice(1)),
              (e[0] = e[0].replace("EdgiOS", D.eO)),
              [e[0], e[1]]
            );
          if (
            ((s = s[2] ? [s[1], s[2]] : [null, null]),
            s[0] === D.Bg &&
              null != (e = t.match(/version\/(\.?\d+(\.\d+)*)/i)) &&
              s.splice(1, 1, e[1]),
            null != (e = t.match(/\b(UCBrowser)\/(\.?\d+(\.\d+)*)/)) &&
              s.splice(1, 1, e[2]),
            s[0] === D.oO && null != (e = t.match(/mini\/(\.?\d+(\.\d+)*)/i)))
          )
            return ["Opera Mini", e[1] || ""];
          if (s[0]) {
            const t = s[0].toLowerCase();
            "crios" === t && (s[0] = D.rO),
              "tizen" === t && ((s[0] = "Samsung Smart TV"), (s[1] = null)),
              "samsungbrowser" === t && (s[0] = "Samsung Browser");
          }
          return s;
        }
      });
  }))();
}
function Le() {
  return (Le = t(() => {
    Re(),
      Pe(),
      xe(),
      (L = class t {
        constructor() {
          const e = navigator.userAgentData ? R : P;
          (this.Sg = new e()),
            (this.userAgent = navigator.userAgent),
            (this.browser = this.Sg.ef()),
            (this.version = this.Sg.ff()),
            (this.OS = null),
            this.ec().then((t) => (this.OS = t));
          const s = navigator;
          (this.language = (
            s.userLanguage ||
            s.language ||
            s.browserLanguage ||
            s.systemLanguage ||
            ""
          ).toLowerCase()),
            (this.Ja = t.vg(this.userAgent));
        }
        fE() {
          return this.browser === D.Bg;
        }
        ic() {
          return this.OS || null;
        }
        ec() {
          return this.OS
            ? Promise.resolve(this.OS)
            : this.Sg.ec(t.kg).then((t) => ((this.OS = t), t));
        }
        static vg(t) {
          t = t.toLowerCase();
          const e = [
            "googlebot",
            "bingbot",
            "slurp",
            "duckduckbot",
            "baiduspider",
            "yandex",
            "facebookexternalhit",
            "sogou",
            "ia_archiver",
            "https://github.com/prerender/prerender",
            "aolbuild",
            "bingpreview",
            "msnbot",
            "adsbot",
            "mediapartners-google",
            "teoma",
            "taiko",
          ];
          for (let s = 0; s < e.length; s++)
            if (-1 !== t.indexOf(e[s])) return !0;
          return !1;
        }
      }),
      (L.kg = [
        { string: navigator.platform, cf: "Win", identity: x.Og },
        { string: navigator.platform, cf: "Mac", identity: x.Pg },
        {
          string: navigator.platform,
          cf: "BlackBerry",
          identity: "BlackBerry",
        },
        { string: navigator.platform, cf: "FreeBSD", identity: "FreeBSD" },
        { string: navigator.platform, cf: "OpenBSD", identity: "OpenBSD" },
        { string: navigator.platform, cf: "Nintendo", identity: "Nintendo" },
        { string: navigator.platform, cf: "SunOS", identity: "SunOS" },
        {
          string: navigator.platform,
          cf: "PlayStation",
          identity: "PlayStation",
        },
        { string: navigator.platform, cf: "X11", identity: "X11" },
        {
          string: navigator.userAgent,
          cf: ["iPhone", "iPad", "iPod"],
          identity: x.ao,
        },
        { string: navigator.platform, cf: "Pike v", identity: x.ao },
        { string: navigator.userAgent, cf: ["Web0S"], identity: "WebOS" },
        { string: navigator.userAgent, cf: "Tizen", identity: "Tizen" },
        {
          string: navigator.platform,
          cf: ["Linux armv7l", "Android"],
          identity: x.xg,
        },
        { string: navigator.userAgent, cf: ["Android"], identity: x.xg },
        { string: navigator.platform, cf: "Linux", identity: "Linux" },
      ]),
      ($ = new L());
  }))();
}
function $e() {
  return ($e = t(() => {
    ce(),
      fe(),
      Zt(),
      Ft(),
      Mt(),
      Be(),
      Le(),
      de(),
      (U = {
        iu: {
          su: "ab.storage.userId",
          Na: "ab.storage.deviceId",
          Nl: "ab.storage.sessionId",
        },
        gt: {
          ac: "ab.test",
          tE: "ab.storage.events",
          eE: "ab.storage.attributes",
          sE: "ab.storage.attributes.anonymous_user",
          oc: "ab.storage.device",
          pu: "ab.storage.sdk_metadata",
          Ru: "ab.storage.session_id_for_cached_metadata",
          zn: "ab.storage.pushToken",
          qi: "ab.storage.newsFeed",
          zi: "ab.storage.lastNewsFeedRefresh",
          Zt: "ab.storage.cardImpressions",
          ml: "ab.storage.serverConfig",
          rE: "ab.storage.triggers",
          oE: "ab.storage.triggers.ts",
          Hl: "ab.storage.messagingSessionStart",
          Hs: "ab.storage.cc",
          Os: "ab.storage.ccLastFullSync",
          Qs: "ab.storage.ccLastCardUpdated",
          Hu: "ab.storage.globalRateLimitCurrentTokenCount",
          _u: "ab.storage.dynamicRateLimitCurrentTokenCount",
          Kt: "ab.storage.ccClicks",
          Yt: "ab.storage.ccImpressions",
          Vt: "ab.storage.ccDismissals",
          nE: "ab.storage.lastDisplayedTriggerTimesById",
          aE: "ab.storage.lastDisplayedTriggerTime",
          iE: "ab.storage.triggerFireInstancesById",
          qh: "ab.storage.signature",
          EE: "ab.storage.brazeSyncRetryCount",
          Zs: "ab.storage.sdkVersion",
          Xe: "ab.storage.ff",
          Ge: "ab.storage.ffImpressions",
          Ze: "ab.storage.ffLastRefreshAt",
          Ve: "ab.storage.ff.sessionId",
          lE: "ab.storage.lastReqToEndpoint",
          SE: "ab.storage.requestAttempts",
          Kr: "ab.storage.deferredIam",
          Ku: "ab.storage.lastSdkReq",
          _E: "ab.storage.alias",
          vt: "ab.storage.banners",
          Nt: "ab.storage.banners.impressions",
          yt: "ab.storage.banners.sessionId",
        },
        me: "ab.optOut",
      }),
      (F = class t {
        constructor(t, e) {
          (this.uE = t), (this.cE = e), (this.uE = t), (this.cE = e);
        }
        Ha(e) {
          const s = Wt(U.iu),
            i = new t.se(e);
          for (const t of s) i.remove(U.iu[t]);
        }
        uu(t, e) {
          let s = null;
          null != e && e instanceof E && (s = e.bt()), this.uE.store(t, s);
        }
        TE(t) {
          const e = this.tu(t);
          null != e && ((e.ql = new Date().valueOf()), this.uu(t, e));
        }
        tu(t) {
          const e = this.uE.gr(t),
            s = ((t) => {
              let e;
              try {
                e = JSON.parse(t);
              } catch (t) {
                e = null;
              }
              return e;
            })(e);
          let i;
          if (s) (i = E.Rn(s) || null), i && this.uu(t, i);
          else {
            const s = E.hE(e);
            (i = E.Rn(s) || null), s !== e && i && this.uu(t, i);
          }
          return i;
        }
        Jl(t) {
          this.uE.remove(t);
        }
        Xa() {
          const t = Wt(U.iu);
          let e;
          for (const s of t)
            (e = this.tu(U.iu[s])), null != e && this.uu(U.iu[s], e);
        }
        Vo(t) {
          let e;
          if (null == t || 0 === t.length) return !1;
          e = Vt(t) ? t : [t];
          let s = this.cE.gr(U.gt.tE);
          (null != s && Vt(s)) || (s = []);
          for (let i = 0; i < e.length; i++) s.push(e[i].bt());
          return this.cE.store(U.gt.tE, s);
        }
        Al(t) {
          return null != t && this.Vo([t]);
        }
        AE() {
          let t = this.cE.gr(U.gt.tE);
          this.cE.remove(U.gt.tE), (t ??= []);
          const e = [];
          let s = !1,
            i = null;
          if (Vt(t))
            for (let n = 0; n < t.length; n++)
              v.RE(t[n]) ? e.push(v.Rn(t[n])) : (i = n);
          else s = !0;
          if (s || null != i) {
            let r = "Stored events could not be deserialized as Events";
            s &&
              (r +=
                ", was " + Object.prototype.toString.call(t) + " not an array"),
              null != i &&
                (r += ", value at index " + i + " does not look like an event"),
              (r +=
                ", serialized values were of type " +
                typeof t +
                ": " +
                JSON.stringify(t)),
              e.push(new v(null, n.qu, new Date().valueOf(), null, { e: r }));
          }
          return e;
        }
        Bt(t, e) {
          return (
            !!Ht(
              U.gt,
              t,
              "StorageManager cannot store object.",
              "STORAGE_KEYS.OBJECTS"
            ) && this.cE.store(t, e)
          );
        }
        ft(t) {
          return (
            !!Ht(
              U.gt,
              t,
              "StorageManager cannot retrieve object.",
              "STORAGE_KEYS.OBJECTS"
            ) && this.cE.gr(t)
          );
        }
        Ut(t) {
          return (
            !!Ht(
              U.gt,
              t,
              "StorageManager cannot remove object.",
              "STORAGE_KEYS.OBJECTS"
            ) && (this.cE.remove(t), !0)
          );
        }
        clearData() {
          const t = Wt(U.iu),
            e = Wt(U.gt);
          for (let s = 0; s < t.length; s++) {
            const e = t[s];
            this.uE.remove(U.iu[e]);
          }
          for (let s = 0; s < e.length; s++) {
            const t = e[s];
            this.cE.remove(U.gt[t]);
          }
        }
        gE(t) {
          return t || U.gt.sE;
        }
        Cu(t) {
          let e = this.cE.gr(U.gt.eE);
          e ??= {};
          const s = this.gE(t[k.Xn]),
            i = e[s];
          for (const n in t)
            n !== k.Xn &&
              (null == e[s] || (i && null == i[n])) &&
              this.mu(t[k.Xn], n, t[n]);
        }
        mu(t, e, s) {
          let i = this.cE.gr(U.gt.eE);
          i ??= {};
          const n = this.gE(t);
          let r = i[n];
          if ((r ?? ((r = {}), null != t && (r[k.Xn] = t)), e === k.lu)) {
            r[e] ?? (r[e] = {});
            for (const t in s) r[e][t] = s[t];
          } else r[e] = s;
          return (i[n] = r), this.cE.store(U.gt.eE, i);
        }
        OE() {
          const t = this.cE.gr(U.gt.eE);
          this.cE.remove(U.gt.eE);
          const e = [];
          for (const s in t) null != t[s] && e.push(t[s]);
          return e;
        }
        ru(t) {
          const e = this.cE.gr(U.gt.eE);
          if (null != e) {
            const s = this.gE(null),
              i = e[s];
            null != i &&
              ((e[s] = void 0),
              this.cE.store(U.gt.eE, e),
              (i[k.Xn] = t),
              this.Cu(i));
          }
          const s = this.tu(U.iu.Nl);
          let i = null;
          null != s && (i = s.eu);
          const n = this.AE();
          if (null != n)
            for (let r = 0; r < n.length; r++) {
              const e = n[r];
              null == e.userId && e.sessionId == i && (e.userId = t),
                this.Al(e);
            }
        }
        IE() {
          return this.cE.dE;
        }
      }),
      (F.gc = class {
        constructor(t) {
          (this.an = t), (this.an = t), (this.dE = $.fE() ? 3 : 10);
        }
        bE(t) {
          return t + "." + this.an;
        }
        store(t, e) {
          const s = { v: e };
          try {
            return localStorage.setItem(this.bE(t), JSON.stringify(s)), !0;
          } catch (t) {
            return i.info("Storage failure: " + y(t)), !1;
          }
        }
        gr(t) {
          try {
            let e = null;
            const s = localStorage.getItem(this.bE(t));
            return null != s && (e = JSON.parse(s)), null == e ? null : e.v;
          } catch (t) {
            return i.info("Storage retrieval failure: " + y(t)), null;
          }
        }
        remove(t) {
          try {
            localStorage.removeItem(this.bE(t));
          } catch (t) {
            return i.info("Storage removal failure: " + y(t)), !1;
          }
        }
      }),
      (F.uc = class {
        constructor() {
          (this.KE = {}), (this.mE = 5242880), (this.dE = 3);
        }
        store(t, e) {
          const s = { value: e },
            n = this.YE(e);
          return n > this.mE
            ? (i.info(
                "Storage failure: object is ≈" +
                  n +
                  " bytes which is greater than the max of " +
                  this.mE
              ),
              !1)
            : ((this.KE[t] = s), !0);
        }
        YE(t) {
          const e = [],
            s = [t];
          let i = 0;
          for (; s.length; ) {
            const t = s.pop();
            if ("boolean" == typeof t) i += 4;
            else if ("string" == typeof t) i += 2 * t.length;
            else if ("number" == typeof t) i += 8;
            else if ("object" == typeof t && -1 === e.indexOf(t)) {
              let i, n;
              e.push(t);
              for (const e in t) (n = t), (i = e), s.push(n[i]);
            }
          }
          return i;
        }
        gr(t) {
          const e = this.KE[t];
          return null == e ? null : e.value;
        }
        remove(t) {
          this.KE[t] = null;
        }
      }),
      (F.se = class {
        constructor(t, e) {
          (this.an = t),
            (this.NE = e),
            (this.an = t),
            (this.GE = this.DE()),
            (this.CE = 576e3),
            (this.NE = !!e);
        }
        bE(t) {
          return null != this.an ? t + "." + this.an : t;
        }
        DE() {
          let t = 0,
            e = document.location.hostname;
          const s = e.split("."),
            i = "ab._gd";
          for (
            ;
            t < s.length - 1 && -1 === document.cookie.indexOf(i + "=" + i);

          )
            t++,
              (e = "." + s.slice(-1 - t).join(".")),
              (document.cookie = i + "=" + i + ";domain=" + e + ";");
          return (
            (document.cookie =
              i +
              "=;expires=" +
              new Date(0).toUTCString() +
              ";domain=" +
              e +
              ";"),
            e
          );
        }
        le() {
          const t = new Date();
          return t.setTime(t.getTime() + 60 * this.CE * 1e3), t.getFullYear();
        }
        ME() {
          const t = Jt(U.iu),
            e = document.cookie.split(";");
          for (let s = 0; s < e.length; s++) {
            let i = e[s];
            for (; " " === i.charAt(0); ) i = i.substring(1);
            let n = !1;
            for (let e = 0; e < t.length; e++)
              if (0 === i.indexOf(t[e])) {
                n = !0;
                break;
              }
            if (n) {
              const t = i.split("=")[0];
              -1 === t.indexOf("." + this.an) && this.pE(t);
            }
          }
        }
        store(t, e) {
          this.ME();
          const s = new Date();
          s.setTime(s.getTime() + 60 * this.CE * 1e3);
          const n = "expires=" + s.toUTCString(),
            r = "domain=" + this.GE;
          let o;
          o = this.NE ? e : encodeURIComponent(e);
          const a = this.bE(t) + "=" + o + ";" + n + ";" + r + ";path=/";
          return a.length >= 4093
            ? (i.info(
                "Storage failure: string is " +
                  a.length +
                  " chars which is too large to store as a cookie."
              ),
              !1)
            : ((document.cookie = a), !0);
        }
        gr(t) {
          const e = [],
            s = this.bE(t) + "=",
            n = document.cookie.split(";");
          for (let r = 0; r < n.length; r++) {
            let o = n[r];
            for (; " " === o.charAt(0); ) o = o.substring(1);
            if (0 === o.indexOf(s))
              try {
                let t;
                (t = this.NE
                  ? o.substring(s.length, o.length)
                  : decodeURIComponent(o.substring(s.length, o.length))),
                  e.push(t);
              } catch (e) {
                return (
                  i.info("Storage retrieval failure: " + y(e)),
                  this.remove(t),
                  null
                );
              }
          }
          return e.length > 0 ? e[e.length - 1] : null;
        }
        remove(t) {
          this.pE(this.bE(t));
        }
        pE(t) {
          const e = t + "=;expires=" + new Date(0).toUTCString();
          (document.cookie = e), (document.cookie = e + ";path=/");
          const s = e + ";domain=" + this.GE;
          (document.cookie = s), (document.cookie = s + ";path=/");
        }
      }),
      (F.lc = class {
        constructor(t, e, s) {
          (this.an = t),
            (this.vE = []),
            e && this.vE.push(new F.se(t)),
            s && this.vE.push(new F.gc(t)),
            this.vE.push(new F.uc());
        }
        store(t, e) {
          let s = !0;
          for (let i = 0; i < this.vE.length; i++)
            s = this.vE[i].store(t, e) && s;
          return s;
        }
        gr(t) {
          for (let e = 0; e < this.vE.length; e++) {
            const s = this.vE[e].gr(t);
            if (null != s) return s;
          }
          return null;
        }
        remove(t) {
          new F.se(this.an).remove(t);
          for (let e = 0; e < this.vE.length; e++) this.vE[e].remove(t);
        }
      });
  }))();
}
function Ue() {
  return (Ue = t(() => {
    $e(),
      ue(),
      Ft(),
      zt(),
      (M = class {
        constructor(t, e, s) {
          (this.C = t),
            (this.gh = e),
            (this.Fh = s),
            (this.C = t),
            (this.gh = e || !1),
            (this.Fh = s),
            (this.kh = new b()),
            (this.fh = 0),
            (this.wh = 1);
        }
        jh() {
          return this.gh;
        }
        xh() {
          return this.C.ft(U.gt.qh);
        }
        setSdkAuthenticationSignature(t) {
          const e = this.xh();
          this.C.Bt(U.gt.qh, t);
          const s = a.Ls.Fs;
          new a(s, i).setItem(s.Ms.yh, this.wh, t), e !== t && this.it();
        }
        Bh() {
          this.C.Ut(U.gt.qh);
          const t = a.Ls.Fs;
          new a(t, i).ge(t.Ms.yh, this.wh);
        }
        subscribeToSdkAuthenticationFailures(t) {
          return this.Fh.Dt(t);
        }
        Gh(t) {
          this.Fh.X(t);
        }
        Hh() {
          this.kh.removeAllSubscriptions();
        }
        Jh() {
          this.fh += 1;
        }
        Kh() {
          return this.fh;
        }
        it() {
          this.fh = 0;
        }
      });
  }))();
}
function Fe() {
  return (Fe = t(() => {
    j = class {
      constructor() {}
      U(t) {}
      changeUser(t = !1) {}
      clearData(t = !1) {}
    };
  }))();
}
function Me() {
  return (Me = t(() => {
    z = class {
      constructor(t) {
        (this.id = t), (this.id = t);
      }
      Nr() {
        const t = {};
        return (
          null != this.browser && (t.browser = this.browser),
          null != this.tc && (t.browser_version = this.tc),
          null != this.os && (t.os_version = this.os),
          null != this.resolution && (t.resolution = this.resolution),
          null != this.language && (t.locale = this.language),
          null != this.timeZone && (t.time_zone = this.timeZone),
          null != this.userAgent && (t.user_agent = this.userAgent),
          t
        );
      }
    };
  }))();
}
function je() {
  return (je = t(() => {
    q = {
      BROWSER: "browser",
      BROWSER_VERSION: "browserVersion",
      OS: "os",
      RESOLUTION: "resolution",
      LANGUAGE: "language",
      TIME_ZONE: "timeZone",
      USER_AGENT: "userAgent",
    };
  }))();
}
function ze() {
  return (ze = t(() => {
    Le(),
      Me(),
      je(),
      fe(),
      Ft(),
      jt(),
      $e(),
      Zt(),
      de(),
      (J = class {
        constructor(t, e) {
          (this.C = t),
            (this.Qa = e),
            (this.C = t),
            (e ??= Jt(q)),
            (this.Qa = e);
        }
        ve(t = !0) {
          let e = this.C.tu(U.iu.Na);
          e ?? ((e = new E(o.ce())), t && this.C.uu(U.iu.Na, e));
          const s = new z(e.eu);
          for (let i = 0; i < this.Qa.length; i++)
            switch (this.Qa[i]) {
              case q.BROWSER:
                s.browser = $.browser;
                break;
              case q.BROWSER_VERSION:
                s.tc = $.version;
                break;
              case q.OS:
                s.os = this.ec();
                break;
              case q.RESOLUTION:
                s.rc = screen.width + "x" + screen.height;
                break;
              case q.LANGUAGE:
                s.language = $.language;
                break;
              case q.TIME_ZONE:
                s.timeZone = this.sc(new Date());
                break;
              case q.USER_AGENT:
                s.userAgent = $.userAgent;
            }
          return s;
        }
        ec() {
          if ($.ic()) return $.ic();
          const t = this.C.ft(U.gt.oc);
          return t && t.os_version ? t.os_version : $.ec();
        }
        sc(t) {
          let e = !1;
          if (
            "undefined" != typeof Intl &&
            "function" == typeof Intl.DateTimeFormat
          )
            try {
              if ("function" == typeof Intl.DateTimeFormat().resolvedOptions) {
                const t = Intl.DateTimeFormat().resolvedOptions().timeZone;
                if (null != t && "" !== t) return t;
              }
            } catch (t) {
              i.info(
                "Intl.DateTimeFormat threw an error, cannot detect user's time zone:" +
                  y(t)
              ),
                (e = !0);
            }
          if (e) return "";
          const s = t.getTimezoneOffset();
          return this.nc(s);
        }
        nc(t) {
          const e = Math.trunc(t / 60),
            s = Math.trunc(t % 60);
          let i = "GMT";
          return (
            0 !== t &&
              ((i += t < 0 ? "+" : "-"),
              (i +=
                ("00" + Math.abs(e)).slice(-2) +
                ":" +
                ("00" + Math.abs(s)).slice(-2))),
            i
          );
        }
      });
  }))();
}
function qe() {
  return (qe = t(() => {
    H = {
      Du: "invalid_api_key",
      Tu: "blacklisted",
      ku: "no_device_identifier",
      Au: "invalid_json_response",
      bu: "empty_response",
      __: "sdk_auth_error",
    };
  }))();
}
function Je() {
  return (Je = t(() => {
    ae(),
      $e(),
      (V = {
        O: {
          Nu: "data",
          wi: "content_cards/sync",
          Le: "feature_flags/sync",
          Er: "template",
          K: "banners/sync",
        },
        Vu: (t) => (null == t ? void 0 : t.ft(U.gt.lE)),
        sm: (t) => (null == t ? void 0 : t.ft(U.gt.SE)),
        nm: (t, e) => {
          t?.Bt(U.gt.lE, e);
        },
        rm: (t, e) => {
          t?.Bt(U.gt.SE, e);
        },
        zu: (t, e) => {
          if (!t || !e) return -1;
          const s = V.Vu(t);
          if (null == s) return -1;
          const i = s[e];
          return null == i || isNaN(i) ? -1 : i;
        },
        ju: (t, e) => {
          let s = 1;
          if (!t || !e) return s;
          const i = V.sm(t);
          return null == i ? s : ((s = i[e]), null == s || isNaN(s) ? 1 : s);
        },
        W: (t, e, s) => {
          if (!t || !e) return;
          let i = V.Vu(t);
          (i ??= {}), (i[e] = s), V.nm(t, i);
        },
        Mu: (t, e, s) => {
          if (!t || !e) return;
          let i = V.sm(t);
          (i ??= {}), (i[e] = s), V.rm(t, i);
        },
        vi: (t, e) => {
          t && e && V.Mu(t, e, 1);
        },
        Uu: (t, e) => {
          if (!t || !e) return;
          const s = V.ju(t, e);
          V.Mu(t, e, s + 1);
        },
      });
  }))();
}
function He() {
  return (He = t(() => {
    Ft(),
      qe(),
      de(),
      (G = {
        Y: (t) => {
          let e, s;
          try {
            const n = () => {
              i.error("This browser does not have any supported ajax options!");
            };
            let r = !1;
            if ((window.XMLHttpRequest && (r = !0), !r)) return void n();
            e = new XMLHttpRequest();
            const o = (s) => {
              "function" == typeof t.error && t.error(e.status),
                "function" == typeof t.nt && t.nt(!1, s);
            };
            (e.onload = () => {
              let s = !1;
              if (4 !== e.readyState) return;
              s = (e.status >= 200 && e.status < 300) || 304 === e.status;
              const i = e.getAllResponseHeaders();
              if (s) {
                if ("function" == typeof t.tt) {
                  let n;
                  try {
                    n = JSON.parse(e.responseText);
                  } catch (s) {
                    const n = {
                      error: "" === e.responseText ? H.bu : H.Au,
                      response: e.responseText,
                    };
                    (0, t.tt)(n, i);
                  }
                  n && t.tt(n, i);
                }
                "function" == typeof t.nt && t.nt(!0, i);
              } else o(i);
            }),
              (e.onerror = () => {
                o(e.getAllResponseHeaders());
              }),
              (e.ontimeout = () => {
                o();
              }),
              (s = JSON.stringify(t.data)),
              e.open("POST", t.url, !0),
              e.setRequestHeader("Content-type", "application/json"),
              e.setRequestHeader("X-Requested-With", "XMLHttpRequest");
            const a = t.headers || [];
            for (const t of a) e.setRequestHeader(t[0], t[1]);
            e.send(s);
          } catch (t) {
            i.error(`Network request error: ${y(t)}`);
          }
        },
      }),
      (X = (t) => {
        const e = {},
          s = t.toString().split("\r\n");
        if (!s) return e;
        let i, n;
        for (const r of s)
          r &&
            ((i = r.slice(0, r.indexOf(":")).toLowerCase().trim()),
            (n = r.slice(r.indexOf(":") + 1).trim()),
            (e[i] = n));
        return e;
      });
  }))();
}
function Ve() {
  return (Ve = t(() => {
    qe(),
      ce(),
      oe(),
      Ks(),
      Zt(),
      Ft(),
      Mt(),
      $e(),
      Je(),
      ae(),
      he(),
      He(),
      (K = class {
        constructor(t, e, s, i, n, r, o, a, u, l, h, c) {
          (this.hn = t),
            (this.C = e),
            (this.Pa = s),
            (this.Cs = i),
            (this.T = n),
            (this.B = r),
            (this.an = o),
            (this.La = a),
            (this.Ta = u),
            (this.Ra = l),
            (this.appVersion = h),
            (this.au = c),
            (this.du = (t) => (null == t ? "" : `${t} `)),
            (this.hn = t),
            (this.C = e),
            (this.Pa = s),
            (this.Cs = i),
            (this.T = n),
            (this.B = r),
            (this.an = o),
            (this.La = a),
            (this.Ta = u),
            (this.Ra = l),
            (this.appVersion = h),
            (this.au = c),
            (this.fu = ["npm"]),
            (this.vu = []);
        }
        H(t, e = !1, s = !1) {
          const i = this.hn.ve(!s),
            n = i.Nr();
          Qt(this.C.ft(U.gt.oc), n) || (t.device = n),
            (t.api_key = this.an),
            (t.time = Yt(new Date().valueOf(), !0));
          const r = this.C.ft(U.gt.pu) || [],
            o = this.C.ft(U.gt.Ru) || "";
          this.fu.length > 0 &&
            (!Qt(r, this.fu) || o !== this.T.St()) &&
            (t.sdk_metadata = this.fu),
            (t.sdk_version = this.Ta),
            this.Ra && (t.sdk_flavor = this.Ra),
            (t.app_version = this.appVersion),
            (t.app_version_code = this.au),
            (t.device_id = i.id);
          const a = this.Cs.getUserId();
          if ((e && null !== a && (t.user_id = a), !a && !this.Pa.jh())) {
            const e = le(this.C);
            e && (t.alias = e);
          }
          return t;
        }
        st(t, e, s) {
          const r = e.auth_error,
            o = e.error;
          if (!r && !o) return !0;
          if (r) {
            let e;
            this.Pa.Jh();
            const n = { errorCode: r.error_code };
            for (const t of s)
              Vt(t) &&
                "X-Braze-Auth-Signature" === t[0] &&
                (n.signature = t[1]);
            t.respond_with && t.respond_with.user_id
              ? (n.userId = t.respond_with.user_id)
              : t.user_id && (n.userId = t.user_id);
            const o = r.reason;
            return (
              o
                ? ((n.reason = o), (e = `due to ${o}`))
                : (e = `with error code ${r.error_code}.`),
              this.Pa.jh() ||
                (e +=
                  ' Please use the "enableSdkAuthentication" initialization option to enable authentication.'),
              i.error(`SDK Authentication failed ${e}`),
              this.gu(t.events || [], t.attributes || []),
              this.Pa.Gh(n),
              !1
            );
          }
          if (o) {
            let s,
              r = o;
            switch (r) {
              case H.bu:
                return (
                  (s = "Received successful response with empty body."),
                  Ut.ut(n.qu, { e: s }),
                  i.info(s),
                  !1
                );
              case H.Au:
                return (
                  (s = "Received successful response with invalid JSON"),
                  Ut.ut(n.qu, { e: s + ": " + e.response }),
                  i.info(s),
                  !1
                );
              case H.Du:
                r = `The API key "${t.api_key}" is invalid for the baseUrl ${this.La}`;
                break;
              case H.Tu:
                r =
                  "Sorry, we are not currently accepting your requests. If you think this is in error, please contact us.";
                break;
              case H.ku:
                r = "No device identifier. Please contact support@braze.com";
            }
            i.error("Backend error: " + r);
          }
          return !1;
        }
        yu(t, e, s, i) {
          return !!((t && 0 !== t.length) || (e && 0 !== e.length) || s || i);
        }
        wu(t, e, s, i, n = !1) {
          const r = [],
            o = (t) => t || "",
            a = o(this.Cs.getUserId());
          let u = this.Gr(t, e);
          const l = [],
            h = [];
          let c,
            d = null;
          if (s.length > 0) {
            const t = [];
            for (const e of s) {
              if (((c = e.Nr()), this.Pa.jh())) {
                if (a && !c.user_id) {
                  d || (d = {}), d.events || (d.events = []), d.events.push(c);
                  continue;
                }
                if (o(c.user_id) !== a) {
                  h.push(c);
                  continue;
                }
              }
              t.push(c);
            }
            t.length > 0 && (u.events = t);
          }
          if (i.length > 0) {
            const t = [];
            for (const e of i)
              e && (this.Pa.jh() && o(e.user_id) !== a ? l.push(e) : t.push(e));
            t.length > 0 && (u.attributes = t);
          }
          if ((this.gu(h, l), (u = this.H(u, !1, n)), d)) {
            d = this.H(d, !1, n);
            const t = { requestData: d, headers: this.J(d, V.O.Nu) };
            r.push(t);
          }
          if (u && !this.yu(u.events, u.attributes, t, e)) return d ? r : null;
          const f = { requestData: u, headers: this.J(u, V.O.Nu) };
          return r.push(f), r;
        }
        gu(t, e) {
          if (t) {
            const e = [];
            for (const s of t) {
              const t = v.fromJson(s);
              (t.time = te(t.time)), e.push(t);
            }
            this.C.Vo(e);
          }
          if (e) for (const s of e) this.C.Cu(s);
        }
        et(t, e) {
          let s = "HTTP error ";
          null != t && (s += t + " "), (s += e), i.error(s);
        }
        zr(t) {
          return Ut.ut(n.Su, { n: t });
        }
        Gr(t, e, s) {
          const i = {};
          t && (i.feed = !0), e && (i.triggers = !0);
          const n = null != s ? s : this.Cs.getUserId();
          if ((n && (i.user_id = n), !i.user_id && !this.Pa.jh())) {
            const t = le(this.C);
            t && (i.alias = t);
          }
          return (i.config = { config_time: this.B.Et() }), { respond_with: i };
        }
        Bu(t) {
          const e = new Date().valueOf();
          let s = g.toString();
          const i = V.zu(this.C, t);
          return -1 !== i && (s = (e - i).toString()), s;
        }
        J(t, e, s = !1) {
          const i = [["X-Braze-Api-Key", this.an]],
            n = this.Bu(e);
          i.push(["X-Braze-Last-Req-Ms-Ago", n]);
          const r = V.ju(this.C, e).toString();
          i.push(["X-Braze-Req-Attempt", r]);
          let o = !1;
          if (
            (null != t.respond_with &&
              t.respond_with.triggers &&
              (i.push(["X-Braze-TriggersRequest", "true"]), (o = !0)),
            null != t.respond_with &&
              t.respond_with.feed &&
              (i.push(["X-Braze-FeedRequest", "true"]), (o = !0)),
            e === V.O.wi)
          ) {
            i.push(["X-Braze-ContentCardsRequest", "true"]);
            let t = V.ju(this.C, V.O.wi);
            (t && !s) || ((t = 1), V.Mu(this.C, V.O.wi, t));
            const e = Math.max(0, t - 1);
            i.push(["BRAZE-SYNC-RETRY-COUNT", e.toString()]), (o = !0);
          }
          if (
            (e === V.O.Le &&
              (i.push(["X-Braze-FeatureFlagsRequest", "true"]), (o = !0)),
            o && i.push(["X-Braze-DataRequest", "true"]),
            this.Pa.jh())
          ) {
            const t = this.Pa.xh();
            null != t && i.push(["X-Braze-Auth-Signature", t]);
          }
          return i;
        }
        Xu(t, e, s, n) {
          const r = window.setTimeout(() => {
            i.info(`Retrying rate limited ${this.du(n)}SDK request.`),
              this.V(e, s, n);
          }, t);
          this.vu.push(r);
        }
        fo() {
          for (const t of this.vu) window.clearTimeout(t);
          this.vu = [];
        }
        V(t, e, s, n) {
          if (!this.$u(s))
            return (
              i.info(`${this.du(s)}SDK request being rate limited.`),
              void ("function" == typeof n && n())
            );
          const r = this.Fu();
          if (!r.Lu)
            return (
              i.info(
                `${this.du(
                  s
                )}SDK request being rate limited. Request will be retried in ${Math.trunc(
                  r.Eu / 1e3
                )} seconds.`
              ),
              void this.Xu(r.Eu, t, e, s)
            );
          this.C.Bt(U.gt.Ku, new Date().valueOf());
          const o = t.device;
          o && o.os_version instanceof Promise
            ? o.os_version.then((s) => {
                (t.device.os_version = s), e(r.Iu);
              })
            : e(r.Iu);
        }
        Pu(t) {
          const e = t ? X(t) : null;
          if (!e || !e["retry-after"]) return null;
          const s = e["retry-after"];
          return isNaN(s) && !isNaN(Date.parse(s))
            ? { type: "date", value: Date.parse(s) }
            : isNaN(parseFloat(s.toString()))
            ? (Ut.ut(n.qu, {
                e:
                  "Received unexpected value for retry-after header in /sync response: " +
                  s,
              }),
              null)
            : { type: "timestamp", value: 1e3 * parseFloat(s.toString()) };
        }
        rt(t, e, s, i, n, r) {
          if (V.ju(this.C, s) >= 15) return;
          let o;
          r = r || 0;
          const a = this.Pu(t);
          n();
          const u = (t) => {
            i(
              window.setTimeout(() => {
                e();
              }, t)
            ),
              V.Uu(this.C, s);
          };
          if (a && !isNaN(a.value)) {
            switch (a.type) {
              case "date":
                (o = a.value - new Date().getTime() + r), o < 0 && e();
                break;
              case "timestamp":
                o = a.value + r;
            }
            u(o);
          } else r ? u(r) : V.vi(this.C, s);
        }
        xu(t) {
          var e;
          null === (e = this.C) || void 0 === e || e.Bt(U.gt.Hu, t);
        }
        Ou(t, e) {
          let s = this.Gu();
          (s ??= {}), (s[t] = e), this.C.Bt(U.gt._u, s);
        }
        Wu() {
          var t;
          return null === (t = this.C) || void 0 === t ? void 0 : t.ft(U.gt.Hu);
        }
        Gu() {
          var t;
          return null === (t = this.C) || void 0 === t ? void 0 : t.ft(U.gt._u);
        }
        Yu(t, e, s, i, n = "") {
          let r;
          if (n) {
            const t = this.Gu();
            r = null == t || isNaN(t[n]) ? e : t[n];
          } else (r = this.Wu()), (null == r || isNaN(r)) && (r = e);
          const o = (t - i) / 1e3;
          return (r = Math.min(r + o / s, e)), r;
        }
        Ju(t, e) {
          return Math.max(0, (1 - t) * e * 1e3);
        }
        Qu(t, e = "") {
          var s, i, n, r, o;
          const a = { Lu: !0, Iu: -1, Eu: 0 };
          if (((t ??= !0), !t && !e)) return a;
          let u,
            l,
            h = null;
          if (t)
            h = null === (s = this.C) || void 0 === s ? void 0 : s.ft(U.gt.Ku);
          else {
            const t = V.Vu(this.C);
            if (null == t || null == t[e]) return a;
            h = t[e];
          }
          if (null == h || isNaN(h)) return a;
          if (
            (t
              ? ((u =
                  (null === (i = this.B) || void 0 === i ? void 0 : i.Zu()) ||
                  -1),
                (l =
                  (null === (n = this.B) || void 0 === n ? void 0 : n.tl()) ||
                  -1))
              : ((u =
                  (null === (r = this.B) || void 0 === r ? void 0 : r.el(e)) ||
                  -1),
                (l =
                  (null === (o = this.B) || void 0 === o ? void 0 : o.il(e)) ||
                  -1)),
            -1 === u || -1 === l)
          )
            return a;
          const c = new Date().valueOf();
          let d = this.Yu(c, u, l, h, e);
          return d < 1
            ? ((a.Lu = !1), (a.Eu = this.Ju(d, l)), a)
            : ((d = Math.trunc(d) - 1),
              (a.Iu = d),
              t ? this.xu(d) : this.Ou(e, d),
              a);
        }
        Fu() {
          return this.Qu(!0);
        }
        $u(t) {
          const e = this.Qu(!1, t);
          return !(e && !e.Lu);
        }
        it() {
          this.Pa.it();
        }
        Z() {
          return this.La;
        }
        addSdkMetadata(t) {
          for (const e of t) -1 === this.fu.indexOf(e) && this.fu.push(e);
        }
      });
  }))();
}
function Ge() {
  return (Ge = t(() => {
    W = (t, e) => (
      (t = Math.ceil(t)),
      (e = Math.floor(e)),
      Math.floor(Math.random() * (e - t + 1)) + t
    );
  }))();
}
function Xe() {
  return (Xe = t(() => {
    Q = class {
      constructor(t = !1, e = []) {
        (this.tt = t), (this.$e = e), (this.tt = t), (this.$e = e);
      }
      ns(t) {
        (this.tt = this.tt && t.tt), this.$e.push(...t.$e);
      }
    };
  }))();
}
function Ke() {
  return (Ke = t(() => {
    Z = {
      mn: () =>
        "serviceWorker" in navigator &&
        "undefined" != typeof ServiceWorkerRegistration &&
        "showNotification" in ServiceWorkerRegistration.prototype &&
        "PushManager" in window,
      vn: () =>
        "safari" in window &&
        "pushNotification" in window.safari &&
        "function" == typeof window.safari.pushNotification.permission &&
        "function" == typeof window.safari.pushNotification.requestPermission,
      isPushSupported: () => Z.mn() || Z.vn(),
      isPushBlocked: () => {
        const t =
            Z.isPushSupported() &&
            "Notification" in window &&
            null != window.Notification &&
            null != window.Notification.permission &&
            "denied" === window.Notification.permission,
          e =
            Z.isPushSupported() &&
            (!("Notification" in window) || null == window.Notification);
        return t || e;
      },
      isPushPermissionGranted: () =>
        Z.isPushSupported() &&
        "Notification" in window &&
        null != window.Notification &&
        null != window.Notification.permission &&
        "granted" === window.Notification.permission,
      Tr: () =>
        !Z.isPushBlocked() &&
        Z.isPushSupported() &&
        !Z.isPushPermissionGranted(),
    };
  }))();
}
function We() {
  return (We = t(() => {
    He(),
      ce(),
      Ks(),
      Ge(),
      Xe(),
      Ft(),
      zt(),
      jt(),
      Mt(),
      $e(),
      ue(),
      Ke(),
      Je(),
      e(),
      (Y = class {
        constructor(t, e, s, i, n, r, o, a, u, l) {
          (this.an = t),
            (this.baseUrl = e),
            (this.T = s),
            (this.hn = i),
            (this.Cs = n),
            (this.B = r),
            (this.C = o),
            (this.$l = a),
            (this.Pa = u),
            (this.S = l),
            (this.an = t),
            (this.baseUrl = e),
            (this.Tl = 0),
            (this.dE = o.IE() || 0),
            (this.Ml = null),
            (this.T = s),
            (this.hn = i),
            (this.Cs = n),
            (this.B = r),
            (this.C = o),
            (this.Pa = u),
            (this.S = l),
            (this.$l = a),
            (this.Pl = new b()),
            (this.Ol = null),
            (this.Ul = 50),
            (this._l = !1);
        }
        Kl(t, e) {
          return !t && !e && this.Pa.Kh() >= this.Ul;
        }
        Xl(t) {
          let e = this.T.zl();
          if (t.length > 0) {
            const s = this.Cs.getUserId();
            for (const i of t) {
              const t = (!i.userId && !s) || i.userId === s;
              i.type === n.Fl && t && (e = !0);
            }
          }
          return e;
        }
        Ql(t = !1, e = !1, s = !0, n, r, o, a = !1, u = !1) {
          s && this.Yl();
          const l = this.C.AE(),
            h = this.C.OE();
          let c = !1;
          const d = (t, e, i = -1) => {
              const a = new Date().valueOf();
              V.W(this.C, V.O.Nu, a),
                -1 !== i &&
                  e.push(["X-Braze-Req-Tokens-Remaining", i.toString()]);
              let u = !1;
              G.Y({
                url: this.baseUrl + "/data/",
                data: t,
                headers: e,
                tt: (s) => {
                  null != t.respond_with &&
                    t.respond_with.triggers &&
                    (this.Tl = Math.max(this.Tl - 1, 0)),
                    this.S.st(t, s, e)
                      ? (this.Pa.it(),
                        this.B.gl(s),
                        (null != t.respond_with &&
                          t.respond_with.user_id != this.Cs.getUserId()) ||
                          (null != t.device && this.C.Bt(U.gt.oc, t.device),
                          null != t.sdk_metadata &&
                            (this.C.Bt(U.gt.pu, t.sdk_metadata),
                            this.C.Bt(U.gt.Ru, this.T.St())),
                          this.$l(s),
                          V.Mu(this.C, V.O.Nu, 1),
                          "function" == typeof n && n()))
                      : s.auth_error && (u = !0);
                },
                error: () => {
                  (u = !0),
                    null != t.respond_with &&
                      t.respond_with.triggers &&
                      (this.Tl = Math.max(this.Tl - 1, 0)),
                    this.S.gu(t.events, t.attributes),
                    "function" == typeof r && r();
                },
                nt: (t, e) => {
                  "function" == typeof o && o(!u);
                  const i = this.S.Pu(e);
                  let n = 0;
                  if (i)
                    switch (i.type) {
                      case "date":
                        n = Math.max(i.value - new Date().valueOf(), 0);
                        break;
                      case "timestamp":
                        n = i.value;
                    }
                  if (s && !c) {
                    if (u) {
                      V.Uu(this.C, V.O.Nu);
                      let t = this.Ml;
                      (null == t || t < 1e3 * this.dE) && (t = 1e3 * this.dE);
                      const e = Math.min(3e5, W(1e3 * this.dE, 3 * t)) + n;
                      this.Zl(e);
                    } else this.Zl(Math.max(1e3 * this.dE, n));
                    c = !0;
                  }
                },
              });
            },
            f = this.Xl(l),
            g = e || f;
          if (this.Kl(a, f))
            return void i.info(
              "Declining to flush data due to 50 consecutive authentication failures"
            );
          if (s && !this.S.yu(l, h, t, g))
            return this.Zl(), void ("function" == typeof o && o(!0));
          const p = this.S.wu(t, g, l, h, u);
          g && this.Tl++;
          let m = !1;
          if (p)
            for (const i of p)
              this.S.V(
                i.requestData,
                (t) => d(i.requestData, i.headers, t),
                V.O.Nu,
                r
              ),
                (m = !0);
          this.Pa.jh() && s && !m
            ? this.Zl()
            : f && (i.info("Invoking new session subscriptions"), this.Pl.X());
        }
        dc() {
          return this.Tl > 0;
        }
        Zl(t = 1e3 * this.dE) {
          this._l ||
            (this.Yl(),
            (this.Ol = window.setTimeout(() => {
              if (document.hidden) {
                const t = "visibilitychange",
                  e = () => {
                    document.hidden ||
                      (document.removeEventListener(t, e, !1), this.Ql());
                  };
                document.addEventListener(t, e, !1);
              } else this.Ql();
            }, t)),
            (this.Ml = t));
        }
        Yl() {
          null != this.Ol && (clearTimeout(this.Ol), (this.Ol = null));
        }
        initialize() {
          (this._l = !1), this.Zl();
        }
        destroy() {
          this.Pl.removeAllSubscriptions(),
            this.Pa.Hh(),
            this.Yl(),
            (this._l = !0),
            this.Ql(void 0, void 0, !1, void 0, void 0, void 0, void 0, !0),
            (this.Ol = null);
        }
        on(t) {
          return this.Pl.Dt(t);
        }
        openSession() {
          const t = this.T.St() !== this.T.Qo();
          t && (this.C.TE(U.iu.Na), this.C.TE(U.iu.su)),
            this.Ql(void 0, !1, void 0, () => {
              this.C.Ut(U.gt.Ge);
            }),
            this.Qn(),
            t &&
              s(
                () =>
                  import("./push-manager-factory-CQp_9BCr.js")
                    .then((t) => (t.t(), t.n))
                    .then((t) => {
                      if (this._l) return;
                      const e = t.default.ea();
                      if (
                        null != e &&
                        (Z.isPushPermissionGranted() || Z.isPushBlocked())
                      ) {
                        const t = () => {
                            e.wn()
                              ? i.info(
                                  "Push token maintenance is disabled, not refreshing token for backend."
                                )
                              : e.subscribe();
                          },
                          s = (e, s) => {
                            s && t();
                          },
                          n = () => {
                            const e = this.C.ft(U.gt.zn);
                            (null == e || e) && t();
                          },
                          r = a.Ls.Fs;
                        new a(r, i).cr(r.Ms.cu, s, n);
                      }
                    }),
                __vite__mapDeps([0, 1])
              );
        }
        mc() {
          this.C.Ut(U.gt.Xe), this.C.Ut(U.gt.Hs), this.C.Ut(U.gt.Kr);
        }
        changeUser(t, e, s) {
          const n = this.Cs.getUserId();
          if (n !== t) {
            this.T.Il(),
              this.mc(),
              null != n && this.Ql(void 0, !1, void 0, void 0, void 0),
              this.Cs.ou(t),
              s ? this.Pa.setSdkAuthenticationSignature(s) : this.Pa.Bh();
            for (let t = 0; t < e.length; t++) e[t].changeUser(null == n);
            this.S.fo(),
              null != n && this.C.Ut(U.gt.Zt),
              this.C.Ut(U.gt.oc),
              this.C.Ut(U.gt._E),
              this.openSession(),
              i.info('Changed user to "' + t + '".');
          } else {
            let e = "Doing nothing.";
            s &&
              this.Pa.xh() !== s &&
              (this.Pa.setSdkAuthenticationSignature(s),
              (e = "Updated SDK authentication signature")),
              i.info(`Current user is already ${t}. ${e}`);
          }
        }
        requestImmediateDataFlush(t) {
          this.Yl(),
            this.T.Qo(),
            this.Ql(
              void 0,
              void 0,
              void 0,
              void 0,
              () => {
                i.error(
                  "Failed to flush data, request will be retried automatically."
                );
              },
              t,
              !0
            );
        }
        requestFeedRefresh() {
          this.T.Qo(), this.Ql(!0);
        }
        br(t, e) {
          this.T.Qo(),
            i.info("Requesting explicit trigger refresh."),
            this.Ql(void 0, !0, void 0, t, e);
        }
        Cn(t, e) {
          const s = n.fc,
            r = { a: t, l: e },
            o = Ut.ut(s, r);
          return (
            o &&
              (i.info(`Logged alias ${t} with label ${e}`),
              this.C.Bt(U.gt._E, r)),
            o
          );
        }
        Ln(t, e, s) {
          if (this.B.hu(e))
            return (
              i.info(`Custom Attribute "${e}" is blocklisted, ignoring.`),
              new Q()
            );
          const n = { key: e, value: s },
            r = Ut.ut(t, n);
          if (r) {
            const t = "object" == typeof s ? JSON.stringify(s, null, 2) : s;
            i.info(`Logged custom attribute: ${e} with value: ${t}`);
          }
          return r;
        }
        setLastKnownLocation(t, e, s, r, o, a) {
          const u = { latitude: e, longitude: s };
          null != r && (u.altitude = r),
            null != o && (u.ll_accuracy = o),
            null != a && (u.alt_accuracy = a);
          const l = Ut.ut(n.vc, u, t || void 0);
          return (
            l &&
              i.info(
                `Set user last known location as ${JSON.stringify(u, null, 2)}`
              ),
            l
          );
        }
        lr(t, e) {
          const s = this.T.Qo();
          return new v(this.Cs.getUserId(), n.bc, t, s, { cid: e });
        }
        wc(t, e) {
          return new a(t, e);
        }
        Qn() {
          const t = a.Ls.Fs;
          this.wc(t, i).setItem(t.Ms.Nu, 1, {
            baseUrl: this.baseUrl,
            data: { api_key: this.an, device_id: this.hn.ve().id },
            userId: this.Cs.getUserId(),
            sdkAuthEnabled: this.Pa.jh(),
          });
        }
        vr(t) {
          for (const e of t)
            if (e.api_key === this.an) this.S.gu(e.events, e.attributes);
            else {
              const t = a.Ls.Fs;
              new a(t, i).setItem(t.Ms.kr, o.ce(), e);
            }
        }
        Kn(t, e, s) {
          if (this.B.hu(t))
            return (
              i.info(`Custom Attribute "${t}" is blocklisted, ignoring.`),
              new Q()
            );
          let r, o;
          return (
            null === e && null === s
              ? ((r = n.kc), (o = { key: t }))
              : ((r = n.yc), (o = { key: t, latitude: e, longitude: s })),
            Ut.ut(r, o)
          );
        }
        Mn(t, e) {
          const s = { group_id: t, status: e };
          return Ut.ut(n.jc, s);
        }
      });
  }))();
}
function Qe() {
  return (Qe = t(() => {
    ae(),
      (tt = class t {
        constructor(
          t = 0,
          e = [],
          s = [],
          i = [],
          n = null,
          r = null,
          o = { enabled: !1 },
          a = { enabled: !1, refresh_rate_limit: void 0 },
          u = {
            enabled: !0,
            capacity: 30,
            refill_rate: 30,
            endpoint_overrides: {},
          },
          l = null
        ) {
          (this.dl = t),
            (this.Rl = e),
            (this.Cl = s),
            (this.El = i),
            (this.yl = n),
            (this.fl = r),
            (this.vl = o),
            (this.De = a),
            (this.bl = u),
            (this.banners = l),
            (this.dl = t),
            (this.Rl = e),
            (this.Cl = s),
            (this.El = i),
            (this.yl = n),
            (this.fl = r),
            (this.vl = o),
            (this.De = a),
            (this.bl = u),
            (this.banners = l);
        }
        bt() {
          return {
            s: "5.9.0",
            l: this.dl,
            e: this.Rl,
            a: this.Cl,
            p: this.El,
            m: this.yl,
            v: this.fl,
            c: this.vl,
            f: this.De,
            grl: this.bl,
            b: this.banners,
          };
        }
        static Rn(e) {
          let s = e.l;
          return (
            "5.9.0" !== e.s && (s = 0),
            new t(s, e.e, e.a, e.p, e.m, e.v, e.c, e.f, e.grl, e.b)
          );
        }
      });
  }))();
}
function Ze() {
  return (Ze = t(() => {
    $e(),
      ue(),
      Qe(),
      Ks(),
      Mt(),
      (et = class {
        constructor(t) {
          (this.C = t),
            (this.C = t),
            (this.sl = new b()),
            (this.rl = new b()),
            (this.ul = new b()),
            (this.al = new b()),
            (this.hl = null),
            (this.ol = null);
        }
        cl() {
          if (null == this.ol) {
            const t = this.C.ft(U.gt.ml);
            this.ol = null != t ? tt.Rn(t) : new tt();
          }
          return this.ol;
        }
        Et() {
          return this.cl().dl;
        }
        gl(t) {
          var e, s;
          if (null != t && null != t.config) {
            const i = t.config;
            if (i.time > this.cl().dl) {
              const t = (t) => (null == t ? this.cl().bl : t),
                n = new tt(
                  i.time,
                  i.events_blacklist,
                  i.attributes_blacklist,
                  i.purchases_blacklist,
                  i.messaging_session_timeout,
                  i.vapid_public_key,
                  i.content_cards,
                  i.feature_flags,
                  t(i.global_request_rate_limit),
                  i.banners
                );
              let r = !1;
              null != n.fl && this.In() !== n.fl && (r = !0);
              let o = !1;
              null != n.vl.enabled && this.yi() !== n.vl.enabled && (o = !0);
              let a = !1;
              null != n.De.enabled && this.ke() !== n.De.enabled && (a = !0);
              let u = !1;
              null !=
                (null === (e = n.banners) || void 0 === e
                  ? void 0
                  : e.enabled) &&
                this.zt() !==
                  (null === (s = n.banners) || void 0 === s
                    ? void 0
                    : s.enabled) &&
                (u = !0),
                (this.ol = n),
                this.C.Bt(U.gt.ml, n.bt()),
                r && this.sl.X(),
                o && this.rl.X(),
                a && this.ul.X(),
                u && this.al.X();
            }
          }
        }
        Vn(t) {
          const e = this.sl.Dt(t);
          return (
            this.hl && this.sl.removeSubscription(this.hl), (this.hl = e), e
          );
        }
        gi(t) {
          return this.rl.Dt(t);
        }
        Ke(t) {
          return this.ul.Dt(t);
        }
        A(t) {
          return this.al.Dt(t);
        }
        je(t) {
          return -1 !== this.cl().Rl.indexOf(t);
        }
        hu(t) {
          return -1 !== this.cl().Cl.indexOf(t);
        }
        Dr(t) {
          return -1 !== this.cl().El.indexOf(t);
        }
        wl() {
          return this.cl().yl;
        }
        In() {
          return this.cl().fl;
        }
        yi() {
          return this.cl().vl.enabled || !1;
        }
        Ll() {
          const t = this.cl().bl;
          return !(!t || null == t.enabled) && t.enabled;
        }
        Zu() {
          if (!this.Ll()) return -1;
          const t = this.cl().bl;
          return null == t.capacity || t.capacity < 10 ? -1 : t.capacity;
        }
        tl() {
          if (!this.Ll()) return -1;
          const t = this.cl().bl;
          return null == t.refill_rate || t.refill_rate <= 0
            ? -1
            : t.refill_rate;
        }
        Bl(t) {
          const e = this.cl().bl.endpoint_overrides;
          return null == e ? null : e[t];
        }
        el(t) {
          const e = this.Bl(t);
          return null == e || isNaN(e.capacity) || e.capacity <= 0
            ? -1
            : e.capacity;
        }
        il(t) {
          const e = this.Bl(t);
          return null == e || isNaN(e.refill_rate) || e.refill_rate <= 0
            ? -1
            : e.refill_rate;
        }
        ke() {
          return this.cl().De.enabled && null == this.Oe()
            ? (Ut.ut(n.qu, { e: "Missing feature flag refresh_rate_limit." }),
              !1)
            : this.cl().De.enabled || !1;
        }
        Oe() {
          return this.cl().De.refresh_rate_limit;
        }
        zt() {
          var t;
          return (
            (null === (t = this.cl().banners) || void 0 === t
              ? void 0
              : t.enabled) || null
          );
        }
        ne() {
          var t;
          return (
            (null === (t = this.cl().banners) || void 0 === t
              ? void 0
              : t.max_placements) || 0
          );
        }
      });
  }))();
}
function Ye() {
  return (Ye = t(() => {
    $e(),
      ce(),
      fe(),
      oe(),
      Ft(),
      jt(),
      Mt(),
      (st = class {
        constructor(t, e, s, n) {
          (this.C = t),
            (this.Cs = e),
            (this.B = s),
            (this.Sl = n),
            (this.C = t),
            (this.Cs = e),
            (this.B = s),
            (this.jl = 1e3),
            (null == n || isNaN(n)) && (n = 1800),
            n < this.jl / 1e3 &&
              (i.info(
                "Specified session timeout of " +
                  n +
                  "s is too small, using the minimum session timeout of " +
                  this.jl / 1e3 +
                  "s instead."
              ),
              (n = this.jl / 1e3)),
            (this.Sl = n);
        }
        xl(t, e) {
          return new v(this.Cs.getUserId(), n.Dl, t, e.eu, { d: Yt(t - e.Gl) });
        }
        St() {
          const t = this.C.tu(U.iu.Nl);
          return null == t ? null : t.eu;
        }
        zl() {
          const t = new Date().valueOf(),
            e = this.B.wl();
          if (null == e) return !1;
          const s = this.C.ft(U.gt.Hl),
            i = null == s || t - s > 1e3 * e;
          return i && this.C.Bt(U.gt.Hl, t), i;
        }
        Wl(t, e) {
          return (
            null == e || null == e.kl || (!(t - e.Gl < this.jl) && e.kl < t)
          );
        }
        Qo() {
          const t = new Date().valueOf(),
            e = t + 1e3 * this.Sl,
            s = this.C.tu(U.iu.Nl);
          if (this.Wl(t, s)) {
            let r = "Generating session start event with time " + t;
            if (null != s) {
              let t = s.ql;
              t - s.Gl < this.jl && (t = s.Gl + this.jl),
                this.C.Al(this.xl(t, s)),
                (r += " (old session ended " + t + ")");
            }
            (r += ". Will expire " + e.valueOf()), i.info(r);
            const a = new E(o.ce(), e);
            return (
              this.C.Al(new v(this.Cs.getUserId(), n.Fl, t, a.eu)),
              this.C.uu(U.iu.Nl, a),
              this.C.ft(U.gt.Hl) ?? this.C.Bt(U.gt.Hl, t),
              a.eu
            );
          }
          if (null != s)
            return (s.ql = t), (s.kl = e), this.C.uu(U.iu.Nl, s), s.eu;
        }
        Il() {
          const t = this.C.tu(U.iu.Nl);
          null != t &&
            (this.C.Jl(U.iu.Nl), this.C.Al(this.xl(new Date().valueOf(), t)));
        }
      });
  }))();
}
function ts() {
  return (ts = t(() => {
    $e(),
      Ft(),
      (it = {
        Ya: function (t, e = !1) {
          let s = !1;
          try {
            if (localStorage && localStorage.getItem)
              try {
                localStorage.setItem(U.gt.ac, "true"),
                  localStorage.getItem(U.gt.ac) &&
                    (localStorage.removeItem(U.gt.ac), (s = !0));
              } catch (t) {
                if (
                  !(
                    t instanceof Error &&
                    ("QuotaExceededError" === t.name ||
                      "NS_ERROR_DOM_QUOTA_REACHED" === t.name) &&
                    localStorage.length > 0
                  )
                )
                  throw t;
                s = !0;
              }
          } catch (t) {
            i.info("Local Storage not supported!");
          }
          const n = it.cc(),
            r = new F.lc(t, n && !e, s);
          let o;
          return (o = s ? new F.gc(t) : new F.uc()), new F(r, o);
        },
        cc: function () {
          return (
            navigator.cookieEnabled ||
            ("cookie" in document &&
              (document.cookie.length > 0 ||
                (document.cookie = "test").indexOf.call(
                  document.cookie,
                  "test"
                ) > -1))
          );
        },
      });
  }))();
}
function es() {
  return (es = t(() => {
    nt = class t {
      constructor(t, e) {
        (this.triggerId = t),
          (this.messageExtras = e),
          (this.triggerId = t),
          (this.messageExtras = e),
          (this.extras = {}),
          (this.isControl = !0),
          (this.Ht = !1);
      }
      static fromJson(e) {
        return new t(e.trigger_id, e.message_extras);
      }
      _t() {
        return !this.Ht && ((this.Ht = !0), !0);
      }
      Bo() {
        return this.Ht;
      }
    };
  }))();
}
function ss(t, e = !1, s = !1, i = !1) {
  if (null == t) return !1;
  (e = e || !1), (s = s || !1);
  const n = t.getBoundingClientRect();
  return (
    null != n &&
    ((n.top >= 0 &&
      n.top <= (window.innerHeight || document.documentElement.clientHeight)) ||
      !e) &&
    (n.left >= 0 || !i) &&
    ((n.bottom >= 0 &&
      n.bottom <=
        (window.innerHeight || document.documentElement.clientHeight)) ||
      !s) &&
    (n.right <= (window.innerWidth || document.documentElement.clientWidth) ||
      !i)
  );
}
function is() {
  if (null == rt.Ic) {
    rt.Ic = !1;
    try {
      const t = Object.defineProperty({}, "passive", {
        get: () => {
          rt.Ic = !0;
        },
      });
      window.addEventListener("testPassive", () => {}, t),
        window.removeEventListener("testPassive", () => {}, t);
    } catch (j) {
      i.error(y(j));
    }
  }
  return rt.Ic;
}
function ns(t, e, s = () => {}) {
  t.addEventListener(e, s, !!is() && { passive: !0 });
}
function rs(t) {
  return rt.Ho(t, !0, !1, !1);
}
function os(t) {
  return rt.Ho(t, !1, !0, !1);
}
function as(t) {
  if (t.onclick) {
    const e = document.createEvent("MouseEvents");
    e.initEvent("click", !0, !0), t.onclick.apply(t, [e]);
  }
}
function us(t, e, s) {
  let i = null,
    n = null;
  ns(t, "touchstart", (t) => {
    (i = t.touches[0].clientX), (n = t.touches[0].clientY);
  }),
    ns(t, "touchmove", (r) => {
      if (null == i || null == n) return;
      const o = i - r.touches[0].clientX,
        a = n - r.touches[0].clientY;
      Math.abs(o) > Math.abs(a) && Math.abs(o) >= 25
        ? (((o > 0 && e === ot.ie) || (o < 0 && e === ot.de)) && s(r),
          (i = null),
          (n = null))
        : Math.abs(a) >= 25 &&
          (((a > 0 &&
            e === ot.qo &&
            t.scrollTop === t.scrollHeight - t.offsetHeight) ||
            (a < 0 && e === ot.yo && 0 === t.scrollTop)) &&
            s(r),
          (i = null),
          (n = null));
    });
}
function ls(t, e, s) {
  const i = "http://www.w3.org/2000/svg",
    n = document.createElementNS(i, "svg");
  n.setAttribute("viewBox", t), n.setAttribute("xmlns", i);
  const r = document.createElementNS(i, "path");
  return (
    r.setAttribute("d", e),
    null != s && r.setAttribute("fill", s),
    n.appendChild(r),
    n
  );
}
function hs() {
  return (hs = t(() => {
    Ft(),
      de(),
      (rt = { Ic: null, Ho: ss }),
      (ot = { qo: "up", yo: "down", ie: "left", de: "right" });
  }))();
}
function cs() {
  return (cs = t(() => {
    at = { Wo: 32, Ao: 9, Xo: 13, _h: 27 };
  }))();
}
function ds() {
  return (ds = t(() => {
    ut = (t) => null !== t && "IFRAME" === t.tagName;
  }))();
}
function fs() {
  return (fs = t(() => {
    Xs(),
      Le(),
      hs(),
      cs(),
      ue(),
      ds(),
      (lt = class t {
        constructor(
          e,
          s,
          i,
          n,
          r,
          o,
          a,
          u,
          l,
          h,
          c,
          d,
          f,
          g,
          p,
          m,
          v,
          y,
          E,
          w,
          C,
          S,
          O,
          _,
          T,
          N,
          A,
          I,
          k,
          B
        ) {
          (this.message = e),
            (this.messageAlignment = s),
            (this.slideFrom = i),
            (this.extras = n),
            (this.triggerId = r),
            (this.clickAction = o),
            (this.uri = a),
            (this.openTarget = u),
            (this.dismissType = l),
            (this.duration = h),
            (this.icon = c),
            (this.imageUrl = d),
            (this.imageStyle = f),
            (this.iconColor = g),
            (this.iconBackgroundColor = p),
            (this.backgroundColor = m),
            (this.textColor = v),
            (this.closeButtonColor = y),
            (this.animateIn = E),
            (this.animateOut = w),
            (this.header = C),
            (this.headerAlignment = S),
            (this.headerTextColor = O),
            (this.frameColor = _),
            (this.buttons = T),
            (this.cropType = N),
            (this.orientation = A),
            (this.htmlId = I),
            (this.css = k),
            (this.messageExtras = B),
            (this.message = e),
            (this.messageAlignment = s || t.TextAlignment.CENTER),
            (this.duration = h || 5e3),
            (this.slideFrom = i || t.SlideFrom.BOTTOM),
            (this.extras = n || {}),
            (this.triggerId = r),
            (this.clickAction = o || t.ClickAction.NONE),
            (this.uri = a),
            (this.openTarget = u || t.OpenTarget.NONE),
            (this.dismissType = l || t.DismissType.AUTO_DISMISS),
            (this.icon = c),
            (this.imageUrl = d),
            (this.imageStyle = f || t.ImageStyle.TOP),
            (this.iconColor = g || t.th.ih),
            (this.iconBackgroundColor = p || t.th.sh),
            (this.backgroundColor = m || t.th.ih),
            (this.textColor = v || t.th.hh),
            (this.closeButtonColor = y || t.th.eh),
            (this.animateIn = E),
            (this.animateIn ??= !0),
            (this.animateOut = w),
            (this.animateOut ??= !0),
            (this.header = C),
            (this.headerAlignment = S || t.TextAlignment.CENTER),
            (this.headerTextColor = O || t.th.hh),
            (this.frameColor = _ || t.th.Eh),
            (this.buttons = T || []),
            (this.cropType = N || t.CropType.FIT_CENTER),
            (this.orientation = A),
            (this.htmlId = I),
            (this.css = k),
            (this.isControl = !1),
            (this.messageExtras = B),
            (this.nh = !1),
            (this.Ht = !1),
            (this.So = !1),
            (this.Th = !1),
            (this.jo = null),
            (this.wo = null),
            (this.ti = new b()),
            (this.oh = new b()),
            (this.$o = t.TextAlignment.CENTER);
        }
        subscribeToClickedEvent(t) {
          return this.ti.Dt(t);
        }
        subscribeToDismissedEvent(t) {
          return this.oh.Dt(t);
        }
        removeSubscription(t) {
          this.ti.removeSubscription(t), this.oh.removeSubscription(t);
        }
        removeAllSubscriptions() {
          this.ti.removeAllSubscriptions(), this.oh.removeAllSubscriptions();
        }
        closeMessage() {
          this.ll(this.jo);
        }
        vo() {
          return !0;
        }
        Po() {
          return this.vo();
        }
        ho() {
          return null != this.htmlId && this.htmlId.length > 4;
        }
        lo() {
          return this.ho() && null != this.css && this.css.length > 0;
        }
        do() {
          if (this.ho() && this.lo()) return this.htmlId + "-css";
        }
        _t() {
          return !this.Ht && ((this.Ht = !0), !0);
        }
        Bo() {
          return this.Ht;
        }
        $t(t) {
          return !this.So && ((this.So = !0), this.ti.X(), !0);
        }
        Qt() {
          return !this.Th && ((this.Th = !0), this.oh.X(), !0);
        }
        hide(e) {
          if (e && e.parentNode) {
            let s = e.closest(".ab-iam-root");
            if (((s ??= e), this.vo() && null != s.parentNode)) {
              const e = s.parentNode.classList;
              e && e.contains(t.rh) && e.remove(t.rh),
                document.body.removeEventListener("touchmove", t.lh);
            }
            s.className = s.className.replace(t.uh, t.ah);
          }
          return this.animateOut || !1;
        }
        ll(e, s) {
          if (null == e) return;
          let i;
          (this.jo = null),
            (i =
              -1 === e.className.indexOf("ab-in-app-message")
                ? e.getElementsByClassName("ab-in-app-message")[0]
                : e);
          let n = !1;
          i && (n = this.hide(i));
          const r = document.body;
          let o;
          null != r && (o = r.scrollTop);
          const a = () => {
            if (e && e.parentNode) {
              let t = e.closest(".ab-iam-root");
              (t ??= e), t.parentNode && t.parentNode.removeChild(t);
            }
            const t = this.do();
            if (null != t) {
              const e = document.getElementById(t);
              e && e.parentNode && e.parentNode.removeChild(e);
            }
            null != r && "Safari" === $.browser && (r.scrollTop = o),
              s ? s() : this.Qt();
          };
          n ? setTimeout(a, t.Ih) : a(), this.wo && this.wo.focus();
        }
        zo() {
          return document.createTextNode(this.message || "");
        }
        ko(t) {
          let e = "";
          this.message || this.header || !this.vo() || (e = "Modal Image"),
            t.setAttribute("alt", e);
        }
        static lh(e) {
          if (e.targetTouches && e.targetTouches.length > 1) return;
          const s = e.target;
          (s &&
            s.classList &&
            s.classList.contains("ab-message-text") &&
            s.scrollHeight > s.clientHeight) ||
            (document.querySelector(`.${t.rh}`) &&
              e.cancelable &&
              e.preventDefault());
        }
        Ah(e) {
          const s = e.parentNode;
          this.vo() &&
            null != s &&
            this.orientation !== t.Orientation.LANDSCAPE &&
            (null != s.classList && s.classList.add(t.rh),
            document.body.addEventListener(
              "touchmove",
              t.lh,
              !!is() && { passive: !1 }
            )),
            (e.className += " " + t.uh);
        }
        static Oh(t) {
          if (
            t.keyCode === at._h &&
            !$t.ee(Pt.mh) &&
            document.querySelectorAll(".ab-modal-interactions").length > 0
          ) {
            const t = document.getElementsByClassName("ab-html-message");
            let e = !1;
            for (const s of t) {
              let t = null;
              ut(s) &&
                s.contentWindow &&
                (t = s.contentWindow.document.getElementsByClassName(
                  "ab-programmatic-close-button"
                )[0]),
                null != t && (as(t), (e = !0));
            }
            if (!e) {
              const t = document.querySelectorAll(
                ".ab-modal-interactions > .ab-close-button"
              )[0];
              null != t && as(t);
            }
          }
        }
        Lh() {
          this.nh ||
            $t.ee(Pt.mh) ||
            (document.addEventListener("keydown", t.Oh, !1),
            $t.Nh(() => {
              document.removeEventListener("keydown", t.Oh);
            }),
            (this.nh = !0));
        }
        bt(e) {
          const s = {};
          return e
            ? ((s[t.es.ra] = this.message),
              (s[t.es.sa] = this.messageAlignment),
              (s[t.es.Sh] = this.slideFrom),
              (s[t.es.qs] = this.extras),
              (s[t.es.ta] = this.triggerId),
              (s[t.es.ia] = this.clickAction),
              (s[t.es.URI] = this.uri),
              (s[t.es.oa] = this.openTarget),
              (s[t.es.pa] = this.dismissType),
              (s[t.es.ma] = this.duration),
              (s[t.es.na] = this.icon),
              (s[t.es.ls] = this.imageUrl),
              (s[t.es.ua] = this.imageStyle),
              (s[t.es.ca] = this.iconColor),
              (s[t.es.fa] = this.iconBackgroundColor),
              (s[t.es.da] = this.backgroundColor),
              (s[t.es.la] = this.textColor),
              (s[t.es.ga] = this.closeButtonColor),
              (s[t.es.ja] = this.animateIn),
              (s[t.es.xa] = this.animateOut),
              (s[t.es.za] = this.header),
              (s[t.es.ha] = this.headerAlignment),
              (s[t.es.va] = this.headerTextColor),
              (s[t.es.wa] = this.frameColor),
              (s[t.es.ya] = this.buttons),
              (s[t.es.Sa] = this.cropType),
              (s[t.es.ba] = this.orientation),
              (s[t.es.ka] = this.htmlId),
              (s[t.es.CSS] = this.css),
              (s[t.es.hs] = e),
              (s[t.es.qa] = this.messageExtras),
              s)
            : s;
        }
      }),
      (lt.th = {
        hh: 4281545523,
        ih: 4294967295,
        sh: 4278219733,
        Rh: 4293914607,
        Mh: 4283782485,
        Eh: 3224580915,
        eh: 4288387995,
      }),
      (lt.Co = {
        Dh: "hd",
        xo: "ias",
        Ch: "of",
        dh: "do",
        Uh: "umt",
        bh: "tf",
        Ph: "te",
      }),
      (lt.SlideFrom = { TOP: "TOP", BOTTOM: "BOTTOM" }),
      (lt.ClickAction = { NEWS_FEED: "NEWS_FEED", URI: "URI", NONE: "NONE" }),
      (lt.DismissType = { AUTO_DISMISS: "AUTO_DISMISS", MANUAL: "SWIPE" }),
      (lt.OpenTarget = { NONE: "NONE", BLANK: "BLANK" }),
      (lt.ImageStyle = { TOP: "TOP", GRAPHIC: "GRAPHIC" }),
      (lt.Orientation = { PORTRAIT: "PORTRAIT", LANDSCAPE: "LANDSCAPE" }),
      (lt.TextAlignment = { START: "START", CENTER: "CENTER", END: "END" }),
      (lt.CropType = { CENTER_CROP: "CENTER_CROP", FIT_CENTER: "FIT_CENTER" }),
      (lt.bo = {
        Wr: "SLIDEUP",
        Vr: "MODAL",
        Fo: "MODAL_STYLED",
        Lr: "FULL",
        Ur: "WEB_HTML",
        po: "HTML",
        Jo: "HTML_FULL",
      }),
      (lt.Ih = 500),
      (lt.ph = 200),
      (lt.uh = "ab-show"),
      (lt.ah = "ab-hide"),
      (lt.rh = "ab-pause-scrolling"),
      (lt.es = {
        ra: "m",
        sa: "ma",
        Sh: "sf",
        qs: "e",
        ta: "ti",
        ia: "ca",
        URI: "u",
        oa: "oa",
        pa: "dt",
        ma: "d",
        na: "i",
        ls: "iu",
        ua: "is",
        ca: "ic",
        fa: "ibc",
        da: "bc",
        la: "tc",
        ga: "cbc",
        ja: "ai",
        xa: "ao",
        za: "h",
        ha: "ha",
        va: "htc",
        wa: "fc",
        ya: "b",
        Sa: "ct",
        ba: "o",
        ka: "hi",
        CSS: "css",
        hs: "type",
        Eo: "messageFields",
        qa: "me",
      });
  }))();
}
function gs() {
  return (gs = t(() => {
    fs(),
      (ht = class t extends lt {
        constructor(t, e, s, i, n, r, o, a, u, l, h, c) {
          super(
            t,
            void 0,
            void 0,
            e,
            s,
            void 0,
            void 0,
            void 0,
            (i = i || lt.DismissType.MANUAL),
            n,
            void 0,
            void 0,
            void 0,
            void 0,
            void 0,
            void 0,
            void 0,
            void 0,
            r,
            o,
            void 0,
            void 0,
            void 0,
            a,
            void 0,
            void 0,
            void 0,
            u,
            l,
            c
          ),
            (this.messageFields = h),
            (this.messageFields = h);
        }
        Po() {
          return !1;
        }
        $t(t) {
          if (this.uo === lt.bo.Ur) {
            if (this.So) return !1;
            this.So = !0;
          }
          return this.ti.X(t), !0;
        }
        bt() {
          const e = super.bt(t.cs);
          return (e[lt.es.Eo] = this.messageFields), e;
        }
        static Qr(e) {
          return new t(
            e[lt.es.ra],
            e[lt.es.qs],
            e[lt.es.ta],
            e[lt.es.pa],
            e[lt.es.ma],
            e[lt.es.ja],
            e[lt.es.xa],
            e[lt.es.wa],
            e[lt.es.ka],
            e[lt.es.CSS],
            e[lt.es.Eo],
            e[lt.es.qa]
          );
        }
      }),
      (ht.cs = lt.bo.Ur);
  }))();
}
function ps() {
  return (ps = t(() => {
    fs(),
      ue(),
      (ct = class t {
        constructor(e, s, i, n, r, o, a) {
          (this.text = e),
            (this.backgroundColor = s),
            (this.textColor = i),
            (this.borderColor = n),
            (this.clickAction = r),
            (this.uri = o),
            (this.id = a),
            (this.text = e || ""),
            (this.backgroundColor = s || lt.th.sh),
            (this.textColor = i || lt.th.ih),
            (this.borderColor = n || this.backgroundColor),
            (this.clickAction = r || lt.ClickAction.NONE),
            (this.uri = o),
            (a ??= t.Yi),
            (this.id = a),
            (this.So = !1),
            (this.ti = new b());
        }
        subscribeToClickedEvent(t) {
          return this.ti.Dt(t);
        }
        removeSubscription(t) {
          this.ti.removeSubscription(t);
        }
        removeAllSubscriptions() {
          this.ti.removeAllSubscriptions();
        }
        $t() {
          return !this.So && ((this.So = !0), this.ti.X(), !0);
        }
        static fromJson(e) {
          return new t(
            e.text,
            e.bg_color,
            e.text_color,
            e.border_color,
            e.click_action,
            e.uri,
            e.id
          );
        }
      }),
      (ct.Yi = -1);
  }))();
}
function ms() {
  return (ms = t(() => {
    ws(),
      fs(),
      (dt = class t extends lt {
        constructor(
          t,
          e,
          s,
          i,
          n,
          r,
          o,
          a,
          u,
          l,
          h,
          c,
          d,
          f,
          g,
          p,
          m,
          b,
          v,
          y,
          E,
          w,
          C,
          S,
          O,
          _,
          T,
          N,
          A
        ) {
          (a = a || lt.DismissType.MANUAL),
            (_ = _ || lt.Orientation.PORTRAIT),
            super(
              t,
              e,
              void 0,
              s,
              i,
              n,
              r,
              o,
              a,
              u,
              l,
              h,
              c,
              d,
              f,
              g,
              p,
              m,
              b,
              v,
              y,
              E,
              w,
              C,
              S,
              (O = O || lt.CropType.CENTER_CROP),
              _,
              T,
              N,
              A
            ),
            (this.$o = lt.TextAlignment.CENTER);
        }
        bt() {
          return super.bt(t.cs);
        }
        static Qr(e) {
          return new t(
            e[lt.es.ra],
            e[lt.es.sa],
            e[lt.es.qs],
            e[lt.es.ta],
            e[lt.es.ia],
            e[lt.es.URI],
            e[lt.es.oa],
            e[lt.es.pa],
            e[lt.es.ma],
            e[lt.es.na],
            e[lt.es.ls],
            e[lt.es.ua],
            e[lt.es.ca],
            e[lt.es.fa],
            e[lt.es.da],
            e[lt.es.la],
            e[lt.es.ga],
            e[lt.es.ja],
            e[lt.es.xa],
            e[lt.es.za],
            e[lt.es.ha],
            e[lt.es.va],
            e[lt.es.wa],
            Es(e[lt.es.ya]),
            e[lt.es.Sa],
            e[lt.es.ba],
            e[lt.es.ka],
            e[lt.es.CSS],
            e[lt.es.qa]
          );
        }
      }),
      (dt.cs = lt.bo.Lr);
  }))();
}
function bs() {
  return (bs = t(() => {
    ws(),
      fs(),
      (ft = class t extends lt {
        constructor(
          t,
          e,
          s,
          i,
          n,
          r,
          o,
          a,
          u,
          l,
          h,
          c,
          d,
          f,
          g,
          p,
          m,
          b,
          v,
          y,
          E,
          w,
          C,
          S,
          O,
          _,
          T,
          N
        ) {
          super(
            t,
            e,
            void 0,
            s,
            i,
            n,
            r,
            o,
            (a = a || lt.DismissType.MANUAL),
            u,
            l,
            h,
            c,
            d,
            f,
            g,
            p,
            m,
            b,
            v,
            y,
            E,
            w,
            C,
            S,
            (O = O || lt.CropType.FIT_CENTER),
            void 0,
            _,
            T,
            N
          ),
            (this.$o = lt.TextAlignment.CENTER);
        }
        bt() {
          return super.bt(t.cs);
        }
        static Qr(e) {
          return new t(
            e[lt.es.ra],
            e[lt.es.sa],
            e[lt.es.qs],
            e[lt.es.ta],
            e[lt.es.ia],
            e[lt.es.URI],
            e[lt.es.oa],
            e[lt.es.pa],
            e[lt.es.ma],
            e[lt.es.na],
            e[lt.es.ls],
            e[lt.es.ua],
            e[lt.es.ca],
            e[lt.es.fa],
            e[lt.es.da],
            e[lt.es.la],
            e[lt.es.ga],
            e[lt.es.ja],
            e[lt.es.xa],
            e[lt.es.za],
            e[lt.es.ha],
            e[lt.es.va],
            e[lt.es.wa],
            Es(e[lt.es.ya]),
            e[lt.es.Sa],
            e[lt.es.ka],
            e[lt.es.CSS],
            e[lt.es.qa]
          );
        }
      }),
      (ft.cs = lt.bo.Vr);
  }))();
}
function vs() {
  return (vs = t(() => {
    fs(),
      hs(),
      (gt = class t extends lt {
        constructor(
          t,
          e,
          s,
          i,
          n,
          r,
          o,
          a,
          u,
          l,
          h,
          c,
          d,
          f,
          g,
          p,
          m,
          b,
          v,
          y,
          E,
          w
        ) {
          (p = p || lt.th.Mh),
            (g = g || lt.th.Rh),
            super(
              t,
              (e = e || lt.TextAlignment.START),
              s,
              i,
              n,
              r,
              o,
              a,
              u,
              l,
              h,
              c,
              void 0,
              d,
              f,
              g,
              p,
              m,
              b,
              v,
              void 0,
              void 0,
              void 0,
              void 0,
              void 0,
              void 0,
              void 0,
              y,
              E,
              w
            ),
            (this.$o = lt.TextAlignment.START);
        }
        vo() {
          return !1;
        }
        zo() {
          const t = document.createElement("span");
          return t.appendChild(document.createTextNode(this.message || "")), t;
        }
        Ah(t) {
          const e = t.getElementsByClassName("ab-in-app-message")[0];
          rt.Ho(e, !0, !0) ||
            (this.slideFrom === lt.SlideFrom.TOP
              ? (e.style.top = "0px")
              : (e.style.bottom = "0px")),
            super.Ah(t);
        }
        bt() {
          return super.bt(t.cs);
        }
        static Qr(e) {
          return new t(
            e[lt.es.ra],
            e[lt.es.sa],
            e[lt.es.Sh],
            e[lt.es.qs],
            e[lt.es.ta],
            e[lt.es.ia],
            e[lt.es.URI],
            e[lt.es.oa],
            e[lt.es.pa],
            e[lt.es.ma],
            e[lt.es.na],
            e[lt.es.ls],
            e[lt.es.ca],
            e[lt.es.fa],
            e[lt.es.da],
            e[lt.es.la],
            e[lt.es.ga],
            e[lt.es.ja],
            e[lt.es.xa],
            e[lt.es.ka],
            e[lt.es.CSS],
            e[lt.es.qa]
          );
        }
      }),
      (gt.cs = lt.bo.Wr);
  }))();
}
function ys(t) {
  if (!t) return null;
  if (t.is_control) return nt.fromJson(t);
  let e = t.type;
  null != e && (e = e.toUpperCase());
  const s = t.message,
    n = t.text_align_message,
    r = t.slide_from,
    o = t.extras,
    a = t.trigger_id,
    u = t.click_action,
    l = t.uri,
    h = t.open_target,
    c = t.message_close,
    d = t.duration,
    f = t.icon,
    g = t.image_url,
    p = t.image_style,
    m = t.icon_color,
    b = t.icon_bg_color,
    v = t.bg_color,
    y = t.text_color,
    E = t.close_btn_color,
    w = t.header,
    C = t.text_align_header,
    S = t.header_text_color,
    O = t.frame_color,
    _ = [];
  let T = t.btns;
  T ??= [];
  for (let i = 0; i < T.length; i++) _.push(ct.fromJson(T[i]));
  const N = t.crop_type,
    A = t.orientation,
    I = t.animate_in,
    k = t.animate_out;
  let B = t.html_id,
    D = t.css;
  (null != B && "" !== B && null != D && "" !== D) ||
    ((B = void 0), (D = void 0));
  const x = t.message_extras;
  let R;
  if (e === ft.cs || e === lt.bo.Fo)
    R = new ft(
      s,
      n,
      o,
      a,
      u,
      l,
      h,
      c,
      d,
      f,
      g,
      p,
      m,
      b,
      v,
      y,
      E,
      I,
      k,
      w,
      C,
      S,
      O,
      _,
      N,
      B,
      D,
      x
    );
  else if (e === dt.cs)
    R = new dt(
      s,
      n,
      o,
      a,
      u,
      l,
      h,
      c,
      d,
      f,
      g,
      p,
      m,
      b,
      v,
      y,
      E,
      I,
      k,
      w,
      C,
      S,
      O,
      _,
      N,
      A,
      B,
      D,
      x
    );
  else if (e === gt.cs)
    R = new gt(
      s,
      n,
      r,
      o,
      a,
      u,
      l,
      h,
      c,
      d,
      f,
      g,
      m,
      b,
      v,
      y,
      E,
      I,
      k,
      B,
      D,
      x
    );
  else {
    if (e !== ht.cs && e !== lt.bo.po && e !== lt.bo.Jo)
      return void i.error("Ignoring message with unknown type " + e);
    {
      const e = t.message_fields;
      (R = new ht(s, o, a, c, d, I, k, O, B, D, e, x)),
        (R.trusted = t.trusted || !1);
    }
  }
  return (R.uo = e), R;
}
function Es(t) {
  const e = [];
  for (const s of t)
    e.push(
      new ct(
        s.text,
        s.backgroundColor,
        s.textColor,
        s.borderColor,
        s.clickAction,
        s.uri,
        s.id
      )
    );
  return e;
}
function ws() {
  return (ws = t(() => {
    fs(), es(), ms(), gs(), ps(), bs(), vs(), Ft();
  }))();
}
function Cs() {
  return (Cs = t(() => {
    pt = class t {
      constructor(t) {
        (this.xc = t), (this.xc = t);
      }
      zc(t) {
        return null == this.xc || this.xc === t[0];
      }
      static fromJson(e) {
        return new t(e ? e.event_name : null);
      }
      bt() {
        return this.xc;
      }
    };
  }))();
}
function Ss() {
  return (Ss = t(() => {
    Zt(),
      oe(),
      (mt = class t {
        constructor(e, s, i, n) {
          (this.yE = e),
            (this.HE = s),
            (this.comparator = i),
            (this.LE = n),
            (this.yE = e),
            (this.HE = s),
            (this.comparator = i),
            (this.LE = n),
            this.HE === t.QE.UE &&
              this.comparator !== t.wE.XE &&
              this.comparator !== t.wE.BE &&
              this.comparator !== t.wE.jE &&
              this.comparator !== t.wE.zE &&
              (this.LE = ee(this.LE));
        }
        zc(e) {
          let s = null;
          switch ((null != e && (s = e[this.yE]), this.comparator)) {
            case t.wE.FE:
              return null != s && s.valueOf() === this.LE.valueOf();
            case t.wE.kE:
              return null == s || s.valueOf() !== this.LE.valueOf();
            case t.wE.xE:
              return null != s && typeof s == typeof this.LE && s > this.LE;
            case t.wE.XE:
              return this.HE === t.QE.UE
                ? null != s && Gt(s) && ne(s) <= this.LE.valueOf()
                : null != s && typeof s == typeof this.LE && s >= this.LE;
            case t.wE.JE:
              return null != s && typeof s == typeof this.LE && s < this.LE;
            case t.wE.BE:
              return this.HE === t.QE.UE
                ? null != s && Gt(s) && ne(s) >= this.LE.valueOf()
                : null != s && typeof s == typeof this.LE && s <= this.LE;
            case t.wE.VE:
              return (
                null != s &&
                "string" == typeof s &&
                typeof s == typeof this.LE &&
                null != s.match(this.LE)
              );
            case t.wE.qE:
              return null != s;
            case t.wE.PE:
              return null == s;
            case t.wE.jE:
              return null != s && Gt(s) && re(s) < this.LE;
            case t.wE.zE:
              return null != s && Gt(s) && re(s) > this.LE;
            case t.wE.WE:
              return (
                null == s ||
                typeof s != typeof this.LE ||
                "string" != typeof s ||
                null == s.match(this.LE)
              );
          }
          return !1;
        }
        static fromJson(e) {
          return new t(
            e.property_key,
            e.property_type,
            e.comparator,
            e.property_value
          );
        }
        bt() {
          let t = this.LE;
          return (
            Gt(this.LE) && (t = Yt(t.valueOf())),
            { k: this.yE, t: this.HE, c: this.comparator, v: t }
          );
        }
        static Rn(e) {
          return new t(e.k, e.t, e.c, e.v);
        }
      }),
      (mt.QE = { ZE: "boolean", $E: "number", tT: "string", UE: "date" }),
      (mt.wE = {
        FE: 1,
        kE: 2,
        xE: 3,
        XE: 4,
        JE: 5,
        BE: 6,
        VE: 10,
        qE: 11,
        PE: 12,
        jE: 15,
        zE: 16,
        WE: 17,
      });
  }))();
}
function Os() {
  return (Os = t(() => {
    Ss(),
      Zt(),
      (bt = class t {
        constructor(t) {
          (this.filters = t), (this.filters = t);
        }
        zc(t) {
          let e = !0;
          for (let s = 0; s < this.filters.length; s++) {
            const i = this.filters[s];
            let n = !1;
            for (let e = 0; e < i.length; e++)
              if (i[e].zc(t)) {
                n = !0;
                break;
              }
            if (!n) {
              e = !1;
              break;
            }
          }
          return e;
        }
        static fromJson(e) {
          if (null == e || !Vt(e)) return null;
          const s = [];
          for (let t = 0; t < e.length; t++) {
            const i = [],
              n = e[t];
            for (let t = 0; t < n.length; t++) i.push(mt.fromJson(n[t]));
            s.push(i);
          }
          return new t(s);
        }
        bt() {
          const t = [];
          for (let e = 0; e < this.filters.length; e++) {
            const s = this.filters[e],
              i = [];
            for (let t = 0; t < s.length; t++) i.push(s[t].bt());
            t.push(i);
          }
          return t;
        }
        static Rn(e) {
          const s = [];
          for (let t = 0; t < e.length; t++) {
            const i = [],
              n = e[t];
            for (let t = 0; t < n.length; t++) i.push(mt.Rn(n[t]));
            s.push(i);
          }
          return new t(s);
        }
      });
  }))();
}
function _s() {
  return (_s = t(() => {
    Os(),
      (vt = class t {
        constructor(t, e) {
          (this.xc = t), (this.tf = e), (this.xc = t), (this.tf = e);
        }
        zc(t) {
          if (null == this.xc || null == this.tf) return !1;
          const e = t[0],
            s = t[1];
          return e === this.xc && this.tf.zc(s);
        }
        static fromJson(e) {
          return new t(
            e ? e.event_name : null,
            e ? bt.fromJson(e.property_filters) : null
          );
        }
        bt() {
          return { e: this.xc, pf: this.tf ? this.tf.bt() : null };
        }
      });
  }))();
}
function Ts() {
  return (Ts = t(() => {
    Bs(),
      (yt = class t {
        constructor(t, e) {
          (this.if = t), (this.rf = e), (this.if = t), (this.rf = e);
        }
        zc(t) {
          if (null == this.if) return !1;
          const e = Ot.sf(t[0], this.if);
          if (!e) return !1;
          let s = null == this.rf || 0 === this.rf.length;
          if (null != this.rf)
            for (let i = 0; i < this.rf.length; i++)
              if (this.rf[i] === t[1]) {
                s = !0;
                break;
              }
          return e && s;
        }
        static fromJson(e) {
          return new t(e ? e.id : null, e ? e.buttons : null);
        }
        bt() {
          return this.if;
        }
      });
  }))();
}
function Ns() {
  return (Ns = t(() => {
    Et = class t {
      constructor(t) {
        (this.productId = t), (this.productId = t);
      }
      zc(t) {
        return null == this.productId || t[0] === this.productId;
      }
      static fromJson(e) {
        return new t(e ? e.product_id : null);
      }
      bt() {
        return this.productId;
      }
    };
  }))();
}
function As() {
  return (As = t(() => {
    Os(),
      (wt = class t {
        constructor(t, e) {
          (this.productId = t),
            (this.tf = e),
            (this.productId = t),
            (this.tf = e);
        }
        zc(t) {
          if (null == this.productId || null == this.tf) return !1;
          const e = t[0],
            s = t[1];
          return e === this.productId && this.tf.zc(s);
        }
        static fromJson(e) {
          return new t(
            e ? e.product_id : null,
            e ? bt.fromJson(e.property_filters) : null
          );
        }
        bt() {
          return { id: this.productId, pf: this.tf ? this.tf.bt() : null };
        }
      });
  }))();
}
function Is() {
  return (Is = t(() => {
    Bs(),
      (Ct = class t {
        constructor(t) {
          (this.if = t), (this.if = t);
        }
        zc(t) {
          return null == this.if || Ot.sf(t[0], this.if);
        }
        static fromJson(e) {
          return new t(e ? e.campaign_id : null);
        }
        bt() {
          return this.if;
        }
      });
  }))();
}
function ks() {
  return (ks = t(() => {
    St = {
      OPEN: "open",
      Rr: "purchase",
      hr: "push_click",
      Ee: "custom_event",
      Zr: "iam_click",
      As: "test",
    };
  }))();
}
function Bs() {
  return (Bs = t(() => {
    Cs(),
      _s(),
      Os(),
      Ts(),
      Ns(),
      As(),
      Is(),
      ks(),
      Ft(),
      de(),
      (Ot = class t {
        constructor(t, e) {
          (this.type = t), (this.data = e), (this.type = t), (this.data = e);
        }
        _c(e, s) {
          return (
            t.Ec[this.type] === e && (null == this.data || this.data.zc(s))
          );
        }
        static sf(t, e) {
          let s = null;
          try {
            s = window.atob(t);
          } catch (e) {
            return (
              i.info("Failed to unencode analytics id " + t + ": " + y(e)), !1
            );
          }
          return e === s.split("_")[0];
        }
        static fromJson(e) {
          const s = e.type;
          let i = null;
          switch (s) {
            case t.Or.OPEN:
            case t.Or.As:
              break;
            case t.Or.Rr:
              i = Et.fromJson(e.data);
              break;
            case t.Or.Cc:
              i = wt.fromJson(e.data);
              break;
            case t.Or.hr:
              i = Ct.fromJson(e.data);
              break;
            case t.Or.Ee:
              i = pt.fromJson(e.data);
              break;
            case t.Or.Pc:
              i = vt.fromJson(e.data);
              break;
            case t.Or.Zr:
              i = yt.fromJson(e.data);
          }
          return new t(s, i);
        }
        bt() {
          return { t: this.type, d: this.data ? this.data.bt() : null };
        }
        static Rn(e) {
          let s,
            i = null;
          switch (e.t) {
            case t.Or.OPEN:
            case t.Or.As:
              break;
            case t.Or.Rr:
              i = new Et(e.d);
              break;
            case t.Or.Cc:
              (s = e.d || {}), (i = new wt(s.id, bt.Rn(s.pf || [])));
              break;
            case t.Or.hr:
              i = new Ct(e.d);
              break;
            case t.Or.Ee:
              i = new pt(e.d);
              break;
            case t.Or.Pc:
              (s = e.d || {}), (i = new vt(s.e, bt.Rn(s.pf || [])));
              break;
            case t.Or.Zr:
              i = new yt(e.d);
          }
          return new t(e.t, i);
        }
      }),
      (Ot.Or = {
        OPEN: "open",
        Rr: "purchase",
        Cc: "purchase_property",
        hr: "push_click",
        Ee: "custom_event",
        Pc: "custom_event_property",
        Zr: "iam_click",
        As: "test",
      }),
      (Ot.Ec = {}),
      (Ot.Ec[Ot.Or.OPEN] = St.OPEN),
      (Ot.Ec[Ot.Or.Rr] = St.Rr),
      (Ot.Ec[Ot.Or.Cc] = St.Rr),
      (Ot.Ec[Ot.Or.hr] = St.hr),
      (Ot.Ec[Ot.Or.Ee] = St.Ee),
      (Ot.Ec[Ot.Or.Pc] = St.Ee),
      (Ot.Ec[Ot.Or.Zr] = St.Zr),
      (Ot.Ec[Ot.Or.As] = St.As);
  }))();
}
function Ds() {
  return (Ds = t(() => {
    oe(),
      Ft(),
      Bs(),
      Zt(),
      (_t = class t {
        constructor(e, s = [], i, n, r = 0, o, a, u = 0, l = t.td, h, c, d) {
          (this.id = e),
            (this.sd = s),
            (this.startTime = i),
            (this.endTime = n),
            (this.priority = r),
            (this.type = o),
            (this.data = a),
            (this.ed = u),
            (this.rd = l),
            (this.Jr = h),
            (this.hd = c),
            (this.od = d),
            (this.id = e),
            (this.sd = s || []),
            void 0 === i && (i = null),
            (this.startTime = i),
            void 0 === n && (n = null),
            (this.endTime = n),
            (this.priority = r || 0),
            (this.type = o),
            (this.ed = u || 0),
            (h ??= 1e3 * (this.ed + 30)),
            (this.Jr = h),
            (this.data = a),
            null != l && (this.rd = l),
            (this.hd = c),
            (this.od = d || null);
        }
        nd(e) {
          return (
            null == this.od ||
            (this.rd !== t.td && e - this.od >= 1e3 * this.rd)
          );
        }
        ad(t) {
          this.od = t;
        }
        ud(t) {
          const e = t + 1e3 * this.ed;
          return Math.max(e - new Date().valueOf(), 0);
        }
        dd(t) {
          const e = new Date().valueOf() - t,
            s = null == t || isNaN(e) || null == this.Jr || e < this.Jr;
          return (
            s ||
              i.info(
                `Trigger action ${this.type} is no longer eligible for display - fired ${e}ms ago and has a timeout of ${this.Jr}ms.`
              ),
            !s
          );
        }
        static fromJson(e) {
          const s = e.id,
            i = [];
          for (let t = 0; t < e.trigger_condition.length; t++)
            i.push(Ot.fromJson(e.trigger_condition[t]));
          const n = ee(e.start_time),
            r = ee(e.end_time),
            o = e.priority,
            a = e.type,
            u = e.delay,
            l = e.re_eligibility,
            h = e.timeout,
            c = e.data,
            d = e.min_seconds_since_last_trigger;
          return Ht(
            t.Or,
            a,
            "Could not construct Trigger from server data",
            "Trigger.Types"
          )
            ? new t(s, i, n, r, o, a, c, u, l, h, d)
            : null;
        }
        bt() {
          const t = [];
          for (let e = 0; e < this.sd.length; e++) t.push(this.sd[e].bt());
          return {
            i: this.id,
            c: t,
            s: this.startTime,
            e: this.endTime,
            p: this.priority,
            t: this.type,
            da: this.data,
            d: this.ed,
            r: this.rd,
            tm: this.Jr,
            ss: this.hd,
            ld: this.od,
          };
        }
        static Rn(e) {
          const s = [],
            i = e.c || [];
          for (let t = 0; t < i.length; t++) s.push(Ot.Rn(i[t]));
          return new t(
            e.i,
            s,
            ie(e.s),
            ie(e.e),
            e.p,
            e.t,
            e.da,
            e.d,
            e.r,
            e.tm,
            e.ss,
            e.ld
          );
        }
      }),
      (_t.Or = { Cr: "inapp", md: "templated_iam" }),
      (_t.td = -1);
  }))();
}
function xs() {
  return screen.width <= 600;
}
function Rs() {
  if ("orientation" in window)
    return 90 === Math.abs(window.orientation) || 270 === window.orientation
      ? Tt.LANDSCAPE
      : Tt.PORTRAIT;
  const t = window;
  if ("screen" in t) {
    let e =
      t.screen.orientation || screen.mozOrientation || screen.msOrientation;
    return (
      null != e && "object" == typeof e && (e = e.type),
      "landscape-primary" === e || "landscape-secondary" === e
        ? Tt.LANDSCAPE
        : Tt.PORTRAIT
    );
  }
  return Tt.PORTRAIT;
}
function Ps(t, e, s) {
  t && (e || (null != s && s.metaKey) ? window.open(t) : (window.location = t));
}
function Ls() {
  return window.location.href;
}
function $s() {
  return ($s = t(() => {
    (Tt = { PORTRAIT: 0, LANDSCAPE: 1 }),
      (Nt = { openUri: Ps, Uo: xs, No: Rs, $a: Ls });
  }))();
}
function Us(t) {
  t ??= "";
  const e = t.split("?").slice(1).join("?"),
    s = {};
  if (null != e) {
    const t = e.split("&");
    for (let e = 0; e < t.length; e++) {
      const i = t[e].split("=");
      "" !== i[0] && (s[i[0]] = i[1]);
    }
  }
  return s;
}
function Fs(t) {
  return !(
    !t ||
    (0 !== (t = t.toString().toLowerCase()).lastIndexOf("javascript:", 0) &&
      0 !== t.lastIndexOf("data:", 0))
  );
}
function Ms() {
  return (Ms = t(() => {}))();
}
function js() {
  return (js = t(() => {
    He(),
      Xs(),
      es(),
      gs(),
      fs(),
      ps(),
      Ks(),
      ws(),
      Ge(),
      Xe(),
      Ft(),
      Mt(),
      ue(),
      Ds(),
      ke(),
      Ee(),
      Ke(),
      Je(),
      $e(),
      ms(),
      bs(),
      vs(),
      (At = class {
        constructor(t, e, s, i) {
          (this.S = t),
            (this.T = e),
            (this.C = s),
            (this.Cs = i),
            (this.S = t),
            (this.T = e),
            (this.C = s),
            (this.Cs = i),
            (this.Mi = new b()),
            $t.F(this.Mi),
            (this.Bi = 1e3),
            (this._i = 6e4),
            (this.Pi = null),
            (this.Gi = null),
            (this.$i = null);
        }
        Oi() {
          return this.Mi;
        }
        Xi(t) {
          return this.Mi.Dt(t);
        }
        Hi() {
          return this.Pi;
        }
        Ji(t) {
          this.Pi = t;
        }
        ut(t, e, s, r) {
          const o = new Q();
          let a;
          if (e === n.Ki || t instanceof nt) {
            if (!t._t())
              return (
                i.info(
                  "This in-app message has already received an impression. Ignoring analytics event."
                ),
                o
              );
          } else if (
            (e === n.Li || (t instanceof ht && e === n.Qi)) &&
            !t.$t(r)
          )
            return (
              i.info(
                "This in-app message has already received a click. Ignoring analytics event."
              ),
              o
            );
          return (
            (a = t instanceof nt ? { trigger_ids: [t.triggerId] } : this.Vi(t)),
            null == a
              ? o
              : (t.messageExtras && (a.message_extras = t.messageExtras),
                null != s && (a.bid = s),
                Ut.ut(e, a))
          );
        }
        Wi(t, e) {
          const s = new Q();
          if (!t.$t())
            return (
              i.info(
                "This in-app message button has already received a click. Ignoring analytics event."
              ),
              s
            );
          const r = this.Vi(e);
          return null == r
            ? s
            : t.id === ct.Yi
            ? (i.info(
                "This in-app message button does not have a tracking id. Not logging event to Braze servers."
              ),
              s)
            : (null != t.id && (r.bid = t.id), Ut.ut(n.Qi, r));
        }
        Zi(t) {
          const e = t.messageFields;
          return (null != e && e.is_push_primer) || !1;
        }
        Ir(t) {
          if (!(t instanceof lt)) return;
          const e = (t) => {
            if (!t) return;
            const e = me(t);
            return ve(e)
              ? S(C.Mr, "In-App Message")
              : ye(e) && !Z.Tr()
              ? S(C.wr, "In-App Message")
              : void 0;
          };
          if (this.Zi(t) && !Z.Tr())
            return "In-App Message contains a push prompt, but is not eligible for a push prompt. Ignoring.";
          const s = t.buttons || [];
          let i;
          for (const n of s)
            if (
              n.clickAction === lt.ClickAction.URI &&
              n.uri &&
              A.test(n.uri) &&
              ((i = e(n.uri)), i)
            )
              return i;
          return t.clickAction === lt.ClickAction.URI && t.uri && A.test(t.uri)
            ? e(t.uri)
            : void 0;
        }
        Br(t, e) {
          e !== this.$i && this._r(), (this.Gi = t), (this.$i = e);
        }
        _r() {
          null != this.Gi &&
            (clearTimeout(this.Gi), (this.Gi = null), (this.$i = null));
        }
        qr(t, e, s, n) {
          const r = this.S;
          if (!r) return;
          this.$i &&
            t.triggerId !== this.$i &&
            (this._r(), V.vi(this.C, V.O.Er));
          const o = r.Gr(!1, !1),
            a = r.H(o);
          (a.template = { trigger_id: t.triggerId, trigger_event_type: e }),
            null != s && (a.template.data = s.Nr());
          const u = r.J(a, V.O.Er);
          r.V(
            a,
            (r = -1) => {
              const o = this.S;
              if (!o) return;
              const l = new Date().valueOf();
              V.W(this.C, V.O.Er, l),
                -1 !== r &&
                  u.push(["X-Braze-Req-Tokens-Remaining", r.toString()]);
              let h,
                c,
                d = !1;
              G.Y({
                url: `${o.Z()}/template/`,
                data: a,
                headers: u,
                tt: (e) => {
                  if (!o.st(a, e, u))
                    return void ("function" == typeof t.$r && t.$r());
                  if ((o.it(), null == e || null == e.templated_message))
                    return;
                  const s = e.templated_message;
                  if (s.type !== _t.Or.Cr) return;
                  const n = ys(s.data);
                  if (null == n) return;
                  const r = this.Ir(n);
                  if (r)
                    return (
                      i.error(r), void ("function" == typeof t.$r && t.$r())
                    );
                  "function" == typeof t.Xr && t.Xr(n);
                },
                error: (e) => {
                  (d = !0),
                    (h = e),
                    (c = `getting user personalization for message ${t.triggerId}.`);
                },
                nt: (i, r) => {
                  if (new Date().valueOf() - t.Hr < t.Jr) {
                    let i = 0;
                    if (d) {
                      const e = Math.min(t.Jr, this._i),
                        s = this.Bi;
                      (n ??= s), (i = Math.min(e, W(s, 3 * n)));
                    }
                    o.rt(
                      r,
                      () => {
                        this.qr(t, e, s, i);
                      },
                      V.O.Er,
                      (e) => this.Br(e, t.triggerId),
                      () => this._r(),
                      i
                    );
                  }
                  d && o.et(h, c);
                },
              });
            },
            V.O.Er
          );
        }
        Vi(t) {
          if (null == t.triggerId)
            return (
              i.info(
                "The in-app message has no analytics id. Not logging event to Braze servers."
              ),
              null
            );
          const e = {};
          return null != t.triggerId && (e.trigger_ids = [t.triggerId]), e;
        }
        sn(t) {
          return (
            !!this.C &&
            !(
              !(t && t instanceof lt && t.constructor !== lt) || t instanceof nt
            ) &&
            this.C.Bt(U.gt.Kr, t.bt())
          );
        }
        Ar() {
          if (!this.C) return null;
          const t = this.C.ft(U.gt.Kr);
          if (!t) return null;
          let e;
          switch (t.type) {
            case lt.bo.Lr:
              e = dt.Qr(t);
              break;
            case lt.bo.Ur:
            case lt.bo.po:
            case lt.bo.Jo:
              e = ht.Qr(t);
              break;
            case lt.bo.Vr:
            case lt.bo.Fo:
              e = ft.Qr(t);
              break;
            case lt.bo.Wr:
              e = gt.Qr(t);
          }
          return e && this.Yr(), e;
        }
        Yr() {
          this.C && this.C.Ut(U.gt.Kr);
        }
      });
  }))();
}
function zs() {
  return (zs = t(() => {
    js(),
      Xs(),
      (It = {
        aa: null,
        l: !1,
        ea: () => (
          It.p(),
          It.aa || (It.aa = new At($t.g(), $t.P(), $t.j(), $t.ir())),
          It.aa
        ),
        p: () => {
          It.l || ($t.h(It), (It.l = !0));
        },
        destroy: () => {
          (It.aa = null), (It.l = !1);
        },
      });
  }))();
}
function qs() {
  return (qs = t(() => {
    kt = class t {
      constructor(t, e, s, i, n) {
        (this.triggerId = t),
          (this.Xr = e),
          (this.$r = s),
          (this.Hr = i),
          (this.Jr = n),
          (this.triggerId = t),
          (this.Xr = e),
          (this.$r = s),
          (this.Hr = i),
          (this.Jr = n);
      }
      static fromJson(e, s, i, n, r) {
        return null == e || null == e.trigger_id
          ? null
          : new t(e.trigger_id, s, i, n, r);
      }
    };
  }))();
}
function Js() {
  return (Js = t(() => {
    Fe(),
      ws(),
      ce(),
      Zt(),
      $e(),
      qs(),
      Ds(),
      ks(),
      Ft(),
      (Bt = class extends j {
        constructor(t, e, s, i, n) {
          super(),
            (this.tg = t),
            (this.Ts = e),
            (this.C = s),
            (this.Fi = i),
            (this.ig = n),
            (this.tg = t),
            (this.Ts = e),
            (this.C = s),
            (this.Fi = i),
            (this.ig = n),
            (this.sg = []),
            (this.eg = []),
            (this.hg = null),
            (this.ng = {}),
            (this.og = {}),
            (this.triggers = []),
            (this.lg = 0),
            this.ag(),
            this.gg();
        }
        fg() {
          if (this.C) {
            (this.hg = this.C.ft(U.gt.aE) || this.hg),
              (this.ng = this.C.ft(U.gt.iE) || this.ng),
              (this.og = this.C.ft(U.gt.nE) || this.og);
            for (let t = 0; t < this.triggers.length; t++) {
              const e = this.triggers[t];
              e.id && null != this.og[e.id] && e.ad(this.og[e.id]);
            }
          }
        }
        ag() {
          if (!this.C) return;
          this.lg = this.C.ft(U.gt.oE) || 0;
          const t = this.C.ft(U.gt.rE) || [],
            e = [];
          for (let s = 0; s < t.length; s++) e.push(_t.Rn(t[s]));
          (this.triggers = e), this.fg();
        }
        gg() {
          const t = this,
            e = function (e, s, i, n, r) {
              return function () {
                t.cg(e, s, i, n, r);
              };
            },
            s = {};
          for (const n of this.triggers) n.id && (s[n.id] = n);
          let i = !1;
          for (let n = 0; n < this.triggers.length; n++) {
            const t = this.triggers[n];
            if (t.id && null != this.ng[t.id]) {
              const n = this.ng[t.id],
                r = [];
              for (let i = 0; i < n.length; i++) {
                const o = n[i],
                  a = t.ud(o.Hr || 0);
                if (a > 0) {
                  let i, n;
                  r.push(o),
                    null != o.ug && (i = o.ug),
                    null != o.dg && v.RE(o.dg) && (n = v.Rn(o.dg));
                  const u = [];
                  if (o.pg && Vt(o.pg))
                    for (let t = 0; t < o.pg.length; t++) {
                      const e = s[o.pg[t]];
                      null != e && u.push(e);
                    }
                  this.eg.push(window.setTimeout(e(t, o.Hr || 0, i, n, u), a));
                }
              }
              this.ng[t.id].length > r.length &&
                ((this.ng[t.id] = r),
                (i = !0),
                0 === this.ng[t.id].length && delete this.ng[t.id]);
            }
          }
          i && this.C && this.C.Bt(U.gt.iE, this.ng);
        }
        mg() {
          if (!this.C) return;
          const t = [];
          for (let e = 0; e < this.triggers.length; e++)
            t.push(this.triggers[e].bt());
          (this.lg = new Date().valueOf()),
            this.C.Bt(U.gt.rE, t),
            this.C.Bt(U.gt.oE, this.lg);
        }
        bg() {
          this.C &&
            ((this.C.ft(U.gt.oE) || 0) > this.lg ? this.ag() : this.fg());
        }
        U(t) {
          let e = !1;
          if (null != t && t.triggers) {
            this.ig.Yr(), this.fg();
            const s = {},
              n = {};
            this.triggers = [];
            for (let i = 0; i < t.triggers.length; i++) {
              const r = _t.fromJson(t.triggers[i]);
              if (r) {
                r.id &&
                  null != this.og[r.id] &&
                  (r.ad(this.og[r.id]), (s[r.id] = this.og[r.id])),
                  r.id && null != this.ng[r.id] && (n[r.id] = this.ng[r.id]);
                for (let t = 0; t < r.sd.length; t++)
                  if (r.sd[t]._c(St.As, null)) {
                    e = !0;
                    break;
                  }
                this.triggers.push(r);
              }
            }
            Qt(this.og, s) ||
              ((this.og = s), this.C && this.C.Bt(U.gt.nE, this.og)),
              Qt(this.ng, n) ||
                ((this.ng = n), this.C && this.C.Bt(U.gt.iE, this.ng)),
              this.mg(),
              e &&
                (i.info("Trigger with test condition found, firing test."),
                this.Ce(St.As)),
              this.Ce(St.OPEN);
            const r = this.sg;
            let o;
            this.sg = [];
            for (let t = 0; t < r.length; t++)
              (o = Array.prototype.slice.call(r[t])), this.Ce(...o);
          }
        }
        cg(t, e, s, n, r) {
          const o = (n) => {
              this.fg();
              const r = new Date().valueOf();
              t.dd(e) ||
                (!1 === navigator.onLine && t.type === _t.Or.Cr && n.imageUrl
                  ? i.info(
                      `Not showing ${t.type} trigger action ${t.id} due to offline state.`
                    )
                  : t.nd(r) && this.wg(t, r, s)
                  ? 0 === this.Ts.hc()
                    ? i.info(
                        `Not displaying trigger ${t.id} because neither automaticallyShowInAppMessages() nor subscribeToInAppMessage() were called.`
                      )
                    : (this.Ts.X([n]), this.yg(t, r))
                  : i.info(
                      `Not displaying trigger ${t.id} because display time fell outside of the acceptable time window.`
                    ));
            },
            a = () => {
              this.fg();
              const o = r.pop();
              if (null != o)
                if ((this.Tg(o, e, s, n, r), o.dd(e))) {
                  let t = `Server aborted in-app message display, but the timeout on fallback trigger ${o.id} has already elapsed.`;
                  r.length > 0 && (t += " Continuing to fall back."),
                    i.info(t),
                    a();
                } else {
                  i.info(
                    `Server aborted in-app message display. Falling back to lower priority ${o.type} trigger action ${t.id}.`
                  );
                  const a = 1e3 * o.ed - (new Date().valueOf() - e);
                  a > 0
                    ? this.eg.push(
                        window.setTimeout(() => {
                          this.cg(o, e, s, n, r);
                        }, a)
                      )
                    : this.cg(o, e, s, n, r);
                }
            };
          let u, l, h;
          switch (t.type) {
            case _t.Or.Cr:
              if (((u = ys(t.data)), null == u)) {
                i.error(
                  `Could not parse trigger data for trigger ${t.id}, ignoring.`
                );
                break;
              }
              if (((l = this.ig.Ir(u)), l)) {
                i.error(l), a();
                break;
              }
              o(u);
              break;
            case _t.Or.md:
              if (((h = kt.fromJson(t.data, o, a, e, t.Jr || 0)), null == h)) {
                i.error(
                  `Could not parse trigger data for trigger ${t.id}, ignoring.`
                );
                break;
              }
              this.ig.qr(h, s, n);
              break;
            default:
              i.error(
                `Trigger ${t.id} was of unexpected type ${t.type}, ignoring.`
              );
          }
        }
        Ce(t, e = null, s) {
          if (!Ht(St, t, "Cannot fire trigger action.", "TriggerEvents"))
            return;
          if (this.Fi && this.Fi.dc())
            return (
              i.info(
                "Trigger sync is currently in progress, awaiting sync completion before firing trigger event."
              ),
              void this.sg.push(arguments)
            );
          this.bg();
          const n = new Date().valueOf(),
            r = n - (this.hg || 0);
          let o = !0,
            a = !0;
          const u = [];
          for (let i = 0; i < this.triggers.length; i++) {
            const s = this.triggers[i],
              r = n + 1e3 * s.ed;
            if (
              s.nd(r) &&
              (null == s.startTime || s.startTime.valueOf() <= n) &&
              (null == s.endTime || s.endTime.valueOf() >= n)
            ) {
              let i = !1;
              for (let n = 0; n < s.sd.length; n++)
                if (s.sd[n]._c(t, e)) {
                  i = !0;
                  break;
                }
              i && ((o = !1), this.wg(s, r, t) && ((a = !1), u.push(s)));
            }
          }
          if (o)
            return void i.info(
              `Trigger event ${t} did not match any trigger conditions.`
            );
          if (a)
            return void i.info(
              `Ignoring ${t} trigger event because a trigger was displayed ${
                r / 1e3
              }s ago.`
            );
          u.sort((t, e) => t.priority - e.priority);
          const l = u.pop();
          null != l &&
            (i.info(
              `Firing ${l.type} trigger action ${l.id} from trigger event ${t}.`
            ),
            this.Tg(l, n, t, s, u),
            0 === l.ed
              ? this.cg(l, n, t, s, u)
              : this.eg.push(
                  window.setTimeout(() => {
                    this.cg(l, n, t, s, u);
                  }, 1e3 * l.ed)
                ));
        }
        changeUser(t = !1) {
          if (((this.triggers = []), this.C && this.C.Ut(U.gt.rE), !t)) {
            (this.sg = []), (this.hg = null), (this.og = {}), (this.ng = {});
            for (let t = 0; t < this.eg.length; t++) clearTimeout(this.eg[t]);
            (this.eg = []),
              this.C &&
                (this.C.Ut(U.gt.aE), this.C.Ut(U.gt.nE), this.C.Ut(U.gt.iE));
          }
        }
        clearData() {
          (this.triggers = []),
            (this.hg = null),
            (this.og = {}),
            (this.ng = {});
          for (let t = 0; t < this.eg.length; t++) clearTimeout(this.eg[t]);
          this.eg = [];
        }
        wg(t, e, s) {
          if (null == this.hg) return !0;
          if (s === St.As)
            return (
              i.info(
                "Ignoring minimum interval between trigger because it is a test type."
              ),
              !0
            );
          let n = t.hd;
          return (n ??= this.tg), e - this.hg >= 1e3 * n;
        }
        Tg(t, e, s, i, n) {
          this.fg(), t.id && (this.ng[t.id] = this.ng[t.id] || []);
          const r = {};
          let o;
          (r.Hr = e), (r.ug = s), null != i && (o = i.bt()), (r.dg = o);
          const a = [];
          for (const u of n) u.id && a.push(u.id);
          (r.pg = a),
            t.id && this.ng[t.id].push(r),
            this.C && this.C.Bt(U.gt.iE, this.ng);
        }
        yg(t, e) {
          this.fg(),
            t.ad(e),
            (this.hg = e),
            t.id && (this.og[t.id] = e),
            this.C && (this.C.Bt(U.gt.aE, e), this.C.Bt(U.gt.nE, this.og));
        }
      });
  }))();
}
function Hs() {
  return (Hs = t(() => {
    zs(),
      Xs(),
      Js(),
      (Dt = {
        l: !1,
        provider: null,
        m: () => (Dt.p(), Dt.provider || Dt.rg(), Dt.provider),
        rg: () => {
          if (!Dt.provider) {
            const t = $t.ee(Pt.Xh);
            (Dt.provider = new Bt(
              null != t ? t : 30,
              It.ea().Oi(),
              $t.j(),
              $t.rn(),
              It.ea()
            )),
              $t._(Dt.provider);
          }
        },
        p: () => {
          Dt.l || (Dt.rg(), $t.h(Dt), (Dt.l = !0));
        },
        destroy: () => {
          (Dt.provider = null), (Dt.l = !1);
        },
      });
  }))();
}
function Vs() {
  return (Vs = t(() => {
    oe(),
      (xt = class t {
        constructor(t, e, s, i, n) {
          (this.endpoint = t),
            (this.En = e),
            (this.publicKey = s),
            (this.Vl = i),
            (this.fl = n),
            (this.endpoint = t || null),
            (this.En = e || null),
            (this.publicKey = s || null),
            (this.Vl = i || null),
            (this.fl = n || null);
        }
        bt() {
          return {
            e: this.endpoint,
            c: this.En,
            p: this.publicKey,
            u: this.Vl,
            v: this.fl,
          };
        }
        static Rn(e) {
          return new t(e.e, ie(e.c), e.p, e.u, e.v);
        }
      });
  }))();
}
function Gs() {
  return (Gs = t(() => {
    fe(),
      pe(),
      Vs(),
      Ft(),
      zt(),
      $e(),
      Be(),
      (Rt = class {
        constructor(t, e) {
          (this.B = t), (this.C = e), (this.B = t), (this.C = e);
        }
        getUserId() {
          const t = this.C.tu(U.iu.su);
          if (null == t) return null;
          let e = t.eu,
            s = ge(e);
          if (s > k.ur) {
            for (; s > k.ur; ) (e = e.slice(0, e.length - 1)), (s = ge(e));
            (t.eu = e), this.C.uu(U.iu.su, t);
          }
          return e;
        }
        ou(t) {
          const e = null == this.getUserId();
          this.C.uu(U.iu.su, new E(t)), e && this.C.ru(t);
        }
        setCustomUserAttribute(t, e) {
          if (this.B.hu(t))
            return (
              i.info('Custom Attribute "' + t + '" is blocklisted, ignoring.'),
              !1
            );
          const s = {};
          return (s[t] = e), this.nu(k.lu, s, !0);
        }
        nu(t, e, s = !1, n = !1) {
          const r = this.C.mu(this.getUserId(), t, e);
          let o = "",
            a = t,
            u = e;
          return (
            s &&
              ((o = " custom"),
              "object" == typeof e &&
                ((a = Object.keys(e)[0]),
                (u = e[a]),
                "object" == typeof u && (u = JSON.stringify(u, null, 2)))),
            !n && r && i.info(`Logged${o} attribute ${a} with value ${u}`),
            r
          );
        }
        An(t, e, s, n, r) {
          this.nu("push_token", t, !1, !0),
            this.nu("custom_push_public_key", s, !1, !0),
            this.nu("custom_push_user_auth", n, !1, !0),
            this.nu("custom_push_vapid_public_key", r, !1, !0);
          const o = a.Ls.Fs,
            u = new a(o, i),
            l = new xt(t, e, s, n, r);
          this.C.Bt(U.gt.zn, l.bt()), u.setItem(o.Ms.cu, o.be, !0);
        }
        xn(t) {
          if (
            (this.nu("push_token", null, !1, !0),
            this.nu("custom_push_public_key", null, !1, !0),
            this.nu("custom_push_user_auth", null, !1, !0),
            this.nu("custom_push_vapid_public_key", null, !1, !0),
            t)
          ) {
            const t = a.Ls.Fs,
              e = new a(t, i);
            this.C.Bt(U.gt.zn, !1), e.setItem(t.Ms.cu, t.be, !1);
          }
        }
      });
  }))();
}
function Xs() {
  return (Xs = t(() => {
    Ue(),
      Fe(),
      Le(),
      ze(),
      je(),
      Zt(),
      Ve(),
      We(),
      Ze(),
      Ye(),
      $e(),
      ts(),
      ue(),
      Hs(),
      Gs(),
      Be(),
      $s(),
      ae(),
      qt(),
      Ft(),
      fe(),
      e(),
      (Pt = {
        Yo: "allowCrawlerActivity",
        Zo: "baseUrl",
        Wh: "noCookies",
        Vh: "devicePropertyAllowlist",
        Da: "disablePushTokenMaintenance",
        $h: "enableLogging",
        Yh: "enableSdkAuthentication",
        Ca: "manageServiceWorkerExternally",
        Xh: "minimumIntervalBetweenTriggerActionsInSeconds",
        Zh: "sessionTimeoutInSeconds",
        Qh: "appVersion",
        Ea: "appVersionNumber",
        _a: "serviceWorkerLocation",
        Ba: "safariWebsitePushId",
        Zn: "localization",
        er: "contentSecurityNonce",
        re: "allowUserSuppliedJavascript",
        Go: "inAppMessageZIndex",
        Ko: "openInAppMessagesInNewTab",
        tn: "openCardsInNewTab",
        en: "openNewsFeedCardsInNewTab",
        mh: "requireExplicitInAppMessageDismissal",
        Ia: "doNotLoadFontAwesome",
        Na: "deviceId",
        Aa: "serviceWorkerScope",
        Oa: "sdkFlavor",
      }),
      (Lt = class {
        constructor() {
          (this.an = ""),
            (this.Ta = ""),
            (this.Ra = void 0),
            (this.Pa = null),
            (this.hn = null),
            (this.S = null),
            (this.Fi = null),
            (this.B = null),
            (this.T = null),
            (this.C = null),
            (this.Cs = null),
            (this.La = ""),
            (this.isInitialized = !1),
            (this.Ua = !1),
            (this.Wa = new b()),
            (this.Va = new b()),
            (this.options = {}),
            (this.Fa = []),
            (this.Ka = []),
            (this.Mi = []),
            (this.Ta = "5.9.0");
        }
        Ga(t) {
          this.Wa.Dt(t);
        }
        Nh(t) {
          this.Va.Dt(t);
        }
        initialize(t, e) {
          if (this.nn())
            return (
              i.info("Braze has already been initialized with an API key."), !0
            );
          this.options = e || {};
          let n = this.ee(Pt.$h);
          const r = Us(Nt.$a());
          if (
            (r && "true" === r.brazeLogging && (n = !0),
            i.init(n),
            i.info(
              `Initialization Options: ${JSON.stringify(this.options, null, 2)}`
            ),
            null == t || "" === t || "string" != typeof t)
          )
            return (
              i.error("Braze requires a valid API key to be initialized."), !1
            );
          this.an = t;
          let o = this.ee(Pt.Zo);
          if (null == o || "" === o || "string" != typeof o)
            return (
              i.error("Braze requires a valid baseUrl to be initialized."), !1
            );
          !1 === /^https?:/.test(o) && (o = `https://${o}`);
          const a = o;
          if (
            ((o = document.createElement("a")),
            (o.href = a),
            "/" === o.pathname && (o = `${o}api/v3`),
            (this.La = o.toString()),
            $.Ja && !this.ee(Pt.Yo))
          )
            return (
              i.info(
                "Ignoring activity from crawler bot " + navigator.userAgent
              ),
              (this.Ua = !0),
              !1
            );
          const l = this.ee(Pt.Wh) || !1;
          if (
            ((this.C = it.Ya(t, l)),
            l && this.C.Ha(t),
            new F.se(null, !0).gr(U.me))
          )
            return (
              i.info("Ignoring all activity due to previous opt out"),
              (this.Ua = !0),
              !1
            );
          for (const s of Wt(this.options))
            -1 === Jt(u).indexOf(s) &&
              i.warn(`Ignoring unknown initialization option '${s}'.`);
          const h = ["mparticle", "wordpress", "tealium"];
          if (null != this.ee(Pt.Oa)) {
            const t = this.ee(Pt.Oa);
            -1 !== h.indexOf(t)
              ? (this.Ra = t)
              : i.error("Invalid sdk flavor passed: " + t);
          }
          let c = this.ee(u.Vh);
          if (null != c)
            if (Vt(c)) {
              const t = [];
              for (let e = 0; e < c.length; e++)
                Ht(
                  q,
                  c[e],
                  "devicePropertyAllowlist contained an invalid value.",
                  "DeviceProperties"
                ) && t.push(c[e]);
              c = t;
            } else
              i.error(
                "devicePropertyAllowlist must be an array. Defaulting to all properties."
              ),
                (c = null);
          const d = this.ee(Pt.Na);
          if (d) {
            const t = new E(d);
            this.C.uu(U.iu.Na, t);
          }
          (this.hn = new J(this.C, c)),
            (this.B = new et(this.C)),
            (this.Cs = new Rt(this.B, this.C)),
            (this.T = new st(this.C, this.Cs, this.B, this.ee(Pt.Zh)));
          const f = new b();
          return (
            (this.Pa = new M(this.C, this.ee(Pt.Yh), f)),
            this.F(f),
            (this.S = new K(
              this.hn,
              this.C,
              this.Pa,
              this.Cs,
              this.T,
              this.B,
              this.an,
              this.La,
              this.Ta,
              this.Ra || "",
              this.ee(Pt.Qh),
              this.ee(Pt.Ea)
            )),
            (this.Fi = new Y(
              this.an,
              this.La,
              this.T,
              this.hn,
              this.Cs,
              this.B,
              this.C,
              (t) => {
                if (this.nn()) for (const e of this.ar()) e.U(t);
              },
              this.Pa,
              this.S
            )),
            this.Fi.initialize(),
            l || this.C.Xa(),
            i.info(
              `Initialized for the Braze backend at "${this.ee(
                Pt.Zo
              )}" with API key "${this.an}".`
            ),
            Dt.p(),
            this.B.Ke(() => {
              var t;
              this.isInitialized &&
                null !== (t = this.B) &&
                void 0 !== t &&
                t.ke() &&
                s(
                  () =>
                    import("./refresh-feature-flags-Bz6iwnyb.js")
                      .then((t) => (t.t(), t.r))
                      .then((t) => {
                        this.isInitialized && (0, t.default)();
                      }),
                  __vite__mapDeps([2, 1])
                );
            }),
            this.Fi.on(() => {
              var t;
              this.isInitialized &&
                null !== (t = this.B) &&
                void 0 !== t &&
                t.ke() &&
                s(
                  () =>
                    import("./refresh-feature-flags-Bz6iwnyb.js")
                      .then((t) => (t.t(), t.r))
                      .then((t) => {
                        this.isInitialized &&
                          (0, t.default)(void 0, void 0, !0);
                      }),
                  __vite__mapDeps([2, 1])
                );
            }),
            this.Wa.X(this.options),
            (this.isInitialized = !0),
            window.dispatchEvent(new CustomEvent("braze.initialized")),
            !0
          );
        }
        destroy(t) {
          if ((i.destroy(), this.nn())) {
            this.Va.X(), this.Va.removeAllSubscriptions();
            for (const t of this.Fa) t.destroy();
            this.Fa = [];
            for (const t of this.Ka) t.clearData(!1);
            this.S && this.S.fo(),
              (this.Ka = []),
              this.removeAllSubscriptions(),
              (this.Mi = []),
              null != this.Fi && this.Fi.destroy(),
              (this.Fi = null),
              (this.Pa = null),
              (this.hn = null),
              (this.S = null),
              (this.B = null),
              (this.T = null),
              (this.Cs = null),
              (this.options = {}),
              (this.Ra = void 0),
              (this.isInitialized = !1),
              (this.Ua = !1),
              t && (this.C = null);
          }
        }
        rr() {
          return !(
            this.Za() ||
            (!this.nn() &&
              (console.warn(
                "Braze must be initialized before calling methods."
              ),
              1))
          );
        }
        Ma() {
          return this.an;
        }
        Sr() {
          return this.Pa;
        }
        Z() {
          return this.La;
        }
        ue() {
          return this.hn;
        }
        g() {
          return this.S;
        }
        ee(t) {
          return this.options[t];
        }
        ar() {
          return this.Ka;
        }
        rn() {
          return this.Fi;
        }
        v() {
          return this.B;
        }
        P() {
          return this.T;
        }
        j() {
          return this.C;
        }
        mr() {
          if (this.Cs && this.Fi) return new k(this.Cs, this.Fi);
        }
        ir() {
          return this.Cs;
        }
        tr() {
          return !0 === this.ee(Pt.re);
        }
        h(t) {
          let e = !1;
          for (const s of this.Fa) s === t && (e = !0);
          e || this.Fa.push(t);
        }
        _(t) {
          let e = !1;
          for (const s of this.Ka) s.constructor === t.constructor && (e = !0);
          t instanceof j && !e && this.Ka.push(t);
        }
        F(t) {
          t instanceof b && this.Mi.push(t);
        }
        removeAllSubscriptions() {
          if (this.rr()) for (const t of this.Mi) t.removeAllSubscriptions();
        }
        removeSubscription(t) {
          if (this.rr()) for (const e of this.Mi) e.removeSubscription(t);
        }
        fe(t) {
          this.Ua = t;
        }
        nn() {
          return this.isInitialized;
        }
        Za() {
          return this.Ua;
        }
        fi() {
          return this.Ta;
        }
      }),
      ($t = new Lt());
  }))();
}
function Ks() {
  return (Ks = t(() => {
    Ft(),
      Xs(),
      ce(),
      Xe(),
      (Ut = {
        ut: (t, e, s) => {
          var n, r;
          const o = new Q(),
            a = $t.P();
          if (!a)
            return (
              i.info(
                `Not logging event with type "${t}" because the current session ID could not be found.`
              ),
              o
            );
          const u = a.Qo();
          return (
            o.$e.push(
              new v(
                s ||
                  (null === (n = $t.ir()) || void 0 === n
                    ? void 0
                    : n.getUserId()),
                t,
                new Date().valueOf(),
                u,
                e
              )
            ),
            (o.tt =
              (null === (r = $t.j()) || void 0 === r ? void 0 : r.Vo(o.$e)) ||
              !1),
            o
          );
        },
      });
  }))();
}
export {
  V as $,
  jt as $t,
  lt as A,
  de as At,
  us as B,
  Yt as Bt,
  bs as C,
  ve as Ct,
  ps as D,
  ge as Dt,
  ct as E,
  Ee as Et,
  cs as F,
  c as Ft,
  Ke as G,
  Kt as Gt,
  rs as H,
  oe as Ht,
  ot as I,
  h as It,
  Xe as J,
  Wt as Jt,
  Z as K,
  Vt as Kt,
  ns as L,
  l as Lt,
  ds as M,
  b as Mt,
  ut as N,
  m as Nt,
  ht as O,
  pe as Ot,
  at as P,
  f as Pt,
  G as Q,
  o as Qt,
  os as R,
  p as Rt,
  ft as S,
  C as St,
  ms as T,
  S as Tt,
  nt as U,
  ie as Ut,
  hs as V,
  ee as Vt,
  es as W,
  Zt as Wt,
  W as X,
  zt as Xt,
  Ge as Y,
  Ht as Yt,
  He as Z,
  a as Zt,
  $s as _,
  Ae as _t,
  Pt as a,
  U as at,
  gt as b,
  Te as bt,
  Dt as c,
  Le as ct,
  It as d,
  xe as dt,
  n as en,
  Je as et,
  Ms as f,
  k as ft,
  Nt as g,
  Ie as gt,
  Tt as h,
  ke as ht,
  $t as i,
  Ft as in,
  j as it,
  fs as j,
  ue as jt,
  gs as k,
  y as kt,
  Hs as l,
  $ as lt,
  Us as m,
  A as mt,
  Ks as n,
  Mt as nn,
  je as nt,
  Vs as o,
  $e as ot,
  Fs as p,
  Be as pt,
  Q as q,
  Qt as qt,
  Xs as r,
  i as rn,
  Fe as rt,
  xt as s,
  F as st,
  Ut as t,
  r as tn,
  q as tt,
  zs as u,
  x as ut,
  ks as v,
  Ne as vt,
  dt as w,
  me as wt,
  vs as x,
  w as xt,
  St as y,
  we as yt,
  ls as z,
  ae as zt,
};
//# sourceMappingURL=event-logger-XYs2EL_9.js.map
