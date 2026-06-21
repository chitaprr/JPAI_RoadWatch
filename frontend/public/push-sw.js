/* Dedykowany service worker tylko do Web Push. Rejestrowany ze scope "/push/",
   żeby nie kolidował z service workerem PWA (który kontroluje "/"). Odbiera
   zdarzenia push niezależnie od scope i pokazuje powiadomienie. */

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
