import { Request, Response } from "express";
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
import * as gminaService from "./gmina.service";

export const gminaSchema = z.object({
  name: z.string().min(2, { message: "Nazwa gminy musi mieć minimum 2 znaki" }),
});

const parseId = (raw: string | string[] | undefined): number | null => {
  if (typeof raw !== "string") return null;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
};

// Publiczna lista gmin — używana w formularzu zgłoszenia (także przez gościa)
// oraz w panelu superadmina.
export const getGminy = async (_req: Request, res: Response) => {
  try {
    const gminy = await gminaService.listGminy();
    return SUCCESS(res, "Lista gmin", { gminy });
  } catch {
    return SERVER_ERROR(res, "Wystąpił błąd serwera podczas pobierania gmin.");
  }
};

export const createGmina = async (req: Request, res: Response) => {
  try {
    const parsed = gminaSchema.safeParse(req.body);
    if (!parsed.success) return MISSING_BODY_FIELDS(res, parsed.error.issues);

    const gmina = await gminaService.createGmina(parsed.data.name);
    return CREATED(res, "Gmina została utworzona.", { gmina });
  } catch {
    return SERVER_ERROR(res, "Wystąpił błąd serwera podczas tworzenia gminy.");
  }
};

export const updateGmina = async (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return BAD_REQUEST(res, "Niepoprawne id gminy.");

    const parsed = gminaSchema.safeParse(req.body);
    if (!parsed.success) return MISSING_BODY_FIELDS(res, parsed.error.issues);

    const gmina = await gminaService.updateGmina(id, parsed.data.name);
    return SUCCESS(res, "Gmina zaktualizowana.", { gmina });
  } catch (error) {
    if (isRecordNotFound(error)) return NOT_FOUND(res, "Nie znaleziono gminy.");
    return SERVER_ERROR(
      res,
      "Wystąpił błąd serwera podczas aktualizacji gminy.",
    );
  }
};

export const deleteGmina = async (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return BAD_REQUEST(res, "Niepoprawne id gminy.");

    await gminaService.deleteGmina(id);
    return SUCCESS(res, "Gmina została usunięta.");
  } catch (error) {
    if (isRecordNotFound(error)) return NOT_FOUND(res, "Nie znaleziono gminy.");
    if (isForeignKeyViolation(error))
      return CONFLICT(
        res,
        "Nie można usunąć gminy powiązanej z użytkownikami, wykonawcami lub zgłoszeniami.",
      );
    return SERVER_ERROR(res, "Wystąpił błąd serwera podczas usuwania gminy.");
  }
};
