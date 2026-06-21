import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import config from "../../config";
import prisma from "../utils/prisma";
import { UNAUTHORIZED, FORBIDDEN } from "../utils/httpCodeResponses/messages";
import type { Rola } from "../generated/prisma/client";

const JWT_SECRET = config.JWT_SECRET!;

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
    email: string;
    isSuperadmin: boolean;
    role: Rola;
    wykonawcaId: number | null;
    urzednikGminaId: number | null;
    adminGminaId: number | null;
  };
}

// Token niesie wyłącznie tożsamość (userId). Rolę, gminę i flagi czytamy z bazy
// przy każdym żądaniu — dzięki temu zmiana uprawnień działa od razu, bez
// przelogowania (token nie przechowuje zdezaktualizowanych danych).
const loadUser = (
  userId: number,
): Promise<AuthenticatedRequest["user"] | null> =>
  prisma.user
    .findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        isSuperadmin: true,
        urzednikGminaId: true,
        adminGminaId: true,
        wykonawcaId: true,
      },
    })
    .then((u) =>
      u
        ? {
            userId: u.id,
            email: u.email,
            role: u.role,
            isSuperadmin: u.isSuperadmin,
            urzednikGminaId: u.urzednikGminaId,
            adminGminaId: u.adminGminaId,
            wykonawcaId: u.wykonawcaId,
          }
        : null,
    );

const verifyToken = (token: string): { userId: number } | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: number };
  } catch {
    return null;
  }
};

export const authenticateJWT = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    UNAUTHORIZED(res, "Brak autoryzacji. Wymagany token JWT.");
    return;
  }

  const decoded = verifyToken(authHeader.split(" ")[1]);
  if (!decoded) {
    FORBIDDEN(res, "Token jest niepoprawny lub wygasł.");
    return;
  }

  const user = await loadUser(decoded.userId);
  if (!user) {
    FORBIDDEN(res, "Konto powiązane z tokenem już nie istnieje.");
    return;
  }

  req.user = user;
  next();
};

/**
 * Doczepia użytkownika, jeśli podano poprawny token, ale nie wymaga go.
 * Brak nagłówka -> żądanie leci dalej jako gość (req.user pozostaje undefined).
 * Obecny, lecz niepoprawny token -> odrzucenie (403).
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    next();
    return;
  }

  const decoded = verifyToken(authHeader.split(" ")[1]);
  if (!decoded) {
    FORBIDDEN(res, "Token jest niepoprawny lub wygasł.");
    return;
  }

  // Konto mogło zostać usunięte — wtedy traktujemy żądanie jak gościa.
  req.user = (await loadUser(decoded.userId)) ?? undefined;
  next();
};
