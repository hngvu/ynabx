import { n as r, r as s } from "./rolldown-runtime-DEpHKc_W.js";
import { i as t, r as e } from "./event-logger-XYs2EL_9.js";
import { r as a, t as n } from "./push-manager-factory-CQp_9BCr.js";
var o = s({ requestPushPermission: () => i });
function i(r, s) {
  if (t.rr())
    return a.ea().subscribe((s, e, a) => {
      const n = t.rn();
      n && n.requestImmediateDataFlush(), "function" == typeof r && r(s, e, a);
    }, s);
}
function u() {
  return (u = r(() => {
    e(), n();
  }))();
}
export { i as n, o as r, u as t };
//# sourceMappingURL=request-push-permission-Bdo-70ZN.js.map
