import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // Rejestrację SW wykonujemy ręcznie w main.jsx — tylko na urządzeniach
      // mobilnych. Na PC działa zwykła strona (bez service workera/cache).
      injectRegister: false,
      // injectManifest daje pełną kontrolę nad SW — precache + push handlery
      // w jednym pliku, bez importScripts, które może nie trafić do buildu.
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.js",
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
    }),
  ],
  server: {
    port: 3000,
  },
});
