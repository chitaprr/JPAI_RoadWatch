import { Response } from "express";
import { z } from "zod";
import {
  SUCCESS,
  CREATED,
  BAD_REQUEST,
  NOT_FOUND,
  CONFLICT,
  SERVER_ERROR,
  MISSING_BODY_FIELDS,
} from "../../utils/httpCodeResponses/messages";
import {
  isRecordNotFound,
  isForeignKeyViolation,
} from "../../utils/prismaErrors";
import { AuthenticatedRequest } from "../../middlewares/authMiddleware";
import * as wykonawcaService from "./wykonawca.service";

export const createWykonawcaSchema = z.object({
  name: z.string().min(2, { message: "Nazwa musi mieć minimum 2 znaki" }),
  nip: z.string().min(10, { message: "NIP musi mieć minimum 10 znaków" }),
  gminaId: z.number().int().positive(),
});

// Aktualizacja częściowa.
export const updateWykonawcaSchema = createWykonawcaSchema.partial();

const parseId = (raw: string | string[] | undefined): number | null => {
  if (typeof raw !== "string") return null;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
};

// Lista wykonawców — urzędnik (przypisanie do zgłoszenia) i superadmin (CRUD).
export const getWykonawcy = async (
  _req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const wykonawcy = await wykonawcaService.listWykonawcy();
    return SUCCESS(res, "Lista wykonawców", { wykonawcy });
  } catch {
    return SERVER_ERROR(
      res,
      "Wystąpił błąd serwera podczas pobierania wykonawców.",
    );
  }
};

export const createWykonawca = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const parsed = createWykonawcaSchema.safeParse(req.body);
    if (!parsed.success) return MISSING_BODY_FIELDS(res, parsed.error.issues);

    const wykonawca = await wykonawcaService.createWykonawca(parsed.data);
    return CREATED(res, "Wykonawca został utworzony.", { wykonawca });
  } catch (error) {
    // gminaId wskazujący na nieistniejącą gminę -> naruszenie FK.
    if (isForeignKeyViolation(error))
      return BAD_REQUEST(res, "Wskazana gmina nie istnieje.");
    return SERVER_ERROR(
      res,
      "Wystąpił błąd serwera podczas tworzenia wykonawcy.",
    );
  }
};

export const updateWykonawca = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return BAD_REQUEST(res, "Niepoprawne id wykonawcy.");

    const parsed = updateWykonawcaSchema.safeParse(req.body);
    if (!parsed.success) return MISSING_BODY_FIELDS(res, parsed.error.issues);

    const wykonawca = await wykonawcaService.updateWykonawca(id, parsed.data);
    return SUCCESS(res, "Wykonawca zaktualizowany.", { wykonawca });
  } catch (error) {
    if (isRecordNotFound(error))
      return NOT_FOUND(res, "Nie znaleziono wykonawcy.");
    if (isForeignKeyViolation(error))
      return BAD_REQUEST(res, "Wskazana gmina nie istnieje.");
    return SERVER_ERROR(
      res,
      "Wystąpił błąd serwera podczas aktualizacji wykonawcy.",
    );
  }
};

export const deleteWykonawca = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return BAD_REQUEST(res, "Niepoprawne id wykonawcy.");

    await wykonawcaService.deleteWykonawca(id);
    return SUCCESS(res, "Wykonawca został usunięty.");
  } catch (error) {
    if (isRecordNotFound(error))
      return NOT_FOUND(res, "Nie znaleziono wykonawcy.");
    if (isForeignKeyViolation(error))
      return CONFLICT(
        res,
        "Nie można usunąć wykonawcy powiązanego ze zgłoszeniami, naprawami lub kontami.",
      );
    return SERVER_ERROR(
      res,
      "Wystąpił błąd serwera podczas usuwania wykonawcy.",
    );
  }
};
