// Obsługa Web Push po stronie klienta: rejestracja dedykowanego service workera,
// subskrypcja w przeglądarce i zapis subskrypcji na backendzie.
import api from "./api";
import { getToken } from "./auth";

const SW_URL = "/push-sw.js";
const SW_SCOPE = "/push/";

const supported = () =>
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

// VAPID public key (base64url) -> Uint8Array wymagany przez pushManager.subscribe.
const urlBase64ToUint8Array = (base64String) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) arr[i] = raw.charCodeAt(i);
  return arr;
};

const getRegistration = () =>
  navigator.serviceWorker.register(SW_URL, { scope: SW_SCOPE });

// Pobiera istniejącą subskrypcję lub tworzy nową, po czym zapisuje ją na serwerze.
const subscribeAndSave = async (publicKey) => {
  const reg = await getRegistration();
  const existing = await reg.pushManager.getSubscription();
  const sub =
    existing ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }));
  await api.post("/push/subscribe", sub.toJSON());
};

// Włączenie powiadomień na żądanie użytkownika (przycisk). Pyta o zgodę.
export const subscribeToPush = async () => {
  if (!supported())
    return { ok: false, msg: "Ta przeglądarka nie wspiera powiadomień push." };

  const permission = await Notification.requestPermission();
  if (permission !== "granted")
    return { ok: false, msg: "Nie udzielono zgody na powiadomienia." };

  const { data } = await api.get("/push/public-key");
  if (!data.enabled || !data.publicKey)
    return { ok: false, msg: "Powiadomienia push są wyłączone na serwerze." };

  try {
    await subscribeAndSave(data.publicKey);
    return { ok: true, msg: "Powiadomienia włączone." };
  } catch {
    return { ok: false, msg: "Nie udało się włączyć powiadomień." };
  }
};

// Ciche dosubskrybowanie, gdy zgoda już jest udzielona (np. po zalogowaniu) —
// utrzymuje aktualną subskrypcję na serwerze. Błędy są ignorowane.
export const ensurePushSubscribed = async () => {
  if (!supported() || !getToken() || Notification.permission !== "granted")
    return;
  try {
    const { data } = await api.get("/push/public-key");
    if (!data.enabled || !data.publicKey) return;
    await subscribeAndSave(data.publicKey);
  } catch {
    // best-effort — brak push nie może psuć aplikacji
  }
};
