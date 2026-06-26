import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { CacheFirst } from "workbox-strategies";
import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { ExpirationPlugin } from "workbox-expiration";
import { clientsClaim } from "workbox-core";

self.skipWaiting();
clientsClaim();

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// SPA — wszystkie nawigacje serwuj z cache'owanego index.html.
registerRoute(new NavigationRoute(createHandlerBoundToURL("index.html")));

// Runtime cache kafelków OSM.
registerRoute(
  /^https:\/\/[a-c]\.tile\.openstreetmap\.org\/.*/i,
  new CacheFirst({
    cacheName: "osm-tiles",
    plugins: [
      new ExpirationPlugin({ maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 14 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
);

// Obsługa zdarzeń push — wymagane, żeby iOS (scope "/") dostarczał powiadomienia.
// Ikony SVG są celowo pominięte — iOS cicho odrzuca showNotification() z SVG.
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
