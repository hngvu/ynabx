import { n as t, r as n } from "./rolldown-runtime-DEpHKc_W.js";
import {
  Ft as e,
  c as r,
  en as s,
  ht as o,
  i as a,
  in as i,
  l as u,
  n as v,
  nn as m,
  r as f,
  rn as g,
  t as l,
  v as c,
  vt as p,
  y as C,
  yt as E,
  zt as $,
} from "./event-logger-XYs2EL_9.js";
var d = n({ logCustomEvent: () => h });
function h(t, n) {
  if (!a.rr()) return !1;
  if (null == t || t.length <= 0)
    return (
      g.error(
        `logCustomEvent requires a non-empty eventName, got "${t}". Ignoring event.`
      ),
      !1
    );
  if (!E(t, "log custom event", "the event name")) return !1;
  const [o, i] = p(n, e, "eventProperties", `log custom event "${t}"`, "event");
  if (!o) return !1;
  const u = a.v();
  if (u && u.je(t))
    return g.info(`Custom Event "${t}" is blocklisted, ignoring.`), !1;
  const v = l.ut(s.CustomEvent, { n: t, p: i });
  if (v.tt) {
    g.info(`Logged custom event "${t}".`);
    for (const e of v.$e) r.m().Ce(C.Ee, [t, n], e);
  }
  return v.tt;
}
function j() {
  return (j = t(() => {
    f(), v(), i(), m(), c(), u(), o(), $();
  }))();
}
export { h as n, d as r, j as t };
//# sourceMappingURL=log-custom-event-z0eMsFQ_.js.map
