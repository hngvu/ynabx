import { n as e, r as t } from "./rolldown-runtime-DEpHKc_W.js";
import {
  $ as i,
  Mt as s,
  Q as r,
  X as n,
  Y as o,
  Z as h,
  at as u,
  et as a,
  i as l,
  in as f,
  it as d,
  jt as p,
  ot as g,
  r as c,
  rn as v,
  rt as y,
} from "./event-logger-XYs2EL_9.js";
var m, b, F;
function B() {
  return (B = e(() => {
    f(),
      (m = class e {
        constructor(e, t = !1, i = {}, s) {
          (this.id = e),
            (this.enabled = t),
            (this.properties = i),
            (this.trackingString = s),
            (this.id = e),
            (this.enabled = t),
            (this.properties = i),
            (this.trackingString = s);
        }
        he(e, t, i) {
          const s = this.properties[e];
          return null == s
            ? (this.ye(e), null)
            : t(s)
            ? s.value
            : (this.Pe(i), null);
        }
        getStringProperty(e) {
          return this.he(e, this.Ie, "string");
        }
        getNumberProperty(e) {
          return this.he(e, this.Te, "number");
        }
        getBooleanProperty(e) {
          return this.he(e, this.Ne, "boolean");
        }
        getImageProperty(e) {
          return this.he(e, this.Re, "image");
        }
        getJsonProperty(e) {
          return this.he(e, this.Se, "jsonobject");
        }
        getTimestampProperty(e) {
          return this.he(e, this.Ae, "datetime");
        }
        bt() {
          const t = {};
          return (
            (t[e.es.ds] = this.id),
            (t[e.es.Fe] = this.enabled),
            (t[e.es.we] = this.properties),
            (t[e.es.xe] = this.trackingString),
            t
          );
        }
        Pe(e) {
          v.info(`Property is not of type ${e}.`);
        }
        ye(e) {
          v.info(`${e} not found in feature flag properties.`);
        }
        Ie(e) {
          return "string" === e.type && "string" == typeof e.value;
        }
        Te(e) {
          return "number" === e.type && "number" == typeof e.value;
        }
        Ne(e) {
          return "boolean" === e.type && "boolean" == typeof e.value;
        }
        Re(e) {
          return "image" === e.type && "string" == typeof e.value;
        }
        Se(e) {
          return (
            "jsonobject" === e.type &&
            "object" == typeof e.value &&
            e.value.constructor == Object
          );
        }
        Ae(e) {
          return "datetime" === e.type && "number" == typeof e.value;
        }
      }),
      (m.es = { ds: "id", Fe: "e", we: "pr", xe: "fts" }),
      (m.ui = { ds: "id", Fe: "enabled", we: "properties", xe: "fts" });
  }))();
}
function w(e) {
  if (e[m.ui.ds] && "boolean" == typeof e[m.ui.Fe])
    return new m(e[m.ui.ds], e[m.ui.Fe], e[m.ui.we], e[m.ui.xe]);
  v.info(`Unable to create feature flag from ${JSON.stringify(e, null, 2)}`);
}
function S(e) {
  if (e[m.es.ds] && "boolean" == typeof e[m.es.Fe])
    return new m(e[m.es.ds], e[m.es.Fe], e[m.es.we], e[m.es.xe]);
  v.info(
    `Unable to deserialize feature flag from ${JSON.stringify(e, null, 2)}`
  );
}
function C() {
  return (C = e(() => {
    f(), B();
  }))();
}
function q() {
  return (q = e(() => {
    f(),
      y(),
      c(),
      g(),
      p(),
      o(),
      h(),
      C(),
      a(),
      (b = class extends d {
        constructor(e, t, i, r) {
          super(),
            (this.B = e),
            (this.S = t),
            (this.C = i),
            (this.T = r),
            (this.De = []),
            (this.qe = 0),
            (this.B = e),
            (this.S = t),
            (this.C = i),
            (this.T = r),
            (this.ze = null),
            (this.Ue = new s()),
            (this.R = 10),
            (this.I = null),
            (this.q = null),
            l.F(this.Ue);
        }
        U(e) {
          var t;
          if (
            (null === (t = this.B) || void 0 === t ? void 0 : t.ke()) &&
            null != e &&
            e.feature_flags
          ) {
            this.De = [];
            for (const t of e.feature_flags) {
              const e = w(t);
              e && this.De.push(e);
            }
            (this.qe = new Date().getTime()), this.Be(), this.Ue.X(this.De);
          }
        }
        Me() {
          let e = {};
          this.C && (e = this.C.ft(u.gt.Xe));
          const t = {};
          for (const i in e) {
            const s = S(e[i]);
            s && (t[s.id] = s);
          }
          return t;
        }
        _e() {
          var e;
          return (
            (null === (e = this.C) || void 0 === e ? void 0 : e.ft(u.gt.Ge)) ||
            {}
          );
        }
        He(e) {
          this.C && this.C.Bt(u.gt.Ge, e);
        }
        qt(e) {
          return this.Ue.Dt(e);
        }
        refreshFeatureFlags(e, t, s = !1, o = !0) {
          const h = () => {
            "function" == typeof t && t(), this.Ue.X(this.De);
          };
          if (!this.Je(s))
            return (
              !this.ze &&
                this.B &&
                (this.ze = this.B.Ke(() => {
                  this.refreshFeatureFlags(e, t);
                })),
              void h()
            );
          const u = this.S;
          if (!u) return void h();
          o && this.G();
          const a = u.H({}, !0),
            l = u.J(a, i.O.Le);
          let f = !1;
          u.V(
            a,
            (o = -1) => {
              const u = this.S;
              if (!u) return void h();
              const d = new Date().valueOf();
              i.W(this.C, i.O.Le, d),
                -1 !== o &&
                  l.push(["X-Braze-Req-Tokens-Remaining", o.toString()]),
                r.Y({
                  url: `${u.Z()}/feature_flags/sync`,
                  headers: l,
                  data: a,
                  tt: (t) => {
                    if (!u.st(a, t, l)) return (f = !0), void h();
                    u.it(), this.U(t), (f = !1), "function" == typeof e && e();
                  },
                  error: (e) => {
                    u.et(e, "retrieving feature flags"), (f = !0), h();
                  },
                  nt: (r, o) => {
                    let h;
                    if (f) {
                      let e = this.I;
                      (null == e || e < 1e3 * this.R) && (e = 1e3 * this.R),
                        (h = Math.min(3e5, n(1e3 * this.R, 3 * e)));
                    }
                    u.rt(
                      o,
                      () => {
                        this.refreshFeatureFlags(e, t, s, !0);
                      },
                      i.O.Le,
                      (e) => this.ot(e),
                      () => this.G(),
                      h
                    );
                  },
                });
            },
            i.O.Le,
            t
          );
        }
        G() {
          null != this.q && (clearTimeout(this.q), (this.q = null));
        }
        ot(e) {
          this.G(), (this.q = e);
        }
        Je(e) {
          if (!this.B) return !1;
          if (!e) {
            const e = this.B.Oe();
            if (null == e) return !1;
            let t = !1;
            if (!isNaN(e)) {
              if (-1 === e)
                return v.info("Feature flag refreshes not allowed"), !1;
              t = new Date().getTime() >= (this.qe || 0) + 1e3 * e;
            }
            if (!t)
              return (
                v.info(
                  `Feature flag refreshes were rate limited to ${e} seconds`
                ),
                !1
              );
          }
          return this.B.ke();
        }
        Qe() {
          var e;
          return (
            (null === (e = this.C) || void 0 === e ? void 0 : e.ft(u.gt.Ve)) ||
            null
          );
        }
        We() {
          var e, t;
          null === (e = this.C) ||
            void 0 === e ||
            e.Bt(
              u.gt.Ve,
              null === (t = this.T) || void 0 === t ? void 0 : t.St()
            );
        }
        Ye() {
          var e;
          const t = null === (e = this.T) || void 0 === e ? void 0 : e.St(),
            i = this.Qe();
          return null == i || t === i;
        }
        Be() {
          if (!this.C) return;
          const e = {};
          for (const t of this.De) {
            const i = t.bt();
            e[t.id] = i;
          }
          this.C.Bt(u.gt.Xe, e), this.C.Bt(u.gt.Ze, this.qe), this.We();
        }
        changeUser() {
          this.G();
        }
        clearData() {
          this.G();
        }
      });
  }))();
}
function D() {
  return (D = e(() => {
    c(),
      q(),
      (F = {
        l: !1,
        provider: null,
        m: () => (
          F.p(),
          F.provider ||
            ((F.provider = new b(l.v(), l.g(), l.j(), l.P())), l._(F.provider)),
          F.provider
        ),
        p: () => {
          F.l || (l.h(F), (F.l = !0));
        },
        destroy: () => {
          (F.provider = null), (F.l = !1);
        },
      });
  }))();
}
var T = t({ default: () => j });
function j(e, t, i = !1) {
  if (l.rr()) return F.m().refreshFeatureFlags(e, t, i);
}
function P(e, t) {
  j(e, t);
}
function U() {
  return (U = e(() => {
    c(), D();
  }))();
}
export { F as a, D as i, P as n, m as o, T as r, B as s, U as t };
//# sourceMappingURL=refresh-feature-flags-Bz6iwnyb.js.map
