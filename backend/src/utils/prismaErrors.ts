// Rozpoznawanie typowych błędów Prisma po kodzie, bez zależności od typów klienta.
const codeOf = (error: unknown): string | undefined =>
  typeof error === "object" && error !== null && "code" in error
    ? (error as { code?: string }).code
    : undefined;

// P2025 — rekord do update/delete nie istnieje.
export const isRecordNotFound = (error: unknown): boolean =>
  codeOf(error) === "P2025";

// P2003 — naruszenie klucza obcego (np. usuwany rekord jest jeszcze w użyciu).
export const isForeignKeyViolation = (error: unknown): boolean =>
  codeOf(error) === "P2003";
