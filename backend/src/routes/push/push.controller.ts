import { Response } from "express";
import { z } from "zod";
import {
  SUCCESS,
  SERVER_ERROR,
  MISSING_BODY_FIELDS,
} from "../../utils/httpCodeResponses/messages";
import { AuthenticatedRequest } from "../../middlewares/authMiddleware";
import * as pushService from "./push.service";

// Subskrypcja z przeglądarki (PushSubscription.toJSON()).
export const subscribeSchema = z.object({
  endpoint: z.string().min(1),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export const unsubscribeSchema = z.object({
  endpoint: z.string().min(1),
});

// Publiczny klucz VAPID + informacja, czy push jest włączony na serwerze.
export const getPublicKey = (_req: AuthenticatedRequest, res: Response) =>
  SUCCESS(res, "Klucz publiczny push", {
    enabled: pushService.isPushEnabled(),
    publicKey: pushService.getPublicKey(),
  });

export const subscribe = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = subscribeSchema.safeParse(req.body);
    if (!parsed.success) return MISSING_BODY_FIELDS(res, parsed.error.issues);

    await pushService.saveSubscription(req.user!.userId, parsed.data);
    return SUCCESS(res, "Subskrypcja zapisana.");
  } catch {
    return SERVER_ERROR(res, "Nie udało się zapisać subskrypcji.");
  }
};

export const unsubscribe = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = unsubscribeSchema.safeParse(req.body);
    if (!parsed.success) return MISSING_BODY_FIELDS(res, parsed.error.issues);

    await pushService.removeSubscription(parsed.data.endpoint);
    return SUCCESS(res, "Subskrypcja usunięta.");
  } catch {
    return SERVER_ERROR(res, "Nie udało się usunąć subskrypcji.");
  }
};
