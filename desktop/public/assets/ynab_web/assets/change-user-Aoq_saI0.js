import { n as r, r as e } from "./rolldown-runtime-DEpHKc_W.js";
import {
  Dt as n,
  Ot as s,
  bt as t,
  ft as a,
  ht as i,
  i as o,
  in as u,
  pt as f,
  r as g,
  rn as l,
} from "./event-logger-XYs2EL_9.js";
var c = e({ changeUser: () => d });
function d(r, e) {
  if (!o.rr()) return;
  if (null == r || 0 === r.length || r != r)
    return void l.error("changeUser requires a non-empty userId.");
  if (n(r) > a.ur)
    return void l.error(
      `Rejected user id "${r}" because it is longer than ${a.ur} bytes.`
    );
  if (null != e && !t(e, "set signature for new user", "signature")) return;
  const s = o.rn();
  s && s.changeUser(r.toString(), o.ar(), e);
}
function h() {
  return (h = r(() => {
    g(), s(), u(), f(), i();
  }))();
}
export { c as n, h as r, d as t };
//# sourceMappingURL=change-user-Aoq_saI0.js.map
