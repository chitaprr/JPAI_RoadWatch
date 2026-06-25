import { z } from "zod";
import { createDocument } from "zod-openapi";
import { registerSchema, loginSchema } from "../routes/auth/auth.controller";
import {
  createSchema,
  updateSchema,
  lookupSchema,
  statusSchema,
  komentarzSchema,
  statystykiQuerySchema,
} from "../routes/zgloszenie/zgloszenie.controller";
import { updateUserSchema } from "../routes/user/user.controller";
import { createNaprawaSchema } from "../routes/naprawa/naprawa.controller";
import { gminaSchema } from "../routes/gmina/gmina.controller";
import {
  createWykonawcaSchema,
  updateWykonawcaSchema,
} from "../routes/wykonawca/wykonawca.controller";
import {
  subscribeSchema,
  unsubscribeSchema,
} from "../routes/push/push.controller";

/**
 * Specyfikacja OpenAPI generowana z tych samych schematów Zod, które walidują
 * żądania w kontrolerach — dzięki temu dokumentacja nie rozjeżdża się z kodem.
 *
 * Uwaga o kształcie odpowiedzi (zob. utils/httpCodeResponses/respond.ts):
 * każda odpowiedź to koperta { success, msg, ...data }. Helper SUCCESS spreaduje
 * payload na najwyższy poziom, a CREATED zagnieżdża go pod kluczem `data`.
 */

// --- Współdzielone schematy odpowiedzi ---

/** Koperta sukcesu z payloadem spreadowanym na top-level (helper SUCCESS). */
const successEnvelope = (shape: z.ZodRawShape) =>
  z.object({
    success: z.literal(true),
    msg: z.string(),
    ...shape,
  });

/** Koperta CREATED — payload zagnieżdżony pod `data`. */
const createdEnvelope = (data: z.ZodTypeAny) =>
  z.object({
    success: z.literal(true),
    msg: z.string(),
    data,
  });

/** Koperta błędu. */
const errorEnvelope = z
  .object({
    success: z.literal(false),
    msg: z.string(),
  })
  .meta({ id: "ErrorResponse" });

/** Koperta błędu walidacji Zod (MISSING_BODY_FIELDS / VALIDATION_ERROR). */
const validationErrorEnvelope = z
  .object({
    success: z.literal(false),
    msg: z.string(),
    errors: z.array(z.record(z.string(), z.unknown())),
  })
  .meta({ id: "ValidationErrorResponse" });

const userPublic = z
  .object({
    id: z.number(),
    email: z.email(),
    name: z.string(),
    role: z.enum(["MIESZKANIEC", "URZEDNIK", "WYKONAWCA", "ADMIN"]),
    isSuperadmin: z.boolean(),
    gminaId: z.number().nullable().optional(),
    urzednikGminaId: z.number().nullable().optional(),
    adminGminaId: z.number().nullable().optional(),
    wykonawcaId: z.number().nullable().optional(),
  })
  .meta({ id: "UserPublic" });

const authPayload = {
  token: z.string(),
  user: userPublic,
};

const gmina = z
  .object({ id: z.number(), name: z.string() })
  .meta({ id: "Gmina" });

const komentarz = z
  .object({
    id: z.number(),
    zgloszenieId: z.number(),
    authorId: z.number().nullable(),
    authorName: z.string(),
    content: z.string(),
    createdAt: z.string(),
  })
  .meta({ id: "Komentarz" });

const historiaZmian = z
  .object({
    id: z.number(),
    zgloszenieId: z.number(),
    userId: z.number().nullable(),
    userName: z.string(),
    field: z.string(),
    oldValue: z.string().nullable(),
    newValue: z.string().nullable(),
    createdAt: z.string(),
  })
  .meta({ id: "HistoriaZmian" });

const statystyki = z
  .object({
    total: z.number(),
    byStatus: z.record(z.string(), z.number()),
    avgResolutionDays: z.number().nullable(),
    resolvedCount: z.number(),
  })
  .meta({ id: "Statystyki" });

const wykonawca = z
  .object({
    id: z.number(),
    name: z.string(),
    nip: z.string(),
    gminaId: z.number(),
  })
  .meta({ id: "Wykonawca" });

const zgloszenieDuplicate = z
  .object({
    id: z.number(),
    title: z.string(),
    lat: z.number(),
    lng: z.number(),
  })
  .meta({ id: "ZgloszenieDuplicate" });

const zdjecie = z
  .object({
    id: z.number(),
    zgloszenieId: z.number(),
    filePath: z.string(),
    uploadedAt: z.string(),
  })
  .meta({ id: "Zdjecie" });

const naprawa = z
  .object({
    id: z.number(),
    zadanieId: z.number(),
    contractorId: z.number(),
    description: z.string(),
    completedAt: z.string(),
    zdjecia: z
      .array(z.object({ id: z.number(), filePath: z.string() }))
      .optional(),
  })
  .meta({ id: "Naprawa" });

// lat/lng to Decimal w bazie — Prisma serializuje je jako string w JSON.
const zgloszenie = z
  .object({
    id: z.number(),
    userId: z.number().nullable(),
    email: z.email(),
    urzednikId: z.number().nullable(),
    contractorId: z.number().nullable(),
    gminaId: z.number().nullable(),
    title: z.string(),
    description: z.string(),
    lat: z.string(),
    lng: z.string(),
    priority: z.number(),
    status: z.string(),
    deadline: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
    zdjecia: z.array(zdjecie).optional(),
    gmina: z.object({ name: z.string() }).nullable().optional(),
    naprawy: z.array(naprawa).optional(),
  })
  .meta({ id: "Zgloszenie" });

// Publiczny widok dla mapy — podzbiór pól bez danych kontaktowych.
const zgloszeniePublic = z
  .object({
    id: z.number(),
    title: z.string(),
    description: z.string(),
    lat: z.string(),
    lng: z.string(),
    status: z.string(),
    priority: z.number(),
    createdAt: z.string(),
    confirmations: z.number(),
    zdjecia: z
      .array(z.object({ id: z.number(), filePath: z.string() }))
      .optional(),
  })
  .meta({ id: "ZgloszeniePublic" });

const idParam = {
  path: z.object({
    id: z.coerce
      .number()
      .int()
      .positive()
      .meta({ description: "ID zgłoszenia" }),
  }),
};

const jsonError = (
  description: string,
  schema: z.ZodTypeAny = errorEnvelope,
) => ({
  description,
  content: { "application/json": { schema } },
});

export const openApiDocument = createDocument({
  openapi: "3.1.0",
  info: {
    title: "RoadWatch API",
    version: "1.0.0",
    description:
      "API platformy zgłaszania uszkodzeń infrastruktury drogowej RoadWatch.",
  },
  servers: [{ url: "http://localhost:8000", description: "Lokalny dev" }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
  },
  paths: {
    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Rejestracja nowego użytkownika",
        requestBody: {
          content: { "application/json": { schema: registerSchema } },
        },
        responses: {
          "201": {
            description: "Użytkownik zarejestrowany",
            content: {
              "application/json": {
                schema: createdEnvelope(z.object(authPayload)),
              },
            },
          },
          "400": jsonError("Błąd walidacji lub email już istnieje"),
          "500": jsonError("Błąd serwera"),
        },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Logowanie",
        requestBody: {
          content: { "application/json": { schema: loginSchema } },
        },
        responses: {
          "200": {
            description: "Zalogowano",
            content: {
              "application/json": {
                schema: successEnvelope(authPayload),
              },
            },
          },
          "400": jsonError("Błąd walidacji", validationErrorEnvelope),
          "401": jsonError("Nieprawidłowy email lub hasło"),
          "500": jsonError("Błąd serwera"),
        },
      },
    },
    "/users": {
      get: {
        tags: ["Users"],
        summary: "Lista użytkowników (tylko superadmin)",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Lista użytkowników",
            content: {
              "application/json": {
                schema: successEnvelope({ users: z.array(userPublic) }),
              },
            },
          },
          "401": jsonError("Brak tokena"),
          "403": jsonError("Wymagane uprawnienia superadmina"),
        },
      },
    },
    "/users/me": {
      get: {
        tags: ["Users"],
        summary: "Profil zalogowanego użytkownika",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Profil użytkownika",
            content: {
              "application/json": {
                schema: successEnvelope({ user: userPublic }),
              },
            },
          },
          "401": jsonError("Brak tokena"),
          "403": jsonError("Token niepoprawny lub wygasł"),
          "404": jsonError("Użytkownik nie znaleziony"),
        },
      },
    },
    "/users/{id}": {
      get: {
        tags: ["Users"],
        summary: "Pobranie użytkownika po ID (tylko superadmin)",
        security: [{ bearerAuth: [] }],
        requestParams: idParam,
        responses: {
          "200": {
            description: "Użytkownik",
            content: {
              "application/json": {
                schema: successEnvelope({ user: userPublic }),
              },
            },
          },
          "401": jsonError("Brak tokena"),
          "403": jsonError("Wymagane uprawnienia superadmina"),
          "404": jsonError("Użytkownik nie znaleziony"),
        },
      },
      patch: {
        tags: ["Users"],
        summary:
          "Aktualizacja użytkownika (rola, gmina, wykonawca) — superadmin",
        security: [{ bearerAuth: [] }],
        requestParams: idParam,
        requestBody: {
          content: { "application/json": { schema: updateUserSchema } },
        },
        responses: {
          "200": {
            description: "Użytkownik zaktualizowany",
            content: {
              "application/json": {
                schema: successEnvelope({ user: userPublic }),
              },
            },
          },
          "400": jsonError("Błąd walidacji", validationErrorEnvelope),
          "401": jsonError("Brak tokena"),
          "403": jsonError("Wymagane uprawnienia superadmina"),
          "404": jsonError("Użytkownik nie znaleziony"),
        },
      },
      delete: {
        tags: ["Users"],
        summary: "Usunięcie użytkownika (tylko superadmin)",
        security: [{ bearerAuth: [] }],
        requestParams: idParam,
        responses: {
          "200": {
            description: "Użytkownik usunięty",
            content: {
              "application/json": {
                schema: z.object({
                  success: z.literal(true),
                  msg: z.string(),
                }),
              },
            },
          },
          "400": jsonError("Niepoprawne id / próba usunięcia siebie"),
          "401": jsonError("Brak tokena"),
          "403": jsonError("Wymagane uprawnienia superadmina"),
          "404": jsonError("Użytkownik nie znaleziony"),
        },
      },
    },
    "/gminy": {
      get: {
        tags: ["Gminy"],
        summary: "Lista gmin (publiczna)",
        description:
          "Otwarte bez logowania — używane w formularzu zgłoszenia oraz w panelu.",
        responses: {
          "200": {
            description: "Lista gmin",
            content: {
              "application/json": {
                schema: successEnvelope({ gminy: z.array(gmina) }),
              },
            },
          },
          "500": jsonError("Błąd serwera"),
        },
      },
      post: {
        tags: ["Gminy"],
        summary: "Utworzenie gminy (tylko superadmin)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: { "application/json": { schema: gminaSchema } },
        },
        responses: {
          "201": {
            description: "Gmina utworzona",
            content: {
              "application/json": {
                schema: createdEnvelope(z.object({ gmina })),
              },
            },
          },
          "400": jsonError("Błąd walidacji", validationErrorEnvelope),
          "401": jsonError("Brak tokena"),
          "403": jsonError("Wymagane uprawnienia superadmina"),
        },
      },
    },
    "/gminy/{id}": {
      patch: {
        tags: ["Gminy"],
        summary: "Zmiana nazwy gminy (tylko superadmin)",
        security: [{ bearerAuth: [] }],
        requestParams: idParam,
        requestBody: {
          content: { "application/json": { schema: gminaSchema } },
        },
        responses: {
          "200": {
            description: "Gmina zaktualizowana",
            content: {
              "application/json": {
                schema: successEnvelope({ gmina }),
              },
            },
          },
          "400": jsonError(
            "Błąd walidacji / niepoprawne id",
            validationErrorEnvelope,
          ),
          "401": jsonError("Brak tokena"),
          "403": jsonError("Wymagane uprawnienia superadmina"),
          "404": jsonError("Nie znaleziono gminy"),
        },
      },
      delete: {
        tags: ["Gminy"],
        summary: "Usunięcie gminy (tylko superadmin)",
        security: [{ bearerAuth: [] }],
        requestParams: idParam,
        responses: {
          "200": {
            description: "Gmina usunięta",
            content: {
              "application/json": {
                schema: z.object({
                  success: z.literal(true),
                  msg: z.string(),
                }),
              },
            },
          },
          "401": jsonError("Brak tokena"),
          "403": jsonError("Wymagane uprawnienia superadmina"),
          "404": jsonError("Nie znaleziono gminy"),
          "409": jsonError("Gmina w użyciu — nie można usunąć"),
        },
      },
    },
    "/wykonawcy": {
      get: {
        tags: ["Wykonawcy"],
        summary: "Lista wykonawców (urzędnik lub superadmin)",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Lista wykonawców",
            content: {
              "application/json": {
                schema: successEnvelope({ wykonawcy: z.array(wykonawca) }),
              },
            },
          },
          "401": jsonError("Brak tokena"),
          "403": jsonError("Wymagane uprawnienia urzędnika lub superadmina"),
          "500": jsonError("Błąd serwera"),
        },
      },
      post: {
        tags: ["Wykonawcy"],
        summary: "Utworzenie wykonawcy (tylko superadmin)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: { "application/json": { schema: createWykonawcaSchema } },
        },
        responses: {
          "201": {
            description: "Wykonawca utworzony",
            content: {
              "application/json": {
                schema: createdEnvelope(z.object({ wykonawca })),
              },
            },
          },
          "400": jsonError(
            "Błąd walidacji / gmina nie istnieje",
            validationErrorEnvelope,
          ),
          "401": jsonError("Brak tokena"),
          "403": jsonError("Wymagane uprawnienia superadmina"),
        },
      },
    },
    "/wykonawcy/{id}": {
      patch: {
        tags: ["Wykonawcy"],
        summary: "Aktualizacja wykonawcy (tylko superadmin)",
        security: [{ bearerAuth: [] }],
        requestParams: idParam,
        requestBody: {
          content: { "application/json": { schema: updateWykonawcaSchema } },
        },
        responses: {
          "200": {
            description: "Wykonawca zaktualizowany",
            content: {
              "application/json": {
                schema: successEnvelope({ wykonawca }),
              },
            },
          },
          "400": jsonError(
            "Błąd walidacji / niepoprawne id",
            validationErrorEnvelope,
          ),
          "401": jsonError("Brak tokena"),
          "403": jsonError("Wymagane uprawnienia superadmina"),
          "404": jsonError("Nie znaleziono wykonawcy"),
        },
      },
      delete: {
        tags: ["Wykonawcy"],
        summary: "Usunięcie wykonawcy (tylko superadmin)",
        security: [{ bearerAuth: [] }],
        requestParams: idParam,
        responses: {
          "200": {
            description: "Wykonawca usunięty",
            content: {
              "application/json": {
                schema: z.object({
                  success: z.literal(true),
                  msg: z.string(),
                }),
              },
            },
          },
          "401": jsonError("Brak tokena"),
          "403": jsonError("Wymagane uprawnienia superadmina"),
          "404": jsonError("Nie znaleziono wykonawcy"),
          "409": jsonError("Wykonawca w użyciu — nie można usunąć"),
        },
      },
    },
    "/naprawy": {
      post: {
        tags: ["Naprawy"],
        summary: "Zapis naprawy przez wykonawcę (multipart/form-data)",
        description:
          "Dodaje naprawę ze zdjęciami po naprawie do przypisanego zlecenia i ustawia status zgłoszenia na Zakończone. Wymaga 1–5 zdjęć w polu `zdjecia`.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            "multipart/form-data": {
              schema: createNaprawaSchema.extend({
                zdjecia: z
                  .array(z.string().meta({ format: "binary" }))
                  .min(1)
                  .max(5),
              }),
            },
          },
        },
        responses: {
          "201": {
            description: "Naprawa zapisana",
            content: {
              "application/json": {
                schema: createdEnvelope(z.object({ naprawa })),
              },
            },
          },
          "400": jsonError(
            "Błąd walidacji / brak zdjęć",
            validationErrorEnvelope,
          ),
          "401": jsonError("Brak tokena"),
          "403": jsonError("Zlecenie nie przypisane do wykonawcy / brak roli"),
          "404": jsonError("Nie znaleziono zgłoszenia"),
          "500": jsonError("Błąd serwera"),
        },
      },
    },
    "/zgloszenia": {
      post: {
        tags: ["Zgłoszenia"],
        summary: "Utworzenie zgłoszenia (multipart/form-data)",
        description:
          "Otwarte dla gości (wymagany `email`) oraz zalogowanych (przypięte do konta przez token). Wymaga 1–5 zdjęć w polu `zdjecia`.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            "multipart/form-data": {
              schema: createSchema.extend({
                zdjecia: z
                  .array(z.string().meta({ format: "binary" }))
                  .min(1)
                  .max(5),
              }),
            },
          },
        },
        responses: {
          "201": {
            description: "Zgłoszenie utworzone",
            content: {
              "application/json": {
                schema: createdEnvelope(z.object({ zgloszenie })),
              },
            },
          },
          "400": jsonError(
            "Błąd walidacji / brak zdjęć / brak emaila",
            validationErrorEnvelope,
          ),
          "409": jsonError(
            "Istnieją zgłoszenia w pobliżu — ponów z force=true",
            successEnvelope({
              duplicates: z.array(zgloszenieDuplicate),
            }).extend({ success: z.literal(false) }),
          ),
          "500": jsonError("Błąd serwera"),
        },
      },
      get: {
        tags: ["Zgłoszenia"],
        summary: "Lista wszystkich zgłoszeń",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Lista zgłoszeń",
            content: {
              "application/json": {
                schema: successEnvelope({ zgloszenia: z.array(zgloszenie) }),
              },
            },
          },
          "401": jsonError("Brak tokena"),
          "403": jsonError("Token niepoprawny lub wygasł"),
          "500": jsonError("Błąd serwera"),
        },
      },
    },
    "/zgloszenia/public": {
      get: {
        tags: ["Zgłoszenia"],
        summary: "Publiczna lista zgłoszeń (dla mapy)",
        description:
          "Otwarte bez logowania. Zwraca minimalny zestaw pól potrzebny do wyświetlenia pinezek na mapie (bez emaila i powiązań użytkowników).",
        responses: {
          "200": {
            description: "Publiczna lista zgłoszeń",
            content: {
              "application/json": {
                schema: successEnvelope({
                  zgloszenia: z.array(zgloszeniePublic),
                }),
              },
            },
          },
          "500": jsonError("Błąd serwera"),
        },
      },
    },
    "/zgloszenia/moje": {
      get: {
        tags: ["Zgłoszenia"],
        summary: "Zgłoszenia zalogowanego mieszkańca",
        description: "Zwraca zgłoszenia powiązane z kontem (po userId).",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Twoje zgłoszenia",
            content: {
              "application/json": {
                schema: successEnvelope({ zgloszenia: z.array(zgloszenie) }),
              },
            },
          },
          "401": jsonError("Brak tokena"),
          "403": jsonError("Token niepoprawny lub wygasł"),
          "500": jsonError("Błąd serwera"),
        },
      },
    },
    "/zgloszenia/zlecone": {
      get: {
        tags: ["Zgłoszenia"],
        summary: "Zlecenia wykonawcy (zgłoszenia przypisane do jego firmy)",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Lista zleceń wraz z naprawami",
            content: {
              "application/json": {
                schema: successEnvelope({ zgloszenia: z.array(zgloszenie) }),
              },
            },
          },
          "401": jsonError("Brak tokena"),
          "403": jsonError("Wymagana rola wykonawcy"),
          "500": jsonError("Błąd serwera"),
        },
      },
    },
    "/zgloszenia/{id}/status": {
      patch: {
        tags: ["Zgłoszenia"],
        summary: "Zmiana statusu zlecenia przez wykonawcę",
        description:
          "Dozwolone tylko dla zgłoszeń przypisanych do firmy wykonawcy.",
        security: [{ bearerAuth: [] }],
        requestParams: idParam,
        requestBody: {
          content: { "application/json": { schema: statusSchema } },
        },
        responses: {
          "200": {
            description: "Status zaktualizowany",
            content: {
              "application/json": {
                schema: successEnvelope({ zgloszenie }),
              },
            },
          },
          "400": jsonError(
            "Błąd walidacji / niepoprawne id",
            validationErrorEnvelope,
          ),
          "401": jsonError("Brak tokena"),
          "403": jsonError("Zgłoszenie nie jest przypisane do wykonawcy"),
          "404": jsonError("Nie znaleziono zgłoszenia"),
          "500": jsonError("Błąd serwera"),
        },
      },
    },
    "/zgloszenia/lookup": {
      get: {
        tags: ["Zgłoszenia"],
        summary: "Sprawdzenie statusu zgłoszenia gościa (ID + email)",
        description:
          "Publiczne. Zwraca zgłoszenie tylko gdy podane `id` i `email` pasują do siebie (ochrona przed enumeracją).",
        requestParams: { query: lookupSchema },
        responses: {
          "200": {
            description: "Zgłoszenie",
            content: {
              "application/json": {
                schema: successEnvelope({ zgloszenie }),
              },
            },
          },
          "400": jsonError(
            "Brak/niepoprawne parametry",
            validationErrorEnvelope,
          ),
          "404": jsonError("Nie znaleziono zgłoszenia"),
          "500": jsonError("Błąd serwera"),
        },
      },
    },
    "/zgloszenia/statystyki": {
      get: {
        tags: ["Zgłoszenia"],
        summary: "Statystyki zgłoszeń (urzędnik/superadmin)",
        description:
          "Liczba zgłoszeń, rozkład statusów i średni czas realizacji (dni). Urzędnik widzi swoją gminę; superadmin wszystkie. Opcjonalny zakres dat `from`/`to`.",
        security: [{ bearerAuth: [] }],
        requestParams: { query: statystykiQuerySchema },
        responses: {
          "200": {
            description: "Statystyki",
            content: {
              "application/json": {
                schema: successEnvelope({ statystyki }),
              },
            },
          },
          "400": jsonError("Niepoprawne parametry", validationErrorEnvelope),
          "401": jsonError("Brak tokena"),
          "403": jsonError("Brak uprawnień"),
          "500": jsonError("Błąd serwera"),
        },
      },
    },
    "/zgloszenia/{id}/komentarze": {
      get: {
        tags: ["Zgłoszenia"],
        summary: "Komentarze/notatki do zgłoszenia",
        description:
          "Dostęp dla obsługi: urzędnik/administrator gminy, przypisany wykonawca, superadmin.",
        security: [{ bearerAuth: [] }],
        requestParams: idParam,
        responses: {
          "200": {
            description: "Lista komentarzy",
            content: {
              "application/json": {
                schema: successEnvelope({ komentarze: z.array(komentarz) }),
              },
            },
          },
          "401": jsonError("Brak tokena"),
          "403": jsonError("Brak dostępu"),
          "404": jsonError("Nie znaleziono zgłoszenia"),
          "500": jsonError("Błąd serwera"),
        },
      },
      post: {
        tags: ["Zgłoszenia"],
        summary: "Dodanie komentarza do zgłoszenia",
        security: [{ bearerAuth: [] }],
        requestParams: idParam,
        requestBody: {
          content: { "application/json": { schema: komentarzSchema } },
        },
        responses: {
          "201": {
            description: "Komentarz dodany",
            content: {
              "application/json": {
                schema: createdEnvelope(z.object({ komentarz })),
              },
            },
          },
          "400": jsonError("Błąd walidacji", validationErrorEnvelope),
          "401": jsonError("Brak tokena"),
          "403": jsonError("Brak dostępu"),
          "404": jsonError("Nie znaleziono zgłoszenia"),
          "500": jsonError("Błąd serwera"),
        },
      },
    },
    "/zgloszenia/{id}/historia": {
      get: {
        tags: ["Zgłoszenia"],
        summary: "Historia zmian zgłoszenia (audit log)",
        description:
          "Dostęp dla obsługi: urzędnik/administrator gminy, przypisany wykonawca, superadmin.",
        security: [{ bearerAuth: [] }],
        requestParams: idParam,
        responses: {
          "200": {
            description: "Historia zmian",
            content: {
              "application/json": {
                schema: successEnvelope({ historia: z.array(historiaZmian) }),
              },
            },
          },
          "401": jsonError("Brak tokena"),
          "403": jsonError("Brak dostępu"),
          "404": jsonError("Nie znaleziono zgłoszenia"),
          "500": jsonError("Błąd serwera"),
        },
      },
    },
    "/zgloszenia/{id}/potwierdz": {
      post: {
        tags: ["Zgłoszenia"],
        summary: "Potwierdzenie (+1) cudzego zgłoszenia",
        description:
          "Idempotentne. Nie można potwierdzić własnego zgłoszenia. Zwraca aktualną liczbę potwierdzeń.",
        security: [{ bearerAuth: [] }],
        requestParams: idParam,
        responses: {
          "200": {
            description: "Potwierdzono",
            content: {
              "application/json": {
                schema: successEnvelope({ confirmations: z.number() }),
              },
            },
          },
          "400": jsonError("Własne zgłoszenie / niepoprawne id"),
          "401": jsonError("Brak tokena"),
          "404": jsonError("Nie znaleziono zgłoszenia"),
          "500": jsonError("Błąd serwera"),
        },
      },
      delete: {
        tags: ["Zgłoszenia"],
        summary: "Wycofanie potwierdzenia",
        security: [{ bearerAuth: [] }],
        requestParams: idParam,
        responses: {
          "200": {
            description: "Wycofano",
            content: {
              "application/json": {
                schema: successEnvelope({ confirmations: z.number() }),
              },
            },
          },
          "400": jsonError("Niepoprawne id"),
          "401": jsonError("Brak tokena"),
          "500": jsonError("Błąd serwera"),
        },
      },
    },
    "/zgloszenia/{id}": {
      get: {
        tags: ["Zgłoszenia"],
        summary: "Pobranie zgłoszenia po ID",
        security: [{ bearerAuth: [] }],
        requestParams: idParam,
        responses: {
          "200": {
            description: "Zgłoszenie",
            content: {
              "application/json": {
                schema: successEnvelope({ zgloszenie }),
              },
            },
          },
          "400": jsonError("Niepoprawne id"),
          "401": jsonError("Brak tokena"),
          "404": jsonError("Nie znaleziono zgłoszenia"),
          "500": jsonError("Błąd serwera"),
        },
      },
      patch: {
        tags: ["Zgłoszenia"],
        summary: "Aktualizacja zgłoszenia (triaż urzędnika)",
        description:
          "Aktualizacja częściowa — przekazuje się tylko zmieniane pola.",
        security: [{ bearerAuth: [] }],
        requestParams: idParam,
        requestBody: {
          content: { "application/json": { schema: updateSchema } },
        },
        responses: {
          "200": {
            description: "Zgłoszenie zaktualizowane",
            content: {
              "application/json": {
                schema: successEnvelope({ zgloszenie }),
              },
            },
          },
          "400": jsonError(
            "Błąd walidacji / niepoprawne id",
            validationErrorEnvelope,
          ),
          "401": jsonError("Brak tokena"),
          "404": jsonError("Nie znaleziono zgłoszenia"),
          "500": jsonError("Błąd serwera"),
        },
      },
      delete: {
        tags: ["Zgłoszenia"],
        summary: "Usunięcie zgłoszenia",
        security: [{ bearerAuth: [] }],
        requestParams: idParam,
        responses: {
          "200": {
            description: "Zgłoszenie usunięte",
            content: {
              "application/json": {
                schema: z.object({
                  success: z.literal(true),
                  msg: z.string(),
                }),
              },
            },
          },
          "400": jsonError("Niepoprawne id"),
          "401": jsonError("Brak tokena"),
          "404": jsonError("Nie znaleziono zgłoszenia"),
          "500": jsonError("Błąd serwera"),
        },
      },
    },
    "/push/public-key": {
      get: {
        tags: ["Push"],
        summary: "Klucz publiczny VAPID + status push",
        responses: {
          "200": {
            description: "Klucz publiczny",
            content: {
              "application/json": {
                schema: successEnvelope({
                  enabled: z.boolean(),
                  publicKey: z.string().nullable(),
                }),
              },
            },
          },
          "500": jsonError("Błąd serwera"),
        },
      },
    },
    "/push/subscribe": {
      post: {
        tags: ["Push"],
        summary: "Zapis subskrypcji push (zalogowany)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: { "application/json": { schema: subscribeSchema } },
        },
        responses: {
          "200": {
            description: "Subskrypcja zapisana",
            content: {
              "application/json": {
                schema: z.object({
                  success: z.literal(true),
                  msg: z.string(),
                }),
              },
            },
          },
          "400": jsonError("Błąd walidacji", validationErrorEnvelope),
          "401": jsonError("Brak tokena"),
          "500": jsonError("Błąd serwera"),
        },
      },
    },
    "/push/unsubscribe": {
      post: {
        tags: ["Push"],
        summary: "Usunięcie subskrypcji push (zalogowany)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: { "application/json": { schema: unsubscribeSchema } },
        },
        responses: {
          "200": {
            description: "Subskrypcja usunięta",
            content: {
              "application/json": {
                schema: z.object({
                  success: z.literal(true),
                  msg: z.string(),
                }),
              },
            },
          },
          "400": jsonError("Błąd walidacji", validationErrorEnvelope),
          "401": jsonError("Brak tokena"),
          "500": jsonError("Błąd serwera"),
        },
      },
    },
  },
});
