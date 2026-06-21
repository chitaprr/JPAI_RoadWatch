import { Response } from "express";
import { z } from "zod";
import {
  SUCCESS,
  BAD_REQUEST,
  NOT_FOUND,
  FORBIDDEN,
  SERVER_ERROR,
  MISSING_BODY_FIELDS,
} from "../../utils/httpCodeResponses/messages";
import { AuthenticatedRequest } from "../../middlewares/authMiddleware";
import { Rola } from "../../generated/prisma/client";
import * as userService from "./user.service";
import * as wykonawcaService from "../wykonawca/wykonawca.service";

// Aktualizacja konta przez superadmina. Każde pole opcjonalne (partial update).
export const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.enum(Rola).optional(),
  isSuperadmin: z.boolean().optional(),
  urzednikGminaId: z.number().int().positive().nullable().optional(),
  adminGminaId: z.number().int().positive().nullable().optional(),
  wykonawcaId: z.number().int().positive().nullable().optional(),
});

// Aktualizacja konta przez administratora gminy. Węższy zakres: nie może nadawać
// roli ADMIN ani flagi superadmina, nie przypisuje gmin spoza swojej.
const adminUpdateUserSchema = z.object({
  name: z.string().min(2).optional(),
  role: z
    .enum([Rola.MIESZKANIEC, Rola.URZEDNIK, Rola.WYKONAWCA])
    .optional(),
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

// Lista użytkowników. Superadmin widzi wszystkich; administrator gminy — tylko
// konta swojej gminy. Z parametrem ?email= administrator może odnaleźć dowolne
// konto (po dokładnym adresie), aby je „zaprosić" do gminy (np. awans na urzędnika).
export const getUsers = async (req: AuthenticatedRequest, res: Response) => {
  if (req.user!.isSuperadmin) {
    const users = await userService.listUsers();
    return SUCCESS(res, "Users", { users });
  }

  const gminaId = req.user!.adminGminaId;
  if (gminaId === null)
    return FORBIDDEN(res, "Twoje konto nie jest przypisane do gminy.");

  const email = req.query.email;
  if (typeof email === "string" && email.length > 0) {
    const user = await userService.findUserByEmail(email);
    return SUCCESS(res, "Users", { users: user ? [user] : [] });
  }

  const users = await userService.listUsersForGmina(gminaId);
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

// Aktualizacja roli/uprawnień przez administratora gminy (scoping do swojej gminy).
const updateUserAsAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  id: number,
) => {
  const gminaId = req.user!.adminGminaId;
  if (gminaId === null)
    return FORBIDDEN(res, "Twoje konto nie jest przypisane do gminy.");

  const parsed = adminUpdateUserSchema.safeParse(req.body);
  if (!parsed.success) return MISSING_BODY_FIELDS(res, parsed.error.issues);

  const target = await userService.findUserScope(id);
  if (!target) return NOT_FOUND(res, "Użytkownik nie znaleziony.");

  // Administrator nie zarządza superadminami ani innymi administratorami.
  if (target.isSuperadmin || target.role === Rola.ADMIN)
    return FORBIDDEN(res, "Nie możesz zarządzać tym kontem.");

  // Konto przypisane do innej gminy jest poza zakresem administratora.
  const belongsElsewhere =
    (target.urzednikGminaId !== null && target.urzednikGminaId !== gminaId) ||
    (target.adminGminaId !== null && target.adminGminaId !== gminaId) ||
    (target.wykonawca !== null && target.wykonawca.gminaId !== gminaId);
  if (belongsElsewhere)
    return FORBIDDEN(res, "To konto należy do innej gminy.");

  const data: {
    name?: string;
    role?: Rola;
    urzednikGminaId?: number | null;
    wykonawcaId?: number | null;
  } = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;

  if (parsed.data.role !== undefined) {
    data.role = parsed.data.role;
    if (parsed.data.role === Rola.URZEDNIK) {
      // Urzędnik zawsze przypisany do gminy administratora.
      data.urzednikGminaId = gminaId;
      data.wykonawcaId = null;
    } else if (parsed.data.role === Rola.WYKONAWCA) {
      const wykonawcaId = parsed.data.wykonawcaId ?? null;
      if (wykonawcaId === null)
        return BAD_REQUEST(res, "Wskaż wykonawcę dla konta wykonawcy.");
      const wk = await wykonawcaService.findWykonawcaById(wykonawcaId);
      if (!wk || wk.gminaId !== gminaId)
        return FORBIDDEN(res, "Wykonawca spoza Twojej gminy.");
      data.wykonawcaId = wykonawcaId;
      data.urzednikGminaId = null;
    } else {
      // MIESZKANIEC — odpięcie od gminy i firmy.
      data.urzednikGminaId = null;
      data.wykonawcaId = null;
    }
  }

  const user = await userService.updateUser(id, data);
  return SUCCESS(res, "Użytkownik zaktualizowany.", { user });
};

export const updateUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return BAD_REQUEST(res, "Niepoprawne id użytkownika.");

    if (!req.user!.isSuperadmin) return await updateUserAsAdmin(req, res, id);

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
