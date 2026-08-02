// ONESELF 対応コンソール Service Worker（Web Push + PWA + アイコンバッジ）
self.addEventListener("install", function () { self.skipWaiting(); });
self.addEventListener("activate", function (e) { e.waitUntil(self.clients.claim()); });

// --- 未読カウンタの永続化（IndexedDB）。閉室中にプッシュが来た数を数えてアイコンに出す ---
function idbOpen_() {
  return new Promise(function (res, rej) {
    var r = indexedDB.open("oneself-badge", 1);
    r.onupgradeneeded = function () { r.result.createObjectStore("kv"); };
    r.onsuccess = function () { res(r.result); };
    r.onerror = function () { rej(r.error); };
  });
}
function idbGet_() {
  return idbOpen_().then(function (db) {
    return new Promise(function (res) {
      var t = db.transaction("kv", "readonly").objectStore("kv").get("count");
      t.onsuccess = function () { res(t.result || 0); };
      t.onerror = function () { res(0); };
    });
  }).catch(function () { return 0; });
}
function idbSet_(v) {
  return idbOpen_().then(function (db) {
    return new Promise(function (res) {
      var t = db.transaction("kv", "readwrite").objectStore("kv").put(v, "count");
      t.onsuccess = function () { res(); };
      t.onerror = function () { res(); };
    });
  }).catch(function () {});
}
function setBadge_(n) {
  try {
    if (self.navigator && self.navigator.setAppBadge) {
      if (n > 0) return self.navigator.setAppBadge(n);
      if (self.navigator.clearAppBadge) return self.navigator.clearAppBadge();
    }
  } catch (e) {}
  return Promise.resolve();
}

self.addEventListener("push", function (event) {
  var title = "ONESELF 新しいお問い合わせ";
  var body = "新しいチャットがあります。コンソールを開いて対応してください。";
  try { if (event.data) { var d = event.data.json(); if (d && d.title) title = d.title; if (d && d.body) body = d.body; } } catch (e) {}
  event.waitUntil(
    // コンソールを開いて見ている（可視）ならページ側がバッジを管理するので加算しない
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (cs) {
      var visible = cs.some(function (c) { return c.visibilityState === "visible"; });
      var badgeStep = visible ? Promise.resolve() : idbGet_().then(function (n) {
        var next = (n || 0) + 1;
        return idbSet_(next).then(function () { return setBadge_(next); });
      });
      return Promise.all([
        badgeStep,
        self.registration.showNotification(title, {
          body: body,
          tag: "oneself-chat",
          renotify: true,
          requireInteraction: true,
          icon: "/images/Gemini_Generated_Image_z4qijfz4qijfz4qi.png",
          badge: "/images/Gemini_Generated_Image_z4qijfz4qijfz4qi.png"
        })
      ]);
    })
  );
});

// ページ（コンソール）から実数が届いたらカウンタを同期・リセット
self.addEventListener("message", function (event) {
  var m = event.data || {};
  if (m.type === "resetBadge") {
    var n = (typeof m.count === "number") ? m.count : 0;
    event.waitUntil(idbSet_(n).then(function () { return setBadge_(n); }));
  }
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (cs) {
      for (var i = 0; i < cs.length; i++) {
        if (cs[i].url.indexOf("operator.html") !== -1) { return cs[i].focus(); }
      }
      return self.clients.openWindow("/operator.html");
    })
  );
});
