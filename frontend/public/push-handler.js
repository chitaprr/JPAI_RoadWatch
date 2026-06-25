/* Handlery zdarzeń push importowane przez główny SW PWA (scope "/").
   Wymagane przez iOS, który dostarcza zdarzenia push wyłącznie do SW
   kontrolującego zainstalowaną aplikację. Na pozostałych platformach
   obsługę przejmuje dedykowany push-sw.js (scope "/push/"). */

self.addEventListener("push", (event) => {
  let data;
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const title = data.title || "RoadWatch";
  const options = {
    body: data.body || "",
    icon: "/pwa-icon.svg",
    badge: "/pwa-icon.svg",
    data: { url: data.url || "/" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((wins) => {
        for (const w of wins) {
          if (w.url.includes(target) && "focus" in w) return w.focus();
        }
        if (self.clients.openWindow) return self.clients.openWindow(target);
      }),
  );
});
