import { Response } from "express";
import { z } from "zod";
import {
  SUCCESS,
  BAD_REQUEST,
  NOT_FOUND,
  SERVER_ERROR,
  MISSING_BODY_FIELDS,
} from "../../utils/httpCodeResponses/messages";
import { AuthenticatedRequest } from "../../middlewares/authMiddleware";
import { Rola } from "../../generated/prisma/client";
import * as userService from "./user.service";

// Aktualizacja konta przez superadmina. Każde pole opcjonalne (partial update).
export const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.enum(Rola).optional(),
  isSuperadmin: z.boolean().optional(),
  urzednikGminaId: z.number().int().positive().nullable().optional(),
  wykonawcaId: z.number().int().positive().nullable().optional(),
});

// Prisma rzuca P2025, gdy rekord do update/delete nie istnieje.
const isRecordNotFound = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as { code?: string }).code === "P2025";

const parseId = (raw: string | string[] | undefined): number | null => {
  if (typeof raw !== "string") return null;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export const getUsers = async (_req: AuthenticatedRequest, res: Response) => {
  const users = await userService.listUsers();
  return SUCCESS(res, "Users", { users });
};

export const getMe = async (req: AuthenticatedRequest, res: Response) => {
  const user = await userService.findUserById(req.user!.userId);
  if (!user) return NOT_FOUND(res, "Użytkownik nie znaleziony.");
  return SUCCESS(res, "Profil użytkownika", { user });
};

export const getUserById = async (req: AuthenticatedRequest, res: Response) => {
  const id = parseId(req.params.id);
  if (id === null) return BAD_REQUEST(res, "Niepoprawne id użytkownika.");

  const user = await userService.findUserById(id);
  if (!user) return NOT_FOUND(res, "Użytkownik nie znaleziony.");
  return SUCCESS(res, "Użytkownik", { user });
};

export const updateUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return BAD_REQUEST(res, "Niepoprawne id użytkownika.");

    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) return MISSING_BODY_FIELDS(res, parsed.error.issues);

    const user = await userService.updateUser(id, parsed.data);
    return SUCCESS(res, "Użytkownik zaktualizowany.", { user });
  } catch (error) {
    if (isRecordNotFound(error))
      return NOT_FOUND(res, "Użytkownik nie znaleziony.");
    return SERVER_ERROR(
      res,
      "Wystąpił błąd serwera podczas aktualizacji użytkownika.",
    );
  }
};

export const deleteUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return BAD_REQUEST(res, "Niepoprawne id użytkownika.");

    // Superadmin nie powinien usunąć samego siebie.
    if (id === req.user!.userId)
      return BAD_REQUEST(res, "Nie można usunąć własnego konta.");

    await userService.deleteUser(id);
    return SUCCESS(res, "Użytkownik został usunięty.");
  } catch (error) {
    if (isRecordNotFound(error))
      return NOT_FOUND(res, "Użytkownik nie znaleziony.");
    return SERVER_ERROR(
      res,
      "Wystąpił błąd serwera podczas usuwania użytkownika.",
    );
  }
};
