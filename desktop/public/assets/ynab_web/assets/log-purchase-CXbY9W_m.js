import { n as r, r as e } from "./rolldown-runtime-DEpHKc_W.js";
import {
  c as n,
  en as t,
  ht as o,
  i as s,
  in as a,
  l as i,
  n as D,
  nn as u,
  r as P,
  rn as g,
  t as R,
  v as S,
  vt as c,
  y as N,
  yt as l,
  zt as K,
} from "./event-logger-XYs2EL_9.js";
var L = e({ logPurchase: () => M });
function M(r, e, o, a, i) {
  if (!s.rr()) return !1;
  if (((o ??= "USD"), (a ??= 1), null == r || r.length <= 0))
    return (
      g.error(
        `logPurchase requires a non-empty productId, got "${r}", ignoring.`
      ),
      !1
    );
  if (!l(r, "log purchase", "the purchase name")) return !1;
  if (null == e || isNaN(parseFloat(e.toString())))
    return (
      g.error(`logPurchase requires a numeric price, got ${e}, ignoring.`), !1
    );
  const D = parseFloat(e.toString()).toFixed(2);
  if (null == a || isNaN(parseInt(a.toString())))
    return (
      g.error(`logPurchase requires an integer quantity, got ${a}, ignoring.`),
      !1
    );
  const u = parseInt(a.toString());
  if (u < 1 || u > 100)
    return (
      g.error(
        `logPurchase requires a quantity >1 and <100, got ${u}, ignoring.`
      ),
      !1
    );
  if (
    ((o = null != o ? o.toUpperCase() : o),
    -1 ===
      [
        "AED",
        "AFN",
        "ALL",
        "AMD",
        "ANG",
        "AOA",
        "ARS",
        "AUD",
        "AWG",
        "AZN",
        "BAM",
        "BBD",
        "BDT",
        "BGN",
        "BHD",
        "BIF",
        "BMD",
        "BND",
        "BOB",
        "BRL",
        "BSD",
        "BTC",
        "BTN",
        "BWP",
        "BYR",
        "BZD",
        "CAD",
        "CDF",
        "CHF",
        "CLF",
        "CLP",
        "CNY",
        "COP",
        "CRC",
        "CUC",
        "CUP",
        "CVE",
        "CZK",
        "DJF",
        "DKK",
        "DOP",
        "DZD",
        "EEK",
        "EGP",
        "ERN",
        "ETB",
        "EUR",
        "FJD",
        "FKP",
        "GBP",
        "GEL",
        "GGP",
        "GHS",
        "GIP",
        "GMD",
        "GNF",
        "GTQ",
        "GYD",
        "HKD",
        "HNL",
        "HRK",
        "HTG",
        "HUF",
        "IDR",
        "ILS",
        "IMP",
        "INR",
        "IQD",
        "IRR",
        "ISK",
        "JEP",
        "JMD",
        "JOD",
        "JPY",
        "KES",
        "KGS",
        "KHR",
        "KMF",
        "KPW",
        "KRW",
        "KWD",
        "KYD",
        "KZT",
        "LAK",
        "LBP",
        "LKR",
        "LRD",
        "LSL",
        "LTL",
        "LVL",
        "LYD",
        "MAD",
        "MDL",
        "MGA",
        "MKD",
        "MMK",
        "MNT",
        "MOP",
        "MRO",
        "MTL",
        "MUR",
        "MVR",
        "MWK",
        "MXN",
        "MYR",
        "MZN",
        "NAD",
        "NGN",
        "NIO",
        "NOK",
        "NPR",
        "NZD",
        "OMR",
        "PAB",
        "PEN",
        "PGK",
        "PHP",
        "PKR",
        "PLN",
        "PYG",
        "QAR",
        "RON",
        "RSD",
        "RUB",
        "RWF",
        "SAR",
        "SBD",
        "SCR",
        "SDG",
        "SEK",
        "SGD",
        "SHP",
        "SLL",
        "SOS",
        "SRD",
        "STD",
        "SVC",
        "SYP",
        "SZL",
        "THB",
        "TJS",
        "TMT",
        "TND",
        "TOP",
        "TRY",
        "TTD",
        "TWD",
        "TZS",
        "UAH",
        "UGX",
        "USD",
        "UYU",
        "UZS",
        "VEF",
        "VND",
        "VUV",
        "WST",
        "XAF",
        "XAG",
        "XAU",
        "XCD",
        "XDR",
        "XOF",
        "XPD",
        "XPF",
        "XPT",
        "YER",
        "ZAR",
        "ZMK",
        "ZMW",
        "ZWL",
      ].indexOf(o))
  )
    return (
      g.error(`logPurchase requires a valid currencyCode, got ${o}, ignoring.`),
      !1
    );
  const [P, S] = c(
    i,
    "logPurchase",
    "purchaseProperties",
    `log purchase "${r}"`,
    "purchase"
  );
  if (!P) return !1;
  const K = s.v();
  if (K && K.Dr(r))
    return g.info(`Purchase "${r}" is blocklisted, ignoring.`), !1;
  const L = R.ut(t.Pr, { pid: r, c: o, p: D, q: u, pr: S });
  if (L.tt) {
    g.info(`Logged ${u} purchase${u > 1 ? "s" : ""} of "${r}" for ${o} ${D}.`);
    for (const e of L.$e) n.m().Ce(N.Rr, [r, i], e);
  }
  return L.tt;
}
function A() {
  return (A = r(() => {
    P(), K(), a(), u(), S(), i(), o(), D();
  }))();
}
export { M as n, L as r, A as t };
//# sourceMappingURL=log-purchase-CXbY9W_m.js.map
