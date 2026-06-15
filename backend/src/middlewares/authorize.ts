import { Response, NextFunction } from "express";
import { Rola } from "../generated/prisma/client";
import { AuthenticatedRequest } from "./authMiddleware";
import { FORBIDDEN, UNAUTHORIZED } from "../utils/httpCodeResponses/messages";

/**
 * Middleware autoryzacji rolowej. Uruchamiać ZAWSZE po authenticateJWT
 * (zakłada, że req.user jest ustawione). Superadmin omija każdy guard.
 */

export const requireSuperadmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void => {
  if (!req.user) {
    UNAUTHORIZED(res, "Brak autoryzacji.");
    return;
  }
  if (!req.user.isSuperadmin) {
    FORBIDDEN(res, "Wymagane uprawnienia superadmina.");
    return;
  }
  next();
};

export const requireRole =
  (...roles: Rola[]) =>
  (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      UNAUTHORIZED(res, "Brak autoryzacji.");
      return;
    }
    // Superadmin może wszystko, niezależnie od roli.
    if (req.user.isSuperadmin || roles.includes(req.user.role)) {
      next();
      return;
    }
    FORBIDDEN(res, "Brak wystarczających uprawnień.");
  };
