import { Response } from "express";
import fs from "fs";
import path from "path";
import { z } from "zod";
import {
  CREATED,
  BAD_REQUEST,
  NOT_FOUND,
  FORBIDDEN,
  SERVER_ERROR,
  MISSING_BODY_FIELDS,
} from "../../utils/httpCodeResponses/messages";
import { AuthenticatedRequest } from "../../middlewares/authMiddleware";
import { UPLOAD_DIR, UPLOAD_ROUTE_PREFIX } from "../../middlewares/upload";
import * as naprawaService from "./naprawa.service";
import * as zgloszenieService from "../zgloszenie/zgloszenie.service";
import * as pushService from "../push/push.service";

// zadanieId przychodzi w multipart/form-data (string) -> koercja.
export const createNaprawaSchema = z.object({
  zadanieId: z.coerce.number().int().positive(),
  description: z
    .string()
    .min(3, { message: "Opis naprawy musi mieć minimum 3 znaki" }),
});

const cleanupFiles = (files: Express.Multer.File[]) => {
  for (const file of files) {
    fs.unlink(path.join(UPLOAD_DIR, file.filename), () => {});
  }
};

// Wykonawca zapisuje naprawę zlecenia (zdjęcia „po"). Dozwolone tylko dla
// zgłoszeń przypisanych do jego firmy. Zapis naprawy kończy zgłoszenie.
export const createNaprawa = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const files = (req.files as Express.Multer.File[]) ?? [];

  try {
    const wykonawcaId = req.user!.wykonawcaId;
    if (!wykonawcaId) {
      cleanupFiles(files);
      return FORBIDDEN(res, "Konto wykonawcy nie jest powiązane z firmą.");
    }

    const parsed = createNaprawaSchema.safeParse(req.body);
    if (!parsed.success) {
      cleanupFiles(files);
      return MISSING_BODY_FIELDS(res, parsed.error.issues);
    }

    if (files.length === 0) {
      return BAD_REQUEST(res, "Dodaj co najmniej jedno zdjęcie po naprawie.");
    }

    const zgloszenie = await zgloszenieService.findZgloszenieById(
      parsed.data.zadanieId,
    );
    if (!zgloszenie) {
      cleanupFiles(files);
      return NOT_FOUND(res, "Nie znaleziono zgłoszenia.");
    }
    if (zgloszenie.contractorId !== wykonawcaId) {
      cleanupFiles(files);
      return FORBIDDEN(res, "To zgłoszenie nie jest przypisane do Ciebie.");
    }

    const naprawa = await naprawaService.createNaprawa({
      zadanieId: parsed.data.zadanieId,
      contractorId: wykonawcaId,
      description: parsed.data.description,
      filePaths: files.map((file) => `${UPLOAD_ROUTE_PREFIX}/${file.filename}`),
    });

    // Zapis naprawy = zakończenie zgłoszenia.
    await zgloszenieService.updateZgloszenie(parsed.data.zadanieId, {
      status: "Zakończone",
    });

    // Audyt zmiany statusu (jeśli zgłoszenie nie było już zakończone).
    if (zgloszenie.status !== "Zakończone") {
      await zgloszenieService.addHistoria([
        {
          zgloszenieId: parsed.data.zadanieId,
          userId: req.user!.userId,
          userName: req.user!.email,
          field: "status",
          oldValue: zgloszenie.status,
          newValue: "Zakończone",
        },
      ]);
      // Powiadom właściciela zgłoszenia o zakończeniu (best-effort).
      void pushService
        .notifyStatusChange(
          zgloszenie.userId,
          parsed.data.zadanieId,
          "Zakończone",
        )
        .catch(() => {});
    }

    return CREATED(res, "Naprawa została zapisana.", { naprawa });
  } catch {
    cleanupFiles(files);
    return SERVER_ERROR(res, "Wystąpił błąd serwera podczas zapisu naprawy.");
  }
};
