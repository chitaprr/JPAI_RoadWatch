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
  FORBIDDEN,
  SERVER_ERROR,
  MISSING_BODY_FIELDS,
  MISSING_QUERY_PARAMS,
} from "../../utils/httpCodeResponses/messages";
import { AuthenticatedRequest } from "../../middlewares/authMiddleware";
import { Rola } from "../../generated/prisma/client";
import { UPLOAD_DIR, UPLOAD_ROUTE_PREFIX } from "../../middlewares/upload";
import * as zgloszenieService from "./zgloszenie.service";
import type { AuditEntry } from "./zgloszenie.service";
import * as pushService from "../push/push.service";

const DUPLICATE_RADIUS_M = 50;

// Pola przychodzą jako multipart/form-data (stringi), więc koercja liczb/boola.
export const createSchema = z.object({
  title: z.string().min(3, { message: "Tytuł musi mieć minimum 3 znaki" }),
  description: z.string().min(3, { message: "Opis musi mieć minimum 3 znaki" }),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  // Gmina wybierana przez zgłaszającego (dropdown). Wymagana.
  gminaId: z.coerce
    .number({ message: "Wybór gminy jest wymagany" })
    .int()
    .positive(),
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

// Parametry zapytania dla lookupu gościa (GET /zgloszenia/lookup).
export const lookupSchema = z.object({
  id: z.coerce.number().int().positive(),
  email: z.email({ message: "Niepoprawny format adresu email" }),
});

// Zmiana statusu przez wykonawcę (PATCH /zgloszenia/:id/status).
export const statusSchema = z.object({
  status: z.string().min(1, { message: "Status jest wymagany" }),
});

// Treść komentarza/notatki do zgłoszenia.
export const komentarzSchema = z.object({
  content: z.string().min(1, { message: "Treść komentarza jest wymagana" }),
});

// Zakres dat dla statystyk (opcjonalny).
export const statystykiQuerySchema = z.object({
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
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

    const { title, description, lat, lng, gminaId, force } = parsed.data;

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
      gminaId,
      filePaths: files.map((file) => `${UPLOAD_ROUTE_PREFIX}/${file.filename}`),
    });

    // Wpis początkowy w historii zmian.
    await zgloszenieService.addHistoria([
      {
        zgloszenieId: zgloszenie.id,
        userId: req.user?.userId ?? null,
        userName: email,
        field: "utworzenie",
        oldValue: null,
        newValue: zgloszenie.status,
      },
    ]);

    // Powiadom urzędników gminy o nowym zgłoszeniu (best-effort).
    void pushService
      .notifyNewReport(gminaId, zgloszenie.id, title)
      .catch(() => {});

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

// Urzędnik ma dostęp tylko do zgłoszeń ze swojej gminy; superadmin do wszystkich.
// Zgłoszenia bez gminy (null) widzi wyłącznie superadmin.
const canAccessGmina = (
  user: AuthenticatedRequest["user"],
  gminaId: number | null,
): boolean =>
  !!user &&
  (user.isSuperadmin || (gminaId !== null && gminaId === user.urzednikGminaId));

// Dostęp obsługi do zgłoszenia (komentarze, historia): superadmin — wszystko;
// urzędnik/administrator — swoja gmina; wykonawca — tylko przypisane zlecenia.
const canStaffAccess = (
  user: AuthenticatedRequest["user"],
  zgloszenie: { gminaId: number | null; contractorId: number | null },
): boolean => {
  if (!user) return false;
  if (user.isSuperadmin) return true;
  if (user.role === Rola.URZEDNIK)
    return (
      zgloszenie.gminaId !== null && zgloszenie.gminaId === user.urzednikGminaId
    );
  if (user.role === Rola.ADMIN)
    return (
      zgloszenie.gminaId !== null && zgloszenie.gminaId === user.adminGminaId
    );
  if (user.role === Rola.WYKONAWCA)
    return (
      zgloszenie.contractorId !== null &&
      zgloszenie.contractorId === user.wykonawcaId
    );
  return false;
};

// Buduje wpisy audytu na podstawie różnicy pól triażu (tylko zmienione).
const buildAuditEntries = (
  zgloszenieId: number,
  user: AuthenticatedRequest["user"],
  before: {
    status: string;
    priority: number;
    contractorId: number | null;
    urzednikId: number | null;
    deadline: Date | null;
  },
  after: {
    status?: string;
    priority?: number;
    contractorId?: number | null;
    urzednikId?: number | null;
    deadline?: Date | null;
  },
): AuditEntry[] => {
  const userName = user?.email ?? "system";
  const userId = user?.userId ?? null;
  const entries: AuditEntry[] = [];

  const str = (v: unknown): string | null =>
    v === null || v === undefined ? null : String(v);
  const dateStr = (v: Date | null): string | null =>
    v ? v.toISOString().slice(0, 10) : null;

  const track = (field: string, oldV: string | null, newV: string | null) => {
    if (oldV !== newV)
      entries.push({ zgloszenieId, userId, userName, field, oldValue: oldV, newValue: newV });
  };

  if (after.status !== undefined) track("status", before.status, after.status);
  if (after.priority !== undefined)
    track("priorytet", str(before.priority), str(after.priority));
  if (after.contractorId !== undefined)
    track("wykonawca", str(before.contractorId), str(after.contractorId));
  if (after.urzednikId !== undefined)
    track("urzędnik", str(before.urzednikId), str(after.urzednikId));
  if (after.deadline !== undefined)
    track("termin", dateStr(before.deadline), dateStr(after.deadline));

  return entries;
};

export const getZgloszenia = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    // Superadmin widzi wszystko; urzędnik tylko swoją gminę.
    const filter = req.user?.isSuperadmin
      ? undefined
      : { gminaId: req.user?.urzednikGminaId ?? -1 };
    const zgloszenia = await zgloszenieService.listZgloszenia(filter);
    return SUCCESS(res, "Lista zgłoszeń", { zgloszenia });
  } catch {
    return SERVER_ERROR(
      res,
      "Wystąpił błąd serwera podczas pobierania zgłoszeń.",
    );
  }
};

// Zgłoszenia zalogowanego mieszkańca — „moje zgłoszenia".
export const getMyZgloszenia = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const zgloszenia = await zgloszenieService.listMyZgloszenia(
      req.user!.userId,
    );
    return SUCCESS(res, "Twoje zgłoszenia", { zgloszenia });
  } catch {
    return SERVER_ERROR(
      res,
      "Wystąpił błąd serwera podczas pobierania zgłoszeń.",
    );
  }
};

// Zlecenia wykonawcy — zgłoszenia przypisane do jego firmy.
export const getZlecone = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const zgloszenia = await zgloszenieService.listZlecone(
      req.user!.wykonawcaId ?? -1,
    );
    return SUCCESS(res, "Zlecone naprawy", { zgloszenia });
  } catch {
    return SERVER_ERROR(
      res,
      "Wystąpił błąd serwera podczas pobierania zleceń.",
    );
  }
};

// Wykonawca zmienia status TYLKO zgłoszeń przypisanych do swojej firmy.
export const updateStatusByContractor = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return BAD_REQUEST(res, "Niepoprawne id zgłoszenia.");

    const parsed = statusSchema.safeParse(req.body);
    if (!parsed.success) return MISSING_BODY_FIELDS(res, parsed.error.issues);

    const existing = await zgloszenieService.findZgloszenieById(id);
    if (!existing) return NOT_FOUND(res, "Nie znaleziono zgłoszenia.");
    if (existing.contractorId !== req.user!.wykonawcaId)
      return FORBIDDEN(res, "To zgłoszenie nie jest przypisane do Ciebie.");

    const zgloszenie = await zgloszenieService.updateZgloszenie(id, {
      status: parsed.data.status,
    });

    await zgloszenieService.addHistoria(
      buildAuditEntries(id, req.user, existing, {
        status: parsed.data.status,
      }),
    );

    // Powiadom właściciela zgłoszenia, jeśli status faktycznie się zmienił.
    if (existing.status !== parsed.data.status) {
      void pushService
        .notifyStatusChange(existing.userId, id, parsed.data.status)
        .catch(() => {});
    }

    return SUCCESS(res, "Status zaktualizowany.", { zgloszenie });
  } catch {
    return SERVER_ERROR(
      res,
      "Wystąpił błąd serwera podczas aktualizacji statusu.",
    );
  }
};

// Lookup gościa po ID + email — publiczny sposób sprawdzenia statusu własnego
// zgłoszenia bez logowania. Wymaga obu pól (ochrona przed enumeracją).
export const lookupZgloszenie = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const parsed = lookupSchema.safeParse(req.query);
    if (!parsed.success) return MISSING_QUERY_PARAMS(res, parsed.error.issues);

    const zgloszenie = await zgloszenieService.findZgloszenieByIdAndEmail(
      parsed.data.id,
      parsed.data.email,
    );
    if (!zgloszenie)
      return NOT_FOUND(
        res,
        "Nie znaleziono zgłoszenia o podanym numerze i adresie e-mail.",
      );

    return SUCCESS(res, "Zgłoszenie", { zgloszenie });
  } catch {
    return SERVER_ERROR(
      res,
      "Wystąpił błąd serwera podczas wyszukiwania zgłoszenia.",
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

    if (!canAccessGmina(req.user, zgloszenie.gminaId))
      return FORBIDDEN(res, "Brak dostępu do zgłoszeń z tej gminy.");

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

    // Urzędnik może edytować tylko zgłoszenia ze swojej gminy.
    const existing = await zgloszenieService.findZgloszenieById(id);
    if (!existing) return NOT_FOUND(res, "Nie znaleziono zgłoszenia.");
    if (!canAccessGmina(req.user, existing.gminaId))
      return FORBIDDEN(res, "Brak dostępu do zgłoszeń z tej gminy.");

    // deadline: string ISO -> Date; null -> czyści; undefined -> bez zmiany.
    const { deadline, ...rest } = parsed.data;
    const deadlineValue =
      deadline === undefined
        ? undefined
        : deadline === null
          ? null
          : new Date(deadline);
    const zgloszenie = await zgloszenieService.updateZgloszenie(id, {
      ...rest,
      ...(deadlineValue === undefined ? {} : { deadline: deadlineValue }),
    });

    // Audyt: zapis tylko faktycznie zmienionych pól.
    await zgloszenieService.addHistoria(
      buildAuditEntries(id, req.user, existing, {
        ...rest,
        ...(deadlineValue === undefined ? {} : { deadline: deadlineValue }),
      }),
    );

    // Powiadom właściciela o zmianie statusu (best-effort).
    if (rest.status !== undefined && rest.status !== existing.status) {
      void pushService
        .notifyStatusChange(existing.userId, id, rest.status)
        .catch(() => {});
    }

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

// Komentarze/notatki wewnętrzne — odczyt dla obsługi mającej dostęp do zgłoszenia.
export const getKomentarze = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return BAD_REQUEST(res, "Niepoprawne id zgłoszenia.");

    const zgloszenie = await zgloszenieService.findZgloszenieById(id);
    if (!zgloszenie) return NOT_FOUND(res, "Nie znaleziono zgłoszenia.");
    if (!canStaffAccess(req.user, zgloszenie))
      return FORBIDDEN(res, "Brak dostępu do tego zgłoszenia.");

    const komentarze = await zgloszenieService.listKomentarze(id);
    return SUCCESS(res, "Komentarze", { komentarze });
  } catch {
    return SERVER_ERROR(
      res,
      "Wystąpił błąd serwera podczas pobierania komentarzy.",
    );
  }
};

export const addKomentarz = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return BAD_REQUEST(res, "Niepoprawne id zgłoszenia.");

    const parsed = komentarzSchema.safeParse(req.body);
    if (!parsed.success) return MISSING_BODY_FIELDS(res, parsed.error.issues);

    const zgloszenie = await zgloszenieService.findZgloszenieById(id);
    if (!zgloszenie) return NOT_FOUND(res, "Nie znaleziono zgłoszenia.");
    if (!canStaffAccess(req.user, zgloszenie))
      return FORBIDDEN(res, "Brak dostępu do tego zgłoszenia.");

    const komentarz = await zgloszenieService.createKomentarz({
      zgloszenieId: id,
      authorId: req.user!.userId,
      authorName: req.user!.email,
      content: parsed.data.content,
    });
    return CREATED(res, "Komentarz został dodany.", { komentarz });
  } catch {
    return SERVER_ERROR(
      res,
      "Wystąpił błąd serwera podczas dodawania komentarza.",
    );
  }
};

// Historia zmian (audit log) — odczyt dla obsługi mającej dostęp do zgłoszenia.
export const getHistoria = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return BAD_REQUEST(res, "Niepoprawne id zgłoszenia.");

    const zgloszenie = await zgloszenieService.findZgloszenieById(id);
    if (!zgloszenie) return NOT_FOUND(res, "Nie znaleziono zgłoszenia.");
    if (!canStaffAccess(req.user, zgloszenie))
      return FORBIDDEN(res, "Brak dostępu do tego zgłoszenia.");

    const historia = await zgloszenieService.listHistoria(id);
    return SUCCESS(res, "Historia zmian", { historia });
  } catch {
    return SERVER_ERROR(
      res,
      "Wystąpił błąd serwera podczas pobierania historii.",
    );
  }
};

// Statystyki — urzędnik widzi swoją gminę, superadmin wszystkie.
export const getStatystyki = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const parsed = statystykiQuerySchema.safeParse(req.query);
    if (!parsed.success) return MISSING_QUERY_PARAMS(res, parsed.error.issues);

    const statystyki = await zgloszenieService.getStatystyki({
      gminaId: req.user!.isSuperadmin
        ? undefined
        : (req.user!.urzednikGminaId ?? -1),
      from: parsed.data.from ? new Date(parsed.data.from) : undefined,
      // Do końca dnia „to", żeby zakres był domknięty (inclusive).
      to: parsed.data.to
        ? new Date(`${parsed.data.to}T23:59:59.999Z`)
        : undefined,
    });
    return SUCCESS(res, "Statystyki", { statystyki });
  } catch {
    return SERVER_ERROR(
      res,
      "Wystąpił błąd serwera podczas pobierania statystyk.",
    );
  }
};

// „+1" — potwierdzenie cudzego zgłoszenia (zalogowany). Idempotentne.
export const confirmZgloszenie = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return BAD_REQUEST(res, "Niepoprawne id zgłoszenia.");

    const existing = await zgloszenieService.findZgloszenieById(id);
    if (!existing) return NOT_FOUND(res, "Nie znaleziono zgłoszenia.");
    if (existing.userId === req.user!.userId)
      return BAD_REQUEST(res, "Nie można potwierdzić własnego zgłoszenia.");

    await zgloszenieService.addPotwierdzenie(id, req.user!.userId);
    const confirmations = await zgloszenieService.countPotwierdzenia(id);
    return SUCCESS(res, "Zgłoszenie potwierdzone.", { confirmations });
  } catch {
    return SERVER_ERROR(
      res,
      "Wystąpił błąd serwera podczas potwierdzania zgłoszenia.",
    );
  }
};

export const unconfirmZgloszenie = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return BAD_REQUEST(res, "Niepoprawne id zgłoszenia.");

    await zgloszenieService.removePotwierdzenie(id, req.user!.userId);
    const confirmations = await zgloszenieService.countPotwierdzenia(id);
    return SUCCESS(res, "Potwierdzenie wycofane.", { confirmations });
  } catch {
    return SERVER_ERROR(
      res,
      "Wystąpił błąd serwera podczas wycofywania potwierdzenia.",
    );
  }
};
