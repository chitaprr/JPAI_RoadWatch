import { z } from "zod";
import { createDocument } from "zod-openapi";
import { registerSchema, loginSchema } from "../routes/auth/auth.controller";
import { createSchema } from "../routes/zgloszenie/zgloszenie.controller";

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
    isSuperadmin: z.boolean(),
  })
  .meta({ id: "UserPublic" });

const authPayload = {
  token: z.string(),
  user: userPublic,
};

const zgloszenieDuplicate = z
  .object({
    id: z.number(),
    title: z.string(),
    lat: z.number(),
    lng: z.number(),
  })
  .meta({ id: "ZgloszenieDuplicate" });

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
        summary: "Lista użytkowników",
        responses: {
          "200": {
            description: "Lista użytkowników",
            content: {
              "application/json": {
                schema: successEnvelope({ users: z.array(userPublic) }),
              },
            },
          },
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
                schema: createdEnvelope(
                  z.object({ zgloszenie: z.record(z.string(), z.unknown()) }),
                ),
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
    },
  },
});
