import webpush from "web-push";
import prisma from "../../utils/prisma";
import { Rola } from "../../generated/prisma/client";
import logger from "../../utils/logger";

// Klucze VAPID czytamy bezpośrednio ze środowiska (poza walidowanym config),
// żeby brak konfiguracji nie blokował startu — push jest funkcją opcjonalną.
const PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:admin@roadwatch.local";

let enabled = false;
if (PUBLIC_KEY && PRIVATE_KEY) {
  webpush.setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY);
  enabled = true;
} else {
  logger.warn(
    "Web Push wyłączony — brak VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY w env.",
  );
}

export const isPushEnabled = () => enabled;
export const getPublicKey = () => PUBLIC_KEY ?? null;

export interface BrowserSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export const saveSubscription = (userId: number, sub: BrowserSubscription) =>
  prisma.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    create: {
      userId,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
    },
    update: { userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
  });

export const removeSubscription = (endpoint: string) =>
  prisma.pushSubscription.deleteMany({ where: { endpoint } });

interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

// Wysyłka best-effort do wszystkich subskrypcji podanych użytkowników.
// Wygasłe subskrypcje (404/410) są usuwane. Błędy nie przerywają żądania.
const sendToUsers = async (userIds: number[], payload: PushPayload) => {
  if (!enabled || userIds.length === 0) return;

  const subs = await prisma.pushSubscription.findMany({
    where: { userId: { in: userIds } },
  });

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription
            .deleteMany({ where: { endpoint: s.endpoint } })
            .catch(() => {});
        } else {
          logger.error(`Web Push send error: ${String(err)}`);
        }
      }
    }),
  );
};

// Powiadom właściciela zgłoszenia o zmianie statusu (jeśli zgłoszenie ma konto).
export const notifyStatusChange = async (
  userId: number | null,
  zgloszenieId: number,
  status: string,
) => {
  if (userId === null) return;
  await sendToUsers([userId], {
    title: "Zmiana statusu zgłoszenia",
    body: `Zgłoszenie #${zgloszenieId} ma teraz status: ${status}.`,
    url: "/moje-zgloszenia",
  });
};

// Powiadom urzędników danej gminy o nowym zgłoszeniu.
export const notifyNewReport = async (
  gminaId: number,
  zgloszenieId: number,
  title: string,
) => {
  if (!enabled) return;
  const urzednicy = await prisma.user.findMany({
    where: { role: Rola.URZEDNIK, urzednikGminaId: gminaId },
    select: { id: true },
  });
  await sendToUsers(
    urzednicy.map((u) => u.id),
    {
      title: "Nowe zgłoszenie w Twojej gminie",
      body: `#${zgloszenieId}: ${title}`,
      url: "/urzednik",
    },
  );
};
