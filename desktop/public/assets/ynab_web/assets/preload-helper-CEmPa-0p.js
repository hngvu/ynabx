import { n as e } from "./rolldown-runtime-DEpHKc_W.js";
var t,
  r,
  n,
  o = e(() => {
    (t = function (e) {
      return "/assets/ynab_web/" + e;
    }),
      (r = {}),
      (n = function (e, n) {
        let o = Promise.resolve();
        if (n && n.length > 0) {
          const e = document.getElementsByTagName("link"),
            a = document.querySelector("meta[property=csp-nonce]"),
            l = a?.nonce || a?.getAttribute("nonce");
          (s = n
            .map((n) => {
              var o;
              if (
                ((o = n = t(n)),
                (n = import.meta.resolve
                  ? import.meta.resolve(o)
                  : new URL(o, import.meta.url).href) in r)
              )
                return;
              r[n] = !0;
              const s = n.endsWith(".css");
              for (let t = e.length - 1; t >= 0; t--) {
                const r = e[t];
                if (r.href === n && (!s || "stylesheet" === r.rel)) return;
              }
              const a = document.createElement("link");
              return (
                (a.rel = s ? "stylesheet" : "modulepreload"),
                s || (a.as = "script"),
                (a.crossOrigin = ""),
                (a.href = n),
                l && a.setAttribute("nonce", l),
                document.head.appendChild(a),
                s
                  ? new Promise((e, t) => {
                      a.addEventListener("load", e),
                        a.addEventListener("error", () =>
                          t(new Error(`Unable to preload CSS for ${n}`))
                        );
                    })
                  : void 0
              );
            })
            .filter((e) => void 0 !== e)),
            (o = Promise.all(
              s.map((e) =>
                Promise.resolve(e).then(
                  (e) => ({ status: "fulfilled", value: e }),
                  (e) => ({ status: "rejected", reason: e })
                )
              )
            ));
        }
        var s;
        function a(e) {
          const t = new Event("vite:preloadError", { cancelable: !0 });
          if (((t.payload = e), window.dispatchEvent(t), !t.defaultPrevented))
            throw e;
        }
        return o.then((t) => {
          for (const e of t || []) "rejected" === e.status && a(e.reason);
          return e().catch(a);
        });
      });
  });
export { o as n, n as t };
