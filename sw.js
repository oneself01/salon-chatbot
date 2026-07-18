// ONESELF 対応コンソール Service Worker（Web Push + PWA）
self.addEventListener("install", function () { self.skipWaiting(); });
self.addEventListener("activate", function (e) { e.waitUntil(self.clients.claim()); });

self.addEventListener("push", function (event) {
  var title = "ONESELF 新しいお問い合わせ";
  var body = "新しいチャットがあります。コンソールを開いて対応してください。";
  try { if (event.data) { var d = event.data.json(); if (d && d.title) title = d.title; if (d && d.body) body = d.body; } } catch (e) {}
  event.waitUntil(self.registration.showNotification(title, {
    body: body,
    tag: "oneself-chat",
    renotify: true,
    requireInteraction: true,
    icon: "/images/Gemini_Generated_Image_z4qijfz4qijfz4qi.png",
    badge: "/images/Gemini_Generated_Image_z4qijfz4qijfz4qi.png"
  }));
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
