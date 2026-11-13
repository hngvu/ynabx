(self.webpackChunkynab_api = self.webpackChunkynab_api || []).push([
  [887],
  {
    1651: function (e, n, t) {
      "use strict";
      var o = t(8421),
        i = t(2587),
        c = t(4781),
        a = t.n(c),
        s = (0, i.t)();
      (window.YNAB_CLIENT_CONSTANTS = s),
        (window.PRODUCTION = s.PRODUCTION),
        (0, o.nt)(s),
        (window.windowReload = function () {
          window.location.reload();
        }),
        (window.setLocationHref = function (e) {
          window.location.href = e;
        }),
        (window.openNewWindow = function (e) {
          var n = window.open(e, e);
          try {
            n.opener = null;
          } catch (t) {}
          return n;
        });
      var d = new (a())().get("themeClass");
      document.addEventListener("DOMContentLoaded", function () {
        d && document.body && document.body.classList.add(d);
      });
    },
    9840: function (e, n, t) {
      var o;
      (o =
        "undefined" !== typeof window
          ? window
          : "undefined" !== typeof t.g
          ? t.g
          : "undefined" !== typeof self
          ? self
          : {}),
        (e.exports = o);
    },
    4781: function (e, n, t) {
      e.exports = a;
      const o = t(9840),
        i = "undefined" !== typeof o && o.localStorage;
      let c = Object.create(null);
      function a(e) {
        if (!(this instanceof a)) return new a(e);
        this.namespace = e || "";
      }
      (a.default = a),
        (a.prototype.get = function (e) {
          let n;
          e = this.namespace + "." + e;
          try {
            n = i.getItem(e);
          } catch (t) {
            n = c[e];
          }
          return null === n || "undefined" === typeof n ? null : JSON.parse(n);
        }),
        (a.prototype.set = function (e, n) {
          if (
            null !== e &&
            "undefined" !== typeof e &&
            null !== n &&
            "undefined" !== typeof n
          ) {
            (e = this.namespace + "." + e), (n = JSON.stringify(n)), (c[e] = n);
            try {
              i.setItem(e, n);
            } catch (t) {}
          }
        }),
        (a.prototype.delete = function (e) {
          (e = this.namespace + "." + e), delete c[e];
          try {
            return i.removeItem(e);
          } catch (n) {}
        }),
        (a.prototype.clear = function () {
          const e = Object.keys(c);
          for (let n = 0; n < e.length; n++) {
            const t = e[n];
            t.slice(0, this.namespace.length + 1) === this.namespace + "." &&
              this.delete(t.slice(this.namespace.length + 1));
          }
        }),
        (a.clear = function () {
          c = Object.create(null);
          try {
            i.clear();
          } catch (e) {}
        });
    },
  },
  function (e) {
    e.O(0, [418, 956, 421], function () {
      return (n = 1651), e((e.s = n));
      var n;
    });
    e.O();
  },
]);
//# sourceMappingURL=before_ynab_web_head-20232f42ec631a339454.js.map
