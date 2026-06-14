import { Response } from "express";
import fs from "fs";
import path from "path";
import { z } from "zod";
import {
  SUCCESS,
  CREATED,
  CONFLICT,
  BAD_REQUEST,
  NOT_FOUND,
  SERVER_ERROR,
  MISSING_BODY_FIELDS,
} from "../../utils/httpCodeResponses/messages";
import { AuthenticatedRequest } from "../../middlewares/authMiddleware";
import { UPLOAD_DIR, UPLOAD_ROUTE_PREFIX } from "../../middlewares/upload";
import * as zgloszenieService from "./zgloszenie.service";

const DUPLICATE_RADIUS_M = 50;

// Pola przychodzą jako multipart/form-data (stringi), więc koercja liczb/boola.
export const createSchema = z.object({
  title: z.string().min(3, { message: "Tytuł musi mieć minimum 3 znaki" }),
  description: z.string().min(3, { message: "Opis musi mieć minimum 3 znaki" }),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  // Wymagany dla gości; dla zalogowanych brany z tokena.
  email: z.email({ message: "Niepoprawny format adresu email" }).optional(),
  force: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .optional()
    .transform((v) => v === true || v === "true"),
});

// Pola triażu aktualizowane przez urzędnika. Każde opcjonalne -> aktualizacja
// częściowa (pominięte pole pozostaje bez zmian). Statusy: zob. ACTIVE_STATUSES
// w zgloszenie.service.ts.
export const updateSchema = z.object({
  urzednikId: z.number().int().nullable().optional(),
  contractorId: z.number().int().nullable().optional(),
  priority: z.number().int().min(0).max(3).optional(),
  status: z.string().min(1).optional(),
  deadline: z.iso.datetime().nullable().optional(),
});

// Prisma rzuca P2025, gdy rekord do update/delete nie istnieje.
const isRecordNotFound = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as { code?: string }).code === "P2025";

const cleanupFiles = (files: Express.Multer.File[]) => {
  for (const file of files) {
    fs.unlink(path.join(UPLOAD_DIR, file.filename), () => {});
  }
};

export const createZgloszenie = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const files = (req.files as Express.Multer.File[]) ?? [];

  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      cleanupFiles(files);
      return MISSING_BODY_FIELDS(res, parsed.error.issues);
    }

    if (files.length === 0) {
      return BAD_REQUEST(
        res,
        "Zgłoszenie musi zawierać co najmniej jedno zdjęcie.",
      );
    }

    const { title, description, lat, lng, force } = parsed.data;

    // Zalogowany -> email z konta; gość -> email z body (wymagany).
    const email = req.user?.email ?? parsed.data.email;
    if (!email) {
      cleanupFiles(files);
      return BAD_REQUEST(
        res,
        "Email jest wymagany dla zgłoszeń bez logowania.",
      );
    }

    if (!force) {
      const duplicates = await zgloszenieService.findNearbyDuplicates(
        lat,
        lng,
        DUPLICATE_RADIUS_M,
      );
      if (duplicates.length > 0) {
        cleanupFiles(files);
        return CONFLICT(
          res,
          `Istnieją zgłoszenia w promieniu ${DUPLICATE_RADIUS_M} m. Wyślij ponownie z force=true, aby dodać mimo to.`,
          { duplicates },
        );
      }
    }

    const zgloszenie = await zgloszenieService.createZgloszenie({
      userId: req.user?.userId ?? null,
      email,
      title,
      description,
      lat,
      lng,
      filePaths: files.map((file) => `${UPLOAD_ROUTE_PREFIX}/${file.filename}`),
    });

    return CREATED(res, "Zgłoszenie zostało utworzone.", { zgloszenie });
  } catch {
    cleanupFiles(files);
    return SERVER_ERROR(
      res,
      "Wystąpił błąd serwera podczas tworzenia zgłoszenia.",
    );
  }
};

const parseId = (raw: string | string[] | undefined): number | null => {
  if (typeof raw !== "string") return null;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export const getZgloszenia = async (
  _req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const zgloszenia = await zgloszenieService.listZgloszenia();
    return SUCCESS(res, "Lista zgłoszeń", { zgloszenia });
  } catch {
    return SERVER_ERROR(
      res,
      "Wystąpił błąd serwera podczas pobierania zgłoszeń.",
    );
  }
};

// Publiczny odczyt dla mapy — bez logowania, minimalny zestaw pól.
export const getPublicZgloszenia = async (
  _req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const zgloszenia = await zgloszenieService.listPublicZgloszenia();
    return SUCCESS(res, "Publiczna lista zgłoszeń", { zgloszenia });
  } catch {
    return SERVER_ERROR(
      res,
      "Wystąpił błąd serwera podczas pobierania zgłoszeń.",
    );
  }
};

export const getZgloszenieById = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return BAD_REQUEST(res, "Niepoprawne id zgłoszenia.");

    const zgloszenie = await zgloszenieService.findZgloszenieById(id);
    if (!zgloszenie) return NOT_FOUND(res, "Nie znaleziono zgłoszenia.");

    return SUCCESS(res, "Zgłoszenie", { zgloszenie });
  } catch {
    return SERVER_ERROR(
      res,
      "Wystąpił błąd serwera podczas pobierania zgłoszenia.",
    );
  }
};

export const updateZgloszenie = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return BAD_REQUEST(res, "Niepoprawne id zgłoszenia.");

    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) return MISSING_BODY_FIELDS(res, parsed.error.issues);

    // deadline: string ISO -> Date; null -> czyści; undefined -> bez zmiany.
    const { deadline, ...rest } = parsed.data;
    const zgloszenie = await zgloszenieService.updateZgloszenie(id, {
      ...rest,
      ...(deadline === undefined
        ? {}
        : { deadline: deadline === null ? null : new Date(deadline) }),
    });

    return SUCCESS(res, "Zgłoszenie zaktualizowane.", { zgloszenie });
  } catch (error) {
    if (isRecordNotFound(error))
      return NOT_FOUND(res, "Nie znaleziono zgłoszenia.");
    return SERVER_ERROR(
      res,
      "Wystąpił błąd serwera podczas aktualizacji zgłoszenia.",
    );
  }
};

export const deleteZgloszenie = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return BAD_REQUEST(res, "Niepoprawne id zgłoszenia.");

    await zgloszenieService.deleteZgloszenie(id);
    return SUCCESS(res, "Zgłoszenie zostało usunięte.");
  } catch (error) {
    if (isRecordNotFound(error))
      return NOT_FOUND(res, "Nie znaleziono zgłoszenia.");
    return SERVER_ERROR(
      res,
      "Wystąpił błąd serwera podczas usuwania zgłoszenia.",
    );
  }
};
