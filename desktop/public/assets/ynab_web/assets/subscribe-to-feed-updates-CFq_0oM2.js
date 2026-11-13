const __vite__mapDeps = (
  i,
  m = __vite__mapDeps,
  d = m.f ||
    (m.f = [
      "assets/log-custom-event-z0eMsFQ_.js",
      "assets/rolldown-runtime-DEpHKc_W.js",
      "assets/event-logger-XYs2EL_9.js",
      "assets/preload-helper-CEmPa-0p.js",
      "assets/request-push-permission-Bdo-70ZN.js",
      "assets/push-manager-factory-CQp_9BCr.js",
    ])
) => i.map((i) => d[i]);
import { n as e, r as t } from "./rolldown-runtime-DEpHKc_W.js";
import { n as s, t as i } from "./preload-helper-CEmPa-0p.js";
import {
  $t as a,
  B as r,
  Bt as n,
  Ct as o,
  Et as l,
  F as d,
  Gt as c,
  H as u,
  Ht as b,
  I as p,
  It as h,
  J as f,
  Kt as m,
  L as g,
  Mt as E,
  P as x,
  Pt as S,
  Qt as A,
  R as w,
  Rt as v,
  St as _,
  Tt as C,
  Ut as y,
  V as k,
  Vt as N,
  Wt as M,
  _ as T,
  _t as z,
  a as D,
  at as O,
  ct as U,
  dt as G,
  en as R,
  g as I,
  ht as F,
  i as L,
  in as q,
  it as j,
  jt as P,
  lt as X,
  mt as B,
  n as V,
  nn as H,
  ot as $,
  q as W,
  r as Z,
  rn as K,
  rt as Q,
  t as Y,
  tn as J,
  ut as ee,
  wt as te,
  xt as se,
  z as ie,
  zt as ae,
} from "./event-logger-XYs2EL_9.js";
var re, ne, oe, le, de, ce, ue, be, pe, he, fe, me, ge, Ee, xe, Se, Ae;
function we() {
  return (we = e(() => {
    b(),
      ae(),
      P(),
      q(),
      (re = class e {
        constructor(e, t, s, i, a, r, n, o, l, d, c, u, b, p, h, f) {
          (this.id = e),
            (this.viewed = t),
            (this.title = s),
            (this.imageUrl = i),
            (this.description = a),
            (this.created = r),
            (this.updated = n),
            (this.categories = o),
            (this.expiresAt = l),
            (this.url = d),
            (this.linkText = c),
            (this.aspectRatio = u),
            (this.extras = b),
            (this.pinned = p),
            (this.dismissible = h),
            (this.clicked = f),
            (this.id = e),
            (this.viewed = t || !1),
            (this.title = s || ""),
            (this.imageUrl = i),
            (this.description = a || ""),
            (this.created = r || null),
            (this.updated = n || null),
            (this.categories = o || []),
            (this.expiresAt = l || null),
            (this.url = d),
            (this.linkText = c),
            null == u
              ? (this.aspectRatio = null)
              : ((u = parseFloat(u.toString())),
                (this.aspectRatio = isNaN(u) ? null : u)),
            (this.extras = b || {}),
            (this.pinned = p || !1),
            (this.dismissible = h || !1),
            (this.dismissed = !1),
            (this.clicked = f || !1),
            (this.isControl = !1),
            (this.test = !1),
            (this.ti = null),
            (this.ii = null),
            (this.si = null);
        }
        subscribeToClickedEvent(e) {
          return this.hi().Dt(e);
        }
        subscribeToDismissedEvent(e) {
          return this.ni().Dt(e);
        }
        removeSubscription(e) {
          this.hi().removeSubscription(e), this.ni().removeSubscription(e);
        }
        removeAllSubscriptions() {
          this.hi().removeAllSubscriptions(),
            this.ni().removeAllSubscriptions();
        }
        dismissCard() {
          if (!this.dismissible || this.dismissed) return;
          "function" == typeof this.logCardDismissal && this.logCardDismissal();
          let t = this.te;
          !t && this.id && (t = document.getElementById(this.id)),
            t &&
              ((t.style.height = t.offsetHeight + "px"),
              (t.className = t.className + " ab-hide"),
              setTimeout(function () {
                t &&
                  t.parentNode &&
                  ((t.style.height = "0"),
                  (t.style.margin = "0"),
                  setTimeout(function () {
                    t && t.parentNode && t.parentNode.removeChild(t);
                  }, e.li));
              }, 500));
        }
        hi() {
          return (this.ti ??= new E()), this.ti;
        }
        ni() {
          return (this.ii ??= new E()), this.ii;
        }
        _t() {
          const t = new Date().valueOf();
          return !(
            (null != this.si && t - this.si < e.ei) ||
            ((this.si = t), (this.viewed = !0), 0)
          );
        }
        $t() {
          (this.viewed = !0), (this.clicked = !0), this.hi().X();
        }
        Qt() {
          return !(
            !this.dismissible ||
            this.dismissed ||
            ((this.dismissed = !0), this.ni().X(), 0)
          );
        }
        ri(t) {
          if (null == t || t[e.ui.ds] !== this.id) return !0;
          if (t[e.ui.Ei]) return !1;
          if (
            null != t[e.ui.xs] &&
            null != this.updated &&
            parseInt(t[e.ui.xs]) < n(this.updated.valueOf())
          )
            return !0;
          if (
            (t[e.ui.ps] && !this.viewed && (this.viewed = !0),
            t[e.ui.ys] && !this.clicked && (this.clicked = t[e.ui.ys]),
            null != t[e.ui.us] && (this.title = t[e.ui.us]),
            null != t[e.ui.ls] && (this.imageUrl = t[e.ui.ls]),
            null != t[e.ui.fs] && (this.description = t[e.ui.fs]),
            null != t[e.ui.xs])
          ) {
            const s = N(t[e.ui.xs]);
            null != s && (this.updated = s);
          }
          if (null != t[e.ui.js]) {
            let s;
            (s = t[e.ui.js] === e.oi ? null : N(t[e.ui.js])),
              (this.expiresAt = s);
          }
          if (
            (null != t[e.ui.URL] && (this.url = t[e.ui.URL]),
            null != t[e.ui.zs] && (this.linkText = t[e.ui.zs]),
            null != t[e.ui.ks])
          ) {
            const s = parseFloat(t[e.ui.ks].toString());
            this.aspectRatio = isNaN(s) ? null : s;
          }
          return (
            null != t[e.ui.qs] && (this.extras = t[e.ui.qs]),
            null != t[e.ui.vs] && (this.pinned = t[e.ui.vs]),
            null != t[e.ui.ws] && (this.dismissible = t[e.ui.ws]),
            null != t[e.ui.As] && (this.test = t[e.ui.As]),
            !0
          );
        }
        bt() {
          K.error("Must be implemented in a subclass");
        }
      }),
      (re.oi = -1),
      (re.ui = {
        ds: "id",
        ps: "v",
        ws: "db",
        Ei: "r",
        xs: "ca",
        vs: "p",
        js: "ea",
        qs: "e",
        hs: "tp",
        ls: "i",
        us: "tt",
        fs: "ds",
        URL: "u",
        zs: "dm",
        ks: "ar",
        ys: "cl",
        As: "t",
      }),
      (re.cs = {
        os: "captioned_image",
        Ti: "text_announcement",
        Ii: "short_news",
        ai: "banner_image",
        ci: "control",
      }),
      (re.es = {
        ds: "id",
        ps: "v",
        ws: "db",
        bs: "cr",
        xs: "ca",
        vs: "p",
        gs: "t",
        js: "ea",
        qs: "e",
        hs: "tp",
        ls: "i",
        us: "tt",
        fs: "ds",
        URL: "u",
        zs: "dm",
        ks: "ar",
        ys: "cl",
        As: "s",
      }),
      (re.Ni = {
        mi: "ADVERTISING",
        Si: "ANNOUNCEMENTS",
        Ai: "NEWS",
        Di: "SOCIAL",
      }),
      (re.li = 400),
      (re.ei = 1e4);
  }))();
}
function ve() {
  return (ve = e(() => {
    we(),
      (ne = class extends re {
        constructor(e, t, s, i, a, r, n, o, l, d, c, u, b, p) {
          super(e, t, null, s, null, i, a, r, n, o, l, d, c, u, b, p),
            (this.oe = "ab-image-only"),
            (this.ae = !1),
            (this.test = !1);
        }
        bt() {
          const e = {};
          return (
            (e[re.es.hs] = re.cs.ai),
            (e[re.es.ds] = this.id),
            (e[re.es.ps] = this.viewed),
            (e[re.es.ls] = this.imageUrl),
            (e[re.es.xs] = this.updated),
            (e[re.es.bs] = this.created),
            (e[re.es.gs] = this.categories),
            (e[re.es.js] = this.expiresAt),
            (e[re.es.URL] = this.url),
            (e[re.es.zs] = this.linkText),
            (e[re.es.ks] = this.aspectRatio),
            (e[re.es.qs] = this.extras),
            (e[re.es.vs] = this.pinned),
            (e[re.es.ws] = this.dismissible),
            (e[re.es.ys] = this.clicked),
            (e[re.es.As] = this.test),
            e
          );
        }
      });
  }))();
}
function _e() {
  return (_e = e(() => {
    we(),
      (oe = class extends re {
        constructor(e, t, s, i, a, r, n, o, l, d, c, u, b, p, h, f) {
          super(e, t, s, i, a, r, n, o, l, d, c, u, b, p, h, f),
            (this.oe = "ab-captioned-image"),
            (this.ae = !0),
            (this.test = !1);
        }
        bt() {
          const e = {};
          return (
            (e[re.es.hs] = re.cs.os),
            (e[re.es.ds] = this.id),
            (e[re.es.ps] = this.viewed),
            (e[re.es.us] = this.title),
            (e[re.es.ls] = this.imageUrl),
            (e[re.es.fs] = this.description),
            (e[re.es.xs] = this.updated),
            (e[re.es.bs] = this.created),
            (e[re.es.gs] = this.categories),
            (e[re.es.js] = this.expiresAt),
            (e[re.es.URL] = this.url),
            (e[re.es.zs] = this.linkText),
            (e[re.es.ks] = this.aspectRatio),
            (e[re.es.qs] = this.extras),
            (e[re.es.vs] = this.pinned),
            (e[re.es.ws] = this.dismissible),
            (e[re.es.ys] = this.clicked),
            (e[re.es.As] = this.test),
            e
          );
        }
      });
  }))();
}
function Ce() {
  return (Ce = e(() => {
    we(),
      (le = class extends re {
        constructor(e, t, s, i, a, r, n, o, l, d, c, u, b, p, h, f) {
          super(e, t, s, i, a, r, n, o, l, d, c, u, b, p, h, f),
            (this.oe = "ab-classic-card"),
            (this.ae = !0);
        }
        bt() {
          const e = {};
          return (
            (e[re.es.hs] = re.cs.Ii),
            (e[re.es.ds] = this.id),
            (e[re.es.ps] = this.viewed),
            (e[re.es.us] = this.title),
            (e[re.es.ls] = this.imageUrl),
            (e[re.es.fs] = this.description),
            (e[re.es.xs] = this.updated),
            (e[re.es.bs] = this.created),
            (e[re.es.gs] = this.categories),
            (e[re.es.js] = this.expiresAt),
            (e[re.es.URL] = this.url),
            (e[re.es.zs] = this.linkText),
            (e[re.es.ks] = this.aspectRatio),
            (e[re.es.qs] = this.extras),
            (e[re.es.vs] = this.pinned),
            (e[re.es.ws] = this.dismissible),
            (e[re.es.ys] = this.clicked),
            (e[re.es.As] = this.test),
            e
          );
        }
      });
  }))();
}
function ye() {
  return (ye = e(() => {
    we(),
      (de = class extends re {
        constructor(e, t, s, i, a, r) {
          super(
            e,
            t,
            null,
            null,
            null,
            null,
            s,
            null,
            i,
            null,
            null,
            null,
            a,
            r
          ),
            (this.isControl = !0),
            (this.oe = "ab-control-card"),
            (this.ae = !1);
        }
        bt() {
          const e = {};
          return (
            (e[re.es.hs] = re.cs.ci),
            (e[re.es.ds] = this.id),
            (e[re.es.ps] = this.viewed),
            (e[re.es.xs] = this.updated),
            (e[re.es.js] = this.expiresAt),
            (e[re.es.qs] = this.extras),
            (e[re.es.vs] = this.pinned),
            (e[re.es.As] = this.test),
            e
          );
        }
      });
  }))();
}
function ke(e, t, s) {
  const i = e || document.querySelector("head"),
    a = `ab-${t}-css-definitions-${"5.9.0".replace(/\./g, "-")}`;
  if (!i) return;
  const r = i.ownerDocument || document;
  if (null == r.getElementById(a)) {
    const e = r.createElement("style");
    (e.innerHTML = s || ""), (e.id = a);
    const t = L.ee(D.er);
    null != t && e.setAttribute("nonce", t), i.appendChild(e);
  }
}
function Ne() {
  return (Ne = e(() => {
    Z();
  }))();
}
function Me() {
  if (L.ee(D.Ia)) return;
  const e = "https://use.fontawesome.com/7f85a56ba4.css";
  if (
    null === document.querySelector('link[rel=stylesheet][href="' + e + '"]')
  ) {
    const t = document.createElement("link");
    t.setAttribute("rel", "stylesheet"),
      t.setAttribute("href", e),
      document.getElementsByTagName("head")[0].appendChild(t);
  }
}
function Te() {
  return (Te = e(() => {
    Z();
  }))();
}
function ze() {
  ke(
    void 0,
    "feed",
    "body>.ab-feed{position:fixed;top:0;right:0;bottom:0;width:421px;-webkit-border-radius:0;-moz-border-radius:0;border-radius:0}body>.ab-feed .ab-feed-body{position:absolute;top:0;left:0;right:0;border:none;border-left:1px solid #d0d0d0;padding-top:70px;min-height:100%}body>.ab-feed .ab-initial-spinner{float:none}body>.ab-feed .ab-no-cards-message{position:absolute;width:100%;margin-left:-20px;top:40%}.ab-feed{-webkit-border-radius:3px;-moz-border-radius:3px;border-radius:3px;-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;-webkit-box-shadow:0 1px 7px 1px rgba(66,82,113,.15);-moz-box-shadow:0 1px 7px 1px rgba(66,82,113,.15);box-shadow:0 1px 7px 1px rgba(66,82,113,.15);width:402px;background-color:#eee;font-family:'Helvetica Neue Light','Helvetica Neue',Helvetica,Arial,'Lucida Grande',sans-serif;font-size:13px;line-height:130%;letter-spacing:normal;overflow-y:auto;overflow-x:visible;z-index:9011;-webkit-overflow-scrolling:touch}.ab-feed :focus,.ab-feed:focus{outline:0}.ab-feed .ab-feed-body{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;border:1px solid #d0d0d0;border-top:none;padding:20px 20px 0 20px}.ab-feed.ab-effect-slide{-webkit-transform:translateX(450px);-moz-transform:translateX(450px);-ms-transform:translateX(450px);transform:translateX(450px);-webkit-transition:transform .5s ease-in-out;-moz-transition:transform .5s ease-in-out;-o-transition:transform .5s ease-in-out;transition:transform .5s ease-in-out}.ab-feed.ab-effect-slide.ab-show{-webkit-transform:translateX(0);-moz-transform:translateX(0);-ms-transform:translateX(0);transform:translateX(0)}.ab-feed.ab-effect-slide.ab-hide{-webkit-transform:translateX(450px);-moz-transform:translateX(450px);-ms-transform:translateX(450px);transform:translateX(450px)}.ab-feed .ab-card{position:relative;-webkit-box-shadow:0 2px 3px 0 rgba(178,178,178,.5);-moz-box-shadow:0 2px 3px 0 rgba(178,178,178,.5);box-shadow:0 2px 3px 0 rgba(178,178,178,.5);-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;-webkit-border-radius:3px;-moz-border-radius:3px;border-radius:3px;width:100%;border:1px solid #d0d0d0;margin-bottom:20px;overflow:hidden;background-color:#fff;-webkit-transition:height .4s ease-in-out,margin .4s ease-in-out;-moz-transition:height .4s ease-in-out,margin .4s ease-in-out;-o-transition:height .4s ease-in-out,margin .4s ease-in-out;transition:height .4s ease-in-out,margin .4s ease-in-out}.ab-feed .ab-card .ab-pinned-indicator{position:absolute;right:0;top:0;margin-right:-1px;width:0;height:0;border-style:solid;border-width:0 24px 24px 0;border-color:transparent #1676d0 transparent transparent}.ab-feed .ab-card .ab-pinned-indicator .fa-star{position:absolute;right:-21px;top:2px;font-size:9px;color:#fff}.ab-feed .ab-card.ab-effect-card.ab-hide{-webkit-transition:all .5s ease-in-out;-moz-transition:all .5s ease-in-out;-o-transition:all .5s ease-in-out;transition:all .5s ease-in-out}.ab-feed .ab-card.ab-effect-card.ab-hide.ab-swiped-left{-webkit-transform:translateX(-450px);-moz-transform:translateX(-450px);-ms-transform:translateX(-450px);transform:translateX(-450px)}.ab-feed .ab-card.ab-effect-card.ab-hide.ab-swiped-right{-webkit-transform:translateX(450px);-moz-transform:translateX(450px);-ms-transform:translateX(450px);transform:translateX(450px)}.ab-feed .ab-card.ab-effect-card.ab-hide:not(.ab-swiped-left):not(.ab-swiped-right){opacity:0}.ab-feed .ab-card .ab-close-button{-webkit-box-sizing:content-box;-moz-box-sizing:content-box;box-sizing:content-box;background-color:transparent;background-size:15px;border:none;width:15px;min-width:15px;height:15px;cursor:pointer;display:block;font-size:15px;line-height:0;padding-top:15px;padding-right:15px;padding-left:15px;padding-bottom:15px;position:absolute;top:0;z-index:9021;opacity:0;-webkit-transition:.5s;-moz-transition:.5s;-o-transition:.5s;transition:.5s}.ab-feed .ab-card .ab-close-button[dir=rtl]{left:0}.ab-feed .ab-card .ab-close-button[dir=ltr]{right:0}.ab-feed .ab-card .ab-close-button svg{-webkit-transition:.2s ease;-moz-transition:.2s ease;-o-transition:.2s ease;transition:.2s ease;fill:#9b9b9b;height:auto;width:100%}.ab-feed .ab-card .ab-close-button svg.ab-chevron{display:none}.ab-feed .ab-card .ab-close-button:active{background-color:transparent}.ab-feed .ab-card .ab-close-button:focus{background-color:transparent}.ab-feed .ab-card .ab-close-button:hover{background-color:transparent}.ab-feed .ab-card .ab-close-button:hover svg{fill-opacity:.8}.ab-feed .ab-card .ab-close-button:hover{opacity:1}.ab-feed .ab-card .ab-close-button:focus{opacity:1}.ab-feed .ab-card a{float:none;color:inherit;text-decoration:none}.ab-feed .ab-card a:hover{text-decoration:underline}.ab-feed .ab-card .ab-image-area{float:none;display:inline-block;vertical-align:top;line-height:0;overflow:hidden;width:100%;-webkit-box-sizing:initial;-moz-box-sizing:initial;box-sizing:initial}.ab-feed .ab-card .ab-image-area img{float:none;height:auto;width:100%}.ab-feed .ab-card.ab-image-only .ab-card-body{display:none}.ab-feed .ab-card .ab-card-body{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;display:inline-block;width:100%;position:relative}.ab-feed .ab-card .ab-unread-indicator{position:absolute;bottom:0;margin-right:-1px;width:100%;height:5px;background-color:#1676d0}.ab-feed .ab-card .ab-unread-indicator.read{background-color:transparent}.ab-feed .ab-card .ab-title{float:none;letter-spacing:0;margin:0;font-weight:700;font-family:'Helvetica Neue Light','Helvetica Neue',Helvetica,Arial,'Lucida Grande',sans-serif;display:block;overflow:hidden;word-wrap:break-word;text-overflow:ellipsis;font-size:18px;line-height:130%;padding:20px 25px 0 25px}.ab-feed .ab-card .ab-description{float:none;color:#545454;padding:15px 25px 20px 25px;word-wrap:break-word;white-space:pre-wrap}.ab-feed .ab-card .ab-description.ab-no-title{padding-top:20px}.ab-feed .ab-card .ab-url-area{float:none;color:#1676d0;margin-top:12px;font-family:'Helvetica Neue Light','Helvetica Neue',Helvetica,Arial,'Lucida Grande',sans-serif}.ab-feed .ab-card.ab-classic-card .ab-card-body{min-height:40px;-webkit-border-radius:3px;-moz-border-radius:3px;border-radius:3px}.ab-feed .ab-card.ab-classic-card.with-image .ab-card-body{min-height:100px}.ab-feed .ab-card.ab-classic-card.with-image .ab-card-body[dir=ltr]{padding-left:72px}.ab-feed .ab-card.ab-classic-card.with-image .ab-card-body[dir=rtl]{padding-right:72px}.ab-feed .ab-card.ab-classic-card.with-image .ab-image-area{width:60px;height:60px;padding:20px 0 25px 25px;position:absolute}.ab-feed .ab-card.ab-classic-card.with-image .ab-image-area[dir=rtl]{padding:20px 25px 25px 0}.ab-feed .ab-card.ab-classic-card.with-image .ab-image-area img{-webkit-border-radius:3px;-moz-border-radius:3px;border-radius:3px;max-width:100%;max-height:100%;width:auto;height:auto}.ab-feed .ab-card.ab-classic-card.with-image .ab-title{background-color:transparent;font-size:16px}.ab-feed .ab-card.ab-classic-card.with-image .ab-description{padding-top:10px}.ab-feed .ab-card.ab-control-card{height:0;width:0;margin:0;border:0}.ab-feed .ab-feed-buttons-wrapper{float:none;position:relative;background-color:#282828;height:50px;-webkit-box-shadow:0 2px 3px 0 rgba(178,178,178,.5);-moz-box-shadow:0 2px 3px 0 rgba(178,178,178,.5);box-shadow:0 2px 3px 0 rgba(178,178,178,.5);z-index:1}.ab-feed .ab-feed-buttons-wrapper .ab-close-button,.ab-feed .ab-feed-buttons-wrapper .ab-refresh-button{float:none;cursor:pointer;color:#fff;font-size:18px;padding:16px;-webkit-transition:.2s;-moz-transition:.2s;-o-transition:.2s;transition:.2s}.ab-feed .ab-feed-buttons-wrapper .ab-close-button:hover,.ab-feed .ab-feed-buttons-wrapper .ab-refresh-button:hover{font-size:22px}.ab-feed .ab-feed-buttons-wrapper .ab-close-button{float:right}.ab-feed .ab-feed-buttons-wrapper .ab-close-button:hover{padding-top:12px;padding-right:14px}.ab-feed .ab-feed-buttons-wrapper .ab-refresh-button{padding-left:17px}.ab-feed .ab-feed-buttons-wrapper .ab-refresh-button:hover{padding-top:13px;padding-left:14px}.ab-feed .ab-no-cards-message{text-align:center;margin-bottom:20px}@media (max-width:600px){body>.ab-feed{width:100%}}"
  ),
    Me();
}
function De() {
  return (De = e(() => {
    Ne(), Te();
  }))();
}
function Oe(e, t, s, i = "ltr") {
  const a = document.createElement("button");
  a.setAttribute("aria-label", e),
    a.setAttribute("tabindex", "0"),
    a.setAttribute("role", "button"),
    (a.dir = i),
    g(a, "touchstart"),
    (a.className = "ab-close-button");
  const r = ie(
    "0 0 15 15",
    "M15 1.5L13.5 0l-6 6-6-6L0 1.5l6 6-6 6L1.5 15l6-6 6 6 1.5-1.5-6-6 6-6z",
    t
  );
  return (
    a.appendChild(r),
    a.addEventListener("keydown", (e) => {
      (e.keyCode !== x.Wo && e.keyCode !== x.Xo) || (s(), e.stopPropagation());
    }),
    (a.onclick = (e) => {
      s(), e.stopPropagation();
    }),
    a
  );
}
function Ue() {
  return (Ue = e(() => {
    k(), d();
  }))();
}
function Ge() {
  if (L.rr()) return L.mr();
}
function Re() {
  return (Re = e(() => {
    Z();
  }))();
}
function Ie(e, t, s) {
  if (L.rr())
    if (B.test(e)) {
      const t = te(e);
      if (!t) return;
      const s = (e) => {
        if (!z(e))
          return void K.error(
            `Decoded Braze Action json is invalid: ${JSON.stringify(
              e,
              null,
              2
            )}`
          );
        const t = se.properties.type,
          a = se.properties.eo,
          r = se.properties.so,
          n = e[t];
        if (n === se.types.io) {
          const t = e[a];
          for (const e of t) s(e);
        } else {
          const t = e[r];
          let s, a;
          switch (n) {
            case se.types.logCustomEvent:
              i(async () => {
                const { logCustomEvent: e } = await import(
                  "./log-custom-event-z0eMsFQ_.js"
                ).then((e) => (e.t(), e.r));
                return { logCustomEvent: e };
              }, __vite__mapDeps([0, 1, 2, 3])).then(
                ({ logCustomEvent: e }) => {
                  L.nn()
                    ? ((a = Array.prototype.slice.call(t)), e(...a))
                    : K.error(S);
                }
              );
              break;
            case se.types.requestPushPermission:
              i(async () => {
                const { requestPushPermission: e } = await import(
                  "./request-push-permission-Bdo-70ZN.js"
                ).then((e) => (e.t(), e.r));
                return { requestPushPermission: e };
              }, __vite__mapDeps([4, 1, 2, 3, 5])).then(
                ({ requestPushPermission: e }) => {
                  L.nn()
                    ? "Safari" === X.browser && X.OS === ee.ao
                      ? window.navigator.standalone && e()
                      : e()
                    : K.error(S);
                }
              );
              break;
            case se.types.setEmailNotificationSubscriptionType:
            case se.types.setPushNotificationSubscriptionType:
            case se.types.setCustomUserAttribute:
            case se.types.addToSubscriptionGroup:
            case se.types.removeFromSubscriptionGroup:
            case se.types.addToCustomAttributeArray:
            case se.types.removeFromCustomAttributeArray:
              (s = Ge()), s && s[n](...Array.prototype.slice.call(t));
              break;
            case se.types.co:
            case se.types.mo:
              (a = Array.prototype.slice.call(t)), I.openUri(...a);
              break;
            default:
              K.info(`Ignoring unknown Braze Action: ${n}`);
          }
        }
      };
      s(t);
    } else I.openUri(e, t, s);
}
function Fe(e, t) {
  Ie(e, t);
}
function Le() {
  return (Le = e(() => {
    q(), ae(), Z(), l(), U(), G(), F(), T(), Re(), s();
  }))();
}
function qe() {
  return (qe = e(() => {
    ce = {
      en: {
        NO_CARDS_MESSAGE:
          "We have no updates for you at this time.<br/>Please check again later.",
        FEED_TIMEOUT_MESSAGE:
          "Sorry, this refresh timed out.<br/>Please try again later.",
      },
      ar: {
        NO_CARDS_MESSAGE: "ليس لدينا أي تحديث. يرجى التحقق مرة أخرى لاحقاً",
        FEED_TIMEOUT_MESSAGE: "يرجى تكرار المحاولة لاحقا",
      },
      cs: {
        NO_CARDS_MESSAGE:
          "V tuto chvíli pro vás nemáme žádné aktualizace.<br/>Zkontrolujte prosím znovu později.",
        FEED_TIMEOUT_MESSAGE: "Prosím zkuste to znovu později.",
      },
      da: {
        NO_CARDS_MESSAGE: "Vi har ingen updates.<br/>Prøv venligst senere.",
        FEED_TIMEOUT_MESSAGE: "Prøv venligst senere.",
      },
      de: {
        NO_CARDS_MESSAGE:
          "Derzeit sind keine Updates verfügbar.<br/>Bitte später noch einmal versuchen.",
        FEED_TIMEOUT_MESSAGE: "Bitte später noch einmal versuchen.",
      },
      es: {
        NO_CARDS_MESSAGE:
          "No tenemos actualizaciones.<br/>Por favor compruébelo más tarde.",
        FEED_TIMEOUT_MESSAGE: "Por favor inténtelo más tarde.",
      },
      "es-mx": {
        NO_CARDS_MESSAGE:
          "No tenemos ninguna actualización.<br/>Vuelva a verificar más tarde.",
        FEED_TIMEOUT_MESSAGE: "Por favor, vuelva a intentarlo más tarde.",
      },
      et: {
        NO_CARDS_MESSAGE:
          "Uuendusi pole praegu saadaval.<br/>Proovige hiljem uuesti.",
        FEED_TIMEOUT_MESSAGE: "Palun proovige hiljem uuesti.",
      },
      fi: {
        NO_CARDS_MESSAGE:
          "Päivityksiä ei ole saatavilla.<br/>Tarkista myöhemmin uudelleen.",
        FEED_TIMEOUT_MESSAGE: "Yritä myöhemmin uudelleen.",
      },
      fr: {
        NO_CARDS_MESSAGE:
          "Aucune mise à jour disponible.<br/>Veuillez vérifier ultérieurement.",
        FEED_TIMEOUT_MESSAGE: "Veuillez réessayer ultérieurement.",
      },
      he: {
        NO_CARDS_MESSAGE: ".אין לנו עדכונים. בבקשה בדוק שוב בקרוב",
        FEED_TIMEOUT_MESSAGE: ".בבקשה נסה שוב בקרוב",
      },
      hi: {
        NO_CARDS_MESSAGE:
          "हमारे पास कोई अपडेट नहीं हैं। कृपया बाद में फिर से जाँच करें.।",
        FEED_TIMEOUT_MESSAGE: "कृपया बाद में दोबारा प्रयास करें।.",
      },
      id: {
        NO_CARDS_MESSAGE: "Kami tidak memiliki pembaruan. Coba lagi nanti.",
        FEED_TIMEOUT_MESSAGE: "Coba lagi nanti.",
      },
      it: {
        NO_CARDS_MESSAGE:
          "Non ci sono aggiornamenti.<br/>Ricontrollare più tardi.",
        FEED_TIMEOUT_MESSAGE: "Riprovare più tardi.",
      },
      ja: {
        NO_CARDS_MESSAGE:
          "アップデートはありません。<br/>後でもう一度確認してください。",
        FEED_TIMEOUT_MESSAGE: "後でもう一度試してください。",
      },
      ko: {
        NO_CARDS_MESSAGE: "업데이트가 없습니다. 다음에 다시 확인해 주십시오.",
        FEED_TIMEOUT_MESSAGE: "나중에 다시 시도해 주십시오.",
      },
      ms: {
        NO_CARDS_MESSAGE: "Tiada kemas kini. Sila periksa kemudian.",
        FEED_TIMEOUT_MESSAGE: "Sila cuba kemudian.",
      },
      nl: {
        NO_CARDS_MESSAGE:
          "Er zijn geen updates.<br/>Probeer het later opnieuw.",
        FEED_TIMEOUT_MESSAGE: "Probeer het later opnieuw.",
      },
      no: {
        NO_CARDS_MESSAGE:
          "Vi har ingen oppdateringer.<br/>Vennligst sjekk igjen senere.",
        FEED_TIMEOUT_MESSAGE: "Vennligst prøv igjen senere.",
      },
      pl: {
        NO_CARDS_MESSAGE:
          "Brak aktualizacji.<br/>Proszę sprawdzić ponownie później.",
        FEED_TIMEOUT_MESSAGE: "Proszę spróbować ponownie później.",
      },
      pt: {
        NO_CARDS_MESSAGE:
          "Não temos atualizações.<br/>Por favor, verifique mais tarde.",
        FEED_TIMEOUT_MESSAGE: "Por favor, tente mais tarde.",
      },
      "pt-br": {
        NO_CARDS_MESSAGE:
          "Não temos nenhuma atualização.<br/>Verifique novamente mais tarde.",
        FEED_TIMEOUT_MESSAGE: "Tente novamente mais tarde.",
      },
      ru: {
        NO_CARDS_MESSAGE:
          "Обновления недоступны.<br/>Пожалуйста, проверьте снова позже.",
        FEED_TIMEOUT_MESSAGE: "Пожалуйста, повторите попытку позже.",
      },
      sv: {
        NO_CARDS_MESSAGE:
          "Det finns inga uppdateringar.<br/>Försök igen senare.",
        FEED_TIMEOUT_MESSAGE: "Försök igen senare.",
      },
      th: {
        NO_CARDS_MESSAGE: "เราไม่มีการอัพเดต กรุณาตรวจสอบภายหลัง.",
        FEED_TIMEOUT_MESSAGE: "กรุณาลองใหม่ภายหลัง.",
      },
      uk: {
        NO_CARDS_MESSAGE:
          "Оновлення недоступні.<br/>ласка, перевірте знову пізніше.",
        FEED_TIMEOUT_MESSAGE: "Будь ласка, спробуйте ще раз пізніше.",
      },
      vi: {
        NO_CARDS_MESSAGE:
          "Chúng tôi không có cập nhật nào.<br/>Vui lòng kiểm tra lại sau.",
        FEED_TIMEOUT_MESSAGE: "Vui lòng thử lại sau.",
      },
      "zh-hk": {
        NO_CARDS_MESSAGE: "暫時沒有更新.<br/>請稍候再試.",
        FEED_TIMEOUT_MESSAGE: "請稍候再試.",
      },
      "zh-hans": {
        NO_CARDS_MESSAGE: "暂时没有更新.<br/>请稍后再试.",
        FEED_TIMEOUT_MESSAGE: "请稍候再试.",
      },
      "zh-hant": {
        NO_CARDS_MESSAGE: "暫時沒有更新.<br/>請稍候再試.",
        FEED_TIMEOUT_MESSAGE: "請稍候再試.",
      },
      "zh-tw": {
        NO_CARDS_MESSAGE: "暫時沒有更新.<br/>請稍候再試.",
        FEED_TIMEOUT_MESSAGE: "請稍候再試.",
      },
      zh: {
        NO_CARDS_MESSAGE: "暂时没有更新.<br/>请稍后再试.",
        FEED_TIMEOUT_MESSAGE: "请稍候再试.",
      },
    };
  }))();
}
function je() {
  return (je = e(() => {
    q(),
      qe(),
      (ue = class {
        constructor(e, t = !1) {
          if (
            ((this.language = e),
            null != e && (e = e.toLowerCase()),
            null != e && null == ce[e])
          ) {
            const t = e.indexOf("-");
            t > 0 && (e = e.substring(0, t));
          }
          if (null == ce[e]) {
            const s =
              "Braze does not yet have a localization for language " +
              e +
              ", defaulting to English. Please contact us if you are willing and able to help us translate our SDK into this language.";
            t ? K.error(s) : K.info(s), (e = "en");
          }
          this.language = e;
        }
        get(e) {
          return ce[this.language][e];
        }
        Oo() {
          switch (this.language) {
            case "ar":
            case "he":
            case "fa":
              return "rtl";
            default:
              return "ltr";
          }
        }
      });
  }))();
}
function Pe() {
  return (Pe = e(() => {
    Z(),
      U(),
      je(),
      (be = {
        l: !1,
        aa: null,
        ea: () => {
          if ((be.p(), !be.aa)) {
            let e = X.language,
              t = !1;
            L.ee(D.Zn) && ((e = L.ee(D.Zn)), (t = !0)), (be.aa = new ue(e, t));
          }
          return be.aa;
        },
        p: () => {
          be.l || (L.h(be), (be.l = !0));
        },
        destroy: () => {
          (be.aa = null), (be.l = !1);
        },
      });
  }))();
}
function Xe() {
  return (Xe = e(() => {
    ye(),
      V(),
      f(),
      q(),
      H(),
      $(),
      (pe = class {
        constructor(e) {
          (this.C = e), (this.C = e);
        }
        logClick(e, t) {
          const s = new W();
          if ((e.$t(), null == e.url || "" === e.url))
            return (
              K.info(
                `Card ${e.id} has no url. Not logging click to Braze servers.`
              ),
              s
            );
          if (t && e.id && this.C) {
            const t = this.C.ft(O.gt.Kt) || {};
            (t[e.id] = !0), this.C.Bt(O.gt.Kt, t);
          }
          const i = this.Lt([e]);
          if (null == i) return s;
          const a = t ? R.Mt : R.Ot;
          return Y.ut(a, i);
        }
        Pt(e) {
          const t = new W();
          if (!e.Qt())
            return (
              K.info(
                `Card ${e.id} refused this dismissal. Ignoring analytics event.`
              ),
              t
            );
          if (e.id && this.C) {
            const t = this.C.ft(O.gt.Vt) || {};
            (t[e.id] = !0), this.C.Bt(O.gt.Vt, t);
          }
          const s = this.Lt([e]);
          return null == s ? t : Y.ut(R.Wt, s);
        }
        Xt(e, t) {
          const s = new W(!0),
            i = [],
            a = [];
          let r = {};
          this.C &&
            (r = t ? this.C.ft(O.gt.Yt) || {} : this.C.ft(O.gt.Zt) || {});
          for (const l of e)
            l._t()
              ? (l instanceof de ? a.push(l) : i.push(l),
                l.id && (r[l.id] = !0))
              : K.info(
                  `Card ${l.id} logged an impression too recently. Ignoring analytics event.`
                );
          const n = this.Lt(i),
            o = this.Lt(a);
          if (null == n && null == o) return (s.tt = !1), s;
          if (
            (this.C && (t ? this.C.Bt(O.gt.Yt, r) : this.C.Bt(O.gt.Zt, r)),
            null != n)
          ) {
            const e = t ? R.ts : R.ss,
              i = Y.ut(e, n);
            s.ns(i);
          }
          if (null != o && t) {
            const e = Y.ut(R.rs, o);
            s.ns(e);
          }
          return s;
        }
        Lt(e) {
          let t,
            s = null;
          for (let i = 0; i < e.length; i++)
            (t = e[i].id),
              null != t &&
                "" !== t &&
                ((s = s || {}), (s.ids = s.ids || []), s.ids.push(t));
          return s;
        }
      });
  }))();
}
function Be() {
  return (Be = e(() => {
    Xe(),
      Z(),
      (he = {
        l: !1,
        aa: null,
        ea: () => (he.p(), he.aa || (he.aa = new pe(L.j())), he.aa),
        p: () => {
          he.l || (L.h(he), (he.l = !0));
        },
        destroy: () => {
          (he.aa = null), (he.l = !1);
        },
      });
  }))();
}
function Ve(e, t) {
  return (
    !!L.rr() &&
    (e instanceof re
      ? he.ea().logClick(e, t).tt
      : (K.error("card must be a Card object"), !1))
  );
}
function He() {
  return (He = e(() => {
    we(), Be(), ae(), Z(), q();
  }))();
}
function $e(e) {
  return (
    !!L.rr() &&
    (e instanceof re
      ? he.ea().Pt(e).tt
      : (K.error("card must be a Card object"), !1))
  );
}
function We() {
  return (We = e(() => {
    we(), Be(), ae(), Z(), q();
  }))();
}
function Ze(e, t) {
  if (!L.rr()) return !1;
  if (!m(e)) return K.error("cards must be an array"), !1;
  for (const s of e)
    if (!(s instanceof re)) return K.error(`Each card in cards ${h}`), !1;
  return he.ea().Xt(e, t).tt;
}
function Ke() {
  return (Ke = e(() => {
    we(), Be(), Z(), M(), ae(), q();
  }))();
}
function Qe() {
  return (Qe = e(() => {
    q(),
      ye(),
      ((fe = class {
        constructor(e, t) {
          (this.cards = e),
            (this.lastUpdated = t),
            (this.cards = e),
            (this.lastUpdated = t);
        }
        getUnreadCardCount() {
          let e = 0;
          for (const t of this.cards) t.viewed || t instanceof de || e++;
          return e;
        }
        nr() {
          K.error("Must be implemented in a subclass");
        }
        logCardImpressions(e) {
          K.error("Must be implemented in a subclass");
        }
        logCardClick(e) {
          K.error("Must be implemented in a subclass");
        }
        sr() {
          K.error("Must be implemented in a subclass");
        }
      }).dr = 6e4),
      (fe.Ih = 500),
      (fe.Ro = 1e4);
  }))();
}
function Ye(e, t, s, i, a, r, n, o, l, d, c, u, b, p, h, f, m, g) {
  let E;
  if (t === re.cs.Ti || t === re.cs.Ii)
    E = new le(e, s, i, a, r, n, o, l, d, c, u, b, p, h, f, m);
  else if (t === re.cs.os)
    E = new oe(e, s, i, a, r, n, o, l, d, c, u, b, p, h, f, m);
  else if (t === re.cs.ai) E = new ne(e, s, a, n, o, l, d, c, u, b, p, h, f, m);
  else {
    if (t !== re.cs.ci)
      return K.error("Ignoring card with unknown type " + t), null;
    E = new de(e, s, o, d, p, h);
  }
  return g && (E.test = g), E;
}
function Je(e) {
  if (e[re.ui.Ei]) return null;
  const t = e[re.ui.ds],
    s = e[re.ui.hs],
    i = e[re.ui.ps],
    a = e[re.ui.us],
    r = e[re.ui.ls],
    n = e[re.ui.fs],
    o = N(e[re.ui.xs]),
    l = o;
  let d;
  return (
    (d = e[re.ui.js] === re.oi ? null : N(e[re.ui.js])),
    Ye(
      t,
      s,
      i,
      a,
      r,
      n,
      l,
      o,
      null,
      d,
      e[re.ui.URL],
      e[re.ui.zs],
      e[re.ui.ks],
      e[re.ui.qs],
      e[re.ui.vs],
      e[re.ui.ws],
      e[re.ui.ys],
      e[re.ui.As] || !1
    )
  );
}
function et(e) {
  return (
    Ye(
      e[re.es.ds],
      e[re.es.hs],
      e[re.es.ps],
      e[re.es.us],
      e[re.es.ls],
      e[re.es.fs],
      y(e[re.es.bs]),
      y(e[re.es.xs]),
      e[re.es.gs],
      y(e[re.es.js]),
      e[re.es.URL],
      e[re.es.zs],
      e[re.es.ks],
      e[re.es.qs],
      e[re.es.vs],
      e[re.es.ws],
      e[re.es.ys],
      e[re.es.As] || !1
    ) || void 0
  );
}
function tt() {
  return (tt = e(() => {
    we(), _e(), Ce(), ye(), ve(), b(), q();
  }))();
}
function st(e) {
  if (null != e) {
    const t = e.querySelectorAll(".ab-unread-indicator")[0];
    null != t && (t.className += " read");
  }
}
function it(e) {
  return e.getAttribute("data-ab-card-id");
}
function at(e, t) {
  const s = t.querySelectorAll(".ab-image-area");
  let i,
    a = 0;
  s.length > 0 && (a = s[0].offsetWidth);
  for (const r of e)
    if (((i = r.te), i && r.imageUrl && "number" == typeof r.aspectRatio)) {
      const e = a / r.aspectRatio;
      e && (i.style.height = `${e}px`);
    }
}
function rt(e, t, s, i = "ltr") {
  const a = document.createElement("div");
  (a.dir = i),
    (a.className = "ab-card ab-effect-card " + e.oe),
    e.id &&
      (a.setAttribute("data-ab-card-id", e.id), a.setAttribute("id", e.id)),
    a.setAttribute("role", "article"),
    a.setAttribute("tabindex", "0");
  let n = "",
    o = !1;
  e.url && "" !== e.url && ((n = e.url), (o = !0));
  const l = (i) => (st(a), o && (t(e), Ie(n, s, i)), !1);
  if (e.pinned) {
    const e = document.createElement("div");
    e.className = "ab-pinned-indicator";
    const t = document.createElement("i");
    (t.className = "fa fa-star"), e.appendChild(t), a.appendChild(e);
  }
  if (e.imageUrl && "" !== e.imageUrl) {
    const t = document.createElement("div");
    (t.dir = i), (t.className = "ab-image-area");
    const s = document.createElement("img");
    if (
      (s.setAttribute("src", e.imageUrl),
      (s.onload = () => {
        a.style.height = "auto";
      }),
      (function (e, t) {
        let s = "";
        e.title || e.description || (s = "Feed Image"),
          t.setAttribute("alt", s);
      })(e, s),
      t.appendChild(s),
      (a.className += " with-image"),
      o && !e.ae)
    ) {
      const e = document.createElement("a");
      e.setAttribute("href", n),
        (e.onclick = l),
        e.appendChild(t),
        a.appendChild(e);
    } else a.appendChild(t);
  }
  const d = document.createElement("div");
  if (((d.className = "ab-card-body"), (d.dir = i), e.dismissible)) {
    e.logCardDismissal = () => $e(e);
    const t = Oe("Dismiss Card", void 0, e.dismissCard.bind(e), i);
    a.appendChild(t),
      r(d, p.ie, (e) => {
        (a.className += " ab-swiped-left"), t.onclick(e);
      }),
      r(d, p.de, (e) => {
        (a.className += " ab-swiped-right"), t.onclick(e);
      });
  }
  let c = "",
    u = !1;
  if ((e.title && "" !== e.title && ((c = e.title), (u = !0)), u)) {
    const e = document.createElement("h1");
    if (
      ((e.className = "ab-title"),
      (e.id = A.ce()),
      a.setAttribute("aria-labelledby", e.id),
      o)
    ) {
      const t = document.createElement("a");
      t.setAttribute("href", n),
        (t.onclick = l),
        t.appendChild(document.createTextNode(c)),
        e.appendChild(t);
    } else e.appendChild(document.createTextNode(c));
    d.appendChild(e);
  }
  const b = document.createElement("div");
  if (
    ((b.className = u ? "ab-description" : "ab-description ab-no-title"),
    (b.id = A.ce()),
    a.setAttribute("aria-describedby", b.id),
    e.description && b.appendChild(document.createTextNode(e.description)),
    o)
  ) {
    const t = document.createElement("div");
    t.className = "ab-url-area";
    const s = document.createElement("a");
    s.setAttribute("href", n),
      e.linkText && s.appendChild(document.createTextNode(e.linkText)),
      (s.onclick = l),
      t.appendChild(s),
      b.appendChild(t);
  }
  d.appendChild(b), a.appendChild(d);
  const h = document.createElement("div");
  return (
    (h.className = "ab-unread-indicator"),
    e.viewed && (h.className += " read"),
    a.appendChild(h),
    (e.te = a),
    a
  );
}
function nt() {
  return (nt = e(() => {
    Ue(), k(), Le(), We(), a();
  }))();
}
function ot(e) {
  L.rr() && L.removeSubscription(e);
}
function lt() {
  return (lt = e(() => {
    Z();
  }))();
}
function dt(e) {
  return null != e && !!e.getAttribute("data-ab-had-top-impression");
}
function ct(e) {
  e?.setAttribute("data-ab-had-top-impression", "true");
}
function ut(e) {
  return null != e && !!e.getAttribute("data-ab-had-bottom-impression");
}
function bt(e) {
  e?.setAttribute("data-ab-had-bottom-impression", "true");
}
function pt() {
  return (pt = e(() => {
    me = { oo: dt, no: ut };
  }))();
}
function ht(e) {
  e &&
    ((e.className = e.className.replace("ab-show", "ab-hide")),
    setTimeout(() => {
      e && e.parentNode && e.parentNode.removeChild(e);
    }, fe.Ih));
  const t = e.getAttribute(v);
  null != t && ot(t);
  const s = e.getAttribute("data-listener-id");
  null != s && (window.removeEventListener("scroll", Ee[s]), delete Ee[s]);
}
function ft(e, t) {
  const s = be.ea(),
    i = document.createElement("div");
  if (
    ((i.className = "ab-feed-body"),
    i.setAttribute("aria-label", "Feed"),
    i.setAttribute("role", "feed"),
    null == e.lastUpdated)
  ) {
    const e = document.createElement("div");
    e.className = "ab-no-cards-message";
    const t = document.createElement("i");
    (t.className = "fa fa-spinner fa-spin fa-4x ab-initial-spinner"),
      e.appendChild(t),
      i.appendChild(e);
  } else {
    let a = !1;
    const r = (t) => e.logCardClick(t);
    for (const n of e.cards) {
      const o = n instanceof de;
      !o || e.nr()
        ? (i.appendChild(rt(n, r, t, s.Oo())), (a = a || !o))
        : K.error(
            "Received a control card for a legacy news feed. Control cards are only supported with content cards."
          );
    }
    if (!a) {
      const e = document.createElement("div");
      (e.className = "ab-no-cards-message"),
        (e.innerHTML = s.get("NO_CARDS_MESSAGE") || ""),
        e.setAttribute("role", "article"),
        i.appendChild(e);
    }
  }
  return i;
}
function mt(e, t) {
  if (null != e && null != t) {
    const s = [],
      i = t.querySelectorAll(".ab-card");
    e._o || (e._o = {});
    for (let t = 0; t < i.length; t++) {
      const a = it(i[t]),
        r = u(i[t]),
        n = w(i[t]);
      if (e._o[a]) {
        r || n || st(i[t]);
        continue;
      }
      let o = dt(i[t]),
        l = ut(i[t]);
      const d = o,
        c = l;
      if (
        (!o && r && ((o = !0), ct(i[t])),
        !l && n && ((l = !0), bt(i[t])),
        o && l)
      ) {
        if (d && c) continue;
        for (const t of e.cards)
          if (t.id === a) {
            (e._o[t.id] = !0), s.push(t);
            break;
          }
      }
    }
    s.length > 0 && e.logCardImpressions(s);
  }
}
function gt(e, t) {
  if (null == e || null == t) return;
  t.setAttribute("aria-busy", "true");
  const s = t.querySelectorAll(".ab-refresh-button")[0];
  null != s && (s.className += " fa-spin");
  const i = new Date().valueOf().toString();
  t.setAttribute("data-last-requested-refresh", i),
    setTimeout(() => {
      if (t.getAttribute("data-last-requested-refresh") === i) {
        const e = t.querySelectorAll(".fa-spin");
        for (let t = 0; t < e.length; t++)
          e[t].className = e[t].className.replace(/fa-spin/g, "");
        const s = t.querySelectorAll(".ab-initial-spinner")[0];
        if (null != s) {
          const e = document.createElement("span");
          (e.innerHTML = be.ea().get("FEED_TIMEOUT_MESSAGE") || ""),
            null != s.parentNode &&
              (s.parentNode.appendChild(e), s.parentNode.removeChild(s));
        }
        "true" === t.getAttribute("aria-busy") &&
          t.setAttribute("aria-busy", "false");
      }
    }, fe.Ro),
    e.sr();
}
function Et(e, t, s) {
  const i = document.createElement("div");
  (i.className = "ab-feed ab-hide ab-effect-slide"),
    i.setAttribute("role", "dialog"),
    i.setAttribute("aria-label", "Feed"),
    i.setAttribute("tabindex", "-1");
  const a = document.createElement("div");
  (a.className = "ab-feed-buttons-wrapper"),
    a.setAttribute("role", "group"),
    i.appendChild(a);
  const r = document.createElement("i");
  (r.className = "fa fa-times ab-close-button"),
    r.setAttribute("aria-label", "Close Feed"),
    r.setAttribute("tabindex", "0"),
    r.setAttribute("role", "button");
  const n = (e) => {
    ht(i), e.stopPropagation();
  };
  r.addEventListener("keydown", (e) => {
    (e.keyCode !== x.Wo && e.keyCode !== x.Xo) || n(e);
  }),
    (r.onclick = n);
  const o = document.createElement("i");
  (o.className = "fa fa-refresh ab-refresh-button"),
    e && null == e.lastUpdated && (o.className += " fa-spin"),
    o.setAttribute("aria-label", "Refresh Feed"),
    o.setAttribute("tabindex", "0"),
    o.setAttribute("role", "button");
  const l = (t) => {
    gt(e, i), t.stopPropagation();
  };
  o.addEventListener("keydown", (e) => {
    (e.keyCode !== x.Wo && e.keyCode !== x.Xo) || l(e);
  }),
    (o.onclick = l),
    a.appendChild(o),
    a.appendChild(r),
    i.appendChild(ft(e, t));
  const d = () => mt(e, i);
  if ((i.addEventListener("scroll", d), !s)) {
    window.addEventListener("scroll", d);
    const e = A.ce();
    (Ee[e] = d), i.setAttribute("data-listener-id", e);
  }
  return i;
}
function xt(e, t, s, i, a) {
  if (!m(t)) return;
  const r = [];
  for (const n of t)
    if (n instanceof re) {
      if (n.url && B.test(n.url)) {
        const e = te(n.url);
        if (o(e)) {
          K.error(C(_.Mr, "Content Card"));
          continue;
        }
      }
      r.push(n);
    }
  if (((e.cards = r), (e.lastUpdated = s), null != i))
    if ((i.setAttribute("aria-busy", "false"), null == e.lastUpdated)) ht(i);
    else {
      const t = i.querySelectorAll(".ab-feed-body")[0];
      if (null != t) {
        const s = ft(e, a);
        t.parentNode && t.parentNode.replaceChild(s, t), mt(e, s.parentNode);
      }
    }
}
function St(e, t) {
  e && t.setAttribute("data-update-subscription-id", e);
}
function At() {
  return (At = e(() => {
    Qe(),
      nt(),
      k(),
      we(),
      ye(),
      M(),
      d(),
      Pe(),
      lt(),
      q(),
      a(),
      F(),
      l(),
      pt(),
      ae(),
      (ge = "data-last-requested-refresh"),
      (Ee = {});
  }))();
}
function wt() {
  return (wt = e(() => {
    Q(),
      Z(),
      yt(),
      tt(),
      b(),
      $(),
      P(),
      (xe = class extends j {
        constructor(e, t) {
          super(),
            (this.C = e),
            (this.Fi = t),
            (this.cards = []),
            (this.xi = null),
            (this.C = e),
            (this.Fi = t),
            (this.Ts = new E()),
            L.F(this.Ts),
            this.Ds();
        }
        Ds() {
          let e = [];
          this.C && (e = this.C.ft(O.gt.qi) || []);
          const t = [];
          for (let s = 0; s < e.length; s++) {
            const i = et(e[s]);
            null != i && t.push(i);
          }
          (this.cards = t), this.C && (this.xi = y(this.C.ft(O.gt.zi)));
        }
        Ui(e) {
          const t = [];
          let s = null,
            i = {};
          this.C && (i = this.C.ft(O.gt.Zt) || {});
          const a = {};
          for (let n = 0; n < e.length; n++) {
            s = e[n];
            const o = Ye(
              (r = s).id,
              r.type,
              r.viewed,
              r.title,
              r.image,
              r.description,
              N(r.created),
              N(r.updated),
              r.categories,
              N(r.expires_at),
              r.url,
              r.domain,
              r.aspect_ratio,
              r.extras,
              !1,
              !1
            );
            if (null != o) {
              const e = o.id;
              e && i[e] && ((o.viewed = !0), (a[e] = !0)), t.push(o);
            }
          }
          var r;
          (this.cards = t),
            this.Ws(),
            (this.xi = new Date()),
            this.C && (this.C.Bt(O.gt.Zt, a), this.C.Bt(O.gt.zi, this.xi));
        }
        Ws() {
          var e;
          const t = [];
          for (let s = 0; s < this.cards.length; s++)
            t.push(this.cards[s].bt());
          null === (e = this.C) || void 0 === e || e.Bt(O.gt.qi, t);
        }
        U(e) {
          null != e &&
            e.feed &&
            (this.Ds(),
            this.Ui(e.feed),
            this.Ts.X(new Ae(this.cards.slice(), this.xi)));
        }
        ki() {
          this.Ds();
          const e = [],
            t = new Date();
          for (let s = 0; s < this.cards.length; s++) {
            const i = this.cards[s].expiresAt;
            let a = !0;
            null != i && (a = i >= t), a && e.push(this.cards[s]);
          }
          return new Ae(e, this.xi);
        }
        bi() {
          this.Fi && this.Fi.requestFeedRefresh();
        }
        qt(e) {
          return this.Ts.Dt(e);
        }
        clearData(e) {
          (e ??= !1),
            (this.cards = []),
            (this.xi = null),
            e && this.C && (this.C.Ut(O.gt.qi), this.C.Ut(O.gt.zi)),
            this.Ts.X(new Ae(this.cards.slice(), this.xi));
        }
      });
  }))();
}
function vt() {
  return (vt = e(() => {
    Z(),
      wt(),
      (Se = {
        l: !1,
        provider: null,
        m: () => (
          Se.p(),
          Se.provider ||
            ((Se.provider = new xe(L.j(), L.rn())), L._(Se.provider)),
          Se.provider
        ),
        p: () => {
          Se.l || (L.h(Se), (Se.l = !0));
        },
        destroy: () => {
          (Se.provider = null), (Se.l = !1);
        },
      });
  }))();
}
function _t() {
  if (L.rr()) return Se.m().bi();
}
function Ct() {
  return (Ct = e(() => {
    Z(), vt();
  }))();
}
function yt() {
  return (yt = e(() => {
    Qe(),
      He(),
      Ke(),
      Ct(),
      (Ae = class extends fe {
        constructor(e, t) {
          super(e, t);
        }
        logCardImpressions(e) {
          Ze(e, !1);
        }
        logCardClick(e) {
          return Ve(e, !1);
        }
        sr() {
          _t();
        }
        nr() {
          return !1;
        }
      });
  }))();
}
function kt() {
  var e;
  if (L.rr())
    return null === (e = L.g()) || void 0 === e ? void 0 : e.zr(J.Fr).tt;
}
function Nt() {
  return (Nt = e(() => {
    Z(), H();
  }))();
}
var Mt = t({ showFeed: () => Tt });
function Tt(e, t, s) {
  if (!L.rr()) return;
  ze();
  const i = (e, t) => {
      if (null == t) return e;
      const s = [];
      for (let a = 0; a < t.length; a++) s.push(t[a].toLowerCase());
      const i = [];
      for (let a = 0; a < e.length; a++) {
        const t = [],
          r = e[a].categories || [];
        for (let e = 0; e < r.length; e++) t.push(r[e].toLowerCase());
        c(t, s).length > 0 && i.push(e[a]);
      }
      return i;
    },
    a = L.ee(D.tn) || L.ee(D.en) || !1;
  let r = !1;
  e ?? ((e = document.body), (r = !0));
  let n,
    o = !1;
  null == t
    ? ((n = Se.m().ki()),
      xt(n, i(n.cards, s), n.lastUpdated, null, a),
      (o = !0))
    : (n = new Ae(i(t, s), new Date()));
  const l = Et(n, a, r);
  if (o) {
    (null == n.lastUpdated ||
      new Date().valueOf() - n.lastUpdated.valueOf() > Ae.dr) &&
      (K.info(
        `Cached feed was older than max TTL of ${Ae.dr} ms, requesting an update from the server.`
      ),
      gt(n, l));
    const e = new Date().valueOf(),
      t = Dt(function (t) {
        const r = l.querySelectorAll(".ab-refresh-button")[0];
        if (null != r) {
          let t = 500;
          t -= new Date().valueOf() - e;
          const s = l.getAttribute(ge);
          if (s) {
            const e = parseInt(s);
            isNaN(e) || (t -= new Date().valueOf() - e);
          }
          setTimeout(function () {
            r.className = r.className.replace(/fa-spin/g, "");
          }, Math.max(t, 0));
        }
        xt(n, i(t.cards, s), t.lastUpdated, l, a);
      });
    St(t, l);
  }
  const d = (e) => {
    const t = e.querySelectorAll(".ab-feed");
    let s = null;
    for (let i = 0; i < t.length; i++) t[i].parentNode === e && (s = t[i]);
    null != s
      ? (ht(s), s.parentNode && s.parentNode.replaceChild(l, s))
      : e.appendChild(l),
      setTimeout(function () {
        l.className = l.className.replace("ab-hide", "ab-show");
      }, 0),
      r && l.focus(),
      kt(),
      mt(n, l),
      n && at(n.cards, e);
  };
  var u;
  null != e
    ? d(e)
    : (window.onload =
        ((u = window.onload),
        function () {
          "function" == typeof u && u(new Event("oldLoad")), d(document.body);
        }));
}
function zt() {
  return (zt = e(() => {
    Z(), At(), yt(), Nt(), Ot(), vt(), M(), nt(), De(), q();
  }))();
}
function Dt(e) {
  if (L.rr()) return Se.m().qt(e);
}
function Ot() {
  return (Ot = e(() => {
    Z(), vt();
  }))();
}
export {
  Me as $,
  tt as A,
  Ve as B,
  bt as C,
  ot as D,
  lt as E,
  Ke as F,
  Le as G,
  Pe as H,
  Ze as I,
  Oe as J,
  Ge as K,
  We as L,
  et as M,
  Qe as N,
  nt as O,
  fe as P,
  Te as Q,
  $e as R,
  me as S,
  pt as T,
  Ie as U,
  be as V,
  Fe as W,
  De as X,
  Ue as Y,
  ze as Z,
  Et as _,
  Mt as a,
  Ce as at,
  St as b,
  Ae as c,
  ne as ct,
  _t as d,
  we as dt,
  ke as et,
  Se as f,
  mt as g,
  ht as h,
  Tt as i,
  le as it,
  Je as j,
  at as k,
  yt as l,
  ve as lt,
  ge as m,
  Dt as n,
  de as nt,
  Nt as o,
  oe as ot,
  vt as p,
  Re as q,
  zt as r,
  ye as rt,
  kt as s,
  _e as st,
  Ot as t,
  Ne as tt,
  Ct as u,
  re as ut,
  At as v,
  ct as w,
  xt as x,
  gt as y,
  He as z,
};
//# sourceMappingURL=subscribe-to-feed-updates-CFq_0oM2.js.map
