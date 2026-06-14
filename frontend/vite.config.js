import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // SW działa tylko w buildzie produkcyjnym (nie zaśmieca dev cache'em).
      includeAssets: ["pwa-icon.svg"],
      manifest: {
        name: "RoadWatch — Monitoring Infrastruktury Drogowej",
        short_name: "RoadWatch",
        description: "Zgłaszanie i monitorowanie usterek infrastruktury drogowej.",
        lang: "pl",
        theme_color: "#1f2937",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",
        scope: "/",
        // PLACEHOLDER: SVG wystarcza do instalacji w Chrome/Edge.
        // Docelowo dodaj PNG-i do public/ i odkomentuj wpisy poniżej
        // (iOS apple-touch-icon i sklepy wymagają PNG 192/512 + maskable).
        icons: [
          {
            src: "pwa-icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
          // { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          // { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          // { src: "maskable-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // App-shell jest precache'owany automatycznie. Tu tylko runtime cache
        // kafelków mapy OSM, żeby ponowne wejścia działały szybciej/offline.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/[a-c]\.tile\.openstreetmap\.org\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "osm-tiles",
              expiration: {
                maxEntries: 300,
                maxAgeSeconds: 60 * 60 * 24 * 14, // 14 dni
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 3000,
  },
});
