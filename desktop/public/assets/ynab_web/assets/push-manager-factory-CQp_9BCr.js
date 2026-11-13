import { n as i, r as e } from "./rolldown-runtime-DEpHKc_W.js";
import {
  At as n,
  G as t,
  K as s,
  Kt as r,
  Wt as o,
  a,
  at as u,
  ft as c,
  i as h,
  in as f,
  kt as p,
  o as l,
  ot as d,
  pt as b,
  qt as y,
  r as g,
  rn as v,
  s as m,
} from "./event-logger-XYs2EL_9.js";
var w, P;
function k() {
  return (k = i(() => {
    w = {
      qn: function (i) {
        const e = (i + "=".repeat((4 - (i.length % 4)) % 4))
            .replace(/\-/g, "+")
            .replace(/_/g, "/"),
          n = atob(e),
          t = new Uint8Array(n.length);
        for (let s = 0; s < n.length; ++s) t[s] = n.charCodeAt(s);
        return t;
      },
    };
  }))();
}
function S() {
  return (S = i(() => {
    o(),
      l(),
      f(),
      k(),
      d(),
      b(),
      t(),
      n(),
      (P = class i {
        constructor(i, e, n, t, r, o, a, u, c, h, f) {
          (this.un = i),
            (this.an = e),
            (this.hn = n),
            (this.cn = r),
            (this.fn = o),
            (this.ln = a),
            (this.B = u),
            (this.dn = c),
            (this.pn = h),
            (this.C = f),
            (this.un = i),
            (this.an = e),
            (this.hn = n),
            (this.bn = t + "/safari/" + e),
            (this.cn = r || "/service-worker.js"),
            (this.ln = a),
            (this.B = u),
            (this.dn = c || !1),
            (this.pn = h || !1),
            (this.C = f),
            (this.yn = s.mn()),
            (this.gn = s.vn());
        }
        wn() {
          return this.pn;
        }
        kn(i, e, n, t, s) {
          i.unsubscribe()
            .then((i) => {
              i
                ? this.Pn(e, n, t, s)
                : (v.error("Failed to unsubscribe device from push."),
                  "function" == typeof s && s(!1));
            })
            .catch((i) => {
              v.error("Push unsubscription error: " + i),
                "function" == typeof s && s(!1);
            });
        }
        Dn(i, e, n) {
          var t;
          const s = ((i) => {
            if ("string" == typeof i) return i;
            if (
              0 !==
              i.endpoint.indexOf("https://android.googleapis.com/gcm/send")
            )
              return i.endpoint;
            let e = i.endpoint;
            const n = i;
            return (
              n.Sn &&
                -1 === i.endpoint.indexOf(n.Sn) &&
                (e = i.endpoint + "/" + n.Sn),
              e
            );
          })(i);
          let r = null,
            o = null;
          const a = i;
          if (null != a.getKey)
            try {
              const i = Array.from(new Uint8Array(a.getKey("p256dh"))),
                e = Array.from(new Uint8Array(a.getKey("auth")));
              (r = btoa(String.fromCharCode.apply(null, i))),
                (o = btoa(String.fromCharCode.apply(null, e)));
            } catch (i) {
              v.error(p(i));
            }
          const u = ((i) => {
            let e;
            return i.options &&
              (e = i.options.applicationServerKey) &&
              e.byteLength &&
              e.byteLength > 0
              ? btoa(
                  String.fromCharCode.apply(null, Array.from(new Uint8Array(e)))
                )
                  .replace(/\+/g, "-")
                  .replace(/\//g, "_")
              : null;
          })(a);
          null === (t = this.un) || void 0 === t || t.An(s, e, r, o, u),
            s && "function" == typeof n && n(s, r, o);
        }
        jn() {
          var i;
          null === (i = this.un) || void 0 === i || i.xn(!0);
        }
        Nn(i, e) {
          var n;
          null === (n = this.un) || void 0 === n || n.xn(!1),
            v.info(i),
            "function" == typeof e && e(!1);
        }
        Un(i, e, n, t) {
          var s;
          if ("default" === e.permission)
            try {
              window.safari.pushNotification.requestPermission(
                this.bn,
                i,
                {
                  api_key: this.an,
                  device_id:
                    (null === (s = this.hn) || void 0 === s
                      ? void 0
                      : s.ve().id) || "",
                },
                (e) => {
                  "granted" === e.permission &&
                    this.un &&
                    this.un.setPushNotificationSubscriptionType(
                      c.NotificationSubscriptionTypes.OPTED_IN
                    ),
                    this.Un(i, e, n, t);
                }
              );
            } catch (i) {
              this.Nn("Could not request permission for push: " + i, t);
            }
          else
            "denied" === e.permission
              ? this.Nn(
                  "The user has blocked notifications from this site, or Safari push is not configured in the Braze dashboard.",
                  t
                )
              : "granted" === e.permission &&
                (v.info("Device successfully subscribed to push."),
                this.Dn(e.deviceToken, new Date(), n));
        }
        requestPermission(i, e, n) {
          const t = (t) => {
            switch (t) {
              case "granted":
                return void ("function" == typeof i && i());
              case "default":
                return void ("function" == typeof e && e());
              case "denied":
                return void ("function" == typeof n && n());
              default:
                v.error("Received unexpected permission result " + t);
            }
          };
          let s = !1;
          if ("default" !== window.Notification.permission)
            t(Notification.permission);
          else {
            const i = window.Notification.requestPermission((i) => {
              s && t(i);
            });
            i
              ? i.then((i) => {
                  t(i);
                })
              : (s = !0);
          }
        }
        Pn(i, e, n, t) {
          const r = { userVisibleOnly: !0 };
          null != e && (r.applicationServerKey = e),
            i.pushManager
              .subscribe(r)
              .then((i) => {
                v.info("Device successfully subscribed to push."),
                  this.Dn(i, new Date(), n);
              })
              .catch((i) => {
                s.isPushBlocked()
                  ? (v.info("Permission for push notifications was denied."),
                    "function" == typeof t && t(!1))
                  : (v.error("Push subscription failed: " + i),
                    "function" == typeof t && t(!0));
              });
        }
        Wn() {
          if (this.dn) return navigator.serviceWorker.getRegistration(this.cn);
          const i = this.fn ? { scope: this.fn } : void 0;
          return navigator.serviceWorker.register(this.cn, i).then(() =>
            navigator.serviceWorker.ready.then(
              (i) => (
                i &&
                  "function" == typeof i.update &&
                  i.update().catch((i) => {
                    v.info("ServiceWorker update failed: " + i);
                  }),
                i
              )
            )
          );
        }
        _n(i) {
          this.dn ||
            (i.unregister(),
            v.info("Service worker successfully unregistered."));
        }
        subscribe(e, n) {
          if (!s.isPushSupported())
            return v.info(i.Tn), void ("function" == typeof n && n(!1));
          if (this.yn) {
            if (!this.dn && null != window.location) {
              let i = this.cn;
              -1 === i.indexOf(window.location.host) &&
                (i = window.location.host + i),
                -1 === i.indexOf(window.location.protocol) &&
                  (i = window.location.protocol + "//" + i);
            }
            if (s.isPushBlocked())
              return void this.Nn(
                "Notifications from this site are blocked. This may be a temporary embargo or a permanent denial.",
                n
              );
            if (this.B && !this.B.In() && 0 === this.B.Et())
              return (
                v.info(
                  "Waiting for VAPID key from server config before subscribing to push."
                ),
                void this.B.Vn(() => {
                  this.subscribe(e, n);
                })
              );
            const i = () => {
                v.info("Permission for push notifications was denied."),
                  "function" == typeof n && n(!1);
              },
              t = () => {
                let i = "Permission for push notifications was ignored.";
                s.isPushBlocked() &&
                  (i +=
                    " The browser has automatically blocked further permission requests for a period (probably 1 week)."),
                  v.info(i),
                  "function" == typeof n && n(!0);
              },
              o = s.isPushPermissionGranted(),
              a = () => {
                !o &&
                  this.un &&
                  this.un.setPushNotificationSubscriptionType(
                    c.NotificationSubscriptionTypes.OPTED_IN
                  ),
                  this.Wn()
                    .then((i) => {
                      if (null == i)
                        return (
                          v.error(
                            "No service worker registration. Set the `manageServiceWorkerExternally` initialization option to false or ensure that your service worker is registered before calling registerPush."
                          ),
                          void ("function" == typeof n && n(!0))
                        );
                      i.pushManager
                        .getSubscription()
                        .then((t) => {
                          var s;
                          let o = null;
                          if (
                            (null !=
                              (null === (s = this.B) || void 0 === s
                                ? void 0
                                : s.In()) && (o = w.qn(this.B.In())),
                            t)
                          ) {
                            let s,
                              a = null,
                              c = null;
                            if (
                              (this.C && (s = this.C.ft(u.gt.zn)), s && !r(s))
                            ) {
                              let i;
                              try {
                                i = m.Rn(s).En;
                              } catch (n) {
                                i = null;
                              }
                              null == i ||
                                isNaN(i.getTime()) ||
                                0 === i.getTime() ||
                                ((a = i),
                                (c = new Date(a)),
                                c.setMonth(a.getMonth() + 6));
                            }
                            null != o &&
                            t.options &&
                            t.options.applicationServerKey &&
                            t.options.applicationServerKey.byteLength &&
                            t.options.applicationServerKey.byteLength > 0 &&
                            !y(
                              o,
                              new Uint8Array(t.options.applicationServerKey)
                            )
                              ? (t.options.applicationServerKey.byteLength > 12
                                  ? v.info(
                                      "Device was already subscribed to push using a different VAPID provider, creating new subscription."
                                    )
                                  : v.info(
                                      "Attempting to upgrade a gcm_sender_id-based push registration to VAPID - depending on the browser this may or may not result in the same gcm_sender_id-based subscription."
                                    ),
                                this.kn(t, i, o, e, n))
                              : t.expirationTime &&
                                new Date(t.expirationTime).valueOf() <=
                                  new Date().valueOf()
                              ? (v.info(
                                  "Push subscription is expired, creating new subscription."
                                ),
                                this.kn(t, i, o, e, n))
                              : s && r(s)
                              ? this.kn(t, i, o, e, n)
                              : null == c
                              ? (v.info(
                                  "No push subscription creation date found, creating new subscription."
                                ),
                                this.kn(t, i, o, e, n))
                              : c.valueOf() <= new Date().valueOf()
                              ? (v.info(
                                  "Push subscription older than 6 months, creating new subscription."
                                ),
                                this.kn(t, i, o, e, n))
                              : (v.info(
                                  "Device already subscribed to push, sending existing subscription to backend."
                                ),
                                this.Dn(t, a, e));
                          } else this.Pn(i, o, e, n);
                        })
                        .catch((i) => {
                          v.error(
                            "Error checking current push subscriptions: " + i
                          );
                        });
                    })
                    .catch((i) => {
                      v.error("ServiceWorker registration failed: " + i);
                    });
              };
            this.requestPermission(a, t, i);
          } else if (this.gn) {
            if (null == this.ln || "" === this.ln)
              return (
                v.error(
                  "You must supply the safariWebsitePushId initialization option in order to use registerPush on Safari"
                ),
                void ("function" == typeof n && n(!0))
              );
            const i = window.safari.pushNotification.permission(this.ln);
            this.Un(this.ln, i, e, n);
          }
        }
        unsubscribe(e, n) {
          if (!s.isPushSupported())
            return v.info(i.Tn), void ("function" == typeof n && n());
          this.yn
            ? navigator.serviceWorker.getRegistration(this.cn).then((i) => {
                i
                  ? i.pushManager
                      .getSubscription()
                      .then((t) => {
                        t
                          ? (this.jn(),
                            t
                              .unsubscribe()
                              .then((t) => {
                                t
                                  ? (v.info(
                                      "Device successfully unsubscribed from push."
                                    ),
                                    "function" == typeof e && e())
                                  : (v.error(
                                      "Failed to unsubscribe device from push."
                                    ),
                                    "function" == typeof n && n()),
                                  this._n(i);
                              })
                              .catch((i) => {
                                v.error("Push unsubscription error: " + i),
                                  "function" == typeof n && n();
                              }))
                          : (v.info("Device already unsubscribed from push."),
                            "function" == typeof e && e());
                      })
                      .catch((i) => {
                        v.error("Error unsubscribing from push: " + i),
                          "function" == typeof n && n();
                      })
                  : (v.info("Device already unsubscribed from push."),
                    "function" == typeof e && e());
              })
            : this.gn &&
              (this.jn(),
              v.info("Device unsubscribed from push."),
              "function" == typeof e && e());
        }
      }),
      (P.Tn = "Push notifications are not supported in this browser.");
  }))();
}
var D,
  N = e({ default: () => D });
function T() {
  return (T = i(() => {
    g(),
      S(),
      (D = {
        l: !1,
        aa: null,
        ea: () => (
          D.p(),
          D.aa ||
            (D.aa = new P(
              h.mr(),
              h.Ma(),
              h.ue(),
              h.Z(),
              h.ee(a._a),
              h.ee(a.Aa),
              h.ee(a.Ba),
              h.v(),
              h.ee(a.Ca),
              h.ee(a.Da),
              h.j()
            )),
          D.aa
        ),
        p: () => {
          D.l || (h.h(D), (D.l = !0));
        },
        destroy: () => {
          (D.aa = null), (D.l = !1);
        },
      });
  }))();
}
export { N as n, D as r, T as t };
//# sourceMappingURL=push-manager-factory-CQp_9BCr.js.map
