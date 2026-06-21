import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// PWA tylko na urządzeniach mobilnych. Na PC chcemy zwykłą stronę — bez
// service workera i cache'owania (które potrafi serwować stary bundle).
const isMobile =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  ) ||
  // iPadOS podaje się za "Macintosh" — rozpoznajemy po dotyku.
  (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));

if (isMobile) {
  // Rejestracja service workera (PWA, instalowalność, cache kafelków).
  import("virtual:pwa-register").then(({ registerSW }) =>
    registerSW({ immediate: true }),
  );
} else if ("serviceWorker" in navigator) {
  // PC: wyrejestruj SW aplikacji (PWA, scope "/") z wcześniejszej wizyty i
  // wyczyść cache, żeby nie serwował przestarzałej wersji. UWAGA: zachowujemy
  // dedykowany SW powiadomień push (scope ".../push/").
  navigator.serviceWorker.getRegistrations().then((regs) =>
    regs.forEach((r) => {
      if (!r.scope.endsWith("/push/")) r.unregister();
    }),
  );
  if (window.caches) {
    caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
  }
}
